// backend/routes/render.js
// Express router for all rendering endpoints.
//
// Routes:
//   GET  /api/render/page     — Full page render (published pages, live site)
//   GET  /api/render/fragment — Fragment render (builder preview iframe)
//   POST /api/render/preview  — Preview render for admin (draft, not published)
//
// Mount in server.js:
//   const renderRouter = require('./routes/render');
//   app.use('/api/render', renderRouter);
'use strict';

const express       = require('express');
const router        = express.Router();
const db            = require('../config/database');
const RenderService = require('../services/RenderService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ─── GET /api/render/page ─────────────────────────────────────────────────────
// Renders a fully published page.
// Used by school-site.html and any external consumer that wants the SSR HTML.
//
// Query params:
//   subdomain (required)  — the school's subdomain
//   page      (optional)  — page slug, defaults to "home"
//   format    (optional)  — "html" (default) | "fragment"
router.get('/page', async (req, res) => {
  try {
    const { subdomain, page = 'home', format } = req.query;
    if (!subdomain) return res.status(400).json({ error: 'subdomain required' });

    // Look up the site
    const [sites] = await db.query(
      'SELECT * FROM admin_sites WHERE subdomain = ? AND is_active = 1',
      [subdomain]
    );
    if (!sites[0]) return res.status(404).send('Site not found');
    const site = sites[0];

    // Look up the published page
    const [pages] = await db.query(
      'SELECT * FROM admin_pages WHERE admin_id = ? AND page_slug = ? AND is_published = 1',
      [site.user_id, page]
    );

    let layout;
    if (pages[0]?.page_data) {
      layout = typeof pages[0].page_data === 'string'
        ? JSON.parse(pages[0].page_data)
        : pages[0].page_data;
    } else {
      // No published page — serve a minimal placeholder
      layout = _placeholder(site);
    }

    // Attach any dynamic data the layout needs
    layout = await _injectDynamicData(layout, site);

    const html = format === 'fragment'
      ? RenderService.renderFragment(layout, site)
      : RenderService.renderPage(layout, site);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.send(html);
  } catch (err) {
    console.error('[render/page]', err);
    res.status(500).send(`<html><body><p>Render error: ${err.message}</p></body></html>`);
  }
});

// ─── GET /api/render/fragment ─────────────────────────────────────────────────
// Returns bare HTML + inline styles (no <html>/<head>).
// Used inside the builder's responsive preview iframe.
//
// Query params:
//   subdomain (required)
//   page      (optional, default "home")
router.get('/fragment', async (req, res) => {
  try {
    const { subdomain, page = 'home' } = req.query;
    if (!subdomain) return res.status(400).json({ error: 'subdomain required' });

    const [sites] = await db.query(
      'SELECT * FROM admin_sites WHERE subdomain = ? AND is_active = 1',
      [subdomain]
    );
    if (!sites[0]) return res.status(404).send('');
    const site = sites[0];

    const [pages] = await db.query(
      'SELECT * FROM admin_pages WHERE admin_id = ? AND page_slug = ? AND is_published = 1',
      [site.user_id, page]
    );

    const layout = pages[0]?.page_data
      ? (typeof pages[0].page_data === 'string' ? JSON.parse(pages[0].page_data) : pages[0].page_data)
      : _placeholder(site);

    const html = RenderService.renderFragment(await _injectDynamicData(layout, site), site);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[render/fragment]', err);
    res.status(500).send('');
  }
});

// ─── POST /api/render/preview ─────────────────────────────────────────────────
// Admin-only: render a draft layout (not necessarily published).
// Used by the builder's "Preview" button — renders the current unsaved state.
//
// Body: { layout: <layout JSON object>, format?: "html" | "fragment" }
router.post('/preview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { layout, format } = req.body;
    if (!layout) return res.status(400).json({ error: 'layout required' });

    const adminId = req.user.id;
    const [sites] = await db.query('SELECT * FROM admin_sites WHERE user_id = ?', [adminId]);
    const site    = sites[0] || {};

    const enriched = await _injectDynamicData(layout, site);
    const html     = format === 'fragment'
      ? RenderService.renderFragment(enriched, site)
      : RenderService.renderPage(enriched, site);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[render/preview]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Walk the layout and inject live database data for dynamic widget types
 * (courses_list, pq_list). Attaches fetched rows to widget.settings._courses
 * or widget.settings._pqs so renderers can use them.
 */
async function _injectDynamicData(layout, site) {
  if (!layout?.sections?.length) return layout;

  // Collect which dynamic widgets exist and what limits they need
  const coursesWidgets = [];
  const pqWidgets      = [];

  for (const section of layout.sections) {
    for (const col of (section.columns || [])) {
      for (const widget of (col.widgets || [])) {
        if (widget.type === 'courses_list') coursesWidgets.push(widget);
        if (widget.type === 'pq_list')      pqWidgets.push(widget);
      }
    }
  }

  // Fetch data if needed
  let courses = [], pqs = [];
  if (coursesWidgets.length && site.user_id) {
    try {
      const maxLimit = Math.max(...coursesWidgets.map(w => (w.settings?.limit || 8)));
      const [rows] = await db.query(
        'SELECT id, title, slug, thumbnail_url, price, rating FROM courses WHERE admin_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT ?',
        [site.user_id, maxLimit]
      );
      courses = rows;
    } catch (e) { /* table may not exist */ }
  }
  if (pqWidgets.length && site.user_id) {
    try {
      const maxLimit = Math.max(...pqWidgets.map(w => (w.settings?.limit || 6)));
      const [rows] = await db.query(
        'SELECT id, title, slug, subject, year FROM past_questions WHERE admin_id = ? ORDER BY created_at DESC LIMIT ?',
        [site.user_id, maxLimit]
      );
      pqs = rows;
    } catch (e) { /* table may not exist */ }
  }

  // Deep clone layout and inject data into widget settings
  // (shallow clone is fine — we only modify .settings._courses / ._pqs)
  return {
    ...layout,
    sections: layout.sections.map(section => ({
      ...section,
      columns: (section.columns || []).map(col => ({
        ...col,
        widgets: (col.widgets || []).map(widget => {
          if (widget.type === 'courses_list') {
            return { ...widget, settings: { ...(widget.settings || {}), _courses: courses } };
          }
          if (widget.type === 'pq_list') {
            return { ...widget, settings: { ...(widget.settings || {}), _pqs: pqs } };
          }
          return widget;
        }),
      })),
    })),
  };
}

/** Minimal placeholder layout when a school has no published page yet. */
function _placeholder(site) {
  return {
    version: '2.0',
    schema:  'page',
    page_slug: 'home',
    page_name: 'Home',
    page_title: site.school_name || 'Coming Soon',
    global_settings: {
      school_name:   site.school_name   || '',
      primary_color: site.primary_color || '#7C3AED',
      accent_color:  site.accent_color  || '#06D6A0',
      bg_color:      site.bg_color      || '#0f172a',
      font_family:   site.font_family   || 'DM Sans',
      colors: {
        primary:    site.primary_color || '#7C3AED',
        accent:     site.accent_color  || '#06D6A0',
        background: site.bg_color      || '#0f172a',
        text:       '#f1f5f9',
      },
      typography: { font_family_body: site.font_family || 'DM Sans' },
    },
    sections: [{
      id: 'section_placeholder',
      type: 'section',
      settings: {
        padding: { top: 120, right: 24, bottom: 120, left: 24 },
        background: { type: 'color', color: site.bg_color || '#0f172a' },
        content_width: 'boxed', content_max_width: 900,
      },
      responsive_settings: {},
      columns: [{
        id: 'col_placeholder',
        type: 'column',
        settings: { width: 100, padding: { top: 0, right: 0, bottom: 0, left: 0 }, horizontal_align: 'center' },
        responsive_settings: {},
        widgets: [
          {
            id: 'w_ph_h', type: 'heading',
            settings: { text: site.school_name || 'Coming Soon', html_tag: 'h1', font_size: 52, font_weight: '900', color: '#ffffff', text_align: 'center', margin_bottom: 16 },
            responsive_settings: { tablet: { font_size: 36 }, mobile: { font_size: 28 } },
          },
          {
            id: 'w_ph_t', type: 'text',
            settings: { content: `<p>This page is being built. Check back soon.</p>`, font_size: 18, color: 'rgba(255,255,255,0.6)', text_align: 'center', line_height: 1.75, margin_bottom: 0 },
            responsive_settings: {},
          },
        ],
      }],
    }],
  };
}

module.exports = router;
