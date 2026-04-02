// backend/renderers/cssBuilder.js
// Converts layout JSON settings objects into CSS strings.
// Called by RenderService to build the single <style> block for the page.
//
// This mirrors the logic in the frontend's styleFromSettings.js (Phase 9)
// so canvas preview == published HTML output.
'use strict';

// ─── ANIMATION KEYFRAMES ─────────────────────────────────────────────────────
// Self-contained — no external animation library dependency.
const KEYFRAMES = {
  fadeIn:       `@keyframes fadeIn{from{opacity:0}to{opacity:1}}`,
  fadeInUp:     `@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`,
  fadeInDown:   `@keyframes fadeInDown{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}`,
  fadeInLeft:   `@keyframes fadeInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}`,
  fadeInRight:  `@keyframes fadeInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`,
  zoomIn:       `@keyframes zoomIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}`,
  zoomInUp:     `@keyframes zoomInUp{from{opacity:0;transform:scale(0.7) translateY(40px)}to{opacity:1;transform:scale(1) translateY(0)}}`,
  slideInUp:    `@keyframes slideInUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`,
  slideInLeft:  `@keyframes slideInLeft{from{transform:translateX(-60px);opacity:0}to{transform:translateX(0);opacity:1}}`,
  slideInRight: `@keyframes slideInRight{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}`,
  bounceIn:     `@keyframes bounceIn{0%{opacity:0;transform:scale(0.3)}50%{opacity:1;transform:scale(1.08)}70%{transform:scale(0.95)}100%{transform:scale(1)}}`,
  flipInX:      `@keyframes flipInX{from{opacity:0;transform:perspective(400px) rotateX(90deg)}to{opacity:1;transform:perspective(400px) rotateX(0deg)}}`,
  flipInY:      `@keyframes flipInY{from{opacity:0;transform:perspective(400px) rotateY(90deg)}to{opacity:1;transform:perspective(400px) rotateY(0deg)}}`,
  rubberBand:   `@keyframes rubberBand{0%{transform:scale(1)}30%{transform:scaleX(1.25) scaleY(0.75)}40%{transform:scaleX(0.75) scaleY(1.25)}60%{transform:scaleX(1.15) scaleY(0.85)}80%{transform:scaleX(0.95) scaleY(1.05)}100%{transform:scale(1)}}`,
  pulse:        `@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`,
};

// ─── buildGlobalCSS ───────────────────────────────────────────────────────────
/**
 * Generates :root CSS variables from global_settings design tokens,
 * a base reset, and Google Fonts link tags.
 *
 * @param {object} gs  layout.global_settings
 * @returns {{ css: string, fontLinks: string[] }}
 */
function buildGlobalCSS(gs = {}) {
  const c = gs.colors     || {};
  const t = gs.typography || {};
  const s = gs.spacing    || {};
  const b = gs.borders    || {};

  // Flat fallbacks — global_settings may also store primary_color, bg_color etc. at top level
  const primary    = c.primary    || gs.primary_color   || '#7C3AED';
  const accent     = c.accent     || gs.accent_color    || '#06D6A0';
  const bg         = c.background || gs.bg_color        || '#0f172a';
  const surface    = c.surface    || '#1e293b';
  const textColor  = c.text       || '#f1f5f9';
  const textMuted  = c.text_muted || '#94a3b8';
  const border     = c.border     || '#334155';
  const success    = c.success    || '#22c55e';
  const warning    = c.warning    || '#f59e0b';
  const danger     = c.danger     || '#ef4444';
  const fontHead   = t.font_family_heading || gs.font_family || 'DM Sans';
  const fontBody   = t.font_family_body    || gs.font_family || 'DM Sans';
  const fontSz     = t.font_size_base   || '16px';
  const lineH      = t.line_height_base || '1.6';
  const containerW = s.container_max_width        || '1200px';
  const sectionPV  = s.section_padding_vertical   || '80px';
  const sectionPH  = s.section_padding_horizontal || '24px';
  const colGap     = s.column_gap                 || '24px';

  const rootCSS = `:root{
  --color-primary:${primary};
  --color-accent:${accent};
  --color-bg:${bg};
  --color-surface:${surface};
  --color-text:${textColor};
  --color-muted:${textMuted};
  --color-border:${border};
  --color-success:${success};
  --color-warning:${warning};
  --color-danger:${danger};
  --font-heading:'${fontHead}',sans-serif;
  --font-body:'${fontBody}',sans-serif;
  --font-size-base:${fontSz};
  --line-height-base:${lineH};
  --container-width:${containerW};
  --section-pad-v:${sectionPV};
  --section-pad-h:${sectionPH};
  --column-gap:${colGap};
  ${b.radius_sm   ? `--radius-sm:${b.radius_sm};` : ''}
  ${b.radius_md   ? `--radius-md:${b.radius_md};` : ''}
  ${b.radius_lg   ? `--radius-lg:${b.radius_lg};` : ''}
  ${b.radius_full ? `--radius-full:${b.radius_full};` : ''}
}`;

  const resetCSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:${fontSz};-webkit-text-size-adjust:100%}
body{font-family:var(--font-body);background:var(--color-bg);color:var(--color-text);line-height:var(--line-height-base);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer}
ul,ol{list-style:none}
.pb-section{position:relative}
.pb-cols{display:flex;flex-wrap:wrap}
.pb-col{display:flex;flex-direction:column;min-width:0}
.pb-widget{position:relative}`;

  // Google Fonts — only real font names, not CSS vars or system fonts
  const systemFonts = new Set(['inherit','system-ui','serif','sans-serif','monospace','cursive','fantasy']);
  const fontsToLoad = [fontHead, fontBody].filter(f => f && !systemFonts.has(f));
  const unique = [...new Set(fontsToLoad)];

  const fontLinks = unique.length ? [
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link href="https://fonts.googleapis.com/css2?${unique.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join('&')}&display=swap" rel="stylesheet">`,
  ] : [];

  return { css: rootCSS + resetCSS, fontLinks };
}

// ─── buildSectionCSS ──────────────────────────────────────────────────────────
/**
 * Returns a CSS rule string for a section element.
 * Selector: [data-section-id="<id>"]
 *
 * @param {string} id        section.id
 * @param {object} s         Resolved section settings (section.settings)
 * @returns {string}         CSS rule string
 */
function buildSectionCSS(id, s = {}) {
  const rules = {};

  // ── Spacing
  const pad = s.padding || {};
  if (pad.top || pad.right || pad.bottom || pad.left) {
    rules['padding'] = `${_px(pad.top)} ${_px(pad.right)} ${_px(pad.bottom)} ${_px(pad.left)}`;
  }
  const mar = s.margin || {};
  if (mar.top || mar.bottom) {
    rules['margin-top']    = _px(mar.top    || 0);
    rules['margin-bottom'] = _px(mar.bottom || 0);
  }

  // ── Dimensions
  if (s.full_height) rules['min-height'] = '100vh';
  else if (s.min_height) rules['min-height'] = _px(s.min_height);

  // ── Background
  const bg = s.background || {};
  _applyBackground(rules, bg);

  // ── Border (section-level)
  const brd = s.border || {};
  if (brd.radius) rules['border-radius'] = _px(brd.radius);
  const bt = brd.top    || {};
  const bb = brd.bottom || {};
  if (bt.width && bt.width !== '0px') rules['border-top']    = `${bt.width} ${bt.style || 'solid'} ${bt.color || 'transparent'}`;
  if (bb.width && bb.width !== '0px') rules['border-bottom'] = `${bb.width} ${bb.style || 'solid'} ${bb.color || 'transparent'}`;

  // ── Effects
  const eff = s.effects || {};
  if (eff.box_shadow)   rules['box-shadow']  = eff.box_shadow;
  if (eff.overflow && eff.overflow !== 'visible') rules['overflow'] = eff.overflow;
  if (eff.z_index != null) rules['z-index']  = eff.z_index;

  return _selectorBlock(`[data-section-id="${id}"]`, rules);
}

// ─── buildSectionRowCSS ───────────────────────────────────────────────────────
/**
 * CSS for the flex row that wraps columns inside a section.
 * Also emits the default tablet/mobile stacking behaviour for ALL columns
 * in this section (overridden per-column if explicit responsive widths exist).
 *
 * @param {string} sectionId
 * @param {object} s          Resolved section settings
 * @returns {string}
 */
function buildSectionRowCSS(sectionId, s = {}) {
  const gap   = s.columns_gap != null ? _px(s.columns_gap) : 'var(--column-gap,24px)';
  const align = _colsAlign(s.columns_position);

  let css = `[data-section-id="${sectionId}"] > .pb-cols{`;
  css += `display:flex;flex-wrap:wrap;gap:${gap};align-items:${align};`;
  if (s.content_width === 'boxed') {
    const mw = _px(s.content_max_width || 1200);
    css += `max-width:${mw};margin-left:auto;margin-right:auto;width:100%;`;
  }
  css += '}\n';

  // Default column stacking on tablet AND mobile
  // Individual columns may override this via their own responsive_settings.
  css += `@media(max-width:1023px){[data-section-id="${sectionId}"]>.pb-cols>.pb-col{flex:0 0 100%!important;max-width:100%!important}}\n`;

  return css;
}

// ─── buildColumnCSS ───────────────────────────────────────────────────────────
/**
 * Returns a CSS rule string for a column element.
 * Selector: [data-col-id="<id>"]
 *
 * @param {string} id   column.id
 * @param {object} s    Resolved column settings
 * @returns {string}
 */
function buildColumnCSS(id, s = {}) {
  const rules = {};

  // Width
  const w = (s.width != null) ? parseFloat(s.width) : 100;
  rules['flex']      = `0 0 ${w}%`;
  rules['max-width'] = `${w}%`;

  // Min-height
  if (s.min_height) rules['min-height'] = _px(s.min_height);

  // Alignment
  const va = s.vertical_align;
  const ha = s.horizontal_align;
  rules['justify-content'] = va === 'middle' ? 'center' : va === 'bottom' ? 'flex-end' : 'flex-start';
  rules['align-items']     = ha === 'center' ? 'center' : ha === 'right'  ? 'flex-end' : 'flex-start';

  // Padding
  const pad = s.padding || {};
  const pt  = pad.top    ?? s.padding_top    ?? 16;
  const pr  = pad.right  ?? s.padding_right  ?? 16;
  const pb  = pad.bottom ?? s.padding_bottom ?? 16;
  const pl  = pad.left   ?? s.padding_left   ?? 16;
  rules['padding'] = `${_px(pt)} ${_px(pr)} ${_px(pb)} ${_px(pl)}`;

  // Background
  const bg = s.background || {};
  _applyBackground(rules, bg);

  // Border
  const brd = s.border || {};
  const bTW = s.border_top_width    || 0;
  const bRW = s.border_right_width  || 0;
  const bBW = s.border_bottom_width || 0;
  const bLW = s.border_left_width   || 0;
  const bStyle = s.border_style || 'solid';
  const bColor = s.border_color || 'rgba(255,255,255,0.1)';
  if (bTW) rules['border-top']    = `${_px(bTW)} ${bStyle} ${bColor}`;
  if (bRW) rules['border-right']  = `${_px(bRW)} ${bStyle} ${bColor}`;
  if (bBW) rules['border-bottom'] = `${_px(bBW)} ${bStyle} ${bColor}`;
  if (bLW) rules['border-left']   = `${_px(bLW)} ${bStyle} ${bColor}`;

  // Border radius
  const tl  = s.border_radius_tl ?? brd.radius ?? 0;
  const tr  = s.border_radius_tr ?? brd.radius ?? 0;
  const brv = s.border_radius_br ?? brd.radius ?? 0;
  const bl  = s.border_radius_bl ?? brd.radius ?? 0;
  if (tl || tr || brv || bl) rules['border-radius'] = `${_px(tl)} ${_px(tr)} ${_px(brv)} ${_px(bl)}`;

  // Effects
  const eff = s.effects || {};
  if (eff.box_shadow || s.box_shadow)   rules['box-shadow']  = eff.box_shadow || s.box_shadow;
  if ((eff.opacity ?? s.opacity) != null && (eff.opacity ?? s.opacity) !== 1)
    rules['opacity'] = eff.opacity ?? s.opacity;
  if (eff.overflow && eff.overflow !== 'visible') rules['overflow'] = eff.overflow;
  if (s.overflow   && s.overflow   !== 'visible') rules['overflow'] = s.overflow;

  return _selectorBlock(`[data-col-id="${id}"]`, rules);
}

// ─── buildWidgetWrapperCSS ────────────────────────────────────────────────────
/**
 * Returns CSS for the widget wrapper element.
 * Includes: base rule, :hover rule, entrance animation rule.
 * Does NOT include typography/color — those are on the widget's inner elements.
 *
 * @param {string} id   widget.id
 * @param {object} s    Resolved desktop widget settings
 * @param {Set}    usedAnimations  Mutable set — animation names are added here
 * @returns {string}
 */
function buildWidgetWrapperCSS(id, s = {}, usedAnimations = new Set()) {
  const rules = {};
  const sel   = `[data-widget-id="${id}"]`;

  // ── Spacing
  const mt = s.margin_top    || 0;
  const mr = s.margin_right  || 0;
  const mb = s.margin_bottom || 0;
  const ml = s.margin_left   || 0;
  if (mt || mr || mb || ml) rules['margin'] = `${_px(mt)} ${_px(mr)} ${_px(mb)} ${_px(ml)}`;

  const pt = s.padding_top    || 0;
  const pr = s.padding_right  || 0;
  const pb = s.padding_bottom || 0;
  const pl = s.padding_left   || 0;
  if (pt || pr || pb || pl) rules['padding'] = `${_px(pt)} ${_px(pr)} ${_px(pb)} ${_px(pl)}`;

  if (s.width     && s.width     !== 'auto') rules['width']      = _unitVal(s.width);
  if (s.max_width && s.max_width !== 'none') rules['max-width']  = _unitVal(s.max_width);
  if (s.min_height)                          rules['min-height'] = _unitVal(s.min_height);

  // ── Border radius
  const tl  = s.border_radius_tl ?? s.border_radius ?? 0;
  const tr  = s.border_radius_tr ?? s.border_radius ?? 0;
  const brv = s.border_radius_br ?? s.border_radius ?? 0;
  const bl  = s.border_radius_bl ?? s.border_radius ?? 0;
  if (tl || tr || brv || bl) rules['border-radius'] = `${_px(tl)} ${_px(tr)} ${_px(brv)} ${_px(bl)}`;

  // ── Border sides
  const bTW = s.border_top_width    || 0;
  const bRW = s.border_right_width  || 0;
  const bBW = s.border_bottom_width || 0;
  const bLW = s.border_left_width   || 0;
  const bS  = s.border_style || 'solid';
  const bC  = s.border_color || 'rgba(255,255,255,0.2)';
  if (bTW) rules['border-top']    = `${_px(bTW)} ${bS} ${bC}`;
  if (bRW) rules['border-right']  = `${_px(bRW)} ${bS} ${bC}`;
  if (bBW) rules['border-bottom'] = `${_px(bBW)} ${bS} ${bC}`;
  if (bLW) rules['border-left']   = `${_px(bLW)} ${bS} ${bC}`;

  // ── Background (wrapper-level, from Phase 9 buildWrapperStyle)
  const bg = s.background;
  if (bg) _applyBackground(rules, bg);

  // ── Effects
  if (s.opacity != null && s.opacity !== 1)        rules['opacity']        = s.opacity;
  if (s.box_shadow && s.box_shadow !== 'none')      rules['box-shadow']     = s.box_shadow;
  if (s.css_filter && s.css_filter !== 'none')      rules['filter']         = s.css_filter;
  if (s.overflow   && s.overflow   !== 'visible')   rules['overflow']       = s.overflow;
  if (s.z_index    != null)                         rules['z-index']        = s.z_index;
  if (s.mix_blend_mode && s.mix_blend_mode !== 'normal') rules['mix-blend-mode'] = s.mix_blend_mode;
  if (s.cursor     && s.cursor     !== 'default')   rules['cursor']         = s.cursor;

  // ── Hover transition
  const hasHover = s.hover_transform || s.hover_opacity != null
    || s.hover_box_shadow || s.hover_bg_color || s.hover_color;
  if (hasHover) {
    const dur = s.hover_transition || '0.2s';
    rules['transition'] = `transform ${dur} ease,opacity ${dur} ease,box-shadow ${dur} ease,background-color ${dur} ease,color ${dur} ease`;
  }

  let css = Object.keys(rules).length ? `${sel}{${_rulesToStr(rules)}}\n` : '';

  // ── Hover rule
  const hoverRules = {};
  if (s.hover_transform)       hoverRules['transform']        = s.hover_transform;
  if (s.hover_opacity != null) hoverRules['opacity']          = s.hover_opacity;
  if (s.hover_box_shadow)      hoverRules['box-shadow']       = s.hover_box_shadow;
  if (s.hover_bg_color)        hoverRules['background-color'] = s.hover_bg_color;
  if (s.hover_color)           hoverRules['color']            = s.hover_color;
  if (Object.keys(hoverRules).length) css += `${sel}:hover{${_rulesToStr(hoverRules)}}\n`;

  // ── Entrance animation
  const anim = s.entrance_animation;
  if (anim && anim !== 'none' && KEYFRAMES[anim]) {
    const dur   = s.entrance_animation_duration ?? 600;
    const delay = s.entrance_animation_delay    ?? 0;
    const ease  = s.entrance_animation_easing   || 'ease-out';
    css += `${sel}{animation:${anim} ${_px(dur, 'ms')} ${ease} ${_px(delay, 'ms')} both}\n`;
    usedAnimations.add(anim);
  }

  return css;
}

// ─── buildResponsiveCSS ───────────────────────────────────────────────────────
/**
 * Generates @media blocks for tablet (max-width:1023px) and mobile (max-width:767px)
 * overrides for any element (section, column, or widget).
 *
 * Only emits blocks for devices that actually have overrides.
 *
 * @param {string} id        element.id
 * @param {string} idAttr    'data-section-id' | 'data-col-id' | 'data-widget-id'
 * @param {object} element   Full element object (has .settings and .responsive_settings)
 * @param {Set}    usedAnimations  Mutable set for collecting animation names
 * @returns {string}         CSS string (may be empty)
 */
function buildResponsiveCSS(id, idAttr, element, usedAnimations = new Set()) {
  const sel     = `[${idAttr}="${id}"]`;
  const baseS   = element.settings || {};
  let   css     = '';

  // Visibility media queries (always emitted if flags are set)
  if (baseS.hide_desktop) css += `@media(min-width:1024px){${sel}{display:none!important}}\n`;
  if (baseS.hide_tablet)  css += `@media(max-width:1023px){${sel}{display:none!important}}\n`;
  if (baseS.hide_mobile)  css += `@media(max-width:767px){${sel}{display:none!important}}\n`;

  const deviceMap = [
    { key: 'tablet', mq: '(max-width:1023px)' },
    { key: 'mobile', mq: '(max-width:767px)'  },
  ];

  for (const { key, mq } of deviceMap) {
    const ov = element.responsive_settings?.[key];
    if (!ov || !Object.keys(ov).length) continue;

    const rules = {};

    // ── Spacing overrides (flat padding_* used by widgets)
    const pp = [ov.padding_top, ov.padding_right, ov.padding_bottom, ov.padding_left];
    if (pp.some(v => v != null)) rules['padding'] = pp.map(v => _px(v ?? 0)).join(' ');
    const mp = [ov.margin_top, ov.margin_right, ov.margin_bottom, ov.margin_left];
    if (mp.some(v => v != null)) rules['margin']  = mp.map(v => _px(v ?? 0)).join(' ');

    // ── Object-style padding (sections / columns)
    if (ov.padding && typeof ov.padding === 'object') {
      const p = ov.padding;
      rules['padding'] = `${_px(p.top)} ${_px(p.right)} ${_px(p.bottom)} ${_px(p.left)}`;
    }
    if (ov.margin && typeof ov.margin === 'object') {
      const m = ov.margin;
      rules['margin'] = `${_px(m.top ?? 0)} ${_px(m.right ?? 0)} ${_px(m.bottom ?? 0)} ${_px(m.left ?? 0)}`;
    }

    // ── Typography overrides
    if (ov.font_size) {
      const unit = ov.font_size_unit || (String(ov.font_size).match(/[a-z%]+$/)?.[0] ?? 'px');
      const val  = parseFloat(ov.font_size);
      rules['font-size'] = `${val}${unit}`;
    }
    if (ov.font_weight)   rules['font-weight']   = ov.font_weight;
    if (ov.font_family)   rules['font-family']   = `'${ov.font_family}',sans-serif`;
    if (ov.text_align)    rules['text-align']     = ov.text_align;
    if (ov.line_height)   rules['line-height']    = ov.line_height;
    if (ov.letter_spacing != null) rules['letter-spacing'] = `${ov.letter_spacing}${typeof ov.letter_spacing === 'number' ? 'px' : ''}`;
    if (ov.color)         rules['color']          = ov.color;

    // ── Background override
    if (ov.background) _applyBackground(rules, ov.background);

    // ── Column width override
    if (ov.width != null) {
      const w = parseFloat(ov.width) || 100;
      rules['flex']      = `0 0 ${w}%!important`;
      rules['max-width'] = `${w}%!important`;
    }

    // ── Dimension overrides
    if (ov.min_height) rules['min-height'] = _px(ov.min_height);
    if (ov.full_height) rules['min-height'] = '100vh';

    // ── Effect overrides
    if (ov.opacity != null)  rules['opacity']   = ov.opacity;
    if (ov.box_shadow)       rules['box-shadow']= ov.box_shadow;
    if (ov.css_filter)       rules['filter']    = ov.css_filter;
    if (ov.border_radius != null) rules['border-radius'] = _px(ov.border_radius);
    if (ov.border_radius_tl != null || ov.border_radius_tr != null ||
        ov.border_radius_br != null || ov.border_radius_bl != null) {
      rules['border-radius'] = `${_px(ov.border_radius_tl ?? 0)} ${_px(ov.border_radius_tr ?? 0)} ${_px(ov.border_radius_br ?? 0)} ${_px(ov.border_radius_bl ?? 0)}`;
    }

    // ── Entrance animation override
    const anim = ov.entrance_animation;
    if (anim && anim !== 'none' && KEYFRAMES[anim]) {
      const dur   = ov.entrance_animation_duration ?? 600;
      const delay = ov.entrance_animation_delay    ?? 0;
      const ease  = ov.entrance_animation_easing   || 'ease-out';
      rules['animation'] = `${anim} ${_px(dur, 'ms')} ${ease} ${_px(delay, 'ms')} both`;
      usedAnimations.add(anim);
    }

    if (Object.keys(rules).length) {
      css += `@media${mq}{${sel}{${_rulesToStr(rules)}}}\n`;
    }
  }

  return css;
}

// ─── buildKeyframesCSS ────────────────────────────────────────────────────────
/**
 * Returns concatenated @keyframes strings for only the animations actually
 * used on this page (avoids bloating the CSS with unused animations).
 *
 * @param {Set<string>} usedAnimations  Populated by buildWidgetWrapperCSS/buildResponsiveCSS
 * @returns {string}
 */
function buildKeyframesCSS(usedAnimations) {
  return Array.from(usedAnimations)
    .filter(n => KEYFRAMES[n])
    .map(n => KEYFRAMES[n])
    .join('\n');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _px(v, unit = 'px') {
  if (v == null || v === '') return `0${unit}`;
  const n = parseFloat(v);
  if (!isNaN(n) && String(v) === String(n)) return `${n}${unit}`;  // plain number
  return String(v);  // already has unit
}

function _unitVal(v) {
  if (typeof v === 'number') return `${v}px`;
  if (/^\d+(\.\d+)?$/.test(String(v))) return `${v}px`;
  return String(v);
}

function _rulesToStr(rules) {
  return Object.entries(rules).map(([k, v]) => `${k}:${v}`).join(';');
}

function _selectorBlock(sel, rules) {
  const body = _rulesToStr(rules);
  return body ? `${sel}{${body}}\n` : '';
}

function _colsAlign(pos) {
  if (pos === 'middle' || pos === 'center') return 'center';
  if (pos === 'bottom') return 'flex-end';
  if (pos === 'stretch') return 'stretch';
  return 'flex-start';
}

function _buildGradientCSS(bg) {
  const stops = (bg.gradient_stops || [
    { color: 'var(--color-primary)', position: 0 },
    { color: 'var(--color-accent)',  position: 100 },
  ])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(st => `${st.color} ${st.position || 0}%`)
    .join(',');

  switch (bg.gradient_type) {
    case 'radial': return `radial-gradient(ellipse at center,${stops})`;
    case 'conic':  return `conic-gradient(from ${bg.gradient_angle || 0}deg,${stops})`;
    default:       return `linear-gradient(${bg.gradient_angle ?? 135}deg,${stops})`;
  }
}

function _applyBackground(rules, bg) {
  if (!bg || !bg.type || bg.type === 'none') return;
  switch (bg.type) {
    case 'color':
      if (bg.color) rules['background-color'] = bg.color;
      break;
    case 'gradient':
      rules['background'] = _buildGradientCSS(bg);
      break;
    case 'image':
      if (bg.image_url) {
        rules['background-image']    = `url('${bg.image_url.replace(/'/g, '%27')}')`;
        rules['background-size']     = bg.image_size       || 'cover';
        rules['background-position'] = bg.image_position   || 'center';
        rules['background-repeat']   = bg.image_repeat     || 'no-repeat';
        if (bg.image_attachment) rules['background-attachment'] = bg.image_attachment;
      }
      break;
  }
}

module.exports = {
  buildGlobalCSS,
  buildSectionCSS,
  buildSectionRowCSS,
  buildColumnCSS,
  buildWidgetWrapperCSS,
  buildResponsiveCSS,
  buildKeyframesCSS,
};
