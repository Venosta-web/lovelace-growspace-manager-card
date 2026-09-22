/**
 * Tanks Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Tanks tab — the list of
 * configured irrigation tanks plus the inline add/edit form. This tab is a
 * **hybrid**: the tank *list* lives in `environmentDraft.irrigationTanks` (so a
 * saved tab rides the [[Environment Change]] like the env-cluster tabs),
 * while the inline-edit *draft* is its own `tabs.tanks.sub` SM sub-state
 * (`idle | adding | editing`, like the Notifications tab). The VM projects both:
 * the formatted rows from the env draft, and the open editor from the sub-state.
 * `entityOptions` is the injected hass adapter for the sensor picker.
 *
 * (Distinct from the Irrigation *dialog*'s `<irrigation-tanks-tab>`, which edits
 * live Tank Levels via the Irrigation slice — see CONTEXT.md "Tank Config vs
 * Tank Levels". This one edits Tank Config in the config dialog's env draft.)
 */

import type { ConfigDialogSM, TankDraftFields } from '../../../dialogs/config-dialog-sm';

/** One configured tank, formatted for the list row. */
export interface TankRowVM {
  index: number;
  /** `tank.name` or the `Tank N` fallback. */
  displayName: string;
  sensorEntity: string;
  volumeLiters: number | null;
  warningLevel: number;
}

/** The open add/edit form's current draft (the SM sub-state's fields). */
export type TankEditVM = TankDraftFields;

/** Complete render input for `<config-tanks-tab>`. */
export interface TanksTabViewModel {
  tanks: TankRowVM[];
  /** The open add/edit form, or null when idle. */
  editing: TankEditVM | null;
  /** Sensor/input_number entity ids for the form's datalist. */
  sensorOptions: string[];
  /** Show the "No tanks configured" line (empty list, idle). */
  showEmpty: boolean;
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface TanksTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
}

/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Tanks tab
 * ViewModel. Testable with no DOM and no host.
 */
export function createTanksTabViewModel(sm: ConfigDialogSM, deps: TanksTabDeps): TanksTabViewModel {
  const tanks = sm.environmentDraft.irrigationTanks;
  const sub = sm.tabs.tanks.sub;
  const editing =
    sub.kind === 'adding' || sub.kind === 'editing'
      ? {
          sensorEntity: sub.sensorEntity,
          name: sub.name,
          volumeLiters: sub.volumeLiters,
          warningLevel: sub.warningLevel,
        }
      : null;
  return {
    tanks: tanks.map((t, i) => ({
      index: i,
      displayName: t.name || `Tank ${i + 1}`,
      sensorEntity: t.sensorEntity,
      volumeLiters: t.volumeLiters ?? null,
      warningLevel: t.warningLevel ?? 30,
    })),
    editing,
    sensorOptions: deps.entityOptions(['sensor', 'input_number'], null),
    showEmpty: tanks.length === 0 && sub.kind === 'idle',
  };
}
