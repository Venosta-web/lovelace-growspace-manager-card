import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService - HistoryAPI', () => {
    let service: DataService;
    let mockHass: HomeAssistant;
    let callServiceMock: any;

    beforeEach(() => {
        service = new DataService();
        callServiceMock = vi.fn().mockResolvedValue({});
        mockHass = {
            callService: callServiceMock,
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}), // For websocket calls
            },
            callApi: vi.fn().mockResolvedValue({}), // For API calls like getHistory
            callWS: vi.fn().mockResolvedValue({}), // For WS calls like getHistoryStats
            fetchWithAuth: vi.fn().mockResolvedValue({}), // For importStrainLibrary
        } as any;
        service.updateHass(mockHass);
    });

    describe('History & Data Fetching', () => {
        it('should getHistory via API', async () => {
            const mockHist = [[{ state: '20' }]];
            (mockHass.callApi as any).mockResolvedValue(mockHist);
            const start = new Date('2023-01-01');

            const probResult = await service.getHistory('sensor.temp', start);

            expect(mockHass.callApi).toHaveBeenCalledWith('GET', expect.stringContaining('history/period'));
            expect(probResult).toEqual(mockHist[0]);
        });

        it('should handle API errors in getHistory', async () => {
            (mockHass.callApi as any).mockRejectedValue(new Error('API Error'));
            const result = await service.getHistory('s', new Date());
            expect(result).toEqual([]);
        });
    });

    describe('Batch History', () => {
        it('should batch fetch and map results', async () => {
            const historyData = [
                [{ entity_id: 's1', state: '10' }],
                [{ entity_id: 's2', state: '20' }]
            ];
            (mockHass.callApi as any).mockResolvedValue(historyData);

            const res = await service.getBatchHistory(['s1', 's2'], new Date());

            expect(res['s1']).toBeDefined();
            expect(res['s2']).toBeDefined();
        });

        it('should handle empty ids', async () => {
            const res = await service.getBatchHistory([], new Date());
            expect(res).toEqual({});
        });

        it('should handle api errors gracefully', async () => {
            (mockHass.callApi as any).mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const res = await service.getBatchHistory(['s1'], new Date());
            expect(res).toEqual({});
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('History Stats (WS)', () => {
        it('should fetch history stats via WS success', async () => {
            (mockHass.callWS as any).mockResolvedValue({
                'sensor.temp': [{ s: '20', lu: 1000 }]
            });

            const result = await service.getHistoryStats(['sensor.temp'], new Date(), new Date());
            expect(mockHass.callWS).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_history_stats',
                entity_ids: ['sensor.temp']
            }));
            expect(result['sensor.temp']).toBeDefined();
            expect(result['sensor.temp'][0].state).toBe('20');
        });

        it('should handle history stats validation error', async () => {
            (mockHass.callWS as any).mockResolvedValue({
                'sensor.temp': [{ bad_shape: true }]
            });
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            // Fix: Spy on internal _historyAPI
            const historyAPI = (service as any)._historyAPI;
            const fallbackSpy = vi.spyOn(historyAPI, 'getBatchHistory').mockResolvedValue({
                'sensor.temp': [{ state: 'fallback', last_changed: 'time', last_updated: 'time', entity_id: 'sensor.temp', attributes: {} }]
            });

            const result = await service.getHistoryStats(['sensor.temp'], new Date(), new Date());

            // Check warning logged
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('History Stats Validation Failed'), expect.anything());

            // Check fallback called
            expect(fallbackSpy).toHaveBeenCalled();

            // Check result comes from fallback
            expect(result['sensor.temp'][0].state).toBe('fallback');
        });

        it('should fallback to REST batch on WS failure', async () => {
            (mockHass.callWS as any).mockRejectedValue(new Error('WS Fail'));

            // Fix: Spy on internal _historyAPI
            const historyAPI = (service as any)._historyAPI;
            const batchSpy = vi.spyOn(historyAPI, 'getBatchHistory').mockResolvedValue({ 's1': [] });

            await service.getHistoryStats(['s1'], new Date());
            expect(batchSpy).toHaveBeenCalled();
        });
    });

    describe('Ultimate Coverage & Edge Cases', () => {
        it('getHistory should handle endTime', async () => {
            (mockHass.callApi as any).mockResolvedValue([[]]);
            const start = new Date('2023-01-01');
            const end = new Date('2023-01-02');
            await service.getHistory('s1', start, end);
            expect(mockHass.callApi).toHaveBeenCalledWith('GET', expect.stringContaining('end_time=2023-01-02'));
        });

        it('getBatchHistory should handle endTime', async () => {
            (mockHass.callApi as any).mockResolvedValue([]);
            const start = new Date('2023-01-01');
            const end = new Date('2023-01-02');
            await service.getBatchHistory(['s1'], start, end);
            expect(mockHass.callApi).toHaveBeenCalledWith('GET', expect.stringContaining('end_time=2023-01-02'));
        });

        it('getHistoryStats should handle empty ids or missing hass', async () => {
            expect(await service.getHistoryStats([], new Date())).toEqual({});
            service.updateHass(undefined as any);
            expect(await service.getHistoryStats(['s1'], new Date())).toEqual({});
        });

        it('getHistory should return empty array if hass is missing', async () => {
            service.updateHass(undefined as any);
            expect(await service.getHistory('sensor.test', new Date())).toEqual([]);
        });

        it('getBatchHistory should return empty object if hass is missing or entities empty', async () => {
            expect(await service.getBatchHistory([], new Date())).toEqual({});
            service.updateHass(undefined as any);
            expect(await service.getBatchHistory(['s1'], new Date())).toEqual({});
        });

        it('getHistoryStats fallback should log fallback params', async () => {
            (mockHass.callWS as any).mockRejectedValue(new Error('WS Fail'));
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            // Fix: Spy on internal _historyAPI
            const historyAPI = (service as any)._historyAPI;
            vi.spyOn(historyAPI, 'getBatchHistory').mockResolvedValue({});

            await service.getHistoryStats(['s1'], new Date());
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Fallback params:'));
        });

        it('getHistory should handle null or empty response from API', async () => {
            (mockHass.callApi as any).mockResolvedValue(null);
            expect(await service.getHistory('s1', new Date())).toEqual([]);

            (mockHass.callApi as any).mockResolvedValue([]);
            expect(await service.getHistory('s1', new Date())).toEqual([]);
        });

        it('getBatchHistory should handle null response from API', async () => {
            (mockHass.callApi as any).mockResolvedValue(null);
            expect(await service.getBatchHistory(['s1'], new Date())).toEqual({});
        });

        it('getBatchHistory should handle null/empty entity history in loop', async () => {
            const historyData = [
                null, // Should be ignored
                [{ entity_id: 's2', state: '20' }]
            ];
            (mockHass.callApi as any).mockResolvedValue(historyData);
            const res = await service.getBatchHistory(['s1', 's2'], new Date());
            expect(res['s1']).toBeUndefined();
            expect(res['s2']).toBeDefined();
        });
    });
});
