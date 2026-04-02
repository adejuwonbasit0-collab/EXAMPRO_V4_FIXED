// builder/controls/HoverControl.jsx
// Controls hover-state overrides.
// These settings are stored in widget.settings as:
//   hover_transform    — CSS transform string (e.g. "translateY(-4px) scale(1.02)")
//   hover_opacity      — number 0–1 (null = no change)
//   hover_box_shadow   — CSS box-shadow string (null = no change)
//   hover_bg_color     — CSS color string (null = no change)
//   hover_color        — CSS color string (null = no change)
//   hover_transition   — CSS transition duration (default: "0.2s")
//
// At render time, WidgetWrapper injects a <style> block using widget.id
// to apply these as actual :hover CSS rules. See § 16.

import { useState } from 'react';
import { ControlRow, SectionLabel } from '../panels/RightPanel';
import { SliderInput, Toggle, SegmentedControl } from './atoms';
import ColorControl from './ColorControl';

// Preset transform values for quick selection
const TRANSFORM_PRESETS = [
  { label: 'None',       value: ''                            },
  { label: '↑ Lift',     value: 'translateY(-4px)'            },
  { label: '↑↑ Float',   value: 'translateY(-8px)'            },
  { label: '⬆ Grow',     value: 'scale(1.05)'                 },
  { label: '⬆⬆ Pop',     value: 'scale(1.1)'                  },
  { label: '⬇ Sink',     value: 'translateY(2px)'             },
  { label: '↗ TiltR',    value: 'rotate(2deg) scale(1.02)'    },
  { label: '↖ TiltL',    value: 'rotate(-2deg) scale(1.02)'   },
];

export default function HoverControl({ settings: s = {}, onChange }) {
  const [advanced, setAdvanced] = useState(false);

  const u = onChange;

  const hasHover = s.hover_transform || s.hover_opacity != null || s.hover_box_shadow || s.hover_bg_color || s.hover_color;

  return (
    <div>
      {/* ── Transform presets ─────────────────────────────── */}
      <SectionLabel>Transform on Hover</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
        {TRANSFORM_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => u({ hover_transform: p.value })}
            style={{
              padding: '5px 9px',
              background: s.hover_transform === p.value ? 'rgba(129,140,248,.3)' : 'rgba(255,255,255,.05)',
              border: `1px solid ${s.hover_transform === p.value ? 'rgba(129,140,248,.5)' : 'rgba(255,255,255,.1)'}`,
              color: s.hover_transform === p.value ? '#818CF8' : 'rgba(255,255,255,.55)',
              borderRadius: '7px', cursor: 'pointer', fontSize: '.68rem',
              fontWeight: s.hover_transform === p.value ? 700 : 400,
              transition: 'all .12s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom transform input */}
      <ControlRow label="Custom Transform">
        <input type="text" value={s.hover_transform || ''}
          onChange={e => u({ hover_transform: e.target.value })}
          placeholder="translateY(-4px) scale(1.02)"
          style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.74rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
      </ControlRow>

      {/* ── Opacity ───────────────────────────────────────── */}
      <SectionLabel>Opacity on Hover</SectionLabel>
      <ControlRow label="Enable Opacity Change">
        <Toggle value={s.hover_opacity != null} onChange={v => u({ hover_opacity: v ? 0.8 : null })} />
      </ControlRow>
      {s.hover_opacity != null && (
        <SliderInput
          value={Math.round((s.hover_opacity ?? 1) * 100)}
          min={0} max={100} step={1} unit="%"
          label={`Opacity — ${Math.round((s.hover_opacity ?? 1) * 100)}%`}
          onChange={v => u({ hover_opacity: v / 100 })}
        />
      )}

      {/* ── Advanced toggle ───────────────────────────────── */}
      <button
        onClick={() => setAdvanced(a => !a)}
        style={{ width: '100%', padding: '6px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '7px', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: '.7rem', marginTop: '4px' }}
      >
        {advanced ? '▲ Hide' : '▼ Show'} Color + Shadow overrides
      </button>

      {advanced && (
        <>
          {/* ── Background color override ──────────────────── */}
          <SectionLabel>Background on Hover</SectionLabel>
          <ControlRow label="Enable BG Override">
            <Toggle value={s.hover_bg_color != null} onChange={v => u({ hover_bg_color: v ? 'rgba(129,140,248,0.15)' : null })} />
          </ControlRow>
          {s.hover_bg_color != null && (
            <ControlRow label="Background Color">
              <ColorControl value={s.hover_bg_color || 'transparent'} onChange={v => u({ hover_bg_color: v })} />
            </ControlRow>
          )}

          {/* ── Text color override ────────────────────────── */}
          <SectionLabel>Text Color on Hover</SectionLabel>
          <ControlRow label="Enable Color Override">
            <Toggle value={s.hover_color != null} onChange={v => u({ hover_color: v ? '#ffffff' : null })} />
          </ControlRow>
          {s.hover_color != null && (
            <ControlRow label="Text Color">
              <ColorControl value={s.hover_color || '#ffffff'} onChange={v => u({ hover_color: v })} />
            </ControlRow>
          )}

          {/* ── Shadow on hover ────────────────────────────── */}
          <SectionLabel>Shadow on Hover</SectionLabel>
          <ControlRow label="Enable Shadow Override">
            <Toggle value={s.hover_box_shadow != null} onChange={v => u({ hover_box_shadow: v ? '0 8px 32px rgba(0,0,0,0.35)' : null })} />
          </ControlRow>
          {s.hover_box_shadow != null && (
            <ControlRow label="Box Shadow">
              <input type="text" value={s.hover_box_shadow || ''}
                onChange={e => u({ hover_box_shadow: e.target.value })}
                placeholder="0 8px 32px rgba(0,0,0,0.35)"
                style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.74rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </ControlRow>
          )}
        </>
      )}

      {/* ── Transition speed ──────────────────────────────── */}
      <SectionLabel>Transition</SectionLabel>
      <ControlRow label="Duration">
        <SegmentedControl
          value={s.hover_transition || '0.2s'}
          onChange={v => u({ hover_transition: v })}
          options={[
            { value: '0.1s', label: 'Fast'   },
            { value: '0.2s', label: 'Normal' },
            { value: '0.3s', label: 'Smooth' },
            { value: '0.5s', label: 'Slow'   },
          ]}
        />
      </ControlRow>

      {/* Reset all hover */}
      {hasHover && (
        <button
          onClick={() => u({ hover_transform: '', hover_opacity: null, hover_box_shadow: null, hover_bg_color: null, hover_color: null })}
          style={{ width: '100%', padding: '7px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: '#EF4444', cursor: 'pointer', fontSize: '.72rem', marginTop: '8px' }}
        >
          Reset All Hover Effects
        </button>
      )}
    </div>
  );
}
