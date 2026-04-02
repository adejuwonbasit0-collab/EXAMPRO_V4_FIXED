const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/adminController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const subscriptionMiddleware = require("../middleware/subscriptionMiddleware");
const { pdfOrImageFilter } = require("../middleware/validation");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = (folder) => {
  const dir = path.join(__dirname, "../uploads", folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, f, cb) => cb(null, dir),
    filename: (req, f, cb) => cb(null, Date.now() + "_" + f.originalname.replace(/\s/g, "_"))
  });
};
const certUpload = multer({ storage: storage("certificates"), fileFilter: pdfOrImageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Instructor-accessible endpoints (auth only, NO adminMiddleware) ──
// MUST be before router.use(adminMiddleware) below or they'll be blocked
router.get("/instructor-earnings", authMiddleware, ctrl.getInstructorEarnings);
router.post("/withdrawal-request", authMiddleware, ctrl.requestWithdrawal);


// ── Subscription-exempt endpoints (expired admins must still reach these) ──
// Plans list — expired admin needs to see plans to subscribe
router.get('/plans', async (req, res) => {
  try {
    const db = require('../config/database');
    const [rows] = await db.query('SELECT * FROM subscription_plans WHERE is_active=1 ORDER BY price ASC');
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// My subscription status — expired admin needs to see this in the billing tab
router.get('/my-subscription', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const [rows] = await db.query(
      'SELECT plan, status, expires_at, notes FROM admin_subscriptions WHERE admin_id=? ORDER BY id DESC LIMIT 1',
      [req.user.id]
    );
    if (!rows.length) return res.json({ plan: null, status: 'none', expires_at: null });
    res.json(rows[0]);
  } catch(e) {
    res.json({ plan: null, status: 'none', expires_at: null });
  }
});

// ── Everything below requires active admin subscription ──
router.use(authMiddleware, adminMiddleware, subscriptionMiddleware);

// Dashboard & site
router.get("/dashboard", ctrl.getDashboard);
router.get("/site", ctrl.getMySite);
router.get("/my-site", ctrl.getMySite);

// Courses
router.get("/courses", ctrl.getCourses);
router.patch("/courses/:id/approve", ctrl.approveCourse);
router.patch("/courses/:id/reject", ctrl.rejectCourse);

// Course reviews (for admin panel review tab)
router.get("/course-reviews", async (req, res) => {
  try {
    const db = require("../config/database");
    // Get reviews for courses that belong to this admin's school
    // Includes courses admin created directly + courses by instructors in this school
    const [reviews] = await db.query(
      `SELECT cr.id, cr.rating, cr.review, cr.created_at, cr.is_approved,
              u.name AS reviewer_name,
              c.title AS course_title,
              c.instructor_id
       FROM course_reviews cr
       JOIN users u ON cr.user_id = u.id
       JOIN courses c ON cr.course_id = c.id
       WHERE c.instructor_id = ?
          OR c.site_id = (SELECT s.id FROM admin_sites s WHERE s.user_id = ? LIMIT 1)
          OR c.instructor_id IN (
            SELECT id FROM users
            WHERE site_id = (SELECT s.id FROM admin_sites s WHERE s.user_id = ? LIMIT 1)
          )
       ORDER BY cr.created_at DESC
       LIMIT 200`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json({ reviews });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete("/course-reviews/:id", async (req, res) => {
  try {
    const db = require("../config/database");
    await db.query("DELETE FROM course_reviews WHERE id=?", [req.params.id]);
    res.json({ ok: true, message: "Review deleted" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Top students (used by admin dashboard)
router.get("/top-students", async (req, res) => {
  try {
    const db = require("../config/database");
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email,
              COUNT(DISTINCT o.id) AS total_purchases,
              COALESCE(SUM(o.amount),0) AS total_spent
       FROM users u
       JOIN orders o ON o.user_id = u.id AND o.payment_status = 'success'
       WHERE u.site_id = (SELECT site_id FROM users WHERE id = ? LIMIT 1)
       GROUP BY u.id ORDER BY total_spent DESC LIMIT 10`,
      [req.user.id]
    );
    res.json({ students });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Users & instructors
router.get("/users", ctrl.getUsers);
router.patch("/users/:id/toggle", ctrl.toggleUser);
router.get("/users/:id/transactions", ctrl.getUserTransactions);
router.get("/instructors", ctrl.getInstructors);
router.patch("/instructors/:id/approve", ctrl.approveInstructor);
router.patch("/instructors/:id/reject", ctrl.rejectInstructor);

// ── CBT Exams ──────────────────────────────────────────────────────────────
router.get("/cbt-exams", async (req, res) => {
  try {
    const adminId = req.user.id;
    const [[site]] = await db.query("SELECT id FROM admin_sites WHERE user_id=?", [adminId]);
    const siteId = site?.id || null;
    const [rows] = await db.query(
      "SELECT e.*, (SELECT COUNT(*) FROM cbt_questions WHERE exam_id=e.id) as question_count, (SELECT COUNT(*) FROM cbt_attempts WHERE exam_id=e.id) as attempt_count FROM cbt_exams e WHERE e.admin_id=? ORDER BY e.created_at DESC",
      [adminId]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/cbt-exams", async (req, res) => {
  try {
    const { title, description, subject, duration_minutes, pass_score, shuffle_questions, shuffle_options, show_result_immediately } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });
    const adminId = req.user.id;
    const [[site]] = await db.query("SELECT id FROM admin_sites WHERE user_id=?", [adminId]);
    const siteId = site?.id || null;
    const [r] = await db.query(
      "INSERT INTO cbt_exams (admin_id,site_id,title,description,subject,duration_minutes,pass_score,shuffle_questions,shuffle_options,show_result_immediately) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [adminId, siteId, title, description||'', subject||'', duration_minutes||60, pass_score||50, shuffle_questions?1:0, shuffle_options?1:0, show_result_immediately!==false?1:0]
    );
    res.json({ ok: true, id: r.insertId, message: "CBT exam created" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put("/cbt-exams/:id", async (req, res) => {
  try {
    const { title, description, subject, duration_minutes, pass_score, shuffle_questions, shuffle_options, show_result_immediately, is_active } = req.body;
    await db.query(
      "UPDATE cbt_exams SET title=?,description=?,subject=?,duration_minutes=?,pass_score=?,shuffle_questions=?,shuffle_options=?,show_result_immediately=?,is_active=? WHERE id=? AND admin_id=?",
      [title, description||'', subject||'', duration_minutes||60, pass_score||50, shuffle_questions?1:0, shuffle_options?1:0, show_result_immediately!==false?1:0, is_active!==false?1:0, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete("/cbt-exams/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM cbt_exams WHERE id=? AND admin_id=?", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// CBT Questions CRUD
router.get("/cbt-exams/:id/questions", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM cbt_questions WHERE exam_id=? ORDER BY order_num", [req.params.id]);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/cbt-exams/:id/questions", async (req, res) => {
  try {
    const examId = req.params.id;
    const { question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, marks, past_question_id } = req.body;
    if (!question_text) return res.status(400).json({ message: "Question text required" });
    const [[countRow]] = await db.query("SELECT COUNT(*) as cnt FROM cbt_questions WHERE exam_id=?", [examId]);
    const [r] = await db.query(
      "INSERT INTO cbt_questions (exam_id,past_question_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,marks,order_num) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [examId, past_question_id||null, question_text, option_a||'', option_b||'', option_c||'', option_d||'', correct_answer||'a', explanation||'', marks||1, countRow.cnt]
    );
    await db.query("UPDATE cbt_exams SET total_questions=(SELECT COUNT(*) FROM cbt_questions WHERE exam_id=?) WHERE id=?", [examId, examId]);
    res.json({ ok: true, id: r.insertId });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/cbt-exams/:id/questions/bulk", async (req, res) => {
  try {
    const examId = req.params.id;
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length)
      return res.status(400).json({ message: "Questions array required" });
    // Replace all questions
    await db.query("DELETE FROM cbt_questions WHERE exam_id=?", [examId]);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        "INSERT INTO cbt_questions (exam_id,past_question_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,marks,order_num) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [examId, q.past_question_id||null, q.question_text, q.option_a||'', q.option_b||'', q.option_c||'', q.option_d||'', q.correct_answer||'a', q.explanation||'', q.marks||1, i]
      );
    }
    await db.query("UPDATE cbt_exams SET total_questions=? WHERE id=?", [questions.length, examId]);
    res.json({ ok: true, count: questions.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete("/cbt-exams/:examId/questions/:qId", async (req, res) => {
  try {
    await db.query("DELETE FROM cbt_questions WHERE id=? AND exam_id=?", [req.params.qId, req.params.examId]);
    await db.query("UPDATE cbt_exams SET total_questions=(SELECT COUNT(*) FROM cbt_questions WHERE exam_id=?) WHERE id=?", [req.params.examId, req.params.examId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// CBT Attempts (admin view)
router.get("/cbt-exams/:id/attempts", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT a.*, u.name as student_name, u.email as student_email FROM cbt_attempts a JOIN users u ON a.student_id=u.id WHERE a.exam_id=? ORDER BY a.started_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Admin Quiz management
router.get("/quizzes", async (req, res) => {
  try {
    const adminId = req.user.id;
    const [[site]] = await db.query("SELECT id FROM admin_sites WHERE user_id=?", [adminId]);
    const siteId = site?.id;
    const [rows] = await db.query(`
      SELECT q.*, c.title as course_title,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id=q.id) as question_count,
        (SELECT COUNT(*) FROM quiz_answers WHERE quiz_id=q.id) as attempt_count
      FROM course_quizzes q
      JOIN courses c ON q.course_id=c.id
      WHERE c.site_id=? OR c.admin_id=?
      ORDER BY q.created_at DESC`,
      [siteId||0, adminId]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get("/quiz-questions/:quizId", async (req, res) => {
  try {
    const [questions] = await db.query(
      "SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY order_num",
      [req.params.quizId]
    );
    res.json({ questions });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Transactions & payments
router.get("/transactions", ctrl.getTransactions);
router.get("/bank-transfers", ctrl.getBankTransfers);
router.patch("/bank-transfers/:id/approve", ctrl.approveBankTransfer);
router.patch("/bank-transfers/:id/reject", ctrl.rejectBankTransfer);
router.get("/withdrawals", ctrl.getWithdrawals);
router.patch("/withdrawals/:id", ctrl.processWithdrawal);

// Payment settings (display layer — payment_settings table)
router.get("/payment-settings", ctrl.getPaymentSettings);
router.put("/payment-settings", ctrl.updatePaymentSettings);
router.post("/payment-settings", ctrl.updatePaymentSettings);      // alias for POST
router.post("/payment-settings-v4", ctrl.updatePaymentSettings);   // v4 frontend alias

// Payment settings (processing layer — admin_payment_settings table, used by paymentController)
router.get("/my-payment-settings", async (req, res) => {
  try {
    const db = require("../config/database");
    const [rows] = await db.query("SELECT * FROM admin_payment_settings WHERE admin_id=?", [req.user.id]);
    const s = rows[0] || {};
    // Never return secret keys to the frontend
    delete s.paystack_secret_key; delete s.flutterwave_secret_key;
    delete s.stripe_secret_key; delete s.payoneer_secret_key;
    res.json(s);
  } catch(e) { res.status(500).json({ message: e.message }); }
});
router.put("/my-payment-settings", async (req, res) => {
  try {
    const db = require("../config/database");
    const f = req.body;
    await db.query(
      `INSERT INTO admin_payment_settings
        (admin_id,paystack_public_key,paystack_secret_key,flutterwave_public_key,flutterwave_secret_key,
         stripe_public_key,stripe_secret_key,payoneer_public_key,payoneer_secret_key,
         bank_name,bank_account_name,bank_account_number,bank_instructions,debit_card_enabled,
         webhook_secret,currency,payment_description)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         paystack_public_key   = VALUES(paystack_public_key),
         paystack_secret_key   = IF(VALUES(paystack_secret_key)  !='', VALUES(paystack_secret_key),   paystack_secret_key),
         flutterwave_public_key= VALUES(flutterwave_public_key),
         flutterwave_secret_key= IF(VALUES(flutterwave_secret_key)!='', VALUES(flutterwave_secret_key), flutterwave_secret_key),
         stripe_public_key     = VALUES(stripe_public_key),
         stripe_secret_key     = IF(VALUES(stripe_secret_key)    !='', VALUES(stripe_secret_key),     stripe_secret_key),
         bank_name             = VALUES(bank_name),
         bank_account_name     = VALUES(bank_account_name),
         bank_account_number   = VALUES(bank_account_number),
         bank_instructions     = VALUES(bank_instructions),
         debit_card_enabled    = VALUES(debit_card_enabled),
         webhook_secret        = VALUES(webhook_secret),
         currency              = VALUES(currency),
         payment_description   = VALUES(payment_description)`,
      [req.user.id,
       f.paystack_public_key||'',   f.paystack_secret_key||'',
       f.flutterwave_public_key||'', f.flutterwave_secret_key||'',
       f.stripe_public_key||'',     f.stripe_secret_key||'',
       f.payoneer_public_key||'',   f.payoneer_secret_key||'',
       f.bank_name||'',             f.bank_account_name||'',
       f.bank_account_number||'',   f.bank_instructions||'',
       f.debit_card_enabled||0,     f.webhook_secret||'',
       f.currency||'NGN',           f.payment_description||'']
    );
    res.json({ ok: true, message: "Payment settings saved" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Site & other settings
router.get("/site-settings", ctrl.getSiteSettings);
router.put("/site-settings", ctrl.updateSiteSettings);

// SMTP settings
router.get("/smtp", ctrl.getSmtpSettings);
router.post("/smtp", ctrl.saveSmtpSettings);
router.get("/smtp-settings", ctrl.getSmtpSettings);

// Multi-tenant SMTP (school-specific, stored in admin_smtp_settings)
router.get("/my-smtp", async (req, res) => {
  try {
    const db = require("../config/database");
    const [rows] = await db.query(
      "SELECT id,admin_id,smtp_host,smtp_port,smtp_user,smtp_secure,sender_email,sender_name, (smtp_pass IS NOT NULL AND smtp_pass != '') AS smtp_pass_saved FROM admin_smtp_settings WHERE admin_id=?",
      [req.user.id]
    );
    res.json(rows[0] || {});
  } catch(e) { res.status(500).json({ message: e.message }); }
});
router.put("/my-smtp", async (req, res) => {
  try {
    const db = require("../config/database");
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, sender_email, sender_name } = req.body;
    await db.query(
      `INSERT INTO admin_smtp_settings (admin_id,smtp_host,smtp_port,smtp_user,smtp_pass,smtp_secure,sender_email,sender_name)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         smtp_host=VALUES(smtp_host), smtp_port=VALUES(smtp_port),
         smtp_user=VALUES(smtp_user),
         smtp_pass=IF(VALUES(smtp_pass)!='',VALUES(smtp_pass),smtp_pass),
         smtp_secure=VALUES(smtp_secure), sender_email=VALUES(sender_email), sender_name=VALUES(sender_name)`,
      [req.user.id, smtp_host||'', smtp_port||587, smtp_user||'', smtp_pass||'',
       smtp_secure?1:0, sender_email||'', sender_name||'']
    );
    res.json({ ok: true, message: "SMTP settings saved" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});
router.post("/my-smtp/test", async (req, res) => {
  try {
    const db = require("../config/database");
    const { sendEmail, getAdminSmtp } = require("../config/email");
    const smtp = await getAdminSmtp(db, req.user.id);
    if (!smtp) return res.status(400).json({ message: "No SMTP settings found. Please save your SMTP settings first." });
    const ok = await sendEmail({ to: req.user.email, subject: "SMTP Test ✅", html: "<h2>Your SMTP is working!</h2><p>This test email was sent from ExamPro using your school SMTP settings.</p>", adminSmtp: smtp });
    res.json({ message: ok ? "Test email sent to " + req.user.email : "Failed to send email" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Email templates
router.get("/email-templates", ctrl.getEmailTemplates);
router.post("/email-templates", ctrl.saveEmailTemplate);
router.delete("/email-templates/:key", async (req, res) => {
  try {
    await db.query("DELETE FROM email_templates WHERE admin_id=? AND template_key=?", [req.user.id, req.params.key]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Revenue analytics
router.get("/revenue-analytics", ctrl.getRevenueAnalytics);

// Lectures
router.get("/lectures", ctrl.getLectures);
router.post("/lectures", ctrl.createLecture);

// Notifications
router.post("/notifications/send", ctrl.sendNotification);

// Certificates
router.get("/certificate-templates", ctrl.getCertificateTemplates);
router.post("/certificate-templates", certUpload.single("cert_template"), ctrl.saveCertificateTemplate);

// Page builder
router.get("/pages", ctrl.getPageBuilder);
router.post("/pages", ctrl.savePageBuilder);
router.get("/page-builder", ctrl.getPageBuilder);
router.post("/page-builder", ctrl.savePageBuilder);

// ── COUPONS ──────────────────────────────────────────────────────────────────
router.get("/coupons", async (req, res) => {
  try {
    const adminId = req.user.id;
    const [[site]] = await db.query("SELECT id FROM admin_sites WHERE user_id=?", [adminId]);
    // Return coupons scoped to site OR admin
    if (site) {
      const [rows] = await db.query("SELECT * FROM coupons WHERE site_id=? ORDER BY created_at DESC", [site.id]);
      return res.json(rows);
    }
    // Fallback: coupons created_by this admin
    const [rows] = await db.query("SELECT * FROM coupons WHERE created_by=? ORDER BY created_at DESC", [adminId]);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/coupons", async (req, res) => {
  try {
    const adminId = req.user.id;
    const [[site]] = await db.query("SELECT id FROM admin_sites WHERE user_id=?", [adminId]);
    const siteId = site ? site.id : null;
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;
    if (!code || !discount_value) return res.status(400).json({ message: "Code and discount value required" });
    // If no site yet, just require created_by to be set
    if (!siteId) {
      // Check for duplicate by created_by + code
      const [dup] = await db.query("SELECT id FROM coupons WHERE created_by=? AND code=?", [adminId, code.toUpperCase()]);
      if (dup.length) return res.status(400).json({ message: "Coupon code already exists" });
      await db.query(
        "INSERT INTO coupons (site_id,created_by,code,discount_type,discount_value,min_order_amount,max_uses,expires_at) VALUES (NULL,?,?,?,?,?,?,?)",
        [adminId, code.toUpperCase(), discount_type||'percent', discount_value, min_order_amount||0, max_uses||null, expires_at||null]
      );
    } else {
      await db.query(
        "INSERT INTO coupons (site_id,created_by,code,discount_type,discount_value,min_order_amount,max_uses,expires_at) VALUES (?,?,?,?,?,?,?,?)",
        [siteId, adminId, code.toUpperCase(), discount_type||'percent', discount_value, min_order_amount||0, max_uses||null, expires_at||null]
      );
    }
    res.json({ ok: true, message: "Coupon created" });
  } catch(e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Coupon code already exists for this school" });
    res.status(500).json({ message: e.message });
  }
});

router.delete("/coupons/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM coupons WHERE id=?", [req.params.id]);
    res.json({ ok: true, message: "Coupon deleted" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, site_id, amount } = req.body;
    const [[coupon]] = await db.query(
      "SELECT * FROM coupons WHERE code=? AND site_id=? AND is_active=1 AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR uses_count < max_uses)",
      [code?.toUpperCase(), site_id]
    );
    if (!coupon) return res.status(404).json({ message: "Invalid or expired coupon code" });
    if (amount < coupon.min_order_amount) return res.status(400).json({ message: `Minimum order ₦${Number(coupon.min_order_amount).toLocaleString()} required` });
    const discount = coupon.discount_type === 'percent'
      ? Math.round(amount * coupon.discount_value / 100)
      : Math.min(coupon.discount_value, amount);
    res.json({ ok: true, coupon_id: coupon.id, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount_amount: discount, final_amount: amount - discount });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── module.exports MUST be last ──────────────────────────────────────────────


// ── Free plan subscription ────────────────────────────────────────────────────
router.post('/subscribe-free', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const { plan_id } = req.body;
    const [plans] = await db.query('SELECT * FROM subscription_plans WHERE id=? AND price=0 LIMIT 1', [plan_id]);
    if (!plans.length) return res.status(404).json({ message: 'Free plan not found' });
    const plan = plans[0];
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [existing] = await db.query('SELECT id FROM admin_subscriptions WHERE admin_id=?', [req.user.id]);
    if (existing.length) {
      await db.query('UPDATE admin_subscriptions SET plan=?,plan_name=?,status=?,expires_at=?,updated_at=NOW() WHERE admin_id=?',
        [plan.name, plan.name, 'active', expires, req.user.id]);
    } else {
      await db.query('INSERT INTO admin_subscriptions (admin_id,plan,plan_name,status,expires_at) VALUES (?,?,?,?,?)',
        [req.user.id, plan.name, plan.name, 'active', expires]);
    }
    res.json({ ok: true, message: 'Free plan activated! Expires in 7 days.' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;