/**
 * Irrigation Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Irrigation tab — two sections
 * of monitoring-sensor pickers (Irrigation Monitoring + Substrate EC). The
 * simplest env-cluster tab: every field is a multi-entity select projecting its
 * slice of the [[Shared Environment Draft]], so the VM just pairs each draft
 * field with its injected option list (the same shape as the Sensors tab).
 */

import type { ConfigDialogSM, EnvironmentDraft } from '../../../dialogs/config-dialog-sm';

/** The draft keys the Irrigation tab owns — all `string[]` multi-selects. */
export type IrrigationFieldKey =
  | 'phSensors'
  | 'feedEcSensors'
  | 'runoffEcSensors'
  | 'drainVolumeSensors'
  | 'irrigationFlowSensors'
  | 'powerSensors'
  | 'energySensors'
  | 'bulkEcSensors'
  | 'poreEcSensors';

interface FieldDef {
  key: IrrigationFieldKey;
  label: string;
  deviceClass: string | null;
}

const SENSOR_DOMAINS = ['sensor', 'input_number', 'number'];

/** Irrigation Monitoring section fields, in display order. */
const MONITORING_FIELDS: readonly FieldDef[] = [
  { key: 'phSensors', label: 'pH Sensors', deviceClass: null },
  { key: 'feedEcSensors', label: 'Feed EC Sensors', deviceClass: null },
  { key: 'runoffEcSensors', label: 'Runoff EC Sensors', deviceClass: null },
  { key: 'drainVolumeSensors', label: 'Drain Volume Sensors', deviceClass: null },
  { key: 'irrigationFlowSensors', label: 'Irrigation Flow Sensors', deviceClass: null },
  { key: 'powerSensors', label: 'Power Sensors', deviceClass: 'power' },
  { key: 'energySensors', label: 'Energy Sensors', deviceClass: 'energy' },
] as const;

/** Substrate EC section fields, in display order. */
const SUBSTRATE_FIELDS: readonly FieldDef[] = [
  { key: 'bulkEcSensors', label: 'Bulk EC Sensors', deviceClass: null },
  { key: 'poreEcSensors', label: 'Pore EC Sensors', deviceClass: null },
] as const;

/** One rendered multi-select picker: identity + current value + option list. */
export interface IrrigationFieldVM {
  key: IrrigationFieldKey;
  label: string;
  value: string[];
  options: string[];
}

/** Complete render input for `<config-irrigation-tab>`. */
export interface IrrigationTabViewModel {
  monitoring: IrrigationFieldVM[];
  substrate: IrrigationFieldVM[];
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface IrrigationTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
}

function project(
  draft: EnvironmentDraft,
  deps: IrrigationTabDeps,
  fields: readonly FieldDef[]
): IrrigationFieldVM[] {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    value: draft[f.key],
    options: deps.entityOptions(SENSOR_DOMAINS, f.deviceClass),
  }));
}

/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Irrigation
 * tab ViewModel. Testable with no DOM and no host.
 */
export function createIrrigationTabViewModel(
  sm: ConfigDialogSM,
  deps: IrrigationTabDeps
): IrrigationTabViewModel {
  const draft = sm.environmentDraft;
  return {
    monitoring: project(draft, deps, MONITORING_FIELDS),
    substrate: project(draft, deps, SUBSTRATE_FIELDS),
  };
}
