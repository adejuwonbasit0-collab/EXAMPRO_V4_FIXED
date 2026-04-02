const db = require('../config/database');
const emailService = require('../services/emailService');

// ─── GET MY ENROLLED COURSES (with progress) ───
exports.getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    // Check BOTH orders table (payment_status=success) AND user_purchases table
    // finalizePayment writes to both, but legacy purchases may only be in user_purchases
    const [courses] = await db.query(`
      SELECT c.id, c.title, c.description, c.thumbnail, c.price, c.level, c.category,
             c.total_lessons, u.name AS instructor_name,
             (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS total_lessons_count,
             (SELECT COUNT(*) FROM lesson_progress lp
              WHERE lp.user_id = ? AND lp.course_id = c.id AND lp.is_completed = 1) AS completed_lessons
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id IN (
        SELECT item_id FROM orders
        WHERE user_id = ? AND item_type = 'course' AND payment_status = 'success'
        UNION
        SELECT item_id FROM user_purchases
        WHERE user_id = ? AND item_type = 'course'
      )
      ORDER BY c.created_at DESC
    `, [userId, userId, userId]);

    const result = courses.map(c => {
      const total = c.total_lessons_count || 0;
      const done = c.completed_lessons || 0;
      return {
        ...c,
        total_lessons: total,
        completed_lessons: done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0
      };
    });

    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── GET SINGLE COURSE FOR VIEWER (sections + lessons + progress) ───
exports.getCourseForStudent = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.id;

    // Check enrollment - check BOTH orders and user_purchases tables
    const [orders] = await db.query(
      `SELECT id FROM orders WHERE user_id=? AND item_id=? AND item_type='course' AND payment_status='success' LIMIT 1`,
      [userId, courseId]
    );
    const [purchases] = await db.query(
      `SELECT id FROM user_purchases WHERE user_id=? AND item_id=? AND item_type='course' LIMIT 1`,
      [userId, courseId]
    );
    const isEnrolled = orders.length > 0 || purchases.length > 0;

    // Get course info
    const [courses] = await db.query(
      `SELECT c.*, u.name AS instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id=u.id WHERE c.id=?`,
      [courseId]
    );
    if (!courses.length) return res.status(404).json({ message: 'Course not found' });

    // Get sections + lessons
    const [sections] = await db.query(
      `SELECT * FROM course_sections WHERE course_id=? ORDER BY order_num`,
      [courseId]
    );
    const [lessons] = await db.query(
      `SELECT id, section_id, title, video_type, video_url, duration_minutes, content, material_url, is_preview, order_num
       FROM course_lessons WHERE course_id=? ORDER BY order_num`,
      [courseId]
    );

    // Get completed lesson IDs for this user
    const [completedRows] = await db.query(
      `SELECT lesson_id FROM lesson_progress WHERE user_id=? AND course_id=? AND is_completed=1`,
      [userId, courseId]
    );
    const completedLessons = completedRows.map(r => r.lesson_id);

    // Attach lessons to sections
    const sectionsWithLessons = sections.map(s => ({
      ...s,
      lessons: lessons.filter(l => l.section_id === s.id)
        .map(l => ({ ...l, video_url: (isEnrolled || l.is_preview) ? l.video_url : null }))
    }));

    res.json({
      ...courses[0],
      is_enrolled: isEnrolled,
      sections: sectionsWithLessons,
      completed_lessons: completedLessons
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── MARK LESSON COMPLETE ───
exports.markLessonComplete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lesson_id } = req.body;
    if (!lesson_id) return res.status(400).json({ message: 'lesson_id required' });

    // Get lesson to find course_id
    const [lessons] = await db.query(`SELECT course_id FROM course_lessons WHERE id=?`, [lesson_id]);
    if (!lessons.length) return res.status(404).json({ message: 'Lesson not found' });
    const courseId = lessons[0].course_id;

    // Verify user is enrolled - check both orders and user_purchases
    const [orders] = await db.query(
      `SELECT id FROM orders WHERE user_id=? AND item_id=? AND item_type='course' AND payment_status='success' LIMIT 1`,
      [userId, courseId]
    );
    const [purchasesCheck] = await db.query(
      `SELECT id FROM user_purchases WHERE user_id=? AND item_id=? AND item_type='course' LIMIT 1`,
      [userId, courseId]
    );
    // Allow if enrolled OR if lesson is preview
    const [lessonRow] = await db.query(`SELECT is_preview FROM course_lessons WHERE id=?`, [lesson_id]);
    if (!orders.length && !purchasesCheck.length && !lessonRow[0]?.is_preview) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Upsert progress
    await db.query(`
      INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, completed_at)
      VALUES (?, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE is_completed=1, completed_at=NOW()
    `, [userId, lesson_id, courseId]);

    // Check if course is now fully complete → generate certificate
    const [totalRows] = await db.query(`SELECT COUNT(*) AS cnt FROM course_lessons WHERE course_id=?`, [courseId]);
    const [doneRows] = await db.query(`SELECT COUNT(*) AS cnt FROM lesson_progress WHERE user_id=? AND course_id=? AND is_completed=1`, [userId, courseId]);
    const total = totalRows[0].cnt;
    const done = doneRows[0].cnt;

    let certificate_earned = false;
    if (total > 0 && done >= total) {
      // Issue certificate if not already issued
      const [existCert] = await db.query(
        `SELECT id FROM certificates WHERE user_id=? AND course_id=?`, [userId, courseId]
      );
      if (!existCert.length) {
        const certNumber = 'CERT-' + userId + '-' + courseId + '-' + Date.now();
        await db.query(
          `INSERT INTO certificates (user_id, course_id, certificate_number) VALUES (?, ?, ?)`,
          [userId, courseId, certNumber]
        );
        certificate_earned = true;
        // Notify user
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'success')`,
          [userId, '🎓 Certificate Earned!', `Congratulations! You completed a course and earned your certificate.`]
        );
        // Send certificate email
        try {
          const [certUser] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [userId]);
          const [certCourse] = await db.query("SELECT title FROM courses WHERE id=? LIMIT 1", [courseId]);
          if (certUser[0] && certCourse[0]) {
            emailService.sendCertificateEarned(certUser[0], certCourse[0].title, certNumber, certUser[0].site_id).catch(() => {});
          }
        } catch (_) {}
      }
    }

    res.json({ ok: true, certificate_earned, progress: { completed: done, total } });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── GET MY PAST QUESTIONS ───
exports.getMyPastQuestions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get site_id for this user (to check pq_downloadable setting)
    const [userRows] = await db.query(`SELECT site_id FROM users WHERE id=?`, [userId]);
    const siteId = userRows[0]?.site_id;

    let pqDownloadable = true;
    if (siteId) {
      const [settings] = await db.query(
        `SELECT setting_value FROM site_settings WHERE site_id=? AND setting_key='pq_downloadable'`, [siteId]
      );
      if (settings.length && settings[0].setting_value === 'false') pqDownloadable = false;
    }

    const [rows] = await db.query(`
      SELECT pq.id, pq.title, pq.cover_image, pq.file_url, pq.exam_type, pq.subject, pq.year,
             pq.total_questions, pq.time_limit_minutes,
             i.name AS institution_name, i.short_name AS institution_short
      FROM past_questions pq
      LEFT JOIN institutions i ON pq.institution_id = i.id
      WHERE pq.id IN (
        SELECT item_id FROM orders
        WHERE user_id=? AND item_type='past_question' AND payment_status='success'
        UNION
        SELECT item_id FROM user_purchases
        WHERE user_id=? AND item_type='past_question'
      )
      ORDER BY pq.created_at DESC
    `, [userId, userId]);

    res.json(rows.map(r => ({ ...r, pq_downloadable: pqDownloadable })));
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── GET MY CERTIFICATES ───
exports.getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(`
      SELECT uc.id, uc.issued_at AS completed_at, uc.certificate_number,
             c.title AS course_title, c.thumbnail,
             instr.name AS instructor_name
      FROM certificates uc
      JOIN courses c ON uc.course_id = c.id
      JOIN users instr ON c.instructor_id = instr.id
      WHERE uc.user_id = ?
      ORDER BY uc.issued_at DESC
    `, [userId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── GET PROGRESS SUMMARY (for stats) ───
exports.getProgressSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const [lessonRows] = await db.query(
      `SELECT COUNT(*) AS completed_lessons FROM lesson_progress WHERE user_id=? AND is_completed=1`,
      [userId]
    );
    const [certRows] = await db.query(
      `SELECT COUNT(*) AS total_certs FROM certificates WHERE user_id=?`,
      [userId]
    );
    res.json({
      completed_lessons: lessonRows[0].completed_lessons || 0,
      total_certificates: certRows[0].total_certs || 0
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── MARK SINGLE NOTIFICATION READ ───
exports.markOneNotifRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─── MARK ALL NOTIFICATIONS READ ───
exports.markAllNotifsRead = async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read=1 WHERE user_id=?`, [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. WISHLIST
// GET    /student/wishlist
// POST   /student/wishlist         { item_type: 'course'|'past_question', item_id }
// DELETE /student/wishlist/:itemId  (removes course from wishlist)
// ─────────────────────────────────────────────────────────────────────────────
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT w.id, w.item_type, w.item_id, w.created_at,
              c.title, c.thumbnail, c.price, c.level, c.rating,
              u.name AS instructor_name
       FROM wishlist w
       LEFT JOIN courses c ON w.item_type='course' AND w.item_id=c.id
       LEFT JOIN users u ON c.instructor_id=u.id
       WHERE w.user_id=?
       ORDER BY w.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id } = req.body;
    if (!item_type || !item_id) return res.status(400).json({ message: 'item_type and item_id required' });
    await db.query(
      'INSERT IGNORE INTO wishlist (user_id, item_type, item_id) VALUES (?, ?, ?)',
      [userId, item_type, item_id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;
    await db.query(
      "DELETE FROM wishlist WHERE user_id=? AND item_id=? AND item_type='course'",
      [userId, itemId]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATS — includes total_spent
// GET /student/stats
// Returns: { total_courses, total_pq, total_spent, total_certs, overall_progress }
// ─────────────────────────────────────────────────────────────────────────────
exports.getStudentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total spent from successful orders
    const [[spentRow]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent FROM orders WHERE user_id=? AND payment_status='success'`,
      [userId]
    );

    // Course count
    const [[courseCount]] = await db.query(
      `SELECT COUNT(DISTINCT item_id) AS cnt FROM (
         SELECT item_id FROM orders WHERE user_id=? AND item_type='course' AND payment_status='success'
         UNION
         SELECT item_id FROM user_purchases WHERE user_id=? AND item_type='course'
       ) t`,
      [userId, userId]
    );

    // PQ count
    const [[pqCount]] = await db.query(
      `SELECT COUNT(DISTINCT item_id) AS cnt FROM (
         SELECT item_id FROM orders WHERE user_id=? AND item_type='past_question' AND payment_status='success'
         UNION
         SELECT item_id FROM user_purchases WHERE user_id=? AND item_type='past_question'
       ) t`,
      [userId, userId]
    );

    // Certificates
    const [[certCount]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM certificates WHERE user_id=?', [userId]
    );

    // Progress (lessons completed / total lessons across enrolled courses)
    const [[progressRow]] = await db.query(
      `SELECT COUNT(*) AS done FROM lesson_progress WHERE user_id=? AND is_completed=1`,
      [userId]
    );

    res.json({
      total_courses: courseCount.cnt || 0,
      total_pq: pqCount.cnt || 0,
      total_spent: spentRow.total_spent || 0,
      total_certs: certCount.cnt || 0,
      completed_lessons: progressRow.done || 0
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. INSTRUCTOR PUBLIC PROFILE
// GET /instructor/:id/profile
// ─────────────────────────────────────────────────────────────────────────────
exports.getInstructorProfile = async (req, res) => {
  try {
    const instructorId = req.params.id;

    // Basic info
    const [[user]] = await db.query(
      `SELECT u.id, u.name, u.avatar, u.bio, u.institution_name AS title,
              u.created_at
       FROM users u
       WHERE u.id=? AND u.role_id IN (2,3,4)`,
      [instructorId]
    );
    if (!user) return res.status(404).json({ message: 'Instructor not found' });

    // Courses published
    const [courses] = await db.query(
      `SELECT c.id, c.title, c.thumbnail, c.price, c.rating, c.review_count,
              c.enrolled_count, c.level, c.duration_hours, c.total_lessons,
              c.category, c.created_at
       FROM courses c
       WHERE c.instructor_id=? AND c.is_active=1 AND c.is_published=1
       ORDER BY c.enrolled_count DESC`,
      [instructorId]
    );

    // Aggregate stats
    const [[stats]] = await db.query(
      `SELECT
         COUNT(DISTINCT c.id) AS total_courses,
         COALESCE(SUM(c.enrolled_count), 0) AS total_students,
         COALESCE(AVG(c.rating), 0) AS average_rating,
         COALESCE(SUM(c.review_count), 0) AS total_reviews
       FROM courses c
       WHERE c.instructor_id=? AND c.is_active=1`,
      [instructorId]
    );

    res.json({
      ...user,
      courses,
      total_courses: stats.total_courses || 0,
      total_students: stats.total_students || 0,
      average_rating: stats.average_rating ? Number(stats.average_rating).toFixed(1) : null,
      total_reviews: stats.total_reviews || 0
    });
  } catch (e) {
    console.error('getInstructorProfile:', e);
    res.status(500).json({ message: e.message });
  }
};

// ════════════════════════════════════════════════════════════════
// STUDENT ↔ INSTRUCTOR PRIVATE CHAT
// Routes to add in student.js:
//   router.post('/start-chat', ctrl.startConversation);
//   router.get('/conversations', ctrl.getMyConversations);
//   router.get('/conversation/:id/messages', ctrl.getConversationMessages);
//   router.post('/conversation/:id/messages', ctrl.sendChatMessage);
//   router.post('/conversation/:id/read', ctrl.markConversationRead);
// And in courses.js (or instructor route file):
//   router.get('/instructor/conversations', authMiddleware, instructorMiddleware, ctrl.getInstructorConversations);
// ════════════════════════════════════════════════════════════════

exports.startConversation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id } = req.body;
    if (!course_id) return res.status(400).json({ message: 'course_id required' });

    // Verify student is enrolled in this course
    const [enr] = await db.query(
      `SELECT 1 FROM orders WHERE user_id=? AND item_id=? AND item_type='course' AND payment_status='success'
       UNION
       SELECT 1 FROM user_purchases WHERE user_id=? AND item_id=? AND item_type='course'`,
      [studentId, course_id, studentId, course_id]
    );
    if (!enr.length) return res.status(403).json({ message: 'You must be enrolled in this course to message the instructor' });

    const [[course]] = await db.query('SELECT id, title, instructor_id FROM courses WHERE id=?', [course_id]);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Get or create conversation
    let [[conv]] = await db.query(
      'SELECT * FROM chat_conversations WHERE student_id=? AND instructor_id=? AND course_id=?',
      [studentId, course.instructor_id, course_id]
    );
    if (!conv) {
      const [r] = await db.query(
        'INSERT INTO chat_conversations (student_id, instructor_id, course_id) VALUES (?,?,?)',
        [studentId, course.instructor_id, course_id]
      );
      [[conv]] = await db.query('SELECT * FROM chat_conversations WHERE id=?', [r.insertId]);
    }

    const [[instructor]] = await db.query('SELECT name FROM users WHERE id=?', [course.instructor_id]);
    res.json({ conversation: conv, course_title: course.title, instructor_name: instructor?.name || '' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT cc.id, cc.course_id, cc.instructor_id, cc.updated_at,
              c.title AS course_title,
              u.name  AS instructor_name,
              (SELECT cm.message_text FROM chat_messages cm
               WHERE cm.conversation_id=cc.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM chat_messages cm
               WHERE cm.conversation_id=cc.id AND cm.sender_id != ? AND cm.is_read=0) AS unread_count
       FROM chat_conversations cc
       JOIN courses c ON c.id=cc.course_id
       JOIN users   u ON u.id=cc.instructor_id
       WHERE cc.student_id=?
       ORDER BY cc.updated_at DESC`,
      [userId, userId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getInstructorConversations = async (req, res) => {
  try {
    const instrId = req.user.id;
    const [rows] = await db.query(
      `SELECT cc.id, cc.course_id, cc.student_id, cc.updated_at,
              c.title AS course_title,
              u.name  AS student_name,
              (SELECT cm.message_text FROM chat_messages cm
               WHERE cm.conversation_id=cc.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM chat_messages cm
               WHERE cm.conversation_id=cc.id AND cm.sender_id != ? AND cm.is_read=0) AS unread_count
       FROM chat_conversations cc
       JOIN courses c ON c.id=cc.course_id
       JOIN users   u ON u.id=cc.student_id
       WHERE cc.instructor_id=?
       ORDER BY cc.updated_at DESC`,
      [instrId, instrId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    const [[conv]] = await db.query(
      'SELECT * FROM chat_conversations WHERE id=? AND (student_id=? OR instructor_id=?)',
      [convId, userId, userId]
    );
    if (!conv) return res.status(403).json({ message: 'Access denied' });

    const [messages] = await db.query(
      `SELECT cm.id, cm.sender_id, cm.message_text, cm.is_read, cm.created_at,
              u.name AS sender_name
       FROM chat_messages cm JOIN users u ON u.id=cm.sender_id
       WHERE cm.conversation_id=?
       ORDER BY cm.created_at ASC`,
      [convId]
    );
    res.json(messages);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const convId   = req.params.id;
    const { message_text } = req.body;
    if (!message_text?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const [[conv]] = await db.query(
      'SELECT * FROM chat_conversations WHERE id=? AND (student_id=? OR instructor_id=?)',
      [convId, senderId, senderId]
    );
    if (!conv) return res.status(403).json({ message: 'Access denied' });

    const [r] = await db.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, message_text) VALUES (?,?,?)',
      [convId, senderId, message_text.trim()]
    );
    await db.query('UPDATE chat_conversations SET updated_at=NOW() WHERE id=?', [convId]);
    res.json({ ok: true, id: r.insertId });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.markConversationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    const [[conv]] = await db.query(
      'SELECT * FROM chat_conversations WHERE id=? AND (student_id=? OR instructor_id=?)',
      [convId, userId, userId]
    );
    if (!conv) return res.status(403).json({ message: 'Access denied' });
    await db.query(
      'UPDATE chat_messages SET is_read=1 WHERE conversation_id=? AND sender_id != ?',
      [convId, userId]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
};