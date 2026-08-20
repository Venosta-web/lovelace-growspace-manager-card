/**
 * Humidity Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Humidity tab — Humidity Devices
 * (humidifier/dehumidifier pickers + the two control-enable toggles) and the
 * per-stage Thresholds accordion. It owns the stage list and the threshold
 * defaults (moved here from `config-dialog.ts` so the read logic is pure and
 * unit-testable), and projects each stage's current day/night on/off thresholds
 * for both devices, with the default fallback applied.
 *
 * The open accordion stage is projected from Shell `@state`; the two control
 * flags live in the shared environment draft. `entityOptions` is the injected
 * hass adapter for the device pickers.
 *
 * The stage's `dehumKey` / `humKey` (the `DehumidifierStage` / `HumidifierStage`
 * enum *values*) are the threshold-Record keys — distinct from `id` (the display
 * id used for open/toggle); the component echoes the right key back on edit.
 */

import { DehumidifierStage, HumidifierStage } from '../../../types';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import {
  FAN_VPD_STAGE_COLORS,
  FAN_VPD_STAGE_KEYS,
  type FanVpdStageKey,
} from '../../../features/environment/constants';
import type { AcInfinityConflict } from '../components/ac-infinity-conflict';
import {
  buildAcInfinityConflicts,
  buildDuplicatePortWarnings,
  acInfinityRoleLists,
} from './ac-infinity-conflicts';
import type { PortDeviceOption } from './ac-infinity-port-resolver';
import type { AcInfinityDevice } from '../../../slices/growspace/schema';

export type StageThresholds = Record<string, Record<string, { on: number; off: number }>>;

export const DEFAULT_DEHUM_THRESHOLDS: StageThresholds = {
  seedling: { day: { on: 0.5, off: 0.6 }, night: { on: 0.55, off: 0.65 } },
  clone: { day: { on: 0.5, off: 0.6 }, night: { on: 0.55, off: 0.65 } },
  mother: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
  veg: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
  flower_early: { day: { on: 1.1, off: 1.2 }, night: { on: 0.7, off: 0.9 } },
  flower_mid: { day: { on: 1.25, off: 1.35 }, night: { on: 0.9, off: 1.0 } },
  flower_late: { day: { on: 1.35, off: 1.4 }, night: { on: 0.95, off: 1.05 } },
  dry: { day: { on: 0.8, off: 1.0 }, night: { on: 0.85, off: 1.05 } },
  cure: { day: { on: 0.9, off: 1.1 }, night: { on: 0.95, off: 1.15 } },
};

export const DEFAULT_HUM_THRESHOLDS: StageThresholds = {
  seedling: { day: { on: 0.7, off: 0.5 }, night: { on: 0.75, off: 0.55 } },
  clone: { day: { on: 0.7, off: 0.5 }, night: { on: 0.75, off: 0.55 } },
  mother: { day: { on: 0.9, off: 0.7 }, night: { on: 0.85, off: 0.65 } },
  veg: { day: { on: 1.0, off: 0.8 }, night: { on: 0.85, off: 0.65 } },
  flower_early: { day: { on: 1.4, off: 1.2 }, night: { on: 1.0, off: 0.8 } },
  flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
  flower_late: { day: { on: 1.7, off: 1.5 }, night: { on: 1.3, off: 1.1 } },
  dry: { day: { on: 1.2, off: 1.0 }, night: { on: 1.2, off: 1.0 } },
  cure: { day: { on: 1.2, off: 1.0 }, night: { on: 1.2, off: 1.0 } },
};

const DEHUMIDIFIER_STAGE_BY_KEY = {
  seedling: DehumidifierStage.SEEDLING,
  clone: DehumidifierStage.CLONE,
  mother: DehumidifierStage.MOTHER,
  veg: DehumidifierStage.VEG,
  flower_early: DehumidifierStage.EARLY_FLOWER,
  flower_mid: DehumidifierStage.MID_FLOWER,
  flower_late: DehumidifierStage.LATE_FLOWER,
  dry: DehumidifierStage.DRY,
  cure: DehumidifierStage.CURE,
} as const;

const HUMIDIFIER_STAGE_BY_KEY = {
  seedling: HumidifierStage.SEEDLING,
  clone: HumidifierStage.CLONE,
  mother: HumidifierStage.MOTHER,
  veg: HumidifierStage.VEG,
  flower_early: HumidifierStage.EARLY_FLOWER,
  flower_mid: HumidifierStage.MID_FLOWER,
  flower_late: HumidifierStage.LATE_FLOWER,
  dry: HumidifierStage.DRY,
  cure: HumidifierStage.CURE,
} as const;

const HUMIDITY_STAGE_LABELS: Record<FanVpdStageKey, string> = {
  seedling: 'Seedling',
  clone: 'Clone',
  mother: 'Mother',
  veg: 'Vegetative',
  flower_early: 'Early Flower',
  flower_mid: 'Mid Flower',
  flower_late: 'Late Flower',
  dry: 'Drying',
  cure: 'Curing',
};

/** Stage list for the accordion, derived in canonical glossary order. */
export const HUMIDITY_STAGES = FAN_VPD_STAGE_KEYS.map((id) => ({
  id,
  label: HUMIDITY_STAGE_LABELS[id],
  dehum: DEHUMIDIFIER_STAGE_BY_KEY[id],
  hum: HUMIDIFIER_STAGE_BY_KEY[id],
  color: FAN_VPD_STAGE_COLORS[id],
}));

export type HumidityStageId = (typeof HUMIDITY_STAGES)[number]['id'];

/** Day/night on/off threshold values for one device. */
export interface CycleThresholds {
  day: { on: number; off: number };
  night: { on: number; off: number };
}

/** One accordion stage: identity, open state, Record keys, and current values. */
export interface HumidityStageVM {
  id: HumidityStageId;
  label: string;
  color: string;
  open: boolean;
  /** Threshold-Record key (enum value) for the dehumidifier. */
  dehumKey: string;
  /** Threshold-Record key (enum value) for the humidifier. */
  humKey: string;
  dehum: CycleThresholds;
  hum: CycleThresholds;
}

/** Complete render input for `<config-humidity-tab>`. */
export interface HumidityTabViewModel {
  humidifierEntities: string[];
  humidifierOptions: string[];
  dehumidifierEntities: string[];
  dehumidifierOptions: string[];
  humidifierAcInfinityDevices: AcInfinityDevice[];
  dehumidifierAcInfinityDevices: AcInfinityDevice[];
  /** `select.*` entities for AC Infinity mode pickers. */
  acInfinityModeOptions: string[];
  /** `number.*` entities for AC Infinity speed pickers. */
  acInfinitySpeedOptions: string[];
  /** Automated Mode Conflicts for the tab's ports, keyed by `mode_entity`. */
  acInfinityConflicts: Record<string, AcInfinityConflict>;
  /** Port Pre-fill (ADR-0028): pickable `ac_infinity` port devices, shared across both roles. */
  acInfinityPortDevices: PortDeviceOption[];
  /** Device each port derives from its saved `mode_entity` (picker value on reopen). */
  humidifierPortDeviceIds: string[];
  dehumidifierPortDeviceIds: string[];
  /** Roles the last pick failed to resolve, per port index (inline warning). */
  humidifierPrefillWarnings: string[][];
  dehumidifierPrefillWarnings: string[][];
  /** Duplicate Port Warning per port ('' = none) — the port's mode entity is also another role. */
  humidifierDuplicateWarnings: string[];
  dehumidifierDuplicateWarnings: string[];
  humidifierControlEnabled: boolean;
  dehumidifierControlEnabled: boolean;
  stages: HumidityStageVM[];
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface HumidityTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null, platform?: string) => string[];
  /** Hass-reading resolver: a bound mode entity → its conflict, or null if none. */
  acInfinityConflict: (modeEntity: string) => AcInfinityConflict | null;
  /** Hass-reading: the pickable `ac_infinity` port devices for the picker. */
  acInfinityPortDevices: () => PortDeviceOption[];
  /** Hass-reading: the device a saved mode entity belongs to (picker value on reopen). */
  acInfinityPortDeviceId: (modeEntity: string) => string;
  /** Shell-state read: the roles a port's last pick failed to resolve. */
  acInfinityPrefillWarning: (field: string, index: number) => string[];
}

export interface HumidityExpandState {
  openStageId: HumidityStageId | '';
}

const HUMIDIFIER_DOMAINS = [
  'humidifier',
  'switch',
  'input_boolean',
  'sensor',
  'binary_sensor',
  'input_number',
];
const DEHUMIDIFIER_DOMAINS = ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'];

/**
 * One threshold value: the draft's override if present, else the stage default,
 * else 0 (an unknown stage key has no default). The single source of the read
 * logic the inline `_getThresholdValue` / `_getHumidifierThresholdValue` helpers
 * used to own.
 */
export function readThreshold(
  thresholds: StageThresholds | undefined,
  defaults: StageThresholds,
  key: string,
  cycle: string,
  point: 'on' | 'off'
): number {
  return thresholds?.[key]?.[cycle]?.[point] ?? defaults[key]?.[cycle]?.[point] ?? 0;
}

function read(
  thresholds: StageThresholds | undefined,
  defaults: StageThresholds,
  key: string
): CycleThresholds {
  const at = (cycle: string, point: 'on' | 'off') =>
    readThreshold(thresholds, defaults, key, cycle, point);
  return {
    day: { on: at('day', 'on'), off: at('day', 'off') },
    night: { on: at('night', 'on'), off: at('night', 'off') },
  };
}

/**
 * Pure factory: the Config Dialog SM + injected hass adapter + the Shell's three
 * flags → one Humidity tab ViewModel. Testable with no DOM and no host.
 */
export function createHumidityTabViewModel(
  sm: ConfigDialogSM,
  deps: HumidityTabDeps,
  expand: HumidityExpandState
): HumidityTabViewModel {
  const d = sm.environmentDraft;
  const duplicates = buildDuplicatePortWarnings(acInfinityRoleLists(d));
  return {
    humidifierEntities: d.humidifierEntities,
    humidifierOptions: deps.entityOptions(HUMIDIFIER_DOMAINS, null),
    dehumidifierEntities: d.dehumidifierEntities,
    dehumidifierOptions: deps.entityOptions(DEHUMIDIFIER_DOMAINS, null),
    humidifierAcInfinityDevices: d.humidifierAcInfinityDevices,
    dehumidifierAcInfinityDevices: d.dehumidifierAcInfinityDevices,
    acInfinityModeOptions: deps.entityOptions(['select'], null, 'ac_infinity'),
    acInfinitySpeedOptions: deps.entityOptions(['number'], null, 'ac_infinity'),
    acInfinityConflicts: buildAcInfinityConflicts(
      [d.humidifierAcInfinityDevices, d.dehumidifierAcInfinityDevices],
      deps.acInfinityConflict
    ),
    acInfinityPortDevices: deps.acInfinityPortDevices(),
    humidifierPortDeviceIds: d.humidifierAcInfinityDevices.map((dev) =>
      deps.acInfinityPortDeviceId(dev.mode_entity)
    ),
    dehumidifierPortDeviceIds: d.dehumidifierAcInfinityDevices.map((dev) =>
      deps.acInfinityPortDeviceId(dev.mode_entity)
    ),
    humidifierPrefillWarnings: d.humidifierAcInfinityDevices.map((_, i) =>
      deps.acInfinityPrefillWarning('humidifierAcInfinityDevices', i)
    ),
    dehumidifierPrefillWarnings: d.dehumidifierAcInfinityDevices.map((_, i) =>
      deps.acInfinityPrefillWarning('dehumidifierAcInfinityDevices', i)
    ),
    humidifierDuplicateWarnings: duplicates.humidifierAcInfinityDevices,
    dehumidifierDuplicateWarnings: duplicates.dehumidifierAcInfinityDevices,
    humidifierControlEnabled: d.humidifierControlEnabled,
    dehumidifierControlEnabled: d.dehumidifierControlEnabled,
    stages: HUMIDITY_STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      open: expand.openStageId === s.id,
      dehumKey: s.dehum,
      humKey: s.hum,
      dehum: read(d.dehumidifierThresholds, DEFAULT_DEHUM_THRESHOLDS, s.dehum),
      hum: read(d.humidifierThresholds, DEFAULT_HUM_THRESHOLDS, s.hum),
    })),
  };
}
