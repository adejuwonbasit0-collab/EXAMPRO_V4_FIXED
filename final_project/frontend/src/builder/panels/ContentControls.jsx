// builder/panels/ContentControls.jsx

import { useState }          from 'react';
import useBuilderStore       from '../store/useBuilderStore';
import { selectSelectedWidget } from '../store/selectors';
import { ControlRow, SectionLabel } from './RightPanel';

// ─── Shared input styles ──────────────────────────────────────────────────────
const iS = {  // inputStyle
  width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#fff',
  fontSize: '.78rem', outline: 'none', boxSizing: 'border-box',
};
const sS = { ...iS, cursor: 'pointer' };           // selectStyle
const tS = { ...iS, resize: 'vertical' };          // textareaStyle
const nS = { ...iS, textAlign: 'center' };         // numberStyle

// ─── Reusable sub-components ─────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: '36px', height: '20px', borderRadius: '10px', background: value ? '#818CF8' : 'rgba(255,255,255,.12)', position: 'relative', cursor: 'pointer', transition: 'background .15s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: value ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <ControlRow label={label}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="color" value={value?.startsWith('#') ? value : '#818CF8'}
          onChange={e => onChange(e.target.value)}
          style={{ width: '32px', height: '28px', border: 'none', borderRadius: '5px', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
        <input style={{ ...iS, flex: 1 }} value={value || ''} placeholder="var(--color-primary)"
          onChange={e => onChange(e.target.value)} />
      </div>
    </ControlRow>
  );
}

// Collapsible card for list items (accordion items, testimonials, etc.)
function ItemCard({ title, onDelete, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,.04)', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>{title}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.3)' }}>{open ? '▲' : '▼'}</span>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'rgba(239,68,68,.15)', border: 'none', color: '#EF4444', width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', fontSize: '.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>
      {open && <div style={{ padding: '10px' }}>{children}</div>}
    </div>
  );
}

function AddBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '8px', background: 'rgba(129,140,248,.1)', border: '1px dashed rgba(129,140,248,.3)', borderRadius: '7px', color: '#818CF8', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
      {label}
    </button>
  );
}

// Generates a short unique id for new list items
function uid(prefix = 'item') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ContentControls() {
  const widget       = useBuilderStore(selectSelectedWidget);
  const deviceMode   = useBuilderStore(s => s.deviceMode);
  const updateWidget = useBuilderStore(s => s.updateWidget);

  if (!widget) {
    return <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '.8rem', textAlign: 'center', padding: '20px' }}>No widget selected</div>;
  }

  const update = (patch) => updateWidget(widget.id, patch, deviceMode);
  const s      = widget.settings || {};

  // Helper: patch one item inside a list setting
  const patchItem = (key, idx, patch) => {
    const arr = [...(s[key] || [])];
    arr[idx] = { ...arr[idx], ...patch };
    update({ [key]: arr });
  };
  const removeItem = (key, idx) => update({ [key]: (s[key] || []).filter((_, i) => i !== idx) });
  const addItem    = (key, item) => update({ [key]: [...(s[key] || []), item] });

  switch (widget.type) {

    // ── Heading ────────────────────────────────────────────────────────────
    case 'heading':
      return (
        <div>
          <SectionLabel>Heading</SectionLabel>
          <ControlRow label="Text">
            <input style={iS} value={s.text || ''} onChange={e => update({ text: e.target.value })} />
          </ControlRow>
          <ControlRow label="HTML Tag">
            <select style={sS} value={s.html_tag || 'h2'} onChange={e => update({ html_tag: e.target.value })}>
              {['h1','h2','h3','h4','h5','h6'].map(t => <option key={t}>{t}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Link URL">
            <input style={iS} value={s.link_url || ''} placeholder="https://..." onChange={e => update({ link_url: e.target.value })} />
          </ControlRow>
          <ControlRow label="Link Target">
            <select style={sS} value={s.link_target || '_self'} onChange={e => update({ link_target: e.target.value })}>
              <option value="_self">Same tab</option>
              <option value="_blank">New tab</option>
            </select>
          </ControlRow>
        </div>
      );

    // ── Text ───────────────────────────────────────────────────────────────
    case 'text':
      return (
        <div>
          <SectionLabel>Text Block</SectionLabel>
          <ControlRow label="Content (HTML)">
            <textarea style={{ ...tS, minHeight: '120px', fontFamily: 'monospace', fontSize: '.72rem' }}
              value={s.content || ''} onChange={e => update({ content: e.target.value })} />
          </ControlRow>
          <p style={{ fontSize: '.67rem', color: 'rgba(255,255,255,.25)', margin: '4px 0 0' }}>
            Supports HTML tags: &lt;strong&gt; &lt;em&gt; &lt;a href=""&gt; &lt;br&gt;
          </p>
        </div>
      );

    // ── Image ──────────────────────────────────────────────────────────────
    case 'image':
      return (
        <div>
          <SectionLabel>Image</SectionLabel>
          {s.src && (
            <div style={{ height: '80px', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden', background: `url('${s.src}') center/cover` }} />
          )}
          <ControlRow label="Image URL">
            <input style={iS} value={s.src || ''} placeholder="https://..." onChange={e => update({ src: e.target.value })} />
          </ControlRow>
          <ControlRow label="Alt Text">
            <input style={iS} value={s.alt || ''} onChange={e => update({ alt: e.target.value })} />
          </ControlRow>
          <ControlRow label="Caption">
            <input style={iS} value={s.caption || ''} onChange={e => update({ caption: e.target.value })} />
          </ControlRow>
          <ControlRow label="Link URL">
            <input style={iS} value={s.link_url || ''} placeholder="https://..." onChange={e => update({ link_url: e.target.value })} />
          </ControlRow>
          <ControlRow label="Object Fit">
            <select style={sS} value={s.object_fit || 'cover'} onChange={e => update({ object_fit: e.target.value })}>
              {['cover','contain','fill','none','scale-down'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Alignment">
            <select style={sS} value={s.alignment || 'center'} onChange={e => update({ alignment: e.target.value })}>
              {['left','center','right'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Hover Effect">
            <select style={sS} value={s.hover_effect || 'none'} onChange={e => update({ hover_effect: e.target.value })}>
              {['none','zoom','fade','grayscale'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Lightbox">
            <Toggle value={!!s.lightbox} onChange={v => update({ lightbox: v })} />
          </ControlRow>
          <ControlRow label="Lazy Load">
            <Toggle value={s.lazy_load !== false} onChange={v => update({ lazy_load: v })} />
          </ControlRow>
        </div>
      );

    // ── Video ──────────────────────────────────────────────────────────────
    case 'video':
      return (
        <div>
          <SectionLabel>Video</SectionLabel>
          <ControlRow label="Source">
            <select style={sS} value={s.source_type || 'youtube'} onChange={e => update({ source_type: e.target.value })}>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="self_hosted">Self Hosted</option>
            </select>
          </ControlRow>
          {(s.source_type === 'youtube' || !s.source_type) && (
            <ControlRow label="YouTube URL">
              <input style={iS} value={s.youtube_url || ''} placeholder="https://youtube.com/watch?v=..." onChange={e => update({ youtube_url: e.target.value })} />
            </ControlRow>
          )}
          {s.source_type === 'vimeo' && (
            <ControlRow label="Vimeo URL">
              <input style={iS} value={s.vimeo_url || ''} placeholder="https://vimeo.com/..." onChange={e => update({ vimeo_url: e.target.value })} />
            </ControlRow>
          )}
          {s.source_type === 'self_hosted' && (
            <ControlRow label="Video URL">
              <input style={iS} value={s.self_hosted_url || ''} placeholder="https://..." onChange={e => update({ self_hosted_url: e.target.value })} />
            </ControlRow>
          )}
          <ControlRow label="Poster Image URL">
            <input style={iS} value={s.poster_url || ''} placeholder="https://..." onChange={e => update({ poster_url: e.target.value })} />
          </ControlRow>
          <ControlRow label="Aspect Ratio">
            <select style={sS} value={s.aspect_ratio || '16:9'} onChange={e => update({ aspect_ratio: e.target.value })}>
              {['16:9','4:3','1:1','9:16'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Caption">
            <input style={iS} value={s.caption || ''} onChange={e => update({ caption: e.target.value })} />
          </ControlRow>
          <ControlRow label="Autoplay">  <Toggle value={!!s.autoplay}          onChange={v => update({ autoplay: v })} /></ControlRow>
          <ControlRow label="Loop">      <Toggle value={!!s.loop}              onChange={v => update({ loop: v })} /></ControlRow>
          <ControlRow label="Muted">     <Toggle value={!!s.muted}             onChange={v => update({ muted: v })} /></ControlRow>
          <ControlRow label="Controls">  <Toggle value={s.controls !== false}  onChange={v => update({ controls: v })} /></ControlRow>
        </div>
      );

    // ── Button ─────────────────────────────────────────────────────────────
    case 'button':
      return (
        <div>
          <SectionLabel>Button</SectionLabel>
          <ControlRow label="Label">
            <input style={iS} value={s.text || ''} onChange={e => update({ text: e.target.value })} />
          </ControlRow>
          <ControlRow label="Link URL">
            <input style={iS} value={s.link_url || ''} placeholder="https://..." onChange={e => update({ link_url: e.target.value })} />
          </ControlRow>
          <ControlRow label="Open In">
            <select style={sS} value={s.link_target || '_self'} onChange={e => update({ link_target: e.target.value })}>
              <option value="_self">Same tab</option>
              <option value="_blank">New tab</option>
            </select>
          </ControlRow>
          <ControlRow label="Style">
            <select style={sS} value={s.button_style || 'filled'} onChange={e => update({ button_style: e.target.value })}>
              {['filled','outline','ghost','gradient','link'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Alignment">
            <select style={sS} value={s.alignment || 'left'} onChange={e => update({ alignment: e.target.value })}>
              {['left','center','right'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Width">
            <select style={sS} value={s.width || 'auto'} onChange={e => update({ width: e.target.value })}>
              <option value="auto">Auto</option>
              <option value="full">Full Width</option>
            </select>
          </ControlRow>
          <ControlRow label="Icon (fa-class)">
            <input style={iS} value={s.icon_class || ''} placeholder="fa-rocket" onChange={e => update({ icon_class: e.target.value })} />
          </ControlRow>
          <ControlRow label="Icon Position">
            <select style={sS} value={s.icon_position || 'left'} onChange={e => update({ icon_position: e.target.value })}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </ControlRow>
        </div>
      );

    // ── Divider ────────────────────────────────────────────────────────────
    case 'divider':
      return (
        <div>
          <SectionLabel>Divider</SectionLabel>
          <ControlRow label="Line Style">
            <select style={sS} value={s.style || 'solid'} onChange={e => update({ style: e.target.value })}>
              {['solid','dashed','dotted','double','none'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Thickness (px)">
            <input style={nS} type="number" min={1} max={20} value={s.weight || 1} onChange={e => update({ weight: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Width">
            <input style={iS} value={s.width || '100%'} placeholder="100%" onChange={e => update({ width: e.target.value })} />
          </ControlRow>
          <ColorRow label="Color" value={s.color || 'rgba(255,255,255,0.12)'} onChange={v => update({ color: v })} />
          <ControlRow label="Icon (fa-class, optional)">
            <input style={iS} value={s.icon_class || ''} placeholder="fa-star" onChange={e => update({ icon_class: e.target.value })} />
          </ControlRow>
          <ControlRow label="Gap Top (px)">
            <input style={nS} type="number" min={0} value={s.gap_top ?? 16} onChange={e => update({ gap_top: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Gap Bottom (px)">
            <input style={nS} type="number" min={0} value={s.gap_bottom ?? 16} onChange={e => update({ gap_bottom: Number(e.target.value) })} />
          </ControlRow>
        </div>
      );

    // ── Spacer ─────────────────────────────────────────────────────────────
    case 'spacer':
      return (
        <div>
          <SectionLabel>Spacer</SectionLabel>
          <ControlRow label="Desktop Height (px)">
            <input style={nS} type="number" min={0} max={500} value={s.height ?? 60}         onChange={e => update({ height:         Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Tablet Height (px)">
            <input style={nS} type="number" min={0} max={500} value={s.height_tablet ?? 40}  onChange={e => update({ height_tablet:  Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Mobile Height (px)">
            <input style={nS} type="number" min={0} max={500} value={s.height_mobile ?? 24}  onChange={e => update({ height_mobile:  Number(e.target.value) })} />
          </ControlRow>
        </div>
      );

    // ── Icon ───────────────────────────────────────────────────────────────
    case 'icon':
      return (
        <div>
          <SectionLabel>Icon</SectionLabel>
          <ControlRow label="Icon (fa-class)">
            <input style={iS} value={s.icon_class || ''} placeholder="fa-graduation-cap" onChange={e => update({ icon_class: e.target.value })} />
          </ControlRow>
          <ControlRow label="Size (px)">
            <input style={nS} type="number" min={12} max={200} value={s.size || 48} onChange={e => update({ size: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Alignment">
            <select style={sS} value={s.alignment || 'left'} onChange={e => update({ alignment: e.target.value })}>
              {['left','center','right'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Background Shape">
            <select style={sS} value={s.bg_shape || 'circle'} onChange={e => update({ bg_shape: e.target.value })}>
              {['none','circle','rounded','square'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Background Opacity">
            <input style={nS} type="number" min={0} max={1} step={0.05} value={s.bg_opacity ?? 0.1} onChange={e => update({ bg_opacity: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Link URL">
            <input style={iS} value={s.link_url || ''} placeholder="https://..." onChange={e => update({ link_url: e.target.value })} />
          </ControlRow>
        </div>
      );

    // ── Gallery ────────────────────────────────────────────────────────────
    case 'gallery':
      return (
        <div>
          <SectionLabel>Gallery</SectionLabel>
          <ControlRow label="Layout">
            <select style={sS} value={s.layout || 'grid'} onChange={e => update({ layout: e.target.value })}>
              {['grid','masonry'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Columns (desktop)">
            <select style={sS} value={s.columns || 3} onChange={e => update({ columns: Number(e.target.value) })}>
              {[1,2,3,4,5,6].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Image Ratio">
            <select style={sS} value={s.image_ratio || '1:1'} onChange={e => update({ image_ratio: e.target.value })}>
              {['1:1','4:3','16:9','3:4'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Hover Effect">
            <select style={sS} value={s.hover_effect || 'zoom'} onChange={e => update({ hover_effect: e.target.value })}>
              {['none','zoom','grayscale','fade'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Lightbox">
            <Toggle value={!!s.lightbox} onChange={v => update({ lightbox: v })} />
          </ControlRow>

          <SectionLabel>Images</SectionLabel>
          {(s.images || []).map((img, i) => (
            <ItemCard key={img.id || i} title={img.alt || `Image ${i + 1}`} onDelete={() => removeItem('images', i)}>
              <ControlRow label="URL">
                <input style={iS} value={img.src || ''} placeholder="https://..." onChange={e => patchItem('images', i, { src: e.target.value })} />
              </ControlRow>
              <ControlRow label="Alt Text">
                <input style={iS} value={img.alt || ''} onChange={e => patchItem('images', i, { alt: e.target.value })} />
              </ControlRow>
              <ControlRow label="Caption">
                <input style={iS} value={img.caption || ''} onChange={e => patchItem('images', i, { caption: e.target.value })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Image" onClick={() => addItem('images', { id: uid('img'), src: '', alt: '', caption: '' })} />
        </div>
      );

    // ── Carousel ───────────────────────────────────────────────────────────
    case 'carousel':
      return (
        <div>
          <SectionLabel>Carousel</SectionLabel>
          <ControlRow label="Aspect Ratio">
            <select style={sS} value={s.aspect_ratio || '16:9'} onChange={e => update({ aspect_ratio: e.target.value })}>
              {['16:9','4:3','1:1','9:16'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Autoplay">        <Toggle value={!!s.autoplay}           onChange={v => update({ autoplay: v })} /></ControlRow>
          <ControlRow label="Autoplay Speed (ms)">
            <input style={nS} type="number" min={1000} max={15000} step={500} value={s.autoplay_speed || 5000} onChange={e => update({ autoplay_speed: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Pause on Hover"> <Toggle value={!!s.pause_on_hover}      onChange={v => update({ pause_on_hover: v })} /></ControlRow>
          <ControlRow label="Loop">           <Toggle value={!!s.loop}               onChange={v => update({ loop: v })} /></ControlRow>
          <ControlRow label="Show Arrows">    <Toggle value={s.arrows !== false}      onChange={v => update({ arrows: v })} /></ControlRow>
          <ControlRow label="Show Dots">      <Toggle value={s.dots !== false}        onChange={v => update({ dots: v })} /></ControlRow>

          <SectionLabel>Slides</SectionLabel>
          {(s.slides || []).map((slide, i) => (
            <ItemCard key={slide.id || i} title={slide.heading || `Slide ${i + 1}`} onDelete={() => removeItem('slides', i)}>
              <ControlRow label="Image URL">
                <input style={iS} value={slide.image_src || ''} placeholder="https://..." onChange={e => patchItem('slides', i, { image_src: e.target.value })} />
              </ControlRow>
              <ControlRow label="Heading">
                <input style={iS} value={slide.heading || ''} onChange={e => patchItem('slides', i, { heading: e.target.value })} />
              </ControlRow>
              <ControlRow label="Subtext">
                <input style={iS} value={slide.subtext || ''} onChange={e => patchItem('slides', i, { subtext: e.target.value })} />
              </ControlRow>
              <ControlRow label="Button Text">
                <input style={iS} value={slide.button_text || ''} onChange={e => patchItem('slides', i, { button_text: e.target.value })} />
              </ControlRow>
              <ControlRow label="Button URL">
                <input style={iS} value={slide.button_url || ''} placeholder="https://..." onChange={e => patchItem('slides', i, { button_url: e.target.value })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Slide" onClick={() => addItem('slides', { id: uid('slide'), image_src: '', heading: 'New Slide', subtext: '', button_text: '', button_url: '' })} />
        </div>
      );

    // ── Tabs ───────────────────────────────────────────────────────────────
    case 'tabs':
      return (
        <div>
          <SectionLabel>Tabs</SectionLabel>
          <ControlRow label="Tab Style">
            <select style={sS} value={s.tab_style || 'underline'} onChange={e => update({ tab_style: e.target.value })}>
              {['underline','boxed','pills'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Tab Alignment">
            <select style={sS} value={s.tab_alignment || 'left'} onChange={e => update({ tab_alignment: e.target.value })}>
              {['left','center','right'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Content Padding (px)">
            <input style={nS} type="number" min={0} value={s.content_padding ?? 24} onChange={e => update({ content_padding: Number(e.target.value) })} />
          </ControlRow>

          <SectionLabel>Tab Items</SectionLabel>
          {(s.tabs || []).map((tab, i) => (
            <ItemCard key={tab.id || i} title={tab.label || `Tab ${i + 1}`} onDelete={() => removeItem('tabs', i)}>
              <ControlRow label="Label">
                <input style={iS} value={tab.label || ''} onChange={e => patchItem('tabs', i, { label: e.target.value })} />
              </ControlRow>
              <ControlRow label="Icon (fa-class)">
                <input style={iS} value={tab.icon || ''} placeholder="fa-info-circle" onChange={e => patchItem('tabs', i, { icon: e.target.value })} />
              </ControlRow>
              <ControlRow label="Content (HTML)">
                <textarea style={{ ...tS, minHeight: '80px', fontFamily: 'monospace', fontSize: '.7rem' }}
                  value={tab.content || ''} onChange={e => patchItem('tabs', i, { content: e.target.value })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Tab" onClick={() => addItem('tabs', { id: uid('tab'), label: 'New Tab', icon: '', content: '<p>Tab content here.</p>' })} />
        </div>
      );

    // ── Accordion ──────────────────────────────────────────────────────────
    case 'accordion':
      return (
        <div>
          <SectionLabel>Accordion</SectionLabel>
          <ControlRow label="Multiple Open">
            <Toggle value={!!s.allow_multiple} onChange={v => update({ allow_multiple: v })} />
          </ControlRow>
          <ControlRow label="Icon Position">
            <select style={sS} value={s.icon_position || 'right'} onChange={e => update({ icon_position: e.target.value })}>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </ControlRow>
          <ControlRow label="Item Style">
            <select style={sS} value={s.item_style || 'bordered'} onChange={e => update({ item_style: e.target.value })}>
              {['bordered','filled','minimal'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>

          <SectionLabel>Items</SectionLabel>
          {(s.items || []).map((item, i) => (
            <ItemCard key={item.id || i} title={item.title || `Item ${i + 1}`} onDelete={() => removeItem('items', i)}>
              <ControlRow label="Title">
                <input style={iS} value={item.title || ''} onChange={e => patchItem('items', i, { title: e.target.value })} />
              </ControlRow>
              <ControlRow label="Content (HTML)">
                <textarea style={{ ...tS, minHeight: '70px', fontFamily: 'monospace', fontSize: '.7rem' }}
                  value={item.content || ''} onChange={e => patchItem('items', i, { content: e.target.value })} />
              </ControlRow>
              <ControlRow label="Open by Default">
                <Toggle value={!!item.open} onChange={v => patchItem('items', i, { open: v })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Item" onClick={() => addItem('items', { id: uid('acc'), title: 'New Question', content: '<p>Answer here.</p>', open: false })} />
        </div>
      );

    // ── Toggle ─────────────────────────────────────────────────────────────
    case 'toggle':
      return (
        <div>
          <SectionLabel>Toggle</SectionLabel>
          <ControlRow label="Item Style">
            <select style={sS} value={s.item_style || 'minimal'} onChange={e => update({ item_style: e.target.value })}>
              {['minimal','card'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Closed Icon (fa-class)">
            <input style={iS} value={s.icon_closed || 'fa-plus'} onChange={e => update({ icon_closed: e.target.value })} />
          </ControlRow>
          <ControlRow label="Open Icon (fa-class)">
            <input style={iS} value={s.icon_open || 'fa-minus'} onChange={e => update({ icon_open: e.target.value })} />
          </ControlRow>

          <SectionLabel>Items</SectionLabel>
          {(s.items || []).map((item, i) => (
            <ItemCard key={item.id || i} title={item.title || `Item ${i + 1}`} onDelete={() => removeItem('items', i)}>
              <ControlRow label="Title">
                <input style={iS} value={item.title || ''} onChange={e => patchItem('items', i, { title: e.target.value })} />
              </ControlRow>
              <ControlRow label="Content (HTML)">
                <textarea style={{ ...tS, minHeight: '70px', fontFamily: 'monospace', fontSize: '.7rem' }}
                  value={item.content || ''} onChange={e => patchItem('items', i, { content: e.target.value })} />
              </ControlRow>
              <ControlRow label="Open by Default">
                <Toggle value={!!item.open} onChange={v => patchItem('items', i, { open: v })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Item" onClick={() => addItem('items', { id: uid('tog'), title: 'New Item', content: '<p>Content here.</p>', open: false })} />
        </div>
      );

    // ── Testimonial ────────────────────────────────────────────────────────
    case 'testimonial':
      return (
        <div>
          <SectionLabel>Testimonials</SectionLabel>
          <ControlRow label="Layout">
            <select style={sS} value={s.layout || 'grid'} onChange={e => update({ layout: e.target.value })}>
              {['grid','carousel'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          {s.layout !== 'carousel' && (
            <ControlRow label="Columns">
              <select style={sS} value={s.columns || 3} onChange={e => update({ columns: Number(e.target.value) })}>
                {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </ControlRow>
          )}
          <ControlRow label="Card Style">
            <select style={sS} value={s.card_style || 'bordered'} onChange={e => update({ card_style: e.target.value })}>
              {['bordered','filled','shadow','minimal'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Text Align">
            <select style={sS} value={s.text_align || 'left'} onChange={e => update({ text_align: e.target.value })}>
              {['left','center','right'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Show Ratings"><Toggle value={s.show_rating  !== false} onChange={v => update({ show_rating: v })} /></ControlRow>
          <ControlRow label="Show Avatars"><Toggle value={s.show_avatar  !== false} onChange={v => update({ show_avatar: v })} /></ControlRow>
          <ControlRow label="Quote Icon">  <Toggle value={s.quote_icon   !== false} onChange={v => update({ quote_icon:  v })} /></ControlRow>

          <SectionLabel>Items</SectionLabel>
          {(s.items || []).map((item, i) => (
            <ItemCard key={item.id || i} title={item.name || `Testimonial ${i + 1}`} onDelete={() => removeItem('items', i)}>
              <ControlRow label="Quote">
                <textarea style={{ ...tS, minHeight: '60px' }} value={item.quote || ''} onChange={e => patchItem('items', i, { quote: e.target.value })} />
              </ControlRow>
              <ControlRow label="Name">
                <input style={iS} value={item.name || ''} onChange={e => patchItem('items', i, { name: e.target.value })} />
              </ControlRow>
              <ControlRow label="Role">
                <input style={iS} value={item.role || ''} onChange={e => patchItem('items', i, { role: e.target.value })} />
              </ControlRow>
              <ControlRow label="Avatar URL">
                <input style={iS} value={item.avatar || ''} placeholder="https://..." onChange={e => patchItem('items', i, { avatar: e.target.value })} />
              </ControlRow>
              <ControlRow label="Rating (1–5)">
                <input style={nS} type="number" min={1} max={5} value={item.rating || 5} onChange={e => patchItem('items', i, { rating: Number(e.target.value) })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Testimonial" onClick={() => addItem('items', { id: uid('tst'), quote: 'Add testimonial text.', name: 'Name', role: 'Role', avatar: '', rating: 5 })} />
        </div>
      );

    // ── Pricing Table ──────────────────────────────────────────────────────
    case 'pricing_table':
      return (
        <div>
          <SectionLabel>Pricing Table</SectionLabel>
          <ControlRow label="Columns">
            <select style={sS} value={s.columns || 2} onChange={e => update({ columns: Number(e.target.value) })}>
              {[1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </ControlRow>

          <SectionLabel>Plans</SectionLabel>
          {(s.plans || []).map((plan, i) => (
            <ItemCard key={plan.id || i} title={plan.name || `Plan ${i + 1}`} onDelete={() => removeItem('plans', i)}>
              <ControlRow label="Plan Name">   <input style={iS} value={plan.name || ''} onChange={e => patchItem('plans', i, { name: e.target.value })} /></ControlRow>
              <ControlRow label="Price">        <input style={iS} value={plan.price || ''} placeholder="₦2,500" onChange={e => patchItem('plans', i, { price: e.target.value })} /></ControlRow>
              <ControlRow label="Period">       <input style={iS} value={plan.period || ''} placeholder="/month" onChange={e => patchItem('plans', i, { period: e.target.value })} /></ControlRow>
              <ControlRow label="Description"> <input style={iS} value={plan.description || ''} onChange={e => patchItem('plans', i, { description: e.target.value })} /></ControlRow>
              <ControlRow label="Button Text"> <input style={iS} value={plan.button_text || ''} onChange={e => patchItem('plans', i, { button_text: e.target.value })} /></ControlRow>
              <ControlRow label="Button URL">  <input style={iS} value={plan.button_url || ''} placeholder="https://..." onChange={e => patchItem('plans', i, { button_url: e.target.value })} /></ControlRow>
              <ControlRow label="Badge Text">  <input style={iS} value={plan.badge || ''} placeholder="Most Popular" onChange={e => patchItem('plans', i, { badge: e.target.value })} /></ControlRow>
              <ControlRow label="Highlighted"> <Toggle value={!!plan.highlighted} onChange={v => patchItem('plans', i, { highlighted: v })} /></ControlRow>
              <SectionLabel>Features</SectionLabel>
              {(plan.features || []).map((f, fi) => (
                <div key={fi} style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '5px' }}>
                  <input style={{ ...iS, flex: 1 }} value={f.text} onChange={e => {
                    const plans = JSON.parse(JSON.stringify(s.plans));
                    plans[i].features[fi].text = e.target.value;
                    update({ plans });
                  }} />
                  <Toggle value={!!f.included} onChange={v => {
                    const plans = JSON.parse(JSON.stringify(s.plans));
                    plans[i].features[fi].included = v;
                    update({ plans });
                  }} />
                  <button onClick={() => {
                    const plans = JSON.parse(JSON.stringify(s.plans));
                    plans[i].features.splice(fi, 1);
                    update({ plans });
                  }} style={{ background: 'rgba(239,68,68,.15)', border: 'none', color: '#EF4444', width: '22px', height: '22px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <AddBtn label="+ Feature" onClick={() => {
                const plans = JSON.parse(JSON.stringify(s.plans));
                plans[i].features.push({ text: 'Feature', included: true });
                update({ plans });
              }} />
            </ItemCard>
          ))}
          <AddBtn label="+ Add Plan" onClick={() => addItem('plans', { id: uid('plan'), name: 'Plan', price: '₦0', period: '/mo', description: '', features: [], button_text: 'Get Started', button_url: '#', highlighted: false, badge: '' })} />
        </div>
      );

    // ── Progress Bar ───────────────────────────────────────────────────────
    case 'progress_bar':
      return (
        <div>
          <SectionLabel>Progress Bars</SectionLabel>
          <ControlRow label="Bar Style">
            <select style={sS} value={s.bar_style || 'gradient'} onChange={e => update({ bar_style: e.target.value })}>
              {['solid','striped','gradient'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Bar Height (px)">
            <input style={nS} type="number" min={4} max={40} value={s.bar_height || 12} onChange={e => update({ bar_height: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Show Percentage">
            <Toggle value={s.show_percentage !== false} onChange={v => update({ show_percentage: v })} />
          </ControlRow>

          <SectionLabel>Items</SectionLabel>
          {(s.items || []).map((item, i) => (
            <ItemCard key={item.id || i} title={item.label || `Bar ${i + 1}`} onDelete={() => removeItem('items', i)}>
              <ControlRow label="Label">
                <input style={iS} value={item.label || ''} onChange={e => patchItem('items', i, { label: e.target.value })} />
              </ControlRow>
              <ControlRow label={`Percentage — ${item.percentage || 0}%`}>
                <input type="range" min={0} max={100} value={item.percentage || 0} onChange={e => patchItem('items', i, { percentage: Number(e.target.value) })} style={{ width: '100%', accentColor: '#818CF8' }} />
              </ControlRow>
              <ColorRow label="Color" value={item.color || '#7C3AED'} onChange={v => patchItem('items', i, { color: v })} />
            </ItemCard>
          ))}
          <AddBtn label="+ Add Bar" onClick={() => addItem('items', { id: uid('pb'), label: 'Skill', percentage: 75, color: 'var(--color-primary)' })} />
        </div>
      );

    // ── Countdown ──────────────────────────────────────────────────────────
    case 'countdown':
      return (
        <div>
          <SectionLabel>Countdown</SectionLabel>
          <ControlRow label="Type">
            <select style={sS} value={s.countdown_type || 'date'} onChange={e => update({ countdown_type: e.target.value })}>
              <option value="date">To a Specific Date</option>
            </select>
          </ControlRow>
          <ControlRow label="End Date & Time">
            <input style={iS} type="datetime-local" value={s.due_date ? s.due_date.slice(0, 16) : ''} onChange={e => update({ due_date: e.target.value })} />
          </ControlRow>
          <ControlRow label="Show Days">   <Toggle value={s.show_days    !== false} onChange={v => update({ show_days: v })} /></ControlRow>
          <ControlRow label="Show Hours">  <Toggle value={s.show_hours   !== false} onChange={v => update({ show_hours: v })} /></ControlRow>
          <ControlRow label="Show Minutes"><Toggle value={s.show_minutes !== false} onChange={v => update({ show_minutes: v })} /></ControlRow>
          <ControlRow label="Show Seconds"><Toggle value={s.show_seconds !== false} onChange={v => update({ show_seconds: v })} /></ControlRow>
          <ControlRow label="Days Label">    <input style={iS} value={s.label_days    || 'Days'}  onChange={e => update({ label_days:    e.target.value })} /></ControlRow>
          <ControlRow label="Hours Label">   <input style={iS} value={s.label_hours   || 'Hours'} onChange={e => update({ label_hours:   e.target.value })} /></ControlRow>
          <ControlRow label="Minutes Label"> <input style={iS} value={s.label_minutes || 'Mins'}  onChange={e => update({ label_minutes: e.target.value })} /></ControlRow>
          <ControlRow label="Seconds Label"> <input style={iS} value={s.label_seconds || 'Secs'}  onChange={e => update({ label_seconds: e.target.value })} /></ControlRow>
          <ControlRow label="On Expire">
            <select style={sS} value={s.on_expire || 'message'} onChange={e => update({ on_expire: e.target.value })}>
              <option value="message">Show Message</option>
              <option value="hide">Hide Widget</option>
            </select>
          </ControlRow>
          {(s.on_expire === 'message' || !s.on_expire) && (
            <ControlRow label="Expiry Message">
              <input style={iS} value={s.expire_message || ''} onChange={e => update({ expire_message: e.target.value })} />
            </ControlRow>
          )}
        </div>
      );

    // ── Map ────────────────────────────────────────────────────────────────
    case 'map':
      return (
        <div>
          <SectionLabel>Google Map</SectionLabel>
          <ControlRow label="Address">
            <input style={iS} value={s.address || ''} placeholder="123 Street, Lagos" onChange={e => update({ address: e.target.value })} />
          </ControlRow>
          <ControlRow label="Map Height (px)">
            <input style={nS} type="number" min={100} max={800} value={s.height || 400} onChange={e => update({ height: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Zoom (1–20)">
            <input style={nS} type="number" min={1} max={20} value={s.zoom || 15} onChange={e => update({ zoom: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Map Type">
            <select style={sS} value={s.map_type || 'roadmap'} onChange={e => update({ map_type: e.target.value })}>
              {['roadmap','satellite','hybrid','terrain'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Marker Title">
            <input style={iS} value={s.marker_title || ''} onChange={e => update({ marker_title: e.target.value })} />
          </ControlRow>
          <ControlRow label="Show Marker">   <Toggle value={s.show_marker   !== false} onChange={v => update({ show_marker: v })} /></ControlRow>
          <ControlRow label="Allow Scroll">  <Toggle value={!!s.allow_scroll}           onChange={v => update({ allow_scroll: v })} /></ControlRow>
        </div>
      );

    // ── Social Icons ───────────────────────────────────────────────────────
    case 'social_icons': {
      const NETWORKS = ['facebook','instagram','twitter','youtube','whatsapp','linkedin','tiktok','telegram','github','pinterest','snapchat'];
      return (
        <div>
          <SectionLabel>Social Icons</SectionLabel>
          <ControlRow label="Icon Style">
            <select style={sS} value={s.icon_style || 'rounded'} onChange={e => update({ icon_style: e.target.value })}>
              {['default','rounded','circle','square','filled_circle'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Size (px)">
            <input style={nS} type="number" min={12} max={64} value={s.icon_size || 24} onChange={e => update({ icon_size: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Gap (px)">
            <input style={nS} type="number" min={4} max={64} value={s.gap || 16} onChange={e => update({ gap: Number(e.target.value) })} />
          </ControlRow>
          <ControlRow label="Alignment">
            <select style={sS} value={s.alignment || 'left'} onChange={e => update({ alignment: e.target.value })}>
              {['left','center','right'].map(v => <option key={v}>{v}</option>)}
            </select>
          </ControlRow>
          <ControlRow label="Color Mode">
            <select style={sS} value={s.color_type || 'brand'} onChange={e => update({ color_type: e.target.value })}>
              <option value="brand">Brand Colors</option>
              <option value="custom">Custom Color</option>
            </select>
          </ControlRow>
          {s.color_type === 'custom' && (
            <ColorRow label="Custom Color" value={s.custom_color || '#ffffff'} onChange={v => update({ custom_color: v })} />
          )}
          <ControlRow label="Open in New Tab">
            <Toggle value={s.open_in_new_tab !== false} onChange={v => update({ open_in_new_tab: v })} />
          </ControlRow>

          <SectionLabel>Icons</SectionLabel>
          {(s.items || []).map((item, i) => (
            <ItemCard key={item.id || i} title={item.label || item.network} onDelete={() => removeItem('items', i)}>
              <ControlRow label="Network">
                <select style={sS} value={item.network || 'facebook'} onChange={e => patchItem('items', i, { network: e.target.value })}>
                  {NETWORKS.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
              </ControlRow>
              <ControlRow label="Profile URL">
                <input style={iS} value={item.url || ''} placeholder="https://..." onChange={e => patchItem('items', i, { url: e.target.value })} />
              </ControlRow>
              <ControlRow label="Tooltip Label">
                <input style={iS} value={item.label || ''} onChange={e => patchItem('items', i, { label: e.target.value })} />
              </ControlRow>
            </ItemCard>
          ))}
          <AddBtn label="+ Add Icon" onClick={() => addItem('items', { id: uid('si'), network: 'facebook', url: '', label: 'Facebook' })} />
        </div>
      );
    }

    // ── Default fallback ───────────────────────────────────────────────────
    default:
      return (
        <div>
          <SectionLabel>Settings</SectionLabel>
          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.3)', padding: '8px', background: 'rgba(255,255,255,.03)', borderRadius: '6px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
            {JSON.stringify(s, null, 2)}
          </div>
        </div>
      );
  }
}
