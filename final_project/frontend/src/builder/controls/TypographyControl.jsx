// builder/controls/TypographyControl.jsx
// Full typography block: font family, size, weight, style, transform,
// line height, letter spacing, text align, text decoration, color

import { useState } from 'react';
import { ControlRow, SectionLabel } from '../panels/RightPanel';
import {
  SelectInput, SegmentedControl, SliderInput,
  NumberInput, Toggle, UnitInput,
} from './atoms';
import ColorControl from './ColorControl';

const FONTS = [
  'DM Sans', 'Inter', 'Syne', 'Outfit', 'Plus Jakarta Sans',
  'Space Grotesk', 'Poppins', 'Raleway', 'Playfair Display',
  'Lora', 'Merriweather', 'Roboto', 'Open Sans', 'Nunito',
  'Josefin Sans', 'Montserrat', 'Source Serif 4',
  'system-ui', 'serif', 'monospace', 'inherit',
];

const WEIGHTS = [
  { value: '100', label: 'Thin' },
  { value: '200', label: 'ExtraLight' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'SemiBold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'ExtraBold' },
  { value: '900', label: 'Black' },
];

const TRANSFORMS = [
  { value: 'none',       label: 'Aa'  },
  { value: 'uppercase',  label: 'AA'  },
  { value: 'lowercase',  label: 'aa'  },
  { value: 'capitalize', label: 'Aa+' },
];

const DECORATIONS = [
  { value: 'none',         label: 'None'   },
  { value: 'underline',    label: 'Under'  },
  { value: 'line-through', label: 'Strike' },
  { value: 'overline',     label: 'Over'   },
];

const ALIGN_OPTS = [
  { value: 'left',    label: '⬅' },
  { value: 'center',  label: '↔' },
  { value: 'right',   label: '➡' },
  { value: 'justify', label: '☰' },
];

/**
 * TypographyControl
 *
 * Props:
 *   settings  — flat settings object (widget.settings or section.settings)
 *   onChange  — (patch) => void — receives flat patch to merge into settings
 *   compact   — boolean — collapses secondary options behind a "More" toggle
 */
export default function TypographyControl({ settings: s = {}, onChange, compact = false }) {
  const [showMore, setShowMore] = useState(!compact);
  const u = onChange;

  return (
    <div>
      {/* ── Font Family ─────────────────────────────────────── */}
      <ControlRow label="Font Family">
        <select
          value={s.font_family || 'inherit'}
          onChange={e => u({ font_family: e.target.value })}
          style={{
            width: '100%', padding: '7px 8px',
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: '7px', color: '#fff', fontSize: '.78rem',
            outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
            fontFamily: s.font_family && s.font_family !== 'inherit' ? `'${s.font_family}', sans-serif` : 'inherit',
          }}
        >
          <option value="var(--font-heading)">— Heading (global) —</option>
          <option value="var(--font-body)">— Body (global) —</option>
          <option disabled>────────────────</option>
          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
      </ControlRow>

      {/* ── Size + Weight row ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <ControlRow label="Size">
          <UnitInput
            value={s.font_size || 16}
            unit={s.font_size_unit || 'px'}
            onValueChange={v => u({ font_size: v })}
            onUnitChange={v => u({ font_size_unit: v })}
            min={1}
            max={s.font_size_unit === 'rem' || s.font_size_unit === 'em' ? 20 : 400}
          />
        </ControlRow>
        <ControlRow label="Weight">
          <select
            value={s.font_weight || '400'}
            onChange={e => u({ font_weight: e.target.value })}
            style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.78rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            {WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </ControlRow>
      </div>

      {/* ── Text Align ──────────────────────────────────────── */}
      <ControlRow label="Align">
        <SegmentedControl
          value={s.text_align || 'left'}
          onChange={v => u({ text_align: v })}
          options={ALIGN_OPTS}
        />
      </ControlRow>

      {/* ── Text Color ──────────────────────────────────────── */}
      <ControlRow label="Color">
        <ColorControl value={s.color || '#ffffff'} onChange={v => u({ color: v })} />
      </ControlRow>

      {/* ── Secondary Controls ──────────────────────────────── */}
      {compact && (
        <button
          onClick={() => setShowMore(m => !m)}
          style={{ width: '100%', padding: '5px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '6px', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '.7rem', marginBottom: '8px' }}
        >
          {showMore ? '▲ Less options' : '▼ More options'}
        </button>
      )}

      {showMore && (
        <>
          {/* Line Height */}
          <ControlRow label={`Line Height — ${s.line_height || 1.5}`}>
            <SliderInput
              value={s.line_height || 1.5} min={0.8} max={4} step={0.05}
              onChange={v => u({ line_height: v })}
            />
          </ControlRow>

          {/* Letter Spacing */}
          <ControlRow label="Letter Spacing">
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="number" value={s.letter_spacing ?? 0} step={0.01} min={-0.2} max={0.5}
                onChange={e => u({ letter_spacing: Number(e.target.value) })}
                style={{ width: '70px', padding: '7px 6px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.78rem', outline: 'none', textAlign: 'center' }} />
              <span style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.3)' }}>em</span>
            </div>
          </ControlRow>

          {/* Transform */}
          <ControlRow label="Transform">
            <SegmentedControl
              value={s.text_transform || 'none'}
              onChange={v => u({ text_transform: v })}
              options={TRANSFORMS}
            />
          </ControlRow>

          {/* Decoration */}
          <ControlRow label="Decoration">
            <SegmentedControl
              value={s.text_decoration || 'none'}
              onChange={v => u({ text_decoration: v })}
              options={DECORATIONS}
            />
          </ControlRow>

          {/* Font Style */}
          <ControlRow label="Italic">
            <Toggle
              value={s.font_style === 'italic'}
              onChange={v => u({ font_style: v ? 'italic' : 'normal' })}
            />
          </ControlRow>

          {/* Text Shadow */}
          <ControlRow label="Text Shadow">
            <input
              type="text"
              value={s.text_shadow || ''}
              onChange={e => u({ text_shadow: e.target.value })}
              placeholder="0 2px 8px rgba(0,0,0,0.5)"
              style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.78rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </ControlRow>
        </>
      )}
    </div>
  );
}
