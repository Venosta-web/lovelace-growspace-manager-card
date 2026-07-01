/**
 * Climate Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Climate tab — the heaviest
 * env-cluster tab (Climate Control + the circulation Fan Controller panel + the
 * Exhaust Fan Controller panel). It projects its slice of the [[Shared
 * Environment Draft]] and folds in the mode/toggle-conditional view logic the
 * panels need: which target+tolerance pair is live, the "Fallback VPD Target"
 * relabel, disabled greying, and which collapsible sub-sections show.
 *
 * Two hass/shell dependencies are injected so the dumb component stays free of
 * both: `entityOptions` (the shell's hass-reading `_getEntities`) supplies the
 * fan-entity picker lists, and `expand` carries the two collapsible-section
 * toggles. Those toggles are **Shell `@state`**, not SM state — ephemeral
 * accordion/expander state stays on the shell and is projected in here, the
 * same pattern the still-inline humidity/VPD accordions use
 * (`_openHumidityStageId`); only draft/edit state goes to the SM. See ADR-0019.
 */

import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import type {
  AcInfinityDevice,
  CirculationFanConfig,
  ExhaustFanConfig,
} from '../../../slices/growspace/schema';

export type FanRegulationMode = 'vpd' | 'humidity' | 'temperature';

/** Entity domains for the two Climate-tab fan pickers (deviceClass is null). */
const EXHAUST_FAN_DOMAINS = ['fan', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'];
const CIRCULATION_FAN_DOMAINS = ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'];

/** Climate Control section: fan entity pickers, thresholds, remove-environment gate. */
export interface ClimateControlVM {
  exhaustFanEntities: string[];
  exhaustFanOptions: string[];
  circulationFanEntities: string[];
  circulationFanOptions: string[];
  exhaustFanAcInfinityDevices: AcInfinityDevice[];
  circulationFanAcInfinityDevices: AcInfinityDevice[];
  /** `select.*` entities for AC Infinity mode pickers (shared across both roles). */
  acInfinityModeOptions: string[];
  /** `number.*` entities for AC Infinity speed pickers. */
  acInfinitySpeedOptions: string[];
  stressThreshold: number;
  moldThreshold: number;
  /** Remove Environment is enabled only when a growspace is selected. */
  canRemoveEnvironment: boolean;
}

/** Circulation Fan Controller panel view state (config + derived gates). */
export interface FanPanelVM {
  config: CirculationFanConfig;
  /** Greyed-out (pointer-events:none) when the controller is disabled. */
  disabled: boolean;
  mode: FanRegulationMode;
  /** The Stage-Aware VPD toggle shows only in VPD mode. */
  showStageVpd: boolean;
  /** The stage-vpd-overrides-table shows in VPD mode with the toggle on. */
  showStageVpdTable: boolean;
  /** "Fallback VPD Target (kPa)" when stage-aware, else "VPD Target (kPa)". */
  vpdTargetLabel: string;
  /** The VPD target field is dimmed while stage-aware overrides drive it. */
  vpdTargetDimmed: boolean;
  /** The Temperature Override expander shows only in VPD mode. */
  showTempOverride: boolean;
  /** Expander open state — Shell `@state`, projected in. */
  tempOverrideExpanded: boolean;
  /** The wind period/amplitude pair shows when wind is enabled. */
  showWind: boolean;
}

/** Exhaust Fan Controller panel view state. No regulation mode (combined demand). */
export interface ExhaustPanelVM {
  config: ExhaustFanConfig;
  disabled: boolean;
  /** Stage-Aware VPD is always available here (no VPD-mode gate). */
  showStageVpdTable: boolean;
  vpdTargetLabel: string;
  vpdTargetDimmed: boolean;
  /** Critical-Temperature expander open state — Shell `@state`, projected in. */
  criticalTempExpanded: boolean;
}

/** Complete render input for `<config-climate-tab>`. */
export interface ClimateTabViewModel {
  control: ClimateControlVM;
  fan: FanPanelVM;
  exhaust: ExhaustPanelVM;
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface ClimateTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
}

/** The two Shell-`@state` expander flags, projected into the VM. */
export interface ClimateExpandState {
  fanTempOverrideExpanded: boolean;
  exhaustCriticalTempExpanded: boolean;
}

function vpdLabel(stageVpdEnabled: boolean): string {
  return stageVpdEnabled ? 'Fallback VPD Target (kPa)' : 'VPD Target (kPa)';
}

/**
 * Pure factory: the Config Dialog SM + injected hass adapter + the Shell's two
 * expander flags → one Climate tab ViewModel. Testable with no DOM and no host.
 */
export function createClimateTabViewModel(
  sm: ConfigDialogSM,
  deps: ClimateTabDeps,
  expand: ClimateExpandState
): ClimateTabViewModel {
  const d = sm.environmentDraft;
  const fan = d.circulationFanConfig;
  const exhaust = d.exhaustFanConfig;
  const mode = fan.regulation_mode as FanRegulationMode;

  return {
    control: {
      exhaustFanEntities: d.exhaustFanEntities,
      exhaustFanOptions: deps.entityOptions(EXHAUST_FAN_DOMAINS, null),
      circulationFanEntities: d.circulationFanEntities,
      circulationFanOptions: deps.entityOptions(CIRCULATION_FAN_DOMAINS, null),
      exhaustFanAcInfinityDevices: d.exhaustFanAcInfinityDevices,
      circulationFanAcInfinityDevices: d.circulationFanAcInfinityDevices,
      acInfinityModeOptions: deps.entityOptions(['select'], null),
      acInfinitySpeedOptions: deps.entityOptions(['number'], null),
      stressThreshold: d.stressThreshold,
      moldThreshold: d.moldThreshold,
      canRemoveEnvironment: Boolean(d.selectedGrowspaceId),
    },
    fan: {
      config: fan,
      disabled: !fan.enabled,
      mode,
      showStageVpd: mode === 'vpd',
      showStageVpdTable: mode === 'vpd' && fan.stage_vpd_enabled,
      vpdTargetLabel: vpdLabel(fan.stage_vpd_enabled),
      vpdTargetDimmed: fan.stage_vpd_enabled,
      showTempOverride: mode === 'vpd',
      tempOverrideExpanded: expand.fanTempOverrideExpanded,
      showWind: fan.wind_enabled,
    },
    exhaust: {
      config: exhaust,
      disabled: !exhaust.enabled,
      showStageVpdTable: exhaust.stage_vpd_enabled,
      vpdTargetLabel: vpdLabel(exhaust.stage_vpd_enabled),
      vpdTargetDimmed: exhaust.stage_vpd_enabled,
      criticalTempExpanded: expand.exhaustCriticalTempExpanded,
    },
  };
}
