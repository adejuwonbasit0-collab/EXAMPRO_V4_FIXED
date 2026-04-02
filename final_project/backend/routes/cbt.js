/**
 * routes/cbt.js
 * Student-facing CBT exam routes
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// ── List active exams for a site ──────────────────────────────────────────────
router.get('/exams', async (req, res) => {
  try {
    const { site_id, subdomain } = req.query;
    let resolvedSiteId = site_id;

    if (!resolvedSiteId && subdomain) {
      const [[site]] = await db.query("SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1", [subdomain]);
      resolvedSiteId = site?.id;
    }

    if (!resolvedSiteId) return res.status(400).json({ message: 'site_id or subdomain required' });

    const [rows] = await db.query(
      `SELECT id, title, description, subject, duration_minutes, total_questions, pass_score
       FROM cbt_exams
       WHERE site_id=? AND is_active=1
       ORDER BY created_at DESC`,
      [resolvedSiteId]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Get single exam details (without answers) ─────────────────────────────────
router.get('/exams/:id', async (req, res) => {
  try {
    const [[exam]] = await db.query(
      "SELECT id,title,description,subject,duration_minutes,total_questions,pass_score,shuffle_questions,shuffle_options,show_result_immediately FROM cbt_exams WHERE id=? AND is_active=1",
      [req.params.id]
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Start exam — returns questions (shuffled, no answers) ─────────────────────
router.get('/exams/:id/start', authMiddleware, async (req, res) => {
  try {
    const examId = req.params.id;
    const [[exam]] = await db.query(
      "SELECT * FROM cbt_exams WHERE id=? AND is_active=1",
      [examId]
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    let [questions] = await db.query(
      "SELECT id,question_text,option_a,option_b,option_c,option_d,marks FROM cbt_questions WHERE exam_id=? ORDER BY order_num",
      [examId]
    );

    // Shuffle questions if enabled
    if (exam.shuffle_questions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if enabled
    if (exam.shuffle_options) {
      questions = questions.map(q => {
        const opts = [
          { key: 'a', val: q.option_a },
          { key: 'b', val: q.option_b },
          { key: 'c', val: q.option_c },
          { key: 'd', val: q.option_d },
        ].filter(o => o.val).sort(() => Math.random() - 0.5);
        return {
          ...q,
          option_a: opts[0]?.val || '',
          option_b: opts[1]?.val || '',
          option_c: opts[2]?.val || '',
          option_d: opts[3]?.val || '',
          _shuffle_map: opts.map(o => o.key) // track original keys for grading
        };
      });
    }

    // Record start time
    const [r] = await db.query(
      "INSERT INTO cbt_attempts (exam_id,student_id,started_at) VALUES (?,?,NOW())",
      [examId, req.user.id]
    );

    res.json({
      exam: {
        id: exam.id, title: exam.title, description: exam.description,
        duration_minutes: exam.duration_minutes, pass_score: exam.pass_score,
        total_questions: questions.length,
      },
      questions: questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        marks: q.marks || 1,
      })),
      attempt_id: r.insertId,
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Submit exam ───────────────────────────────────────────────────────────────
router.post('/exams/:id/submit', authMiddleware, async (req, res) => {
  try {
    const examId = req.params.id;
    const { attempt_id, answers, time_taken_seconds } = req.body;
    // answers = { question_id: 'a' | 'b' | 'c' | 'd' }

    const [[exam]] = await db.query("SELECT * FROM cbt_exams WHERE id=?", [examId]);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const [questions] = await db.query(
      "SELECT id, correct_answer, marks FROM cbt_questions WHERE exam_id=?",
      [examId]
    );

    let score = 0;
    let totalMarks = 0;
    const results = {};

    questions.forEach(q => {
      totalMarks += (q.marks || 1);
      const studentAns = (answers[q.id] || '').toLowerCase();
      const correct = studentAns === (q.correct_answer || '').toLowerCase();
      if (correct) score += (q.marks || 1);
      results[q.id] = { correct, correct_answer: q.correct_answer, student_answer: studentAns };
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = percentage >= (exam.pass_score || 50);

    // Update attempt record
    if (attempt_id) {
      await db.query(
        "UPDATE cbt_attempts SET answers=?,score=?,total_marks=?,percentage=?,passed=?,time_taken_seconds=?,submitted_at=NOW() WHERE id=? AND student_id=?",
        [JSON.stringify(answers), score, totalMarks, percentage, passed ? 1 : 0, time_taken_seconds || 0, attempt_id, req.user.id]
      );
    }

    // In-app notification
    await db.query(
      "INSERT INTO notifications (user_id,title,message,type,created_at) VALUES (?,?,?,?,NOW())",
      [req.user.id,
       passed ? '🎉 CBT Exam Passed!' : '📝 CBT Exam Completed',
       `${exam.title}: You scored ${percentage}%${passed ? ' — Passed!' : `. Need ${exam.pass_score}% to pass.`}`,
       passed ? 'success' : 'info']
    ).catch(() => {});

    const response = {
      ok: true, score, total_marks: totalMarks,
      percentage, passed,
      message: passed ? '🎉 Congratulations, you passed!' : `You scored ${percentage}%. You need ${exam.pass_score}% to pass.`,
    };

    // Only include detailed results if exam allows it
    if (exam.show_result_immediately) {
      response.results = results;
      // Add explanations
      const [qs] = await db.query("SELECT id,explanation,correct_answer FROM cbt_questions WHERE exam_id=?", [examId]);
      response.explanations = {};
      qs.forEach(q => { response.explanations[q.id] = { explanation: q.explanation, correct_answer: q.correct_answer }; });
    }

    res.json(response);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── My past attempts ──────────────────────────────────────────────────────────
router.get('/my-attempts', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, e.title as exam_title, e.subject, e.pass_score
       FROM cbt_attempts a
       JOIN cbt_exams e ON a.exam_id=e.id
       WHERE a.student_id=? AND a.submitted_at IS NOT NULL
       ORDER BY a.submitted_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;