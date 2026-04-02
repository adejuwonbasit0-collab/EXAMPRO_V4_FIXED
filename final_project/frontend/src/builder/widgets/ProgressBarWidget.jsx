// builder/widgets/ProgressBarWidget.jsx

import { useEffect, useRef, useState } from 'react';

export default function ProgressBarWidget({ settings: s }) {
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(s.items || []).map(item => {
        const pct   = Math.max(0, Math.min(100, item.percentage || 0));
        const color = item.color || 'var(--color-primary)';

        const fillBg = s.bar_style === 'gradient'
          ? `linear-gradient(90deg, ${color}, ${color}99)`
          : s.bar_style === 'striped'
          ? `repeating-linear-gradient(45deg, ${color}, ${color} 10px, ${color}cc 10px, ${color}cc 20px)`
          : color;

        return (
          <div key={item.id || item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={{ fontSize: '.83rem', fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{item.label}</span>
              {s.show_percentage !== false && (
                <span style={{ fontSize: '.78rem', fontWeight: 700, color }}>{pct}%</span>
              )}
            </div>
            <div style={{
              width: '100%', height: `${s.bar_height || 12}px`,
              background:   s.track_color || 'rgba(255,255,255,.08)',
              borderRadius: `${s.border_radius || 6}px`,
              overflow: 'hidden',
            }}>
              <div style={{
                height:       '100%',
                width:        started ? `${pct}%` : '0%',
                background:   fillBg,
                borderRadius: `${s.border_radius || 6}px`,
                transition:   `width ${started ? '1.2s' : '0s'} cubic-bezier(.25,.46,.45,.94)`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
