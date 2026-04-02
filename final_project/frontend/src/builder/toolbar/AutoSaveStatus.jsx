// builder/toolbar/AutoSaveStatus.jsx

import { useEffect, useState } from 'react';
import useBuilderStore          from '../store/useBuilderStore';

const STATUS_CONFIG = {
  saved:    { label: 'Saved',       color: 'text-green-400',  icon: '✓', pulse: false },
  saving:   { label: 'Saving…',     color: 'text-blue-400',   icon: '↑', pulse: true  },
  error:    { label: 'Retrying…',   color: 'text-yellow-400', icon: '⚠', pulse: true  },
  failed:   { label: 'Save failed — click to retry', color: 'text-red-400',    icon: '✕', pulse: false },
  conflict: { label: 'Conflict — click to resolve',  color: 'text-orange-400', icon: '⚡', pulse: false },
  dirty:    { label: 'Unsaved changes', color: 'text-gray-400', icon: '●', pulse: false },
};

export default function AutoSaveStatus() {
  const isDirty      = useBuilderStore(s => s.isDirty);
  const isSaving     = useBuilderStore(s => s.isSaving);
  const saveStatus   = useBuilderStore(s => s.saveStatus);
  const lastSavedAt  = useBuilderStore(s => s.lastSavedAt);

  const [visible,   setVisible]   = useState(false);
  const [fadeTimer, setFadeTimer] = useState(null);

  const statusKey = isSaving ? 'saving' :
    (saveStatus === 'conflict' || saveStatus === 'failed') ? saveStatus :
    isDirty ? 'dirty' : saveStatus || 'saved';

  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.saved;

  useEffect(() => {
    setVisible(true);
    clearTimeout(fadeTimer);
    if (statusKey === 'saved') {
      const t = setTimeout(() => setVisible(false), 3000);
      setFadeTimer(t);
    }
  }, [statusKey]);   // eslint-disable-line

  const handleClick = () => {
    if (statusKey === 'failed')   useBuilderStore.getState().forceSave();
    if (statusKey === 'conflict') useBuilderStore.getState().openConflictModal(
      useBuilderStore.getState().conflictData
    );
  };

  const relativeTime = lastSavedAt ? getRelativeTime(new Date(lastSavedAt)) : null;
  if (!visible) return null;

  return (
    <button
      onClick={handleClick}
      title={relativeTime ? `Last saved ${relativeTime}` : undefined}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
        ${cfg.color}
        ${statusKey === 'failed' || statusKey === 'conflict'
          ? 'bg-red-950/50 hover:bg-red-900/50 cursor-pointer'
          : 'bg-gray-800/60 cursor-default'}
      `}
    >
      <span className={cfg.pulse ? 'animate-pulse' : ''}>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </button>
  );
}

function getRelativeTime(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 5)    return 'just now';
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
