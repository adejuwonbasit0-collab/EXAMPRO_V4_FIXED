const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

// Revision history — non-fatal, wrapped in try/catch so save never fails
let RevisionService = null;
try { RevisionService = require("../services/RevisionService"); } catch(_) {}

// ─── PUBLIC: Load page builder data (for rendering school-site.html) ───────────
router.get("/load", async (req, res) => {
  try {
    const { subdomain, page = "home" } = req.query;
    if (!subdomain) return res.status(400).json({ message: "subdomain required" });

    const [sites] = await db.query(
      "SELECT * FROM admin_sites WHERE subdomain=? AND is_active=1",
      [subdomain]
    );
    if (!sites[0]) return res.status(404).json({ message: "Site not found" });

    const site = sites[0];
    const [pages] = await db.query(
      "SELECT * FROM admin_pages WHERE admin_id=? AND page_slug=? AND is_published=1",
      [site.user_id, page]
    );
    const [templates] = await db.query(
      "SELECT * FROM page_templates WHERE id=?",
      [site.template_id]
    );

    res.json({
      site,
      page_data: pages[0] || null,
      template: templates[0] || null,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Load page builder (for editing in admin panel) ───────────────────
router.get("/admin-load", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = "home" } = req.query;
    const adminId = req.user.id;

    const [siteRows] = await db.query(
      "SELECT * FROM admin_sites WHERE user_id=?",
      [adminId]
    );
    const site = siteRows[0] || null;

    const [pages] = await db.query(
      "SELECT * FROM admin_pages WHERE admin_id=? AND page_slug=?",
      [adminId, page]
    );

    let tpl = null;
    if (site?.template_id) {
      const [t] = await db.query(
        "SELECT * FROM page_templates WHERE id=?",
        [site.template_id]
      );
      tpl = t[0] || null;
    }

    res.json({
      site,
      page_data: pages[0] || null,
      template: tpl,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Save page (draft or publish) ────────────────────────────────────
router.post("/save", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      page_slug = "home",
      page_name = "Home",
      page_data,
      is_published = false,
    } = req.body;

    if (!page_data) return res.status(400).json({ message: "page_data required" });

    await db.query(
      `INSERT INTO admin_pages
         (admin_id, page_name, page_slug, page_data, is_published, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         page_data = VALUES(page_data),
         is_published = VALUES(is_published),
         updated_at = NOW()`,
      [adminId, page_name, page_slug, JSON.stringify(page_data), is_published ? 1 : 0]
    );

    // ── If publishing homepage, also update admin_sites visual fields ──
    // This makes the live school site immediately reflect changes
    if (is_published && page_slug === "home") {
      const pd = typeof page_data === "string" ? JSON.parse(page_data) : page_data;

      // Extract top-level site fields from page_data if provided
      const siteUpdates = {};
      if (pd.hero_title)   siteUpdates.hero_title   = pd.hero_title;
      if (pd.hero_subtitle) siteUpdates.hero_subtitle = pd.hero_subtitle;
      if (pd.school_name)  siteUpdates.school_name  = pd.school_name;
      if (pd.primary_color)  siteUpdates.primary_color  = pd.primary_color;
      if (pd.accent_color)   siteUpdates.accent_color   = pd.accent_color;
      if (pd.bg_color)       siteUpdates.bg_color       = pd.bg_color;
      if (pd.font_family)    siteUpdates.font_family    = pd.font_family;
      // Store full page_data in admin_sites.page_data for advanced rendering
      siteUpdates.page_data   = JSON.stringify(page_data);
      siteUpdates.updated_at  = new Date();

      if (Object.keys(siteUpdates).length > 0) {
        const setClause = Object.keys(siteUpdates)
          .map(k => `\`${k}\` = ?`)
          .join(", ");
        const vals = [...Object.values(siteUpdates), adminId];
        await db.query(
          `UPDATE admin_sites SET ${setClause} WHERE user_id = ?`,
          vals
        );
      }
    }

    res.json({ ok: true, is_published });

    // Create revision snapshot (non-fatal — save already succeeded)
    if (RevisionService) {
      const saveType = is_published ? "publish" : "manual_save";
      RevisionService.createRevision({
        adminId,
        pageSlug: page_slug,
        layoutJson: typeof page_data === "string" ? page_data : JSON.stringify(page_data),
        saveType,
        sectionsCount: (typeof page_data === "object" ? page_data?.sections?.length : null) || 0,
        widgetsCount: 0,
      }).catch(() => {});
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Publish a saved draft ───────────────────────────────────────────
router.post("/publish", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { page_slug = "home" } = req.body;

    const [pages] = await db.query(
      "SELECT * FROM admin_pages WHERE admin_id=? AND page_slug=?",
      [adminId, page_slug]
    );

    if (!pages[0]) return res.status(404).json({ message: "No saved draft found for this page." });

    await db.query(
      "UPDATE admin_pages SET is_published=1, updated_at=NOW() WHERE admin_id=? AND page_slug=?",
      [adminId, page_slug]
    );

    // Sync to admin_sites live fields
    const pd = JSON.parse(pages[0].page_data || "{}");
    const siteUpdates = {};
    ["hero_title","hero_subtitle","school_name","primary_color","accent_color","bg_color","font_family"].forEach(k => {
      if (pd[k]) siteUpdates[k] = pd[k];
    });
    siteUpdates.page_data = pages[0].page_data;
    siteUpdates.updated_at = new Date();

    const setClause = Object.keys(siteUpdates).map(k => `\`${k}\` = ?`).join(", ");
    await db.query(
      `UPDATE admin_sites SET ${setClause} WHERE user_id = ?`,
      [...Object.values(siteUpdates), adminId]
    );

    res.json({ ok: true, message: "Page published! Your live site has been updated." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Update site appearance fields directly ───────────────────────────
// Used by page builder's "quick settings" panel (colors, font, hero text)
router.post("/update-site", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const allowed = [
      "school_name","hero_title","hero_subtitle","about_title","about_text",
      "primary_color","accent_color","bg_color","font_family",
      "courses_title","pq_title","logo_url"
    ];

    const updates = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    if (!Object.keys(updates).length) return res.status(400).json({ message: "No valid fields provided" });

    updates.updated_at = new Date();
    const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(", ");
    await db.query(
      `UPDATE admin_sites SET ${setClause} WHERE user_id = ?`,
      [...Object.values(updates), adminId]
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Get available templates ─────────────────────────────────────────
router.get("/templates", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;

    const [purchased] = await db.query(
      `SELECT pt.* FROM page_templates pt
       JOIN template_purchases tp ON tp.template_id = pt.id
       WHERE tp.admin_id = ? AND pt.is_active = 1`,
      [adminId]
    );

    const [free] = await db.query(
      "SELECT * FROM page_templates WHERE is_active=1 AND is_premium=0"
    );

    const seen = new Set(purchased.map(t => t.id));
    const all = [...purchased, ...free.filter(t => !seen.has(t.id))];

    res.json({ templates: all });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Apply a template to site ────────────────────────────────────────
router.post("/apply-template", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { template_id } = req.body;

    const [tpl] = await db.query(
      "SELECT * FROM page_templates WHERE id=? AND is_active=1",
      [template_id]
    );
    if (!tpl[0]) return res.status(404).json({ message: "Template not found" });

    // ── Plan gating: check required_plan ─────────────────────────────────────
    if (tpl[0].required_plan) {
      const [subRows] = await db.query(
        `SELECT s.plan FROM admin_subscriptions s
         JOIN subscription_plans sp ON LOWER(sp.name) = LOWER(s.plan)
         WHERE s.admin_id=? AND s.status='active' AND (s.expires_at IS NULL OR s.expires_at > NOW())
         LIMIT 1`,
        [adminId]
      );
      if (!subRows.length) {
        return res.status(403).json({
          message: `This template requires the "${tpl[0].required_plan}" plan. Please upgrade your subscription.`,
          requires_plan: tpl[0].required_plan
        });
      }
      // Simple plan hierarchy: starter < basic < pro < enterprise
      const hierarchy = ['starter', 'basic', 'pro', 'enterprise', 'premium'];
      const adminPlan  = (subRows[0].plan || '').toLowerCase();
      const reqPlan    = tpl[0].required_plan.toLowerCase();
      const adminLevel = hierarchy.indexOf(adminPlan);
      const reqLevel   = hierarchy.indexOf(reqPlan);
      // If plan not in hierarchy, do string equality check
      const hasAccess  = (adminLevel === -1 || reqLevel === -1)
        ? adminPlan === reqPlan
        : adminLevel >= reqLevel;
      if (!hasAccess) {
        return res.status(403).json({
          message: `This template requires the "${tpl[0].required_plan}" plan or higher. Your current plan: "${subRows[0].plan}".`,
          requires_plan: tpl[0].required_plan,
          current_plan: subRows[0].plan
        });
      }
    }

    // Access check: free templates are available to all; premium requires purchase
    if (tpl[0].is_premium) {
      const [p] = await db.query(
        "SELECT id FROM template_purchases WHERE admin_id=? AND template_id=?",
        [adminId, template_id]
      );
      if (!p[0]) return res.status(403).json({ message: "Please purchase this template first" });
    }

    // Apply template: set template_id + migrate template design tokens to site fields
    const td = {};
    try {
      Object.assign(td, typeof tpl[0].template_data === "string"
        ? JSON.parse(tpl[0].template_data || "{}")
        : (tpl[0].template_data || {}));
    } catch (e) {}

    const siteFields = {
      template_id,
      updated_at: new Date(),
    };
    if (td.primary  || tpl[0].primary_color)  siteFields.primary_color  = td.primary  || tpl[0].primary_color;
    if (td.accent   || tpl[0].accent_color)   siteFields.accent_color   = td.accent   || tpl[0].accent_color;
    if (td.bg       || tpl[0].bg_color)       siteFields.bg_color       = td.bg       || tpl[0].bg_color;
    if (td.font     || tpl[0].font_family)    siteFields.font_family    = td.font     || tpl[0].font_family;

    const setClause = Object.keys(siteFields).map(k => `\`${k}\` = ?`).join(", ");
    await db.query(
      `UPDATE admin_sites SET ${setClause} WHERE user_id = ?`,
      [...Object.values(siteFields), adminId]
    );

    res.json({ ok: true, message: "Template applied! Your site design has been updated." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── ADMIN: Delete a page ────────────────────────────────────────────────────
router.delete("/page", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { page_slug } = req.body;
    if (!page_slug || page_slug === "home") return res.status(400).json({ message: "Cannot delete home page" });
    await db.query(
      "DELETE FROM admin_pages WHERE admin_id=? AND page_slug=?",
      [adminId, page_slug]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── PUBLIC: Templates (for home.html and template-preview.html) ─────────────
router.get("/templates-public", async (req, res) => {
  try {
    const [templates] = await db.query(
      "SELECT * FROM page_templates WHERE is_active=1 ORDER BY is_premium ASC, created_at DESC"
    );
    res.json(templates);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;