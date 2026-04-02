// builder/store/useBuilderStore.js

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import HistoryEngine from '../engine/HistoryEngine';
import { generateId } from '../utils/idGenerator';

const useBuilderStore = create(
  subscribeWithSelector((set, get) => ({

    // ─── LAYOUT STATE ───────────────────────────────────────────────
    layout: null,               // The full Phase 2 layout JSON object
    site:   null,               // admin_sites row (colors, school_name, etc.)

    // ─── SELECTION STATE ────────────────────────────────────────────
    selectedSectionId:  null,   // ID of selected section
    selectedColumnId:   null,   // ID of selected column
    selectedWidgetId:   null,   // ID of selected widget
    selectionType:      null,   // 'section' | 'column' | 'widget'

    // ─── UI STATE ───────────────────────────────────────────────────
    deviceMode:         'desktop',   // 'desktop' | 'tablet' | 'mobile'
    leftPanelTab:       'widgets',   // 'widgets' | 'templates' | 'layers'
    rightPanelTab:      'content',   // 'content' | 'style' | 'advanced'
    isLoading:          false,
    isSaving:           false,
    isDirty:            false,       // unsaved changes exist
    isPreviewMode:      false,       // hides selection overlays

    // ─── SAVE STATUS ────────────────────────────────────────────────
    pageSlug:           'home',      // current page being edited
    saveStatus:         'idle',      // 'idle'|'saving'|'saved'|'error'|'conflict'
    lastSavedAt:        null,
    lastRevisionId:     null,

    // ─── HISTORY STATE ──────────────────────────────────────────────
    history:            [],          // array of layout snapshots
    historyIndex:       -1,          // current position in history stack
    canUndo:            false,
    canRedo:            false,

    // ═══════════════════════════════════════════════════════════════
    // LAYOUT ACTIONS
    // ═══════════════════════════════════════════════════════════════

    // Load a complete layout (called by BuilderProvider after API response)
    setLayout: (layout) => {
      set({ layout, isDirty: false });
      HistoryEngine.reset(layout);
      const { canUndo, canRedo } = HistoryEngine.getStatus();
      set({ history: HistoryEngine.stack, historyIndex: HistoryEngine.index, canUndo, canRedo });
    },

    setSite: (site) => set({ site }),
    setIsLoading: (v) => set({ isLoading: v }),
    setIsSaving: (v) => set({ isSaving: v }),

    // ─── SECTION ACTIONS ────────────────────────────────────────────

    addSection: (sectionConfig = {}) => {
      const { layout } = get();
      const newSection = {
        id:       generateId('section'),
        type:     'section',
        settings: {
          columns_gap: 20,
          content_width: 'boxed',
          content_max_width: 1200,
          background: { type: 'color', color: 'transparent' },
          padding: { top: 80, right: 0, bottom: 80, left: 0 },
          ...sectionConfig.settings,
        },
        responsive_settings: {},
        columns: sectionConfig.columns || [
          {
            id: generateId('column'),
            type: 'column',
            settings: { width: 100, vertical_align: 'top' },
            responsive_settings: {},
            widgets: [],
          }
        ],
      };

      const newLayout = {
        ...layout,
        sections: [...layout.sections, newSection],
      };

      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true, selectedSectionId: newSection.id, selectionType: 'section' });
    },

    deleteSection: (sectionId) => {
      const { layout } = get();
      const newLayout = {
        ...layout,
        sections: layout.sections.filter(s => s.id !== sectionId),
      };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true, selectedSectionId: null, selectedColumnId: null, selectedWidgetId: null, selectionType: null });
    },

    duplicateSection: (sectionId) => {
      const { layout } = get();
      const idx = layout.sections.findIndex(s => s.id === sectionId);
      if (idx === -1) return;

      // Deep clone and regenerate all IDs
      const original = JSON.parse(JSON.stringify(layout.sections[idx]));
      const cloned   = regenerateSectionIds(original);

      const newSections = [...layout.sections];
      newSections.splice(idx + 1, 0, cloned);

      const newLayout = { ...layout, sections: newSections };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    moveSectionUp: (sectionId) => {
      const { layout } = get();
      const idx = layout.sections.findIndex(s => s.id === sectionId);
      if (idx <= 0) return;
      const sections = [...layout.sections];
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
      const newLayout = { ...layout, sections };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    moveSectionDown: (sectionId) => {
      const { layout } = get();
      const idx = layout.sections.findIndex(s => s.id === sectionId);
      if (idx >= layout.sections.length - 1) return;
      const sections = [...layout.sections];
      [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
      const newLayout = { ...layout, sections };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    // Replace sections array in arbitrary order (used by DnD section reorder)
    setSectionsOrder: (sections) => {
      const { layout } = get();
      const newLayout = { ...layout, sections };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    // Replace a column's widget list (used by DnD within-column sort)
    setColumnWidgets: (sectionId, columnId, widgets) => {
      const { layout } = get();
      const newLayout = {
        ...layout,
        sections: layout.sections.map(s => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            columns: s.columns.map(col =>
              col.id === columnId ? { ...col, widgets } : col
            ),
          };
        }),
      };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    updateSection: (sectionId, patch) => {
      const { layout } = get();
      const newLayout = {
        ...layout,
        sections: layout.sections.map(s =>
          s.id === sectionId ? deepMergeSection(s, patch) : s
        ),
      };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    // ─── COLUMN ACTIONS ─────────────────────────────────────────────

    updateColumn: (sectionId, columnId, patch) => {
      const { layout } = get();
      const newLayout = {
        ...layout,
        sections: layout.sections.map(s => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            columns: s.columns.map(col =>
              col.id === columnId ? { ...col, ...patch, settings: { ...col.settings, ...(patch.settings || {}) } } : col
            ),
          };
        }),
      };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    // ─── WIDGET ACTIONS ─────────────────────────────────────────────

    // Add a widget to a specific column
    addWidget: (sectionId, columnId, widgetType, insertAtIndex = -1) => {
      const { layout } = get();
      const registry = require('../widgets/registry').default;
      const widgetDef = registry.get(widgetType);
      if (!widgetDef) { console.warn(`Unknown widget type: ${widgetType}`); return; }

      const newWidget = {
        id:       generateId('widget'),
        type:     widgetType,
        settings: { ...widgetDef.defaultSettings },
        responsive_settings: {},
      };

      const newLayout = {
        ...layout,
        sections: layout.sections.map(s => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            columns: s.columns.map(col => {
              if (col.id !== columnId) return col;
              const widgets = [...col.widgets];
              if (insertAtIndex === -1) {
                widgets.push(newWidget);
              } else {
                widgets.splice(insertAtIndex, 0, newWidget);
              }
              return { ...col, widgets };
            }),
          };
        }),
      };

      get()._pushHistory(newLayout);
      set({
        layout: newLayout,
        isDirty: true,
        selectedWidgetId:  newWidget.id,
        selectedSectionId: sectionId,
        selectedColumnId:  columnId,
        selectionType:     'widget',
        rightPanelTab:     'content',
      });
    },

    // Update widget settings (called on every control change in RightPanel)
    updateWidget: (widgetId, settingsPatch, device = 'desktop') => {
      const { layout } = get();

      const newLayout = {
        ...layout,
        sections: layout.sections.map(s => ({
          ...s,
          columns: s.columns.map(col => ({
            ...col,
            widgets: col.widgets.map(w => {
              if (w.id !== widgetId) return w;

              if (device === 'desktop') {
                // Update base settings
                return { ...w, settings: { ...w.settings, ...settingsPatch } };
              } else {
                // Update responsive overrides only
                return {
                  ...w,
                  responsive_settings: {
                    ...w.responsive_settings,
                    [device]: {
                      ...(w.responsive_settings?.[device] || {}),
                      ...settingsPatch,
                    },
                  },
                };
              }
            }),
          })),
        })),
      };

      // Push to history only on significant changes (debounced in HistoryEngine)
      get()._pushHistoryDebounced(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    deleteWidget: (widgetId) => {
      const { layout } = get();
      const newLayout = {
        ...layout,
        sections: layout.sections.map(s => ({
          ...s,
          columns: s.columns.map(col => ({
            ...col,
            widgets: col.widgets.filter(w => w.id !== widgetId),
          })),
        })),
      };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true, selectedWidgetId: null, selectionType: null });
    },

    duplicateWidget: (widgetId) => {
      const { layout } = get();
      let newLayout = layout;

      layout.sections.forEach((s, si) => {
        s.columns.forEach((col, ci) => {
          const wIdx = col.widgets.findIndex(w => w.id === widgetId);
          if (wIdx === -1) return;
          const cloned = { ...JSON.parse(JSON.stringify(col.widgets[wIdx])), id: generateId('widget') };
          const newWidgets = [...col.widgets];
          newWidgets.splice(wIdx + 1, 0, cloned);

          newLayout = {
            ...newLayout,
            sections: newLayout.sections.map((sec, sei) =>
              sei === si ? {
                ...sec,
                columns: sec.columns.map((c, coi) =>
                  coi === ci ? { ...c, widgets: newWidgets } : c
                ),
              } : sec
            ),
          };
        });
      });

      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    // ─── GLOBAL SETTINGS ────────────────────────────────────────────

    updateGlobalSettings: (patch) => {
      const { layout } = get();
      const newLayout = {
        ...layout,
        global_settings: { ...layout.global_settings, ...patch },
      };
      get()._pushHistory(newLayout);
      set({ layout: newLayout, isDirty: true });
    },

    // ─── SELECTION ACTIONS ──────────────────────────────────────────

    selectSection: (sectionId) => {
      set({ selectedSectionId: sectionId, selectedColumnId: null, selectedWidgetId: null, selectionType: 'section', rightPanelTab: 'style' });
    },

    selectColumn: (sectionId, columnId) => {
      set({ selectedSectionId: sectionId, selectedColumnId: columnId, selectedWidgetId: null, selectionType: 'column', rightPanelTab: 'style' });
    },

    selectWidget: (widgetId, sectionId, columnId) => {
      set({ selectedWidgetId: widgetId, selectedSectionId: sectionId, selectedColumnId: columnId, selectionType: 'widget', rightPanelTab: 'content' });
    },

    clearSelection: () => {
      set({ selectedSectionId: null, selectedColumnId: null, selectedWidgetId: null, selectionType: null });
    },

    // ─── UI ACTIONS ─────────────────────────────────────────────────

    setDeviceMode:      (mode)  => set({ deviceMode: mode }),
    setLeftPanelTab:    (tab)   => set({ leftPanelTab: tab }),
    setRightPanelTab:   (tab)   => set({ rightPanelTab: tab }),
    setIsPreviewMode:   (v)     => set({ isPreviewMode: v }),

    // ─── HISTORY ACTIONS ────────────────────────────────────────────

    undo: () => {
      const { layout } = HistoryEngine.undo();
      if (layout) {
        const { canUndo, canRedo } = HistoryEngine.getStatus();
        set({ layout, isDirty: true, canUndo, canRedo });
      }
    },

    redo: () => {
      const { layout } = HistoryEngine.redo();
      if (layout) {
        const { canUndo, canRedo } = HistoryEngine.getStatus();
        set({ layout, isDirty: true, canUndo, canRedo });
      }
    },

    // ─── PRIVATE HELPERS ────────────────────────────────────────────

    _pushHistory: (newLayout) => {
      HistoryEngine.push(newLayout);
      const { canUndo, canRedo } = HistoryEngine.getStatus();
      set({ canUndo, canRedo });
    },

    _pushHistoryDebounced: (() => {
      let timer = null;
      return (newLayout) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          HistoryEngine.push(newLayout);
          const { canUndo, canRedo } = HistoryEngine.getStatus();
          useBuilderStore.setState({ canUndo, canRedo });
        }, 800);
      };
    })(),

  }))
);

export default useBuilderStore;