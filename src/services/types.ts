import type {
  PlantEntity,
  PlantTimelineEvent,
  RawPlantData,
  GrowspaceType,
} from '../features/plants/types';
import type { SensorGroup } from '../features/environment/types';

// --- Irrigation ---

export interface IrrigationScheduleItem {
  time?: string; // HH:MM or HH:MM:SS - Legacy support
  start_time?: string; // HH:MM:SS - New format
  duration?: number; // Legacy: seconds
  duration_seconds?: number; // New format: seconds
}

// Alias for legacy support
export type IrrigationTime = IrrigationScheduleItem;

export interface IrrigationStrategy {
  enabled: boolean;
  lightsOnTime: string;
  p0DurationMinutes: number;
  p2StopBeforeLightsOffMinutes: number;
  targetVwcPercent: number;
  maintenanceDrybackPercent: number;
  shotDurationSeconds: number;
  shotIntervalMinutes: number;
}

export interface IrrigationConfig {
  irrigationPumpEntity?: string | null;
  drainPumpEntity?: string | null;
  irrigationDuration?: number | null;
  drainDuration?: number | null;
  irrigationTimes: IrrigationScheduleItem[];
  drainTimes: IrrigationScheduleItem[];
  vegDayHours?: number;
}

export interface SerializedIrrigationStrategy {
  enabled: boolean;
  lights_on_time: string;
  p0_duration_minutes: number;
  p2_stop_before_lights_off_minutes: number;
  target_vwc_percent: number;
  maintenance_dryback_percent: number;
  shot_duration_seconds: number;
  shot_interval_minutes: number;
}

export interface SerializedIrrigationConfig {
  irrigation_pump_entity?: string | null;
  drain_pump_entity?: string | null;
  irrigation_duration?: number | null;
  drain_duration?: number | null;
  irrigation_times: IrrigationScheduleItem[];
  drain_times: IrrigationScheduleItem[];
  veg_day_hours?: number;
}

export interface SerializedIrrigationTank {
  sensor_entity: string;
  name: string;
  warning_level: number;
  fill_level: number | null;
  is_warning: boolean;
  hours_remaining?: number | null;
  depletion_status?: 'depleting' | 'refilling' | 'static' | 'insufficient_data' | null;
}

export interface IrrigationTank {
  sensorEntity: string;
  name: string;
  warningLevel: number;
  fillLevel: number | null;
  isWarning: boolean;
  hoursRemaining?: number | null;
  depletionStatus?: 'depleting' | 'refilling' | 'static' | 'insufficient_data' | null;
}

// --- New Feature Models ---

export interface SerializedDrainECReading {
  timestamp: string;
  feed_ec: number;
  drain_ec: number;
  drain_volume_ml?: number | null;
  feed_volume_ml?: number | null;
}

export interface DrainECReading {
  timestamp: string;
  feedEc: number;
  drainEc: number;
  drainVolumeMl?: number | null;
  feedVolumeMl?: number | null;
}

export interface SerializedDrainConfig {
  enabled: boolean;
  max_ec_delta: number;
  target_runoff_percent: number;
  readings?: SerializedDrainECReading[];
}

export interface DrainConfig {
  enabled: boolean;
  maxEcDelta: number;
  targetRunoffPercent: number;
  readings: DrainECReading[];
}


export interface SerializedEnergyTracking {
  daily_kwh: number;
  cost_total: number;
  cost_per_gram: number;
  cycle_start_date?: string | null;
}

export interface EnergyTracking {
  dailyKwh: number;
  costTotal: number;
  costPerGram: number;
  cycleStartDate?: string | null;
}

export interface SerializedWaterUsage {
  liters_per_plant_per_day: number;
  liters_today: number;
  water_efficiency: number;
}

export interface WaterUsage {
  litersPerPlantPerDay: number;
  litersToday: number;
  waterEfficiency: number;
}

// --- Backend Serialized Models ---

export interface SerializedBiologicalMetrics {
  vpd_status: string;
  vpd_target_min: number;
  vpd_target_max: number;
  vpd_danger_min: number;
  vpd_danger_max: number;
  granular_stage: string;
  is_day: boolean;
  veg_week: number;
  flower_week: number;
  air_exchange?: string | null;
}

export interface SerializedEnvironmentAttributes {
  // Sensors
  temperature_sensor?: string;
  temperature_sensors?: string[];
  humidity_sensor?: string;
  humidity_sensors?: string[];
  vpd_sensor?: string;
  vpd_sensors?: string[];
  co2_sensor?: string;
  co2_sensors?: string[];
  soil_moisture_sensor?: string;
  soil_moisture_sensors?: string[];
  light_sensor?: string;
  light_sensors?: string[];

  // Actuators / Complex Entities
  dehumidifier_entity?: string;
  dehumidifier_entities?: string[];
  dehumidifier_control_enabled?: boolean;
  dehumidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifier_state?: string;
  humidifier_entity?: string;
  humidifier_entities?: string[];
  exhaust_entity?: string;
  exhaust_fan_entities?: string[];
  circulation_fan_entity?: string;
  circulation_fan_entities?: string[];

  // Irrigation Pump States
  irrigation_pump_state?: string;
  drain_pump_state?: string;
  active_events?: Record<string, { start: string; duration: number }>;

  // Values calculated by serializer
  vpd?: string;
  soil_moisture_value?: string;

  // Legacy / Alias Support
  exhaust_sensor?: string;
  humidifier_sensor?: string;

  // Irrigation tanks
  irrigation_tanks?: SerializedIrrigationTank[];

  // 3D Sensor Coordinates
  sensor_coordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  sensor_types?: Record<string, string>;
  pump_tank_links?: Record<string, string>;

  // Sensor Groups
  sensor_groups?: SensorGroup[];

  // Phase 0 Extensions
  electricity_cost_per_kwh?: number | null;
  substrate_temperature_sensors?: string[];
  camera_entities?: string[];
  energy_sensors?: string[];
}

export interface SerializedStats {
  max_veg_days: number;
  max_flower_days: number;
  veg_week: number;
  flower_week: number;
  max_stage_summary: string;
  total_plants: number;
}

// The exact structure returned by GrowspaceSerializer.serialize_growspace
export interface GrowspaceAPIResponse
  extends SerializedBiologicalMetrics,
  SerializedEnvironmentAttributes,
  SerializedStats {
  growspace_id: string;
  name: string;
  type: GrowspaceType;
  rows: number;
  plants_per_row: number;
  notification_target?: string | null;
  overview_entity_id?: string;
  dimensions?: { length: number; width: number; height: number; unit: string };

  grid: Record<string, RawPlantData | null>;
  irrigation_config: SerializedIrrigationConfig;
  irrigation_strategy?: SerializedIrrigationStrategy | null;

  drain_config?: SerializedDrainConfig | null;
  energy_tracking?: SerializedEnergyTracking | null;
  water_usage?: SerializedWaterUsage | null;

  _ts?: number; // Backend serialization timestamp for efficient equality checks
}

// --- Internal Frontend Models ---

export interface BiologicalMetrics {
  vpdStatus: string;
  vpdTargetMin: number;
  vpdTargetMax: number;
  vpdDangerMin: number;
  vpdDangerMax: number;
  granularStage: string;
  isDay: boolean;
  vegWeek: number;
  flowerWeek: number;
  airExchange?: string | null;
}

export interface EnvironmentAttributes {
  temperatureSensor?: string;
  temperatureSensors?: string[];
  humiditySensor?: string;
  humiditySensors?: string[];
  vpdSensor?: string;
  vpdSensors?: string[];
  co2Sensor?: string;
  co2Sensors?: string[];
  soilMoistureSensor?: string;
  soilMoistureSensors?: string[];
  lightSensor?: string;
  lightSensors?: string[];
  dehumidifierEntity?: string;
  dehumidifierEntities?: string[];
  dehumidifierControlEnabled?: boolean;
  dehumidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  dehumidifierState?: string;
  humidifierEntity?: string;
  humidifierEntities?: string[];
  exhaustEntity?: string;
  exhaustFanEntities?: string[];
  circulationFanEntity?: string;
  circulationFanEntities?: string[];
  irrigationPumpState?: string;
  drainPumpState?: string;
  vpd?: string;
  soilMoistureValue?: string;
  exhaustSensor?: string;
  humidifierSensor?: string;
  irrigationTanks?: IrrigationTank[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  sensorTypes?: Record<string, string>;
  pump_tank_links?: Record<string, string>;
  activeEvents?: Record<string, { start: string; duration: number }>;
  sensorGroups?: SensorGroup[];
  electricityCostPerKwh?: number | null;
  substrateTemperatureSensors?: string[];
  cameraEntities?: string[];
  energySensors?: string[];
  visionCheckupConfig?: import('../lib/types/dialog').VisionCheckupConfig;
}

export interface GrowspaceStats {
  maxVegDays: number;
  maxFlowerDays: number;
  vegWeek: number;
  flowerWeek: number;
  maxStageSummary: string;
  totalPlants: number;
}

export interface GrowspaceDevice {
  deviceId: string;
  overviewEntityId?: string;
  name: string;
  type: GrowspaceType;
  dimensions?: { length: number; width: number; height: number; unit: string };

  plants: PlantEntity[];
  grid: Record<string, RawPlantData | null>;

  rows: number;
  plantsPerRow: number;
  lastUpdated?: string;
  notificationTarget?: string | null;

  // Structured Groups
  biologicalMetrics: BiologicalMetrics;
  environmentAttributes: EnvironmentAttributes;
  stats: GrowspaceStats;

  irrigationConfig: IrrigationConfig;
  irrigationStrategy?: IrrigationStrategy;

  drainConfig?: DrainConfig | null;
  energyTracking?: EnergyTracking | null;
  waterUsage?: WaterUsage | null;
}

// --- Utils ---

export function createGrowspaceDevice(
  params: Partial<GrowspaceDevice> & { deviceId: string; name: string }
): GrowspaceDevice {
  return {
    type: 'normal' as GrowspaceType,
    rows: 3,
    plantsPerRow: 3,
    plants: [],
    grid: {},
    irrigationConfig: { irrigationTimes: [], drainTimes: [] },

    // Default Empty Objects to prevent UI crashes
    biologicalMetrics: {
      vpdStatus: 'unknown',
      vpdTargetMin: 0,
      vpdTargetMax: 0,
      vpdDangerMin: 0,
      vpdDangerMax: 0,
      granularStage: 'unknown',
      isDay: true,
      vegWeek: 0,
      flowerWeek: 0,
    },
    environmentAttributes: {},
    stats: {
      maxVegDays: 0,
      maxFlowerDays: 0,
      vegWeek: 0,
      flowerWeek: 0,
      maxStageSummary: '',
      totalPlants: 0,
    },
    ...params,
  } as GrowspaceDevice;
}

// --- Nutrients & IPM ---

export interface NutrientItem {
  name: string;
  dose_ml_l: number;
}

export interface NutrientPreset {
  id: string;
  name: string;
  nutrients: NutrientItem[];
  stage?: string;
  min_days_in_stage?: number;
}

export interface NutrientEntry {
  name: string;
  concentration: number; // ml/L
}

export interface NutrientStock {
  nutrient_id: string;
  name: string;
  current_ml: number;
  initial_ml: number;
  last_updated: string;
}

export interface NutrientInventory {
  stocks: Record<string, NutrientStock>;
}

export type IPMType = 'foliar' | 'drench' | 'beneficials';

export interface IPMItem {
  name: string;
  dose_amount: number;
  dose_unit: string;
  phi_days?: number;
}

export interface IPMPreset {
  id: string;
  name: string;
  type: IPMType;
  items: IPMItem[];
  stage?: string;
  min_days_in_stage?: number;
}

// --- AI ---

export interface GrowAdviceResponse {
  response: string | { response: string };
}
