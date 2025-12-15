
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceGrid } from '../../../src/components/growspace-grid';
import { GrowspaceStore } from '../../../src/store/growspace-store';

// Mock dependencies
vi.mock('../../../src/styles/shared.styles', () => ({
    sharedStyles: { cssText: '' }
}));
vi.mock('../../../src/styles/variables', () => ({
    variables: { cssText: '' }
}));

describe('GrowspaceGrid', () => {
    let element: GrowspaceGrid;
    let mockStore: any;

    beforeEach(() => {
        mockStore = {
            handleDrop: vi.fn(),
            handlePlantClick: vi.fn(),
            togglePlantSelection: vi.fn(),
            openAddPlantDialog: vi.fn()
        };

        // Manually define the custom element if not already defined (Vitest environment might reset?)
        // In JSDOM with vitest, imports usually execute once. 
        // We assume 'src/components/growspace-grid.ts' is imported by the test file.
        // But we need to ensure the class is the one we are testing.

        element = document.createElement('growspace-grid') as GrowspaceGrid;

        // Inject store mock manually (bypassing Context for unit test simplicity)
        // We cast to any to access private property
        (element as any).store = mockStore;
    });

    it('should be defined', () => {
        expect(customElements.get('growspace-grid')).toBeDefined();
        expect(element).toBeInstanceOf(GrowspaceGrid);
    });

    it('should initialize properties', () => {
        expect(element.rows).toBe(3);
        expect(element.cols).toBe(3);
        expect(element.plants).toEqual([]);
    });

    describe('Rendering', () => {
        it('should render skeleton when isLoading is true', async () => {
            element.isLoading = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const skeletons = element.shadowRoot?.querySelectorAll('.skeleton-card');
            expect(skeletons?.length).toBe(9); // 3x3 default

            document.body.removeChild(element);
        });

        it('should render empty slots', async () => {
            element.isLoading = false;
            // Populate grid with nulls to simulate empty slots
            element.plants = Array(3).fill(null).map(() => Array(3).fill(null));

            document.body.appendChild(element);
            await element.updateComplete;

            const emptySlots = element.shadowRoot?.querySelectorAll('.plant-card-empty');
            expect(emptySlots?.length).toBe(9);

            document.body.removeChild(element);
        });

        it('should render plant cards', async () => {
            element.plants = [[
                { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } } as any,
                null,
                null
            ]];
            document.body.appendChild(element);
            await element.updateComplete;

            const plantCards = element.shadowRoot?.querySelectorAll('growspace-plant-card');
            expect(plantCards?.length).toBe(1);

            document.body.removeChild(element);
        });
    });

    describe('Interactions', () => {
        it('should open add plant dialog on empty slot click', async () => {
            element.plants = Array(3).fill(null).map(() => Array(3).fill(null));
            document.body.appendChild(element);
            await element.updateComplete;

            const slot = element.shadowRoot?.querySelector('.plant-card-empty') as HTMLElement;
            slot.click();

            // row 1, col 1 -> index 0-based: 0, 0
            expect(mockStore.openAddPlantDialog).toHaveBeenCalledWith(0, 0);

            document.body.removeChild(element);
        });

        it('should handle plant click', async () => {
            const plant: any = { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } };
            element.plants = [[plant]];
            document.body.appendChild(element);
            await element.updateComplete;

            const card = element.shadowRoot?.querySelector('growspace-plant-card');
            card?.dispatchEvent(new CustomEvent('plant-click'));

            expect(mockStore.handlePlantClick).toHaveBeenCalledWith(plant);

            document.body.removeChild(element);
        });

        it('should handle mobile drop', () => {
            const plant = { entity_id: 'p1', state: 'ok' };
            // Setup grid with placeholders so targetPlant lookup works
            element.plants = Array(3).fill(null).map(() => Array(3).fill(null));

            // Mock getBoundingClientRect
            vi.spyOn(element as any, '_gridRef', 'get').mockReturnValue({
                value: {
                    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 })
                }
            });

            // Simulate custom event
            // Grid is 3x3, 100x100 cells
            // x=150 (col 2), y=150 (row 2) -> targetRow 2, targetCol 2
            (element as any)._handleMobileDrop({
                detail: { x: 150, y: 150, plant }
            } as any);

            // _handleDrop calls store.handleDrop
            // targetRow 2, targetCol 2, targetPlant null (empty)
            expect(mockStore.handleDrop).toHaveBeenCalledWith(2, 2, null, plant);
        });
    });
});
