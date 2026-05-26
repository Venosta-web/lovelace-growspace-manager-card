import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../../src/services/sync-service';
import { DataService } from '../../src/services/data-service';
import { GrowspaceDataStore } from '../../src/store/core/data-store';
import { GrowspaceUIStore } from '../../src/store/ui/ui-store';
import { HomeAssistant } from 'custom-card-helpers';

vi.mock('../../src/slices/plant', () => ({ setPlants: vi.fn() }));
vi.mock('../../src/slices/device-state', () => ({ setDeviceSnapshot: vi.fn() }));
vi.mock('../../src/slices/environment', () => ({ setEnvSnapshot: vi.fn() }));
vi.mock('../../src/slices/irrigation', () => ({
    setIrrigationConfig: vi.fn(),
    setIrrigationStrategy: vi.fn(),
    setTankLevels: vi.fn(),
}));

describe('SyncService Coverage', () => {
    let service: SyncService;
    let dataService: DataService;
    let dataStore: GrowspaceDataStore;
    let uiStore: GrowspaceUIStore;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        dataService = new DataService();
        dataStore = new GrowspaceDataStore();
        uiStore = new GrowspaceUIStore();
        service = new SyncService(dataService, dataStore, uiStore);

        mockHass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}),
            },
            callService: vi.fn(),
        } as any;

        dataService.updateHass(mockHass);
    });

    describe('_areDeviceArraysEqual error handling', () => {
        it('should handle JSON.stringify error and return false', () => {
            // Create circular reference to cause JSON.stringify to throw
            const circularA: any = { id: '1', name: 'Device A' };
            circularA.self = circularA;

            const normalB = [{ id: '2', name: 'Device B' }];

            // Call private method
            const result = (service as any)._areDeviceArraysEqual([circularA], normalB as any);

            // Should handle error and return false
            expect(result).toBe(false);
        });

        it('should return true for empty arrays', () => {
            const result = (service as any)._areDeviceArraysEqual([], []);
            expect(result).toBe(true);
        });

        it('should return false for different lengths', () => {
            const a = [{ id: '1' }];
            const b = [{ id: '1' }, { id: '2' }];
            const result = (service as any)._areDeviceArraysEqual(a as any, b as any);
            expect(result).toBe(false);
        });

        it('should return true for same reference', () => {
            const arr = [{ id: '1' }];
            const result = (service as any)._areDeviceArraysEqual(arr as any, arr as any);
            expect(result).toBe(true);
        });

        it('should return false when one array is null', () => {
            const result = (service as any)._areDeviceArraysEqual(null, [{ id: '1' }] as any);
            expect(result).toBe(false);
        });
    });

    describe('updateDevicesState — irrigation pump entity watched-entity registration', () => {
        function makeGridStore(selectedDevice: string | null = null) {
            return {
                $selectedDevice: { get: vi.fn().mockReturnValue(selectedDevice) },
                setSelectedDevice: vi.fn(),
            };
        }

        it('adds irrigationPumpEntity to watched entities when present', () => {
            const gridStore = makeGridStore('device-1');
            const serviceWithGrid = new SyncService(
                dataService,
                dataStore,
                uiStore,
                gridStore as any
            );

            const device = {
                deviceId: 'device-1',
                name: null,
                plants: [],
                irrigationConfig: {
                    irrigationPumpEntity: 'switch.irrigation_pump',
                    // drainPumpEntity intentionally absent
                },
                environmentAttributes: {},
            };

            vi.spyOn(dataService, 'getGrowspaceDevices').mockReturnValue([device] as any);
            vi.spyOn(uiStore.$defaultApplied, 'get').mockReturnValue(true);

            serviceWithGrid.updateDevicesState();

            expect((serviceWithGrid as any)._watchedEntities.has('switch.irrigation_pump')).toBe(true);
        });

        it('adds drainPumpEntity to watched entities when present', () => {
            const gridStore = makeGridStore('device-1');
            const serviceWithGrid = new SyncService(
                dataService,
                dataStore,
                uiStore,
                gridStore as any
            );

            const device = {
                deviceId: 'device-1',
                name: null,
                plants: [],
                irrigationConfig: {
                    drainPumpEntity: 'switch.drain_pump',
                    // irrigationPumpEntity intentionally absent
                },
                environmentAttributes: {},
            };

            vi.spyOn(dataService, 'getGrowspaceDevices').mockReturnValue([device] as any);
            vi.spyOn(uiStore.$defaultApplied, 'get').mockReturnValue(true);

            serviceWithGrid.updateDevicesState();

            expect((serviceWithGrid as any)._watchedEntities.has('switch.drain_pump')).toBe(true);
        });

        it('adds both pump entities when both are present', () => {
            const gridStore = makeGridStore('device-1');
            const serviceWithGrid = new SyncService(
                dataService,
                dataStore,
                uiStore,
                gridStore as any
            );

            const device = {
                deviceId: 'device-1',
                name: null,
                plants: [],
                irrigationConfig: {
                    irrigationPumpEntity: 'switch.irrigation_pump',
                    drainPumpEntity: 'switch.drain_pump',
                },
                environmentAttributes: {},
            };

            vi.spyOn(dataService, 'getGrowspaceDevices').mockReturnValue([device] as any);
            vi.spyOn(uiStore.$defaultApplied, 'get').mockReturnValue(true);

            serviceWithGrid.updateDevicesState();

            expect((serviceWithGrid as any)._watchedEntities.has('switch.irrigation_pump')).toBe(true);
            expect((serviceWithGrid as any)._watchedEntities.has('switch.drain_pump')).toBe(true);
        });
    });
});
