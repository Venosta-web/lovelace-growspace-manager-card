/**
 * Growspaces Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Growspaces tab — a master/detail
 * collection-CRUD view: the list of growspaces (master) and an add/edit form or
 * a confirm-delete message (detail), driven by the `tabs.growspaces.sub` SM
 * sub-state (`idle | adding | editing | confirm-delete`). Like the Tanks tab this
 * is a hybrid — the *editing* detail form also edits two env-draft multi-selects
 * (lung-room temp + area camera) — but the growspace identity drafts live in the
 * sub-state.
 *
 * **All action buttons (Save / Delete / Cancel / confirm Yes-No) live in the
 * Dialog Shell footer, not here.** So the component emits only navigation +
 * draft-edit intents; the footer (driven by `_submitGrowspaceAndEnv` /
 * `_confirmDeleteGrowspace` / …) owns the writes.
 *
 * The master list (`growspaceOptions`) and the mobile-notify service list are
 * hass/host-derived and injected; `entityOptions` backs the edit form's pickers.
 */

import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

/** One master-list row. */
export interface GrowspaceListItem {
  id: string;
  name: string;
  /** Highlighted when this growspace is being edited. */
  active: boolean;
}

/** The growspace identity draft (add or edit form fields). */
export interface GrowspaceDraft {
  name: string;
  rows: number;
  plantsPerRow: number;
  notificationService: string;
}

/** A `notify.mobile_app_*` service option. */
export interface NotifyService {
  label: string;
  value: string;
}

/** An env-draft multi-select on the edit form (current value + option list). */
export interface EnvMultiSelect {
  value: string[];
  options: string[];
}

/** The detail-pane state — mirrors `GrowspacesSubState` 1:1. */
export type GrowspacesDetailState =
  | { mode: 'idle' }
  | { mode: 'adding'; draft: GrowspaceDraft }
  | { mode: 'editing'; id: string; draft: GrowspaceDraft; lungroom: EnvMultiSelect; camera: EnvMultiSelect }
  | { mode: 'confirm-delete'; name: string };

/** Complete render input for `<config-growspaces-tab>`. */
export interface GrowspacesTabViewModel {
  growspaces: GrowspaceListItem[];
  state: GrowspacesDetailState;
  notifyServices: NotifyService[];
}

/** Hass/host adapters the shell injects so the component stays hass-free. */
export interface GrowspacesTabDeps {
  /** The dialog's `growspaceOptions` map (id → name). */
  growspaceOptions: Record<string, string>;
  /** Mobile-app notify services (from `_getMobileAppNotifyServices`). */
  notifyServices: NotifyService[];
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
}

function draftOf(sub: { name: string; rows: number; plantsPerRow: number; notificationService: string }): GrowspaceDraft {
  return {
    name: sub.name,
    rows: sub.rows,
    plantsPerRow: sub.plantsPerRow,
    notificationService: sub.notificationService,
  };
}

/**
 * Pure factory: the Config Dialog SM + injected adapters → one Growspaces tab
 * ViewModel. Testable with no DOM and no host.
 */
export function createGrowspacesTabViewModel(
  sm: ConfigDialogSM,
  deps: GrowspacesTabDeps
): GrowspacesTabViewModel {
  const sub = sm.tabs.growspaces.sub;
  const editingId = sub.kind === 'editing' ? sub.growspaceId : '';
  const isAdding = sub.kind === 'adding';

  const growspaces = Object.entries(deps.growspaceOptions).map(([id, name]) => ({
    id,
    name,
    active: editingId === id && !isAdding,
  }));

  let state: GrowspacesDetailState;
  if (sub.kind === 'confirm-delete') {
    state = { mode: 'confirm-delete', name: sub.name };
  } else if (sub.kind === 'adding') {
    state = { mode: 'adding', draft: draftOf(sub) };
  } else if (sub.kind === 'editing') {
    const d = sm.environmentDraft;
    state = {
      mode: 'editing',
      id: sub.growspaceId,
      draft: draftOf(sub),
      lungroom: { value: d.lungroomTempSensors, options: deps.entityOptions(['sensor', 'input_number'], 'temperature') },
      camera: { value: d.cameraEntities, options: deps.entityOptions(['camera'], null) },
    };
  } else {
    state = { mode: 'idle' };
  }

  return { growspaces, state, notifyServices: deps.notifyServices };
}
