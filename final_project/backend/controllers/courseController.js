const db = require("../config/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === "material" ? "uploads/materials" : "uploads/courses";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
exports.uploadFiles = upload.fields([{ name: "thumbnail", maxCount: 1 }, { name: "material", maxCount: 1 }]);

const slugify = (text) => text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

// ── Enrollment check helper (defined at top so all exports can use it) ────────
const checkEnrollment = async (userId, courseId) => {
  const [orders] = await db.query(
    "SELECT id FROM orders WHERE user_id=? AND item_id=? AND item_type='course' AND payment_status='success' LIMIT 1",
    [userId, courseId]
  );
  if (orders.length) return true;
  const [purchases] = await db.query(
    "SELECT id FROM user_purchases WHERE user_id=? AND item_id=? AND item_type='course' LIMIT 1",
    [userId, courseId]
  );
  return purchases.length > 0;
};

// ── Course ownership guard — admins (role 2,4) can edit any; instructors only own ──
const assertCourseOwnership = async (req, res) => {
  const user = req.user;
  // Super admin and platform admin can edit any course
  if (user.role_id === 4 || user.role_id === 2) return true;
  // Instructors can only edit their own courses
  const [rows] = await db.query(
    "SELECT id FROM courses WHERE id=? AND instructor_id=?",
    [req.params.id, user.id]
  );
  if (!rows.length) {
    res.status(403).json({ message: "You do not own this course" });
    return false;
  }
  return true;
};

// GET ALL COURSES
exports.getAll = async (req, res) => {
  try {
    const { institution_id, exam_type_id, category, search, page = 1, limit = 12, site_id } = req.query;
    let query = `
      SELECT c.*, u.name as instructor_name, i.name as institution_name, et.short_name as exam_type
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN institutions i ON c.institution_id = i.id
      LEFT JOIN exam_types et ON c.exam_type_id = et.id
      WHERE c.is_active = TRUE AND c.is_published = TRUE AND COALESCE(c.is_approved, TRUE) = TRUE
    `;
    const params = [];

    // If site_id provided, show that school's courses; otherwise only show platform courses (site_id IS NULL)
    if (site_id) {
      query += " AND c.site_id = ?"; params.push(site_id);
    } else {
      query += " AND (c.site_id IS NULL OR c.site_id = 0)";
    }

    if (institution_id) { query += " AND c.institution_id = ?"; params.push(institution_id); }
    if (exam_type_id) { query += " AND c.exam_type_id = ?"; params.push(exam_type_id); }
    if (category) { query += " AND c.category = ?"; params.push(category); }
    if (search) { query += " AND c.title LIKE ?"; params.push(`%${search}%`); }

    query += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);
    res.json({ courses: rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};

// GET ONE COURSE
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name as instructor_name, i.name as institution_name, et.name as exam_type_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN institutions i ON c.institution_id = i.id
       LEFT JOIN exam_types et ON c.exam_type_id = et.id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Course not found" });

    const [sections] = await db.query(
      "SELECT * FROM course_sections WHERE course_id = ? ORDER BY order_num",
      [req.params.id]
    );

    const isEnrolled = req.user ? await checkEnrollment(req.user.id, req.params.id) : false;
    let progress = 0;
    if (isEnrolled && req.user) {
      const [[p]] = await db.query(
        "SELECT progress_percent FROM course_enrollments WHERE user_id = ? AND course_id = ?",
        [req.user.id, req.params.id]
      );
      progress = p?.progress_percent || 0;
    }

    for (const section of sections) {
      const [lessons] = await db.query(
        `SELECT id, title, duration_minutes, is_preview, order_num, 
         ${isEnrolled ? "video_url, material_path, material_name, content," : ""}
         video_type FROM course_lessons WHERE section_id = ? ORDER BY order_num`,
        [section.id]
      );
      section.lessons = lessons;
    }

    res.json({ ...rows[0], sections, is_enrolled: isEnrolled, progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch course" });
  }
};


// GET COURSES FOR INSTRUCTOR
exports.getMine = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.name as instructor_name 
      FROM courses c LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.instructor_id = ? AND c.is_active = TRUE
      ORDER BY c.created_at DESC`, [req.user.id]);
    res.json({ courses: rows });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your courses" });
  }
};

// CREATE COURSE (admin/instructor)
exports.create = async (req, res) => {
  try {
    const { title, description, price, institution_id, exam_type_id, category, level, duration_hours } = req.body;
    if (!title || !price) return res.status(400).json({ message: "Title and price are required" });

    const slug = slugify(title) + '-' + Date.now();
    const thumbnail = req.files?.thumbnail?.[0] ? `/uploads/courses/${req.files.thumbnail[0].filename}` : null;

    // Admin courses are auto-approved; instructor courses need admin approval
    const is_approved = req.user.role_id === 2 ? true : false;

    const [result] = await db.query(
      "INSERT INTO courses (title, slug, description, price, instructor_id, institution_id, exam_type_id, category, level, duration_hours, thumbnail, is_approved) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [title, slug, description, price, req.user.id, institution_id, exam_type_id, category, level || "beginner", duration_hours || 0, thumbnail, is_approved]
    );

    // Notify admin if instructor creates a course
    if (req.user.role_id === 3) {
      const [admins] = await db.query("SELECT id FROM users WHERE role_id = 2");
      for (const a of admins) {
        await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)", [
          a.id, "New Course Pending Approval",
          `Instructor created a new course "${title}" that needs your approval before going live.`,
          "warning"
        ]);
      }
    }

    res.status(201).json({ ok: true, message: "Course created", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create course" });
  }
};


// MARK LESSON COMPLETE (student)
exports.completeLesson = async (req, res) => {
  try {
    const { lesson_id } = req.body;
    const courseId = req.params.id;
    const userId = req.user.id;

    if (!lesson_id) return res.status(400).json({ message: 'lesson_id required' });

    // Verify enrollment
    const enrolled = await checkEnrollment(userId, courseId);
    const [[lessonRow]] = await db.query('SELECT is_preview, course_id FROM course_lessons WHERE id=? LIMIT 1', [lesson_id]);
    if (!enrolled && !lessonRow?.is_preview) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Upsert progress
    await db.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, completed_at)
       VALUES (?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE is_completed=1, completed_at=NOW()`,
      [userId, lesson_id, courseId]
    );

    // Calculate progress
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM course_lessons WHERE course_id=?', [courseId]
    );
    const [[{ done }]] = await db.query(
      'SELECT COUNT(*) AS done FROM lesson_progress WHERE user_id=? AND course_id=? AND is_completed=1',
      [userId, courseId]
    );
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // Update course_enrollments
    await db.query(
      `INSERT INTO course_enrollments (user_id, course_id, progress_percent, last_lesson_id, completed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE progress_percent=?, last_lesson_id=?, completed=?`,
      [userId, courseId, progress, lesson_id, progress >= 100,
       progress, lesson_id, progress >= 100]
    ).catch(() => {});

    // Certificate
    let certificate_earned = false;
    if (progress >= 100) {
      const [existCert] = await db.query(
        'SELECT id FROM certificates WHERE user_id=? AND course_id=?', [userId, courseId]
      );
      if (!existCert.length) {
        const certNumber = 'CERT-' + userId + '-' + courseId + '-' + Date.now();
        await db.query(
          'INSERT INTO certificates (user_id, course_id, certificate_number) VALUES (?, ?, ?)',
          [userId, courseId, certNumber]
        );
        certificate_earned = true;
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'success')",
          [userId, '🎓 Certificate Earned!', 'You completed the course and earned your certificate!']
        );
        // Send certificate email
        try {
          const [certUser]   = await db.query('SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1', [userId]);
          const [certCourse] = await db.query('SELECT title FROM courses WHERE id=? LIMIT 1', [courseId]);
          if (certUser[0] && certCourse[0]) {
            const emailService = require('../services/emailService');
            emailService.sendCertificateEarned(certUser[0], certCourse[0].title, certNumber, certUser[0].site_id).catch(() => {});
          }
        } catch (_) {}
      }
    }

    res.json({ ok: true, progress, certificate_earned, completed: done, total });
  } catch (e) {
    console.error('completeLesson:', e);
    res.status(500).json({ message: e.message });
  }
};

// PUBLISH/UNPUBLISH COURSE
exports.togglePublish = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const [rows] = await db.query("SELECT is_published FROM courses WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Course not found" });
    await db.query("UPDATE courses SET is_published = ? WHERE id = ?", [!rows[0].is_published, req.params.id]);
    res.json({ message: `Course ${rows[0].is_published ? "unpublished" : "published"}` });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle" });
  }
};

// DELETE COURSE
exports.delete = async (req, res) => {
  try {
    await db.query("UPDATE courses SET is_active = FALSE WHERE id = ?", [req.params.id]);
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete" });
  }
};

// APPROVE COURSE (admin only)
exports.approveCourse = async (req, res) => {
  try {
    await db.query("UPDATE courses SET is_approved = TRUE WHERE id = ?", [req.params.id]);
    // notify instructor
    const [[course]] = await db.query("SELECT title, instructor_id FROM courses WHERE id = ?", [req.params.id]);
    if (course?.instructor_id) {
      await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)", [
        course.instructor_id, "Course Approved",
        `Your course "${course.title}" has been approved and is now visible to students!`,
        "success"
      ]);
    }
    res.json({ ok: true, message: "Course approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve course" });
  }
};

// GET CERTIFICATE
exports.getCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;
    const { format = "json" } = req.query; // ?format=pdf to stream PDF

    // Check if completed
    const [[enr]] = await db.query(
      "SELECT completed, progress_percent FROM course_enrollments WHERE user_id=? AND course_id=?",
      [userId, courseId]
    );
    if (!enr || !enr.completed) {
      return res.status(400).json({ message: "Course not completed yet. Progress: " + (enr?.progress_percent || 0) + "%" });
    }

    // Ensure certificate record exists
    let [certs] = await db.query("SELECT * FROM certificates WHERE user_id=? AND course_id=?", [userId, courseId]);
    let cert;
    if (!certs.length) {
      const certNumber = `CERT-${courseId}-${userId}-${Date.now()}`;
      await db.query("INSERT INTO certificates (user_id,course_id,certificate_number) VALUES (?,?,?)", [userId, courseId, certNumber]);
      [[cert]] = await db.query("SELECT * FROM certificates WHERE user_id=? AND course_id=?", [userId, courseId]);
    } else {
      cert = certs[0];
    }

    const [[course]] = await db.query("SELECT title FROM courses WHERE id=?", [courseId]);
    const [[user]]   = await db.query("SELECT name FROM users WHERE id=?", [userId]);

    // 1. Try instructor's own default certificate template first
    const [[instrTpl]] = await db.query(
      `SELECT * FROM instructor_certificate_templates
       WHERE instructor_id=(SELECT instructor_id FROM courses WHERE id=?) AND is_default=1
       LIMIT 1`,
      [courseId]
    ).catch(() => [[null]]);

    // 2. Fall back to admin site template
    const [[site]] = await db.query(
      `SELECT s.school_name, s.primary_color,
              ct.template_image, ct.name_x_percent, ct.name_y_percent,
              ct.name_font_size, ct.name_color, ct.name_font
       FROM admin_sites s
       JOIN users u ON s.user_id=u.id
       JOIN courses c ON c.instructor_id=u.id
       LEFT JOIN certificate_templates ct ON ct.site_id=s.id AND ct.is_default=1
       WHERE c.id=? LIMIT 1`,
      [courseId]
    ).catch(() => [[null]]);

    // Merge: instructor template overrides admin defaults
    const tpl = {
      templateImage: instrTpl?.template_image || site?.template_image || null,
      nameX:         instrTpl?.name_x_percent  || site?.name_x_percent  || 50,
      nameY:         instrTpl?.name_y_percent  || site?.name_y_percent  || 55,
      nameFontSize:  instrTpl?.name_font_size  || site?.name_font_size  || 48,
      nameColor:     instrTpl?.name_color      || site?.name_color      || "#1a1a2e",
      nameFont:      instrTpl?.name_font       || site?.name_font       || "Georgia",
      platformName:  site?.school_name || "ExamPro",
      primaryColor:  site?.primary_color || "#5C6EF8",
    };

    if (format === "pdf") {
      const { streamCertificate } = require("../services/certificateService");
      streamCertificate({
        studentName:   user.name,
        courseTitle:   course.title,
        certNumber:    cert.certificate_number,
        completedAt:   new Date(cert.issued_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        platformName:  tpl.platformName,
        primaryColor:  tpl.primaryColor,
        templateImage: tpl.templateImage,
        nameX:         tpl.nameX,
        nameY:         tpl.nameY,
        nameFontSize:  tpl.nameFontSize,
        nameColor:     tpl.nameColor,
        nameFont:      tpl.nameFont,
      }, res);
    } else {
      // Default: return JSON (for frontend to display)
      res.json({
        certificate:   cert,
        course_title:  course.title,
        student_name:  user.name,
        issued_at:     cert.issued_at,
        pdf_url:       `/api/courses/${courseId}/certificate?format=pdf`,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get certificate" });
  }
};

// ============================================================
// REPLACE the two addLesson and two addSection functions in
// backend/controllers/courseController.js with these single versions
// ============================================================

// ADD SECTION — single correct version
exports.addSection = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Section title required" });
    const [[{ max_order }]] = await db.query(
      "SELECT COALESCE(MAX(order_num),0) as max_order FROM course_sections WHERE course_id=?",
      [req.params.id]
    );
    const [r] = await db.query(
      "INSERT INTO course_sections (course_id,title,order_num) VALUES (?,?,?)",
      [req.params.id, title, max_order + 1]
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error("addSection:", err);
    res.status(500).json({ message: "Failed to add section" });
  }
};

// ADD LESSON — single correct version
// Route is POST /courses/:id/lessons  (section_id comes from req.body)
exports.addLesson = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const courseId = req.params.id;
    const { section_id, title, video_url, video_type, duration_minutes, content, is_preview, order_num } = req.body;
    if (!title) return res.status(400).json({ message: "Lesson title required" });
    if (!section_id) return res.status(400).json({ message: "section_id required" });

    const material = req.files?.material?.[0];

    const [[{ max_order }]] = await db.query(
      "SELECT COALESCE(MAX(order_num),0) as max_order FROM course_lessons WHERE section_id=?",
      [section_id]
    );

    const [r] = await db.query(
      `INSERT INTO course_lessons
        (section_id, course_id, title, video_url, video_type, duration_minutes, content,
         material_path, material_name, is_preview, order_num)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        section_id, courseId, title,
        video_url || null,
        video_type || 'youtube',
        duration_minutes || 15,
        content || '',
        material ? `/uploads/materials/${material.filename}` : null,
        material ? material.originalname : null,
        is_preview ? 1 : 0,
        order_num || max_order + 1
      ]
    );

    // Keep total_lessons in sync
    await db.query(
      "UPDATE courses SET total_lessons = (SELECT COUNT(*) FROM course_lessons WHERE course_id=?) WHERE id=?",
      [courseId, courseId]
    );

    res.status(201).json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error("addLesson:", err);
    res.status(500).json({ message: "Failed to add lesson" });
  }
};

// ============================================================
// INSTRUCTOR: Get my courses
// ============================================================
exports.getMyCourses = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, i.name as institution_name, et.short_name as exam_type
       FROM courses c
       LEFT JOIN institutions i ON c.institution_id = i.id
       LEFT JOIN exam_types et ON c.exam_type_id = et.id
       WHERE c.instructor_id = ? AND c.is_active = TRUE ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ courses: rows });
  } catch (err) { res.status(500).json({ message: "Failed to fetch courses" }); }
};

// ============================================================
// GET COURSE SECTIONS
// ============================================================
exports.getSections = async (req, res) => {
  try {
    const [sections] = await db.query("SELECT * FROM course_sections WHERE course_id=? ORDER BY order_num ASC", [req.params.id]);
    for (const sec of sections) {
      const [lessons] = await db.query("SELECT * FROM course_lessons WHERE section_id=? ORDER BY order_num ASC", [sec.id]);
      sec.lessons = lessons;
      // Also fetch quizzes belonging to this section
      const [quizzes] = await db.query(
        "SELECT cq.*, (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id=cq.id) as question_count FROM course_quizzes cq WHERE cq.section_id=? ORDER BY cq.id ASC",
        [sec.id]
      );
      sec.quizzes = quizzes;
    }
    res.json({ sections });
  } catch (err) { res.status(500).json({ message: "Failed to fetch sections" }); }
};


exports.getQuiz = async (req, res) => {
  try {
    const [quizzes] = await db.query("SELECT * FROM course_quizzes WHERE course_id=?", [req.params.id]);
    if(!quizzes.length) return res.json(null);
    const quiz = quizzes[0];
    const [questions] = await db.query("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY order_num", [quiz.id]);
    res.json({...quiz, questions});
  } catch(e){ res.status(500).json({message:e.message}); }
};

exports.getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;
    const courseId = req.params.id;
    const [quizzes] = await db.query(
      "SELECT * FROM course_quizzes WHERE id=? AND course_id=?",
      [quizId, courseId]
    );
    if (!quizzes.length) return res.status(404).json({ message: "Quiz not found" });
    const quiz = quizzes[0];
    const [questions] = await db.query("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY order_num", [quiz.id]);
    res.json({ ...quiz, questions });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.saveQuiz = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { title, pass_score, questions, section_id, time_limit_minutes } = req.body;
    const courseId = req.params.id;

    // Upsert quiz
    let quizId;
    if (section_id) {
      const [existing] = await db.query("SELECT id FROM course_quizzes WHERE course_id=? AND section_id=?", [courseId, section_id]);
      if (existing.length) {
        quizId = existing[0].id;
        await db.query("UPDATE course_quizzes SET title=?,pass_score=?,time_limit_minutes=? WHERE id=?",
          [title || 'Section Quiz', pass_score || 70, time_limit_minutes || 0, quizId]);
      } else {
        const [r] = await db.query(
          "INSERT INTO course_quizzes (course_id,section_id,title,pass_score,time_limit_minutes) VALUES (?,?,?,?,?)",
          [courseId, section_id, title || 'Section Quiz', pass_score || 70, time_limit_minutes || 0]
        );
        quizId = r.insertId;
      }
    } else {
      const [existing] = await db.query("SELECT id FROM course_quizzes WHERE course_id=? AND section_id IS NULL", [courseId]);
      if (existing.length) {
        quizId = existing[0].id;
        await db.query("UPDATE course_quizzes SET title=?,pass_score=?,time_limit_minutes=? WHERE id=?",
          [title || 'End of Course Quiz', pass_score || 70, time_limit_minutes || 0, quizId]);
      } else {
        const [r] = await db.query(
          "INSERT INTO course_quizzes (course_id,title,pass_score,time_limit_minutes) VALUES (?,?,?,?)",
          [courseId, title || 'End of Course Quiz', pass_score || 70, time_limit_minutes || 0]
        );
        quizId = r.insertId;
      }
    }

    // Replace all questions — support all types
    await db.query("DELETE FROM quiz_questions WHERE quiz_id=?", [quizId]);
    if (questions?.length) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qtype = q.question_type || 'multiple_choice';

        // For true/false: force options to True/False
        let optA = q.option_a || '';
        let optB = q.option_b || '';
        let optC = q.option_c || '';
        let optD = q.option_d || '';
        if (qtype === 'true_false') { optA = 'True'; optB = 'False'; optC = ''; optD = ''; }

        // For essay/short_answer: correct_answer holds sample/accepted text
        const correctAns = (qtype === 'essay' || qtype === 'short_answer')
          ? null  // auto-graded as null — manual or keyword match
          : (q.correct_answer || 'a');

        const correctText = (qtype === 'short_answer') ? (q.correct_text || q.correct_answer || '') : null;

        await db.query(
          "INSERT INTO quiz_questions (quiz_id,question_text,option_a,option_b,option_c,option_d,correct_answer,correct_text,explanation,order_num,question_type) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [quizId, q.question_text, optA, optB, optC, optD, correctAns, correctText, q.explanation || '', i, qtype]
        );
      }
    }
    res.json({ ok: true, message: 'Quiz saved!', quiz_id: quizId });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { quiz_id, answers } = req.body;
    const [questions] = await db.query("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY order_num", [quiz_id]);
    const [[quiz]] = await db.query("SELECT * FROM course_quizzes WHERE id=?", [quiz_id]);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let correct = 0;
    let gradable = 0; // only auto-gradable questions count

    questions.forEach(q => {
      const qtype = q.question_type || 'multiple_choice';
      if (qtype === 'essay') return; // essays not auto-graded

      gradable++;
      const studentAns = (answers[q.id] || '').toString().trim().toLowerCase();

      if (qtype === 'short_answer') {
        // Accept answer if it matches any accepted value (comma-separated)
        const accepted = (q.correct_text || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (accepted.length && accepted.some(a => studentAns.includes(a) || a.includes(studentAns))) correct++;
      } else {
        // multiple_choice or true_false
        if (studentAns === (q.correct_answer || '').toLowerCase()) correct++;
      }
    });

    const total = gradable || questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = score >= (quiz.pass_score || quiz.pass_percent || 70);

    // Save attempt
    await db.query(
      "INSERT INTO quiz_answers (quiz_id,user_id,answers,score,total,passed,taken_at) VALUES (?,?,?,?,?,?,NOW())",
      [quiz_id, req.user.id, JSON.stringify(answers), score, total, passed ? 1 : 0]
    );

    // Notification
    await db.query(
      "INSERT INTO notifications (user_id,title,message,type,created_at) VALUES (?,?,?,?,NOW())",
      [req.user.id,
       passed ? '🎉 Quiz Passed!' : '📝 Quiz Completed',
       passed
         ? `You scored ${score}% and passed the quiz!`
         : `You scored ${score}%. You need ${quiz.pass_score || 70}% to pass. Try again!`,
       passed ? 'success' : 'warning']
    ).catch(() => {});

    res.json({
      ok: true, score, passed, correct,
      total: questions.length,
      gradable,
      essay_count: questions.length - gradable,
      message: passed ? '🎉 Congratulations, you passed!' : `You scored ${score}%. Keep trying!`
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── UPDATE LESSON ─────────────────────────────────────────────────────────────
exports.updateLesson = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { lessonId } = req.params;
    const { title, video_type, video_url, duration_minutes, content, is_preview } = req.body;
    if (!title) return res.status(400).json({ message: "Lesson title is required" });

    // Admin can only edit lessons on courses THEY created (instructor_id = their own id)
    // Instructor can only edit their own courses
    // Super-admin (role 4) can edit any
    const [lessons] = await db.query(
      `SELECT cl.id, cl.course_id FROM course_lessons cl
       JOIN courses c ON c.id = cl.course_id
       WHERE cl.id = ? AND (
         c.instructor_id = ?
         OR ? IN (SELECT id FROM users WHERE role_id = 4)
       )`,
      [lessonId, req.user.id, req.user.id]
    );
    if (!lessons.length) return res.status(404).json({ message: "Lesson not found or you can only edit your own courses" });

    await db.query(
      `UPDATE course_lessons SET title=?, video_type=?, video_url=?, duration_minutes=?, content=?, is_preview=?, updated_at=NOW() WHERE id=?`,
      [title, video_type || 'youtube', video_url || null, duration_minutes || 0, content || null, is_preview ? 1 : 0, lessonId]
    );
    res.json({ ok: true, message: "Lesson updated" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET SINGLE LESSON ─────────────────────────────────────────────────────────
exports.getLesson = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, section_id, title, video_type, video_url, duration_minutes, content, material_url, is_preview, order_num FROM course_lessons WHERE id=? LIMIT 1`,
      [req.params.lessonId]
    );
    if (!rows.length) return res.status(404).json({ message: "Lesson not found" });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── DELETE LESSON ─────────────────────────────────────────────────────────────
exports.deleteLesson = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { lessonId } = req.params;
    // Admin/instructor can only delete lessons from courses they created
    // Super-admin (role 4) can delete any
    const [lessons] = await db.query(
      `SELECT cl.id, cl.course_id FROM course_lessons cl
       JOIN courses c ON c.id = cl.course_id
       WHERE cl.id = ? AND (
         c.instructor_id = ?
         OR ? IN (SELECT id FROM users WHERE role_id = 4)
       )`,
      [lessonId, req.user.id, req.user.id]
    );
    if (!lessons.length) return res.status(404).json({ message: "Lesson not found or you can only delete your own course lessons" });

    await db.query("DELETE FROM course_lessons WHERE id=?", [lessonId]);
    // Clean up progress records for this lesson
    await db.query("DELETE FROM lesson_progress WHERE lesson_id=?", [lessonId]).catch(() => {});
    res.json({ ok: true, message: "Lesson deleted" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── UPDATE SECTION ─────────────────────────────────────────────────────────────
exports.updateSection = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { sectionId } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Section title required" });
    await db.query("UPDATE course_sections SET title=? WHERE id=?", [title, sectionId]);
    res.json({ ok: true, message: "Section updated" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── DELETE SECTION ─────────────────────────────────────────────────────────────
exports.deleteSection = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { sectionId } = req.params;
    // Delete lessons in section first
    await db.query("DELETE FROM course_lessons WHERE section_id=?", [sectionId]);
    await db.query("DELETE FROM course_sections WHERE id=?", [sectionId]);
    res.json({ ok: true, message: "Section and its lessons deleted" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── DELETE QUIZ ─────────────────────────────────────────────────────────────
exports.deleteQuiz = async (req, res) => {
  try {
    if (!await assertCourseOwnership(req, res)) return;
    const { quizId } = req.params;
    await db.query("DELETE FROM quiz_questions WHERE quiz_id=?", [quizId]);
    await db.query("DELETE FROM course_quizzes WHERE id=?", [quizId]);
    res.json({ ok: true, message: "Quiz deleted" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// NEW — Reviews
// GET  /courses/:id/reviews?page=1&limit=5
// POST /courses/:id/reviews  { rating, review_text }
// ─────────────────────────────────────────────────────────────────────────────
exports.getReviews = async (req, res) => {
  try {
    const courseId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    // Average rating
    const [[stats]] = await db.query(
      `SELECT AVG(rating) AS average_rating, COUNT(*) AS total_reviews FROM course_reviews WHERE course_id=?`,
      [courseId]
    );

    // Distribution
    const [dist] = await db.query(
      `SELECT rating, COUNT(*) AS cnt FROM course_reviews WHERE course_id=? GROUP BY rating`,
      [courseId]
    );
    const distribution = {};
    dist.forEach(d => { distribution[d.rating] = d.cnt; });

    // Reviews
    const [reviews] = await db.query(
      `SELECT cr.id, cr.rating, cr.review_text, cr.created_at, u.name AS reviewer_name, u.avatar AS reviewer_avatar
       FROM course_reviews cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.course_id = ?
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [courseId, limit + 1, offset]
    );

    const has_more = reviews.length > limit;
    if (has_more) reviews.pop();

    res.json({
      average_rating: stats.average_rating ? Number(stats.average_rating).toFixed(1) : null,
      total_reviews: stats.total_reviews || 0,
      distribution,
      reviews,
      has_more,
      page
    });
  } catch (e) {
    console.error('getReviews:', e);
    res.status(500).json({ message: e.message });
  }
};

exports.createReview = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const { rating, review_text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be 1–5' });
    }

    // Must be enrolled
    const enrolled = await checkEnrollment(userId, courseId);
    if (!enrolled) {
      return res.status(403).json({ message: 'You must enroll in this course to leave a review' });
    }

    // Upsert (one review per student per course)
    await db.query(
      `INSERT INTO course_reviews (course_id, user_id, rating, review_text, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE rating=?, review_text=?, updated_at=NOW()`,
      [courseId, userId, rating, review_text || '', rating, review_text || '']
    );

    // Update cached rating on courses table
    await db.query(
      `UPDATE courses SET rating=(SELECT AVG(rating) FROM course_reviews WHERE course_id=?),
       review_count=(SELECT COUNT(*) FROM course_reviews WHERE course_id=?) WHERE id=?`,
      [courseId, courseId, courseId]
    ).catch(() => {});

    res.json({ ok: true, message: 'Review submitted' });
  } catch (e) {
    console.error('createReview:', e);
    res.status(500).json({ message: e.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW — Lesson Comments (Discussion)
// GET  /courses/:id/lessons/:lessonId/comments
// POST /courses/:id/lessons/:lessonId/comments  { comment_text }
// ─────────────────────────────────────────────────────────────────────────────
exports.getLessonComments = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const [comments] = await db.query(
      `SELECT lc.id, lc.comment_text, lc.created_at, u.name AS commenter_name, u.avatar
       FROM lesson_comments lc
       JOIN users u ON lc.user_id = u.id
       WHERE lc.lesson_id = ?
       ORDER BY lc.created_at ASC`,
      [lessonId]
    );
    res.json({ comments });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.postLessonComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId, id: courseId } = req.params;
    const { comment_text } = req.body;

    if (!comment_text?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

    // Must be enrolled
    const enrolled = await checkEnrollment(userId, courseId);
    if (!enrolled) return res.status(403).json({ message: 'Enrollment required' });

    const [r] = await db.query(
      'INSERT INTO lesson_comments (lesson_id, course_id, user_id, comment_text, created_at) VALUES (?, ?, ?, ?, NOW())',
      [lessonId, courseId, userId, comment_text.trim()]
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// (duplicate getLessonComments/postLessonComment removed)
// ════════════════════════════════════════════════════════════════
// INSTRUCTOR CERTIFICATE TEMPLATES
// Routes to add in courses.js:
//   const instrCertUpload = multer({ storage: multer.diskStorage({
//     destination: (req,file,cb) => { const d='uploads/certificates/instructor'; require('fs').mkdirSync(d,{recursive:true}); cb(null,d); },
//     filename: (req,file,cb) => cb(null, Date.now()+require('path').extname(file.originalname))
//   }), limits:{fileSize:10*1024*1024} });
//   router.get('/instructor/certificate-templates', authMiddleware, instructorMiddleware, exports.listInstructorCertTemplates);
//   router.post('/instructor/certificate-templates', authMiddleware, instructorMiddleware, instrCertUpload.single('cert_template'), exports.saveInstructorCertTemplate);
//   router.delete('/instructor/certificate-templates/:id', authMiddleware, instructorMiddleware, exports.deleteInstructorCertTemplate);
// ════════════════════════════════════════════════════════════════

exports.listInstructorCertTemplates = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM instructor_certificate_templates WHERE instructor_id=? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.saveInstructorCertTemplate = async (req, res) => {
  try {
    const { name, name_x_percent, name_y_percent, name_font_size, name_color, name_font, is_default } = req.body;
    if (!name) return res.status(400).json({ message: 'Template name required' });
    let img = null;
    if (req.file) img = '/uploads/certificates/instructor/' + req.file.filename;
    if (is_default === 'true') {
      await db.query('UPDATE instructor_certificate_templates SET is_default=0 WHERE instructor_id=?', [req.user.id]);
    }
    const [result] = await db.query(
      `INSERT INTO instructor_certificate_templates
       (instructor_id,name,template_image,name_x_percent,name_y_percent,name_font_size,name_color,name_font,is_default)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.user.id, name, img,
       name_x_percent||50, name_y_percent||55, name_font_size||48,
       name_color||'#1a1a2e', name_font||'Georgia', is_default==='true'?1:0]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.deleteInstructorCertTemplate = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM instructor_certificate_templates WHERE id=? AND instructor_id=?',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
};