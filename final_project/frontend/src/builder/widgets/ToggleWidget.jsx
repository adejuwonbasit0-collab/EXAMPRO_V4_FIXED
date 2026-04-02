// builder/widgets/ToggleWidget.jsx

import { useState } from 'react';

export default function ToggleWidget({ settings: s }) {
  const initOpen = Object.fromEntries(
    (s.items || []).filter(i => i.open).map(i => [i.id, true])
  );
  const [open, setOpen] = useState(initOpen);
  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const iconColor = s.icon_color || 'var(--color-primary, #7C3AED)';
  const isCard    = s.item_style === 'card';
  const isMinimal = !isCard; // default

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${s.item_gap || 8}px` }}>
      {(s.items || []).map(item => {
        const isOpen = !!open[item.id];
        return (
          <div key={item.id} style={{
            borderBottom:  isMinimal ? '1px solid rgba(255,255,255,.08)' : 'none',
            borderRadius:  isCard    ? '10px' : '0',
            background:    isCard    ? 'rgba(255,255,255,.04)' : 'transparent',
            overflow:      'hidden',
          }}>
            <button
              onClick={() => toggle(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: isCard ? '14px 16px' : '10px 0',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,.85)', fontWeight: 500,
                fontSize: '.875rem', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <i
                className={`fas ${isOpen ? (s.icon_open || 'fa-minus') : (s.icon_closed || 'fa-plus')}`}
                style={{ color: iconColor, fontSize: '.78rem', width: '14px', flexShrink: 0 }}
              />
              <span>{item.title}</span>
            </button>

            {isOpen && (
              <div style={{ padding: isCard ? '0 16px 14px 42px' : '0 0 10px 26px' }}>
                <div
                  dangerouslySetInnerHTML={{ __html: item.content || '' }}
                  style={{ color: 'rgba(255,255,255,.65)', lineHeight: 1.75, fontSize: '.875rem' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
