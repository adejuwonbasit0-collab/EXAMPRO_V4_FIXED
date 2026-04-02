// builder/sections/ShapeDividerControl.jsx
// Dropdown to pick a shape divider for a section's top or bottom edge.

const SHAPES = [
  { value: '',         label: 'None' },
  { value: 'wave',     label: '〜 Wave' },
  { value: 'wave2',    label: '〰 Wave 2' },
  { value: 'triangle', label: '△ Triangle' },
  { value: 'tilt',     label: '◤ Tilt' },
  { value: 'arrow',    label: '▽ Arrow' },
  { value: 'curve',    label: '⌒ Curve' },
  { value: 'zigzag',   label: '⩘ Zigzag' },
  { value: 'clouds',   label: '☁ Clouds' },
];

export default function ShapeDividerControl({ value, onChange, position = 'top' }) {
  const current = value?.shape || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <select
        value={current}
        onChange={e => onChange(e.target.value ? { shape: e.target.value, color: value?.color || '#ffffff', height: value?.height || 60, flip: value?.flip || false } : null)}
        style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff', fontSize: '.75rem' }}
      >
        {SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {current && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="color"
            title="Divider color"
            value={value?.color || '#ffffff'}
            onChange={e => onChange({ ...value, color: e.target.value })}
            style={{ width: '24px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
          />
          <input
            type="number"
            title="Height (px)"
            min={20} max={200}
            value={value?.height || 60}
            onChange={e => onChange({ ...value, height: parseInt(e.target.value) || 60 })}
            style={{ width: '56px', padding: '3px 6px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff', fontSize: '.72rem' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '.7rem', color: 'rgba(255,255,255,.5)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value?.flip || false}
              onChange={e => onChange({ ...value, flip: e.target.checked })}
            />
            Flip
          </label>
        </div>
      )}
    </div>
  );
}
