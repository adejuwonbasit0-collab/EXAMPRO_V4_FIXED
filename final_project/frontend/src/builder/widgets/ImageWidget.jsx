// builder/widgets/ImageWidget.jsx

const HOVER_TRANSITIONS = {
  zoom:      e => { e.currentTarget.style.transform = 'scale(1.05)'; },
  fade:      e => { e.currentTarget.style.opacity   = '0.72'; },
  grayscale: e => { e.currentTarget.style.filter    = 'grayscale(100%)'; },
};
const HOVER_RESET = e => {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.opacity   = '';
  e.currentTarget.style.filter    = '';
};

export default function ImageWidget({ settings: s }) {
  const marginMap = {
    left:   '0',
    center: '0 auto',
    right:  '0 0 0 auto',
  };

  if (!s.src) {
    return (
      <div style={{
        padding: '32px', border: '2px dashed rgba(255,255,255,.1)',
        borderRadius: `${s.border_radius || 12}px`,
        textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: '.8rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '2rem', opacity: .4 }}>🖼</span>
        Add an image URL in Content settings
      </div>
    );
  }

  const img = (
    <figure style={{ margin: 0 }}>
      <img
        src={s.src}
        alt={s.alt || ''}
        loading={s.lazy_load !== false ? 'lazy' : 'eager'}
        style={{
          display:      'block',
          width:        s.width    || '100%',
          maxWidth:     s.max_width || '100%',
          height:       s.height   || 'auto',
          objectFit:    s.object_fit || 'cover',
          borderRadius: `${s.border_radius || 0}px`,
          boxShadow:    s.box_shadow || 'none',
          margin:       marginMap[s.alignment || 'center'],
          transition:   'transform .3s ease, opacity .3s ease, filter .3s ease',
        }}
        onMouseEnter={HOVER_TRANSITIONS[s.hover_effect] || undefined}
        onMouseLeave={s.hover_effect && s.hover_effect !== 'none' ? HOVER_RESET : undefined}
      />
      {s.caption && (
        <figcaption style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.4)', textAlign: 'center', marginTop: '8px' }}>
          {s.caption}
        </figcaption>
      )}
    </figure>
  );

  return s.link_url
    ? <a href={s.link_url} target={s.link_target || '_self'} rel="noopener" style={{ display: 'block', textDecoration: 'none' }}>{img}</a>
    : img;
}
