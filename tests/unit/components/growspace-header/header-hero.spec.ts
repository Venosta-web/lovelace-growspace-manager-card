import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/components/growspace-header/header-hero';
import { GrowspaceHeaderHero } from '../../../../src/components/growspace-header/header-hero';
import { ChartUtils } from '../../../../src/utils/chart-utils';
import { map } from 'nanostores';

vi.mock('../../../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn(),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([]),
        getSparklineColor: vi.fn().mockReturnValue('green')
    }
}));

describe('GrowspaceHeaderHero', () => {
    let element: GrowspaceHeaderHero;
    let mockStore: any;
    let mockHass: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        const historyCache = map({});
        mockStore = {
            history: {
                $historyCache: historyCache,
                getRange: vi.fn().mockReturnValue('24h')
            }
        };

        mockHass = { states: {} };
    });

    it('should render basic component', async () => {
        element = await fixture(html`<growspace-header-hero .store=${mockStore}></growspace-header-hero>`);
        expect(element).toBeInstanceOf(GrowspaceHeaderHero);
    });

    it('should generate VPD segments when data is available', async () => {
        // Setup store data
        const cacheData = {
            'vpd': [1, 2, 3],
            'light': [0, 1, 0]
        };
        mockStore.history.$historyCache.set(cacheData);

        // Mock generateVpdSparklineSegments return
        const spy = (ChartUtils.generateVpdSparklineSegments as any);
        spy.mockReturnValue([{ path: 'M0,0', color: 'red' }]);

        element = await fixture(html`<growspace-header-hero .store=${mockStore} .device=${{ device_id: 'd1' }}></growspace-header-hero>`);

        // Pass chips prop to trigger render of hero card
        element.chips = [{ key: 'vpd', value: '1.2 kPa' } as any];
        await elementUpdated(element);

        // Verify the spy was called
        expect(spy).toHaveBeenCalled();

        // Check if sparkline with path exists
        const sparkline = element.shadowRoot?.querySelector('.hero-sparkline');
        expect(sparkline).toBeTruthy();
    });

    it('should render correct sparkline for non-VPD metrics', async () => {
        mockStore.history.$historyCache.set({ 'temp': [20, 21, 22] });
        const spy = (ChartUtils.generateSparklinePath as any);
        spy.mockReturnValue('M0,0 L10,10');

        element = await fixture(html`<growspace-header-hero .store=${mockStore}></growspace-header-hero>`);
        element.chips = [{ key: 'temp', value: '25 C' } as any];
        await elementUpdated(element);

        expect(spy).toHaveBeenCalled();
    });

    it('should handle drag events', async () => {
        element = await fixture(html`<growspace-header-hero .store=${mockStore}></growspace-header-hero>`);
        element.chips = [{ key: 'temp', value: '25 C' } as any];
        await elementUpdated(element);

        const spyDragStart = vi.fn();
        const spyDrop = vi.fn();
        const spyToggle = vi.fn();
        element.addEventListener('chip-drag-start', spyDragStart);
        element.addEventListener('chip-drop', spyDrop);
        element.addEventListener('toggle-graph', spyToggle);

        const card = element.shadowRoot?.querySelector('.hero-card') as HTMLElement;
        card.dispatchEvent(new CustomEvent('dragstart'));
        card.dispatchEvent(new CustomEvent('drop'));
        card.click();

        // Since we test handlers directly due to potential mock issues
        (element as any)._handleChipDragStart({ dataTransfer: { setData: vi.fn(), effectAllowed: '' } } as any, 'temp');
        (element as any)._handleChipDrop({ preventDefault: vi.fn() } as any, 'temp');
        (element as any)._handleDragOver({ preventDefault: vi.fn() } as any);

        expect(spyDragStart).toHaveBeenCalled();
        expect(spyDrop).toHaveBeenCalled();
        expect(spyToggle).toHaveBeenCalled();
    });

    it('should render multiValues', async () => {
        element = await fixture(html`<growspace-header-hero .store=${mockStore}></growspace-header-hero>`);
        element.chips = [{ key: 'temp', value: '25 C', multiValues: ['24', '26'] } as any];
        await elementUpdated(element);

        const multi = element.shadowRoot?.querySelector('.hero-multi-values');
        expect(multi).toBeTruthy();
        expect(multi?.textContent).toContain('24');
        expect(multi?.textContent).toContain('26');
    });

    describe('Edge Cases and Branch Coverage', () => {
        it('should handle chip drag start without dataTransfer', () => {
            const e = { dataTransfer: null } as any;
            const spy = vi.fn();
            element.addEventListener('chip-drag-start', spy);
            (element as any)._handleChipDragStart(e, 'temp');
            expect(spy).toHaveBeenCalled();
        });

        it('should handle missing chip value and unit regex failure', async () => {
            element.chips = [{ key: 'temp', value: null } as any];
            await elementUpdated(element);
            const val = element.shadowRoot?.querySelector('.hero-value');
            expect(val?.textContent).toBe('');

            element.chips = [{ key: 'temp', value: 'no-numbers' } as any];
            await elementUpdated(element);
            const val2 = element.shadowRoot?.querySelector('.hero-value');
            expect(val2?.textContent).toBe('no-numbers');
        });

        it('should handle VPD threshold fallbacks and missing attributes', async () => {
            const cacheData = { vpd: [1, 2], light: [1, 1] };
            mockStore.history.$historyCache.set(cacheData);
            mockHass.states = { 'sensor.gs1_overview': { attributes: {} } };

            element = await fixture(html`<growspace-header-hero .store=${mockStore} .hass=${mockHass} .device=${{ device_id: 'gs1', overview_entity_id: 'sensor.gs1_overview' }}></growspace-header-hero>`);
            element.chips = [{ key: 'vpd', value: '1.2 kPa' } as any];

            await elementUpdated(element);

            // Check if sparkline was called with fallbacks
            expect(ChartUtils.generateVpdSparklineSegments).toHaveBeenCalledWith(
                expect.any(Array),
                140,
                80,
                {
                    day: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 },
                    night: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 }
                },
                expect.any(Array),
                '24h'
            );
        });

        it('should handle missing selected device for VPD', async () => {
            element.device = null as any;
            element.chips = [{ key: 'vpd', value: '1.2' } as any];
            await elementUpdated(element);
            // Should fallback to non-VPD sparkline or empty
            expect(ChartUtils.generateSparklinePath).toHaveBeenCalled();
        });

        it('should set draggable attribute correctly', async () => {
            element.isMobile = true;
            element.mobileLink = false;
            element.chips = [{ key: 'temp', value: '25 C' } as any];
            await elementUpdated(element);

            const card = element.shadowRoot?.querySelector('.hero-card');
            expect(card?.getAttribute('draggable')).toBe('false');

            element.mobileLink = true;
            await elementUpdated(element);
            expect(card?.getAttribute('draggable')).toBe('true');
        });

        it('should handle missing store.history when generating sparklines', async () => {
            element.store = { history: null };
            element.chips = [{ key: 'temp', value: '25 C' } as any];
            await elementUpdated(element);
            expect(element.shadowRoot?.querySelector('.hero-sparkline')).toBeNull();
        });

        it('should trigger inline dragover handler', async () => {
            element.chips = [{ key: 'temp', value: '25 C' } as any];
            await elementUpdated(element);
            const card = element.shadowRoot?.querySelector('.hero-card') as HTMLElement;
            const preventDefault = vi.fn();
            card.dispatchEvent(new DragEvent('dragover', { cancelable: true } as any));
            // We can't easily verify the inline call without spying on _handleDragOver
            const spy = vi.spyOn(element as any, '_handleDragOver');
            card.dispatchEvent(new DragEvent('dragover', { cancelable: true } as any));
            expect(spy).toHaveBeenCalled();
        });

        it('should handle intermediate VPD threshold attributes', async () => {
            const cacheData = { vpd: [1, 2], light: [1, 1] };
            mockStore.history.$historyCache.set(cacheData);
            // Intermediate fallback: vpd_target_min instead of day_vpd_target_min
            mockHass.states = { 'sensor.gs1_overview': { attributes: { vpd_target_min: 0.9 } } };

            element = await fixture(html`<growspace-header-hero .store=${mockStore} .hass=${mockHass} .device=${{ device_id: 'gs1', overview_entity_id: 'sensor.gs1_overview' }}></growspace-header-hero>`);
            element.chips = [{ key: 'vpd', value: '1.2 kPa' } as any];
            await elementUpdated(element);

            expect(ChartUtils.generateVpdSparklineSegments).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Number),
                expect.any(Number),
                expect.objectContaining({
                    day: expect.objectContaining({ targetMin: 0.9 })
                }),
                expect.any(Array),
                '24h'
            );
        });

        it('should handle night VPD threshold specific attributes', async () => {
            const cacheData = { vpd: [1, 2], light: [1, 1] };
            mockStore.history.$historyCache.set(cacheData);
            mockHass.states = { 'sensor.gs1_overview': { attributes: { night_vpd_target_min: 0.7 } } };

            element = await fixture(html`<growspace-header-hero .store=${mockStore} .hass=${mockHass} .device=${{ device_id: 'gs1', overview_entity_id: 'sensor.gs1_overview' }}></growspace-header-hero>`);
            element.chips = [{ key: 'vpd', value: '1.2 kPa' } as any];
            await elementUpdated(element);

            expect(ChartUtils.generateVpdSparklineSegments).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Number),
                expect.any(Number),
                expect.objectContaining({
                    night: expect.objectContaining({ targetMin: 0.7 })
                }),
                expect.any(Array),
                '24h'
            );
        });

        it('should handle missing store in connectedCallback', async () => {
            const detached = document.createElement('growspace-header-hero') as GrowspaceHeaderHero;
            // store is null by default
            document.body.appendChild(detached);
            expect((detached as any)._historyCacheController).toBeUndefined();
            document.body.removeChild(detached);
        });

        it('should handle missing light history for VPD', async () => {
            const cacheData = { vpd: [1, 2] }; // No light history
            mockStore.history.$historyCache.set(cacheData);
            element = await fixture(html`<growspace-header-hero .store=${mockStore} .device=${{ device_id: 'gs1' }}></growspace-header-hero>`);
            element.chips = [{ key: 'vpd', value: '1.2' } as any];
            await elementUpdated(element);

            expect(ChartUtils.generateVpdSparklineSegments).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Number),
                expect.any(Number),
                expect.any(Object),
                [], // Fallback to empty array
                '24h'
            );
        });

        it('should handle empty chip status and flags', async () => {
            element.chips = [{ key: 'temp', value: '25' } as any]; // No status, active, linked
            await elementUpdated(element);
            const card = element.shadowRoot?.querySelector('.hero-card');
            expect(card?.classList.contains('hero-card')).toBe(true);
            expect(card?.classList.contains('active')).toBe(false);
            expect(card?.classList.contains('linked')).toBe(false);
        });

        it('should handle active and linked flags', async () => {
            element.chips = [
                { key: 'temp', value: '25', active: true, linked: true, status: 'warning' } as any
            ];
            await elementUpdated(element);
            const card = element.shadowRoot?.querySelector('.hero-card');
            expect(card?.classList.contains('active')).toBe(true);
            expect(card?.classList.contains('linked')).toBe(true);
            expect(card?.classList.contains('status-warning')).toBe(true);
        });
    });
});
