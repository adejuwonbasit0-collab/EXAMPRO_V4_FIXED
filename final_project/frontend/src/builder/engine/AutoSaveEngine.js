// builder/engine/AutoSaveEngine.jsx
// PHASE 12 — Replaces the Phase 5 version.
// Adds: conflict detection, retry, save status broadcast, named revisions.

import { useEffect, useRef, useCallback } from 'react';
import useBuilderStore from '../store/useBuilderStore';
import HistoryEngine   from './HistoryEngine';

const AUTOSAVE_DELAY_MS  = 4000;   // 4s after last change
const RETRY_DELAY_MS     = 8000;   // Retry failed save after 8s
const MAX_RETRIES        = 3;

export default function AutoSaveEngine() {
  const layout    = useBuilderStore(s => s.layout);
  const isDirty   = useBuilderStore(s => s.isDirty);
  const isSaving  = useBuilderStore(s => s.isSaving);
  const pageSlug  = useBuilderStore(s => s.pageSlug);
  const pageId    = useBuilderStore(s => s.pageId);

  const timerRef       = useRef(null);
  const retryRef       = useRef(null);
  const lastSavedRef   = useRef(null);   // checksum of last successfully saved layout
  const retryCount     = useRef(0);
  const saveVersionRef = useRef(null);   // server-side version token for conflict detection

  const doSave = useCallback(async (layoutToSave) => {
    HistoryEngine.flush();

    const checksum = await sha256(JSON.stringify(layoutToSave));
    if (checksum === lastSavedRef.current) return;

    useBuilderStore.setState({ isSaving: true, saveStatus: 'saving' });

    try {
      const res = await fetch('/api/pagebuilder/save', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ep_token') || ''}`,
          ...(saveVersionRef.current ? { 'X-Page-Version': saveVersionRef.current } : {}),
        },
        body: JSON.stringify({
          page_slug:    pageSlug || 'home',
          page_data:    layoutToSave,
          is_published: false,
          save_type:    'autosave',
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // CONFLICT: another tab/user saved a newer version
        useBuilderStore.setState({
          isSaving:      false,
          saveStatus:    'conflict',
          conflictData:  data,
        });
        return;
      }

      if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed');

      lastSavedRef.current   = checksum;
      saveVersionRef.current = data.revision?.id || saveVersionRef.current;
      retryCount.current     = 0;

      useBuilderStore.setState({
        isSaving:       false,
        isDirty:        false,
        saveStatus:     'saved',
        lastSavedAt:    new Date().toISOString(),
        lastRevisionId: data.revision?.id,
      });

    } catch (err) {
      retryCount.current++;
      useBuilderStore.setState({ isSaving: false, saveStatus: 'error' });

      if (retryCount.current < MAX_RETRIES) {
        retryRef.current = setTimeout(() => doSave(layoutToSave), RETRY_DELAY_MS);
      } else {
        useBuilderStore.setState({ saveStatus: 'failed' });
      }
    }
  }, [pageSlug]);

  useEffect(() => {
    if (!isDirty || isSaving || !layout) return;

    clearTimeout(timerRef.current);
    clearTimeout(retryRef.current);

    timerRef.current = setTimeout(() => doSave(layout), AUTOSAVE_DELAY_MS);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(retryRef.current);
    };
  }, [isDirty, layout, isSaving, doSave]);

  return null;
}

async function sha256(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
