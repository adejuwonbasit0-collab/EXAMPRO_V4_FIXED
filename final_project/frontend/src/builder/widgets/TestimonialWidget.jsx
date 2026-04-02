// builder/widgets/TestimonialWidget.jsx

import { useState } from 'react';

function StarRating({ n = 5 }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: '.85rem', color: i <= n ? '#F59E0B' : 'rgba(255,255,255,.18)' }}>★</span>
      ))}
    </div>
  );
}

function TestiCard({ item, s }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           '14px',
      height:        '100%',
      background:    s.card_bg      || 'rgba(255,255,255,.03)',
      border:        s.card_style === 'bordered' ? '1px solid rgba(255,255,255,.1)' : 'none',
      borderRadius:  `${s.border_radius || 16}px`,
      padding:       `${s.card_padding || 24}px`,
      boxShadow:     s.card_style === 'shadow' ? '0 4px 24px rgba(0,0,0,.3)' : 'none',
    }}>
      {s.quote_icon && (
        <span style={{ fontSize: '1.8rem', lineHeight: 1, color: 'var(--color-primary, #7C3AED)', opacity: .35 }}>"</span>
      )}
      <p style={{
        color: 'rgba(255,255,255,.8)', lineHeight: 1.7, fontSize: '.9rem',
        margin: 0, textAlign: s.text_align || 'left', flex: 1,
      }}>
        {item.quote}
      </p>
      {s.show_rating && <StarRating n={item.rating || 5} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
        {s.show_avatar && (
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.avatar
              ? <img src={item.avatar} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1rem', opacity: .4 }}>👤</span>
            }
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#fff' }}>{item.name}</div>
          {item.role && <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.4)', marginTop: '2px' }}>{item.role}</div>}
        </div>
      </div>
    </div>
  );
}

export default function TestimonialWidget({ settings: s, device }) {
  const [slide, setSlide] = useState(0);
  const items = s.items || [];
  const cols  = device === 'mobile' ? 1
               : device === 'tablet' ? Math.min(s.columns || 3, 2)
               : (s.columns || 3);

  if (!items.length) {
    return <div style={{ padding: '28px', border: '2px dashed rgba(255,255,255,.1)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: '.8rem' }}>💬 Add testimonials in Content settings</div>;
  }

  if (s.layout === 'carousel') {
    return (
      <div>
        <TestiCard item={items[slide]} s={s} />
        {items.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            {items.map((_, i) => (
              <div key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === slide ? 'var(--color-primary, #7C3AED)' : 'rgba(255,255,255,.2)', cursor: 'pointer', transition: 'all .25s' }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px', alignItems: 'stretch' }}>
      {items.map(item => <TestiCard key={item.id} item={item} s={s} />)}
    </div>
  );
}
