import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, aroundEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceGridCard } from '../../src/cards/growspace-grid-card';
import { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { createMockHass } from '../mocks/hass';

vi.mock('../../src/slices/grid-interaction', () => ({
    startTransplant: vi.fn(),
    select: vi.fn(),
    cancel: vi.fn(),
    gridInteraction$: { get: vi.fn(() => ({ status: 'idle' })), set: vi.fn(), listen: vi.fn(() => () => {}) },
}));

// Ensure the custom element is defined
if (!customElements.get('growspace-grid-card')) {
    customElements.define('growspace-grid-card', GrowspaceGridCard);
}

// Mock sub-components so they don't throw or interfere
vi.mock('../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../src/features/ui/containers/growspace-toast.container', () => ({}));
vi.mock('../../src/features/shared/layouts/growspace-view-switcher', () => ({}));
vi.mock('../../src/features/shared/ui/error-boundary', () => ({
    ErrorBoundary: class extends HTMLElement {
        // Stub the class
    }
}));
vi.mock('../../src/cards/editors/growspace-grid-card-editor', () => ({
    GrowspaceGridCardEditor: class extends HTMLElement {}
}));

describe('GrowspaceGridCard', () => {
    let element: GrowspaceGridCard;

    aroundEach(async (runTest) => {
        element = await fixture<GrowspaceGridCard>(html`<growspace-grid-card></growspace-grid-card>`);
        element.hass = createMockHass() as any;
        await runTest();
        vi.restoreAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceGridCard);
    });

    test('forces compact mode and standard view on config set', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'test_tent',
            compact: false,
            initial_view_mode: 'heatmap' as any,
        };

        const initSpy = vi.spyOn(element.store, 'initializeSelectedDevice');
        const setViewSpy = vi.spyOn(element.store.ui, 'setViewMode');

        element.setConfig(config);

        expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ compact: true, initial_view_mode: ViewMode.STANDARD }));
        expect(setViewSpy).toHaveBeenCalledWith(ViewMode.STANDARD);
    });

    test('throws error on invalid config', () => {
        expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceGridCard>(html`<growspace-grid-card></growspace-grid-card>`);
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceGridCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-grid-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(3);
    });

    test('calls store updateHass on updated', async () => {
        const spy = vi.spyOn(element.store, 'updateHass');
        element.hass = { ...element.hass, language: 'de' } as any;
        await element.updateComplete;
        expect(spy).toHaveBeenCalled();
    });

    test('disconnectedCallback destroys store', async () => {
        const spy = vi.spyOn(element.store, 'destroy');
        element.disconnectedCallback();
        expect(spy).toHaveBeenCalled();
    });

    test('stale counter triggers data refresh', async () => {
        const refreshSpy = vi.spyOn(element.store.syncService, 'refreshGrowspaceData');
        element.store.data.$staleCounter.set(element.store.data.$staleCounter.get() + 1);
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalled();
    });

    test('event handlers trigger store actions', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            { deviceId: 'test_tent', name: 'Test Tent', plants: [] } as any
        ]);
        element.store.grid.$selectedDevice.set('test_tent');
        await element.updateComplete;

        const cardContainer = element.shadowRoot?.querySelector('.unified-growspace-card');
        
        const handlers = [
            { event: 'select-all', spy: vi.spyOn(element.store.actions.ui, 'selectAllPlants') },
            { event: 'clear-selection', spy: vi.spyOn(element.store.actions.ui, 'clearPlantSelection') },
            { event: 'water-selected', spy: vi.spyOn(element.store.actions.ui, 'openBatchWateringDialog') },
            { event: 'training-selected', spy: vi.spyOn(element.store.actions.ui, 'openBatchTrainingDialog') },
            { event: 'ipm-selected', spy: vi.spyOn(element.store.actions.ui, 'openIPMDialog') },
            { event: 'delete-selected', spy: vi.spyOn(element.store.actions.ui, 'deleteSelectedPlants') },
            { event: 'transplant-mode', spy: vi.spyOn(await import('../../src/slices/grid-interaction'), 'startTransplant') },
        ];

        for (const { event, spy } of handlers) {
            cardContainer?.dispatchEvent(new CustomEvent(event));
            expect(spy).toHaveBeenCalled();
        }

        // Test exit edit mode separately since it calls ui.setEditMode
        const editModeSpy = vi.spyOn(element.store.ui, 'setEditMode');
        cardContainer?.dispatchEvent(new CustomEvent('exit-edit-mode'));
        expect(editModeSpy).toHaveBeenCalledWith(false);

        // Test batch add plants
        const dialogSpy = vi.spyOn(element.store.ui, 'setActiveDialog');
        cardContainer?.dispatchEvent(new CustomEvent('batch-add-plants'));
        expect(dialogSpy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });

        // Test growspace change
        const deviceSpy = vi.spyOn(element.store, 'handleDeviceChange');
        cardContainer?.dispatchEvent(new CustomEvent('growspace-changed', { detail: 'other_tent' }));
        expect(deviceSpy).toHaveBeenCalledWith('other_tent');
    });

    test('renders loading state when store is loading', async () => {
        element.store.ui.$isLoading.set(true);
        element.store.ui.$isEditMode.set(false);
        element.store.ui.$viewMode.set(ViewMode.STANDARD);
        element.store.ui.$focusedPlantIndex.set(-1);
        await element.updateComplete;
        
        const loader = element.shadowRoot?.querySelector('ha-circular-progress');
        expect(loader).toBeTruthy();
    });

    test('renders no-data state when devices array is empty', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.ui.$isEditMode.set(false);
        element.store.ui.$viewMode.set(ViewMode.STANDARD);
        element.store.ui.$focusedPlantIndex.set(-1);
        element.store.data.$devices.set([]);
        await element.updateComplete;
        
        const noData = element.shadowRoot?.querySelector('.no-data');
        expect(noData).toBeTruthy();
        expect(noData?.textContent).toContain('No growspace devices found.');
    });

    test('renders error state when selected device is not found', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.ui.$isEditMode.set(false);
        element.store.ui.$viewMode.set(ViewMode.STANDARD);
        element.store.ui.$focusedPlantIndex.set(-1);
        element.store.data.$devices.set([
            {
                deviceId: 'wrong_device',
                name: 'Wrong Tent',
                plantsPerRow: 5,
                location: 'indoor',
                systemType: 'soil',
                plants: []
            } as any
        ]);
        element.store.grid.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        const errorDiv = element.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('No valid growspace selected. Please configure the card.');
    });

    test('renders grid view and handles all mapped UI events', async () => {
        // Setup valid state
        element.store.ui.$isLoading.set(false);
        element.store.ui.$isEditMode.set(false);
        element.store.ui.$viewMode.set(ViewMode.STANDARD);
        element.store.ui.$focusedPlantIndex.set(-1);
        element.store.data.$devices.set([
            {
                deviceId: 'selected_tent',
                name: 'Selected Tent',
                plantsPerRow: 10, // test is_wide via plantsPerRow > 7
                location: 'indoor',
                systemType: 'soil',
                plants: []
            } as any
        ]);
        element.store.grid.$selectedDevice.set('selected_tent');

        // Render card
        await element.updateComplete;
        
        const cardContainer = element.shadowRoot?.querySelector('.unified-growspace-card');
        expect(cardContainer).toBeTruthy();

        // Check if isWide is applied due to plantsPerRow > 7
        const haCard = element.shadowRoot?.querySelector('ha-card');
        expect(haCard?.classList.contains('wide-growspace')).toBe(true);
        
        // Mock store action methods before firing events
        const keyboardSpy = vi.spyOn(element.store.actions.ui, 'handleKeyboardNavigation').mockImplementation(() => {});
        const selectAllSpy = vi.spyOn(element.store.actions.ui, 'selectAllPlants').mockImplementation(() => {});
        const clearSpy = vi.spyOn(element.store.actions.ui, 'clearPlantSelection').mockImplementation(() => {});
        const waterSpy = vi.spyOn(element.store.actions.ui, 'openBatchWateringDialog').mockImplementation(() => {});
        const ipmSpy = vi.spyOn(element.store.actions.ui, 'openIPMDialog').mockImplementation(() => {});
        const trainingSpy = vi.spyOn(element.store.actions.ui, 'openBatchTrainingDialog').mockImplementation(() => {});
        const deleteSpy = vi.spyOn(element.store.actions.ui, 'deleteSelectedPlants').mockResolvedValue(undefined as any);
        const deviceChangeSpy = vi.spyOn(element.store, 'handleDeviceChange').mockImplementation(() => {});
        const setActiveDialogSpy = vi.spyOn(element.store.ui, 'setActiveDialog');
        const setEditModeSpy = vi.spyOn(element.store.ui, 'setEditMode');
        const { startTransplant } = await import('../../src/slices/grid-interaction');
        const toggleTransplantSpy = vi.mocked(startTransplant);

        // Dispatch events directly on container
        cardContainer?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        cardContainer?.dispatchEvent(new CustomEvent('growspace-changed', { detail: 'other_tent' }));
        cardContainer?.dispatchEvent(new CustomEvent('select-all'));
        cardContainer?.dispatchEvent(new CustomEvent('clear-selection'));
        cardContainer?.dispatchEvent(new CustomEvent('water-selected'));
        cardContainer?.dispatchEvent(new CustomEvent('training-selected'));
        cardContainer?.dispatchEvent(new CustomEvent('ipm-selected'));
        cardContainer?.dispatchEvent(new CustomEvent('batch-add-plants'));
        cardContainer?.dispatchEvent(new CustomEvent('delete-selected'));
        cardContainer?.dispatchEvent(new CustomEvent('transplant-mode'));
        cardContainer?.dispatchEvent(new CustomEvent('exit-edit-mode'));

        expect(keyboardSpy).toHaveBeenCalledWith('ArrowRight');
        expect(deviceChangeSpy).toHaveBeenCalledWith('other_tent');
        expect(selectAllSpy).toHaveBeenCalled();
        expect(clearSpy).toHaveBeenCalled();
        expect(waterSpy).toHaveBeenCalled();
        expect(trainingSpy).toHaveBeenCalled();
        expect(ipmSpy).toHaveBeenCalled();
        expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
        expect(deleteSpy).toHaveBeenCalled();
        expect(toggleTransplantSpy).toHaveBeenCalled();
        expect(setEditModeSpy).toHaveBeenCalledWith(false);
    });

    test('calls system_log/write on handle error', () => {
        // Direct access to _handleError
        (element as any)._handleError(new Error('Test Error'), { componentStack: 'Mock' });
        
        expect(element.hass.callService).toHaveBeenCalledWith('system_log', 'write', expect.objectContaining({
            message: 'Growspace Grid Card Error: Test Error',
            level: 'error',
            logger: 'lovelace_growspace_manager_card',
        }));
    });

    test('gets config element correctly', async () => {
        const editor = await GrowspaceGridCard.getConfigElement();
        expect(editor.tagName.toLowerCase()).toBe('growspace-grid-card-editor');
    });

});
