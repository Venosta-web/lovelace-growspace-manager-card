
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceGrid } from '../../../src/components/growspace-grid';
import * as uiStore from '../../../src/store/ui-store';

// Mock ui-store
vi.mock('../../../src/store/ui-store', () => ({
    $activeDialog: { get: vi.fn(() => ({ type: 'NONE' })), set: vi.fn(), subscribe: vi.fn() },
    $focusedPlantIndex: { get: vi.fn(() => -1), set: vi.fn(), subscribe: vi.fn() },
    $selectedPlants: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn() },
    $isEditMode: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $viewMode: { get: vi.fn(() => 'standard'), set: vi.fn(), subscribe: vi.fn() },
    $isCompactView: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $isLoading: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $defaultApplied: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    setEditMode: vi.fn(),
    setViewMode: vi.fn(),
    setIsLoading: vi.fn(),
    closeDialog: vi.fn(),
    setDefaultApplied: vi.fn(),
    setFocusedPlantIndex: vi.fn(),
    togglePlantSelection: vi.fn(),
    selectAllPlants: vi.fn(),
    clearPlantSelection: vi.fn(),
    setMenuOpen: vi.fn(),
    showToast: vi.fn(),
    $notification: { set: vi.fn() }
}));

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

    beforeEach(async () => {
        mockStore = {
            handleDrop: vi.fn(),
            handlePlantClick: vi.fn(),
            togglePlantSelection: vi.fn(),
            openAddPlantDialog: vi.fn()
        };

        element = await fixture(html`<growspace-grid></growspace-grid>`);

        // Inject store mock manually (bypassing Context for unit test simplicity)
        (element as any).store = mockStore;
    });

    afterEach(() => {
        vi.clearAllMocks();
        // fixture handles cleanup
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
            (uiStore.$isLoading.get as any).mockReturnValue(true);

            // Re-render or trigger update
            element.requestUpdate();
            await element.updateComplete;

            const skeletons = element.shadowRoot?.querySelectorAll('.skeleton-card');
            expect(skeletons?.length).toBe(9); // 3x3 default
        });

        it('should render empty slots', async () => {
            (uiStore.$isLoading.get as any).mockReturnValue(false);

            element = await fixture(html`<growspace-grid .plants=${Array(3).fill(null).map(() => Array(3).fill(null))}></growspace-grid>`);

            const emptySlots = element.shadowRoot?.querySelectorAll('.plant-card-empty');
            expect(emptySlots?.length).toBe(9);
        });

        it('should render plant cards', async () => {
            const plants = [[
                { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } } as any,
                null,
                null
            ]];

            element = await fixture(html`<growspace-grid .plants=${plants}></growspace-grid>`);

            const plantCards = element.shadowRoot?.querySelectorAll('growspace-plant-card');
            expect(plantCards?.length).toBe(1);
        });
    });

    describe('Interactions', () => {
        it('should open add plant dialog on empty slot click', async () => {
            element = await fixture(html`
                <growspace-grid .plants=${Array(3).fill(null).map(() => Array(3).fill(null))}></growspace-grid>
            `);
            (element as any).store = mockStore;

            const slot = element.shadowRoot?.querySelector('.plant-card-empty') as HTMLElement;
            slot.click();

            // row 1, col 1 -> index 0-based: 0, 0
            expect(mockStore.openAddPlantDialog).toHaveBeenCalledWith(0, 0);
        });

        it('should handle plant click', async () => {
            const plant: any = { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } };
            element = await fixture(html`<growspace-grid .plants=${[[plant]]}></growspace-grid>`);
            (element as any).store = mockStore;

            const card = element.shadowRoot?.querySelector('growspace-plant-card');
            card?.dispatchEvent(new CustomEvent('plant-click'));

            expect(mockStore.handlePlantClick).toHaveBeenCalledWith(plant);
        });

        it('should handle mobile drop', () => {
            const plant = { entity_id: 'p1', state: 'ok' };
            element.plants = Array(3).fill(null).map(() => Array(3).fill(null));

            // Mock elementFromPoint return value
            const mockTarget = {
                tagName: 'DIV',
                classList: { contains: (cls: string) => cls === 'plant-card-empty' },
                getAttribute: (attr: string) => (attr === 'data-row' ? '2' : attr === 'data-col' ? '2' : null),
                parentElement: null
            };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(mockTarget)
            };

            // Mock shadowRoot property on the element
            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            // Simulate custom event
            (element as any)._handleMobileDrop({
                detail: { x: 150, y: 150, plant }
            } as any);

            expect(mockShadowRoot.elementFromPoint).toHaveBeenCalledWith(150, 150);
            expect(mockStore.handleDrop).toHaveBeenCalledWith(2, 2, null, plant);
        });

        it('should handle mobile drop on populated card', () => {
            // New test case for populated card
            const plant = { entity_id: 'p1', state: 'ok' };
            const targetPlant = { entity_id: 'p2' };

            const mockCard = {
                tagName: 'GROWSPACE-PLANT-CARD',
                row: 1,
                col: 1,
                plant: targetPlant,
                parentElement: null,
                classList: { contains: () => false }
            };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(mockCard)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            (element as any)._handleMobileDrop({
                detail: { x: 100, y: 100, plant }
            } as any);

            expect(mockStore.handleDrop).toHaveBeenCalledWith(1, 1, targetPlant, plant);
        });

        it('should ignore mobile drop when no target found', () => {
            // Mock elementFromPoint to return null
            if (element.shadowRoot) {
                element.shadowRoot.elementFromPoint = vi.fn().mockReturnValue(null);
            }

            // Random coords
            (element as any)._handleMobileDrop({ detail: { x: 50, y: 50, plant: {} } } as any);
            expect(mockStore.handleDrop).not.toHaveBeenCalled();
        });

        it('should handle drag start', () => {
            const plant: any = { entity_id: 'p1' };
            (element as any)._handleDragStart(plant);
            expect((element as any)._draggedPlant).toBe(plant);
        });

        it('should handle drag over', () => {
            const event = { preventDefault: vi.fn(), dataTransfer: { dropEffect: '' } };
            (element as any)._handleDragOver(event as any);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
        });

        it('should handle standard drop (Desktop)', () => {
            const draggedPlant = { entity_id: 'p1' };
            const targetPlant = { entity_id: 'p2' };

            // Setup internal state like a drag start happened
            (element as any)._draggedPlant = draggedPlant;

            // Drop on Row 1, Col 1
            const event = { preventDefault: vi.fn() };
            (element as any)._handleDrop(event as any, 1, 1, targetPlant);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockStore.handleDrop).toHaveBeenCalledWith(1, 1, targetPlant, draggedPlant);
            expect((element as any)._draggedPlant).toBeNull();
        });

        it('should ignore drop if no plant dragged', () => {
            (element as any)._draggedPlant = null;
            (element as any)._handleDrop({ preventDefault: vi.fn() } as any, 1, 1, null);
            expect(mockStore.handleDrop).not.toHaveBeenCalled();
        });

        it('should toggle plant selection', () => {
            const plant: any = { attributes: { plant_id: '123' } };
            (element as any)._togglePlantSelection(plant);
            expect(mockStore.togglePlantSelection).toHaveBeenCalledWith('123');
        });

        it('should render compact class', async () => {
            (uiStore.$isCompactView.get as any).mockReturnValue(true);
            element = await fixture(html`<growspace-grid></growspace-grid>`);

            const grid = element.shadowRoot?.querySelector('.grid');
            expect(grid?.classList.contains('compact')).toBe(true);
        });

        it('should render list view class when cols > 5', async () => {
            element = await fixture(html`<growspace-grid .cols=${6}></growspace-grid>`);
            const grid = element.shadowRoot?.querySelector('.grid');
            expect(grid?.classList.contains('force-list-view')).toBe(true);
        });
    });
});
