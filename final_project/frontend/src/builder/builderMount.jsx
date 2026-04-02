// builder/builderMount.jsx
// Bundled by Vite → public/dist/builder.js

import React          from 'react';
import { createRoot } from 'react-dom/client';
import BuilderApp     from './BuilderApp';

let root = null;

function mountBuilder() {
  const container = document.getElementById('builder-root');
  if (!container) {
    console.warn('[Builder] #builder-root not found in DOM — will retry');
    return false;
  }

  // Don't mount if container is inside a hidden tab panel
  const panel = container.closest('.tab-panel');
  if (panel && !panel.classList.contains('active')) {
    console.log('[Builder] Tab not active yet — deferring mount');
    return false;
  }

  if (!root) {
    root = createRoot(container);
  }
  root.render(<BuilderApp />);
  window.__builderMounted = true;
  console.log('[Builder] Mounted ✅');
  return true;
}

// Expose for the admin page to call when the tab becomes active
window.mountBuilder = mountBuilder;

// Do NOT auto-mount on load — the tab panel is hidden.
// The admin page calls window.mountBuilder() when the tab is shown.
// Only auto-mount if already visible (e.g., direct navigation to page-builder tab)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('builder-root');
    if (container) {
      const panel = container.closest('.tab-panel');
      if (!panel || panel.classList.contains('active')) {
        mountBuilder();
      }
    }
  });
} else {
  const container = document.getElementById('builder-root');
  if (container) {
    const panel = container.closest('.tab-panel');
    if (!panel || panel.classList.contains('active')) {
      mountBuilder();
    }
  }
}