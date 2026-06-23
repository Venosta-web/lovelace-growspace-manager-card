import {
  mdiThermometer,
  mdiWaterPercent,
  mdiCloudOutline,
  mdiWeatherCloudy,
  mdiLightbulbOn,
  mdiWater,
  mdiFan,
  mdiAirHumidifier,
  mdiAirHumidifierOff,
  mdiRadioboxMarked,
  mdiMagnify,
  mdiCalculator,
  mdiAirFilter,
  mdiBarrel,
  mdiFlash,
  mdiSprout,
  mdiWeatherSunny,
  mdiWaterMinus,
  mdiPh,
  mdiLightningBolt,
  mdiWaterPump,
} from '@mdi/js';

export enum MetricKey {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  VPD = 'vpd',
  CO2 = 'co2',
  IRRIGATION_TANK_LEVEL = 'irrigation_tank_level',
  SOIL_MOISTURE = 'soil_moisture',
  IRRIGATION = 'irrigation',
  DRAIN = 'drain',
  OPTIMAL = 'optimal',
  LIGHT = 'light',
  EXHAUST = 'exhaust',
  CIRCULATION_FAN = 'circulation_fan',
  HUMIDIFIER = 'humidifier',
  DEHUMIDIFIER = 'dehumidifier',
  CALCULATED_VPD = 'calculated_vpd',
  AIR_EXCHANGE = 'air_exchange',
  DLI = 'dli',
  SUBSTRATE_TEMPERATURE = 'substrate_temperature',
  CROP_STEERING = 'crop_steering',
  ENERGY = 'energy',
  WATER = 'water',
  PH = 'ph',
  FEED_EC = 'feed_ec',
  BULK_EC = 'bulk_ec',
  PORE_EC = 'pore_ec',
  RUNOFF_EC = 'runoff_ec',
  DRAIN_VOLUME = 'drain_volume',
  IRRIGATION_FLOW = 'irrigation_flow',
  POWER = 'power',
  STEERING_PHASE = 'steering_phase',
}

export const METRIC_SORT_ORDER = [
  MetricKey.TEMPERATURE,
  MetricKey.HUMIDITY,
  MetricKey.VPD,
  MetricKey.CO2,
  MetricKey.IRRIGATION_TANK_LEVEL,
  MetricKey.SOIL_MOISTURE,
  MetricKey.IRRIGATION,
  MetricKey.DRAIN,
  MetricKey.OPTIMAL,
  MetricKey.LIGHT,
  MetricKey.EXHAUST,
  MetricKey.CIRCULATION_FAN,
  MetricKey.HUMIDIFIER,
  MetricKey.DEHUMIDIFIER,
  MetricKey.DLI,
  MetricKey.SUBSTRATE_TEMPERATURE,
  MetricKey.CROP_STEERING,
  MetricKey.ENERGY,
  MetricKey.WATER,
  MetricKey.PH,
  MetricKey.FEED_EC,
  MetricKey.BULK_EC,
  MetricKey.PORE_EC,
  MetricKey.RUNOFF_EC,
  MetricKey.DRAIN_VOLUME,
  MetricKey.IRRIGATION_FLOW,
  MetricKey.POWER,
  MetricKey.STEERING_PHASE,
];

export enum ChartType {
  LINE = 'line',
  STEP = 'step',
}

export interface MetricConfigItem {
  color: string;
  title: string;
  unit: string;
  icon: string;
  type?: ChartType;
}

export const METRIC_CONFIG: Record<string, MetricConfigItem> = {
  [MetricKey.TEMPERATURE]: {
    color: '#ff5252',
    title: 'Temperature',
    unit: '°C',
    icon: mdiThermometer,
  },
  [MetricKey.HUMIDITY]: { color: '#2196f3', title: 'Humidity', unit: '%', icon: mdiWaterPercent },
  [MetricKey.VPD]: { color: '#9c27b0', title: 'VPD', unit: 'kPa', icon: mdiCloudOutline },
  [MetricKey.CALCULATED_VPD]: {
    color: '#ab47bc',
    title: 'Calc. VPD',
    unit: 'kPa',
    icon: mdiCalculator,
  },
  [MetricKey.CO2]: { color: '#e91e63', title: 'CO2', unit: 'ppm', icon: mdiWeatherCloudy },
  [MetricKey.AIR_EXCHANGE]: {
    color: '#8d6e63',
    title: 'Air Exchange',
    unit: 'm³/h',
    icon: mdiAirFilter,
  },
  [MetricKey.IRRIGATION_TANK_LEVEL]: {
    color: '#26a69a',
    title: 'Tank Level',
    unit: '%',
    icon: mdiBarrel,
  },
  [MetricKey.SOIL_MOISTURE]: {
    color: '#03a9f4',
    title: 'Soil Moisture',
    unit: '%',
    icon: mdiWaterPercent,
  },
  [MetricKey.LIGHT]: {
    color: '#ffc107',
    title: 'Light',
    unit: 'state',
    icon: mdiLightbulbOn,
    type: ChartType.STEP,
  },
  [MetricKey.IRRIGATION]: {
    color: '#03a9f4',
    title: 'Irrigation',
    unit: 'state',
    icon: mdiWater,
    type: ChartType.STEP,
  },
  [MetricKey.DRAIN]: {
    color: '#ff9800',
    title: 'Drain',
    unit: 'state',
    icon: mdiWater,
    type: ChartType.STEP,
  },
  [MetricKey.EXHAUST]: { color: '#795548', title: 'Exhaust', unit: '', icon: mdiFan },
  [MetricKey.CIRCULATION_FAN]: {
    color: '#243491',
    title: 'Circulation Fan',
    unit: '',
    icon: mdiFan,
  },
  [MetricKey.HUMIDIFIER]: {
    color: '#00bcd4',
    title: 'Humidifier',
    unit: '',
    icon: mdiAirHumidifier,
  },
  [MetricKey.DEHUMIDIFIER]: {
    color: '#009688',
    title: 'Dehumidifier',
    unit: 'state',
    icon: mdiAirHumidifierOff,
    type: ChartType.STEP,
  },
  [MetricKey.OPTIMAL]: {
    color: '#4caf50',
    title: 'Optimal Conditions',
    unit: 'state',
    icon: mdiRadioboxMarked,
    type: ChartType.STEP,
  },
  [MetricKey.DLI]: { color: '#ffb300', title: 'DLI', unit: 'mol/m²/d', icon: mdiWeatherSunny },
  [MetricKey.SUBSTRATE_TEMPERATURE]: {
    color: '#ff5252',
    title: 'Substrate Temp',
    unit: '°C',
    icon: mdiThermometer,
  },
  [MetricKey.CROP_STEERING]: {
    color: '#4caf50',
    title: 'Crop Steering',
    unit: '',
    icon: mdiSprout,
  },
  [MetricKey.ENERGY]: { color: '#fbc02d', title: 'Energy', unit: 'kWh', icon: mdiFlash },
  [MetricKey.WATER]: { color: '#03a9f4', title: 'Water Usage', unit: 'L/d', icon: mdiWaterMinus },
  [MetricKey.PH]: { color: '#ab47bc', title: 'pH', unit: '', icon: mdiPh },
  [MetricKey.FEED_EC]: {
    color: '#ffa726',
    title: 'Feed EC',
    unit: 'mS/cm',
    icon: mdiLightningBolt,
  },
  [MetricKey.BULK_EC]: {
    color: '#ff7043',
    title: 'Bulk EC',
    unit: 'mS/cm',
    icon: mdiLightningBolt,
  },
  [MetricKey.PORE_EC]: {
    color: '#ef5350',
    title: 'Pore EC',
    unit: 'mS/cm',
    icon: mdiLightningBolt,
  },
  [MetricKey.RUNOFF_EC]: {
    color: '#ef5350',
    title: 'Runoff EC',
    unit: 'mS/cm',
    icon: mdiLightningBolt,
  },
  [MetricKey.DRAIN_VOLUME]: {
    color: '#29b6f6',
    title: 'Drain Volume',
    unit: 'L',
    icon: mdiWaterMinus,
  },
  [MetricKey.IRRIGATION_FLOW]: {
    color: '#26c6da',
    title: 'Flow Rate',
    unit: 'L/h',
    icon: mdiWaterPump,
  },
  [MetricKey.POWER]: { color: '#ffee58', title: 'Power', unit: 'W', icon: mdiFlash },
};

export enum StatusLevel {
  OPTIMAL = 'optimal',
  WARNING = 'warning',
  DANGER = 'danger',
}

export const STATUS_COLORS = {
  [StatusLevel.OPTIMAL]: 'var(--success-color, #4caf50)',
  [StatusLevel.WARNING]: 'var(--warning-color, #ff9800)',
  [StatusLevel.DANGER]: 'var(--error-color, #f44336)',
} as const;

export enum ScrollDirection {
  LEFT = 'left',
  RIGHT = 'right',
}

export enum ViewMode {
  STANDARD = 'standard',
  COMPACT = 'compact',
  HEADER = 'header',
  HEATMAP = 'heatmap',
}

export enum GridOverlayMode {
  NONE = 'none',
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  VPD = 'vpd',
  BIO_STATUS = 'bio_status',
}

export enum ConfigTab {
  GROWSPACES = 'growspaces',
  NOTIFICATIONS = 'notifications',
  SENSORS = 'sensors',
  CLIMATE = 'climate',
  HUMIDITY = 'humidity',
  IRRIGATION = 'irrigation',
  TANKS = 'tanks',
  VISION = 'vision',
  HEATMAP = 'heatmap',
  SUBAREAS = 'subareas',
  VPD_TARGETS = 'vpd_targets',
}

export const DEFAULT_METRIC_CONFIG: MetricConfigItem = {
  color: '#fff',
  title: 'Unknown',
  unit: '',
  icon: mdiMagnify,
  type: ChartType.LINE,
};

export const SENSOR_CHART_DEFAULTS: Record<
  string,
  { min?: number; max?: number; disablePadding?: boolean; unit?: string; binary?: boolean }
> = {
  exhaust: { min: 0, max: 10, disablePadding: true, unit: 'state' },
  dehumidifier: { min: 0, max: 1, disablePadding: true, binary: true },
  humidifier: { min: 0, max: 10, disablePadding: true, unit: 'state' },
  circulation_fan: { min: 0, max: 10, disablePadding: true, unit: 'state' },
  optimizer: { min: 0, max: 1, disablePadding: true, binary: true, unit: 'state' },
};

/**
 * Maps metric keys to their entity attribute keys in GrowspaceDevice.environment_attributes
 * and GrowspaceDevice.irrigation_config. Used by header chips and history controller.
 */
export const METRIC_ENTITY_KEYS: Record<
  string,
  { primary: string; fallback?: string; source?: 'environment' | 'irrigation' }
> = {
  [MetricKey.TEMPERATURE]: { primary: 'temperatureSensor' },
  [MetricKey.HUMIDITY]: { primary: 'humiditySensor' },
  [MetricKey.VPD]: { primary: 'vpdSensor' },
  [MetricKey.CO2]: { primary: 'co2Sensor' },
  [MetricKey.EXHAUST]: { primary: 'exhaustSensor', fallback: 'exhaustEntity' },
  [MetricKey.HUMIDIFIER]: { primary: 'humidifierSensor', fallback: 'humidifierEntity' },
  [MetricKey.DEHUMIDIFIER]: { primary: 'dehumidifierEntity' },
  [MetricKey.CIRCULATION_FAN]: { primary: 'circulationFanEntity' },
  [MetricKey.LIGHT]: { primary: 'lightSensor' },
  [MetricKey.IRRIGATION_TANK_LEVEL]: { primary: 'irrigationTanks' },
  [MetricKey.SOIL_MOISTURE]: { primary: 'soilMoistureSensor' },
  [MetricKey.IRRIGATION]: { primary: 'irrigationPumpEntity', source: 'irrigation' },
  [MetricKey.DRAIN]: { primary: 'drainPumpEntity', source: 'irrigation' },
  [MetricKey.SUBSTRATE_TEMPERATURE]: { primary: 'substrateTemperatureSensors' },
  [MetricKey.ENERGY]: { primary: 'energySensors' },
  [MetricKey.POWER]: { primary: 'powerSensors' },
  [MetricKey.PH]: { primary: 'phSensors' },
  [MetricKey.FEED_EC]: { primary: 'feedEcSensors' },
  [MetricKey.BULK_EC]: { primary: 'bulkEcSensors' },
  [MetricKey.PORE_EC]: { primary: 'poreEcSensors' },
  [MetricKey.RUNOFF_EC]: { primary: 'runoffEcSensors' },
  [MetricKey.DRAIN_VOLUME]: { primary: 'drainVolumeSensors' },
  [MetricKey.IRRIGATION_FLOW]: { primary: 'irrigationFlowSensors' },
};

export type HistoryTimeRange = '1h' | '6h' | '24h' | '7d';

export type MetricType =
  | MetricKey.TEMPERATURE
  | MetricKey.HUMIDITY
  | MetricKey.VPD
  | MetricKey.CO2
  | MetricKey.IRRIGATION_TANK_LEVEL
  | MetricKey.SOIL_MOISTURE
  | MetricKey.EXHAUST
  | MetricKey.HUMIDIFIER
  | MetricKey.DEHUMIDIFIER
  | MetricKey.CIRCULATION_FAN
  | MetricKey.LIGHT
  | MetricKey.OPTIMAL
  | MetricKey.DLI
  | MetricKey.SUBSTRATE_TEMPERATURE
  | MetricKey.CROP_STEERING
  | MetricKey.ENERGY
  | MetricKey.WATER;

export const FAN_VPD_STAGE_KEYS = [
  'seedling',
  'clone',
  'mother',
  'veg',
  'flower_early',
  'flower_mid',
  'flower_late',
  'dry',
  'cure',
] as const;

export type FanVpdStageKey = (typeof FAN_VPD_STAGE_KEYS)[number];

export const FAN_VPD_STAGE_LABELS: Record<FanVpdStageKey, string> = {
  seedling: 'Seedling',
  clone: 'Clone',
  mother: 'Mother',
  veg: 'Veg',
  flower_early: 'Flower (Early)',
  flower_mid: 'Flower (Mid)',
  flower_late: 'Flower (Late)',
  dry: 'Dry',
  cure: 'Cure',
};

export const FAN_VPD_STAGE_DEFAULTS: Record<FanVpdStageKey, { day: number; night: number }> = {
  seedling: { day: 0.6, night: 0.6 },
  clone: { day: 0.5, night: 0.5 },
  mother: { day: 0.7, night: 0.6 },
  veg: { day: 0.7, night: 0.6 },
  flower_early: { day: 1.15, night: 1.0 },
  flower_mid: { day: 1.2, night: 1.0 },
  flower_late: { day: 1.25, night: 1.05 },
  dry: { day: 0.95, night: 0.95 },
  cure: { day: 0.75, night: 0.75 },
};

export type VpdOptimalOverrides = Record<
  string,
  { day: { low: number; high: number }; night: { low: number; high: number } }
>;

export const VPD_OPTIMAL_STAGE_DEFAULTS: Record<
  FanVpdStageKey,
  { day: { low: number; high: number }; night: { low: number; high: number } }
> = {
  seedling: { day: { low: 0.4, high: 0.8 }, night: { low: 0.4, high: 0.8 } },
  clone: { day: { low: 0.3, high: 0.7 }, night: { low: 0.3, high: 0.7 } },
  mother: { day: { low: 0.5, high: 0.9 }, night: { low: 0.4, high: 0.8 } },
  veg: { day: { low: 0.5, high: 0.9 }, night: { low: 0.4, high: 0.8 } },
  flower_early: { day: { low: 0.9, high: 1.4 }, night: { low: 0.8, high: 1.2 } },
  flower_mid: { day: { low: 0.95, high: 1.45 }, night: { low: 0.85, high: 1.2 } },
  flower_late: { day: { low: 1.0, high: 1.5 }, night: { low: 0.9, high: 1.2 } },
  dry: { day: { low: 0.8, high: 1.1 }, night: { low: 0.8, high: 1.1 } },
  cure: { day: { low: 0.6, high: 0.9 }, night: { low: 0.6, high: 0.9 } },
};
