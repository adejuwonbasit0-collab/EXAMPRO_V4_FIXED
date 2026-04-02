/**
 * emailService.js
 * Centralised email sending service.
 * All controllers import named functions from here.
 * Actual transport lives in config/email.js
 * SMTP priority: 1) admin-specific SMTP (per site), 2) global_settings DB, 3) .env
 */

const { sendEmail, emailTemplates, getAdminSmtp } = require('../config/email');
const db = require('../config/database');

// ── Resolve global platform SMTP from DB (super admin settings) ───────────────
let _cachedGlobalSmtp = null;
let _cacheTime = 0;
async function getGlobalSmtp() {
  // Cache for 60 seconds to avoid hitting DB on every email
  if (_cachedGlobalSmtp && Date.now() - _cacheTime < 60000) return _cachedGlobalSmtp;
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM global_settings WHERE setting_key IN ('smtp_host','smtp_port','smtp_user','smtp_pass')"
    );
    if (!rows.length) return null;
    const s = {};
    rows.forEach(r => { s[r.setting_key] = r.setting_value; });
    if (s.smtp_user && s.smtp_pass) {
      _cachedGlobalSmtp = {
        smtp_host: s.smtp_host || 'smtp.gmail.com',
        smtp_port: s.smtp_port || '587',
        smtp_user: s.smtp_user,
        smtp_pass: s.smtp_pass,
        sender_name: 'ExamPro',
        sender_email: s.smtp_user,
      };
      _cacheTime = Date.now();
      return _cachedGlobalSmtp;
    }
    return null;
  } catch (_) { return null; }
}

// ── Resolve admin SMTP for a given siteId ────────────────────────────────────
async function resolveSmtp(siteId) {
  if (!siteId) return null;
  try {
    const [rows] = await db.query(
      `SELECT s.smtp_host, s.smtp_port, s.smtp_user, s.smtp_pass,
              s.smtp_secure, s.sender_name, s.sender_email
       FROM admin_smtp_settings s
       JOIN admin_sites a ON a.user_id = s.admin_id
       WHERE a.id = ? LIMIT 1`,
      [siteId]
    );
    return rows[0] || null;
  } catch (_) { return null; }
}

async function resolvePlatformName(siteId) {
  if (!siteId) return 'ExamPro';
  try {
    const [rows] = await db.query('SELECT school_name FROM admin_sites WHERE id=? LIMIT 1', [siteId]);
    return rows[0]?.school_name || 'ExamPro';
  } catch (_) { return 'ExamPro'; }
}

async function send(to, subject, html, siteId = null) {
  // Priority: 1) site-specific admin SMTP, 2) global_settings DB, 3) .env (handled in config/email.js)
  let adminSmtp = await resolveSmtp(siteId);
  if (!adminSmtp) adminSmtp = await getGlobalSmtp();
  return sendEmail({ to, subject, html, adminSmtp });
}

// ── Auth / OTP ────────────────────────────────────────────────────────────────

async function sendWelcomeOtp(user, otp, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `Welcome to ${platform} — Verify Your Email`,
    emailTemplates.welcome(user.name, otp, platform), siteId);
}

async function sendResendOtp(user, otp, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `Your OTP Code — ${platform}`,
    emailTemplates.welcome(user.name, otp, platform), siteId);
}

async function sendLoginOtp(user, otp, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `Login OTP — ${platform}`,
    emailTemplates.loginOtp(user.name, otp, platform), siteId);
}

async function sendPasswordResetOtp(user, otp, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `Password Reset — ${platform}`,
    emailTemplates.passwordReset(user.name, otp, platform), siteId);
}

// ── Instructor ────────────────────────────────────────────────────────────────

async function sendInstructorPending(user, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `Instructor Application Received — ${platform}`,
    emailTemplates.instructorPending(user.name, platform), siteId);
}

async function sendInstructorApproved(user, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `🎉 You're Approved as an Instructor — ${platform}`,
    emailTemplates.instructorApproved(user.name, platform), siteId);
}

// ── Site admin ────────────────────────────────────────────────────────────────

async function sendSiteApproved(user, schoolName, subdomain) {
  return send(user.email, `🎉 Your School Site is Approved — ExamPro`,
    emailTemplates.siteApproved(user.name, schoolName, subdomain));
}

async function sendSiteRejected(user, reason) {
  return send(user.email, `Site Application Update — ExamPro`,
    emailTemplates.siteRejected(user.name, reason || 'Your application did not meet our requirements.'));
}

// ── Purchases / Enrollment ────────────────────────────────────────────────────

async function sendCoursePurchase(user, courseTitle, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `✅ Enrollment Confirmed — ${courseTitle}`,
    emailTemplates.coursePurchase(user.name, courseTitle, platform), siteId);
}

async function sendPqPurchase(user, pqTitle, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `✅ Purchase Confirmed — ${pqTitle}`,
    emailTemplates.pqPurchase(user.name, pqTitle, platform), siteId);
}

async function sendCourseEnrolled(user, courseTitle, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `You've Been Enrolled — ${courseTitle}`,
    emailTemplates.courseEnrolled(user.name, courseTitle, platform), siteId);
}

async function sendNewEnrollment(instructor, studentName, courseTitle, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  const html = emailTemplates.courseEnrolled
    ? `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
        <h2>New Student Enrolled 🎉</h2>
        <p>Hi <strong>${instructor.name}</strong>,</p>
        <p><strong>${studentName}</strong> just enrolled in your course <strong>"${courseTitle}"</strong> on ${platform}.</p>
        <p>Keep up the great work!</p></body></html>`
    : `New enrollment: ${studentName} enrolled in ${courseTitle}`;
  return send(instructor.email, `👤 New Student Enrolled in "${courseTitle}"`, html, siteId);
}

// ── Certificate ───────────────────────────────────────────────────────────────

async function sendCertificateEarned(user, courseTitle, certNumber, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  return send(user.email, `🏆 Certificate Earned — ${courseTitle}`,
    emailTemplates.certificateEarned(user.name, courseTitle, certNumber, platform), siteId);
}

// ── Bank Transfer ─────────────────────────────────────────────────────────────

async function sendBankTransferSubmitted(admin, studentName, itemTitle, amount, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>💳 New Bank Transfer Submitted</h2>
    <p>Hi <strong>${admin.name}</strong>,</p>
    <p><strong>${studentName}</strong> submitted a bank transfer proof on <strong>${platform}</strong>.</p>
    <p>Item: <strong>${itemTitle}</strong> | Amount: ₦${Number(amount).toLocaleString()}</p>
    <p>Please log in to your admin panel to review and approve.</p>
  </body></html>`;
  return send(admin.email, `💳 Bank Transfer Awaiting Approval — ${platform}`, html, siteId);
}

async function sendBankTransferApproved(user, itemTitle, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>✅ Payment Approved!</h2>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Your bank transfer for <strong>"${itemTitle}"</strong> on <strong>${platform}</strong> has been approved.</p>
    <p>You now have full access. Head to your dashboard to get started!</p>
  </body></html>`;
  return send(user.email, `✅ Bank Transfer Approved — ${itemTitle}`, html, siteId);
}

async function sendBankTransferRejected(user, itemTitle, reason = null, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>❌ Bank Transfer Not Approved</h2>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Your bank transfer for <strong>"${itemTitle}"</strong> on <strong>${platform}</strong> was not approved.</p>
    ${reason ? `<p>Reason: <strong>${reason}</strong></p>` : ''}
    <p>Please contact support or try submitting again.</p>
  </body></html>`;
  return send(user.email, `❌ Bank Transfer Rejected — ${itemTitle}`, html, siteId);
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

async function sendSubscriptionActivated(user, plan, expiresAt) {
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' }) : 'N/A';
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>🚀 Subscription Activated!</h2>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Your <strong>${plan}</strong> subscription on ExamPro is now active.</p>
    <p>Expires: <strong>${expiry}</strong></p>
    <p>Log in to your admin panel to start building your school.</p>
  </body></html>`;
  return send(user.email, `🚀 Subscription Activated — ExamPro`, html);
}

async function sendSubscriptionExpiringSoon(user, daysLeft, plan, expiresAt) {
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' }) : 'N/A';
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>⚠️ Subscription Expiring in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}</h2>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Your <strong>${plan}</strong> subscription on ExamPro expires on <strong>${expiry}</strong>.</p>
    <p>Renew now to avoid service interruption.</p>
  </body></html>`;
  return send(user.email, `⚠️ Your ExamPro Subscription Expires in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`, html);
}

async function sendSubscriptionExpired(user, plan) {
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>🚫 Subscription Expired</h2>
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Your <strong>${plan}</strong> subscription on ExamPro has expired. Some features are now restricted.</p>
    <p>Please contact support to renew your subscription.</p>
  </body></html>`;
  return send(user.email, `🚫 ExamPro Subscription Expired`, html);
}

// ── Withdrawal ────────────────────────────────────────────────────────────────

async function sendWithdrawalRequest(admin, instructorName, amount, siteId = null) {
  const platform = await resolvePlatformName(siteId);
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;">
    <h2>💸 Withdrawal Request</h2>
    <p>Hi <strong>${admin.name}</strong>,</p>
    <p><strong>${instructorName}</strong> has requested a withdrawal of <strong>₦${Number(amount).toLocaleString()}</strong> on <strong>${platform}</strong>.</p>
    <p>Please log in to process the request.</p>
  </body></html>`;
  return send(admin.email, `💸 Withdrawal Request — ${platform}`, html, siteId);
}

module.exports = {
  sendWelcomeOtp,
  sendResendOtp,
  sendLoginOtp,
  sendPasswordResetOtp,
  sendInstructorPending,
  sendInstructorApproved,
  sendSiteApproved,
  sendSiteRejected,
  sendCoursePurchase,
  sendPqPurchase,
  sendCourseEnrolled,
  sendNewEnrollment,
  sendCertificateEarned,
  sendBankTransferSubmitted,
  sendBankTransferApproved,
  sendBankTransferRejected,
  sendSubscriptionActivated,
  sendSubscriptionExpiringSoon,
  sendSubscriptionExpired,
  sendWithdrawalRequest,
};
