import { computed, ReadableAtom } from 'nanostores';
import { HomeAssistant } from 'custom-card-helpers';
import { PlantEntity, GrowspaceManagerCardConfig } from '../../types';
import { DataService } from '../../services/data-service';

// Sub-stores
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from '../ui/ui-store';
import { GrowspaceHistoryStore } from '../history/history-store';
import { type GridSliceRef, type GridViewState } from '../../slices/grid';
import { GrowspaceGridStore } from '../grid/grid-store';
import { GrowspaceSharedStore } from './growspace-shared-store';

import { ActionDispatcher } from './action-dispatcher';
import { ActionContext } from './action-context';

// Action Modules
import * as plantSlice from '../../slices/plant';
import * as aiActions from '../system/ai-actions';

// Nutrient Slice atoms
import {
  nutrientPresets$,
  ipmPresets$,
  nutrientInventory$,
} from '../../slices/nutrient';

// Services
import { SyncService } from '../../services/sync-service';
import { UndoRedoManager, UndoableAction } from '../../services/undo-redo-manager';
import { OptimisticManager } from '../system/optimistic-manager';

// New infrastructure (Phase 1)
import { EventBus } from '../../features/shared/events/event-bus';

export class GrowspaceStore {
  private readonly _shared: GrowspaceSharedStore;
  private _staleUnsub?: () => void;

  dataService!: DataService;
  hass!: HomeAssistant;

  // Shared sub-stores (delegated to shared store)
  public get data(): GrowspaceDataStore {
    return this._shared.data;
  }

  // Per-card stores
  public readonly ui: GrowspaceUIStore;
  public readonly grid: GridSliceRef;
  public readonly history: GrowspaceHistoryStore;

  // Services
  public readonly syncService: SyncService;
  public readonly undoRedoManager: UndoRedoManager;
  public readonly optimisticManager: OptimisticManager;

  // New infrastructure (Phase 1)
  public readonly eventBus: EventBus;

  /** Combined atom for dialog-host rendering — one subscription replaces four. */
  public readonly $dialogHostState!: ReadableAtom<{
    activeDialog: import('../../ui-state').ActiveDialogState;
    devices: import('../../types').GrowspaceDevice[];
    selectedDevice: string | null;
    strainLibrary: import('../../types').StrainEntry[];
    nutrientPresets: Record<string, import('../../types').NutrientPreset>;
    ipmPresets: Record<string, import('../../types').IPMPreset>;
    nutrientInventory: import('../../types').NutrientInventory | null;
  }>;

  /** Combined atom for header-actions rendering — one subscription replaces four. */
  public readonly $headerActionsState!: ReadableAtom<{
    viewMode: import('../../types').GrowspaceViewMode;
    isEditMode: boolean;
    selectedPlants: Set<string>;
    selectedDevice: string | null;
  }>;

  /** Combined atom for card rendering — one subscription replaces grid + ui modules. */
  public readonly $sharedCardViewState!: ReadableAtom<{
    grid: GridViewState;
    ui: import('../ui/ui-store').GrowspaceUIStore['$cardViewState'] extends ReadableAtom<infer T>
      ? T
      : any;
  }>;

  /** Combined atom for individual plant-card rendering. */
  public readonly $plantCardViewState!: ReadableAtom<{
    isEditMode: boolean;
    selectedPlants: Set<string>;
    devices: import('../../types').GrowspaceDevice[];
    nutrientPresets: Record<string, import('../../types').NutrientPreset>;
  }>;

  /** Combined atom for growspace-view-standard. */
  public readonly $viewStandardState!: ReadableAtom<{
    devices: import('../../types').GrowspaceDevice[];
  }>;

  /** Combined atom for growspace-header — one subscription replaces three. */
  public readonly $headerState!: ReadableAtom<{
    devices: import('../../types').GrowspaceDevice[];
    nutrientInventory: import('../../types').NutrientInventory | null;
    history: {
      historyCache: Record<string, any>;
      historyLoading: boolean;
      activeEnvGraphs: Set<string>;
      linkedGraphGroups: string[][];
    };
  }>;

  /** Combined atom for growspace-manager-card — extends $sharedCardViewState with strainLibrary. */
  public readonly $mainCardState!: ReadableAtom<{
    grid: GridViewState;
    ui: import('../ui/ui-store').GrowspaceUIStore['$cardViewState'] extends ReadableAtom<infer T>
      ? T
      : any;
    strainLibrary: import('../../types').StrainEntry[];
  }>;

  /** Unified Action Context */
  public get context(): ActionContext {
    return {
      dataService: this.dataService,
      data: this.data,
      ui: this.ui,
      grid: this.grid,
      undoRedoManager: this.undoRedoManager,
      optimisticManager: this.optimisticManager,
      closeDialog: () => this.ui.closeDialog(),
      refreshData: (force?: boolean) => this.refreshData(force),
    };
  }

  /**
   * Centralized Action Dispatcher
   */
  public readonly actions = new ActionDispatcher(this);

  constructor(shared: GrowspaceSharedStore) {
    this._shared = shared;
    this.dataService = shared.dataService;

    // Per-card stores
    this.ui = new GrowspaceUIStore();
    this.grid = new GrowspaceGridStore(shared.data);
    this.history = new GrowspaceHistoryStore(
      shared.dataService,
      shared.data,
      this.grid.$selectedDevice
    );

    // Cross-store computed atoms
    this.$dialogHostState = computed(
      [
        this.ui.$activeDialog,
        this.data.$devices,
        this.grid.$selectedDevice,
        this.data.$strainLibrary,
        nutrientPresets$,
        ipmPresets$,
        nutrientInventory$,
      ],
      (
        activeDialog,
        devices,
        selectedDevice,
        strainLibrary,
        nutrientPresets,
        ipmPresets,
        nutrientInventory
      ) => ({
        activeDialog,
        devices,
        selectedDevice,
        strainLibrary,
        nutrientPresets: nutrientPresets ?? {},
        ipmPresets: ipmPresets ?? {},
        nutrientInventory,
      })
    );

    this.$headerActionsState = computed(
      [this.ui.$viewMode, this.ui.$isEditMode, this.ui.$selectedPlants, this.grid.$selectedDevice],
      (viewMode, isEditMode, selectedPlants, selectedDevice) => ({
        viewMode,
        isEditMode,
        selectedPlants,
        selectedDevice,
      })
    );

    this.$sharedCardViewState = computed(
      [this.grid.$gridViewState, this.ui.$cardViewState],
      (grid, ui) => ({ grid, ui })
    );

    this.$plantCardViewState = computed(
      [
        this.ui.$isEditMode,
        this.ui.$selectedPlants,
        this.data.$devices,
        nutrientPresets$,
      ],
      (isEditMode, selectedPlants, devices, nutrientPresets) => ({
        isEditMode,
        selectedPlants,
        devices,
        nutrientPresets: nutrientPresets ?? {},
      })
    );

    this.$viewStandardState = computed([this.data.$devices], (devices) => ({ devices }));

    this.$headerState = computed(
      [this.data.$devices, nutrientInventory$, this.history.$headerHistoryState],
      (devices, nutrientInventory, history) => ({ devices, nutrientInventory, history })
    );

    this.$mainCardState = computed(
      [this.grid.$gridViewState, this.ui.$cardViewState, this.data.$strainLibrary],
      (grid, ui, strainLibrary) => ({ grid, ui, strainLibrary })
    );

    // Initialize services
    this.syncService = new SyncService(this.dataService, shared.data, this.ui, this.grid);
    this.undoRedoManager = new UndoRedoManager((msg, type, action) =>
      this.ui.showToast(msg, type, action)
    );
    this.optimisticManager = new OptimisticManager(shared.data, this.undoRedoManager);

    // Initialize new infrastructure (Phase 1)
    this.eventBus = new EventBus();

    // Trigger a full refresh whenever the shared store signals stale data
    let prevStale = shared.data.$staleCounter.get();
    this._staleUnsub = shared.data.$staleCounter.subscribe((n) => {
      if (n !== prevStale) {
        prevStale = n;
        this.syncService.refreshGrowspaceData();
      }
    });
  }

  public initialize(hass: HomeAssistant): void {
    this.hass = hass;
    this.updateHass(hass);
  }

  public destroy(): void {
    this._staleUnsub?.();
    this.history.destroy();
    this.eventBus.clear();
  }

  // === Undo/Redo Methods ===

  public pushUndoAction(action: UndoableAction): void {
    this.undoRedoManager.pushAction(action);
  }

  public get canUndo(): boolean {
    return this.undoRedoManager.canUndo;
  }

  public get canRedo(): boolean {
    return this.undoRedoManager.canRedo;
  }

  public async undo(): Promise<void> {
    await this.undoRedoManager.undo();
  }

  public async redo(): Promise<void> {
    await this.undoRedoManager.redo();
  }

  updateHass(hass: HomeAssistant) {
    this.hass = hass;
    this._shared.updateHass(hass);
    this.syncService.updateHass(hass);
    if (hass.language && hass.language !== this.ui.$language.get()) {
      this.ui.setLanguage(hass.language);
    }
  }

  async refreshData(force = false) {
    if (force) {
      this.dataService.invalidateCache();
    }
    await this.syncService.refreshGrowspaceData();
    this._pruneOptimisticDeletions();
  }

  private _pruneOptimisticDeletions() {
    const optimisticIds = this.data.$optimisticDeletedPlantIds.get();
    if (optimisticIds.size === 0) return;

    const allPlantIds = new Set<string>();
    const devices = this.data.$devices.get();
    devices.forEach((d) =>
      d.plants.forEach((p) =>
        allPlantIds.add(p.attributes.plant_id || p.entity_id.replace('sensor.', ''))
      )
    );

    const toRemove = new Set<string>();
    optimisticIds.forEach((id) => {
      if (!allPlantIds.has(id)) {
        toRemove.add(id);
      }
    });

    if (toRemove.size > 0) {
      toRemove.forEach((id) => this.data.removeOptimisticDeletedPlantId(id));
    }
  }

  // Device coordination — these belong on the store as they manage lifecycle state
  initializeSelectedDevice(config: GrowspaceManagerCardConfig) {
    if (!config) return;
    this.data.setConfig(config);
    this.syncService.setCardConfig(config);
    this.syncService.updateDevicesState();
  }

  handleDeviceChange(deviceId: string) {
    this.grid.setSelectedDevice(deviceId);
  }

  // Grid helper — triggers a data refresh after a position change
  updateGrid() {
    if (this.hass) {
      this.dataService.updateHass(this.hass);
    }
    this.refreshData();
  }

  async movePlant(plant: PlantEntity, newRow: number, newCol: number) {
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    let success = false;
    try {
      await plantSlice.updatePlant(plantId, { row: newRow, col: newCol });
      success = true;
    } catch (err) {
      console.error('Error moving plant:', err);
    }
    if (success) {
      this.updateGrid();
    }
  }

  // Strain recommendation — has non-trivial loading-state management within the dialog
  async getStrainRecommendation(userQuery: string) {
    this._updateStrainRecommendationDialog({ isLoading: true });
    try {
      const res = await aiActions.getStrainRecommendation(this.context, userQuery);
      this._updateStrainRecommendationDialog({
        isLoading: false,
        response: typeof res === 'string' ? res : JSON.stringify(res),
      });
      return res;
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Error getting strain recommendation:', e);
      this._updateStrainRecommendationDialog({ isLoading: false, response: 'Error: ' + error });
      throw e;
    }
  }

  private _updateStrainRecommendationDialog(
    payload: Partial<{ isLoading: boolean; response: string }>
  ) {
    const currentDialog = this.ui.$activeDialog.get();
    if (currentDialog.type === 'STRAIN_RECOMMENDATION') {
      this.ui.setActiveDialog({
        ...currentDialog,
        payload: { ...currentDialog.payload, ...payload },
      });
    }
  }
}
