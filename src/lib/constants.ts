export const DOMAIN = 'growspace_manager';

// WebSocket message types
export const WS_TYPE_GET_DATA = 'growspace_manager/get_data';
export const WS_TYPE_GET_LOG = 'growspace_manager/get_log';
export const WS_TYPE_GET_ALERTS = 'growspace_manager/get_alerts';
export const WS_TYPE_GET_HISTORY_STATS = 'growspace_manager/get_history_stats';
export const WS_TYPE_GET_NUTRIENT_PRESETS = 'growspace_manager/get_nutrient_presets';
export const WS_TYPE_GET_IPM_PRESETS = 'growspace_manager/get_ipm_presets';
export const WS_TYPE_GET_NUTRIENT_INVENTORY = 'growspace_manager/get_nutrient_inventory';
export const WS_TYPE_UPDATE_NUTRIENT_STOCK = 'growspace_manager/update_nutrient_stock';
export const WS_TYPE_REMOVE_NUTRIENT_STOCK = 'growspace_manager/remove_nutrient_stock';
export const WS_TYPE_GET_EC_RAMP_CURVES = 'growspace_manager/get_ec_ramp_curves';
export const WS_TYPE_CAPTURE_SNAPSHOT = 'growspace_manager/capture_snapshot';
export const WS_TYPE_GET_SNAPSHOTS = 'growspace_manager/get_snapshots';
export const WS_TYPE_GET_VISION_HISTORY = 'growspace_manager/get_vision_history';
export const WS_TYPE_UPDATE_VISION_CHECKUP_CONFIG =
  'growspace_manager/update_vision_checkup_config';
export const WS_TYPE_GET_SUBAREAS = 'growspace_manager/get_subareas';
export const WS_TYPE_ADD_SUBAREA = 'growspace_manager/add_subarea';
export const WS_TYPE_UPDATE_SUBAREA = 'growspace_manager/update_subarea';
export const WS_TYPE_REMOVE_SUBAREA = 'growspace_manager/remove_subarea';
export const WS_TYPE_UPDATE_SENSOR_COORDINATES = 'growspace_manager/update_sensor_coordinates';

// Home Assistant events
export const EVENTS = {
  GROWSPACE_UPDATED: 'growspace_manager_updated',
  GROWSPACE_ADDED: 'growspace_manager_growspace_added',
  GROWSPACE_REMOVED: 'growspace_manager_growspace_removed',
  PLANT_ADDED: 'growspace_manager_plant_added',
  PLANT_UPDATED: 'growspace_manager_plant_updated',
  PLANT_REMOVED: 'growspace_manager_plant_removed',
  PLANT_MOVED: 'growspace_manager_plant_moved',
  PLANT_SWITCHED: 'growspace_manager_plant_switched',
  PLANT_TRANSITIONED: 'growspace_manager_plant_transitioned',
  PLANT_HARVESTED: 'growspace_manager_plant_harvested',
  CLONES_TAKEN: 'growspace_manager_clones_taken',
};

// Home Assistant services
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
  SET_HUMIDIFIER_CONTROL: 'set_humidifier_control',
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
  PRINT_LABEL: 'print_label',
  SCORE_PLANT: 'score_plant',
  UPDATE_HARVEST_METRICS: 'update_harvest_metrics',
  CONFIGURE_DRAIN_MONITORING: 'configure_drain_monitoring',
  LOG_DRAIN_READING: 'log_drain_reading',
  RUN_IRRIGATION_CYCLE: 'run_irrigation_cycle',
  BATCH_ACTION: 'batch_action',
  LOG_TRAINING_EVENT: 'log_training_event',
  EXPORT_GROW_REPORT: 'export_grow_report',
  MOVE_PLANT: 'move_plant',
  REMOVE_ENVIRONMENT: 'remove_environment',
  RESET_WATER_TRACKING: 'reset_water_tracking',
  UPDATE_STRAIN_META: 'update_strain_meta',
  TRIGGER_VISION_CHECKUP: 'trigger_vision_checkup',
  LOG_DRYING_WEIGHT: 'log_drying_weight',
  LOG_MOISTURE_READING: 'log_moisture_reading',
  SET_VISUAL_TAG: 'set_visual_tag',
  SET_EC_TARGET_RANGE: 'set_ec_target_range',
};

// Storage keys
export const STORAGE_KEYS = {
  HISTORY_PREFIX: 'growspace_history_',
} as const;

// Default configuration values
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
