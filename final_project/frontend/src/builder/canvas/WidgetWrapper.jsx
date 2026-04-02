// builder/canvas/WidgetWrapper.jsx  — UPDATED for Phase 9
// New imports and additions are marked with ← PHASE 9

import { useState, useEffect, useRef }  from 'react';
import useBuilderStore                  from '../store/useBuilderStore';
import registry                         from '../widgets/registry';
import { resolveSettings }              from '../widgets/resolveSettings';
import { buildWrapperStyle,
         buildHoverCSS,
         buildAnimationCSS }            from '../utils/styleFromSettings';  // ← PHASE 9

export default function WidgetWrapper({ widget, sectionId, columnId, index, isPreview }) {
  const [hovered,       setHovered]   = useState(false);
  const [animated,      setAnimated]  = useState(false);
  const wrapperRef                    = useRef(null);
  const selectedWidgetId              = useBuilderStore(s => s.selectedWidgetId);
  const deviceMode                    = useBuilderStore(s => s.deviceMode);
  const layout                        = useBuilderStore(s => s.layout);
  const selectWidget                  = useBuilderStore(s => s.selectWidget);
  const deleteWidget                  = useBuilderStore(s => s.deleteWidget);
  const duplicateWidget               = useBuilderStore(s => s.duplicateWidget);

  const isSelected      = selectedWidgetId === widget.id;
  const WidgetComponent = registry.getComponent(widget.type);
  const widgetDef       = registry.get(widget.type);
  const resolvedSettings = resolveSettings(widget, deviceMode);  // ← PHASE 8

  // ── Entrance animation via IntersectionObserver ───────────────── ← PHASE 9
  useEffect(() => {
    const anim = resolvedSettings.entrance_animation;
    if (!anim || anim === 'none' || isPreview) return;

    const el  = wrapperRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          if (!resolvedSettings.entrance_animation_replay) obs.disconnect();
        } else if (resolvedSettings.entrance_animation_replay) {
          setAnimated(false);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [resolvedSettings.entrance_animation, resolvedSettings.entrance_animation_replay, isPreview]);

  if (!WidgetComponent) {
    return (
      <div style={{ padding: '12px', color: '#EF4444', fontSize: '.75rem',
        border: '1px dashed #EF4444', borderRadius: '6px' }}>
        Unknown widget: {widget.type}
      </div>
    );
  }

  // Build wrapper inline styles from settings                       ← PHASE 9
  const wrapperStyle = buildWrapperStyle(resolvedSettings);

  // Entrance animation state                                        ← PHASE 9
  const animName = resolvedSettings.entrance_animation;
  const hasAnim  = animName && animName !== 'none';
  if (hasAnim) {
    if (animated) {
      wrapperStyle.animationName            = animName;
      wrapperStyle.animationDuration        = `${resolvedSettings.entrance_animation_duration ?? 600}ms`;
      wrapperStyle.animationDelay           = `${resolvedSettings.entrance_animation_delay ?? 0}ms`;
      wrapperStyle.animationTimingFunction  = resolvedSettings.entrance_animation_easing || 'ease-out';
      wrapperStyle.animationFillMode        = 'both';
    } else {
      // Pre-animation state — keep invisible until observer fires
      wrapperStyle.opacity    = 0;
      wrapperStyle.visibility = 'hidden';
    }
  }

  // Scoped hover + animation CSS string for <style> injection       ← PHASE 9
  const hoverCSS = buildHoverCSS(widget.id, resolvedSettings);
  const animCSS  = hasAnim ? buildAnimationCSS(animName) : '';

  return (
    <div
      ref={wrapperRef}
      id={resolvedSettings.css_id || undefined}
      className={resolvedSettings.css_classes || undefined}
      style={{
        position:     'relative',
        // Base structural style from Phase 5:
        outline:      isSelected ? '2px solid #818CF8'
                    : hovered && !isPreview ? '1px dashed rgba(129,140,248,.4)' : 'none',
        outlineOffset: isSelected ? '-2px' : '-1px',
        transition:   `outline .1s, ${resolvedSettings.hover_transition || '0.2s'} ease`,
        cursor:       isPreview ? 'default' : 'pointer',
        // Phase 9 style layer:
        ...wrapperStyle,
      }}
      onClick={e => { if (!isPreview) { e.stopPropagation(); selectWidget(widget.id, sectionId, columnId); } }}
      onMouseEnter={() => !isPreview && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Scoped <style> for :hover and entrance animation keyframes */}
      {(hoverCSS || animCSS) && (               // ← PHASE 9
        <style>{hoverCSS}{animCSS}</style>
      )}

      {/* Widget type badge */}
      {isSelected && !isPreview && (
        <div style={{ position: 'absolute', top: '-1px', left: '-1px', background: '#818CF8',
          color: '#fff', fontSize: '.58rem', fontWeight: 700, padding: '2px 7px',
          borderBottomRightRadius: '5px', zIndex: 10, borderTopLeftRadius: '4px', whiteSpace: 'nowrap' }}>
          {widgetDef?.icon} {widgetDef?.label || widget.type}
        </div>
      )}

      {/* Widget actions */}
      {(isSelected || hovered) && !isPreview && (
        <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '3px',
          zIndex: 10, background: 'rgba(13,13,20,.9)', borderRadius: '7px', padding: '3px',
          border: '1px solid rgba(129,140,248,.3)' }}>
          <WAction onClick={e => { e.stopPropagation(); duplicateWidget(widget.id); }} title="Duplicate">⧉</WAction>
          <WAction onClick={e => { e.stopPropagation(); deleteWidget(widget.id); }} title="Delete" danger>✕</WAction>
        </div>
      )}

      {/* The actual widget */}
      <WidgetComponent
        settings={resolvedSettings}
        globalSettings={layout?.global_settings}
        device={deviceMode}
        isSelected={isSelected}
      />
    </div>
  );
}

function WAction({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: danger ? 'rgba(239,68,68,.2)' : 'transparent', border: 'none',
      color: danger ? '#EF4444' : 'rgba(255,255,255,.7)', width: '20px', height: '20px',
      borderRadius: '4px', cursor: 'pointer', fontSize: '.7rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  );
}
