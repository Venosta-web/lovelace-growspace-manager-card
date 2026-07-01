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
 * Three Shell-`@state` inputs are projected in (not SM state, per the ADR-0019
 * carve-out): the open accordion stage and the two control-enable flags
 * (`_humidifierControlEnabled` / `_dehumidifierControlEnabled`, which are also
 * the [[Environment Save Composer]]'s `controlFlags`). `entityOptions` is the
 * injected hass adapter for the device pickers.
 *
 * The stage's `dehumKey` / `humKey` (the `DehumidifierStage` / `HumidifierStage`
 * enum *values*) are the threshold-Record keys — distinct from `id` (the display
 * id used for open/toggle); the component echoes the right key back on edit.
 */

import { DehumidifierStage, HumidifierStage } from '../../../types';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import type { AcInfinityDevice } from '../../../slices/growspace/schema';

export type StageThresholds = Record<string, Record<string, { on: number; off: number }>>;

export const DEFAULT_DEHUM_THRESHOLDS: StageThresholds = {
  seedling: { day: { on: 0.5, off: 0.6 }, night: { on: 0.55, off: 0.65 } },
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
  mother: { day: { on: 0.9, off: 0.7 }, night: { on: 0.85, off: 0.65 } },
  veg: { day: { on: 1.0, off: 0.8 }, night: { on: 0.85, off: 0.65 } },
  flower_early: { day: { on: 1.4, off: 1.2 }, night: { on: 1.0, off: 0.8 } },
  flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
  flower_late: { day: { on: 1.7, off: 1.5 }, night: { on: 1.3, off: 1.1 } },
  dry: { day: { on: 1.2, off: 1.0 }, night: { on: 1.2, off: 1.0 } },
  cure: { day: { on: 1.2, off: 1.0 }, night: { on: 1.2, off: 1.0 } },
};

/** Stage list for the accordion — maps display id → both stage enums + colour. */
export const HUMIDITY_STAGES = [
  { id: 'seedling', label: 'Seedling', dehum: DehumidifierStage.SEEDLING, hum: HumidifierStage.SEEDLING, color: '#8bc34a' },
  { id: 'mother', label: 'Mother', dehum: DehumidifierStage.MOTHER, hum: HumidifierStage.MOTHER, color: '#e91e63' },
  { id: 'veg', label: 'Vegetative', dehum: DehumidifierStage.VEG, hum: HumidifierStage.VEG, color: '#4caf50' },
  { id: 'early_flower', label: 'Early Flower', dehum: DehumidifierStage.EARLY_FLOWER, hum: HumidifierStage.EARLY_FLOWER, color: '#ff9800' },
  { id: 'mid_flower', label: 'Mid Flower', dehum: DehumidifierStage.MID_FLOWER, hum: HumidifierStage.MID_FLOWER, color: '#ff7043' },
  { id: 'late_flower', label: 'Late Flower', dehum: DehumidifierStage.LATE_FLOWER, hum: HumidifierStage.LATE_FLOWER, color: '#f44336' },
  { id: 'drying', label: 'Drying', dehum: DehumidifierStage.DRY, hum: HumidifierStage.DRY, color: '#9c27b0' },
  { id: 'curing', label: 'Curing', dehum: DehumidifierStage.CURE, hum: HumidifierStage.CURE, color: '#2196f3' },
] as const;

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
  humidifierControlEnabled: boolean;
  dehumidifierControlEnabled: boolean;
  stages: HumidityStageVM[];
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface HumidityTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
}

/** The three Shell-`@state` flags projected into the VM. */
export interface HumidityExpandState {
  humidifierControlEnabled: boolean;
  dehumidifierControlEnabled: boolean;
  openStageId: HumidityStageId | '';
}

const HUMIDIFIER_DOMAINS = ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'];
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
  return {
    humidifierEntities: d.humidifierEntities,
    humidifierOptions: deps.entityOptions(HUMIDIFIER_DOMAINS, null),
    dehumidifierEntities: d.dehumidifierEntities,
    dehumidifierOptions: deps.entityOptions(DEHUMIDIFIER_DOMAINS, null),
    humidifierAcInfinityDevices: d.humidifierAcInfinityDevices,
    dehumidifierAcInfinityDevices: d.dehumidifierAcInfinityDevices,
    acInfinityModeOptions: deps.entityOptions(['select'], null),
    acInfinitySpeedOptions: deps.entityOptions(['number'], null),
    humidifierControlEnabled: expand.humidifierControlEnabled,
    dehumidifierControlEnabled: expand.dehumidifierControlEnabled,
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
