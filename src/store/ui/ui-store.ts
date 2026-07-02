import { WritableAtom, ReadableAtom, atom, computed } from 'nanostores';
import { GrowspaceViewMode, GridOverlayMode } from '../../types';
import { ActiveDialogState } from '../../ui-state';
import { ViewMode } from '../../constants';
import { VIEW_MODE_LAYOUT_MAP, type LayoutSpec } from '../../slices/ui/layout-spec';
import { cancel } from '../../slices/grid-interaction';
import * as ui from '../../slices/ui';

/**
 * Thin compatibility shim over the `slices/ui` source of truth.
 *
 * Most atom fields below point at the *same* atom instance owned by
 * `slices/ui`. The exceptions are state that belongs to a single card, not the
 * page, and is therefore owned *per instance* here:
 *
 *   - view mode (`$viewMode` and everything computed from it) — standard /
 *     compact / header / heatmap is a property of one card, so each card
 *     expands/collapses independently.
 *   - grid overlay mode (`$gridOverlayMode`) — the active grid overlay (vpd /
 *     bio_status / none) is a property of one card, so switching the overlay on
 *     one card leaves the others untouched.
 *   - plant selection (`$selectedPlants`) and edit mode (`$isEditMode`) —
 *     selecting plants or entering edit mode on one card must not bleed into
 *     the others on the same dashboard. These two are deliberately coupled:
 *     leaving edit mode clears this card's selection.
 *
 * New code should import the genuinely page-global state from `slices/ui`
 * directly, but reach the per-card state through this store.
 */
export class GrowspaceUIStore {
  // View-mode state — owned per instance (NOT shared via slices/ui), so each
  // card on the dashboard expands/collapses independently.
  public readonly $viewMode: WritableAtom<GrowspaceViewMode> = atom(ViewMode.STANDARD);

  // Grid overlay mode — owned per instance (NOT shared via slices/ui), so
  // switching the overlay (vpd / bio_status / none) on one card leaves the
  // others untouched. Mutated only through setGridOverlayMode below.
  public readonly $gridOverlayMode: WritableAtom<GridOverlayMode> = atom(GridOverlayMode.NONE);

  // Selection + edit-mode state — owned per instance (NOT shared via slices/ui),
  // so selecting plants or toggling edit mode on one card leaves the others
  // untouched. Mutated only through this store's methods below.
  public readonly $isEditMode: WritableAtom<boolean> = atom(false);
  public readonly $selectedPlants: WritableAtom<Set<string>> = atom(new Set<string>());

  // Atoms — re-exported instances from slices/ui (single source of truth).
  public readonly $isLoading: WritableAtom<boolean> = ui.isLoading$;
  public readonly $activeDialog: WritableAtom<ActiveDialogState> = ui.activeDialog$;
  public readonly $focusedPlantIndex: WritableAtom<number> = ui.focusedPlantIndex$;
  public readonly $menuOpen: WritableAtom<boolean> = ui.menuOpen$;
  public readonly $notification: WritableAtom<{
    message: string;
    type: 'info' | 'error' | 'success';
    action?: { label: string; callback: () => void };
  } | null> = ui.notification$;

  public readonly $error: WritableAtom<string | null> = ui.error$;
  public readonly $defaultApplied: WritableAtom<boolean> = ui.defaultApplied$;
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
      this.$isEditMode,
      ui.activeDialog$,
      ui.notification$,
      ui.focusedPlantIndex$,
      this.$selectedPlants,
      this.$gridOverlayMode,
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
    this.$gridOverlayMode.set(mode);
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

  /**
   * Enter or exit edit mode for this card.
   *
   * Exiting clears this card's selection and cancels any in-flight transplant
   * so the card always returns to a clean state when the user leaves edit mode.
   */
  public setEditMode(isEdit: boolean) {
    this.$isEditMode.set(isEdit);
    if (!isEdit) {
      this.$selectedPlants.set(new Set());
      cancel();
    }
  }

  /** Add a plant to this card's selection, or remove it if already selected. */
  public togglePlantSelection(plantId: string) {
    const current = new Set(this.$selectedPlants.get());
    if (current.has(plantId)) {
      current.delete(plantId);
    } else {
      current.add(plantId);
    }
    this.$selectedPlants.set(current);
  }

  /** Replace this card's entire selection with the provided plant IDs. */
  public selectAllPlants(plantIds: string[]) {
    this.$selectedPlants.set(new Set(plantIds));
  }

  /** Clear this card's plant selection. */
  public clearPlantSelection() {
    this.$selectedPlants.set(new Set());
  }

  /** Remove specific plant IDs from this card's selection. */
  public deselectPlants(plantIds: string[]) {
    const current = new Set(this.$selectedPlants.get());
    plantIds.forEach((id) => current.delete(id));
    this.$selectedPlants.set(current);
  }

  // Batch-dialog openers — snapshot *this card's* selection into the dialog
  // payload, so a batch operation acts on the plants selected on the card that
  // triggered it (not a page-global selection).

  public openBatchWateringDialog(growspaceId?: string) {
    ui.openBatchWateringDialog(Array.from(this.$selectedPlants.get()), growspaceId);
  }

  public openBatchTrainingDialog(growspaceId?: string) {
    ui.openBatchTrainingDialog(Array.from(this.$selectedPlants.get()), growspaceId);
  }

  public openBatchCloneDialog() {
    ui.openBatchCloneDialog(Array.from(this.$selectedPlants.get()));
  }

  public openBatchPrintLabelsDialog() {
    ui.openBatchPrintLabelsDialog(Array.from(this.$selectedPlants.get()));
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
