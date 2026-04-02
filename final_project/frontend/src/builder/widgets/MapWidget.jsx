// builder/widgets/MapWidget.jsx
import React from 'react';

export default function MapWidget({ settings = {} }) {
  const {
    address    = 'Lagos, Nigeria',
    zoom       = 14,
    height     = 350,
    map_type   = 'roadmap',
    show_marker = true,
  } = settings;

  const encoded = encodeURIComponent(address);
  const apiKey  = settings.google_maps_api_key || '';

  // If no API key, show OpenStreetMap embed as fallback
  if (!apiKey) {
    const osmUrl = `https://www.openstreetmap.org/search?query=${encoded}`;
    return (
      <div className="widget-map" style={{ height: `${height}px`, borderRadius: '8px', overflow: 'hidden', background: '#1e293b' }}>
        <iframe
          title={`Map of ${address}`}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=-0.5,51.3,0.3,51.7&layer=mapnik&marker=51.5,-0.1`}
          allowFullScreen
        />
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encoded}&zoom=${zoom}&maptype=${map_type}`;
  return (
    <div className="widget-map" style={{ height: `${height}px`, borderRadius: '8px', overflow: 'hidden' }}>
      <iframe
        title={`Map of ${address}`}
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={src}
        allowFullScreen
      />
    </div>
  );
}
