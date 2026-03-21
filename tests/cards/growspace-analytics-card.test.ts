import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { GrowspaceAnalyticsCard } from '../../src/cards/growspace-analytics-card';
import { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';

// Ensure the custom element is defined
if (!customElements.get('growspace-analytics-card')) {
    customElements.define('growspace-analytics-card', GrowspaceAnalyticsCard);
}

// Mock sub-components
vi.mock('../../src/components/growspace-analytics', () => ({}));
vi.mock('../../src/components/error-boundary', () => ({
    ErrorBoundary: class extends HTMLElement { }
}));
vi.mock('../../src/cards/editors/growspace-analytics-card-editor', () => ({
    GrowspaceAnalyticsCardEditor: class extends HTMLElement { }
}));

describe('GrowspaceAnalyticsCard', () => {
    let element: GrowspaceAnalyticsCard;

    beforeEach(async () => {
        const mockHass = {
            states: {},
            callService: vi.fn(),
            language: 'en',
            connection: {
                sendMessagePromise: vi.fn(),
                subscribeEvents: vi.fn(),
            }
        } as any;
        element = await fixture<GrowspaceAnalyticsCard>(html`<growspace-analytics-card .hass=${mockHass}></growspace-analytics-card>`);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAnalyticsCard);
    });

    test('initializes default growspace from config', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'test_tent',
        };

        const initSpy = vi.spyOn(element.store, 'initializeSelectedDevice');
        element.setConfig(config);

        expect(element._config?.default_growspace).toBe('test_tent');
        expect(initSpy).toHaveBeenCalledWith(config);
    });

    test('throws error on invalid config', () => {
        expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceAnalyticsCard>(html`<growspace-analytics-card></growspace-analytics-card>`);
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceAnalyticsCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-analytics-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(4);
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

    test('subscription logic updates Hass and refreshes Data', () => {
        const updateSpy = vi.spyOn(element.store, 'updateHass');
        const refreshSpy = vi.spyOn(element.store, 'refreshData');
        
        const callback = (element as any)._subscriptionController._onUpdate;
        callback(true);
        
        expect(updateSpy).toHaveBeenCalled();
        expect(refreshSpy).toHaveBeenCalledWith(true);
    });

    test('renders loading state when store is loading', async () => {
        element.store.ui.$isLoading.set(true);
        element.store.ui.$isEditMode.set(false);
        element.store.ui.$viewMode.set(ViewMode.STANDARD);
        element.store.ui.$focusedPlantIndex.set(-1);
        await element.updateComplete;
        
        const loader = element.shadowRoot?.querySelector('.loading-spinner');
        expect(loader).toBeTruthy();
    });

    test('renders no-data state when devices array is empty', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([]);
        await element.updateComplete;
        
        const noData = element.shadowRoot?.querySelector('.no-data');
        expect(noData).toBeTruthy();
        expect(noData?.textContent).toContain('No growspace devices found.');
    });

    test('renders error state when selected device is not found', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            { deviceId: 'wrong_device', name: 'Wrong Tent', plants: [] } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        const errorDiv = element.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('No valid growspace selected. Please configure the card.');
    });

    test('renders analytics view when valid device selected', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            { deviceId: 'selected_tent', name: 'Selected Tent', plants: [] } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;
        
        const cardContainer = element.shadowRoot?.querySelector('.unified-growspace-card');
        expect(cardContainer).toBeTruthy();
    });

    test('calls system_log/write on handle error', () => {
        (element as any)._handleError(new Error('Analytics Error'), { componentStack: 'Mock' });
        
        expect(element.hass.callService).toHaveBeenCalledWith('system_log', 'write', expect.objectContaining({
            message: 'Growspace Analytics Card Error: Analytics Error',
            level: 'error',
            logger: 'lovelace_growspace_manager_card',
        }));
    });

    test('gets config element correctly', async () => {
        const editor = await GrowspaceAnalyticsCard.getConfigElement();
        expect(editor.tagName.toLowerCase()).toBe('growspace-analytics-card-editor');
    });
});
