// builder/widgets/resolveSettings.js
// Resolves a widget's effective settings for the current device mode.
// Merges responsive_settings[device] on top of base settings.

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
 * Returns effective settings for an element at a given device mode.
 * @param {object} element  - Widget, section, or column object
 * @param {string} device   - 'desktop' | 'tablet' | 'mobile'
 * @returns {object}        - Merged settings object
 */
export function resolveSettings(element, device = 'desktop') {
  const base = element.settings || {};
  if (device === 'desktop') return base;
  const overrides = element.responsive_settings?.[device];
  if (!overrides || !Object.keys(overrides).length) return base;
  return deepMerge(base, overrides);
}

export default resolveSettings;
