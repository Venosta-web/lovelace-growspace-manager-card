import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { ActiveDialogState } from '../ui-state';
import { StrainEntry, PlantEntity } from '../types';
import { DataService } from '../data-service';
import { PlantUtils } from '../utils';

// Phase 2: Cache Interface
interface StrainLibraryCache {
    version: string; // Using timestamp string as version for now, or explicit version hash
    timestamp: number;
    data: StrainEntry[];
}

export interface GrowspaceStoreHost extends ReactiveControllerHost {
    hass: HomeAssistant;
    dataService: DataService;
}

export class GrowspaceStore implements ReactiveController {
    host: GrowspaceStoreHost;

    // State properties
    selectedDevice: string | null = null;
    strainLibrary: StrainEntry[] = [];
    activeDialog: ActiveDialogState = { type: 'NONE' };
    isEditMode: boolean = false;
    selectedPlants: Set<string> = new Set();
    optimisticDeletedPlantIds: Set<string> = new Set();
    isCompactView: boolean = false;
    defaultApplied: boolean = false;

    constructor(host: GrowspaceStoreHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() {
        // Initial fetches or setup if needed
    }

    hostDisconnected() {
        // Cleanup
    }

    // --- Phase 2: Caching Logic ---
    async fetchStrainLibrary() {
        if (!this.host.hass) return;

        const CACHE_KEY = 'growspace_strain_library_v2';
        const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

        // 1. Get backend "version" (using last_updated of the strain sensor as proxy)
        // We need to find the sensor first. DataService has logic for this, let's reuse/duplicate the find logic 
        // or rely on DataService to get the sensor entity.
        // Ideally DataService exposes a way to get the sensor ID or the sensor object.
        // For now, let's peek at the states directly as DataService does.
        const allStates = Object.values(this.host.hass.states);
        const strainSensor = allStates.find(
            (s: any) => s.attributes?.strains !== undefined && s.attributes?.strains !== null
        );

        const backendVersion = strainSensor?.last_updated || 'unknown';

        // 2. Try to load from cache
        let cacheValid = false;
        const cachedRaw = localStorage.getItem(CACHE_KEY);

        if (cachedRaw) {
            try {
                const cache: StrainLibraryCache = JSON.parse(cachedRaw);
                const age = Date.now() - cache.timestamp;

                // Validate: Version match AND Age < 24h
                if (cache.version === backendVersion && age < CACHE_DURATION_MS) {
                    this.strainLibrary = cache.data;
                    this.host.requestUpdate();
                    cacheValid = true;
                    console.log('[GrowspaceStore] Loaded strain library from cache.');
                } else {
                    console.log('[GrowspaceStore] Cache expired or version mismatch.', {
                        cachedVer: cache.version,
                        backendVer: backendVersion,
                        ageHours: age / 1000 / 3600
                    });
                }
            } catch (e) {
                console.warn('[GrowspaceStore] Failed to parse cached library. Clearing.', e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

        if (!cacheValid) {
            // 3. Fetch from backend
            try {
                const currentStrains = await this.host.dataService.fetchStrainLibrary();
                this.strainLibrary = currentStrains;

                // 4. Update cache
                const newCache: StrainLibraryCache = {
                    version: backendVersion,
                    timestamp: Date.now(),
                    data: currentStrains
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
                this.host.requestUpdate();
                console.log('[GrowspaceStore] Fetched and cached strain library.');
            } catch (e) {
                console.error('[GrowspaceStore] Failed to fetch strain library:', e);
                // Fallback: if we have stale cache in memory, maybe keep using it? 
                // Or if we failed, we basically have empty library.
            }
        }
    }

    // --- Logic Moved from Card ---

    async updatePlant() {
        if (this.activeDialog.type !== 'PLANT_OVERVIEW') return;
        const dialogState = this.activeDialog.payload;

        const { plant, editedAttributes, selectedPlantIds } = dialogState;
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');

        const targetIds = (selectedPlantIds && selectedPlantIds.length > 0) ? selectedPlantIds : [plantId];
        const isBulkEdit = targetIds.length > 1;

        const payloadTemplate: any = {};
        const dateFields = ['seedling_start', 'mother_start', 'clone_start', 'veg_start', 'flower_start', 'dry_start', 'cure_start'];

        const fieldsToProcess = isBulkEdit
            ? dateFields
            : ['strain', 'phenotype', 'row', 'col', ...dateFields];

        fieldsToProcess.forEach(field => {
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
            const updatePromises = targetIds.map(id => {
                const payload = { ...payloadTemplate, plant_id: id };
                if (isBulkEdit) {
                    delete payload.row;
                    delete payload.col;
                }
                return this.host.dataService.updatePlant(payload);
            });

            await Promise.all(updatePromises);
            this.activeDialog = { type: 'NONE' };

            if (this.isEditMode) {
                this.selectedPlants = new Set();
                this.isEditMode = false;
            }
            this.host.requestUpdate();
        } catch (err) {
            console.error("Error updating plant(s):", err);
        }
    }

    async handleDeletePlant(plantId: string, forceUpdateGrid: () => void) {
        if (!confirm("Are you sure you want to delete this plant?")) return;

        this.optimisticDeletedPlantIds.add(plantId);
        this.host.requestUpdate();

        this.activeDialog = { type: 'NONE' };
        this.host.requestUpdate();

        try {
            await this.host.dataService.removePlant(plantId);
        } catch (err) {
            console.error("Error deleting plant:", err);
            // Revert optimistic update? For now just alert logic from original code mostly kept, 
            // but simplistic:
            forceUpdateGrid(); // Callback to parent to force refresh
        }
    }

    handlePlantClick(plant: PlantEntity) {
        if (this.isEditMode && this.selectedPlants.size > 0) {
            this.togglePlantSelection(plant);
            this.openPlantOverviewDialog(plant, Array.from(this.selectedPlants));
        } else {
            this.openPlantOverviewDialog(plant);
        }
    }

    openPlantOverviewDialog(plant: PlantEntity, selectedIds?: string[]) {
        this.activeDialog = {
            type: 'PLANT_OVERVIEW',
            payload: {
                plant,
                editedAttributes: { ...plant.attributes },
                activeTab: 'dashboard',
                selectedPlantIds: selectedIds
            }
        };
        this.host.requestUpdate();
    }

    togglePlantSelection(plant: PlantEntity) {
        const plantId = plant.attributes.plant_id;
        if (!plantId) return;

        const newSet = new Set(this.selectedPlants);
        if (newSet.has(plantId)) {
            newSet.delete(plantId);
        } else {
            newSet.add(plantId);
        }
        this.selectedPlants = newSet;
        this.host.requestUpdate();
    }

    selectAllPlants() {
        const devices = this.host.dataService.getGrowspaceDevices();
        const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
        if (!selectedDeviceData) return;

        const allPlantIds = new Set<string>();
        selectedDeviceData.plants?.forEach(plant => {
            const plantId = plant.attributes.plant_id;
            if (plantId && !this.optimisticDeletedPlantIds.has(plantId)) {
                allPlantIds.add(plantId);
            }
        });

        this.selectedPlants = allPlantIds;
        this.host.requestUpdate();
    }

    deselectAllPlants() {
        this.selectedPlants = new Set();
        this.host.requestUpdate();
    }

    exitEditMode() {
        this.isEditMode = false;
        this.selectedPlants = new Set();
        this.host.requestUpdate();
    }
}
