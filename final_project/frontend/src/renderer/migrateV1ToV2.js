// frontend/src/renderer/migrateV1ToV2.js

/**
 * Converts the existing flat blocks[] format to the new
 * hierarchical sections → columns → widgets format.
 * Runs automatically on load when version !== "2.0"
 */
function migrateV1ToV2(v1Data, site = {}) {
  const blocks = Array.isArray(v1Data) ? v1Data : (v1Data.blocks || []);

  const sections = blocks.map((block, index) => {
    const sectionId  = `section_migrated_${index}`;
    const columnId   = `column_migrated_${index}`;
    const widgetId   = `widget_migrated_${index}`;

    // Map old block type to new widget type
    const widgetType = BLOCK_TYPE_MAP[block.type] || block.type;

    // Build widget settings from old block fields
    const widgetSettings = mapBlockToWidgetSettings(block);

    return {
      id:   sectionId,
      type: 'section',
      label: block.type,
      settings: {
        layout:     { content_width: 'boxed', content_max_width: '1200px', html_tag: 'section' },
        background: { type: 'none', color: 'transparent' },
        spacing:    { padding: { top: '0px', right: '24px', bottom: '0px', left: '24px' }, margin: { top: '0px', bottom: '0px' } },
        border:     {},
        visibility: { hide_desktop: false, hide_tablet: false, hide_mobile: false }
      },
      responsive_settings: {},
      columns: [
        {
          id:   columnId,
          type: 'column',
          settings: { layout: { width: '100%', vertical_align: 'top' }, spacing: { padding: { top: '0px', right: '0px', bottom: '0px', left: '0px' } } },
          responsive_settings: {},
          widgets: [
            {
              id:       widgetId,
              type:     widgetType,
              settings: widgetSettings,
              responsive_settings: {}
            }
          ]
        }
      ]
    };
  });

  return {
    version: '2.0',
    schema:  'page',
    page_slug: v1Data.page_slug || 'home',
    page_name: v1Data.page_name || 'Home',
    global_settings: {
      school_name:   v1Data.school_name   || site.school_name   || '',
      hero_title:    v1Data.hero_title    || site.hero_title    || '',
      hero_subtitle: v1Data.hero_subtitle || site.hero_subtitle || '',
      primary_color: v1Data.primary_color || site.primary_color || '#7C3AED',
      accent_color:  v1Data.accent_color  || site.accent_color  || '#06D6A0',
      bg_color:      v1Data.bg_color      || site.bg_color      || '#0f172a',
      font_family:   v1Data.font_family   || site.font_family   || 'DM Sans',
      colors: {
        primary:    v1Data.primary_color || site.primary_color || '#7C3AED',
        accent:     v1Data.accent_color  || site.accent_color  || '#06D6A0',
        background: v1Data.bg_color      || site.bg_color      || '#0f172a',
        surface:    '#1e293b',
        text:       '#f1f5f9',
        text_muted: '#94a3b8',
        border:     '#334155'
      },
      typography: {
        font_family_heading: v1Data.font_family || site.font_family || 'Syne',
        font_family_body:    v1Data.font_family || site.font_family || 'DM Sans'
      }
    },
    sections
  };
}

// Old block type → new widget type mapping
const BLOCK_TYPE_MAP = {
  'hero':          'html',          // Hero blocks migrate as HTML widgets (complex)
  'stats':         'html',          // Stats migrate as HTML (dynamic data)
  'features':      'html',          // Features migrate as HTML
  'cta':           'html',          // CTA migrates as HTML, then user can rebuild
  'heading':       'heading',       // Direct map
  'paragraph':     'text',          // Direct map
  'divider':       'divider',       // Direct map
  'spacer':        'spacer',        // Direct map
  'image':         'image',         // Direct map
  'video':         'video',         // Direct map
  'button':        'button',        // Direct map
  'html':          'html',          // Direct map
  'courses-list':  'courses_list',  // Direct map
  'pq-list':       'pq_list',       // Direct map
  'contact':       'html',          // Migrates as HTML
  'social':        'social_icons',  // Direct map
  'faq':           'accordion',     // Maps to accordion widget
  'testimonials':  'testimonial',   // Direct map
};

// Map old block fields to new widget settings
function mapBlockToWidgetSettings(block) {
  switch (block.type) {
    case 'heading':
      return { text: block.text || 'Heading', html_tag: block.level || 'h2', text_align: block.align || 'center', font_size: '32px', font_weight: '900', color: 'var(--color-text)', margin_bottom: '16px' };
    case 'paragraph':
      return { content: `<p>${block.text || ''}</p>`, font_size: '16px', line_height: '1.75', color: 'var(--color-muted)', text_align: block.align || 'left' };
    case 'spacer':
      return { height: `${block.height || 40}px` };
    case 'image':
      return { src: block.src || '', alt: block.alt || '', width: block.width || '100%', border_radius: '12px' };
    case 'video':
      return { source_type: 'youtube', youtube_url: block.url || '', aspect_ratio: '16:9', border_radius: '12px' };
    case 'button':
      return { text: block.text || 'Button', link_url: block.url || '#', button_style: block.style === 'outline' ? 'outline' : 'filled', alignment: block.align || 'center', padding_top: '12px', padding_right: '28px', padding_bottom: '12px', padding_left: '28px', border_radius: '10px' };
    case 'social':
      return { items: ['facebook','twitter','instagram','youtube','whatsapp'].filter(n => block[n]).map(n => ({ id: `si_${n}`, network: n, url: block[n], label: n })), icon_style: 'rounded', alignment: 'left' };
    case 'faq':
      return { items: (block.items || []).map((item, i) => ({ id: `acc_${i}`, title: item.q, content: `<p>${item.a}</p>`, default_open: i === 0 })), allow_multiple_open: false };
    case 'testimonials':
      return { items: (block.items || []).map((item, i) => ({ id: `tst_${i}`, text: item.text, name: item.name, role: item.role, rating: 5 })), layout: 'grid', show_rating: true };
    case 'courses-list':
      return { display_mode: 'grid', columns: 4, limit: block.limit || 8, show_price: true, show_rating: true, card_style: 'default', border_radius: '12px' };
    case 'pq-list':
      return { display_mode: 'grid', columns: 3, limit: block.limit || 6, card_style: 'default' };
    default:
      // Complex blocks (hero, stats, features, cta) → render as HTML using old _pbRenderBlock logic
      return { code: `<!-- Migrated ${block.type} block — click to edit --> <div data-block-type="${block.type}" data-block-id="${block.id}"></div>`, sanitize: false };
  }
}
