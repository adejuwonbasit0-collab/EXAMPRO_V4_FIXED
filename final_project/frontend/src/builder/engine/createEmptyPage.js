// builder/engine/createEmptyPage.js
// Creates a blank layout 2.0 page object with one empty section.
// Accepts: createEmptyPage(overrides={}) OR createEmptyPage(pageSlug, site)

import { nanoid } from 'nanoid';

export function createEmptyPage(slugOrOverrides = {}, site = {}) {
  const overrides = typeof slugOrOverrides === 'string'
    ? {
        page_slug: slugOrOverrides,
        global_settings: {
          colors: {
            primary:    site?.primary_color || '#7C3AED',
            accent:     site?.accent_color  || '#06D6A0',
            background: site?.bg_color      || '#0f172a',
          }
        }
      }
    : slugOrOverrides;

  const sectionId = `section_${nanoid(8)}`;
  const colId     = `col_${nanoid(8)}`;

  return {
    version:          '2.0',
    schema:           'page',
    page_slug:        overrides.page_slug  || 'home',
    page_name:        overrides.page_name  || 'Home',
    page_title:       overrides.page_title || '',
    meta_description: '',
    global_settings: {
      colors: {
        primary:    '#7C3AED',
        accent:     '#06D6A0',
        background: '#0f172a',
        surface:    '#1e293b',
        text:       '#f1f5f9',
        text_muted: '#94a3b8',
        border:     '#334155',
        success:    '#22c55e',
        warning:    '#f59e0b',
        danger:     '#ef4444',
      },
      typography: {
        font_family_heading: 'DM Sans',
        font_family_body:    'DM Sans',
        font_size_base:      '16px',
        line_height_base:    '1.6',
      },
      spacing: {
        container_max_width:        '1200px',
        section_padding_vertical:   '80px',
        section_padding_horizontal: '24px',
        column_gap:                 '24px',
      },
      borders: {
        radius_sm:   '6px',
        radius_md:   '12px',
        radius_lg:   '20px',
        radius_full: '9999px',
      },
      ...overrides.global_settings,
    },
    sections: [
      {
        id:   sectionId,
        type: 'section',
        settings: {
          padding:           { top: 80, right: 24, bottom: 80, left: 24 },
          margin:            { top: 0, bottom: 0 },
          background:        { type: 'none' },
          content_width:     'boxed',
          content_max_width: 1200,
          columns_gap:       24,
          columns_position:  'top',
          html_tag:          'section',
        },
        responsive_settings: {},
        columns: [
          {
            id:   colId,
            type: 'column',
            settings: {
              width:   100,
              padding: { top: 16, right: 16, bottom: 16, left: 16 },
            },
            responsive_settings: {},
            widgets: [],
          },
        ],
      },
    ],
  };
}

export default createEmptyPage;
