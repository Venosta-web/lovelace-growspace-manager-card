import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { GrowspaceTankCard } from '../../src/cards/growspace-tank-card';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import type { IrrigationTank } from '../../src/services/types';

// Ensure the custom element is defined
if (!customElements.get('growspace-tank-card')) {
    customElements.define('growspace-tank-card', GrowspaceTankCard);
}

// Mock sub-components
vi.mock('../../src/components/error-boundary', () => ({
    ErrorBoundary: class extends HTMLElement {}
}));
vi.mock('../../src/cards/editors/growspace-tank-card-editor', () => ({
    GrowspaceTankCardEditor: class extends HTMLElement {}
}));

describe('GrowspaceTankCard', () => {
    let element: GrowspaceTankCard;

    beforeEach(async () => {
        element = await fixture<GrowspaceTankCard>(html`<growspace-tank-card></growspace-tank-card>`);
        element.hass = {
            states: {},
            callService: vi.fn(),
            language: 'en',
        } as any;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceTankCard);
    });

    test('setConfig updates config and initializes store', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-tank-card',
            default_growspace: 'test_tent',
        };
        const spy = vi.spyOn(element.store, 'initializeSelectedDevice');
        element.setConfig(config);
        expect((element as any)._config).toBe(config);
        expect(spy).toHaveBeenCalledWith(config);
    });

    test('throws error on invalid config', () => {
        expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceTankCard>(html`<growspace-tank-card></growspace-tank-card>`);
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('renders loading state when store is loading and no devices', async () => {
        element.store.ui.$isLoading.set(true);
        element.store.data.$devices.set([]);
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
            { deviceId: 'wrong_device', name: 'Wrong Tent' } as any
        ]);
        (element as any)._viewController.value.grid.selectedDevice = 'selected_tent';
        await element.updateComplete;

        const errorDiv = element.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('No valid growspace selected. Please configure the card.');
    });

    test('renders empty state when no tanks configured', async () => {
        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            {
                deviceId: 'selected_tent',
                name: 'Selected Tent',
                environmentAttributes: { irrigationTanks: [] }
            } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.textContent).toContain('No irrigation tanks configured');
    });

    test('renders tanks with data correctly', async () => {
        const mockTanks: IrrigationTank[] = [
            {
                name: 'Main Tank',
                fillLevel: 85.5,
                isWarning: false,
                hoursRemaining: 48,
                volumeLiters: 100,
                depletionStatus: 'depleting',
                warningLevel: 20,
                sensorEntity: 'sensor.tank_1'
            },
            {
                name: 'Low Tank',
                fillLevel: 15,
                isWarning: true,
                hoursRemaining: 4,
                volumeLiters: 50,
                depletionStatus: 'refilling',
                warningLevel: 20,
                sensorEntity: 'sensor.tank_2'
            }
        ];

        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            {
                deviceId: 'selected_tent',
                name: 'Selected Tent',
                environmentAttributes: { irrigationTanks: mockTanks }
            } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        // Check header info
        const warningBadge = element.shadowRoot?.querySelector('.warning-badge');
        expect(warningBadge).toBeTruthy();
        expect(warningBadge?.textContent).toContain('1 low');

        // Check tank cards
        const tankCards = element.shadowRoot?.querySelectorAll('.tank-card');
        expect(tankCards?.length).toBe(2);

        // First tank (normal)
        const tank1 = tankCards?.[0];
        expect(tank1?.classList.contains('warning')).toBe(false);
        expect(tank1?.querySelector('h4')?.textContent).toBe('Main Tank');
        expect(tank1?.querySelector('.percentage-text')?.textContent).toContain('86%');
        expect(tank1?.querySelector('.tank-meta')?.textContent).toContain('2d left');
        expect(tank1?.querySelector('.tank-meta')?.textContent).toContain('100 L');
        expect(tank1?.querySelector('.depletion-label')?.textContent).toContain('↓ Depleting');

        // Second tank (warning)
        const tank2 = tankCards?.[1];
        expect(tank2?.classList.contains('warning')).toBe(true);
        expect(tank2?.querySelector('.percentage-text')?.textContent).toContain('15%');
        expect(tank2?.querySelector('.warning-icon')).toBeTruthy();
        expect(tank2?.querySelector('.tank-meta')?.textContent).toContain('4h left');
        expect(tank2?.querySelector('.depletion-label')?.textContent).toContain('↑ Refilling');
    });

    test('renders average level when no warnings', async () => {
        const mockTanks: IrrigationTank[] = [
            {
                name: 'Tank 1',
                fillLevel: 90,
                isWarning: false,
                warningLevel: 20,
                sensorEntity: 'sensor.tank_1'
            },
            {
                name: 'Tank 2',
                fillLevel: 80,
                isWarning: false,
                warningLevel: 20,
                sensorEntity: 'sensor.tank_2'
            }
        ];

        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            {
                deviceId: 'selected_tent',
                name: 'Selected Tent',
                environmentAttributes: { irrigationTanks: mockTanks }
            } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        const avgBadge = element.shadowRoot?.querySelector('.avg-badge');
        expect(avgBadge).toBeTruthy();
        expect(avgBadge?.textContent).toContain('Avg 85%');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceTankCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-tank-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(3);
    });

    test('gets config element correctly', async () => {
        const editor = await GrowspaceTankCard.getConfigElement();
        expect(editor.tagName.toLowerCase()).toBe('growspace-tank-card-editor');
    });

    test('disconnectedCallback destroys store', async () => {
        const spy = vi.spyOn(element.store, 'destroy');
        element.disconnectedCallback();
        expect(spy).toHaveBeenCalled();
    });

    test('updates store on hass change', async () => {
        const spy = vi.spyOn(element.store, 'updateHass');
        element.hass = { ...element.hass, language: 'de' } as any;
        await element.updateComplete;
        expect(spy).toHaveBeenCalled();
    });
});
