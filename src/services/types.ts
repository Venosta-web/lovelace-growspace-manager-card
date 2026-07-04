import type {
  PlantEntity,
  RawPlantData,
  GrowspaceType,
} from '../features/plants/types';
import type { SensorGroup } from '../features/environment/types';
import type { VisionCheckupConfig } from '../lib/types/dialog';
import type {
  AcInfinityDevice,
  AcInfinityGrowLight,
  CirculationFanConfig,
  ExhaustFanConfig,
  GrowLightConfig,
} from '../slices/growspace/schema';

// --- Irrigation ---

export type ECTargetStage = 'seedling' | 'veg' | 'flower_early' | 'flower_mid' | 'flower_late';

export interface ECTargetRange {
  stage: ECTargetStage;
  minEc: number;
  maxEc: number;
}

export interface IrrigationScheduleItem {
  time?: string; // HH:MM or HH:MM:SS - Legacy support
  start_time?: string; // HH:MM:SS - New format
  duration?: number; // Legacy: seconds
  duration_seconds?: number; // New format: seconds
}

// Alias for legacy support
export type IrrigationTime = IrrigationScheduleItem;

/** Shot Sizing Mode (ADR-0011): raw pump seconds vs. percent of substrate volume. */
export type ShotSizingMode = 'seconds' | 'volume';

/** Steering Mode declared intent (ADR-0012). `null` means never stamped. */
export type SteeringMode = 'vegetative' | 'balanced' | 'generative';

/** Substrate growing medium (backend SubstrateMediaType). */
export type SubstrateMediaType = 'coco' | 'rockwool' | 'soil';

/**
 * Per-growspace growing-medium description. Configured once `litersPerPot` is
 * positive; a configured profile is one prerequisite for Volume Mode (ADR-0011).
 */
export interface SubstrateProfile {
  mediaType: SubstrateMediaType;
  litersPerPot: number;
}

export interface IrrigationStrategy {
  enabled: boolean;
  lightsOnTime: string;
  p0DurationMinutes: number;
  p2StopBeforeLightsOffMinutes: number;
  targetVwcPercent: number;
  maintenanceDrybackPercent: number;
  /**
   * Deprecated shared shot fields — mirror the P1 values for back-compat with
   * older readers. New code reads the per-phase fields below.
   */
  shotDurationSeconds: number;
  shotIntervalMinutes: number;
  // Per-phase shot sizing (#443). P1 = ramp-up, P2 = maintenance.
  p1ShotDurationSeconds?: number;
  p1ShotIntervalMinutes?: number;
  p2ShotDurationSeconds?: number;
  p2ShotIntervalMinutes?: number;
  // Per-phase shot sizes as a percent of substrate volume (Volume Mode).
  p1ShotVolumePercent?: number;
  p2ShotVolumePercent?: number;
  shotSizingMode?: ShotSizingMode;
  // Substrate Profile (#446); backs Volume Mode capability.
  substrateProfile?: SubstrateProfile;
  // Pore EC Target Band (#447, mS/cm); distinct from feed-EC ranges. null = unset.
  poreEcTargetMin?: number | null;
  poreEcTargetMax?: number | null;
  // EC Modulation opt-in (#447); inert (factor 1.0) when off/band-absent/no sensors.
  ecModulationEnabled?: boolean;
  autoLightTracking?: boolean;
  detectedLightsOnTime?: string | null;
  // Declared Steering Mode intent (#448); null/undefined means never stamped.
  declaredSteeringMode?: SteeringMode | null;
  // Adaptive Shot Control (ADR-0014). Master toggle + shared feedback tunables.
  dynamicShotEnabled?: boolean;
  dynamicAggressiveness?: number;
  dynamicRecovery?: number;
  dynamicShotSizeFloor?: number;
  dynamicIntervalCeiling?: number;
}

export interface IrrigationConfig {
  irrigationPumpEntity?: string | null;
  drainPumpEntity?: string | null;
  irrigationDuration?: number | null;
  drainDuration?: number | null;
  irrigationTimes: IrrigationScheduleItem[];
  drainTimes: IrrigationScheduleItem[];
  vegDayHours?: number;
  soilTriggerPercent?: number | null;
  dailyVolumeCapLiters?: number | null;
  maxCyclesPerDay?: number | null;
  skipDuringDark?: boolean;
  pauseOnLowTank?: boolean;
  logToLogbook?: boolean;
  autoAdvanceP1ToP2?: boolean;
  autoAdvanceP2ToP3?: boolean;
  haltOnRunoffEcThreshold?: number | null;
  ecTargetRanges?: ECTargetRange[];
  activeSteeringPhase?: 'p1' | 'p2' | 'p3';
  phaseChangedAt?: string;
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
  p1_shot_duration_seconds?: number;
  p1_shot_interval_minutes?: number;
  p2_shot_duration_seconds?: number;
  p2_shot_interval_minutes?: number;
  p1_shot_volume_percent?: number;
  p2_shot_volume_percent?: number;
  shot_sizing_mode?: ShotSizingMode;
  substrate_profile?: { media_type: SubstrateMediaType; liters_per_pot: number };
  pore_ec_target_min?: number | null;
  pore_ec_target_max?: number | null;
  ec_modulation_enabled?: boolean;
  auto_light_tracking?: boolean;
  detected_lights_on_time?: string | null;
  declared_steering_mode?: SteeringMode | null;
  dynamic_shot_enabled?: boolean;
  dynamic_aggressiveness?: number;
  dynamic_recovery?: number;
  dynamic_shot_size_floor?: number;
  dynamic_interval_ceiling?: number;
}

/** Measured Classification bucket — the score-derived steering measurement. */
export type SteeringClassification = 'vegetative' | 'balanced' | 'generative';

/** Intent Deviation: how the substrate reads relative to the declared mode. */
export type IntentDeviation = 'on_target' | 'more_generative' | 'more_vegetative';

/** A committed dryback event (overnight or in-cycle) in the wire shape. */
export interface SerializedDrybackEvent {
  event_type?: string;
  peak_vwc: number;
  trough_vwc: number;
  dryback: number;
  peak_timestamp?: string | null;
  trough_timestamp?: string | null;
}

/**
 * Measured substrate steering metrics (#444/#445/#448), carried in the
 * growspace payload's `irrigation.substrate` block. Tracker-derived dryback /
 * EC fields plus the injected score, classification, deviation, and shot
 * composition. The card renders these instead of reading the sensor entity.
 */
export interface SerializedSubstrateMetrics {
  overnight_dryback?: number | null;
  latest_overnight_event?: SerializedDrybackEvent | null;
  incycle_dryback_count?: number;
  incycle_dryback_avg?: number | null;
  ec_trend?: 'rising' | 'stable' | 'falling' | null;
  ec_trend_available?: boolean;
  ec_trend_detail?: {
    trend: string;
    day_start_ec: number;
    current_ec: number;
    delta: number;
  } | null;
  score?: number | null;
  measured_classification?: SteeringClassification | null;
  intent_deviation?: IntentDeviation | null;
  shot_composition?: Record<string, unknown> | null;
}

export interface SerializedIrrigationConfig {
  irrigation_pump_entity?: string | null;
  drain_pump_entity?: string | null;
  irrigation_duration?: number | null;
  drain_duration?: number | null;
  irrigation_times: IrrigationScheduleItem[];
  drain_times: IrrigationScheduleItem[];
  veg_day_hours?: number;
  soil_trigger_percent?: number | null;
  daily_volume_cap_liters?: number | null;
  max_cycles_per_day?: number | null;
  skip_during_dark?: boolean;
  pause_on_low_tank?: boolean;
  log_to_logbook?: boolean;
  auto_advance_p1_to_p2?: boolean;
  auto_advance_p2_to_p3?: boolean;
  halt_on_runoff_ec_threshold?: number | null;
  ec_target_ranges?: Array<{ stage: string; feed_ec_min: number; feed_ec_max: number }>;
  active_steering_phase?: 'p1' | 'p2' | 'p3';
  phase_changed_at?: string | null;
}

export interface TankWaterEvent {
  timestamp: string;
  event_type: 'consumption' | 'refill';
  pct_delta: number;
  liters: number;
}

export interface TankDailyEntry {
  date: string;
  consumed: number;
  refilled: number;
}

export interface TankConsumptionBucket {
  /** ISO-8601 start of the 15-minute bucket. */
  ts: string;
  /** Liters consumed in this bucket. */
  liters: number;
}

export interface TankWaterHistory {
  /**
   * Compact 15-min consumption buckets for the last 24h (full data, non-zero
   * buckets only). The backend ships these instead of raw events so the 24h
   * chart is not limited to a truncated event slice.
   */
  buckets_24h?: TankConsumptionBucket[];
  daily_7d?: TankDailyEntry[];
  recent_refills?: TankWaterEvent[];
  // Raw snapshots/events are no longer sent by the backend (attribute-size
  // budget); kept optional for backward/forward compatibility.
  snapshots?: Array<{ timestamp: string; level_pct: number }>;
  events?: TankWaterEvent[];
}

export interface SerializedIrrigationTank {
  sensor_entity: string;
  name: string;
  warning_level: number;
  fill_level: number | null;
  is_warning: boolean;
  hours_remaining?: number | null;
  depletion_status?: 'depleting' | 'refilling' | 'static' | 'insufficient_data' | null;
  volume_liters?: number | null;
  water_history?: TankWaterHistory;
}

export interface IrrigationTank {
  sensorEntity: string;
  name: string;
  warningLevel: number;
  fillLevel: number | null;
  isWarning: boolean;
  hoursRemaining?: number | null;
  depletionStatus?: 'depleting' | 'refilling' | 'static' | 'insufficient_data' | null;
  volumeLiters?: number | null;
  waterHistory?: TankWaterHistory;
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
  cycle_start_date?: string | null;
  cycle_start_kwh?: number | null;
}

export interface EnergyTracking {
  cycleStartDate?: string | null;
  cycleStartKwh?: number | null;
  // Kept for UI backward-compat; populated when sensor data is available
  dailyKwh?: number | null;
  costTotal?: number | null;
  costPerGram?: number | null;
}

export interface SerializedWaterUsage {
  total_liters?: number;
  cycle_start_date?: string;
  daily_readings?: Array<Record<string, unknown>>;
  liters_today?: number | null;
}

export interface WaterUsage {
  totalLiters?: number;
  cycleStartDate?: string;
  dailyReadings?: Array<Record<string, unknown>>;
  // Kept for UI backward-compat; populated when sensor data is available
  litersPerPlantPerDay?: number | null;
  litersToday?: number | null;
  waterEfficiency?: number | null;
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
  humidifier_control_enabled?: boolean;
  humidifier_thresholds?: Record<string, Record<string, { on: number; off: number }>>;
  exhaust_entity?: string;
  exhaust_fan_entities?: string[];
  circulation_fan_entity?: string;
  circulation_fan_entities?: string[];
  exhaust_fan_ac_infinity_devices?: AcInfinityDevice[];
  circulation_fan_ac_infinity_devices?: AcInfinityDevice[];
  humidifier_ac_infinity_devices?: AcInfinityDevice[];
  dehumidifier_ac_infinity_devices?: AcInfinityDevice[];
  growlight_entities?: string[];
  growlight_ac_infinity_devices?: AcInfinityGrowLight[];
  growlight_config?: GrowLightConfig;

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
  lung_room_temp_sensors?: string[];
  power_sensors?: string[];
  energy_sensors?: string[];

  // EC / pH / flow sensors
  ph_sensors?: string[];
  feed_ec_sensors?: string[];
  bulk_ec_sensors?: string[];
  pore_ec_sensors?: string[];
  runoff_ec_sensors?: string[];
  drain_volume_sensors?: string[];
  irrigation_flow_sensors?: string[];

  // Fan / vision / VPD-override configs (passed through to the internal model unchanged)
  circulation_fan_config?: CirculationFanConfig;
  exhaust_fan_config?: ExhaustFanConfig;
  vision_checkup_config?: VisionCheckupConfig;
  vpd_optimal_overrides?: Record<
    string,
    { day: { low: number; high: number }; night: { low: number; high: number } }
  >;
  lst_offset?: number;
}

export interface SerializedStats {
  max_veg_days: number;
  max_flower_days: number;
  veg_week: number;
  flower_week: number;
  max_stage_summary: string;
  total_plants: number;
}

// The exact structure returned by GrowspaceViewModelBuilder.build() (ADR 0005)
export interface GrowspaceAPIResponse {
  identity: {
    growspace_id: string;
    overview_entity_id?: string;
    name: string;
    type: GrowspaceType;
    notification_target?: string | null;
  };
  grid: {
    rows: number;
    plants_per_row: number;
    total_plants: number;
    dimensions?: { length: number; width: number; height: number; depth?: number; unit: string };
    grid: Record<string, RawPlantData | null>;
  };
  /** Environment attributes with sensor_types/coordinates/groups extracted into `sensors`. */
  environment: Omit<
    SerializedEnvironmentAttributes,
    'sensor_types' | 'sensor_coordinates' | 'sensor_groups'
  >;
  sensors: {
    sensor_types: Record<string, string>;
    sensor_coordinates: Record<string, { x: number; y: number; z: number; rotation?: number }>;
    sensor_groups: SensorGroup[];
  };
  /** Subareas in the get_subareas wire shape. Absent on older backends. */
  subareas?: Subarea[];
  irrigation: {
    irrigation_config: SerializedIrrigationConfig;
    irrigation_strategy?: SerializedIrrigationStrategy | null;
    volume_mode_capable?: boolean;
    drain_config?: SerializedDrainConfig | null;
    water_usage?: SerializedWaterUsage | null;
    substrate?: SerializedSubstrateMetrics | null;
    last_cycle_timestamp?: string | null;
    next_scheduled_cycle?: string | null;
    projected_shot_window?: { start: string; end: string } | null;
    cycles_today?: number;
    volume_dispensed_today?: number;
  };
  metrics: SerializedBiologicalMetrics & {
    max_veg_days: number;
    max_flower_days: number;
    max_dry_days?: number;
    max_cure_days?: number;
    veg_week: number;
    flower_week: number;
    max_stage_summary: string;
    air_exchange?: string | null;
    energy_tracking?: SerializedEnergyTracking | null;
  };
  /**
   * Global notification timing settings (camelCase keys), duplicated onto every
   * growspace payload so the Config Dialog can seed/round-trip saved values.
   */
  notification_settings?: Record<string, number>;
  /** Global AI auto-alerts toggle, shipped alongside notification_settings. */
  ai_auto_alerts?: boolean;
  /** Global timed notifications (snake_case wire shape), duplicated per payload. */
  timed_notifications?: Array<{
    id: string;
    message: string;
    trigger_type: string;
    day: number;
    growspace_ids: string[];
  }>;
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
  humidifierControlEnabled?: boolean;
  humidifierThresholds?: Record<string, Record<string, { on: number; off: number }>>;
  exhaustEntity?: string;
  exhaustFanEntities?: string[];
  circulationFanEntity?: string;
  circulationFanEntities?: string[];
  circulationFanConfig?: CirculationFanConfig;
  exhaustFanConfig?: ExhaustFanConfig;
  exhaustFanAcInfinityDevices?: AcInfinityDevice[];
  circulationFanAcInfinityDevices?: AcInfinityDevice[];
  humidifierAcInfinityDevices?: AcInfinityDevice[];
  dehumidifierAcInfinityDevices?: AcInfinityDevice[];
  growlightEntities?: string[];
  growlightAcInfinityDevices?: AcInfinityGrowLight[];
  growlightConfig?: GrowLightConfig;
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
  lungroomTempSensors?: string[];
  powerSensors?: string[];
  energySensors?: string[];
  visionCheckupConfig?: VisionCheckupConfig;

  // EC / pH / flow sensors
  phSensors?: string[];
  feedEcSensors?: string[];
  bulkEcSensors?: string[];
  poreEcSensors?: string[];
  runoffEcSensors?: string[];
  drainVolumeSensors?: string[];
  irrigationFlowSensors?: string[];

  // VPD optimal overrides
  vpdOptimalOverrides?: Record<string, { day: { low: number; high: number }; night: { low: number; high: number } }>;

  // LST offset for VPD calculation
  lstOffset?: number;
}

export interface GrowspaceStats {
  maxVegDays: number;
  maxFlowerDays: number;
  vegWeek: number;
  flowerWeek: number;
  maxStageSummary: string;
  totalPlants: number;
}

export interface EnvironmentConfig {
  temperature_sensor?: string | null;
  humidity_sensor?: string | null;
  vpd_sensor?: string | null;
  co2_sensor?: string | null;
  soil_moisture_sensor?: string | null;
  veg_day_hours?: number;
  flower_day_hours?: number;
  temperature_sensors?: string[];
  humidity_sensors?: string[];
  vpd_sensors?: string[];
  light_sensors?: string[];
  exhaust_fan_entities?: string[];
  circulation_fan_entities?: string[];
  humidifier_entities?: string[];
  dehumidifier_entities?: string[];
  sensor_coordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  sensor_groups?: SensorGroup[];
  substrate_temperature_sensors?: string[];
  camera_entities?: string[];
  lung_room_temp_sensors?: string[];
  ph_sensors?: string[];
  feed_ec_sensors?: string[];
  bulk_ec_sensors?: string[];
  pore_ec_sensors?: string[];
  runoff_ec_sensors?: string[];
  drain_volume_sensors?: string[];
  irrigation_flow_sensors?: string[];
  power_sensors?: string[];
  energy_sensors?: string[];
  electricity_cost_per_kwh?: number;
  dli_target_veg?: number;
  dli_target_flower?: number;
  control_dehumidifier?: boolean;
  stress_threshold?: number;
  mold_threshold?: number;
}

export interface Subarea {
  id: string;
  name: string;
  environment_config: EnvironmentConfig;
}

/** A committed dryback event in the frontend (camelCase) shape. */
export interface DrybackEvent {
  peakVwc: number;
  troughVwc: number;
  dryback: number;
  peakTimestamp?: string | null;
  troughTimestamp?: string | null;
}

/** Measured crop-steering diagnostics, parsed from `irrigation.substrate`. */
export interface SteeringMetrics {
  /** Overnight dryback in absolute VWC points; null until a window completes. */
  overnightDryback: number | null;
  latestOvernightEvent: DrybackEvent | null;
  incycleDrybackCount: number;
  incycleDrybackAvg: number | null;
  ecTrend: 'rising' | 'stable' | 'falling' | null;
  /** False when no pore-EC sensors report — distinct from a measured "stable". */
  ecTrendAvailable: boolean;
  /** Measured steering score (−1…+1); null when no reading / strategy disabled. */
  score: number | null;
  measuredClassification: SteeringClassification | null;
  intentDeviation: IntentDeviation | null;
  shotComposition: Record<string, unknown> | null;
}

export interface GrowspaceDevice {
  deviceId: string;
  overviewEntityId?: string;
  name: string;
  type: GrowspaceType;
  dimensions?: { length: number; width: number; height: number; depth?: number; unit: string };

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
  /**
   * Server-authoritative Volume Mode gate (ADR-0011): true only when a substrate
   * profile and a positive pump flow rate are both saved. The card never recomputes
   * this — it gates the Volume Mode toggle on this flag directly.
   */
  volumeModeCapable?: boolean;

  drainConfig?: DrainConfig | null;
  energyTracking?: EnergyTracking | null;
  waterUsage?: WaterUsage | null;
  subareas?: Subarea[];

  notificationSettings?: Partial<{
    criticalCooldownMinutes: number;
    warningCooldownMinutes: number;
    recoveryCooldownMinutes: number;
    escalationDelayMinutes: number;
    minStressDurationSeconds: number;
    warningPersistenceMinutes: number;
    aiAutoAlerts: boolean;
  }>;
  timedNotifications?: Array<{
    id: string;
    message: string;
    triggerType: 'clone' | 'veg' | 'flower' | 'dry';
    day: number;
    growspaceIds: string[];
  }>;

  /** Measured crop-steering diagnostics from the substrate payload (#444/#445/#448). */
  steeringMetrics?: SteeringMetrics;

  // Irrigation cycle telemetry (injected by backend view model)
  lastCycleTimestamp?: string | null;
  nextScheduledCycle?: string | null;
  projectedShotWindow?: { start: string; end: string } | null;
  cyclesToday?: number;
  volumeDispensedToday?: number;
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
  nutrient_id: string;
  dose_ml_l: number;
  name?: string;
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
