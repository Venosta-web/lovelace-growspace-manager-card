import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataService } from '../../../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceAdapter } from '../../../../src/adapters/growspace-adapter';

describe('GrowspaceAPI Extra Coverage', () => {
    let service: DataService;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        service = new DataService();
        mockHass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn(),
            },
            callService: vi.fn().mockResolvedValue({}),
        } as any;
        service.updateHass(mockHass);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Cache Management', () => {
        it('should invalidate specific growspace and all from cache', () => {
            const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
            service.invalidateCache('gs1');
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache invalidated:'), 'gs1');

            service.invalidateCache();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache invalidated:'), 'all');
        });
    });

    describe('fetchGrowspaceData gaps', () => {
        it('should return cached data if valid', async () => {
            const mockData = { gs1: { growspace_id: 'gs1', name: 'G1', type: 'normal', rows: 1, plants_per_row: 1, grid: {} } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            // First fetch (populate cache)
            await service.fetchGrowspaceData();

            // Second fetch (should use cache)
            const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
            const result = await service.fetchGrowspaceData();
            expect(result).toMatchObject(mockData);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Returning cached data for __all__'));
        });

        it('should handle single growspace success path', async () => {
            const mockData = { growspace_id: 'gs1', name: 'G1', type: 'normal', rows: 1, plants_per_row: 1, grid: {} };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            const result = await service.fetchGrowspaceData('gs1');
            expect(result).toMatchObject(mockData);
        });

        it('should handle collection success path', async () => {
            const mockData = {
                gs1: { growspace_id: 'gs1', name: 'G1', type: 'normal', rows: 1, plants_per_row: 1, grid: {} }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            const result = await service.fetchGrowspaceData();
            expect(result).toMatchObject(mockData);
        });

        it('should handle sendMessagePromise failure', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = await service.fetchGrowspaceData('gs1');
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error:'), expect.any(Error));
        });
    });

    describe('configureEnvironment gaps', () => {
        const config = {
            growspace_id: 'gs1',
            temperature_sensor: 'sensor.t',
            humidity_sensor: 'sensor.h'
        };

        it('should call service on success', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            await service.configureEnvironment(config);
            expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'configure_environment', config);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Service Called'));
        });

        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Config Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await expect(service.configureEnvironment(config)).rejects.toThrow('Config Fail');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('setDehumidifierControl gaps', () => {
        it('should call service on success', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            await service.setDehumidifierControl('gs1', true);
            expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'set_dehumidifier_control', {
                growspace_id: 'gs1',
                enabled: true
            });
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Service Called'));
        });

        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Control Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await expect(service.setDehumidifierControl('gs1', false)).rejects.toThrow('Control Fail');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('getGrowspaceDevices gaps', () => {
        it('should filter out null devices from adapter', () => {
            const mockWsData = { growspace_id: 'gs1' };
            const wsMap = { gs1: mockWsData as any };

            // Mock adapter to return null
            vi.spyOn(GrowspaceAdapter, 'transformGrowspace').mockReturnValue(null as any);

            const res = service.getGrowspaceDevices(wsMap);
            expect(res).toEqual([]);
        });
    });
});
