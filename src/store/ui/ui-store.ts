import { WritableAtom, ReadableAtom, atom, computed } from 'nanostores';
import { GrowspaceViewMode, GridOverlayMode } from '../../types';
import { ActiveDialogState } from '../../ui-state';
import { ViewMode } from '../../constants';
import { VIEW_MODE_LAYOUT_MAP, type LayoutSpec } from '../../slices/ui/layout-spec';
import * as ui from '../../slices/ui';

/**
 * Thin compatibility shim over the `slices/ui` source of truth.
 *
 * Most atom fields below point at the *same* atom instance owned by
 * `slices/ui`. The exception is view-mode state (`$viewMode` and everything
 * computed from it), which is owned *per instance* here: the active view mode
 * (standard / compact / header / heatmap) is a property of a single card on the
 * dashboard, not the page. Each card on a dashboard gets its own `$viewMode`,
 * so expanding/collapsing one card no longer drags the others with it.
 *
 * New code should import the genuinely page-global state from `slices/ui`
 * directly, but reach view mode through the per-card store (this class).
 */
export class GrowspaceUIStore {
  // View-mode state — owned per instance (NOT shared via slices/ui), so each
  // card on the dashboard expands/collapses independently.
  public readonly $viewMode: WritableAtom<GrowspaceViewMode> = atom(ViewMode.STANDARD);

  // Atoms — re-exported instances from slices/ui (single source of truth).
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

  // Computed — derived from this instance's $viewMode so the layout each card
  // renders follows its own view mode, not a shared one.
  public readonly $isCompactView: ReadableAtom<boolean> = computed(
    this.$viewMode,
    (mode) => mode === ViewMode.COMPACT
  );

  /** LayoutSpec for this card's active view mode (drives <growspace-view>). */
  public readonly $layoutSpec: ReadableAtom<LayoutSpec> = computed(
    this.$viewMode,
    (mode) => VIEW_MODE_LAYOUT_MAP[mode]
  );

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
  }> = computed(
    [
      this.$viewMode,
      this.$isCompactView,
      ui.isLoading$,
      ui.isEditMode$,
      ui.activeDialog$,
      ui.notification$,
      ui.focusedPlantIndex$,
      ui.selectedPlants$,
      ui.gridOverlayMode$,
    ],
    (
      viewMode,
      isCompact,
      isLoading,
      isEditMode,
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

  // Actions — view-mode mutators write this instance's atom; the rest delegate
  // to slice mutators (single definition of each operation).
  public setViewMode(mode: GrowspaceViewMode) {
    this.$viewMode.set(mode);
  }

  /** Toggle the header-expanded view for this card only: HEADER ⇄ STANDARD. */
  public toggleHeaderExpansion() {
    this.$viewMode.set(
      this.$viewMode.get() === ViewMode.HEADER ? ViewMode.STANDARD : ViewMode.HEADER
    );
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
