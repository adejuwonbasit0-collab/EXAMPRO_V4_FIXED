// builder/panels/AdvancedControls.jsx

import useBuilderStore from '../store/useBuilderStore';
import { selectSelectedWidget, selectSelectedSection } from '../store/selectors';
import { ControlRow, SectionLabel } from './RightPanel';

export default function AdvancedControls() {
  const selectionType = useBuilderStore(s => s.selectionType);
  const widget        = useBuilderStore(selectSelectedWidget);
  const section       = useBuilderStore(selectSelectedSection);
  const deviceMode    = useBuilderStore(s => s.deviceMode);
  const updateWidget  = useBuilderStore(s => s.updateWidget);
  const updateSection = useBuilderStore(s => s.updateSection);

  const target   = selectionType === 'widget'  ? widget : section;
  const isWidget = selectionType === 'widget';

  if (!target) return <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '20px', fontSize: '.8rem' }}>No element selected</div>;

  const s      = target.settings || {};
  const update = (patch) => isWidget
    ? updateWidget(target.id, patch, deviceMode)
    : updateSection(target.id, { settings: patch });

  return (
    <div>
      <SectionLabel>HTML Attributes</SectionLabel>
      <ControlRow label="CSS ID">
        <input type="text" value={s.css_id || ''} onChange={e => update({ css_id: e.target.value })}
          placeholder="my-element-id" style={baseInput} />
      </ControlRow>
      <ControlRow label="CSS Classes">
        <input type="text" value={s.css_classes || ''} onChange={e => update({ css_classes: e.target.value })}
          placeholder="class-one class-two" style={baseInput} />
      </ControlRow>

      <SectionLabel>Visibility</SectionLabel>
      <ControlRow label="Hide on Desktop">
        <ToggleSwitch value={s.hide_desktop || false} onChange={v => update({ hide_desktop: v })} />
      </ControlRow>
      <ControlRow label="Hide on Tablet">
        <ToggleSwitch value={s.hide_tablet || false} onChange={v => update({ hide_tablet: v })} />
      </ControlRow>
      <ControlRow label="Hide on Mobile">
        <ToggleSwitch value={s.hide_mobile || false} onChange={v => update({ hide_mobile: v })} />
      </ControlRow>

      <SectionLabel>Motion / Entrance</SectionLabel>
      <ControlRow label="Animation">
        <select value={s.entrance_animation || 'none'} onChange={e => update({ entrance_animation: e.target.value })} style={baseInput}>
          {['none','fadeIn','fadeInUp','fadeInDown','fadeInLeft','fadeInRight','zoomIn','slideInUp','bounceIn'].map(v =>
            <option key={v}>{v}</option>
          )}
        </select>
      </ControlRow>
      {s.entrance_animation && s.entrance_animation !== 'none' && (
        <>
          <ControlRow label="Delay (ms)">
            <input type="number" value={s.animation_delay || 0} min={0} max={2000} step={50}
              onChange={e => update({ animation_delay: Number(e.target.value) })} style={baseInput} />
          </ControlRow>
          <ControlRow label="Duration (ms)">
            <input type="number" value={s.animation_duration || 600} min={100} max={3000} step={50}
              onChange={e => update({ animation_duration: Number(e.target.value) })} style={baseInput} />
          </ControlRow>
        </>
      )}

      <SectionLabel>Custom CSS</SectionLabel>
      <ControlRow label="Custom CSS">
        <textarea
          value={s.custom_css || ''}
          onChange={e => update({ custom_css: e.target.value })}
          rows={6}
          placeholder={`/* Selector is auto-scoped */\ncolor: red;\nfont-size: 18px;`}
          style={{ ...baseInput, fontFamily: 'monospace', fontSize: '.72rem', resize: 'vertical' }}
        />
      </ControlRow>
    </div>
  );
}

function ToggleSwitch({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width:        '40px',
        height:       '22px',
        borderRadius: '11px',
        background:   value ? '#818CF8' : 'rgba(255,255,255,.12)',
        position:     'relative',
        cursor:       'pointer',
        transition:   'background .15s',
      }}
    >
      <div style={{
        position:     'absolute',
        top:          '3px',
        left:         value ? '21px' : '3px',
        width:        '16px',
        height:       '16px',
        borderRadius: '50%',
        background:   '#fff',
        transition:   'left .15s',
        boxShadow:    '0 1px 4px rgba(0,0,0,.3)',
      }} />
    </div>
  );
}

const baseInput = {
  width:        '100%',
  padding:      '7px 8px',
  background:   'rgba(255,255,255,.06)',
  border:       '1px solid rgba(255,255,255,.1)',
  borderRadius: '7px',
  color:        '#fff',
  fontSize:     '.78rem',
  outline:      'none',
  boxSizing:    'border-box',
};
