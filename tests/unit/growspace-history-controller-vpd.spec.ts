
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceHistoryController } from '../../src/controllers/growspace-history-controller';

describe('GrowspaceHistoryController VPD Fallback', () => {
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
            hass: {
                states: {}
            },
            selectedDevice: 'd1',
            devices: [{
                device_id: 'd1',
                name: 'Test Growspace',
                overview_entity_id: 'sensor.test_growspace',
                environment_attributes: {
                    // intentionally missing vpd_sensor
                    temperature_sensor: 'sensor.temp'
                }
            }],
            dataService: mockDataService
        };

        controller = new GrowspaceHistoryController(mockHost);
        // Spy on console to avoid clutter
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should fallback to calculated VPD sensor if configured vpd_sensor is missing but calculated sensor exists', async () => {
        // Mock the calculated VPD sensor existence
        // slugify('Test Growspace Calculated VPD') -> 'test_growspace_calculated_vpd'
        // Expected ID: sensor.test_growspace_calculated_vpd
        mockHost.hass.states['sensor.test_growspace_calculated_vpd'] = {
            state: '1.2',
            attributes: { unit_of_measurement: 'kPa' }
        };

        mockDataService.getHistory.mockResolvedValue([{ state: '1.2', last_changed: new Date().toISOString() }]);

        await (controller as any)._fetchHistory();

        expect(mockDataService.getHistory).toHaveBeenCalledWith(
            'sensor.test_growspace_calculated_vpd',
            expect.any(Date),
            expect.any(Date)
        );

        expect(controller.historyCache.vpd).toHaveLength(1);
        expect(controller.historyCache.vpd[0].state).toBe('1.2');
    });

    it('should NOT fallback if calculated VPD sensor does not exist', async () => {
        // mockHost.hass.states is empty for the calculated sensor

        await (controller as any)._fetchHistory();

        // Should try to fetch temp (configured) but NOT VPD
        expect(mockDataService.getHistory).toHaveBeenCalledWith(
            'sensor.temp', expect.any(Date), expect.any(Date)
        );

        const calls = mockDataService.getHistory.mock.calls;
        const vpdCall = calls.find((call: any[]) => call[0] === 'sensor.test_growspace_calculated_vpd');
        expect(vpdCall).toBeUndefined();
    });

    it('should use configured vpd_sensor if present', async () => {
        mockHost.devices[0].environment_attributes.vpd_sensor = 'sensor.configured_vpd';

        // Even if calculated exists, configured should take precedence
        mockHost.hass.states['sensor.test_growspace_calculated_vpd'] = { state: '1.2' };

        mockDataService.getHistory.mockResolvedValue([]);

        await (controller as any)._fetchHistory();

        expect(mockDataService.getHistory).toHaveBeenCalledWith(
            'sensor.configured_vpd',
            expect.any(Date),
            expect.any(Date)
        );
    });

    it('should correct resolve entity ID in _fetchMetricHistory (on-demand toggle)', async () => {
        // slugify('Test Growspace Calculated VPD') -> 'test_growspace_calculated_vpd'
        mockHost.hass.states['sensor.test_growspace_calculated_vpd'] = { state: '1.5' };
        mockDataService.getHistory.mockResolvedValue([{ state: '1.5' }]);

        // Call private method directly as normally called by toggleEnvGraph
        await (controller as any)._fetchMetricHistory('vpd', '24h');

        expect(mockDataService.getHistory).toHaveBeenCalledWith(
            'sensor.test_growspace_calculated_vpd',
            expect.any(Date),
            expect.any(Date)
        );
        expect(controller.historyCache.vpd).toHaveLength(1);
    });
});
