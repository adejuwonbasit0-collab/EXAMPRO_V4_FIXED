// builder/canvas/ColumnWrapper.jsx
// FIXED: columns are now registered as droppable targets via ColumnDropZone
// so widgets dragged from the palette actually have somewhere to land.

import { useState }       from 'react';
import useBuilderStore    from '../store/useBuilderStore';
import WidgetWrapper      from './WidgetWrapper';
import ColumnDropZone     from '../dnd/ColumnDropZone';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ColumnWrapper({ column, sectionId, isPreview }) {
  const [hovered,        setHovered]  = useState(false);
  const selectedColumnId              = useBuilderStore(s => s.selectedColumnId);
  const selectColumn                  = useBuilderStore(s => s.selectColumn);

  const isSelected = selectedColumnId === column.id;
  const c          = column.settings || {};
  const isEmpty    = column.widgets.length === 0;

  // IDs for SortableContext (widget reorder within column)
  const widgetIds = column.widgets.map(w => `widget::${w.id}`);

  return (
    <div
      style={{
        flex:           c.width ? `0 0 calc(${c.width}% - 10px)` : 1,
        minHeight:      Math.max(c.min_height || 0, isEmpty ? 60 : 0),
        display:        'flex',
        flexDirection:  'column',
        alignItems:     c.horizontal_align || 'stretch',
        justifyContent: c.vertical_align   || 'flex-start',
        outline:        isSelected
                          ? '1px solid rgba(129,140,248,.5)'
                          : hovered && !isPreview && isEmpty
                            ? '1px dashed rgba(129,140,248,.2)'
                            : 'none',
        borderRadius:   '4px',
        cursor:         isPreview ? 'default' : 'pointer',
        position:       'relative',
        transition:     'outline .1s',
      }}
      onClick={e => { if (!isPreview) { e.stopPropagation(); selectColumn(sectionId, column.id); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/*
        ColumnDropZone registers this column with @dnd-kit via useDroppable().
        Without this the drag system has no valid drop target and nothing lands.
        SortableContext lets existing widgets be reordered inside the column.
      */}
      <ColumnDropZone
        sectionId={sectionId}
        columnId={column.id}
        isEmpty={isEmpty}
      >
        <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
          {isEmpty && !isPreview ? (
            <div style={{
              border:         '1px dashed rgba(255,255,255,.12)',
              borderRadius:   '8px',
              padding:        '16px',
              textAlign:      'center',
              color:          'rgba(255,255,255,.2)',
              fontSize:       '.75rem',
              flex:           1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '6px',
              minHeight:      '60px',
              pointerEvents:  'none',
            }}>
              ＋ Drop widget here
            </div>
          ) : (
            column.widgets.map((widget, index) => (
              <WidgetWrapper
                key={widget.id}
                widget={widget}
                sectionId={sectionId}
                columnId={column.id}
                index={index}
                isPreview={isPreview}
              />
            ))
          )}
        </SortableContext>
      </ColumnDropZone>
    </div>
  );
}