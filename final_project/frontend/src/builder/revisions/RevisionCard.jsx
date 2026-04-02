// builder/revisions/RevisionCard.jsx

import { useState, useRef } from 'react';

const SAVE_TYPE_ICONS  = { manual_save: '💾', autosave: '⏱', publish: '🚀', template_apply: '🎨', restore: '↩', import: '📥' };
const SAVE_TYPE_LABELS = { manual_save: 'Saved', autosave: 'Autosave', publish: 'Published', template_apply: 'Template applied', restore: 'Restored', import: 'Imported' };

export default function RevisionCard({
  revision, isActive, isDiffTarget,
  onPreview, onRestore, onLabel, onDelete, onSetDiff,
}) {
  const [editing,    setEditing]    = useState(false);
  const [labelInput, setLabelInput] = useState(revision.label || '');
  const [menuOpen,   setMenuOpen]   = useState(false);
  const inputRef = useRef(null);

  const time = new Date(revision.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  const handleLabelSave = () => {
    onLabel(labelInput.trim() || null);
    setEditing(false);
  };

  const borderColor =
    revision.is_published_snapshot ? 'border-l-green-500' :
    revision.save_type === 'autosave' ? 'border-l-gray-600' :
    isActive ? 'border-l-blue-500' : 'border-l-transparent';

  return (
    <div
      className={`
        group relative border-l-2 ${borderColor}
        px-4 py-3 cursor-pointer
        hover:bg-gray-800/60 transition-colors
        ${isActive    ? 'bg-gray-800/40'   : ''}
        ${isDiffTarget ? 'bg-purple-900/20' : ''}
      `}
      onClick={onPreview}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">
            {SAVE_TYPE_ICONS[revision.save_type] || '💾'}
          </span>
          <span className="text-xs font-medium text-gray-300">
            {SAVE_TYPE_LABELS[revision.save_type] || revision.save_type}
          </span>
          {revision.is_published_snapshot && (
            <span className="text-[10px] bg-green-800 text-green-200 px-1.5 py-0.5 rounded-full font-medium">
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-gray-500">{time}</span>
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded"
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-6 z-50 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => { onRestore(); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700">
                  ↩ Restore this version
                </button>
                <button onClick={() => { setEditing(true); setMenuOpen(false); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700">
                  ✏ Rename
                </button>
                <button onClick={() => { onSetDiff(); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700">
                  ↔ Compare to selected
                </button>
                {!revision.is_published_snapshot && (
                  <button onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-700">
                    🗑 Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          value={labelInput}
          onChange={e => setLabelInput(e.target.value)}
          onBlur={handleLabelSave}
          onKeyDown={e => { if (e.key === 'Enter') handleLabelSave(); if (e.key === 'Escape') setEditing(false); }}
          onClick={e => e.stopPropagation()}
          placeholder="Name this version…"
          className="mt-1 w-full text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
        />
      ) : revision.label ? (
        <div className="mt-0.5 text-xs text-blue-300 font-medium truncate">{revision.label}</div>
      ) : null}

      {revision.change_summary && (
        <div className="mt-1 text-[11px] text-gray-500 truncate">{revision.change_summary}</div>
      )}

      <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-600">
        <span>§ {revision.sections_count}</span>
        <span>⊞ {revision.widgets_count}</span>
        <span className="text-gray-700">v{revision.revision_number}</span>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onRestore(); }}
        className="
          absolute right-3 bottom-3
          opacity-0 group-hover:opacity-100 transition-opacity
          text-[11px] bg-blue-600 hover:bg-blue-500 text-white
          px-2.5 py-1 rounded font-medium
        "
      >
        Restore
      </button>
    </div>
  );
}
