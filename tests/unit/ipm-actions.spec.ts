import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyIPM } from '../../src/store/ipm-actions';
import { ActionContext } from '../../src/store/action-context';
import * as libraryActions from '../../src/store/library-actions';

// Mock library actions
vi.mock('../../src/store/library-actions', () => ({
    fetchNutrientInventory: vi.fn(),
    fetchIPMPresets: vi.fn()
}));

describe('ipm-actions', () => {
    let ctx: ActionContext;
    let mockDataService: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDataService = {
            applyIPM: vi.fn().mockResolvedValue(undefined)
        };

        ctx = {
            dataService: mockDataService,
            showToast: vi.fn(),
            hass: {} as any,
            store: {} as any,
            ui: {} as any
        } as unknown as ActionContext;
    });

    describe('applyIPM', () => {
        const ipmDetails = {
            preset_id: 'preset123',
            growspace_id: 'gs1',
            plant_ids: ['p1', 'p2'],
            notes: 'Test treatment'
        };

        it('should apply IPM treatment and refresh inventory on success', async () => {
            await applyIPM(ctx, ipmDetails);

            // Check data service call
            expect(mockDataService.applyIPM).toHaveBeenCalledWith(ipmDetails);

            // Check inventory refresh
            expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);

            // Check toast
            expect(ctx.showToast).toHaveBeenCalledWith('IPM treatment applied successfully', 'success');
        });

        it('should handle errors when applying IPM', async () => {
            const error = new Error('API failure');
            mockDataService.applyIPM.mockRejectedValue(error);

            // Should re-throw error
            await expect(applyIPM(ctx, ipmDetails)).rejects.toThrow('API failure');

            // Check error toast
            expect(ctx.showToast).toHaveBeenCalledWith('Failed to apply IPM: API failure', 'error');

            // Inventory refresh should NOT be called on error
            expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
        });
    });
});
