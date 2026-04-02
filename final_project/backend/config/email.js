const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async ({ to, subject, html, adminSmtp = null }) => {
  let smtpConfig;
  if (adminSmtp && adminSmtp.smtp_host && adminSmtp.smtp_user && adminSmtp.smtp_pass) {
    smtpConfig = {
      host: adminSmtp.smtp_host,
      port: parseInt(adminSmtp.smtp_port) || 587,
      secure: !!adminSmtp.smtp_secure,
      auth: { user: adminSmtp.smtp_user, pass: adminSmtp.smtp_pass },
      tls: { rejectUnauthorized: false }
    };
  } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    smtpConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false }
    };
  } else {
    console.log(`📧 [EMAIL SKIPPED - no SMTP] To: ${to} | Subject: ${subject}`);
    return true;
  }
  try {
    const transporter = nodemailer.createTransport(smtpConfig);
    const fromName = adminSmtp?.sender_name || "ExamPro";
    const fromEmail = adminSmtp?.sender_email || process.env.SMTP_USER;
    await transporter.sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error("Email error:", err.message);
    return false;
  }
};

const getAdminSmtp = async (db, adminId) => {
  if (!adminId) return null;
  try {
    const [rows] = await db.query("SELECT * FROM admin_smtp_settings WHERE admin_id = ? LIMIT 1", [adminId]);
    return rows[0] || null;
  } catch (_) { return null; }
};

const wrap = (content, accent = "#2563eb", platformName = "ExamPro") =>
  `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4ff;font-family:sans-serif;"><div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);"><div style="background:linear-gradient(135deg,${accent},#7c3aed);padding:32px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:1.5rem;">⚡ ${platformName}</h1></div><div style="padding:32px;">${content}</div><div style="background:#f8fafc;padding:16px;text-align:center;font-size:.75rem;color:#94a3b8;">© ${platformName}</div></div></body></html>`;

const otp = (n) =>
  `<div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:20px;text-align:center;margin:20px 0;"><span style="font-size:2.5rem;font-weight:800;color:#2563eb;letter-spacing:8px;">${n}</span></div>`;

const emailTemplates = {
  welcome: (name, code, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>Welcome to ${platform}! Verify your email:</p>${otp(code)}<p style="color:#64748b;font-size:.875rem;">Expires in 10 minutes.</p>`, "#2563eb", platform),
  loginOtp: (name, code, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>Your login OTP:</p>${otp(code)}`, "#059669", platform),
  passwordReset: (name, code, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>Password reset OTP:</p>${otp(code)}`, "#f59e0b", platform),
  siteApproved: (name, school, sub) =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>🎉 <strong>${school}</strong> has been approved! Live at: <strong>${sub}.exampro.ng</strong></p>`, "#059669"),
  siteRejected: (name, reason) =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>Site not approved. Reason: ${reason}</p>`, "#dc2626"),
  studentWelcome: (name, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>🎉 Welcome to <strong>${platform}</strong>! Your account is ready. Start learning today.</p>`, "#2563eb", platform),
  coursePurchase: (name, courseTitle, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>✅ Enrollment confirmed for <strong>${courseTitle}</strong>. Check your dashboard to start learning.</p>`, "#059669", platform),
  pqPurchase: (name, pqTitle, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>✅ You now have access to <strong>${pqTitle}</strong>. Login to your dashboard to start practising.</p>`, "#059669", platform),
  certificateEarned: (name, courseTitle, certNumber, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>🏆 Congratulations! You completed <strong>${courseTitle}</strong>.</p><p>Certificate: <strong>${certNumber}</strong></p>`, "#7c3aed", platform),
  instructorPending: (name, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>Your instructor application to <strong>${platform}</strong> is <strong>pending approval</strong>. We will notify you once reviewed.</p>`, "#f59e0b", platform),
  instructorApproved: (name, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>🎉 You have been <strong>approved as an instructor</strong> on ${platform}! Login to start creating courses.</p>`, "#059669", platform),
  adminApproved: (name, school, sub) =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>🎉 Admin account for <strong>${school}</strong> approved! Subdomain: <strong>${sub}.exampro.ng</strong></p>`, "#059669"),
  courseEnrolled: (name, courseTitle, platform = "ExamPro") =>
    wrap(`<p>Hi <strong>${name}</strong>,</p><p>You have been enrolled in <strong>${courseTitle}</strong>. Head to your dashboard to begin!</p>`, "#2563eb", platform),
};

module.exports = { sendEmail, emailTemplates, getAdminSmtp };
