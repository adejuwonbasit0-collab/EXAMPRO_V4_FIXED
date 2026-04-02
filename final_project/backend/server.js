const express = require("express");
const http    = require("http");
const initChatSocket = require("./socket/chatSocket");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });


const app = express();
// ── SECURITY MIDDLEWARE ──
try {
  const helmet = require("helmet");
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
} catch(_) { console.warn("Helmet not installed - run: npm install helmet"); }

try {
  const rateLimit = require("express-rate-limit");
  app.use("/api/auth", rateLimit({ windowMs: 15*60*1000, max: 30, message: { message: "Too many requests" } }));
  app.use("/api", rateLimit({ windowMs: 15*60*1000, max: 500 }));
} catch(_) { console.warn("express-rate-limit not installed - run: npm install express-rate-limit"); }

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5000").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS: origin not allowed"));
  },
  credentials: true
}));
// Capture raw body for webhook signature verification (Paystack, Stripe, Flutterwave)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/payments/webhook")) {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch (_) { req.body = {}; }
      next();
    });
  } else {
    next();
  }
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Frontend pages helper
const fp = path.join(__dirname, "../frontend");
const pg = (f) => path.join(fp, "pages", f);

// Sub-domain routes must be before static
app.get("/site/:subdomain/course/:id", (req,res) => res.sendFile(pg("school-site-course.html")));
app.get("/site/:subdomain/past-question/:id", (req,res) => res.sendFile(pg("school-site-pq.html")));

app.use(express.static(path.join(__dirname, "../frontend/public")));

// ── API ROUTES ──
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/institutions", require("./routes/institutions"));
app.use("/api/past-questions", require("./routes/pastQuestions"));
app.use("/api/courses", require("./routes/courses"));
// courses_v2 disabled — routes merged into courses.js to prevent conflicts
// app.use("/api/courses", require("./routes/courses_v2"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/student", require("./routes/student"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/super-admin", require("./routes/super-admin"));
// Public template endpoints (no auth needed)
app.use("/api/chat", require("./routes/chat"));
// Page builder routes (dedicated route file)
app.use("/api/earnings", require("./routes/instructor_earnings"));
app.use("/api/public", require("./routes/public"));
app.use("/api/templates", require("./routes/templates"));
app.use("/api/pagebuilder", require("./routes/pagebuilder"));
app.use("/api/ai", require("./routes/aiProxy"));

// ── PAGE BUILDER ADDITIONS ──────────────────────────────────────────────────
// Server-side rendering: JSON layout → HTML for live school sites
app.use("/api/render", require("./routes/render"));
// Revision history: every save creates a version, admins can restore
app.use("/api/revisions", require("./routes/revisions"));

// ── AUTO-MIGRATION: ensure all required columns exist ──────────────────────
(async () => {
  try {
    const dbConn = require("./config/database");
    const migrations = [
      // Users table additions
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id INT DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved TINYINT(1) DEFAULT 1",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_admin INT DEFAULT NULL",
      // Courses table
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrolled_count INT DEFAULT 0",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
      // past_questions table
      "ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS instructor_id INT DEFAULT NULL",
      "ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL",
      "ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE",
      // admin_sites
      "ALTER TABLE admin_sites ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1",
      // page_templates colors
      "ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#2563eb'",
      "ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#10b981'",
      "ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS description TEXT",
      // bank_details
      "ALTER TABLE bank_details ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL",
      "ALTER TABLE bank_details ADD COLUMN IF NOT EXISTS is_primary TINYINT(1) DEFAULT 0",
      // Payment settings: add admin_id for per-admin gateway scoping
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS admin_id INT DEFAULT NULL",
      "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL",
      // Templates: which plan is required to use it
      "ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS required_plan VARCHAR(50) DEFAULT NULL",
      // Subscription plans: add template_access field
      "ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS template_access ENUM('all','basic','none') DEFAULT 'all'",
      "ALTER TABLE payment_settings DROP INDEX IF EXISTS gateway",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_ps_admin_gateway ON payment_settings(admin_id, gateway)",
      // quiz section linking
      "ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS section_id INT DEFAULT NULL",
      "ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS time_limit_minutes INT DEFAULT 0",
      // past question CBT timer
      "ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS time_limit_minutes INT DEFAULT 0",
      "ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS pass_score INT DEFAULT 70",
      // quiz question types (if not already added)
      "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type ENUM('multiple_choice','true_false','short_answer','fill_blank') DEFAULT 'multiple_choice'",
      "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_text_answer TEXT DEFAULT NULL",
      // certificates extra fields
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(200) DEFAULT NULL",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_title VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS qr_code_data TEXT DEFAULT NULL",
      "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS completed_at DATETIME DEFAULT NULL",
      // email templates — custom per-admin email templates
      `CREATE TABLE IF NOT EXISTS email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        template_key VARCHAR(100) NOT NULL,
        subject VARCHAR(255),
        body LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_admin_template (admin_id, template_key)
      )`,
      // Withdrawal requests table (instructor earnings system)
      `CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instructor_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        bank_name VARCHAR(100),
        account_number VARCHAR(30),
        account_name VARCHAR(150),
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        admin_note TEXT,
        processed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      // Page revisions (page builder save history)
      `CREATE TABLE IF NOT EXISTS page_revisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        page_slug VARCHAR(100) NOT NULL DEFAULT 'home',
        page_data LONGTEXT,
        label VARCHAR(100),
        created_at DATETIME DEFAULT NOW(),
        INDEX idx_rev_admin (admin_id),
        INDEX idx_rev_slug (admin_id, page_slug)
      )`,
      // admin_pages (page builder current state)
      `CREATE TABLE IF NOT EXISTS admin_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        page_name VARCHAR(200) DEFAULT 'Home',
        page_slug VARCHAR(100) DEFAULT 'home',
        page_data LONGTEXT,
        is_published TINYINT(1) DEFAULT 0,
        published_at DATETIME DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_admin_slug (admin_id, page_slug)
      )`,
      // Ensure payment_settings has needed columns
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS public_key VARCHAR(500) DEFAULT NULL",
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS secret_key VARCHAR(500) DEFAULT NULL",
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(150) DEFAULT NULL",
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30) DEFAULT NULL",
      "ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS bank_instructions TEXT",
      // Ensure past_questions has site_id for multi-tenant scoping
      "ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS site_id INT DEFAULT NULL",
      // Ensure quiz_attempts has needed columns
      "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS past_question_id INT DEFAULT NULL",
      "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_taken_seconds INT DEFAULT 0",
      "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS answers JSON",
      // quiz_results for course quizzes
      `CREATE TABLE IF NOT EXISTS quiz_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        user_id INT NOT NULL,
        score INT DEFAULT 0,
        passed TINYINT(1) DEFAULT 0,
        answers JSON,
        completed_at DATETIME DEFAULT NOW(),
        UNIQUE KEY uniq_quiz_user (quiz_id, user_id)
      )`,
      // Instructor bank accounts (separate from bank_details)
      `CREATE TABLE IF NOT EXISTS instructor_bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instructor_id INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_name VARCHAR(150) NOT NULL,
        account_number VARCHAR(30) NOT NULL,
        is_primary TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      // Notifications: add sender_id column if missing
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id INT DEFAULT NULL",
      // Course is_published column
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published TINYINT(1) DEFAULT 0",
      // admin_sites: add page_data column for storing full page JSON
      "ALTER TABLE admin_sites ADD COLUMN IF NOT EXISTS page_data LONGTEXT DEFAULT NULL",
      "ALTER TABLE admin_sites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ];
    for (const sql of migrations) {
      await dbConn.query(sql).catch(e => {
        if (!e.message.includes("Duplicate column")) {
          console.warn("[migration] " + e.message.slice(0, 80));
        }
      });
    }
    console.log("✅ Auto-migrations complete");
  } catch(e) {
    console.warn("[migration] Error:", e.message);
  }
})();

// ── FRONTEND ROUTES ──
app.get("/", (req,res) => res.sendFile(pg("index.html")));
app.get("/home", (req,res) => res.sendFile(pg("home.html")));
app.get("/terms", (req,res) => res.sendFile(pg("terms.html")));
app.get("/privacy", (req,res) => res.sendFile(pg("privacy.html")));
app.get("/template-preview", (req,res) => res.sendFile(pg("template-preview.html")));
app.get("/checkout", (req,res) => res.sendFile(pg("checkout.html")));
app.get("/login", (req,res) => res.sendFile(pg("login.html")));
app.get("/register", (req,res) => res.sendFile(pg("register.html")));
app.get("/forgot-password", (req,res) => res.sendFile(pg("forgot-password.html")));
app.get("/dashboard", (req,res) => res.sendFile(pg("student/dashboard.html")));
app.get("/admin/subscribe", (req,res) => res.sendFile(pg("admin-subscribe.html")));
app.get("/admin", (req,res) => res.sendFile(pg("admin/index.html")));
app.get("/admin/*path", (req,res) => res.sendFile(pg("admin/index.html")));
app.get("/super-admin", (req,res) => res.sendFile(pg("super-admin/index.html")));
app.get("/super-admin/*path", (req,res) => res.sendFile(pg("super-admin/index.html")));
app.get("/instructor", (req,res) => res.sendFile(pg("instructor/index.html")));
// NOTE: /instructor/profile/:id MUST be before /instructor/*path to avoid conflict
app.get("/instructor/profile/:id", (req,res) => res.sendFile(pg("instructor-profile.html")));
app.get("/instructor/*path", (req,res) => res.sendFile(pg("instructor/index.html")));app.get("/past-questions", (req,res) => res.sendFile(pg("past-questions.html")));
app.get("/past-questions/:id", (req,res) => res.sendFile(pg("past-question-detail.html")));
app.get("/courses", (req,res) => res.sendFile(pg("courses.html")));
app.get("/courses/:id", (req,res) => res.sendFile(pg("course-detail.html")));
app.get("/learn/:courseId", (req,res) => res.sendFile(pg("learn.html")));
// instructor-profile route handled above before wildcard
app.get("/certificate/:id", (req,res) => res.sendFile(pg("certificate.html")));
app.get("/payment-success", (req,res) => res.sendFile(pg("payment-success.html")));
app.get("/payment-failed", (req,res) => res.sendFile(pg("payment-failed.html")));
app.get("/notifications", (req,res) => res.sendFile(pg("notifications.html")));
app.get("/chat", (req,res) => res.sendFile(pg("chat.html")));
app.get("/site/:subdomain", (req,res) => res.sendFile(pg("school-site.html")));
// "Edit Site" from school site preview → admin panel (builder tab opens via JS)
app.get("/site/:subdomain/edit", (req,res) => res.sendFile(pg("admin/index.html")));
// Diagnose / health check (restrict to internal use)
app.get("/api/diagnose", (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal && process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  res.json({ status: 'ok', version: '5.0', timestamp: new Date().toISOString(), node: process.version });
});
app.get("/cbt-test", (req,res) => res.sendFile(pg("cbt-test.html")));
app.get("/pdf-viewer", (req,res) => res.sendFile(pg("pdf-viewer.html")));

// ── ERROR HANDLER ──
app.use((err,req,res,next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initChatSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 ExamPro v5 running: http://localhost:${PORT}`);
  console.log(`🔌 Socket.io real-time chat: enabled`);
  console.log(`📚 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🏠 Landing page: http://localhost:${PORT}/home`);
});

// ── SUBSCRIPTION EXPIRY CHECKER (runs once daily) ──────────────────────────
const db = require("./config/database");
const emailService = require("./services/emailService");

async function checkSubscriptionExpiries() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Find subscriptions expiring in exactly 7 days — send warning email
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7str = in7.toISOString().split("T")[0];
    const [expiring7] = await db.query(
      `SELECT s.*, u.name, u.email FROM admin_subscriptions s
       JOIN users u ON s.admin_id = u.id
       WHERE s.status = 'active' AND DATE(s.expires_at) = ?`,
      [in7str]
    );
    for (const sub of expiring7) {
      await emailService.sendSubscriptionExpiringSoon(
        { id: sub.admin_id, name: sub.name, email: sub.email },
        7, sub.plan, sub.expires_at
      ).catch(() => {});
    }

    // 2. Find subscriptions expiring in exactly 3 days — send urgent warning
    const in3 = new Date(); in3.setDate(in3.getDate() + 3);
    const in3str = in3.toISOString().split("T")[0];
    const [expiring3] = await db.query(
      `SELECT s.*, u.name, u.email FROM admin_subscriptions s
       JOIN users u ON s.admin_id = u.id
       WHERE s.status = 'active' AND DATE(s.expires_at) = ?`,
      [in3str]
    );
    for (const sub of expiring3) {
      await emailService.sendSubscriptionExpiringSoon(
        { id: sub.admin_id, name: sub.name, email: sub.email },
        3, sub.plan, sub.expires_at
      ).catch(() => {});
    }

    // 3. Mark expired subscriptions as 'expired' and send expired email
    const [justExpired] = await db.query(
      `SELECT s.*, u.name, u.email FROM admin_subscriptions s
       JOIN users u ON s.admin_id = u.id
       WHERE s.status = 'active' AND s.expires_at < NOW()`
    );
    for (const sub of justExpired) {
      await db.query(
        "UPDATE admin_subscriptions SET status='expired' WHERE id=?",
        [sub.id]
      );
      // Notify inside platform
      await db.query(
        "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
        [sub.admin_id,
         "🚫 Subscription Expired",
         "Your " + sub.plan + " subscription has expired. Some features are now restricted. Contact support to renew.",
         "warning"]
      ).catch(() => {});
      // Send email
      await emailService.sendSubscriptionExpired(
        { id: sub.admin_id, name: sub.name, email: sub.email },
        sub.plan
      ).catch(() => {});
    }

    if (expiring7.length + expiring3.length + justExpired.length > 0) {
      console.log("[subscription checker] 7-day warnings: " + expiring7.length + ", 3-day warnings: " + expiring3.length + ", expired: " + justExpired.length + "");
    }
  } catch(e) {
    console.error("[subscription checker] error:", e.message);
  }
}

// Run once on startup (in case server was down overnight), then every 24 hours
setTimeout(checkSubscriptionExpiries, 10000);
setInterval(checkSubscriptionExpiries, 24 * 60 * 60 * 1000);