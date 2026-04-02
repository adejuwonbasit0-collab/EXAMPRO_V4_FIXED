// builder/controls/SpacingControl.jsx
// Padding / margin input with T R B L and "link all" toggle

import { useState } from 'react';

export default function SpacingControl({ value = { top: 0, right: 0, bottom: 0, left: 0 }, onChange }) {
  const [linked, setLinked] = useState(false);

  const { top = 0, right = 0, bottom = 0, left = 0 } = value;

  const update = (side, v) => {
    const num = Math.max(0, parseInt(v) || 0);
    if (linked) {
      onChange({ top: num, right: num, bottom: num, left: num });
    } else {
      onChange({ ...value, [side]: num });
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', alignItems: 'end' }}>
        {[
          { key: 'top',    label: 'T', value: top    },
          { key: 'right',  label: 'R', value: right  },
          { key: 'bottom', label: 'B', value: bottom },
          { key: 'left',   label: 'L', value: left   },
        ].map(side => (
          <div key={side.key} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.3)', marginBottom: '3px', fontWeight: 700 }}>{side.label}</div>
            <input
              type="number"
              value={side.value}
              min={0}
              onChange={e => update(side.key, e.target.value)}
              style={{ width: '100%', padding: '6px 4px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff', fontSize: '.76rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      {/* Link toggle */}
      <div
        onClick={() => setLinked(l => !l)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', cursor: 'pointer', padding: '4px 6px', borderRadius: '5px', background: linked ? 'rgba(129,140,248,.1)' : 'transparent', transition: 'background .14s' }}
      >
        <div style={{
          width:      '14px',
          height:     '14px',
          borderRadius:'50%',
          border:     `2px solid ${linked ? '#818CF8' : 'rgba(255,255,255,.2)'}`,
          background: linked ? '#818CF8' : 'transparent',
          flexShrink: 0,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all .14s',
        }}>
          {linked && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fff' }} />}
        </div>
        <span style={{ fontSize: '.68rem', color: linked ? '#818CF8' : 'rgba(255,255,255,.3)', fontWeight: linked ? 600 : 400, transition: 'color .14s' }}>
          {linked ? 'All sides linked' : 'Link all sides'}
        </span>
      </div>
    </div>
  );
}
