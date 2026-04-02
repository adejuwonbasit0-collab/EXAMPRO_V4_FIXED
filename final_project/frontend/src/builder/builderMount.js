// builder/builderMount.js
// This file is bundled by Vite and included as a <script> tag in index.html

import React          from 'react';
import { createRoot } from 'react-dom/client';
import BuilderApp     from './BuilderApp';

let root = null;

function mountBuilder() {
  const container = document.getElementById('builder-root');
  if (!container) {
    console.warn('[Builder] #builder-root not found in DOM');
    return;
  }

  if (!root) {
    root = createRoot(container);
  }
  root.render(<BuilderApp />);
  window.__builderMounted = true;
}

// Mount when the builder tab is shown
window.mountBuilder = mountBuilder;

// Auto-mount if the tab is already visible on page load
if (document.getElementById('builder-root')) {
  mountBuilder();
}
