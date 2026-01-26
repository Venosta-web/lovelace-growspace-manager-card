import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../src/utils/data-service';

describe('Utility DataService', () => {
    let service: DataService;
    let mockHass: any;

    beforeEach(() => {
        mockHass = {
            callWS: vi.fn().mockResolvedValue({}),
            callService: vi.fn().mockResolvedValue({}),
        };
        service = new DataService(mockHass);
    });

    describe('fetchHistory', () => {
        it('should return empty object if hass is missing', async () => {
            const ds = new DataService(null);
            const result = await ds.fetchHistory(['sensor.test'], new Date());
            expect(result).toEqual({});
        });

        it('should return empty object if no entityIds provided', async () => {
            const result = await service.fetchHistory([], new Date());
            expect(result).toEqual({});
        });

        it('should handle Date startTime', async () => {
            const date = new Date('2023-01-01T00:00:00Z');
            await service.fetchHistory(['sensor.test'], date);
            expect(mockHass.callWS).toHaveBeenCalledWith(expect.objectContaining({
                start_time: date.toISOString()
            }));
        });

        it('should handle string startTime', async () => {
            const dateStr = '2023-01-01T00:00:00Z';
            await service.fetchHistory(['sensor.test'], dateStr);
            expect(mockHass.callWS).toHaveBeenCalledWith(expect.objectContaining({
                start_time: dateStr
            }));
        });

        it('should return result from callWS', async () => {
            const mockData = { 'sensor.test': [{ state: '10' }] };
            mockHass.callWS.mockResolvedValue(mockData);
            const result = await service.fetchHistory(['sensor.test'], '2023-01-01');
            expect(result).toEqual(mockData);
        });

        it('should handle errors and return empty object', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockHass.callWS.mockRejectedValue(new Error('WS Error'));

            const result = await service.fetchHistory(['sensor.test'], '2023-01-01');

            expect(result).toEqual({});
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('callService', () => {
        it('should return early if hass is missing', async () => {
            const ds = new DataService(null);
            const result = await ds.callService('domain', 'service');
            expect(result).toBeUndefined();
            expect(mockHass.callService).not.toHaveBeenCalled();
        });

        it('should call hass.callService', async () => {
            await service.callService('light', 'turn_on', { entity_id: 'light.test' });
            expect(mockHass.callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.test' });
        });
    });

    describe('updateSensorCoordinates', () => {
        it('should return early if hass is missing', async () => {
            const ds = new DataService(null);
            await ds.updateSensorCoordinates('d1', 'e1', 1, 2, 3);
            expect(mockHass.callWS).not.toHaveBeenCalled();
        });

        it('should call callWS with rounded coordinates', async () => {
            await service.updateSensorCoordinates('dev1', 'ent1', 10.6, 20.2, 5.5, 90.1);
            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/update_sensor_coordinates',
                growspace_id: 'dev1',
                entity_id: 'ent1',
                x: 11,
                y: 20,
                z: 6,
                rotation: 90
            });
        });

        it('should handle optional rotation', async () => {
            await service.updateSensorCoordinates('dev1', 'ent1', 10, 20, 5);
            expect(mockHass.callWS).toHaveBeenCalledWith(expect.objectContaining({
                rotation: undefined
            }));
        });

        it('should handle errors and throw', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockHass.callWS.mockRejectedValue(new Error('WS Update Error'));

            await expect(service.updateSensorCoordinates('d1', 'e1', 1, 2, 3))
                .rejects.toThrow('WS Update Error');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
