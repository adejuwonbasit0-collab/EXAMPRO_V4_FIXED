// builder/responsive/useResponsive.js
// Central hook that every panel and wrapper imports.
// Provides: current device, device config, override checking, update helpers.

import useBuilderStore from '../store/useBuilderStore';
import {
  selectSelectedWidget,
  selectSelectedSection,
  selectWidgetContext,
} from '../store/selectors';

export const DEVICES = {
  desktop: { label: 'Desktop', icon: '🖥',  width: '100%',  px: '≥1024px', breakpoint: null     },
  tablet:  { label: 'Tablet',  icon: '📟',  width: '768px', px: '768px',   breakpoint: '1023px' },
  mobile:  { label: 'Mobile',  icon: '📱',  width: '375px', px: '375px',   breakpoint: '767px'  },
};

/**
 * Count how many keys are overridden in responsive_settings[device] for an element.
 */
export function countOverrides(element, device) {
  if (!element || device === 'desktop') return 0;
  const rs = element.responsive_settings?.[device];
  if (!rs) return 0;
  return Object.keys(rs).length;
}

/**
 * Check if a specific key has a responsive override.
 */
export function hasOverride(element, device, key) {
  if (device === 'desktop') return false;
  return key in (element?.responsive_settings?.[device] || {});
}

/**
 * Returns the responsive value for a key if it exists, else undefined.
 */
export function getOverrideValue(element, device, key) {
  if (device === 'desktop') return undefined;
  return element?.responsive_settings?.[device]?.[key];
}

/**
 * useResponsive()
 *
 * Main hook. Returns device state and update helpers scoped to current device.
 */
export default function useResponsive() {
  const deviceMode   = useBuilderStore(s => s.deviceMode);
  const setDevice    = useBuilderStore(s => s.setDeviceMode);
  const widget       = useBuilderStore(selectSelectedWidget);
  const section      = useBuilderStore(selectSelectedSection);
  const context      = useBuilderStore(selectWidgetContext);
  const updateWidget = useBuilderStore(s => s.updateWidget);
  const updateSecR   = useBuilderStore(s => s.updateSectionSettingsResponsive);
  const updateColR   = useBuilderStore(s => s.updateColumnSettingsResponsive);
  const clearWidget  = useBuilderStore(s => s.clearWidgetOverride);
  const clearSection = useBuilderStore(s => s.clearSectionOverride);
  const clearColumn  = useBuilderStore(s => s.clearColumnOverride);
  const selType      = useBuilderStore(s => s.selectionType);

  const isDesktop    = deviceMode === 'desktop';
  const isOverriding = !isDesktop;
  const config       = DEVICES[deviceMode];

  // Generic update for currently selected element
  const updateSelected = (patch) => {
    if (selType === 'widget' && widget) {
      updateWidget(widget.id, patch, deviceMode);
    } else if (selType === 'section' && section) {
      updateSecR(section.id, patch, deviceMode);
    } else if (selType === 'column' && context?.column) {
      updateColR(context.sectionId, context.column.id, patch, deviceMode);
    }
  };

  // Clear a single key override for selected element
  const clearOverride = (key = null) => {
    if (deviceMode === 'desktop') return;
    if (selType === 'widget' && widget) {
      clearWidget(widget.id, deviceMode, key);
    } else if (selType === 'section' && section) {
      clearSection(section.id, deviceMode, key);
    } else if (selType === 'column' && context?.column) {
      clearColumn(context.sectionId, context.column.id, deviceMode, key);
    }
  };

  // Count overrides on currently selected element
  const selectedElement =
    selType === 'widget'  ? widget :
    selType === 'section' ? section :
    selType === 'column'  ? context?.column : null;

  const overrideCount = countOverrides(selectedElement, deviceMode);

  return {
    deviceMode,
    setDevice,
    isDesktop,
    isOverriding,
    config,
    overrideCount,
    selectedElement,
    updateSelected,
    clearOverride,
    // Raw actions for explicit use
    updateWidget,
    updateSecR,
    updateColR,
    clearWidget,
    clearSection,
    clearColumn,
  };
}
