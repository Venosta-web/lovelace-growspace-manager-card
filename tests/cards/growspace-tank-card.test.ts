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
vi.mock('../../src/features/shared/ui/error-boundary', () => ({
    ErrorBoundary: class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
        }
    }
}));
// We don't necessarily need to mock the editor class itself if we just check tag name
vi.mock('../../src/cards/editors/growspace-tank-card-editor', () => ({
    GrowspaceTankCardEditor: class extends HTMLElement {}
}));

describe('GrowspaceTankCard', () => {
    let element: GrowspaceTankCard;

    beforeEach(async () => {
        // Create element with hass already set to avoid the "Home Assistant not available" flash
        const mockHass = {
            states: {},
            callService: vi.fn(),
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}),
                subscribeEvents: vi.fn().mockResolvedValue(() => {}),
            },
            language: 'en',
            themes: { theme: 'default' },
        };
        element = await fixture<GrowspaceTankCard>(html`
            <growspace-tank-card .hass=${mockHass}></growspace-tank-card>
        `);
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
        element.hass = undefined as any;
        await element.updateComplete;

        const errorDiv = element.shadowRoot?.querySelector('.error');
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
        // Added plants: [] and environmentAttributes to avoid store crashes and mapping issues
        element.store.data.$devices.set([
            { deviceId: 'wrong_device', name: 'Wrong Tent', environmentAttributes: {}, plants: [] } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
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
                environmentAttributes: { irrigationTanks: [] },
                plants: []
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
                environmentAttributes: { irrigationTanks: mockTanks },
                plants: []
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

    test('renders tanks with edge case data correctly', async () => {
        const mockTanks: IrrigationTank[] = [
            {
                name: 'Static Tank',
                fillLevel: 50,
                isWarning: false,
                depletionStatus: 'static',
                warningLevel: 20,
                sensorEntity: 'sensor.tank_3'
            },
            {
                name: 'Unknown Tank',
                fillLevel: null as any,
                isWarning: false,
                depletionStatus: 'unknown' as any,
                warningLevel: 20,
                sensorEntity: 'sensor.tank_4'
            }
        ];

        element.store.ui.$isLoading.set(false);
        element.store.data.$devices.set([
            {
                deviceId: 'selected_tent',
                name: 'Selected Tent',
                environmentAttributes: { irrigationTanks: mockTanks },
                plants: []
            } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        const tankCards = element.shadowRoot?.querySelectorAll('.tank-card');
        
        // Static tank
        expect(tankCards?.[0].querySelector('.depletion-label')?.textContent).toContain('— Stable');
        
        // Null fill level
        expect(tankCards?.[1].querySelector('.percentage-text')?.textContent).toContain('N/A');
        expect(tankCards?.[1].querySelector('.depletion-label')).toBeFalsy();
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
                environmentAttributes: { irrigationTanks: mockTanks },
                plants: []
            } as any
        ]);
        element.store.data.$selectedDevice.set('selected_tent');
        await element.updateComplete;

        const avgBadge = element.shadowRoot?.querySelector('.avg-badge');
        expect(avgBadge).toBeTruthy();
        expect(avgBadge?.textContent).toContain('Avg 85%');
    });

    test('getCardSize returns expected size from component', () => {
        expect(element.getCardSize()).toBe(3);
    });

    test('getStubConfig returns expected config from component', () => {
        const stub = GrowspaceTankCard.getStubConfig();
        expect(stub).toEqual({
            type: 'custom:growspace-tank-card',
            default_growspace: ''
        });
    });

    test('getConfigElement returns editor element', async () => {
        const el = await GrowspaceTankCard.getConfigElement();
        expect(el.tagName.toLowerCase()).toBe('growspace-tank-card-editor');
    });

    test('disconnectedCallback destroys store', () => {
        const storeSpy = vi.spyOn(element.store, 'destroy');
        element.disconnectedCallback();
        expect(storeSpy).toHaveBeenCalled();
    });

    test('stale counter triggers data refresh', async () => {
        const refreshSpy = vi.spyOn(element.store.syncService, 'refreshGrowspaceData');
        element.store.data.$staleCounter.set(element.store.data.$staleCounter.get() + 1);
        await Promise.resolve();
        expect(refreshSpy).toHaveBeenCalled();
    });

    test('selectedDevice getter returns value from store', () => {
        element.store.data.$selectedDevice.set('test_device');
        expect(element.selectedDevice).toBe('test_device');
    });

    test('_handleError logs error to console', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Test error');
        const errorInfo = { componentStack: 'stack' };
        
        (element as any)._handleError(error, errorInfo);
        
        expect(consoleSpy).toHaveBeenCalledWith('Growspace Tank Card caught error:', error, errorInfo);
        consoleSpy.mockRestore();
    });
});
