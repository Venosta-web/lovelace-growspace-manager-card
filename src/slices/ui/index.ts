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
import type {
  GrowspaceViewMode,
  GridOverlayMode,
  PlantEntity,
  GrowspaceDevice,
  EnvironmentConfigData,
} from '../../types';
import { ViewMode, GridOverlayMode as GridOverlayModeEnum, ConfigTab } from '../../constants';
import type { ActiveDialogState } from '../../store/ui/dialog-types';
import { cancel } from '../grid-interaction';
import { WSError } from '../../services/base-api';
import { devices$, optimisticDeletedPlantIds$, plantToDeviceMap$ } from '../grid';

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
    const message = toUserMessage(e);
    console.error(opts.errorPrefix, e);
    showToast(`${opts.errorPrefix}: ${message}`, 'error');
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
// Navigation / orchestration mutators
//
// Relocated from the legacy `store/ui/ui-actions.ts` + dispatcher `ui` group
// (ADR-0001). These build navigation state (dialogs / selection) and call the
// atom mutators above directly — no `ctx`, no `mutate()`, no optimistic/undo.
// ---------------------------------------------------------------------------

/** Enter or exit compact view mode. */
export function setIsCompactView(value: boolean): void {
  if (value) {
    setViewMode(ViewMode.COMPACT);
  } else if (viewMode$.get() === ViewMode.COMPACT) {
    setViewMode(ViewMode.STANDARD);
  }
}

/** Toggle the expanded header view (HEADER ⇄ STANDARD). */
export function toggleHeaderExpansion(): void {
  if (viewMode$.get() === ViewMode.HEADER) {
    setViewMode(ViewMode.STANDARD);
  } else {
    setViewMode(ViewMode.HEADER);
  }
}

/** Exit edit mode and clear the plant selection. */
export function exitEditMode(): void {
  setEditMode(false);
  clearPlantSelection();
}

/**
 * Replace the selection with every (non-optimistically-deleted) plant in the
 * given device. The selected device is per-card, so the caller passes its ID.
 */
export function selectAllPlantsInDevice(selectedDeviceId: string | null): void {
  if (!selectedDeviceId) return;

  const selectedDeviceData = devices$.get().find((d) => d.deviceId === selectedDeviceId);
  if (!selectedDeviceData || !selectedDeviceData.plants) return;

  const deleted = optimisticDeletedPlantIds$.get();
  const allIds: string[] = [];
  selectedDeviceData.plants.forEach((plant) => {
    const pId = plant.attributes.plant_id;
    if (pId && !deleted.has(pId)) allIds.push(pId);
  });

  selectAllPlants(allIds);
}

/** Open the plant overview dialog for a single plant. */
export function openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]): void {
  openDialog({
    type: 'PLANT_OVERVIEW',
    payload: {
      plant,
      editedAttributes: { ...plant.attributes },
      activeTab: 'dashboard',
      selectedPlantIds: selectedIds,
    },
  });
}

/**
 * Open the plant overview dialog from a `?plantId=` deep link.
 *
 * Defers (records a pending deep link) until devices are loaded, then finds the
 * plant, opens its overview, and strips the param from the URL.
 */
export function handleDeepLink(plantId: string): void {
  const devices = devices$.get();

  if (!devices || devices.length === 0) {
    console.log('[DeepLink] Devices not loaded yet, setting pending deep link:', plantId);
    setPendingDeepLink(plantId);
    return;
  }

  let foundPlant: PlantEntity | undefined;
  for (const device of devices) {
    if (!device.plants) continue;
    foundPlant = device.plants.find(
      (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId
    );
    if (foundPlant) break;
  }

  if (foundPlant) {
    console.log('[DeepLink] Plant found, opening dialog:', plantId);
    openPlantOverviewDialog(foundPlant);
    setPendingDeepLink(null);

    const url = new URL(window.location.href);
    url.searchParams.delete('plantId');
    window.history.replaceState({}, '', url.toString());
  } else {
    console.warn(`[DeepLink] Plant ${plantId} not found in current devices.`);
    setPendingDeepLink(null);
  }
}

/** Open the batch print-labels dialog for the current selection. */
export function openBatchPrintLabelsDialog(): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0) return;

  openDialog({ type: 'BATCH_PRINT_LABELS', payload: { plantIds: selectedIds } });
}

/** Open the batch clone dialog for the current selection. */
export function openBatchCloneDialog(): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0) return;

  openDialog({ type: 'BATCH_CLONE', payload: { plantIds: selectedIds } });
}

/** Open the watering dialog for the current selection (plant mode). */
export function openBatchWateringDialog(growspaceId?: string): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0 && !growspaceId) return;

  let targetGrowspaceId = growspaceId;
  if (!targetGrowspaceId && selectedIds.length > 0) {
    targetGrowspaceId = getCommonGrowspaceId(selectedIds);
  }

  openDialog({
    type: 'WATERING',
    payload: { mode: 'plant', plantIds: selectedIds, growspaceId: targetGrowspaceId },
  });
}

/** Open the training dialog for the current selection. */
export function openBatchTrainingDialog(growspaceId?: string): void {
  const selectedIds = Array.from(selectedPlants$.get());
  if (selectedIds.length === 0 && !growspaceId) return;

  let targetGrowspaceId = growspaceId;
  if (!targetGrowspaceId && selectedIds.length > 0) {
    targetGrowspaceId = getCommonGrowspaceId(selectedIds);
  }

  openDialog({
    type: 'TRAINING',
    payload: { isOpen: true, plantIds: selectedIds, growspaceId: targetGrowspaceId },
  });
}

/**
 * Open the add-plant dialog.
 *
 * With explicit `row`/`col`, opens at that cell. Otherwise finds the first free
 * cell in the (per-card) selected device — the caller passes its device ID.
 * Caller is responsible for any strain-library prefetch.
 */
export function openAddPlantDialog(
  selectedDeviceId: string | null,
  row?: number,
  col?: number
): void {
  if (row !== undefined && col !== undefined) {
    openDialog({ type: 'ADD_PLANT', payload: { row, col } });
    return;
  }

  if (!selectedDeviceId) return;

  const device = devices$.get().find((d) => d.deviceId === selectedDeviceId);

  let targetRow = 0;
  let targetCol = 0;

  if (device) {
    const occupied = new Set<string>();
    const deleted = optimisticDeletedPlantIds$.get();

    device.plants.forEach((p) => {
      const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
      if (deleted.has(pId)) return;

      const r = (p.attributes.row !== undefined ? p.attributes.row : 1) - 1;
      const c = (p.attributes.col !== undefined ? p.attributes.col : 1) - 1;
      occupied.add(`${r},${c}`);
    });

    let found = false;
    const rows = device.rows || 4;
    const cols = device.plantsPerRow || 4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${r},${c}`)) {
          targetRow = r;
          targetCol = c;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  openDialog({ type: 'ADD_PLANT', payload: { row: targetRow, col: targetCol } });
}

/** Open the strain recommendation dialog. */
export function openStrainRecommendationDialog(): void {
  openDialog({ type: 'STRAIN_RECOMMENDATION', payload: { isLoading: false, response: null } });
}

/** Open the nutrient presets dialog. Caller is responsible for any prefetch. */
export function openNutrientPresetsDialog(): void {
  openDialog({ type: 'NUTRIENT_PRESETS', payload: {} });
}

/**
 * Open the IPM dialog. Resolves the growspace from explicit context, then the
 * (per-card) selected device when no plant context is given. Caller is
 * responsible for any IPM-preset prefetch.
 */
export function openIPMDialog(
  selectedDeviceId: string | null,
  context?: { growspaceId?: string; plantIds?: string[] }
): void {
  const growspaceId =
    context?.growspaceId ||
    (!context?.plantIds?.length ? selectedDeviceId || undefined : undefined);

  openDialog({
    type: 'IPM',
    payload: { growspaceId, plantIds: context?.plantIds },
  });
}

/** Open the logbook dialog for the (per-card) selected device. */
export function openLogbookDialog(selectedDeviceId: string | null): void {
  if (selectedDeviceId) {
    openDialog({ type: 'LOGBOOK', payload: { growspaceId: selectedDeviceId } });
  }
}

/**
 * Fetch the strain library and download it as a JSON file.
 *
 * The one async function here: it fetches via the Strain slice (hassCall seam)
 * and triggers a client-side download. On failure it toasts an error.
 */
export async function exportStrainLibrary(): Promise<void> {
  try {
    // Lazy import keeps the Strain slice (and its hassCall/callFetch graph) out
    // of slices/ui's static import graph — the UI slice is imported nearly
    // everywhere, and a static edge here breaks specs that partially mock
    // services/hass-call.
    const { fetchStrainLibrary } = await import('../strain');
    const library = await fetchStrainLibrary();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(library));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'strain_library_export.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    console.error(e);
    showToast('Failed to export library', 'error');
  }
}

/** Resolve the common growspace ID for a set of plants (undefined if mixed). */
function getCommonGrowspaceId(plantIds: string[]): string | undefined {
  const plantToDevice = plantToDeviceMap$.get();
  let commonGrowspaceId: string | undefined;

  for (const plantId of plantIds) {
    const plantGrowspaceId = plantToDevice.get(plantId);
    if (!plantGrowspaceId) continue;

    if (commonGrowspaceId === undefined) {
      commonGrowspaceId = plantGrowspaceId;
    } else if (commonGrowspaceId !== plantGrowspaceId) {
      return undefined;
    }
  }

  return commonGrowspaceId;
}

// ===== Standardized Dialog Opening Functions =====

/** Open the environment/sensor config dialog for a device. */
export function openConfigDialog(device?: GrowspaceDevice): void {
  openDialog({
    type: 'CONFIG',
    payload: {
      currentTab: ConfigTab.SENSORS,
      environmentData: {
        selectedGrowspaceId: device?.deviceId || '',
        temperatureSensors: device?.environmentAttributes?.temperatureSensors || [],
        humiditySensors: device?.environmentAttributes?.humiditySensors || [],
        vpdSensors: device?.environmentAttributes?.vpdSensors || [],
        temperatureSensor: device?.environmentAttributes?.temperatureSensor || '',
        humiditySensor: device?.environmentAttributes?.humiditySensor || '',
        vpdSensor: device?.environmentAttributes?.vpdSensor || '',
        co2Sensor: device?.environmentAttributes?.co2Sensor || '',
        circulationFanEntity: device?.environmentAttributes?.circulationFanEntity || '',
        circulationFanEntities: device?.environmentAttributes?.circulationFanEntities || [],
        stressThreshold: 0.8,
        moldThreshold: 0.8,
        lightSensor: device?.environmentAttributes?.lightSensor || '',
        lightSensors: device?.environmentAttributes?.lightSensors || [],
        exhaustEntity: device?.environmentAttributes?.exhaustEntity || '',
        exhaustFanEntities: device?.environmentAttributes?.exhaustFanEntities || [],
        humidifierEntity: device?.environmentAttributes?.humidifierEntity || '',
        humidifierEntities: device?.environmentAttributes?.humidifierEntities || [],
        humidifierControlEnabled: device?.environmentAttributes?.humidifierControlEnabled || false,
        dehumidifierEntity: device?.environmentAttributes?.dehumidifierEntity || '',
        dehumidifierEntities: device?.environmentAttributes?.dehumidifierEntities || [],
        dehumidifierThresholds: device?.environmentAttributes?.dehumidifierThresholds || {},
        soilMoistureSensor: device?.environmentAttributes?.soilMoistureSensor || '',
        dehumidifierControlEnabled:
          device?.environmentAttributes?.dehumidifierControlEnabled || false,
        sensorGroups: device?.environmentAttributes?.sensorGroups || [],
        sensorCoordinates: device?.environmentAttributes?.sensorCoordinates || {},
        irrigationTanks: device?.environmentAttributes?.irrigationTanks || [],
        cameraEntities: device?.environmentAttributes?.cameraEntities || [],
        visionCheckupConfig: device?.environmentAttributes?.visionCheckupConfig,
        substrateTemperatureSensors:
          device?.environmentAttributes?.substrateTemperatureSensors || [],
        phSensors: device?.environmentAttributes?.phSensors || [],
        feedEcSensors: device?.environmentAttributes?.feedEcSensors || [],
        bulkEcSensors: device?.environmentAttributes?.bulkEcSensors || [],
        poreEcSensors: device?.environmentAttributes?.poreEcSensors || [],
        runoffEcSensors: device?.environmentAttributes?.runoffEcSensors || [],
        drainVolumeSensors: device?.environmentAttributes?.drainVolumeSensors || [],
        irrigationFlowSensors: device?.environmentAttributes?.irrigationFlowSensors || [],
        powerSensors: device?.environmentAttributes?.powerSensors || [],
        energySensors: device?.environmentAttributes?.energySensors || [],
        circulationFanConfig: device?.environmentAttributes?.circulationFanConfig,
        vpdOptimalOverrides: device?.environmentAttributes?.vpdOptimalOverrides || {},
      } as EnvironmentConfigData,
    },
  });
}

/** Open the strain library dialog (optionally on a specific tab). */
export function openStrainLibraryDialog(initialTab?: 'strains' | 'seeds'): void {
  openDialog({ type: 'STRAIN_LIBRARY', payload: { initialTab } });
}

/** Open the irrigation dialog. */
export function openIrrigationDialog(options?: {
  growspaceId?: string;
  initialTab?: string;
  scrollToField?: string;
}): void {
  openDialog({ type: 'IRRIGATION', payload: options ?? {} });
}

/** Open the GrowMaster AI dialog for a growspace. */
export function openGrowMasterDialog(growspaceId: string): void {
  openDialog({
    type: 'GROW_MASTER',
    payload: { growspaceId, isLoading: false, response: '', mode: 'single' },
  });
}

/** Open the watering dialog with explicit options. */
export function openWateringDialog(options: {
  plantIds?: string[];
  growspaceId?: string;
  mode?: 'plant' | 'growspace';
}): void {
  openDialog({
    type: 'WATERING',
    payload: {
      plantIds: options.plantIds,
      growspaceId: options.growspaceId,
      mode: options.mode || (options.plantIds?.length ? 'plant' : 'growspace'),
    },
  });
}

/** Open the training dialog with explicit plant IDs. */
export function openTrainingDialog(plantIds: string[], growspaceId?: string): void {
  openDialog({ type: 'TRAINING', payload: { isOpen: true, plantIds, growspaceId } });
}

/** Open the nutrients dialog. */
export function openNutrientsDialog(): void {
  openDialog({ type: 'NUTRIENTS', payload: {} });
}

/** Open the snapshots dialog for a growspace. */
export function openSnapshotsDialog(growspaceId?: string): void {
  openDialog({ type: 'SNAPSHOTS', payload: { growspaceId: growspaceId || '' } });
}

/** Open the crop steering dialog for a growspace. */
export function openCropSteeringDialog(growspaceId?: string): void {
  openDialog({ type: 'CROP_STEERING', payload: { growspaceId: growspaceId || '' } });
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
