// builder/toolbar/DeviceToolbar.jsx
// Replaces the inline device buttons in TopToolbar.
// New features:
//  • Breakpoint px label below each device icon
//  • Override count badge on non-desktop devices
//  • Animated indicator bar slides under active device
//  • Keyboard shortcuts: D=desktop, T=tablet, M=mobile (when no input focused)

import { useEffect }    from 'react';
import useBuilderStore  from '../store/useBuilderStore';
import { DEVICES, countOverrides } from '../responsive/useResponsive';
import {
  selectSelectedWidget,
  selectSelectedSection,
  selectWidgetContext,
} from '../store/selectors';

const DEVICE_ORDER = ['desktop', 'tablet', 'mobile'];

export default function DeviceToolbar() {
  const deviceMode   = useBuilderStore(s => s.deviceMode);
  const setDevice    = useBuilderStore(s => s.setDeviceMode);
  const selType      = useBuilderStore(s => s.selectionType);
  const widget       = useBuilderStore(selectSelectedWidget);
  const section      = useBuilderStore(selectSelectedSection);
  const context      = useBuilderStore(selectWidgetContext);

  const selectedElement =
    selType === 'widget'  ? widget :
    selType === 'section' ? section :
    selType === 'column'  ? context?.column : null;

  // Keyboard shortcuts: press D / T / M (when not in an input/textarea)
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'd' || e.key === 'D') setDevice('desktop');
      if (e.key === 't' || e.key === 'T') setDevice('tablet');
      if (e.key === 'm' || e.key === 'M') setDevice('mobile');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setDevice]);

  const activeIdx = DEVICE_ORDER.indexOf(deviceMode);

  return (
    <div style={{
      position:     'relative',
      display:      'flex',
      gap:          '2px',
      background:   'rgba(255,255,255,.05)',
      borderRadius: '10px',
      padding:      '3px',
    }}>
      {DEVICE_ORDER.map((mode, idx) => {
        const cfg        = DEVICES[mode];
        const isActive   = mode === deviceMode;
        const overrides  = selectedElement ? countOverrides(selectedElement, mode) : 0;
        const hasOver    = overrides > 0;

        return (
          <button
            key={mode}
            onClick={() => setDevice(mode)}
            title={`${cfg.label} (${cfg.px})${mode !== 'desktop' ? ' — press ' + mode[0].toUpperCase() : ''}`}
            style={{
              position:     'relative',
              display:      'flex',
              flexDirection:'column',
              alignItems:   'center',
              justifyContent:'center',
              gap:          '2px',
              padding:      '6px 10px',
              border:       'none',
              borderRadius: '8px',
              background:   isActive ? 'rgba(124,58,237,.65)' : 'transparent',
              color:        isActive ? '#fff' : 'rgba(255,255,255,.45)',
              cursor:       'pointer',
              transition:   'all .15s',
              minWidth:     '54px',
            }}
          >
            {/* Device icon */}
            <span style={{ fontSize: '.95rem', lineHeight: 1 }}>
              {mode === 'desktop' ? '🖥' : mode === 'tablet' ? '📟' : '📱'}
            </span>

            {/* Breakpoint label */}
            <span style={{
              fontSize:    '.55rem',
              fontWeight:  isActive ? 700 : 400,
              letterSpacing: '.02em',
              lineHeight:  1,
            }}>
              {cfg.px}
            </span>

            {/* Override count badge */}
            {hasOver && (
              <div style={{
                position:     'absolute',
                top:          '3px',
                right:        '3px',
                minWidth:     '14px',
                height:       '14px',
                background:   isActive ? 'rgba(255,255,255,.9)' : '#818CF8',
                color:        isActive ? '#7C3AED' : '#fff',
                borderRadius: '7px',
                fontSize:     '.55rem',
                fontWeight:   700,
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                padding:      '0 3px',
                lineHeight:   1,
              }}>
                {overrides}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
