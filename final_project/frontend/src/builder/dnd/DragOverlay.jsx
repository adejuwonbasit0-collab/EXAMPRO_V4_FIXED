// builder/dnd/DragOverlay.jsx

import useDragStore    from './useDragStore';
import useBuilderStore from '../store/useBuilderStore';
import registry        from '../widgets/registry';

export default function DragOverlayCard() {
  const activeDrag = useDragStore(s => s.activeDrag);
  const layout     = useBuilderStore(s => s.layout);

  if (!activeDrag) return null;

  // ── Palette drag — show widget type card ─────────────────────────
  if (activeDrag.type === 'palette') {
    const def = registry.get(activeDrag.widgetType);
    return (
      <div style={{
        background:   'rgba(13,13,30,.95)',
        border:       '2px solid #818CF8',
        borderRadius: '10px',
        padding:      '10px 16px',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
        boxShadow:    '0 16px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(129,140,248,.3)',
        cursor:       'grabbing',
        pointerEvents:'none',
        transform:    'rotate(-1.5deg)',
        minWidth:     '140px',
      }}>
        <span style={{ fontSize: '1.3rem' }}>{def?.icon || '⊞'}</span>
        <div>
          <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#818CF8' }}>{def?.label || activeDrag.widgetType}</div>
          <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.4)', marginTop: '1px' }}>Drop into column</div>
        </div>
      </div>
    );
  }

  // ── Widget canvas drag — show mini widget preview ─────────────────
  if (activeDrag.type === 'widget') {
    let widget = null;
    for (const section of (layout?.sections || [])) {
      for (const col of (section.columns || [])) {
        widget = col.widgets.find(w => w.id === activeDrag.widgetId);
        if (widget) break;
      }
      if (widget) break;
    }
    const def = widget ? registry.get(widget.type) : null;
    const WidgetComponent = def ? registry.getComponent(widget.type) : null;

    return (
      <div style={{
        background:   'rgba(13,13,30,.95)',
        border:       '2px solid #818CF8',
        borderRadius: '10px',
        boxShadow:    '0 16px 40px rgba(0,0,0,.5)',
        cursor:       'grabbing',
        pointerEvents:'none',
        transform:    'rotate(-1deg) scale(0.95)',
        overflow:     'hidden',
        minWidth:     '220px',
        maxWidth:     '300px',
      }}>
        {/* Header */}
        <div style={{ padding: '7px 12px', background: 'rgba(129,140,248,.15)', borderBottom: '1px solid rgba(129,140,248,.2)', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '.85rem' }}>{def?.icon || '⊞'}</span>
          <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#818CF8' }}>{def?.label || (widget?.type)}</span>
          <span style={{ marginLeft: 'auto', fontSize: '.62rem', color: 'rgba(255,255,255,.3)' }}>Moving...</span>
        </div>
        {/* Widget preview (scaled down) */}
        <div style={{ padding: '8px', maxHeight: '80px', overflow: 'hidden', opacity: 0.7, transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%' }}>
          {WidgetComponent && widget ? (
            <WidgetComponent
              settings={widget.settings}
              globalSettings={layout?.global_settings}
              device="desktop"
              isSelected={false}
            />
          ) : (
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.75rem', textAlign: 'center', padding: '8px' }}>{widget?.type}</div>
          )}
        </div>
      </div>
    );
  }

  // ── Section drag — show section placeholder ───────────────────────
  if (activeDrag.type === 'section') {
    const section  = layout?.sections.find(s => s.id === activeDrag.sectionId);
    const colCount = section?.columns.length || 1;
    const wCount   = section?.columns.reduce((n, c) => n + c.widgets.length, 0) || 0;

    return (
      <div style={{
        background:   'rgba(13,13,30,.95)',
        border:       '2px solid #818CF8',
        borderRadius: '10px',
        padding:      '14px 20px',
        boxShadow:    '0 16px 40px rgba(0,0,0,.5)',
        cursor:       'grabbing',
        pointerEvents:'none',
        transform:    'rotate(-0.5deg)',
        minWidth:     '260px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>📐</span>
          <div>
            <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#818CF8' }}>Section</div>
            <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.35)', marginTop: '2px' }}>
              {colCount} column{colCount !== 1 ? 's' : ''} · {wCount} widget{wCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {/* Mini column preview */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {Array.from({ length: colCount }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: '6px', background: 'rgba(129,140,248,.3)', borderRadius: '3px' }} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
