// builder/panels/WidgetLibrary.jsx  — UPDATED for Phase 6

import { useState }                  from 'react';
import { useDraggable }              from '@dnd-kit/core';
import useBuilderStore               from '../store/useBuilderStore';
import useDragStore                  from '../dnd/useDragStore';
import registry                      from '../widgets/registry';
import { encodeDragId, buildPaletteDragData } from '../dnd/dragHelpers';

export default function WidgetLibrary() {
  const [search, setSearch] = useState('');
  const layout              = useBuilderStore(s => s.layout);
  const selectedColumnId    = useBuilderStore(s => s.selectedColumnId);
  const activeDrag          = useDragStore(s => s.activeDrag);

  const groups = registry.getGroupedWidgets(search);

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search widgets..."
        style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '8px', color: '#fff', fontSize: '.82rem', marginBottom: '14px', outline: 'none', boxSizing: 'border-box' }}
      />

      {/* Target column hint */}
      {!selectedColumnId && layout?.sections?.length > 0 && !activeDrag && (
        <div style={{ fontSize: '.7rem', color: '#F59E0B', marginBottom: '10px', padding: '6px 8px', background: 'rgba(245,158,11,.08)', borderRadius: '6px' }}>
          💡 Drag a widget onto the canvas or click a column first to target it.
        </div>
      )}

      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.25)', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: '8px' }}>
            {group.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {group.widgets.map(widget => (
              <DraggableWidgetItem
                key={widget.type}
                widget={widget}
                sectionId={useBuilderStore.getState().selectedSectionId}
                columnId={selectedColumnId}
              />
            ))}
          </div>
        </div>
      ))}

      {!groups.length && (
        <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '24px', fontSize: '.82rem' }}>
          No widgets found for "{search}"
        </div>
      )}
    </div>
  );
}

function DraggableWidgetItem({ widget }) {
  const [hovered, setHovered] = useState(false);
  const layout       = useBuilderStore(s => s.layout);
  const addWidget    = useBuilderStore(s => s.addWidget);

  // @dnd-kit: make this item draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   encodeDragId('palette', widget.type),
    data: buildPaletteDragData(widget.type),
  });

  // Click-to-add fallback (when user prefers not to drag)
  const handleClick = () => {
    const state = useBuilderStore.getState();
    const { selectedSectionId, selectedColumnId, layout } = state;

    if (selectedSectionId && selectedColumnId) {
      addWidget(selectedSectionId, selectedColumnId, widget.type);
      return;
    }

    // No selection — add to first available column
    const firstSection = layout?.sections?.[0];
    const firstColumn  = firstSection?.columns?.[0];
    if (firstSection && firstColumn) {
      addWidget(firstSection.id, firstColumn.id, widget.type);
      return;
    }

    // No sections — create one first
    state.addSection();
    setTimeout(() => {
      const newLayout = useBuilderStore.getState().layout;
      const s = newLayout.sections?.[0];
      if (s) addWidget(s.id, s.columns[0].id, widget.type);
    }, 50);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            '5px',
        padding:        '10px 6px',
        borderRadius:   '8px',
        cursor:         isDragging ? 'grabbing' : 'grab',
        background:     hovered ? 'rgba(129,140,248,.12)' : 'rgba(255,255,255,.03)',
        border:         `1px solid ${hovered ? 'rgba(129,140,248,.3)' : 'rgba(255,255,255,.06)'}`,
        opacity:        isDragging ? 0.4 : 1,
        transition:     'all .14s',
        textAlign:      'center',
        userSelect:     'none',
        touchAction:    'none',    // required for @dnd-kit touch support
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{widget.icon}</span>
      <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.6)', fontWeight: 500, lineHeight: 1.2 }}>
        {widget.label}
      </span>
    </div>
  );
}
