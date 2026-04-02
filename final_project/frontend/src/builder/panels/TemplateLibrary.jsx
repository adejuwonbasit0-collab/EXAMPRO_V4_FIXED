// builder/panels/TemplateLibrary.jsx

import { useState, useEffect } from 'react';
import useBuilderStore         from '../store/useBuilderStore';

export default function TemplateLibrary() {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');

  useEffect(() => {
    // Use /api/templates/my — returns only free templates + ones this admin purchased
    const token = localStorage.getItem('ep_token') || '';
    fetch('/api/templates/my', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const applyTemplate = async (id, name) => {
    if (!confirm(`Apply template "${name}"? This will replace your current page layout.`)) return;
    const token = localStorage.getItem('ep_token') || '';
    const res = await fetch('/api/pagebuilder/apply-template', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    JSON.stringify({ template_id: id }),
    }).then(r => r.json()).catch(() => ({}));

    if (res?.ok) {
      window.Toast?.success(`Template "${name}" applied!`);
      await window.loadBuilderPage?.();
    } else {
      window.Toast?.error(res?.message || 'Failed to apply template');
    }
  };

  const filtered = filter === 'all' ? templates
    : filter === 'free'    ? templates.filter(t => !t.is_premium)
    : filter === 'premium' ? templates.filter(t => t.is_premium)
    : templates;

  if (loading) return (
    <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px', fontSize: '.82rem' }}>
      Loading your templates...
    </div>
  );

  if (!templates.length) return (
    <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px', fontSize: '.82rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎨</div>
      No templates yet. Go to <strong>My Template</strong> tab to browse and apply one.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {['all','free','premium'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '3px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '.68rem', fontWeight: 600, textTransform: 'capitalize',
            background: filter === f ? '#818CF8' : 'rgba(255,255,255,.07)',
            color: filter === f ? '#fff' : 'rgba(255,255,255,.5)',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', marginBottom: '4px' }}>
        {filtered.length} template{filtered.length !== 1 ? 's' : ''} available
      </div>

      {filtered.map(t => (
        <div key={t.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)' }}>
          <div style={{
            height: '60px',
            background: t.thumbnail
              ? `url('${t.thumbnail}') center/cover`
              : `linear-gradient(135deg, ${t.primary_color || '#7C3AED'}, ${t.accent_color || '#06D6A0'})`,
            position: 'relative',
          }}>
            {t.is_premium && (
              <span style={{ position: 'absolute', top: '5px', left: '6px', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: '#fff', fontSize: '.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                PREMIUM
              </span>
            )}
          </div>
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>{t.name}</div>
            <button
              onClick={() => applyTemplate(t.id, t.name)}
              style={{ width: '100%', background: 'rgba(129,140,248,.15)', border: '1px solid rgba(129,140,248,.3)', color: '#818CF8', borderRadius: '6px', padding: '5px', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Apply Template
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// export default function TemplateLibrary() {
//   const [templates, setTemplates] = useState([]);
//   const [loading,   setLoading]   = useState(true);

//   useEffect(() => {
//     fetch('/api/templates/public?limit=20')
//       .then(r => r.json())
//       .then(d => { setTemplates(d.templates || []); setLoading(false); })
//       .catch(() => setLoading(false));
//   }, []);

//   const applyTemplate = async (id, name) => {
//     if (!confirm(`Apply template "${name}"? This will replace your current page layout.`)) return;

//     const token = localStorage.getItem('ep_token') || '';
//     const res   = await fetch('/api/pagebuilder/apply-template', {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//       body:    JSON.stringify({ template_id: id }),
//     }).then(r => r.json());

//     if (res?.ok) {
//       window.Toast?.success(`Template "${name}" applied!`);
//       // Reload builder
//       await window.loadBuilderPage?.();
//     } else {
//       window.Toast?.error(res?.message || 'Failed to apply template');
//     }
//   };

//   if (loading) return <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px', fontSize: '.82rem' }}>Loading templates...</div>;

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//       <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.35)', marginBottom: '6px' }}>
//         Apply a template to replace the current page layout.
//       </div>
//       {templates.map(t => {
//         const td = t.template_data || {};
//         return (
//           <div key={t.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)' }}>
//             <div style={{
//               height:     '70px',
//               background: t.thumbnail_url
//                 ? `url('${t.thumbnail_url}') center/cover`
//                 : `linear-gradient(135deg, ${t.primary_color || '#7C3AED'}, ${t.accent_color || '#06D6A0'})`,
//               position:   'relative',
//             }}>
//               {t.is_premium && (
//                 <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: '#fff', fontSize: '.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
//                   PREMIUM
//                 </span>
//               )}
//             </div>
//             <div style={{ padding: '8px 10px' }}>
//               <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{t.name}</div>
//               <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', marginBottom: '8px' }}>{t.section_count} sections · {t.widget_count} widgets</div>
//               <button
//                 onClick={() => applyTemplate(t.id, t.name)}
//                 style={{ width: '100%', background: 'rgba(129,140,248,.15)', border: '1px solid rgba(129,140,248,.3)', color: '#818CF8', borderRadius: '6px', padding: '5px', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer' }}
//               >
//                 Apply Template
//               </button>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }
