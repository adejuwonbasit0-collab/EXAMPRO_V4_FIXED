// builder/sections/ShapeDivider.jsx

const SHAPES = {
  wave: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
    </svg>
  ),
  wave_smooth: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M0,0 Q360,80 720,40 Q1080,0 1440,60 L1440,80 L0,80 Z" />
    </svg>
  ),
  tilt: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M0,0 L1440,80 L1440,80 L0,80 Z" />
    </svg>
  ),
  triangle: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M720,0 L1440,80 L0,80 Z" />
    </svg>
  ),
  zigzag: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 40" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <polyline points="0,40 60,0 120,40 180,0 240,40 300,0 360,40 420,0 480,40 540,0 600,40 660,0 720,40 780,0 840,40 900,0 960,40 1020,0 1080,40 1140,0 1200,40 1260,0 1320,40 1380,0 1440,40 1440,40 0,40" />
    </svg>
  ),
  curve: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M0,80 Q720,-40 1440,80 L1440,80 L0,80 Z" />
    </svg>
  ),
  arrow: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M0,80 L660,0 L720,30 L780,0 L1440,80 Z" />
    </svg>
  ),
  split: (flip, height) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height, transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M0,0 L720,80 L1440,0 L1440,80 L0,80 Z" />
    </svg>
  ),
};

export default function ShapeDivider({ config, position }) {
  if (!config || !config.shape || config.shape === 'none') return null;

  const { shape, color = '#ffffff', height = 60, flip = false, invert = false } = config;
  const shapeFn = SHAPES[shape];
  if (!shapeFn) return null;

  const isTop = position === 'top';

  return (
    <div style={{
      position:       'absolute',
      [isTop ? 'top' : 'bottom']: 0,
      left:           0,
      right:          0,
      zIndex:         10,
      pointerEvents:  'none',
      transform:      invert ? 'scaleY(-1)' : 'none',
      lineHeight:     0,
    }}>
      <div style={{ fill: color }}>
        {shapeFn(flip, `${height}px`)}
      </div>
    </div>
  );
}

// ─── ShapeDividerControl — Right panel control ────────────────────────────────
export function ShapeDividerControl({ value, onChange, position }) {
  const config = value || { shape: 'none', color: '#ffffff', height: 60, flip: false };
  const set    = (patch) => onChange({ ...config, ...patch });

  const SHAPE_OPTIONS = [
    { value: 'none',        label: 'None'        },
    { value: 'wave',        label: 'Wave'        },
    { value: 'wave_smooth', label: 'Wave Smooth' },
    { value: 'tilt',        label: 'Tilt'        },
    { value: 'triangle',    label: 'Triangle'    },
    { value: 'curve',       label: 'Curve'       },
    { value: 'zigzag',      label: 'Zigzag'      },
    { value: 'arrow',       label: 'Arrow'       },
    { value: 'split',       label: 'Split'       },
  ];

  return (
    <div>
      <SelectInput
        value={config.shape || 'none'}
        onChange={v => set({ shape: v })}
        options={SHAPE_OPTIONS}
      />
      {config.shape && config.shape !== 'none' && (
        <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,.03)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', minWidth: '40px' }}>Color</span>
            <input type="color" value={config.color || '#ffffff'} onChange={e => set({ color: e.target.value })} style={{ width: '32px', height: '24px', border: 'none', borderRadius: '5px', cursor: 'pointer', padding: 0 }} />
            <input type="text" value={config.color || '#ffffff'} onChange={e => set({ color: e.target.value })} style={{ flex: 1, padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '5px', color: '#fff', fontSize: '.72rem', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', minWidth: '40px' }}>Height</span>
            <input type="range" min={20} max={200} value={config.height || 60} onChange={e => set({ height: Number(e.target.value) })} style={{ flex: 1, accentColor: '#818CF8' }} />
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', minWidth: '30px' }}>{config.height || 60}px</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', minWidth: '40px' }}>Flip</span>
            <Toggle value={!!config.flip}   onChange={v => set({ flip: v })} />
            <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.4)', marginLeft: '12px' }}>Invert</span>
            <Toggle value={!!config.invert} onChange={v => set({ invert: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
