// builder/dnd/useDragStore.js

import { create } from 'zustand';

const useDragStore = create((set) => ({

  // What is currently being dragged (null when idle)
  // Shape: { type: 'palette'|'widget'|'section', widgetType?, widgetId?, sectionId?, columnId?, index? }
  activeDrag: null,

  // The column being hovered over (for drop indicator highlight)
  overColumnId: null,

  // The section being hovered for section reorder
  overSectionId: null,

  // The exact insert index within a column (for showing the blue insertion line)
  insertIndex: null,

  // ─── ACTIONS ────────────────────────────────────────────────────
  setActiveDrag:   (drag)      => set({ activeDrag: drag }),
  setOverColumn:   (colId)     => set({ overColumnId: colId }),
  setOverSection:  (secId)     => set({ overSectionId: secId }),
  setInsertIndex:  (idx)       => set({ insertIndex: idx }),

  clearDrag: () => set({
    activeDrag:    null,
    overColumnId:  null,
    overSectionId: null,
    insertIndex:   null,
  }),
}));

export default useDragStore;
