// backend/utils/deepMerge.js
// Deep-merges responsive_settings overrides onto base settings.
// Mirror of frontend resolveSettings.js — identical algorithm.
'use strict';

/**
 * Deep-merge override into base. Arrays are replaced, not merged.
 * Both arguments must be plain objects.
 */
function deepMerge(base = {}, override = {}) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const bv = base[key];
    const ov = override[key];
    const bothObjects =
      ov !== null && typeof ov === 'object' && !Array.isArray(ov) &&
      bv !== null && typeof bv === 'object' && !Array.isArray(bv);
    result[key] = bothObjects ? deepMerge(bv, ov) : ov;
  }
  return result;
}

/**
 * Resolve an element's settings for a specific device.
 *
 * desktop → returns element.settings unchanged (no clone overhead, read-only use).
 * tablet/mobile → deep-merges element.responsive_settings[device] on top of base.
 *
 * @param {object} element  Section, column, or widget object from the layout JSON
 * @param {string} device   'desktop' | 'tablet' | 'mobile'
 * @returns {object}        Flat resolved settings object
 */
function resolveSettings(element, device = 'desktop') {
  const base = element.settings || {};
  if (device === 'desktop') return base;
  const overrides = element.responsive_settings?.[device];
  if (!overrides || !Object.keys(overrides).length) return base;
  return deepMerge(base, overrides);
}

module.exports = { deepMerge, resolveSettings };
