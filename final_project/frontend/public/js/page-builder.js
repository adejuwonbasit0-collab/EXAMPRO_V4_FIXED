/**
 * ExamPro Page Builder — frontend JS
 * File: /public/js/page-builder.js
 * Loaded by admin panel index.html
 */

// ─── STATE ──────────────────────────────────────────────────────────────────
var _pbBlocks    = [];   // current canvas blocks
var _pbSite      = null; // site data from API
var _pbDirty     = false; // unsaved changes

var _pbElementDefs = [
  {
    group: 'Layout',
    items: [
      { type: 'hero',         icon: 'fa-rocket',        label: 'Hero Section' },
      { type: 'stats',        icon: 'fa-chart-bar',     label: 'Stats Band' },
      { type: 'features',     icon: 'fa-th-large',      label: 'Features Grid' },
      { type: 'cta',          icon: 'fa-bullhorn',      label: 'CTA Section' },
    ]
  },
  {
    group: 'Content',
    items: [
      { type: 'heading',      icon: 'fa-heading',       label: 'Heading' },
      { type: 'paragraph',    icon: 'fa-paragraph',     label: 'Paragraph' },
      { type: 'divider',      icon: 'fa-minus',         label: 'Divider' },
      { type: 'spacer',       icon: 'fa-arrows-alt-v',  label: 'Spacer' },
      { type: 'image',        icon: 'fa-image',         label: 'Image' },
      { type: 'video',        icon: 'fa-play-circle',   label: 'Video Embed' },
      { type: 'button',       icon: 'fa-hand-pointer',  label: 'Button' },
      { type: 'html',         icon: 'fa-code',          label: 'Custom HTML' },
    ]
  },
  {
    group: 'Sections',
    items: [
      { type: 'courses-list', icon: 'fa-graduation-cap', label: 'Courses Section' },
      { type: 'pq-list',      icon: 'fa-file-alt',      label: 'Past Questions' },
      { type: 'contact',      icon: 'fa-envelope',      label: 'Contact Info' },
      { type: 'social',       icon: 'fa-share-alt',     label: 'Social Links' },
      { type: 'faq',          icon: 'fa-question-circle', label: 'FAQ' },
      { type: 'testimonials', icon: 'fa-comments',      label: 'Testimonials' },
    ]
  }
];

// Default block content by type
function _pbDefaultBlock(type) {
  var id = 'blk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  var defaults = {
    hero:       { id, type, title: 'Welcome to Our School', subtitle: 'Quality education for every student. Access courses, past questions, and live classes.', show_cta: true, cta_text: 'Get Started Free', cta2_text: 'Browse Courses' },
    stats:      { id, type, stats: [{label:'Students', value:'500+'}, {label:'Courses', value:'50+'}, {label:'Instructors', value:'20+'}, {label:'Pass Rate', value:'98%'}] },
    features:   { id, type, title: 'Why Choose Us', items: [{icon:'fa-video',title:'HD Video Lessons',desc:'High-quality lectures from expert teachers'}, {icon:'fa-file-alt',title:'Past Questions',desc:'WAEC, NECO, JAMB and more'}, {icon:'fa-certificate',title:'Certificates',desc:'Earn on course completion'}, {icon:'fa-broadcast-tower',title:'Live Classes',desc:'Real-time interactive sessions'}] },
    cta:        { id, type, title: 'Ready to Start Learning?', subtitle: 'Join hundreds of students already learning with us.', btn_text: 'Create Free Account', btn_url: '' },
    heading:    { id, type, text: 'Section Heading', level: 'h2', align: 'center' },
    paragraph:  { id, type, text: 'Add your paragraph text here. You can tell your story, describe your school, or share any information.', align: 'left' },
    divider:    { id, type, style: 'solid' },
    spacer:     { id, type, height: 40 },
    image:      { id, type, src: '', alt: '', caption: '', width: '100%' },
    video:      { id, type, url: '', caption: '' },
    button:     { id, type, text: 'Click Here', url: '#', style: 'primary', align: 'center' },
    html:       { id, type, code: '<p>Enter your custom HTML here</p>' },
    'courses-list': { id, type, title: 'Our Courses', subtitle: 'Carefully crafted to help you pass', limit: 8 },
    'pq-list':  { id, type, title: 'Past Questions', subtitle: 'Practice with real exam papers', limit: 6 },
    contact:    { id, type, address: '', phone: '', email: '', hours: '' },
    social:     { id, type, facebook: '', twitter: '', instagram: '', youtube: '', whatsapp: '' },
    faq:        { id, type, title: 'Frequently Asked Questions', items: [{q:'How do I enroll?', a:'Click "Get Started Free" and create your account.'}, {q:'What payment methods are accepted?', a:'We accept card payments and bank transfers.'}] },
    testimonials: { id, type, title: 'What Our Students Say', items: [{name:'Adaeze O.', role:'WAEC Student', text:'Excellent courses that helped me pass my exams!'}, {name:'Emeka K.', role:'JAMB Candidate', text:'The past questions were spot on. Highly recommended!'}, {name:'Fatima B.', role:'University Student', text:'Amazing platform. The instructors are very knowledgeable.'}] }
  };
  return defaults[type] || { id, type };
}

// ─── BLOCK RENDERERS (preview in canvas) ────────────────────────────────────
function _pbRenderBlock(blk, p, a, bg) {
  var html = '';
  var pLight = p + '18';
  var aLight = a + '18';

  switch(blk.type) {
    case 'hero':
      html = '<div style="min-height:280px;display:flex;align-items:center;justify-content:center;text-align:center;padding:48px 32px;background:radial-gradient(ellipse at 30% 50%,' + pLight + ',transparent 60%),radial-gradient(ellipse at 70% 50%,' + aLight + ',transparent 60%),' + bg + ';border-radius:12px;position:relative;overflow:hidden;">' +
        '<div style="position:relative;z-index:1;">' +
          '<div style="display:inline-flex;align-items:center;gap:6px;background:' + p + '18;border:1px solid ' + p + '35;color:' + p + ';padding:5px 16px;border-radius:99px;font-size:.75rem;font-weight:700;margin-bottom:18px;"><i class="fas fa-graduation-cap"></i> Your School Name</div>' +
          '<h1 style="font-size:clamp(1.5rem,4vw,2.5rem);font-weight:900;margin-bottom:12px;line-height:1.15;">' + (blk.title || '') + '</h1>' +
          '<p style="opacity:.6;max-width:480px;margin:0 auto 24px;font-size:.95rem;line-height:1.7;">' + (blk.subtitle || '') + '</p>' +
          (blk.show_cta ? '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
            '<span style="background:linear-gradient(135deg,' + p + ',' + a + ');color:#fff;padding:11px 28px;border-radius:10px;font-weight:700;font-size:.875rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;"><i class="fas fa-rocket"></i>' + (blk.cta_text || 'Get Started') + '</span>' +
            '<span style="border:2px solid ' + p + '44;color:rgba(255,255,255,.8);padding:11px 28px;border-radius:10px;font-weight:600;font-size:.875rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;"><i class="fas fa-book-open"></i>' + (blk.cta2_text || 'Browse') + '</span>' +
          '</div>' : '') +
        '</div>' +
      '</div>';
      break;

    case 'stats':
      var statsHtml = (blk.stats || []).map(function(s) {
        return '<div style="text-align:center;">' +
          '<div style="font-size:2rem;font-weight:900;color:' + p + ';line-height:1;">' + s.value + '</div>' +
          '<div style="font-size:.8rem;opacity:.5;margin-top:3px;">' + s.label + '</div>' +
        '</div>';
      }).join('');
      html = '<div style="padding:36px 24px;background:' + p + '0a;border-top:1px solid ' + p + '18;border-bottom:1px solid ' + p + '18;border-radius:12px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:24px;max-width:600px;margin:0 auto;">' + statsHtml + '</div>' +
      '</div>';
      break;

    case 'features':
      var featHtml = (blk.items || []).map(function(f, i) {
        var c = i % 2 === 0 ? p : a;
        return '<div style="padding:20px;background:' + c + '08;border:1px solid ' + c + '14;border-radius:12px;">' +
          '<div style="width:42px;height:42px;background:' + c + '18;border-radius:10px;display:flex;align-items:center;justify-content:center;color:' + c + ';font-size:1.1rem;margin-bottom:12px;"><i class="fas ' + (f.icon||'fa-star') + '"></i></div>' +
          '<div style="font-weight:700;font-size:.88rem;margin-bottom:5px;">' + f.title + '</div>' +
          '<div style="font-size:.78rem;opacity:.5;line-height:1.6;">' + f.desc + '</div>' +
        '</div>';
      }).join('');
      html = '<div style="padding:28px 20px;">' +
        (blk.title ? '<h2 style="text-align:center;font-size:1.4rem;font-weight:900;margin-bottom:24px;">' + blk.title + '</h2>' : '') +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;">' + featHtml + '</div>' +
      '</div>';
      break;

    case 'cta':
      html = '<div style="padding:48px 32px;text-align:center;background:linear-gradient(135deg,' + p + '18,' + a + '10);border:1px solid ' + p + '22;border-radius:16px;">' +
        '<i class="fas fa-bullhorn" style="font-size:2rem;color:' + p + ';margin-bottom:12px;display:block;"></i>' +
        '<h2 style="font-size:1.6rem;font-weight:900;margin-bottom:8px;">' + (blk.title || '') + '</h2>' +
        '<p style="opacity:.6;margin-bottom:22px;font-size:.92rem;">' + (blk.subtitle || '') + '</p>' +
        '<span style="background:linear-gradient(135deg,' + p + ',' + a + ');color:#fff;padding:12px 30px;border-radius:10px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px;"><i class="fas fa-user-plus"></i>' + (blk.btn_text || 'Join Now') + '</span>' +
      '</div>';
      break;

    case 'heading':
      var tag = blk.level || 'h2';
      var sizes = {h1:'2rem',h2:'1.6rem',h3:'1.3rem',h4:'1.1rem'};
      html = '<div style="padding:16px 0;text-align:' + (blk.align||'center') + ';">' +
        '<' + tag + ' style="font-size:' + (sizes[tag]||'1.5rem') + ';font-weight:900;letter-spacing:-.02em;">' + (blk.text||'Heading') + '</' + tag + '>' +
      '</div>';
      break;

    case 'paragraph':
      html = '<div style="padding:12px 0;text-align:' + (blk.align||'left') + ';"><p style="line-height:1.75;opacity:.75;font-size:.95rem;">' + (blk.text||'') + '</p></div>';
      break;

    case 'divider':
      html = '<div style="padding:16px 0;"><hr style="border:none;border-top:1px solid rgba(255,255,255,.1);"></div>';
      break;

    case 'spacer':
      html = '<div style="height:' + (blk.height||40) + 'px;"></div>';
      break;

    case 'image':
      html = blk.src
        ? '<div style="text-align:center;padding:8px 0;"><img src="' + blk.src + '" alt="' + (blk.alt||'') + '" style="max-width:' + (blk.width||'100%') + ';border-radius:12px;">' + (blk.caption ? '<p style="font-size:.78rem;opacity:.45;margin-top:8px;">' + blk.caption + '</p>' : '') + '</div>'
        : '<div style="padding:32px;text-align:center;background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.12);border-radius:12px;opacity:.6;"><i class="fas fa-image" style="font-size:2rem;display:block;margin-bottom:8px;"></i><span style="font-size:.82rem;">Add an image URL in settings</span></div>';
      break;

    case 'video':
      html = blk.url
        ? '<div style="aspect-ratio:16/9;border-radius:12px;overflow:hidden;"><iframe src="' + _pbYouTubeEmbed(blk.url) + '" style="width:100%;height:100%;border:none;" allowfullscreen></iframe></div>'
        : '<div style="padding:32px;text-align:center;background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.12);border-radius:12px;opacity:.6;"><i class="fas fa-play-circle" style="font-size:2rem;display:block;margin-bottom:8px;"></i><span style="font-size:.82rem;">Add a YouTube/Vimeo URL in settings</span></div>';
      break;

    case 'button':
      var btnStyle = blk.style === 'outline'
        ? 'border:2px solid ' + p + ';color:' + p + ';background:transparent;'
        : 'background:linear-gradient(135deg,' + p + ',' + a + ');color:#fff;';
      html = '<div style="text-align:' + (blk.align||'center') + ';padding:12px 0;">' +
        '<span style="' + btnStyle + 'padding:11px 28px;border-radius:10px;font-weight:700;cursor:pointer;font-size:.9rem;display:inline-flex;align-items:center;gap:7px;"><i class="fas fa-hand-pointer"></i>' + (blk.text||'Button') + '</span>' +
      '</div>';
      break;

    case 'html':
      html = '<div style="padding:8px 0;">' + (blk.code || '') + '</div>';
      break;

    case 'courses-list':
      html = '<div style="padding:16px 0;">' +
        '<h2 style="text-align:center;font-size:1.4rem;font-weight:900;margin-bottom:8px;">' + (blk.title || 'Our Courses') + '</h2>' +
        '<p style="text-align:center;opacity:.5;font-size:.88rem;margin-bottom:20px;">' + (blk.subtitle || '') + '</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;">' +
          ['Mathematics','English','Biology','Physics'].map(function(s) {
            return '<div style="background:' + p + '0a;border:1px solid ' + p + '18;border-radius:12px;padding:16px;"><i class="fas fa-book-open" style="color:' + p + ';margin-bottom:8px;display:block;"></i><div style="font-weight:700;font-size:.85rem;">' + s + '</div><div style="font-size:.72rem;opacity:.45;margin-top:3px;">24 lessons</div></div>';
          }).join('') +
        '</div>' +
        '<p style="text-align:center;font-size:.75rem;opacity:.3;margin-top:14px;"><i class="fas fa-info-circle"></i> Live courses from your site will appear here</p>' +
      '</div>';
      break;

    case 'pq-list':
      html = '<div style="padding:16px 0;">' +
        '<h2 style="text-align:center;font-size:1.4rem;font-weight:900;margin-bottom:8px;">' + (blk.title || 'Past Questions') + '</h2>' +
        '<p style="text-align:center;opacity:.5;font-size:.88rem;margin-bottom:20px;">' + (blk.subtitle || '') + '</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">' +
          ['WAEC Mathematics 2023','JAMB Biology 2023','NECO Physics 2022'].map(function(s) {
            return '<div style="background:' + a + '0a;border:1px solid ' + a + '18;border-radius:12px;padding:16px;"><i class="fas fa-file-pdf" style="color:' + a + ';margin-bottom:8px;display:block;"></i><div style="font-weight:700;font-size:.82rem;">' + s + '</div></div>';
          }).join('') +
        '</div>' +
        '<p style="text-align:center;font-size:.75rem;opacity:.3;margin-top:14px;"><i class="fas fa-info-circle"></i> Live past questions from your site will appear here</p>' +
      '</div>';
      break;

    case 'faq':
      var faqHtml = (blk.items || []).map(function(f) {
        return '<div style="border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px 16px;margin-bottom:8px;">' +
          '<div style="font-weight:700;font-size:.88rem;margin-bottom:6px;display:flex;align-items:center;gap:8px;"><i class="fas fa-question-circle" style="color:' + p + ';font-size:.8rem;"></i>' + f.q + '</div>' +
          '<div style="font-size:.82rem;opacity:.55;line-height:1.65;">' + f.a + '</div>' +
        '</div>';
      }).join('');
      html = '<div style="padding:16px 0;">' +
        (blk.title ? '<h2 style="text-align:center;font-size:1.4rem;font-weight:900;margin-bottom:22px;">' + blk.title + '</h2>' : '') +
        faqHtml +
      '</div>';
      break;

    case 'testimonials':
      var testiHtml = (blk.items || []).map(function(t, i) {
        return '<div style="padding:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;">' +
          '<div style="color:#F59E0B;font-size:.85rem;margin-bottom:8px;letter-spacing:2px;">★★★★★</div>' +
          '<p style="font-size:.82rem;opacity:.65;line-height:1.65;margin-bottom:14px;">"' + t.text + '"</p>' +
          '<div style="display:flex;align-items:center;gap:9px;">' +
            '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,' + p + ',' + a + ');display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;color:#fff;">' + (t.name||'?')[0] + '</div>' +
            '<div><div style="font-weight:700;font-size:.82rem;">' + t.name + '</div><div style="font-size:.7rem;opacity:.4;">' + t.role + '</div></div>' +
          '</div>' +
        '</div>';
      }).join('');
      html = '<div style="padding:16px 0;">' +
        (blk.title ? '<h2 style="text-align:center;font-size:1.4rem;font-weight:900;margin-bottom:22px;">' + blk.title + '</h2>' : '') +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">' + testiHtml + '</div>' +
      '</div>';
      break;

    case 'contact':
      html = '<div style="padding:24px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;">' +
        (blk.address ? '<div><i class="fas fa-map-marker-alt" style="color:' + p + ';margin-right:7px;"></i><span style="font-size:.85rem;">' + blk.address + '</span></div>' : '') +
        (blk.phone   ? '<div><i class="fas fa-phone" style="color:' + p + ';margin-right:7px;"></i><span style="font-size:.85rem;">' + blk.phone + '</span></div>' : '') +
        (blk.email   ? '<div><i class="fas fa-envelope" style="color:' + p + ';margin-right:7px;"></i><span style="font-size:.85rem;">' + blk.email + '</span></div>' : '') +
        (blk.hours   ? '<div><i class="fas fa-clock" style="color:' + p + ';margin-right:7px;"></i><span style="font-size:.85rem;">' + blk.hours + '</span></div>' : '') +
      '</div>';
      break;

    case 'social':
      var socials = [{k:'facebook',icon:'fa-facebook-f'},{k:'twitter',icon:'fa-twitter'},{k:'instagram',icon:'fa-instagram'},{k:'youtube',icon:'fa-youtube'},{k:'whatsapp',icon:'fa-whatsapp'}];
      var socialLinks = socials.filter(function(s){return blk[s.k];}).map(function(s) {
        return '<a href="' + blk[s.k] + '" target="_blank" style="width:38px;height:38px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.7);text-decoration:none;transition:all .15s;"><i class="fab ' + s.icon + '"></i></a>';
      }).join('');
      html = '<div style="padding:16px 0;text-align:center;">' +
        '<p style="font-size:.82rem;opacity:.5;margin-bottom:12px;">Follow Us</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' + (socialLinks || '<span style="opacity:.3;font-size:.82rem;">No social links set</span>') + '</div>' +
      '</div>';
      break;

    default:
      html = '<div style="padding:24px;text-align:center;background:rgba(255,255,255,.04);border-radius:12px;opacity:.5;"><i class="fas fa-cube" style="margin-right:7px;"></i>' + blk.type + ' block</div>';
  }

  return html;
}

function _pbYouTubeEmbed(url) {
  if (!url) return '';
  var m = url.match(/(?:v=|youtu\.be\/|embed\/)([\\w-]{11})/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : url;
}

// ─── CANVAS RENDERING ────────────────────────────────────────────────────────
function _pbRenderCanvas() {
  var canvas = document.getElementById('builder-canvas');
  if (!canvas) return;

  var p = _pbSite?.primary_color  || '#7C3AED';
  var a = _pbSite?.accent_color   || '#06D6A0';
  var bg = _pbSite?.bg_color      || '#0f172a';

  if (!_pbBlocks.length) {
    canvas.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;color:rgba(255,255,255,.3);gap:12px;">' +
      '<i class="fas fa-mouse-pointer" style="font-size:2.5rem;opacity:.25;"></i>' +
      '<div style="font-size:.9rem;">Drag elements from the panel or click to add</div>' +
    '</div>';
    return;
  }

  canvas.innerHTML = _pbBlocks.map(function(blk, idx) {
    return '<div class="pb-block" data-id="' + blk.id + '" style="position:relative;margin-bottom:6px;border-radius:14px;border:1.5px solid transparent;transition:border-color .15s;cursor:pointer;" ' +
      'onmouseenter="this.style.borderColor=\'rgba(91,125,255,.4)\'" onmouseleave="this.style.borderColor=\'transparent\'">' +
      _pbRenderBlock(blk, p, a, bg) +
      '<div style="position:absolute;top:8px;right:8px;display:flex;gap:6px;opacity:0;transition:opacity .15s;" class="pb-block-actions">' +
        '<button onclick="event.stopPropagation();pbEditBlock(\'' + blk.id + '\')" title="Edit" style="background:rgba(91,125,255,.9);border:none;color:#fff;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-pencil-alt"></i></button>' +
        (idx > 0 ? '<button onclick="event.stopPropagation();pbMoveBlock(\'' + blk.id + '\',-1)" title="Move up" style="background:rgba(30,30,60,.85);border:none;color:#fff;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-arrow-up"></i></button>' : '') +
        (idx < _pbBlocks.length-1 ? '<button onclick="event.stopPropagation();pbMoveBlock(\'' + blk.id + '\',1)" title="Move down" style="background:rgba(30,30,60,.85);border:none;color:#fff;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-arrow-down"></i></button>' : '') +
        '<button onclick="event.stopPropagation();pbDeleteBlock(\'' + blk.id + '\')" title="Delete" style="background:rgba(239,68,68,.85);border:none;color:#fff;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-trash"></i></button>' +
      '</div>' +
    '</div>';
  }).join('');

  // Show actions on hover
  canvas.querySelectorAll('.pb-block').forEach(function(el) {
    el.addEventListener('mouseenter', function() {
      var actions = el.querySelector('.pb-block-actions');
      if (actions) actions.style.opacity = '1';
    });
    el.addEventListener('mouseleave', function() {
      var actions = el.querySelector('.pb-block-actions');
      if (actions) actions.style.opacity = '0';
    });
  });
}

// ─── ELEMENT PANEL ──────────────────────────────────────────────────────────
function _pbRenderElementsPanel() {
  var panel = document.getElementById('builder-elements-panel');
  if (!panel) return;

  panel.innerHTML = _pbElementDefs.map(function(group) {
    return '<div style="margin-bottom:18px;">' +
      '<div style="font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);padding:0 2px 7px;border-bottom:1px solid var(--border);margin-bottom:8px;">' + group.group + '</div>' +
      group.items.map(function(item) {
        return '<div class="builder-elem" onclick="pbAddBlock(\'' + item.type + '\')" ' +
          'style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;cursor:pointer;margin-bottom:3px;transition:background .14s;border:1px solid transparent;" ' +
          'onmouseenter="this.style.background=\'rgba(91,125,255,.1)\';this.style.borderColor=\'rgba(91,125,255,.2)\';" ' +
          'onmouseleave="this.style.background=\'\';this.style.borderColor=\'transparent\';">' +
          '<div style="width:30px;height:30px;border-radius:7px;background:rgba(91,125,255,.12);color:#818CF8;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;"><i class="fas ' + item.icon + '"></i></div>' +
          '<span style="font-size:.83rem;font-weight:500;">' + item.label + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }).join('');
}

// ─── PUBLIC API (called from index.html) ────────────────────────────────────

// Load builder for a page
window.loadBuilderPage = async function() {
  var page = document.getElementById('pb-page-select')?.value || 'homepage';
  var canvas = document.getElementById('builder-canvas');
  if (canvas) canvas.innerHTML = '<div style="text-align:center;padding:40px;opacity:.5;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i></div>';

  // Load site + page data
  var data = await http.get('/pagebuilder/admin-load?page=' + page).catch(function(){return null;});
  _pbSite = data?.site || null;

  _pbBlocks = [];
  if (data?.page_data?.page_data) {
    try {
      var parsed = typeof data.page_data.page_data === 'string'
        ? JSON.parse(data.page_data.page_data)
        : data.page_data.page_data;
      _pbBlocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
    } catch(e) {}
  }

  _pbRenderElementsPanel();
  _pbRenderCanvas();
  _pbDirty = false;

  // Update quick-settings panel and site indicator
  _pbUpdateQuickSettings();
  window._pbUpdateSiteIndicator && window._pbUpdateSiteIndicator();

  // Sync hex color inputs from color pickers
  ['primary','accent','bg'].forEach(function(k) {
    var picker = document.getElementById('qs-'+k);
    var hex    = document.getElementById('qs-'+k+'-hex');
    if (picker && hex) hex.value = picker.value;
  });
};

// Add a block to canvas
window.pbAddBlock = function(type) {
  var blk = _pbDefaultBlock(type);
  _pbBlocks.push(blk);
  _pbDirty = true;
  _pbRenderCanvas();
  // Scroll to bottom of canvas
  var canvas = document.getElementById('builder-canvas');
  if (canvas) canvas.scrollTop = canvas.scrollHeight;
};

// Delete a block
window.pbDeleteBlock = function(id) {
  _pbBlocks = _pbBlocks.filter(function(b){return b.id !== id;});
  _pbDirty = true;
  _pbRenderCanvas();
};

// Move a block up or down
window.pbMoveBlock = function(id, dir) {
  var idx = _pbBlocks.findIndex(function(b){return b.id === id;});
  if (idx < 0) return;
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= _pbBlocks.length) return;
  var tmp = _pbBlocks[idx];
  _pbBlocks[idx] = _pbBlocks[newIdx];
  _pbBlocks[newIdx] = tmp;
  _pbDirty = true;
  _pbRenderCanvas();
};

// Open edit modal for a block
window.pbEditBlock = function(id) {
  var blk = _pbBlocks.find(function(b){return b.id === id;});
  if (!blk) return;

  var modal = document.getElementById('edit-modal');
  var titleEl = document.getElementById('edit-modal-title');
  var fieldsEl = document.getElementById('edit-modal-fields');
  if (!modal || !fieldsEl) return;

  titleEl.textContent = 'Edit: ' + blk.type.charAt(0).toUpperCase() + blk.type.slice(1);

  // Store current block id for saveBlockEdit
  modal._editingBlockId = id;

  fieldsEl.innerHTML = _pbBuildEditFields(blk);
  modal.style.display = 'flex';
};

window.closeEditModal = function() {
  var modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'none';
};

window.saveBlockEdit = function() {
  var modal = document.getElementById('edit-modal');
  if (!modal) return;
  var id = modal._editingBlockId;
  var blk = _pbBlocks.find(function(b){return b.id === id;});
  if (!blk) return;

  // Read all inputs from modal
  var inputs = document.querySelectorAll('#edit-modal-fields [data-field]');
  inputs.forEach(function(inp) {
    var field = inp.dataset.field;
    var val = inp.type === 'checkbox' ? inp.checked : inp.value;
    // Handle nested field paths like "stats[0].value"
    if (field.includes('.')) {
      // nested — skip for now, handled by JSON editor
    } else if (field === '__json') {
      try { Object.assign(blk, JSON.parse(val)); } catch(e) {}
    } else {
      blk[field] = val;
    }
  });

  _pbDirty = true;
  _pbRenderCanvas();
  closeEditModal();
};

function _pbBuildEditFields(blk) {
  // Simple field editors based on block type
  var simpleFields = {
    hero: [
      {key:'title', label:'Hero Title', type:'text'},
      {key:'subtitle', label:'Hero Subtitle', type:'textarea'},
      {key:'cta_text', label:'Primary Button Text', type:'text'},
      {key:'cta2_text', label:'Secondary Button Text', type:'text'},
      {key:'show_cta', label:'Show Buttons', type:'checkbox'},
    ],
    heading: [
      {key:'text', label:'Heading Text', type:'text'},
      {key:'level', label:'Heading Level', type:'select', options:['h1','h2','h3','h4']},
      {key:'align', label:'Alignment', type:'select', options:['left','center','right']},
    ],
    paragraph: [
      {key:'text', label:'Text Content', type:'textarea'},
      {key:'align', label:'Alignment', type:'select', options:['left','center','right']},
    ],
    cta: [
      {key:'title', label:'Title', type:'text'},
      {key:'subtitle', label:'Subtitle', type:'text'},
      {key:'btn_text', label:'Button Text', type:'text'},
      {key:'btn_url', label:'Button URL', type:'text'},
    ],
    image: [
      {key:'src', label:'Image URL', type:'text'},
      {key:'alt', label:'Alt Text', type:'text'},
      {key:'caption', label:'Caption', type:'text'},
      {key:'width', label:'Width (e.g. 100%, 600px)', type:'text'},
    ],
    video: [
      {key:'url', label:'YouTube / Vimeo URL', type:'text'},
      {key:'caption', label:'Caption', type:'text'},
    ],
    button: [
      {key:'text', label:'Button Text', type:'text'},
      {key:'url', label:'URL', type:'text'},
      {key:'style', label:'Style', type:'select', options:['primary','outline']},
      {key:'align', label:'Alignment', type:'select', options:['left','center','right']},
    ],
    html: [
      {key:'code', label:'Custom HTML', type:'textarea-code'},
    ],
    spacer: [
      {key:'height', label:'Height (px)', type:'number'},
    ],
    'courses-list': [
      {key:'title', label:'Section Title', type:'text'},
      {key:'subtitle', label:'Subtitle', type:'text'},
      {key:'limit', label:'Max courses to show', type:'number'},
    ],
    'pq-list': [
      {key:'title', label:'Section Title', type:'text'},
      {key:'subtitle', label:'Subtitle', type:'text'},
      {key:'limit', label:'Max items to show', type:'number'},
    ],
    contact: [
      {key:'address', label:'Address', type:'text'},
      {key:'phone', label:'Phone', type:'text'},
      {key:'email', label:'Email', type:'text'},
      {key:'hours', label:'Office Hours', type:'text'},
    ],
    social: [
      {key:'facebook', label:'Facebook URL', type:'text'},
      {key:'twitter', label:'Twitter/X URL', type:'text'},
      {key:'instagram', label:'Instagram URL', type:'text'},
      {key:'youtube', label:'YouTube URL', type:'text'},
      {key:'whatsapp', label:'WhatsApp number', type:'text'},
    ],
  };

  var fields = simpleFields[blk.type];

  if (fields) {
    return fields.map(function(f) {
      var val = blk[f.key] !== undefined ? blk[f.key] : '';
      var inputHtml = '';
      if (f.type === 'text' || f.type === 'number') {
        inputHtml = '<input class="form-control" data-field="' + f.key + '" value="' + _pbEsc(String(val)) + '" type="' + f.type + '" style="font-size:.85rem;">';
      } else if (f.type === 'textarea') {
        inputHtml = '<textarea class="form-control" data-field="' + f.key + '" rows="3" style="font-size:.85rem;">' + _pbEsc(String(val)) + '</textarea>';
      } else if (f.type === 'textarea-code') {
        inputHtml = '<textarea class="form-control" data-field="' + f.key + '" rows="8" style="font-family:monospace;font-size:.8rem;">' + _pbEsc(String(val)) + '</textarea>';
      } else if (f.type === 'checkbox') {
        inputHtml = '<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" data-field="' + f.key + '" ' + (val ? 'checked' : '') + '><span style="font-size:.85rem;">Enabled</span></label>';
      } else if (f.type === 'select') {
        inputHtml = '<select class="form-control" data-field="' + f.key + '" style="font-size:.85rem;">' +
          f.options.map(function(o){return '<option value="' + o + '" ' + (val===o?'selected':'') + '>' + o + '</option>';}).join('') +
        '</select>';
      }
      return '<div class="form-group"><label class="form-label">' + f.label + '</label>' + inputHtml + '</div>';
    }).join('');
  }

  // Fallback: JSON editor for complex blocks (stats, features, faq, etc.)
  return '<div class="form-group"><label class="form-label" style="margin-bottom:6px;">Edit block data (JSON)</label>' +
    '<textarea class="form-control" data-field="__json" rows="12" style="font-family:monospace;font-size:.78rem;">' +
      _pbEsc(JSON.stringify(blk, null, 2)) +
    '</textarea></div>' +
    '<p style="font-size:.75rem;color:var(--text-muted);margin-top:-8px;">Advanced: edit the block\'s JSON data directly.</p>';
}

function _pbEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Save draft or publish
window.saveBuilderPage = async function(publish) {
  var page = document.getElementById('pb-page-select')?.value || 'homepage';
  var pageNames = {homepage:'Home',about:'About',contact:'Contact',custom:'Custom'};

  var saveBtn = publish
    ? document.querySelector('[onclick*="saveBuilderPage(true)"]')
    : document.querySelector('[onclick*="saveBuilderPage(false)"]');

  if (saveBtn) setLoading(saveBtn, true);

  // Collect quick-settings overrides
  var extras = _pbGetQuickSettings();

  var payload = {
    page_slug: page,
    page_name: pageNames[page] || page,
    page_data: Object.assign({}, extras, { blocks: _pbBlocks }),
    is_published: publish,
  };

  var r = await http.post('/pagebuilder/save', payload).catch(function(){return null;});
  if (saveBtn) setLoading(saveBtn, false);

  if (r?.ok) {
    _pbDirty = false;
    Toast.success(publish
      ? '🚀 Published! Your live site has been updated.'
      : '💾 Draft saved!');
  } else {
    Toast.error((r?.message) || 'Save failed. Please try again.');
  }
};

// Quick settings (colors, fonts, hero text)
function _pbUpdateQuickSettings() {
  // The quick settings panel is rendered in the page builder tab
  var qs = document.getElementById('pb-quick-settings');
  if (!qs || !_pbSite) return;

  var s = _pbSite;
  var fields = [
    {id:'qs-school-name', val: s.school_name || ''},
    {id:'qs-hero-title', val: s.hero_title || ''},
    {id:'qs-hero-sub', val: s.hero_subtitle || ''},
    {id:'qs-primary', val: s.primary_color || '#7C3AED'},
    {id:'qs-accent', val: s.accent_color || '#06D6A0'},
    {id:'qs-bg', val: s.bg_color || '#0f172a'},
  ];
  fields.forEach(function(f) {
    var el = document.getElementById(f.id);
    if (el) el.value = f.val;
  });
}

function _pbGetQuickSettings() {
  var get = function(id) { var el = document.getElementById(id); return el ? el.value : null; };
  var res = {};
  var school = get('qs-school-name'); if (school) res.school_name = school;
  var ht = get('qs-hero-title'); if (ht) res.hero_title = ht;
  var hs = get('qs-hero-sub'); if (hs) res.hero_subtitle = hs;
  var p = get('qs-primary'); if (p) res.primary_color = p;
  var a = get('qs-accent'); if (a) res.accent_color = a;
  var bg = get('qs-bg'); if (bg) res.bg_color = bg;
  return res;
}

// Save quick settings directly to site (live update without full page save)
window.saveQuickSettings = async function() {
  var settings = _pbGetQuickSettings();
  if (!Object.keys(settings).length) return;
  var r = await http.post('/pagebuilder/update-site', settings).catch(function(){return null;});
  if (r?.ok) {
    if (_pbSite) Object.assign(_pbSite, settings);
    _pbRenderCanvas();
    Toast.success('Site settings saved!');
  } else {
    Toast.error('Failed to save settings');
  }
};

// Preview site in new tab
window.previewSite = function() {
  if (_pbSite?.subdomain) {
    window.open('/site/' + _pbSite.subdomain, '_blank');
  } else {
    Toast.error('Site not set up yet');
  }
};

// Search elements
window.pbSearchElements = function(q) {
  q = q.toLowerCase().trim();
  document.querySelectorAll('#builder-elements-panel .builder-elem').forEach(function(el) {
    el.style.display = (!q || el.textContent.toLowerCase().includes(q)) ? 'flex' : 'none';
  });
  document.querySelectorAll('#builder-elements-panel > div').forEach(function(g) {
    var visible = Array.from(g.querySelectorAll('.builder-elem')).some(function(e){ return e.style.display !== 'none'; });
    g.style.display = visible ? 'block' : 'none';
  });
};
// Real-time color picker sync (color ↔ hex input)
window._pbSyncColor = function(pickerId, hexId) {
  var hex = document.getElementById(hexId);
  var picker = document.getElementById(pickerId);
  if (hex && picker && /^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
    picker.value = hex.value;
    _pbQuickUpdate();
  }
};

// Live preview update from quick settings
window._pbQuickUpdate = function() {
  // Sync hex inputs from color pickers
  ['primary','accent','bg'].forEach(function(k) {
    var picker = document.getElementById('qs-'+k);
    var hex    = document.getElementById('qs-'+k+'-hex');
    if (picker && hex && hex !== document.activeElement) hex.value = picker.value;
  });
  // Re-render canvas with new colors
  if (_pbSite) {
    var p  = (document.getElementById('qs-primary')?.value)  || _pbSite.primary_color  || '#7C3AED';
    var a  = (document.getElementById('qs-accent')?.value)   || _pbSite.accent_color   || '#06D6A0';
    var bg = (document.getElementById('qs-bg')?.value)       || _pbSite.bg_color       || '#0f172a';
    // Temporarily override for live preview
    var saved = {p:_pbSite.primary_color, a:_pbSite.accent_color, bg:_pbSite.bg_color};
    _pbSite.primary_color = p; _pbSite.accent_color = a; _pbSite.bg_color = bg;
    _pbRenderCanvas();
    // Restore (settings only officially saved on saveQuickSettings())
    _pbSite.primary_color = saved.p; _pbSite.accent_color = saved.a; _pbSite.bg_color = saved.bg;
  }
};

// Update site indicator in page builder tab
window._pbUpdateSiteIndicator = function() {
  if (!_pbSite) return;
  var ind = document.getElementById('pb-site-name-indicator');
  if (ind) ind.textContent = _pbSite.school_name || _pbSite.subdomain || 'Your Site';
  var viewBtn = document.getElementById('pb-view-site-btn');
  if (viewBtn && _pbSite.subdomain) viewBtn.href = '/site/' + _pbSite.subdomain;
};