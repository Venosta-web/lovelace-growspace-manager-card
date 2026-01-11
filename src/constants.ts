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
} from '@mdi/js';

export const METRIC_SORT_ORDER = [
  'temperature',
  'humidity',
  'vpd',
  'co2',
  'soil_moisture',
  'irrigation',
  'drain',
  'optimal',
  'light',
  'exhaust',
  'circulation_fan',
  'humidifier',
  'dehumidifier',
];

export interface MetricConfigItem {
  color: string;
  title: string;
  unit: string;
  icon: string;
  type?: 'line' | 'step';
}

export const METRIC_CONFIG: Record<string, MetricConfigItem> = {
  temperature: { color: '#ff5252', title: 'Temperature', unit: '°C', icon: mdiThermometer },
  humidity: { color: '#2196f3', title: 'Humidity', unit: '%', icon: mdiWaterPercent },
  vpd: { color: '#9c27b0', title: 'VPD', unit: 'kPa', icon: mdiCloudOutline },
  calculated_vpd: { color: '#ab47bc', title: 'Calc. VPD', unit: 'kPa', icon: mdiCalculator },
  co2: { color: '#e91e63', title: 'CO2', unit: 'ppm', icon: mdiWeatherCloudy },
  air_exchange: { color: '#8d6e63', title: 'Air Exchange', unit: 'm³/h', icon: mdiAirFilter },
  soil_moisture: { color: '#03a9f4', title: 'Soil Moisture', unit: '%', icon: mdiWaterPercent },
  light: { color: '#ffc107', title: 'Light', unit: 'state', icon: mdiLightbulbOn, type: 'step' },
  irrigation: {
    color: '#03a9f4',
    title: 'Irrigation',
    unit: 'state',
    icon: mdiWater,
    type: 'step',
  },
  drain: { color: '#ff9800', title: 'Drain', unit: 'state', icon: mdiWater, type: 'step' },
  exhaust: { color: '#795548', title: 'Exhaust', unit: '', icon: mdiFan },
  circulation_fan: {
    color: '#243491',
    title: 'Circulation Fan',
    unit: '',
    icon: mdiFan,
  },
  humidifier: { color: '#00bcd4', title: 'Humidifier', unit: '', icon: mdiAirHumidifier },
  dehumidifier: {
    color: '#009688',
    title: 'Dehumidifier',
    unit: 'state',
    icon: mdiAirHumidifierOff,
    type: 'step',
  },
  optimal: {
    color: '#4caf50',
    title: 'Optimal Conditions',
    unit: 'state',
    icon: mdiRadioboxMarked,
    type: 'step',
  },
};

export const DEFAULT_METRIC_CONFIG: MetricConfigItem = {
  color: '#fff',
  title: 'Unknown',
  unit: '',
  icon: mdiMagnify,
  type: 'line',
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
  temperature: { primary: 'temperature_sensor' },
  humidity: { primary: 'humidity_sensor' },
  vpd: { primary: 'vpd_sensor' },
  co2: { primary: 'co2_sensor' },
  exhaust: { primary: 'exhaust_sensor', fallback: 'exhaust_entity' },
  humidifier: { primary: 'humidifier_sensor', fallback: 'humidifier_entity' },
  dehumidifier: { primary: 'dehumidifier_entity' },
  circulation_fan: { primary: 'circulation_fan_entity' },
  light: { primary: 'light_sensor' },
  soil_moisture: { primary: 'soil_moisture_sensor' },
  irrigation: { primary: 'irrigation_pump_entity', source: 'irrigation' },
  drain: { primary: 'drain_pump_entity', source: 'irrigation' },
};

export const DOMAIN = 'growspace_manager';
export const WS_TYPE_GET_DATA = 'growspace_manager/get_data';
export const WS_TYPE_GET_HISTORY_STATS = 'growspace_manager/get_history_stats';
export const WS_TYPE_GET_NUTRIENT_PRESETS = 'growspace_manager/get_nutrient_presets';
export const WS_TYPE_GET_IPM_PRESETS = 'growspace_manager/get_ipm_presets';

export const EVENTS = {
  GROWSPACE_UPDATED: "growspace_manager_updated",
  GROWSPACE_ADDED: "growspace_manager_growspace_added",
  GROWSPACE_REMOVED: "growspace_manager_growspace_removed",
  PLANT_ADDED: "growspace_manager_plant_added",
  PLANT_UPDATED: "growspace_manager_plant_updated",
  PLANT_REMOVED: "growspace_manager_plant_removed",
  PLANT_MOVED: "growspace_manager_plant_moved",
  PLANT_SWITCHED: "growspace_manager_plant_switched",
  PLANT_TRANSITIONED: "growspace_manager_plant_transitioned",
  PLANT_HARVESTED: "growspace_manager_plant_harvested",
  CLONES_TAKEN: "growspace_manager_clones_taken"
};

export const SERVICES = {
  GET_STRAIN_LIBRARY: 'get_strain_library',
  ADD_PLANT: 'add_plant',
  UPDATE_PLANT: 'update_plant',
  REMOVE_PLANT: 'remove_plant',
  HARVEST_PLANT: 'harvest_plant',
  TAKE_CLONE: 'take_clone',
  SWITCH_PLANTS: 'switch_plants',
  MOVE_CLONE: 'move_clone',
  SET_DEHUMIDIFIER_CONTROL: 'set_dehumidifier_control',
  SET_IRRIGATION_SETTINGS: 'set_irrigation_settings',
  ADD_IRRIGATION_TIME: 'add_irrigation_time',
  REMOVE_IRRIGATION_TIME: 'remove_irrigation_time',
  SET_IRRIGATION_STRATEGY: 'set_irrigation_strategy',
  ADD_DRAIN_TIME: 'add_drain_time',
  REMOVE_DRAIN_TIME: 'remove_drain_time',
  EXPORT_STRAIN_LIBRARY: 'export_strain_library',
  ADD_STRAIN: 'add_strain',
  REMOVE_STRAIN: 'remove_strain',
  CLEAR_STRAIN_LIBRARY: 'clear_strain_library',
  ADD_GROWSPACE: 'add_growspace',
  UPDATE_GROWSPACE: 'update_growspace',
  REMOVE_GROWSPACE: 'remove_growspace',
  CONFIGURE_ENVIRONMENT: 'configure_environment',
  ASK_GROW_ADVICE: 'ask_grow_advice',
  ANALYZE_ALL_GROWSPACES: 'analyze_all_growspaces',
  STRAIN_RECOMMENDATION: 'strain_recommendation',
  ADD_PLANTS: 'add_plants',
  WATER_PLANT: 'water_plant',
  WATER_GROWSPACE: 'water_growspace',
  SAVE_NUTRIENT_PRESET: 'save_nutrient_preset',
  REMOVE_NUTRIENT_PRESET: 'remove_nutrient_preset',
  SAVE_IPM_PRESET: 'save_ipm_preset',
  REMOVE_IPM_PRESET: 'remove_ipm_preset',
  APPLY_IPM: 'apply_ipm',
};

/**
 * Default configuration values to replace magic numbers throughout the codebase.
 */
export const DEFAULTS = {
  /** Default number of plant rows in a growspace */
  ROWS: 4,
  /** Default number of plants per row */
  PLANTS_PER_ROW: 4,
  /** Default view mode for the card */
  INITIAL_VIEW_MODE: 'standard' as const,
  /** VPD thresholds */
  VPD: {
    TARGET_MIN: 0.8,
    TARGET_MAX: 1.2,
    DANGER_MIN: 0.4,
    DANGER_MAX: 1.6,
  },
  /** History chart defaults */
  CHART: {
    HOURS_RANGE: 24,
    REFRESH_INTERVAL_MS: 60000,
  },
} as const;
