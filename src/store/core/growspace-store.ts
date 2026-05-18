import { computed, ReadableAtom } from 'nanostores';
import { HomeAssistant } from 'custom-card-helpers';
import {
  PlantEntity,
  PlantOverviewDialogState,
  PlantAttributes,
  AddPlantsDialogState,
  AddPlantDialogState,
  StrainEntry,
  NutrientPreset,
  GrowspaceManagerCardConfig,
} from '../../types';
import { ViewMode } from '../../constants';
import { DataService } from '../../data-service';

// Sub-stores
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from '../ui/ui-store';
import { GrowspaceHistoryStore } from '../history/history-store';
import { GrowspaceGridStore } from '../grid/grid-store';
import { GrowspaceSharedStore } from './growspace-shared-store';

import { ActionDispatcher } from './action-dispatcher';
import { ActionContext } from './action-context';

// Action Modules
import * as plantActions from '../plant/plant-actions';
import * as strainActions from '../plant/strain-actions';
import * as deviceActions from '../system/device-actions';
import * as libraryActions from '../plant/library-actions';
import * as uiActions from '../ui/ui-actions';
import * as aiActions from '../system/ai-actions';
import * as keyboardActions from '../system/keyboard-actions';
import * as ipmActions from '../plant/ipm-actions';

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
  public get data(): GrowspaceDataStore { return this._shared.data; }
  public get history(): GrowspaceHistoryStore { return this._shared.history; }

  // Per-card stores
  public readonly ui: GrowspaceUIStore;
  public readonly grid: GrowspaceGridStore;

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
    grid: import('../grid/grid-store').GridViewState;
    ui: import('../ui/ui-store').GrowspaceUIStore['$cardViewState'] extends ReadableAtom<infer T> ? T : any;
  }>;

  /** Combined atom for individual plant-card rendering. */
  public readonly $plantCardViewState!: ReadableAtom<{
    isEditMode: boolean;
    selectedPlants: Set<string>;
    devices: import('../../types').GrowspaceDevice[];
    nutrientPresets: Record<string, import('../../types').NutrientPreset>;
  }>;

  /** Combined atom for growspace-view-standard — one subscription replaces two. */
  public readonly $viewStandardState!: ReadableAtom<{
    isTransplantMode: boolean;
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
    grid: import('../grid/grid-store').GridViewState;
    ui: import('../ui/ui-store').GrowspaceUIStore['$cardViewState'] extends ReadableAtom<infer T> ? T : any;
    strainLibrary: import('../../types').StrainEntry[];
  }>;

  /** Unified Action Context */
  public get context(): ActionContext {
    return {
      dataService: this.dataService,
      data: this.data,
      ui: this.ui,
      history: this.history,
      grid: this.grid,
      undoRedoManager: this.undoRedoManager,
      optimisticManager: this.optimisticManager,
      syncService: this.syncService,
      hass: this.hass,
      showToast: (msg, type, action) => this.showToast(msg, type, action),
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

    // Cross-store computed atoms
    this.$dialogHostState = computed(
      [
        this.ui.$activeDialog,
        this.data.$devices,
        this.data.$selectedDevice,
        this.data.$strainLibrary,
        this.data.$nutrientPresets,
        this.data.$ipmPresets,
        this.data.$nutrientInventory,
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
        nutrientPresets,
        ipmPresets,
        nutrientInventory,
      })
    );

    this.$headerActionsState = computed(
      [this.ui.$viewMode, this.ui.$isEditMode, this.ui.$selectedPlants, this.data.$selectedDevice],
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
      [this.ui.$isEditMode, this.ui.$selectedPlants, this.data.$devices, this.data.$nutrientPresets],
      (isEditMode, selectedPlants, devices, nutrientPresets) => ({
        isEditMode,
        selectedPlants,
        devices,
        nutrientPresets,
      })
    );

    this.$viewStandardState = computed(
      [this.ui.$isTransplantMode, this.data.$devices],
      (isTransplantMode, devices) => ({ isTransplantMode, devices })
    );

    this.$headerState = computed(
      [this.data.$devices, this.data.$nutrientInventory, this.history.$headerHistoryState],
      (devices, nutrientInventory, history) => ({ devices, nutrientInventory, history })
    );

    this.$mainCardState = computed(
      [this.grid.$gridViewState, this.ui.$cardViewState, this.data.$strainLibrary],
      (grid, ui, strainLibrary) => ({ grid, ui, strainLibrary })
    );

    // Initialize services
    this.syncService = new SyncService(this.dataService, shared.data, this.ui);
    this.undoRedoManager = new UndoRedoManager((msg, type, action) =>
      this.showToast(msg, type, action)
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

  // --- Actions Delegation ---

  // UI Actions
  setIsCompactView(value: boolean) {
    uiActions.setIsCompactView(this.context, value);
  }

  toggleHeaderExpansion() {
    uiActions.toggleHeaderExpansion(this.context);
  }

  showToast(
    message: string,
    type: 'info' | 'error' | 'success' = 'info',
    action?: { label: string; callback: () => void }
  ) {
    this.ui.showToast(message, type, action);
  }

  handleDeepLink(plantId: string) {
    uiActions.handleDeepLink(this.context, plantId);
  }

  toggleEnvGraph(metric: string) {
    if (metric === 'crop_steering') {
      const gsId = this.data.$selectedDevice.get();
      if (gsId) this.openCropSteeringDialog(gsId);
      return;
    }
    if (!this.history) return;
    const isNowActive = this.history.toggleEnvGraph(metric);
    if (isNowActive && this.ui.$viewMode.get() === ViewMode.HEADER) {
      this.ui.setViewMode(ViewMode.STANDARD);
    }
  }

  openECRampDialog(growspaceId?: string) {
    uiActions.openECRampDialog(this.context, growspaceId);
  }

  // Device Actions
  initializeSelectedDevice(config: GrowspaceManagerCardConfig) {
    deviceActions.initializeSelectedDevice(this.context, config);
  }

  handleDeviceChange(deviceId: string) {
    deviceActions.handleDeviceChange(this.context, deviceId);
  }

  // Library Actions
  fetchStrainLibrary(force: boolean = false) {
    return libraryActions.fetchStrainLibrary(this.context, force);
  }

  public async fetchNutrientPresets(force = false) {
    await libraryActions.fetchNutrientPresets(this.context, force);
  }

  public async fetchIPMPresets(force = false) {
    await libraryActions.fetchIPMPresets(this.context, force);
  }

  public async fetchNutrientInventory(force = false) {
    await libraryActions.fetchNutrientInventory(this.context, force);
  }

  public async fetchECRampCurves(force = false) {
    await libraryActions.fetchECRampCurves(this.context, force);
  }

  public async updateNutrientStock(
    nutrientId: string,
    name: string,
    currentMl: number,
    initialMl: number
  ) {
    await libraryActions.updateNutrientStock(this.context, nutrientId, name, currentMl, initialMl);
  }

  public async removeNutrientStock(nutrientId: string) {
    await libraryActions.removeNutrientStock(this.context, nutrientId);
  }

  // Plant Actions
  async waterPlant(
    plantId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) {
    await plantActions.waterPlant(this.context, plantId, amount, nutrients, presetId);
  }

  async waterGrowspace(
    growspaceId: string,
    amount: number,
    nutrients?: Record<string, number>,
    presetId?: string
  ) {
    await plantActions.waterGrowspace(this.context, growspaceId, amount, nutrients, presetId);
  }

  async printLabel(params: {
    plantId?: string;
    strain?: string;
    phenotype?: string;
    breeder?: string;
    lineage?: string;
    breederLogo?: string;
    deviceId?: string;
    preview?: boolean;
  }): Promise<any> {
    return await plantActions.printLabel(this.context, params);
  }

  togglePlantSelection(plantOrId: string | PlantEntity) {
    uiActions.togglePlantSelection(this.context, plantOrId);
  }

  selectAllPlants() {
    uiActions.selectAllPlants(this.context);
  }

  setSelectedPlants(_plantIds: Set<string>) {
    // No-op
  }

  clearPlantSelection() {
    uiActions.clearPlantSelection(this.context);
  }

  async deleteSelectedPlants() {
    const selectedIds = Array.from(this.ui.$selectedPlants.get());
    if (selectedIds.length === 0) return;

    await plantActions.handleDeletePlant(this.context, selectedIds);
  }

  exitEditMode() {
    uiActions.exitEditMode(this.context);
  }

  handlePlantClick(plant: PlantEntity) {
    uiActions.handlePlantClick(this.context, plant);
  }

  async updatePlant(plantId: string, updates: Partial<PlantEntity['attributes']>) {
    await plantActions.updatePlant(this.context, plantId, updates);
  }

  async handleMovePlantToNextStage(plant: PlantEntity): Promise<boolean> {
    return await plantActions.movePlantToNextStage(this.context, plant);
  }

  async handleDrop(
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null,
    sourcePlant: PlantEntity | null
  ): Promise<boolean> {
    if (!this.data.$selectedDevice.get()) return false;
    return await plantActions.handlePlantDrop(
      this.context,
      targetRow,
      targetCol,
      targetPlant,
      sourcePlant
    );
  }

  async movePlant(plant: PlantEntity, newRow: number, newCol: number) {
    const success = await plantActions.movePlantPosition(this.context, plant, newRow, newCol);
    if (success) {
      this.updateGrid();
    }
  }

  // Strain/Growspace Actions
  async addStrain(strainData: Partial<StrainEntry>) {
    await strainActions.addStrain(this.context, strainData);
  }

  async removeStrain(strainKey: string) {
    await strainActions.removeStrain(this.context, strainKey);
  }

  async updateStrain(strainData: Partial<StrainEntry>) {
    await strainActions.updateStrain(this.context, strainData);
  }

  // eslint-disable-next-line camelcase
  async handleAddGrowspace(detail: {
    name: string;
    rows?: number;
    plantsPerRow?: number;
    notification_service?: string;
  }) {
    await strainActions.addGrowspace(
      this.context,
      detail.name,
      detail.rows,
      detail.plantsPerRow,
      detail.notification_service
    );
  }

  async handleRemoveGrowspace(growspaceId: string) {
    await strainActions.removeGrowspace(this.context, growspaceId);
  }

  async handleRemoveEnvironment(growspaceId: string) {
    await this.dataService.removeEnvironment(growspaceId);
    await this.refreshData();
  }

  // eslint-disable-next-line camelcase
  async handleUpdateGrowspace(detail: {
    growspace_id: string;
    name: string;
    rows: number;
    plantsPerRow: number;
  }) {
    await strainActions.updateGrowspace(
      this.context,
      detail.growspace_id,
      detail.name,
      detail.rows,
      detail.plantsPerRow
    );
  }

  async confirmAddPlant(detail: AddPlantDialogState) {
    if (!detail.strain) return;
    await plantActions.confirmAddPlant(this.context, detail as Required<AddPlantDialogState>);
    await this.refreshData();
  }

  async confirmAddPlants(detail: AddPlantsDialogState) {
    await plantActions.confirmAddPlants(this.context, detail);
    await this.refreshData();
  }

  // AI Actions
  async analyzeGrowspace(query: string, all: boolean) {
    await aiActions.analyzeGrowspace(this.context, query, all);
  }

  // Helpers
  updateGrid() {
    if (this.hass) {
      this.dataService.updateHass(this.hass);
    }
    this.refreshData();
  }

  handleKeyboardNavigation(key: string) {
    keyboardActions.handleKeyboardNavigation(this.context, key);
  }

  async addNutrientPreset(preset: NutrientPreset) {
    await this.dataService.saveNutrientPreset(preset);
    await this.refreshData();
  }

  // Removed: getCommonGrowspaceId - now internal to ui-actions

  openBatchPrintLabelsDialog() {
    uiActions.openBatchPrintLabelsDialog(this.context);
  }

  openBatchCloneDialog() {
    uiActions.openBatchCloneDialog(this.context);
  }

  openBatchWateringDialog(growspaceId?: string) {
    uiActions.openBatchWateringDialog(this.context, growspaceId);
  }

  openBatchTrainingDialog(growspaceId?: string) {
    uiActions.openBatchTrainingDialog(this.context, growspaceId);
  }

  openAddPlantDialog(row?: number, col?: number) {
    uiActions.openAddPlantDialog(this.context, row, col);
  }

  openStrainRecommendationDialog() {
    uiActions.openStrainRecommendationDialog(this.context);
  }

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
      this._updateStrainRecommendationDialog({
        isLoading: false,
        response: 'Error: ' + error,
      });
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

  openNutrientPresetsDialog() {
    uiActions.openNutrientPresetsDialog(this.context);
  }

  openIPMDialog(context?: { growspaceId?: string; plantIds?: string[] }) {
    uiActions.openIPMDialog(this.context, context);
  }

  async applyIPM(detail: {
    preset_id: string;
    growspace_id?: string;
    plant_ids?: string[];
    notes?: string;
  }) {
    await ipmActions.applyIPM(this.context, detail);
  }

  openConfigDialog(device?: import('../../types').GrowspaceDevice) {
    uiActions.openConfigDialog(this.context, device);
  }

  openStrainLibraryDialog() {
    uiActions.openStrainLibraryDialog(this.context);
  }

  openIrrigationDialog() {
    uiActions.openIrrigationDialog(this.context);
  }

  openGrowMasterDialog(growspaceId: string) {
    uiActions.openGrowMasterDialog(this.context, growspaceId);
  }

  openWateringDialog(options: {
    plantIds?: string[];
    growspaceId?: string;
    mode?: 'plant' | 'growspace';
  }) {
    uiActions.openWateringDialog(this.context, options);
  }

  openNutrientsDialog() {
    uiActions.openNutrientsDialog(this.context);
  }

  openSnapshotsDialog(growspaceId?: string) {
    uiActions.openSnapshotsDialog(this.context, growspaceId);
  }

  openCropSteeringDialog(growspaceId?: string) {
    uiActions.openCropSteeringDialog(this.context, growspaceId);
  }

  openLogbookDialog() {
    uiActions.openLogbookDialog(this.context);
  }

  openGrowReportDialog(growspaceId?: string) {
    uiActions.openGrowReportDialog(this.context, growspaceId);
  }

  async handleExportLibrary() {
    await uiActions.exportStrainLibrary(this.context);
  }

  async toggleDehumidifierControl(_deviceId: string) {
    console.warn(
      'toggleDehumidifierControl not fully implemented in data service (deprecated or future)'
    );
  }

  async performImport(file: File, _replace: boolean) {
    try {
      const content = await file.text();
      const strains = JSON.parse(content);
      if (!Array.isArray(strains)) throw new Error('Invalid format');

      for (const strain of strains) {
        await this.addStrain(strain);
      }
      this.showToast('Library imported successfully', 'success');
      this.fetchStrainLibrary(true);
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Import failed', e);
      this.showToast('Import failed: ' + error, 'error');
    }
  }

  async batchAction(
    action: 'remove' | 'transition' | 'harvest',
    entityIds: string[],
    data?: Record<string, unknown>
  ): Promise<void> {
    if (entityIds.length === 0) return;

    if (action === 'remove') {
      entityIds.forEach((id) => this.data.addOptimisticDeletedPlantId(id));
    }

    try {
      await this.dataService.callService('growspace_manager', 'batch_action', {
        entity_ids: entityIds,
        action,
        data: data || {},
      });

      this.showToast(`Batch ${action} completed for ${entityIds.length} plant(s)`, 'success');

      this.ui.clearPlantSelection();
      this.ui.setEditMode(false);

      await this.refreshData();
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Batch ${action} failed:`, err);
      this.showToast(`Batch ${action} failed: ${error}`, 'error');

      if (action === 'remove') {
        entityIds.forEach((id) => this.data.removeOptimisticDeletedPlantId(id));
      }
    }
  }
}
