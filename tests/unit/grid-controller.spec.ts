import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceGridController } from '../../src/controllers/grid-controller';
import { PlantUtils } from '../../src/utils/plant-utils';
// Access atoms from the mocked module
import { $devices, $selectedDevice, $optimisticDeletedPlantIds } from '../../src/store/data-store';

// Mock PlantUtils
vi.mock('../../src/utils/plant-utils', () => ({
    PlantUtils: {
        calculateEffectiveRows: vi.fn().mockReturnValue(1),
        createGridLayout: vi.fn().mockReturnValue({ rows: 0, cols: 0, grid: [] })
    }
}));

// Mock data-store with real atoms created inside the factory
vi.mock('../../src/store/data-store', async () => {
    const { atom } = await import('nanostores');
    return {
        $devices: atom([]),
        $selectedDevice: atom(null),
        $optimisticDeletedPlantIds: atom(new Set())
    };
});

describe('GrowspaceGridController', () => {
    let mockHost: any;
    let mockStore: any;
    let controller: GrowspaceGridController;

    beforeEach(() => {
        // Reset atoms
        $devices.set([]);
        $selectedDevice.set(null);
        $optimisticDeletedPlantIds.set(new Set());

        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn()
        };
        mockStore = {};

        controller = new GrowspaceGridController(mockHost, mockStore as any);
    });

    it('should initialize and register with host', () => {
        expect(mockHost.addController).toHaveBeenCalledWith(controller);
        expect(controller.activeDevices).toEqual([]);
    });

    it('should calculateGrid in hostConnected', () => {
        const spy = vi.spyOn(controller as any, 'calculateGrid');
        controller.hostConnected();
        expect(spy).toHaveBeenCalled();
    });

    it('should calculateGrid in hostUpdate', () => {
        const spy = vi.spyOn(controller as any, 'calculateGrid');
        controller.hostUpdate();
        expect(spy).toHaveBeenCalled();
    });

    describe('calculateGrid', () => {
        it('should do nothing if selectedDevice is null', () => {
            $selectedDevice.set(null);
            (controller as any).calculateGrid();
            expect(controller.activeDevices).toEqual([]);
        });

        it('should filter optimistically deleted plants', () => {
            $devices.set([{
                device_id: 'd1',
                plants: [
                    { entity_id: 'p1', attributes: { plant_id: 'p1' } as any } as any,
                    { entity_id: 'p2', attributes: { plant_id: 'p2' } as any } as any
                ]
            } as any]);
            $selectedDevice.set('d1');
            $optimisticDeletedPlantIds.set(new Set(['p1']));

            (controller as any).calculateGrid();

            expect(controller.activeDevices.length).toBe(1);
            expect(controller.activeDevices[0].plants.length).toBe(1);
            expect(controller.activeDevices[0].plants[0].attributes.plant_id).toBe('p2');
        });

        it('should calculate grid layout for selected device', () => {
            const device = {
                device_id: 'd1',
                plants_per_row: 4,
                plants: []
            } as any;
            $devices.set([device]);
            $selectedDevice.set('d1');

            vi.mocked(PlantUtils.calculateEffectiveRows).mockReturnValue(5);
            vi.mocked(PlantUtils.createGridLayout).mockReturnValue({ rows: 5, cols: 4, grid: [['plant'] as any] });

            (controller as any).calculateGrid();

            expect(PlantUtils.calculateEffectiveRows).toHaveBeenCalledWith(expect.objectContaining({ device_id: 'd1' }));
            expect(PlantUtils.createGridLayout).toHaveBeenCalledWith([], 5, 4);
            expect(controller.gridLayout).toEqual({ effectiveRows: 5, grid: [['plant']] });
        });
    });

    describe('hostUpdate memoization', () => {
        it('should skip recalculation if state refs have not changed', () => {
            controller.hostUpdate();
            const spy = vi.spyOn(controller as any, 'calculateGrid');

            controller.hostUpdate();

            expect(spy).not.toHaveBeenCalled();
        });

        it('should recalculate if devices reference changes', () => {
            controller.hostUpdate();
            const spy = vi.spyOn(controller as any, 'calculateGrid');

            $devices.set([...$devices.get()]);
            controller.hostUpdate();

            expect(spy).toHaveBeenCalled();
        });

        it('should recalculate if selectedDevice changes', () => {
            controller.hostUpdate();
            const spy = vi.spyOn(controller as any, 'calculateGrid');

            $selectedDevice.set('d2');
            controller.hostUpdate();

            expect(spy).toHaveBeenCalled();
        });

        it('should recalculate if optimisticDeletedPlantIds reference changes', () => {
            controller.hostUpdate();
            const spy = vi.spyOn(controller as any, 'calculateGrid');

            $optimisticDeletedPlantIds.set(new Set(['p99']));
            controller.hostUpdate();

            expect(spy).toHaveBeenCalled();
        });
    });
});
