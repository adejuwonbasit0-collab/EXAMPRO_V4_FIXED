// builder/canvas/SectionWrapper.jsx
import React, { useState }  from 'react';
import useBuilderStore       from '../store/useBuilderStore';
import ColumnWrapper         from './ColumnWrapper';
import ShapeDivider          from '../sections/ShapeDivider';

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildPaddingString(p) {
  if (!p || typeof p !== 'object') return undefined;
  const t = p.top    != null ? p.top    : 40;
  const r = p.right  != null ? p.right  : 0;
  const b = p.bottom != null ? p.bottom : 40;
  const l = p.left   != null ? p.left   : 0;
  return `${t}px ${r}px ${b}px ${l}px`;
}

function buildBackground(bg) {
  if (!bg || typeof bg !== 'object') return undefined;
  if (bg.type === 'color')    return bg.color || undefined;
  if (bg.type === 'gradient') {
    const dir = bg.gradient_direction || 'to right';
    const c1  = bg.gradient_start     || '#7C3AED';
    const c2  = bg.gradient_end       || '#06D6A0';
    return `linear-gradient(${dir}, ${c1}, ${c2})`;
  }
  if (bg.type === 'image' && bg.image_url) {
    const pos  = bg.image_position || 'center center';
    const size = bg.image_size     || 'cover';
    const rep  = bg.image_repeat   || 'no-repeat';
    return `url(${bg.image_url}) ${pos} / ${size} ${rep}`;
  }
  return undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SectionWrapper({ section, index, isPreview }) {
  const [hovered,      setHovered]   = useState(false);
  const selectedSectionId            = useBuilderStore(s => s.selectedSectionId);
  const deviceMode                   = useBuilderStore(s => s.deviceMode);
  const selectSection                = useBuilderStore(s => s.selectSection);
  const deleteSection                = useBuilderStore(s => s.deleteSection);
  const duplicateSection             = useBuilderStore(s => s.duplicateSection);
  const moveSectionUp                = useBuilderStore(s => s.moveSectionUp);
  const moveSectionDown              = useBuilderStore(s => s.moveSectionDown);

  const s          = section.settings || {};
  const isSelected = selectedSectionId === section.id;

  // Responsive override resolution
  const rsOverride = section.responsive_settings?.[deviceMode] || {};
  const eff        = deviceMode === 'desktop' ? s : { ...s, ...rsOverride };

  // Visibility per device
  if (
    (eff.hide_desktop && deviceMode === 'desktop') ||
    (eff.hide_tablet  && deviceMode === 'tablet')  ||
    (eff.hide_mobile  && deviceMode === 'mobile')
  ) {
    if (isPreview) return null;
    return (
      <div
        style={{
          border: '2px dashed rgba(239,68,68,.35)', borderRadius: '8px',
          padding: '14px 16px', margin: '4px 0',
          background: 'rgba(239,68,68,.05)',
          display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer',
        }}
        onClick={e => { e.stopPropagation(); selectSection(section.id); }}
      >
        <span style={{ fontSize: '.85rem' }}>🚫</span>
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'rgba(239,68,68,.8)' }}>
            Hidden on {deviceMode}
          </div>
          <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.3)', marginTop: '2px' }}>
            Click to select · edit visibility in settings
          </div>
        </div>
      </div>
    );
  }

  const sectionStyle = {
    position:   'relative',
    minHeight:  eff.full_height ? '100vh' : (eff.min_height ? `${eff.min_height}px` : undefined),
    padding:    buildPaddingString(eff.padding),
    background: buildBackground(eff.background),
    overflow:   eff.overflow === 'clip' ? 'clip' : 'visible',
    outline:    isSelected  ? '2px solid rgba(129,140,248,.6)'
              : hovered && !isPreview ? '1px dashed rgba(129,140,248,.3)' : 'none',
    outlineOffset: '-2px',
    transition: 'outline .1s',
    cursor:     isPreview ? 'default' : 'pointer',
  };

  // Columns layout
  const columns = section.columns || [];

  return (
    <div
      id={eff.css_id || undefined}
      className={eff.css_classes || undefined}
      style={sectionStyle}
      onClick={e => { if (!isPreview) { e.stopPropagation(); selectSection(section.id); } }}
      onMouseEnter={() => !isPreview && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Shape divider — top */}
      {eff.shape_divider_top?.type && eff.shape_divider_top.type !== 'none' && (
        <ShapeDivider config={eff.shape_divider_top} position="top" />
      )}

      {/* Section label / actions (edit mode only) */}
      {(isSelected || hovered) && !isPreview && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '2px 6px', background: 'rgba(129,140,248,.9)',
          zIndex: 20, fontSize: '.68rem', fontWeight: 700, color: '#fff',
          borderRadius: '0 0 6px 6px',
        }}>
          <span>§ {eff.label || `Section ${index + 1}`}</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[
              { title: 'Move Up',   icon: '↑', fn: () => moveSectionUp   && moveSectionUp(section.id) },
              { title: 'Move Down', icon: '↓', fn: () => moveSectionDown && moveSectionDown(section.id) },
              { title: 'Duplicate', icon: '⧉', fn: () => duplicateSection && duplicateSection(section.id) },
              { title: 'Delete',    icon: '✕', fn: () => deleteSection   && deleteSection(section.id), danger: true },
            ].map(a => (
              <button key={a.title} title={a.title} onClick={e => { e.stopPropagation(); a.fn(); }} style={{
                background: a.danger ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.2)',
                border: 'none', color: '#fff', width: '20px', height: '20px',
                borderRadius: '4px', cursor: 'pointer', fontSize: '.72rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {a.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Columns */}
      <div style={{
        display:        'flex',
        gap:            `${eff.column_gap ?? 20}px`,
        flexWrap:       'wrap',
        alignItems:     eff.vertical_align  || 'stretch',
        justifyContent: eff.content_align   || 'flex-start',
        maxWidth:       eff.content_width   ? `${eff.content_width}px` : undefined,
        margin:         eff.content_width   ? '0 auto' : undefined,
        width:          '100%',
      }}>
        {columns.map(column => (
          <ColumnWrapper
            key={column.id}
            column={column}
            sectionId={section.id}
            isPreview={isPreview}
          />
        ))}
      </div>

      {/* Shape divider — bottom */}
      {eff.shape_divider_bottom?.type && eff.shape_divider_bottom.type !== 'none' && (
        <ShapeDivider config={eff.shape_divider_bottom} position="bottom" />
      )}
    </div>
  );
}
