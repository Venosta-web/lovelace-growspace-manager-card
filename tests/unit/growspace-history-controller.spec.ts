
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspaceHistoryController } from '../../src/controllers/growspace-history-controller';
import * as historyStore from '../../src/store/history-store';

describe('GrowspaceHistoryController', () => {
    let mockHost: any;
    let mockDataService: any;
    let controller: GrowspaceHistoryController;

    beforeEach(() => {
        // Reset history store atoms before each test
        historyStore.$historyCache.set({});
        historyStore.$lastTimestamps.set({});
        historyStore.$historyLoading.set(false);
        historyStore.$historyLoaded.set(false);
        historyStore.$historyError.set(null);
        historyStore.$graphRanges.set({});
        historyStore.$activeEnvGraphs.set(new Set());
        historyStore.$linkedGraphGroups.set([]);

        mockDataService = {
            getHistory: vi.fn(),
            getBatchHistory: vi.fn(),
            getHistoryStats: vi.fn()
        };
        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
            hass: { states: {} },
            selectedDevice: 'd1',
            devices: [{ device_id: 'd1', name: 'Tent 1', overview_entity_id: 'sensor.tent_1' }],
            dataService: mockDataService
        };

        controller = new GrowspaceHistoryController(mockHost);
        // Reset console spies if any
    });

    it('should initialize and register with host', () => {
        expect(mockHost.addController).toHaveBeenCalledWith(controller);
        expect(controller.historyCache).toEqual({});
    });



    describe('loadHistoryOnDemand', () => {
        it('should successfully load history and set flags', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            vi.spyOn(controller as any, '_fetchHistory').mockResolvedValue(undefined);

            historyStore.$historyLoaded.set(false);
            historyStore.$historyLoading.set(false);

            await controller.loadHistoryOnDemand();

            expect(controller.isHistoryLoaded).toBe(true);
            expect(controller.isHistoryLoading).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('[HistoryController] History loaded successfully');
        });
    });



    describe('Graph Management', () => {
        it('should set graph range and refetch', async () => {
            const spy = vi.spyOn(controller as any, '_fetchHistory').mockImplementation(() => Promise.resolve());
            // Mock refreshSecondaryHistories which now batches all secondary metrics
            const spyRefresh = vi.spyOn(controller as any, 'refreshSecondaryHistories').mockImplementation(() => Promise.resolve());
            controller.activeEnvGraphs.add('vpd');

            await controller.setGraphRange('7d');

            expect(controller.graphRanges['d1']).toBe('7d');

            expect(spy).toHaveBeenCalledWith('7d');
            expect(spyRefresh).toHaveBeenCalledWith('7d');
        });

        it('should toggle env graph visibility', () => {
            const spy = vi.spyOn(controller as any, '_fetchMetricHistory').mockImplementation(() => Promise.resolve());
            controller.activeEnvGraphs.clear();

            // Toggle ON
            controller.toggleEnvGraph({ metric: 'vpd', visible: true });
            expect(controller.activeEnvGraphs.has('vpd')).toBe(true);
            expect(spy).toHaveBeenCalledWith('vpd', expect.any(String));

            // Toggle OFF
            controller.toggleEnvGraph({ metric: 'vpd', visible: false });
            expect(controller.activeEnvGraphs.has('vpd')).toBe(false);
        });

        it('should link graphs', () => {
            // It seems linking graphs adds them to activeEnvGraphs, which might trigger a fetch if reactive, or maybe the test setup interacts.
            // Just to be safe and silence potential logs:
            vi.spyOn(controller as any, '_fetchMetricHistory').mockImplementation(() => Promise.resolve());

            controller.linkGraphs('temp', 'humidity');
            expect(controller.linkedGraphGroups).toEqual([['temp', 'humidity']]);
            expect(controller.activeEnvGraphs.has('temp')).toBe(true);
            expect(controller.activeEnvGraphs.has('humidity')).toBe(true);
        });
    });

    describe('Data Fetching', () => {
        beforeEach(() => {
            // Mock console to keep output clean 
            vi.spyOn(console, 'log').mockImplementation(() => { });
        });

        it('should abort if no device selected', async () => {
            mockHost.selectedDevice = null;
            await (controller as any)._fetchHistory();
            expect(mockDataService.getHistory).not.toHaveBeenCalled();
        });

        it('should fetch main history', async () => {
            mockDataService.getHistoryStats.mockResolvedValue({
                'sensor.tent_1': [{ state: '10' }]
            });
            await (controller as any)._fetchHistory();

            expect(mockDataService.getHistoryStats).toHaveBeenCalledWith(
                expect.arrayContaining(['sensor.tent_1']),
                expect.any(Date),
                expect.any(Date),
                30, // 24h interval
                true
            );
            expect(controller.historyCache.main).toHaveLength(1);
        });

        it('should fetch configured environment sensors', async () => {
            mockHost.devices[0].environment_attributes = {
                temperature_sensor: 'sensor.temp',
                humidity_sensor: 'sensor.hum'
            };
            mockDataService.getHistoryStats.mockResolvedValue({});

            await (controller as any)._fetchHistory();

            expect(mockDataService.getHistoryStats).toHaveBeenCalledWith(
                expect.arrayContaining(['sensor.temp', 'sensor.hum']),
                expect.any(Date),
                expect.any(Date),
                30,
                true
            );
        });

        it('should synthesize light history if missing but optimal exists', async () => {
            mockHost.devices[0].environment_attributes = {};
            // Mock batch response with optimal data
            // Device name 'Tent 1', overview_entity_id 'sensor.tent_1' -> slug 'tent_1'
            // optimal id -> binary_sensor.tent_1_optimal_conditions
            mockDataService.getHistoryStats.mockResolvedValue({
                'binary_sensor.tent_1_optimal_conditions': [{ state: 'on', attributes: { is_lights_on: true } }]
            });

            await (controller as any)._fetchHistory();

            expect(controller.lightHistory).toBeDefined();
            expect(controller.lightHistory![0].state).toBe('on');
        });

        it('should handle fetch errors gracefully', async () => {
            mockDataService.getHistoryStats.mockRejectedValue(new Error('Fetch failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await (controller as any)._fetchHistory();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch batch history'), expect.any(Object));
        });
    });

    describe('Enhanced Coverage Tests', () => {
        it('should manage auto-refresh lifecycle', () => {
            vi.useFakeTimers();
            const fetchSpy = vi.spyOn(controller as any, '_fetchHistoryDelta').mockImplementation(() => Promise.resolve());

            controller.hostConnected();
            expect((controller as any)._refreshInterval).toBeTruthy();

            vi.advanceTimersByTime(5 * 60 * 1000);
            expect(fetchSpy).toHaveBeenCalled();

            controller.hostDisconnected();
            expect((controller as any)._refreshInterval).toBeNull();

            vi.useRealTimers();
        });

        it('should handle host updates resetting state for new device', async () => {

            // Mock storage load to return false (not found) so we can test reset logic properly
            vi.spyOn(controller as any, '_loadFromStorage').mockReturnValue(false);

            // Initial update - previous selection was null/undefined
            await controller.hostUpdate();

            // First call - assumes previous was null (default init)
            mockHost.selectedDevice = 'd1';
            await controller.hostUpdate();

            // Should reset loading flags and notify (but not auto-fetch due to lazy loading)
            expect(controller.isHistoryLoaded).toBe(false);
            expect(controller.isHistoryLoading).toBe(false);
            expect(controller.isHistoryLoaded).toBe(false);
            expect(controller.isHistoryLoading).toBe(false);

            // Idempotent - no change if device stays the same

        });

        it('should manage graph linking and unlinking', () => {
            vi.spyOn(controller as any, '_fetchMetricHistory').mockImplementation(() => Promise.resolve());
            vi.spyOn(controller as any, '_fetchMetricHistory').mockImplementation(() => Promise.resolve());

            // Link new
            controller.linkGraphs('a', 'b');
            expect(controller.linkedGraphGroups).toEqual([['a', 'b']]);
            expect(controller.linkedGraphGroups).toEqual([['a', 'b']]);

            // Link existing
            controller.linkGraphs('b', 'c');
            // Depending on implementation, it might append to existing group
            // Array logic: existingGroupIndex found by check (includes a or b)
            expect(controller.linkedGraphGroups[0]).toContain('c');
            expect(controller.linkedGraphGroups.length).toBe(1);

            // Unlink specific index
            controller.unlinkGraphGroup(0);
            expect(controller.linkedGraphGroups).toEqual([]);

            // Unlink metric specific logic
            // Need to setup groups first
            historyStore.$linkedGraphGroups.set([['x', 'y'], ['y', 'z']]);
            // Note: Implementation logic might merge duplicates if properly tested but let's test specific unlink
            controller.unlinkGraphMetric('z');
            // logic: map filter, then filter length > 1
            // group 2 becomes ['y'], length 1 -> filtered out
            expect(controller.linkedGraphGroups.length).toBeLessThan(2);

            controller.clearAllLinks();
            expect(controller.linkedGraphGroups).toEqual([]);
        });

        it('should resolve entities correctly (getEntityIdForMetric)', () => {
            const deviceMock = {
                name: 'My Tent',
                irrigation_config: { irrigation_pump_entity: 'switch.irrigation' },
                environment_attributes: {
                    temperature_sensor: 'sensor.temp',
                    humidity_sensor: 'sensor.hum',
                    vpd_sensor: 'sensor.vpd'
                },
                overview_entity_id: 'sensor.overview'
            } as any;

            // Optimal
            expect(controller.getEntityIdForMetric(deviceMock, 'optimal')).toBe('binary_sensor.overview_optimal_conditions');

            // Irrigation source
            expect(controller.getEntityIdForMetric(deviceMock, 'irrigation')).toBe('switch.irrigation');

            // Standard attributes
            expect(controller.getEntityIdForMetric(deviceMock, 'temperature')).toBe('sensor.temp');

            // VPD fallback logic
            const noVpdDevice = { ...deviceMock, environment_attributes: {} };
            mockHost.hass.states['sensor.my_tent_calculated_vpd'] = {}; // Mock existence
            expect(controller.getEntityIdForMetric(noVpdDevice, 'vpd')).toBe('sensor.my_tent_calculated_vpd');

            // Legacy slugs - ensure overview_entity_id is absent so it falls back to name slug
            const cureDevice = { ...deviceMock, name: 'Cure', overview_entity_id: undefined };
            expect(controller.getEntityIdForMetric(cureDevice, 'optimal')).toBe('binary_sensor.cure_optimal_curing');
        });

        it('should resolve dry legacy slug for optimal', () => {
            // Test the "dry" legacy slug branch (line 723)
            const dryDevice = {
                name: 'Dry',
                overview_entity_id: undefined,
                environment_attributes: {}
            } as any;
            expect(controller.getEntityIdForMetric(dryDevice, 'optimal')).toBe('binary_sensor.dry_optimal_drying');
        });

        it('should return null for unknown metric key', () => {
            const device = { name: 'Test', environment_attributes: {} } as any;
            expect(controller.getEntityIdForMetric(device, 'unknown_metric')).toBeNull();
        });

        it('should handle _getIntervalForRange default case', () => {
            // Access private method to test default case (line 813)
            const getInterval = (controller as any)._getIntervalForRange.bind(controller);

            // Test all known ranges
            expect(getInterval('7d')).toBe(240);
            expect(getInterval('24h')).toBe(30);
            expect(getInterval('6h')).toBe(15);
            expect(getInterval('1h')).toBe(5);

            // Test default/fallthrough case with unknown value
            expect(getInterval('unknown' as any)).toBe(15);
        });

        it('should handle _fetchMetricHistory when entity not found', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            // Make getEntityIdForMetric return null
            vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue(null);

            await (controller as any)._fetchMetricHistory('nonexistent_metric', '24h');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('No entity ID found for metric: nonexistent_metric')
            );
        });

        it('should handle _fetchMetricHistory error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.spyOn(console, 'log').mockImplementation(() => { });

            // Make getEntityIdForMetric return a valid entity
            vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue('sensor.test');

            // Make the fetch fail
            mockDataService.getHistoryStats.mockRejectedValue(new Error('Network error'));

            await (controller as any)._fetchMetricHistory('test_metric', '24h');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch test_metric history'),
                expect.any(Error)
            );
        });

        it('should handle refreshSecondaryHistories error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.spyOn(console, 'log').mockImplementation(() => { });

            controller.activeEnvGraphs.add('temperature');
            vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue('sensor.temp');

            mockDataService.getHistoryStats.mockRejectedValue(new Error('Batch error'));

            await (controller as any).refreshSecondaryHistories('24h');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to batch fetch secondary histories'),
                expect.any(Error)
            );
        });

        it('should handle _fetchHistoryDelta error gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.spyOn(console, 'log').mockImplementation(() => { });

            // Set up timestamps so delta fetch doesn't fallback to full fetch
            historyStore.$lastTimestamps.set({ main: '2023-01-01T12:00:00Z' });

            vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue('sensor.test');
            mockDataService.getHistoryStats.mockRejectedValue(new Error('Delta error'));

            await (controller as any)._fetchHistoryDelta();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch delta history'),
                expect.any(Error)
            );
        });

        it('should skip delta fetch if no entities to fetch', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            // Set up timestamps for metrics but no entity IDs found
            historyStore.$lastTimestamps.set({ temperature: '2023-01-01' });
            vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue(null);
            mockHost.devices[0].overview_entity_id = null;

            await (controller as any)._fetchHistoryDelta();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('No entities to delta fetch')
            );
        });

        it('should handle refreshSecondaryHistories with no metrics to fetch', async () => {
            // Clear active graphs - should return early
            controller.activeEnvGraphs.clear();

            await (controller as any).refreshSecondaryHistories('24h');

            // Should not call getHistoryStats
            expect(mockDataService.getHistoryStats).not.toHaveBeenCalled();
        });

        it('should handle refreshSecondaryHistories skipping main and optimal', async () => {
            vi.spyOn(console, 'log').mockImplementation(() => { });

            // Add main and optimal to active graphs - these should be skipped
            controller.activeEnvGraphs.add('main');
            controller.activeEnvGraphs.add('optimal');
            controller.activeEnvGraphs.add('temperature');

            vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue('sensor.temp');
            mockDataService.getHistoryStats.mockResolvedValue({ 'sensor.temp': [] });

            await (controller as any).refreshSecondaryHistories('24h');

            // Should only fetch temperature, not main/optimal
            const callArgs = mockDataService.getHistoryStats.mock.calls[0];
            expect(callArgs[0]).toHaveLength(1);
            expect(callArgs[0]).toContain('sensor.temp');
        });

        it('should handle _mergeDeltaData with empty existing cache', () => {
            // Test when cache is empty - should just set the delta data
            historyStore.$historyCache.set({});
            const deltaData = [{ state: '20', last_updated: '2023-01-01T12:00:00Z' }];

            (controller as any)._mergeDeltaData('temperature', deltaData as any);

            expect(controller.historyCache.temperature).toEqual(deltaData);
        });

        it('should not save to storage if no device selected', () => {
            mockHost.selectedDevice = null;
            // Just verify it doesn't throw when no device selected
            expect(() => (controller as any)._saveToStorage()).not.toThrow();
        });

        it('should not set graph range if no device selected', () => {
            mockHost.selectedDevice = null;
            const fetchSpy = vi.spyOn(controller as any, '_fetchHistory').mockResolvedValue(undefined);

            controller.setGraphRange('7d');

            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('should return early from loadHistoryOnDemand if already loaded or loading', async () => {
            const fetchSpy = vi.spyOn(controller as any, '_fetchHistory').mockResolvedValue(undefined);

            // Test already loaded
            historyStore.$historyLoaded.set(true);
            await controller.loadHistoryOnDemand();
            expect(fetchSpy).not.toHaveBeenCalled();

            // Test already loading
            historyStore.$historyLoaded.set(false);
            historyStore.$historyLoading.set(true);
            await controller.loadHistoryOnDemand();
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('should return early from _fetchHistory if no hass or no device', async () => {
            mockHost.hass = null;
            await (controller as any)._fetchHistory('24h');
            expect(mockDataService.getHistoryStats).not.toHaveBeenCalled();

            mockHost.hass = { states: {} };
            mockHost.devices = []; // No devices
            await (controller as any)._fetchHistory('24h');
            expect(mockDataService.getHistoryStats).not.toHaveBeenCalled();
        });

        it('should return early from _fetchMetricHistory if no device', async () => {
            mockHost.devices = [];
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await (controller as any)._fetchMetricHistory('temperature', '24h');

            expect(mockDataService.getHistoryStats).not.toHaveBeenCalled();
        });

        it('should handle unlinkGraphGroup with invalid index', () => {
            historyStore.$linkedGraphGroups.set([['a', 'b']]);

            // Invalid indices should not modify the array
            controller.unlinkGraphGroup(-1);
            expect(controller.linkedGraphGroups).toHaveLength(1);

            controller.unlinkGraphGroup(10);
            expect(controller.linkedGraphGroups).toHaveLength(1);
        });

        // Note: _loadFromStorage invalid JSON and missing version tests are in the Storage & Caching describe block

        it('should cache combined history', () => {
            controller.historyCache.temperature = [{ state: '1' }] as any;
            const combined = controller.combinedHistory;
            expect(combined.temperature).toHaveLength(1);

            // Access again should return same object reference (cached)
            expect(controller.combinedHistory).toBe(combined);

            // Setting data invalidates cache
            historyStore.setHistoryData('temperature', []);
            expect(controller.combinedHistory).not.toBe(combined);
        });

        it('should return all specific history getters', () => {
            historyStore.setHistoryBatch({
                temperature: [], humidity: [], vpd: [], co2: [],
                soil_moisture: [], exhaust: [], humidifier: [],
                dehumidifier: [], circulation_fan: [], irrigation: [], drain: []
            });

            expect(controller.soilMoistureHistory).toBeDefined();
            expect(controller.exhaustHistory).toBeDefined();
            expect(controller.humidifierHistory).toBeDefined();
            expect(controller.dehumidifierHistory).toBeDefined();
            expect(controller.circulationFanHistory).toBeDefined();
            expect(controller.irrigationHistory).toBeDefined();
            expect(controller.drainHistory).toBeDefined();

            expect(controller.lightHistory).toBeNull();
        });
    });

    describe('Legacy & Utils Coverage Tests', () => {
        it('should calculate time range correctly', () => {
            // Access private method
            const calcRange = (controller as any).calculateTimeRange.bind(controller);
            const now = new Date();

            const r1h = calcRange('1h');
            expect(r1h.end.getTime()).toBeCloseTo(now.getTime(), -2); // within 100ms
            expect(r1h.start.getTime()).toBeCloseTo(now.getTime() - 60 * 60 * 1000, -2);

            const r6h = calcRange('6h');
            expect(r6h.start.getTime()).toBeCloseTo(now.getTime() - 6 * 3600 * 1000, -2);

            const r7d = calcRange('7d');
            expect(r7d.start.getTime()).toBeCloseTo(now.getTime() - 7 * 24 * 3600 * 1000, -2);

            // Default case (switch fallthrough or explicit)
            const def = calcRange('24h');
            expect(def.start.getTime()).toBeCloseTo(now.getTime() - 24 * 3600 * 1000, -2);
        });


        describe('Storage & Caching', () => {
            beforeEach(() => {
                vi.useFakeTimers();
                // Mock localStorage
                const storageMock = (() => {
                    let store: Record<string, string> = {};
                    return {
                        getItem: vi.fn((key: string) => store[key] || null),
                        setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
                        removeItem: vi.fn((key: string) => { delete store[key]; }),
                        clear: vi.fn(() => { store = {}; })
                    };
                })();
                Object.defineProperty(window, 'localStorage', { value: storageMock });
            });

            afterEach(() => {
                vi.useRealTimers();
            });

            it('should save history to localStorage', () => {
                mockHost.selectedDevice = 'd1';
                historyStore.setHistoryData('temperature', [{ state: '20' }] as any);
                historyStore.$lastTimestamps.set({ temperature: '2023-01-01' });

                (controller as any)._saveToStorage();

                expect(localStorage.setItem).toHaveBeenCalledWith(
                    'growspace_history_d1',
                    expect.stringContaining('"temperature":[{"state":"20"}]')
                );
            });

            it('should not load expired data', () => {
                const now = Date.now();
                const expiredData = {
                    version: 1,
                    timestamp: now - (24 * 60 * 60 * 1000) - 1000, // 24h + 1s ago
                    history: { temperature: [] },
                    timestamps: {}
                };
                (localStorage.getItem as any).mockReturnValue(JSON.stringify(expiredData));

                const result = (controller as any)._loadFromStorage('d1');

                expect(result).toBe(false);
                expect(localStorage.removeItem).toHaveBeenCalledWith('growspace_history_d1');
            });

            it('should load valid data', () => {
                const validData = {
                    version: 1,
                    timestamp: Date.now(),
                    history: { temperature: [{ state: '20' }] },
                    timestamps: { temperature: '2023-01-01' }
                };
                (localStorage.getItem as any).mockReturnValue(JSON.stringify(validData));

                const result = (controller as any)._loadFromStorage('d1');

                expect(result).toBe(true);
                expect(controller.historyCache.temperature).toHaveLength(1);
                expect(controller.isHistoryLoaded).toBe(true);
            });

            it('should fail gracefully on storage errors', () => {
                mockHost.selectedDevice = 'd1';
                (localStorage.setItem as any).mockImplementation(() => { throw new Error('Quota'); });

                // Should not throw
                expect(() => (controller as any)._saveToStorage()).not.toThrow();
            });

            it('should handle _loadFromStorage with invalid JSON', () => {
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
                (localStorage.getItem as any).mockReturnValue('invalid json');

                const result = (controller as any)._loadFromStorage('d1');

                expect(result).toBe(false);
                expect(consoleSpy).toHaveBeenCalled();
            });

            it('should handle _loadFromStorage with missing version', () => {
                const invalidData = { timestamp: Date.now(), history: {} };
                (localStorage.getItem as any).mockReturnValue(JSON.stringify(invalidData));

                const result = (controller as any)._loadFromStorage('d1');

                expect(result).toBe(false);
            });
        });

        describe('Delta Fetching & Updates', () => {
            it('should fallback to full fetch if no timestamps exist', async () => {
                historyStore.$lastTimestamps.set({});
                const fullFetchSpy = vi.spyOn(controller as any, '_fetchHistory').mockImplementation(() => Promise.resolve());

                await (controller as any)._fetchHistoryDelta();

                expect(fullFetchSpy).toHaveBeenCalled();
            });

            it('should fetch delta if timestamps exist', async () => {
                mockHost.selectedDevice = 'd1';
                historyStore.$lastTimestamps.set({ temperature: '2023-01-01T12:00:00Z' });

                mockDataService.getHistoryStats.mockResolvedValue({
                    'sensor.temp': [{ state: '21', last_updated: '2023-01-01T12:05:00Z' }]
                }); // New data

                // Mock resolving entity ID
                vi.spyOn(controller, 'getEntityIdForMetric').mockReturnValue('sensor.temp');

                await (controller as any)._fetchHistoryDelta();

                // Check if getHistoryStats was called with start time > last timestamp
                expect(mockDataService.getHistoryStats).toHaveBeenCalledWith(
                    expect.any(Array),
                    expect.any(Date),
                    expect.any(Date), // end is now
                    expect.any(Number),
                    true
                );
            });

            it('should merge delta data correctly', () => {
                const existing = [{ state: '20', last_updated: '2023-01-01T12:00:00Z' }];
                const newData = [{ state: '21', last_updated: '2023-01-01T12:05:00Z' }]; // Newer

                historyStore.setHistoryData('temperature', existing as any);
                historyStore.$lastTimestamps.set({ temperature: '2023-01-01T12:00:00Z' });

                (controller as any)._mergeDeltaData('temperature', newData as any);

                expect(controller.historyCache.temperature).toHaveLength(2);
                expect((controller.historyCache.temperature as any)[1].state).toBe('21');
            });

            it('should ignore older delta data (deduplication)', () => {
                const existing = [{ state: '20', last_updated: '2023-01-01T12:00:00Z' }];
                const oldData = [{ state: '19', last_updated: '2023-01-01T11:00:00Z' }]; // Older

                historyStore.setHistoryData('temperature', existing as any);
                historyStore.$lastTimestamps.set({ temperature: '2023-01-01T12:00:00Z' });

                (controller as any)._mergeDeltaData('temperature', oldData as any);

                expect(controller.historyCache.temperature).toHaveLength(1);
            });
        });

        describe('Secondary History Batching', () => {
            it('should batch fetch secondary metrics', async () => {
                controller.activeEnvGraphs.add('vpd');
                controller.activeEnvGraphs.add('co2'); // Two metrics

                vi.spyOn(controller, 'getEntityIdForMetric').mockImplementation((_, metric) =>
                    metric === 'vpd' ? 'sensor.vpd' : 'sensor.co2'
                );

                mockDataService.getHistoryStats.mockResolvedValue({
                    'sensor.vpd': [],
                    'sensor.co2': []
                });

                await (controller as any).refreshSecondaryHistories('24h');

                expect(mockDataService.getHistoryStats).toHaveBeenCalledTimes(1);
                const callArgs = mockDataService.getHistoryStats.mock.calls[0];
                expect(callArgs[0]).toHaveLength(2); // Two entity IDs
                expect(callArgs[0]).toContain('sensor.vpd');
                expect(callArgs[0]).toContain('sensor.co2');
            });
        });

        describe('Error Handling', () => {
            it('should handle loadHistoryOnDemand errors', async () => {
                const spy = vi.spyOn(controller, 'getRange');
                vi.spyOn(controller as any, '_fetchHistory').mockRejectedValue(new Error('Fetch error'));
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

                await controller.loadHistoryOnDemand();

                expect(consoleSpy).toHaveBeenCalledWith(
                    '[HistoryController] Failed to load history',
                    expect.any(Error)
                );
                expect(controller.isHistoryLoading).toBe(false);
            });
        });

        describe('Time Range Intervals', () => {
            it('should handle all time range intervals (indirectly via setGraphRange or private access)', () => {
                mockHost.selectedDevice = 'd1';
                const fetchSpy = vi.spyOn(controller as any, '_fetchHistory').mockResolvedValue(undefined);
                const batchSpy = vi.spyOn(controller as any, 'refreshSecondaryHistories').mockResolvedValue(undefined);

                controller.setGraphRange('1h');
                expect(fetchSpy).toHaveBeenLastCalledWith('1h');

                controller.setGraphRange('6h');
                expect(fetchSpy).toHaveBeenLastCalledWith('6h');

                controller.setGraphRange('7d');
                expect(fetchSpy).toHaveBeenLastCalledWith('7d');
            });

            it('should use correct intervals for ranges', async () => {
                mockHost.selectedDevice = 'd1';
                mockHost.devices[0].overview_entity_id = 'sensor.ov';

                const fetch = (controller as any)._fetchHistory.bind(controller); // access private directly or use setGraphRange

                mockDataService.getHistoryStats.mockResolvedValue({});

                // 1h -> 5 min
                await fetch('1h');
                expect(mockDataService.getHistoryStats).toHaveBeenLastCalledWith(
                    expect.any(Array), expect.any(Date), expect.any(Date), 5, true
                );

                // 6h -> 15 min
                await fetch('6h');
                expect(mockDataService.getHistoryStats).toHaveBeenLastCalledWith(
                    expect.any(Array), expect.any(Date), expect.any(Date), 15, true
                );

                // 7d -> 240 min
                await fetch('7d');
                expect(mockDataService.getHistoryStats).toHaveBeenLastCalledWith(
                    expect.any(Array), expect.any(Date), expect.any(Date), 240, true
                );
            });
        });
    });
});
