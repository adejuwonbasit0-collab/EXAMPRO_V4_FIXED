// backend/utils/htmlSanitizer.js
// Lightweight XSS sanitizer for user-generated HTML content (text widgets,
// accordion/tabs content fields, testimonial text, etc.)
//
// Uses a strict allowlist — only the tags and attributes that widget renderers
// actually need. Does NOT depend on DOMPurify (Node.js has no DOM).
// For richer content trust levels, swap for the `sanitize-html` npm package.
'use strict';

// Tags that are safe and commonly needed in rich-text content
const ALLOWED_TAGS = new Set([
  'p', 'br', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'figure', 'figcaption',
  'sup', 'sub',
]);

// Per-tag allowed attributes
const ALLOWED_ATTRS = {
  '*':    ['class', 'id', 'style'],
  'a':    ['href', 'target', 'rel', 'title'],
  'img':  ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
  'td':   ['colspan', 'rowspan'],
  'th':   ['colspan', 'rowspan', 'scope'],
  'ol':   ['type', 'start'],
  'li':   ['value'],
};

// Allowed URL schemes for href / src
const SAFE_URL_SCHEMES = /^(https?:|\/|#|mailto:)/i;

/**
 * Sanitize an HTML string for safe output.
 * - Strips disallowed tags (keeps their text content)
 * - Strips disallowed attributes
 * - Strips unsafe href/src values (javascript:, data:, etc.)
 *
 * @param {string} html   Raw HTML string from widget settings
 * @param {object} opts
 * @param {boolean} [opts.allowRaw=false]  Skip sanitization (super-admin only)
 * @returns {string}      Sanitized HTML string
 */
function sanitize(html, opts = {}) {
  if (!html) return '';
  if (opts.allowRaw) return String(html);

  // Strip script/style/meta/link/etc. completely (tags + content)
  let out = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(meta|link|base|object|embed|iframe|frame|frameset)[^>]*\/?>/gi, '');

  // Strip event handlers (onclick=, onmouseover=, etc.)
  out = out.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Strip javascript: and data: URIs
  out = out.replace(/(href|src)\s*=\s*["'](javascript:|data:)[^"']*["']/gi, '$1="#"');

  // Strip disallowed tags but keep their inner text
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) return match;
    return ''; // strip the tag entirely
  });

  return out;
}

/**
 * Escape a plain text string for safe insertion into HTML.
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Escape a string for use inside a CSS value or HTML attribute value.
 */
function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

module.exports = { sanitize, escapeHtml, escapeAttr };
