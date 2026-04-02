const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/studentController");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

// ── Existing routes ──────────────────────────────────────
router.get("/progress-summary", ctrl.getProgressSummary);
router.get("/my-courses", ctrl.getMyCourses);
router.get("/course/:id", ctrl.getCourseForStudent);
router.post("/lesson-complete", ctrl.markLessonComplete);
router.get("/my-past-questions", ctrl.getMyPastQuestions);
router.get("/certificates", ctrl.getMyCertificates);
router.get("/certificates/:id/data", authMiddleware, async (req, res) => {
  const db = require("../config/database");
  try {
    const userId = req.user.id;
    const [[cert]] = await db.query(
      `SELECT uc.id, uc.certificate_number, uc.issued_at,
              c.title as course_title, c.thumbnail,
              u.name as student_name,
              instr.name as instructor_name,
              s.school_name, s.primary_color
       FROM certificates uc
       JOIN courses c ON uc.course_id = c.id
       JOIN users u ON uc.user_id = u.id
       JOIN users instr ON c.instructor_id = instr.id
       LEFT JOIN admin_sites s ON c.site_id = s.id
       WHERE uc.id = ? AND uc.user_id = ?`, [req.params.id, userId]
    );
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json({
      certificate_number: cert.certificate_number,
      student_name:  cert.student_name,
      course_title:  cert.course_title,
      instructor_name: cert.instructor_name,
      completed_date: cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"}) : "N/A",
      platform_name: cert.school_name || "ExamPro",
      primary_color: cert.primary_color || "#5C6EF8",
      thumbnail:     cert.thumbnail,
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get("/certificates/:id/pdf", authMiddleware, async (req, res) => {
  const db = require("../config/database");
  const { streamCertificate } = require("../services/certificateService");
  try {
    const userId = req.user.id;
    const [[cert]] = await db.query(
      `SELECT uc.*, c.title as course_title, u.name as student_name,
              instr.name as instructor_name,
              s.school_name, s.primary_color
       FROM certificates uc
       JOIN courses c ON uc.course_id = c.id
       JOIN users u ON uc.user_id = u.id
       JOIN users instr ON c.instructor_id = instr.id
       LEFT JOIN admin_sites s ON c.site_id = s.id
       WHERE uc.id = ? AND uc.user_id = ?`, [req.params.id, userId]
    );
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    const certNumber = cert.certificate_number || ("CERT-" + cert.id + "-" + userId);
    streamCertificate({
      studentName:   cert.student_name,
      courseTitle:   cert.course_title,
      instructorName: cert.instructor_name,
      certNumber,
      completedAt:   cert.completed_at ? new Date(cert.completed_at).toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"}) : null,
      platformName:  cert.school_name || "ExamPro",
      primaryColor:  cert.primary_color || "#5C6EF8",
    }, res);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── NEW: Stats (total_spent, accurate course/pq counts) ──
// dashboard.html uses this for the 4 stat cards
router.get("/stats", ctrl.getStudentStats);

// ── NEW: Wishlist ────────────────────────────────────────
router.get("/wishlist", ctrl.getWishlist);
router.post("/wishlist", ctrl.addToWishlist);
router.delete("/wishlist/:itemId", ctrl.removeFromWishlist);

// ── NEW: Instructor public profile ───────────────────────
// Note: auth not required, but route stays here for convenience
router.get("/instructor/:id/profile", ctrl.getInstructorProfile);

module.exports = router;