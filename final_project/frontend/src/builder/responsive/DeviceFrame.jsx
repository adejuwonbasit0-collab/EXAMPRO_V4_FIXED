// builder/responsive/DeviceFrame.jsx
// Wraps the canvas area in a realistic device frame when tablet or mobile
// is selected. Desktop shows the standard full-width canvas.
//
// Rendered by PageRenderer — wraps the inner canvas content div.

import useBuilderStore from '../store/useBuilderStore';
import { DEVICES }     from './useResponsive';

export default function DeviceFrame({ children }) {
  const deviceMode = useBuilderStore(s => s.deviceMode);
  const cfg        = DEVICES[deviceMode];

  if (deviceMode === 'desktop') {
    // Desktop — no chrome, full width
    return <>{children}</>;
  }

  const isTablet = deviceMode === 'tablet';
  const isMobile = deviceMode === 'mobile';

  // Frame outer dimensions (device shell)
  const frameW = isTablet ? 830 : 420;
  const frameH = isTablet ? 620 : 760;

  return (
    <div style={{
      display:        'flex',
      justifyContent: 'center',
      alignItems:     'flex-start',
      padding:        '32px 24px 48px',
      minHeight:      '100%',
    }}>
      {/* Device shell */}
      <div style={{
        position:     'relative',
        width:        `${frameW}px`,
        flexShrink:   0,
        borderRadius: isTablet ? '20px' : '40px',
        background:   '#1a1a2e',
        boxShadow:    '0 0 0 2px #2d2d4e, 0 0 0 6px #0f0f1a, 0 28px 80px rgba(0,0,0,.7)',
        padding:      isTablet ? '24px 16px' : '52px 12px 36px',
        border:       '1px solid rgba(255,255,255,.08)',
      }}>

        {/* Mobile: top notch + camera pill */}
        {isMobile && (
          <div style={{
            position:    'absolute',
            top:         '16px',
            left:        '50%',
            transform:   'translateX(-50%)',
            width:       '90px',
            height:      '22px',
            background:  '#0f0f1a',
            borderRadius:'12px',
            zIndex:      10,
            display:     'flex',
            alignItems:  'center',
            justifyContent:'center',
            gap:         '6px',
          }}>
            {/* Camera */}
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e2038', border: '1px solid rgba(255,255,255,.08)' }} />
            {/* Speaker pill */}
            <div style={{ width: '36px', height: '5px', borderRadius: '3px', background: '#1e2038' }} />
          </div>
        )}

        {/* Tablet: top camera dot */}
        {isTablet && (
          <div style={{
            position:   'absolute',
            top:        '10px',
            left:       '50%',
            transform:  'translateX(-50%)',
            width:      '8px',
            height:     '8px',
            borderRadius:'50%',
            background: '#1e2038',
            border:     '1px solid rgba(255,255,255,.08)',
          }} />
        )}

        {/* Screen area */}
        <div style={{
          borderRadius: isTablet ? '10px' : '28px',
          overflow:     'hidden',
          background:   '#0f172a',
          width:        '100%',
          // Let content define height, but enforce a minimum scroll area
          minHeight:    isTablet ? '480px' : '620px',
          maxHeight:    '75vh',
          overflowY:    'auto',
          position:     'relative',
          // Subtle screen glare effect
          boxShadow:    'inset 0 0 0 1px rgba(255,255,255,.06)',
        }}>
          {children}
        </div>

        {/* Mobile: home indicator bar */}
        {isMobile && (
          <div style={{
            position:    'absolute',
            bottom:      '10px',
            left:        '50%',
            transform:   'translateX(-50%)',
            width:       '100px',
            height:      '4px',
            borderRadius:'2px',
            background:  'rgba(255,255,255,.25)',
          }} />
        )}

        {/* Tablet: side buttons */}
        {isTablet && (
          <>
            {/* Volume buttons (left) */}
            {[0, 36, 72].map(offset => (
              <div key={offset} style={{ position: 'absolute', left: '-5px', top: `${80 + offset}px`, width: '4px', height: '26px', background: '#2d2d4e', borderRadius: '2px 0 0 2px' }} />
            ))}
            {/* Power button (right) */}
            <div style={{ position: 'absolute', right: '-5px', top: '90px', width: '4px', height: '36px', background: '#2d2d4e', borderRadius: '0 2px 2px 0' }} />
          </>
        )}
      </div>

      {/* Breakpoint label below frame */}
      <div style={{
        position:   'absolute',
        bottom:     '8px',
        left:       '50%',
        transform:  'translateX(-50%)',
        fontSize:   '.65rem',
        color:      'rgba(255,255,255,.25)',
        fontWeight: 600,
        letterSpacing: '.08em',
        whiteSpace: 'nowrap',
      }}>
        {cfg.label.toUpperCase()} · {cfg.width} · max-width: {cfg.breakpoint || '∞'}
      </div>
    </div>
  );
}
