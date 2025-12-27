import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrowspaceHistoryStore } from '../../src/store/history-store';
import { GrowspaceDataStore } from '../../src/store/data-store';
import { DataService } from '../../src/data-service';
import { HistorySensorState, HistoryTimeRange } from '../../src/types';

describe('history-store', () => {
    let dataStore: GrowspaceDataStore;
    let store: GrowspaceHistoryStore;
    let mockDataService: DataService;

    const mockHistoryData: HistorySensorState[] = [
        { entity_id: 'sensor.temp', state: '25', attributes: {}, last_changed: '2024-01-01T00:00:00Z' },
        { entity_id: 'sensor.temp', state: '26', attributes: {}, last_changed: '2024-01-01T01:00:00Z' },
    ];

    beforeEach(() => {
        localStorage.clear();
        dataStore = new GrowspaceDataStore();
        mockDataService = {
            getHistoryStats: vi.fn(),
            hass: { states: {} }
        } as unknown as DataService;

        store = new GrowspaceHistoryStore(mockDataService, dataStore);
    });

    describe('History Cache Operations', () => {
        it('should set history data for a metric', () => {
            store.setHistoryData('temperature', mockHistoryData);

            expect(store.$historyCache.get().temperature).toEqual(mockHistoryData);
        });

        it('should set history batch for multiple metrics', () => {
            const batch = {
                temperature: mockHistoryData,
                humidity: [{ entity_id: 'sensor.hum', state: '60', attributes: {}, last_changed: '2024-01-01T00:00:00Z' }],
            };

            store.setHistoryBatch(batch);

            expect(store.$historyCache.get().temperature).toEqual(mockHistoryData);
            expect(store.$historyCache.get().humidity).toHaveLength(1);
        });

        it('should clear history cache', () => {
            store.setHistoryData('temperature', mockHistoryData);
            store.setHistoryLoaded(true);

            store.clearHistoryCache();

            expect(store.$historyCache.get()).toEqual({});
            expect(store.$historyLoaded.get()).toBe(false);
        });

        it('should get history for metric', () => {
            store.setHistoryData('vpd', mockHistoryData);

            expect(store.getHistoryForMetric('vpd')).toEqual(mockHistoryData);
            expect(store.getHistoryForMetric('nonexistent')).toBeNull();
        });
    });

    describe('Last Timestamps', () => {
        it('should update last timestamp from data', () => {
            store.updateLastTimestamp('temperature', mockHistoryData);

            expect(store.$lastTimestamps.get().temperature).toBe('2024-01-01T01:00:00Z');
        });

        it('should not update timestamp for empty data', () => {
            store.updateLastTimestamp('temperature', []);

            expect(store.$lastTimestamps.get().temperature).toBeUndefined();
        });
    });

    describe('Loading State', () => {
        it('should set loading state', () => {
            store.setHistoryLoading(true);
            expect(store.$historyLoading.get()).toBe(true);

            store.setHistoryLoading(false);
            expect(store.$historyLoading.get()).toBe(false);
        });

        it('should set loaded state', () => {
            store.setHistoryLoaded(true);
            expect(store.$historyLoaded.get()).toBe(true);
        });
    });

    describe('Graph Ranges', () => {
        it('should set graph range for device', () => {
            store.setGraphRange('device1', '6h');

            expect(store.$graphRanges.get().device1).toBe('6h');
        });

        it('should get graph range with default', () => {
            expect(store.getGraphRange('device1')).toBe('24h');
            expect(store.getGraphRange(null)).toBe('24h');

            store.setGraphRange('device1', '7d');
            expect(store.getGraphRange('device1')).toBe('7d');
        });

        it('should invalidate history loaded state when setting range', () => {
            store.setHistoryLoaded(true);
            store.setGraphRange('device1', '6h');

            expect(store.$historyLoaded.get()).toBe(false);
        });

        it('should handle all time ranges correctly', async () => {
            dataStore.setDevices([{
                device_id: 'device1',
                name: 'Device 1',
                environment_attributes: { temperature_sensor: 'sensor.temp' }
            } as any]);
            dataStore.setSelectedDevice('device1');

            const ranges: HistoryTimeRange[] = ['1h', '6h', '24h', '7d'];

            for (const range of ranges) {
                store.setGraphRange('device1', range);
                vi.spyOn(store, 'getRange').mockReturnValue(range);

                vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({});

                await store.loadHistoryOnDemand();
                expect(mockDataService.getHistoryStats).toHaveBeenCalled();
                vi.mocked(mockDataService.getHistoryStats).mockClear();
            }
        });
    });

    describe('Active Environment Graphs', () => {
        it('should toggle env graph on', () => {
            const result = store.toggleEnvGraph('temperature');

            expect(result).toBe(true);
            expect(store.$activeEnvGraphs.get().has('temperature')).toBe(true);
        });

        it('should toggle env graph off', () => {
            store.toggleEnvGraph('temperature'); // On
            const result = store.toggleEnvGraph('temperature'); // Off

            expect(result).toBe(false);
            expect(store.$activeEnvGraphs.get().has('temperature')).toBe(false);
        });
    });

    describe('Linked Graphs', () => {
        it('should link two metrics', () => {
            store.linkGraphs('temperature', 'humidity');

            expect(store.$linkedGraphGroups.get()).toEqual([['temperature', 'humidity']]);
            expect(store.$activeEnvGraphs.get().has('temperature')).toBe(true);
            expect(store.$activeEnvGraphs.get().has('humidity')).toBe(true);
        });

        it('should add to existing group', () => {
            store.linkGraphs('temperature', 'humidity');
            store.linkGraphs('temperature', 'vpd');

            expect(store.$linkedGraphGroups.get()).toHaveLength(1);
            expect(store.$linkedGraphGroups.get()[0]).toContain('temperature');
            expect(store.$linkedGraphGroups.get()[0]).toContain('humidity');
            expect(store.$linkedGraphGroups.get()[0]).toContain('vpd');
        });

        it('should unlink graph group', () => {
            store.linkGraphs('temperature', 'humidity');
            store.linkGraphs('vpd', 'co2');

            store.unlinkGraphGroup(0);

            expect(store.$linkedGraphGroups.get()).toHaveLength(1);
            expect(store.$linkedGraphGroups.get()[0]).toContain('vpd');
        });

        it('should unlink specific metric', () => {
            store.linkGraphs('temperature', 'humidity');
            store.linkGraphs('temperature', 'vpd');

            store.unlinkGraphMetric('temperature');

            // Group should still exist but without temperature
            // If only one metric left, group should be removed
            expect(store.$linkedGraphGroups.get()[0]).not.toContain('temperature');
        });

        it('should clear all links', () => {
            store.linkGraphs('temperature', 'humidity');
            store.linkGraphs('vpd', 'co2');

            store.clearAllLinks();

            expect(store.$linkedGraphGroups.get()).toEqual([]);
        });
    });

    describe('Computed: combinedHistory', () => {
        it('should compute combined history from cache', () => {
            store.setHistoryData('temperature', mockHistoryData);
            store.setHistoryData('vpd', [{ entity_id: 'sensor.vpd', state: '1.2', attributes: {}, last_changed: '2024-01-01T00:00:00Z' }]);

            const combined = store.$combinedHistory.get();

            expect(combined.temperature).toEqual(mockHistoryData);
            expect(combined.vpd).toHaveLength(1);
            expect(combined.humidity).toEqual([]);
        });

        it('should update when cache changes', () => {
            const initialCombined = store.$combinedHistory.get();
            expect(initialCombined.temperature).toEqual([]);

            store.setHistoryData('temperature', mockHistoryData);

            const updatedCombined = store.$combinedHistory.get();
            expect(updatedCombined.temperature).toEqual(mockHistoryData);
        });
    });

    describe('History Fetching', () => {
        beforeEach(() => {
            dataStore.setSelectedDevice('device1');
            dataStore.setDevices([{
                device_id: 'device1',
                name: 'Device 1',
                overview_entity_id: 'sensor.overview',
                environment_attributes: { temperature_sensor: 'sensor.temp' }
            } as any]);
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should load history on demand successfully', async () => {
            const range = '24h';
            vi.spyOn(store, 'getRange').mockReturnValue(range);
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({
                'sensor.temp': mockHistoryData
            });

            await store.loadHistoryOnDemand();

            expect(store.$historyLoading.get()).toBe(false);
            expect(store.$historyLoaded.get()).toBe(true);
            expect(mockDataService.getHistoryStats).toHaveBeenCalled();
            expect(store.$historyCache.get().temperature).toEqual(mockHistoryData);
        });

        it('should handle load history failure', async () => {
            vi.mocked(mockDataService.getHistoryStats).mockReset();
            vi.mocked(mockDataService.getHistoryStats).mockRejectedValue(new Error('Fetch failed'));

            try {
                await store.loadHistoryOnDemand();
            } catch (e) {
                // Expected if loadHistoryOnDemand rethrows, but it catches internally
            }

            expect(store.$historyLoading.get()).toBe(false);
            expect(store.$historyLoaded.get()).toBe(false);
            expect(store.$historyError.get()).toBe('Fetch failed');
        });

        it('should prevent concurrent loading', async () => {
            store.setHistoryLoading(true);
            await store.loadHistoryOnDemand();
            expect(mockDataService.getHistoryStats).not.toHaveBeenCalled();
        });

        it('should start and stop auto refresh', async () => {
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({});
            store.startAutoRefresh();

            // Advance enough to trigger interval
            await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

            expect(mockDataService.getHistoryStats).toHaveBeenCalled();

            store.stopAutoRefresh();
        });

        it('should fetch delta when timestamps exist', async () => {
            // Seed data so timestamps exist
            store.setHistoryData('temperature', mockHistoryData);
            store.updateLastTimestamp('temperature', mockHistoryData);

            // Mock getHistoryStats
            const newPoint = {
                entity_id: 'sensor.temp',
                state: '27',
                attributes: {},
                last_changed: '2024-01-01T02:00:00Z'
            };
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({
                'sensor.temp': [newPoint]
            });

            await (store as any)._fetchHistoryDelta();

            expect(mockDataService.getHistoryStats).toHaveBeenCalled();
            // Verify merge
            const history = store.$historyCache.get().temperature;
            expect(history).toHaveLength(3);
            expect(history[2]).toEqual(newPoint);
        });

        it('should handle delta merge correctly (filtering old)', async () => {
            // Seed data
            store.setHistoryData('temperature', mockHistoryData);
            store.updateLastTimestamp('temperature', mockHistoryData);

            // Return overlapping data + new data
            const overlapping = mockHistoryData[1];
            const newPoint = {
                entity_id: 'sensor.temp',
                state: '27',
                attributes: {},
                last_changed: '2024-01-01T02:00:00Z'
            };

            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({
                'sensor.temp': [overlapping, newPoint]
            });

            await (store as any)._fetchHistoryDelta();

            const history = store.$historyCache.get().temperature;
            expect(history).toHaveLength(3); // Should not duplicate overlapping
            expect(history[2]).toEqual(newPoint);
        });
    });

    describe('Entity Mapping', () => {
        it('should get entity id for metric', () => {
            const device = {
                device_id: 'd1', name: 'D1',
                environment_attributes: { temperature_sensor: 'sensor.temp' },
                irrigation_config: { irrigation_pump_entity: 'switch.irrigation' }
            } as any;

            // Direct mapping
            expect((store as any).getEntityIdForMetric(device, 'temperature')).toBe('sensor.temp');

            // Irrigation mapping
            expect((store as any).getEntityIdForMetric(device, 'irrigation')).toBe('switch.irrigation');

            // Optimal mapping
            expect((store as any).getEntityIdForMetric(device, 'optimal')).toBe('binary_sensor.d1_optimal_conditions');
        });

        it('should resolve special optimal entity IDs', () => {
            const makeDevice = (name: string) => ({
                device_id: 'd1', name, environment_attributes: {}
            } as any);

            expect((store as any).getEntityIdForMetric(makeDevice('Cure'), 'optimal')).toBe('binary_sensor.cure_optimal_curing');
            expect((store as any).getEntityIdForMetric(makeDevice('Dry'), 'optimal')).toBe('binary_sensor.dry_optimal_drying');
        });

        it('should resolve calculated VPD if hass available', () => {
            const device = { device_id: 'd1', name: 'Tent 1' } as any;
            (store as any).dataService.hass = {
                states: {
                    'sensor.tent_1_calculated_vpd': { state: '1.2' } as any
                }
            };

            expect((store as any).getEntityIdForMetric(device, 'vpd')).toBe('sensor.tent_1_calculated_vpd');
        });
    });

    describe('Storage', () => {
        it('should load from storage if valid', () => {
            const deviceId = 'd1';
            const key = 'growspace_history_d1';
            const storedData = {
                version: 1,
                timestamp: Date.now(),
                history: { temperature: mockHistoryData },
                timestamps: {}
            };
            localStorage.setItem(key, JSON.stringify(storedData));

            const result = (store as any)._loadFromStorage(deviceId);
            expect(result).toBe(true);
            expect(store.$historyCache.get().temperature).toEqual(mockHistoryData);
        });

        it('should expire stale storage', () => {
            const deviceId = 'd1';
            const key = 'growspace_history_d1';
            const storedData = {
                version: 1,
                timestamp: Date.now() - (24 * 60 * 60 * 1000 + 1000), // > 24h old
                history: { temperature: mockHistoryData },
                timestamps: {}
            };
            localStorage.setItem(key, JSON.stringify(storedData));

            const result = (store as any)._loadFromStorage(deviceId);
            expect(result).toBe(false);
            expect(localStorage.getItem(key)).toBeNull();
        });
    });
});
