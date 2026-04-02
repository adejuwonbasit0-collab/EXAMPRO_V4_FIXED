// builder/widgets/IconWidget.jsx

const SHAPE_RADIUS = { none: '0', circle: '50%', rounded: '14px', square: '4px' };

export default function IconWidget({ settings: s }) {
  const size       = s.size      || 48;
  const pad        = s.padding   || 16;
  const shape      = s.bg_shape  || 'circle';
  const opacity    = s.bg_opacity ?? 0.1;
  const bgColor    = s.bg_color  || 'var(--color-primary)';

  // Convert opacity to hex alpha for the background hex string
  const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');

  const iconBox = (
    <div style={{
      display:         'inline-flex',
      alignItems:      'center',
      justifyContent:  'center',
      width:           shape !== 'none' ? `${size + pad * 2}px` : `${size}px`,
      height:          shape !== 'none' ? `${size + pad * 2}px` : `${size}px`,
      borderRadius:    SHAPE_RADIUS[shape] || '50%',
      background:      shape !== 'none' ? `${bgColor}${alphaHex}` : 'transparent',
      transition:      'all .2s ease',
    }}>
      <i className={`fas ${s.icon_class || 'fa-star'}`}
        style={{ fontSize: `${size}px`, color: s.color || 'var(--color-primary)' }} />
    </div>
  );

  const aligned = (
    <div style={{
      display:        'flex',
      justifyContent: s.alignment === 'center' ? 'center'
                    : s.alignment === 'right'  ? 'flex-end'
                    : 'flex-start',
    }}>
      {iconBox}
    </div>
  );

  return s.link_url
    ? <a href={s.link_url} target={s.link_target || '_self'} rel="noopener"
        style={{ textDecoration: 'none', display: 'block' }}>{aligned}</a>
    : aligned;
}
