/**
 * routes/public.js
 * All unauthenticated public-facing API endpoints.
 * Used by school sites, landing pages, and external consumers.
 */
const express = require("express");
const router = express.Router();
const db = require("../config/database");

// ── Site info by subdomain ────────────────────────────────────
router.get("/site/:subdomain", async (req, res) => {
  try {
    const [sites] = await db.query(`
      SELECT s.id, s.user_id, s.school_name, s.subdomain, s.custom_domain,
             s.logo, s.description, s.primary_color, s.accent_color,
             s.is_active, s.template_id,
             u.name as admin_name,
             pt.name as template_name, pt.template_data, pt.thumbnail as template_thumbnail
      FROM admin_sites s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN page_templates pt ON s.template_id = pt.id
      WHERE (s.subdomain=? OR s.custom_domain=?) AND s.is_active=1 AND s.is_approved=1`,
      [req.params.subdomain, req.params.subdomain]
    );
    if (!sites[0]) return res.status(404).json({ message: "Site not found" });
    const site = sites[0];

    // Published pages for this site
    const [pages] = await db.query(
      "SELECT id,page_name,page_slug,page_data FROM admin_pages WHERE admin_id=? AND is_published=1",
      [site.user_id]
    );

    // Site stats
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE site_id=? AND role_id=1) as total_students,
        (SELECT COUNT(*) FROM users WHERE site_id=? AND role_id=3 AND is_approved=1) as total_instructors,
        (SELECT COUNT(*) FROM courses c JOIN users u ON c.instructor_id=u.id WHERE u.site_id=? AND c.is_published=1 AND c.is_approved=1) as total_courses,
        (SELECT COUNT(*) FROM past_questions pq JOIN users u ON pq.instructor_id=u.id WHERE u.site_id=? AND pq.is_active=1) as total_pqs`,
      [site.id, site.id, site.id, site.id]
    );

    res.json({ site, pages, stats });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Courses for a school site ─────────────────────────────────
router.get("/site/:subdomain/courses", async (req, res) => {
  try {
    const [s] = await db.query(
      "SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1 LIMIT 1",
      [req.params.subdomain]
    );
    if (!s[0]) return res.status(404).json({ message: "Site not found" });
    const { category, level, search, limit = 20, page = 1 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));

    let q = `
      SELECT c.id, c.title, c.description, c.thumbnail, c.price, c.level,
             c.category, c.rating, c.total_lessons,
             u.name as instructor_name,
             (SELECT COUNT(*) FROM user_purchases WHERE item_type='course' AND item_id=c.id) as enrolled_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE u.site_id=? AND c.is_published=1 AND c.is_approved=1`;
    const params = [s[0].id];

    if (category) { q += " AND c.category=?"; params.push(category); }
    if (level)    { q += " AND c.level=?"; params.push(level); }
    if (search)   { q += " AND (c.title LIKE ? OR c.description LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
    q += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(q, params);
    res.json({ courses: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Past questions for a school site ─────────────────────────
router.get("/site/:subdomain/past-questions", async (req, res) => {
  try {
    const [s] = await db.query(
      "SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1 LIMIT 1",
      [req.params.subdomain]
    );
    if (!s[0]) return res.status(404).json({ message: "Site not found" });
    const [rows] = await db.query(`
      SELECT pq.id, pq.title, pq.price, pq.year, pq.cover_image,
             pq.subject_name as subject, pq.access_type,
             i.name as institution_name
      FROM past_questions pq
      LEFT JOIN institutions i ON pq.institution_id = i.id
      JOIN users u ON pq.instructor_id = u.id
      WHERE u.site_id=? AND pq.is_active=1
      ORDER BY pq.created_at DESC`, [s[0].id]
    );
    res.json({ past_questions: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Single course detail (public) ────────────────────────────
router.get("/courses/:id", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.name as instructor_name, u.avatar as instructor_avatar,
             (SELECT COUNT(*) FROM user_purchases WHERE item_type='course' AND item_id=c.id) as enrolled_count,
             (SELECT COUNT(*) FROM course_reviews WHERE course_id=c.id AND is_approved=1) as review_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id=? AND c.is_published=1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Course not found" });
    const [sections] = await db.query(
      "SELECT * FROM course_sections WHERE course_id=? ORDER BY order_index ASC",
      [req.params.id]
    );
    const [lessons] = await db.query(
      "SELECT id,section_id,title,duration,is_free FROM course_lessons WHERE course_id=? ORDER BY order_index ASC",
      [req.params.id]
    );
    res.json({ course: rows[0], sections, lessons });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Available templates (public listing for home.html) ────────
router.get("/templates", async (req, res) => {
  try {
    // Select only columns that ALWAYS exist (no ALTER TABLE required)
    const [rows] = await db.query(
      "SELECT id, name, category, thumbnail, is_premium, price, description, template_data " +
      "FROM page_templates WHERE is_active=1 ORDER BY is_premium ASC, created_at DESC"
    );
    // Extract colors from template_data JSON — works even without ALTER TABLE
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
  } catch(e) { console.error("GET /public/templates:", e.message); res.status(500).json({ message: e.message }); }
});

// ── Single past question detail (public) ─────────────────────
router.get("/past-questions/:id", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pq.id, pq.title, pq.description, pq.price, pq.year,
             pq.cover_image, pq.subject_name, pq.access_type, pq.is_active,
             i.name as institution_name
      FROM past_questions pq
      LEFT JOIN institutions i ON pq.institution_id = i.id
      WHERE pq.id=? AND pq.is_active=1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Public instructor profile (no auth required) ──────────────
router.get("/instructor/:id/profile", async (req, res) => {
  try {
    const instructorId = req.params.id;
    const [[user]] = await db.query(
      `SELECT u.id, u.name, u.avatar, u.bio, u.institution_name AS title, u.created_at
       FROM users u WHERE u.id=? AND u.role_id IN (2,3,4)`,
      [instructorId]
    );
    if (!user) return res.status(404).json({ message: "Instructor not found" });

    const [courses] = await db.query(
      `SELECT c.id, c.title, c.thumbnail, c.price, c.rating, c.review_count,
              c.enrolled_count, c.level, c.duration_hours, c.total_lessons, c.category, c.created_at
       FROM courses c
       WHERE c.instructor_id=? AND c.is_active=1 AND c.is_published=1
       ORDER BY c.enrolled_count DESC`,
      [instructorId]
    );

    const [[stats]] = await db.query(
      `SELECT COUNT(DISTINCT c.id) AS total_courses,
              COALESCE(SUM(c.enrolled_count),0) AS total_students,
              COALESCE(AVG(c.rating),0) AS average_rating,
              COALESCE(SUM(c.review_count),0) AS total_reviews
       FROM courses c WHERE c.instructor_id=? AND c.is_active=1`,
      [instructorId]
    );

    res.json({
      ...user, courses,
      total_courses:  stats.total_courses  || 0,
      total_students: stats.total_students || 0,
      average_rating: stats.average_rating ? Number(stats.average_rating).toFixed(1) : null,
      total_reviews:  stats.total_reviews  || 0,
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;