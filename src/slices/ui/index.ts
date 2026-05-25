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
    overlayMode,
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
  }),
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
  action?: { label: string; callback: () => void },
): void {
  notification$.set({ message, type, ...(action ? { action } : {}) });
}

/** Dismiss the current toast notification. */
export function clearToast(): void {
  notification$.set(null);
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
