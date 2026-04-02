// builder/controls/BorderControl.jsx
// Controls:
//   • Per-side border width (T/R/B/L) with "link all" toggle
//   • Single shared border style selector
//   • Border color (uses ColorControl)
//   • Per-corner border radius (TL/TR/BR/BL) with link toggle
//
// Settings keys written:
//   border_top_width, border_right_width, border_bottom_width, border_left_width  (number, px)
//   border_style                                                                    (string)
//   border_color                                                                    (string)
//   border_radius_tl, border_radius_tr, border_radius_br, border_radius_bl         (number, px)

import { useState } from 'react';
import { ControlRow, SectionLabel } from '../panels/RightPanel';
import ColorControl from './ColorControl';

const inp = (extra = {}) => ({
  width: '100%', padding: '6px 4px', background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff',
  fontSize: '.76rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box',
  ...extra,
});

function QuadField({ label, keys, s, onChange, linked, setLinked }) {
  const [t, r, b, l] = keys.map(k => s[k] ?? 0);

  const update = (idx, val) => {
    const num = Math.max(0, Number(val) || 0);
    if (linked) {
      const patch = {};
      keys.forEach(k => { patch[k] = num; });
      onChange(patch);
    } else {
      onChange({ [keys[idx]]: num });
    }
  };

  const corners  = label === 'Radius';
  const icons    = corners ? ['↖','↗','↘','↙'] : ['T','R','B','L'];
  const vals     = [t, r, b, l];
  const linkKey  = `${label}_linked`;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', marginBottom: '6px' }}>
        {vals.map((v, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.3)', marginBottom: '3px' }}>{icons[i]}</div>
            <input type="number" value={v} min={0} max={corners ? 200 : 20}
              onChange={e => update(i, e.target.value)} style={inp()} />
          </div>
        ))}
      </div>
      <div onClick={() => setLinked(l => !l)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '3px 0', marginBottom: '6px' }}>
        <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${linked ? '#818CF8' : 'rgba(255,255,255,.2)'}`, background: linked ? '#818CF8' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {linked && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fff' }} />}
        </div>
        <span style={{ fontSize: '.68rem', color: linked ? '#818CF8' : 'rgba(255,255,255,.3)', fontWeight: linked ? 600 : 400 }}>
          {linked ? 'All linked' : 'Link all'}
        </span>
      </div>
    </>
  );
}

export default function BorderControl({ settings: s = {}, onChange }) {
  const [widthLinked,  setWidthLinked]  = useState(false);
  const [radiusLinked, setRadiusLinked] = useState(
    s.border_radius_tl === s.border_radius_tr &&
    s.border_radius_tl === s.border_radius_br &&
    s.border_radius_tl === s.border_radius_bl
  );

  const anyWidth = ['border_top_width','border_right_width','border_bottom_width','border_left_width']
    .some(k => (s[k] || 0) > 0);

  return (
    <div>
      {/* ── Radius ───────────────────────────────────────── */}
      <SectionLabel>Border Radius</SectionLabel>
      <QuadField
        label="Radius"
        keys={['border_radius_tl','border_radius_tr','border_radius_br','border_radius_bl']}
        s={s}
        onChange={onChange}
        linked={radiusLinked}
        setLinked={setRadiusLinked}
      />

      {/* ── Width ────────────────────────────────────────── */}
      <SectionLabel>Border Width</SectionLabel>
      <QuadField
        label="Width"
        keys={['border_top_width','border_right_width','border_bottom_width','border_left_width']}
        s={s}
        onChange={onChange}
        linked={widthLinked}
        setLinked={setWidthLinked}
      />

      {/* ── Style + Color — only shown if any border width > 0 ── */}
      {anyWidth && (
        <>
          <ControlRow label="Style">
            <select value={s.border_style || 'solid'} onChange={e => onChange({ border_style: e.target.value })}
              style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.78rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
              {['solid','dashed','dotted','double','groove','ridge'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Color">
            <ColorControl value={s.border_color || 'rgba(255,255,255,0.2)'} onChange={v => onChange({ border_color: v })} />
          </ControlRow>
        </>
      )}
    </div>
  );
}
