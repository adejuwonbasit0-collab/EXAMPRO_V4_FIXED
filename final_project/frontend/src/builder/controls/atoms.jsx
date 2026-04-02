// builder/controls/atoms.jsx
// Updated in Phase 9: adds SliderInput, UnitInput, VarSelect
// All Phase 7 exports (NumberInput, SelectInput, SegmentedControl, Toggle, TextInput, ColorInput)
// are preserved exactly — only new exports are added.

// ─── baseInput style (shared) ────────────────────────────────────────────────
export const baseInput = {
  width: '100%', padding: '7px 8px',
  background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: '7px', color: '#fff', fontSize: '.78rem',
  outline: 'none', boxSizing: 'border-box',
};

// ─── NumberInput ─────────────────────────────────────────────────────────────
export function NumberInput({ value, onChange, min, max, step = 1, suffix, style: extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{ ...baseInput, textAlign: 'center', ...extra }} />
      {suffix && <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>{suffix}</span>}
    </div>
  );
}

// ─── UnitInput — number + unit selector ──────────────────────────────────────
// Stores value as a number, unit as a separate key (or combined string)
export function UnitInput({ value = 16, unit = 'px', onValueChange, onUnitChange, min = 0, max = 500 }) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onValueChange(Number(e.target.value))}
        style={{ ...baseInput, flex: 1, textAlign: 'center' }} />
      <select value={unit} onChange={e => onUnitChange(e.target.value)}
        style={{ ...baseInput, width: '52px', cursor: 'pointer', padding: '7px 4px', flexShrink: 0 }}>
        {['px','rem','em','%','vw','vh'].map(u => <option key={u}>{u}</option>)}
      </select>
    </div>
  );
}

// ─── SelectInput ─────────────────────────────────────────────────────────────
export function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...baseInput, cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── SegmentedControl ────────────────────────────────────────────────────────
export function SegmentedControl({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,.04)', borderRadius: '7px', padding: '3px' }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{ flex: 1, padding: '5px 6px', border: 'none', background: value === o.value ? 'rgba(129,140,248,.3)' : 'transparent', color: value === o.value ? '#818CF8' : 'rgba(255,255,255,.4)', borderRadius: '5px', cursor: 'pointer', fontSize: '.7rem', fontWeight: value === o.value ? 700 : 400, transition: 'all .14s' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: value ? '#818CF8' : 'rgba(255,255,255,.12)', position: 'relative', cursor: 'pointer', transition: 'background .15s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: value ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
    </div>
  );
}

// ─── TextInput ───────────────────────────────────────────────────────────────
export function TextInput({ value, onChange, placeholder }) {
  return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={baseInput} />;
}

// ─── SliderInput — range slider with live numeric readout ────────────────────
export function SliderInput({ value, onChange, min = 0, max = 100, step = 1, unit = '', label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.4)' }}>{label}</span>
          <span style={{ fontSize: '.72rem', color: '#818CF8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {value}{unit}
          </span>
        </div>
      )}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#818CF8', cursor: 'pointer', height: '4px' }} />
    </div>
  );
}

// ─── ColorInput (Phase 7 version — kept for backward compat) ─────────────────
export function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input type="color" value={value?.startsWith('#') ? value : '#818CF8'}
        onChange={e => onChange(e.target.value)}
        style={{ width: '32px', height: '28px', border: 'none', borderRadius: '5px', cursor: 'pointer', padding: 0 }} />
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...baseInput, flex: 1 }} />
    </div>
  );
}

// ─── Design token variable list ───────────────────────────────────────────────
export const DESIGN_TOKENS = [
  { label: 'Primary',     value: 'var(--color-primary)' },
  { label: 'Accent',      value: 'var(--color-accent)'  },
  { label: 'Background',  value: 'var(--color-bg)'      },
  { label: 'Text',        value: 'var(--color-text)'    },
  { label: 'Border',      value: 'var(--color-border)'  },
  { label: 'White',       value: '#ffffff'               },
  { label: 'Black',       value: '#000000'               },
  { label: 'Transparent', value: 'transparent'           },
  { label: 'Inherit',     value: 'inherit'               },
];
