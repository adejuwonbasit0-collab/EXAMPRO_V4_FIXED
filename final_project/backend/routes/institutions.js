const express = require("express");
const router = express.Router();
const db = require("../config/database");
const ctrl = require("../controllers/institutionController");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const pub = require("../controllers/publicController");

// ── Public routes ── must be before /:id

router.get("/public/templates", pub.getTemplates);

// Site by subdomain (main school site loader)
router.get("/public/site/:subdomain", pub.getSiteBySubdomain);

// Courses for a school site — by subdomain
router.get("/public/site/:subdomain/courses", async (req, res) => {
  try {
    const [sites] = await db.query(
      "SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1",
      [req.params.subdomain]
    );
    if (!sites.length) return res.json([]);
    const siteId = sites[0].id;

    const { search, level, category, sort } = req.query;

    let query = `
      SELECT c.id, c.title, c.price, c.level, c.category, c.thumbnail, c.description,
             c.created_at, c.enrolled_count,
             (SELECT COUNT(*) FROM course_sections s
              JOIN course_lessons l ON l.section_id=s.id
              WHERE s.course_id=c.id) as total_lessons,
             u.name as instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id=u.id
      WHERE u.site_id=? AND c.is_approved=1 AND c.is_published=1`;
    const params = [siteId];

    if (search)   { query += ' AND (c.title LIKE ? OR c.description LIKE ? OR u.name LIKE ?)'; const s='%'+search+'%'; params.push(s,s,s); }
    if (level)    { query += ' AND c.level=?';    params.push(level); }
    if (category) { query += ' AND c.category LIKE ?'; params.push('%'+category+'%'); }

    if (sort === 'price_asc')  query += ' ORDER BY c.price ASC';
    else if (sort === 'price_desc') query += ' ORDER BY c.price DESC';
    else if (sort === 'popular')    query += ' ORDER BY c.enrolled_count DESC';
    else                            query += ' ORDER BY c.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Past questions for a school site — by subdomain
router.get("/public/site/:subdomain/past-questions", async (req, res) => {
  try {
    const [sites] = await db.query(
      "SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1",
      [req.params.subdomain]
    );
    if (!sites.length) return res.json([]);
    const siteId = sites[0].id;

    const { search, exam_type, year, subject, sort } = req.query;

    let query = `
      SELECT pq.id, pq.title, pq.price, pq.year, pq.cover_image,
             pq.subject_name as subject, pq.total_questions, pq.created_at,
             i.name as institution_name,
             COALESCE(et.short_name, '') as exam_type
      FROM past_questions pq
      LEFT JOIN institutions i ON pq.institution_id=i.id
      LEFT JOIN exam_types et ON pq.exam_type_id=et.id
      JOIN users u ON pq.created_by=u.id
      WHERE u.site_id=? AND pq.is_active=1`;
    const params = [siteId];

    if (search)    { query += ' AND (pq.title LIKE ? OR pq.subject_name LIKE ?)'; const s='%'+search+'%'; params.push(s,s); }
    if (exam_type) { query += ' AND et.short_name LIKE ?'; params.push('%'+exam_type+'%'); }
    if (year)      { query += ' AND pq.year=?';              params.push(year); }
    if (subject)   { query += ' AND pq.subject_name LIKE ?'; params.push('%'+subject+'%'); }

    if (sort === 'year_desc')  query += ' ORDER BY pq.year DESC';
    else if (sort === 'year_asc')   query += ' ORDER BY pq.year ASC';
    else if (sort === 'price_asc')  query += ' ORDER BY pq.price ASC';
    else                            query += ' ORDER BY pq.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Site stats — students & instructors count
router.get("/public/site/:subdomain/stats", async (req, res) => {
  try {
    const [sites] = await db.query(
      "SELECT id FROM admin_sites WHERE subdomain=? AND is_active=1",
      [req.params.subdomain]
    );
    if (!sites.length) return res.json({ students: 0, instructors: 0 });
    const siteId = sites[0].id;
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE site_id=? AND role_id=1) as students,
        (SELECT COUNT(*) FROM users WHERE site_id=? AND role_id=3 AND is_approved=1) as instructors`,
      [siteId, siteId]);
    res.json(stats);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Site lookup helpers
router.get("/public/site-by-id/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id,subdomain,school_name,logo,primary_color FROM admin_sites WHERE id=? AND is_active=1",
      [req.params.id]
    );
    res.json(rows[0] || null);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

router.get("/public/site-by-id-subdomain/:subdomain", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id,subdomain,school_name,logo,primary_color FROM admin_sites WHERE subdomain=? AND is_active=1",
      [req.params.subdomain]
    );
    res.json(rows[0] || null);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

router.get("/public/admin-site/:adminId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id,subdomain,school_name,logo,primary_color,user_id FROM admin_sites WHERE user_id=? AND is_active=1",
      [req.params.adminId]
    );
    res.json(rows[0] || null);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// ── Authenticated routes ──
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.post("/", authMiddleware, adminMiddleware, ctrl.uploadLogo, ctrl.create);
router.put("/:id", authMiddleware, adminMiddleware, ctrl.uploadLogo, ctrl.update);
router.delete("/:id", authMiddleware, adminMiddleware, ctrl.delete);

module.exports = router;