// builder/dnd/BuilderDndProvider.jsx

import {
  DndContext,
  closestCenter,
  closestCorners,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay as DndDragOverlay,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import useBuilderStore from '../store/useBuilderStore';
import useDragStore    from './useDragStore';
import { decodeDragId, decodeColumnDropId, classifyDropTarget } from './dragHelpers';
import DragOverlayCard from './DragOverlay';

export default function BuilderDndProvider({ children }) {

  // ─── Sensors — how drag is initiated ──────────────────────────────
  // 8px activation distance prevents accidental drag on click
  const sensors = useSensors(
    useSensor(MouseSensor,    { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,    { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const {
    layout,
    addWidget,
    moveWidgetWithinColumn,
    moveWidgetAcrossColumns,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    selectWidget,
    selectSection,
  } = useBuilderStore.getState();

  const { setActiveDrag, setOverColumn, setOverSection, setInsertIndex, clearDrag } = useDragStore.getState();

  // ─── Custom collision detection ───────────────────────────────────
  // Uses 'closestCenter' for sortables, falls back to 'rectIntersection'
  // for palette→column drops (more forgiving for large targets)
  const collisionDetection = (args) => {
    // First try pointer-within for column drop zones (palette drags)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // Prefer column drop zones over widget sortable items
      const colDrop = pointerCollisions.find(c => String(c.id).startsWith('col-drop::'));
      if (colDrop) return [colDrop];
      return pointerCollisions;
    }
    // Fall back to rect intersection for keyboard navigation
    return rectIntersection(args);
  };

  // ─── DRAG START ───────────────────────────────────────────────────
  function handleDragStart(event) {
    const { active } = event;
    const { type, id } = decodeDragId(String(active.id));
    const data = active.data?.current || {};

    if (type === 'palette') {
      setActiveDrag({ type: 'palette', widgetType: data.widgetType });
    } else if (type === 'widget') {
      setActiveDrag({ type: 'widget', widgetId: data.widgetId, sectionId: data.sectionId, columnId: data.columnId });
      selectWidget(data.widgetId, data.sectionId, data.columnId);
    } else if (type === 'section') {
      setActiveDrag({ type: 'section', sectionId: data.sectionId });
      selectSection(data.sectionId);
    }
  }

  // ─── DRAG OVER — update drop indicators only ─────────────────────
  function handleDragOver(event) {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      setInsertIndex(null);
      return;
    }

    const layout    = useBuilderStore.getState().layout;
    const overIdStr = String(over.id);
    const target    = classifyDropTarget(overIdStr, layout);

    if (!target) return;

    if (target.kind === 'column' || target.kind === 'widget') {
      setOverColumn(target.columnId);
      setInsertIndex(target.insertIndex);
    } else if (target.kind === 'section') {
      setOverSection(target.sectionId);
    }
  }

  // ─── DRAG END — commit the move ───────────────────────────────────
  function handleDragEnd(event) {
    const { active, over } = event;
    clearDrag();

    if (!over) return;   // dropped outside any drop zone

    const activeIdStr = String(active.id);
    const overIdStr   = String(over.id);
    const activeData  = active.data?.current || {};
    const overData    = over.data?.current   || {};

    const { type: activeType } = decodeDragId(activeIdStr);

    const currentLayout = useBuilderStore.getState().layout;

    // ── A. PALETTE → COLUMN ─────────────────────────────────────────
    if (activeType === 'palette') {
      const target = classifyDropTarget(overIdStr, currentLayout);
      if (!target) return;

      const { sectionId, columnId, insertIndex } = target;
      useBuilderStore.getState().addWidget(sectionId, columnId, activeData.widgetType, insertIndex);
      return;
    }

    // ── B. SECTION REORDER ──────────────────────────────────────────
    if (activeType === 'section') {
      if (!overIdStr.startsWith('section::')) return;
      const fromSectionId = activeData.sectionId;
      const toSectionId   = overData.sectionId;
      if (fromSectionId === toSectionId) return;

      const sections   = currentLayout.sections;
      const fromIndex  = sections.findIndex(s => s.id === fromSectionId);
      const toIndex    = sections.findIndex(s => s.id === toSectionId);
      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = arrayMove(sections, fromIndex, toIndex);
      useBuilderStore.getState().setSectionsOrder(reordered);
      return;
    }

    // ── C. WIDGET REORDER (same column) ─────────────────────────────
    if (activeType === 'widget') {
      const fromWidgetId  = activeData.widgetId;
      const fromSectionId = activeData.sectionId;
      const fromColumnId  = activeData.columnId;

      const target = classifyDropTarget(overIdStr, currentLayout);
      if (!target) return;

      const { sectionId: toSectionId, columnId: toColumnId } = target;

      // ── C1. Same column — reorder ──────────────────────────────────
      if (fromColumnId === toColumnId) {
        const section = currentLayout.sections.find(s => s.id === fromSectionId);
        const column  = section?.columns.find(c => c.id === fromColumnId);
        if (!column) return;

        const fromIdx = column.widgets.findIndex(w => w.id === fromWidgetId);
        let toIdx;

        if (target.kind === 'widget') {
          toIdx = column.widgets.findIndex(w => w.id === target.widgetId);
        } else {
          toIdx = target.insertIndex === -1 ? column.widgets.length - 1 : target.insertIndex;
        }

        if (fromIdx === -1 || fromIdx === toIdx) return;

        const reordered = arrayMove(column.widgets, fromIdx, toIdx);
        useBuilderStore.getState().setColumnWidgets(fromSectionId, fromColumnId, reordered);
        return;
      }

      // ── C2. Different column — cross-column move ───────────────────
      const insertAt = target.insertIndex === -1 ? undefined : target.insertIndex;
      useBuilderStore.getState().moveWidgetAcrossColumns(
        fromSectionId, fromColumnId, fromWidgetId,
        toSectionId,   toColumnId,   insertAt
      );
    }
  }

  // ─── DRAG CANCEL ─────────────────────────────────────────────────
  function handleDragCancel() {
    clearDrag();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Floating drag preview — rendered at root level to escape any overflow:hidden */}
      <DndDragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        <DragOverlayCard />
      </DndDragOverlay>
    </DndContext>
  );
}
