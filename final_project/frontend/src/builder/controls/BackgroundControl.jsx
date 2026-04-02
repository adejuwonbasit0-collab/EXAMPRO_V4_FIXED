// builder/controls/BackgroundControl.jsx
// Updated in Phase 9: uses ColorControl and GradientControl.
// All existing API (props: value, onChange, supportVideo) is preserved.

import { ControlRow } from '../panels/RightPanel';
import { SelectInput } from './atoms';
import ColorControl from './ColorControl';
import GradientControl from './GradientControl';

const BG_TYPES = [
  { value: 'none',     label: 'None'     },
  { value: 'color',    label: 'Color'    },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image',    label: 'Image'    },
];

export default function BackgroundControl({ value = {}, onChange, supportVideo = false }) {
  const types = supportVideo ? [...BG_TYPES, { value: 'video', label: 'Video' }] : BG_TYPES;
  const type  = value.type || 'none';
  const set   = (patch) => onChange({ ...value, ...patch });

  return (
    <div>
      {/* ── Type selector ─────────────────────────────────── */}
      <ControlRow label="Type">
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {types.map(t => (
            <button key={t.value} onClick={() => onChange({ ...value, type: t.value })} style={{ flex: 1, minWidth: '44px', padding: '5px 4px', background: type === t.value ? 'rgba(129,140,248,.25)' : 'rgba(255,255,255,.05)', border: `1px solid ${type === t.value ? 'rgba(129,140,248,.5)' : 'rgba(255,255,255,.1)'}`, color: type === t.value ? '#818CF8' : 'rgba(255,255,255,.5)', borderRadius: '6px', cursor: 'pointer', fontSize: '.68rem', fontWeight: type === t.value ? 700 : 400, transition: 'all .14s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </ControlRow>

      {/* ── Solid Color ───────────────────────────────────── */}
      {type === 'color' && (
        <ControlRow label="Color">
          <ColorControl value={value.color || '#0f172a'} onChange={v => set({ color: v })} />
        </ControlRow>
      )}

      {/* ── Gradient ─────────────────────────────────────── */}
      {type === 'gradient' && (
        <GradientControl value={value} onChange={onChange} />
      )}

      {/* ── Image ────────────────────────────────────────── */}
      {type === 'image' && (
        <>
          <ControlRow label="Image URL">
            <input type="text" value={value.image_url || ''} onChange={e => set({ image_url: e.target.value })}
              placeholder="https://..." style={inp()} />
          </ControlRow>
          {value.image_url && (
            <div style={{ height: '80px', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', background: `url('${value.image_url}') center/cover` }} />
          )}
          <ControlRow label="Size">
            <SelectInput value={value.image_size || 'cover'} onChange={v => set({ image_size: v })} options={[
              { value: 'cover',     label: 'Cover'   },
              { value: 'contain',   label: 'Contain' },
              { value: 'auto',      label: 'Auto'    },
              { value: '100% 100%', label: 'Stretch' },
            ]} />
          </ControlRow>
          <ControlRow label="Position">
            <SelectInput value={value.image_position || 'center'} onChange={v => set({ image_position: v })} options={[
              { value: 'center',         label: 'Center' },
              { value: 'center top',     label: 'Top'    },
              { value: 'center bottom',  label: 'Bottom' },
              { value: 'left center',    label: 'Left'   },
              { value: 'right center',   label: 'Right'  },
            ]} />
          </ControlRow>
          <ControlRow label="Repeat">
            <SelectInput value={value.image_repeat || 'no-repeat'} onChange={v => set({ image_repeat: v })} options={[
              { value: 'no-repeat', label: 'No Repeat' },
              { value: 'repeat',    label: 'Repeat'    },
              { value: 'repeat-x',  label: 'Repeat X'  },
              { value: 'repeat-y',  label: 'Repeat Y'  },
            ]} />
          </ControlRow>
          <ControlRow label="Overlay Color">
            <ColorControl value={value.overlay_color || '#000000'} onChange={v => set({ overlay_color: v })} />
          </ControlRow>
          <ControlRow label={`Overlay Opacity — ${Math.round((value.overlay_opacity ?? 0.4) * 100)}%`}>
            <input type="range" min={0} max={1} step={0.01} value={value.overlay_opacity ?? 0.4}
              onChange={e => set({ overlay_opacity: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#818CF8' }} />
          </ControlRow>
        </>
      )}

      {/* ── Video ─────────────────────────────────────────── */}
      {type === 'video' && (
        <>
          <ControlRow label="Video URL (mp4)">
            <input type="text" value={value.video_url || ''} onChange={e => set({ video_url: e.target.value })}
              placeholder="https://example.com/bg.mp4" style={inp()} />
          </ControlRow>
          <ControlRow label="Fallback Image URL">
            <input type="text" value={value.video_fallback_url || ''} onChange={e => set({ video_fallback_url: e.target.value })}
              placeholder="https://... (shown on mobile)" style={inp()} />
          </ControlRow>
          <ControlRow label="Overlay Color">
            <ColorControl value={value.overlay_color || '#000000'} onChange={v => set({ overlay_color: v })} />
          </ControlRow>
          <ControlRow label={`Overlay Opacity — ${Math.round((value.overlay_opacity ?? 0.4) * 100)}%`}>
            <input type="range" min={0} max={1} step={0.01} value={value.overlay_opacity ?? 0.4}
              onChange={e => set({ overlay_opacity: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#818CF8' }} />
          </ControlRow>
        </>
      )}
    </div>
  );
}

const inp = (extra = {}) => ({
  width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff',
  fontSize: '.78rem', outline: 'none', boxSizing: 'border-box', ...extra,
});
