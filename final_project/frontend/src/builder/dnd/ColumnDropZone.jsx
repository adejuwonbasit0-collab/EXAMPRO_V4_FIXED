// builder/dnd/ColumnDropZone.jsx

import { useDroppable }        from '@dnd-kit/core';
import useDragStore            from './useDragStore';
import { encodeColumnDropId }  from './dragHelpers';

export default function ColumnDropZone({ sectionId, columnId, children, isEmpty }) {
  const dropId = encodeColumnDropId(sectionId, columnId);

  const { setNodeRef, isOver } = useDroppable({
    id:   dropId,
    data: { sectionId, columnId, type: 'column' },
  });

  const activeDrag = useDragStore(s => s.activeDrag);
  const isDragging = activeDrag !== null;

  // Only highlight when something is being dragged over this column
  const showHighlight = isOver && isDragging;

  return (
    <div
      ref={setNodeRef}
      style={{
        flex:         1,
        display:      'flex',
        flexDirection:'column',
        gap:          '4px',
        minHeight:    isEmpty ? '80px' : '40px',   // taller when empty — easier to hit
        outline:      showHighlight ? '2px dashed #818CF8' : 'none',
        outlineOffset:'-2px',
        borderRadius: '6px',
        background:   showHighlight ? 'rgba(129,140,248,.06)' : 'transparent',
        transition:   'background .1s, outline .1s',
        position:     'relative',
      }}
    >
      {/* Drop indicator line — shown when dragging over empty column */}
      {showHighlight && isEmpty && (
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          pointerEvents:  'none',
          gap:            '8px',
          color:          '#818CF8',
          fontSize:       '.75rem',
          fontWeight:     600,
        }}>
          <span style={{ fontSize: '1.1rem' }}>＋</span>
          Drop here
        </div>
      )}
      {children}
    </div>
  );
}
