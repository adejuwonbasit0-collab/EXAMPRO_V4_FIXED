const db = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailService = require("../services/emailService");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const genOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const signToken = (u) =>
  jwt.sign(
    { id: u.id, email: u.email, role_id: u.role_id, name: u.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// Helper: get site info from subdomain
async function getSiteInfo(school) {
  if (!school) return { siteId: null, ownerId: null, subdomain: null };
  const [ss] = await db.query(
    "SELECT id, user_id, subdomain FROM admin_sites WHERE subdomain=? AND is_active=1",
    [school]
  );
  return ss.length
    ? { siteId: ss[0].id, ownerId: ss[0].user_id, subdomain: ss[0].subdomain }
    : { siteId: null, ownerId: null, subdomain: null };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, school_name, subdomain, school } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const role_id = role === "admin" ? 2 : role === "instructor" ? 3 : 1;

    let createdByAdmin = null;
    let userSiteId = null;
    if (school) {
      const { siteId, ownerId } = await getSiteInfo(school);
      userSiteId = siteId;
      createdByAdmin = ownerId;
    }

    const [ex] = await db.query(
      "SELECT id FROM users WHERE email=? AND site_id<=>?",
      [email.toLowerCase(), userSiteId]
    );
    if (ex.length)
      return res.status(409).json({ message: "Email already registered on this site" });

    const hash = await bcrypt.hash(password, 10);
    const otp = genOTP();
    const exp = new Date(Date.now() + 10 * 60 * 1000);

    // Instructors start as unapproved (is_approved=0); students/admins start approved
    const isApproved = role_id === 3 ? 0 : 1;

    const [r] = await db.query(
      "INSERT INTO users (name,email,password,role_id,otp_code,otp_expires,is_active,is_verified,is_approved,site_id,created_by_admin) VALUES (?,?,?,?,?,?,1,0,?,?,?)",
      [name, email.toLowerCase(), hash, role_id, otp, exp, isApproved, userSiteId, createdByAdmin]
    );

    if (role === "admin" && school_name && subdomain) {
      const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
      const [subEx] = await db.query("SELECT id FROM admin_sites WHERE subdomain=?", [clean]);
      if (!subEx.length) {
        await db.query(
          "INSERT INTO admin_sites (user_id,school_name,subdomain,is_approved,is_active) VALUES (?,?,?,0,0)",
          [r.insertId, school_name, clean]
        );
      }
    }

    // Send OTP verification email
    await emailService
      .sendWelcomeOtp({ id: r.insertId, name, email }, otp, userSiteId)
      .catch((e) => console.error("Welcome email failed:", e.message));

    // Send instructor pending notification email
    if (role === "instructor") {
      emailService
        .sendInstructorPending({ id: r.insertId, name, email }, userSiteId)
        .catch((e) => console.error("Instructor pending email failed:", e.message));

      // Notify the school admin that a new instructor is awaiting approval
      if (createdByAdmin) {
        db.query("SELECT name,email FROM users WHERE id=? LIMIT 1", [createdByAdmin])
          .then(([admins]) => {
            if (admins[0]) {
              emailService
                .send(
                  admins[0].email,
                  "New Instructor Awaiting Approval",
                  `<p>Hi ${admins[0].name},</p><p><strong>${name}</strong> (${email}) has registered as an instructor on your school and is awaiting your approval.</p><p>Login to your admin dashboard → Instructors to approve or reject.</p>`,
                  userSiteId
                )
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    res.status(201).json({
      ok: true,
      message:
        role === "instructor"
          ? "Account created! Please verify your email. Your instructor profile is pending admin approval."
          : "Account created! Check your email for OTP.",
      needsVerification: true,
      email,
      isPending: role === "instructor",
    });
  } catch (e) {
    console.error("Register:", e.message);
    res.status(500).json({ message: e.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, school } = req.body;
    const { siteId } = await getSiteInfo(school);
    const [rows] = await db.query(
      "SELECT id,otp_code,otp_expires,role_id,is_approved FROM users WHERE email=? AND site_id<=>?",
      [email, siteId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    const u = rows[0];
    if (String(u.otp_code) !== String(otp))
      return res.status(400).json({ message: "Invalid OTP" });
    if (new Date() > new Date(u.otp_expires))
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    await db.query("UPDATE users SET is_verified=1,otp_code=NULL,otp_expires=NULL WHERE id=?", [u.id]);

    // If instructor, tell them they still need admin approval
    if (u.role_id === 3 && !u.is_approved) {
      return res.json({
        ok: true,
        message:
          "Email verified! Your instructor account is now pending admin approval. You will receive an email once approved.",
        isPending: true,
      });
    }
    res.json({ ok: true, message: "Email verified! You can now login." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email, school } = req.body;
    const { siteId } = await getSiteInfo(school);
    const [rows] = await db.query(
      "SELECT id,name,is_verified FROM users WHERE email=? AND site_id<=>?",
      [email, siteId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    if (rows[0].is_verified) return res.status(400).json({ message: "Already verified" });
    const otp = genOTP();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    await db.query("UPDATE users SET otp_code=?,otp_expires=? WHERE id=?", [otp, exp, rows[0].id]);
    await emailService
      .sendResendOtp(rows[0], otp, siteId)
      .catch((e) => console.error("Resend OTP email failed:", e.message));
    res.json({ ok: true, message: "New OTP sent" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, school } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const { siteId: schoolSiteId, subdomain: schoolSubdomain } = await getSiteInfo(school);
    let user = null;

    if (school && schoolSiteId) {
      // SCHOOL SITE LOGIN
      const [siteUsers] = await db.query(
        "SELECT * FROM users WHERE email=? AND site_id=?",
        [email.trim().toLowerCase(), schoolSiteId]
      );
      if (siteUsers.length) {
        user = siteUsers[0];
      } else {
        // Check if this is the admin who OWNS this school
        const [adminUsers] = await db.query(
          "SELECT u.* FROM users u INNER JOIN admin_sites s ON s.user_id=u.id WHERE u.email=? AND s.id=? AND u.role_id=2",
          [email.trim().toLowerCase(), schoolSiteId]
        );
        if (adminUsers.length) {
          user = adminUsers[0];
        } else {
          return res.status(401).json({
            message: "No account found for this email on this school. Please register first.",
            school,
          });
        }
      }
    } else {
      // MAIN EXAMPRO LOGIN
      const [mainUsers] = await db.query(
        "SELECT * FROM users WHERE email=? AND (role_id IN (2,4) OR site_id IS NULL) ORDER BY role_id DESC",
        [email.trim().toLowerCase()]
      );
      if (!mainUsers.length)
        return res.status(401).json({ message: "Invalid email or password" });
      user =
        mainUsers.find((u) => u.role_id === 4) ||
        mainUsers.find((u) => u.role_id === 2) ||
        mainUsers.find((u) => u.role_id === 3 && !u.site_id) ||
        mainUsers.find((u) => u.role_id === 1 && !u.site_id) ||
        mainUsers[0];
    }

    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    if (!user.is_active)
      return res.status(403).json({ message: "Account disabled. Contact support." });
    if (!user.is_verified)
      return res.status(403).json({
        message: "Please verify your email first",
        needsVerification: true,
        email,
        school,
      });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    // Instructor pending check — block login with clear message
    if (user.role_id === 3 && !user.is_approved) {
      return res.status(403).json({
        message:
          "Your instructor account is pending admin approval. You will receive an email once approved.",
        isPending: true,
        school: school || null,
      });
    }

    // Optional 2FA
    const [[otpSetting]] = await db
      .query("SELECT setting_value FROM global_settings WHERE setting_key='login_otp_required'")
      .catch(() => [[null]]);
    if (otpSetting && otpSetting.setting_value === "true") {
      const otp = genOTP();
      const exp = new Date(Date.now() + 10 * 60 * 1000);
      await db.query("UPDATE users SET login_otp=?,login_otp_expires=? WHERE id=?", [otp, exp, user.id]);
      await emailService
        .sendLoginOtp(user, otp, schoolSiteId)
        .catch((e) => console.error("Login OTP email failed:", e.message));
      return res.json({ needsLoginOtp: true, email, school: school || null });
    }

    await db.query("UPDATE users SET last_login=NOW() WHERE id=?", [user.id]);
    const token = signToken(user);
    let site = null;
    if (user.role_id === 2) {
      const [sites] = await db.query("SELECT * FROM admin_sites WHERE user_id=?", [user.id]);
      site = sites[0] || null;
    }
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        avatar: user.avatar,
        site_id: user.site_id,
        created_by_admin: user.created_by_admin,
      },
      site,
      // Return school subdomain so frontend can persist context
      school: schoolSubdomain || school || null,
    });
  } catch (e) {
    console.error("Login error:", e.message);
    res.status(500).json({ message: e.message });
  }
};

exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    if (String(user.login_otp) !== String(otp))
      return res.status(400).json({ message: "Invalid OTP" });
    if (new Date() > new Date(user.login_otp_expires))
      return res.status(400).json({ message: "OTP expired" });
    await db.query(
      "UPDATE users SET login_otp=NULL,login_otp_expires=NULL,last_login=NOW() WHERE id=?",
      [user.id]
    );
    // Get school subdomain for routing
    let school = null;
    if (user.site_id) {
      const [sites] = await db.query("SELECT subdomain FROM admin_sites WHERE id=? LIMIT 1", [user.site_id]);
      school = sites[0]?.subdomain || null;
    }
    res.json({
      ok: true,
      token: signToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        site_id: user.site_id,
      },
      school,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, school } = req.body;
    const { siteId } = await getSiteInfo(school);
    const [rows] = await db.query(
      "SELECT id,name,site_id FROM users WHERE email=? AND (site_id<=>? OR site_id IS NULL OR role_id IN (2,4))",
      [email, siteId]
    );
    if (!rows.length)
      return res.status(404).json({ message: "No account found with this email" });
    const target = rows.find((r) => r.site_id === siteId) || rows[0];
    const otp = genOTP();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    await db.query("UPDATE users SET otp_code=?,otp_expires=? WHERE id=?", [otp, exp, target.id]);
    await emailService
      .sendPasswordResetOtp({ id: target.id, name: target.name, email }, otp, siteId)
      .catch((e) => console.error("Password reset email failed:", e.message));
    res.json({ ok: true, message: "Reset OTP sent to your email" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, school } = req.body;
    const { siteId } = await getSiteInfo(school);
    const [rows] = await db.query(
      "SELECT id,otp_code,otp_expires,site_id FROM users WHERE email=? AND (site_id<=>? OR site_id IS NULL OR role_id IN (2,4))",
      [email, siteId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    const target = rows.find((r) => r.site_id === siteId) || rows[0];
    if (
      String(target.otp_code) !== String(otp) ||
      new Date() > new Date(target.otp_expires)
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    await db.query(
      "UPDATE users SET password=?,otp_code=NULL,otp_expires=NULL WHERE id=?",
      [await bcrypt.hash(newPassword, 10), target.id]
    );
    res.json({ ok: true, message: "Password reset! You can now login." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id,name,email,avatar,phone,bio,institution_name,role_id,site_id,is_approved,created_by_admin,last_login,created_at FROM users WHERE id=?",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};