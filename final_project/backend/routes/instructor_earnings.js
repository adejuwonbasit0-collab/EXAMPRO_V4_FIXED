const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// ── INSTRUCTOR: view own earnings & wallet ──
router.get("/wallet", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    // Ensure wallet exists
    await db.query(
      "INSERT IGNORE INTO instructor_wallet (instructor_id) VALUES (?)", [uid]
    );
    const [[wallet]] = await db.query("SELECT * FROM instructor_wallet WHERE instructor_id=?", [uid]);
    const [earnings] = await db.query(
      `SELECT e.*, c.title as course_title FROM earnings e
       LEFT JOIN courses c ON c.id=e.course_id
       WHERE e.instructor_id=? ORDER BY e.created_at DESC LIMIT 50`, [uid]
    );
    const [withdrawals] = await db.query(
      "SELECT * FROM withdrawals WHERE instructor_id=? ORDER BY created_at DESC LIMIT 20", [uid]
    );

    // Get commission rate configured by admin for this instructor's school
    let commissionRate = 70; // default
    const user = (await db.query("SELECT site_id FROM users WHERE id=? LIMIT 1", [uid]))[0][0];
    if (user?.site_id) {
      const [adminRows] = await db.query("SELECT user_id FROM admin_sites WHERE id=? LIMIT 1", [user.site_id]);
      if (adminRows[0]) {
        const [permRows] = await db.query(
          "SELECT perm_instructor_commission FROM admin_permissions WHERE admin_id=? LIMIT 1",
          [adminRows[0].user_id]
        );
        if (permRows[0]?.perm_instructor_commission != null) {
          commissionRate = parseFloat(permRows[0].perm_instructor_commission);
        }
      }
    }

    res.json({ wallet, earnings, withdrawals, commission_rate: commissionRate });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── INSTRUCTOR: request withdrawal ──
router.post("/withdraw", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { amount, bank_name, account_name, account_number } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Valid amount required" });
    const [[wallet]] = await db.query("SELECT * FROM instructor_wallet WHERE instructor_id=?", [uid]);
    if (!wallet || wallet.balance < amount)
      return res.status(400).json({ message: "Insufficient balance" });
    // Deduct immediately (pending)
    await db.query("UPDATE instructor_wallet SET balance=balance-? WHERE instructor_id=?", [amount, uid]);
    await db.query(
      "INSERT INTO withdrawals (instructor_id,amount,bank_name,account_name,account_number,status) VALUES (?,?,?,?,?,'pending')",
      [uid, amount, bank_name, account_name, account_number]
    );
    res.json({ message: "Withdrawal request submitted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: list withdrawal requests ──
router.get("/admin/withdrawals", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const [rows] = await db.query(
      `SELECT w.*, u.name as instructor_name, u.email as instructor_email
       FROM withdrawals w JOIN users u ON u.id=w.instructor_id
       WHERE w.admin_id=? OR w.admin_id IS NULL ORDER BY w.created_at DESC`,
      [adminId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: approve or reject withdrawal ──
router.patch("/admin/withdrawals/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!["approved","rejected","paid"].includes(status))
      return res.status(400).json({ message: "Invalid status" });
    const [wd] = await db.query("SELECT * FROM withdrawals WHERE id=?", [req.params.id]);
    if (!wd[0]) return res.status(404).json({ message: "Not found" });
    if (status === "rejected" && wd[0].status === "pending") {
      // Refund balance
      await db.query("UPDATE instructor_wallet SET balance=balance+? WHERE instructor_id=?", [wd[0].amount, wd[0].instructor_id]);
    }
    await db.query(
      "UPDATE withdrawals SET status=?,notes=?,processed_at=NOW(),admin_id=? WHERE id=?",
      [status, notes || null, req.user.id, req.params.id]
    );
    res.json({ message: `Withdrawal ${status}` });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;