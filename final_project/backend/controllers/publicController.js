const db = require("../config/database");

exports.getTemplates = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, description, category, thumbnail, tags, is_premium, price, downloads, template_data FROM page_templates WHERE is_active=1 ORDER BY is_premium ASC, downloads DESC"
    );
    const templates = rows.map(t => {
      let primary = '#2563eb', accent = '#10b981';
      try {
        const td = typeof t.template_data === 'string' ? JSON.parse(t.template_data || '{}') : (t.template_data || {});
        if (td.primary) primary = td.primary;
        if (td.accent)  accent  = td.accent;
      } catch(_) {}
      return { ...t, primary_color: primary, accent_color: accent };
    });
    res.json({ templates });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.getSiteBySubdomain = async (req, res) => {
  try {
    // Return site if active — removed is_approved requirement so admin can preview their own site
    // No status restriction - admin needs to preview their site even before approval
    const [rows] = await db.query(
      `SELECT s.*, t.name as template_name, t.primary_color, t.accent_color,
              t.template_data, t.thumbnail as template_thumbnail
       FROM admin_sites s
       LEFT JOIN page_templates t ON s.template_id=t.id
       WHERE (s.subdomain=? OR s.custom_domain=?)`,
      [req.params.subdomain, req.params.subdomain]);
    if (!rows.length) return res.status(404).json({ message: "Site not found" });
    res.json(rows[0]);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.getSiteCourses = async (req, res) => {
  try {
    // Get admin user_id from site
    const [sites] = await db.query("SELECT user_id FROM admin_sites WHERE id=?", [req.params.siteId]);
    if(!sites.length) return res.json([]);
    const adminId = sites[0].user_id;
    const [rows] = await db.query(`
      SELECT c.id,c.title,c.description,c.thumbnail,c.price,c.level,
             c.category,c.total_lessons,u.name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id=u.id
      WHERE (u.created_by_admin=? OR c.instructor_id=?)
        AND c.is_published=1 AND c.is_approved=1
      ORDER BY c.created_at DESC
    `, [adminId, adminId]);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};

exports.getSitePastQuestions = async (req, res) => {
  try {
    const [sites] = await db.query("SELECT user_id FROM admin_sites WHERE id=?", [req.params.siteId]);
    if(!sites.length) return res.json([]);
    const adminId = sites[0].user_id;
    const [rows] = await db.query(`
      SELECT pq.id,pq.title,pq.description,pq.cover_image,
             pq.exam_type,pq.subject,pq.year,pq.price,pq.downloads
      FROM past_questions pq
      LEFT JOIN institutions i ON pq.institution_id=i.id
      WHERE i.id IN (SELECT id FROM institutions WHERE id=pq.institution_id)
        AND pq.is_published=1
      ORDER BY pq.year DESC
    `, []);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
};