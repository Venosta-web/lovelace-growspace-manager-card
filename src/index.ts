// Export all types
export * from './types';

// Export utility classes
export { PlantUtils } from './utils/plant-utils';
export { DataService } from './data-service';

// Export main component
export { GrowspaceManagerCard } from './growspace-manager-card';

// Export standalone cards
export { GrowspaceGridCard } from './cards/growspace-grid-card';
export { GrowspaceAnalyticsCard } from './cards/growspace-analytics-card';
export { GrowspaceAiInsightCard } from './cards/growspace-ai-insight-card';
export { GrowspaceTankCard } from './cards/growspace-tank-card';
export { GrowspaceSubareaCard } from './cards/growspace-subarea-card';
export { GrowspaceLogbookCard } from './cards/growspace-logbook-card';

// Register cards in the Home Assistant card picker
declare global {
  interface Window {
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
    description: 'Full growspace management dashboard with environment monitoring, plant tracking, and irrigation control.',
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
    description: 'Live irrigation tank levels with fill visualization, depletion status, and time remaining.',
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
);
