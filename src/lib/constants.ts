// WebSocket message types

export const WS_TYPE_GET_HISTORY_STATS = 'growspace_manager/get_history_stats';

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
