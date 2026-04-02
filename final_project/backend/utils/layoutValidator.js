// backend/utils/layoutValidator.js

'use strict';

// Validates a Phase 2 layout JSON object before saving to the database
function validateLayout(layout) {
  const errors = [];

  if (!layout || typeof layout !== 'object') {
    return { ok: false, errors: ['Layout must be a non-null object'] };
  }

  // Top-level required fields
  if (!layout.version)   errors.push('Missing: version');
  if (!layout.schema)    errors.push('Missing: schema');
  if (!layout.page_slug) errors.push('Missing: page_slug');
  if (!Array.isArray(layout.sections)) errors.push('sections must be an array');

  // Size limit: 5MB
  const jsonSize = Buffer.byteLength(JSON.stringify(layout), 'utf8');
  if (jsonSize > 5 * 1024 * 1024) {
    errors.push(`Layout JSON exceeds 5MB limit (${(jsonSize / 1024 / 1024).toFixed(2)}MB)`);
  }

  // Section count limit
  if (layout.sections?.length > 50) {
    errors.push(`Too many sections: ${layout.sections.length} (max 50)`);
  }

  if (errors.length) return { ok: false, errors };

  // Validate each section, column, widget
  for (const [si, section] of layout.sections.entries()) {
    if (!section.id)   errors.push(`Section[${si}]: missing id`);
    if (!section.type) errors.push(`Section[${si}]: missing type`);
    if (!Array.isArray(section.columns)) {
      errors.push(`Section[${si}]: columns must be an array`);
      continue;
    }
    if (section.columns.length > 6) {
      errors.push(`Section[${si}]: too many columns (max 6)`);
    }

    for (const [ci, column] of section.columns.entries()) {
      if (!column.id) errors.push(`Section[${si}].Column[${ci}]: missing id`);
      if (!Array.isArray(column.widgets)) {
        errors.push(`Section[${si}].Column[${ci}]: widgets must be an array`);
        continue;
      }
      if (column.widgets.length > 50) {
        errors.push(`Section[${si}].Column[${ci}]: too many widgets (max 50)`);
      }

      for (const [wi, widget] of column.widgets.entries()) {
        if (!widget.id)       errors.push(`...Column[${ci}].Widget[${wi}]: missing id`);
        if (!widget.type)     errors.push(`...Column[${ci}].Widget[${wi}]: missing type`);
        if (!widget.settings) errors.push(`...Column[${ci}].Widget[${wi}]: missing settings`);
      }
    }
  }

  return errors.length
    ? { ok: false, errors }
    : { ok: true, errors: [] };
}

module.exports = { validateLayout };
