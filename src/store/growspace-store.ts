import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, PlantEntity, PlantOverviewDialogState, GrowspaceAPIResponse, GrowspaceManagerCardConfig } from '../types';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils/plant-utils';
import { LibraryExportReadyEvent } from '../events';
import * as uiStore from './ui-store';
import * as dataStore from './data-store';
import * as plantActions from './plant-actions';
import * as strainActions from './strain-actions';
import * as keyboardActions from './keyboard-actions';

export class GrowspaceStore implements ReactiveController {
    host: ReactiveControllerHost;
    dataService!: DataService;
    hass!: HomeAssistant;

    // Cache for raw WebSocket data
    private wsDataCache: Record<string, GrowspaceAPIResponse> = {};
    private _unsubEvents: (() => void) | undefined;
    private _isFetchingWS = false;

    /** Context object for plant action functions */
    private get _plantActionContext(): plantActions.PlantActionContext {
        return {
            dataService: this.dataService,
            showToast: (msg, type) => this.showToast(msg, type),
            closeDialog: () => uiStore.closeDialog(),
            refreshData: () => this.refreshData(),
        };
    }

    /** Context object for strain action functions */
    private get _strainActionContext(): strainActions.StrainActionContext {
        return {
            dataService: this.dataService,
            showToast: (msg, type) => this.showToast(msg, type),
            closeDialog: () => uiStore.closeDialog(),
            refreshData: () => this.refreshData(),
            refreshStrainLibrary: (force) => this.fetchStrainLibrary(force),
            setStrainLibrary: (lib) => dataStore.$strainLibrary.set(lib),
            getStrainLibrary: () => dataStore.$strainLibrary.get(),
        };
    }

    /** Context object for growspace action functions */
    private get _growspaceActionContext(): strainActions.GrowspaceActionContext {
        return {
            dataService: this.dataService,
            showToast: (msg, type) => this.showToast(msg, type),
            closeDialog: () => uiStore.closeDialog(),
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

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);

        console.log('GrowspaceStore initialized (Nano Stores)');
        this.dataService = new DataService();
    }

    hostConnected() {
        // Lifecycle hook
        // We can't subscribe here because hass might not be set yet.
        // Logic handled in updateHass/subscribe
    }

    hostDisconnected() {
        if (this._unsubEvents) {
            this._unsubEvents();
            this._unsubEvents = undefined;
        }
    }

    updateHass(hass: HomeAssistant) {
        this.hass = hass;
        this.dataService.updateHass(hass);

        this._ensureEventSubscription();

        // If cache empty, fetch initial
        if (Object.keys(this.wsDataCache).length === 0 && !this._isFetchingWS) {
            this._refreshGrowspaceData();
        } else {
            // Just re-calculate derived state (sync) because entities might have changed
            this._updateDevicesState();
        }

        this.pruneOptimisticDeletions();
    }

    private async _ensureEventSubscription() {
        if (this._unsubEvents || !this.hass) return;

        try {
            this._unsubEvents = await this.hass.connection.subscribeEvents(
                (event) => this.handleOptimisticEvent(event),
                'growspace_manager_updated'
            );
        } catch (err) {
            console.error('Failed to subscribe to growspace events', err);
        }
    }

    private handleOptimisticEvent(event: any) {
        const { event_type, data } = event.data;

        // Map backend event types to actions
        if (event_type === 'plant_added' || event_type === 'plant_updated') {
            this._handlePlantUpdate(data.plant);
        } else if (event_type === 'plant_removed') {
            this._handlePlantRemoval(data.plant_id, data.growspace_id);
        }
    }

    private _handlePlantUpdate(plantData: any) {
        // 1. Find and remove old instance if exists (to handle moves)
        this._removePlantFromCacheInAllGrowspaces(plantData.plant_id);

        // 2. Add to new location
        const gsId = plantData.growspace_id || plantData.attributes?.growspace_id;
        if (gsId && this.wsDataCache[gsId]) {
            const correctKey = `position_${plantData.row}_${plantData.col}`;
            this._updateGridImmutably(gsId, (grid) => {
                grid[correctKey] = plantData;
            });
            this._updateDevicesState();
        }
    }

    private _handlePlantRemoval(plantId: string, growspaceId?: string) {
        if (growspaceId) {
            this._removePlantFromCache(growspaceId, plantId);
        } else {
            this._removePlantFromCacheInAllGrowspaces(plantId);
        }
        this._updateDevicesState();
    }

    private _removePlantFromCacheInAllGrowspaces(plantId: string) {
        Object.keys(this.wsDataCache).forEach(gsId => {
            this._removePlantFromCache(gsId, plantId);
        });
    }

    /**
     * Immutably updates the grid for a growspace.
     * Creates shallow copies at growspace and grid levels before applying the mutator.
     */
    private _updateGridImmutably(
        gsId: string,
        mutator: (grid: Record<string, any>) => void
    ): void {
        if (!this.wsDataCache[gsId]) return;
        this.wsDataCache[gsId] = { ...this.wsDataCache[gsId] };
        const grid = { ...this.wsDataCache[gsId].grid };
        this.wsDataCache[gsId].grid = grid;
        mutator(grid);
    }

    private _removePlantFromCache(gsId: string, plantId: string) {
        if (!this.wsDataCache[gsId] || !this.wsDataCache[gsId].grid) return;

        this._updateGridImmutably(gsId, (grid) => {
            Object.keys(grid).forEach(key => {
                const plant = grid[key];
                if (plant && (plant.plant_id === plantId || plant.entity_id?.endsWith(plantId))) {
                    grid[key] = null;
                }
            });
        });
    }

    async refreshData() {
        await this._refreshGrowspaceData();
    }

    private async _refreshGrowspaceData() {
        if (!this.hass || this._isFetchingWS) return;
        this._isFetchingWS = true;

        // Show loading spinner if we have no devices yet
        if (dataStore.$devices.get().length === 0) {
            uiStore.setIsLoading(true);
        }

        try {
            const data = await this.dataService.fetchGrowspaceData();
            this.wsDataCache = (data as Record<string, GrowspaceAPIResponse>) || {};
            this._updateDevicesState();
        } catch (e) {
            console.error('Failed to fetch growspace data', e);
        } finally {
            this._isFetchingWS = false;
            if (dataStore.$devices.get().length === 0 || dataStore.$selectedDevice.get()) {
                uiStore.setIsLoading(false);
            }
        }
    }

    private _areDeviceArraysEqual(a: GrowspaceDevice[], b: GrowspaceDevice[]): boolean {
        if (a === b) return true;
        if (a.length !== b.length) return false;
        // Check referential equality of items (assuming device objects are stable if content is stable)
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    private _updateDevicesState() {
        const devices = this.dataService.getGrowspaceDevices(this.wsDataCache);
        const currentDevices = dataStore.$devices.get();

        if (!this._areDeviceArraysEqual(currentDevices, devices)) {
            dataStore.setDevices(devices);
        }

        const selectedDevice = dataStore.$selectedDevice.get();
        // Auto-select if needed (handles initial load race condition where updateHass hasn't run yet)
        if (!selectedDevice && devices.length > 0) {
            const config = dataStore.$config.get();
            const autoSelect = config?.auto_select_growspace ?? true;

            if (uiStore.$defaultApplied.get()) return;

            const defaultDevice = devices.find(
                (d) => d.device_id === config.default_growspace || d.name === config.default_growspace
            );
            if (defaultDevice) {
                dataStore.setSelectedDevice(defaultDevice.device_id);
                uiStore.setDefaultApplied(true);
                return;
            }

            // Fallback to first device
            dataStore.setSelectedDevice(devices[0].device_id);
        }
    }

    // --- Actions / Logic ---

    // State Setters
    setIsCompactView(value: boolean) {
        if (value) {
            uiStore.setViewMode('compact');
        } else if (uiStore.$viewMode.get() === 'compact') {
            uiStore.setViewMode('standard');
        }
    }

    toggleHeaderExpansion() {
        if (uiStore.$viewMode.get() === 'header') {
            uiStore.setViewMode('standard');
        } else {
            uiStore.setViewMode('header');
        }
    }

    showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
        uiStore.showToast(message, type);
    }

    initializeSelectedDevice(config: GrowspaceManagerCardConfig) {
        dataStore.setConfig(config);

        // Set view mode from config
        if (config?.initial_view_mode) {
            uiStore.setViewMode(config.initial_view_mode);
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
                    dataStore.setStrainLibrary(cache.data);
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
                    dataStore.setStrainLibrary(currentStrains);

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
        keyboardActions.handleKeyboardNavigation(this._keyboardActionContext, key);
    }

    handleDeviceChange(deviceId: string) {
        dataStore.setSelectedDevice(deviceId);
    }

    togglePlantSelection(plantOrId: string | PlantEntity) {
        const plantId = typeof plantOrId === 'string' ? plantOrId : plantOrId.attributes.plant_id || '';
        if (!plantId) return;

        uiStore.togglePlantSelection(plantId);
    }

    selectAllPlants() {
        const selectedDevice = dataStore.$selectedDevice.get();
        if (!selectedDevice) return;

        const devices = dataStore.$devices.get();
        const selectedDeviceData = devices.find((d) => d.device_id === selectedDevice);

        const allIds: string[] = [];

        if (selectedDeviceData && selectedDeviceData.plants) {
            selectedDeviceData.plants.forEach((plant) => {
                const pId = plant.attributes.plant_id;
                if (pId && !dataStore.$optimisticDeletedPlantIds.get().has(pId)) {
                    allIds.push(pId);
                }
            });

            // Sync atom
            uiStore.selectAllPlants(allIds);
        }
    }

    setSelectedPlants(plantIds: Set<string>) {
        // No-op for now unless we need to sync specific sets
    }

    clearPlantSelection() {
        uiStore.clearPlantSelection();
    }

    exitEditMode() {
        uiStore.setEditMode(false);
        uiStore.clearPlantSelection();
    }

    handlePlantClick(plant: PlantEntity) {
        if (uiStore.$isEditMode.get() && uiStore.$selectedPlants.get().size > 0) {
            const plantId = plant.attributes.plant_id;
            if (plantId && !uiStore.$selectedPlants.get().has(plantId)) {
                this.togglePlantSelection(plantId);
            }
            this.openPlantOverviewDialog(plant, Array.from(uiStore.$selectedPlants.get()));
        } else {
            this.openPlantOverviewDialog(plant);
        }
    }

    openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
        uiStore.$activeDialog.set({
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

        // Use extracted pure function for payload generation
        const payloadTemplate = PlantUtils.mapDialogToApiPayload(editedAttributes, isBulkEdit);

        try {
            const updatePromises = targetIds.map((id: string) => {
                const payload = { ...payloadTemplate, plant_id: id };
                return this.dataService.updatePlant(payload);
            });

            await Promise.all(updatePromises);

            uiStore.closeDialog();

            if (uiStore.$isEditMode.get()) {
                uiStore.clearPlantSelection();
                uiStore.setEditMode(false);
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
            (id) => dataStore.addOptimisticDeletedPlantId(id),
            (id) => dataStore.removeOptimisticDeletedPlantId(id)
        );

        if (success) {
            ids.forEach((id) => uiStore.togglePlantSelection(id));
            if (uiStore.$activeDialog.get().type === 'PLANT_OVERVIEW') {
                uiStore.closeDialog();
            }
            this.updateGrid();
        }
    }

    private pruneOptimisticDeletions() {
        const optimisticIds = dataStore.$optimisticDeletedPlantIds.get();
        if (optimisticIds.size === 0) return;

        const allPlantIds = new Set<string>();
        const devices = dataStore.$devices.get();
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
            toRemove.forEach(id => dataStore.removeOptimisticDeletedPlantId(id));
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
        const selectedDevice = dataStore.$selectedDevice.get();
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
        const currentDialog = uiStore.$activeDialog.get();
        if (currentDialog.type === 'GROW_MASTER') {
            uiStore.$activeDialog.set({
                ...currentDialog,
                payload: { ...currentDialog.payload, isLoading: true }
            });
        }

        try {
            let response;
            if (all) {
                // @ts-ignore
                response = await this.dataService.analyzeAllGrowspaces();
            } else {
                const selectedDevice = dataStore.$selectedDevice.get();
                if (!selectedDevice) throw new Error("No device selected");
                // @ts-ignore
                response = await this.dataService.askGrowAdvice(selectedDevice, query);
            }

            // Handle response wrapping
            const text = (response as any).response || response;

            const d = uiStore.$activeDialog.get();
            if (d.type === 'GROW_MASTER') {
                uiStore.$activeDialog.set({
                    type: 'GROW_MASTER',
                    payload: { ...d.payload, isLoading: false, response: typeof text === 'string' ? text : JSON.stringify(text) }
                });
            }
        } catch (e: any) {
            const d = uiStore.$activeDialog.get();
            if (d.type === 'GROW_MASTER') {
                uiStore.$activeDialog.set({
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
        const selectedDevice = dataStore.$selectedDevice.get();
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
        // If row/col specified, use them (clicked from grid)
        if (row !== undefined && col !== undefined) {
            this.fetchStrainLibrary();
            uiStore.$activeDialog.set({
                type: 'ADD_PLANT',
                payload: { row, col },
            });
            return;
        }

        const selectedDeviceId = dataStore.$selectedDevice.get();
        if (!selectedDeviceId) {
            return;
        }

        // Auto-find first empty slot
        const devices = dataStore.$devices.get();
        const device = devices.find(d => d.device_id === selectedDeviceId);

        let targetRow = 0;
        let targetCol = 0;

        if (device) {
            const occupied = new Set<string>();
            const deleted = dataStore.$optimisticDeletedPlantIds.get();

            device.plants.forEach(p => {
                const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
                if (deleted.has(pId)) return;

                // Attributes are 1-based, grid is 0-based
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
        uiStore.$activeDialog.set({
            type: 'ADD_PLANT',
            payload: { row: targetRow, col: targetCol }
        });
    }


    openStrainRecommendationDialog() {
        uiStore.$activeDialog.set({
            type: 'STRAIN_RECOMMENDATION',
            payload: { isLoading: false, response: null }
        });
    }

    async getStrainRecommendation(userQuery: string) {
        const currentDialog = uiStore.$activeDialog.get();

        if (currentDialog.type === 'STRAIN_RECOMMENDATION') {
            uiStore.$activeDialog.set({
                ...currentDialog,
                payload: { ...currentDialog.payload, isLoading: true }
            });
        }

        try {
            // @ts-ignore
            const res = await this.dataService.getStrainRecommendation(userQuery);
            const text = (res as any).response || res;

            const d = uiStore.$activeDialog.get();
            if (d.type === 'STRAIN_RECOMMENDATION') {
                uiStore.$activeDialog.set({
                    ...d,
                    payload: { ...d.payload, isLoading: false, response: text }
                });
            }
            return res;
        } catch (e: any) {
            console.error('Error getting strain recommendation:', e);
            const d = uiStore.$activeDialog.get();
            if (d.type === 'STRAIN_RECOMMENDATION') {
                uiStore.$activeDialog.set({
                    ...d,
                    payload: { ...d.payload, isLoading: false, response: "Error: " + e.message }
                });
            }
            throw e;
        }
    }


    openLogbookDialog() {
        const growspaceId = dataStore.$selectedDevice.get();
        if (growspaceId) {
            uiStore.$activeDialog.set({
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
            document.body.appendChild(downloadAnchorNode); // required for firefox
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

            // Sequential for now
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
