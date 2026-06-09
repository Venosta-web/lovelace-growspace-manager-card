import { WritableAtom, ReadableAtom } from 'nanostores';
import { GrowspaceViewMode, GridOverlayMode } from '../../types';
import { ActiveDialogState } from '../../ui-state';
import * as ui from '../../slices/ui';

/**
 * Thin compatibility shim over the `slices/ui` source of truth.
 *
 * Every atom field below points at the *same* atom instance owned by
 * `slices/ui` — there is no second atom and no second computed anywhere. The
 * class exists only so legacy action-context consumers (`ctx.ui`) keep working;
 * all state and behaviour live in the slice. Mutators delegate to the slice's
 * mutator functions so there is a single definition of each operation.
 *
 * New code should import from `slices/ui` directly rather than reaching through
 * this class.
 */
export class GrowspaceUIStore {
  // Atoms — re-exported instances from slices/ui (single source of truth).
  public readonly $viewMode: WritableAtom<GrowspaceViewMode> = ui.viewMode$;
  public readonly $isLoading: WritableAtom<boolean> = ui.isLoading$;
  public readonly $activeDialog: WritableAtom<ActiveDialogState> = ui.activeDialog$;
  public readonly $isEditMode: WritableAtom<boolean> = ui.isEditMode$;
  public readonly $selectedPlants: WritableAtom<Set<string>> = ui.selectedPlants$;
  public readonly $focusedPlantIndex: WritableAtom<number> = ui.focusedPlantIndex$;
  public readonly $menuOpen: WritableAtom<boolean> = ui.menuOpen$;
  public readonly $notification: WritableAtom<{
    message: string;
    type: 'info' | 'error' | 'success';
    action?: { label: string; callback: () => void };
  } | null> = ui.notification$;

  public readonly $error: WritableAtom<string | null> = ui.error$;
  public readonly $defaultApplied: WritableAtom<boolean> = ui.defaultApplied$;
  public readonly $gridOverlayMode: WritableAtom<GridOverlayMode> = ui.gridOverlayMode$;
  public readonly $language: WritableAtom<string> = ui.language$;
  public readonly $pendingDeepLinkPlantId: WritableAtom<string | null> = ui.pendingDeepLinkPlantId$;
  public readonly $flowerFlipDismissed: WritableAtom<Record<string, string>> =
    ui.flowerFlipDismissed$;

  // Computed — re-exported instances from slices/ui (no recomputation here).
  public readonly $isCompactView: ReadableAtom<boolean> = ui.isCompactView$;
  public readonly $cardViewState: ReadableAtom<{
    viewMode: GrowspaceViewMode;
    isLoading: boolean;
    isEditMode: boolean;
    isCompact: boolean;
    activeDialog: ActiveDialogState;
    notification: {
      message: string;
      type: 'info' | 'error' | 'success';
      action?: { label: string; callback: () => void };
    } | null;
    focusedPlantIndex: number;
    selectedPlants: Set<string>;
    overlayMode: GridOverlayMode;
  }> = ui.cardViewState$;

  // Actions — delegate to slice mutators (single definition of each operation).
  public setViewMode(mode: GrowspaceViewMode) {
    ui.setViewMode(mode);
  }

  public setGridOverlayMode(mode: GridOverlayMode) {
    ui.setGridOverlayMode(mode);
  }

  public setIsLoading(loading: boolean) {
    ui.setIsLoading(loading);
  }

  public setActiveDialog(dialog: ActiveDialogState) {
    ui.openDialog(dialog);
  }

  public closeDialog() {
    ui.closeDialog();
  }

  public setEditMode(isEdit: boolean) {
    ui.setEditMode(isEdit);
  }

  public togglePlantSelection(plantId: string) {
    ui.togglePlantSelection(plantId);
  }

  public selectAllPlants(plantIds: string[]) {
    ui.selectAllPlants(plantIds);
  }

  public clearPlantSelection() {
    ui.clearPlantSelection();
  }

  public deselectPlants(plantIds: string[]) {
    ui.deselectPlants(plantIds);
  }

  public setFocusedPlantIndex(index: number) {
    ui.setFocusedPlantIndex(index);
  }

  public setMenuOpen(isOpen: boolean) {
    ui.setMenuOpen(isOpen);
  }

  public showToast(
    message: string,
    type: 'info' | 'error' | 'success' = 'info',
    action?: { label: string; callback: () => void }
  ) {
    ui.showToast(message, type, action);
  }

  public clearToast() {
    ui.clearToast();
  }

  public setDefaultApplied(applied: boolean) {
    ui.setDefaultApplied(applied);
  }

  public setError(error: string | null) {
    ui.setError(error);
  }

  public setLanguage(lang: string) {
    ui.setLanguage(lang);
  }

  public setPendingDeepLink(plantId: string | null) {
    ui.setPendingDeepLink(plantId);
  }

  public dismissFlowerFlip(growspaceId: string, flowerStart: string) {
    ui.dismissFlowerFlip(growspaceId, flowerStart);
  }
}
