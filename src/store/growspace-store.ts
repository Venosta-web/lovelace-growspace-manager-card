import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, PlantEntity, PlantOverviewDialogState, GrowspaceAPIResponse, GrowspaceManagerCardConfig, GrowAdviceResponse } from '../types';
import { ViewMode } from '../constants';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils/plant-utils';
import { LibraryExportReadyEvent } from '../events';

// Sub-stores
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from './ui-store';
import { GrowspaceHistoryStore } from './history-store';
import { GrowspaceGridStore } from './grid-store';


import { ActionDispatcher } from './action-dispatcher';
import * as plantActions from './plant-actions';
import * as strainActions from './strain-actions';
import * as keyboardActions from './keyboard-actions';

import { number } from 'zod';

/** Represents an undoable action for the undo/redo stack */
export interface UndoableAction {
    type: 'move' | 'delete' | 'batch-delete';
    description: string;
    reverse: () => Promise<void>;
    redo: () => Promise<void>;
}


export class GrowspaceStore {
    dataService!: DataService;
    hass!: HomeAssistant;

    // Instance-based stores
    public readonly data: GrowspaceDataStore;
    public readonly ui: GrowspaceUIStore;
    public readonly history: GrowspaceHistoryStore;
    public readonly grid: GrowspaceGridStore;

    private _isFetchingWS = false;

    // Performance Optimization
    private _watchedEntities = new Set<string>();
    private _lastHassRef: HomeAssistant | undefined;

    /** Undo/Redo stack for plant operations (max 3 actions) */
    private _undoStack: UndoableAction[] = [];
    private _redoStack: UndoableAction[] = [];
    private readonly MAX_UNDO_ACTIONS = 3;

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

    private get _plantActionContext(): plantActions.PlantActionContext {
        return this.plantActionContext;
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

    private get _growspaceActionContext(): strainActions.GrowspaceActionContext {
        return this.growspaceActionContext;
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
    }

    // === Undo/Redo Methods ===

    /** Push an undoable action onto the stack, clearing redo stack and enforcing limit */
    public pushUndoAction(action: UndoableAction): void {
        this._undoStack.push(action);
        if (this._undoStack.length > this.MAX_UNDO_ACTIONS) {
            this._undoStack.shift(); // Remove oldest
        }
        this._redoStack = []; // Clear redo on new action

        // Show toast with Undo button
        this.showToast(action.description, 'success', {
            label: 'Undo',
            callback: () => this.undo()
        });
    }

    /** Check if undo is available */
    public get canUndo(): boolean {
        return this._undoStack.length > 0;
    }

    /** Check if redo is available */
    public get canRedo(): boolean {
        return this._redoStack.length > 0;
    }

    /** Undo the last action */
    public async undo(): Promise<void> {
        const action = this._undoStack.pop();
        if (!action) return;
        try {
            await action.reverse();
            this._redoStack.push(action);
            this.showToast(`Undone: ${action.description}`, 'info');
        } catch (err) {
            console.error('[Undo failed]', err);
            this.showToast('Undo failed', 'error');
        }
    }

    /** Redo the last undone action */
    public async redo(): Promise<void> {
        const action = this._redoStack.pop();
        if (!action) return;
        try {
            await action.redo();
            this._undoStack.push(action);
            this.showToast(`Redone: ${action.description}`, 'info');
        } catch (err) {
            console.error('[Redo failed]', err);
            this.showToast('Redo failed', 'error');
        }
    }

    updateHass(hass: HomeAssistant) {
        // Optimization: Refencing check
        if (this._lastHassRef === hass) return;

        this.hass = hass;
        this.dataService.updateHass(hass);

        // If cache empty, fetch initial
        const currentCache = this.data.$wsDataCache.get();
        if (Object.keys(currentCache).length === 0 && !this._isFetchingWS) {
            this._refreshGrowspaceData();
            this._lastHassRef = hass;
            return;
        }

        // Deep Optimization: Only update if watched entities changed
        if (this._watchedEntities.size > 0 && this._lastHassRef) {
            let hasChanged = false;
            for (const entityId of this._watchedEntities) {
                if (this.hass.states[entityId] !== this._lastHassRef.states[entityId]) {
                    hasChanged = true;
                    break;
                }
            }
            if (!hasChanged) {
                this._lastHassRef = hass;
                return;
            }
        }

        // Just re-calculate derived state (sync) because entities might have changed
        this._updateDevicesState();
        this._lastHassRef = hass;
    }

    async refreshData() {
        await this._refreshGrowspaceData();
        this.pruneOptimisticDeletions();
    }

    private async _refreshGrowspaceData() {
        if (!this.hass || this._isFetchingWS) return;
        this._isFetchingWS = true;

        // Show loading spinner if we have no devices yet
        if (this.data.$devices.get().length === 0) {
            this.ui.setIsLoading(true);
        }

        try {
            const data = await this.dataService.fetchGrowspaceData();
            this.data.setWsDataCache((data as Record<string, GrowspaceAPIResponse>) || {});
            this._updateDevicesState();

            // Background fetch presets for better UX
            this.fetchNutrientPresets();
            this.fetchIPMPresets();
        } catch (e) {
            console.error('Failed to fetch growspace data', e);
        } finally {
            this._isFetchingWS = false;
            // Check if devices loaded or if a device is selected to turn off loading
            if (this.data.$devices.get().length === 0 || this.data.$selectedDevice.get()) {
                this.ui.setIsLoading(false);
            }
        }
    }

    private _areDeviceArraysEqual(a: GrowspaceDevice[], b: GrowspaceDevice[]): boolean {
        if (a === b) return true;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    private _updateDevicesState() {
        const devices = this.dataService.getGrowspaceDevices(this.data.$wsDataCache.get());
        const currentDevices = this.data.$devices.get();

        if (!this._areDeviceArraysEqual(currentDevices, devices)) {
            this.data.setDevices(devices);
        }

        // Populate watched entities for next update cycle
        this._watchedEntities.clear();
        devices.forEach(d => {
            // Plants
            (d.plants || []).forEach(p => {
                const eid = p.entity_id;
                if (eid) this._watchedEntities.add(eid);
            });
            // Irrigation Config
            if (d.irrigation_config?.irrigation_pump_entity) this._watchedEntities.add(d.irrigation_config.irrigation_pump_entity);
            if (d.irrigation_config?.drain_pump_entity) this._watchedEntities.add(d.irrigation_config.drain_pump_entity);
            // Environment Sensors (e.g. temperature_sensor: 'sensor.x')
            if (d.environment_attributes) {
                Object.values(d.environment_attributes).forEach(val => {
                    if (typeof val === 'string' && val.includes('.')) {
                        this._watchedEntities.add(val);
                    }
                });
            }
        });

        const selectedDevice = this.data.$selectedDevice.get();
        // Auto-select if needed
        if ((!selectedDevice || !this.ui.$defaultApplied.get()) && devices.length > 0) {
            const config = this.data.$config.get();
            const autoSelect = config?.auto_select_growspace ?? true;

            if (this.ui.$defaultApplied.get()) return;

            const defaultDevice = devices.find(
                (d) => d.device_id === config.default_growspace || d.name === config.default_growspace
            );
            if (defaultDevice) {
                this.data.setSelectedDevice(defaultDevice.device_id);
                this.ui.setDefaultApplied(true);
                return;
            }

            // Fallback to first device
            this.data.setSelectedDevice(devices[0].device_id);
        }
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

        // Trigger update logic in case devices are already loaded
        this._updateDevicesState();
    }

    fetchStrainLibrary(force: boolean = false) {
        return this._fetchStrainLibraryImpl(force);
    }

    private async _fetchStrainLibraryImpl(force: boolean) {
        if (!this.hass) return;

        const CACHE_KEY = 'growspace_strain_library_v2';
        const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

        // 1. Try to load from cache
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
                localStorage.removeItem(CACHE_KEY); // Clear bad cache
            }
        }

        // 2. Fetch from backend if no cache or invalid
        if (!usedCache) {
            try {
                const currentStrains = await this.dataService.fetchStrainLibrary();
                if (Array.isArray(currentStrains)) {
                    this.data.setStrainLibrary(currentStrains);

                    // Update cache
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

            // Sync atom
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
        await plantActions.updatePlant(this._plantActionContext, plantId, updates);
    }

    async handleDeletePlant(plantId: string | string[]) {
        const ids = Array.isArray(plantId) ? plantId : [plantId];

        // Capture plant state for Undo
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
            this._plantActionContext,
            ids,
            (id) => this.data.addOptimisticDeletedPlantId(id),
            (id) => this.data.removeOptimisticDeletedPlantId(id)
        );

        if (success) {
            // Push to Undo Stack
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
        return await plantActions.movePlantToNextStage(this._plantActionContext, plant);
    }

    handleTakeClone = (motherPlant: PlantEntity, numClones?: number): Promise<boolean> => {
        return plantActions.takeClone(this._plantActionContext, motherPlant, numClones);
    };

    async movePlantToGrowspace(plant: PlantEntity, targetGrowspace: string): Promise<boolean> {
        const originalGrowspace = plant.attributes.growspace_id || 'unknown';
        const success = await plantActions.movePlantToGrowspace(this._plantActionContext, plant, targetGrowspace);

        if (success) {
            this.pushUndoAction({
                type: 'move',
                description: `Moved ${plant.attributes.strain || 'plant'} to ${targetGrowspace}`,
                reverse: async () => {
                    await plantActions.movePlantToGrowspace(this._plantActionContext, plant, originalGrowspace);
                },
                redo: async () => {
                    await plantActions.movePlantToGrowspace(this._plantActionContext, plant, targetGrowspace);
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

    async confirmAddPlant(detail: { row: number; col: number; strain: string; phenotype: string }) {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!selectedDevice) {
            this.showToast('No growspace selected', 'error');
            return;
        }

        await plantActions.addPlant(
            this._plantActionContext,
            selectedDevice,
            detail.row,
            detail.col,
            detail.strain,
            detail.phenotype
        );
    }

    async confirmAddPlants(detail: any) {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!selectedDevice) {
            this.showToast('No growspace selected', 'error');
            return;
        }

        try {
            await this.dataService.addPlants({
                growspace_id: selectedDevice,
                ...detail
            });
            this.showToast('Batch plants added successfully', 'success');
            this.ui.closeDialog();
            await this.refreshData();
        } catch (err: any) {
            this.showToast(`Error: ${err.message}`, 'error');
        }
    }

    /**
     * Toggles an environment graph on/off.
     * If the graph is turned ON while in 'header' view mode, automatically expands to 'standard' mode.
     */
    toggleEnvGraph(metric: string) {
        if (!this.history) return;

        const isNowActive = this.history.toggleEnvGraph(metric);

        // Auto-expand if we just enabled a graph while in header mode
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

            // Handle various response formats from the API
            const extractText = (res: GrowAdviceResponse | string): string => {
                if (typeof res === 'string') return res;
                if (!res.response) return JSON.stringify(res);
                if (typeof res.response === 'string') return res.response;
                // res.response is an object - check if it has its own 'response' string property
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
            this._plantActionContext,
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
                        await plantActions.movePlantPosition(this._plantActionContext, sourcePlant, originalRow, originalCol);
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
        const success = await plantActions.movePlantPosition(this._plantActionContext, plant, newRow, newCol);
        if (success) {
            this.updateGrid();
        }
    }

    async handleAddGrowspace(detail: { name: string; rows?: number; plants_per_row?: number; notification_service?: string }) {
        await strainActions.addGrowspace(
            this._growspaceActionContext,
            detail.name,
            detail.rows,
            detail.plants_per_row,
            detail.notification_service
        );
    }

    async handleUpdateGrowspace(detail: { growspace_id: string; name: string; rows: number; plants_per_row: number }) {
        await strainActions.updateGrowspace(
            this._growspaceActionContext,
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

        // Determine context if not provided
        if (!growspaceId && selectedIds.length > 0) {
            growspaceId = this._getCommonGrowspaceId(selectedIds);
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

        // Determine context if not provided
        if (!growspaceId && selectedIds.length > 0) {
            growspaceId = this._getCommonGrowspaceId(selectedIds);
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

    private _getCommonGrowspaceId(plantIds: string[]): string | undefined {
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
            // Handle various response formats from the API
            const extractText = (res: GrowAdviceResponse | string): string => {
                if (typeof res === 'string') return res;
                if (!res.response) return JSON.stringify(res);
                if (typeof res.response === 'string') return res.response;
                // res.response is an object - check if it has its own 'response' string property
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
        // Fallback to selected device when no specific growspaceId or plantIds provided
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

    /**
     * Batch Action: perform an action on multiple plants
     * Supports 'remove', 'transition', 'harvest' actions.
     * Applies optimistic UI updates and calls backend service.
     */
    async batchAction(action: 'remove' | 'transition' | 'harvest', entityIds: string[], data?: Record<string, any>): Promise<void> {
        if (entityIds.length === 0) return;

        // Optimistic UI: for 'remove', mark them as deleted immediately
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

            // Clear selection and exit edit mode
            this.ui.clearPlantSelection();
            this.ui.setEditMode(false);

            // Refresh data to get server-confirmed state
            await this.refreshData();
        } catch (err: any) {
            console.error(`Batch ${action} failed:`, err);
            this.showToast(`Batch ${action} failed: ${err.message || 'Unknown error'}`, 'error');

            // Rollback optimistic updates on error
            if (action === 'remove') {
                entityIds.forEach(id => this.data.removeOptimisticDeletedPlantId(id));
            }
        }
    }
}
