// builder/responsive/ResponsiveInspector.jsx
// The dedicated "Responsive" tab content shown in the Right Panel for widgets.
// Displays:
//   • A summary of which devices have overrides
//   • A full diff table: each overridden key with desktop vs override value
//   • One-click clear per field, or clear all for a device
//   • Quick-jump links to edit tablet or mobile overrides

import useBuilderStore        from '../store/useBuilderStore';
import { selectSelectedWidget }from '../store/selectors';
import { DEVICES }             from './useResponsive';

const DEVICE_COLORS = {
  tablet: { bg: 'rgba(6,214,160,.1)',  border: 'rgba(6,214,160,.3)',  text: '#06D6A0' },
  mobile: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.3)', text: '#F59E0B' },
};

function OverrideRow({ label, baseVal, overrideVal, onClear }) {
  const colStr = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v).slice(0, 40);
    return String(v).slice(0, 40);
  };

  return (
    <div style={{
      display:      'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap:          '6px',
      alignItems:   'center',
      padding:      '6px 8px',
      borderRadius: '6px',
      background:   'rgba(255,255,255,.03)',
      marginBottom: '4px',
    }}>
      <div>
        <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.35)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          ↩ {colStr(baseVal)}
        </div>
      </div>
      <div style={{
        fontSize:     '.6rem',
        fontFamily:   'monospace',
        color:        '#fff',
        background:   'rgba(129,140,248,.15)',
        padding:      '3px 6px',
        borderRadius: '5px',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {colStr(overrideVal)}
      </div>
      <button onClick={onClear} style={{
        background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.25)',
        color: '#EF4444', borderRadius: '5px', cursor: 'pointer',
        fontSize: '.6rem', padding: '3px 6px', fontWeight: 600, flexShrink: 0,
      }}>
        ×
      </button>
    </div>
  );
}

function DeviceOverrideSection({ device, widget, onClear, onClearAll, onSwitchTo }) {
  const col  = DEVICE_COLORS[device];
  const cfg  = DEVICES[device];
  const rs   = widget?.responsive_settings?.[device] || {};
  const keys = Object.keys(rs);

  return (
    <div style={{ marginBottom: '18px' }}>
      {/* Device header */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
        padding:      '8px 10px',
        background:   col.bg,
        border:       `1px solid ${col.border}`,
        borderRadius: '9px 9px 0 0',
        borderBottom: 'none',
      }}>
        <span style={{ fontSize: '.85rem' }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '.72rem', fontWeight: 700, color: col.text }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: '.62rem', color: `${col.text}80`, marginLeft: '6px' }}>
            {keys.length} override{keys.length !== 1 ? 's' : ''}
          </span>
        </div>
        {keys.length > 0 && (
          <button onClick={onClearAll} style={{
            fontSize: '.62rem', color: col.text, background: 'transparent',
            border: `1px solid ${col.border}`, borderRadius: '5px',
            padding: '2px 7px', cursor: 'pointer', fontWeight: 600,
          }}>
            Clear all
          </button>
        )}
        <button onClick={onSwitchTo} style={{
          fontSize: '.62rem', color: col.text, background: `${col.bg}`,
          border: `1px solid ${col.border}`, borderRadius: '5px',
          padding: '2px 7px', cursor: 'pointer', fontWeight: 700,
        }}>
          Edit →
        </button>
      </div>

      {/* Override rows */}
      <div style={{
        border: `1px solid ${col.border}`, borderTop: 'none',
        borderRadius: '0 0 9px 9px', padding: '8px',
        background: 'rgba(255,255,255,.02)',
      }}>
        {keys.length === 0 ? (
          <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.25)', textAlign: 'center', padding: '12px' }}>
            No overrides set — {cfg.label.toLowerCase()} inherits all desktop values
          </div>
        ) : (
          keys.map(key => (
            <OverrideRow
              key={key}
              label={key}
              baseVal={widget?.settings?.[key]}
              overrideVal={rs[key]}
              onClear={() => onClear(key)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function ResponsiveInspector() {
  const widget       = useBuilderStore(selectSelectedWidget);
  const setDevice    = useBuilderStore(s => s.setDeviceMode);
  const setTab       = useBuilderStore(s => s.setRightPanelTab);
  const clearWidget  = useBuilderStore(s => s.clearWidgetOverride);

  if (!widget) return (
    <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px', fontSize: '.8rem' }}>
      Select a widget to inspect its responsive overrides
    </div>
  );

  const totalOverrides = Object.keys(widget.responsive_settings?.tablet || {}).length
                       + Object.keys(widget.responsive_settings?.mobile || {}).length;

  const switchTo = (device) => {
    setDevice(device);
    setTab('style');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'rgba(255,255,255,.75)', marginBottom: '4px' }}>
          Responsive Overrides
        </div>
        <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)', lineHeight: 1.5 }}>
          {totalOverrides === 0
            ? 'This widget has no responsive overrides. Switch to Tablet or Mobile mode and edit any style setting to create an override.'
            : `${totalOverrides} total override${totalOverrides > 1 ? 's' : ''} across devices.`}
        </div>
      </div>

      {/* Desktop baseline note */}
      <div style={{
        padding: '10px 12px', background: 'rgba(129,140,248,.08)',
        border: '1px solid rgba(129,140,248,.2)', borderRadius: '8px', marginBottom: '16px',
      }}>
        <div style={{ fontSize: '.68rem', fontWeight: 600, color: '#818CF8', marginBottom: '2px' }}>
          🖥 Desktop — base values
        </div>
        <div style={{ fontSize: '.62rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>
          Desktop settings are the foundation. Tablet and mobile only store values that differ.
          To edit desktop settings, switch to Desktop mode.
        </div>
      </div>

      {/* Per-device override sections */}
      {['tablet', 'mobile'].map(device => (
        <DeviceOverrideSection
          key={device}
          device={device}
          widget={widget}
          onClear={(key)  => clearWidget(widget.id, device, key)}
          onClearAll={()  => clearWidget(widget.id, device, null)}
          onSwitchTo={()  => switchTo(device)}
        />
      ))}

      {/* How it works explainer */}
      <div style={{
        padding: '12px', background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px',
        fontSize: '.65rem', color: 'rgba(255,255,255,.3)', lineHeight: 1.7, marginTop: '8px',
      }}>
        <strong style={{ color: 'rgba(255,255,255,.5)' }}>How it works:</strong> Switch the
        device in the toolbar, then edit any Style setting. The change is saved as an override
        only for that device. Desktop always shows the base value. A colored left border on a
        control indicates it has an override.
      </div>
    </div>
  );
}
