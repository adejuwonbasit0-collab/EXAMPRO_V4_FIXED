// builder/widgets/SocialIconsWidget.jsx

import { useState } from 'react';

const BRAND_MAP = {
  facebook:  { color: '#1877F2', fa: 'fa-facebook-f'    },
  instagram: { color: '#E4405F', fa: 'fa-instagram'      },
  twitter:   { color: '#1DA1F2', fa: 'fa-twitter'        },
  youtube:   { color: '#FF0000', fa: 'fa-youtube'        },
  whatsapp:  { color: '#25D366', fa: 'fa-whatsapp'       },
  linkedin:  { color: '#0A66C2', fa: 'fa-linkedin-in'    },
  tiktok:    { color: '#010101', fa: 'fa-tiktok'         },
  telegram:  { color: '#2CA5E0', fa: 'fa-telegram-plane' },
  pinterest: { color: '#E60023', fa: 'fa-pinterest-p'    },
  github:    { color: '#181717', fa: 'fa-github'         },
  snapchat:  { color: '#FFFC00', fa: 'fa-snapchat-ghost' },
};

// Per-item icon — handles hover state internally
function SocialIcon({ item, s }) {
  const [hov, setHov] = useState(false);
  const brand   = BRAND_MAP[item.network] || { color: '#818CF8', fa: 'fa-globe' };
  const size    = s.icon_size || 24;
  const isBrand = s.color_type === 'brand';
  const boxSize = `${size + 16}px`;

  // Determine background by shape variant
  const shapeBg = {
    default:       'transparent',
    rounded:       hov ? (isBrand ? brand.color : 'rgba(255,255,255,.18)') : 'rgba(255,255,255,.06)',
    circle:        hov ? (isBrand ? brand.color : 'rgba(255,255,255,.18)') : 'rgba(255,255,255,.06)',
    square:        hov ? (isBrand ? brand.color : 'rgba(255,255,255,.18)') : 'rgba(255,255,255,.06)',
    filled_circle: isBrand ? (hov ? brand.color : `${brand.color}bb`) : 'rgba(255,255,255,.12)',
  }[s.icon_style || 'rounded'] || 'rgba(255,255,255,.06)';

  const radius = { default: '0', rounded: '8px', circle: '50%', square: '2px', filled_circle: '50%' }[s.icon_style || 'rounded'] || '8px';

  const iconColor = isBrand
    ? (hov && s.icon_style === 'filled_circle' ? '#fff' : brand.color)
    : (s.custom_color || 'rgba(255,255,255,.8)');

  return (
    <a
      href={item.url || '#'}
      target={s.open_in_new_tab ? '_blank' : '_self'}
      rel="noopener noreferrer"
      title={item.label || item.network}
      onClick={e => e.preventDefault()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: boxSize, height: boxSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none', cursor: 'pointer',
        borderRadius: radius,
        background: shapeBg,
        transition: 'all .2s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      <i className={`fab ${brand.fa}`} style={{ fontSize: `${size}px`, color: iconColor }} />
    </a>
  );
}

export default function SocialIconsWidget({ settings: s }) {
  return (
    <div style={{
      display:        'flex',
      flexWrap:       'wrap',
      gap:            `${s.gap || 16}px`,
      justifyContent: s.alignment === 'center' ? 'center'
                    : s.alignment === 'right'  ? 'flex-end'
                    : 'flex-start',
    }}>
      {(s.items || []).map(item => (
        <SocialIcon key={item.id} item={item} s={s} />
      ))}
    </div>
  );
}
