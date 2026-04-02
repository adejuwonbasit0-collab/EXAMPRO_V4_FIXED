// builder/responsive/ResponsiveField.jsx
// Wraps any control row to indicate whether that specific field
// has a responsive override on the current device.
//
// Shows:
//   • A colored left border when overridden
//   • A small "× clear" button to remove just this field's override
//   • A "↩ desktop value" hint showing what the base value is
//
// Usage:
//   <ResponsiveField fieldKey="font_size" element={widget}>
//     <ControlRow label="Font Size">
//       <input ... />
//     </ControlRow>
//   </ResponsiveField>

import { useState }    from 'react';
import useBuilderStore from '../store/useBuilderStore';
import { hasOverride, getOverrideValue, DEVICES } from './useResponsive';
import useResponsive   from './useResponsive';

// Color palette per device (same as badge)
const DEVICE_COLORS = {
  tablet: { border: '#06D6A0', bg: 'rgba(6,214,160,.06)',  text: '#06D6A0' },
  mobile: { border: '#F59E0B', bg: 'rgba(245,158,11,.06)', text: '#F59E0B' },
};

/**
 * ResponsiveField
 *
 * Props:
 *   fieldKey  — the settings key this field controls (e.g. 'font_size')
 *   element   — the widget/section/column object from the store
 *   device    — current deviceMode (will use store value if not passed)
 *   clearFn   — function to call to clear override: (key) => void
 *   children  — the control row(s) to wrap
 *   baseValue — optional explicit base value to show in the "desktop" hint
 */
export default function ResponsiveField({ fieldKey, element, clearFn, children, baseValue }) {
  const { deviceMode, isOverriding } = useResponsive();
  const [showHint, setShowHint]      = useState(false);

  // Not in responsive mode — render children undecorated
  if (!isOverriding) return <>{children}</>;

  const isOver     = hasOverride(element, deviceMode, fieldKey);
  const col        = DEVICE_COLORS[deviceMode];
  const overVal    = getOverrideValue(element, deviceMode, fieldKey);
  const desktopVal = baseValue ?? element?.settings?.[fieldKey];

  return (
    <div style={{
      position:     'relative',
      borderLeft:   isOver ? `2px solid ${col.border}` : '2px solid transparent',
      paddingLeft:  isOver ? '8px' : '0',
      marginLeft:   isOver ? '-10px' : '0',
      background:   isOver ? col.bg : 'transparent',
      borderRadius: isOver ? '0 6px 6px 0' : '0',
      transition:   'all .12s',
    }}>
      {children}

      {/* Override indicator row */}
      {isOver && (
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         '6px',
          marginTop:   '3px',
          paddingLeft: '2px',
        }}>
          {/* "Desktop" base value hint */}
          {desktopVal !== undefined && (
            <button
              onClick={() => setShowHint(h => !h)}
              style={{
                fontSize:   '.58rem',
                color:      `${col.text}99`,
                background: 'transparent',
                border:     'none',
                cursor:     'pointer',
                padding:    '0',
                fontFamily: 'monospace',
              }}
            >
              ↩ desktop: {String(desktopVal).slice(0, 18)}{String(desktopVal).length > 18 ? '…' : ''}
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Clear this field's override */}
          {clearFn && (
            <button
              onClick={() => clearFn(fieldKey)}
              title="Remove this override — revert to desktop value"
              style={{
                fontSize:     '.58rem',
                color:        col.text,
                background:   'transparent',
                border:       `1px solid ${col.border}`,
                borderRadius: '4px',
                cursor:       'pointer',
                padding:      '1px 5px',
                fontWeight:   600,
              }}
            >
              × clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
