const db = require("../config/database");
const emailService = require("../services/emailService");

// ── DASHBOARD ────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [[stats]] = await db.query(`SELECT
      (SELECT COUNT(*) FROM users WHERE role_id=2) as total_admins,
      (SELECT COUNT(*) FROM users WHERE role_id=1) as total_students,
      (SELECT COUNT(*) FROM admin_sites WHERE is_approved=1) as active_sites,
      (SELECT COUNT(*) FROM admin_sites WHERE is_approved=0) as pending_sites,
      (SELECT COUNT(*) FROM page_templates) as total_templates,
      (SELECT COALESCE(SUM(amount),0) FROM orders WHERE payment_status='success') as total_revenue,
      (SELECT COUNT(*) FROM orders WHERE payment_status='success') as total_orders`);
    const [recent] = await db.query(`SELECT s.*,u.name as owner_name,u.email as owner_email FROM admin_sites s JOIN users u ON s.user_id=u.id ORDER BY s.created_at DESC LIMIT 6`);
    const [monthly] = await db.query(`SELECT DATE_FORMAT(paid_at,'%b %Y') as month,SUM(amount) as revenue FROM orders WHERE payment_status='success' AND paid_at>=DATE_SUB(NOW(),INTERVAL 6 MONTH) GROUP BY month ORDER BY paid_at ASC`);
    res.json({ stats, recent_sites: recent, monthly_revenue: monthly });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── SITES ─────────────────────────────────────────────────────
// Single definition — sends email + notification on approve/reject
exports.getSites = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT s.*,u.name as owner_name,u.email as owner_email,t.name as template_name
      FROM admin_sites s JOIN users u ON s.user_id=u.id
      LEFT JOIN page_templates t ON s.template_id=t.id
      ORDER BY s.created_at DESC`);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.approveSite = async (req, res) => {
  try {
    const [sites] = await db.query("SELECT s.*,u.name,u.email FROM admin_sites s JOIN users u ON s.user_id=u.id WHERE s.id=?", [req.params.id]);
    if (!sites.length) return res.status(404).json({ message: "Site not found" });
    const s = sites[0];
    await db.query("UPDATE admin_sites SET is_approved=1,is_active=1,approved_at=NOW() WHERE id=?", [s.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [s.user_id, "🎉 Site Approved!", `Your school "${s.school_name}" is now live at ${s.subdomain}.exampro.ng`, "success"]);
    emailService.sendSiteApproved({ email: s.email, name: s.name }, s.school_name, s.subdomain).catch(e => console.error("Site approved email:", e.message));
    res.json({ ok: true, message: "Site approved" });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.rejectSite = async (req, res) => {
  try {
    const { reason } = req.body;
    const [sites] = await db.query("SELECT s.*,u.name,u.email FROM admin_sites s JOIN users u ON s.user_id=u.id WHERE s.id=?", [req.params.id]);
    if (!sites.length) return res.status(404).json({ message: "Site not found" });
    const s = sites[0];
    await db.query("UPDATE admin_sites SET approval_notes=? WHERE id=?", [reason || "Not approved", s.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [s.user_id, "Application Update", `Not approved: ${reason || "Please contact support"}`, "error"]);
    emailService.sendSiteRejected({ email: s.email, name: s.name }, reason).catch(e => console.error("Site rejected email:", e.message));
    res.json({ ok: true, message: "Site rejected" });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── ADMINS ────────────────────────────────────────────────────
exports.getAdmins = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.is_active, u.created_at,
        s.school_name, s.subdomain, s.custom_domain, s.is_approved, s.id as site_id,
        sub.plan as subscription_plan, sub.status as subscription_status, sub.expires_at as subscription_expires
      FROM users u
      LEFT JOIN admin_sites s ON u.id = s.user_id
      LEFT JOIN admin_subscriptions sub ON sub.admin_id = u.id
      WHERE u.role_id = 2
      ORDER BY u.created_at DESC`);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.toggleAdmin = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT is_active,name FROM users WHERE id=? AND role_id=2", [req.params.id]);
    if(!rows.length) return res.status(404).json({ message: "Admin not found" });
    const newStatus = rows[0].is_active ? 0 : 1;
    await db.query("UPDATE users SET is_active=? WHERE id=?", [newStatus, req.params.id]);
    await db.query("INSERT INTO notifications (user_id,title,message,type,created_at) VALUES (?,?,?,?,NOW())",
      [req.params.id,
       newStatus ? "✅ Account Activated" : "🔒 Account Suspended",
       newStatus ? "Your admin account has been activated by the super admin." : "Your admin account has been suspended. Contact support.",
       newStatus ? "success" : "warning"]);
    res.json({ ok: true, message: `Admin ${newStatus ? "activated" : "suspended"}` });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id,name FROM users WHERE id=? AND role_id=2", [req.params.id]);
    if(!rows.length) return res.status(404).json({ message: "Admin not found" });
    const [[{c}]] = await db.query(
      "SELECT COUNT(*) as c FROM users WHERE site_id IN (SELECT id FROM admin_sites WHERE user_id=?) AND role_id=1",
      [req.params.id]
    );
    if(c > 0) return res.status(400).json({ message: `Cannot delete — this admin has ${c} students. Suspend instead.` });
    const [sites] = await db.query("SELECT id FROM admin_sites WHERE user_id=?", [req.params.id]);
    if(sites.length){
      const siteId = sites[0].id;
      await db.query("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE site_id=?)", [siteId]);
      await db.query("UPDATE users SET site_id=NULL WHERE site_id=?", [siteId]);
    }
    await db.query("DELETE FROM notifications WHERE user_id=?", [req.params.id]);
    await db.query("DELETE FROM admin_subscriptions WHERE admin_id=?", [req.params.id]);
    await db.query("DELETE FROM admin_sites WHERE user_id=?", [req.params.id]);
    await db.query("UPDATE users SET created_by_admin=NULL WHERE created_by_admin=?", [req.params.id]);
    await db.query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ ok: true, message: "Admin deleted" });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── TEMPLATES ─────────────────────────────────────────────────
exports.getTemplates = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id,name,description,category,thumbnail,tags,is_premium,price,is_active,downloads,template_data,created_at FROM page_templates ORDER BY is_premium ASC, downloads DESC");
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.getTemplatesPublic = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id,name,description,category,thumbnail,tags,is_premium,price,template_data,downloads FROM page_templates WHERE is_active=1 ORDER BY is_premium ASC, downloads DESC");
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, category, description, tags, is_premium, price, template_data, primary_color, accent_color } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    const thumbnail = req.file ? "/uploads/templates/" + req.file.filename : null;
    const td = typeof template_data === "string" ? template_data : JSON.stringify(template_data || {});
    const slug = name.toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"") + "-" + Date.now();
    // Extract colors from template_data if not provided directly
    let pc = primary_color, ac = accent_color;
    if (!pc || !ac) {
      try { const parsed = JSON.parse(typeof template_data==="string"?template_data:"{}"); pc=pc||parsed.primary||"#5C6EF8"; ac=ac||parsed.accent||"#10C48A"; } catch(_){}
    }
    await db.query(
      "INSERT INTO page_templates (name,slug,description,category,thumbnail,tags,is_premium,price,template_data,primary_color,accent_color,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
      [name, slug, description||"", category||"education", thumbnail, tags||"", is_premium?1:0, price||0, td, pc||"#5C6EF8", ac||"#10C48A"]
    );
    res.json({ ok: true, message: "Template created successfully" });
  } catch(e){ console.error(e); res.status(500).json({ message: e.message }); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { name, category, description, tags, is_premium, price, template_data, is_active, required_plan } = req.body;
    const updates = [], params = [];
    if (name)                { updates.push("name=?");          params.push(name); }
    if (category)            { updates.push("category=?");      params.push(category); }
    if (description !== undefined) { updates.push("description=?"); params.push(description); }
    if (tags !== undefined)  { updates.push("tags=?");          params.push(tags); }
    if (is_premium !== undefined){ updates.push("is_premium=?"); params.push(is_premium?1:0); }
    if (price !== undefined) { updates.push("price=?");         params.push(price||0); }
    if (template_data)       { updates.push("template_data=?"); params.push(typeof template_data==="string"?template_data:JSON.stringify(template_data)); }
    if (is_active !== undefined){ updates.push("is_active=?");  params.push(is_active?1:0); }
    if (req.file)            { updates.push("thumbnail=?");     params.push("/uploads/templates/"+req.file.filename); }
    if (req.body.primary_color){ updates.push("primary_color=?"); params.push(req.body.primary_color); }
    if (req.body.accent_color) { updates.push("accent_color=?");  params.push(req.body.accent_color); }
    if (required_plan !== undefined) { updates.push("required_plan=?"); params.push(required_plan || null); }
    if (!updates.length) return res.status(400).json({ message: "Nothing to update" });
    params.push(req.params.id);
    await db.query("UPDATE page_templates SET "+updates.join(",")+` WHERE id=?`, params);
    res.json({ ok: true, message: "Template updated" });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    await db.query("DELETE FROM page_templates WHERE id=?", [req.params.id]);
    res.json({ ok: true, message: "Template deleted" });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── TRANSACTIONS ──────────────────────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT o.*,u.name as user_name,u.email as user_email,s.school_name FROM orders o JOIN users u ON o.user_id=u.id LEFT JOIN admin_sites s ON o.site_id=s.id ORDER BY o.created_at DESC LIMIT 300`);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── GLOBAL SETTINGS ───────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT setting_key,setting_value FROM global_settings");
    const s = {}; rows.forEach(r => s[r.setting_key] = r.setting_value);
    res.json(s);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.updateSettings = async (req, res) => {
  try {
    for (const [k, v] of Object.entries(req.body)) {
      await db.query("INSERT INTO global_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?", [k, v, v]);
    }
    res.json({ ok: true, message: "Settings saved" });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── ANNOUNCEMENTS ─────────────────────────────────────────────
exports.sendAnnouncement = async (req, res) => {
  try {
    const { target, title, message } = req.body;
    if (!title || !message) return res.status(400).json({ message: "Title and message required" });
    let q = "SELECT id FROM users WHERE is_active=1";
    if (target === "admins") q += " AND role_id=2";
    else if (target === "students") q += " AND role_id=1";
    else if (target === "instructors") q += " AND role_id=3";
    const [users] = await db.query(q);
    if (!users.length) return res.json({ ok: true, message: "No users found" });
    const vals = users.map(u => [u.id, req.user.id, title, message, "announcement"]);
    await db.query("INSERT INTO notifications (user_id,sender_id,title,message,type) VALUES ?", [vals]);
    res.json({ ok: true, message: `Sent to ${users.length} users` });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// ── SUBSCRIPTION MANAGEMENT ───────────────────────────────────
exports.getSubscriptions = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, u.name as admin_name, u.email as admin_email, a.school_name
      FROM admin_subscriptions s
      JOIN users u ON s.admin_id = u.id
      LEFT JOIN admin_sites a ON a.user_id = s.admin_id
      ORDER BY s.created_at DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { admin_id, plan, status, expires_at, notes } = req.body;
    // Send activation email if status is active
    const isActivating = status === 'active';
    if (!admin_id || !plan) return res.status(400).json({ message: "admin_id and plan required" });
    const [admins] = await db.query("SELECT id,name,email FROM users WHERE id=? AND role_id=2 LIMIT 1", [admin_id]);
    if (!admins.length) return res.status(404).json({ message: "Admin not found" });
    const expiry = expires_at || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + (plan === "yearly" ? 12 : 1));
      return d.toISOString().split("T")[0];
    })();
    await db.query(`
      INSERT INTO admin_subscriptions (admin_id, plan, status, expires_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        plan=VALUES(plan), status=VALUES(status),
        expires_at=VALUES(expires_at), notes=VALUES(notes), updated_at=NOW()`,
      [admin_id, plan, status || "active", expiry, notes || null]
    );
    await db.query(
      "INSERT INTO notifications (user_id,title,message,type) VALUES (?,?,?,?)",
      [admin_id, "📦 Subscription Updated", `Your ${plan} subscription is now ${status || "active"} until ${expiry}.`, "success"]
    );
    // Send activation email
    if (isActivating) {
      try {
        const [adminUser] = await db.query("SELECT id,name,email FROM users WHERE id=?", [admin_id]);
        if (adminUser[0]) emailService.sendSubscriptionActivated(adminUser[0], plan, expiry).catch(()=>{});
      } catch(_) {}
    }
    res.json({ ok: true, message: "Subscription updated" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.cancelSubscription = async (req, res) => {
  try {
    await db.query("UPDATE admin_subscriptions SET status='cancelled', updated_at=NOW() WHERE id=?", [req.params.id]);
    res.json({ ok: true, message: "Subscription cancelled" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── SUBSCRIPTION PLANS (DB-driven CRUD) ──────────────────────
// These replace the old hardcoded getSubscriptionPlans
exports.getPlans = async (req, res) => {
  try {
    // Try DB first; fall back to defaults if table doesn't exist yet
    const [rows] = await db.query("SELECT * FROM subscription_plans WHERE is_active=1 ORDER BY price ASC").catch(() => [[]]);
    if (rows.length) return res.json(rows);
    // Default plans returned if no DB table yet
    res.json([
      { id: "starter",    name: "Starter",         price: 5000,   currency: "NGN", duration_months: 1,  features: ["Up to 100 students","5 courses","10 past questions","Basic analytics"] },
      { id: "growth",     name: "Growth",           price: 15000,  currency: "NGN", duration_months: 1,  features: ["Up to 1,000 students","Unlimited courses","Unlimited past questions","Full analytics","Custom domain"] },
      { id: "enterprise", name: "Enterprise",       price: 50000,  currency: "NGN", duration_months: 1,  features: ["Unlimited students","All Growth features","API access","Priority support","White-label"] },
      { id: "yearly",     name: "Yearly (Growth)",  price: 150000, currency: "NGN", duration_months: 12, features: ["All Growth features","2 months free","Dedicated support"] },
    ]);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, price, currency, duration_months, features, description } = req.body;
    if (!name || !price) return res.status(400).json({ message: "Name and price required" });
    const featuresJson = Array.isArray(features) ? JSON.stringify(features) : (features || "[]");
    const slug = name.toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"") + "-" + Date.now();
    const [r] = await db.query(
      "INSERT INTO subscription_plans (slug, name, price, currency, duration_months, features, description, is_active) VALUES (?,?,?,?,?,?,?,1)",
      [slug, name, price, currency||"NGN", duration_months||1, featuresJson, description||""]
    );
    res.json({ ok: true, message: "Plan created", id: r.insertId });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.updatePlan = async (req, res) => {
  try {
    const { name, price, currency, duration_months, features, description, is_active } = req.body;
    const updates = [], params = [];
    if (name)                     { updates.push("name=?");             params.push(name); }
    if (price !== undefined)      { updates.push("price=?");            params.push(price); }
    if (currency)                 { updates.push("currency=?");         params.push(currency); }
    if (duration_months !== undefined) { updates.push("duration_months=?"); params.push(duration_months); }
    if (features !== undefined)   { updates.push("features=?");         params.push(Array.isArray(features)?JSON.stringify(features):features); }
    if (description !== undefined){ updates.push("description=?");      params.push(description); }
    if (is_active !== undefined)  { updates.push("is_active=?");        params.push(is_active?1:0); }
    if (!updates.length) return res.status(400).json({ message: "Nothing to update" });
    params.push(req.params.id);
    await db.query("UPDATE subscription_plans SET "+updates.join(",")+" WHERE id=?", params);
    res.json({ ok: true, message: "Plan updated" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.deletePlan = async (req, res) => {
  try {
    await db.query("UPDATE subscription_plans SET is_active=0 WHERE id=?", [req.params.id]);
    res.json({ ok: true, message: "Plan removed" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── PLATFORM PAYMENT SETTINGS ─────────────────────────────────
// Super admin's own gateway for receiving subscription payments
exports.getPlatformPaymentSettings = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM global_settings WHERE setting_key LIKE 'platform_pay_%'"
    );
    const s = {};
    rows.forEach(r => {
      const key = r.setting_key.replace("platform_pay_", "");
      s[key] = r.setting_value;
    });
    res.json(s);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

exports.savePlatformPaymentSettings = async (req, res) => {
  try {
    const allowed = ["gateway","public_key","secret_key","is_active","bank_name","bank_account_number","bank_account_name","bank_instructions"];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        const k = "platform_pay_" + field;
        const v = String(req.body[field]);
        await db.query(
          "INSERT INTO global_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?",
          [k, v, v]
        );
      }
    }
    res.json({ ok: true, message: "Platform payment settings saved" });
  } catch(e) { res.status(500).json({ message: e.message }); }
};