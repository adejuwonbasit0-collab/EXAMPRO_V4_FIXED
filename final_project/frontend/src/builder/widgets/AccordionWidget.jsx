// builder/widgets/AccordionWidget.jsx

import { useState } from 'react';

export default function AccordionWidget({ settings: s }) {
  const initOpen = Object.fromEntries(
    (s.items || []).filter(i => i.open).map(i => [i.id, true])
  );
  const [open, setOpen] = useState(initOpen);

  const toggle = (id) => {
    setOpen(prev => {
      if (s.allow_multiple) return { ...prev, [id]: !prev[id] };
      // Single-open: close everything else
      return prev[id] ? {} : { [id]: true };
    });
  };

  const accent = s.active_color || 'var(--color-primary, #7C3AED)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${s.item_gap || 8}px` }}>
      {(s.items || []).map(item => {
        const isOpen  = !!open[item.id];
        const bordered = s.item_style === 'bordered';
        const filled   = s.item_style === 'filled';

        return (
          <div key={item.id} style={{
            borderRadius: `${s.border_radius || 8}px`,
            border:       bordered ? '1px solid rgba(255,255,255,.1)' : 'none',
            background:   filled   ? 'rgba(255,255,255,.04)' : 'transparent',
            overflow:     'hidden',
          }}>
            {/* Header row */}
            <button
              onClick={() => toggle(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '12px',
                padding: '14px 18px', cursor: 'pointer', border: 'none',
                background:  isOpen ? `${accent}1a` : 'transparent',
                color:       isOpen ? accent : 'rgba(255,255,255,.85)',
                fontWeight:  isOpen ? 700 : 500, fontSize: '.875rem',
                textAlign:   'left', transition: 'all .18s', fontFamily: 'inherit',
              }}
            >
              {s.icon_position === 'left' && (
                <i className={`fas fa-${isOpen ? 'minus' : 'plus'}`}
                  style={{ color: isOpen ? accent : 'rgba(255,255,255,.3)', flexShrink: 0, fontSize: '.7rem' }} />
              )}
              <span style={{ flex: 1 }}>{item.title}</span>
              {s.icon_position !== 'left' && (
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
                  style={{ color: isOpen ? accent : 'rgba(255,255,255,.3)', flexShrink: 0, fontSize: '.7rem' }} />
              )}
            </button>

            {/* Content */}
            {isOpen && (
              <div style={{ padding: '4px 18px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <div
                  dangerouslySetInnerHTML={{ __html: item.content || '' }}
                  style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.75, fontSize: '.875rem' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
