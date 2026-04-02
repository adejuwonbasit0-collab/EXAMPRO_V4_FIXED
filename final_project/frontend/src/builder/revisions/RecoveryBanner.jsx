// builder/revisions/RecoveryBanner.jsx
// Mounts in BuilderApp.jsx. Checks on load if there's a newer autosave
// than the current page_data (indicates the user closed without saving).

import { useState, useEffect } from 'react';
import useBuilderStore          from '../store/useBuilderStore';

export default function RecoveryBanner() {
  const pageId    = useBuilderStore(s => s.pageId);
  const [autosave,   setAutosave]   = useState(null);
  const [dismissed,  setDismissed]  = useState(false);

  useEffect(() => {
    if (!pageId || dismissed) return;

    fetch(`/api/revisions/${getPageSlug()}?autosaves=1`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ep_token') || ''}` },
    })
      .then(r => r.json())
      .then(data => {
        const autosaves    = (data.revisions || []).filter(r => r.is_autosave);
        const manualSaves  = (data.revisions || []).filter(r => !r.is_autosave);
        if (!autosaves.length) return;
        const latestAuto   = autosaves[0];
        const latestManual = manualSaves[0];
        // Only show if autosave is newer than the latest manual save
        if (!latestManual || new Date(latestAuto.created_at) > new Date(latestManual.created_at)) {
          setAutosave(latestAuto);
        }
      })
      .catch(() => {});
  }, [pageId]);   // eslint-disable-line

  if (!autosave || dismissed) return null;

  const time = new Date(autosave.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  const handleRestore = async () => {
    try {
      const res  = await fetch(`/api/revisions/${getPageSlug()}/${autosave.id}/restore`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('ep_token') || ''}` },
      });
      const data = await res.json();
      if (data.ok) {
        useBuilderStore.getState().restoreRevision(data.restoredData, autosave.id);
      }
    } finally {
      setDismissed(true);
    }
  };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg px-4">
      <div className="bg-yellow-900/95 border border-yellow-600 rounded-xl shadow-2xl px-5 py-4 flex items-start gap-4 backdrop-blur">
        <span className="text-2xl mt-0.5">⚠</span>
        <div className="flex-1">
          <p className="text-yellow-100 font-semibold text-sm">Unsaved changes found</p>
          <p className="text-yellow-300 text-xs mt-0.5">
            An autosave from {time} has changes that weren't manually saved. Restore it?
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setDismissed(true)}
            className="text-xs bg-yellow-800 hover:bg-yellow-700 text-yellow-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleRestore}
            className="text-xs bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
