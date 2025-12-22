import { ReactiveController, ReactiveControllerHost } from 'lit';
import { StoreController } from '@nanostores/lit';
import { GrowspaceStore } from '../store/growspace-store';
import { GrowspaceDevice, PlantEntity } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { $devices, $selectedDevice, $optimisticDeletedPlantIds } from '../store/data-store';

export class GrowspaceGridController implements ReactiveController {
    host: ReactiveControllerHost;
    store: GrowspaceStore;

    // Atoms controllers
    private _devices: StoreController<readonly GrowspaceDevice[]>;
    private _selectedDevice: StoreController<string | null>;
    private _optimisticDeletedIds: StoreController<Set<string>>;

    // Cached state
    public activeDevices: GrowspaceDevice[] = [];
    public gridLayout: { effectiveRows: number; grid: (PlantEntity | null)[][] } = {
        effectiveRows: 0,
        grid: [],
    };
    public growspaceOptions: Record<string, string> = {};

    // Memoization references
    private _lastDevicesRef: readonly GrowspaceDevice[] | null = null;
    private _lastSelectedDeviceRef: string | null = null;
    private _lastDeletedIdsRef: Set<string> | null = null;

    constructor(host: ReactiveControllerHost, store: GrowspaceStore) {
        this.host = host;
        this.store = store;

        this._devices = new StoreController(this.host, $devices);
        this._selectedDevice = new StoreController(this.host, $selectedDevice);
        this._optimisticDeletedIds = new StoreController(this.host, $optimisticDeletedPlantIds);

        host.addController(this);
    }

    hostConnected() {
        // Force calculation on connect
        this.calculateGrid();
    }

    hostUpdate() {
        // Access values from controllers/atoms
        const currentDevices = this._devices.value;
        const currentSelectedId = this._selectedDevice.value;
        const currentDeletedIds = this._optimisticDeletedIds.value;

        // Check if relevant state has changed
        if (
            this._lastDevicesRef === currentDevices &&
            this._lastSelectedDeviceRef === currentSelectedId &&
            this._lastDeletedIdsRef === currentDeletedIds
        ) {
            return;
        }

        // Update references
        this._lastDevicesRef = currentDevices;
        this._lastSelectedDeviceRef = currentSelectedId;
        this._lastDeletedIdsRef = currentDeletedIds;

        this.calculateGrid();
    }

    private calculateGrid() {
        const devices = this._devices.value || [];
        const deletedIds = this._optimisticDeletedIds.value;
        const selectedDeviceId = this._selectedDevice.value;

        // 1. Recalculate Active Devices
        this.activeDevices = devices.map((d) => ({
            ...d,
            plants: d.plants.filter((p) => {
                const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
                return !deletedIds.has(pId);
            }),
        }));

        // 2. Compute growspace options
        this.growspaceOptions = {};
        this.activeDevices.forEach((d) => {
            this.growspaceOptions[d.device_id] = d.name;
        });

        // 3. Recalculate Grid Layout
        // Find in ACTIVE devices (filtered) or original? 
        // Logic usually wants filtered plants for the grid.
        const selectedDeviceData = this.activeDevices.find(
            (d) => d.device_id === selectedDeviceId
        );

        if (selectedDeviceData) {
            const effectiveRows = PlantUtils.calculateEffectiveRows(selectedDeviceData);
            const { grid } = PlantUtils.createGridLayout(
                selectedDeviceData.plants,
                effectiveRows,
                selectedDeviceData.plants_per_row
            );
            this.gridLayout = { effectiveRows, grid };
        } else {
            this.gridLayout = { effectiveRows: 0, grid: [] };
        }
    }
}
