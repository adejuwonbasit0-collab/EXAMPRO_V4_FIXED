// builder/widgets/registry.js

import HeadingWidget     from './HeadingWidget';
import TextWidget        from './TextWidget';
import ImageWidget       from './ImageWidget';
import VideoWidget       from './VideoWidget';
import ButtonWidget      from './ButtonWidget';
import DividerWidget     from './DividerWidget';
import SpacerWidget      from './SpacerWidget';
import IconWidget        from './IconWidget';
import GalleryWidget     from './GalleryWidget';
import CarouselWidget    from './CarouselWidget';
import TabsWidget        from './TabsWidget';
import AccordionWidget   from './AccordionWidget';
import ToggleWidget      from './ToggleWidget';
import TestimonialWidget from './TestimonialWidget';
import PricingWidget     from './PricingWidget';
import ProgressBarWidget from './ProgressBarWidget';
import CountdownWidget   from './CountdownWidget';
import MapWidget         from './MapWidget';
import SocialIconsWidget from './SocialIconsWidget';

// ─────────────────────────────────────────────────────────────────────────────
// Widget definitions
// Order determines display order in the Left Panel library.
// ─────────────────────────────────────────────────────────────────────────────
const WIDGET_DEFS = [

  // ── BASIC ─────────────────────────────────────────────────────────────────
  {
    type: 'heading', label: 'Heading', icon: '📝', category: 'Basic',
    component: HeadingWidget,
    defaultSettings: {
      text: 'Your Heading Here', html_tag: 'h2',
      link_url: '', link_target: '_self',
      font_size: 36, font_weight: '700',
      color: 'var(--color-primary)', text_align: 'left',
      line_height: 1.2, letter_spacing: 0, margin_bottom: 16,
    },
  },

  {
    type: 'text', label: 'Text', icon: '📄', category: 'Basic',
    component: TextWidget,
    defaultSettings: {
      content: '<p>Add your paragraph text here.</p>',
      font_size: 16, font_weight: '400', line_height: 1.75,
      color: 'rgba(255,255,255,0.75)', text_align: 'left', margin_bottom: 16,
    },
  },

  {
    type: 'image', label: 'Image', icon: '🖼', category: 'Basic',
    component: ImageWidget,
    defaultSettings: {
      src: '', alt: '', caption: '', link_url: '', link_target: '_self',
      width: '100%', max_width: '100%', height: 'auto',
      object_fit: 'cover', alignment: 'center',
      lightbox: false, lazy_load: true,
      border_radius: 12, box_shadow: '', hover_effect: 'none',
    },
  },

  {
    type: 'video', label: 'Video', icon: '🎬', category: 'Basic',
    component: VideoWidget,
    defaultSettings: {
      source_type: 'youtube', youtube_url: '', vimeo_url: '', self_hosted_url: '',
      poster_url: '', autoplay: false, muted: false, loop: false, controls: true,
      aspect_ratio: '16:9', border_radius: 12, caption: '',
    },
  },

  {
    type: 'button', label: 'Button', icon: '🔘', category: 'Basic',
    component: ButtonWidget,
    defaultSettings: {
      text: 'Click Here', link_url: '#', link_target: '_self',
      button_style: 'filled', icon_class: '', icon_position: 'left', alignment: 'left',
      font_size: 15, font_weight: '700', width: 'auto',
      padding_top: 12, padding_right: 28, padding_bottom: 12, padding_left: 28,
      border_radius: 10,
      bg_color: 'var(--color-primary)', text_color: '#ffffff',
      border_width: 0, border_color: 'transparent',
      box_shadow: '0 4px 14px rgba(0,0,0,0.25)',
    },
  },

  {
    type: 'divider', label: 'Divider', icon: '➖', category: 'Basic',
    component: DividerWidget,
    defaultSettings: {
      style: 'solid', weight: 1, width: '100%',
      color: 'rgba(255,255,255,0.12)',
      gap_top: 16, gap_bottom: 16, alignment: 'center',
      icon_class: '',
    },
  },

  {
    type: 'spacer', label: 'Spacer', icon: '↕', category: 'Basic',
    component: SpacerWidget,
    defaultSettings: { height: 60, height_tablet: 40, height_mobile: 24 },
  },

  {
    type: 'icon', label: 'Icon', icon: '⭐', category: 'Basic',
    component: IconWidget,
    defaultSettings: {
      icon_class: 'fa-star', size: 48,
      color: 'var(--color-primary)',
      bg_color: 'var(--color-primary)', bg_opacity: 0.1, bg_shape: 'circle',
      padding: 16, alignment: 'left', link_url: '', link_target: '_self',
    },
  },

  // ── MEDIA ─────────────────────────────────────────────────────────────────
  {
    type: 'gallery', label: 'Gallery', icon: '🗃', category: 'Media',
    component: GalleryWidget,
    defaultSettings: {
      images: [],
      layout: 'grid', columns: 3, column_gap: 12, row_gap: 12,
      image_ratio: '1:1', border_radius: 8,
      lightbox: true, hover_effect: 'zoom',
    },
  },

  {
    type: 'carousel', label: 'Carousel', icon: '🎠', category: 'Media',
    component: CarouselWidget,
    defaultSettings: {
      slides: [
        { id: 'slide_1', image_src: '', heading: 'Slide Title',
          subtext: 'Add a brief description.', button_text: '', button_url: '' },
      ],
      autoplay: true, autoplay_speed: 5000, pause_on_hover: true,
      loop: true, arrows: true, dots: true, aspect_ratio: '16:9',
    },
  },

  // ── LAYOUT ────────────────────────────────────────────────────────────────
  {
    type: 'tabs', label: 'Tabs', icon: '🗂', category: 'Layout',
    component: TabsWidget,
    defaultSettings: {
      tabs: [
        { id: 'tab_1', label: 'Overview',   icon: '', content: '<p>First tab content here.</p>'  },
        { id: 'tab_2', label: 'Details',    icon: '', content: '<p>Second tab content here.</p>' },
        { id: 'tab_3', label: 'Resources',  icon: '', content: '<p>Third tab content here.</p>'  },
      ],
      active_tab: 'tab_1', tab_style: 'underline', tab_alignment: 'left',
      border_radius: 8, content_padding: 24,
    },
  },

  {
    type: 'accordion', label: 'Accordion', icon: '🪗', category: 'Layout',
    component: AccordionWidget,
    defaultSettings: {
      items: [
        { id: 'acc_1', title: 'How do I enroll?',
          content: '<p>Click <strong>Get Started</strong> to create your account.</p>', open: true  },
        { id: 'acc_2', title: 'What payment methods are accepted?',
          content: '<p>We accept card payments and bank transfers.</p>', open: false },
        { id: 'acc_3', title: 'Can I download course materials?',
          content: '<p>Yes, PDFs and course resources are fully downloadable.</p>', open: false },
      ],
      allow_multiple: false, icon_position: 'right', item_style: 'bordered',
      border_radius: 8, item_gap: 8, active_color: 'var(--color-primary)',
    },
  },

  {
    type: 'toggle', label: 'Toggle', icon: '🔀', category: 'Layout',
    component: ToggleWidget,
    defaultSettings: {
      items: [
        { id: 'tog_1', title: 'Is this platform free?',
          content: '<p>Yes, we have a generous free plan with 5 courses included.</p>', open: false },
        { id: 'tog_2', title: 'How long do I have access?',
          content: '<p>Access lasts as long as your subscription is active.</p>', open: false },
      ],
      icon_closed: 'fa-plus', icon_open: 'fa-minus',
      icon_color: 'var(--color-primary)', item_style: 'minimal', item_gap: 8,
    },
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────
  {
    type: 'testimonial', label: 'Testimonial', icon: '💬', category: 'Social',
    component: TestimonialWidget,
    defaultSettings: {
      items: [
        { id: 'tst_1', quote: 'Excellent courses that helped me pass my exams!',
          name: 'Adaeze O.', role: 'WAEC Student',      avatar: '', rating: 5 },
        { id: 'tst_2', quote: 'The past questions were spot on. Highly recommended!',
          name: 'Emeka K.', role: 'JAMB Candidate',     avatar: '', rating: 5 },
        { id: 'tst_3', quote: 'Amazing platform. The instructors are world class.',
          name: 'Fatima B.', role: 'University Student', avatar: '', rating: 5 },
      ],
      layout: 'grid', columns: 3, card_style: 'bordered',
      show_rating: true, show_avatar: true, quote_icon: true,
      text_align: 'left', card_bg: 'rgba(255,255,255,0.03)',
      border_radius: 16, card_padding: 24,
    },
  },

  {
    type: 'pricing_table', label: 'Pricing', icon: '💰', category: 'Social',
    component: PricingWidget,
    defaultSettings: {
      plans: [
        {
          id: 'plan_1', name: 'Free', price: '₦0', period: 'forever',
          description: 'Get started with basic access',
          features: [
            { text: '5 Courses',    included: true  },
            { text: 'Live Classes', included: false },
            { text: 'Certificates', included: false },
          ],
          button_text: 'Get Started', button_url: '/register',
          highlighted: false, badge: '',
        },
        {
          id: 'plan_2', name: 'Pro', price: '₦2,500', period: '/month',
          description: 'Full access to all content',
          features: [
            { text: 'Unlimited Courses', included: true },
            { text: 'Live Classes',      included: true },
            { text: 'Certificates',      included: true },
          ],
          button_text: 'Start Pro', button_url: '/checkout',
          highlighted: true, badge: 'Most Popular',
        },
      ],
      columns: 2,
    },
  },

  // ── ELEMENTS ──────────────────────────────────────────────────────────────
  {
    type: 'progress_bar', label: 'Progress Bar', icon: '📊', category: 'Elements',
    component: ProgressBarWidget,
    defaultSettings: {
      items: [
        { id: 'pb_1', label: 'Mathematics', percentage: 95, color: 'var(--color-primary)' },
        { id: 'pb_2', label: 'English',     percentage: 88, color: 'var(--color-accent)'  },
        { id: 'pb_3', label: 'Sciences',    percentage: 92, color: '#06D6A0'              },
      ],
      bar_style: 'gradient', bar_height: 12, border_radius: 6,
      show_percentage: true, track_color: 'rgba(255,255,255,0.08)',
    },
  },

  {
    type: 'countdown', label: 'Countdown', icon: '⏱', category: 'Elements',
    component: CountdownWidget,
    defaultSettings: {
      countdown_type: 'date',
      due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      show_days: true, show_hours: true, show_minutes: true, show_seconds: true,
      label_days: 'Days', label_hours: 'Hours', label_minutes: 'Mins', label_seconds: 'Secs',
      display_style: 'boxes',
      box_bg: 'rgba(255,255,255,0.06)', number_color: '#ffffff',
      label_color: 'rgba(255,255,255,0.5)', box_radius: 12,
      on_expire: 'message', expire_message: 'Enrollment is now closed.',
    },
  },

  {
    type: 'map', label: 'Map', icon: '🗺', category: 'Elements',
    component: MapWidget,
    defaultSettings: {
      address: '123 School Road, Lagos, Nigeria',
      zoom: 15, map_type: 'roadmap', height: 400,
      show_marker: true, marker_title: 'Our Location',
      show_controls: true, allow_scroll: false, border_radius: 12,
    },
  },

  {
    type: 'social_icons', label: 'Social Icons', icon: '🔗', category: 'Elements',
    component: SocialIconsWidget,
    defaultSettings: {
      items: [
        { id: 'si_1', network: 'facebook',  url: '', label: 'Facebook'  },
        { id: 'si_2', network: 'instagram', url: '', label: 'Instagram' },
        { id: 'si_3', network: 'youtube',   url: '', label: 'YouTube'   },
        { id: 'si_4', network: 'whatsapp',  url: '', label: 'WhatsApp'  },
      ],
      icon_style: 'rounded', icon_size: 24, color_type: 'brand',
      custom_color: '#ffffff', gap: 16, alignment: 'left', open_in_new_tab: true,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Registry class
// ─────────────────────────────────────────────────────────────────────────────
class WidgetRegistry {
  constructor(defs) {
    this._map = new Map(defs.map(d => [d.type, d]));
  }

  /** Get full definition for a widget type */
  get(type) { return this._map.get(type) || null; }

  /** Get only the React component for a widget type */
  getComponent(type) { return this._map.get(type)?.component || null; }

  /** Get all definitions */
  getAll() { return Array.from(this._map.values()); }

  /**
   * Returns definitions grouped by category, filtered by search string.
   * Used by the Left Panel widget library.
   */
  getGroupedWidgets(search = '') {
    const q = search.toLowerCase().trim();
    const matches = this.getAll().filter(w =>
      !q ||
      w.label.toLowerCase().includes(q) ||
      w.type.includes(q) ||
      w.category.toLowerCase().includes(q)
    );

    const groups = {};
    for (const w of matches) {
      if (!groups[w.category]) groups[w.category] = [];
      groups[w.category].push(w);
    }

    const ORDER = ['Basic', 'Media', 'Layout', 'Social', 'Elements'];
    return ORDER
      .filter(cat => groups[cat]?.length)
      .map(cat => ({ label: cat, widgets: groups[cat] }));
  }
}

const registry = new WidgetRegistry(WIDGET_DEFS);
export default registry;
