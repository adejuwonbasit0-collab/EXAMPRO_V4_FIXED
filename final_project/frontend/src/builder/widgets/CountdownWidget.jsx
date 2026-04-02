// builder/widgets/CountdownWidget.jsx

import { useState, useEffect } from 'react';

function calcTimeLeft(dueDate) {
  const ms = new Date(dueDate).getTime() - Date.now();
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000)  / 60000),
    s: Math.floor((ms % 60000)    / 1000),
    expired: false,
  };
}

export default function CountdownWidget({ settings: s }) {
  const [time, setTime] = useState(() => calcTimeLeft(s.due_date || Date.now()));

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft(s.due_date || Date.now())), 1000);
    return () => clearInterval(id);
  }, [s.due_date]);

  if (time.expired) {
    if (s.on_expire === 'hide')    return null;
    if (s.on_expire === 'message') {
      return (
        <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,.5)', fontSize: '.9rem' }}>
          {s.expire_message || 'Enrollment is now closed.'}
        </div>
      );
    }
  }

  const units = [
    { key: 'd', show: s.show_days    !== false, val: time.d, label: s.label_days    || 'Days'  },
    { key: 'h', show: s.show_hours   !== false, val: time.h, label: s.label_hours   || 'Hours' },
    { key: 'm', show: s.show_minutes !== false, val: time.m, label: s.label_minutes || 'Mins'  },
    { key: 's', show: s.show_seconds !== false, val: time.s, label: s.label_seconds || 'Secs'  },
  ].filter(u => u.show);

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
      {units.map((u, i) => (
        <div key={u.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            minWidth:     '76px',
            background:   s.box_bg       || 'rgba(255,255,255,.06)',
            borderRadius: `${s.box_radius || 12}px`,
            border:       '1px solid rgba(255,255,255,.08)',
            padding:      '14px 10px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1, color: s.number_color || '#ffffff', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
              {String(u.val).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.08em', color: s.label_color || 'rgba(255,255,255,.45)', marginTop: '6px', fontWeight: 600 }}>
              {u.label}
            </div>
          </div>
          {/* Separator colon between units */}
          {i < units.length - 1 && (
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary, #7C3AED)', marginTop: '-12px', opacity: .6 }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
