// backend/renderers/v1Adapter.js
// Converts the legacy flat blocks[] format (page-builder.js v1) to
// the hierarchical layout 2.0 format expected by RenderService.
// Called automatically when page_data.version !== '2.0'.
'use strict';

const BLOCK_TYPE_MAP = {
  'hero':         'html',
  'stats':        'html',
  'features':     'html',
  'cta':          'html',
  'contact':      'html',
  'heading':      'heading',
  'paragraph':    'text',
  'divider':      'divider',
  'spacer':       'spacer',
  'image':        'image',
  'video':        'video',
  'button':       'button',
  'html':         'html',
  'courses-list': 'courses_list',
  'pq-list':      'pq_list',
  'social':       'social_icons',
  'faq':          'accordion',
  'testimonials': 'testimonial',
};

function _mapBlockSettings(block) {
  switch (block.type) {
    case 'heading':
      return { text: block.text || 'Heading', html_tag: block.level || 'h2', text_align: block.align || 'center', font_size: 32, font_weight: '900', color: 'var(--color-text)', margin_bottom: 16 };
    case 'paragraph':
      return { content: `<p>${block.text || ''}</p>`, font_size: 16, line_height: 1.75, color: 'var(--color-muted)', text_align: block.align || 'left' };
    case 'spacer':
      return { height: block.height || 40 };
    case 'image':
      return { src: block.src || '', alt: block.alt || '', width: '100%', border_radius: 12, lazy_load: true };
    case 'video':
      return { source_type: 'youtube', youtube_url: block.url || '', aspect_ratio: '16:9', border_radius: 12 };
    case 'button':
      return { text: block.text || 'Button', link_url: block.url || '#', button_style: block.style === 'outline' ? 'outline' : 'filled', alignment: block.align || 'center', padding_top: 12, padding_right: 28, padding_bottom: 12, padding_left: 28, border_radius: 10 };
    case 'social':
      return { items: ['facebook','twitter','instagram','youtube','whatsapp'].filter(n => block[n]).map(n => ({ id: `si_${n}`, network: n, url: block[n], label: n })), icon_style: 'rounded', alignment: 'left' };
    case 'faq':
      return { items: (block.items || []).map((item, i) => ({ id: `acc_${i}`, title: item.q, content: `<p>${item.a}</p>`, default_open: i === 0 })), allow_multiple_open: false };
    case 'testimonials':
      return { items: (block.items || []).map((item, i) => ({ id: `tst_${i}`, quote: item.text, name: item.name, role: item.role, rating: 5 })), layout: 'grid', show_rating: true };
    case 'courses-list':
      return { display_mode: 'grid', columns: 4, limit: block.limit || 8, show_price: true, card_style: 'default', border_radius: 12 };
    case 'pq-list':
      return { display_mode: 'grid', columns: 3, limit: block.limit || 6, card_style: 'default' };
    default:
      return { code: `<!-- Migrated ${block.type} block: ${block.id || ''} -->`, sanitize: false };
  }
}

/**
 * Convert a v1 blocks[] page_data object to layout 2.0.
 *
 * @param {object|array} v1Data   The raw page_data value (may be array or object with .blocks)
 * @param {object}       site     admin_sites row for fallback design tokens
 * @returns {object}              Layout 2.0 object ready for RenderService
 */
function migrate(v1Data, site = {}) {
  const blocks = Array.isArray(v1Data) ? v1Data : (v1Data.blocks || []);

  const sections = blocks.map((block, index) => ({
    id:   `section_v1_${index}`,
    type: 'section',
    settings: {
      padding:       { top: 0, right: 24, bottom: 0, left: 24 },
      background:    { type: 'none' },
      content_width: 'boxed',
      content_max_width: 1200,
    },
    responsive_settings: {},
    columns: [{
      id:   `col_v1_${index}`,
      type: 'column',
      settings: { width: 100, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      responsive_settings: {},
      widgets: [{
        id:       `widget_v1_${index}`,
        type:     BLOCK_TYPE_MAP[block.type] || 'html',
        settings: _mapBlockSettings(block),
        responsive_settings: {},
      }],
    }],
  }));

  const gs = {
    school_name:   v1Data.school_name   || site.school_name   || '',
    primary_color: v1Data.primary_color || site.primary_color || '#7C3AED',
    accent_color:  v1Data.accent_color  || site.accent_color  || '#06D6A0',
    bg_color:      v1Data.bg_color      || site.bg_color      || '#0f172a',
    font_family:   v1Data.font_family   || site.font_family   || 'DM Sans',
    hero_title:    v1Data.hero_title    || site.hero_title    || '',
    hero_subtitle: v1Data.hero_subtitle || site.hero_subtitle || '',
    colors: {
      primary:    v1Data.primary_color || site.primary_color || '#7C3AED',
      accent:     v1Data.accent_color  || site.accent_color  || '#06D6A0',
      background: v1Data.bg_color      || site.bg_color      || '#0f172a',
      surface:    '#1e293b',
      text:       '#f1f5f9',
      text_muted: '#94a3b8',
      border:     '#334155',
    },
    typography: {
      font_family_heading: v1Data.font_family || site.font_family || 'Syne',
      font_family_body:    v1Data.font_family || site.font_family || 'DM Sans',
    },
  };

  return {
    version:          '2.0',
    schema:           'page',
    page_slug:        v1Data.page_slug  || 'home',
    page_name:        v1Data.page_name  || 'Home',
    page_title:       v1Data.page_title || v1Data.school_name || '',
    meta_description: v1Data.meta_description || '',
    global_settings:  gs,
    sections,
  };
}

/**
 * Detect whether a page_data object is legacy v1 format.
 */
function isV1(pageData) {
  if (!pageData) return false;
  if (pageData.version === '2.0') return false;
  if (Array.isArray(pageData)) return true;
  if (Array.isArray(pageData.blocks)) return true;
  return false;
}

module.exports = { migrate, isV1 };
