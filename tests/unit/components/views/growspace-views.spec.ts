import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowspaceViewCompact } from '../../../../src/components/views/growspace-view-compact';
import { GrowspaceViewHeader } from '../../../../src/components/views/growspace-view-header';
import { GrowspaceViewStandard } from '../../../../src/components/views/growspace-view-standard';
import { GrowspaceDevice } from '../../../../src/types';
import * as uiStore from '../../../../src/store/ui/ui-store';
import { FEATURE_FLAGS } from '../../../../src/features/shared/config/feature-flags';

// Mock ui-store
vi.mock('../../../../src/store/ui/ui-store', () => ({
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

// Mocks
vi.mock('../../../../src/components/growspace-grid', () => ({
    GrowspaceGrid: class extends HTMLElement {
        focusPlant = vi.fn();
    }
}));
vi.mock('../../../../src/features/plants/containers/growspace-grid.container', () => ({
    GrowspaceGridContainer: class extends HTMLElement {
        focusPlant = vi.fn();
    }
}));
vi.mock('../../../../src/components/growspace-header', () => ({
    GrowspaceHeader: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/growspace-analytics', () => ({
    GrowspaceAnalytics: class extends HTMLElement { }
}));
vi.mock('../../../../src/components/manager/edit-mode-banner', () => ({
    GrowspaceEditModeBanner: class extends HTMLElement { }
}));

// Helper to get grid selector based on feature flag
const getGridSelector = () =>
    FEATURE_FLAGS.USE_NEW_GROWSPACE_GRID ? 'growspace-grid-container' : 'growspace-grid';

describe('Growspace Views', () => {

    describe('GrowspaceViewCompact', () => {
        let element: GrowspaceViewCompact;

        beforeEach(() => {
            element = new GrowspaceViewCompact();
        });

        it('should act as a Grid Host', async () => {
            element.grid = [];
            element.rows = 3;
            element.cols = 4;
            document.body.appendChild(element);
            await element.updateComplete;

            const grid = element.shadowRoot?.querySelector(getGridSelector());
            expect(grid).toBeTruthy();
            // Note: compact is now controlled by StoreController, not a property

            document.body.removeChild(element);
        });

        it('should handle focusPlant delegation', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const gridMock = element.shadowRoot?.querySelector(getGridSelector()) as any;
            gridMock.focusPlant = vi.fn();

            element.focusPlant(1);
            expect(gridMock.focusPlant).toHaveBeenCalledWith(1);

            document.body.removeChild(element);
        });

        it('should safely handle focusPlant if grid not found', async () => {
            document.body.appendChild(element);

            // Mock querySelector to return null even if attached
            const spy = vi.spyOn(element.shadowRoot!, 'querySelector').mockReturnValue(null);

            // Should not throw
            element.focusPlant(1);

            expect(spy).toHaveBeenCalledWith(getGridSelector());

            document.body.removeChild(element);
        });

        it('should dispatch view-mode-changed on exit button click', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('view-mode-changed', listener);

            const btn = element.shadowRoot?.querySelector('.compact-exit-fab') as HTMLElement;
            btn?.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.mode).toBe('standard');

            document.body.removeChild(element);
        });
    });

    describe('GrowspaceViewHeader', () => {
        let element: GrowspaceViewHeader;

        beforeEach(() => {
            element = new GrowspaceViewHeader();
            element.device = { deviceId: 'd1' } as any;
        });

        it('should render growspace-header', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const header = element.shadowRoot?.querySelector('growspace-header');
            expect(header).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should NOT render if device is undefined', async () => {
            element.device = undefined;
            document.body.appendChild(element);
            await element.updateComplete;

            const header = element.shadowRoot?.querySelector('growspace-header');
            expect(header).toBeFalsy();

            document.body.removeChild(element);
        });

        it('should redispatch growspace-changed event', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('growspace-changed', listener);

            const header = element.shadowRoot?.querySelector('growspace-header');
            header?.dispatchEvent(new CustomEvent('growspace-changed', { detail: 'd2', bubbles: true, composed: true }));

            // Wait for event propagation if needed, mostly synchronous here
            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toBe('d2');

            document.body.removeChild(element);
        });

        it('should redispatch with target value fallback if detail missing', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('growspace-changed', listener);

            // Mock event with target value but no detail
            const event = new CustomEvent('growspace-changed', { bubbles: true, composed: true });
            Object.defineProperty(event, 'target', { value: { value: 'fallback-val' }, writable: true });

            const header = element.shadowRoot?.querySelector('growspace-header');
            header?.dispatchEvent(event);

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toBe('fallback-val');

            document.body.removeChild(element);
        });

        it('should dispatch toggle-expansion event', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('toggle-expansion', listener);

            const btn = element.shadowRoot?.querySelector('.expand-handle') as HTMLButtonElement;
            expect(btn).toBeTruthy();
            btn.click();

            expect(listener).toHaveBeenCalled();
            document.body.removeChild(element);
        });
    });

    describe('GrowspaceViewStandard', () => {
        let element: GrowspaceViewStandard;

        beforeEach(() => {
            element = new GrowspaceViewStandard();
            element.device = { deviceId: 'd1' } as any;
        });

        it('should render header, analytics and grid', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('growspace-header')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('growspace-analytics')).toBeTruthy();
            expect(element.shadowRoot?.querySelector(getGridSelector())).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should render edit banner when isEditMode is true', async () => {
            element.isEditMode = true;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('growspace-edit-mode-banner')).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should redispatch batch-add-plants event', async () => {
            element.isEditMode = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('batch-add-plants', listener);

            const banner = element.shadowRoot?.querySelector('growspace-edit-mode-banner');
            banner?.dispatchEvent(new CustomEvent('batch-add-plants', { detail: 'data', bubbles: true, composed: true }));

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toBe('data');

            document.body.removeChild(element);
        });

        it('should Safely handle focusPlant if grid not found', async () => {
            document.body.appendChild(element);

            // Mock querySelector to return null
            const spy = vi.spyOn(element.shadowRoot!, 'querySelector').mockReturnValue(null);

            // Should not throw
            element.focusPlant(5);
            expect(spy).toHaveBeenCalledWith(getGridSelector());

            document.body.removeChild(element);
        });

        it('should handle focusPlant calls', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const gridMock = element.shadowRoot?.querySelector(getGridSelector()) as any;
            gridMock.focusPlant = vi.fn();

            element.focusPlant(5);
            expect(gridMock.focusPlant).toHaveBeenCalledWith(5);

            document.body.removeChild(element);
        });

        it('should redispatch growspace-changed event', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('growspace-changed', listener);

            const header = element.shadowRoot?.querySelector('growspace-header');
            header?.dispatchEvent(new CustomEvent('growspace-changed', { detail: 'd2', bubbles: true, composed: true }));

            expect(listener).toHaveBeenCalled();

            document.body.removeChild(element);
        });

        it('should redispatch with target value fallback if detail missing', async () => {
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('growspace-changed', listener);

            // Mock event with target value but no detail
            const event = new CustomEvent('growspace-changed', { bubbles: true, composed: true });
            Object.defineProperty(event, 'target', { value: { value: 'fallback-val' }, writable: true });

            const header = element.shadowRoot?.querySelector('growspace-header');
            header?.dispatchEvent(event);

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toBe('fallback-val');

            document.body.removeChild(element);
        });

        it('should NOT render if device is undefined', async () => {
            element.device = undefined;
            document.body.appendChild(element);
            await element.updateComplete;

            const header = element.shadowRoot?.querySelector('growspace-header');
            expect(header).toBeFalsy();

            document.body.removeChild(element);
        });

        it('should render toggle button if initial_view_mode is header', async () => {
            element.config = { initial_view_mode: 'header' } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const btn = element.shadowRoot?.querySelector('.collapse-handle');
            expect(btn).toBeTruthy();

            document.body.removeChild(element);
        });

        it('should dispatch toggle-expansion event when button clicked', async () => {
            element.config = { initial_view_mode: 'header' } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('toggle-expansion', listener);

            const btn = element.shadowRoot?.querySelector('.collapse-handle') as HTMLButtonElement;
            btn.click();

            expect(listener).toHaveBeenCalled();
            document.body.removeChild(element);
        });

        describe('_getPlantsByStage', () => {
            beforeEach(() => {
                // Mock controller value
                const mockDevices = [
                    {
                        name: 'Veg Tent',
                        plants: [
                            { entity_id: 'plant_1', attributes: { stage: 'vegetative' } },
                            { entity_id: 'plant_2', attributes: { stage: 'vegetative' } }
                        ]
                    },
                    {
                        name: 'Flower Tent',
                        plants: [
                            { entity_id: 'plant_3', attributes: { stage: 'flowering' } }
                        ]
                    },
                    {
                        name: 'Clone Rack',
                        plants: [
                            { entity_id: 'plant_5', attributes: { stage: 'clone' } }
                        ]
                    },
                    {
                        name: 'Empty Tent',
                        plants: [] as any[]
                    },
                    {
                        name: 'Null Plants',
                        plants: undefined
                    }
                ];
                (element as any)._viewStandardController = { value: { isTransplantMode: false, devices: mockDevices } };
            });

            it('should correctly filter plants for the "vegetative" stage', () => {
                const plants = (element as any)._getPlantsByStage('vegetative');
                expect(plants).toHaveLength(2);
                expect(plants[0].entity_id).toBe('plant_1');
                expect(plants[0]._growspaceName).toBe('Veg Tent');
            });

            it('should correctly filter plants for the "clone" stage', () => {
                const plants = (element as any)._getPlantsByStage('clone');
                expect(plants).toHaveLength(1);
                expect(plants[0].entity_id).toBe('plant_5');
                expect(plants[0]._growspaceName).toBe('Clone Rack');
            });

            it('should return an empty array for a stage with no matching plants', () => {
                const plants = (element as any)._getPlantsByStage('cured');
                expect(plants).toEqual([]);
            });

            it('should handle devices with empty or null plant arrays gracefully', () => {
                const plants = (element as any)._getPlantsByStage('vegetative');
                expect(plants).toHaveLength(2);
            });
        });
    });
});
