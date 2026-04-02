// builder/sections/SectionPickerModal.jsx

import { useState } from 'react';
import useBuilderStore from '../store/useBuilderStore';
import { generateId }  from '../utils/idGenerator';

// ─── Layout presets ───────────────────────────────────────────────────────────
const LAYOUT_PRESETS = [
  {
    label:   '1 Column',
    icon:    '▬',
    widths:  [100],
    preview: ['100%'],
  },
  {
    label:   '2 Columns',
    icon:    '▬▬',
    widths:  [50, 50],
    preview: ['50%', '50%'],
  },
  {
    label:   '3 Columns',
    icon:    '▬▬▬',
    widths:  [33.33, 33.33, 33.34],
    preview: ['33%', '33%', '33%'],
  },
  {
    label:   '4 Columns',
    icon:    '▬▬▬▬',
    widths:  [25, 25, 25, 25],
    preview: ['25%', '25%', '25%', '25%'],
  },
  {
    label:   '2/3 + 1/3',
    icon:    '◫▭',
    widths:  [66.66, 33.34],
    preview: ['66%', '33%'],
  },
  {
    label:   '1/3 + 2/3',
    icon:    '▭◫',
    widths:  [33.33, 66.67],
    preview: ['33%', '66%'],
  },
  {
    label:   '1/4 + 3/4',
    icon:    '▭◫',
    widths:  [25, 75],
    preview: ['25%', '75%'],
  },
  {
    label:   '3/4 + 1/4',
    icon:    '◫▭',
    widths:  [75, 25],
    preview: ['75%', '25%'],
  },
  {
    label:   '1/4 + 1/2 + 1/4',
    icon:    '▭◫▭',
    widths:  [25, 50, 25],
    preview: ['25%', '50%', '25%'],
  },
  {
    label:   '1/3 + 1/3 + 1/3',
    icon:    '▬▬▬',
    widths:  [33.33, 33.33, 33.34],
    preview: ['33%', '33%', '33%'],
  },
  {
    label:   '1/6 Sidebar Left',
    icon:    '▭◫◫',
    widths:  [16.66, 41.67, 41.67],
    preview: ['16%', '41%', '41%'],
  },
  {
    label:   '1/6 Sidebar Right',
    icon:    '◫◫▭',
    widths:  [41.67, 41.67, 16.66],
    preview: ['41%', '41%', '16%'],
  },
];

export default function SectionPickerModal({ onClose }) {
  const addSection         = useBuilderStore(s => s.addSection);
  const applyColumnLayout  = useBuilderStore(s => s.applyColumnLayout);
  const [hovered, setHovered] = useState(null);

  const handlePick = (preset) => {
    // Build the columns array from widths
    const columns = preset.widths.map(w => ({
      id:   generateId('column'),
      type: 'column',
      settings: {
        width:            w,
        min_height:       0,
        vertical_align:   'top',
        horizontal_align: 'left',
        padding:          { top: 0, right: 0, bottom: 0, left: 0 },
        background:       { type: 'none', color: 'transparent' },
        border:           { top: { width: 0, style: 'none', color: 'transparent' }, right: { width: 0, style: 'none', color: 'transparent' }, bottom: { width: 0, style: 'none', color: 'transparent' }, left: { width: 0, style: 'none', color: 'transparent' }, radius: 0 },
        overflow:         'visible',
      },
      responsive_settings: {
        tablet: { width: 100 },
        mobile: { width: 100 },
      },
      widgets: [],
    }));

    addSection({ columns });
    onClose();
  };

  return (
    // Modal backdrop
    <div
      onClick={onClose}
      style={{
        position:        'fixed',
        inset:           0,
        background:      'rgba(0,0,0,.6)',
        zIndex:          9000,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backdropFilter:  'blur(4px)',
      }}
    >
      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   '#13131f',
          border:       '1px solid rgba(255,255,255,.1)',
          borderRadius: '16px',
          padding:      '28px',
          width:        '560px',
          maxWidth:     'calc(100vw - 40px)',
          maxHeight:    '80vh',
          overflow:     'auto',
          boxShadow:    '0 32px 80px rgba(0,0,0,.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Add Section</div>
            <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', marginTop: '3px' }}>Choose a column layout to start with</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,.08)', border: 'none', color: 'rgba(255,255,255,.6)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Layout preset grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {LAYOUT_PRESETS.map((preset, i) => (
            <PresetCard
              key={i}
              preset={preset}
              isHovered={hovered === i}
              onHover={() => setHovered(i)}
              onLeave={() => setHovered(null)}
              onPick={() => handlePick(preset)}
            />
          ))}
        </div>

        {/* Blank section option */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <button
            onClick={() => { addSection(); onClose(); }}
            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.15)', borderRadius: '10px', color: 'rgba(255,255,255,.4)', fontSize: '.8rem', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,.4)'; e.currentTarget.style.color = '#818CF8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'; e.currentTarget.style.color = 'rgba(255,255,255,.4)'; }}
          >
            ＋ Blank Section (1 column, empty)
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetCard({ preset, isHovered, onHover, onLeave, onPick }) {
  return (
    <div
      onClick={onPick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        padding:      '14px 12px',
        borderRadius: '10px',
        border:       `1px solid ${isHovered ? 'rgba(129,140,248,.5)' : 'rgba(255,255,255,.08)'}`,
        background:   isHovered ? 'rgba(129,140,248,.08)' : 'rgba(255,255,255,.02)',
        cursor:       'pointer',
        transition:   'all .14s',
        textAlign:    'center',
      }}
    >
      {/* Column preview bars */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', height: '28px', alignItems: 'stretch' }}>
        {preset.preview.map((w, i) => (
          <div
            key={i}
            style={{
              flex:         w === '100%' ? 1 : undefined,
              width:        w !== '100%' ? w : undefined,
              background:   isHovered ? 'rgba(129,140,248,.4)' : 'rgba(255,255,255,.12)',
              borderRadius: '3px',
              flexGrow:     parseInt(w) / 100,
              transition:   'background .14s',
            }}
          />
        ))}
      </div>
      {/* Label */}
      <div style={{ fontSize: '.72rem', fontWeight: 600, color: isHovered ? '#818CF8' : 'rgba(255,255,255,.5)', transition: 'color .14s' }}>
        {preset.label}
      </div>
    </div>
  );
}

export { LAYOUT_PRESETS };
