// backend/services/RenderService.js
// Main orchestrator: layout JSON → full HTML string.
//
// Public API:
//   RenderService.renderPage(layout, site, opts)  → full HTML document string
//   RenderService.renderFragment(layout, site)    → bare HTML (no <html>/<head>)
'use strict';

const { resolveSettings }   = require('../utils/deepMerge');
const { sanitize, escapeHtml } = require('../utils/htmlSanitizer');
const {
  buildGlobalCSS,
  buildSectionCSS,
  buildSectionRowCSS,
  buildColumnCSS,
  buildWidgetWrapperCSS,
  buildResponsiveCSS,
  buildKeyframesCSS,
} = require('../renderers/cssBuilder');
const { renderWidget }      = require('../renderers/widgetRenderers');
const { migrate, isV1 }     = require('../renderers/v1Adapter');

// ─── Interactive widget JS ────────────────────────────────────────────────────
// Emitted once per page as a single inline <script>.
// Each block is only included if that widget type appears in the layout.
const WIDGET_JS = {

  carousel: `
(function(){
  document.querySelectorAll('.pb-carousel').forEach(function(el){
    var slides=el.querySelectorAll('.pb-slide'),dots=el.querySelectorAll('.pb-dot'),total=slides.length,idx=0,timer;
    if(!total)return;
    function show(i){
      slides.forEach(function(s,j){s.style.display=j===i?'block':'none';});
      dots.forEach(function(d,j){d.style.width=j===i?'20px':'7px';d.style.background=j===i?'#fff':'rgba(255,255,255,.4)';});
      idx=i;
    }
    var prev=el.querySelector('.pb-prev'),next=el.querySelector('.pb-next');
    if(prev)prev.addEventListener('click',function(){show((idx-1+total)%total);});
    if(next)next.addEventListener('click',function(){show((idx+1)%total);});
    dots.forEach(function(d){d.addEventListener('click',function(){show(parseInt(d.dataset.idx));});});
    if(el.dataset.autoplay==='1'){
      var spd=parseInt(el.dataset.speed)||5000;
      el.addEventListener('mouseenter',function(){clearInterval(timer);});
      el.addEventListener('mouseleave',function(){timer=setInterval(function(){show((idx+1)%total);},spd);});
      timer=setInterval(function(){show((idx+1)%total);},spd);
    }
  });
})();`,

  tabs: `
(function(){
  document.querySelectorAll('.pb-tabs').forEach(function(el){
    var btns=el.querySelectorAll('.pb-tab-btn'),panels=el.querySelectorAll('.pb-tab-panel');
    btns.forEach(function(btn){
      btn.addEventListener('click',function(){
        var t=btn.dataset.tab;
        btns.forEach(function(b){b.style.opacity=b===btn?'1':'0.5';b.style.fontWeight=b===btn?'700':'400';b.style.borderBottomColor=b===btn?'var(--color-primary,#7C3AED)':'transparent';});
        panels.forEach(function(p){p.style.display=p.dataset.tab===t?'block':'none';});
      });
    });
  });
})();`,

  accordion: `
(function(){
  document.querySelectorAll('.pb-accordion').forEach(function(el){
    var multi=el.dataset.multiple==='1';
    el.querySelectorAll('.pb-acc-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var panel=btn.nextElementSibling,open=panel.style.display!=='none';
        if(!multi)el.querySelectorAll('.pb-acc-panel').forEach(function(p){p.style.display='none';});
        panel.style.display=open?'none':'block';
      });
    });
  });
})();`,

  toggle: `
(function(){
  document.querySelectorAll('.pb-toggle').forEach(function(el){
    el.querySelectorAll('.pb-tog-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        var panel=btn.nextElementSibling;
        panel.style.display=panel.style.display==='none'?'block':'none';
        var icon=btn.querySelector('i');
        if(icon){icon.className=icon.className.includes('fa-minus')?icon.className.replace('fa-minus','fa-plus'):icon.className.replace('fa-plus','fa-minus');}
      });
    });
  });
})();`,

  testimonial_carousel: `
(function(){
  document.querySelectorAll('.pb-testimonial-carousel').forEach(function(el){
    var slides=el.querySelectorAll('.pb-testi-slide'),dots=el.querySelectorAll('.pb-testi-dot'),total=slides.length,idx=0;
    if(!total)return;
    function show(i){
      slides.forEach(function(s,j){s.style.display=j===i?'block':'none';});
      dots.forEach(function(d,j){d.style.width=j===i?'20px':'8px';d.style.background=j===i?'var(--color-primary,#7C3AED)':'rgba(255,255,255,.2)';});
      idx=i;
    }
    dots.forEach(function(d){d.addEventListener('click',function(){show(parseInt(d.dataset.idx));});});
  });
})();`,

  progress_bar: `
(function(){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      entry.target.querySelectorAll('.pb-bar-fill').forEach(function(bar){
        bar.style.width=bar.dataset.pct+'%';
      });
      obs.unobserve(entry.target);
    });
  },{threshold:0.3});
  document.querySelectorAll('.pb-progress').forEach(function(el){obs.observe(el);});
})();`,

  countdown: `
(function(){
  document.querySelectorAll('.pb-countdown').forEach(function(el){
    var due=el.dataset.due,action=el.dataset.expire,msg=el.dataset.msg;
    function tick(){
      var ms=due?new Date(due).getTime()-Date.now():0;
      if(ms<=0){
        if(action==='hide'){el.style.display='none';}
        else if(action==='message'){el.innerHTML='<div style="text-align:center;padding:24px;color:rgba(255,255,255,.5)">'+msg+'</div>';}
        return;
      }
      var d=Math.floor(ms/86400000),h=Math.floor((ms%86400000)/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
      function set(cls,v){var n=el.querySelector('.pb-cd-'+cls);if(n)n.textContent=String(v).padStart(2,'0');}
      set('days',d);set('hours',h);set('minutes',m);set('seconds',s);
    }
    tick();setInterval(tick,1000);
  });
})();`,
};

// ─── RenderService ────────────────────────────────────────────────────────────

const RenderService = {

  /**
   * Render a full page layout to a complete HTML document.
   *
   * @param {object} layout   Page layout JSON (v1 or v2)
   * @param {object} site     admin_sites row
   * @param {object} opts
   * @param {boolean} [opts.isFragment=false]  Return bare HTML without <html>/<head>
   * @returns {string}  Complete HTML string
   */
  renderPage(layout, site = {}, opts = {}) {
    // ── 1. Normalise to v2 ────────────────────────────────────────────────────
    if (isV1(layout)) layout = migrate(layout, site);

    const gs       = layout.global_settings || {};
    const sections = layout.sections        || [];

    // ── 2. Accumulators ───────────────────────────────────────────────────────
    let css               = '';   // all CSS — written to one <style> block
    let bodyHtml          = '';   // section HTML
    const usedAnimations  = new Set();   // animation names used → @keyframes
    const usedWidgetTypes = new Set();   // widget types used → decide which JS to emit

    // ── 3. Global CSS ─────────────────────────────────────────────────────────
    const { css: globalCSS, fontLinks } = buildGlobalCSS(gs);
    css += globalCSS + '\n';

    // ── 4. Render sections ────────────────────────────────────────────────────
    for (const section of sections) {
      const sId = section.id;
      const ss  = section.settings || {};

      // Section CSS + responsive
      css += buildSectionCSS(sId, ss);
      css += buildSectionRowCSS(sId, ss);
      css += buildResponsiveCSS(sId, 'data-section-id', section, usedAnimations);

      // Custom CSS scoped to section
      if (ss.advanced?.custom_css) {
        css += `[data-section-id="${sId}"] { ${ss.advanced.custom_css} }\n`;
      }

      // Section opening tag
      const htmlTag  = ['section','div','header','footer','main','article'].includes(ss.html_tag) ? ss.html_tag : 'section';
      const cssId    = ss.css_id    ? ` id="${escapeHtml(ss.css_id)}"` : '';
      const cssClass = ss.css_classes ? ` class="${escapeHtml(ss.css_classes)}"` : '';
      bodyHtml += `<${htmlTag} data-section-id="${sId}"${cssId}${cssClass}>\n`;

      // Background video
      if (ss.background?.type === 'video' && ss.background.video_url) {
        bodyHtml += `<video autoplay loop muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0" src="${escapeHtml(ss.background.video_url)}"></video>\n`;
      }

      // Background overlay
      if (ss.background?.overlay_color && ss.background?.type !== 'color') {
        const opacity = ss.background.overlay_opacity ?? 0.4;
        bodyHtml += `<div aria-hidden="true" style="position:absolute;inset:0;background:${escapeHtml(ss.background.overlay_color)};opacity:${opacity};z-index:1;pointer-events:none"></div>\n`;
      }

      // Columns wrapper
      bodyHtml += `<div class="pb-cols">\n`;

      // ── 5. Render columns ──────────────────────────────────────────────────
      for (const col of (section.columns || [])) {
        const cId = col.id;
        const cs  = col.settings || {};

        css += buildColumnCSS(cId, cs);
        css += buildResponsiveCSS(cId, 'data-col-id', col, usedAnimations);

        // Custom CSS scoped to column
        if (cs.advanced?.custom_css) {
          css += `[data-col-id="${cId}"] { ${cs.advanced.custom_css} }\n`;
        }

        const colCssId    = cs.css_id    ? ` id="${escapeHtml(cs.css_id)}"` : '';
        const colCssClass = cs.css_classes ? ` class="pb-col ${escapeHtml(cs.css_classes)}"` : ' class="pb-col"';
        bodyHtml += `<div data-col-id="${cId}"${colCssId}${colCssClass}>\n`;

        // ── 6. Render widgets ────────────────────────────────────────────────
        for (const widget of (col.widgets || [])) {
          const wId = widget.id;
          const ws  = resolveSettings(widget, 'desktop');  // base settings only; responsive via CSS

          css += buildWidgetWrapperCSS(wId, ws, usedAnimations);
          css += buildResponsiveCSS(wId, 'data-widget-id', widget, usedAnimations);

          // Custom CSS scoped to widget
          if (ws.custom_css) {
            css += `[data-widget-id="${wId}"] { ${ws.custom_css} }\n`;
          }

          // Widget wrapper
          const wCssId    = ws.css_id    ? ` id="${escapeHtml(ws.css_id)}"` : '';
          const wCssClass = ws.css_classes ? ` class="pb-widget ${escapeHtml(ws.css_classes)}"` : ' class="pb-widget"';
          bodyHtml += `<div data-widget-id="${wId}"${wCssId}${wCssClass}>\n`;

          // Widget inner HTML
          const innerHtml = renderWidget(widget.type, ws, site, (html) => sanitize(html));
          bodyHtml += innerHtml + '\n';
          bodyHtml += '</div>\n';

          usedWidgetTypes.add(widget.type);
        }

        bodyHtml += '</div>\n';  // .pb-col
      }

      bodyHtml += '</div>\n';            // .pb-cols
      bodyHtml += `</${htmlTag}>\n`;     // section
    }

    // ── 7. Keyframes CSS (only animations actually used) ───────────────────
    css += buildKeyframesCSS(usedAnimations) + '\n';

    // ── 8. Collect interactive JS ─────────────────────────────────────────
    const interactiveJS = [
      usedWidgetTypes.has('carousel')    && WIDGET_JS.carousel,
      usedWidgetTypes.has('tabs')        && WIDGET_JS.tabs,
      usedWidgetTypes.has('accordion')   && WIDGET_JS.accordion,
      usedWidgetTypes.has('toggle')      && WIDGET_JS.toggle,
      (usedWidgetTypes.has('testimonial') || usedWidgetTypes.has('testimonials')) && WIDGET_JS.testimonial_carousel,
      usedWidgetTypes.has('progress_bar')&& WIDGET_JS.progress_bar,
      usedWidgetTypes.has('countdown')   && WIDGET_JS.countdown,
    ].filter(Boolean).join('\n');

    // ── 9. Assemble ────────────────────────────────────────────────────────
    if (opts.isFragment) {
      return `<style>${css}</style>\n${bodyHtml}${interactiveJS ? `<script>${interactiveJS}</script>` : ''}`;
    }

    // Full HTML document
    const pageTitle    = escapeHtml(layout.page_title || gs.school_name || gs.hero_title || 'Page');
    const metaDesc     = escapeHtml(layout.meta_description || '');
    const faviconUrl   = gs.favicon_url ? `<link rel="icon" href="${escapeHtml(gs.favicon_url)}">` : '';
    const faLink       = gs.use_fontawesome !== false
      ? `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  ${metaDesc ? `<meta name="description" content="${metaDesc}">` : ''}
  ${faviconUrl}
  ${fontLinks.join('\n  ')}
  ${faLink}
  <style>
${css}
  </style>
</head>
<body>
${bodyHtml}
${interactiveJS ? `<script>\n${interactiveJS}\n</script>` : ''}
</body>
</html>`;
  },

  /**
   * Render just the body HTML + styles (no <html>/<head>).
   * Used for the builder's iframe preview.
   */
  renderFragment(layout, site = {}) {
    return this.renderPage(layout, site, { isFragment: true });
  },
};

module.exports = RenderService;
