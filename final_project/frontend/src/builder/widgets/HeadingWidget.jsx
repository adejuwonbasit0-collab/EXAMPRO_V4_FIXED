// builder/widgets/HeadingWidget.jsx

export default function HeadingWidget({ settings: s, globalSettings: gs }) {
  const Tag = ['h1','h2','h3','h4','h5','h6'].includes(s.html_tag) ? s.html_tag : 'h2';

  const el = (
    <Tag style={{
      margin:        0,
      fontSize:      `${s.font_size || 36}px`,
      fontWeight:    s.font_weight  || '700',
      color:         s.color        || 'var(--color-primary)',
      textAlign:     s.text_align   || 'left',
      lineHeight:    s.line_height  || 1.2,
      letterSpacing: s.letter_spacing ? `${s.letter_spacing}px` : 'normal',
      fontFamily:    gs?.font_family ? `'${gs.font_family}', sans-serif` : 'inherit',
      wordBreak:     'break-word',
    }}>
      {s.text || 'Heading'}
    </Tag>
  );

  const wrapped = s.link_url
    ? <a href={s.link_url} target={s.link_target || '_self'} rel="noopener"
        style={{ textDecoration: 'none', display: 'block' }}>{el}</a>
    : el;

  return (
    <div style={{ marginBottom: `${s.margin_bottom ?? 0}px` }}>
      {wrapped}
    </div>
  );
}
