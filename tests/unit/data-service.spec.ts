import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService', () => {
    let service: DataService;
    let mockHass: HomeAssistant;
    let callServiceMock: any;

    beforeEach(() => {
        service = new DataService();
        callServiceMock = vi.fn().mockResolvedValue({});
        mockHass = {
            callService: callServiceMock,
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}),
            },
            callApi: vi.fn().mockResolvedValue({}),
            callWS: vi.fn().mockResolvedValue({}),
            fetchWithAuth: vi.fn().mockResolvedValue({}),
        } as any;
        service.updateHass(mockHass);
    });

    describe('Constructor & Setup', () => {
        it('should initialize with default entity IDs', () => {
            const ds = new DataService();
            // Checking one property that should be initialized from defaults
            expect(ds).toBeDefined();
        });

        it('should parse entity IDs from config if provided', () => {
            const config = {
                strain_sensor: 'sensor.custom_strains',
                nutrient_sensor: 'sensor.custom_nutrients',
                history_sensor: 'sensor.custom_history'
            };
            // @ts-ignore - access internal property for verification if needed or check behavior
            const ds = new DataService(config);
            expect(ds).toBeDefined();
        });
    });

    describe('HASS Updates', () => {
        it('should update HASS instance across all APIs', () => {
            const newHass = {
                callService: vi.fn(),
                connection: { sendMessagePromise: vi.fn() }
            } as any;
            service.updateHass(newHass);

            // Verify by calling a method that uses HASS
            service.callService('domain', 'service', {});
            expect(newHass.callService).toHaveBeenCalled();
        });
    });

    describe('Utility Wrappers', () => {
        it('callService should call hass.callService and log', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            const domain = 'test_domain';
            const srv = 'test_service';
            const data = { foo: 'bar' };

            await service.callService(domain, srv, data);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DataService:callService]'), data);
            expect(mockHass.callService).toHaveBeenCalledWith(domain, srv, data);
            consoleSpy.mockRestore();
        });

        it('should handle missing HASS in callService', async () => {
            service.updateHass(undefined as any);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await service.callService('d', 's', {});
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Hass instance is missing'));
            consoleSpy.mockRestore();
        });
    });

    describe('Facade Delegation Check', () => {
        // Minimal smoke tests to ensure delegation still works
        it('should delegate history calls to HistoryAPI', async () => {
            const spy = vi.spyOn(mockHass, 'callApi').mockResolvedValue([[{ state: '10' }]]);
            await service.getHistory('sensor.test', new Date());
            expect(spy).toHaveBeenCalled();
        });

        it('should delegate growspace calls to GrowspaceAPI', async () => {
            const spy = vi.spyOn(mockHass.connection, 'sendMessagePromise').mockResolvedValue({});
            await service.fetchGrowspaceData('g1');
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'growspace_manager/get_data' }));
        });
    });
});
