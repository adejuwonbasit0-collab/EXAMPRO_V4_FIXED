const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/courseController");
const { authMiddleware, adminMiddleware, instructorMiddleware } = require("../middleware/auth");

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {}
  }
  next();
};

// ── Course CRUD ──────────────────────────────────────────────────────────────
// IMPORTANT: All named routes MUST be before /:id wildcard
router.get("/", ctrl.getAll);
router.get("/mine", authMiddleware, instructorMiddleware, ctrl.getMine);
router.get("/instructor/my", authMiddleware, instructorMiddleware, ctrl.getMyCourses);
router.get("/:id", optionalAuth, ctrl.getOne);
router.post("/", authMiddleware, instructorMiddleware, ctrl.uploadFiles, ctrl.create);
router.delete("/:id", authMiddleware, adminMiddleware, ctrl.delete);
router.patch("/:id/publish", authMiddleware, instructorMiddleware, ctrl.togglePublish);
router.patch("/:id/approve", authMiddleware, adminMiddleware, ctrl.approveCourse);

// ── Sections (instructor + admin, role 2/3/4) ────────────────────────────────
router.post("/:id/sections", authMiddleware, instructorMiddleware, ctrl.addSection);
router.put("/:id/sections/:sectionId", authMiddleware, instructorMiddleware, ctrl.updateSection);
router.delete("/:id/sections/:sectionId", authMiddleware, instructorMiddleware, ctrl.deleteSection);

// ── Lessons (instructor + admin, role 2/3/4) ─────────────────────────────────
router.post("/:id/lessons", authMiddleware, instructorMiddleware, ctrl.uploadFiles, ctrl.addLesson);
router.get("/:id/lessons/:lessonId", authMiddleware, ctrl.getLesson);
router.put("/:id/lessons/:lessonId", authMiddleware, instructorMiddleware, ctrl.updateLesson);
router.delete("/:id/lessons/:lessonId", authMiddleware, instructorMiddleware, ctrl.deleteLesson);

// ── Progress & Certificates ──────────────────────────────────────────────────
router.post("/:id/complete-lesson", authMiddleware, ctrl.completeLesson);
router.get("/:id/certificate", authMiddleware, ctrl.getCertificate);

// ── Extra instructor routes ──────────────────────────────────────────────────
router.get("/:id/sections", authMiddleware, ctrl.getSections);

// ── Quiz routes ──────────────────────────────────────────────────────────────
router.get("/:id/quiz", authMiddleware, ctrl.getQuiz);
router.post("/:id/quiz", authMiddleware, instructorMiddleware, ctrl.saveQuiz);
router.post("/:id/quiz/submit", authMiddleware, ctrl.submitQuiz);
router.post("/:id/quizzes", authMiddleware, instructorMiddleware, ctrl.saveQuiz);
router.get("/:id/quizzes/:quizId", authMiddleware, ctrl.getQuizById);
router.delete("/:id/quizzes/:quizId", authMiddleware, instructorMiddleware, ctrl.deleteQuiz);

// ── Reviews ──────────────────────────────────────────────────────────────────
router.get("/:id/reviews", ctrl.getReviews);
router.post("/:id/reviews", authMiddleware, ctrl.createReview);

// ── Lesson comments (discussion) ─────────────────────────────────────────────
router.get("/:id/lessons/:lessonId/comments", authMiddleware, ctrl.getLessonComments);
router.post("/:id/lessons/:lessonId/comments", authMiddleware, ctrl.postLessonComment);

// ── Instructor certificate templates ─────────────────────────────────────────
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const certDir = "uploads/certificates/instructor";
const instrCertUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(certDir, { recursive: true }); cb(null, certDir); },
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});
router.get("/instructor/certificate-templates",        authMiddleware, instructorMiddleware, ctrl.listInstructorCertTemplates);
router.post("/instructor/certificate-templates",       authMiddleware, instructorMiddleware, instrCertUpload.single("cert_template"), ctrl.saveInstructorCertTemplate);
router.delete("/instructor/certificate-templates/:id", authMiddleware, instructorMiddleware, ctrl.deleteInstructorCertTemplate);

module.exports = router;