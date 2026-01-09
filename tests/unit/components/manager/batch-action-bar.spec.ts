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
            clearPlantSelection: vi.fn(),
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

    it('should call clearPlantSelection and exit edit mode when close is clicked', async () => {
        // Setup visibility
        $selectedPlants.set(new Set(['plant1']));
        await element.updateComplete;

        const closeBtn = element.shadowRoot!.querySelector('.close-btn') as HTMLElement;
        closeBtn.click();

        expect(mockStore.clearPlantSelection).toHaveBeenCalled();
        expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(false);
    });
});
