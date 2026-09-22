import { LovelaceCardConfig } from 'custom-card-helpers';
import { MetricKey, ViewMode } from '../../features/environment/constants';

export interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  default_growspace?: string;
  initial_view_mode?: ViewMode;
  keyboard_rotate_enabled?: boolean;
  keyboard_rotate_speed?: number;
  hidden_chips?: MetricKey[];
}

export interface GrowspaceLogbookCardConfig extends GrowspaceManagerCardConfig {
  default_view?: 'list' | 'timeline';
}

export interface GrowspaceAnalyticsCardConfig extends GrowspaceManagerCardConfig {
  start_in_graph_wall?: boolean;
  hidden_graphs?: MetricKey[];
}

export type GrowspaceViewMode = ViewMode;

/**
 * The tissue-culture card. It carries nothing but its type today — the view is
 * not scoped to a growspace, and Growspace Manager TC is detected rather than
 * configured.
 */
export interface GrowspaceTcCardConfig extends LovelaceCardConfig {
  type: string;
}

export interface GrowspaceCarouselCardConfig extends LovelaceCardConfig {
  type: string;
  growspaces?: string[];
  interval?: number;
  filter_empty?: boolean;
}
