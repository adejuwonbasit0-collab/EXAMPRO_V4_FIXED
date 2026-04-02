// builder/panels/StylePanel.jsx
// Widget style editor — shown in RightPanel when a widget is selected
// and the "Style" tab is active.

import React, { useState }       from 'react';
import useBuilderStore            from '../store/useBuilderStore';
import { selectSelectedWidget }   from '../store/selectors';
import { resolveSettings }        from '../widgets/resolveSettings';
import { ControlRow, SectionLabel } from './RightPanel';
import ResponsiveField            from '../responsive/ResponsiveField';
import useResponsive              from '../responsive/useResponsive';

import BackgroundControl  from '../controls/BackgroundControl';
import TypographyControl  from '../controls/TypographyControl';
import SpacingControl     from '../controls/SpacingControl';
import BorderControl      from '../controls/BorderControl';
import ShadowControl      from '../controls/ShadowControl';
import AnimationControl   from '../controls/AnimationControl';
import HoverControl       from '../controls/HoverControl';
import FilterControl      from '../controls/FilterControl';
import {
  NumberInput, SelectInput, SegmentedControl,
  Toggle, SliderInput, ColorInput,
} from '../controls/atoms';

// Widget types that have text and can use typography controls
const TYPOGRAPHY_TYPES = new Set([
  'heading', 'text', 'button', 'accordion', 'tabs',
  'pricing', 'testimonial', 'countdown',
]);

// Tab bar for Style sub-sections
const STYLE_TABS = [
  { id: 'color',     label: 'Color'     },
  { id: 'spacing',   label: 'Spacing'   },
  { id: 'border',    label: 'Border'    },
  { id: 'effects',   label: 'Effects'   },
  { id: 'animation', label: 'Motion'    },
];

export default function StylePanel() {
  const [activeTab, setActiveTab] = useState('color');

  const widget      = useBuilderStore(selectSelectedWidget);
  const updateWidget = useBuilderStore(s => s.updateWidget);
  const clearWidgetOverride = useBuilderStore(s => s.clearWidgetOverride);

  const { deviceMode, isOverriding } = useResponsive();

  if (!widget) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: '.8rem' }}>
        Select a widget to edit its style
      </div>
    );
  }

  const s      = resolveSettings(widget, deviceMode);
  const update = (patch) => updateWidget(widget.id, patch, deviceMode);
  const clear  = (key)   => clearWidgetOverride(widget.id, deviceMode, key);

  const showTypography = TYPOGRAPHY_TYPES.has(widget.type);

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {/* Sub-tab navigation */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)',
        marginBottom: '14px', gap: '0',
      }}>
        {STYLE_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '7px 4px', border: 'none', background: 'none',
              color: activeTab === t.id ? '#A78BFA' : 'rgba(255,255,255,.35)',
              fontSize: '.65rem', fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer', borderBottom: activeTab === t.id ? '2px solid #818CF8' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all .15s', textTransform: 'uppercase', letterSpacing: '.04em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Color / Background */}
      {activeTab === 'color' && (
        <div>
          {showTypography && (
            <>
              <SectionLabel>Text Color</SectionLabel>
              <ResponsiveField fieldKey="color" element={widget} clearFn={clear}>
                <ColorInput value={s.color || '#ffffff'} onChange={v => update({ color: v })} />
              </ResponsiveField>
            </>
          )}

          <SectionLabel>Background</SectionLabel>
          <ResponsiveField fieldKey="background" element={widget} clearFn={clear}>
            <BackgroundControl
              value={s.background || { type: 'none' }}
              onChange={v => update({ background: v })}
            />
          </ResponsiveField>

          <SectionLabel>Opacity</SectionLabel>
          <ResponsiveField fieldKey="opacity" element={widget} clearFn={clear}>
            <SliderInput
              value={Math.round((s.opacity ?? 1) * 100)}
              min={0} max={100} step={1} unit="%"
              label={`${Math.round((s.opacity ?? 1) * 100)}%`}
              onChange={v => update({ opacity: v / 100 })}
            />
          </ResponsiveField>

          {showTypography && (
            <>
              <SectionLabel>Typography</SectionLabel>
              <ResponsiveField fieldKey="font_size" element={widget} clearFn={clear}>
                <TypographyControl
                  settings={s}
                  onChange={patch => update(patch)}
                />
              </ResponsiveField>
            </>
          )}
        </div>
      )}

      {/* Spacing */}
      {activeTab === 'spacing' && (
        <div>
          <SectionLabel>Padding</SectionLabel>
          <ResponsiveField fieldKey="padding_top" element={widget} clearFn={clear}>
            <SpacingControl
              value={{ top: s.padding_top ?? 0, right: s.padding_right ?? 0, bottom: s.padding_bottom ?? 0, left: s.padding_left ?? 0 }}
              onChange={v => update({ padding_top: v.top, padding_right: v.right, padding_bottom: v.bottom, padding_left: v.left })}
            />
          </ResponsiveField>

          <SectionLabel>Margin</SectionLabel>
          <ResponsiveField fieldKey="margin_top" element={widget} clearFn={clear}>
            <SpacingControl
              value={{ top: s.margin_top ?? 0, right: s.margin_right ?? 0, bottom: s.margin_bottom ?? 0, left: s.margin_left ?? 0 }}
              onChange={v => update({ margin_top: v.top, margin_right: v.right, margin_bottom: v.bottom, margin_left: v.left })}
            />
          </ResponsiveField>

          <SectionLabel>Size</SectionLabel>
          <ControlRow label="Width">
            <ResponsiveField fieldKey="width" element={widget} clearFn={clear}>
              <NumberInput value={s.width ?? ''} min={0} max={2000} suffix="px" onChange={v => update({ width: v })} />
            </ResponsiveField>
          </ControlRow>
          <ControlRow label="Max Width">
            <ResponsiveField fieldKey="max_width" element={widget} clearFn={clear}>
              <NumberInput value={s.max_width ?? ''} min={0} max={2000} suffix="px" onChange={v => update({ max_width: v })} />
            </ResponsiveField>
          </ControlRow>
          <ControlRow label="Height">
            <ResponsiveField fieldKey="height" element={widget} clearFn={clear}>
              <NumberInput value={s.height ?? ''} min={0} max={2000} suffix="px" onChange={v => update({ height: v })} />
            </ResponsiveField>
          </ControlRow>
        </div>
      )}

      {/* Border */}
      {activeTab === 'border' && (
        <div>
          <SectionLabel>Border</SectionLabel>
          <ResponsiveField fieldKey="border_style" element={widget} clearFn={clear}>
            <BorderControl settings={s} onChange={patch => update(patch)} />
          </ResponsiveField>

          <SectionLabel>Border Radius</SectionLabel>
          <ResponsiveField fieldKey="border_radius" element={widget} clearFn={clear}>
            <SliderInput
              value={s.border_radius ?? 0} min={0} max={100} step={1} unit="px"
              label={`${s.border_radius ?? 0}px`}
              onChange={v => update({ border_radius: v })}
            />
          </ResponsiveField>
        </div>
      )}

      {/* Effects */}
      {activeTab === 'effects' && (
        <div>
          <SectionLabel>Box Shadow</SectionLabel>
          <ShadowControl
            value={s.box_shadow || ''}
            onChange={v => update({ box_shadow: v })}
          />

          <SectionLabel>CSS Filter</SectionLabel>
          <FilterControl
            value={s.css_filter || ''}
            onChange={v => update({ css_filter: v })}
          />

          <SectionLabel>Hover Effects</SectionLabel>
          <HoverControl settings={s} onChange={patch => update(patch)} />

          <SectionLabel>Z-Index &amp; Overflow</SectionLabel>
          <ControlRow label="Z-Index">
            <NumberInput value={s.z_index ?? 0} min={-10} max={999} onChange={v => update({ z_index: v })} />
          </ControlRow>
          <ControlRow label="Overflow">
            <SelectInput
              value={s.overflow || 'visible'}
              onChange={v => update({ overflow: v })}
              options={[
                { value: 'visible', label: 'Visible' },
                { value: 'hidden',  label: 'Hidden'  },
                { value: 'clip',    label: 'Clip'    },
              ]}
            />
          </ControlRow>

          <SectionLabel>Custom CSS</SectionLabel>
          <ControlRow label="CSS ID">
            <input
              type="text" value={s.css_id || ''}
              onChange={e => update({ css_id: e.target.value })}
              placeholder="my-element-id"
              style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '5px', color: '#fff', fontSize: '.78rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </ControlRow>
          <ControlRow label="CSS Classes">
            <input
              type="text" value={s.css_classes || ''}
              onChange={e => update({ css_classes: e.target.value })}
              placeholder="class-a class-b"
              style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '5px', color: '#fff', fontSize: '.78rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </ControlRow>
        </div>
      )}

      {/* Animation / Motion */}
      {activeTab === 'animation' && (
        <div>
          <SectionLabel>Entrance Animation</SectionLabel>
          <AnimationControl settings={s} onChange={patch => update(patch)} />
        </div>
      )}
    </div>
  );
}
