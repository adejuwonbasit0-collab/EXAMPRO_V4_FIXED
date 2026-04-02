// builder/BuilderApp.jsx  — UPDATED to add DnD wrapper

import BuilderDndProvider from './dnd/BuilderDndProvider';
import useBuilderStore    from './store/useBuilderStore';
import BuilderProvider    from './BuilderProvider';
import TopToolbar         from './toolbar/TopToolbar';
import LeftPanel          from './panels/LeftPanel';
import PageRenderer       from './canvas/PageRenderer';
import RightPanel         from './panels/RightPanel';
import AutoSaveEngine     from './engine/AutoSaveEngine';

export default function BuilderApp() {
  const isLoading = useBuilderStore(s => s.isLoading);
  const layout    = useBuilderStore(s => s.layout);

  return (
    <BuilderProvider>
      <AutoSaveEngine />

      {/* BuilderDndProvider wraps the entire editor UI */}
      <BuilderDndProvider>
        <div className="builder-shell" style={{
          display:       'flex',
          flexDirection: 'column',
          height:        '100%',
          minHeight:     '85vh',
          background:    'var(--builder-bg, #0d0d14)',
          borderRadius:  '14px',
          overflow:      'hidden',
          border:        '1px solid rgba(255,255,255,.06)',
          fontFamily:    "'DM Sans', sans-serif",
        }}>
          <TopToolbar />

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <LeftPanel />

            <div style={{ flex: 1, overflow: 'auto', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: '16px' }}>
              {isLoading ? (
                <LoadingSpinner />
              ) : layout ? (
                <PageRenderer />
              ) : (
                <div style={{ color: 'rgba(255,255,255,.3)', padding: '60px', textAlign: 'center' }}>
                  Could not load builder. Please refresh.
                </div>
              )}
            </div>

            <RightPanel />
          </div>
        </div>
      </BuilderDndProvider>
    </BuilderProvider>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', color: 'rgba(255,255,255,.3)' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(124,58,237,.3)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '.85rem' }}>Loading builder...</span>
    </div>
  );
}
