import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import "../../../../src/components/manager/batch-action-bar";
import { BatchActionBar } from '../../../../src/components/manager/batch-action-bar';


describe('BatchActionBar', () => {
    let element: BatchActionBar;
    let mockStore: any;
    let $selectedPlants: any;

    beforeEach(async () => {
        $selectedPlants = atom(new Set<string>());
        // Mock Store
        mockStore = {
            ui: {
                $selectedPlants,
                setEditMode: vi.fn(),
                $isCompactView: atom(false),
                $isLoading: atom(false)
            },
            openBatchWateringDialog: vi.fn(),
            openBatchTrainingDialog: vi.fn(),
            openIPMDialog: vi.fn(),
            clearPlantSelection: vi.fn(),
            batchAction: vi.fn(),
        };

        element = document.createElement('batch-action-bar') as BatchActionBar;

        Object.defineProperty(element, 'store', {
            value: mockStore,
            writable: true
        });

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });

    it('should be hidden when no plants are selected', async () => {
        expect(element.hasAttribute('visible')).toBe(false);
    });

    it('should be visible when plants are selected', async () => {
        // Update mock store to simulate selection
        $selectedPlants.set(new Set(['plant1']));
        await element.updateComplete;

        expect(element.hasAttribute('visible')).toBe(true);
    });

    it('should call openBatchWateringDialog when water button is clicked', async () => {
        // Setup visibility
        $selectedPlants.set(new Set(['plant1']));
        await element.updateComplete;

        const btn = element.shadowRoot!.querySelector('.action-btn.primary') as HTMLElement;
        btn.click();

        expect(mockStore.openBatchWateringDialog).toHaveBeenCalled();
    });

    it('should call openBatchTrainingDialog when training button is clicked', async () => {
        // Setup visibility
        $selectedPlants.set(new Set(['plant1']));
        await element.updateComplete;

        // Find the training button (second action button)
        const btns = element.shadowRoot!.querySelectorAll('.action-btn');
        const trainingBtn = btns[1] as HTMLElement;
        trainingBtn.click();

        expect(mockStore.openBatchTrainingDialog).toHaveBeenCalled();
    });

    it('should call openIPMDialog when IPM button is clicked', async () => {
        // Setup visibility
        $selectedPlants.set(new Set(['plant1', 'plant2']));
        await element.updateComplete;

        // Find the IPM button (third action button)
        const btns = element.shadowRoot!.querySelectorAll('.action-btn');
        const ipmBtn = btns[2] as HTMLElement;
        ipmBtn.click();

        expect(mockStore.openIPMDialog).toHaveBeenCalledWith({
            plantIds: ['plant1', 'plant2']
        });
    });

    it('should call clearPlantSelection and exit edit mode when close is clicked', async () => {
        // Setup visibility
        $selectedPlants.set(new Set(['plant1']));
        await element.updateComplete;

        const closeBtn = element.shadowRoot!.querySelector('.close-btn') as HTMLElement;
        closeBtn.click();

        expect(mockStore.clearPlantSelection).toHaveBeenCalled();
        expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(false);
    });


    it('should call batchAction with harvest when Harvest button is clicked', async () => {
        $selectedPlants.set(new Set(['p1']));
        await element.updateComplete;

        const btns = element.shadowRoot!.querySelectorAll('.action-btn');
        const harvestBtn = btns[3] as HTMLElement; // 4th button
        harvestBtn.click();

        expect(mockStore.batchAction).toHaveBeenCalledWith('harvest', ['p1']);
    });

    it('should call batchAction with remove when Delete button is clicked and confirmed', async () => {
        $selectedPlants.set(new Set(['p1', 'p2']));
        await element.updateComplete;

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        const deleteBtn = element.shadowRoot!.querySelector('.action-btn.danger') as HTMLElement;
        deleteBtn.click();

        expect(confirmSpy).toHaveBeenCalled();
        expect(mockStore.batchAction).toHaveBeenCalledWith('remove', ['p1', 'p2']);

        confirmSpy.mockRestore();
    });

    it('should NOT call batchAction on Delete if cancelled', async () => {
        $selectedPlants.set(new Set(['p1']));
        await element.updateComplete;

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

        const deleteBtn = element.shadowRoot!.querySelector('.action-btn.danger') as HTMLElement;
        deleteBtn.click();

        expect(confirmSpy).toHaveBeenCalled();
        expect(mockStore.batchAction).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
    });

    it('should return early if handlers called with no selection', async () => {
        $selectedPlants.set(new Set());
        await element.updateComplete;

        // Manually call handlers since buttons are not rendered
        (element as any)._handleDelete();
        (element as any)._handleHarvest();

        expect(mockStore.batchAction).not.toHaveBeenCalled();
        // confirm should not be called either
    });

    it('should handle connectedCallback without store', () => {
        const el = document.createElement('batch-action-bar') as any;
        el.store = undefined;
        el.connectedCallback();
        expect(el._selectedPlantsController).toBeUndefined();
    });
});
