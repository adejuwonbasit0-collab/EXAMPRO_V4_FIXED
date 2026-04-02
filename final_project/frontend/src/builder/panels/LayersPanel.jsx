// builder/panels/LayersPanel.jsx

import { useState }    from 'react';
import useBuilderStore from '../store/useBuilderStore';
import registry        from '../widgets/registry';

export default function LayersPanel() {
  const layout           = useBuilderStore(s => s.layout);
  const selectedWidgetId = useBuilderStore(s => s.selectedWidgetId);
  const selectedSectionId = useBuilderStore(s => s.selectedSectionId);
  const selectSection    = useBuilderStore(s => s.selectSection);
  const selectWidget     = useBuilderStore(s => s.selectWidget);

  if (!layout?.sections?.length) {
    return <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '20px', fontSize: '.8rem' }}>No sections yet</div>;
  }

  return (
    <div>
      {layout.sections.map((section, si) => (
        <LayerSection
          key={section.id}
          section={section}
          index={si}
          selectedWidgetId={selectedWidgetId}
          selectedSectionId={selectedSectionId}
          onSelectSection={selectSection}
          onSelectWidget={selectWidget}
        />
      ))}
    </div>
  );
}

function LayerSection({ section, index, selectedWidgetId, selectedSectionId, onSelectSection, onSelectWidget }) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedSectionId === section.id && !selectedWidgetId;

  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        onClick={() => { setOpen(o => !o); onSelectSection(section.id); }}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '6px',
          padding:      '6px 8px',
          borderRadius: '7px',
          cursor:       'pointer',
          background:   isSelected ? 'rgba(129,140,248,.15)' : 'rgba(255,255,255,.03)',
          border:       `1px solid ${isSelected ? 'rgba(129,140,248,.3)' : 'transparent'}`,
          fontSize:     '.76rem',
          fontWeight:   600,
          color:        isSelected ? '#818CF8' : 'rgba(255,255,255,.7)',
        }}
      >
        <span style={{ fontSize: '.7rem', opacity: .5 }}>{open ? '▾' : '▸'}</span>
        <span>📐</span>
        Section {index + 1}
        <span style={{ marginLeft: 'auto', fontSize: '.64rem', opacity: .4 }}>{section.columns.length} col</span>
      </div>

      {open && section.columns.map((col, ci) => (
        <div key={col.id} style={{ marginLeft: '16px', marginTop: '2px' }}>
          {col.widgets.map(widget => {
            const def = registry.get(widget.type);
            const isWSelected = selectedWidgetId === widget.id;
            return (
              <div
                key={widget.id}
                onClick={() => onSelectWidget(widget.id, section.id, col.id)}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '6px',
                  padding:      '5px 8px',
                  borderRadius: '6px',
                  cursor:       'pointer',
                  background:   isWSelected ? 'rgba(129,140,248,.12)' : 'transparent',
                  border:       `1px solid ${isWSelected ? 'rgba(129,140,248,.25)' : 'transparent'}`,
                  fontSize:     '.73rem',
                  color:        isWSelected ? '#818CF8' : 'rgba(255,255,255,.5)',
                  marginBottom: '2px',
                }}
              >
                <span>{def?.icon || '◻'}</span>
                <span>{def?.label || widget.type}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
