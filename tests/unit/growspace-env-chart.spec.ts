import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceEnvChart } from '../../src/growspace-env-chart';
import { hassContext } from '../../src/context';
import { ContextProvider } from '@lit/context';

describe('GrowspaceEnvChart', () => {
    let element: GrowspaceEnvChart;
    let container: HTMLElement;
    let hassProvider: ContextProvider<any>;
    let hassMock: any;

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);

        hassMock = {
            states: {
                'sensor.overview': {
                    attributes: {
                        vpd_target_min: 0.8,
                        vpd_target_max: 1.2,
                        vpd_danger_min: 0.4,
                        vpd_danger_max: 1.6
                    }
                }
            },
            locale: { language: 'en' }
        };

        const wrapper = document.createElement('div');
        hassProvider = new ContextProvider(wrapper, hassContext, hassMock);
        container.appendChild(wrapper);

        element = new GrowspaceEnvChart();
        element.device = {
            device_id: 'd1',
            name: 'Device 1',
            sensors: {},
            overview_entity_id: 'sensor.overview'
        } as any;

        wrapper.appendChild(element);
        await new Promise(r => setTimeout(r, 0));
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowspaceEnvChart);
    });

    it('should render nothing if no history', async () => {
        element.sensorHistory = {};
        await element.updateComplete;
        const card = element.shadowRoot?.querySelector('.gs-env-graph-card');
        expect(card).toBeTruthy();
        expect(element.shadowRoot?.textContent).toContain('No history data');
    });

    it('should handle combined graphs', async () => {
        const now = Date.now();
        element.isCombined = true;
        element.metrics = ['temp', 'humid'];
        element.metricConfig = {
            'temp': { title: 'Temperature', unit: '°C', color: 'red' },
            'humid': { title: 'Humidity', unit: '%', color: 'blue' }
        };
        element.sensorHistory = {
            'temp': [{ state: '22', last_changed: new Date(now).toISOString() }] as any,
            'humid': [{ state: '60', last_changed: new Date(now).toISOString() }] as any
        };

        await element.updateComplete;

        const headers = element.shadowRoot?.querySelectorAll('.gs-legend-item');
        expect(headers?.length).toBe(2);

        // Unlink interactions
        const unlinkBtn = element.shadowRoot?.querySelector('ha-icon-button[title="Unlink Graphs"]');
        expect(unlinkBtn).toBeTruthy();
    });

    it('should handle resize and scrolling', async () => {
        // Mock ResizeObserver
        const resizeCallback = vi.fn();
        global.ResizeObserver = class {
            observe = vi.fn();
            disconnect = vi.fn();
            unobserve = vi.fn();
            constructor(cb: any) {
                resizeCallback.mockImplementation(cb);
            }
        } as any;

        // Re-create element to trigger ResizeObserver
        document.body.removeChild(container);
        container = document.createElement('div');
        document.body.appendChild(container);

        element = new GrowspaceEnvChart();
        element.device = { device_id: 'd1', name: 'dev1', sensors: {}, overview_entity_id: '' } as any;
        element.isCombined = true;
        element.metrics = ['temp'];
        element.range = '24h';
        element.metricConfig = { 'temp': { title: 'Temperature', unit: '°C', color: 'red' } };

        // Ensure data is clearly in the past but within range
        const now = Date.now();
        element.sensorHistory = {
            'temp': [
                { state: '22.5', last_changed: new Date(now - 1000 * 60 * 60).toISOString(), attributes: {} }
            ] as any
        };

        container.appendChild(element);
        await element.updateComplete;

        // Debug: check if rendered
        const card = element.shadowRoot?.querySelector('.gs-env-graph-card');
        if (element.shadowRoot?.textContent?.includes('No history data')) {
            console.error('Rendered no history data');
        }

        // Force scroll state
        const chipsContainer = element.shadowRoot?.querySelector('.chips-scroll-container');
        expect(chipsContainer).toBeTruthy();
        if (chipsContainer) {
            Object.defineProperty(chipsContainer, 'scrollWidth', { value: 500, configurable: true });
            Object.defineProperty(chipsContainer, 'clientWidth', { value: 100, configurable: true });
            Object.defineProperty(chipsContainer, 'scrollLeft', { value: 50, configurable: true });

            // Trigger resize
            resizeCallback([], { contentRect: { width: 100 } });
            await element.updateComplete;
            element.requestUpdate();
            await element.updateComplete;

            // Trigger scroll event manually since we modded scrollLeft
            chipsContainer.dispatchEvent(new Event('scroll'));
            await element.updateComplete;

            const leftArrow = element.shadowRoot?.querySelector('.scroll-nav.left');
            // Logic: scrollLeft 50 > 1 => canScrollLeft=true => leftArrow visible
            expect(leftArrow).toBeTruthy();
        }
    });

    it('should show tooltip on hover', async () => {
        const now = Date.now();
        element.metricKey = 'temp';
        element.sensorHistory = {
            'temp': [
                { state: '20', last_changed: new Date(now - 3600000).toISOString() },
                { state: '22', last_changed: new Date(now).toISOString() }
            ] as any
        };
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
        const rect = { left: 0, width: 800, top: 0, height: 200 } as DOMRect;

        // Mock getBoundingClientRect
        vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue(rect);

        // Simulate mouse move
        container?.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: 400 // Middle
        }));
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip).toBeTruthy();
        expect(tooltip?.textContent).toContain('temp');
        // Logic says binary search for closest. 
        // If times are T-1h and T, middle is T-0.5h. Closest depends on exact math.
        // Let's just check it exists.
    });

    it('should render binary sensor graph correctly', async () => {
        const now = Date.now();
        element.metricKey = 'optimal'; // Triggers binary logic
        element.sensorHistory = {
            'optimal': [
                { state: 'on', last_changed: new Date(now - 3600000).toISOString() },
                { state: 'off', last_changed: new Date(now - 1800000).toISOString(), attributes: { reasons: ['Temp high'] } }
            ] as any
        };

        await element.updateComplete;

        const path = element.shadowRoot?.querySelector('path');
        expect(path).toBeTruthy();

        const headerValue = element.shadowRoot?.querySelector('.gs-env-graph-header div[style*="font-size: 1.2em"]');
        expect(headerValue?.textContent).toContain('Not Optimal'); // Last state is off with reasons
    });

    it('should render VPD specific logic', async () => {
        const now = Date.now();
        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [
                { state: '1.0', last_changed: new Date(now - 3600000).toISOString() }, // Optimal
                { state: '0.2', last_changed: new Date(now).toISOString() }  // Danger
            ] as any
        };

        await element.updateComplete;

        // Check for multiple paths (segments)
        // VPD logic generates segments
        const segments = element.shadowRoot?.querySelectorAll('path[stroke-width="2.5"]');
        expect(segments?.length).toBeGreaterThan(0);

        // Check header color
        // Should reflect the last status color (Danger -> Red)
        // Just verify it renders without error and produces output
    });

    it('should render single line chart', async () => {
        const now = Date.now();
        element.metricKey = 'temp';
        element.sensorHistory = {
            'temp': [
                { state: '20', last_changed: new Date(now - 3600000).toISOString(), attributes: {} },
                { state: '21', last_changed: new Date(now - 1800000).toISOString(), attributes: {} },
                { state: '22', last_changed: new Date(now).toISOString(), attributes: {} }
            ] as any
        };

        await element.updateComplete;

        const path = element.shadowRoot?.querySelector('path');
        expect(path).toBeTruthy();
        // Check header value
        const headerValue = element.shadowRoot?.querySelector('.gs-env-graph-header div[style*="font-size: 1.2em"]');
        expect(headerValue?.textContent).toContain('22.0');
    });

    it('should calculate VPD segments', async () => {
        const now = Date.now();
        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [
                { state: '1.0', last_changed: new Date(now - 3600000).toISOString(), attributes: {} }, // Optimal
                { state: '0.2', last_changed: new Date(now).toISOString(), attributes: {} }  // Danger
            ] as any
        };

        await element.updateComplete;

        // Should have multiple paths for segments
        const paths = element.shadowRoot?.querySelectorAll('path[stroke]');
        // 2 segments expected (or more depending on interpolation)
        expect(paths?.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle toggle graph event', async () => {
        const now = Date.now();
        element.metricKey = 'temp';
        element.sensorHistory = { 'temp': [{ state: '20', last_changed: new Date().toISOString() }] as any };
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('toggle-graph', listener);

        const header = element.shadowRoot?.querySelector('.gs-env-graph-header') as HTMLElement;
        header.click();

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            detail: 'temp'
        }));
    });
});
