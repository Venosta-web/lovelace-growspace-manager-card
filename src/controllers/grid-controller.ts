import { ReactiveController, ReactiveControllerHost } from 'lit';
import { GrowspaceStore } from '../store/growspace-store';
import { GrowspaceDevice, PlantEntity } from '../types';
import { PlantUtils } from '../utils';

export class GrowspaceGridController implements ReactiveController {
    host: ReactiveControllerHost;
    store: GrowspaceStore;

    // Cached state
    public activeDevices: GrowspaceDevice[] = [];
    public gridLayout: { effectiveRows: number; grid: (PlantEntity | null)[][] } = {
        effectiveRows: 0,
        grid: [],
    };

    constructor(host: ReactiveControllerHost, store: GrowspaceStore) {
        this.host = host;
        this.store = store;
        host.addController(this);
    }

    hostConnected() {
        // Initial calculation if needed
        this.calculateGrid();
    }

    hostUpdate() {
        this.calculateGrid();
    }

    private calculateGrid() {
        if (!this.store || !this.store.state) return;

        // 1. Recalculate Active Devices
        // Filter out optimistically deleted plants
        const devices = this.store.state.devices || [];
        // Only update if devices array reference changed or deep check? 
        // For now, mirroring existing logic which runs on every update but is fast enough
        this.activeDevices = devices.map((d) => ({
            ...d,
            plants: d.plants.filter((p) => {
                const pId = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
                return !this.store.state.optimisticDeletedPlantIds.has(pId);
            }),
        }));

        // 2. Recalculate Grid Layout
        const selectedDeviceId = this.store.state.selectedDevice;
        const selectedDeviceData = this.activeDevices.find(
            (d) => d.device_id === selectedDeviceId
        );

        if (selectedDeviceData) {
            const effectiveRows = PlantUtils.calculateEffectiveRows(selectedDeviceData);
            // This is the heavy part, maybe check if plants changed? 
            // The store updates frequently so simple diff might be hard.
            // Keeping it executed on hostUpdate for now as it was in willUpdate.
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
