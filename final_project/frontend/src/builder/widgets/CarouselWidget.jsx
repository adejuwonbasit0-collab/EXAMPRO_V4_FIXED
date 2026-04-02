// builder/widgets/CarouselWidget.jsx

import { useState, useEffect, useRef } from 'react';

const RATIOS = { '16:9': '56.25%', '4:3': '75%', '1:1': '100%', '9:16': '177.78%' };

export default function CarouselWidget({ settings: s }) {
  const [idx,    setIdx]    = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const slides = s.slides || [];

  useEffect(() => {
    if (!s.autoplay || paused || slides.length <= 1) {
      clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setIdx(i => s.loop ? (i + 1) % slides.length : Math.min(i + 1, slides.length - 1));
    }, s.autoplay_speed || 5000);
    return () => clearInterval(timer.current);
  }, [s.autoplay, s.autoplay_speed, paused, slides.length, s.loop]);

  if (!slides.length) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', border: '2px dashed rgba(255,255,255,.1)', borderRadius: '12px', color: 'rgba(255,255,255,.3)', fontSize: '.8rem' }}>
        🎠 Add slides in Content settings
      </div>
    );
  }

  const slide = slides[idx];
  const prev  = () => setIdx(i => i > 0 ? i - 1 : s.loop ? slides.length - 1 : i);
  const next  = () => setIdx(i => i < slides.length - 1 ? i + 1 : s.loop ? 0 : i);

  return (
    <div
      style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', userSelect: 'none' }}
      onMouseEnter={() => s.pause_on_hover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Aspect-ratio container */}
      <div style={{ position: 'relative', paddingBottom: RATIOS[s.aspect_ratio] || '56.25%' }}>
        {/* Background image */}
        {slide.image_src
          ? <img src={slide.image_src} alt={slide.heading || ''}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.04)' }} />
        }

        {/* Text overlay */}
        {(slide.heading || slide.subtext || slide.button_text) && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', padding: '28px 24px',
            background: 'linear-gradient(to top, rgba(0,0,0,.72) 0%, transparent 60%)',
          }}>
            {slide.heading && (
              <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px', textShadow: '0 2px 6px rgba(0,0,0,.5)' }}>{slide.heading}</h3>
            )}
            {slide.subtext && (
              <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '.88rem', margin: '0 0 12px' }}>{slide.subtext}</p>
            )}
            {slide.button_text && (
              <a href={slide.button_url || '#'} onClick={e => e.preventDefault()}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 20px', borderRadius: '8px', background: 'var(--color-primary, #7C3AED)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '.85rem', width: 'fit-content' }}>
                {slide.button_text}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Arrow buttons */}
      {s.arrows && slides.length > 1 && (
        <>
          <SlideBtn dir="left"  onClick={prev}>‹</SlideBtn>
          <SlideBtn dir="right" onClick={next}>›</SlideBtn>
        </>
      )}

      {/* Dot indicators */}
      {s.dots && slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? '20px' : '7px', height: '7px', borderRadius: '4px', cursor: 'pointer', transition: 'all .25s', background: i === idx ? '#fff' : 'rgba(255,255,255,.4)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideBtn({ dir, onClick, children }) {
  return (
    <button onClick={onClick} style={{ position: 'absolute', [dir]: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,.7)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,.45)'}
    >
      {children}
    </button>
  );
}
