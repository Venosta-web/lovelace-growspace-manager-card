
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analyzeGrowspace, getStrainRecommendation } from '../../src/store/system/ai-actions';
import { ActionContext } from '../../src/store/core/action-context';

describe('ai-actions', () => {
    let ctx: ActionContext;
    let mockDataService: any;
    let mockUIStore: any;
    let mockDataStore: any;

    beforeEach(() => {
        mockDataService = {
            analyzeAllGrowspaces: vi.fn().mockResolvedValue({ response: 'AI analysis result' }),
            askGrowAdvice: vi.fn().mockResolvedValue({ response: 'Advice for your plants' }),
            getStrainRecommendation: vi.fn().mockResolvedValue({ response: 'Try Blue Dream' }),
        };

        mockUIStore = {
            $activeDialog: {
                get: vi.fn().mockReturnValue({ type: 'GROW_MASTER', payload: {} }),
            },
            setActiveDialog: vi.fn(),
        };

        mockDataStore = {};

        ctx = {
            dataService: mockDataService,
            showToast: vi.fn(),
            closeDialog: vi.fn(),
            refreshData: vi.fn().mockResolvedValue(undefined),
            data: mockDataStore,
            ui: mockUIStore,
            grid: {
                $selectedDevice: {
                    get: vi.fn().mockReturnValue('gs123'),
                },
            },
        } as any;
    });

    describe('analyzeGrowspace', () => {
        it('should analyze all growspaces and update dialog', async () => {
            await analyzeGrowspace(ctx, 'query', true);

            // Should set loading
            expect(mockUIStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ isLoading: true })
            }));

            expect(mockDataService.analyzeAllGrowspaces).toHaveBeenCalled();

            // Should set response
            expect(mockUIStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ isLoading: false, response: 'AI analysis result' })
            }));
        });

        it('should analyze specific growspace using selected device', async () => {
            // Default selected device is 'gs123' from setup

            await analyzeGrowspace(ctx, 'How are my plants?', false);

            expect(mockDataService.askGrowAdvice).toHaveBeenCalledWith('gs123', 'How are my plants?');
            expect(mockUIStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ isLoading: false, response: 'Advice for your plants' })
            }));
        });

        it('should handle error when no device selected for specific query', async () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue(null);

            await analyzeGrowspace(ctx, 'query', false);

            expect(mockUIStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({ isLoading: false, response: 'Error: No device selected' })
            }));
        });

        it('should handle non-string response and stringify it', async () => {
            mockDataService.analyzeAllGrowspaces.mockResolvedValue({ response: { complex: 'object' } });

            await analyzeGrowspace(ctx, 'query', true);

            expect(mockUIStore.setActiveDialog).toHaveBeenCalledWith(expect.objectContaining({
                payload: expect.objectContaining({
                    isLoading: false,
                    response: '{"complex":"object"}'
                })
            }));
        });
    });

    describe('getStrainRecommendation', () => {
        it('should return recommendation string', async () => {
            const result = await getStrainRecommendation(ctx, 'I want something relaxing');

            expect(mockDataService.getStrainRecommendation).toHaveBeenCalledWith('I want something relaxing');
            expect(result).toBe('Try Blue Dream');
        });

        it('should propagate error', async () => {
            mockDataService.getStrainRecommendation.mockRejectedValue(new Error('API error'));

            await expect(getStrainRecommendation(ctx, 'query')).rejects.toThrow('API error');
        });

        it('should handle direct string response', async () => {
            mockDataService.getStrainRecommendation.mockResolvedValue('Direct string recommendation');

            const result = await getStrainRecommendation(ctx, 'query');

            expect(result).toBe('Direct string recommendation');
        });

        it('should JSON.stringify non-string response data', async () => {
            mockDataService.getStrainRecommendation.mockResolvedValue({ data: { strains: ['OG Kush'] } });

            const result = await getStrainRecommendation(ctx, 'query');

            expect(result).toContain('strains');
        });
    });
});
