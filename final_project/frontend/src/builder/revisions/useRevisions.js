// builder/revisions/useRevisions.js
// Talks to /api/revisions/:pageSlug/* endpoints

import { useState, useCallback } from 'react';
import useBuilderStore from '../store/useBuilderStore';

function getToken() {
  return localStorage.getItem('ep_token') || '';
}

function getPageSlug() {
  return document.getElementById('pb-page-select')?.value || 'home';
}

export default function useRevisions() {
  const [revisions, setRevisions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [preview,   setPreview]   = useState(null);

  const loadRevisions = useCallback(async () => {
    const slug = getPageSlug();
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/revisions/${slug}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setRevisions(data.revisions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async (revisionId) => {
    const slug = getPageSlug();
    try {
      const res  = await fetch(`/api/revisions/${slug}/${revisionId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPreview({ revisionId, data: data.revision });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const clearPreview = useCallback(() => setPreview(null), []);

  const restore = useCallback(async (revisionId) => {
    const slug = getPageSlug();
    setLoading(true);
    try {
      const res  = await fetch(`/api/revisions/${slug}/${revisionId}/restore`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Restore failed');
      // Push restored layout into the builder store
      if (data.layout) {
        useBuilderStore.getState().setLayout(data.layout);
      }
      await loadRevisions();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadRevisions]);

  const labelRevision = useCallback(async (revisionId, label) => {
    const slug = getPageSlug();
    const res  = await fetch(`/api/revisions/${slug}/${revisionId}/label`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body:    JSON.stringify({ label }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    setRevisions(prev => prev.map(r => r.id === revisionId ? { ...r, label } : r));
  }, []);

  return {
    revisions, loading, error, preview,
    loadRevisions, loadPreview, clearPreview,
    restore, labelRevision,
  };
}
