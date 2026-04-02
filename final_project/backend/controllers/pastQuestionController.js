const db = require("../config/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isFile = file.fieldname === "file";
    const dir = isFile ? "uploads/past_questions/files" : "uploads/past_questions/covers";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `pq_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const { pdfOrImageFilter } = require("../middleware/validation");
const pqFileFilter = (req, file, cb) => {
  if (file.fieldname === "file") {
    // past question file: PDF or image
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Past question file must be PDF or image"), false);
  }
  if (file.fieldname === "cover_image") {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Cover image must be JPEG, PNG, WebP, or GIF"), false);
  }
  cb(null, true);
};
const upload = multer({ storage, fileFilter: pqFileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
exports.uploadFiles = upload.fields([{ name: "cover_image", maxCount: 1 }, { name: "file", maxCount: 1 }]);

// Helper: create slug
const slugify = (text) => text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").replace(/--+/g, "-");

// GET ALL PAST QUESTIONS
exports.getAll = async (req, res) => {
  try {
    const { institution_id, exam_type_id, subject_id, year, search, page = 1, limit = 12, site_id } = req.query;

    // Check if site_id column exists (it may not yet be in older databases)
    let hasSiteIdCol = false;
    try {
      await db.query("SELECT site_id FROM past_questions LIMIT 0");
      hasSiteIdCol = true;
    } catch(_) { hasSiteIdCol = false; }

    let query = `
      SELECT pq.*, i.name as institution_name, i.short_name as institution_short, 
             et.short_name as exam_type, s.name as subject_name
      FROM past_questions pq
      LEFT JOIN institutions i ON pq.institution_id = i.id
      LEFT JOIN exam_types et ON pq.exam_type_id = et.id
      LEFT JOIN subjects s ON pq.subject_id = s.id
      WHERE pq.is_active = TRUE
    `;
    const params = [];

    // Only filter by site_id if the column actually exists
    if (hasSiteIdCol) {
      if (site_id) {
        query += " AND pq.site_id = ?"; params.push(site_id);
      } else {
        query += " AND (pq.site_id IS NULL OR pq.site_id = 0)";
      }
    }

    if (institution_id) { query += " AND pq.institution_id = ?"; params.push(institution_id); }
    if (exam_type_id) { query += " AND pq.exam_type_id = ?"; params.push(exam_type_id); }
    if (subject_id) { query += " AND pq.subject_id = ?"; params.push(subject_id); }
    if (year) { query += " AND pq.year = ?"; params.push(year); }
    if (search) { query += " AND (pq.title LIKE ? OR s.name LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }

    const [countRows] = await db.query(query.replace("SELECT pq.*, i.name as institution_name, i.short_name as institution_short, et.short_name as exam_type, s.name as subject_name", "SELECT COUNT(*) as total"), params);

    query += " ORDER BY pq.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);
    res.json({ past_questions: rows, total: countRows[0]?.total || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch past questions" });
  }
};

// GET ONE
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pq.*, i.name as institution_name, et.name as exam_type_name, s.name as subject_name
       FROM past_questions pq
       LEFT JOIN institutions i ON pq.institution_id = i.id
       LEFT JOIN exam_types et ON pq.exam_type_id = et.id
       LEFT JOIN subjects s ON pq.subject_id = s.id
       WHERE pq.id = ? AND pq.is_active = TRUE`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    // Preview questions (first 5 only unless purchased)
    const isPurchased = req.user ? await checkPurchase(req.user.id, "past_question", req.params.id) : false;
    const qLimit = isPurchased ? 99999 : rows[0].preview_questions;

    const [questions] = await db.query(
      "SELECT id, question_text, option_a, option_b, option_c, option_d, question_number FROM questions WHERE past_question_id = ? AND is_active = TRUE ORDER BY question_number LIMIT ?",
      [req.params.id, qLimit]
    );

    res.json({ ...rows[0], questions, is_purchased: isPurchased });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch" });
  }
};

const checkPurchase = async (userId, type, itemId) => {
  const [rows] = await db.query(
    "SELECT id FROM user_purchases WHERE user_id = ? AND item_type = ? AND item_id = ?",
    [userId, type, itemId]
  );
  return rows.length > 0;
};

// CREATE PAST QUESTION (admin)
exports.create = async (req, res) => {
  try {
    const { title, description, subject_id, institution_id, exam_type_id, year, price, total_questions, preview_questions, time_limit_minutes } = req.body;
    if (!title || !price) return res.status(400).json({ message: "Title and price are required" });

    const slug = slugify(`${title}-${year || ""}`);
    const cover_image = req.files?.cover_image?.[0] ? `/uploads/past_questions/covers/${req.files.cover_image[0].filename}` : null;
    const file_path = req.files?.file?.[0] ? `/uploads/past_questions/files/${req.files.file[0].filename}` : null;

    const [result] = await db.query(
      "INSERT INTO past_questions (title, slug, description, subject_id, institution_id, exam_type_id, year, price, cover_image, file_path, total_questions, preview_questions, time_limit_minutes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [title, slug, description, subject_id, institution_id, exam_type_id, year, price, cover_image, file_path, total_questions || 0, preview_questions || 5, time_limit_minutes || 0, req.user.id]
    );

    res.status(201).json({ message: "Past question created", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create past question" });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const { title, description, price, is_active, time_limit_minutes } = req.body;
    await db.query(
      "UPDATE past_questions SET title=?, description=?, price=?, is_active=?, time_limit_minutes=COALESCE(?,time_limit_minutes), updated_at=NOW() WHERE id=?",
      [title, description, price, is_active, time_limit_minutes != null ? time_limit_minutes : null, req.params.id]
    );
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update" });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    await db.query("UPDATE past_questions SET is_active = FALSE WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
};

// ADD QUESTION TO PAST QUESTION
exports.addQuestion = async (req, res) => {
  try {
    const { question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_number } = req.body;
    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer)
      return res.status(400).json({ message: "All question fields are required" });

    await db.query(
      "INSERT INTO questions (past_question_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_number) VALUES (?,?,?,?,?,?,?,?,?)",
      [req.params.id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_number]
    );

    // Update total questions count
    await db.query("UPDATE past_questions SET total_questions = total_questions + 1 WHERE id = ?", [req.params.id]);

    res.status(201).json({ message: "Question added" });
  } catch (err) {
    res.status(500).json({ message: "Failed to add question" });
  }
};

// SUBMIT QUIZ ATTEMPT
exports.submitQuiz = async (req, res) => {
  try {
    const { answers, time_taken_seconds } = req.body;
    const past_question_id = req.params.id;

    const [questions] = await db.query(
      "SELECT id, correct_answer FROM questions WHERE past_question_id = ? AND is_active = TRUE",
      [past_question_id]
    );

    let score = 0;
    const parsedAnswers = JSON.parse(answers || "{}");
    questions.forEach((q) => {
      if (parsedAnswers[q.id] === q.correct_answer) score++;
    });

    await db.query(
      "INSERT INTO quiz_attempts (user_id, past_question_id, score, total_questions, time_taken_seconds, answers, completed_at) VALUES (?,?,?,?,?,?,NOW())",
      [req.user.id, past_question_id, score, questions.length, time_taken_seconds || 0, JSON.stringify(parsedAnswers)]
    );

    res.json({ score, total: questions.length, percentage: Math.round((score / questions.length) * 100) });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit quiz" });
  }
};