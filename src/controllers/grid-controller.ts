import { ReactiveController, ReactiveControllerHost } from 'lit';
import { GrowspaceStore } from '../store/growspace-store';
import { GrowspaceDevice, PlantEntity } from '../types';
import { PlantUtils } from '../utils/plant-utils';

export class GrowspaceGridController implements ReactiveController {
    host: ReactiveControllerHost;
    store: GrowspaceStore;

    // Cached state
    public activeDevices: GrowspaceDevice[] = [];
    public gridLayout: { effectiveRows: number; grid: (PlantEntity | null)[][] } = {
        effectiveRows: 0,
        grid: [],
    };
    public growspaceOptions: Record<string, string> = {};

    // Memoization references
    private _lastDevicesRef: GrowspaceDevice[] | null = null;
    private _lastSelectedDeviceRef: string | null = null;
    private _lastDeletedIdsRef: Set<string> | null = null;

    constructor(host: ReactiveControllerHost, store: GrowspaceStore) {
        this.host = host;
        this.store = store;
        host.addController(this);
    }

    hostConnected() {
        // Force calculation on connect
        this.calculateGrid();
    }

    hostUpdate() {
        const state = this.store.state;
        if (!state) return;

        // Check if relevant state has changed
        if (
            this._lastDevicesRef === state.devices &&
            this._lastSelectedDeviceRef === state.selectedDevice &&
            this._lastDeletedIdsRef === state.optimisticDeletedPlantIds
        ) {
            return;
        }

        // Update references
        this._lastDevicesRef = state.devices;
        this._lastSelectedDeviceRef = state.selectedDevice;
        this._lastDeletedIdsRef = state.optimisticDeletedPlantIds;

        this.calculateGrid();
    }

    private calculateGrid() {
        if (!this.store || !this.store.state) return;

        // 1. Recalculate Active Devices
        // Filter out optimistically deleted plants
        const devices = this.store.state.devices || [];
        this.activeDevices = devices.map((d) => ({
            ...d,
            plants: d.plants.filter((p) => {
                const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
                return !this.store.state.optimisticDeletedPlantIds.has(pId);
            }),
        }));

        // 2. Compute growspace options (memoized, no longer in render)
        this.growspaceOptions = {};
        this.activeDevices.forEach((d) => {
            this.growspaceOptions[d.device_id] = d.name;
        });

        // 3. Recalculate Grid Layout
        const selectedDeviceId = this.store.state.selectedDevice;
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


