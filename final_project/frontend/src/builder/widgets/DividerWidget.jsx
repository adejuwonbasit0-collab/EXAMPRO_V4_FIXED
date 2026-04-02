// builder/widgets/DividerWidget.jsx

export default function DividerWidget({ settings: s }) {
  const lineColor = s.color || 'rgba(255,255,255,0.12)';
  const border    = `${s.weight || 1}px ${s.style || 'solid'} ${lineColor}`;

  return (
    <div style={{
      padding:   `${s.gap_top || 16}px 0 ${s.gap_bottom || 16}px`,
      textAlign: s.alignment || 'center',
    }}>
      {s.icon_class ? (
        // Icon-centred variant
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          width: s.width || '100%', margin: '0 auto',
        }}>
          <div style={{ flex: 1, borderTop: border }} />
          <i className={`fas ${s.icon_class}`}
            style={{ color: lineColor, fontSize: '14px' }} />
          <div style={{ flex: 1, borderTop: border }} />
        </div>
      ) : (
        <hr style={{
          display:     'inline-block',
          width:       s.width || '100%',
          margin:      0,
          border:      'none',
          borderTop:   border,
          verticalAlign: 'middle',
        }} />
      )}
    </div>
  );
}
