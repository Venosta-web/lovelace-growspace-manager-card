/**
 * Config Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's Configuration tab — pump
 * entity selection, optional safety caps, behaviour toggles and the manual
 * "Run Now" override. **Mixed source, `$sm`-first**: the config draft
 * (`tabs.config.draft`), the pump-entity drafts (`tabs.schedules.draft`, since
 * the two pump selects persist through the same `save-all` payload) and the
 * `steeringEnabled` gate (`tabs.steering.draft.enabled`) all come from the SM —
 * never duplicated. The pump-entity option list and `hasPump` are host-derived
 * view inputs mirrored into atoms by the container (the `_tankSensorOptions`
 * pattern), so the component never reads `hass`. `hasPump` mirrors the host's
 * `_hasPump` getter verbatim (which reads the *live* `irrigationConfigs$` slice,
 * falling back to the device) so the panel gate stays byte-identical.
 * `isRunningNow` (Run Now button state) is projected from the SM status.
 *
 * The Safety Caps card and the "Skip During Dark" toggle are gated on
 * `steeringEnabled` exactly as the former inline `_renderConfigSection`: Safety
 * Caps shows only when steering is enabled; Skip During Dark only when it is
 * NOT. Both gates are surfaced as VM flags so the component holds no logic.
 *
 * The Config tab is always visible, so it takes no rail-group gate — but it does
 * read `irrigationMethod` (derived from the shared caps atom by the container) to
 * relabel the Pump Configuration section as optional in tank-based mode. Number-
 * string formatting (`String(value)` / `parseFloat`) stays in the component's
 * `render()` so this factory is deterministically testable with no DOM.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { DialogSM, ConfigDraft } from '../../../dialogs/irrigation-dialog-sm';
import type { IrrigationMethod } from './dialog-capabilities';

/** One `<option>` for a pump entity `<select>` (precomputed label). */
export interface PumpEntityOptionVM {
  /** The entity_id, used as the option value + selected comparison. */
  value: string;
  /** "Friendly Name (entity_id)" — the option's display text. */
  label: string;
}

/** Complete render input for `<irrigation-config-tab>`. */
export interface ConfigTabViewModel {
  /** The config draft (cycle caps + behaviour toggles), mirrored from the SM. */
  draft: ConfigDraft;
  /** Selected irrigation pump entity_id (from the schedules draft). */
  irrigationPumpEntity: string;
  /** Selected drain pump entity_id (from the schedules draft). */
  drainPumpEntity: string;
  /** switch/input_boolean entities for the two pump selects (sorted, labelled). */
  pumpEntityOptions: PumpEntityOptionVM[];
  /** True when crop steering is enabled → show Safety Caps, hide Skip-During-Dark. */
  steeringEnabled: boolean;
  /** True when a pump is configured → show Behaviour + Manual Override panels. */
  hasPump: boolean;
  /**
   * Irrigation hardware shape (from the shared caps atom). `'tank'` relabels the
   * Pump Configuration section as optional so a gravity/manual grower doesn't read
   * as half-configured. See CONTEXT.md "Irrigation Method".
   */
  irrigationMethod: IrrigationMethod;
  /** True while a run-now request is in flight (the Run Now `saving` class + label). */
  isRunningNow: boolean;
  /** True while ANY mutation is applying (disables the Run Now button). */
  isApplying: boolean;
}

/**
 * Pure factory: the SM atom (carrying `tabs.config`, `tabs.schedules.draft` and
 * the cross-tab `tabs.steering.draft.enabled`), a `hasPump` atom (mirrored from
 * the host's `_hasPump` getter), and the pump-entity option atom (mirrored from
 * hass by the container) → one Config VM atom. `$sm`-first, mixed source. No
 * `$caps`. Testable with no DOM and no hass.
 */
export function createConfigTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $hasPump: ReadableAtom<boolean>,
  $pumpEntityOptions: ReadableAtom<PumpEntityOptionVM[]>,
  $irrigationMethod: ReadableAtom<IrrigationMethod>
): ReadableAtom<ConfigTabViewModel> {
  return computed(
    [$sm, $hasPump, $pumpEntityOptions, $irrigationMethod],
    (sm, hasPump, pumpEntityOptions, irrigationMethod) => {
      const schedulesDraft = sm.tabs.schedules.draft;
      const isApplying = sm.status.kind === 'applying';
      const isRunningNow = sm.status.kind === 'applying' && sm.status.action === 'run-now';

      return {
        draft: sm.tabs.config.draft,
        irrigationPumpEntity: schedulesDraft.irrigationPumpEntity,
        drainPumpEntity: schedulesDraft.drainPumpEntity,
        pumpEntityOptions,
        steeringEnabled: !!sm.tabs.steering.draft.enabled,
        hasPump,
        irrigationMethod,
        isRunningNow,
        isApplying,
      };
    }
  );
}
