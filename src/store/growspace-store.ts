import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, PlantEntity, PlantOverviewDialogState, GrowspaceAPIResponse, GrowspaceManagerCardConfig, GrowAdviceResponse } from '../types';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils/plant-utils';
import { LibraryExportReadyEvent } from '../events';

// Sub-stores
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from './ui-store';
import { GrowspaceHistoryStore } from './history-store';
import { GrowspaceGridStore } from './grid-store';

import * as plantActions from './plant-actions';
import * as strainActions from './strain-actions';
import * as keyboardActions from './keyboard-actions';

export class GrowspaceStore {
    dataService!: DataService;
    hass!: HomeAssistant;

    // Instance-based stores
    public readonly data: GrowspaceDataStore;
    public readonly ui: GrowspaceUIStore;
    public readonly history: GrowspaceHistoryStore;
    public readonly grid: GrowspaceGridStore;

    private _isFetchingWS = false;

    /** Context object for plant action functions */
    private get _plantActionContext(): plantActions.PlantActionContext {
        return {
            dataService: this.dataService,
            showToast: (msg, type) => this.showToast(msg, type),
            closeDialog: () => this.ui.closeDialog(),
            refreshData: () => this.refreshData(),
        };
    }

    /** Context object for strain action functions */
    private get _strainActionContext(): strainActions.StrainActionContext {
        return {
            dataService: this.dataService,
            showToast: (msg, type) => this.showToast(msg, type),
            closeDialog: () => this.ui.closeDialog(),
            refreshData: () => this.refreshData(),
            refreshStrainLibrary: (force) => this.fetchStrainLibrary(force),
            setStrainLibrary: (lib) => this.data.setStrainLibrary(lib),
            getStrainLibrary: () => this.data.$strainLibrary.get(),
        };
    }

    /** Context object for growspace action functions */
    private get _growspaceActionContext(): strainActions.GrowspaceActionContext {
        return {
            dataService: this.dataService,
            showToast: (msg, type) => this.showToast(msg, type),
            closeDialog: () => this.ui.closeDialog(),
            refreshData: () => this.refreshData(),
        };
    }

    /** Context object for keyboard action functions */
    private get _keyboardActionContext(): keyboardActions.KeyboardActionContext {
        return {
            exitEditMode: () => this.exitEditMode(),
            handlePlantClick: (plant) => this.handlePlantClick(plant),
            handleDeletePlant: (plantId) => this.handleDeletePlant(plantId),
        };
    }

    constructor() {
        this.dataService = new DataService();

        // Initialize sub-stores
        this.data = new GrowspaceDataStore();
        this.ui = new GrowspaceUIStore();
        this.history = new GrowspaceHistoryStore(this.dataService, this.data);
        this.grid = new GrowspaceGridStore(this.data);
    }

    updateHass(hass: HomeAssistant) {
        this.hass = hass;
        this.dataService.updateHass(hass);

        // If cache empty, fetch initial
        const currentCache = this.data.$wsDataCache.get();
        if (Object.keys(currentCache).length === 0 && !this._isFetchingWS) {
            this._refreshGrowspaceData();
        } else {
            // Just re-calculate derived state (sync) because entities might have changed
            this._updateDevicesState();
        }

        this.pruneOptimisticDeletions();
    }

    async refreshData() {
        await this._refreshGrowspaceData();
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
            this.ui.setViewMode('compact');
        } else if (this.ui.$viewMode.get() === 'compact') {
            this.ui.setViewMode('standard');
        }
    }

    toggleHeaderExpansion() {
        if (this.ui.$viewMode.get() === 'header') {
            this.ui.setViewMode('standard');
        } else {
            this.ui.setViewMode('header');
        }
    }

    showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
        this.ui.showToast(message, type);
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

        const success = await plantActions.deletePlants(
            this._plantActionContext,
            ids,
            (id) => this.data.addOptimisticDeletedPlantId(id),
            (id) => this.data.removeOptimisticDeletedPlantId(id)
        );

        if (success) {
            ids.forEach((id) => this.ui.togglePlantSelection(id));
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

    async handleMovePlantToNextStage(plant: PlantEntity) {
        await plantActions.movePlantToNextStage(this._plantActionContext, plant);
    }

    handleTakeClone = (motherPlant: PlantEntity, numClones?: number) => {
        return plantActions.takeClone(this._plantActionContext, motherPlant, numClones);
    };

    async movePlantToGrowspace(plant: PlantEntity, targetGrowspace: string) {
        await plantActions.movePlantToGrowspace(this._plantActionContext, plant, targetGrowspace);
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
    ) {
        const selectedDevice = this.data.$selectedDevice.get();
        if (!sourcePlant || !selectedDevice) return;

        const success = await plantActions.handlePlantDrop(
            this._plantActionContext,
            targetRow,
            targetCol,
            targetPlant,
            sourcePlant
        );
        if (success) {
            this.updateGrid();
        }
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
}
