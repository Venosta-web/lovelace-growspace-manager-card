declare const __VERSION__: string;

// Home Assistant loads this file with a cache-busting query — `?hacstag=` from
// HACS, `?v=` from the dev runtime — while a lazy chunk's own import of it
// would resolve to the bare filename. Those are two module URLs, so the browser
// would fetch and execute the whole eager bundle a second time: every custom
// element defined twice, and the dialog that triggered the chunk dies on the
// duplicate `customElements.define`. Publishing the URL this module was
// actually loaded from lets the chunks bind to this instance instead; the
// rollup plugin in scripts/lazy-chunk-entry-binding.mjs rewrites their imports
// to read it.
window.__growspaceEntryUrl ??= import.meta.url;

console.info(
  `%c GrowSpace Manager Card %c v${__VERSION__} `,
  'background:#1a7a1a;color:#fff;font-weight:700;padding:2px 4px;border-radius:4px 0 0 4px;',
  'background:#333;color:#fff;font-weight:400;padding:2px 4px;border-radius:0 4px 4px 0;'
);

// Export all types
export * from './types';

// Export utility classes
export { PlantUtils } from './utils/plant-utils';

// Export main component
export { GrowspaceManagerCard } from './growspace-manager-card';

// Export standalone cards
export { GrowspaceGridCard } from './cards/growspace-grid-card';
export { GrowspaceAnalyticsCard } from './cards/growspace-analytics-card';
export { GrowspaceAiInsightCard } from './cards/growspace-ai-insight-card';
export { GrowspaceTankCard } from './cards/growspace-tank-card';
export { GrowspaceSubareaCard } from './cards/growspace-subarea-card';
export { GrowspaceLogbookCard } from './cards/growspace-logbook-card';
export { GrowspaceCarouselCard } from './cards/growspace-carousel-card';
export { GrowspaceTcCard } from './cards/growspace-tc-card';

// Register cards in the Home Assistant card picker
declare global {
  interface Window {
    /** URL this entry bundle was loaded from, for the lazy chunks to import back. */
    __growspaceEntryUrl?: string;
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
    }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push(
  {
    type: 'growspace-manager-card',
    name: 'Growspace Manager',
    description:
      'Full growspace management dashboard with environment monitoring, plant tracking, and irrigation control.',
    preview: false,
  },
  {
    type: 'growspace-grid-card',
    name: 'Growspace Grid',
    description: 'Compact grid view of all plants in a growspace.',
    preview: false,
  },
  {
    type: 'growspace-analytics-card',
    name: 'Growspace Analytics',
    description: 'Environment analytics and historical charts for a growspace.',
    preview: false,
  },
  {
    type: 'growspace-ai-insight-card',
    name: 'Growspace AI Insight',
    description: 'AI-powered cultivation insights and recommendations.',
    preview: false,
  },
  {
    type: 'growspace-tank-card',
    name: 'Growspace Tank',
    description:
      'Live irrigation tank levels with fill visualization, depletion status, and time remaining.',
    preview: false,
  },
  {
    type: 'growspace-subarea-card',
    name: 'Growspace Subarea',
    description: 'Environment sensors and device status for a specific subarea within a growspace.',
    preview: false,
  },
  {
    type: 'growspace-logbook-card',
    name: 'Growspace Logbook',
    description: 'Events logbook with list and timeline views for a growspace.',
    preview: false,
  },
  {
    type: 'growspace-carousel-card',
    name: 'Growspace Carousel',
    description: 'Automatically cycles through multiple selected growspaces.',
    preview: false,
  },
  {
    type: 'growspace-tc-card',
    name: 'Growspace Tissue Culture',
    description:
      'Culture lines and their maintenance worklist. Requires the Growspace Manager TC integration; the card hides itself without it.',
    preview: false,
  }
);
