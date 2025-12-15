
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceHistoryController } from '../../src/controllers/growspace-history-controller';

describe('GrowspaceHistoryController', () => {
    let mockHost: any;
    let mockDataService: any;
    let controller: GrowspaceHistoryController;

    beforeEach(() => {
        mockDataService = {
            getHistory: vi.fn(),
            getBatchHistory: vi.fn()
        };
        mockHost = {
            addController: vi.fn(),
            requestUpdate: vi.fn(),
            hass: {},
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

    describe('Getters/Setters compatibility', () => {
        it('should support legacy getters/setters', () => {
            const data = [{ state: '20' }] as any;
            controller.historyData = data;
            expect(controller.historyData).toBe(data);
            expect(controller.historyCache.main).toBe(data);

            controller.optimalHistory = data;
            expect(controller.optimalHistory).toBe(data);
            expect(controller.historyCache.optimal).toBe(data);
        });

        it('should provide specific cache getters', () => {
            controller.historyCache.temperature = [{ state: '25' }] as any;
            expect(controller.temperatureHistory).toEqual([{ state: '25' }]);
        });
    });

    describe('Graph Management', () => {
        it('should set graph range and refetch', async () => {
            const spy = vi.spyOn(controller as any, '_fetchHistory');
            // Mock metrics
            const spyMetric = vi.spyOn(controller as any, '_fetchMetricHistory');
            controller.activeEnvGraphs.add('vpd');

            await controller.setGraphRange('7d');

            expect(controller.graphRanges['d1']).toBe('7d');
            expect(mockHost.requestUpdate).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith('7d');
            expect(spyMetric).toHaveBeenCalledWith('vpd', '7d');
        });

        it('should toggle env graph visibility', () => {
            const spy = vi.spyOn(controller as any, '_fetchMetricHistory');
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
            controller.linkGraphs('temp', 'humidity');
            expect(controller.linkedGraphGroups).toEqual([['temp', 'humidity']]);
            expect(controller.activeEnvGraphs.has('temp')).toBe(true);
            expect(controller.activeEnvGraphs.has('humidity')).toBe(true);
        });
    });

    describe('Data Fetching', () => {
        beforeEach(() => {
            // Mock console to keep output clean 
            // vi.spyOn(console, 'log').mockImplementation(() => {}); 
        });

        it('should abort if no device selected', async () => {
            mockHost.selectedDevice = null;
            await (controller as any)._fetchHistory();
            expect(mockDataService.getHistory).not.toHaveBeenCalled();
        });

        it('should fetch main history', async () => {
            mockDataService.getHistory.mockResolvedValue([{ state: '10' }]);
            await (controller as any)._fetchHistory();

            expect(mockDataService.getHistory).toHaveBeenCalledWith(
                'sensor.tent_1', expect.any(Date), expect.any(Date)
            );
            expect(controller.historyData).toHaveLength(1);
        });

        it('should fetch configured environment sensors', async () => {
            mockHost.devices[0].environment_attributes = {
                temperature_sensor: 'sensor.temp',
                humidity_sensor: 'sensor.hum'
            };
            mockDataService.getHistory.mockResolvedValue([]);

            await (controller as any)._fetchHistory();

            expect(mockDataService.getHistory).toHaveBeenCalledWith(
                'sensor.temp', expect.any(Date), expect.any(Date)
            );
            expect(mockDataService.getHistory).toHaveBeenCalledWith(
                'sensor.hum', expect.any(Date), expect.any(Date)
            );
        });

        it('should synthesize light history if missing but optimal exists', async () => {
            mockHost.devices[0].environment_attributes = {};
            // Optimal history returns is_lights_on attribute
            mockDataService.getHistory.mockImplementation((entity) => {
                if (entity.includes('optimal')) {
                    return [{ state: 'on', attributes: { is_lights_on: true } }];
                }
                return [];
            });

            await (controller as any)._fetchHistory();

            expect(controller.lightHistory).toBeDefined();
            expect(controller.lightHistory![0].state).toBe('on');
        });
    });
});
