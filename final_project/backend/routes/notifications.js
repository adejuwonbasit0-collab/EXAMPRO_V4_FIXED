const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationsController");
const { authMiddleware } = require("../middleware/auth");
const db = require("../config/database");

router.use(authMiddleware);

// Core notification routes
router.get("/", ctrl.getMyNotifications);
router.patch("/read-all", ctrl.markAllRead);
router.patch("/:id/read", ctrl.markRead);
router.delete("/:id", ctrl.deleteNotification);

// Notification preferences
router.get("/preferences", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM notification_preferences WHERE user_id=? LIMIT 1",
      [req.user.id]
    );
    res.json(rows[0] || {
      email_course_enroll: 1, email_course_complete: 1, email_certificate: 1,
      email_payment: 1, email_instructor_approval: 1, email_announcements: 1, in_app_all: 1
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put("/preferences", async (req, res) => {
  try {
    const f = req.body;
    await db.query(`
      INSERT INTO notification_preferences
        (user_id,email_course_enroll,email_course_complete,email_certificate,
         email_payment,email_instructor_approval,email_announcements,in_app_all)
      VALUES (?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        email_course_enroll=VALUES(email_course_enroll),
        email_course_complete=VALUES(email_course_complete),
        email_certificate=VALUES(email_certificate),
        email_payment=VALUES(email_payment),
        email_instructor_approval=VALUES(email_instructor_approval),
        email_announcements=VALUES(email_announcements),
        in_app_all=VALUES(in_app_all),
        updated_at=NOW()`,
      [req.user.id,
       f.email_course_enroll ?? 1, f.email_course_complete ?? 1,
       f.email_certificate ?? 1, f.email_payment ?? 1,
       f.email_instructor_approval ?? 1, f.email_announcements ?? 1,
       f.in_app_all ?? 1]
    );
    res.json({ ok: true, message: "Preferences saved" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
