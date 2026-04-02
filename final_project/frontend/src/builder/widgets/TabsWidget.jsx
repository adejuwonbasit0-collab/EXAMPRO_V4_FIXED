// builder/widgets/TabsWidget.jsx

import { useState } from 'react';

// Returns inline styles for a tab button given style variant and active state
function getTabBtnStyle(variant, isActive, accentColor) {
  const base = {
    cursor: 'pointer', fontSize: '.83rem', display: 'flex', alignItems: 'center',
    gap: '6px', whiteSpace: 'nowrap', transition: 'all .15s',
    fontFamily: 'inherit',
  };

  if (variant === 'underline') return {
    ...base,
    padding: '10px 16px', border: 'none', borderRadius: 0, background: 'transparent',
    borderBottom: `2px solid ${isActive ? accentColor : 'transparent'}`,
    color:       isActive ? accentColor : 'rgba(255,255,255,.45)',
    fontWeight:  isActive ? 700 : 400,
  };

  if (variant === 'boxed') return {
    ...base,
    padding: '8px 14px', borderRadius: '6px',
    border: `1px solid ${isActive ? accentColor : 'rgba(255,255,255,.1)'}`,
    background: isActive ? accentColor : 'rgba(255,255,255,.05)',
    color: isActive ? '#fff' : 'rgba(255,255,255,.5)',
    fontWeight: isActive ? 700 : 400,
  };

  // pills (default fallback)
  return {
    ...base,
    padding: '8px 16px', borderRadius: '99px', border: 'none',
    background: isActive ? accentColor : 'rgba(255,255,255,.06)',
    color: isActive ? '#fff' : 'rgba(255,255,255,.5)',
    fontWeight: isActive ? 700 : 400,
  };
}

export default function TabsWidget({ settings: s }) {
  const [active, setActive] = useState(s.active_tab || s.tabs?.[0]?.id);
  const tabs   = s.tabs || [];
  const tab    = tabs.find(t => t.id === active) || tabs[0];
  const accent = 'var(--color-primary, #7C3AED)';
  const variant = s.tab_style || 'underline';

  return (
    <div style={{ borderRadius: `${s.border_radius || 8}px`, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display:        'flex',
        flexWrap:       'wrap',
        gap:            variant === 'underline' ? '0' : '6px',
        justifyContent: s.tab_alignment === 'center' ? 'center'
                      : s.tab_alignment === 'right'  ? 'flex-end' : 'flex-start',
        borderBottom:   variant === 'underline' ? '1px solid rgba(255,255,255,.08)' : 'none',
        paddingBottom:  variant !== 'underline' ? '10px' : '0',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={getTabBtnStyle(variant, t.id === active, accent)}
          >
            {t.icon && <i className={`fas ${t.icon}`} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {tab && (
        <div style={{
          padding:      `${s.content_padding || 24}px`,
          background:   'rgba(255,255,255,.02)',
          borderRadius: variant !== 'underline' ? `${s.border_radius || 8}px` : '0',
        }}>
          <div
            dangerouslySetInnerHTML={{ __html: tab.content || '' }}
            style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.75, fontSize: '.9rem' }}
          />
        </div>
      )}
    </div>
  );
}
