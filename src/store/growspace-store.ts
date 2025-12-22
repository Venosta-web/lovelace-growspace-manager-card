import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DateTime } from 'luxon';
import { GrowspaceDevice, StrainEntry, PlantEntity, CropMeta, GrowspaceViewMode, PlantOverviewDialogState, GrowspaceAPIResponse, GrowspaceManagerCardConfig } from '../types';
import { ActiveDialogState } from '../ui-state';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils/plant-utils';
import { LibraryExportReadyEvent } from '../events';
import * as uiStore from './ui-store';

// Simplified interface (removed UI state)
export interface GrowspaceState {
    devices: GrowspaceDevice[];
    selectedDevice: string | null;
    config: GrowspaceManagerCardConfig;
    strainLibrary: StrainEntry[];
    optimisticDeletedPlantIds: Set<string>;
}

export class GrowspaceStore implements ReactiveController {
    host: ReactiveControllerHost;
    dataService!: DataService;
    hass!: HomeAssistant;

    // State
    state: GrowspaceState = new Proxy({
        devices: [],
        selectedDevice: null,
        config: {} as GrowspaceManagerCardConfig,
        strainLibrary: [],
        optimisticDeletedPlantIds: new Set(),
    } as GrowspaceState, {
        set: (target, prop, value) => {
            const oldVal = target[prop as keyof GrowspaceState];
            if (oldVal !== value) {
                (target as any)[prop] = value;
                this.host.requestUpdate();
            }
            return true;
        }
    });

    private wsDataCache: Record<string, GrowspaceAPIResponse> = {};
    private _unsubEvents: (() => void) | undefined;
    private _isFetchingWS = false;
    private _config: GrowspaceManagerCardConfig | undefined; // Store config here

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);

        console.log('GrowspaceStore initialized with Reactive Proxy');
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

        // Auto-select logic moved to _updateDevicesState to ensure config is available
        // and to handle cases where devices are loaded after hass update.
        // This block is now redundant here.
        // if (!this.state.selectedDevice && this.state.devices.length > 0) {
        //     this.state.selectedDevice = this.state.devices[0].device_id;
        //     // Ensure the UI knows we are ready to display
        //     if (uiStore.setIsLoading.get()) { // Check        if (uiStore.$isLoading.get()) return;
        uiStore.setIsLoading(true);
        //     }
        // }

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
            // Invalidate cache by shallow copying the growspace data object
            // This ensures DataService sees a new reference and re-transforms the data
            this.wsDataCache[gsId] = { ...this.wsDataCache[gsId] };

            // Note: We also need to shallow copy the grid if we want perfect immutability,
            // but for DataService.getGrowspaceDevices, changing the top-level object ref is enough.
            // However, to be safe and cleaner properly:
            const grid = { ...this.wsDataCache[gsId].grid };
            this.wsDataCache[gsId].grid = grid;

            const posKey = plantData.position || `position_${plantData.row}_${plantData.col}`;
            // Use position from payload (it was constructed in serializer as `position`)
            // Backend serializer returns "position": "(r,c)" format? 
            // Wait, serializers.py line 254: "position": f"({row_i},{col_i})"
            // BUT GrowspaceSerializer._generate_rich_plant_grid used keys "position_r_c".
            // Store uses grid keys "position_r_c".
            // So I need to construct the key properly.
            // Payload HAS 'row' and 'col'.
            const correctKey = `position_${plantData.row}_${plantData.col}`;

            // Note: plantData is the SERIALIZED plant from backend.
            // Use it directly.
            grid[correctKey] = plantData;

            // Updates stats if needed (total_plants)
            // this.wsDataCache[gsId].total_plants = ... (complex to track, maybe skip or naive increment?)

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

    private _removePlantFromCache(gsId: string, plantId: string) {
        if (!this.wsDataCache[gsId] || !this.wsDataCache[gsId].grid) return;

        // Invalidate cache
        this.wsDataCache[gsId] = { ...this.wsDataCache[gsId] };
        const grid = { ...this.wsDataCache[gsId].grid };
        this.wsDataCache[gsId].grid = grid;

        // Find key with this plant ID
        // Since grid is keyed by position, we have to scan values
        Object.keys(grid).forEach(key => {
            const plant = grid[key];
            if (plant && (plant.plant_id === plantId || plant.entity_id?.endsWith(plantId))) {
                grid[key] = null;
            }
        });
    }

    async refreshData() {
        await this._refreshGrowspaceData();
    }

    private async _refreshGrowspaceData() {
        if (!this.hass || this._isFetchingWS) return;
        this._isFetchingWS = true;

        // Show loading spinner if we have no devices yet
        if (this.state.devices.length === 0) {
            uiStore.setIsLoading(true); // Update atom
        }

        try {
            // fetchGrowspaceData without ID returns Record<string, GrowspaceAPIResponse>
            const data = await this.dataService.fetchGrowspaceData();
            // We know it's a collection because we didn't pass an ID
            this.wsDataCache = (data as Record<string, GrowspaceAPIResponse>) || {};
            this._updateDevicesState();
        } catch (e) {
            console.error('Failed to fetch growspace data', e);
        } finally {
            this._isFetchingWS = false;
            // Only clear loading if we didn't find any devices OR if we already have a selection
            // If we found devices but no selection, wait for auto-select logic in updateHass/initialize
            if (this.state.devices.length === 0 || this.state.selectedDevice) {
                uiStore.setIsLoading(false); // Update atom
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

        if (!this._areDeviceArraysEqual(this.state.devices, devices)) {
            this.state.devices = devices;
        }

        // Auto-select if needed (handles initial load race condition where updateHass hasn't run yet)
        if (!this.state.selectedDevice && devices.length > 0) {
            //        const defaultDevice = this._config?.default_growspace;
            const autoSelect = this._config?.auto_select_growspace ?? true;

            if (uiStore.$defaultApplied.get()) return; {
                const defaultDevice = devices.find(
                    (d) => d.device_id === this.state.config.default_growspace || d.name === this.state.config.default_growspace
                );
                if (defaultDevice) {
                    this.state.selectedDevice = defaultDevice.device_id;
                    uiStore.setDefaultApplied(true);
                    return;
                }
            }
            // Fallback to first device
            this.state.selectedDevice = devices[0].device_id;
        }
    }

    requestUpdate() {
        this.host.requestUpdate();
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
        uiStore.showToast(message, type); // Update atom
    }

    initializeSelectedDevice(config: GrowspaceManagerCardConfig) {
        this.state.config = config;

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
                    this.state.strainLibrary = cache.data;
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
                    this.state.strainLibrary = currentStrains;

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
        if (uiStore.$isEditMode.get() && key === 'Escape') {
            this.exitEditMode();
            return;
        }

        if (!this.state.selectedDevice) return;
        const devices = this.state.devices;
        const device = devices.find((d) => d.device_id === this.state.selectedDevice);
        if (!device) return;

        const plants = device.plants.filter(
            (p) => !this.state.optimisticDeletedPlantIds.has(p.attributes.plant_id || '')
        );
        if (plants.length === 0) return;

        if (key === 'ArrowRight') {
            uiStore.setFocusedPlantIndex((uiStore.$focusedPlantIndex.get() + 1) % plants.length);
        } else if (key === 'ArrowLeft') {
            uiStore.setFocusedPlantIndex((uiStore.$focusedPlantIndex.get() - 1 + plants.length) % plants.length);
        } else if (key === 'Enter' || key === ' ') {
            if (uiStore.$focusedPlantIndex.get() >= 0 && uiStore.$focusedPlantIndex.get() < plants.length) {
                this.handlePlantClick(plants[uiStore.$focusedPlantIndex.get()]);
            }
        } else if (key === 'Delete' || key === 'Backspace') {
            if (uiStore.$focusedPlantIndex.get() >= 0 && uiStore.$focusedPlantIndex.get() < plants.length) {
                const focusedPlant = plants[uiStore.$focusedPlantIndex.get()];
                if (focusedPlant) {
                    this.handleDeletePlant(focusedPlant.entity_id);
                }
            } else if (uiStore.$selectedPlants.get().size > 0) {
                // If multiple plants are selected, delete them
                this.handleDeletePlant(Array.from(uiStore.$selectedPlants.get()));
            }
        }
    }

    handleDeviceChange(deviceId: string) {
        this.state.selectedDevice = deviceId;
    }

    togglePlantSelection(plantOrId: string | PlantEntity) {
        const plantId = typeof plantOrId === 'string' ? plantOrId : plantOrId.attributes.plant_id || '';
        if (!plantId) return;

        uiStore.togglePlantSelection(plantId);
    }

    selectAllPlants() {
        if (!this.state.selectedDevice) return;

        // This logic requires access to 'devices' which is in God Store.
        // So we keep logic here but update ATOM.

        const devices = this.state.devices;
        const selectedDeviceData = devices.find((d) => d.device_id === this.state.selectedDevice);

        const allIds: string[] = [];

        if (selectedDeviceData && selectedDeviceData.plants) {
            selectedDeviceData.plants.forEach((plant) => {
                const pId = plant.attributes.plant_id;
                if (pId && !this.state.optimisticDeletedPlantIds.has(pId)) {
                    allIds.push(pId);
                }
            });

            // Sync atom
            uiStore.selectAllPlants(allIds);
        }
    }

    setSelectedPlants(plantIds: Set<string>) {
        // This method seems rarely used, maybe tests?
        // ui-store doesn't have explicit set multiple (except via loop or clear then toggle).
        // Let's skip strict sync if not critical.
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
        try {
            await this.dataService.updatePlant({ plant_id: plantId, ...updates });
            this.showToast('Plant updated', 'success');
            // Dialog might stay open or close? Usually stay open for overview.
        } catch (e: any) {
            console.error('Failed to update plant:', e);
            this.showToast(`Failed to update plant: ${e.message}`, 'error');
        }
    }

    async handleDeletePlant(plantId: string | string[]) {
        const ids = Array.isArray(plantId) ? plantId : [plantId];

        const newOptimistic = new Set(this.state.optimisticDeletedPlantIds);
        ids.forEach((id) => newOptimistic.add(id));
        this.state.optimisticDeletedPlantIds = newOptimistic;

        try {
            // Check if backend supports bulk delete? If not, loop.
            // Assuming dataService.deletePlant takes one ID.
            await Promise.all(ids.map((id) => this.dataService.removePlant(id)));

            this.showToast('Plant(s) deleted', 'success');

            // Do NOT remove from optimistic set here.
            // We wait for updateHass/pruneOptimisticDeletions to confirm they are gone from HA state.

            ids.forEach((id) => {
                uiStore.togglePlantSelection(id); // Effectively remove if it was selected
            });

            if (uiStore.$activeDialog.get().type === 'PLANT_OVERVIEW') {
                uiStore.closeDialog();
            }
            this.updateGrid();
        } catch (e: any) {
            console.error('Failed to delete plant:', e);
            this.showToast(`Failed to delete: ${e.message}`, 'error');

            const revertedOptimistic = new Set(this.state.optimisticDeletedPlantIds);
            ids.forEach((id) => revertedOptimistic.delete(id));
            this.state.optimisticDeletedPlantIds = revertedOptimistic;
        }
    }

    private pruneOptimisticDeletions() {
        if (this.state.optimisticDeletedPlantIds.size === 0) return;

        const allPlantIds = new Set<string>();
        const devices = this.state.devices;
        devices.forEach((d) =>
            d.plants.forEach((p) =>
                allPlantIds.add(p.attributes.plant_id || p.entity_id.replace('sensor.', ''))
            )
        );

        const toRemove = new Set<string>();
        this.state.optimisticDeletedPlantIds.forEach((id) => {
            // If the plant ID is NOT in the current data, it means deletion is confirmed/propagated.
            // So we can stop masking it.
            if (!allPlantIds.has(id)) {
                toRemove.add(id);
            }
        });

        if (toRemove.size > 0) {
            const newOptimistic = new Set(this.state.optimisticDeletedPlantIds);
            toRemove.forEach((id) => newOptimistic.delete(id));
            this.state.optimisticDeletedPlantIds = newOptimistic;
        }
    }

    async handleMovePlantToNextStage(plant: PlantEntity) {
        const stage = plant.attributes?.stage;
        let targetGrowspace = '';

        const movableStages = new Set(['mother', 'flower', 'dry', 'cure']);
        if (!stage || !movableStages.has(stage)) {
            this.showToast(
                'Plant must be in mother or flower or dry or cure stage to move. stage is ' + stage,
                'error'
            );
            return;
        }

        if (stage === 'flower') {
            targetGrowspace = 'dry';
        } else if (stage === 'dry') {
            targetGrowspace = 'cure';
        } else if (stage === 'mother') {
            targetGrowspace = 'clone';
        } else {
            console.error('Unknown stage, cannot move plant', targetGrowspace);
            targetGrowspace = 'error';
        }

        try {
            const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
            await this.dataService.harvestPlant(plantId, targetGrowspace);
            uiStore.closeDialog();
        } catch (err) {
            console.error('Error moving plant to next stage:', err);
        }
    }

    handleTakeClone = (motherPlant: PlantEntity, numClones?: number) => {
        const plantId =
            motherPlant.attributes?.plant_id || motherPlant.entity_id.replace('sensor.', '');

        this.dataService
            .takeClone({
                mother_plant_id: plantId,
                num_clones: numClones,
            })
            .then(() => {
                console.log(`Clone taken from ${motherPlant.attributes?.strain || 'plant'}`);
            })
            .catch((error: any) => {
                console.error(`Failed to take clone: ${error.message}`);
            });
    };

    async movePlantToGrowspace(plant: PlantEntity, targetGrowspace: string) {
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
        const currentStage = plant.attributes?.stage || 'unknown';

        try {
            if (currentStage === 'clone') {
                // Clones use specific service to handle transition to Veg
                await this.dataService.moveClone(plantId, targetGrowspace);
            } else {
                // Other stages use harvest loop (flower->dry->cure etc)
                await this.dataService.harvestPlant(plantId, targetGrowspace);
            }

            this.showToast(`Plant moved to ${targetGrowspace}`, 'success');
            await this.refreshData();
            uiStore.closeDialog();
        } catch (err: any) {
            console.error('Error moving plant:', err);
            this.showToast(`Failed to move plant: ${err.message}`, 'error');
        }
    }

    async addStrain(strainData: Partial<StrainEntry>) {
        if (!strainData.strain) return;

        const payload = {
            strain: strainData.strain,
            phenotype: strainData.phenotype,
            breeder: strainData.breeder,
            type: strainData.type,
            flowering_days_min: strainData.flowering_days_min
                ? Number(strainData.flowering_days_min)
                : undefined,
            flowering_days_max: strainData.flowering_days_max
                ? Number(strainData.flowering_days_max)
                : undefined,
            lineage: strainData.lineage,
            sex: strainData.sex,
            description: strainData.description,
            image: strainData.image,
            image_crop_meta: strainData.image_crop_meta,
            sativa_percentage: strainData.sativa_percentage,
            indica_percentage: strainData.indica_percentage,
        };

        try {
            await this.dataService.addStrain(payload);
            this.showToast('Strain saved successfully!', 'success');
            await this.fetchStrainLibrary(true);
        } catch (err) {
            console.error('Error adding strain:', err);
        }
    }

    async removeStrain(strainKey: string) {
        try {
            const parts = strainKey.split('|');
            const strain = parts[0];
            const phenotype = parts.length > 1 && parts[1] !== 'default' ? parts[1] : undefined;

            await this.dataService.removeStrain(strain, phenotype);

            if (this.state.strainLibrary) {
                this.state.strainLibrary = this.state.strainLibrary.filter((s) => s.key !== strainKey);
            }
            await this.fetchStrainLibrary(true);
        } catch (err) {
            console.error('Error removing strain:', err);
        }
    }

    updateGrid() {
        // Force refresh from HA
        if (this.hass) {
            this.dataService.updateHass(this.hass);
        }
        // Trigger generic request update, but also maybe refresh WS data if we expect backend changes?
        // Actions usually trigger backend changes which fire growspace_updated, so subscription handles it.
        this.requestUpdate();
    }

    async handleDrop(
        targetRow: number,
        targetCol: number,
        targetPlant: PlantEntity | null,
        sourcePlant: PlantEntity | null
    ) {
        if (!sourcePlant || !this.state.selectedDevice) return;

        try {
            if (targetPlant) {
                const sourceId =
                    sourcePlant.attributes.plant_id || sourcePlant.entity_id.replace('sensor.', '');
                const targetId =
                    targetPlant.attributes.plant_id || targetPlant.entity_id.replace('sensor.', '');

                if (sourceId === targetId) return;

                await this.dataService.swapPlants(sourceId, targetId);
                this.updateGrid();
            } else {
                await this.movePlant(sourcePlant, targetRow, targetCol);
            }
        } catch (err) {
            console.error('Error during drag-and-drop:', err);
        }
    }

    async movePlant(plant: PlantEntity, newRow: number, newCol: number) {
        try {
            const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
            await this.dataService.updatePlant({
                plant_id: plantId,
                row: newRow,
                col: newCol,
            });
            this.updateGrid();
        } catch (err) {
            console.error('Error moving plant:', err);
        }
    }

    async handleAddGrowspace(detail: { name: string; rows?: number; plants_per_row?: number; notification_service?: string }) {
        const { name, rows, plants_per_row, notification_service } = detail;
        if (!name) {
            this.showToast('Name is required', 'error');
            return;
        }

        try {
            await this.dataService.addGrowspace({
                name,
                rows: rows || 4,
                plants_per_row: plants_per_row || 4,
                notification_service: notification_service || 'mobile_app_notify',
            });
            this.showToast('Growspace added successfully!', 'success');
            await this.refreshData();
            uiStore.closeDialog();
        } catch (e: any) {
            this.showToast(`Error: ${e.message}`, 'error');
        }
    }

    async handleUpdateGrowspace(detail: { growspace_id: string; name: string; rows: number; plants_per_row: number }) {
        console.log('[GrowspaceStore] handleUpdateGrowspace', detail);
        try {
            await this.dataService.updateGrowspace({
                growspace_id: detail.growspace_id,
                name: detail.name,
                rows: detail.rows,
                plants_per_row: detail.plants_per_row,
            });
            this.showToast('Growspace updated successfully', 'success');
            await this.refreshData();
            uiStore.closeDialog();
        } catch (e: any) {
            console.error('[GrowspaceStore] Update failed:', e);
            this.showToast(`Failed to update growspace: ${e.message}`, 'error');
        }
    }

    async harvestPlant(plant: PlantEntity) {
        await this.handleMovePlantToNextStage(plant);
    }

    async finishDryingPlant(plant: PlantEntity) {
        await this.handleMovePlantToNextStage(plant);
    }

    openAddPlantDialog(row?: number, col?: number) {
        console.log('[GrowspaceStore] openAddPlantDialog called', { row, col });
        // If row/col specified, use them (clicked from grid)
        if (row !== undefined && col !== undefined) {
            this.fetchStrainLibrary();
            uiStore.$activeDialog.set({
                type: 'ADD_PLANT',
                payload: { row, col },
            });
            return;
        }

        // Auto-find free slot if not specified
        if (!this.state.selectedDevice) {
            console.warn('[GrowspaceStore] No selected device for Add Plant');
            return;
        }
        const devices = this.state.devices;
        const device = devices.find((d) => d.device_id === this.state.selectedDevice);

        if (device) {
            const rows = device.rows || 4;
            const cols = device.plants_per_row || 4;

            const { row: targetRow, col: targetCol } = PlantUtils.findFirstAvailableSlot(
                device.plants || [],
                rows,
                cols
            );
            console.log('[GrowspaceStore] Found slot', { targetRow, targetCol });

            // If full, default to 1,1 or last found (let backend reject or user change)
            this.fetchStrainLibrary();
            // Convert 1-based backend coordinates to 0-based dialog coordinates
            uiStore.$activeDialog.set({
                type: 'ADD_PLANT',
                payload: { row: targetRow - 1, col: targetCol - 1 },
            });
            console.log('[GrowspaceStore] Set Active Dialog ADD_PLANT');
        }
    }

    async clonePlant(plant: PlantEntity, numClones: number) {
        await this.handleTakeClone(plant, numClones);
    }

    async confirmAddPlant(detail: { row: number; col: number; strain: string; phenotype?: string;[key: string]: any }) {
        const devices = this.state.devices;
        const selectedDeviceData = devices.find((d) => d.device_id === this.state.selectedDevice);
        if (!selectedDeviceData) return;

        // Convert 0-based dialog coordinates to 1-based backend coordinates
        const row = detail.row + 1;
        const col = detail.col + 1;

        const {
            strain,
            phenotype,
            veg_start,
            flower_start,
            seedling_start,
            mother_start,
            clone_start,
            dry_start,
            cure_start,
        } = detail;

        if (!strain) {
            this.showToast('Please select a strain', 'error');
            return;
        }

        try {
            await this.dataService.addPlant({
                growspace_id: selectedDeviceData.device_id,
                strain,
                phenotype: phenotype || '',
                row,
                col,
                veg_start,
                flower_start,
                seedling_start,
                mother_start,
                clone_start,
                dry_start,
                cure_start,
            });
            this.showToast('Plant added successfully', 'success');
            uiStore.closeDialog();
        } catch (e: any) {
            console.error(e);
            this.showToast('Failed to add plant', 'error');
        }
    }

    async analyzeGrowspace(query: string, isGlobal: boolean = false) {
        const currentDialog = uiStore.$activeDialog.get();
        const dialogPayload =
            currentDialog.type === 'GROW_MASTER' ? currentDialog.payload : null;
        if (!dialogPayload) return;

        // Update dialog state to loading
        uiStore.$activeDialog.set({
            type: 'GROW_MASTER',
            payload: { ...dialogPayload, isLoading: true, response: null },
        });

        try {
            let result;
            if (isGlobal || dialogPayload.mode === 'all') {
                result = await this.dataService.analyzeAllGrowspaces();
            } else {
                result = await this.dataService.askGrowAdvice(this.state.selectedDevice || '', query);
            }

            this.showToast('Advisor response received', 'success');
            // Assuming response handling

            const responseText =
                (typeof result.response === 'string')
                    ? result.response
                    : (result.response as any)?.response || JSON.stringify(result);

            uiStore.$activeDialog.set({
                type: 'GROW_MASTER',
                payload: { ...dialogPayload, isLoading: false, response: responseText },
            });
        } catch (err: any) {
            console.error('Error asking Grow Master:', err);
            uiStore.$activeDialog.set({
                type: 'GROW_MASTER',
                payload: { ...dialogPayload, isLoading: false, response: `Error: ${err.message}` },
            });
        }
    }

    async getStrainRecommendation(userQuery: string) {
        const currentDialog = uiStore.$activeDialog.get();
        const dialogPayload =
            currentDialog.type === 'STRAIN_RECOMMENDATION'
                ? currentDialog.payload
                : null;
        if (!dialogPayload) return;

        uiStore.$activeDialog.set({
            type: 'STRAIN_RECOMMENDATION',
            payload: { ...dialogPayload, isLoading: true, response: null },
        });

        try {
            const result = await this.dataService.getStrainRecommendation(userQuery);
            const responseText =
                typeof result.response === 'string' ? result.response : JSON.stringify(result);
            uiStore.$activeDialog.set({
                type: 'STRAIN_RECOMMENDATION',
                payload: { ...dialogPayload, isLoading: false, response: responseText },
            });
        } catch (err: any) {
            console.error('Error getting strain recommendation:', err);
            uiStore.$activeDialog.set({
                type: 'STRAIN_RECOMMENDATION',
                payload: { ...dialogPayload, isLoading: false, response: `Error: ${err.message}` },
            });
        }
    }

    openStrainRecommendationDialog() {
        uiStore.$activeDialog.set({
            type: 'STRAIN_RECOMMENDATION',
            payload: {
                isLoading: false,
                response: '',
            },
        });
    }

    openLogbookDialog() {
        if (!this.state.selectedDevice) return;
        uiStore.$activeDialog.set({
            type: 'LOGBOOK',
            payload: {
                growspaceId: this.state.selectedDevice,
            },
        });
    }

    handleExportLibrary() {
        // Logic needs to be adapted since event subscription on HASS connection is component specific?
        // Actually we can do it here if we assume `hass` is available.
        // But `subscribeEvents` is on `hass.connection`.

        // We can emit a custom event or just implement the logic here.
        // The download part triggers a browser action (window location or anchor click).
        // It's better to keep DOM interaction like download in the component?
        // Or pass a callback.
        // I'll keep it simple: Implement logic here, but for the download part, creating an element on document
        // might be slightly unclean in a store but it works.
        this._handleExportLibraryLogic();
    }

    private async _handleExportLibraryLogic() {
        if (!this.hass) return;

        const unsubscribe = await this.hass.connection.subscribeEvents((event: any) => {
            if (event.data && event.data.url) {
                // Dispatch event to view layer for DOM-based download
                (this.host as unknown as HTMLElement).dispatchEvent(
                    new LibraryExportReadyEvent(event.data.url)
                );
                unsubscribe();
            }
        }, 'growspace_manager_strain_library_exported');

        try {
            await this.dataService.exportStrainLibrary();
            this.showToast('Export started...', 'info');
        } catch (err) {
            console.error('Failed to call export service', err);
            unsubscribe();
        }
    }

    async toggleDehumidifierControl(deviceId: string) {
        const device = this.state.devices.find((d) => d.device_id === deviceId);
        if (!device || !device.overview_entity_id || !this.hass) return;

        const stateObj = this.hass.states[device.overview_entity_id];
        const attrs = stateObj?.attributes || {};
        const currentStatus = attrs.dehumidifier_control_enabled === true;

        try {
            await this.dataService.setDehumidifierControl(deviceId, !currentStatus);
            console.log(`Toggled dehumidifier control to ${!currentStatus} for ${deviceId}`);
            this.showToast(`Dehumidifier control ${!currentStatus ? 'enabled' : 'disabled'}`, 'success');
        } catch (err: any) {
            console.error('Failed to toggle dehumidifier control:', err);
            this.showToast(`Failed to toggle dehumidifier: ${err.message}`, 'error');
        }
    }

    async performImport(file: File, replace: boolean) {
        if (!file) return;

        try {
            const result = await this.dataService.importStrainLibrary(file, replace);
            this.showToast(
                `Import successful! ${result.imported_count || ''} strains imported.`,
                'success'
            );
            await this.fetchStrainLibrary(true);
        } catch (err: any) {
            console.error('Import failed:', err);
            this.showToast(`Import failed: ${err.message}`, 'error');
        }
    }
}
