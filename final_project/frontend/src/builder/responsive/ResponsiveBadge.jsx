// builder/responsive/ResponsiveBadge.jsx
// A colored status banner shown at the top of every settings panel
// whenever the user is in tablet or mobile mode.
// Tells them clearly: "you are now editing tablet overrides".
// Also shows a "Clear all overrides for this device" action.

import useBuilderStore  from '../store/useBuilderStore';
import { DEVICES }      from './useResponsive';
import useResponsive    from './useResponsive';

// Color palette per device
const DEVICE_COLORS = {
  desktop: null,
  tablet:  { bg: 'rgba(6,214,160,.12)',  border: 'rgba(6,214,160,.35)',  text: '#06D6A0', dot: '#06D6A0' },
  mobile:  { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)', text: '#F59E0B', dot: '#F59E0B' },
};

export default function ResponsiveBadge() {
  const { deviceMode, overrideCount, clearOverride, isOverriding } = useResponsive();

  if (!isOverriding) return null;

  const cfg = DEVICES[deviceMode];
  const col = DEVICE_COLORS[deviceMode];

  return (
    <div style={{
      margin:       '0 0 14px 0',
      padding:      '10px 12px',
      background:   col.bg,
      border:       `1px solid ${col.border}`,
      borderRadius: '9px',
      display:      'flex',
      alignItems:   'center',
      gap:          '8px',
    }}>
      {/* Pulsing dot */}
      <div style={{
        width:        '8px',
        height:       '8px',
        borderRadius: '50%',
        background:   col.dot,
        flexShrink:   0,
        boxShadow:    `0 0 0 3px ${col.border}`,
        animation:    'pulse-dot 2s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 3px ${col.border}; }
          50%       { box-shadow: 0 0 0 6px transparent; }
        }
      `}</style>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '.72rem', fontWeight: 700, color: col.text, lineHeight: 1.3 }}>
          {cfg.icon} Editing {cfg.label} overrides
        </div>
        <div style={{ fontSize: '.62rem', color: `${col.text}99`, lineHeight: 1.3, marginTop: '2px' }}>
          {overrideCount === 0
            ? 'No overrides yet — changes will only affect this device'
            : `${overrideCount} override${overrideCount > 1 ? 's' : ''} set for this device`}
        </div>
      </div>

      {/* Clear all button */}
      {overrideCount > 0 && (
        <button
          onClick={() => clearOverride(null)}
          title={`Clear all ${cfg.label} overrides`}
          style={{
            padding:      '4px 8px',
            background:   'transparent',
            border:       `1px solid ${col.border}`,
            borderRadius: '6px',
            color:        col.text,
            cursor:       'pointer',
            fontSize:     '.62rem',
            fontWeight:   600,
            flexShrink:   0,
            transition:   'all .12s',
          }}
        >
          Reset all
        </button>
      )}
    </div>
  );
}
