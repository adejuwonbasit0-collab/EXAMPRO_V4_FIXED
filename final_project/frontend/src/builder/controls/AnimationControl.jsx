// builder/controls/AnimationControl.jsx
// Controls CSS entrance animations applied when the element scrolls into view.
// Uses Intersection Observer in WidgetWrapper — see § 16 for the injection code.
//
// Settings keys:
//   entrance_animation          — animation name string ('none' | 'fadeIn' | etc.)
//   entrance_animation_delay    — number (ms)
//   entrance_animation_duration — number (ms)
//   entrance_animation_easing   — CSS easing string

import { ControlRow, SectionLabel } from '../panels/RightPanel';
import { NumberInput, SelectInput, SegmentedControl, Toggle } from './atoms';

const ANIMATIONS = [
  // None
  { value: 'none',         label: 'None',          group: 'None'  },
  // Fade
  { value: 'fadeIn',       label: 'Fade In',        group: 'Fade'  },
  { value: 'fadeInUp',     label: 'Fade Up',        group: 'Fade'  },
  { value: 'fadeInDown',   label: 'Fade Down',      group: 'Fade'  },
  { value: 'fadeInLeft',   label: 'Fade Left',      group: 'Fade'  },
  { value: 'fadeInRight',  label: 'Fade Right',     group: 'Fade'  },
  // Zoom
  { value: 'zoomIn',       label: 'Zoom In',        group: 'Zoom'  },
  { value: 'zoomInUp',     label: 'Zoom Up',        group: 'Zoom'  },
  // Slide
  { value: 'slideInUp',    label: 'Slide Up',       group: 'Slide' },
  { value: 'slideInLeft',  label: 'Slide Left',     group: 'Slide' },
  { value: 'slideInRight', label: 'Slide Right',    group: 'Slide' },
  // Attention
  { value: 'bounceIn',     label: 'Bounce In',      group: 'Attention' },
  { value: 'flipInX',      label: 'Flip X',         group: 'Attention' },
  { value: 'flipInY',      label: 'Flip Y',         group: 'Attention' },
  { value: 'rubberBand',   label: 'Rubber Band',    group: 'Attention' },
  { value: 'pulse',        label: 'Pulse',          group: 'Attention' },
];

const EASINGS = [
  { value: 'ease',          label: 'Ease'        },
  { value: 'ease-in',       label: 'Ease In'     },
  { value: 'ease-out',      label: 'Ease Out'    },
  { value: 'ease-in-out',   label: 'Ease In-Out' },
  { value: 'linear',        label: 'Linear'      },
  { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Spring' },
];

export default function AnimationControl({ settings: s = {}, onChange }) {
  const anim    = s.entrance_animation || 'none';
  const hasAnim = anim && anim !== 'none';

  // Group animations for the select
  const groups = ['None','Fade','Zoom','Slide','Attention'];
  const byGroup = groups.reduce((acc, g) => {
    acc[g] = ANIMATIONS.filter(a => a.group === g);
    return acc;
  }, {});

  return (
    <div>
      <SectionLabel>Entrance Animation</SectionLabel>

      {/* ── Animation picker ────────────────────────────── */}
      <ControlRow label="Animation">
        <select
          value={anim}
          onChange={e => onChange({ entrance_animation: e.target.value })}
          style={{ width: '100%', padding: '7px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff', fontSize: '.78rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
        >
          {groups.map(g => (
            <optgroup key={g} label={g} style={{ background: '#1e1e2e' }}>
              {byGroup[g].map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </optgroup>
          ))}
        </select>
      </ControlRow>

      {/* ── Animation details — only shown if an animation is selected ── */}
      {hasAnim && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <ControlRow label="Delay (ms)">
              <NumberInput
                value={s.entrance_animation_delay ?? 0}
                min={0} max={3000} step={50}
                onChange={v => onChange({ entrance_animation_delay: v })}
                suffix="ms"
              />
            </ControlRow>
            <ControlRow label="Duration (ms)">
              <NumberInput
                value={s.entrance_animation_duration ?? 600}
                min={100} max={5000} step={50}
                onChange={v => onChange({ entrance_animation_duration: v })}
                suffix="ms"
              />
            </ControlRow>
          </div>

          <ControlRow label="Easing">
            <SelectInput
              value={s.entrance_animation_easing || 'ease-out'}
              onChange={v => onChange({ entrance_animation_easing: v })}
              options={EASINGS}
            />
          </ControlRow>

          <ControlRow label="Replay on Every Scroll">
            <Toggle
              value={!!s.entrance_animation_replay}
              onChange={v => onChange({ entrance_animation_replay: v })}
            />
          </ControlRow>

          {/* Preview animation */}
          <div style={{ padding: '12px', background: 'rgba(129,140,248,.08)', borderRadius: '9px', border: '1px solid rgba(129,140,248,.15)', marginTop: '8px' }}>
            <div style={{ fontSize: '.68rem', color: 'rgba(129,140,248,.7)', marginBottom: '6px' }}>Animation Preview</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                key={`${anim}-${Date.now()}`}
                style={{
                  width: '40px', height: '40px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7C3AED, #06D6A0)',
                  animationName:           anim,
                  animationDuration:       `${s.entrance_animation_duration ?? 600}ms`,
                  animationDelay:          `${s.entrance_animation_delay ?? 0}ms`,
                  animationTimingFunction: s.entrance_animation_easing || 'ease-out',
                  animationFillMode:       'both',
                }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                onClick={() => onChange({ entrance_animation: anim + ' ' })}
                style={{ padding: '4px 12px', background: 'rgba(129,140,248,.2)', border: '1px solid rgba(129,140,248,.3)', borderRadius: '6px', color: '#818CF8', cursor: 'pointer', fontSize: '.68rem' }}
                onMouseLeave={e => onChange({ entrance_animation: anim.trim() })}
              >
                ▶ Replay
              </button>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => onChange({ entrance_animation: 'none', entrance_animation_delay: 0, entrance_animation_duration: 600 })}
            style={{ width: '100%', padding: '6px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', borderRadius: '7px', color: '#EF4444', cursor: 'pointer', fontSize: '.7rem', marginTop: '8px' }}
          >
            Remove Animation
          </button>
        </>
      )}

      {!hasAnim && (
        <div style={{ padding: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,.1)', borderRadius: '8px', color: 'rgba(255,255,255,.25)', fontSize: '.75rem' }}>
          Choose an animation above to add an entrance effect
        </div>
      )}
    </div>
  );
}
