// builder/revisions/RevisionDiff.jsx

import { useEffect, useState } from 'react';
import useBuilderStore          from '../store/useBuilderStore';

export default function RevisionDiff({ revisionA, revisionBId, onClose }) {
  const getPageSlug = () => document.getElementById('pb-page-select')?.value || 'home';
  const [revB, setRevB]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!revisionBId || !pageId) return;
    setLoading(true);
    fetch(`/api/revisions/${getPageSlug()}/${revisionBId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ep_token') || ''}` },
    })
      .then(r => r.json())
      .then(d => setRevB(d.revision?.page_data))
      .finally(() => setLoading(false));
  }, [revisionBId, pageId]);

  if (loading || !revB) return null;

  const statsA  = extractStats(revisionA.page_data);
  const statsB  = extractStats(revB);
  const changes = buildDiff(statsA, statsB);

  return (
    <div className="absolute inset-0 z-50 bg-gray-950/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h4 className="text-sm font-semibold text-white">Comparing versions</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-800 text-xs font-medium text-gray-400">
        <div className="bg-gray-900 px-4 py-2">Selected (older)</div>
        <div className="bg-gray-900 px-4 py-2">Current preview</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {changes.map((change, i) => (
          <div
            key={i}
            className={`
              grid grid-cols-2 gap-px bg-gray-800 text-xs
              ${change.type === 'added'   ? 'bg-green-900/10'  : ''}
              ${change.type === 'removed' ? 'bg-red-900/10'    : ''}
              ${change.type === 'changed' ? 'bg-yellow-900/10' : ''}
            `}
          >
            <div className={`bg-gray-900 px-4 py-2 text-gray-300 ${change.type === 'added' ? 'opacity-30' : ''}`}>
              {change.type === 'added' ? '—' : change.oldValue}
              {change.label && <span className="ml-2 text-gray-500">{change.label}</span>}
            </div>
            <div className={`
              bg-gray-900 px-4 py-2
              ${change.type === 'added'   ? 'text-green-400'  : ''}
              ${change.type === 'removed' ? 'text-red-400 line-through opacity-50' : ''}
              ${change.type === 'changed' ? 'text-yellow-300' : 'text-gray-300'}
            `}>
              {change.type === 'removed' ? '—' : change.newValue}
            </div>
          </div>
        ))}
        {changes.length === 0 && (
          <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
            No structural differences found.
          </div>
        )}
      </div>
    </div>
  );
}

function extractStats(pageData) {
  const sections = pageData?.sections || [];
  let widgets = 0;
  const widgetTypes = {};
  for (const sec of sections) {
    for (const col of sec.columns || []) {
      for (const w of col.widgets || []) {
        widgets++;
        widgetTypes[w.type] = (widgetTypes[w.type] || 0) + 1;
      }
    }
  }
  return { sections: sections.length, widgets, widgetTypes, globalSettings: pageData?.global_settings };
}

function buildDiff(a, b) {
  const rows = [];
  const addRow = (label, oldV, newV) => {
    const oldStr = String(oldV ?? '—');
    const newStr = String(newV ?? '—');
    const type = oldV == null ? 'added' : newV == null ? 'removed' : oldStr !== newStr ? 'changed' : 'same';
    if (type !== 'same') rows.push({ label, oldValue: oldStr, newValue: newStr, type });
  };

  addRow('Sections', a.sections, b.sections);
  addRow('Widgets',  a.widgets,  b.widgets);

  const allTypes = new Set([...Object.keys(a.widgetTypes), ...Object.keys(b.widgetTypes)]);
  for (const t of allTypes) addRow(`  ${t}`, a.widgetTypes[t], b.widgetTypes[t]);

  if (JSON.stringify(a.globalSettings) !== JSON.stringify(b.globalSettings)) {
    rows.push({ label: 'Global styles', oldValue: '(changed)', newValue: '(changed)', type: 'changed' });
  }
  return rows;
}
