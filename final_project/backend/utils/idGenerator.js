// backend/utils/idGenerator.js

'use strict';

const crypto = require('crypto');

// Generate a unique element ID: "section_k7m2p9xq"
function generateId(type) {
  const prefixes = { section: 'section', column: 'column', widget: 'widget' };
  const prefix   = prefixes[type];
  if (!prefix) throw new Error(`Unknown element type: ${type}`);

  // 8 chars of crypto-random hex — collision probability astronomically low
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${suffix}`;
}

// Regenerate ALL IDs in a layout (sections, columns, widgets)
// Used when copying a template to a user's account so their copy
// is fully independent — IDs never collide with the master template
function regenerateAllIds(layout) {
  if (!layout || typeof layout !== 'object') return layout;

  // Deep clone first (never mutate the original)
  const cloned = JSON.parse(JSON.stringify(layout));

  if (!Array.isArray(cloned.sections)) return cloned;

  for (const section of cloned.sections) {
    section.id = generateId('section');

    if (!Array.isArray(section.columns)) continue;
    for (const column of section.columns) {
      column.id = generateId('column');

      if (!Array.isArray(column.widgets)) continue;
      for (const widget of column.widgets) {
        widget.id = generateId('widget');

        // Handle nested widgets (e.g. tabs contain widget arrays)
        if (widget.type === 'tabs' && Array.isArray(widget.settings?.tabs)) {
          for (const tab of widget.settings.tabs) {
            if (Array.isArray(tab.widgets)) {
              for (const w of tab.widgets) w.id = generateId('widget');
            }
          }
        }
      }
    }
  }

  return cloned;
}

module.exports = { generateId, regenerateAllIds };
