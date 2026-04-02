// builder/controls/ColorControl.jsx
// Full-featured color control:
//   • Native color swatch (instant visual feedback)
//   • Hex / rgba text input with live preview
//   • Opacity slider (0–100%)
//   • Design token variable picker
//   • Accepts any CSS color value including var(--...) strings

import { useState, useRef } from 'react';
import { DESIGN_TOKENS, SliderInput } from './atoms';

/**
 * ColorControl
 *
 * Props:
 *   value    — CSS color string (hex, rgba, or var(--...))
 *   onChange — (string) => void
 *   label    — optional label shown above the control
 *   alpha    — boolean — show opacity slider (default: true)
 */
export default function ColorControl({ value = '#ffffff', onChange, label, alpha = true }) {
  const [mode, setMode] = useState('color');   // 'color' | 'token'
  const isVar = value?.startsWith('var(');

  // ── Parse current hex/rgba for display ─────────────────────────────────
  // For var() values we can't parse — swatch shows as semi-transparent
  const swatchBg = isVar ? `linear-gradient(135deg, #818CF8 50%, #06D6A0 50%)` : value;

  // Parse opacity from rgba() string
  const parseOpacity = (v) => {
    const m = v?.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  };

  // Set only the alpha channel of an rgba color
  const setAlpha = (v, a) => {
    if (v?.startsWith('#')) {
      // Convert hex to rgba then set alpha
      const r = parseInt(v.slice(1,3),16), g = parseInt(v.slice(3,5),16), b = parseInt(v.slice(5,7),16);
      return `rgba(${r},${g},${b},${a})`;
    }
    const m = v?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
    return v;
  };

  const opacity = parseOpacity(value);

  // ── Swatch row ──────────────────────────────────────────────────────────
  return (
    <div>
      {label && (
        <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>
          {label}
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[{ id: 'color', icon: '🎨', tip: 'Custom' }, { id: 'token', icon: '🔑', tip: 'Token' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} title={m.tip}
            style={{ padding: '5px 10px', background: mode === m.id ? 'rgba(129,140,248,.25)' : 'rgba(255,255,255,.05)', border: `1px solid ${mode === m.id ? 'rgba(129,140,248,.5)' : 'rgba(255,255,255,.1)'}`, borderRadius: '6px', color: mode === m.id ? '#818CF8' : 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '.7rem', fontWeight: mode === m.id ? 700 : 400 }}>
            {m.icon} {m.tip}
          </button>
        ))}
      </div>

      {/* ── Custom color mode ────────────────────────────────── */}
      {mode === 'color' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: alpha ? '8px' : '0' }}>
            {/* Swatch */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '32px', borderRadius: '7px', background: swatchBg, border: '1px solid rgba(255,255,255,.15)', overflow: 'hidden' }}>
                {!isVar && (
                  <input type="color" value={value?.startsWith('#') ? value : '#818CF8'}
                    onChange={e => onChange(alpha && opacity < 1 ? setAlpha(e.target.value, opacity) : e.target.value)}
                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none' }} />
                )}
              </div>
            </div>
            {/* Hex / rgba input */}
            <input
              type="text"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder="#ffffff or rgba(255,255,255,1)"
              style={{ flex: 1, padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.75rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
            />
          </div>

          {/* Opacity slider */}
          {alpha && !isVar && (
            <SliderInput
              value={Math.round(opacity * 100)}
              min={0} max={100} step={1} unit="%"
              label={`Opacity — ${Math.round(opacity * 100)}%`}
              onChange={v => onChange(setAlpha(value, v / 100))}
            />
          )}
        </div>
      )}

      {/* ── Token picker mode ────────────────────────────────── */}
      {mode === 'token' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {DESIGN_TOKENS.map(tok => {
            const isActive = value === tok.value;
            const isTransparent = tok.value === 'transparent';
            return (
              <button
                key={tok.value}
                onClick={() => onChange(tok.value)}
                title={tok.value}
                style={{
                  display:     'flex',
                  flexDirection:'column',
                  alignItems:  'center',
                  gap:         '4px',
                  padding:     '6px 8px',
                  background:  isActive ? 'rgba(129,140,248,.2)' : 'rgba(255,255,255,.04)',
                  border:      `1px solid ${isActive ? '#818CF8' : 'rgba(255,255,255,.1)'}`,
                  borderRadius:'7px',
                  cursor:      'pointer',
                  flex:        '0 0 auto',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  background: isTransparent
                    ? 'repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%) 0 0 / 8px 8px'
                    : tok.value.startsWith('var(') ? 'linear-gradient(135deg, #818CF8 50%, #06D6A0 50%)'
                    : tok.value,
                  border: '1px solid rgba(255,255,255,.15)',
                }} />
                <span style={{ fontSize: '.6rem', color: isActive ? '#818CF8' : 'rgba(255,255,255,.45)', fontWeight: isActive ? 700 : 400 }}>
                  {tok.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
