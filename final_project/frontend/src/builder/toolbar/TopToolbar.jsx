// builder/toolbar/TopToolbar.jsx

import useBuilderStore from '../store/useBuilderStore';

const DEVICES = [
  { mode: 'desktop', icon: '🖥', label: 'Desktop', width: '100%' },
  { mode: 'tablet',  icon: '📱', label: 'Tablet',  width: '768px' },
  { mode: 'mobile',  icon: '📱', label: 'Mobile',  width: '375px' },
];

export default function TopToolbar() {
  const deviceMode    = useBuilderStore(s => s.deviceMode);
  const setDeviceMode = useBuilderStore(s => s.setDeviceMode);
  const isDirty       = useBuilderStore(s => s.isDirty);
  const isSaving      = useBuilderStore(s => s.isSaving);
  const canUndo       = useBuilderStore(s => s.canUndo);
  const canRedo       = useBuilderStore(s => s.canRedo);
  const undo          = useBuilderStore(s => s.undo);
  const redo          = useBuilderStore(s => s.redo);
  const layout        = useBuilderStore(s => s.layout);
  const site          = useBuilderStore(s => s.site);
  const setPreview    = useBuilderStore(s => s.setIsPreviewMode);
  const isPreview     = useBuilderStore(s => s.isPreviewMode);

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '8px',
      padding:        '10px 16px',
      borderBottom:   '1px solid rgba(255,255,255,.08)',
      background:     'rgba(13,13,20,.95)',
      backdropFilter: 'blur(12px)',
      flexShrink:     0,
      flexWrap:       'wrap',
    }}>

      {/* ── Site Badge ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #7C3AED, #06D6A0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
          🎨
        </div>
        <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'rgba(255,255,255,.7)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {site?.school_name || 'Builder'}
        </span>
      </div>

      <ToolbarDivider />

      {/* ── Undo / Redo ─────────────────────────────────────────────── */}
      <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩</ToolbarButton>
      <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">↪</ToolbarButton>

      <ToolbarDivider />

      {/* ── Device Mode ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,.05)', borderRadius: '8px', padding: '3px' }}>
        {DEVICES.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setDeviceMode(mode)}
            title={label}
            style={{
              background:   deviceMode === mode ? 'rgba(124,58,237,.7)' : 'transparent',
              border:       'none',
              color:        deviceMode === mode ? '#fff' : 'rgba(255,255,255,.4)',
              borderRadius: '6px',
              width:        '30px',
              height:       '28px',
              cursor:       'pointer',
              fontSize:     '.8rem',
              transition:   'all .15s',
            }}
          >
            {mode === 'desktop' ? '🖥' : mode === 'tablet' ? '📟' : '📱'}
          </button>
        ))}
      </div>

      <ToolbarDivider />

      {/* ── Preview Toggle ──────────────────────────────────────────── */}
      <ToolbarButton
        onClick={() => setPreview(!isPreview)}
        active={isPreview}
        title="Toggle preview mode"
      >
        {isPreview ? '✏️ Edit' : '👁 Preview'}
      </ToolbarButton>

      {/* ── View Live Site ──────────────────────────────────────────── */}
      {site?.subdomain && (
        <ToolbarButton
          onClick={() => window.open(`/site/${site.subdomain}`, '_blank')}
          title="Open live site in new tab"
        >
          🔗 Live
        </ToolbarButton>
      )}

      {/* ── Spacer ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Dirty Indicator ─────────────────────────────────────────── */}
      {isDirty && (
        <div style={{ fontSize: '.72rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
          Unsaved
        </div>
      )}

      {/* ── Save Draft ──────────────────────────────────────────────── */}
      <button
        onClick={() => window.saveBuilderPage(false)}
        disabled={isSaving || !isDirty}
        style={{
          background:   isDirty ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.03)',
          border:       '1px solid rgba(255,255,255,.12)',
          color:        isDirty ? '#fff' : 'rgba(255,255,255,.3)',
          borderRadius: '8px',
          padding:      '7px 14px',
          fontSize:     '.82rem',
          fontWeight:   600,
          cursor:       isDirty && !isSaving ? 'pointer' : 'default',
          transition:   'all .15s',
        }}
      >
        {isSaving ? '⏳ Saving...' : '💾 Save Draft'}
      </button>

      {/* ── Publish ─────────────────────────────────────────────────── */}
      <button
        onClick={() => window.saveBuilderPage(true)}
        disabled={isSaving}
        style={{
          background:   'linear-gradient(135deg, #7C3AED, #5B21B6)',
          border:       'none',
          color:        '#fff',
          borderRadius: '8px',
          padding:      '7px 18px',
          fontSize:     '.82rem',
          fontWeight:   700,
          cursor:       isSaving ? 'default' : 'pointer',
          transition:   'all .15s',
          boxShadow:    '0 2px 12px rgba(124,58,237,.4)',
          opacity:      isSaving ? 0.6 : 1,
        }}
      >
        🚀 Publish
      </button>
    </div>
  );
}

function ToolbarButton({ onClick, disabled, active, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background:   active ? 'rgba(124,58,237,.5)' : 'rgba(255,255,255,.05)',
        border:       '1px solid rgba(255,255,255,.1)',
        color:        disabled ? 'rgba(255,255,255,.2)' : '#fff',
        borderRadius: '7px',
        padding:      '5px 10px',
        fontSize:     '.78rem',
        cursor:       disabled ? 'default' : 'pointer',
        whiteSpace:   'nowrap',
        transition:   'all .15s',
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,.08)', flexShrink: 0 }} />;
}
