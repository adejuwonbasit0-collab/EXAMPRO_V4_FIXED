// builder/controls/FilterControl.jsx
// Visual sliders for each CSS filter function.
// Output: a CSS filter string stored in widget.settings.css_filter
// e.g. "blur(0px) brightness(1.1) contrast(1) saturate(1.2) grayscale(0)"

import { SliderInput } from './atoms';
import { SectionLabel } from '../panels/RightPanel';

const FILTERS = [
  {
    key:     'blur',
    label:   'Blur',
    unit:    'px',
    min:     0,
    max:     20,
    step:    0.5,
    default: 0,
    format:  (v) => `blur(${v}px)`,
  },
  {
    key:     'brightness',
    label:   'Brightness',
    unit:    '%',
    min:     0,
    max:     200,
    step:    1,
    default: 100,
    format:  (v) => `brightness(${v / 100})`,
    display: (v) => `${v}%`,
  },
  {
    key:     'contrast',
    label:   'Contrast',
    unit:    '%',
    min:     0,
    max:     200,
    step:    1,
    default: 100,
    format:  (v) => `contrast(${v / 100})`,
    display: (v) => `${v}%`,
  },
  {
    key:     'saturate',
    label:   'Saturate',
    unit:    '%',
    min:     0,
    max:     300,
    step:    1,
    default: 100,
    format:  (v) => `saturate(${v / 100})`,
    display: (v) => `${v}%`,
  },
  {
    key:     'grayscale',
    label:   'Grayscale',
    unit:    '%',
    min:     0,
    max:     100,
    step:    1,
    default: 0,
    format:  (v) => `grayscale(${v / 100})`,
    display: (v) => `${v}%`,
  },
  {
    key:     'hue_rotate',
    label:   'Hue Rotate',
    unit:    '°',
    min:     0,
    max:     360,
    step:    1,
    default: 0,
    format:  (v) => `hue-rotate(${v}deg)`,
  },
  {
    key:     'invert',
    label:   'Invert',
    unit:    '%',
    min:     0,
    max:     100,
    step:    1,
    default: 0,
    format:  (v) => `invert(${v / 100})`,
    display: (v) => `${v}%`,
  },
  {
    key:     'sepia',
    label:   'Sepia',
    unit:    '%',
    min:     0,
    max:     100,
    step:    1,
    default: 0,
    format:  (v) => `sepia(${v / 100})`,
    display: (v) => `${v}%`,
  },
];

/**
 * Parse a CSS filter string into a keyed values object.
 * e.g. "blur(2px) brightness(1.2)" → { blur: 2, brightness: 120 }
 */
export function parseFilterString(css) {
  if (!css) return {};
  const values = {};
  FILTERS.forEach(f => {
    const cssKey = f.key.replace('_', '-');  // hue_rotate → hue-rotate
    const re     = new RegExp(`${cssKey}\\(([\\d.]+)`);
    const m      = css.match(re);
    if (m) {
      let v = parseFloat(m[1]);
      // Convert from CSS value back to slider value
      if (['brightness','contrast','saturate','grayscale','invert','sepia'].includes(f.key)) v *= 100;
      values[f.key] = v;
    }
  });
  return values;
}

/**
 * Serialize a keyed values object into a CSS filter string.
 * Only includes filters that differ from default.
 */
export function serializeFilterString(values) {
  const parts = FILTERS
    .filter(f => {
      const v = values[f.key];
      return v !== undefined && v !== f.default;
    })
    .map(f => f.format(values[f.key]));
  return parts.length ? parts.join(' ') : 'none';
}

/**
 * FilterControl
 *
 * Props:
 *   value    — CSS filter string (widget.settings.css_filter)
 *   onChange — (string) => void — receives new CSS filter string
 */
export default function FilterControl({ value = '', onChange }) {
  const parsed = parseFilterString(value);

  const handleChange = (key, v) => {
    const next = { ...parsed, [key]: v };
    onChange(serializeFilterString(next));
  };

  // Visual preview of the filter applied to a sample swatch
  const preview = value && value !== 'none' ? value : 'none';

  return (
    <div>
      {/* Live filter preview swatch */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #7C3AED, #06D6A0, #F59E0B)',
            filter: preview,
            transition: 'filter .2s',
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.3)', marginBottom: '4px' }}>Filter Preview</div>
          <div style={{ fontSize: '.62rem', fontFamily: 'monospace', color: 'rgba(255,255,255,.5)', wordBreak: 'break-all' }}>
            {preview}
          </div>
        </div>
        {preview !== 'none' && (
          <button onClick={() => onChange('none')} style={{ padding: '5px 10px', background: 'rgba(239,68,68,.15)', border: 'none', color: '#EF4444', borderRadius: '6px', cursor: 'pointer', fontSize: '.7rem', flexShrink: 0 }}>
            Reset
          </button>
        )}
      </div>

      {/* Sliders */}
      {FILTERS.map(f => (
        <div key={f.key} style={{ marginBottom: '14px' }}>
          <SliderInput
            value={parsed[f.key] ?? f.default}
            min={f.min}
            max={f.max}
            step={f.step}
            unit={f.display ? '' : f.unit}
            label={`${f.label} — ${f.display ? f.display(parsed[f.key] ?? f.default) : `${parsed[f.key] ?? f.default}${f.unit}`}`}
            onChange={v => handleChange(f.key, v)}
          />
        </div>
      ))}
    </div>
  );
}
