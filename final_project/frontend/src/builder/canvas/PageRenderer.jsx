// builder/canvas/PageRenderer.jsx
import React                from 'react';
import useBuilderStore      from '../store/useBuilderStore';
import SectionWrapper       from './SectionWrapper';
import DeviceFrame          from '../responsive/DeviceFrame';
import { DEVICES }          from '../responsive/useResponsive';

export default function PageRenderer() {
  const layout        = useBuilderStore(s => s.layout);
  const deviceMode    = useBuilderStore(s => s.deviceMode);
  const isPreviewMode = useBuilderStore(s => s.isPreviewMode);
  const addSection    = useBuilderStore(s => s.addSection);

  const deviceCfg   = DEVICES[deviceMode] || DEVICES.desktop;
  const canvasWidth = deviceCfg.width;

  // Build CSS variable block from global settings
  const gs = layout?.global_settings || {};
  const cssVars = [
    ':root {',
    `  --builder-primary:   ${gs.primary_color   || '#7C3AED'};`,
    `  --builder-secondary: ${gs.secondary_color  || '#06D6A0'};`,
    `  --builder-accent:    ${gs.accent_color     || '#F59E0B'};`,
    `  --builder-text:      ${gs.text_color       || '#1F2937'};`,
    `  --builder-bg:        ${gs.background_color || '#ffffff'};`,
    `  --builder-font:      ${gs.font_family      || 'Inter, sans-serif'};`,
    '}',
  ].join('\n');

  const sections = layout?.sections || [];

  return (
    <div
      style={{
        flex:           1,
        overflowY:      'auto',
        overflowX:      'hidden',
        background:     'rgba(255,255,255,.03)',
        display:        'flex',
        justifyContent: 'center',
        minHeight:      0,
      }}
    >
      <DeviceFrame>
        <div
          style={{
            width:      canvasWidth,
            maxWidth:   '100%',
            minHeight:  '100vh',
            background: gs.background_color || '#ffffff',
            fontFamily: gs.font_family      || 'Inter, sans-serif',
            position:   'relative',
          }}
        >
          <style>{cssVars}</style>

          {sections.length === 0 ? (
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              minHeight:      '60vh',
              color:          'rgba(255,255,255,.25)',
              fontSize:       '.88rem',
              gap:            '12px',
            }}>
              <div style={{ fontSize: '2.5rem' }}>🧩</div>
              <div style={{ fontWeight: 600 }}>Canvas is empty</div>
              <div style={{ fontSize: '.78rem', opacity: .7 }}>
                Drag a section from the left panel to get started
              </div>
              {!isPreviewMode && (
                <button
                  onClick={() => addSection && addSection('one-column')}
                  style={{
                    marginTop: '8px', padding: '8px 20px',
                    background: 'rgba(124,58,237,.25)',
                    border: '1px solid rgba(124,58,237,.4)',
                    borderRadius: '8px', color: 'rgba(255,255,255,.8)',
                    cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                  }}
                >
                  + Add First Section
                </button>
              )}
            </div>
          ) : (
            sections.map((section, index) => (
              <SectionWrapper
                key={section.id}
                section={section}
                index={index}
                isPreview={isPreviewMode}
              />
            ))
          )}
        </div>
      </DeviceFrame>
    </div>
  );
}
