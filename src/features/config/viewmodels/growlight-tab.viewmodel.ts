/**
 * Grow Light Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Growlights tab — the grow light
 * controller panel (enable, power, sunrise) plus the plain-entity and AC Infinity
 * configurator pickers. Projects its slice of the [[Shared Environment Draft]].
 *
 * `entityOptions` is the injected hass adapter for the pickers. `lightsOnTime`
 * is the growspace's crop-steering anchor, shown read-only here — it is edited on
 * the Irrigation → Steering tab (its canonical home), so this tab does not own it.
 */

import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';
import type { AcInfinityGrowLight } from '../../../slices/growspace/schema';

/** Complete render input for `<config-growlight-tab>`. */
export interface GrowlightTabViewModel {
  enabled: boolean;
  power: number;
  sunriseEnabled: boolean;
  sunriseMinutes: number;
  /** Greyed-out (pointer-events:none) when the controller is disabled. */
  disabled: boolean;
  growlightEntities: string[];
  /** Plain dimmable/on-off grow light entities (switch/light/fan/input_boolean). */
  growlightEntityOptions: string[];
  acInfinityDevices: AcInfinityGrowLight[];
  /** `select.*` entities for the Active Mode picker. */
  modeOptions: string[];
  /** `time.*` entities for the on/off schedule pickers. */
  timeOptions: string[];
  /** `number.*` entities for the on_power and sunrise-duration pickers. */
  numberOptions: string[];
  /** `switch.*` entities for the sunrise-enable picker. */
  switchOptions: string[];
  /** Read-only lights-on anchor (edited on Irrigation → Steering); null if unknown. */
  lightsOnTime: string | null;
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface GrowlightTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
  /** The growspace's crop-steering lights-on time, shown read-only. */
  lightsOnTime?: string | null;
}

const PLAIN_GROWLIGHT_DOMAINS = ['switch', 'light', 'fan', 'input_boolean'];

/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Growlights tab
 * ViewModel. Testable with no DOM and no host.
 */
export function createGrowlightTabViewModel(
  sm: ConfigDialogSM,
  deps: GrowlightTabDeps
): GrowlightTabViewModel {
  const d = sm.environmentDraft;
  const cfg = d.growlightConfig;
  return {
    enabled: cfg.enabled,
    power: cfg.power,
    sunriseEnabled: cfg.sunrise_enabled,
    sunriseMinutes: cfg.sunrise_minutes,
    disabled: !cfg.enabled,
    growlightEntities: d.growlightEntities,
    growlightEntityOptions: deps.entityOptions(PLAIN_GROWLIGHT_DOMAINS, null),
    acInfinityDevices: d.growlightAcInfinityDevices,
    modeOptions: deps.entityOptions(['select'], null),
    timeOptions: deps.entityOptions(['time'], null),
    numberOptions: deps.entityOptions(['number'], null),
    switchOptions: deps.entityOptions(['switch'], null),
    lightsOnTime: deps.lightsOnTime ?? null,
  };
}
