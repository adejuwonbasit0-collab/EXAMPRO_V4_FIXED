// builder/widgets/GalleryWidget.jsx

import { useState } from 'react';

const ASPECT_MAP = { '1:1': '100%', '4:3': '75%', '16:9': '56.25%', '3:4': '133.33%' };

export default function GalleryWidget({ settings: s, device }) {
  const [lbIdx, setLbIdx] = useState(null);

  const cols = device === 'mobile' ? 1
             : device === 'tablet' ? Math.min(s.columns || 3, 2)
             : (s.columns || 3);

  const pb = ASPECT_MAP[s.image_ratio || '1:1'] || '100%';

  if (!s.images?.length) {
    return (
      <div style={{ padding: '32px', border: '2px dashed rgba(255,255,255,.1)', borderRadius: '10px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: '.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '2rem', opacity: .4 }}>🗃</span>
        Add images in Content settings
      </div>
    );
  }

  const goTo = (i) => setLbIdx(Math.max(0, Math.min(s.images.length - 1, i)));

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: `${s.row_gap || 12}px ${s.column_gap || 12}px`,
      }}>
        {s.images.map((img, i) => (
          <div
            key={img.id || i}
            onClick={() => s.lightbox && setLbIdx(i)}
            style={{
              position: 'relative', paddingBottom: pb, overflow: 'hidden',
              borderRadius: `${s.border_radius || 8}px`,
              cursor: s.lightbox ? 'zoom-in' : 'default',
            }}
          >
            <img
              src={img.src} alt={img.alt || ''}
              loading="lazy"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', transition: 'transform .35s ease, filter .35s ease',
              }}
              onMouseEnter={e => {
                if (s.hover_effect === 'zoom')      e.currentTarget.style.transform = 'scale(1.07)';
                if (s.hover_effect === 'grayscale') e.currentTarget.style.filter    = 'grayscale(100%)';
                if (s.hover_effect === 'fade')      e.currentTarget.style.opacity   = '0.7';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.filter    = '';
                e.currentTarget.style.opacity   = '';
              }}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lbIdx !== null && (
        <div
          onClick={() => setLbIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img src={s.images[lbIdx]?.src} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          {lbIdx > 0 && (
            <LbButton side="left" onClick={e => { e.stopPropagation(); goTo(lbIdx - 1); }}>‹</LbButton>
          )}
          {lbIdx < s.images.length - 1 && (
            <LbButton side="right" onClick={e => { e.stopPropagation(); goTo(lbIdx + 1); }}>›</LbButton>
          )}
          <button onClick={() => setLbIdx(null)} style={{ position: 'fixed', top: '16px', right: '20px', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>
      )}
    </>
  );
}

function LbButton({ side, onClick, children }) {
  return (
    <button onClick={onClick} style={{ position: 'fixed', [side]: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}
