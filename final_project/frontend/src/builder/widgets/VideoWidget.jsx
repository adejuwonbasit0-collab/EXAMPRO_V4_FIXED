// builder/widgets/VideoWidget.jsx

function ytId(url) {
  const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url) {
  const m = (url || '').match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

const RATIOS = { '16:9': '56.25%', '4:3': '75%', '1:1': '100%', '9:16': '177.78%' };

export default function VideoWidget({ settings: s }) {
  const pb = RATIOS[s.aspect_ratio] || '56.25%';

  const containerStyle = {
    position: 'relative', paddingBottom: pb, height: 0, overflow: 'hidden',
    borderRadius: `${s.border_radius || 12}px`, background: '#000',
  };
  const fillStyle = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none',
  };

  const renderEmbed = () => {
    if (s.source_type === 'youtube' && s.youtube_url) {
      const id = ytId(s.youtube_url);
      if (!id) return <Placeholder label="Invalid YouTube URL" />;
      const p = new URLSearchParams({
        autoplay:  s.autoplay          ? 1 : 0,
        mute:      s.muted             ? 1 : 0,
        loop:      s.loop              ? 1 : 0,
        controls:  s.controls !== false ? 1 : 0,
        ...(s.loop && { playlist: id }),
      });
      return <iframe src={`https://www.youtube.com/embed/${id}?${p}`}
        allow="autoplay; fullscreen" allowFullScreen style={fillStyle} />;
    }

    if (s.source_type === 'vimeo' && s.vimeo_url) {
      const id = vimeoId(s.vimeo_url);
      if (!id) return <Placeholder label="Invalid Vimeo URL" />;
      return <iframe src={`https://player.vimeo.com/video/${id}?autoplay=${s.autoplay ? 1 : 0}`}
        allow="autoplay; fullscreen" allowFullScreen style={fillStyle} />;
    }

    if (s.source_type === 'self_hosted' && s.self_hosted_url) {
      return (
        <video src={s.self_hosted_url} poster={s.poster_url || undefined}
          autoPlay={s.autoplay} muted={s.muted} loop={s.loop}
          controls={s.controls !== false}
          style={{ ...fillStyle, objectFit: 'cover' }} />
      );
    }

    return <Placeholder label="Add a video URL in Content settings" />;
  };

  return (
    <div>
      <div style={containerStyle}>{renderEmbed()}</div>
      {s.caption && (
        <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
          {s.caption}
        </p>
      )}
    </div>
  );
}

function Placeholder({ label }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(255,255,255,.04)', border: '2px dashed rgba(255,255,255,.1)' }}>
      <span style={{ fontSize: '2rem', opacity: .4 }}>🎬</span>
      <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.3)' }}>{label}</span>
    </div>
  );
}
