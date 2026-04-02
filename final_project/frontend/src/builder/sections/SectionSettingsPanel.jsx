// builder/sections/SectionSettingsPanel.jsx  — UPDATED Phase 10
// Changes from Phase 7:
//   1. Imports updateSectionSettingsResponsive instead of updateSectionSettings
//   2. Wraps key fields in <ResponsiveField>
//   3. ResponsiveBadge rendered at top (done by RightPanel — no change needed here)

import useBuilderStore           from '../store/useBuilderStore';
import { selectSelectedSection } from '../store/selectors';
import BackgroundControl         from '../controls/BackgroundControl';
import SpacingControl            from '../controls/SpacingControl';
import ShapeDividerControl       from './ShapeDividerControl';
import { ControlRow, SectionLabel } from '../panels/RightPanel';
import { NumberInput, SelectInput, SegmentedControl, Toggle, TextInput } from '../controls/atoms';
import ResponsiveField           from '../responsive/ResponsiveField';
import useResponsive             from '../responsive/useResponsive';

export default function SectionSettingsPanel() {
  const section     = useBuilderStore(selectSelectedSection);
  const updateSecR  = useBuilderStore(s => s.updateSectionSettingsResponsive);
  const clearSecR   = useBuilderStore(s => s.clearSectionOverride);
  const { deviceMode, isOverriding } = useResponsive();

  if (!section) return null;

  const s      = section.settings || {};
  // When overriding, resolve merged settings for display (so controls show effective value)
  const rs     = section.responsive_settings?.[deviceMode] || {};
  const eff    = isOverriding ? { ...s, ...rs } : s;

  const update = (patch) => updateSecR(section.id, patch, deviceMode);
  const clear  = (key)   => clearSecR(section.id, deviceMode, key);

  // Helper: wrap a ControlRow in a ResponsiveField for a given key
  const RField = ({ k, label, children }) => (
    <ResponsiveField fieldKey={k} element={section} clearFn={clear}>
      <ControlRow label={label}>{children}</ControlRow>
    </ResponsiveField>
  );

  return (
    <div>
      {/* ── LAYOUT ──────────────────────────────────────────── */}
      <SectionLabel>Layout</SectionLabel>

      <RField k="content_width" label="Content Width">
        <SegmentedControl
          value={eff.content_width || 'boxed'}
          onChange={v => update({ content_width: v })}
          options={[{ value: 'boxed', label: 'Boxed' }, { value: 'full_width', label: 'Full' }]}
        />
      </RField>

      {eff.content_width === 'boxed' && (
        <RField k="content_max_width" label="Max Width (px)">
          <NumberInput value={eff.content_max_width || 1200} min={320} max={2560}
            onChange={v => update({ content_max_width: v })} suffix="px" />
        </RField>
      )}

      <RField k="min_height" label="Min Height">
        <NumberInput value={eff.min_height || 0} min={0} max={2000}
          onChange={v => update({ min_height: v })} suffix="px" />
      </RField>

      <RField k="full_height" label="Full Height (100vh)">
        <Toggle value={!!eff.full_height} onChange={v => update({ full_height: v })} />
      </RField>

      <RField k="columns_position" label="Column Alignment">
        <SelectInput value={eff.columns_position || 'stretch'} onChange={v => update({ columns_position: v })}
          options={[
            { value: 'flex-start', label: 'Top' },
            { value: 'center',     label: 'Middle' },
            { value: 'flex-end',   label: 'Bottom' },
            { value: 'stretch',    label: 'Stretch' },
          ]} />
      </RField>

      <RField k="columns_gap" label="Column Gap (px)">
        <NumberInput value={eff.columns_gap ?? 20} min={0} max={200}
          onChange={v => update({ columns_gap: v })} suffix="px" />
      </RField>

      {/* HTML tag + overflow: desktop only (structural) */}
      <ControlRow label="HTML Tag">
        <SelectInput value={s.html_tag || 'section'} onChange={v => update({ html_tag: v })}
          options={[
            { value: 'section', label: '<section>' }, { value: 'div', label: '<div>' },
            { value: 'header', label: '<header>' }, { value: 'footer', label: '<footer>' },
            { value: 'main', label: '<main>' }, { value: 'article', label: '<article>' },
          ]} />
      </ControlRow>

      {/* ── SPACING ─────────────────────────────────────────── */}
      <SectionLabel>Spacing</SectionLabel>

      <RField k="padding" label="Padding">
        <SpacingControl
          value={eff.padding || { top: 80, right: 0, bottom: 80, left: 0 }}
          onChange={v => update({ padding: v })}
        />
      </RField>

      <RField k="margin" label="Margin">
        <SpacingControl
          value={eff.margin || { top: 0, right: 0, bottom: 0, left: 0 }}
          onChange={v => update({ margin: v })}
        />
      </RField>

      {/* ── BACKGROUND ──────────────────────────────────────── */}
      <SectionLabel>Background</SectionLabel>
      <ResponsiveField fieldKey="background" element={section} clearFn={clear}>
        <BackgroundControl
          value={eff.background || { type: 'none' }}
          onChange={v => update({ background: v })}
          supportVideo
        />
      </ResponsiveField>

      {/* ── SHAPE DIVIDERS — structural, desktop only ──────── */}
      <SectionLabel>Shape Dividers</SectionLabel>
      <ControlRow label="Top Divider">
        <ShapeDividerControl
          value={s.shape_divider?.top || null}
          onChange={v => update({ shape_divider: { ...(s.shape_divider || {}), top: v } })}
          position="top"
        />
      </ControlRow>
      <ControlRow label="Bottom Divider">
        <ShapeDividerControl
          value={s.shape_divider?.bottom || null}
          onChange={v => update({ shape_divider: { ...(s.shape_divider || {}), bottom: v } })}
          position="bottom"
        />
      </ControlRow>

      {/* ── VISIBILITY ──────────────────────────────────────── */}
      <SectionLabel>Visibility</SectionLabel>
      <ControlRow label="Hide on Desktop">
        <Toggle value={!!s.hide_desktop} onChange={v => update({ hide_desktop: v })} />
      </ControlRow>
      <ControlRow label="Hide on Tablet">
        <Toggle value={!!s.hide_tablet} onChange={v => update({ hide_tablet: v })} />
      </ControlRow>
      <ControlRow label="Hide on Mobile">
        <Toggle value={!!s.hide_mobile} onChange={v => update({ hide_mobile: v })} />
      </ControlRow>

      {/* ── ADVANCED ────────────────────────────────────────── */}
      <SectionLabel>Advanced</SectionLabel>
      <ControlRow label="CSS ID">
        <TextInput value={s.css_id || ''} onChange={v => update({ css_id: v })} placeholder="my-section-id" />
      </ControlRow>
      <ControlRow label="CSS Classes">
        <TextInput value={s.css_classes || ''} onChange={v => update({ css_classes: v })} placeholder="class-one class-two" />
      </ControlRow>
    </div>
  );
}
