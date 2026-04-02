// backend/services/RevisionService.js
// Revision history for the page builder.
// Works with your LMS's admin_pages + page_revisions tables.

'use strict';

const crypto = require('crypto');
const db     = require('../config/database');

const MAX_REVISIONS = 50;

class RevisionService {

  // Called from pagebuilder.js after every save
  // Params: { adminId, pageSlug, layoutJson (string), saveType, sectionsCount }
  async createRevision({ adminId, pageSlug, layoutJson, saveType = 'manual_save', sectionsCount = 0 }) {
    try {
      // Get the admin_pages row id for this admin+slug
      const [pages] = await db.query(
        `SELECT id FROM admin_pages WHERE admin_id = ? AND page_slug = ? LIMIT 1`,
        [adminId, pageSlug]
      );
      if (!pages[0]) return; // page not saved yet — skip

      const pageId   = pages[0].id;
      const jsonStr  = typeof layoutJson === 'string' ? layoutJson : JSON.stringify(layoutJson);
      const checksum = crypto.createHash('sha256').update(jsonStr).digest('hex');

      // Skip if identical to last revision (debounce duplicate saves)
      const [lastRows] = await db.query(
        `SELECT checksum FROM page_revisions WHERE page_id = ? ORDER BY created_at DESC LIMIT 1`,
        [pageId]
      );
      if (lastRows[0]?.checksum === checksum) return;

      // Count widgets from JSON
      let widgetsCount = 0;
      try {
        const parsed = JSON.parse(jsonStr);
        for (const sec of parsed?.sections || []) {
          for (const col of sec.columns || []) {
            widgetsCount += (col.widgets || []).length;
          }
        }
      } catch (_) {}

      // Insert revision
      await db.query(
        `INSERT INTO page_revisions
           (page_id, admin_id, page_slug, layout_json, checksum,
            save_type, sections_count, widgets_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [pageId, adminId, pageSlug, jsonStr, checksum,
         saveType, sectionsCount, widgetsCount]
      );

      // Prune old revisions — keep last 50
      await db.query(
        `DELETE FROM page_revisions
         WHERE page_id = ?
           AND save_type != 'publish'
           AND id NOT IN (
             SELECT id FROM (
               SELECT id FROM page_revisions
               WHERE page_id = ?
               ORDER BY created_at DESC LIMIT ?
             ) t
           )`,
        [pageId, pageId, MAX_REVISIONS]
      );
    } catch (err) {
      // Non-fatal — never break the save response
      console.warn('[RevisionService] createRevision failed:', err.message);
    }
  }

  // List revisions for a page (by adminId + pageSlug)
  async listRevisions(adminId, pageSlug, limit = 30) {
    const [pages] = await db.query(
      `SELECT id FROM admin_pages WHERE admin_id = ? AND page_slug = ? LIMIT 1`,
      [adminId, pageSlug]
    );
    if (!pages[0]) return [];

    const [rows] = await db.query(
      `SELECT id, save_type, label, sections_count, widgets_count, checksum, created_at
       FROM page_revisions
       WHERE page_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [pages[0].id, limit]
    );
    return rows;
  }

  // Get single revision's full layout_json
  async getRevision(revisionId, adminId) {
    const [rows] = await db.query(
      `SELECT r.* FROM page_revisions r
       WHERE r.id = ? AND r.admin_id = ?`,
      [revisionId, adminId]
    );
    if (!rows[0]) throw new Error('Revision not found');
    return rows[0];
  }

  // Restore a revision — writes its layout_json back to admin_pages
  async restoreRevision(revisionId, adminId) {
    const rev = await this.getRevision(revisionId, adminId);

    await db.query(
      `UPDATE admin_pages
       SET page_data = ?, updated_at = NOW()
       WHERE admin_id = ? AND page_slug = ?`,
      [rev.layout_json, adminId, rev.page_slug]
    );

    // Create a new revision marking this as a restore
    await this.createRevision({
      adminId,
      pageSlug:      rev.page_slug,
      layoutJson:    rev.layout_json,
      saveType:      'restore',
      sectionsCount: rev.sections_count,
    });

    return { ok: true, layout: JSON.parse(rev.layout_json) };
  }

  // Label a revision (e.g. "Before redesign")
  async labelRevision(revisionId, adminId, label) {
    await db.query(
      `UPDATE page_revisions SET label = ? WHERE id = ? AND admin_id = ?`,
      [label, revisionId, adminId]
    );
  }
}

module.exports = new RevisionService();
