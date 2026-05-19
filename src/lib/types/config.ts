import { LovelaceCardConfig } from 'custom-card-helpers';
import { ViewMode } from '../../features/environment/constants';

export interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  default_growspace?: string;
  initial_view_mode?: ViewMode;
  keyboard_rotate_enabled?: boolean;
  keyboard_rotate_speed?: number;
}

export interface GrowspaceLogbookCardConfig extends GrowspaceManagerCardConfig {
  default_view?: 'list' | 'timeline';
}

export type GrowspaceViewMode = ViewMode;

export interface GrowspaceCarouselCardConfig extends LovelaceCardConfig {
  type: string;
  growspaces: string[];
  interval?: number;
}
