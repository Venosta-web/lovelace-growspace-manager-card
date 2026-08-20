/**
 * VPD Targets Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's VPD Targets tab — a per-stage
 * accordion of day/night low/high VPD-optimal windows. Mirrors the Humidity
 * tab's accordion shape: it projects each [[Fan VPD Stage]]'s current values
 * (the `vpdOptimalOverrides` draft slice, with the shared `VPD_OPTIMAL_STAGE_DEFAULTS`
 * fallback) plus the open-accordion flag (Shell `@state`, per the ADR-0019
 * carve-out). No hass dependency — every field is a number input.
 *
 * The stage list, labels, and defaults live in `features/environment/constants`;
 * the stage-dot colours moved here from `config-dialog.ts`.
 */

import {
  FAN_VPD_STAGE_KEYS,
  FAN_VPD_STAGE_LABELS,
  FAN_VPD_STAGE_COLORS,
  VPD_OPTIMAL_STAGE_DEFAULTS,
  type FanVpdStageKey,
  type VpdOptimalOverrides,
} from '../../../features/environment/constants';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

/**
 * One VPD-optimal value: the draft override if present, else the stage default.
 * The read logic the inline `_getVpdOptimalValue` helper used to own.
 */
export function getVpdOptimal(
  overrides: VpdOptimalOverrides,
  key: FanVpdStageKey,
  period: 'day' | 'night',
  slot: 'low' | 'high'
): number {
  return overrides[key]?.[period]?.[slot] ?? VPD_OPTIMAL_STAGE_DEFAULTS[key][period][slot];
}

/** Low/high VPD window for one period (day or night). */
export interface VpdPeriodTargets {
  low: number;
  high: number;
}

/** One accordion stage: identity, open state, and current day/night windows. */
export interface VpdStageVM {
  key: FanVpdStageKey;
  label: string;
  color: string;
  open: boolean;
  day: VpdPeriodTargets;
  night: VpdPeriodTargets;
}

/** Complete render input for `<config-vpd-targets-tab>`. */
export interface VpdTargetsTabViewModel {
  stages: VpdStageVM[];
}

/** The Shell-`@state` open-accordion flag, projected into the VM. */
export interface VpdTargetsExpandState {
  openStageId: FanVpdStageKey | '';
}

/**
 * Pure factory: the Config Dialog SM + the Shell's open-accordion flag → one VPD
 * Targets ViewModel. No hass adapter (all number inputs). Testable with no DOM.
 */
export function createVpdTargetsTabViewModel(
  sm: ConfigDialogSM,
  expand: VpdTargetsExpandState
): VpdTargetsTabViewModel {
  const overrides = sm.environmentDraft.vpdOptimalOverrides as VpdOptimalOverrides;
  return {
    stages: FAN_VPD_STAGE_KEYS.map((key) => ({
      key,
      label: FAN_VPD_STAGE_LABELS[key],
      color: FAN_VPD_STAGE_COLORS[key],
      open: expand.openStageId === key,
      day: {
        low: getVpdOptimal(overrides, key, 'day', 'low'),
        high: getVpdOptimal(overrides, key, 'day', 'high'),
      },
      night: {
        low: getVpdOptimal(overrides, key, 'night', 'low'),
        high: getVpdOptimal(overrides, key, 'night', 'high'),
      },
    })),
  };
}
