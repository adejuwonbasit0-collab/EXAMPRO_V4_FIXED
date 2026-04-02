// builder/controls/ShadowControl.jsx
// Visual shadow builder that composes a CSS box-shadow string.
// Supports up to 4 shadow layers (each with x, y, blur, spread, color, inset).
// Output is a single CSS box-shadow string stored in widget.settings.box_shadow.

import { useState } from 'react';
import { ControlRow, SectionLabel } from '../panels/RightPanel';
import { Toggle } from './atoms';
import ColorControl from './ColorControl';

// Parse a CSS box-shadow string into an array of shadow objects
function parseShadows(css) {
  if (!css || css === 'none') return [];
  // Split on ',' that are not inside parentheses (rgba values)
  const parts = css.match(/(?:[^,(]|\([^)]*\))+/g);
  if (!parts) return [];
  return parts.map(part => {
    const inset   = part.includes('inset');
    const cleaned = part.replace('inset', '').trim();
    const tokens  = cleaned.split(/\s+/);
    // Extract color — last token that looks like a color
    let color = 'rgba(0,0,0,0.25)';
    const colorIdx = tokens.findIndex(t => t.startsWith('#') || t.startsWith('rgb') || t.startsWith('var('));
    if (colorIdx >= 0) {
      color = tokens.splice(colorIdx, 1)[0];
    }
    const [x = 0, y = 4, blur = 14, spread = 0] = tokens.map(Number);
    return { x, y, blur, spread, color, inset };
  });
}

// Serialize array of shadow objects back to CSS string
function serializeShadows(shadows) {
  if (!shadows.length) return 'none';
  return shadows.map(sh =>
    `${sh.inset ? 'inset ' : ''}${sh.x}px ${sh.y}px ${sh.blur}px ${sh.spread}px ${sh.color}`
  ).join(', ');
}

const numInp = {
  width: '100%', padding: '6px 4px', background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff',
  fontSize: '.75rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box',
};

export default function ShadowControl({ value = '', onChange }) {
  const [shadows, setShadows] = useState(() => parseShadows(value));

  const commit = (next) => {
    setShadows(next);
    onChange(serializeShadows(next));
  };

  const updateShadow = (i, patch) => {
    commit(shadows.map((sh, idx) => idx === i ? { ...sh, ...patch } : sh));
  };

  const addShadow = () => {
    if (shadows.length >= 4) return;
    commit([...shadows, { x: 0, y: 4, blur: 14, spread: 0, color: 'rgba(0,0,0,0.25)', inset: false }]);
  };

  const removeShadow = (i) => commit(shadows.filter((_, idx) => idx !== i));

  // Live preview of just the current shadow string
  const previewShadow = serializeShadows(shadows);

  return (
    <div>
      {/* Preview */}
      <div style={{
        height: '48px', borderRadius: '10px', background: 'rgba(255,255,255,.06)',
        boxShadow: previewShadow !== 'none' ? previewShadow : 'none',
        border: '1px solid rgba(255,255,255,.1)',
        marginBottom: '12px', transition: 'box-shadow .2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.2)' }}>
          {previewShadow === 'none' ? 'No shadow' : 'Preview'}
        </span>
      </div>

      {/* Shadow layers */}
      {shadows.map((sh, i) => (
        <div key={i} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: '9px', padding: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Layer {i + 1}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.3)' }}>Inset</span>
                <Toggle value={sh.inset} onChange={v => updateShadow(i, { inset: v })} />
              </div>
              <button onClick={() => removeShadow(i)} style={{ background: 'rgba(239,68,68,.15)', border: 'none', color: '#EF4444', width: '22px', height: '22px', borderRadius: '5px', cursor: 'pointer', fontSize: '.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>

          {/* X / Y / Blur / Spread row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
            {[['X', 'x', -100, 100], ['Y', 'y', -100, 100], ['Blur', 'blur', 0, 200], ['Spread', 'spread', -100, 100]].map(([lbl, key, min, max]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.3)', marginBottom: '3px' }}>{lbl}</div>
                <input type="number" value={sh[key]} min={min} max={max}
                  onChange={e => updateShadow(i, { [key]: Number(e.target.value) })}
                  style={numInp} />
              </div>
            ))}
          </div>

          {/* Color */}
          <ControlRow label="Color">
            <ColorControl value={sh.color} onChange={v => updateShadow(i, { color: v })} />
          </ControlRow>
        </div>
      ))}

      {shadows.length < 4 && (
        <button onClick={addShadow} style={{ width: '100%', padding: '7px', background: 'rgba(129,140,248,.08)', border: '1px dashed rgba(129,140,248,.25)', borderRadius: '7px', color: '#818CF8', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600 }}>
          ＋ Add Shadow Layer
        </button>
      )}

      {/* Raw CSS fallback */}
      <ControlRow label="Raw CSS (override)">
        <input type="text" value={value} onChange={e => { setShadows(parseShadows(e.target.value)); onChange(e.target.value); }}
          placeholder="0 4px 14px rgba(0,0,0,0.25)"
          style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.72rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
      </ControlRow>
    </div>
  );
}
