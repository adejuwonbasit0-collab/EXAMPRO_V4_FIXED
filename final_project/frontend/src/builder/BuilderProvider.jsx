// builder/BuilderProvider.jsx

import { useEffect, useCallback } from 'react';
import useBuilderStore            from './store/useBuilderStore';
import { migrateV1ToV2 }         from './engine/migrateV1ToV2';
import { createEmptyPage }        from './engine/createEmptyPage';

export default function BuilderProvider({ children }) {
  const setLayout   = useBuilderStore(s => s.setLayout);
  const setSite     = useBuilderStore(s => s.setSite);
  const setLoading  = useBuilderStore(s => s.setIsLoading);

  const loadPage = useCallback(async (pageSlug = 'home') => {
    setLoading(true);
    // Keep store in sync with current page slug
    useBuilderStore.setState({ pageSlug });
    try {
      const data = await fetch(`/api/pagebuilder/admin-load?page=${pageSlug}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ep_token') || ''}` },
      }).then(r => r.json());

      if (!data?.site) throw new Error('Invalid API response');

      setSite(data.site);

      // Parse page_data
      let raw = null;
      if (data.page_data?.page_data) {
        raw = typeof data.page_data.page_data === 'string'
          ? JSON.parse(data.page_data.page_data)
          : data.page_data.page_data;
      }

      // Version detect + migrate
      let layout;
      if (raw?.version === '2.0' && Array.isArray(raw.sections)) {
        layout = raw;
      } else if (Array.isArray(raw?.blocks) || Array.isArray(raw)) {
        layout = migrateV1ToV2(raw?.blocks || raw, data.site);
      } else if (data.template?.layout_data) {
        // No saved page — fall back to template layout
        const tplLayout = typeof data.template.layout_data === 'string'
          ? JSON.parse(data.template.layout_data)
          : data.template.layout_data;
        layout = { ...tplLayout, page_slug: pageSlug };
      } else {
        layout = createEmptyPage(pageSlug, data.site);
      }

      setLayout(layout);
    } catch (err) {
      console.error('[BuilderProvider] loadPage failed:', err);
      setLayout(createEmptyPage('home', {}));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    // Read page slug from select element in existing index.html
    const pageSelect = document.getElementById('pb-page-select');
    const pageSlug   = pageSelect?.value || 'home';
    loadPage(pageSlug);

    // Listen to page switcher in existing toolbar
    const onPageChange = (e) => loadPage(e.target.value);
    pageSelect?.addEventListener('change', onPageChange);
    return () => pageSelect?.removeEventListener('change', onPageChange);
  }, [loadPage]);

  // Expose save/publish to window for backward compat with existing index.html buttons
  useEffect(() => {
    window.saveBuilderPage = async (publish = false) => {
      const { layout, setIsSaving } = useBuilderStore.getState();
      if (!layout) return;

      setIsSaving(true);
      try {
        const pageSelect = document.getElementById('pb-page-select');
        const pageSlug   = pageSelect?.value || 'home';
        const pageNames  = { home: 'Home', about: 'About', contact: 'Contact' };

        const payload = {
          page_slug:    pageSlug,
          page_name:    pageNames[pageSlug] || pageSlug,
          page_data:    layout,
          is_published: publish,
        };

        const res = await fetch('/api/pagebuilder/save', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('ep_token') || ''}` },
          body:    JSON.stringify(payload),
        }).then(r => r.json());

        if (res?.ok) {
          useBuilderStore.setState({ isDirty: false });
          window.Toast?.success(publish ? '🚀 Published! Your live site has been updated.' : '💾 Draft saved!');
        } else {
          window.Toast?.error(res?.message || 'Save failed');
        }
      } catch (err) {
        window.Toast?.error('Save failed: ' + err.message);
      } finally {
        setIsSaving(false);
      }
    };
  }, []);

  return children;
}
