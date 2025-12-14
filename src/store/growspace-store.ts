import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { DateTime } from 'luxon';
import { GrowspaceDevice, StrainEntry, PlantEntity, CropMeta } from '../types';
import { ActiveDialogState } from '../ui-state';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils';

export interface GrowspaceState {
    selectedDevice: string | null;
    strainLibrary: StrainEntry[];
    activeDialog: ActiveDialogState;
    isEditMode: boolean;
    selectedPlants: Set<string>;
    optimisticDeletedPlantIds: Set<string>;
    focusedPlantIndex: number;
    menuOpen: boolean;
    notification: { message: string; type: 'info' | 'error' | 'success' } | null;
    isCompactView: boolean;
    defaultApplied: boolean;
    isLoading: boolean;
    devices: GrowspaceDevice[];
}

export class GrowspaceStore implements ReactiveController {
    host: ReactiveControllerHost;
    dataService!: DataService;
    hass!: HomeAssistant;

    // State
    state: GrowspaceState = {
        selectedDevice: null,
        strainLibrary: [],
        activeDialog: { type: 'NONE' },
        isEditMode: false,
        selectedPlants: new Set(),
        optimisticDeletedPlantIds: new Set(),
        focusedPlantIndex: -1,
        menuOpen: false,
        notification: null,
        isCompactView: false,
        defaultApplied: false,
        isLoading: true,
        devices: [],
    };

    private wsDataCache: Record<string, any> = {};
    private _unsubEvents: (() => void) | undefined;
    private _isFetchingWS = false;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);

        // Wrap state in a proxy to auto-trigger updates
        this.state = new Proxy(this.state, {
            set: (target, prop, value) => {
                const oldVal = target[prop as keyof GrowspaceState];
                if (oldVal !== value) {
                    // Use type assertion to avoid 'any' is not assignable to 'never' error
                    (target as any)[prop] = value;
                    this.host.requestUpdate();
                }
                return true;
            }
        });

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

        if (!this.state.selectedDevice && this.state.devices.length > 0) {
            this.state.selectedDevice = this.state.devices[0].device_id;
            // Ensure the UI knows we are ready to display
            if (this.state.isLoading) {
                this.state.isLoading = false;
            }
        }

        this.pruneOptimisticDeletions();
    }

    private async _ensureEventSubscription() {
        if (this._unsubEvents || !this.hass) return;

        try {
            this._unsubEvents = await this.hass.connection.subscribeEvents(
                () => this._refreshGrowspaceData(), // specific logic to handle event payload? Msg is empty usually.
                'growspace_manager_updated'
            );
        } catch (err) {
            console.error('Failed to subscribe to growspace events', err);
        }
    }

    async refreshData() {
        await this._refreshGrowspaceData();
    }

    private async _refreshGrowspaceData() {
        if (!this.hass || this._isFetchingWS) return;
        this._isFetchingWS = true;

        // Show loading spinner if we have no devices yet
        if (this.state.devices.length === 0) {
            this.state.isLoading = true;
        }

        try {
            // fetchGrowspaceData without ID should return all data
            const data = await this.dataService.fetchGrowspaceData();
            this.wsDataCache = data || {};
            this._updateDevicesState();
        } catch (e) {
            console.error('Failed to fetch growspace data', e);
        } finally {
            this._isFetchingWS = false;
            // Only clear loading if we didn't find any devices OR if we already have a selection
            // If we found devices but no selection, wait for auto-select logic in updateHass/initialize
            if (this.state.devices.length === 0 || this.state.selectedDevice) {
                this.state.isLoading = false;
            }
        }
    }

    private _updateDevicesState() {
        const devices = this.dataService.getGrowspaceDevices(this.wsDataCache);
        this.state.devices = devices;

        // Auto-select if needed (handles initial load race condition where updateHass hasn't run yet)
        if (!this.state.selectedDevice && devices.length > 0) {
            this.state.selectedDevice = devices[0].device_id;
        }
    }

    requestUpdate() {
        this.host.requestUpdate();
    }

    // --- Actions / Logic ---

    // State Setters
    setIsCompactView(value: boolean) {
        this.state.isCompactView = value;
    }

    setDefaultApplied(value: boolean) {
        this.state.defaultApplied = value;
    }

    showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
        this.state.notification = { message, type };
        setTimeout(() => {
            this.state.notification = null;
        }, 4000);
    }

    initializeSelectedDevice(config: any) {
        // Update compact view from config if not already set (or always?)
        if (config?.compact !== undefined) {
            this.state.isCompactView = config.compact;
        }

        const devices = this.state.devices;
        if (!devices.length || this.state.selectedDevice) return;

        // Try to apply default from config
        if (config?.default_growspace) {
            const defaultDevice = devices.find(
                (d) => d.device_id === config.default_growspace || d.name === config.default_growspace
            );
            if (defaultDevice) {
                this.state.selectedDevice = defaultDevice.device_id;
                this.state.defaultApplied = true;
                return;
            }
        }

        // Fallback to first device
        this.state.selectedDevice = devices[0].device_id;
    }

    // ...

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
        if (this.state.isEditMode && key === 'Escape') {
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
            this.setFocusedPlantIndex((this.state.focusedPlantIndex + 1) % plants.length);
        } else if (key === 'ArrowLeft') {
            this.setFocusedPlantIndex((this.state.focusedPlantIndex - 1 + plants.length) % plants.length);
        } else if (key === 'Enter' || key === ' ') {
            if (this.state.focusedPlantIndex >= 0 && this.state.focusedPlantIndex < plants.length) {
                this.handlePlantClick(plants[this.state.focusedPlantIndex]);
            }
        } else if (key === 'Delete' || key === 'Backspace') {
            if (this.state.focusedPlantIndex >= 0 && this.state.focusedPlantIndex < plants.length) {
                const focusedPlant = plants[this.state.focusedPlantIndex];
                if (focusedPlant) {
                    this.handleDeletePlant(focusedPlant.entity_id);
                }
            } else if (this.state.selectedPlants.size > 0) {
                // If multiple plants are selected, delete them
                this.handleDeletePlant(Array.from(this.state.selectedPlants));
            }
        }
    }

    handleDeviceChange(deviceId: string) {
        this.state.selectedDevice = deviceId;
    }

    togglePlantSelection(plantOrId: string | PlantEntity) {
        const plantId = typeof plantOrId === 'string' ? plantOrId : plantOrId.attributes.plant_id || '';

        if (!plantId) return;

        const newSet = new Set(this.state.selectedPlants);
        if (newSet.has(plantId)) {
            newSet.delete(plantId);
        } else {
            newSet.add(plantId);
        }
        this.state.selectedPlants = newSet;
    }

    selectAllPlants() {
        if (!this.state.selectedDevice) return;
        const devices = this.state.devices;
        const selectedDeviceData = devices.find((d) => d.device_id === this.state.selectedDevice);

        if (selectedDeviceData && selectedDeviceData.plants) {
            selectedDeviceData.plants.forEach((plant) => {
                const pId = plant.attributes.plant_id;
                if (pId && !this.state.optimisticDeletedPlantIds.has(pId)) {
                    this.state.selectedPlants.add(pId);
                }
            });
            // Force update to trigger proxy set trap on a property if we mutated distinct property? 
            // Actually Set and Map mutations don't trigger proxy 'set'.
            // We must reassign the Set to trigger the proxy trap.
            this.state.selectedPlants = new Set(this.state.selectedPlants);
        }
    }

    setSelectedPlants(plantIds: Set<string>) {
        this.state.selectedPlants = new Set(plantIds);
    }

    setFocusedPlantIndex(index: number) {
        this.state.focusedPlantIndex = index;
    }

    clearPlantSelection() {
        this.state.selectedPlants = new Set();
    }

    exitEditMode() {
        this.state.isEditMode = false;
        this.state.selectedPlants = new Set();
    }

    setEditMode(value: boolean) {
        this.state.isEditMode = value;
    }

    setMenuOpen(value: boolean) {
        this.state.menuOpen = value;
    }

    setActiveDialog(dialogState: ActiveDialogState) {
        this.state.activeDialog = dialogState;
    }

    closeActiveDialog() {
        this.state.activeDialog = { type: 'NONE' };
    }

    handlePlantClick(plant: PlantEntity) {
        if (this.state.isEditMode && this.state.selectedPlants.size > 0) {
            const plantId = plant.attributes.plant_id;
            if (plantId && !this.state.selectedPlants.has(plantId)) {
                this.togglePlantSelection(plantId);
            }
            this.openPlantOverviewDialog(plant, Array.from(this.state.selectedPlants));
        } else {
            this.openPlantOverviewDialog(plant);
        }
    }

    openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
        this.state.activeDialog = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant,
                editedAttributes: { ...plant.attributes },
                activeTab: 'dashboard',
                selectedPlantIds: selectedIds,
            },
        };
    }

    async updatePlantFromDialog(dialogState: any) {
        const { plant, editedAttributes, selectedPlantIds } = dialogState;
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

        const targetIds =
            selectedPlantIds && selectedPlantIds.length > 0 ? selectedPlantIds : [plantId];
        const isBulkEdit = targetIds.length > 1;

        const payloadTemplate: any = {};
        const dateFields = [
            'seedling_start',
            'mother_start',
            'clone_start',
            'veg_start',
            'flower_start',
            'dry_start',
            'cure_start',
        ];

        const fieldsToProcess = isBulkEdit
            ? dateFields
            : ['strain', 'phenotype', 'row', 'col', ...dateFields];

        fieldsToProcess.forEach((field) => {
            if (editedAttributes[field] !== undefined) {
                if (dateFields.includes(field)) {
                    const val = String(editedAttributes[field] || '');
                    if (!val || val === 'null' || val === 'undefined') {
                        payloadTemplate[field] = null;
                    } else {
                        const formattedDate = PlantUtils.formatDateForBackend(val);
                        if (formattedDate) {
                            payloadTemplate[field] = formattedDate;
                        }
                    }
                } else {
                    if (editedAttributes[field] !== null) {
                        payloadTemplate[field] = editedAttributes[field];
                    }
                }
            }
        });

        try {
            const updatePromises = targetIds.map((id: string) => {
                const payload = { ...payloadTemplate, plant_id: id };
                if (isBulkEdit) {
                    delete payload.row;
                    delete payload.col;
                }
                return this.dataService.updatePlant(payload);
            });

            await Promise.all(updatePromises);

            this.closeActiveDialog();

            if (this.state.isEditMode) {
                this.state.selectedPlants = new Set();
                this.state.isEditMode = false;
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
                this.state.selectedPlants.delete(id);
            });

            if (this.state.activeDialog.type === 'PLANT_OVERVIEW') {
                this.closeActiveDialog();
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
            this.closeActiveDialog();
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

    async handleAddGrowspace(detail: any) {
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
            this.closeActiveDialog();
        } catch (e: any) {
            this.showToast(`Error: ${e.message}`, 'error');
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
            this.setActiveDialog({
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
            this.setActiveDialog({
                type: 'ADD_PLANT',
                payload: { row: targetRow - 1, col: targetCol - 1 },
            });
            console.log('[GrowspaceStore] Set Active Dialog ADD_PLANT');
        }
    }

    async clonePlant(plant: PlantEntity, numClones: number) {
        await this.handleTakeClone(plant, numClones);
    }

    async confirmAddPlant(detail: any) {
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
            this.closeActiveDialog();
        } catch (e: any) {
            console.error(e);
            this.showToast('Failed to add plant', 'error');
        }
    }

    async analyzeGrowspace(query: string, isGlobal: boolean = false) {
        const dialogPayload =
            this.state.activeDialog.type === 'GROW_MASTER' ? this.state.activeDialog.payload : null;
        if (!dialogPayload) return;

        // Update dialog state to loading
        this.setActiveDialog({
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

            const responseText =
                typeof result.response === 'string'
                    ? result.response
                    : (result.response as any)?.response || JSON.stringify(result);

            this.setActiveDialog({
                type: 'GROW_MASTER',
                payload: { ...dialogPayload, isLoading: false, response: responseText },
            });
        } catch (err: any) {
            console.error('Error asking Grow Master:', err);
            this.setActiveDialog({
                type: 'GROW_MASTER',
                payload: { ...dialogPayload, isLoading: false, response: `Error: ${err.message}` },
            });
        }
    }

    async getStrainRecommendation(userQuery: string) {
        const dialogPayload =
            this.state.activeDialog.type === 'STRAIN_RECOMMENDATION'
                ? this.state.activeDialog.payload
                : null;
        if (!dialogPayload) return;

        this.setActiveDialog({
            type: 'STRAIN_RECOMMENDATION',
            payload: { ...dialogPayload, isLoading: true, response: null },
        });

        try {
            const result = await this.dataService.getStrainRecommendation(userQuery);
            const responseText =
                typeof result.response === 'string' ? result.response : JSON.stringify(result);
            this.setActiveDialog({
                type: 'STRAIN_RECOMMENDATION',
                payload: { ...dialogPayload, isLoading: false, response: responseText },
            });
        } catch (err: any) {
            console.error('Error getting strain recommendation:', err);
            this.setActiveDialog({
                type: 'STRAIN_RECOMMENDATION',
                payload: { ...dialogPayload, isLoading: false, response: `Error: ${err.message}` },
            });
        }
    }

    openStrainRecommendationDialog() {
        this.setActiveDialog({
            type: 'STRAIN_RECOMMENDATION',
            payload: {
                isLoading: false,
                response: null,
            },
        });
    }

    openLogbookDialog() {
        if (!this.state.selectedDevice) return;
        this.setActiveDialog({
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
                this._downloadFile(event.data.url);
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

    private _downloadFile(url: string) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = url.split('/').pop() || 'export.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
