// backend/renderers/widgetRenderers.js
// Pure HTML string renderer for each of the 19 widget types.
//
// Every renderer:
//   receives  (settings, site, sanitize)
//   returns   an HTML string — no wrapping div, no data-widget-id
//             (the wrapper is added by RenderService)
//
// settings = already resolved (desktop merged with responsive if needed)
// site     = admin_sites row (has school_name, primary_color, etc.)
// sanitize = htmlSanitizer.sanitize bound function
'use strict';

const { escapeHtml, escapeAttr } = require('../utils/htmlSanitizer');

// ─── Shared helpers ───────────────────────────────────────────────────────────

function _esc(v)   { return escapeHtml(v); }
function _attr(v)  { return escapeAttr(v); }
function _px(v, fallback = '0px') {
  if (v == null) return fallback;
  return typeof v === 'number' ? `${v}px` : String(v);
}

/** Build an inline style string from a plain object */
function _style(obj) {
  return Object.entries(obj).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`).join(';');
}

/** Aspect-ratio padding-bottom trick */
const RATIOS = { '16:9': '56.25%', '4:3': '75%', '1:1': '100%', '9:16': '177.78%', 'custom': '56.25%' };

/** Extract YouTube video ID */
function _ytId(url) {
  const m = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
/** Extract Vimeo video ID */
function _vimeoId(url) {
  const m = String(url || '').match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

/** Star rating HTML (static SVG stars) */
function _stars(n = 5) {
  return [1,2,3,4,5].map(i =>
    `<span style="color:${i<=n?'#F59E0B':'rgba(255,255,255,0.18)'}">★</span>`
  ).join('');
}

// ─── 1. HEADING ───────────────────────────────────────────────────────────────
function renderHeading(s) {
  const validTags = ['h1','h2','h3','h4','h5','h6'];
  const Tag       = validTags.includes(s.html_tag) ? s.html_tag : 'h2';
  const style     = _style({
    margin:         0,
    'font-size':    _px(s.font_size || 36),
    'font-weight':  s.font_weight  || '700',
    color:          s.color        || 'var(--color-text)',
    'text-align':   s.text_align   || 'left',
    'line-height':  s.line_height  || 1.2,
    'letter-spacing': s.letter_spacing ? _px(s.letter_spacing) : null,
    'font-family':  s.font_family  ? `${s.font_family},sans-serif` : null,
    'word-break':   'break-word',
  });

  const inner = `<${Tag} style="${_attr(style)}">${_esc(s.text || 'Heading')}</${Tag}>`;
  const content = s.link_url
    ? `<a href="${_attr(s.link_url)}" target="${_attr(s.link_target||'_self')}" rel="noopener" style="text-decoration:none;display:block">${inner}</a>`
    : inner;

  return `<div style="margin-bottom:${_px(s.margin_bottom||0)}">${content}</div>`;
}

// ─── 2. TEXT (Rich Text) ──────────────────────────────────────────────────────
function renderText(s, _site, sanitize) {
  const style = _style({
    'font-size':   _px(s.font_size || 16),
    'font-weight': s.font_weight  || '400',
    'line-height': s.line_height  || 1.75,
    color:         s.color        || 'rgba(255,255,255,0.75)',
    'text-align':  s.text_align   || 'left',
    'margin-bottom': _px(s.margin_bottom || 0),
    'font-family':   s.font_family ? `${s.font_family},sans-serif` : null,
  });
  const content = sanitize(s.content || '<p>Add your text here.</p>');
  return `<div style="${_attr(style)}">${content}</div>`;
}

// ─── 3. IMAGE ─────────────────────────────────────────────────────────────────
function renderImage(s) {
  if (!s.src) {
    return `<div style="padding:32px;border:2px dashed rgba(255,255,255,.1);border-radius:12px;text-align:center;color:rgba(255,255,255,.3);font-size:.8rem">No image URL set</div>`;
  }

  const marginMap = { left: '0', center: '0 auto', right: '0 0 0 auto' };
  const imgStyle  = _style({
    display:         'block',
    width:           s.width     || '100%',
    'max-width':     s.max_width || '100%',
    height:          s.height    || 'auto',
    'object-fit':    s.object_fit || 'cover',
    'border-radius': _px(s.border_radius || 0),
    'box-shadow':    s.box_shadow || null,
    margin:          marginMap[s.alignment || 'center'] || '0 auto',
    transition:      s.hover_effect && s.hover_effect !== 'none' ? 'transform .3s ease,opacity .3s ease,filter .3s ease' : null,
  });

  const loading = s.lazy_load !== false ? 'lazy' : 'eager';
  let img = `<figure style="margin:0"><img src="${_attr(s.src)}" alt="${_attr(s.alt||'')}" loading="${loading}" style="${_attr(imgStyle)}">`;
  if (s.caption) img += `<figcaption style="font-size:.75rem;color:rgba(255,255,255,.4);text-align:center;margin-top:8px">${_esc(s.caption)}</figcaption>`;
  img += '</figure>';

  return s.link_url
    ? `<a href="${_attr(s.link_url)}" target="${_attr(s.link_target||'_self')}" rel="noopener" style="display:block;text-decoration:none">${img}</a>`
    : img;
}

// ─── 4. VIDEO ─────────────────────────────────────────────────────────────────
function renderVideo(s) {
  const pb  = RATIOS[s.aspect_ratio] || '56.25%';
  const wrapStyle = _style({
    position:       'relative',
    'padding-bottom': pb,
    height:         '0',
    overflow:       'hidden',
    'border-radius': _px(s.border_radius || 12),
    background:     '#000',
  });
  const fillStyle = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';

  let embed = '';
  if (s.source_type === 'youtube' && s.youtube_url) {
    const id = _ytId(s.youtube_url);
    if (id) {
      const params = new URLSearchParams({
        autoplay:  s.autoplay          ? 1 : 0,
        mute:      s.muted             ? 1 : 0,
        loop:      s.loop              ? 1 : 0,
        controls:  s.controls !== false ? 1 : 0,
        ...(s.loop ? { playlist: id } : {}),
      });
      embed = `<iframe src="https://www.youtube.com/embed/${id}?${params}" style="${fillStyle}" allow="autoplay;fullscreen" allowfullscreen loading="lazy" title="${_attr(s.caption||'Video')}"></iframe>`;
    }
  } else if (s.source_type === 'vimeo' && s.vimeo_url) {
    const id = _vimeoId(s.vimeo_url);
    if (id) {
      embed = `<iframe src="https://player.vimeo.com/video/${id}?autoplay=${s.autoplay?1:0}" style="${fillStyle}" allow="autoplay;fullscreen" allowfullscreen loading="lazy" title="${_attr(s.caption||'Video')}"></iframe>`;
    }
  } else if ((s.source_type === 'self_hosted' || s.source_type === 'html5') && s.self_hosted_url) {
    const attrs = [
      s.autoplay         ? 'autoplay'  : '',
      s.muted            ? 'muted'     : '',
      s.loop             ? 'loop'      : '',
      s.controls !== false ? 'controls' : '',
    ].filter(Boolean).join(' ');
    embed = `<video src="${_attr(s.self_hosted_url)}" ${attrs} ${s.poster_url ? `poster="${_attr(s.poster_url)}"` : ''} style="${fillStyle};object-fit:cover"></video>`;
  }

  if (!embed) {
    embed = `<div style="${fillStyle};display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.1)"><span style="color:rgba(255,255,255,.3);font-size:.85rem">Add a video URL in the builder</span></div>`;
  }

  const out = `<div><div style="${_attr(wrapStyle)}">${embed}</div>${s.caption ? `<p style="font-size:.78rem;color:rgba(255,255,255,.4);text-align:center;margin-top:8px">${_esc(s.caption)}</p>` : ''}</div>`;
  return out;
}

// ─── 5. BUTTON ────────────────────────────────────────────────────────────────
function renderButton(s) {
  const bg  = s.bg_color    || s.background_color || 'var(--color-primary)';
  const fg  = s.text_color  || s.color            || '#ffffff';
  const isLink = s.button_style === 'link';

  let variantStyle;
  switch (s.button_style) {
    case 'outline':  variantStyle = `background:transparent;color:${bg};border:2px solid ${bg}`; break;
    case 'ghost':    variantStyle = `background:${bg}1a;color:${bg};border:1px solid ${bg}40`; break;
    case 'gradient': variantStyle = `background:linear-gradient(135deg,${bg},var(--color-accent,#06D6A0));color:#fff;border:none`; break;
    case 'link':     variantStyle = `background:transparent;color:${bg};border:none;text-decoration:underline;padding:0`; break;
    default:         variantStyle = `background:${bg};color:${fg};border:none`; break;
  }

  const pad = isLink ? '' : `padding:${_px(s.padding_top||12)} ${_px(s.padding_right||28)} ${_px(s.padding_bottom||12)} ${_px(s.padding_left||28)};`;
  const btnStyle = [
    variantStyle,
    `display:inline-flex;align-items:center;justify-content:center;gap:${s.icon_class?'8px':'0'}`,
    `font-size:${_px(s.font_size||15)};font-weight:${s.font_weight||700}`,
    pad,
    `border-radius:${_px(s.border_radius||10)}`,
    `box-shadow:${s.box_shadow||'none'}`,
    `text-decoration:${isLink?'underline':'none'}`,
    `cursor:pointer;line-height:1;white-space:nowrap;transition:all .2s ease`,
    s.width === 'full' ? 'width:100%' : '',
  ].filter(Boolean).join(';');

  const iconLeft  = s.icon_class && s.icon_position !== 'right' ? `<i class="fas ${_attr(s.icon_class)}" aria-hidden="true"></i>` : '';
  const iconRight = s.icon_class && s.icon_position === 'right' ? `<i class="fas ${_attr(s.icon_class)}" aria-hidden="true"></i>` : '';

  const align = s.alignment === 'center' ? 'center' : s.alignment === 'right' ? 'right' : 'left';
  const btn   = `<a href="${_attr(s.link_url||'#')}" target="${_attr(s.link_target||'_self')}" rel="noopener" style="${_attr(btnStyle)}">${iconLeft}${_esc(s.text||'Click Here')}${iconRight}</a>`;
  return `<div style="text-align:${align}">${btn}</div>`;
}

// ─── 6. DIVIDER ───────────────────────────────────────────────────────────────
function renderDivider(s) {
  const color  = s.color   || 'rgba(255,255,255,0.12)';
  const border = `${_px(s.weight||1)} ${s.style||'solid'} ${color}`;
  const width  = s.width   || '100%';

  const inner = s.icon_class
    ? `<div style="display:flex;align-items:center;gap:12px;width:${width};margin:0 auto"><div style="flex:1;border-top:${border}"></div><i class="fas ${_attr(s.icon_class)}" style="color:${color};font-size:14px"></i><div style="flex:1;border-top:${border}"></div></div>`
    : `<hr style="display:inline-block;width:${width};margin:0;border:none;border-top:${border};vertical-align:middle">`;

  return `<div style="padding:${_px(s.gap_top||16)} 0 ${_px(s.gap_bottom||16)};text-align:${s.alignment||'center'}">${inner}</div>`;
}

// ─── 7. SPACER ────────────────────────────────────────────────────────────────
function renderSpacer(s) {
  // Responsive heights handled via CSS (height_tablet / height_mobile in responsive_settings)
  const h = _px(s.height || 60);
  return `<div style="height:${h};width:100%" aria-hidden="true"></div>`;
}

// ─── 8. ICON ──────────────────────────────────────────────────────────────────
function renderIcon(s) {
  const size    = parseInt(s.size || 48);
  const pad     = parseInt(s.padding || 16);
  const shape   = s.bg_shape || 'circle';
  const opacity = s.bg_opacity ?? 0.1;
  const bgColor = s.bg_color || 'var(--color-primary)';
  const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');

  const shapeRadius = { none: '0', circle: '50%', rounded: '14px', square: '4px' };
  const radius = shapeRadius[shape] || '50%';

  const boxStyle = shape !== 'none'
    ? `display:inline-flex;align-items:center;justify-content:center;width:${size+pad*2}px;height:${size+pad*2}px;border-radius:${radius};background:${bgColor}${alphaHex};transition:all .2s ease`
    : `display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;transition:all .2s ease`;

  const iconEl = `<div style="${boxStyle}"><i class="fas ${_attr(s.icon_class||'fa-star')}" style="font-size:${size}px;color:${_attr(s.color||'var(--color-primary)')}"></i></div>`;
  const alignFlex = s.alignment === 'center' ? 'center' : s.alignment === 'right' ? 'flex-end' : 'flex-start';
  const aligned   = `<div style="display:flex;justify-content:${alignFlex}">${iconEl}</div>`;

  return s.link_url
    ? `<a href="${_attr(s.link_url)}" target="${_attr(s.link_target||'_self')}" rel="noopener" style="text-decoration:none;display:block">${aligned}</a>`
    : aligned;
}

// ─── 9. GALLERY ───────────────────────────────────────────────────────────────
function renderGallery(s) {
  if (!s.images?.length) {
    return `<div style="padding:32px;border:2px dashed rgba(255,255,255,.1);border-radius:10px;text-align:center;color:rgba(255,255,255,.3);font-size:.8rem">Gallery — add images in the builder</div>`;
  }

  const cols    = s.columns || 3;
  const pb      = RATIOS[s.image_ratio || '1:1'] || '100%';
  const colGap  = _px(s.column_gap || 12);
  const rowGap  = _px(s.row_gap    || 12);
  const radius  = _px(s.border_radius || 8);

  // Gallery uses a CSS class for responsive columns (emitted in page <style> by RenderService if needed)
  const gridStyle = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:${rowGap} ${colGap}`;

  const items = s.images.map(img => {
    const imgStyle = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .35s ease`;
    return `<div style="position:relative;padding-bottom:${pb};overflow:hidden;border-radius:${radius}${s.lightbox ? ';cursor:zoom-in' : ''}"><img src="${_attr(img.src)}" alt="${_attr(img.alt||'')}" loading="lazy" style="${imgStyle}"></div>`;
  }).join('');

  return `<div style="${gridStyle}">${items}</div>`;
}

// ─── 10. CAROUSEL ─────────────────────────────────────────────────────────────
function renderCarousel(s) {
  const slides = s.slides || [];
  if (!slides.length) {
    return `<div style="padding:40px;text-align:center;border:2px dashed rgba(255,255,255,.1);border-radius:12px;color:rgba(255,255,255,.3);font-size:.8rem">Carousel — add slides in the builder</div>`;
  }

  const pb = RATIOS[s.aspect_ratio] || '56.25%';
  // Renders as a static first-slide preview; JS (emitted once per page) enables interactivity
  const carouselId = `carousel-${Math.random().toString(36).slice(2,8)}`;

  const slideItems = slides.map((slide, i) => {
    const vis = i === 0 ? 'block' : 'none';
    let overlay = '';
    if (slide.heading || slide.text || slide.button_text) {
      overlay  = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:28px 24px;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,transparent 60%)">`;
      if (slide.heading) overlay += `<h3 style="color:#fff;font-size:1.35rem;font-weight:800;margin:0 0 6px;text-shadow:0 2px 6px rgba(0,0,0,.5)">${_esc(slide.heading)}</h3>`;
      if (slide.text)    overlay += `<p style="color:rgba(255,255,255,.85);font-size:.88rem;margin:0 0 12px">${_esc(slide.text)}</p>`;
      if (slide.button_text) overlay += `<a href="${_attr(slide.button_url||'#')}" style="display:inline-flex;align-items:center;padding:9px 20px;border-radius:8px;background:var(--color-primary,#7C3AED);color:#fff;text-decoration:none;font-weight:700;font-size:.85rem;width:fit-content">${_esc(slide.button_text)}</a>`;
      overlay += '</div>';
    }
    const bg = slide.image_src ? `<img src="${_attr(slide.image_src)}" alt="${_attr(slide.heading||'')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : '';
    return `<div class="pb-slide" style="display:${vis};position:relative;padding-bottom:${pb}">${bg}${overlay}</div>`;
  }).join('');

  const arrows = (s.arrows !== false && slides.length > 1)
    ? `<button class="pb-prev" aria-label="Previous" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.4rem;display:flex;align-items:center;justify-content:center;z-index:2">&#8249;</button>
       <button class="pb-next" aria-label="Next"     style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.4rem;display:flex;align-items:center;justify-content:center;z-index:2">&#8250;</button>`
    : '';

  const dots = (s.dots !== false && slides.length > 1)
    ? `<div class="pb-dots" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:2">${slides.map((_, i) => `<div class="pb-dot${i===0?' pb-dot-active':''}" data-idx="${i}" style="width:${i===0?'20px':'7px'};height:7px;border-radius:4px;cursor:pointer;transition:all .25s;background:${i===0?'#fff':'rgba(255,255,255,.4)'}"></div>`).join('')}</div>`
    : '';

  return `<div id="${carouselId}" class="pb-carousel" style="position:relative;border-radius:12px;overflow:hidden;user-select:none" data-autoplay="${s.autoplay?1:0}" data-speed="${s.autoplay_speed||5000}" data-loop="${s.loop?1:0}" data-total="${slides.length}">${slideItems}${arrows}${dots}</div>`;
}

// ─── 11. TABS ─────────────────────────────────────────────────────────────────
function renderTabs(s, _site, sanitize) {
  const tabs    = s.tabs || [];
  const variant = s.tab_style || 'underline';
  const accent  = 'var(--color-primary,#7C3AED)';

  if (!tabs.length) return `<div style="padding:24px;border:2px dashed rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.3);font-size:.8rem;text-align:center">Tabs — add tabs in the builder</div>`;

  const tabsId = `tabs-${Math.random().toString(36).slice(2,8)}`;

  const btnBase = `cursor:pointer;font-size:.83rem;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transition:all .15s;font-family:inherit;`;
  const tabBtns = tabs.map((t, i) => {
    const isActive = i === 0;
    const bStyle = variant === 'underline'
      ? `${btnBase}padding:10px 16px;border:none;border-radius:0;background:transparent;border-bottom:2px solid ${isActive?accent:'transparent'};color:${isActive?accent:'rgba(255,255,255,.45)'};font-weight:${isActive?700:400}`
      : variant === 'boxed'
      ? `${btnBase}padding:8px 14px;border-radius:6px;border:1px solid ${isActive?accent:'rgba(255,255,255,.1)'};background:${isActive?accent:'rgba(255,255,255,.05)'};color:${isActive?'#fff':'rgba(255,255,255,.5)'};font-weight:${isActive?700:400}`
      : `${btnBase}padding:8px 16px;border-radius:99px;border:none;background:${isActive?accent:'rgba(255,255,255,.06)'};color:${isActive?'#fff':'rgba(255,255,255,.5)'};font-weight:${isActive?700:400}`;
    const icon = t.icon ? `<i class="fas ${_attr(t.icon)}"></i>` : '';
    return `<button class="pb-tab-btn${isActive?' pb-tab-active':''}" data-tab="${_attr(t.id)}" style="${_attr(bStyle)}">${icon}${_esc(t.label||'Tab')}</button>`;
  }).join('');

  const barStyle = `display:flex;flex-wrap:wrap;gap:${variant==='underline'?'0':'6px'};justify-content:${s.tab_alignment==='center'?'center':s.tab_alignment==='right'?'flex-end':'flex-start'};${variant==='underline'?'border-bottom:1px solid rgba(255,255,255,.08)':'padding-bottom:10px'}`;

  const panels = tabs.map((t, i) => {
    const content = t.content_type === 'text' || t.text
      ? sanitize(t.text || t.content || '')
      : sanitize(t.content || '');
    return `<div class="pb-tab-panel" data-tab="${_attr(t.id)}" style="display:${i===0?'block':'none'};padding:${_px(s.content_padding||24)};background:rgba(255,255,255,.02);border-radius:${variant!=='underline'?_px(s.border_radius||8):'0'}">${content}</div>`;
  }).join('');

  return `<div id="${tabsId}" class="pb-tabs" style="border-radius:${_px(s.border_radius||8)};overflow:hidden"><div style="${_attr(barStyle)}">${tabBtns}</div>${panels}</div>`;
}

// ─── 12. ACCORDION ────────────────────────────────────────────────────────────
function renderAccordion(s, _site, sanitize) {
  const items  = s.items || [];
  const accent = s.active_color || 'var(--color-primary,#7C3AED)';

  if (!items.length) return `<div style="padding:24px;border:2px dashed rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.3);font-size:.8rem;text-align:center">Accordion — add items in the builder</div>`;

  const accId = `acc-${Math.random().toString(36).slice(2,8)}`;

  const itemsHtml = items.map((item, i) => {
    const isOpen    = item.default_open || false;
    const bordered  = s.border_style === 'bordered';
    const filled    = s.item_style === 'filled';
    const itemStyle = `border-radius:${_px(s.border_radius||8)};${bordered?'border:1px solid rgba(255,255,255,.1)':'border:none'};${filled?'background:rgba(255,255,255,.04)':'background:transparent'};overflow:hidden`;
    const btnStyle  = `width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;cursor:pointer;border:none;background:${isOpen?`${accent}1a`:'transparent'};color:${isOpen?accent:'rgba(255,255,255,.85)'};font-weight:${isOpen?700:500};font-size:.875rem;text-align:left;transition:all .18s;font-family:inherit`;
    const icon      = s.icon_position === 'left'
      ? `<i class="fas fa-${isOpen?'minus':'plus'}" style="color:${isOpen?accent:'rgba(255,255,255,.3)'};flex-shrink:0;font-size:.7rem"></i>`
      : `<i class="fas fa-chevron-${isOpen?'up':'down'}" style="color:${isOpen?accent:'rgba(255,255,255,.3)'};flex-shrink:0;font-size:.7rem"></i>`;
    const iconLeft  = s.icon_position === 'left' ? icon : '';
    const iconRight = s.icon_position !== 'left' ? icon : '';
    const content   = sanitize(item.content || '');
    const panelStyle = `display:${isOpen?'block':'none'};padding:4px 18px 16px;border-top:1px solid rgba(255,255,255,.06)`;
    return `<div style="${itemStyle}"><button class="pb-acc-btn" data-acc-item="${i}" style="${_attr(btnStyle)}">${iconLeft}<span style="flex:1">${_esc(item.title||'')}</span>${iconRight}</button><div class="pb-acc-panel" style="${panelStyle}"><div style="color:rgba(255,255,255,.7);line-height:1.75;font-size:.875rem">${content}</div></div></div>`;
  }).join(`<div style="height:${_px(s.item_gap||8)}"></div>`);

  return `<div id="${accId}" class="pb-accordion" data-multiple="${s.allow_multiple_open?1:0}" style="display:flex;flex-direction:column">${itemsHtml}</div>`;
}

// ─── 13. TOGGLE ───────────────────────────────────────────────────────────────
function renderToggle(s, _site, sanitize) {
  const items     = s.items || [];
  const iconColor = s.icon_color || 'var(--color-primary,#7C3AED)';
  const isCard    = s.style === 'card';

  if (!items.length) return `<div style="padding:24px;border:2px dashed rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.3);font-size:.8rem;text-align:center">Toggle — add items in the builder</div>`;

  const togId   = `tog-${Math.random().toString(36).slice(2,8)}`;
  const itemsHtml = items.map((item, i) => {
    const isOpen    = item.default_open || false;
    const itemStyle = `${isCard?`border-radius:10px;background:rgba(255,255,255,.04);overflow:hidden`:`border-bottom:1px solid rgba(255,255,255,.08)`}`;
    const btnStyle  = `width:100%;display:flex;align-items:center;gap:12px;padding:${isCard?'14px 16px':'10px 0'};background:transparent;border:none;cursor:pointer;color:rgba(255,255,255,.85);font-weight:500;font-size:.875rem;text-align:left;font-family:inherit`;
    const iconCls   = isOpen ? (s.icon_open || 'fa-minus') : (s.icon_closed || 'fa-plus');
    const content   = sanitize(item.content || '');
    const panelStyle = `display:${isOpen?'block':'none'};padding:${isCard?'0 16px 14px 42px':'0 0 10px 26px'}`;
    return `<div style="${itemStyle}"><button class="pb-tog-btn" style="${_attr(btnStyle)}"><i class="fas ${_attr(iconCls)}" style="color:${_attr(iconColor)};font-size:.78rem;width:14px;flex-shrink:0"></i><span>${_esc(item.title||'')}</span></button><div class="pb-tog-panel" style="${panelStyle}"><div style="color:rgba(255,255,255,.65);line-height:1.75;font-size:.875rem">${content}</div></div></div>`;
  }).join(`<div style="height:${_px(s.item_gap||8)}"></div>`);

  return `<div id="${togId}" class="pb-toggle" style="display:flex;flex-direction:column">${itemsHtml}</div>`;
}

// ─── 14. TESTIMONIAL ──────────────────────────────────────────────────────────
function renderTestimonial(s) {
  const items = s.items || [];
  if (!items.length) {
    return `<div style="padding:28px;border:2px dashed rgba(255,255,255,.1);border-radius:12px;text-align:center;color:rgba(255,255,255,.3);font-size:.8rem">Testimonial — add items in the builder</div>`;
  }

  const cols       = s.columns || 3;
  const cardStyle  = (item) => _style({
    display:        'flex',
    'flex-direction':'column',
    gap:            '14px',
    height:         '100%',
    background:     s.card_bg || 'rgba(255,255,255,.03)',
    border:         s.card_style === 'bordered' ? '1px solid rgba(255,255,255,.1)' : 'none',
    'border-radius': _px(s.border_radius || 16),
    padding:        _px(s.card_padding || 24),
    'box-shadow':   s.card_style === 'shadow' ? '0 4px 24px rgba(0,0,0,.3)' : 'none',
  });

  const renderCard = (item) => {
    const quoteIcon = s.quote_icon !== false ? `<span style="font-size:1.8rem;line-height:1;color:var(--color-primary,#7C3AED);opacity:.35">"</span>` : '';
    const text      = `<p style="color:rgba(255,255,255,.8);line-height:1.7;font-size:.9rem;margin:0;text-align:${s.text_align||'left'};flex:1">${_esc(item.quote || item.text || '')}</p>`;
    const rating    = s.show_rating !== false ? `<div style="display:flex;gap:2px">${_stars(item.rating || 5)}</div>` : '';
    const avatar    = s.show_avatar !== false
      ? `<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;background:rgba(255,255,255,.08)">${item.avatar_url||item.avatar ? `<img src="${_attr(item.avatar_url||item.avatar)}" alt="${_attr(item.name||'')}" style="width:100%;height:100%;object-fit:cover">` : '<span style="font-size:1rem;opacity:.4;display:flex;align-items:center;justify-content:center;height:100%">👤</span>'}</div>`
      : '';
    const meta = `<div style="display:flex;align-items:center;gap:12px;margin-top:auto">${avatar}<div><div style="font-weight:700;font-size:.85rem;color:#fff">${_esc(item.name||'')}</div>${item.role?`<div style="font-size:.75rem;color:rgba(255,255,255,.4);margin-top:2px">${_esc(item.role)}</div>`:''}</div></div>`;
    return `<div style="${_attr(cardStyle(item))}">${quoteIcon}${text}${rating}${meta}</div>`;
  };

  if (s.layout === 'carousel' || s.layout === 'single') {
    const testiId = `testi-${Math.random().toString(36).slice(2,8)}`;
    const cards   = items.map((item, i) => `<div class="pb-testi-slide" style="display:${i===0?'block':'none'}">${renderCard(item)}</div>`).join('');
    const dots    = items.length > 1
      ? `<div style="display:flex;justify-content:center;gap:8px;margin-top:16px">${items.map((_,i) => `<div class="pb-testi-dot" data-idx="${i}" style="width:${i===0?'20px':'8px'};height:8px;border-radius:4px;background:${i===0?'var(--color-primary,#7C3AED)':'rgba(255,255,255,.2)'};cursor:pointer;transition:all .25s"></div>`).join('')}</div>`
      : '';
    return `<div id="${testiId}" class="pb-testimonial-carousel" data-total="${items.length}">${cards}${dots}</div>`;
  }

  const gridStyle = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;align-items:stretch`;
  return `<div style="${gridStyle}">${items.map(renderCard).join('')}</div>`;
}

// ─── 15. PRICING TABLE ────────────────────────────────────────────────────────
function renderPricing(s, site) {
  const plans   = s.plans || [];
  const cols    = s.columns || Math.min(plans.length, 3);
  const primary = site?.primary_color || 'var(--color-primary,#7C3AED)';

  if (!plans.length) return `<div style="padding:28px;border:2px dashed rgba(255,255,255,.1);border-radius:12px;text-align:center;color:rgba(255,255,255,.3);font-size:.8rem">Pricing — add plans in the builder</div>`;

  const planCards = plans.map(plan => {
    const hl = plan.highlighted;
    const style = `position:relative;border-radius:20px;border:${hl?`2px solid ${primary}`:'1px solid rgba(255,255,255,.1)'};background:${hl?`${primary}12`:'rgba(255,255,255,.04)'};padding:32px 28px;display:flex;flex-direction:column;gap:16px;${hl?`transform:scale(1.02);box-shadow:0 0 40px ${primary}28`:''};`;
    const badge = plan.badge ? `<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:${primary};color:#fff;padding:3px 16px;border-radius:99px;font-size:.68rem;font-weight:800;letter-spacing:.06em;white-space:nowrap">${_esc(plan.badge)}</div>` : '';
    const name  = `<div style="font-size:.8rem;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em">${_esc(plan.name||'')}</div>`;
    const price = `<div style="display:flex;align-items:baseline;gap:4px"><span style="font-size:2.8rem;font-weight:900;color:#fff;line-height:1">${_esc(plan.price||'Free')}</span>${plan.period?`<span style="font-size:.85rem;color:rgba(255,255,255,.4)">${_esc(plan.period)}</span>`:''}</div>`;
    const desc  = plan.description ? `<p style="font-size:.83rem;color:rgba(255,255,255,.5);margin:0">${_esc(plan.description)}</p>` : '';
    const sep   = `<div style="height:1px;background:rgba(255,255,255,.08)"></div>`;
    const feats = `<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">${(plan.features||[]).map(f => `<li style="display:flex;align-items:center;gap:10px;font-size:.85rem;color:${f.included?'rgba(255,255,255,.85)':'rgba(255,255,255,.25)'}"><span style="flex-shrink:0;color:${f.included?'#06D6A0':'rgba(255,255,255,.2)'}">${f.included?'✓':'✕'}</span>${_esc(f.text||'')}</li>`).join('')}</ul>`;
    const btn   = `<a href="${_attr(plan.button_url||'#')}" style="display:block;text-align:center;margin-top:auto;padding:12px 20px;border-radius:10px;text-decoration:none;background:${hl?primary:'rgba(255,255,255,.08)'};color:#fff;font-weight:700;font-size:.85rem;transition:all .15s">${_esc(plan.button_text||'Get Started')}</a>`;
    return `<div style="${style}">${badge}${name}${price}${desc}${sep}${feats}${btn}</div>`;
  }).join('');

  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;align-items:start">${planCards}</div>`;
}

// ─── 16. PROGRESS BAR ─────────────────────────────────────────────────────────
function renderProgressBar(s) {
  const items = s.items || [];
  if (!items.length) return `<div style="padding:24px;border:2px dashed rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.3);font-size:.8rem;text-align:center">Progress bars — add items in the builder</div>`;

  // Uses Intersection Observer JS (emitted once per page) for animate-on-scroll
  const barsId = `pbars-${Math.random().toString(36).slice(2,8)}`;

  const barsHtml = items.map(item => {
    const pct   = Math.max(0, Math.min(100, item.percentage || 0));
    const color = item.color || 'var(--color-primary)';
    const fillBg = s.bar_style === 'gradient'
      ? `linear-gradient(90deg,${color},${color}99)`
      : s.bar_style === 'striped'
      ? `repeating-linear-gradient(45deg,${color},${color} 10px,${color}cc 10px,${color}cc 20px)`
      : color;

    return `<div><div style="display:flex;justify-content:space-between;margin-bottom:7px"><span style="font-size:.83rem;font-weight:600;color:rgba(255,255,255,.8)">${_esc(item.label||'')}</span>${s.show_percentage!==false?`<span style="font-size:.78rem;font-weight:700;color:${color}">${pct}%</span>`:''}</div><div style="width:100%;height:${_px(s.bar_height||12)};background:${s.track_color||'rgba(255,255,255,.08)'};border-radius:${_px(s.border_radius||6)};overflow:hidden"><div class="pb-bar-fill" data-pct="${pct}" style="height:100%;width:0;background:${fillBg};border-radius:${_px(s.border_radius||6)};transition:width 1.2s cubic-bezier(.25,.46,.45,.94)"></div></div></div>`;
  }).join('<div style="height:16px"></div>');

  return `<div id="${barsId}" class="pb-progress" style="display:flex;flex-direction:column">${barsHtml}</div>`;
}

// ─── 17. COUNTDOWN ────────────────────────────────────────────────────────────
function renderCountdown(s) {
  const labels = s.labels || { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' };
  const boxBg  = s.box_background || 'var(--color-surface,#1e293b)';
  const boxCol = s.box_color      || 'var(--color-text,#f1f5f9)';
  const labCol = s.label_color    || 'var(--color-muted,#94a3b8)';
  const radius = _px(s.box_border_radius || 12);

  const countId = `cd-${Math.random().toString(36).slice(2,8)}`;

  const units = [
    s.show_days    !== false && { key: 'days',    label: labels.days    || 'Days'    },
    s.show_hours   !== false && { key: 'hours',   label: labels.hours   || 'Hours'   },
    s.show_minutes !== false && { key: 'minutes', label: labels.minutes || 'Minutes' },
    s.show_seconds !== false && { key: 'seconds', label: labels.seconds || 'Seconds' },
  ].filter(Boolean);

  const boxes = units.map(u =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div class="pb-cd-${u.key}" style="min-width:64px;padding:16px 12px;background:${boxBg};border-radius:${radius};text-align:center;font-size:2rem;font-weight:900;color:${boxCol};font-variant-numeric:tabular-nums">00</div><div style="font-size:.72rem;color:${labCol};text-transform:uppercase;letter-spacing:.08em">${_esc(u.label)}</div></div>`
  ).join('<div style="font-size:1.6rem;font-weight:900;color:var(--color-primary,#7C3AED);align-self:flex-start;padding-top:14px">:</div>');

  const dueDate = s.due_date || '';
  return `<div id="${countId}" class="pb-countdown" data-due="${_attr(dueDate)}" data-expire="${_attr(s.on_expire_action||'message')}" data-msg="${_attr(s.on_expire_message||'Enrollment has closed.')}" style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;justify-content:center">${boxes}</div>`;
}

// ─── 18. MAP ──────────────────────────────────────────────────────────────────
function renderMap(s) {
  const height = _px(s.height || 400);
  const radius = _px(s.border_radius || 12);
  const lat    = s.latitude  || 0;
  const lng    = s.longitude || 0;
  const zoom   = s.zoom      || 15;

  // Use OpenStreetMap embed (no API key required)
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  const title  = _attr(s.marker_title || s.address || 'Map');

  return `<div style="border-radius:${radius};overflow:hidden;height:${height}"><iframe src="${osmUrl}" style="width:100%;height:100%;border:none" loading="lazy" title="${title}" sandbox="allow-scripts allow-same-origin"></iframe></div>`;
}

// ─── 19. SOCIAL ICONS ─────────────────────────────────────────────────────────
function renderSocialIcons(s) {
  const items = s.items || [];
  if (!items.length) return `<div style="font-size:.8rem;color:rgba(255,255,255,.3)">Social icons — add links in the builder</div>`;

  // SVG brand icons (inline, no FontAwesome dependency for social)
  const BRAND_COLORS = { facebook: '#1877F2', twitter: '#1DA1F2', instagram: '#E1306C', youtube: '#FF0000', whatsapp: '#25D366', linkedin: '#0A66C2', tiktok: '#000000', pinterest: '#E60023', telegram: '#2CA5E0' };
  const BRAND_PATHS  = {
    facebook:  'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    twitter:   'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z',
    instagram: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7.6 3h8.8A4.6 4.6 0 0 1 21 7.6v8.8A4.6 4.6 0 0 1 16.4 21H7.6A4.6 4.6 0 0 1 3 16.4V7.6A4.6 4.6 0 0 1 7.6 3z',
    youtube:   'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z M9.75 15.02l5.75-3.02-5.75-3.02v6.04z',
    whatsapp:  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z',
    linkedin:  'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  };

  const size      = parseInt(s.icon_size || 24);
  const gap       = _px(s.gap || 16);
  const iconStyle = s.icon_style;
  const colorType = s.color_type || 'brand';
  const align     = s.alignment === 'center' ? 'center' : s.alignment === 'right' ? 'flex-end' : 'flex-start';
  const target    = s.open_in_new_tab !== false ? '_blank' : '_self';

  const icons = items.map(item => {
    const network    = (item.network || '').toLowerCase();
    const brandColor = BRAND_COLORS[network] || '#888';
    const iconColor  = colorType === 'brand' ? brandColor : (s.custom_color || '#fff');
    const svgPath    = BRAND_PATHS[network];

    const boxSz      = iconStyle === 'filled_circle' || iconStyle === 'circle' || iconStyle === 'square' || iconStyle === 'rounded'
      ? size + 16 : size;
    const radius     = iconStyle === 'circle' || iconStyle === 'filled_circle' ? '50%' : iconStyle === 'rounded' ? '6px' : '0';
    const boxBg      = iconStyle === 'filled_circle' ? brandColor : 'transparent';
    const boxBorder  = iconStyle === 'rounded' || iconStyle === 'square' ? `1px solid ${brandColor}40` : 'none';

    const boxStyle = `display:inline-flex;align-items:center;justify-content:center;width:${boxSz}px;height:${boxSz}px;border-radius:${radius};background:${boxBg};border:${boxBorder};transition:transform .2s ease,opacity .2s ease`;

    const iconEl = svgPath
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${iconStyle==='filled_circle'?'#fff':iconColor}" stroke="none" aria-hidden="true"><path d="${svgPath}"/></svg>`
      : `<span style="font-size:${size}px;color:${iconColor}">${network[0]?.toUpperCase()||'?'}</span>`;

    return `<a href="${_attr(item.url||'#')}" target="${target}" rel="noopener noreferrer" aria-label="${_attr(item.label||network)}" style="${_attr(boxStyle)}">${iconEl}</a>`;
  }).join('');

  return `<div style="display:flex;flex-wrap:wrap;gap:${gap};align-items:center;justify-content:${align}">${icons}</div>`;
}

// ─── 20. HTML WIDGET ──────────────────────────────────────────────────────────
function renderHtml(s, _site, sanitize) {
  const code = s.code || '';
  const safe = s.sanitize === false ? code : sanitize(code);
  return safe;
}

// ─── 21. COURSES LIST (Dynamic) ───────────────────────────────────────────────
function renderCoursesList(s, site) {
  // Dynamic data widget — rendered server-side by RenderService which
  // injects `site.courses` before calling renderers. Falls back to placeholder.
  const courses = s._courses || [];
  if (!courses.length) {
    return `<div style="padding:28px;border:2px dashed rgba(255,255,255,.1);border-radius:12px;text-align:center;color:rgba(255,255,255,.3);font-size:.8rem">Courses will appear here on the live site (${s.limit||8} max)</div>`;
  }
  const cols  = s.columns || 4;
  const cards = courses.slice(0, s.limit || 8).map(course => {
    const thumb = course.thumbnail_url ? `<img src="${_attr(course.thumbnail_url)}" alt="${_attr(course.title||'')}" style="width:100%;height:160px;object-fit:cover">` : `<div style="width:100%;height:160px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center"><span style="font-size:2rem;opacity:.3">📚</span></div>`;
    return `<div style="border-radius:${_px(s.border_radius||12)};overflow:hidden;background:var(--color-surface,#1e293b);border:1px solid rgba(255,255,255,.08)"><a href="/courses/${_attr(course.slug||course.id)}" style="text-decoration:none;display:block">${thumb}</a><div style="padding:16px"><a href="/courses/${_attr(course.slug||course.id)}" style="text-decoration:none;font-weight:700;font-size:.9rem;color:#fff;display:block;margin-bottom:6px">${_esc(course.title||'')}</a>${s.show_price!==false&&course.price?`<div style="font-weight:800;color:var(--color-primary,#7C3AED);font-size:.95rem">₦${_esc(String(course.price))}</div>`:''}</div></div>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px">${cards}</div>`;
}

// ─── 22. PAST QUESTIONS LIST (Dynamic) ────────────────────────────────────────
function renderPqList(s, site) {
  const pqs = s._pqs || [];
  if (!pqs.length) {
    return `<div style="padding:28px;border:2px dashed rgba(255,255,255,.1);border-radius:12px;text-align:center;color:rgba(255,255,255,.3);font-size:.8rem">Past questions will appear here on the live site (${s.limit||6} max)</div>`;
  }
  const cols  = s.columns || 3;
  const cards = pqs.slice(0, s.limit || 6).map(pq => `<div style="border-radius:${_px(s.border_radius||12)};overflow:hidden;background:var(--color-surface,#1e293b);border:1px solid rgba(255,255,255,.08);padding:20px"><div style="font-weight:700;font-size:.9rem;color:#fff;margin-bottom:6px">${_esc(pq.title||pq.subject||'')}</div>${pq.year?`<div style="font-size:.78rem;color:rgba(255,255,255,.4)">${_esc(String(pq.year))}</div>`:''}<a href="/past-questions/${_attr(pq.slug||pq.id)}" style="display:inline-flex;margin-top:12px;padding:7px 14px;border-radius:8px;background:var(--color-primary,#7C3AED);color:#fff;font-size:.78rem;font-weight:700;text-decoration:none">Practice</a></div>`).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px">${cards}</div>`;
}

// ─── REGISTRY ─────────────────────────────────────────────────────────────────
const RENDERERS = {
  heading:       renderHeading,
  text:          renderText,
  image:         renderImage,
  video:         renderVideo,
  button:        renderButton,
  divider:       renderDivider,
  spacer:        renderSpacer,
  icon:          renderIcon,
  gallery:       renderGallery,
  carousel:      renderCarousel,
  tabs:          renderTabs,
  accordion:     renderAccordion,
  toggle:        renderToggle,
  testimonial:   renderTestimonial,
  pricing_table: renderPricing,
  progress_bar:  renderProgressBar,
  countdown:     renderCountdown,
  map:           renderMap,
  social_icons:  renderSocialIcons,
  html:          renderHtml,
  courses_list:  renderCoursesList,
  pq_list:       renderPqList,
};

/**
 * Render a widget to an HTML string.
 *
 * @param {string}   type       widget.type
 * @param {object}   settings   Already-resolved (responsive-merged) settings
 * @param {object}   site       admin_sites row
 * @param {function} sanitize   htmlSanitizer.sanitize
 * @returns {string}  Inner HTML (no wrapper div)
 */
function renderWidget(type, settings, site, sanitize) {
  const fn = RENDERERS[type];
  if (!fn) {
    return `<!-- unknown widget type: ${escapeHtml(type)} -->`;
  }
  try {
    return fn(settings, site, sanitize) || '';
  } catch (err) {
    console.error(`[WidgetRenderer] Error rendering "${type}":`, err.message);
    return `<!-- render error: ${escapeHtml(type)} -->`;
  }
}

module.exports = { renderWidget, RENDERERS };
