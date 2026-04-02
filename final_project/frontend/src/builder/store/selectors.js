// builder/store/selectors.js

// Returns the currently selected widget object (or null)
export const selectSelectedWidget = (state) => {
  if (!state.selectedWidgetId || !state.layout) return null;
  for (const section of state.layout.sections) {
    for (const column of section.columns) {
      const widget = column.widgets.find(w => w.id === state.selectedWidgetId);
      if (widget) return widget;
    }
  }
  return null;
};

// Returns the currently selected section object (or null)
export const selectSelectedSection = (state) =>
  state.layout?.sections.find(s => s.id === state.selectedSectionId) || null;

// Returns section + column context for the selected widget
export const selectWidgetContext = (state) => {
  if (!state.selectedWidgetId || !state.layout) return null;
  for (const section of state.layout.sections) {
    for (const column of section.columns) {
      if (column.widgets.find(w => w.id === state.selectedWidgetId)) {
        return { section, column };
      }
    }
  }
  return null;
};
