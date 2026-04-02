// builder/widgets/PricingWidget.jsx

export default function PricingWidget({ settings: s, globalSettings: gs, device }) {
  const plans   = s.plans || [];
  const cols    = device === 'mobile' ? 1 : Math.min(s.columns || 2, plans.length);
  const primary = gs?.primary_color || 'var(--color-primary, #7C3AED)';

  if (!plans.length) {
    return <div style={{ padding: '28px', border: '2px dashed rgba(255,255,255,.1)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: '.8rem' }}>💰 Add plans in Content settings</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px', alignItems: 'start' }}>
      {plans.map(plan => (
        <div key={plan.id} style={{
          position:      'relative',
          borderRadius:  '20px',
          border:        plan.highlighted ? `2px solid ${primary}` : '1px solid rgba(255,255,255,.1)',
          background:    plan.highlighted ? `${primary}12` : 'rgba(255,255,255,.04)',
          padding:       '32px 28px',
          display:       'flex',
          flexDirection: 'column',
          gap:           '16px',
          transform:     plan.highlighted ? 'scale(1.02)' : 'none',
          boxShadow:     plan.highlighted ? `0 0 40px ${primary}28` : 'none',
        }}>
          {/* Badge */}
          {plan.badge && (
            <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: primary, color: '#fff', padding: '3px 16px', borderRadius: '99px', fontSize: '.68rem', fontWeight: 800, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
              {plan.badge}
            </div>
          )}

          <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{plan.name}</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{plan.price}</span>
            {plan.period && <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.4)' }}>{plan.period}</span>}
          </div>

          {plan.description && <p style={{ fontSize: '.83rem', color: 'rgba(255,255,255,.5)', margin: 0 }}>{plan.description}</p>}

          <div style={{ height: '1px', background: 'rgba(255,255,255,.08)' }} />

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(plan.features || []).map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '.85rem', color: f.included ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.25)' }}>
                <span style={{ flexShrink: 0, color: f.included ? '#06D6A0' : 'rgba(255,255,255,.2)' }}>
                  {f.included ? '✓' : '✕'}
                </span>
                {f.text}
              </li>
            ))}
          </ul>

          <a
            href={plan.button_url || '#'}
            onClick={e => e.preventDefault()}
            style={{ display: 'block', textAlign: 'center', marginTop: 'auto', padding: '12px 20px', borderRadius: '10px', textDecoration: 'none', background: plan.highlighted ? primary : 'rgba(255,255,255,.08)', color: '#fff', fontWeight: 700, fontSize: '.85rem', transition: 'all .15s' }}
          >
            {plan.button_text || 'Get Started'}
          </a>
        </div>
      ))}
    </div>
  );
}
