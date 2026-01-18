
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceHistoryStore } from '../../src/store/history-store';
import { GrowspaceDataStore } from '../../src/store/data-store';
import { DataService } from '../../src/data-service';

describe('GrowspaceHistoryStore Coverage', () => {
    let store: GrowspaceHistoryStore;
    let dataStore: GrowspaceDataStore;
    let dataService: DataService;

    beforeEach(() => {
        dataService = {
            getHistoryStats: vi.fn().mockResolvedValue({})
        } as any;
        dataStore = {
            $selectedDevice: { subscribe: vi.fn(), get: vi.fn().mockReturnValue('d1') },
            $devices: { get: vi.fn().mockReturnValue([{ device_id: 'd1', name: 'Grow 1' }]) }
        } as any;
        store = new GrowspaceHistoryStore(dataService, dataStore);
    });

    it('should unsubscribe from selectedDevice on destroy', () => {
        const unsubSpy = vi.fn();
        (dataStore.$selectedDevice.subscribe as any).mockReturnValue(unsubSpy);

        // Re-init to capture spy
        store = new GrowspaceHistoryStore(dataService, dataStore);

        store.destroy();
        expect(unsubSpy).toHaveBeenCalled();
    });

    it('should fetch history for composite keys', async () => {
        store.$activeEnvGraphs.set(new Set(['circulation_fan:sensor.fan_1']));
        (dataService.getHistoryStats as any).mockResolvedValue({
            'sensor.fan_1': [{ time: 1, value: 10 }]
        });

        await (store as any)._fetchHistory('24h');

        expect(dataService.getHistoryStats).toHaveBeenCalledWith(
            expect.arrayContaining(['sensor.fan_1']),
            expect.any(Date),
            expect.any(Date),
            expect.any(Number),
            true
        );
    });

    it('should fetch delta for composite keys', async () => {
        store.$activeEnvGraphs.set(new Set(['circulation_fan:sensor.fan_1']));
        store.$lastTimestamps.set({ 'circulation_fan:sensor.fan_1': new Date().toISOString() });

        // Mock getHistoryStats to return something so _mergeDeltaData is called
        (dataService.getHistoryStats as any).mockResolvedValue({
            'sensor.fan_1': [{ last_updated: new Date().toISOString(), state: '20' }]
        });

        await (store as any)._fetchHistoryDelta();

        expect(dataService.getHistoryStats).toHaveBeenCalled();
        const callArgs = (dataService.getHistoryStats as any).mock.calls[0];
        expect(callArgs[0]).toContain('sensor.fan_1');
    });

    it('should link graphs into new group', () => {
        store.linkGraphs('temp', 'hum');
        const groups = store.$linkedGraphGroups.get();
        expect(groups).toHaveLength(1);
        expect(groups[0]).toContain('temp');
        expect(groups[0]).toContain('hum');

        const active = store.$activeEnvGraphs.get();
        expect(active.has('temp')).toBe(true);
        expect(active.has('hum')).toBe(true);
    });

    it('should link graphs into existing group', () => {
        store.$linkedGraphGroups.set([['temp', 'hum']]);
        store.linkGraphs('temp', 'vpd');

        const groups = store.$linkedGraphGroups.get();
        expect(groups).toHaveLength(1);
        expect(groups[0]).toContain('temp');
        expect(groups[0]).toContain('hum');
        expect(groups[0]).toContain('vpd');
    });

    it('should fetch history with different ranges', async () => {
        // Mock calculateTimeRange to avoid date math issues if needed, but logic is simple enough.
        // We really want to hit _getIntervalForRange

        const ranges = ['1h', '6h', '7d'] as const;
        const expectedIntervals = { '1h': 5, '6h': 15, '7d': 240 };

        for (const range of ranges) {
            (dataService.getHistoryStats as any).mockClear();
            await (store as any)._fetchHistory(range);

            expect(dataService.getHistoryStats).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Date),
                expect.any(Date),
                expectedIntervals[range], // Interval check
                true
            );
        }
    });

    it('should unlink graph group', () => {
        store.$linkedGraphGroups.set([['temp', 'hum'], ['vpd', 'co2']]);
        store.unlinkGraphGroup(0);
        expect(store.$linkedGraphGroups.get()).toHaveLength(1);
        expect(store.$linkedGraphGroups.get()[0]).toContain('vpd');
    });

    it('should unlink graph metric', () => {
        store.$linkedGraphGroups.set([['temp', 'hum', 'vpd']]);
        store.unlinkGraphMetric('hum');
        const groups = store.$linkedGraphGroups.get();
        expect(groups[0]).toEqual(['temp', 'vpd']);
    });

    it('should clear all links', () => {
        store.$linkedGraphGroups.set([['temp', 'hum']]);
        store.clearAllLinks();
        expect(store.$linkedGraphGroups.get()).toHaveLength(0);
    });

    it('should find calculated VPD entity if primary missing', () => {
        const device = {
            device_id: 'd1',
            name: 'Test Room',
            environment_attributes: {}
        } as any;
        (dataStore.$devices.get as any).mockReturnValue([device]);
        (dataStore.$selectedDevice.get as any).mockReturnValue('d1');

        // Mock hass states
        (dataService as any).hass = {
            states: {
                'sensor.test_room_calculated_vpd': { state: '1.2' }
            }
        };

        const result = (store as any).getEntityIdForMetric(device, 'vpd');
        expect(result).toBe('sensor.test_room_calculated_vpd');
    });
});
