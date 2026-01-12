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

        it('should use last_updated when last_changed is missing', () => {
            const dataWithLastUpdated: HistorySensorState[] = [
                { entity_id: 'sensor.temp', state: '25', attributes: {}, last_changed: '', last_updated: '2024-01-01T02:00:00Z' },
            ];
            store.updateLastTimestamp('temperature', dataWithLastUpdated);

            expect(store.$lastTimestamps.get().temperature).toBe('2024-01-01T02:00:00Z');
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

        it('should remove group when unlink leaves single metric', () => {
            store.linkGraphs('temperature', 'humidity');
            // Group has two: temperature, humidity
            store.unlinkGraphMetric('temperature');
            // Group now has just humidity (length 1), so should be removed
            expect(store.$linkedGraphGroups.get()).toHaveLength(0);
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

        it('should refresh when tab becomes visible', async () => {
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({});
            store.startAutoRefresh();
            vi.mocked(mockDataService.getHistoryStats).mockClear();

            // Simulate tab becoming visible
            Object.defineProperty(document, 'hidden', { value: false, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));

            // Wait for the async fetch to complete
            await vi.advanceTimersByTimeAsync(100);
            expect(mockDataService.getHistoryStats).toHaveBeenCalled();

            store.stopAutoRefresh();
        });

        it('should not refresh when tab becomes hidden', async () => {
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({});
            store.startAutoRefresh();
            vi.mocked(mockDataService.getHistoryStats).mockClear();

            // Simulate tab becoming hidden
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));

            // Wait to see if any fetch was triggered
            await vi.advanceTimersByTimeAsync(100);
            expect(mockDataService.getHistoryStats).not.toHaveBeenCalled();

            store.stopAutoRefresh();
        });

        it('should clean up visibility listener on stopAutoRefresh', () => {
            const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
            store.startAutoRefresh();
            store.stopAutoRefresh();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
            removeEventListenerSpy.mockRestore();
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
    describe('Coverage Gap Filling', () => {
        it('should handle overview entity correctly in _fetchHistory', async () => {
            const overviewId = 'sensor.overview';
            dataStore.setDevices([{
                device_id: 'd1', name: 'D1', overview_entity_id: overviewId
            } as any]);
            dataStore.setSelectedDevice('d1');

            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({
                [overviewId]: mockHistoryData
            });

            await (store as any)._fetchHistory('24h');
            // Mostly ensuring no crash and coverage of the if block
            expect(mockDataService.getHistoryStats).toHaveBeenCalled();
        });

        it('should handle _fetchHistoryDelta errors', async () => {
            // Setup device
            dataStore.setDevices([{
                device_id: 'd1',
                name: 'D1',
                environment_attributes: { temperature_sensor: 'sensor.temp' }
            } as any]);
            dataStore.setSelectedDevice('d1');

            store.setHistoryData('temperature', mockHistoryData);
            store.updateLastTimestamp('temperature', mockHistoryData);

            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.mocked(mockDataService.getHistoryStats).mockRejectedValue(new Error('Delta fail'));

            await (store as any)._fetchHistoryDelta();

            expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch delta'), expect.any(Error));
            spy.mockRestore();
        });

        it('should return early in _fetchHistoryDelta when device is not found', async () => {
            // Select a device that doesn't exist in the devices list
            dataStore.setDevices([]);
            dataStore.setSelectedDevice('nonexistent_device');

            const spy = vi.spyOn(mockDataService, 'getHistoryStats');
            await (store as any)._fetchHistoryDelta();

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle _mergeDeltaData with empty existing cache', () => {
            const delta = [mockHistoryData[0]];
            (store as any)._mergeDeltaData('temperature', delta);

            expect(store.$historyCache.get().temperature).toEqual(delta);
            expect(store.$lastTimestamps.get().temperature).toBe((delta[0] as any).last_changed);
        });

        it('should handle storage save/load errors', () => {
            const deviceId = 'd1';
            dataStore.setSelectedDevice(deviceId);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // Save error
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
            (store as any)._saveToStorage();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to save'), expect.any(Error));

            // Load error
            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid json');
            const result = (store as any)._loadFromStorage(deviceId);
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load'), expect.any(Error));

            consoleSpy.mockRestore();
            setItemSpy.mockRestore();
            getItemSpy.mockRestore();
        });

        it('should return default interval for unknown range', () => {
            const interval = (store as any)._getIntervalForRange('unknown' as any);
            expect(interval).toBe(15);
        });

        it('should skip _saveToStorage if no device selected', () => {
            dataStore.setSelectedDevice(null);
            const spy = vi.spyOn(Storage.prototype, 'setItem');
            (store as any)._saveToStorage();
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should return null for unknown metric entity id', () => {
            const device = { device_id: 'd1' } as any;
            expect((store as any).getEntityIdForMetric(device, 'unknown_metric')).toBeNull();
        });

        it('should handle VPD fallback when hass is undefined', () => {
            const device = { device_id: 'd1', name: 'Tent 1' } as any;
            (store as any).dataService.hass = undefined;
            expect((store as any).getEntityIdForMetric(device, 'vpd')).toBeNull();
        });
        it('should handle empty delta data in _fetchHistoryDelta', async () => {
            dataStore.setDevices([{
                device_id: 'd1', name: 'D1',
                environment_attributes: { temperature_sensor: 'sensor.temp' }
            } as any]);
            dataStore.setSelectedDevice('d1');

            store.setHistoryData('temperature', mockHistoryData);
            store.updateLastTimestamp('temperature', mockHistoryData);

            // Mock empty delta
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({
                'sensor.temp': []
            });

            const spy = vi.spyOn(store as any, '_mergeDeltaData');

            await (store as any)._fetchHistoryDelta();

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle invalid storage data structure', () => {
            const key = 'growspace_history_d1';
            // Missing required fields
            localStorage.setItem(key, JSON.stringify({ version: 1 }));
            expect((store as any)._loadFromStorage('d1')).toBe(false);

            localStorage.setItem(key, JSON.stringify({ version: 1, timestamp: Date.now() }));
            expect((store as any)._loadFromStorage('d1')).toBe(false);
        });

        it('should handle missing timestamps in storage', () => {
            const key = 'growspace_history_d1';
            const data = {
                version: 1,
                timestamp: Date.now(),
                history: {},
                // timestamps missing
            };
            localStorage.setItem(key, JSON.stringify(data));

            expect((store as any)._loadFromStorage('d1')).toBe(true);
            expect(store.$lastTimestamps.get()).toEqual({});
        });
        it('should return early in _fetchHistoryDelta if no entities to fetch', async () => {
            // Setup device
            dataStore.setDevices([{
                device_id: 'd1',
                name: 'D1',
                // Device has NO sensors defined here
                environment_attributes: {}
            } as any]);
            dataStore.setSelectedDevice('d1');

            // Set a timestamp for a metric that doesn't exist on device
            store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');

            const spy = vi.spyOn(mockDataService, 'getHistoryStats');

            await (store as any)._fetchHistoryDelta();

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle optimal cache branch in combinedHistory', () => {
            store.setHistoryData('optimal', mockHistoryData);
            const combined = store.$combinedHistory.get();
            expect(combined.optimal).toEqual(mockHistoryData);
        });

        it('should return early in _fetchHistory if no entities to fetch', async () => {
            dataStore.setDevices([{
                device_id: 'd1',
                name: 'D1'
            } as any]);
            dataStore.setSelectedDevice('d1');

            vi.spyOn(store as any, 'getEntityIdForMetric').mockReturnValue(null);
            const spy = vi.spyOn(mockDataService, 'getHistoryStats');

            await (store as any)._fetchHistory();

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle deltaData branch in _fetchHistoryDelta', async () => {
            // Setup device
            dataStore.setDevices([{
                device_id: 'd1',
                name: 'D1',
                environment_attributes: { temperature_sensor: 'sensor.temp' }
            } as any]);
            dataStore.setSelectedDevice('d1');

            // Seed data so timestamps exist
            store.setHistoryData('temperature', mockHistoryData);
            store.updateLastTimestamp('temperature', mockHistoryData);

            // Mock getHistoryStats returning data for the entity
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({
                'sensor.temp': [{ ...mockHistoryData[0], last_changed: '2024-01-01T03:00:00Z' }]
            });

            const mergeSpy = vi.spyOn(store as any, '_mergeDeltaData');
            await (store as any)._fetchHistoryDelta();

            expect(mergeSpy).toHaveBeenCalled();
            mergeSpy.mockRestore();
        });
        it('should return early in _fetchHistory if device not found', async () => {
            // Select a device that doesn't exist
            dataStore.setSelectedDevice('nonexistent');

            const spy = vi.spyOn(mockDataService, 'getHistoryStats');
            await (store as any)._fetchHistory();

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle unlinkGraphGroup with invalid index', () => {
            store.linkGraphs('temperature', 'humidity');
            const groupsBefore = store.$linkedGraphGroups.get();
            store.unlinkGraphGroup(-1);
            store.unlinkGraphGroup(99);
            expect(store.$linkedGraphGroups.get()).toEqual(groupsBefore);
        });

        it('should handle loadHistoryOnDemand error with no message', async () => {
            dataStore.setSelectedDevice('d1');
            dataStore.setDevices([{ device_id: 'd1', name: 'D1' } as any]);
            vi.mocked(mockDataService.getHistoryStats).mockRejectedValue({});
            await store.loadHistoryOnDemand();
            expect(store.$historyError.get()).toBe('Failed to load history');
        });

        it('should handle startAutoRefresh when already running', () => {
            vi.spyOn(window, 'setInterval');
            store.startAutoRefresh();
            const firstId = (store as any)._refreshInterval;
            store.startAutoRefresh();
            expect(window.setInterval).toHaveBeenCalledTimes(1);
            expect((store as any)._refreshInterval).toBe(firstId);
            store.stopAutoRefresh();
        });

        it('should handle stopAutoRefresh when already stopped', () => {
            vi.spyOn(window, 'clearInterval');
            store.stopAutoRefresh();
            expect(window.clearInterval).not.toHaveBeenCalled();
        });

        it('should return early in _fetchHistory if no device id', async () => {
            dataStore.setSelectedDevice(null);
            const spy = vi.spyOn(mockDataService, 'getHistoryStats');
            await (store as any)._fetchHistory();
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should return early in _fetchHistoryDelta if no device id', async () => {
            dataStore.setSelectedDevice(null);
            const spy = vi.spyOn(mockDataService, 'getHistoryStats');
            await (store as any)._fetchHistoryDelta();
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle missing entity in batchResults in _fetchHistoryDelta', async () => {
            dataStore.setDevices([{
                device_id: 'd1', name: 'D1',
                environment_attributes: { temperature_sensor: 'sensor.temp' }
            } as any]);
            dataStore.setSelectedDevice('d1');
            store.$lastTimestamps.setKey('temperature', '2024-01-01T00:00:00Z');

            // Return result without the expected entity id
            vi.mocked(mockDataService.getHistoryStats).mockResolvedValue({});

            const mergeSpy = vi.spyOn(store as any, '_mergeDeltaData');
            await (store as any)._fetchHistoryDelta();
            expect(mergeSpy).not.toHaveBeenCalled();
        });
    });
});
