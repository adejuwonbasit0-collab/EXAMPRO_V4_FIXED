const db   = require("../config/database");
const path = require("path");
const fs   = require("fs");
const bcrypt = require("bcrypt"); // fixed: was bcryptjs which doesn't exist

// ─── PROFILE COMPLETION HELPER ─────────────────────────────────────────────
function calcCompletion(u) {
  const fields = [
    { key: "name",             label: "Full name"           },
    { key: "phone",            label: "Phone number"        },
    { key: "bio",              label: "Bio"                 },
    { key: "institution_name", label: "Institution / Title" },
    { key: "avatar",           label: "Profile photo"       },
  ];
  const missing = fields.filter(f => !u[f.key] || String(u[f.key]).trim() === "");
  const pct     = Math.round(((fields.length - missing.length) / fields.length) * 100);
  return { pct, missing: missing.map(f => f.label) };
}

// ─── GET MY PROFILE ────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar, u.phone, u.bio,
              u.institution_name, u.academic_level,
              u.role_id, u.site_id, u.is_approved, u.created_at,
              r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    const base = rows[0] || {};

    // Optional columns — silently skip if missing in DB
    try {
      const [ext] = await db.query(
        "SELECT interests, total_spent, total_earned, last_login, created_by_admin FROM users WHERE id=?",
        [req.user.id]
      );
      if (ext[0]) Object.assign(base, ext[0]);
    } catch (_) {}

    // Attach completion info
    const completion = calcCompletion(base);
    base.profile_completion_pct    = completion.pct;
    base.profile_missing_fields     = completion.missing;

    res.json(base);
  } catch (err) {
    console.error("getMe:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ─── UPDATE PROFILE ────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, institution_name, academic_level, interests } = req.body;
    await db.query(
      "UPDATE users SET name=?, phone=?, bio=?, institution_name=?, academic_level=? WHERE id=?",
      [name || null, phone || null, bio || null, institution_name || null, academic_level || null, req.user.id]
    );
    if (interests !== undefined) {
      await db.query("UPDATE users SET interests=? WHERE id=?", [interests, req.user.id]).catch(() => {});
    }
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar, u.phone, u.bio,
              u.institution_name, u.academic_level,
              u.role_id, u.site_id, u.is_approved, u.created_at,
              r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    const user = rows[0] || {};
    const completion = calcCompletion(user);
    user.profile_completion_pct  = completion.pct;
    user.profile_missing_fields   = completion.missing;
    res.json({ ok: true, ...user });
  } catch (err) {
    console.error("updateProfile:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// ─── UPLOAD AVATAR ─────────────────────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const avatarUrl = "/uploads/avatars/" + req.file.filename;

    // Delete old avatar file if it was a local upload
    const [current] = await db.query("SELECT avatar FROM users WHERE id=?", [req.user.id]);
    if (current[0]?.avatar && current[0].avatar.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(__dirname, "../", current[0].avatar);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
    }

    await db.query("UPDATE users SET avatar=? WHERE id=?", [avatarUrl, req.user.id]);
    res.json({ ok: true, avatar: avatarUrl, message: "Avatar updated successfully" });
  } catch (err) {
    console.error("uploadAvatar:", err);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
};

// ─── CHANGE PASSWORD ───────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ message: "Current and new password are required" });
    if (new_password.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });

    // Fixed: schema uses `password` column not `password_hash`
    const [rows] = await db.query("SELECT password FROM users WHERE id=?", [req.user.id]);
    if (!rows[0]) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(new_password, 10);
    // Fixed: schema uses `password` column not `password_hash`
    await db.query("UPDATE users SET password=? WHERE id=?", [hash, req.user.id]);
    res.json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// ─── BANK ACCOUNTS ─────────────────────────────────────────────────────────
exports.getBankAccounts = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM bank_details WHERE user_id=? ORDER BY is_primary DESC, id DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bank accounts" });
  }
};

exports.addBankAccount = async (req, res) => {
  try {
    const { account_name, account_number, bank_name, is_primary } = req.body;
    if (!account_name || !account_number || !bank_name)
      return res.status(400).json({ message: "Account name, number and bank name are required" });
    if (is_primary) {
      await db.query("UPDATE bank_details SET is_primary=0 WHERE user_id=?", [req.user.id]);
    }
    const [result] = await db.query(
      "INSERT INTO bank_details (user_id, account_name, account_number, bank_name, is_primary) VALUES (?,?,?,?,?)",
      [req.user.id, account_name, account_number, bank_name, is_primary ? 1 : 0]
    );
    res.status(201).json({ ok: true, message: "Bank account added", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Failed to add bank account" });
  }
};

exports.updateBankAccount = async (req, res) => {
  try {
    const { account_name, account_number, bank_name, is_primary } = req.body;
    const [own] = await db.query(
      "SELECT id FROM bank_details WHERE id=? AND user_id=?",
      [req.params.id, req.user.id]
    );
    if (!own[0]) return res.status(404).json({ message: "Bank account not found" });
    if (is_primary) {
      await db.query("UPDATE bank_details SET is_primary=0 WHERE user_id=?", [req.user.id]);
    }
    await db.query(
      "UPDATE bank_details SET account_name=?, account_number=?, bank_name=?, is_primary=? WHERE id=? AND user_id=?",
      [account_name, account_number, bank_name, is_primary ? 1 : 0, req.params.id, req.user.id]
    );
    res.json({ ok: true, message: "Bank account updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update bank account" });
  }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    await db.query("DELETE FROM bank_details WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
    res.json({ ok: true, message: "Bank account removed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete bank account" });
  }
};

// ─── ALIASES ───────────────────────────────────────────────────────────────
exports.updateMe = exports.updateProfile;