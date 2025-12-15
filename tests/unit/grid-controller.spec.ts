
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceGridController } from '../../src/controllers/grid-controller';
import { GrowspaceStore } from '../../src/store/growspace-store';
import { PlantUtils } from '../../src/utils/plant-utils';

// Mock PlantUtils
vi.mock('../../src/utils/plant-utils', () => ({
    PlantUtils: {
        calculateEffectiveRows: vi.fn(),
        createGridLayout: vi.fn()
    }
}));

describe('GrowspaceGridController', () => {
    let mockHost: any;
    let mockStore: any;
    let controller: GrowspaceGridController;

    beforeEach(() => {
        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn()
        };
        mockStore = {
            state: {
                devices: [],
                selectedDevice: null,
                optimisticDeletedPlantIds: new Set()
            }
        };

        controller = new GrowspaceGridController(mockHost, mockStore as any);
    });

    it('should initialize and register with host', () => {
        expect(mockHost.addController).toHaveBeenCalledWith(controller);
        expect(controller.activeDevices).toEqual([]);
    });

    it('should calculate grid in hostConnected', () => {
        const spy = vi.spyOn(controller as any, 'calculateGrid');
        controller.hostConnected();
        expect(spy).toHaveBeenCalled();
    });

    it('should calculate grid in hostUpdate', () => {
        const spy = vi.spyOn(controller as any, 'calculateGrid');
        controller.hostUpdate();
        expect(spy).toHaveBeenCalled();
    });

    describe('calculateGrid', () => {
        it('should do nothing if store state is missing', () => {
            controller.store = {} as any; // No state
            (controller as any).calculateGrid();
            expect(controller.activeDevices).toEqual([]);
        });

        it('should filter optimistically deleted plants', () => {
            mockStore.state.devices = [{
                device_id: 'd1',
                plants: [
                    { entity_id: 'p1', attributes: { plant_id: 'p1' } },
                    { entity_id: 'p2', attributes: { plant_id: 'p2' } }
                ]
            }];
            mockStore.state.optimisticDeletedPlantIds.add('p1');

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
            };
            mockStore.state.devices = [device];
            mockStore.state.selectedDevice = 'd1';

            vi.mocked(PlantUtils.calculateEffectiveRows).mockReturnValue(5);
            vi.mocked(PlantUtils.createGridLayout).mockReturnValue({ grid: [['plant'] as any] });

            (controller as any).calculateGrid();

            expect(PlantUtils.calculateEffectiveRows).toHaveBeenCalledWith(expect.objectContaining({ device_id: 'd1' }));
            expect(PlantUtils.createGridLayout).toHaveBeenCalledWith([], 5, 4);
            expect(controller.gridLayout).toEqual({ effectiveRows: 5, grid: [['plant']] });
        });

        it('should reset grid if no device selected', () => {
            mockStore.state.selectedDevice = null;
            (controller as any).calculateGrid();
            expect(controller.gridLayout).toEqual({ effectiveRows: 0, grid: [] });
        });
    });
});
