/**
 * UI slice — atoms and mutators for global UI state.
 *
 * Public API (atoms):
 *   viewMode$               — read: active view mode (standard/compact/header/heatmap)
 *   isLoading$              — read: whether the card is in a loading state
 *   activeDialog$           — read: currently open dialog (NONE when closed)
 *   isEditMode$             — read: whether edit mode is active
 *   selectedPlants$         — read: set of selected plant IDs
 *   focusedPlantIndex$      — read: keyboard-focused plant index (-1 = none)
 *   menuOpen$               — read: whether the card menu is open
 *   notification$           — read: active toast notification (null = none)
 *   error$                  — read: global error string (null = none)
 *   defaultApplied$         — read: whether the card config default was applied
 *   gridOverlayMode$        — read: active grid overlay mode
 *   language$               — read: active UI language code
 *   pendingDeepLinkPlantId$ — read: plant ID awaiting deep-link navigation (null = none)
 *   flowerFlipDismissed$    — read: map of growspace ID → dismissed flower-flip date
 *   isCompactView$          — computed: true when viewMode is COMPACT
 *   cardViewState$          — computed: combined view-state object for card subscription
 *
 * Public API (mutators):
 *   setViewMode()           — switch the active view mode
 *   setGridOverlayMode()    — switch the active grid overlay
 *   setIsLoading()          — toggle loading state
 *   openDialog()            — set the active dialog
 *   closeDialog()           — reset dialog to NONE
 *   setEditMode()           — enter/exit edit mode (clears selection on exit)
 *   togglePlantSelection()  — add/remove a plant from the selection set
 *   selectAllPlants()       — replace the selection with all provided IDs
 *   clearPlantSelection()   — empty the selection
 *   deselectPlants()        — remove specific plant IDs from the selection
 *   setFocusedPlantIndex()  — set the keyboard-focus index
 *   setMenuOpen()           — open/close the card menu
 *   showToast()             — display a toast notification
 *   clearToast()            — dismiss the current toast
 *   setDefaultApplied()     — mark the config default as applied
 *   setError()              — set or clear the global error
 *   setLanguage()           — change the UI language
 *   setPendingDeepLink()    — set or clear the pending deep-link plant ID
 *   dismissFlowerFlip()     — record a dismissed flower-flip notification
 *
 * This slice owns no backend calls — all state is local UI-only.
 */

import { atom, computed } from 'nanostores';
import type { GrowspaceViewMode, GridOverlayMode } from '../../types';
import { ViewMode, GridOverlayMode as GridOverlayModeEnum } from '../../constants';
import type { ActiveDialogState } from '../../store/ui/dialog-types';
import { cancel } from '../grid-interaction';
import { devices$, optimisticDeletedPlantIds$, selectedDeviceId$ } from '../grid';
import { WSError } from '../../services/errors';

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const viewMode$ = atom<GrowspaceViewMode>(ViewMode.STANDARD);
export const isLoading$ = atom<boolean>(true);
export const activeDialog$ = atom<ActiveDialogState>({ type: 'NONE' });
export const isEditMode$ = atom<boolean>(false);
export const selectedPlants$ = atom<Set<string>>(new Set());
export const focusedPlantIndex$ = atom<number>(-1);
export const menuOpen$ = atom<boolean>(false);
export const notification$ = atom<{
  message: string;
  type: 'info' | 'error' | 'success';
  action?: { label: string; callback: () => void };
} | null>(null);
export const error$ = atom<string | null>(null);
export const defaultApplied$ = atom<boolean>(false);
export const gridOverlayMode$ = atom<GridOverlayMode>(GridOverlayModeEnum.NONE);
export const language$ = atom<string>('en');
export const pendingDeepLinkPlantId$ = atom<string | null>(null);

/** Map of growspace ID → flower-flip start date that the user has dismissed. */
export const flowerFlipDismissed$ = atom<Record<string, string>>(_loadFlowerFlipDismissed());

// ---------------------------------------------------------------------------
// Computed atoms (public)
// ---------------------------------------------------------------------------

/** True when the active view mode is COMPACT. */
export const isCompactView$ = computed(viewMode$, (mode) => mode === ViewMode.COMPACT);

/** All card-relevant state in one subscription (mirrors GrowspaceUIStore.$cardViewState). */
export const cardViewState$ = computed(
  [
    viewMode$,
    isLoading$,
    isEditMode$,
    isCompactView$,
    activeDialog$,
    notification$,
    focusedPlantIndex$,
    selectedPlants$,
    gridOverlayMode$,
  ],
  (
    viewMode,
    isLoading,
    isEditMode,
    isCompact,
    activeDialog,
    notification,
    focusedPlantIndex,
    selectedPlants,
    overlayMode
  ) => ({
    viewMode,
    isLoading,
    isEditMode,
    isCompact,
    activeDialog,
    notification,
    focusedPlantIndex,
    selectedPlants,
    overlayMode,
  })
);

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _loadFlowerFlipDismissed(): Record<string, string> {
  try {
    const raw = localStorage.getItem('growspace.flowerFlipDismissed');
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // Ignore — localStorage unavailable (SSR / test environments).
  }
  return {};
}

// ---------------------------------------------------------------------------
// Mutators (public)
// ---------------------------------------------------------------------------

/** Switch the active view mode (standard / compact / header / heatmap). */
export function setViewMode(mode: GrowspaceViewMode): void {
  viewMode$.set(mode);
}

/** Switch the active grid overlay (e.g. vpd, ec, none). */
export function setGridOverlayMode(mode: GridOverlayMode): void {
  gridOverlayMode$.set(mode);
}

/** Toggle the header-expanded view: HEADER ⇄ STANDARD. */
export function toggleHeaderExpansion(): void {
  viewMode$.set(viewMode$.get() === ViewMode.HEADER ? ViewMode.STANDARD : ViewMode.HEADER);
}

/** Toggle the loading state. */
export function setIsLoading(loading: boolean): void {
  isLoading$.set(loading);
}

/** Open a dialog. Pass `{ type: 'NONE' }` to close without animation. */
export function openDialog(dialog: ActiveDialogState): void {
  activeDialog$.set(dialog);
}

/** Close the currently open dialog. */
export function closeDialog(): void {
  activeDialog$.set({ type: 'NONE' });
}

/**
 * Enter or exit edit mode.
 *
 * Exiting clears `selectedPlants$` and exits transplant mode so the UI
 * always returns to a clean state when the user leaves edit mode.
 */
export function setEditMode(isEdit: boolean): void {
  isEditMode$.set(isEdit);
  if (!isEdit) {
    selectedPlants$.set(new Set());
    cancel();
  }
}

/** Add a plant to the selection, or remove it if already selected. */
export function togglePlantSelection(plantId: string): void {
  const current = new Set(selectedPlants$.get());
  if (current.has(plantId)) {
    current.delete(plantId);
  } else {
    current.add(plantId);
  }
  selectedPlants$.set(current);
}

/** Replace the entire selection with the provided plant IDs. */
export function selectAllPlants(plantIds: string[]): void {
  selectedPlants$.set(new Set(plantIds));
}

/** Clear the plant selection. */
export function clearPlantSelection(): void {
  selectedPlants$.set(new Set());
}

/**
 * Select every (non-optimistically-deleted) plant in the currently selected
 * device. No-op when no device is selected.
 */
export function selectAllPlantsInSelectedDevice(): void {
  const selectedDevice = selectedDeviceId$.get();
  if (!selectedDevice) return;

  const device = devices$.get().find((d) => d.deviceId === selectedDevice);
  if (!device?.plants) return;

  const deleted = optimisticDeletedPlantIds$.get();
  const allIds = device.plants
    .map((plant) => plant.attributes.plant_id)
    .filter((pId): pId is string => Boolean(pId) && !deleted.has(pId));

  selectAllPlants(allIds);
}

/** Remove specific plant IDs from the selection. */
export function deselectPlants(plantIds: string[]): void {
  const current = new Set(selectedPlants$.get());
  plantIds.forEach((id) => current.delete(id));
  selectedPlants$.set(current);
}

/** Set the keyboard-focused plant index (-1 = none). */
export function setFocusedPlantIndex(index: number): void {
  focusedPlantIndex$.set(index);
}

/** Open or close the card menu. */
export function setMenuOpen(isOpen: boolean): void {
  menuOpen$.set(isOpen);
}

/** Display a toast notification. Defaults to type 'info'. */
export function showToast(
  message: string,
  type: 'info' | 'error' | 'success' = 'info',
  action?: { label: string; callback: () => void }
): void {
  notification$.set({ message, type, ...(action ? { action } : {}) });
}

/** Dismiss the current toast notification. */
export function clearToast(): void {
  notification$.set(null);
}

const WS_ERROR_MESSAGES: Record<string, string> = {
  coordinator_not_ready: 'Integration not loaded — try reloading the page',
  entity_not_found: 'Item not found — it may have been removed',
  validation_failed: 'Invalid input',
  internal_error: 'Internal error',
};

function toUserMessage(e: unknown): string {
  if (e instanceof WSError) return WS_ERROR_MESSAGES[e.code] ?? e.message;
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

/**
 * Surface a failed operation as an error toast.
 *
 * Carries the WSError-code→friendly-message table and `toUserMessage` fallback
 * extracted from the retired `withAction` wrapper, so an inlined `catch` can do
 * `showError(e, 'Failed to remove growspace')` without making the plain
 * `showToast` secretly error-aware. Maps the error to a user message, logs it,
 * and shows `${errorPrefix}: ${message}`.
 */
export function showError(e: unknown, errorPrefix: string): void {
  const message = toUserMessage(e);
  console.error(errorPrefix, e);
  showToast(`${errorPrefix}: ${message}`, 'error');
}

/**
 * Run an async operation and surface its outcome as a toast.
 *
 * The ctx-free successor to the old `withAction(ctx, …)` helper: call sites
 * wrap a slice mutator directly, keeping slices pure of UI concerns. On
 * success shows `opts.success` (when provided); on failure maps the error to
 * a user message, logs it, and shows `${errorPrefix}: ${message}`.
 *
 * Returns the operation's result, or `undefined` when it threw. Pass
 * `rethrow: true` to re-throw after toasting (e.g. when the caller must abort
 * a follow-up step).
 */
export async function withToast<T>(
  fn: () => Promise<T>,
  opts: { success?: string; errorPrefix: string; rethrow?: boolean }
): Promise<T | undefined> {
  try {
    const result = await fn();
    if (opts.success) showToast(opts.success, 'success');
    return result;
  } catch (e: unknown) {
    showError(e, opts.errorPrefix);
    if (opts.rethrow) throw e;
    return undefined;
  }
}

/** Mark whether the card config default has been applied. */
export function setDefaultApplied(applied: boolean): void {
  defaultApplied$.set(applied);
}

/** Set or clear the global error string. */
export function setError(err: string | null): void {
  error$.set(err);
}

/** Update the UI language. */
export function setLanguage(lang: string): void {
  language$.set(lang);
}

/** Set or clear the plant ID awaiting deep-link navigation. */
export function setPendingDeepLink(plantId: string | null): void {
  pendingDeepLinkPlantId$.set(plantId);
}

/**
 * Record that the user dismissed a flower-flip notification for a growspace.
 *
 * Persists to localStorage so the dismissal survives page reloads.
 */
export function dismissFlowerFlip(growspaceId: string, flowerStart: string): void {
  const updated = { ...flowerFlipDismissed$.get(), [growspaceId]: flowerStart };
  flowerFlipDismissed$.set(updated);
  try {
    localStorage.setItem('growspace.flowerFlipDismissed', JSON.stringify(updated));
  } catch {
    // Ignore — localStorage unavailable.
  }
}

// ---------------------------------------------------------------------------
// Test support
// ---------------------------------------------------------------------------

/**
 * Reset every UI atom to its initial value.
 *
 * The slice atoms are module-level singletons, so tests that construct multiple
 * stores (or run in sequence) must reset shared state between cases. Production
 * code never needs this — there is only ever one card instance.
 */
export function __resetUiSliceForTests(): void {
  viewMode$.set(ViewMode.STANDARD);
  isLoading$.set(true);
  activeDialog$.set({ type: 'NONE' });
  isEditMode$.set(false);
  selectedPlants$.set(new Set());
  focusedPlantIndex$.set(-1);
  menuOpen$.set(false);
  notification$.set(null);
  error$.set(null);
  defaultApplied$.set(false);
  gridOverlayMode$.set(GridOverlayModeEnum.NONE);
  language$.set('en');
  pendingDeepLinkPlantId$.set(null);
  flowerFlipDismissed$.set({});
}

// Pure dialog-open helpers (ctx-free) — re-exported so call sites can import the
// full UI-slice surface from one place.
//
// Explicit named re-exports (not `export *`): a star re-export of a module that
// imports back from this barrel (`dialogs.ts` → `./index`) cannot be statically
// analysed, which (a) breaks `vi.mock(..., { spy: true })` automocking and
// (b) makes `importOriginal()` deadlock the cyclic barrel during vitest
// browser-mode collection. Listing the names keeps the graph statically resolvable.
export {
  openPlantOverviewDialog,
  openBatchPrintLabelsDialog,
  openBatchCloneDialog,
  openBatchWateringDialog,
  openBatchTrainingDialog,
  openStrainRecommendationDialog,
  openLogbookDialog,
  openConfigDialog,
  openStrainLibraryDialog,
  openIrrigationDialog,
  openGrowMasterDialog,
  openWateringDialog,
  openTrainingDialog,
  openNutrientsDialog,
  openSnapshotsDialog,
} from './dialogs';
