import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/services/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService - AIAPI', () => {
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

    describe('Grow Master & Advice', () => {
        it('should ask grow advice', async () => {
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ response: 'Do this' });
            await service.askGrowAdvice('g1', 'Help');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ service: 'ask_grow_advice' }));
        });

        it('should analyze all growspaces', async () => {
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ response: 'Analysis' });
            await service.analyzeAllGrowspaces();
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ service: 'analyze_all_growspaces' }));
        });

        it('should get strain recommendation', async () => {
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue({ response: 'Strain X' });
            await service.getStrainRecommendation('Sleepy');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({ service: 'strain_recommendation' }));
        });
    });

    describe('Analysis & Advice Error Handling', () => {
        beforeEach(() => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
        });

        it('should handle error in analyzeAllGrowspaces', async () => {
            await expect(service.analyzeAllGrowspaces())
                .rejects.toThrow('WS Fail');
        });

        it('should handle error in getStrainRecommendation', async () => {
            await expect(service.getStrainRecommendation('q'))
                .rejects.toThrow('WS Fail');
        });
        describe('Service Error Handling', () => {
            it('askGrowAdvice should handle error', async () => {
                (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Fail'));
                await expect(service.askGrowAdvice('g1', 'q')).rejects.toThrow('Fail');
            });

            it('askGrowAdvice should handle non-Error catch', async () => {
                (mockHass.connection.sendMessagePromise as any).mockRejectedValue('String Error');
                await expect(service.askGrowAdvice('g1', 'q')).rejects.toThrow('String Error');
            });
        });
    });
});