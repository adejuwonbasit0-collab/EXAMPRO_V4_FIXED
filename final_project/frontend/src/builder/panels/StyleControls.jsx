// builder/panels/StyleControls.jsx  — UPDATED for Phase 9
// Widget style tab now delegates to StylePanel.
// Section + column routing is unchanged from Phase 7/8.

import useBuilderStore              from '../store/useBuilderStore';
import { selectSelectedWidget,
         selectSelectedSection }    from '../store/selectors';
import SectionSettingsPanel         from '../sections/SectionSettingsPanel';
import ColumnSettingsPanel          from '../sections/ColumnSettingsPanel';
import StylePanel                   from './StylePanel';    // ← Phase 9

export default function StyleControls() {
  const selectionType = useBuilderStore(s => s.selectionType);

  if (selectionType === 'section') return <SectionSettingsPanel />;
  if (selectionType === 'column')  return <ColumnSettingsPanel />;
  if (selectionType === 'widget')  return <StylePanel />;

  return (
    <div style={{ color: 'rgba(255,255,255,.3)', textAlign: 'center',
      padding: '24px', fontSize: '.8rem' }}>
      Select an element to edit its style
    </div>
  );
}
