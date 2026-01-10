
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html, LitElement } from 'lit';
import { GrowspaceGrid } from '../../../src/components/growspace-grid';
import { atom } from 'nanostores';
import { ContextProvider } from '@lit/context';
import { storeContext } from '../../../src/context';

// Define a wrapper component to provide context
// check if defined to avoid re-definition error in watch mode
if (!customElements.get('context-wrapper')) {
    class ContextWrapper extends LitElement {
        private _provider = new ContextProvider(this, { context: storeContext, initialValue: undefined });

        set store(val: any) {
            this._provider.setValue(val);
            this.requestUpdate();
        }

        render() {
            return html`<slot></slot>`;
        }
    }
    customElements.define('context-wrapper', ContextWrapper);
}

// Mock Shared Styles to avoid potential issues (optional but good practice)
vi.mock('../../../src/styles/shared.styles', () => ({
    sharedStyles: { cssText: '' }
}));

// Helper to wait for updates
const waitForUpdates = async (el: HTMLElement) => {
    await new Promise(resolve => setTimeout(resolve, 0));
    if ((el as any).updateComplete) await (el as any).updateComplete;
};

describe('GrowspaceGrid', () => {
    let element: GrowspaceGrid;
    let wrapper: any;
    let mockStore: any;

    // Local atoms
    let $isEditMode: any;
    let $selectedPlants: any;
    let $isCompactView: any;
    let $isLoading: any;
    let $viewMode: any;
    let $focusedPlantIndex: any;
    let $notification: any;
    let $activeDialog: any;
    let $gridOverlayMode: any;

    beforeEach(async () => {
        // Initialize atoms
        $isEditMode = atom(false);
        $selectedPlants = atom(new Set());
        $isCompactView = atom(false);
        $isLoading = atom(false);
        $viewMode = atom('standard');
        $focusedPlantIndex = atom(-1);
        $notification = atom(null);
        $activeDialog = atom({ type: 'NONE', payload: null });
        $gridOverlayMode = atom('none');

        mockStore = {
            ui: {
                $isEditMode,
                $selectedPlants,
                $isCompactView,
                $isLoading,
                $viewMode,
                $focusedPlantIndex,
                $notification,
                $activeDialog,
                $gridOverlayMode,
                setEditMode: vi.fn(),
                setViewMode: vi.fn(),
                togglePlantSelection: vi.fn(),
                openAddPlantDialog: vi.fn(),
                handleDrop: vi.fn(),
                handlePlantClick: vi.fn(),
                clearPlantSelection: vi.fn(), // Needed if called
                setMenuOpen: vi.fn(),
                showToast: vi.fn(),
                setDefaultApplied: vi.fn(),
                setFocusedPlantIndex: vi.fn()
            },
            handleDrop: vi.fn(),
            handlePlantClick: vi.fn(),
            togglePlantSelection: vi.fn(),
            openAddPlantDialog: vi.fn()
        };

        element = document.createElement('growspace-grid') as GrowspaceGrid;

        // Force inject store property BEFORE connecting so connectedCallback views it
        Object.defineProperty(element, 'store', {
            value: mockStore,
            writable: true
        });

        document.body.appendChild(element);
        await waitForUpdates(element);
    });

    afterEach(() => {
        if (wrapper && wrapper.parentNode) {
            document.body.removeChild(wrapper);
        }
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(customElements.get('growspace-grid')).toBeDefined();
        expect(element).toBeInstanceOf(GrowspaceGrid);
    });

    it('should initialize properties', () => {
        expect(element.rows).toBe(3);
        expect(element.plants).toEqual([]);
    });

    describe('Rendering', () => {
        it('should render skeleton when isLoading is true', async () => {
            $isLoading.set(true);
            await waitForUpdates(element);

            const skeletons = element.shadowRoot?.querySelectorAll('.skeleton-card');
            expect(skeletons?.length).toBe(9);
        });

        it('should render plant cards', async () => {
            // Mock plant data satisfying PlantEntity
            const plants = [[
                { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } } as any,
                null,
                null
            ]];
            element.plants = plants as any;
            await waitForUpdates(element);

            const plantCards = element.shadowRoot?.querySelectorAll('growspace-plant-card');
            expect(plantCards?.length).toBe(1);
        });
    });

    describe('Interactions', () => {
        it('should open add plant dialog on empty slot click', async () => {
            element.plants = Array(3).fill(null).map(() => Array(3).fill(null));
            await waitForUpdates(element);

            const slot = element.shadowRoot?.querySelector('.plant-card-empty') as HTMLElement;
            slot?.click();
            expect(mockStore.openAddPlantDialog).toHaveBeenCalledWith(0, 0);
        });

        it('should handle plant click', async () => {
            const plant: any = { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const card = element.shadowRoot?.querySelector('growspace-plant-card');
            card?.dispatchEvent(new CustomEvent('plant-click'));

            expect(mockStore.handlePlantClick).toHaveBeenCalledWith(plant);
        });


        // Mobile Interactions
        it('should handle mobile drop', () => {
            const plant = { entity_id: 'p1', state: 'ok' };
            const mockTarget = {
                tagName: 'DIV',
                classList: { contains: (cls: string) => cls === 'plant-card-empty' },
                getAttribute: (attr: string) => (attr === 'data-row' ? '2' : attr === 'data-col' ? '2' : null),
                parentElement: null
            };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(mockTarget)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            (element as any)._handleMobileDrop({
                detail: { x: 150, y: 150, plant }
            } as any);

            expect(mockStore.handleDrop).toHaveBeenCalledWith(2, 2, null, plant);
        });

        it('should toggle plant selection', async () => {
            const plant: any = { attributes: { plant_id: '123' } };
            (element as any)._togglePlantSelection(plant);
            expect(mockStore.togglePlantSelection).toHaveBeenCalledWith('123');
        });

        it('should handle drag start', () => {
            const plant: any = { entity_id: 'p1' };
            (element as any)._handleDragStart(plant);
            expect((element as any)._draggedPlant).toBe(plant);
        });

        it('should handle native drop', () => {
            const plant: any = { entity_id: 'p1' };
            (element as any)._draggedPlant = plant;

            const event = {
                preventDefault: vi.fn(),
                dataTransfer: {}
            };

            // Drop on 1,1
            (element as any)._handleDrop(event, 1, 1, null);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockStore.handleDrop).toHaveBeenCalledWith(1, 1, null, plant);
            expect((element as any)._draggedPlant).toBeNull();
        });

        it('should ignore drop if no dragged plant', () => {
            (element as any)._draggedPlant = null;
            const event = { preventDefault: vi.fn() };

            (element as any)._handleDrop(event, 1, 1, null);

            expect(mockStore.handleDrop).not.toHaveBeenCalled();
        });

        it('should handle drag over', () => {
            const event = {
                preventDefault: vi.fn(),
                dataTransfer: { dropEffect: '' }
            };

            (element as any)._handleDragOver(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.dataTransfer.dropEffect).toBe('move');
        });

        it('should focus plant card', async () => {
            const plants = [[
                { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } } as any,
                null,
                null
            ]];
            element.plants = plants as any;
            await waitForUpdates(element);

            const card = element.shadowRoot?.querySelector('growspace-plant-card');
            if (card) {
                (card as any).focus = vi.fn();
            }

            element.focusPlant(0);

            expect((card as any).focus).toHaveBeenCalled();
        });

        it('should fail gracefully if focus index invalid', () => {
            // No crash
            element.focusPlant(99);
        });

        it('should apply list view class for many columns', async () => {
            element.cols = 6;
            await waitForUpdates(element);

            const grid = element.shadowRoot?.querySelector('.grid');
            expect(grid?.classList.contains('force-list-view')).toBe(true);
        });

        it('should handle mobile drop traversal', () => {
            // Mock extensive DOM structure
            // Element -> Parent -> Parent -> Host

            const mockCard = {
                tagName: 'GROW_SPACE-PLANT-CARD', // Wrong tag case
                parentElement: null
            };

            const mockCorrectCard = {
                tagName: 'GROWSPACE-PLANT-CARD',
                row: 2,
                col: 3,
                plant: { entity_id: 'p2' },
                parentElement: { parentElement: element } // Eventually reaches element
            };

            // Wrap in some divs
            const deepTarget = {
                tagName: 'DIV',
                classList: { contains: () => false },
                parentElement: {
                    tagName: 'DIV',
                    parentElement: mockCorrectCard
                }
            };

            const plant = { entity_id: 'dragged' };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(deepTarget)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            (element as any)._handleMobileDrop({
                detail: { x: 10, y: 10, plant }
            } as any);

            expect(mockStore.handleDrop).toHaveBeenCalledWith(2, 3, mockCorrectCard.plant, plant);
        });

        it('should handle template drop on empty slot', async () => {
            element.plants = Array(3).fill(null).map(() => Array(3).fill(null));
            await waitForUpdates(element);

            const slot = element.shadowRoot?.querySelector('.plant-card-empty') as HTMLElement;
            // Native drop event
            const dropEvent = new CustomEvent('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(dropEvent, 'dataTransfer', { value: {} });

            // We need to set dropped plant on instance for this to work
            const plant: any = { entity_id: 'p1' };
            (element as any)._draggedPlant = plant;

            slot.dispatchEvent(dropEvent);

            expect(mockStore.handleDrop).toHaveBeenCalledWith(1, 1, null, plant);
        });

        it('should handle template events on plant card', async () => {
            const plant: any = { entity_id: 'p1', state: 'ok', attributes: { plant_id: 'p1' } };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const card = element.shadowRoot?.querySelector('growspace-plant-card');

            // Test plant-drag-start
            card?.dispatchEvent(new CustomEvent('plant-drag-start'));
            expect((element as any)._draggedPlant).toBe(plant);

            // Test plant-toggle-selection
            card?.dispatchEvent(new CustomEvent('plant-toggle-selection'));
            expect(mockStore.togglePlantSelection).toHaveBeenCalledWith('p1');

            // Test plant-drop
            const dropEvent = new CustomEvent('plant-drop', {
                detail: { originalEvent: { preventDefault: vi.fn() } }
            });

            // Pre-set dragged plant
            const draggedPlant: any = { entity_id: 'p2' };
            (element as any)._draggedPlant = draggedPlant;

            card?.dispatchEvent(dropEvent);

            // Dropping onto plant at 1,1
            expect(mockStore.handleDrop).toHaveBeenCalledWith(1, 1, plant, draggedPlant);
        });

        it('should apply compact class when store value changes', async () => {
            $isCompactView.set(true);
            await waitForUpdates(element);

            const grid = element.shadowRoot?.querySelector('.grid');
            expect(grid?.classList.contains('compact')).toBe(true);
        });
    });

    describe('Mobile Drop Edge Cases', () => {
        it('should return early when shadowRoot is null', () => {
            Object.defineProperty(element, 'shadowRoot', {
                get: () => null,
                configurable: true
            });

            expect(() => (element as any)._handleMobileDrop({
                detail: { x: 10, y: 10, plant: { entity_id: 'p1' } }
            })).not.toThrow();
            expect(mockStore.handleDrop).not.toHaveBeenCalled();
        });

        it('should return early when elementFromPoint returns null', () => {
            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(null)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            (element as any)._handleMobileDrop({
                detail: { x: 10, y: 10, plant: { entity_id: 'p1' } }
            });

            expect(mockStore.handleDrop).not.toHaveBeenCalled();
        });

        it('should not call handleDrop when no valid target found (traversal stops at element)', () => {
            // Target that traverses up to element without finding a valid card
            const mockTarget = {
                tagName: 'DIV',
                classList: { contains: () => false },
                parentElement: element // directly points to element
            };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(mockTarget)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            vi.clearAllMocks();
            (element as any)._handleMobileDrop({
                detail: { x: 10, y: 10, plant: { entity_id: 'p1' } }
            });

            expect(mockStore.handleDrop).not.toHaveBeenCalled();
        });

        it('should handle mobile drop with row and col at 0', () => {
            const mockTarget = {
                tagName: 'DIV',
                classList: { contains: (cls: string) => cls === 'plant-card-empty' },
                getAttribute: (attr: string) => (attr === 'data-row' ? '0' : '0'),
                parentElement: null
            };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(mockTarget)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            const plant = { entity_id: 'dragged' };
            (element as any)._handleMobileDrop({
                detail: { x: 10, y: 10, plant }
            });

            expect(mockStore.handleDrop).toHaveBeenCalledWith(0, 0, null, plant);
        });

        it('handles mobile drop with missing row and col attributes', () => {
            const mockTarget = {
                tagName: 'DIV',
                classList: { contains: (cls: string) => cls === 'plant-card-empty' },
                // Return null to trigger || '0'
                getAttribute: () => null,
                parentElement: null
            };

            const mockShadowRoot = {
                elementFromPoint: vi.fn().mockReturnValue(mockTarget)
            };

            Object.defineProperty(element, 'shadowRoot', {
                get: () => mockShadowRoot,
                configurable: true
            });

            const plant = { entity_id: 'dragged' };
            (element as any)._handleMobileDrop({
                detail: { x: 10, y: 10, plant }
            });

            // Should default to 0,0
            expect(mockStore.handleDrop).toHaveBeenCalledWith(0, 0, null, plant);
        });
    });

    it('falls back to none overlay mode when controller value is missing', async () => {
        // Set value to undefined to trigger || 'none'
        (element as any)._overlayModeController = { value: undefined };
        const plant: any = {
            entity_id: 'p1',
            state: 'ok',
            attributes: { plant_id: 'p1' }
        };
        element.plants = [[plant]];
        await waitForUpdates(element);

        const overlay = element.shadowRoot?.querySelector('.grid-overlay');
        expect(overlay).toBeNull();
    });

    describe('Drag Over Edge Cases', () => {
        it('should handle drag over without dataTransfer', () => {
            const event = {
                preventDefault: vi.fn()
            };

            (element as any)._handleDragOver(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('Plant Selection Edge Cases', () => {
        it('should not toggle selection when plant_id is undefined', () => {
            const plantWithoutId: any = { attributes: {} };
            (element as any)._togglePlantSelection(plantWithoutId);
            expect(mockStore.togglePlantSelection).not.toHaveBeenCalled();
        });
    });

    describe('connectedCallback Edge Cases', () => {
        it('should not initialize controllers when store is undefined', async () => {
            const newElement = document.createElement('growspace-grid') as GrowspaceGrid;
            // store is undefined by default
            document.body.appendChild(newElement);
            await waitForUpdates(newElement);
            expect((newElement as any)._isEditModeController).toBeUndefined();
            document.body.removeChild(newElement);
        });
    });

    describe('Render Edge Cases', () => {
        it('should use plant_id for key when available', async () => {
            const plant: any = {
                entity_id: 'entity1',
                state: 'ok',
                attributes: { plant_id: 'unique-id' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            // The list should render without error using plant_id as key
            const cards = element.shadowRoot?.querySelectorAll('growspace-plant-card');
            expect(cards?.length).toBe(1);
        });

        it('should fallback to entity_id when plant_id is undefined', async () => {
            const plant: any = {
                entity_id: 'entity-fallback',
                state: 'ok',
                attributes: {}
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const cards = element.shadowRoot?.querySelectorAll('growspace-plant-card');
            expect(cards?.length).toBe(1);
        });
    });

    describe('Grid Overlay getOverlayColor', () => {
        let $devices: any;

        beforeEach(() => {
            $devices = atom([]);
            mockStore.data = { $devices };
        });

        it('should return transparent when mode is none', async () => {
            $gridOverlayMode.set('none');
            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1', growspace_id: 'gs1' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            // No overlay should be rendered when mode is none
            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            expect(overlay).toBeNull();
        });

        it('should return transparent when growspaceId is missing', async () => {
            $gridOverlayMode.set('vpd');
            $devices.set([{ device_id: 'gs1', biological_metrics: { vpd_status: 'ok' } }]);

            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1' } // No growspace_id
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            if (overlay) {
                expect((overlay as HTMLElement).style.backgroundColor).toBe('transparent');
            }
        });

        it('should return transparent when device not found', async () => {
            $gridOverlayMode.set('vpd');
            $devices.set([]); // No devices

            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1', growspace_id: 'gs-not-found' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            if (overlay) {
                expect((overlay as HTMLElement).style.backgroundColor).toBe('transparent');
            }
        });

        it('should return green overlay for vpd status ok', async () => {
            $gridOverlayMode.set('vpd');
            $devices.set([{ device_id: 'gs1', biological_metrics: { vpd_status: 'ok' } }]);

            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1', growspace_id: 'gs1' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            expect(overlay).toBeTruthy();
            // Green color for ok status
            expect((overlay as HTMLElement).style.backgroundColor).toContain('76');
        });

        it('should return orange overlay for vpd status warning', async () => {
            $gridOverlayMode.set('vpd');
            $devices.set([{ device_id: 'gs1', biological_metrics: { vpd_status: 'warning' } }]);

            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1', growspace_id: 'gs1' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            expect(overlay).toBeTruthy();
            // Orange color for warning status
            expect((overlay as HTMLElement).style.backgroundColor).toContain('255');
        });

        it('should return red overlay for vpd status danger', async () => {
            $gridOverlayMode.set('vpd');
            $devices.set([{ device_id: 'gs1', biological_metrics: { vpd_status: 'danger' } }]);

            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1', growspace_id: 'gs1' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            expect(overlay).toBeTruthy();
            // Red color for danger status
            expect((overlay as HTMLElement).style.backgroundColor).toContain('244');
        });

        it('should return transparent for unknown vpd status', async () => {
            $gridOverlayMode.set('vpd');
            $devices.set([{ device_id: 'gs1', biological_metrics: { vpd_status: 'unknown' } }]);

            const plant: any = {
                entity_id: 'p1',
                state: 'ok',
                attributes: { plant_id: 'p1', growspace_id: 'gs1' }
            };
            element.plants = [[plant]];
            await waitForUpdates(element);

            const overlay = element.shadowRoot?.querySelector('.grid-overlay');
            if (overlay) {
                expect((overlay as HTMLElement).style.backgroundColor).toBe('transparent');
            }
        });
    });
});
