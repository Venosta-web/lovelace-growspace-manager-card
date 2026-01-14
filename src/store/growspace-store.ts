import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, PlantEntity, PlantOverviewDialogState, GrowspaceManagerCardConfig, GrowAdviceResponse } from '../types';
import { ViewMode, GridOverlayMode } from '../constants';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils/plant-utils';

// Sub-stores
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from './ui-store';
import { GrowspaceHistoryStore } from './history-store';
import { GrowspaceGridStore } from './grid-store';

import { ActionDispatcher } from './action-dispatcher';
import * as plantActions from './plant-actions';
import * as strainActions from './strain-actions';
import * as keyboardActions from './keyboard-actions';

// Services
import { SyncService } from '../services/sync-service';
import { UndoRedoManager, UndoableAction } from '../services/undo-redo-manager';

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

    /** Base context with common action dependencies */
    private get _baseActionContext() {
        return {
            dataService: this.dataService,
            showToast: (msg: string, type: 'info' | 'error' | 'success') => this.showToast(msg, type),
            closeDialog: () => this.ui.closeDialog(),
            refreshData: () => this.refreshData(),
        };
    }

    /** Context object for plant action functions */
    public get plantActionContext(): plantActions.PlantActionContext {
        return this._baseActionContext;
    }

    /** Context object for strain action functions */
    private get _strainActionContext(): strainActions.StrainActionContext {
        return {
            ...this._baseActionContext,
            refreshStrainLibrary: (force) => this.fetchStrainLibrary(force),
            setStrainLibrary: (lib) => this.data.setStrainLibrary(lib),
            getStrainLibrary: () => this.data.$strainLibrary.get(),
        };
    }

    /** Context object for growspace action functions */
    public get growspaceActionContext(): strainActions.GrowspaceActionContext {
        return this._baseActionContext;
    }

    /** Context object for keyboard action functions */
    private get _keyboardActionContext(): keyboardActions.KeyboardActionContext {
        return {
            exitEditMode: () => this.exitEditMode(),
            handlePlantClick: (p) => this.handlePlantClick(p),
            handleDeletePlant: (plantId: string) => this.handleDeletePlant(plantId),
            deletePlants: (plantIds: string | string[]) => this.handleDeletePlant(plantIds),
        };
    }

    /**
     * Centralized Action Dispatcher
     * Provides a single entry point for all business logic actions.
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
        this.undoRedoManager = new UndoRedoManager(
            (msg, type, action) => this.showToast(msg, type, action)
        );
    }

    /** Cleanup all subscriptions and resources */
    public destroy() {
        this.history.destroy();
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
    }

    async refreshData() {
        await this.syncService.refreshGrowspaceData();
        this.pruneOptimisticDeletions();
    }

    // --- Actions / Logic ---

    // State Setters
    setIsCompactView(value: boolean) {
        if (value) {
            this.ui.setViewMode(ViewMode.COMPACT);
        } else if (this.ui.$viewMode.get() === ViewMode.COMPACT) {
            this.ui.setViewMode(ViewMode.STANDARD);
        }
    }

    toggleHeaderExpansion() {
        if (this.ui.$viewMode.get() === ViewMode.HEADER) {
            this.ui.setViewMode(ViewMode.STANDARD);
        } else {
            this.ui.setViewMode(ViewMode.HEADER);
        }
    }

    showToast(message: string, type: 'info' | 'error' | 'success' = 'info', action?: { label: string; callback: () => void }) {
        this.ui.showToast(message, type, action);
    }

    initializeSelectedDevice(config: GrowspaceManagerCardConfig) {
        this.data.setConfig(config);

        // Set view mode from config
        if (config?.initial_view_mode) {
            this.ui.setViewMode(config.initial_view_mode);
        }

        // Trigger update logic via sync service
        this.syncService.updateDevicesState();
    }

    fetchStrainLibrary(force: boolean = false) {
        return this._fetchStrainLibraryImpl(force);
    }

    private async _fetchStrainLibraryImpl(force: boolean) {
        if (!this.hass) return;

        const CACHE_KEY = 'growspace_strain_library_v2';
        const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

        const cachedRaw = localStorage.getItem(CACHE_KEY);
        let usedCache = false;

        if (!force && cachedRaw) {
            try {
                const cache = JSON.parse(cachedRaw);
                const age = Date.now() - (cache.timestamp || 0);

                if (cache.version === 2 && age < CACHE_VALIDITY_MS && Array.isArray(cache.data)) {
                    this.data.setStrainLibrary(cache.data);
                    usedCache = true;
                }
            } catch (e) {
                console.warn('Failed to parse cached strain library', e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

        if (!usedCache) {
            try {
                const currentStrains = await this.dataService.fetchStrainLibrary();
                if (Array.isArray(currentStrains)) {
                    this.data.setStrainLibrary(currentStrains);

                    const cacheData = {
                        version: 2,
                        timestamp: Date.now(),
                        data: currentStrains,
                    };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                }
            } catch (e) {
                console.error('Failed to fetch strain library:', e);
            }
        }
    }

    public async fetchNutrientPresets(force = false) {
        if (!this.hass) return;

        const CACHE_KEY = 'growspace_nutrient_presets';
        const CACHE_VALIDITY_MS = 60 * 60 * 1000; // 1 hour

        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (!force && cachedRaw) {
            try {
                const cache = JSON.parse(cachedRaw);
                const age = Date.now() - (cache.timestamp || 0);
                if (age < CACHE_VALIDITY_MS) {
                    this.data.setNutrientPresets(cache.data);
                    return;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        try {
            const result = await this.dataService.fetchNutrientPresets();
            if (result) {
                this.data.setNutrientPresets(result);
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: result
                }));
            }
        } catch (e) {
            console.error('Failed to fetch nutrient presets:', e);
        }
    }

    public async fetchIPMPresets(force = false) {
        if (!this.hass) return;

        const CACHE_KEY = 'growspace_ipm_presets';
        const CACHE_VALIDITY_MS = 60 * 60 * 1000; // 1 hour

        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (!force && cachedRaw) {
            try {
                const cache = JSON.parse(cachedRaw);
                const age = Date.now() - (cache.timestamp || 0);
                if (age < CACHE_VALIDITY_MS) {
                    this.data.setIPMPresets(cache.data);
                    return;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        try {
            const result = await this.dataService.fetchIPMPresets();
            if (result) {
                this.data.setIPMPresets(result);
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: result
                }));
            }
        } catch (e) {
            console.error('Failed to fetch IPM presets:', e);
        }
    }

    public async fetchNutrientInventory(force = false) {
        if (!this.hass) return;

        const CACHE_KEY = 'growspace_nutrient_inventory';
        const CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (!force && cachedRaw) {
            try {
                const cache = JSON.parse(cachedRaw);
                const age = Date.now() - (cache.timestamp || 0);
                if (age < CACHE_VALIDITY_MS) {
                    this.data.setNutrientInventory(cache.data);
                    return;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        try {
            const result = await this.dataService.fetchNutrientInventory();
            if (result) {
                this.data.setNutrientInventory(result);
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: result
                }));
            }
        } catch (e) {
            console.error('Failed to fetch nutrient inventory:', e);
        }
    }

    public async updateNutrientStock(nutrientId: string, name: string, currentMl: number, initialMl: number) {
        try {
            await this.dataService.updateNutrientStock(nutrientId, name, currentMl, initialMl);
            await this.fetchNutrientInventory(true);
            this.showToast(`Updated stock: ${name}`, 'success');
        } catch (e: any) {
            this.showToast(`Failed to update stock: ${e.message}`, 'error');
        }
    }

    public async removeNutrientStock(nutrientId: string) {
        try {
            await this.dataService.removeNutrientStock(nutrientId);
            await this.fetchNutrientInventory(true);
            this.showToast('Removed nutrient stock', 'success');
        } catch (e: any) {
            this.showToast(`Failed to remove stock: ${e.message}`, 'error');
        }
    }

    handleKeyboardNavigation(key: string) {
        keyboardActions.handleKeyboardNavigation(this._keyboardActionContext, key, this.ui, this.data);
    }

    handleDeviceChange(deviceId: string) {
        this.data.setSelectedDevice(deviceId);
    }

    togglePlantSelection(plantOrId: string | PlantEntity) {
        const plantId = typeof plantOrId === 'string' ? plantOrId : plantOrId.attributes.plant_id || '';
        if (!plantId) return;

        this.ui.togglePlantSelection(plantId);
    }

    selectAllPlants() {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!selectedDevice) return;

        const devices = this.data.$devices.get();
        const selectedDeviceData = devices.find((d) => d.device_id === selectedDevice);

        const allIds: string[] = [];

        if (selectedDeviceData && selectedDeviceData.plants) {
            selectedDeviceData.plants.forEach((plant) => {
                const pId = plant.attributes.plant_id;
                if (pId && !this.data.$optimisticDeletedPlantIds.get().has(pId)) {
                    allIds.push(pId);
                }
            });

            this.ui.selectAllPlants(allIds);
        }
    }

    setSelectedPlants(plantIds: Set<string>) {
        // No-op for now unless we need to sync specific sets
    }

    clearPlantSelection() {
        this.ui.clearPlantSelection();
    }

    exitEditMode() {
        this.ui.setEditMode(false);
        this.ui.clearPlantSelection();
    }

    handlePlantClick(plant: PlantEntity) {
        if (this.ui.$isEditMode.get() && this.ui.$selectedPlants.get().size > 0) {
            const plantId = plant.attributes.plant_id;
            if (plantId && !this.ui.$selectedPlants.get().has(plantId)) {
                this.togglePlantSelection(plantId);
            }
            this.openPlantOverviewDialog(plant, Array.from(this.ui.$selectedPlants.get()));
        } else {
            this.openPlantOverviewDialog(plant);
        }
    }

    openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
        this.ui.setActiveDialog({
            type: 'PLANT_OVERVIEW',
            payload: {
                plant,
                editedAttributes: { ...plant.attributes },
                activeTab: 'dashboard',
                selectedPlantIds: selectedIds,
            },
        });
    }

    async updatePlantFromDialog(dialogState: Pick<PlantOverviewDialogState, 'plant' | 'editedAttributes' | 'selectedPlantIds'>) {
        const { plant, editedAttributes, selectedPlantIds } = dialogState;
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

        const targetIds =
            selectedPlantIds && selectedPlantIds.length > 0 ? selectedPlantIds : [plantId];
        const isBulkEdit = targetIds.length > 1;

        const payloadTemplate = PlantUtils.mapDialogToApiPayload(editedAttributes, isBulkEdit);

        try {
            const updatePromises = targetIds.map((id: string) => {
                const payload = { ...payloadTemplate, plant_id: id };
                return this.dataService.updatePlant(payload);
            });

            await Promise.all(updatePromises);

            this.ui.closeDialog();
            await this.refreshData();

            if (this.ui.$isEditMode.get()) {
                this.ui.clearPlantSelection();
                this.ui.setEditMode(false);
            }
        } catch (err) {
            console.error('Error updating plant(s):', err);
        }
    }

    async updatePlant(plantId: string, updates: Partial<PlantEntity['attributes']>) {
        await plantActions.updatePlant(this.plantActionContext, plantId, updates);
    }

    async handleDeletePlant(plantId: string | string[]) {
        const ids = Array.isArray(plantId) ? plantId : [plantId];

        const plantsToRestore: any[] = [];
        const devices = this.data.$devices.get();
        ids.forEach(id => {
            for (const device of devices) {
                const plant = device.plants?.find(p => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === id);
                if (plant) {
                    plantsToRestore.push({
                        growspace_id: plant.attributes.growspace_id || device.device_id,
                        row: plant.attributes.row,
                        col: plant.attributes.col,
                        strain: plant.attributes.strain,
                        phenotype: plant.attributes.phenotype,
                        veg_start: plant.attributes.veg_start,
                        flower_start: plant.attributes.flower_start,
                        mother_start: plant.attributes.mother_start,
                        clone_start: plant.attributes.clone_start,
                        seedling_start: plant.attributes.seedling_start,
                        dry_start: plant.attributes.dry_start,
                        cure_start: plant.attributes.cure_start,
                    });
                    break;
                }
            }
        });

        const success = await plantActions.deletePlants(
            this.plantActionContext,
            ids,
            (id) => this.data.addOptimisticDeletedPlantId(id),
            (id) => this.data.removeOptimisticDeletedPlantId(id)
        );

        if (success) {
            this.pushUndoAction({
                type: ids.length > 1 ? 'batch-delete' : 'delete',
                description: ids.length > 1 ? `Deleted ${ids.length} plants` : `Deleted ${plantsToRestore[0]?.strain || 'plant'}`,
                reverse: async () => {
                    for (const p of plantsToRestore) {
                        await this.dataService.addPlant(p);
                    }
                    await this.refreshData();
                },
                redo: async () => {
                    await this.handleDeletePlant(ids);
                }
            });

            this.ui.deselectPlants(ids);
            if (this.ui.$activeDialog.get().type === 'PLANT_OVERVIEW') {
                this.ui.closeDialog();
            }
            this.updateGrid();
        }
    }

    private pruneOptimisticDeletions() {
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
            toRemove.forEach(id => this.data.removeOptimisticDeletedPlantId(id));
        }
    }

    async handleMovePlantToNextStage(plant: PlantEntity): Promise<boolean> {
        return await plantActions.movePlantToNextStage(this.plantActionContext, plant);
    }

    handleTakeClone = (motherPlant: PlantEntity, numClones?: number): Promise<boolean> => {
        return plantActions.takeClone(this.plantActionContext, motherPlant, numClones);
    };

    async movePlantToGrowspace(plant: PlantEntity, targetGrowspace: string): Promise<boolean> {
        const originalGrowspace = plant.attributes.growspace_id || 'unknown';
        const success = await plantActions.movePlantToGrowspace(this.plantActionContext, plant, targetGrowspace);

        if (success) {
            this.pushUndoAction({
                type: 'move',
                description: `Moved ${plant.attributes.strain || 'plant'} to ${targetGrowspace}`,
                reverse: async () => {
                    await plantActions.movePlantToGrowspace(this.plantActionContext, plant, originalGrowspace);
                },
                redo: async () => {
                    await plantActions.movePlantToGrowspace(this.plantActionContext, plant, targetGrowspace);
                }
            });
        }
        return success;
    }

    async addStrain(strainData: Partial<StrainEntry>) {
        await strainActions.addStrain(this._strainActionContext, strainData);
    }

    async removeStrain(strainKey: string) {
        await strainActions.removeStrain(this._strainActionContext, strainKey);
    }

    async confirmAddPlant(detail: {
        row: number;
        col: number;
        strain: string;
        phenotype?: string;
        veg_start?: string;
        flower_start?: string;
        seedling_start?: string;
        mother_start?: string;
        clone_start?: string;
        dry_start?: string;
        cure_start?: string;
    }) {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!selectedDevice) {
            this.showToast('No growspace selected', 'error');
            return;
        }

        await plantActions.addPlant(
            this.plantActionContext,
            selectedDevice,
            detail.row,
            detail.col,
            detail.strain,
            {
                phenotype: detail.phenotype,
                veg_start: detail.veg_start,
                flower_start: detail.flower_start,
                seedling_start: detail.seedling_start,
                mother_start: detail.mother_start,
                clone_start: detail.clone_start,
                dry_start: detail.dry_start,
                cure_start: detail.cure_start,
            }
        );
    }

    async confirmAddPlants(detail: any) {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!selectedDevice) {
            this.showToast('No growspace selected', 'error');
            return;
        }

        const devices = this.data.$devices.get();
        const beforeIds = new Set<string>();
        devices.forEach(d => d.plants?.forEach(p => beforeIds.add(p.attributes.plant_id || '')));

        try {
            await this.dataService.addPlants({
                growspace_id: selectedDevice,
                ...detail
            });

            await this.refreshData();

            const afterDevices = this.data.$devices.get();
            const addedIds: string[] = [];
            afterDevices.forEach(d => d.plants?.forEach(p => {
                const id = p.attributes.plant_id || '';
                if (id && !beforeIds.has(id)) {
                    addedIds.push(id);
                }
            }));

            if (addedIds.length > 0) {
                this.pushUndoAction({
                    type: 'batch-delete',
                    description: `Added ${addedIds.length} plants`,
                    reverse: async () => {
                        await plantActions.deletePlants(
                            this.plantActionContext,
                            addedIds,
                            (id) => this.data.addOptimisticDeletedPlantId(id),
                            (id) => this.data.removeOptimisticDeletedPlantId(id)
                        );
                        await this.refreshData();
                    },
                    redo: async () => {
                        await this.confirmAddPlants(detail);
                    }
                });
            }

            this.showToast('Batch plants added successfully', 'success');
            this.ui.closeDialog();
        } catch (err: any) {
            this.showToast(`Error: ${err.message}`, 'error');
        }
    }


    toggleEnvGraph(metric: string) {
        if (!this.history) return;

        const isNowActive = this.history.toggleEnvGraph(metric);

        if (isNowActive && this.ui.$viewMode.get() === 'header') {
            this.ui.setViewMode(ViewMode.STANDARD);
        }
    }

    async analyzeGrowspace(query: string, all: boolean) {
        const currentDialog = this.ui.$activeDialog.get();
        if (currentDialog.type === 'GROW_MASTER') {
            this.ui.setActiveDialog({
                ...currentDialog,
                payload: { ...currentDialog.payload, isLoading: true }
            });
        }

        try {
            let response: GrowAdviceResponse;
            if (all) {
                response = await this.dataService.analyzeAllGrowspaces();
            } else {
                const selectedDevice = this.data.$selectedDevice.get();
                if (!selectedDevice) throw new Error("No device selected");
                response = await this.dataService.askGrowAdvice(selectedDevice, query);
            }

            const extractText = (res: GrowAdviceResponse | string): string => {
                if (typeof res === 'string') return res;
                if (!res.response) return JSON.stringify(res);
                if (typeof res.response === 'string') return res.response;
                const nested = res.response as { response?: unknown };
                if ('response' in nested && typeof nested.response === 'string') {
                    return nested.response;
                }
                return JSON.stringify(res.response);
            };
            const text = extractText(response as GrowAdviceResponse | string);

            const d = this.ui.$activeDialog.get();
            if (d.type === 'GROW_MASTER') {
                this.ui.setActiveDialog({
                    type: 'GROW_MASTER',
                    payload: { ...d.payload, isLoading: false, response: text }
                });
            }
        } catch (e: any) {
            const d = this.ui.$activeDialog.get();
            if (d.type === 'GROW_MASTER') {
                this.ui.setActiveDialog({
                    type: 'GROW_MASTER',
                    payload: { ...d.payload, isLoading: false, response: "Error: " + e.message }
                });
            }
        }
    }

    updateGrid() {
        if (this.hass) {
            this.dataService.updateHass(this.hass);
        }
        this.refreshData();
    }

    async handleDrop(
        targetRow: number,
        targetCol: number,
        targetPlant: PlantEntity | null,
        sourcePlant: PlantEntity | null
    ): Promise<boolean> {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!sourcePlant || !selectedDevice) return false;

        const originalRow = sourcePlant.attributes.row;
        const originalCol = sourcePlant.attributes.col;
        const sourceId = sourcePlant.attributes.plant_id || sourcePlant.entity_id.replace('sensor.', '');
        const targetId = targetPlant?.attributes.plant_id || targetPlant?.entity_id.replace('sensor.', '');

        const success = await plantActions.handlePlantDrop(
            this.plantActionContext,
            targetRow,
            targetCol,
            targetPlant,
            sourcePlant
        );

        if (success) {
            this.pushUndoAction({
                type: 'move',
                description: targetPlant ? `Swapped ${sourcePlant.attributes.strain || 'plant'} and ${targetPlant.attributes.strain || 'plant'}` : `Moved ${sourcePlant.attributes.strain || 'plant'} to (${targetRow},${targetCol})`,
                reverse: async () => {
                    if (targetPlant && targetId) {
                        await this.dataService.swapPlants(sourceId, targetId);
                    } else {
                        await plantActions.movePlantPosition(this.plantActionContext, sourcePlant, originalRow, originalCol);
                    }
                    await this.refreshData();
                },
                redo: async () => {
                    await this.handleDrop(targetRow, targetCol, targetPlant, sourcePlant);
                }
            });
            this.updateGrid();
        }
        return success;
    }

    async movePlant(plant: PlantEntity, newRow: number, newCol: number) {
        const success = await plantActions.movePlantPosition(this.plantActionContext, plant, newRow, newCol);
        if (success) {
            this.updateGrid();
        }
    }

    async handleAddGrowspace(detail: { name: string; rows?: number; plants_per_row?: number; notification_service?: string }) {
        await strainActions.addGrowspace(
            this.growspaceActionContext,
            detail.name,
            detail.rows,
            detail.plants_per_row,
            detail.notification_service
        );
    }

    async handleUpdateGrowspace(detail: { growspace_id: string; name: string; rows: number; plants_per_row: number }) {
        await strainActions.updateGrowspace(
            this.growspaceActionContext,
            detail.growspace_id,
            detail.name,
            detail.rows,
            detail.plants_per_row
        );
    }

    async harvestPlant(plant: PlantEntity) {
        await this.handleMovePlantToNextStage(plant);
    }

    async finishDryingPlant(plant: PlantEntity) {
        await this.handleMovePlantToNextStage(plant);
    }

    openBatchWateringDialog(growspaceId?: string) {
        const selectedIds = Array.from(this.ui.$selectedPlants.get());
        if (selectedIds.length === 0 && !growspaceId) return;

        if (!growspaceId && selectedIds.length > 0) {
            growspaceId = this.getCommonGrowspaceId(selectedIds);
        }

        this.ui.setActiveDialog({
            type: 'WATERING',
            payload: {
                mode: 'plant',
                plantIds: selectedIds,
                growspaceId: growspaceId
            }
        });
    }

    openBatchTrainingDialog(growspaceId?: string) {
        const selectedIds = Array.from(this.ui.$selectedPlants.get());
        if (selectedIds.length === 0 && !growspaceId) return;

        if (!growspaceId && selectedIds.length > 0) {
            growspaceId = this.getCommonGrowspaceId(selectedIds);
        }

        this.ui.setActiveDialog({
            type: 'TRAINING',
            payload: {
                isOpen: true,
                plantIds: selectedIds,
                growspaceId: growspaceId
            }
        });
    }

    public getCommonGrowspaceId(plantIds: string[]): string | undefined {
        const plantToDevice = this.data.$plantToDeviceMap.get();
        let commonGrowspaceId: string | undefined;

        for (const plantId of plantIds) {
            const plantGrowspaceId = plantToDevice.get(plantId);
            if (!plantGrowspaceId) continue;

            if (commonGrowspaceId === undefined) {
                commonGrowspaceId = plantGrowspaceId;
            } else if (commonGrowspaceId !== plantGrowspaceId) {
                return undefined; // Mixed growspaces
            }
        }

        return commonGrowspaceId;
    }

    openAddPlantDialog(row?: number, col?: number) {
        if (row !== undefined && col !== undefined) {
            this.fetchStrainLibrary();
            this.ui.setActiveDialog({
                type: 'ADD_PLANT',
                payload: { row, col },
            });
            return;
        }

        const selectedDeviceId = this.data.$selectedDevice.get();
        if (!selectedDeviceId) {
            return;
        }

        const devices = this.data.$devices.get();
        const device = devices.find(d => d.device_id === selectedDeviceId);

        let targetRow = 0;
        let targetCol = 0;

        if (device) {
            const occupied = new Set<string>();
            const deleted = this.data.$optimisticDeletedPlantIds.get();

            device.plants.forEach(p => {
                const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
                if (deleted.has(pId)) return;

                const r = (p.attributes.row !== undefined ? p.attributes.row : 1) - 1;
                const c = (p.attributes.col !== undefined ? p.attributes.col : 1) - 1;
                occupied.add(`${r},${c}`);
            });

            let found = false;
            const rows = device.rows || 4;
            const cols = device.plants_per_row || 4;

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

        this.fetchStrainLibrary();
        this.ui.setActiveDialog({
            type: 'ADD_PLANT',
            payload: { row: targetRow, col: targetCol }
        });
    }

    openStrainRecommendationDialog() {
        this.ui.setActiveDialog({
            type: 'STRAIN_RECOMMENDATION',
            payload: { isLoading: false, response: null }
        });
    }

    async getStrainRecommendation(userQuery: string) {
        const currentDialog = this.ui.$activeDialog.get();

        if (currentDialog.type === 'STRAIN_RECOMMENDATION') {
            this.ui.setActiveDialog({
                ...currentDialog,
                payload: { ...currentDialog.payload, isLoading: true }
            });
        }

        try {
            const res = await this.dataService.getStrainRecommendation(userQuery);
            const extractText = (res: GrowAdviceResponse | string): string => {
                if (typeof res === 'string') return res;
                if (!res.response) return JSON.stringify(res);
                if (typeof res.response === 'string') return res.response;
                const nested = res.response as { response?: unknown };
                if ('response' in nested && typeof nested.response === 'string') {
                    return nested.response;
                }
                return JSON.stringify(res.response);
            };
            const text = extractText(res as GrowAdviceResponse | string);

            const d = this.ui.$activeDialog.get();
            if (d.type === 'STRAIN_RECOMMENDATION') {
                this.ui.setActiveDialog({
                    ...d,
                    payload: { ...d.payload, isLoading: false, response: text }
                });
            }
            return res;
        } catch (e: any) {
            console.error('Error getting strain recommendation:', e);
            const d = this.ui.$activeDialog.get();
            if (d.type === 'STRAIN_RECOMMENDATION') {
                this.ui.setActiveDialog({
                    ...d,
                    payload: { ...d.payload, isLoading: false, response: "Error: " + e.message }
                });
            }
            throw e;
        }
    }

    openNutrientPresetsDialog() {
        this.fetchNutrientPresets();
        this.ui.setActiveDialog({
            type: 'NUTRIENT_PRESETS',
            payload: {}
        });
    }

    openIPMDialog(context?: { growspaceId?: string; plantIds?: string[] }) {
        this.fetchIPMPresets();
        const growspaceId = context?.growspaceId ||
            (!context?.plantIds?.length ? this.data.$selectedDevice.get() || undefined : undefined);

        this.ui.setActiveDialog({
            type: 'IPM',
            payload: {
                growspaceId,
                plantIds: context?.plantIds
            }
        });
    }

    openLogbookDialog() {
        const growspaceId = this.data.$selectedDevice.get();
        if (growspaceId) {
            this.ui.setActiveDialog({
                type: 'LOGBOOK',
                payload: { growspaceId }
            });
        }
    }

    handleExportLibrary() {
        this._handleExportLibraryLogic();
    }

    async _handleExportLibraryLogic() {
        try {
            const library = await this.dataService.fetchStrainLibrary();
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(library));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataStr);
            downloadAnchorNode.setAttribute('download', 'strain_library_export.json');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (e) {
            console.error(e);
            this.showToast('Failed to export library', 'error');
        }
    }

    async toggleDehumidifierControl(deviceId: string) {
        console.warn('toggleDehumidifierControl not fully implemented in data service');
    }

    async performImport(file: File, replace: boolean) {
        try {
            const content = await file.text();
            const strains = JSON.parse(content);
            if (!Array.isArray(strains)) throw new Error('Invalid format');

            for (const strain of strains) {
                await this.addStrain(strain);
            }
            this.showToast('Library imported successfully', 'success');
            this.fetchStrainLibrary(true);
        } catch (e: any) {
            console.error('Import failed', e);
            this.showToast('Import failed: ' + e.message, 'error');
        }
    }

    async batchAction(action: 'remove' | 'transition' | 'harvest', entityIds: string[], data?: Record<string, any>): Promise<void> {
        if (entityIds.length === 0) return;

        if (action === 'remove') {
            entityIds.forEach(id => this.data.addOptimisticDeletedPlantId(id));
        }

        try {
            await this.dataService.callService('growspace_manager', 'batch_action', {
                entity_ids: entityIds,
                action,
                data: data || {}
            });

            this.showToast(`Batch ${action} completed for ${entityIds.length} plant(s)`, 'success');

            this.ui.clearPlantSelection();
            this.ui.setEditMode(false);

            await this.refreshData();
        } catch (err: any) {
            console.error(`Batch ${action} failed:`, err);
            this.showToast(`Batch ${action} failed: ${err.message || 'Unknown error'}`, 'error');

            if (action === 'remove') {
                entityIds.forEach(id => this.data.removeOptimisticDeletedPlantId(id));
            }
        }
    }
}