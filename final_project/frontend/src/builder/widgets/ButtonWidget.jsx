// builder/widgets/ButtonWidget.jsx

function buildVariantStyle(s) {
  const bg = s.bg_color    || 'var(--color-primary)';
  const fg = s.text_color  || '#ffffff';

  const variants = {
    filled:   { background: bg, color: fg, border: 'none' },
    outline:  { background: 'transparent', color: bg, border: `2px solid ${bg}` },
    ghost:    { background: `${bg}1a`, color: bg, border: `1px solid ${bg}40` },
    gradient: { background: `linear-gradient(135deg, ${bg}, var(--color-accent,#06D6A0))`, color: '#fff', border: 'none' },
    link:     { background: 'transparent', color: bg, border: 'none', textDecoration: 'underline', padding: '0' },
  };

  return variants[s.button_style || 'filled'] || variants.filled;
}

export default function ButtonWidget({ settings: s }) {
  const variant = buildVariantStyle(s);
  const isLink  = s.button_style === 'link';

  const btnStyle = {
    ...variant,
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            s.icon_class ? '8px' : '0',
    fontSize:       `${s.font_size || 15}px`,
    fontWeight:     s.font_weight  || '700',
    padding:        isLink ? '0'
      : `${s.padding_top || 12}px ${s.padding_right || 28}px ${s.padding_bottom || 12}px ${s.padding_left || 28}px`,
    borderRadius:   `${s.border_radius || 10}px`,
    boxShadow:      s.box_shadow || 'none',
    cursor:         'pointer',
    textDecoration: isLink ? 'underline' : 'none',
    transition:     'all .2s ease',
    width:          s.width === 'full' ? '100%' : 'auto',
    lineHeight:     1,
    letterSpacing:  '.02em',
    whiteSpace:     'nowrap',
  };

  return (
    <div style={{
      textAlign: s.alignment === 'center' ? 'center'
               : s.alignment === 'right'  ? 'right'
               : 'left',
    }}>
      <a
        href={s.link_url || '#'}
        target={s.link_target || '_self'}
        rel="noopener"
        style={btnStyle}
        onClick={e => e.preventDefault()}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = (s.box_shadow || '0 4px 14px rgba(0,0,0,.25)')
            .replace(/[\d.]+(?=\)$)/, '0.45');
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = s.box_shadow || 'none';
        }}
      >
        {s.icon_class && s.icon_position !== 'right' && (
          <i className={`fas ${s.icon_class}`} aria-hidden="true" />
        )}
        {s.text || 'Click Here'}
        {s.icon_class && s.icon_position === 'right' && (
          <i className={`fas ${s.icon_class}`} aria-hidden="true" />
        )}
      </a>
    </div>
  );
}
