// builder/panels/GlobalSettingsPanel.jsx
// Shown in RightPanel when nothing is selected.
// Lets admin edit site-wide design tokens (colors, fonts, spacing).

import { useState } from 'react';
import useBuilderStore from '../store/useBuilderStore';

const Row = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
    <label style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.5)', flex: 1 }}>{label}</label>
    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{children}</div>
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px', marginTop: '16px' }}>
    {children}
  </div>
);

export default function GlobalSettingsPanel() {
  const layout = useBuilderStore(s => s.layout);
  const setLayout = useBuilderStore(s => s.setLayout);
  const [saved, setSaved] = useState(false);

  if (!layout) return null;

  const gs = layout.global_settings || {};
  const colors = gs.colors || {};
  const typo   = gs.typography || {};

  const updateColors = (patch) => {
    setLayout({
      ...layout,
      global_settings: {
        ...gs,
        colors: { ...colors, ...patch }
      }
    });
  };

  const updateTypo = (patch) => {
    setLayout({
      ...layout,
      global_settings: {
        ...gs,
        typography: { ...typo, ...patch }
      }
    });
  };

  const colorInput = (label, key, value) => (
    <Row key={key} label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => updateColors({ [key]: e.target.value })}
          style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none', padding: 0 }}
        />
        <span style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }}>{value || '#000000'}</span>
      </div>
    </Row>
  );

  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>🌐 Site Global Settings</div>
      <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.3)', marginBottom: '16px' }}>
        Select any element on the canvas to edit it. These settings apply site-wide.
      </div>

      <SectionLabel>Brand Colors</SectionLabel>
      {colorInput('Primary',    'primary',    colors.primary)}
      {colorInput('Accent',     'accent',     colors.accent)}
      {colorInput('Background', 'background', colors.background)}
      {colorInput('Surface',    'surface',    colors.surface)}
      {colorInput('Text',       'text',       colors.text)}

      <SectionLabel>Typography</SectionLabel>
      <Row label="Heading Font">
        <input
          type="text"
          value={typo.font_family_heading || 'DM Sans'}
          onChange={e => updateTypo({ font_family_heading: e.target.value })}
          style={{ width: '120px', padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff', fontSize: '.72rem' }}
        />
      </Row>
      <Row label="Body Font">
        <input
          type="text"
          value={typo.font_family_body || 'DM Sans'}
          onChange={e => updateTypo({ font_family_body: e.target.value })}
          style={{ width: '120px', padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff', fontSize: '.72rem' }}
        />
      </Row>
      <Row label="Base Size">
        <input
          type="text"
          value={typo.font_size_base || '16px'}
          onChange={e => updateTypo({ font_size_base: e.target.value })}
          style={{ width: '80px', padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#fff', fontSize: '.72rem' }}
        />
      </Row>

      <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(129,140,248,.08)', borderRadius: '8px', border: '1px solid rgba(129,140,248,.15)', fontSize: '.72rem', color: 'rgba(255,255,255,.4)' }}>
        💡 Click any section, column, or widget on the canvas to edit its individual settings.
      </div>
    </div>
  );
}
