// builder/engine/KeyboardShortcuts.jsx
// Mount inside BuilderApp — no visible UI

import { useEffect } from 'react';
import useBuilderStore from '../store/useBuilderStore';

export default function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      // Ignore if user is typing in an input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const isMac  = navigator.platform.includes('Mac');
      const ctrl   = isMac ? e.metaKey : e.ctrlKey;
      const store  = useBuilderStore.getState();

      // ── Undo / Redo ──────────────────────────────────────────────
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        store.undo();
        return;
      }
      if ((ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.key === 'y')) {
        e.preventDefault();
        store.redo();
        return;
      }

      // ── Save draft ───────────────────────────────────────────────
      if (ctrl && e.key === 's') {
        e.preventDefault();
        window.saveBuilderPage?.(false);
        return;
      }

      // ── Delete selected element ──────────────────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectionType, selectedWidgetId, selectedSectionId } = store;
        if (selectionType === 'widget' && selectedWidgetId) {
          e.preventDefault();
          store.deleteWidget(selectedWidgetId);
          return;
        }
        if (selectionType === 'section' && selectedSectionId) {
          e.preventDefault();
          if (confirm('Delete this section and all its widgets?')) {
            store.deleteSection(selectedSectionId);
          }
          return;
        }
      }

      // ── Duplicate selected element ────────────────────────────────
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        const { selectionType, selectedWidgetId, selectedSectionId } = store;
        if (selectionType === 'widget' && selectedWidgetId) {
          store.duplicateWidget(selectedWidgetId);
        } else if (selectionType === 'section' && selectedSectionId) {
          store.duplicateSection(selectedSectionId);
        }
        return;
      }

      // ── Escape — clear selection ──────────────────────────────────
      if (e.key === 'Escape') {
        store.clearSelection();
        return;
      }

      // ── Move section up/down ──────────────────────────────────────
      if (e.key === 'ArrowUp' && ctrl && store.selectionType === 'section') {
        e.preventDefault();
        store.moveSectionUp(store.selectedSectionId);
        return;
      }
      if (e.key === 'ArrowDown' && ctrl && store.selectionType === 'section') {
        e.preventDefault();
        store.moveSectionDown(store.selectedSectionId);
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return null;
}
