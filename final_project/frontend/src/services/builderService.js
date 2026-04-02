// frontend/src/services/builderService.js
// HTTP client for all builder <-> backend API calls.

const BASE = '/api/pagebuilder';
const API  = '/api';

async function _request(url, options = {}) {
  const token = localStorage.getItem('ep_token') || '';
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const builderService = {
  /** Load a page layout for editing */
  load(pageSlug = 'home') {
    return _request(`${BASE}/load?page=${pageSlug}`);
  },

  /** Save page layout (draft or publish) */
  save(payload) {
    return _request(`${BASE}/save`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Publish a page (shorthand for save with is_published=true) */
  publish(payload) {
    return this.save({ ...payload, is_published: true });
  },

  /** List available templates */
  listTemplates(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return _request(`${API}/templates${qs ? '?' + qs : ''}`);
  },

  /** Apply a template to the current page */
  applyTemplate(templateId) {
    return _request(`${BASE}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId }),
    });
  },

  /** Get revision list for a page */
  listRevisions(pageId) {
    return _request(`${API}/revisions/${pageId}`);
  },

  /** Restore a specific revision */
  restoreRevision(revisionId) {
    return _request(`${API}/revisions/restore/${revisionId}`, { method: 'POST' });
  },

  /** Preview render (fragment HTML) */
  previewRender(layout) {
    return _request(`${API}/render/preview`, {
      method: 'POST',
      body: JSON.stringify({ layout, format: 'fragment' }),
    }).then(r => r.text ? r.text() : r);
  },
};

export default builderService;
