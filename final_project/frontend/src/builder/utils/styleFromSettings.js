// builder/utils/styleFromSettings.js

import { buildGradientCSS } from '../controls/GradientControl';

// ─────────────────────────────────────────────────────────────────────────────
// buildWrapperStyle(settings)
//
// Returns a React inline-style object for the WidgetWrapper <div>.
// Covers: spacing, border, effects, opacity, cursor, overflow.
// Typography and color are NOT applied to the wrapper — those go on the
// widget's own root element (handled inside each widget component).
// ─────────────────────────────────────────────────────────────────────────────
export function buildWrapperStyle(s = {}) {
  const style = {};

  // ── Spacing ──────────────────────────────────────────────────────
  if (s.margin_top    || s.margin_right  || s.margin_bottom || s.margin_left) {
    style.margin = `${s.margin_top ?? 0}px ${s.margin_right ?? 0}px ${s.margin_bottom ?? 0}px ${s.margin_left ?? 0}px`;
  }
  if (s.padding_top   || s.padding_right || s.padding_bottom || s.padding_left) {
    style.padding = `${s.padding_top ?? 0}px ${s.padding_right ?? 0}px ${s.padding_bottom ?? 0}px ${s.padding_left ?? 0}px`;
  }
  if (s.width     && s.width     !== 'auto') style.width     = _unitVal(s.width);
  if (s.max_width && s.max_width !== 'none') style.maxWidth  = _unitVal(s.max_width);
  if (s.min_height)                          style.minHeight = _unitVal(s.min_height);

  // ── Border radius ─────────────────────────────────────────────────
  const tl = s.border_radius_tl ?? s.border_radius ?? 0;
  const tr = s.border_radius_tr ?? s.border_radius ?? 0;
  const br = s.border_radius_br ?? s.border_radius ?? 0;
  const bl = s.border_radius_bl ?? s.border_radius ?? 0;
  if (tl || tr || br || bl) {
    style.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
  }

  // ── Border widths ─────────────────────────────────────────────────
  const bTop    = s.border_top_width    || 0;
  const bRight  = s.border_right_width  || 0;
  const bBottom = s.border_bottom_width || 0;
  const bLeft   = s.border_left_width   || 0;
  if (bTop || bRight || bBottom || bLeft) {
    const bs    = s.border_style || 'solid';
    const bCol  = s.border_color || 'rgba(255,255,255,0.2)';
    style.borderTop    = bTop    ? `${bTop}px ${bs} ${bCol}`    : 'none';
    style.borderRight  = bRight  ? `${bRight}px ${bs} ${bCol}`  : 'none';
    style.borderBottom = bBottom ? `${bBottom}px ${bs} ${bCol}` : 'none';
    style.borderLeft   = bLeft   ? `${bLeft}px ${bs} ${bCol}`   : 'none';
  }

  // ── Background ────────────────────────────────────────────────────
  const bg = s.background;
  if (bg) {
    switch (bg.type) {
      case 'color':
        style.backgroundColor = bg.color || 'transparent';
        break;
      case 'gradient':
        style.background = buildGradientCSS(bg);
        break;
      case 'image':
        style.backgroundImage    = bg.image_url    ? `url('${bg.image_url}')` : 'none';
        style.backgroundSize     = bg.image_size   || 'cover';
        style.backgroundPosition = bg.image_position || 'center';
        style.backgroundRepeat   = bg.image_repeat || 'no-repeat';
        break;
      case 'none':
      default:
        break;
    }
  }

  // ── Effects ───────────────────────────────────────────────────────
  if (s.opacity != null && s.opacity !== 1) style.opacity  = s.opacity;
  if (s.box_shadow && s.box_shadow !== 'none') style.boxShadow = s.box_shadow;
  if (s.css_filter && s.css_filter !== 'none') style.filter    = s.css_filter;
  if (s.overflow   && s.overflow !== 'visible') style.overflow  = s.overflow;
  if (s.z_index    != null)                    style.zIndex     = s.z_index;
  if (s.mix_blend_mode && s.mix_blend_mode !== 'normal') style.mixBlendMode = s.mix_blend_mode;
  if (s.cursor     && s.cursor !== 'default') style.cursor     = s.cursor;

  // Transition — used for hover effects and general smoothing
  const hasHover = s.hover_transform || s.hover_opacity != null || s.hover_box_shadow || s.hover_bg_color || s.hover_color;
  if (hasHover) {
    const dur = s.hover_transition || '0.2s';
    style.transition = `transform ${dur} ease, opacity ${dur} ease, box-shadow ${dur} ease, background-color ${dur} ease, color ${dur} ease, filter ${dur} ease`;
  }

  return style;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildHoverCSS(widgetId, settings)
//
// Returns a CSS string with a scoped :hover rule for this specific widget.
// Injected as a <style> element inside WidgetWrapper.
// Empty string if no hover overrides are set.
// ─────────────────────────────────────────────────────────────────────────────
export function buildHoverCSS(widgetId, s = {}) {
  const rules = [];

  if (s.hover_transform)  rules.push(`transform: ${s.hover_transform};`);
  if (s.hover_opacity != null) rules.push(`opacity: ${s.hover_opacity};`);
  if (s.hover_box_shadow) rules.push(`box-shadow: ${s.hover_box_shadow};`);
  if (s.hover_bg_color)   rules.push(`background-color: ${s.hover_bg_color};`);
  if (s.hover_color)      rules.push(`color: ${s.hover_color};`);

  if (!rules.length) return '';

  // Scope to this widget's wrapper ID to avoid bleed
  return `[data-widget-id="${widgetId}"]:hover { ${rules.join(' ')} }`;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildAnimationCSS(animationName)
//
// Returns @keyframes CSS for the named entrance animation.
// Inlined rather than relying on an external animation library so the builder
// and SSR output are fully self-contained.
// ─────────────────────────────────────────────────────────────────────────────
export function buildAnimationCSS(name) {
  return KEYFRAMES[name] || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// buildFullCSS(widgetId, settings)
//
// Convenience: returns the complete CSS string for a widget element.
// Used by Phase 11 RenderService to generate <style> blocks in static HTML.
// ─────────────────────────────────────────────────────────────────────────────
export function buildFullCSS(widgetId, s = {}) {
  const wrapperStyle = buildWrapperStyle(s);
  const inlineRules  = Object.entries(wrapperStyle)
    .map(([k, v]) => `${_camelToKebab(k)}: ${v};`)
    .join(' ');

  const baseRule  = `[data-widget-id="${widgetId}"] { ${inlineRules} }`;
  const hoverRule = buildHoverCSS(widgetId, s);
  const animCSS   = s.entrance_animation && s.entrance_animation !== 'none'
    ? buildAnimationCSS(s.entrance_animation) : '';

  return [baseRule, hoverRule, animCSS].filter(Boolean).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Ensure a dimension value has a px unit if it's a plain number */
function _unitVal(v) {
  if (typeof v === 'number') return `${v}px`;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** camelCase → kebab-case for CSS property names */
function _camelToKebab(str) {
  return str.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// @keyframes definitions — self-contained, no external dependency
// ─────────────────────────────────────────────────────────────────────────────

const KEYFRAMES = {

  fadeIn: `@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}`,

  fadeInUp: `@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}`,

  fadeInDown: `@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to   { opacity: 1; transform: translateY(0); }
}`,

  fadeInLeft: `@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}`,

  fadeInRight: `@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}`,

  zoomIn: `@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}`,

  zoomInUp: `@keyframes zoomInUp {
  from { opacity: 0; transform: scale(0.7) translateY(40px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}`,

  slideInUp: `@keyframes slideInUp {
  from { transform: translateY(60px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}`,

  slideInLeft: `@keyframes slideInLeft {
  from { transform: translateX(-60px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}`,

  slideInRight: `@keyframes slideInRight {
  from { transform: translateX(60px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}`,

  bounceIn: `@keyframes bounceIn {
  0%   { opacity: 0; transform: scale(0.3); }
  50%  { opacity: 1; transform: scale(1.08); }
  70%  { transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}`,

  flipInX: `@keyframes flipInX {
  from { opacity: 0; transform: perspective(400px) rotateX(90deg); }
  to   { opacity: 1; transform: perspective(400px) rotateX(0deg); }
}`,

  flipInY: `@keyframes flipInY {
  from { opacity: 0; transform: perspective(400px) rotateY(90deg); }
  to   { opacity: 1; transform: perspective(400px) rotateY(0deg); }
}`,

  rubberBand: `@keyframes rubberBand {
  0%   { transform: scale(1); }
  30%  { transform: scaleX(1.25) scaleY(0.75); }
  40%  { transform: scaleX(0.75) scaleY(1.25); }
  60%  { transform: scaleX(1.15) scaleY(0.85); }
  80%  { transform: scaleX(0.95) scaleY(1.05); }
  100% { transform: scale(1); }
}`,

  pulse: `@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}`,
};
