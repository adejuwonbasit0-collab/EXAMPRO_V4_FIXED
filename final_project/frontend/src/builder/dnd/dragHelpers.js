// builder/dnd/dragHelpers.js

'use strict';

/**
 * DRAG ID ENCODING FORMAT
 *
 * All IDs use a namespace prefix separated by '::':
 *
 *   palette::heading          — widget type being dragged FROM the library panel
 *   palette::courses_list     — another palette item
 *
 *   widget::widget_k7m2p9xq   — widget being reordered ON the canvas
 *   section::section_r3n8q1wd — section being reordered
 *
 *   col-drop::section_abc::column_xyz  — drop target (a column's droppable zone)
 */

export function encodeDragId(type, id) {
  return `${type}::${id}`;
}

export function decodeDragId(dragId) {
  if (!dragId || typeof dragId !== 'string') return { type: null, id: null };
  const parts = dragId.split('::');
  return { type: parts[0], id: parts.slice(1).join('::') };
}

// Encode a column drop target ID
// Encodes both the section AND column so onDragEnd knows exactly where to insert
export function encodeColumnDropId(sectionId, columnId) {
  return `col-drop::${sectionId}::${columnId}`;
}

export function decodeColumnDropId(dropId) {
  if (!dropId || typeof dropId !== 'string') return null;
  const parts = dropId.split('::');
  if (parts[0] !== 'col-drop' || parts.length < 3) return null;
  return { sectionId: parts[1], columnId: parts[2] };
}

/**
 * Build the `data` object attached to a draggable element.
 * This is read inside onDragOver and onDragEnd to understand what is being moved.
 */
export function buildWidgetDragData(widgetId, sectionId, columnId, index) {
  return {
    type:      'widget',
    widgetId,
    sectionId,
    columnId,
    index,
  };
}

export function buildPaletteDragData(widgetType) {
  return {
    type:       'palette',
    widgetType,
  };
}

export function buildSectionDragData(sectionId, index) {
  return {
    type:      'section',
    sectionId,
    index,
  };
}

/**
 * Given a droppable over-ID during an onDragOver event,
 * determine whether we are over a column drop zone or over a widget.
 */
export function classifyDropTarget(overId, layout) {
  if (!overId) return null;

  const str = String(overId);

  // Explicit column drop zone
  if (str.startsWith('col-drop::')) {
    const decoded = decodeColumnDropId(str);
    return decoded ? { kind: 'column', ...decoded, insertIndex: -1 } : null;
  }

  // Widget sortable ID — find its parent column
  if (str.startsWith('widget::')) {
    const widgetId = str.split('::')[1];
    for (const section of (layout?.sections || [])) {
      for (const column of (section.columns || [])) {
        const idx = column.widgets.findIndex(w => w.id === widgetId);
        if (idx !== -1) {
          return { kind: 'widget', sectionId: section.id, columnId: column.id, widgetId, insertIndex: idx };
        }
      }
    }
  }

  // Section sortable ID
  if (str.startsWith('section::')) {
    const sectionId = str.split('::')[1];
    return { kind: 'section', sectionId };
  }

  return null;
}
