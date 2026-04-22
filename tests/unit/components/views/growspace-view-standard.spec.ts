import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { atom, computed } from 'nanostores';

// Mock imports — include both legacy paths (for old imports still in the view) and new container paths
vi.mock('../../../../src/components/growspace-header', () => ({}));
vi.mock('../../../../src/features/ui/containers/growspace-header.container', () => ({}));
vi.mock('../../../../src/components/growspace-analytics', () => ({}));
vi.mock('../../../../src/features/ui/containers/growspace-analytics.container', () => ({}));
vi.mock('../../../../src/components/manager/edit-mode-banner', () => ({}));
vi.mock('../../../../src/features/ui/components/growspace-edit-mode-banner-ui', () => ({}));
vi.mock('../../../../src/components/transplant-source-panel', () => ({}));
vi.mock('../../../../src/components/growspace-grid', () => ({}));
vi.mock('../../../../src/features/plants/containers/growspace-grid.container', () => ({}));

// Defines mocks
@customElement('growspace-header')
class MockHeader extends LitElement {
    static get properties() { return { device: { type: Object }, growspaceOptions: { type: Object } }; }
}
@customElement('growspace-analytics')
class MockAnalytics extends LitElement {
    static get properties() { return { device: { type: Object } }; }
}
@customElement('growspace-edit-mode-banner')
class MockBanner extends LitElement {
    static get properties() { return { selectedCount: { type: Number } }; }
}
@customElement('transplant-source-panel')
class MockTransplantPanel extends LitElement {
    clonePlants: any;
    seedlingPlants: any;
    static get properties() { return { clonePlants: { type: Array }, seedlingPlants: { type: Array } }; }
}
@customElement('growspace-grid')
class MockGrid extends LitElement {
    static get properties() { return { plants: { type: Array }, rows: { type: Number }, cols: { type: Number } }; }
    focusPlant(index: number) { }
}
@customElement('growspace-grid-container')
class MockGridContainer extends LitElement {
    static get properties() { return { plants: { type: Array }, rows: { type: Number }, cols: { type: Number } }; }
    focusPlant(index: number) { }
}

// Grid container is always used unconditionally
const getGridSelector = () => 'growspace-grid-container';

import { GrowspaceViewStandard } from '../../../../src/components/views/growspace-view-standard';

describe('GrowspaceViewStandard', () => {
    let element: GrowspaceViewStandard;
    let mockStore: any;
    let isTransplantModeAtom: any;
    let devicesAtom: any;

    beforeEach(async () => {
        isTransplantModeAtom = atom(false);
        devicesAtom = atom([]);

        const $viewStandardState = computed(
            [isTransplantModeAtom, devicesAtom],
            (isTransplantMode, devices) => ({ isTransplantMode, devices })
        );

        mockStore = {
            ui: {
                $isTransplantMode: isTransplantModeAtom,
            },
            actions: {
                ui: {
                    toast: vi.fn(),
                },
            },
            data: {
                $devices: devicesAtom
            },
            $viewStandardState,
            hass: {
                callService: vi.fn(),
            },
            refreshData: vi.fn(),
        };

        // Create the element and provide context
        element = new GrowspaceViewStandard();

        // We need to inject the store controller mocks or context before connectedCallback
        // Lit context provider approach is complex here without a parent wrapper.
        // We can manually assign the store since the @consume decorator might try to subscribe.
        // However, standard checks 'this.store' in connectedCallback.
        // We'll set it manually.

        // Create a wrapper to provide context if needed, but direct assignment is easier for unit test
        // element.store = mockStore; // This works if the property is public/writable

        // Since @consume makes it a property, we can define it on the element instance mock-style?
        Object.defineProperty(element, 'store', {
            value: mockStore,
            writable: true
        });

        document.body.appendChild(element);

        // Mock data
        element.device = { deviceId: 'gs1', name: 'GS 1', plants: [] } as any;
        element.growspaceOptions = {};
        element.grid = [];
        element.rows = 4;
        element.cols = 4;

        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
        vi.restoreAllMocks();
    });

    it('should render nothing if device is undefined', async () => {
        element.device = undefined;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
    });

    it('should render header, analytics and grid when device is present', async () => {
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('growspace-header')).toBeTruthy();
        expect(element.shadowRoot?.querySelector('growspace-analytics')).toBeTruthy();
        expect(element.shadowRoot?.querySelector(getGridSelector())).toBeTruthy();
    });

    it('should show edit mode banner when isEditMode is true', async () => {
        element.isEditMode = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('growspace-edit-mode-banner')).toBeTruthy();
    });

    it('should show transplant source panel when in transplant mode', async () => {
        isTransplantModeAtom.set(true);
        // Set some devices for _getPlantsByStage
        devicesAtom.set([
            {
                name: 'GS1',
                plants: [
                    { attributes: { stage: 'clone', plant_id: 'p1' } },
                    { attributes: { stage: 'seedling', plant_id: 'p2' } }
                ]
            }
        ]);
        element.requestUpdate();
        await element.updateComplete;

        const panel = element.shadowRoot?.querySelector('transplant-source-panel') as any;
        expect(panel).toBeTruthy();
        expect(panel.clonePlants.length).toBe(1);
        expect(panel.seedlingPlants.length).toBe(1);
    });

    it('should show view toggle button if initial_view_mode is header', async () => {
        element.config = { initial_view_mode: 'header' } as any;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.collapse-handle')).toBeTruthy();
    });

    it('should toggle view expansion on button click', async () => {
        element.config = { initial_view_mode: 'header' } as any;
        await element.updateComplete;

        const button = element.shadowRoot?.querySelector('.collapse-handle') as HTMLElement;
        const spy = vi.spyOn(element, 'dispatchEvent');
        button.click();

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'toggle-expansion'
        }));
    });

    it('should redispatch events from header', async () => {
        const header = element.shadowRoot?.querySelector('growspace-header');
        const spy = vi.spyOn(element, 'dispatchEvent');

        header?.dispatchEvent(new CustomEvent('growspace-changed', {
            detail: 'gs2',
            bubbles: true,
            composed: true
        }));

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'growspace-changed',
            detail: 'gs2'
        }));
    });

    it('should redispatch events from banner', async () => {
        element.isEditMode = true;
        await element.updateComplete;

        const banner = element.shadowRoot?.querySelector('growspace-edit-mode-banner');
        const spy = vi.spyOn(element, 'dispatchEvent');

        banner?.dispatchEvent(new CustomEvent('batch-add-plants', {
            detail: { quantity: 5 },
            bubbles: true,
            composed: true
        }));

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'batch-add-plants',
            detail: { quantity: 5 }
        }));
    });

    it('should delegate focusPlant to grid', async () => {
        const grid = element.shadowRoot?.querySelector(getGridSelector()) as any;
        const spy = vi.spyOn(grid!, 'focusPlant');

        element.focusPlant(5);
        expect(spy).toHaveBeenCalledWith(5);
    });

    it('should handle transplant drop successfully', async () => {
        vi.useFakeTimers();
        const grid = element.shadowRoot?.querySelector(getGridSelector());

        // Mock successful service call
        mockStore.hass.callService.mockReturnValue(Promise.resolve({}));

        // Trigger event
        grid?.dispatchEvent(new CustomEvent('transplant-drop', {
            detail: {
                plant_id: 'p1',
                target_row: 2,
                target_col: 3
            }
        }));

        // Advance timers to allow promise resolution and timeout
        await vi.runAllTimersAsync();

        expect(mockStore.hass.callService).toHaveBeenCalledWith(
            'growspace_manager',
            'update_plant',
            expect.objectContaining({
                plant_id: 'p1',
                growspace_id: 'gs1',
                row: 2,
                col: 3
            })
        );

        expect(mockStore.actions.ui.toast).toHaveBeenCalledWith('Plant transplanted successfully', 'success');
        vi.useRealTimers();
    });

    it('should handle transplant drop failure', async () => {
        const grid = element.shadowRoot?.querySelector(getGridSelector());

        mockStore.hass.callService.mockRejectedValue(new Error('Fail'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        grid?.dispatchEvent(new CustomEvent('transplant-drop', {
            detail: { plant_id: 'p1' }
        }));

        // Flush promise queue
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockStore.actions.ui.toast).toHaveBeenCalledWith('Failed to transplant plant', 'error');
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should start early in transplant drop if no device id', async () => {
        element.device = undefined;
        // manually call private method or trigger event (grid might not exist if no device, but we can simulate)
        // Since render returns empty, grid is not there.
        // We can call method directly by casting
        const event = { detail: { plant_id: 'p1' } } as any;
        await (element as any)._handleTransplantDrop(event);
        expect(mockStore.hass.callService).not.toHaveBeenCalled();
    });

    it('should always render growspace-grid-container unconditionally', async () => {
        element.requestUpdate();
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('growspace-grid-container');
        expect(container).toBeTruthy();

        // Verify the transplant-drop event handler is wired up
        mockStore.hass.callService.mockReturnValue(Promise.resolve({}));
        container?.dispatchEvent(new CustomEvent('transplant-drop', {
            detail: { plant_id: 'p1', target_row: 1, target_col: 1 },
        }));
        await new Promise((r) => setTimeout(r, 0));
    });

    it('should use value fallback in redispatch', async () => {
        // We need to trigger _redispatch. It is used in listeners.
        // We can call it directly or trigger event on header/banner.
        // Let's use header.
        const header = element.shadowRoot?.querySelector('growspace-header');
        const spy = vi.spyOn(element, 'dispatchEvent');

        // Mock event where detail is null but target has value
        const mockEvent = {
            stopPropagation: vi.fn(),
            detail: null,
            target: { value: 'fallback' },
            bubbles: true,
            composed: true
        } as any;

        (element as any)._redispatch(mockEvent, 'test-event');

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'test-event',
            detail: 'fallback'
        }));
    });

    it('should re-initialize controllers when store property changes', async () => {
        const initSpy = vi.spyOn(element as any, '_initControllers');
        
        // Trigger property change
        element.store = { ...mockStore, newProp: true };
        
        // willUpdate is called by Lit before update
        element.requestUpdate('store', mockStore);
        await element.updateComplete;
        
        expect(initSpy).toHaveBeenCalled();
    });

    it('_getPlantsByStage should return empty array if devices are missing', async () => {
        // Force the controller to have no value or empty devices
        // Since it's a nanostores controller, we control it via the atom
        devicesAtom.set(null as any);
        
        const plants = (element as any)._getPlantsByStage('clone');
        expect(plants).toEqual([]);
    });

    it('_getPlantsByStage should handle devices without plants property', async () => {
        devicesAtom.set([{ name: 'Empty GS' } as any]);
        
        const plants = (element as any)._getPlantsByStage('clone');
        expect(plants).toEqual([]);
    });
});
