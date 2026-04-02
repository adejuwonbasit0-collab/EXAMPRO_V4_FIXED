const db = require("../config/database");
const emailService = require("../services/emailService");

// Get admin's own site
const getSite = async (userId) => {
  const [r] = await db.query("SELECT * FROM admin_sites WHERE user_id=?", [userId]);
  return r[0] || null;
};

// Get site_id for this admin (used for isolation)
const getAdminSiteId = async (userId) => {
  const site = await getSite(userId);
  if (site) return site.id;
  try {
    const [rows] = await db.query("SELECT site_id FROM users WHERE id=?", [userId]);
    if (rows[0]?.site_id) return rows[0].site_id;
  } catch(_) {}
  return null;
};

exports.getDashboard = async (req, res) => {
  try {
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role_id === 4;
    const siteId = isSuperAdmin ? null : await getAdminSiteId(adminId);
    console.log(`[getDashboard] adminId=${adminId} isSuperAdmin=${isSuperAdmin} siteId=${siteId}`);

    if (isSuperAdmin) {
      const [[stats]] = await db.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE role_id=1 AND (site_id IS NULL OR site_id=0)) as total_users,
        (SELECT COUNT(*) FROM users WHERE role_id=1 AND site_id IS NOT NULL AND site_id>0) as total_school_students,
        (SELECT COALESCE(SUM(amount),0) FROM orders WHERE payment_status='success') as total_revenue,
        (SELECT COUNT(*) FROM orders WHERE payment_status='success') as total_orders,
        (SELECT COUNT(*) FROM users WHERE role_id=3) as total_instructors,
        (SELECT COUNT(*) FROM courses WHERE is_active=1) as total_courses,
        (SELECT COUNT(*) FROM past_questions WHERE is_active=1) as total_past_questions,
        (SELECT COUNT(*) FROM users WHERE role_id=3 AND is_approved=0) as pending_instructors,
        (SELECT COUNT(*) FROM courses WHERE is_approved=0 AND is_active=1) as pending_courses,
        (SELECT COUNT(*) FROM admin_sites WHERE is_active=1) as total_schools,
        (SELECT COUNT(*) FROM admin_sites WHERE is_approved=0 AND is_active=1) as pending_schools`);
      const [recent_orders] = await db.query(
        `SELECT o.*,u.name as user_name,u.email as user_email FROM orders o
         JOIN users u ON o.user_id=u.id WHERE o.payment_status='success'
         ORDER BY o.created_at DESC LIMIT 5`);
      const [recent_users] = await db.query(
        `SELECT id,name,email,created_at FROM users WHERE role_id=1 AND (site_id IS NULL OR site_id=0) ORDER BY created_at DESC LIMIT 5`);
      const [monthly] = await db.query(
        `SELECT MONTH(created_at) as month, YEAR(created_at) as year,
                COALESCE(SUM(amount),0) as revenue, COUNT(*) as orders
         FROM orders WHERE payment_status='success' AND YEAR(created_at)=YEAR(NOW())
         GROUP BY YEAR(created_at), MONTH(created_at) ORDER BY month ASC`);
      return res.json({ stats, site: { school_name: 'ExamPro Platform', subdomain: null }, recent_orders, recent_users, monthly_revenue: monthly });
    }

    const hasSite = !!siteId;
    const userScope  = hasSite ? `(u.site_id=? OR u.created_by_admin=?)` : `u.created_by_admin=?`;
    const siteScope  = hasSite ? `(site_id=? OR created_by_admin=?)`      : `created_by_admin=?`;
    const userParams = hasSite ? [siteId, adminId] : [adminId];
    const siteParams = hasSite ? [siteId, adminId] : [adminId];
    const [[stats]] = await db.query(`SELECT
      (SELECT COUNT(*) FROM users WHERE ${siteScope} AND role_id=1) as total_users,
      (SELECT COALESCE(SUM(o.amount),0) FROM orders o JOIN users u ON o.user_id=u.id WHERE ${userScope} AND o.payment_status='success') as total_revenue,
      (SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id=u.id WHERE ${userScope} AND o.payment_status='success') as total_orders,
      (SELECT COUNT(*) FROM institutions WHERE created_by_admin=?) as total_institutions,
      (SELECT COUNT(*) FROM courses c JOIN users u ON c.instructor_id=u.id WHERE (${userScope} OR c.instructor_id=?)) as total_courses,
      (SELECT COUNT(*) FROM past_questions WHERE created_by=? OR instructor_id=?) as total_past_questions,
      (SELECT COUNT(*) FROM users WHERE ${siteScope} AND role_id=3 AND is_approved=0) as pending_instructors,
      (SELECT COUNT(*) FROM courses WHERE instructor_id=? AND is_approved=0) as pending_courses`,
      [...siteParams, ...userParams, ...userParams, adminId, ...userParams, adminId, adminId, adminId, ...siteParams, adminId]);

    const [recent_orders] = await db.query(`
      SELECT o.*,u.name as user_name,u.email as user_email FROM orders o
      JOIN users u ON o.user_id=u.id
      WHERE (u.site_id<=>? OR u.created_by_admin=?) AND o.payment_status='success'
      ORDER BY o.created_at DESC LIMIT 5`, [siteId, adminId]);

    const [recent_users] = await db.query(
      "SELECT id,name,email,created_at FROM users WHERE (site_id=? OR created_by_admin=?) AND role_id=1 ORDER BY created_at DESC LIMIT 5", [siteId, adminId]);

    const [monthly] = await db.query(`
      SELECT MONTH(o.created_at) as month, YEAR(o.created_at) as year,
             COALESCE(SUM(o.amount),0) as revenue, COUNT(*) as orders
      FROM orders o JOIN users u ON o.user_id=u.id
      WHERE u.site_id=? AND o.payment_status='success' AND YEAR(o.created_at)=YEAR(NOW())
      GROUP BY YEAR(o.created_at), MONTH(o.created_at)
      ORDER BY month ASC`, [siteId]);

    res.json({ stats, site: await getSite(adminId), recent_orders, recent_users, monthly_revenue: monthly });
  } catch(e){ console.error(e); res.status(500).json({ message: e.message }); }
};

exports.getMySite = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM admin_sites WHERE user_id=?", [req.user.id]);
    res.json(rows[0] || {});
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getCourses = async (req, res) => {
  try {
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role_id === 4;
    const siteId = isSuperAdmin ? null : await getAdminSiteId(adminId);
    if (isSuperAdmin) {
      const [rows] = await db.query(
        `SELECT c.*, u.name as instructor_name, u.email as instructor_email, 1 AS is_own_course,
                (SELECT COUNT(*) FROM course_enrollments WHERE course_id=c.id) as enrolled_count
         FROM courses c LEFT JOIN users u ON c.instructor_id=u.id
         WHERE c.is_active=1 ORDER BY c.created_at DESC LIMIT 200`);
      return res.json({ courses: rows });
    }
    const siteClause = siteId ? 'OR u.site_id = ?' : '';
    const siteParams = siteId ? [siteId] : [];
    const [rows] = await db.query(`
      SELECT c.*,
             u.name as instructor_name, u.email as instructor_email,
             (c.instructor_id = ?) AS is_own_course,
             (SELECT COUNT(*) FROM course_enrollments WHERE course_id=c.id) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.instructor_id = ?
         OR u.created_by_admin = ?
         ${siteClause}
      ORDER BY c.created_at DESC`,
      [adminId, adminId, adminId, ...siteParams]);
    res.json({ courses: rows });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.approveCourse = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [rows] = await db.query(
      "SELECT c.*,u.id as inst_id,u.site_id FROM courses c JOIN users u ON c.instructor_id=u.id WHERE c.id=?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Course not found" });
    if (rows[0].site_id !== siteId) return res.status(403).json({ message: "Not your course" });
    await db.query("UPDATE courses SET is_approved=1,is_published=1 WHERE id=?", [req.params.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [rows[0].inst_id, "✅ Course Approved!", `Your course "${rows[0].title}" is now live!`, "success"]);
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.rejectCourse = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const { reason } = req.body;
    const [rows] = await db.query(
      "SELECT c.*,u.id as inst_id,u.site_id FROM courses c JOIN users u ON c.instructor_id=u.id WHERE c.id=?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Course not found" });
    if (rows[0].site_id !== siteId) return res.status(403).json({ message: "Not your course" });
    await db.query("UPDATE courses SET is_approved=0,approval_notes=? WHERE id=?", [reason, req.params.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [rows[0].inst_id, "Course Not Approved", `Reason: ${reason}`, "error"]);
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getUsers = async (req, res) => {
  try {
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role_id === 4;
    const siteId = isSuperAdmin ? null : await getAdminSiteId(adminId);
    if (isSuperAdmin) {
      const { role_id, search } = req.query;
      let q = `SELECT u.id,u.name,u.email,u.role_id,u.is_active,u.is_verified,u.created_at,
               COALESCE((SELECT SUM(o.amount) FROM orders o WHERE o.user_id=u.id AND o.payment_status='success'),0) as total_spent,
               r.name as role FROM users u LEFT JOIN roles r ON u.role_id=r.id WHERE u.role_id NOT IN (2,4)`;
      const params = [];
      if (role_id) { q += " AND u.role_id=?"; params.push(role_id); }
      if (search)  { q += " AND (u.name LIKE ? OR u.email LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
      q += " ORDER BY u.created_at DESC LIMIT 200";
      const [rows] = await db.query(q, params);
      return res.json(rows);
    }
    const { role_id, search } = req.query;
    const siteClause = siteId ? 'u.site_id=? OR' : '';
    const siteP      = siteId ? [siteId] : [];
    let q = `SELECT u.id,u.name,u.email,u.role_id,u.is_active,u.is_verified,u.created_at,
             COALESCE((SELECT SUM(o.amount) FROM orders o WHERE o.user_id=u.id AND o.payment_status='success'),0) as total_spent,
             r.name as role
             FROM users u LEFT JOIN roles r ON u.role_id=r.id
             WHERE (${siteClause} u.created_by_admin=?) AND u.role_id NOT IN (2,4)`;
    const params = [...siteP, adminId];
    if (role_id) { q += " AND u.role_id=?"; params.push(role_id); }
    if (search)  { q += " AND (u.name LIKE ? OR u.email LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    q += " ORDER BY u.created_at DESC LIMIT 100";
    const [rows] = await db.query(q, params);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.toggleUser = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [rows] = await db.query("SELECT id,is_active,site_id,role_id FROM users WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    if (rows[0].site_id !== siteId) return res.status(403).json({ message: "Not your user" });
    if (rows[0].role_id === 2 || rows[0].role_id === 4) return res.status(403).json({ message: "Cannot disable admin accounts" });
    const n = rows[0].is_active ? 0 : 1;
    await db.query("UPDATE users SET is_active=? WHERE id=?", [n, req.params.id]);
    res.json({ ok: true, message: n ? "User enabled" : "User suspended" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getInstructors = async (req, res) => {
  try {
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role_id === 4;
    const siteId = isSuperAdmin ? null : await getAdminSiteId(adminId);
    if (isSuperAdmin) {
      const [rows] = await db.query(
        `SELECT u.id,u.name,u.email,u.is_active,u.is_approved,u.created_at,
                COALESCE((SELECT SUM(o.amount)*0.8 FROM orders o JOIN courses c ON o.item_id=c.id WHERE c.instructor_id=u.id AND o.payment_status='success'),0) as total_earned
         FROM users u WHERE u.role_id=3 ORDER BY u.created_at DESC`);
      return res.json(rows);
    }
    const instSiteClause = siteId ? 'u.site_id=? OR' : '';
    const instSiteP      = siteId ? [siteId] : [];
    const [rows] = await db.query(`
      SELECT u.id,u.name,u.email,u.is_active,u.is_approved,u.created_at,
             COALESCE((SELECT SUM(o.amount)*0.8 FROM orders o JOIN courses c ON o.item_id=c.id WHERE c.instructor_id=u.id AND o.payment_status='success'),0) as total_earned
      FROM users u WHERE (${instSiteClause} u.created_by_admin=?) AND u.role_id=3
      ORDER BY u.created_at DESC`,
      [...instSiteP, adminId]);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.approveInstructor = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [rows] = await db.query("SELECT id,name,site_id FROM users WHERE id=? AND role_id=3", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Instructor not found" });
    if (rows[0].site_id !== siteId) return res.status(403).json({ message: "Not your instructor" });
    await db.query("UPDATE users SET is_approved=1 WHERE id=?", [req.params.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [req.params.id, "🎉 Instructor Approved!", "Your instructor account has been approved. You can now create courses!", "success"]);
    const [instUser] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [req.params.id]);
    if (instUser[0]) {
      emailService.sendInstructorApproved(instUser[0], instUser[0].site_id).catch(e => console.error("Instructor approved email failed:", e.message));
    }
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

// ── THIS WAS THE MISSING FUNCTION CAUSING THE CRASH ──────────────────────────
exports.rejectInstructor = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const { reason } = req.body;
    const [rows] = await db.query("SELECT id,name,site_id FROM users WHERE id=? AND role_id=3", [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "Instructor not found" });
    if (rows[0].site_id !== siteId) return res.status(403).json({ message: "Not your instructor" });
    // Set is_approved = 0, is_active = 0 so they can't log in
    await db.query("UPDATE users SET is_approved=0, is_active=0 WHERE id=?", [req.params.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [req.params.id, "Instructor Application Rejected",
       reason ? `Your application was not approved. Reason: ${reason}` : "Your instructor application was not approved. Contact the school admin for more information.",
       "error"]);
    // Send rejection email
    const [instUser] = await db.query("SELECT id,name,email,site_id FROM users WHERE id=? LIMIT 1", [req.params.id]);
    if (instUser[0]) {
      emailService.sendInstructorRejected && emailService.sendInstructorRejected(instUser[0], reason, instUser[0].site_id)
        .catch(e => console.error("Instructor reject email failed:", e.message));
    }
    res.json({ ok: true, message: "Instructor rejected" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getTransactions = async (req, res) => {
  try {
    const adminId = req.user.id;
    const isSuperAdmin = req.user.role_id === 4;
    const siteId = isSuperAdmin ? null : await getAdminSiteId(adminId);
    if (isSuperAdmin) {
      const [rows] = await db.query(
        `SELECT o.*,u.name as user_name,u.email as user_email
         FROM orders o JOIN users u ON o.user_id=u.id
         ORDER BY o.created_at DESC LIMIT 200`);
      return res.json(rows);
    }
    const [rows] = await db.query(`
      SELECT o.*,u.name as user_name,u.email as user_email
      FROM orders o JOIN users u ON o.user_id=u.id
      WHERE (o.site_id IS NOT NULL AND o.site_id=?) OR u.created_by_admin=?
      ORDER BY o.created_at DESC LIMIT 200`, [siteId, adminId]);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getBankTransfers = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [rows] = await db.query(`
      SELECT o.*,u.name as user_name,u.email as user_email
      FROM orders o JOIN users u ON o.user_id=u.id
      WHERE u.site_id=? AND o.payment_gateway='bank_transfer' AND o.payment_status='awaiting_approval'
      ORDER BY o.created_at DESC`, [siteId]);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.approveBankTransfer = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [orders] = await db.query(
      "SELECT o.*,u.site_id FROM orders o JOIN users u ON o.user_id=u.id WHERE o.id=?",
      [req.params.id]
    );
    if (!orders.length) return res.status(404).json({ message: "Order not found" });
    if (orders[0].site_id !== siteId) return res.status(403).json({ message: "Not your order" });
    const o = orders[0];
    await db.query("UPDATE orders SET payment_status='success',paid_at=NOW() WHERE id=?", [o.id]);
    await db.query("INSERT IGNORE INTO user_purchases (user_id,item_type,item_id,order_id) VALUES (?,?,?,?)",
      [o.user_id, o.item_type, o.item_id, o.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [o.user_id, "✅ Payment Approved!", "Your payment has been confirmed. You now have access!", "success"]);
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.rejectBankTransfer = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const { reason } = req.body;
    const [orders] = await db.query(
      "SELECT o.*,u.site_id FROM orders o JOIN users u ON o.user_id=u.id WHERE o.id=?",
      [req.params.id]
    );
    if (!orders.length) return res.status(404).json({ message: "Not found" });
    if (orders[0].site_id !== siteId) return res.status(403).json({ message: "Not your order" });
    await db.query("UPDATE orders SET payment_status='failed' WHERE id=?", [req.params.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [orders[0].user_id, "Payment Rejected", `Reason: ${reason || "Contact support"}`, "error"]);
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getWithdrawals = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [rows] = await db.query(`
      SELECT w.*,u.name as instructor_name,u.email as instructor_email
      FROM withdrawal_requests w JOIN users u ON w.instructor_id=u.id
      WHERE u.site_id=?
      ORDER BY w.id DESC`, [siteId]);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.processWithdrawal = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const { status, admin_note } = req.body;
    const [rows] = await db.query(
      "SELECT w.*,u.site_id FROM withdrawal_requests w JOIN users u ON w.instructor_id=u.id WHERE w.id=?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found" });
    if (rows[0].site_id !== siteId) return res.status(403).json({ message: "Not your withdrawal" });
    await db.query("UPDATE withdrawal_requests SET status=?,admin_note=?,processed_at=NOW() WHERE id=?",
      [status, admin_note || null, req.params.id]);
    const msg = status === 'approved'
      ? 'Your withdrawal request has been approved! Funds will be sent shortly.'
      : `Withdrawal rejected: ${admin_note || 'Contact support'}`;
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [rows[0].instructor_id, status === 'approved' ? '💸 Withdrawal Approved' : 'Withdrawal Update', msg, status === 'approved' ? 'success' : 'warning']);
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getLectures = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const [rows] = await db.query(`
      SELECT l.*,u.name as instructor_name,c.title as course_title
      FROM live_lectures l
      JOIN users u ON l.instructor_id=u.id
      LEFT JOIN courses c ON l.course_id=c.id
      WHERE u.site_id=?
      ORDER BY l.scheduled_at DESC`, [siteId]);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.createLecture = async (req, res) => {
  try {
    const { title, course_id, meeting_link, platform, scheduled_at, duration_minutes, description } = req.body;
    if (!title || !meeting_link || !scheduled_at) return res.status(400).json({ message: "Title, link and date required" });
    await db.query(
      "INSERT INTO live_lectures (instructor_id,course_id,title,description,meeting_link,platform,scheduled_at,duration_minutes) VALUES (?,?,?,?,?,?,?,?)",
      [req.user.id, course_id || null, title, description || "", meeting_link, platform || "google_meet", scheduled_at, duration_minutes || 60]
    );
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getPaymentSettings = async (req, res) => {
  try {
    const adminId = req.user.id;
    const [adminRows] = await db.query(
      "SELECT gateway, display_name, public_key, secret_key, secret_key_encrypted, is_active, bank_name, bank_account_name, bank_account_number, bank_instructions FROM payment_settings WHERE admin_id=? ORDER BY gateway",
      [adminId]
    );
    if (adminRows.length) {
      const seen = {};
      adminRows.forEach(r => { seen[r.gateway] = { ...r, secret_key: r.secret_key || r.secret_key_encrypted || '' }; });
      return res.json(Object.values(seen));
    }
    const [aps] = await db.query("SELECT * FROM admin_payment_settings WHERE admin_id=? LIMIT 1", [adminId]);
    const a = aps[0] || {};
    const fallbackRows = [];
    if (a.paystack_public_key)    fallbackRows.push({ gateway:'paystack',      display_name:'Paystack',      public_key: a.paystack_public_key,      secret_key: a.paystack_secret_key||'',      is_active: 1 });
    if (a.flutterwave_public_key) fallbackRows.push({ gateway:'flutterwave',   display_name:'Flutterwave',   public_key: a.flutterwave_public_key,   secret_key: a.flutterwave_secret_key||'',   is_active: 1 });
    if (a.stripe_public_key)      fallbackRows.push({ gateway:'stripe',        display_name:'Stripe',        public_key: a.stripe_public_key,        secret_key: a.stripe_secret_key||'',        is_active: 1 });
    if (a.bank_account_number)    fallbackRows.push({ gateway:'bank_transfer', display_name:'Bank Transfer', public_key: '', secret_key: '', is_active: 1, bank_name: a.bank_name, bank_account_name: a.bank_account_name, bank_account_number: a.bank_account_number, bank_instructions: a.bank_instructions });
    res.json(fallbackRows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.updatePaymentSettings = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { gateway, display_name, commission_percent, min_amount, max_amount, is_active, public_key, secret_key, bank_account_name, bank_account_number, bank_name, bank_instructions, currency } = req.body;
    if (!gateway) return res.status(400).json({ message: "Gateway required" });
    await db.query(
      `INSERT INTO payment_settings
         (admin_id, gateway, display_name, commission_percent, min_amount, max_amount,
          is_active, public_key, secret_key, secret_key_encrypted,
          bank_name, bank_account_name, bank_account_number, bank_instructions)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         display_name        = VALUES(display_name),
         commission_percent  = VALUES(commission_percent),
         is_active           = VALUES(is_active),
         public_key          = IF(VALUES(public_key) IS NOT NULL AND VALUES(public_key) != '', VALUES(public_key), public_key),
         secret_key          = IF(VALUES(secret_key) IS NOT NULL AND VALUES(secret_key) != '', VALUES(secret_key), secret_key),
         secret_key_encrypted= IF(VALUES(secret_key_encrypted) IS NOT NULL AND VALUES(secret_key_encrypted) != '', VALUES(secret_key_encrypted), secret_key_encrypted),
         bank_name           = VALUES(bank_name),
         bank_account_name   = VALUES(bank_account_name),
         bank_account_number = VALUES(bank_account_number),
         bank_instructions   = VALUES(bank_instructions)`,
      [adminId, gateway, display_name || gateway, commission_percent || 0, min_amount || 0, max_amount || 999999,
       is_active !== undefined ? (is_active ? 1 : 0) : 1,
       public_key || null, secret_key || null, secret_key || null,
       bank_name || null, bank_account_name || null, bank_account_number || null, bank_instructions || null]
    );
    try {
      if (gateway === 'paystack') {
        await db.query(`INSERT INTO admin_payment_settings (admin_id, paystack_public_key, paystack_secret_key) VALUES (?,?,?) ON DUPLICATE KEY UPDATE paystack_public_key = IF(VALUES(paystack_public_key)!='', VALUES(paystack_public_key), paystack_public_key), paystack_secret_key = IF(VALUES(paystack_secret_key)!='', VALUES(paystack_secret_key), paystack_secret_key)`, [adminId, public_key || '', secret_key || '']);
      } else if (gateway === 'flutterwave') {
        await db.query(`INSERT INTO admin_payment_settings (admin_id, flutterwave_public_key, flutterwave_secret_key) VALUES (?,?,?) ON DUPLICATE KEY UPDATE flutterwave_public_key = IF(VALUES(flutterwave_public_key)!='', VALUES(flutterwave_public_key), flutterwave_public_key), flutterwave_secret_key = IF(VALUES(flutterwave_secret_key)!='', VALUES(flutterwave_secret_key), flutterwave_secret_key)`, [adminId, public_key || '', secret_key || '']);
      } else if (gateway === 'stripe') {
        await db.query(`INSERT INTO admin_payment_settings (admin_id, stripe_public_key, stripe_secret_key) VALUES (?,?,?) ON DUPLICATE KEY UPDATE stripe_public_key = IF(VALUES(stripe_public_key)!='', VALUES(stripe_public_key), stripe_public_key), stripe_secret_key = IF(VALUES(stripe_secret_key)!='', VALUES(stripe_secret_key), stripe_secret_key)`, [adminId, public_key || '', secret_key || '']);
      } else if (gateway === 'bank_transfer') {
        await db.query(`INSERT INTO admin_payment_settings (admin_id, bank_name, bank_account_name, bank_account_number, bank_instructions) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE bank_name=VALUES(bank_name), bank_account_name=VALUES(bank_account_name), bank_account_number=VALUES(bank_account_number), bank_instructions=VALUES(bank_instructions)`, [adminId, bank_name || null, bank_account_name || null, bank_account_number || null, bank_instructions || null]);
      }
    } catch (syncErr) { console.error("admin_payment_settings sync error:", syncErr.message); }
    res.json({ ok: true, message: "Payment settings saved" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getSiteSettings = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT setting_key,setting_value FROM site_settings WHERE admin_id=?", [req.user.id]);
    const s = {};
    rows.forEach(r => s[r.setting_key] = r.setting_value);
    res.json(s);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.updateSiteSettings = async (req, res) => {
  try {
    const adminId = req.user.id;
    for (const [k, v] of Object.entries(req.body)) {
      await db.query("INSERT INTO site_settings (admin_id,setting_key,setting_value) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=?", [adminId, k, v, v]);
    }
    res.json({ ok: true, message: "Settings saved" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getSmtpSettings = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT smtp_host, smtp_port, smtp_user, smtp_secure, sender_email, sender_name FROM admin_smtp_settings WHERE admin_id=?", [req.user.id]);
    if (rows.length) return res.json(rows[0]);
    const [legacy] = await db.query("SELECT smtp_host, smtp_port, smtp_user, smtp_from_name as sender_name FROM admin_sites WHERE user_id=?", [req.user.id]);
    res.json(legacy[0] || {});
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.saveSmtpSettings = async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, sender_email, sender_name } = req.body;
    if (!smtp_host || !smtp_user) return res.status(400).json({ message: "SMTP host and username are required" });
    await db.query(
      `INSERT INTO admin_smtp_settings (admin_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, sender_email, sender_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         smtp_host    = VALUES(smtp_host),
         smtp_port    = VALUES(smtp_port),
         smtp_user    = VALUES(smtp_user),
         smtp_pass    = IF(VALUES(smtp_pass) != '', VALUES(smtp_pass), smtp_pass),
         smtp_secure  = VALUES(smtp_secure),
         sender_email = VALUES(sender_email),
         sender_name  = VALUES(sender_name)`,
      [req.user.id, smtp_host, smtp_port || 587, smtp_user, smtp_pass || '', smtp_secure ? 1 : 0, sender_email || smtp_user, sender_name || '']
    );
    await db.query("UPDATE admin_sites SET smtp_host=?, smtp_port=?, smtp_user=?, smtp_from_name=? WHERE user_id=?", [smtp_host, smtp_port || 587, smtp_user, sender_name || '', req.user.id]).catch(() => {});
    res.json({ ok: true, message: "SMTP settings saved!" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getCertificateTemplates = async (req, res) => {
  try {
    const site = await getSite(req.user.id);
    if (!site) return res.json([]);
    const [rows] = await db.query("SELECT * FROM certificate_templates WHERE site_id=? ORDER BY is_default DESC", [site.id]);
    res.json(rows);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.saveCertificateTemplate = async (req, res) => {
  try {
    const site = await getSite(req.user.id);
    if (!site) return res.status(404).json({ message: "No site" });
    const { name, name_x_percent, name_y_percent, name_font_size, name_color, name_font, is_default } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    let img = null;
    if (req.file) img = "/uploads/certificates/" + req.file.filename;
    if (is_default === "true") await db.query("UPDATE certificate_templates SET is_default=0 WHERE site_id=?", [site.id]);
    await db.query(
      "INSERT INTO certificate_templates (site_id,name,template_image,name_x_percent,name_y_percent,name_font_size,name_color,name_font,is_default) VALUES (?,?,?,?,?,?,?,?,?)",
      [site.id, name, img, name_x_percent || 50, name_y_percent || 55, name_font_size || 36, name_color || "#1a1a2e", name_font || "Georgia", is_default === "true" ? 1 : 0]
    );
    res.json({ ok: true });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getPageBuilder = async (req, res) => {
  try {
    const site = await getSite(req.user.id);
    if (!site) return res.json({ content: null });
    const [rows] = await db.query("SELECT * FROM page_builder WHERE site_id=? AND page_name=? LIMIT 1", [site.id, req.query.page || 'homepage']);
    res.json(rows[0] || { content: null, is_published: 0 });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.savePageBuilder = async (req, res) => {
  try {
    const site = await getSite(req.user.id);
    if (!site) return res.status(404).json({ message: "No site" });
    const { page_name, content, is_published } = req.body;
    await db.query(
      "INSERT INTO page_builder (site_id,page_name,content,is_published) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE content=?,is_published=?,updated_at=NOW()",
      [site.id, page_name || 'homepage', JSON.stringify(content), is_published ? 1 : 0, JSON.stringify(content), is_published ? 1 : 0]
    );
    res.json({ ok: true, message: is_published ? "Page published!" : "Draft saved" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.sendNotification = async (req, res) => {
  try {
    const adminId = req.user.id;
    const siteId = await getAdminSiteId(adminId);
    const { title, message, target_role } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message required" });
    let q = "SELECT id FROM users WHERE site_id=?";
    const params = [siteId];
    if (target_role === 'student') { q += " AND role_id=1"; }
    else if (target_role === 'instructor') { q += " AND role_id=3"; }
    const [users] = await db.query(q, params);
    if (!users.length) return res.json({ ok: true, message: "No users to notify" });
    const vals = users.map(u => [u.id, adminId, title, message, 'announcement']);
    await db.query("INSERT INTO notifications (user_id,sender_id,title,message,type) VALUES ?", [vals]);
    res.json({ ok: true, message: `Sent to ${users.length} users` });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getInstructorEarnings = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const [[totals]] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN o.payment_status='success' THEN o.amount*0.8 ELSE 0 END),0) as total_earned,
        COALESCE(SUM(CASE WHEN o.payment_status='success' AND MONTH(o.created_at)=MONTH(NOW()) AND YEAR(o.created_at)=YEAR(NOW()) THEN o.amount*0.8 ELSE 0 END),0) as month_earned
      FROM orders o JOIN courses c ON o.item_id=c.id
      WHERE c.instructor_id=? AND o.item_type='course'`, [instructorId]);
    const [[wTotals]] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) as pending_withdrawal,
        COALESCE(SUM(CASE WHEN status='approved' THEN amount ELSE 0 END),0) as withdrawn
      FROM withdrawal_requests WHERE instructor_id=?`, [instructorId]);
    const [monthly] = await db.query(`
      SELECT MONTH(o.created_at) as month, SUM(o.amount*0.8) as revenue
      FROM orders o JOIN courses c ON o.item_id=c.id
      WHERE c.instructor_id=? AND o.payment_status='success' AND YEAR(o.created_at)=YEAR(NOW())
      GROUP BY MONTH(o.created_at) ORDER BY month`, [instructorId]);
    const [transactions] = await db.query(`
      SELECT o.created_at,c.title as course_title,u.name as buyer_name,o.amount,o.payment_status
      FROM orders o JOIN courses c ON o.item_id=c.id JOIN users u ON o.user_id=u.id
      WHERE c.instructor_id=? AND o.item_type='course'
      ORDER BY o.created_at DESC LIMIT 50`, [instructorId]);
    res.json({ total_earned: totals.total_earned, month_earned: totals.month_earned, pending_withdrawal: wTotals.pending_withdrawal, withdrawn: wTotals.withdrawn, monthly, transactions });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getUserTransactions = async (req, res) => {
  try {
    const siteId = await getAdminSiteId(req.user.id);
    const [check] = await db.query("SELECT id FROM users WHERE id=? AND site_id=?", [req.params.id, siteId]);
    if (!check.length) return res.status(403).json({ message: "Not your user" });
    const [txns] = await db.query("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50", [req.params.id]);
    res.json(txns);
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, bank_id } = req.body;
    if (!amount || amount < 1000) return res.status(400).json({ message: "Minimum withdrawal is ₦1,000" });
    if (!bank_id) return res.status(400).json({ message: "Bank account required" });
    const [banks] = await db.query("SELECT * FROM instructor_bank_accounts WHERE id=? AND instructor_id=?", [bank_id, req.user.id]);
    if (!banks.length) return res.status(404).json({ message: "Bank account not found" });
    const b = banks[0];
    await db.query(
      "INSERT INTO withdrawal_requests (instructor_id,amount,bank_name,account_number,account_name,status) VALUES (?,?,?,?,?,'pending')",
      [req.user.id, amount, b.bank_name, b.account_number, b.account_name]
    );
    res.json({ ok: true, message: "Withdrawal request submitted! Admin will process it." });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getEmailTemplates = async (req, res) => {
  const defaults = [
    { template_key: 'welcome',           subject: 'Welcome to {{school_name}}!',    body: '<h2>Welcome, {{name}}!</h2><p>Your OTP is: <strong>{{otp}}</strong></p>' },
    { template_key: 'course_approved',   subject: 'Your course has been approved!', body: '<h2>Great news, {{name}}!</h2><p>Your course "<strong>{{course_title}}</strong>" is now live.</p>' },
    { template_key: 'payment_confirmed', subject: 'Payment Confirmed ✅',           body: '<h2>Payment Confirmed!</h2><p>Hi {{name}}, your payment of <strong>₦{{amount}}</strong> has been confirmed.</p>' },
    { template_key: 'password_reset',    subject: 'Password Reset OTP',             body: '<h2>Reset your password</h2><p>Your OTP is: <strong>{{otp}}</strong>. Valid for 10 minutes.</p>' },
  ];
  try {
    const [rows] = await db.query("SELECT * FROM email_templates WHERE admin_id=? ORDER BY template_key", [req.user.id]);
    return res.json(rows.length ? rows : defaults);
  } catch(e) { return res.json(defaults); }
};

exports.saveEmailTemplate = async (req, res) => {
  try {
    const { template_key, subject, body } = req.body;
    if (!template_key || !subject || !body) return res.status(400).json({ message: "All fields required" });
    await db.query(
      "INSERT INTO email_templates (admin_id,template_key,subject,body) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE subject=?,body=?,updated_at=NOW()",
      [req.user.id, template_key, subject, body, subject, body]
    );
    res.json({ ok: true, message: "Email template saved" });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const siteId = await getAdminSiteId(req.user.id);
    const [monthly] = await db.query(`
      SELECT MONTH(o.created_at) as month, COALESCE(SUM(o.amount),0) as revenue, COUNT(*) as orders
      FROM orders o JOIN users u ON o.user_id=u.id
      WHERE u.site_id=? AND o.payment_status='success' AND YEAR(o.created_at)=YEAR(NOW())
      GROUP BY MONTH(o.created_at) ORDER BY month ASC`, [siteId]);
    const [topCourses] = await db.query(`
      SELECT c.title, COUNT(up.id) as sales, COALESCE(SUM(o.amount),0) as revenue
      FROM courses c
      JOIN user_purchases up ON up.item_id=c.id AND up.item_type='course'
      JOIN orders o ON o.id=up.order_id AND o.payment_status='success'
      JOIN users u ON c.instructor_id=u.id
      WHERE u.site_id=?
      GROUP BY c.id ORDER BY revenue DESC LIMIT 5`, [siteId]);
    res.json({ monthly, top_courses: topCourses });
  } catch(e){ console.error('[adminController]', e.message); res.status(500).json({ message: e.message }); }
};