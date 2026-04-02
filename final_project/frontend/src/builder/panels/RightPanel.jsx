// builder/panels/RightPanel.jsx  — UPDATED for Phase 10
// Adds: device indicator in the selection header, Responsive tab for widgets.

import useBuilderStore from '../store/useBuilderStore';
import { selectSelectedWidget, selectSelectedSection } from '../store/selectors';
import SectionSettingsPanel from '../sections/SectionSettingsPanel';
import ColumnSettingsPanel  from '../sections/ColumnSettingsPanel';
import ContentControls      from './ContentControls';
import StyleControls        from './StyleControls';
import AdvancedControls     from './AdvancedControls';
import GlobalSettingsPanel  from './GlobalSettingsPanel';
import ResponsiveBadge      from '../responsive/ResponsiveBadge';
import ResponsiveInspector  from '../responsive/ResponsiveInspector';
import { DEVICES }          from '../responsive/useResponsive';

// ─── Shared layout helpers (exported for reuse in sub-panels) ─────────────────
export function ControlRow({ label, children }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      {label && (
        <div style={{
          fontSize: '.68rem', fontWeight: 600, color: 'rgba(255,255,255,.4)',
          textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px',
        }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '.65rem', fontWeight: 700, color: 'rgba(255,255,255,.3)',
      textTransform: 'uppercase', letterSpacing: '.1em',
      borderTop: '1px solid rgba(255,255,255,.06)',
      margin: '12px 0 8px', paddingTop: '10px',
    }}>
      {children}
    </div>
  );
}

// ─── Device colors for tab indicator ─────────────────────────────────────────
const DEVICE_TAB_COLOR = {
  desktop: '#818CF8',
  tablet:  '#06D6A0',
  mobile:  '#F59E0B',
};

export default function RightPanel() {
  const activeTab      = useBuilderStore(s => s.rightPanelTab);
  const setTab         = useBuilderStore(s => s.setRightPanelTab);
  const selectionType  = useBuilderStore(s => s.selectionType);
  const deviceMode     = useBuilderStore(s => s.deviceMode);
  const selectedWidget = useBuilderStore(selectSelectedWidget);
  const selectedSection= useBuilderStore(selectSelectedSection);
  const devCfg         = DEVICES[deviceMode];
  const devColor       = DEVICE_TAB_COLOR[deviceMode];
  const isOverriding   = deviceMode !== 'desktop';

  const hasSelection   = selectionType !== null;
  const isWidget       = selectionType === 'widget';

  // Widget tabs — include Responsive tab when in non-desktop mode
  const widgetTabs = [
    { id: 'content',    label: '✏️ Content'    },
    { id: 'style',      label: '🎨 Style'      },
    { id: 'advanced',   label: '⚙️ Advanced'   },
    { id: 'responsive', label: `${devCfg.icon} ${devCfg.label}` },
  ];

  return (
    <div style={{
      width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${isOverriding ? `${devColor}40` : 'rgba(255,255,255,.06)'}`,
      background: 'rgba(13,13,20,.98)', overflow: 'hidden',
      transition: 'border-color .2s',
    }}>

      {/* ── Selection header ──────────────────────────────────────────── */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.06)',
        background: isOverriding ? `${devColor}0a` : 'rgba(255,255,255,.02)',
        transition: 'background .2s',
      }}>
        {!hasSelection ? (
          <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>
            Click an element to edit it
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'rgba(255,255,255,.8)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectionType === 'widget'  && `🔲 ${selectedWidget?.type || 'Widget'}`}
              {selectionType === 'section' && '📐 Section'}
              {selectionType === 'column'  && '▥ Column'}
            </div>
            {/* Device indicator chip */}
            <div style={{
              padding:      '2px 7px',
              borderRadius: '5px',
              background:   `${devColor}20`,
              border:       `1px solid ${devColor}50`,
              fontSize:     '.6rem',
              fontWeight:   700,
              color:        devColor,
              flexShrink:   0,
            }}>
              {devCfg.icon} {deviceMode}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs — only for widgets ──────────────────────────────────── */}
      {isWidget && (
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)', overflowX: 'auto' }}>
          {widgetTabs.map(tab => {
            const isActive  = activeTab === tab.id;
            const isRespTab = tab.id === 'responsive';
            // Color the responsive tab with the device color
            const color = isRespTab ? devColor : (isActive ? '#818CF8' : 'rgba(255,255,255,.3)');
            return (
              <button key={tab.id} onClick={() => setTab(tab.id)} style={{
                flex: 1, minWidth: '52px', padding: '9px 4px', border: 'none', background: 'transparent',
                color,
                fontSize: '.63rem', fontWeight: isActive ? 700 : 400, cursor: 'pointer',
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Panel body ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>

        {/* Section */}
        {selectionType === 'section' && (
          <>
            <ResponsiveBadge />
            <SectionSettingsPanel />
          </>
        )}

        {/* Column */}
        {selectionType === 'column' && (
          <>
            <ResponsiveBadge />
            <ColumnSettingsPanel />
          </>
        )}

        {/* Widget — tab-routed */}
        {isWidget && (
          <>
            {activeTab !== 'responsive' && <ResponsiveBadge />}
            {activeTab === 'content'    && <ContentControls />}
            {activeTab === 'style'      && <StyleControls />}
            {activeTab === 'advanced'   && <AdvancedControls />}
            {activeTab === 'responsive' && <ResponsiveInspector />}
          </>
        )}

        {/* Nothing selected */}
        {!hasSelection && <GlobalSettingsPanel />}
      </div>
    </div>
  );
}
