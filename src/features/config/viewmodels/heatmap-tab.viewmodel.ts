/**
 * Heatmap Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's 3D-Heatmap tab — the list of
 * sensor groups for the spatial heatmap. The group *list* lives in
 * `environmentDraft.sensorGroups` (so add/delete ride the [[Environment Save
 * Composer]] via `UPDATE_ENV_DRAFT`); the actual group *editing* happens in the
 * separate `<sensor-group-dialog>` modal the Dialog Shell renders on the
 * `heatmap.sub` = `editing-group` SM sub-state — not in this tab. So this VM only
 * projects the list, and the component only navigates (add/edit/delete intents).
 */

import type { SensorGroup } from '../../../types';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

/** Complete render input for `<config-heatmap-tab>`. */
export interface HeatmapTabViewModel {
  groups: SensorGroup[];
  /** Show the "No sensor groups configured" empty state. */
  showEmpty: boolean;
}

/**
 * Pure factory: the Config Dialog SM → one Heatmap tab ViewModel. No hass
 * dependency. Testable with no DOM and no host.
 */
export function createHeatmapTabViewModel(sm: ConfigDialogSM): HeatmapTabViewModel {
  const groups = sm.environmentDraft.sensorGroups;
  return { groups, showEmpty: groups.length === 0 };
}
