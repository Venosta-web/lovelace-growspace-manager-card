export interface GraphDataPoint {
  time: number;
  value: number;
  meta?: unknown;
}

export interface HistorySensorState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated?: string;
}

export interface SensorHistories {
  [key: string]: HistorySensorState[];
}

export interface GraphSeries {
  id: string;
  title: string;
  color: string;
  unit: string;
  icon?: string;
  points: GraphDataPoint[];
  min: number;
  max: number;
  avg?: number;
  path: string;
  fillType: 'gradient' | 'flat' | 'none';
  vpdBands?: import('./env-series').VpdBand[];
  /** The [[Optimal Band]]s to draw over this series, in its own value space. */
  guideBands?: import('./env-series').EnvGuideBand[];
  /** The [[Setpoint]]s to draw over this series, in its own value space. */
  guideLines?: import('./env-series').EnvGuideLine[];
  /** Limits never widen the value domain; off-scale ones render at its edge. */
  guideLimits?: import('./env-series').EnvGuideLimit[];
  /**
   * The metric's own colour, which a guide mark is drawn in.
   *
   * `color` above is not it for VPD: that trace takes a status colour, and a
   * band drawn in the colour of the status it is being compared against would
   * change colour as the reading crossed it.
   */
  metricColor?: string;
}

export interface TooltipItem {
  title: string;
  value: string;
  color: string;
}

export interface TooltipData {
  id: string;
  x: number;
  time: string;
  items: TooltipItem[];
}

// A sensor group is a wire shape: it round-trips through `environment_config`.
// `SensorGroupSchema` in the subarea slice describes it (ADR 0031).
export type { SensorGroup } from '../../slices/subarea/schema';

/**
 * Event category types for timeline events
 */
export type EventCategory =
  | 'alert'
  | 'note'
  | 'irrigation'
  | 'training'
  | 'environmental'
  | 'phase_change'
  | 'milestone';

/**
 * Growspace-level event from the event log
 * Used by growspace-timeline and growspace-logbook components
 */
export interface GrowspaceEvent {
  // Required for all entries
  growspace_id: string;
  category: string; // Should be EventCategory but kept as string for backend compatibility
  // Present on alert/watering/IPM/training entries; absent on note entries
  sensor_type?: string;
  start_time?: string; // ISO date string (legacy, use timestamp)
  end_time?: string;
  duration_sec?: number;
  severity?: number;
  reasons?: string[];
  // Note-entry fields
  notes?: string;
  // Common optional fields
  timestamp?: string; // ISO date string - preferred over start_time
  images?: string[];
  tags?: string[];
  plant_id?: string;
  metadata?: Record<string, unknown>;
  event_id?: string | number;
}
