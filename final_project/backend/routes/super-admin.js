const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/superAdminController");
const { authMiddleware, superAdminMiddleware } = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs");
const db = require("../config/database");

const tplStorage = multer.diskStorage({
  destination: (req,file,cb) => { const d='uploads/templates'; if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true}); cb(null,d); },
  filename: (req,file,cb) => cb(null, Date.now()+"_"+file.originalname)
});
const upload = multer({ storage: tplStorage });

// ── Public endpoints (no auth needed) ──────────────────────────────
router.get("/templates-public", ctrl.getTemplatesPublic);

// ── Everything below requires Super Admin (role_id = 4) ────────────
router.use(authMiddleware, superAdminMiddleware);

router.get("/dashboard", ctrl.getDashboard);
router.get("/admins", ctrl.getAdmins);
router.patch("/admins/:id/toggle", ctrl.toggleAdmin);
router.delete("/admins/:id", ctrl.deleteAdmin);
router.post("/announcements", ctrl.sendAnnouncement);
router.get("/templates", ctrl.getTemplates);
router.post("/templates", upload.single("thumbnail"), ctrl.createTemplate);
router.put("/templates/:id", upload.single("thumbnail"), ctrl.updateTemplate);
router.delete("/templates/:id", ctrl.deleteTemplate);
router.get("/transactions", ctrl.getTransactions);
router.get("/settings", ctrl.getSettings);
router.put("/settings", ctrl.updateSettings);
router.get("/sites", ctrl.getSites);
router.patch("/sites/:id/approve", ctrl.approveSite);
router.patch("/sites/:id/reject", ctrl.rejectSite);

// ── Subscription management ─────────────────────────────────────────
router.get("/subscriptions", ctrl.getSubscriptions);
router.post("/subscriptions", ctrl.updateSubscription);
router.patch("/subscriptions/:id/cancel", ctrl.cancelSubscription);

// ── Subscription PLANS (CRUD) ───────────────────────────────────────
router.get("/plans", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM subscription_plans ORDER BY price ASC");
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/plans", async (req, res) => {
  try {
    const { name, price, interval, description, max_students, max_courses, max_past_questions, page_builder_enabled, ai_enabled, sort_order, is_featured, is_active, template_access } = req.body;
    if (!name) return res.status(400).json({ message: "Plan name required" });
    const features = req.body.features || [];
    const [r] = await db.query(
      "INSERT INTO subscription_plans (name,price,`interval`,description,max_students,max_courses,max_past_questions,page_builder_enabled,ai_enabled,sort_order,features,is_featured,is_active,template_access) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [name, price||0, interval||'month', description||'', max_students||0, max_courses||0, max_past_questions||0, page_builder_enabled!==0?1:0, ai_enabled!==0?1:0, sort_order||0, JSON.stringify(features), is_featured?1:0, is_active!==false?1:0, template_access||'all']
    );
    res.json({ ok: true, id: r.insertId, message: 'Plan created' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put("/plans/:id", async (req, res) => {
  try {
    const { name, price, interval, description, max_students, max_courses, max_past_questions, page_builder_enabled, ai_enabled, sort_order, is_featured, is_active, template_access } = req.body;
    const features = req.body.features || [];
    await db.query(
      "UPDATE subscription_plans SET name=?,price=?,`interval`=?,description=?,max_students=?,max_courses=?,max_past_questions=?,page_builder_enabled=?,ai_enabled=?,sort_order=?,features=?,is_featured=?,is_active=?,template_access=? WHERE id=?",
      [name, price||0, interval||'month', description||'', max_students||0, max_courses||0, max_past_questions||0, page_builder_enabled!==0?1:0, ai_enabled!==0?1:0, sort_order||0, JSON.stringify(features), is_featured?1:0, is_active!==false?1:0, template_access||'all', req.params.id]
    );
    res.json({ ok: true, message: 'Plan updated' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete("/plans/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM subscription_plans WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Platform payment settings ───────────────────────────────────────
router.get("/payment-settings", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM platform_payment_settings ORDER BY gateway");
    res.json({ settings: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post("/payment-settings", async (req, res) => {
  try {
    const { gateway, public_key, secret_key, is_active, bank_name, bank_account_number, bank_account_name, bank_instructions } = req.body;
    if (!gateway) return res.status(400).json({ message: "Gateway required" });
    await db.query(
      `INSERT INTO platform_payment_settings (gateway,public_key,secret_key,is_active,bank_name,bank_account_number,bank_account_name,bank_instructions)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE public_key=VALUES(public_key),secret_key=VALUES(secret_key),is_active=VALUES(is_active),
         bank_name=VALUES(bank_name),bank_account_number=VALUES(bank_account_number),
         bank_account_name=VALUES(bank_account_name),bank_instructions=VALUES(bank_instructions)`,
      [gateway, public_key||'', secret_key||'', is_active?1:0, bank_name||'', bank_account_number||'', bank_account_name||'', bank_instructions||'']
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;