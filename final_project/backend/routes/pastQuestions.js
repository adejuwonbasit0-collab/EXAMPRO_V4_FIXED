const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/pastQuestionController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

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

router.get("/", ctrl.getAll);
router.get("/:id", optionalAuth, ctrl.getOne);
router.post("/", authMiddleware, adminMiddleware, ctrl.uploadFiles, ctrl.create);
router.put("/:id", authMiddleware, adminMiddleware, ctrl.update);
router.delete("/:id", authMiddleware, adminMiddleware, ctrl.delete);
router.post("/:id/questions", authMiddleware, adminMiddleware, ctrl.addQuestion);
router.post("/:id/submit-quiz", authMiddleware, ctrl.submitQuiz);


// ── CBT: questions for purchased user (no correct answers) ───────────────────
router.get("/:id/cbt-questions", authMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const pqId = req.params.id, userId = req.user.id;
    const [pqInfo] = await db.query("SELECT id,title,price,time_limit_minutes,total_questions,year FROM past_questions WHERE id=?", [pqId]);
    if (!pqInfo.length) return res.status(404).json({ message: "Past question not found" });
    const [purchases] = await db.query("SELECT id FROM user_purchases WHERE user_id=? AND item_type='past_question' AND item_id=? LIMIT 1", [userId, pqId]);
    const [orders] = await db.query("SELECT id FROM orders WHERE user_id=? AND item_type='past_question' AND item_id=? AND payment_status='success' LIMIT 1", [userId, pqId]);
    const isPurchased = purchases.length > 0 || orders.length > 0 || parseFloat(pqInfo[0].price) === 0;
    if (!isPurchased) return res.status(403).json({ message: "Purchase this past question to access the CBT test" });
    const [questions] = await db.query("SELECT id,question_text,option_a,option_b,option_c,option_d,question_number,image_path FROM questions WHERE past_question_id=? AND is_active=TRUE ORDER BY question_number ASC", [pqId]);
    const [attempts] = await db.query("SELECT score,total_questions,time_taken_seconds,completed_at FROM quiz_attempts WHERE user_id=? AND past_question_id=? ORDER BY score DESC LIMIT 1", [userId, pqId]);
    res.json({ pq: pqInfo[0], questions, best_attempt: attempts[0] || null });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── CBT: review answers after completing ──────────────────────────────────────
router.get("/:id/cbt-review", authMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const [a] = await db.query("SELECT id FROM quiz_attempts WHERE user_id=? AND past_question_id=? LIMIT 1", [req.user.id, req.params.id]);
    if (!a.length) return res.status(403).json({ message: "Complete the test first to review answers" });
    const [q] = await db.query("SELECT id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,question_number,image_path FROM questions WHERE past_question_id=? AND is_active=TRUE ORDER BY question_number ASC", [req.params.id]);
    res.json({ questions: q });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── CBT: attempt history ──────────────────────────────────────────────────────
router.get("/:id/cbt-attempts", authMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const [rows] = await db.query("SELECT id,score,total_questions,time_taken_seconds,completed_at FROM quiz_attempts WHERE user_id=? AND past_question_id=? ORDER BY completed_at DESC LIMIT 10", [req.user.id, req.params.id]);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: all questions with correct answers ─────────────────────────────────
router.get("/:id/admin-questions", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const [q] = await db.query("SELECT id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,question_number,image_path FROM questions WHERE past_question_id=? AND is_active=TRUE ORDER BY question_number ASC", [req.params.id]);
    const [pq] = await db.query("SELECT id,title,total_questions,time_limit_minutes FROM past_questions WHERE id=?", [req.params.id]);
    res.json({ pq: pq[0] || null, questions: q });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: update a question ──────────────────────────────────────────────────
router.put("/:pqId/questions/:qId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const { question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_number } = req.body;
    await db.query("UPDATE questions SET question_text=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_answer=?,explanation=?,question_number=? WHERE id=? AND past_question_id=?",
      [question_text, option_a||'', option_b||'', option_c||'', option_d||'', correct_answer||'a', explanation||'', question_number||null, req.params.qId, req.params.pqId]);
    res.json({ ok: true, message: "Question updated" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: delete a question ──────────────────────────────────────────────────
router.delete("/:pqId/questions/:qId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    await db.query("DELETE FROM questions WHERE id=? AND past_question_id=?", [req.params.qId, req.params.pqId]);
    await db.query("UPDATE past_questions SET total_questions=(SELECT COUNT(*) FROM questions q2 WHERE q2.past_question_id=?) WHERE id=?", [req.params.pqId, req.params.pqId]);
    res.json({ ok: true, message: "Question deleted" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: bulk import questions ──────────────────────────────────────────────
router.post("/:id/questions/bulk", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) return res.status(400).json({ message: "questions array required" });
    const pqId = req.params.id;
    let inserted = 0, skipped = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text) { skipped++; continue; }
      const [ex] = await db.query("SELECT id FROM questions WHERE past_question_id=? AND question_text=? LIMIT 1", [pqId, q.question_text]);
      if (ex.length) { skipped++; continue; }
      await db.query("INSERT INTO questions (past_question_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,question_number) VALUES (?,?,?,?,?,?,?,?,?)",
        [pqId, q.question_text, q.option_a||'', q.option_b||'', q.option_c||'', q.option_d||'', (q.correct_answer||'a').toLowerCase(), q.explanation||'', q.question_number||(inserted+1)]);
      inserted++;
    }
    await db.query("UPDATE past_questions SET total_questions=(SELECT COUNT(*) FROM questions q2 WHERE q2.past_question_id=?) WHERE id=?", [pqId, pqId]);
    res.json({ ok: true, message: `${inserted} questions added${skipped>0?', '+skipped+' skipped':''}`, inserted, skipped });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN: update CBT time limit ──────────────────────────────────────────────
router.put("/:id/time-limit", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    await db.query("UPDATE past_questions SET time_limit_minutes=? WHERE id=?", [parseInt(req.body.time_limit_minutes)||0, req.params.id]);
    res.json({ ok: true, message: "Time limit updated" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});


module.exports = router;

// ── PDF STREAMING (read_only access type) ──
const path = require("path");
const fs = require("fs");

router.get("/view/:id", authMiddleware, async (req, res) => {
  try {
    const db = require("../config/database");
    const [rows] = await db.query(
      "SELECT pq.*, up.id as purchased FROM past_questions pq LEFT JOIN user_purchases up ON up.item_type='past_question' AND up.item_id=pq.id AND up.user_id=? WHERE pq.id=?",
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    const pq = rows[0];
    if (!pq.purchased) return res.status(403).json({ message: "Purchase required" });
    if (pq.access_type === "downloadable") {
      // Allow download redirect
      return res.redirect(`/uploads/${pq.file_path}`);
    }
    // read_only: stream inline
    const filePath = path.join(__dirname, "../", pq.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    // Add watermark headers for client-side PDF.js overlay
    res.setHeader("X-Watermark-Email", req.user.email);
    res.setHeader("X-Watermark-Date", new Date().toLocaleDateString());
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
