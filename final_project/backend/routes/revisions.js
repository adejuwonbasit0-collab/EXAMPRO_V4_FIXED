// backend/routes/revisions.js
// Revision history API — all routes require admin auth (role_id 2 or 4)

'use strict';

const express         = require('express');
const router          = express.Router();
const RevisionService = require('../services/RevisionService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

// GET /api/revisions/:pageSlug — list revisions for a page
router.get('/:pageSlug', async (req, res) => {
  try {
    const revisions = await RevisionService.listRevisions(
      req.user.id,
      req.params.pageSlug,
      50
    );
    res.json({ ok: true, revisions });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/revisions/:pageSlug/:revisionId — get one revision's full layout
router.get('/:pageSlug/:revisionId', async (req, res) => {
  try {
    const revision = await RevisionService.getRevision(
      parseInt(req.params.revisionId),
      req.user.id
    );
    res.json({ ok: true, revision });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

// POST /api/revisions/:pageSlug/:revisionId/restore — restore page to a version
router.post('/:pageSlug/:revisionId/restore', async (req, res) => {
  try {
    const result = await RevisionService.restoreRevision(
      parseInt(req.params.revisionId),
      req.user.id
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// PATCH /api/revisions/:pageSlug/:revisionId/label — rename a revision
router.patch('/:pageSlug/:revisionId/label', async (req, res) => {
  try {
    const { label } = req.body;
    if (!label || typeof label !== 'string' || label.length > 200) {
      return res.status(400).json({ ok: false, error: 'Invalid label' });
    }
    await RevisionService.labelRevision(
      parseInt(req.params.revisionId),
      req.user.id,
      label.trim()
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
