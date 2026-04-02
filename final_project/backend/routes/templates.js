/**
 * routes/templates.js
 * Template marketplace — admins browse, purchase, and manage templates.
 * Registered at: /api/templates
 */
const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// ── Public: list all active templates ────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id,name,category,description,primary_color,accent_color,thumbnail,is_premium,price,required_plan,created_at FROM page_templates WHERE is_active=1 ORDER BY is_premium ASC, created_at DESC"
    );
    res.json({ templates: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Admin: templates this admin owns (free + purchased) ───────
router.get("/my", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const [rows] = await db.query(`
      SELECT pt.*, tp.purchased_at
      FROM page_templates pt
      JOIN template_purchases tp ON tp.template_id = pt.id
      WHERE tp.admin_id = ? AND pt.is_active = 1
      UNION
      SELECT pt.*, NULL as purchased_at
      FROM page_templates pt
      WHERE (pt.is_premium = 0 OR pt.price = 0) AND pt.is_active = 1
      ORDER BY is_premium ASC, created_at DESC`, [adminId]
    );
    // Deduplicate by id
    const seen = new Set();
    const unique = rows.filter(r => seen.has(r.id) ? false : seen.add(r.id));
    res.json({ templates: unique });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Admin: purchase a premium template ───────────────────────
router.post("/purchase", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { template_id, payment_ref } = req.body;
    if (!template_id) return res.status(400).json({ message: "template_id required" });

    // Validate template exists and is premium
    const [tpls] = await db.query(
      "SELECT id,name,price,is_premium FROM page_templates WHERE id=? AND is_active=1 LIMIT 1",
      [template_id]
    );
    if (!tpls[0]) return res.status(404).json({ message: "Template not found" });
    const tpl = tpls[0];

    if (!tpl.is_premium || Number(tpl.price) === 0) {
      return res.status(400).json({ message: "This template is free — no purchase needed" });
    }

    // Check not already purchased
    const [existing] = await db.query(
      "SELECT id FROM template_purchases WHERE admin_id=? AND template_id=? LIMIT 1",
      [adminId, template_id]
    );
    if (existing[0]) return res.status(409).json({ message: "You already own this template" });

    // Record purchase (payment_ref links to the payment record)
    await db.query(
      "INSERT INTO template_purchases (admin_id, template_id, order_id) VALUES (?, ?, ?)",
      [adminId, template_id, payment_ref || null]
    );

    res.json({ ok: true, message: `Template "${tpl.name}" purchased successfully` });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Super-admin: create template ──────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role_id !== 4) return res.status(403).json({ message: "Super admin only" });
  try {
    const { name, category, description, primary_color, accent_color, thumbnail, is_premium, price, template_data } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });
    const [r] = await db.query(
      "INSERT INTO page_templates (name,category,description,primary_color,accent_color,thumbnail,is_premium,price,template_data,is_active) VALUES (?,?,?,?,?,?,?,?,?,1)",
      [name, category||"general", description||"", primary_color||"#5C6EF8", accent_color||"#F85C9B", thumbnail||null, is_premium?1:0, price||0, JSON.stringify(template_data||{})]
    );
    res.status(201).json({ ok: true, id: r.insertId, message: "Template created" });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
