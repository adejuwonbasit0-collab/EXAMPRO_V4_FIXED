// builder/panels/LeftPanel.jsx

import useBuilderStore  from '../store/useBuilderStore';
import WidgetLibrary    from './WidgetLibrary';
import TemplateLibrary  from './TemplateLibrary';
import LayersPanel      from './LayersPanel';

const TABS = [
  { id: 'widgets',   icon: '⊞',  label: 'Widgets'   },
  { id: 'templates', icon: '🎨',  label: 'Templates' },
  { id: 'layers',    icon: '⧩',  label: 'Layers'    },
];

export default function LeftPanel() {
  const activeTab = useBuilderStore(s => s.leftPanelTab);
  const setTab    = useBuilderStore(s => s.setLeftPanelTab);

  return (
    <div style={{
      width:        '260px',
      flexShrink:   0,
      display:      'flex',
      flexDirection:'column',
      borderRight:  '1px solid rgba(255,255,255,.06)',
      background:   'rgba(13,13,20,.98)',
      overflow:     'hidden',
    }}>

      {/* Tab buttons */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            style={{
              flex:         1,
              padding:      '10px 4px 9px',
              border:       'none',
              background:   'transparent',
              color:        activeTab === tab.id ? '#818CF8' : 'rgba(255,255,255,.35)',
              fontSize:     '.7rem',
              fontWeight:   activeTab === tab.id ? 700 : 400,
              cursor:       'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #818CF8' : '2px solid transparent',
              transition:   'all .15s',
              display:      'flex',
              flexDirection:'column',
              alignItems:   'center',
              gap:          '3px',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {activeTab === 'widgets'   && <WidgetLibrary />}
        {activeTab === 'templates' && <TemplateLibrary />}
        {activeTab === 'layers'    && <LayersPanel />}
      </div>
    </div>
  );
}
