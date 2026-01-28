import { HomeAssistant } from 'custom-card-helpers';
import {
  StrainEntry,
  PlantEntity,
  PlantOverviewDialogState,
  GrowspaceManagerCardConfig,
  AddPlantDialogState,
  AddPlantsDialogState,
} from '../../types';
import { ViewMode } from '../../constants';
import { DataService } from '../../data-service';

// Sub-stores
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from '../ui/ui-store';
import { GrowspaceHistoryStore } from '../history/history-store';
import { GrowspaceGridStore } from '../grid/grid-store';

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
  dataService!: DataService;
  hass!: HomeAssistant;

  // Instance-based stores
  public readonly data: GrowspaceDataStore;
  public readonly ui: GrowspaceUIStore;
  public readonly history: GrowspaceHistoryStore;
  public readonly grid: GrowspaceGridStore;

  // Services
  public readonly syncService: SyncService;
  public readonly undoRedoManager: UndoRedoManager;
  public readonly optimisticManager: OptimisticManager;

  // New infrastructure (Phase 1)
  public readonly eventBus: EventBus;

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
      refreshData: () => this.refreshData(),
    };
  }

  /**
   * Centralized Action Dispatcher
   */
  public readonly actions = new ActionDispatcher(this);

  constructor() {
    this.dataService = new DataService();

    // Initialize sub-stores
    this.data = new GrowspaceDataStore();
    this.ui = new GrowspaceUIStore();
    this.history = new GrowspaceHistoryStore(this.dataService, this.data);
    this.grid = new GrowspaceGridStore(this.data);

    // Initialize services
    this.syncService = new SyncService(this.dataService, this.data, this.ui);
    this.undoRedoManager = new UndoRedoManager((msg, type, action) =>
      this.showToast(msg, type, action)
    );
    this.optimisticManager = new OptimisticManager(this.data, this.undoRedoManager);

    // Initialize new infrastructure (Phase 1)
    this.eventBus = new EventBus();
  }

  /**
   * Initialize store with Home Assistant instance and start subscriptions
   * (Phase 1: New method for cleaner lifecycle management)
   */
  public initialize(hass: HomeAssistant): void {
    this.hass = hass;
    this.updateHass(hass);
    // History store subscriptions will be initialized here in future phases
  }

  /**
   * Cleanup all subscriptions and resources
   * (Phase 1: Enhanced to include event bus cleanup)
   */
  public destroy(): void {
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

  toggleEnvGraph(metric: string) {
    if (!this.history) return;
    const isNowActive = this.history.toggleEnvGraph(metric);
    if (isNowActive && this.ui.$viewMode.get() === ViewMode.HEADER) {
      this.ui.setViewMode(ViewMode.STANDARD);
    }
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

  openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
    uiActions.openPlantOverviewDialog(this.context, plant, selectedIds);
  }

  async updatePlantFromDialog(
    dialogState: Pick<PlantOverviewDialogState, 'plant' | 'editedAttributes' | 'selectedPlantIds'>
  ) {
    await plantActions.updatePlantFromDialog(this.context, dialogState);
  }

  async updatePlant(plantId: string, updates: Partial<PlantEntity['attributes']>) {
    await plantActions.updatePlant(this.context, plantId, updates);
  }

  async handleDeletePlant(plantId: string | string[]) {
    await plantActions.handleDeletePlant(this.context, plantId);
  }

  async handleMovePlantToNextStage(plant: PlantEntity): Promise<boolean> {
    return await plantActions.movePlantToNextStage(this.context, plant);
  }

  handleTakeClone = async (motherPlant: PlantEntity, numClones?: number): Promise<boolean> => {
    const success = await plantActions.takeClone(this.context, motherPlant, numClones);
    if (success) {
      await this.refreshData();
    }
    return success;
  };

  async movePlantToGrowspace(plant: PlantEntity, targetGrowspace: string): Promise<boolean> {
    return await plantActions.movePlantToGrowspace(this.context, plant, targetGrowspace);
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

  async harvestPlant(plant: PlantEntity) {
    await this.handleMovePlantToNextStage(plant);
  }

  async finishDryingPlant(plant: PlantEntity) {
    await this.handleMovePlantToNextStage(plant);
  }

  // Removed: getCommonGrowspaceId - now internal to ui-actions

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

  openTrainingDialog(plantIds: string[], growspaceId?: string) {
    uiActions.openTrainingDialog(this.context, plantIds, growspaceId);
  }

  openNutrientsDialog() {
    uiActions.openNutrientsDialog(this.context);
  }

  openLogbookDialog() {
    uiActions.openLogbookDialog(this.context);
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
