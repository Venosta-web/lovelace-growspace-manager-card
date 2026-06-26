/**
 * Subareas Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Subareas tab — the list of a
 * growspace's subareas with an inline add form and a per-row confirm-delete.
 * Unlike the env tabs, the subarea *list* is not in the SM or the env draft: it
 * is fetched (`getSubareas`) into the dialog's `_subareas` `@state`, so the list
 * + loading flag are **injected** here. The add/delete navigation is the
 * `tabs.subareas.sub` SM sub-state; the actual backend CRUD (`addSubarea` /
 * `removeSubarea`) and the `<subarea-config-dialog>` edit modal stay in the Shell.
 *
 * The tab needs a selected growspace (env draft, or the Growspaces tab's editing
 * id); when there is none it shows a "select a growspace first" hint.
 */

import type { Subarea } from '../../../slices/subarea';
import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

/** One subarea row — the raw subarea plus whether its delete is being confirmed. */
export interface SubareaRowVM {
  subarea: Subarea;
  confirmingDelete: boolean;
}

/** Complete render input for `<config-subareas-tab>`. */
export interface SubareasTabViewModel {
  /** False → render the "select a growspace first" hint instead of the list. */
  hasGrowspace: boolean;
  /** The inline add form's current name, or null when not adding. */
  adding: { name: string } | null;
  loading: boolean;
  subareas: SubareaRowVM[];
  /** Show the "No subareas configured" empty state (loaded, none present). */
  showEmpty: boolean;
}

/** The fetched list + loading flag the shell injects (its `_subareas` `@state`). */
export interface SubareasTabDeps {
  subareas: Subarea[];
  loading: boolean;
}

/**
 * Pure factory: the Config Dialog SM + the injected list/loading → one Subareas
 * tab ViewModel. Testable with no DOM and no host.
 */
export function createSubareasTabViewModel(
  sm: ConfigDialogSM,
  deps: SubareasTabDeps
): SubareasTabViewModel {
  const envId = sm.environmentDraft.selectedGrowspaceId;
  const gsSub = sm.tabs.growspaces.sub;
  const growspaceId = envId || (gsSub.kind === 'editing' ? gsSub.growspaceId : '');

  const sub = sm.tabs.subareas.sub;
  const adding = sub.kind === 'adding' ? { name: sub.name } : null;
  const confirmId = sub.kind === 'confirm-delete' ? sub.subareaId : null;

  return {
    hasGrowspace: Boolean(growspaceId),
    adding,
    loading: deps.loading,
    subareas: deps.subareas.map((subarea) => ({
      subarea,
      confirmingDelete: confirmId === subarea.id,
    })),
    showEmpty: !deps.loading && deps.subareas.length === 0,
  };
}
