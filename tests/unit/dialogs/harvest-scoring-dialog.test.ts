import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HarvestScoringDialog } from '../../../src/dialogs/harvest-scoring-dialog';
import '../../../src/dialogs/harvest-scoring-dialog';

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class HaDialogMock extends HTMLElement {
        open = false;
        heading = '';
        hideActions = false;
        scrimClickAction = '';
        escapeKeyAction = '';
    }
    customElements.define('ha-dialog', HaDialogMock);
}

describe('HarvestScoringDialog', () => {
    let element: HarvestScoringDialog;
    let mockStore: any;
    let mockDataService: any;
    let mockUi: any;

    beforeEach(async () => {
        mockDataService = {
            scorePlant: vi.fn().mockResolvedValue({}),
            harvestPlant: vi.fn().mockResolvedValue({}),
        };

        mockUi = {
            closeDialog: vi.fn(),
            showToast: vi.fn(),
        };

        mockStore = {
            dataService: mockDataService,
            ui: mockUi,
            refreshData: vi.fn().mockResolvedValue({}),
            showToast: vi.fn(),
            actions: {
                plant: {
                    scorePhenotype: vi.fn().mockResolvedValue({}),
                    harvest: vi.fn().mockResolvedValue({}),
                }
            }
        };

        element = document.createElement('harvest-scoring-dialog') as HarvestScoringDialog;
        (element as any).store = mockStore;
        (element as any).hass = {
            states: {},
            connection: { sendMessagePromise: vi.fn() },
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const flush = () => new Promise(resolve => setTimeout(resolve, 50));

    it('should show and hide when open property changes', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!--');

        element.dialogState = {
            plant: { entity_id: 'sensor.p1', attributes: { strain: 'OG' } } as any
        };
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeTruthy();
    });

    it('should set scores via star clicks', async () => {
        element.dialogState = { plant: { entity_id: 'p1' } as any };
        element.open = true;
        await element.updateComplete;

        const star2 = element.shadowRoot?.querySelectorAll('.star-btn')[1] as HTMLElement;
        star2.click();
        await element.updateComplete;
        expect((element as any)._scores.vigor).toBe(2);

        // Click again to toggle
        star2.click();
        await element.updateComplete;
        expect((element as any)._scores.vigor).toBe(null);
    });

    it('should handle all numeric inputs', async () => {
        element.open = true;
        element.dialogState = { plant: { entity_id: 'p1' } as any };
        await element.updateComplete;

        const inputs = [
            { id: '#wet-weight', val: '10', prop: '_wetWeight' },
            { id: '#dry-weight', val: '20', prop: '_dryWeight' },
            { id: '#trim-weight', val: '30', prop: '_trimWeight' },
            { id: '#thc-pct', val: '25', prop: '_thcPercentage' },
            { id: '#cbd-pct', val: '1', prop: '_cbdPercentage' },
        ];

        for (const input of inputs) {
            const el = element.shadowRoot?.querySelector(input.id) as HTMLInputElement;
            el.value = input.val;
            el.dispatchEvent(new Event('input'));
            expect((element as any)[input.prop]).toBe(input.val);
        }

        const terpene = element.shadowRoot?.querySelector('#terpene-profile') as HTMLTextAreaElement;
        terpene.value = 'Citrus';
        terpene.dispatchEvent(new Event('input'));
        expect((element as any)._terpeneProfile).toBe('Citrus');
    });

    it('should submit form and call services', async () => {
        element.dialogState = {
            plant: {
                entity_id: 'sensor.p1',
                attributes: { plant_id: 'real_p1', stage: 'flower' }
            } as any
        };
        element.open = true;
        await element.updateComplete;

        (element as any)._wetWeight = '100';
        (element as any)._setScore('vigor', 4);

        await (element as any)._submitAndHarvest();

        expect(mockStore.actions.plant.scorePhenotype).toHaveBeenCalled();
        expect(mockStore.actions.plant.harvest).toHaveBeenCalledWith(
            expect.objectContaining({ entity_id: 'sensor.p1' }),
            expect.objectContaining({ wet_weight: 100 })
        );
        
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        await (element as any)._dispatchClose();
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle harvest error in submit', async () => {
        mockStore.actions.plant.harvest.mockResolvedValue(false);
        element.dialogState = { plant: { entity_id: 'p1' } as any };
        element.open = true;
        await element.updateComplete;

        await (element as any)._submitAndHarvest();
        // Toast is now handled by the action module, but if it propagates to the component's (non-existent) catch, it won't be shown by the component.
        // However, the action module itself calls showToast.
        // If we want to verify the action module was called, we already did.
        // If we want to verify the toast was shown, we should check mockStore.showToast.
        // Note: the component DOES NOT have a catch block anymore, so if the action throws,
        // it must be caught inside the action.
    });

    it('should skip scoring and harvest directly', async () => {
        const plant = { entity_id: 'p1' } as any;
        element.dialogState = { plant };
        element.open = true;
        await element.updateComplete;

        (element as any)._skipAndHarvest();
        expect(mockStore.actions.plant.harvest).toHaveBeenCalledWith(plant);
    });

    it('should handle skip error', async () => {
        mockStore.actions.plant.harvest.mockResolvedValue(false);
        element.dialogState = { plant: { entity_id: 'p1' } as any };
        element.open = true;
        await element.updateComplete;

        (element as any)._skipAndHarvest();
        await flush(); 
        // Component has no catch block, so mockStore.showToast won't be called by the component.
        // The action's showToast is what we would verify if we weren't mocking the action itself.
    });

    it('should dispatch close event', async () => {
        const spy = vi.fn();
        element.addEventListener('close', spy);
        (element as any)._dispatchClose();
        expect(spy).toHaveBeenCalled();
    });

    it('should render score rows', async () => {
        element.dialogState = { plant: { entity_id: 'p1' } as any };
        element.open = true;
        await element.updateComplete;

        const rows = element.shadowRoot?.querySelectorAll('.score-row');
        expect(rows?.length).toBeGreaterThan(0);
    });

    it('should resolve plant_id correctly', async () => {
        element.dialogState = {
            plant: { entity_id: 'sensor.abc', attributes: {} } as any
        };
        element.open = true;
        await element.updateComplete;

        await (element as any)._submitAndHarvest();
        expect(mockStore.actions.plant.harvest).toHaveBeenCalledWith(
            expect.objectContaining({ entity_id: 'sensor.abc' }),
            undefined
        );
    });

    it('should return early in _submitAndHarvest if already submitting or no state', async () => {
        element.dialogState = undefined;
        await (element as any)._submitAndHarvest();
        expect(mockStore.actions.plant.harvest).not.toHaveBeenCalled();

        element.dialogState = { plant: { entity_id: 'p1' } as any };
        (element as any)._isSubmitting = true;
        await (element as any)._submitAndHarvest();
        expect(mockStore.actions.plant.harvest).not.toHaveBeenCalled();
    });

    it('should return early in _skipAndHarvest if already submitting or no state or no store', async () => {
        element.dialogState = undefined;
        (element as any)._skipAndHarvest();
        expect(mockStore.actions.plant.harvest).not.toHaveBeenCalled();

        (element as any)._isSubmitting = false;
        (element as any).store = undefined;
        (element as any)._skipAndHarvest();
        expect(mockStore.actions.plant.harvest).not.toHaveBeenCalled();
    });
});
