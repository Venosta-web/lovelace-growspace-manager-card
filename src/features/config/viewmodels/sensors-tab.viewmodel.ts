/**
 * Sensors Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Sensors tab — the first
 * env-cluster tab. It projects its slice of the [[Shared Environment Draft]]
 * (the air + monitoring sensor selections) and the live "Leaf Surface
 * Temperature" VPD readout into one render input for `<config-sensors-tab>`.
 *
 * The Sensors tab is hass-dependent in two ways the dumb component must not
 * touch: the entity pickers need entity-id option lists, and the LST section
 * shows a live VPD computed from the selected sensors' current values. Both are
 * injected as `SensorsTabDeps` adapters — the shell supplies `entityOptions`
 * (its hass-reading `_getEntities`) and `averageSensorValue` (its
 * `_averageSensorValue`). The factory does the per-field option lookup and the
 * VPD derivation itself, so the derivation stays the test surface (inject fakes,
 * assert the VM) and no `hass` enters the component.
 */

import { calculateVpdWithLstOffset } from '../../../utils/vpd-calc';
import {
  CLASSIFICATION_LABELS,
  bandValidationError,
  classifyReading,
  effectiveBand,
  parseReading,
  type MoistureClassification,
} from '../moisture-band';
import type { EnvironmentDraft, ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

/** The draft keys the Sensors tab owns — each a `<datalist>`-backed entity picker. */
export type SensorFieldKey =
  | 'temperatureSensors'
  | 'humiditySensors'
  | 'vpdSensors'
  | 'soilMoistureSensor'
  | 'co2Sensor'
  | 'lightSensors'
  | 'substrateTemperatureSensors';

/** Static config for one sensor field — domains/deviceClass drive the option lookup. */
interface SensorFieldDef {
  key: SensorFieldKey;
  label: string;
  multi: boolean;
  domains: string[];
  deviceClass: string | null;
}

/** Field set + display order, transcribed verbatim from the former inline render. */
const SENSOR_FIELDS: readonly SensorFieldDef[] = [
  {
    key: 'temperatureSensors',
    label: 'Temperature Sensors',
    multi: true,
    domains: ['sensor', 'input_number'],
    deviceClass: 'temperature',
  },
  {
    key: 'humiditySensors',
    label: 'Humidity Sensors',
    multi: true,
    domains: ['sensor', 'input_number'],
    deviceClass: 'humidity',
  },
  {
    key: 'vpdSensors',
    label: 'VPD Sensors (Optional)',
    multi: true,
    domains: ['sensor', 'input_number'],
    deviceClass: 'pressure',
  },
  {
    key: 'soilMoistureSensor',
    label: 'Soil Moisture Sensor',
    multi: false,
    domains: ['sensor', 'input_number'],
    deviceClass: 'moisture',
  },
  {
    key: 'co2Sensor',
    label: 'CO₂ Sensor',
    multi: false,
    domains: ['sensor', 'input_number'],
    deviceClass: 'carbon_dioxide',
  },
  {
    key: 'lightSensors',
    label: 'Light Source / Sensor',
    multi: true,
    domains: ['switch', 'light', 'input_boolean', 'sensor'],
    deviceClass: null,
  },
  {
    key: 'substrateTemperatureSensors',
    label: 'Substrate Temperature Sensors',
    multi: true,
    domains: ['sensor', 'input_number'],
    deviceClass: 'temperature',
  },
] as const;

/** One rendered sensor picker: identity + current value + the option list. */
export interface SensorFieldVM {
  key: SensorFieldKey;
  label: string;
  multi: boolean;
  /** `string[]` when `multi`, else `string`. */
  value: string[] | string;
  options: string[];
}

/**
 * The Acceptable Moisture Band section, present only when a soil-moisture
 * sensor is configured. Its prerequisite is that sensor alone — never pump or
 * tank hardware.
 */
export interface MoistureBandVM {
  /** Displayed bounds. Equal to the defaults while the band is inherited. */
  min: number;
  max: number;
  /**
   * The draft's actual stored bounds, before any default is substituted for
   * display. Edits must be applied to *these* — reconstructing the pair from
   * the displayed values would silently turn a cleared bound into the default
   * the user was only being shown.
   */
  rawMin: number | null;
  rawMax: number | null;
  /** False when showing the inherited defaults rather than a saved override. */
  isCustom: boolean;
  /** Step for the numeric inputs, per the 0.1% decimal requirement. */
  step: number;
  /** Validation message for an incomplete or out-of-range pair, else null. */
  error: string | null;
  /** True when the pair is savable (a complete valid pair, or a clean clear). */
  canSave: boolean;
  /**
   * Live classification of the current reading, or null when no valid reading
   * exists — an unavailable sensor omits the preview without blocking config.
   */
  preview: { classification: MoistureClassification; label: string; reading: number } | null;
  /**
   * Set when the sensor explicitly reports a non-percentage unit. The band
   * cannot be interpreted for it, so the controls are not offered.
   */
  incompatibleUnit: string | null;
}

/** The Leaf Surface Temperature offset section, present only when its gate is met. */
export interface LstVM {
  offset: number;
  /** Live VPD readout, e.g. "0.85 kPa" or "—" when sensors report nothing. */
  vpdDisplay: string;
}

/** Complete render input for `<config-sensors-tab>`. */
export interface SensorsTabViewModel {
  /** The seven entity pickers, in display order. */
  fields: SensorFieldVM[];
  /** The LST offset + live VPD readout, or null when the gate isn't met. */
  lst: LstVM | null;
  /** The Acceptable Moisture Band, or null when no moisture sensor is set. */
  moistureBand: MoistureBandVM | null;
}

/** Hass-reading adapters the shell injects so the component stays hass-free. */
export interface SensorsTabDeps {
  /** Entity-ids matching the given domains (+ optional device_class), sorted. */
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
  /** Average current value of the given entities, or null when none report. */
  averageSensorValue: (entityIds: string[]) => number | null;
  /**
   * Current reading + unit for one entity, or null when it is missing or
   * unavailable. The unit decides whether the band can be interpreted at all:
   * `null` unit is the legacy no-metadata case and stays supported.
   */
  sensorReading: (entityId: string) => { value: string | null; unit: string | null } | null;
}

function deriveLst(draft: EnvironmentDraft, deps: SensorsTabDeps): LstVM | null {
  const hasTemp = draft.temperatureSensors.length > 0;
  const hasHumidity = draft.humiditySensors.length > 0;
  const hasHardwareVpd = draft.vpdSensors.some((id) => !id.includes('calculated_vpd'));
  if (!hasTemp || !hasHumidity || hasHardwareVpd) return null;

  const avgTemp = deps.averageSensorValue(draft.temperatureSensors);
  const avgHumidity = deps.averageSensorValue(draft.humiditySensors);
  const vpd =
    avgTemp != null && avgHumidity != null
      ? calculateVpdWithLstOffset(avgTemp, avgHumidity, draft.lstOffset)
      : null;
  return { offset: draft.lstOffset, vpdDisplay: vpd != null ? `${vpd} kPa` : '—' };
}

function deriveMoistureBand(draft: EnvironmentDraft, deps: SensorsTabDeps): MoistureBandVM | null {
  // Sensor-only prerequisite: the band is about interpreting that sensor's
  // readings, so pump/tank hardware never gates it.
  if (!draft.soilMoistureSensor) return null;

  const pair = { min: draft.soilMoistureMin, max: draft.soilMoistureMax };
  const band = effectiveBand(pair);
  const reading = deps.sensorReading(draft.soilMoistureSensor);

  // A unit that is present and not '%' is an explicit statement that this
  // sensor measures something else. No unit at all is the legacy case.
  const unit = reading?.unit ?? null;
  const incompatibleUnit = unit !== null && unit.trim() !== '%' ? unit : null;
  if (incompatibleUnit) {
    return {
      min: band.min,
      max: band.max,
      rawMin: pair.min,
      rawMax: pair.max,
      isCustom: band.isCustom,
      step: 0.1,
      error: null,
      canSave: true,
      preview: null,
      incompatibleUnit,
    };
  }

  const value = parseReading(reading?.value);
  const classification = value !== null ? classifyReading(value, band) : null;

  return {
    min: band.min,
    max: band.max,
    rawMin: pair.min,
    rawMax: pair.max,
    isCustom: band.isCustom,
    step: 0.1,
    error: bandValidationError(pair),
    canSave: bandValidationError(pair) === null,
    preview:
      value !== null && classification !== null
        ? { classification, label: CLASSIFICATION_LABELS[classification], reading: value }
        : null,
    incompatibleUnit: null,
  };
}

/**
 * Pure factory: the Config Dialog SM + the injected hass adapters → one Sensors
 * tab ViewModel. Testable with no DOM and no host (inject fake adapters).
 */
export function createSensorsTabViewModel(
  sm: ConfigDialogSM,
  deps: SensorsTabDeps
): SensorsTabViewModel {
  const draft = sm.environmentDraft;
  const fields = SENSOR_FIELDS.map((def) => ({
    key: def.key,
    label: def.label,
    multi: def.multi,
    value: draft[def.key],
    options: deps.entityOptions(def.domains, def.deviceClass),
  }));
  return { fields, lst: deriveLst(draft, deps), moistureBand: deriveMoistureBand(draft, deps) };
}
