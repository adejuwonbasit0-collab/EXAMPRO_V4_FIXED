// builder/sections/ColumnSettingsPanel.jsx  — UPDATED Phase 10
// Changes: routes writes through updateColumnSettingsResponsive,
// wraps key fields in ResponsiveField, shows effective (merged) values.

import useBuilderStore               from '../store/useBuilderStore';
import { selectWidgetContext }        from '../store/selectors';
import BackgroundControl             from '../controls/BackgroundControl';
import SpacingControl                from '../controls/SpacingControl';
import { ControlRow, SectionLabel }  from '../panels/RightPanel';
import { NumberInput, SelectInput, SegmentedControl, Toggle } from '../controls/atoms';
import BorderControl                 from '../controls/BorderControl';
import ResponsiveField               from '../responsive/ResponsiveField';
import useResponsive                 from '../responsive/useResponsive';

export default function ColumnSettingsPanel() {
  const context   = useBuilderStore(selectWidgetContext);
  const updateColR= useBuilderStore(s => s.updateColumnSettingsResponsive);
  const clearColR = useBuilderStore(s => s.clearColumnOverride);
  const { deviceMode, isOverriding } = useResponsive();

  if (!context?.column) return null;
  const { column, sectionId } = context;

  const c   = column.settings || {};
  const rs  = column.responsive_settings?.[deviceMode] || {};
  const eff = isOverriding ? { ...c, ...rs } : c;

  const update = (patch) => updateColR(sectionId, column.id, patch, deviceMode);
  const clear  = (key)   => clearColR(sectionId, column.id, deviceMode, key);

  const RField = ({ k, label, children }) => (
    <ResponsiveField fieldKey={k} element={column} clearFn={clear}>
      <ControlRow label={label}>{children}</ControlRow>
    </ResponsiveField>
  );

  return (
    <div>
      {/* ── LAYOUT ──────────────────────────────────────────── */}
      <SectionLabel>Layout</SectionLabel>

      <RField k="width" label="Width (%)">
        <NumberInput value={eff.width ?? 100} min={10} max={100} step={0.5}
          onChange={v => update({ width: v })} suffix="%" />
      </RField>

      <RField k="min_height" label="Min Height (px)">
        <NumberInput value={eff.min_height || 0} min={0} max={2000}
          onChange={v => update({ min_height: v })} suffix="px" />
      </RField>

      <RField k="vertical_align" label="Vertical Align">
        <SegmentedControl
          value={eff.vertical_align || 'top'}
          onChange={v => update({ vertical_align: v })}
          options={[{ value: 'top', label: 'Top' }, { value: 'middle', label: 'Mid' }, { value: 'bottom', label: 'Bot' }]}
        />
      </RField>

      <RField k="horizontal_align" label="Horizontal Align">
        <SegmentedControl
          value={eff.horizontal_align || 'left'}
          onChange={v => update({ horizontal_align: v })}
          options={[{ value: 'left', label: '⬅' }, { value: 'center', label: '↔' }, { value: 'right', label: '➡' }]}
        />
      </RField>

      {/* ── SPACING ─────────────────────────────────────────── */}
      <SectionLabel>Spacing</SectionLabel>

      <RField k="padding" label="Padding">
        <SpacingControl
          value={eff.padding || { top: 16, right: 16, bottom: 16, left: 16 }}
          onChange={v => update({ padding: v })}
        />
      </RField>

      {/* ── BACKGROUND ──────────────────────────────────────── */}
      <SectionLabel>Background</SectionLabel>
      <ResponsiveField fieldKey="background" element={column} clearFn={clear}>
        <BackgroundControl
          value={eff.background || { type: 'none' }}
          onChange={v => update({ background: v })}
        />
      </ResponsiveField>

      {/* ── BORDER ──────────────────────────────────────────── */}
      <SectionLabel>Border</SectionLabel>
      <ResponsiveField fieldKey="border" element={column} clearFn={clear}>
        <BorderControl settings={eff} onChange={update} />
      </ResponsiveField>

      {/* ── VISIBILITY ──────────────────────────────────────── */}
      <SectionLabel>Visibility</SectionLabel>
      <ControlRow label="Hide on Desktop">
        <Toggle value={!!c.hide_desktop} onChange={v => update({ hide_desktop: v })} />
      </ControlRow>
      <ControlRow label="Hide on Tablet">
        <Toggle value={!!c.hide_tablet} onChange={v => update({ hide_tablet: v })} />
      </ControlRow>
      <ControlRow label="Hide on Mobile">
        <Toggle value={!!c.hide_mobile} onChange={v => update({ hide_mobile: v })} />
      </ControlRow>
    </div>
  );
}
