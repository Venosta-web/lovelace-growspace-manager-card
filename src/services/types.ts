import type { PlantEntity, RawPlantData, GrowspaceType } from '../features/plants/types';
import type { SensorGroup } from '../slices/subarea/schema';
import type { TimedNotificationTriggerValue } from '../slices/notification/triggers';
import type { VisionCheckupConfig } from '../lib/types/dialog';
import type {
  AcInfinityDevice,
  AcInfinityGrowLight,
  CirculationFanConfig,
  ExhaustFanConfig,
  GrowLightConfig,
  GrowspaceAPISchemaResponse,
  SerializedDrainConfig,
  SerializedDrybackEvent,
  SerializedIrrigationConfig,
  SerializedIrrigationStrategy,
  SerializedShotComposition,
  SerializedSubstrateMetrics,
} from '../slices/growspace/schema';
import type {
  CropSteeringRecipeValues,
  IrrigationRecipeKind,
  ProgramHold,
  ProgramProgressionState,
  ScheduleRecipeValues,
} from '../slices/irrigation/schema';

export type {
  CropSteeringRecipeValues,
  ProgramHold,
  ProgramProgressionState,
  ScheduleRecipeValues,
};

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
  // [[Recipe Stamp]] provenance (ADR-0045). Both null/undefined means the
  // growspace has never had an Irrigation Recipe applied — a real third state,
  // not a defaulted one. Nothing in the card branches on them; the Recipe tab
  // reports them.
  appliedRecipeId?: string | null;
  recipeAppliedAt?: string | null;
  /**
   * The [[Irrigation Program]] this growspace is bound to, or null for none.
   * Binding writes this one field and no setpoint, which is why it sits here
   * beside the stamp rather than replacing it: the plan and the values a
   * growspace is actually running are different facts.
   */
  irrigationProgramId?: string | null;
}

/**
 * One [[Irrigation Recipe]] as the card reads it — a grower-authored, reusable
 * snapshot of one growspace's irrigation settings, held in a global library and
 * applicable to any other growspace.
 *
 * The card reads the identity and the [[Recipe Provenance]] that sorts the
 * picker and names the authoring medium. It reads the setpoints too, but for
 * one surface only — the recipe library editor, the one place a grower corrects
 * a stored value. Applying never touches them: that is a server-side stamp.
 */
export interface IrrigationRecipe {
  id: string;
  name: string;
  /** Which half the recipe carries. A recipe is never half-applied. */
  kind: IrrigationRecipeKind;
  /** Authoring context — descriptive only; it never gates an apply. */
  provenance: {
    mediaType: SubstrateMediaType;
    litersPerPot: number;
    pumpFlowRateMlPerSec: number;
    /** null when the authoring growspace held no live plants (week is then 0). */
    stage: string | null;
    week: number;
  };
  /**
   * The stored setpoints, populated for exactly the half `kind` names.
   *
   * Deliberately **not** camelised, unlike every other field here. Applying is
   * a server-side stamp, so the only thing the card ever does with these values
   * is show them in the recipe library editor and send the changed ones back to
   * `update_irrigation_recipe` — which names its fields exactly as the backend
   * stores them. Renaming twenty-five fields on the way in so a second mapper
   * could rename them back on the way out buys nothing and loses a value every
   * time one of the pair is missed. `IrrigationScheduleItem` above is
   * wire-shaped for the same reason.
   */
  cropSteering: CropSteeringRecipeValues | null;
  schedule: ScheduleRecipeValues | null;
  createdAt: string;
}

/**
 * One `(stage, week)` slot of an [[Irrigation Program]].
 *
 * `recipeId` is a reference, never a copy: correcting one recipe corrects every
 * program using it. It may name a recipe the library no longer holds — deleting
 * a recipe empties slots rather than cascading — and an empty slot is a
 * [[Program Hold]], so it can never actuate anything.
 */
export interface ProgramSlot {
  /** One of the live stages a slot may be keyed by (`PROGRAM_STAGES`). */
  stage: string;
  /** 1-indexed week within that stage. */
  week: number;
  recipeId: string;
}

/**
 * One [[Irrigation Program]] as the card reads it — a whole-run plan assigning
 * [[Irrigation Recipe]]s to `(stage, week)` slots, held in a global library.
 *
 * Whole-run rather than per-stage: a program defining only flower slots already
 * *is* a per-stage program. Slots arrive in run order.
 */
export interface IrrigationProgram {
  id: string;
  name: string;
  slots: ProgramSlot[];
  createdAt: string;
}

/**
 * What the program layer will do about a growspace's current position, and why
 * it is doing nothing when it is.
 *
 * `state`/`hold` are `null` when the backend named a value this card does not
 * know — the set has grown before, and an unknown cause must not read as one of
 * the known ones. `detail` is the backend's own grower-facing sentence and is
 * always present, so an unknown answer still says something true.
 */
export interface ProgramProgression {
  state: ProgramProgressionState | null;
  hold: ProgramHold | null;
  detail: string;
}

/**
 * Where a growspace sits in the [[Irrigation Program]] it is bound to, resolved
 * by the backend on read. `undefined`/`null` means nothing is bound (or the
 * binding names a program the library no longer holds).
 *
 * `stage`/`week` are reported even when no slot matched, so the card can say
 * *which* week found no instruction rather than only that none was found.
 */
export interface IrrigationProgramState {
  programId: string;
  name: string;
  /** null when the growspace has no live plants, and so no position. */
  stage: string | null;
  week: number;
  /** null when the plan defines nothing for this position — a [[Program Hold]]. */
  slot: ProgramSlot | null;
  /** The slot's recipe, or null when the slot names one since deleted. */
  recipe: IrrigationRecipe | null;
  autoAdvance: boolean;
  progression: ProgramProgression;
}

export interface IrrigationConfig {
  irrigationPumpEntity?: string | null;
  /** Measured pump output; a positive value is required for Volume Mode. */
  pumpFlowRateMlPerSec?: number;
  drainPumpEntity?: string | null;
  irrigationDuration?: number | null;
  drainDuration?: number | null;
  irrigationTimes: IrrigationScheduleItem[];
  drainTimes: IrrigationScheduleItem[];
  vegDayHours?: number;
  /** Server-resolved lit-period length used by crop-steering boundary math. */
  resolvedDayHours?: number;
  soilTriggerPercent?: number | null;
  dailyVolumeCapLiters?: number | null;
  maxCyclesPerDay?: number | null;
  skipDuringDark?: boolean;
  pauseOnLowTank?: boolean;
  logToLogbook?: boolean;
  autoAdvanceP1ToP2?: boolean;
  autoAdvanceP2ToP3?: boolean;
  /**
   * Opt-in, defaulting off: whether reaching a new week of the bound
   * [[Irrigation Program]] stamps that slot's recipe unattended.
   */
  programAutoAdvance?: boolean;
  haltOnRunoffEcThreshold?: number | null;
  ecTargetRanges?: ECTargetRange[];
  activeSteeringPhase?: 'p1' | 'p2' | 'p3';
  phaseChangedAt?: string;
}

export type {
  GrowspaceAPISchemaResponse,
  SerializedDrainConfig,
  SerializedDrybackEvent,
  SerializedIrrigationConfig,
  SerializedIrrigationStrategy,
  SerializedShotComposition,
  SerializedSubstrateMetrics,
};

/** Measured Classification bucket — the score-derived steering measurement. */
export type SteeringClassification = 'vegetative' | 'balanced' | 'generative';

/** Intent Deviation: how the substrate reads relative to the declared mode. */
export type IntentDeviation = 'on_target' | 'more_generative' | 'more_vegetative';

// The tank wire shapes are described once, by the irrigation slice's schemas
// (ADR 0031), and re-exported here for the domain model below and its readers.
import type {
  ActiveEvent,
  TankDepletionStatus,
  TankWaterHistory,
} from '../slices/irrigation/schema';

export type {
  ActiveEvent,
  TankDepletionStatus,
  TankWaterEvent,
  TankDailyEntry,
  TankConsumptionBucket,
  TankWaterHistory,
  SerializedIrrigationTank,
} from '../slices/irrigation/schema';

export interface IrrigationTank {
  sensorEntity: string;
  name: string;
  warningLevel: number;
  fillLevel: number | null;
  isWarning: boolean;
  hoursRemaining?: number | null;
  depletionStatus?: TankDepletionStatus | null;
  volumeLiters?: number | null;
  waterHistory?: TankWaterHistory;
}

// --- New Feature Models ---

export interface DrainECReading {
  timestamp: string;
  feedEc: number;
  drainEc: number;
  drainVolumeMl?: number | null;
  feedVolumeMl?: number | null;
}

export interface DrainConfig {
  enabled: boolean;
  maxEcDelta: number;
  targetRunoffPercent: number;
  readings: DrainECReading[];
}

export interface EnergyTracking {
  cycleStartDate?: string | null;
  cycleStartKwh?: number | null;
  // Kept for UI backward-compat; populated when sensor data is available
  dailyKwh?: number | null;
  costTotal?: number | null;
  costPerGram?: number | null;
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

/**
 * The exact structure returned by GrowspaceViewModelBuilder.build() (ADR 0005),
 * derived from the schema that parses it at the hassCall seam so the two cannot
 * drift (ADR 0031). Reading a field the schema does not declare is a compile
 * error rather than a silent runtime strip.
 */
export type GrowspaceAPIResponse = GrowspaceAPISchemaResponse;

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
  /** Stored Acceptable Moisture Band override; null means inherited. */
  soilMoistureMin?: number | null;
  soilMoistureMax?: number | null;
  /** The band actually applied, with the inherited/custom distinction. */
  soilMoistureBand?: { min: number; max: number; is_custom: boolean };
  /** Only present when a soil-moisture sensor is configured. */
  soilMoistureUnit?: string;
  soilMoistureBandCompatible?: boolean;
  exhaustSensor?: string;
  humidifierSensor?: string;
  irrigationTanks?: IrrigationTank[];
  sensorCoordinates?: Record<string, { x: number; y: number; z: number; rotation?: number }>;
  sensorTypes?: Record<string, string>;
  activeEvents?: Record<string, ActiveEvent>;
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
  vpdOptimalOverrides?: Record<
    string,
    { day: { low: number; high: number }; night: { low: number; high: number } }
  >;

  // LST offset for VPD calculation
  lstOffset?: number;
  stressThreshold?: number | null;
  moldThreshold?: number | null;
}

export interface GrowspaceStats {
  maxVegDays: number;
  maxFlowerDays: number;
  vegWeek: number;
  flowerWeek: number;
  maxStageSummary: string;
  totalPlants: number;
}

// `environment_config` and the subareas that carry it are wire shapes owned by
// the subarea slice's schemas (ADR 0031); these were field-for-field duplicates.
import type { Subarea } from '../slices/subarea/schema';

export type { EnvironmentConfig, Subarea } from '../slices/subarea/schema';

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
  shotComposition: SerializedShotComposition | null;
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
  layoutRevision?: number;
  capabilities?: { atomicPlantLayout: boolean };
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

  /**
   * The global [[Irrigation Recipe]] library, as it rides this growspace's
   * payload. Global, not per-growspace: every device carries the same list.
   */
  irrigationRecipes?: IrrigationRecipe[];
  /**
   * Whether this growspace's irrigation settings still match the recipe it last
   * had applied. `null`/undefined means the question does not apply — no recipe
   * was ever applied, or the applied one has since left the library.
   */
  appliedRecipeDrifted?: boolean | null;
  /**
   * The global [[Irrigation Program]] library, as it rides this growspace's
   * payload — global exactly as `irrigationRecipes` beside it is.
   */
  irrigationPrograms?: IrrigationProgram[];
  /**
   * Where this growspace sits in the program it is bound to. `null` when
   * nothing is bound; the whole question is per-growspace, unlike the library.
   */
  irrigationProgram?: IrrigationProgramState | null;

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
    triggerType: TimedNotificationTriggerValue;
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

// Nutrient and IPM presets, stocks and inventory are wire shapes owned by the
// nutrient slice's schemas (ADR 0031). The interfaces that stood here were
// *narrower* than those schemas — they omitted `week`, `ec_target`, `ph_target`
// and `created_at` on a preset, `brand`/`type`/`npk`/`dose_ml_l`/`notes` on a
// stock, and `phi_days` was optional where the schema defaults it — so a
// consumer typed against them could not see fields the backend does send.
export type {
  NutrientItem,
  NutrientPreset,
  NutrientStock,
  NutrientInventory,
  IPMType,
  IPMItem,
  IPMPreset,
} from '../slices/nutrient/schema';

/** Card-internal: a nutrient line in the mixing UI, not a wire shape. */
export interface NutrientEntry {
  name: string;
  concentration: number; // ml/L
}
