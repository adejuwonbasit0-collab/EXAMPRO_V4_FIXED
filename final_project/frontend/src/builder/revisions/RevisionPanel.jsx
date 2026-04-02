// builder/revisions/RevisionPanel.jsx

import { useState, useEffect }  from 'react';
import useRevisions              from './useRevisions';
import RevisionCard              from './RevisionCard';
import RevisionDiff              from './RevisionDiff';
import RevisionRestoreModal      from './RevisionRestoreModal';

export default function RevisionPanel() {
  const {
    revisions, loading, error,
    loadRevisions, loadPreview, clearPreview, preview,
    restore, labelRevision, deleteRevision,
  } = useRevisions();

  const [showAutosaves, setShowAutosaves] = useState(false);
  const [diffTarget,    setDiffTarget]    = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  useEffect(() => {
    loadRevisions({ includeAutosaves: showAutosaves });
  }, [showAutosaves]);   // eslint-disable-line

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    await restore(restoreTarget);
    setRestoreTarget(null);
    clearPreview();
  };

  const grouped = groupByDate(revisions);

  return (
    <div className="revision-panel flex flex-col h-full bg-gray-950 text-gray-200">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Version History</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRevisions({ includeAutosaves: showAutosaves })}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            ↻
          </button>
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAutosaves}
              onChange={e => setShowAutosaves(e.target.checked)}
              className="w-3 h-3"
            />
            Autosaves
          </label>
        </div>
      </div>

      {/* Session hint */}
      <div className="px-4 py-2 bg-blue-900/30 border-b border-blue-800/40 text-xs text-blue-300">
        ↩ Ctrl+Z · Ctrl+Y — undo/redo within this session
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            Loading revisions…
          </div>
        )}
        {error && (
          <div className="m-4 p-3 bg-red-900/40 border border-red-700 rounded text-xs text-red-300">
            {error}
          </div>
        )}
        {!loading && revisions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm gap-2">
            <span className="text-2xl">🕐</span>
            No saved versions yet.
            <span className="text-xs text-gray-600">Save the page to create a version.</span>
          </div>
        )}
        {!loading && Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="px-4 py-1.5 text-xs font-medium text-gray-500 bg-gray-900/60 sticky top-0 z-10">
              {date}
            </div>
            {items.map(rev => (
              <RevisionCard
                key={rev.id}
                revision={rev}
                isActive={preview?.revisionId === rev.id}
                isDiffTarget={diffTarget === rev.id}
                onPreview={() => loadPreview(rev.id)}
                onRestore={() => setRestoreTarget(rev.id)}
                onLabel={(newLabel) => labelRevision(rev.id, newLabel)}
                onDelete={() => deleteRevision(rev.id)}
                onSetDiff={() => setDiffTarget(rev.id === diffTarget ? null : rev.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {preview && diffTarget && diffTarget !== preview.revisionId && (
        <RevisionDiff
          revisionA={preview.data}
          revisionBId={diffTarget}
          onClose={() => { setDiffTarget(null); clearPreview(); }}
        />
      )}

      {restoreTarget && (
        <RevisionRestoreModal
          revision={revisions.find(r => r.id === restoreTarget)}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}

function groupByDate(revisions) {
  const groups = {};
  const now    = new Date();
  for (const rev of revisions) {
    const d = new Date(rev.created_at);
    const isToday     = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString();
    const key = isToday ? 'Today' : isYesterday ? 'Yesterday'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(rev);
  }
  return groups;
}
