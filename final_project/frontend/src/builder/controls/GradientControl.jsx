// builder/controls/GradientControl.jsx
// Full gradient editor with live preview bar.
// Manages: type (linear/radial/conic), angle, stop list (color + position)
// Value shape:
// {
//   gradient_type:   'linear' | 'radial' | 'conic'
//   gradient_angle:  135,
//   gradient_stops:  [{ color: '#7C3AED', position: 0 }, { color: '#06D6A0', position: 100 }]
// }

import { SegmentedControl } from './atoms';
import { ControlRow } from '../panels/RightPanel';

/**
 * Build the CSS gradient string from settings
 */
export function buildGradientCSS(s = {}) {
  const stops = (s.gradient_stops || [
    { color: 'var(--color-primary)', position: 0 },
    { color: 'var(--color-accent)',  position: 100 },
  ])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(st => `${st.color} ${st.position}%`)
    .join(', ');

  switch (s.gradient_type) {
    case 'radial': return `radial-gradient(ellipse at center, ${stops})`;
    case 'conic':  return `conic-gradient(from ${s.gradient_angle || 0}deg, ${stops})`;
    default:       return `linear-gradient(${s.gradient_angle ?? 135}deg, ${stops})`;
  }
}

export default function GradientControl({ value = {}, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  const stops = value.gradient_stops || [
    { color: 'var(--color-primary)', position: 0  },
    { color: 'var(--color-accent)',  position: 100 },
  ];

  const updateStop = (i, patch) => {
    const next = stops.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    set({ gradient_stops: next });
  };
  const addStop = () => {
    const mid = stops.length > 0 ? Math.round((stops[0].position + stops[stops.length - 1].position) / 2) : 50;
    const next = [...stops, { color: '#818CF8', position: mid }].sort((a, b) => a.position - b.position);
    set({ gradient_stops: next });
  };
  const removeStop = (i) => {
    if (stops.length <= 2) return;
    set({ gradient_stops: stops.filter((_, idx) => idx !== i) });
  };

  const preview = buildGradientCSS(value);
  const showAngle = value.gradient_type !== 'radial';

  const inp = (extra = {}) => ({
    padding: '6px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: '7px', color: '#fff', fontSize: '.75rem', outline: 'none', boxSizing: 'border-box',
    ...extra,
  });

  return (
    <div>
      {/* Live preview bar */}
      <div style={{ height: '36px', borderRadius: '9px', background: preview, marginBottom: '14px', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 2px 8px rgba(0,0,0,.3)' }} />

      {/* Type */}
      <ControlRow label="Type">
        <SegmentedControl
          value={value.gradient_type || 'linear'}
          onChange={v => set({ gradient_type: v })}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
            { value: 'conic',  label: 'Conic'  },
          ]}
        />
      </ControlRow>

      {/* Angle */}
      {showAngle && (
        <ControlRow label={`Angle — ${value.gradient_angle ?? 135}°`}>
          <input type="range" min={0} max={360} value={value.gradient_angle ?? 135}
            onChange={e => set({ gradient_angle: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#818CF8', cursor: 'pointer' }} />
        </ControlRow>
      )}

      {/* Color stops */}
      <ControlRow label="Color Stops">
        {stops.map((stop, i) => (
          <div key={i} style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '6px' }}>
            {/* Swatch */}
            <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.2)', flexShrink: 0, background: stop.color.startsWith('var(') ? 'linear-gradient(135deg,#818CF8,#06D6A0)' : stop.color }}>
              {!stop.color.startsWith('var(') && (
                <input type="color" value={stop.color?.startsWith('#') ? stop.color : '#818CF8'}
                  onChange={e => updateStop(i, { color: e.target.value })}
                  style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
              )}
            </div>
            {/* Hex input */}
            <input type="text" value={stop.color} onChange={e => updateStop(i, { color: e.target.value })}
              style={inp({ flex: 1, fontFamily: 'monospace', fontSize: '.7rem' })} />
            {/* Position */}
            <input type="number" value={stop.position} min={0} max={100}
              onChange={e => updateStop(i, { position: Number(e.target.value) })}
              style={inp({ width: '46px', textAlign: 'center', fontSize: '.72rem', padding: '6px 4px' })} />
            <span style={{ fontSize: '.62rem', color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>%</span>
            {stops.length > 2 && (
              <button onClick={() => removeStop(i)} style={{ background: 'rgba(239,68,68,.15)', border: 'none', color: '#EF4444', width: '22px', height: '22px', borderRadius: '5px', cursor: 'pointer', fontSize: '.65rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            )}
          </div>
        ))}
        {stops.length < 6 && (
          <button onClick={addStop} style={{ width: '100%', padding: '6px', background: 'rgba(129,140,248,.08)', border: '1px dashed rgba(129,140,248,.25)', borderRadius: '6px', color: '#818CF8', cursor: 'pointer', fontSize: '.72rem', marginTop: '4px' }}>
            ＋ Add Stop
          </button>
        )}
      </ControlRow>
    </div>
  );
}
