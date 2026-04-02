// builder/navigator/StructureNavigator.jsx

import { useState, useCallback } from 'react';
import useBuilderStore           from '../store/useBuilderStore';
import { useSortable }           from '@dnd-kit/sortable';
import { CSS }                   from '@dnd-kit/utilities';
import SortableSectionList       from '../dnd/SortableSectionList';
import SortableWidgetList        from '../dnd/SortableWidgetList';
import registry                  from '../widgets/registry';
import { encodeDragId, buildSectionDragData, buildWidgetDragData } from '../dnd/dragHelpers';

export default function StructureNavigator() {
  const layout           = useBuilderStore(s => s.layout);
  const selectedWidgetId = useBuilderStore(s => s.selectedWidgetId);
  const selectedSectionId= useBuilderStore(s => s.selectedSectionId);
  const selectSection    = useBuilderStore(s => s.selectSection);
  const selectWidget     = useBuilderStore(s => s.selectWidget);
  const deleteSection    = useBuilderStore(s => s.deleteSection);
  const deleteWidget     = useBuilderStore(s => s.deleteWidget);
  const duplicateSection = useBuilderStore(s => s.duplicateSection);
  const duplicateWidget  = useBuilderStore(s => s.duplicateWidget);
  const addSection       = useBuilderStore(s => s.addSection);

  // Track which sections are collapsed in the navigator
  const [collapsed, setCollapsed] = useState({});
  const toggle = useCallback((id) => setCollapsed(c => ({ ...c, [id]: !c[id] })), []);

  if (!layout) return null;

  const sections = layout.sections || [];

  return (
    <div style={{ userSelect: 'none' }}>

      {/* Navigator header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(255,255,255,.25)' }}>
          Page Structure
        </div>
        <button
          onClick={() => addSection()}
          title="Add Section"
          style={{ background: 'rgba(129,140,248,.15)', border: '1px solid rgba(129,140,248,.25)', color: '#818CF8', borderRadius: '6px', padding: '3px 8px', fontSize: '.68rem', cursor: 'pointer', fontWeight: 600 }}
        >
          ＋ Section
        </button>
      </div>

      {/* Page root row */}
      <NavRow
        icon="🗒"
        label={layout.page_name || 'Page'}
        depth={0}
        isRoot
        count={`${sections.length} section${sections.length !== 1 ? 's' : ''}`}
      />

      {/* Empty state */}
      {sections.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,.2)', fontSize: '.75rem', padding: '12px 8px 4px 20px' }}>
          No sections yet. Click "+ Section" to start.
        </div>
      )}

      {/* Sections — wrapped in SortableSectionList for drag-reorder */}
      <SortableSectionList sections={sections}>
        {sections.map((section, si) => (
          <NavigatorSection
            key={section.id}
            section={section}
            index={si}
            isCollapsed={!!collapsed[section.id]}
            onToggle={() => toggle(section.id)}
            isSelected={selectedSectionId === section.id && !selectedWidgetId}
            onSelect={() => selectSection(section.id)}
            onDelete={() => deleteSection(section.id)}
            onDuplicate={() => duplicateSection(section.id)}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={selectWidget}
            onDeleteWidget={deleteWidget}
            onDuplicateWidget={duplicateWidget}
          />
        ))}
      </SortableSectionList>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavigatorSection — one section row with columns and widgets inside
// ─────────────────────────────────────────────────────────────────────────────

function NavigatorSection({
  section, index, isCollapsed, onToggle,
  isSelected, onSelect, onDelete, onDuplicate,
  selectedWidgetId, onSelectWidget, onDeleteWidget, onDuplicateWidget,
}) {
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   encodeDragId('section', section.id),
    data: buildSectionDragData(section.id, index),
  });

  const widgetCount = section.columns.reduce((n, c) => n + c.widgets.length, 0);
  const colCount    = section.columns.length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      {/* Section row */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '5px',
          padding:      '5px 6px',
          borderRadius: '7px',
          cursor:       'pointer',
          background:   isSelected ? 'rgba(129,140,248,.15)' : hovered ? 'rgba(255,255,255,.04)' : 'transparent',
          border:       `1px solid ${isSelected ? 'rgba(129,140,248,.3)' : 'transparent'}`,
          marginBottom: '1px',
          marginLeft:   '8px',
        }}
      >
        {/* DRAG HANDLE */}
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: 'rgba(255,255,255,.2)', fontSize: '.8rem', padding: '0 2px', flexShrink: 0 }}
          title="Drag to reorder section"
        >⠿</span>

        {/* Collapse toggle */}
        <span
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.3)', width: '14px', flexShrink: 0, textAlign: 'center' }}
        >
          {isCollapsed ? '▸' : '▾'}
        </span>

        {/* Section icon + label */}
        <span style={{ fontSize: '.78rem' }}>📐</span>
        <span
          onClick={onSelect}
          style={{ flex: 1, fontSize: '.75rem', fontWeight: 600, color: isSelected ? '#818CF8' : 'rgba(255,255,255,.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          Section {index + 1}
        </span>

        {/* Stats */}
        <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.25)', whiteSpace: 'nowrap', marginRight: '2px' }}>
          {colCount}col · {widgetCount}w
        </span>

        {/* Context actions — visible on hover */}
        {hovered && (
          <div style={{ display: 'flex', gap: '2px' }}>
            <MiniAction onClick={e => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">⧉</MiniAction>
            <MiniAction onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete" danger>✕</MiniAction>
          </div>
        )}
      </div>

      {/* Columns and widgets (collapsible) */}
      {!isCollapsed && (
        <div style={{ marginLeft: '22px' }}>
          {section.columns.map((column, ci) => (
            <NavigatorColumn
              key={column.id}
              column={column}
              columnIndex={ci}
              sectionId={section.id}
              selectedWidgetId={selectedWidgetId}
              onSelectWidget={onSelectWidget}
              onDeleteWidget={onDeleteWidget}
              onDuplicateWidget={onDuplicateWidget}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavigatorColumn
// ─────────────────────────────────────────────────────────────────────────────

function NavigatorColumn({ column, columnIndex, sectionId, selectedWidgetId, onSelectWidget, onDeleteWidget, onDuplicateWidget }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      {/* Column row (non-interactive — just a structural indicator) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', marginLeft: '8px' }}>
        <span style={{ fontSize: '.62rem', color: 'rgba(255,255,255,.18)' }}>▥</span>
        <span style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.25)', fontStyle: 'italic' }}>
          Column {columnIndex + 1}
          {column.settings?.width ? ` (${column.settings.width}%)` : ''}
        </span>
      </div>

      {/* Widgets — sortable within the column via navigator */}
      <SortableWidgetList widgets={column.widgets}>
        {column.widgets.map((widget, wi) => (
          <NavigatorWidget
            key={widget.id}
            widget={widget}
            index={wi}
            sectionId={sectionId}
            columnId={column.id}
            isSelected={selectedWidgetId === widget.id}
            onSelect={() => onSelectWidget(widget.id, sectionId, column.id)}
            onDelete={() => onDeleteWidget(widget.id)}
            onDuplicate={() => onDuplicateWidget(widget.id)}
          />
        ))}
      </SortableWidgetList>

      {column.widgets.length === 0 && (
        <div style={{ marginLeft: '24px', padding: '4px 6px', fontSize: '.68rem', color: 'rgba(255,255,255,.15)', fontStyle: 'italic' }}>
          Empty column
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavigatorWidget
// ─────────────────────────────────────────────────────────────────────────────

function NavigatorWidget({ widget, index, sectionId, columnId, isSelected, onSelect, onDelete, onDuplicate }) {
  const [hovered, setHovered] = useState(false);
  const def = registry.get(widget.type);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   encodeDragId('widget', widget.id),
    data: buildWidgetDragData(widget.id, sectionId, columnId, index),
  });

  // Get a human-readable label from widget settings
  const getLabel = () => {
    const s = widget.settings || {};
    if (s.text)    return s.text.slice(0, 28) + (s.text.length > 28 ? '…' : '');
    if (s.content) return s.content.slice(0, 28) + (s.content.length > 28 ? '…' : '');
    if (s.src)     return '🖼 ' + s.src.split('/').pop().slice(0, 20);
    if (s.url)     return '🎬 ' + s.url.slice(0, 24);
    if (s.title)   return s.title.slice(0, 28);
    return def?.label || widget.type;
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:    CSS.Transform.toString(transform),
        transition,
        opacity:      isDragging ? 0.3 : 1,
        display:      'flex',
        alignItems:   'center',
        gap:          '5px',
        padding:      '4px 6px',
        borderRadius: '6px',
        cursor:       'pointer',
        marginLeft:   '20px',
        marginBottom: '1px',
        background:   isSelected ? 'rgba(129,140,248,.15)' : hovered ? 'rgba(255,255,255,.04)' : 'transparent',
        border:       `1px solid ${isSelected ? 'rgba(129,140,248,.25)' : 'transparent'}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        style={{ cursor: 'grab', color: 'rgba(255,255,255,.18)', fontSize: '.75rem', flexShrink: 0 }}
        title="Drag to reorder"
      >⠿</span>

      {/* Widget icon */}
      <span style={{ fontSize: '.82rem', flexShrink: 0 }}>{def?.icon || '◻'}</span>

      {/* Widget label */}
      <span style={{
        flex:          1,
        fontSize:      '.72rem',
        color:         isSelected ? '#818CF8' : 'rgba(255,255,255,.55)',
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        whiteSpace:    'nowrap',
        fontWeight:    isSelected ? 600 : 400,
      }}>
        {getLabel()}
      </span>

      {/* Context actions */}
      {hovered && (
        <div style={{ display: 'flex', gap: '2px' }}>
          <MiniAction onClick={e => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">⧉</MiniAction>
          <MiniAction onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete" danger>✕</MiniAction>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared small components
// ─────────────────────────────────────────────────────────────────────────────

function NavRow({ icon, label, depth, isRoot, count }) {
  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:         '6px',
      padding:     '5px 6px',
      marginBottom:'4px',
      paddingLeft: `${6 + depth * 16}px`,
      opacity:     isRoot ? 0.8 : 1,
    }}>
      <span style={{ fontSize: '.85rem' }}>{icon}</span>
      <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>{label}</span>
      {count && <span style={{ marginLeft: 'auto', fontSize: '.62rem', color: 'rgba(255,255,255,.25)' }}>{count}</span>}
    </div>
  );
}

function MiniAction({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background:   danger ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
        border:       'none',
        color:        danger ? '#EF4444' : 'rgba(255,255,255,.5)',
        width:        '18px',
        height:       '18px',
        borderRadius: '4px',
        cursor:       'pointer',
        fontSize:     '.6rem',
        display:      'flex',
        alignItems:   'center',
        justifyContent:'center',
        flexShrink:    0,
      }}
    >
      {children}
    </button>
  );
}
