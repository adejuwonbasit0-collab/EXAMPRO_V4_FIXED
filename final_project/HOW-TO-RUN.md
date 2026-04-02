# ExamPro LMS + Page Builder — Complete Setup Guide

## What was merged
The full 12-phase Elementor-style React Page Builder is now integrated into
your ExamPro LMS. School admins (role_id=2) get a professional drag-and-drop
builder replacing the old block editor.

---

## Quick Start — 3 commands

```bash
# 1. Add revision table to your database (safe to run multiple times)
mysql -u root -p your_database_name < backend/config/migration.sql

# 2. Build the React builder (one time only, or after any code change)
cd frontend
npm install
npm run build

# 3. Start the server
cd backend
node server.js
```

The builder is now at `/admin` → click **🛠️ Page Builder** tab.

---

## How it works for each role

### You — Super Admin (role_id=4)
- Upload templates via `/super-admin` dashboard
- Set free vs premium pricing per template
- School admins can only see and use what you publish

### School Owner — Admin (role_id=2)
1. Logs into `/admin`
2. **🎨 My Template** tab — see templates they own (free + purchased)
   - Free: click Apply instantly
   - Premium: click Buy → Paystack checkout → unlocked after payment
3. **🛠️ Page Builder** tab — full React builder opens
   - Drag widgets from left panel onto canvas
   - Click any element to edit it in right panel
   - Switch Desktop / Tablet / Mobile to set responsive styles
   - **Save Draft** or **🚀 Publish** (publish updates the live site immediately)
4. Students visit `/site/their-subdomain` and see the published page

### Instructor (role_id=3)
No page builder access — teaches courses only.

### Student (role_id=1)
Visits the school's published site, enrolls in courses, attempts past questions.

---

## What was changed in your files

### Modified (4 files)
| File | What changed |
|---|---|
| `backend/server.js` | Added 2 route mounts: `/api/render` and `/api/revisions` |
| `backend/routes/pagebuilder.js` | Calls `RevisionService.createRevision()` after every save |
| `frontend/pages/admin/index.html` | Replaced old builder HTML with `<div id="builder-root">`, loads `/dist/builder.js` |
| `backend/config/migration.sql` | Added `page_revisions` table + 2 columns to `admin_pages` |

### New Backend Files
```
backend/renderers/cssBuilder.js        — layout styles → CSS
backend/renderers/widgetRenderers.js   — widget JSON → HTML strings
backend/renderers/v1Adapter.js         — converts old blocks[] to new format
backend/services/RenderService.js      — orchestrates JSON → full HTML page
backend/services/RevisionService.js    — saves/lists/restores page versions
backend/utils/deepMerge.js
backend/utils/htmlSanitizer.js
backend/utils/idGenerator.js
backend/utils/layoutValidator.js
backend/routes/render.js              — GET /api/render/page, /fragment, /preview
backend/routes/revisions.js           — GET/POST /api/revisions/:pageSlug/*
```

### New Frontend Files
```
frontend/src/builder/           — 89 React files (the full builder)
frontend/vite.config.js         — Vite build config
frontend/package.json           — React + DnD dependencies
```

---

## New API endpoints

| Method | Endpoint | Who uses it | What it does |
|---|---|---|---|
| GET | `/api/render/page?subdomain=x` | `school-site.html` | Renders live site to HTML |
| POST | `/api/render/preview` | Builder preview | Renders draft layout to HTML |
| GET | `/api/revisions/:pageSlug` | Builder revision panel | Lists save history |
| POST | `/api/revisions/:pageSlug/:id/restore` | Builder | Restores a previous version |

---

## Build output
After `npm run build` in `frontend/`, Vite creates:
```
frontend/public/dist/builder.js    ← loaded by admin/index.html
frontend/public/dist/builder.css   ← auto-injected styles
```
These are served as static files by your existing Express `express.static`.

---

## Troubleshooting

**Builder shows blank / doesn't load**
- Run `cd frontend && npm run build` first
- Check browser console for errors
- Confirm `/dist/builder.js` exists in `frontend/public/dist/`

**Templates don't show in builder's Templates tab**
- The tab calls `/api/templates/my` which returns free + purchased templates
- If empty: go to **🎨 My Template** tab first and apply one

**Revisions not saving**
- Run the migration SQL to create the `page_revisions` table
- Check server logs for `[RevisionService]` warnings

**"ep_token not found" errors**
- Your LMS stores JWT as `ep_token` in localStorage — this is already wired correctly
