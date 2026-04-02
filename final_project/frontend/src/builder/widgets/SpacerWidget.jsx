// builder/widgets/SpacerWidget.jsx
import React from 'react';

export default function SpacerWidget({ settings = {}, isPreview }) {
  const { height = 50 } = settings;
  return (
    <div
      className="widget-spacer"
      style={{ height: `${height}px`, width: '100%', display: 'block' }}
      aria-hidden="true"
    >
      {isPreview && (
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', opacity: 0.3, fontSize: '11px',
          color: '#fff', border: '1px dashed rgba(255,255,255,0.3)', borderRadius: '4px',
        }}>
          Spacer {height}px
        </div>
      )}
    </div>
  );
}
