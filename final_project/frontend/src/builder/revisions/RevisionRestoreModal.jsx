// builder/revisions/RevisionRestoreModal.jsx

export default function RevisionRestoreModal({ revision, onConfirm, onCancel }) {
  if (!revision) return null;

  const time = new Date(revision.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="text-3xl mb-3 text-center">↩</div>
        <h3 className="text-white font-semibold text-center mb-1">Restore this version?</h3>
        <p className="text-gray-400 text-sm text-center mb-4">
          {revision.label
            ? <><strong className="text-gray-200">"{revision.label}"</strong> — {time}</>
            : <>Version {revision.revision_number} from {time}</>
          }
        </p>
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2 mb-5 text-xs text-yellow-200">
          Your current unsaved changes will become a new version first, so nothing is lost.
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
