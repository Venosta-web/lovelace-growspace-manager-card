import { MetricKey } from './constants';

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
  vpdSegments?: Array<{ path: string; color: string }>;
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

export interface SensorGroup {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  temperature_sensors: string[];
  humidity_sensors: string[];
  vpd_sensors: string[];
}

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
