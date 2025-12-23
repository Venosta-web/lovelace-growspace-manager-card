import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceEnvChart } from '../../src/growspace-env-chart';
import { hassContext } from '../../src/context';
import { ContextProvider } from '@lit/context';
import { SensorHistories } from '../../src/types';

describe('GrowspaceEnvChart', () => {
    let element: GrowspaceEnvChart;
    let parent: HTMLElement;
    let hassMock: any;

    const mockDevice: any = {
        device_id: 'd1',
        name: 'Device 1',
        sensors: {},
        overview_entity_id: 'sensor.overview'
    };

    beforeEach(async () => {
        // Mock ResizeObserver globally before element creation
        (globalThis as any).ResizeObserver = class {
            observe = vi.fn();
            disconnect = vi.fn();
            unobserve = vi.fn();
        };

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

        parent = await fixture(html`
            <div>
                <growspace-env-chart .device=${mockDevice}></growspace-env-chart>
            </div>
        `);

        element = parent.querySelector('growspace-env-chart') as GrowspaceEnvChart;
        new ContextProvider(parent, hassContext, hassMock);

        // Initial update
        await element.updateComplete;
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
        const sensorHistory: SensorHistories = {
            'temp': [{ state: '22', last_changed: new Date(now).toISOString() }] as any,
            'humid': [{ state: '60', last_changed: new Date(now).toISOString() }] as any
        };
        const metricConfig = {
            'temp': { title: 'Temperature', unit: '°C', color: 'red' },
            'humid': { title: 'Humidity', unit: '%', color: 'blue' }
        };

        // Re-render with properties
        const el = await fixture(html`
            <growspace-env-chart
                .device=${mockDevice}
                .isCombined=${true}
                .metrics=${['temp', 'humid']}
                .metricConfig=${metricConfig}
                .sensorHistory=${sensorHistory}
            ></growspace-env-chart>
        `) as GrowspaceEnvChart;

        // Context needs to be provided to the new fixture if it depends on it, 
        // but for this test it seems mostly independent of hassContext unless checking thresholds.
        // We'll trust the default behavior or wrap if needed.

        const headers = el.shadowRoot?.querySelectorAll('.gs-legend-item');
        expect(headers?.length).toBe(2);

        // Unlink interactions
        const unlinkBtn = el.shadowRoot?.querySelector('ha-icon-button[title="Unlink Graphs"]');
        expect(unlinkBtn).toBeTruthy();
    });

    it('should handle resize and scrolling', async () => {
        // Mock specific behavior for this test if needed, or rely on global mock.
        // But we need to capture the callback to trigger it.

        let triggerResize: any;
        (globalThis as any).ResizeObserver = class {
            observe = vi.fn();
            disconnect = vi.fn();
            unobserve = vi.fn();
            constructor(cb: any) {
                triggerResize = cb;
            }
        };

        const now = Date.now();
        const history = {
            'temp': [
                { state: '22.5', last_changed: new Date(now - 1000 * 60 * 60).toISOString(), attributes: {} }
            ] as any
        };

        const wrapper = await fixture(html`
            <div style="width: 200px; display: block;">
                <growspace-env-chart
                    .device=${{ ...mockDevice, overview_entity_id: '' }}
                    .isCombined=${true}
                    .metrics=${['temp']}
                    .range=${'24h'}
                    .metricConfig=${{ 'temp': { title: 'Temperature', unit: '°C', color: 'red' } }}
                    .sensorHistory=${history}
                ></growspace-env-chart>
            </div>
        `);
        const el = wrapper.querySelector('growspace-env-chart') as GrowspaceEnvChart;

        // Force scroll state setup
        const chipsContainer = el.shadowRoot?.querySelector('.chips-scroll-container');
        expect(chipsContainer).toBeTruthy();

        if (chipsContainer) {
            Object.defineProperty(chipsContainer, 'scrollWidth', { value: 500, configurable: true });
            Object.defineProperty(chipsContainer, 'clientWidth', { value: 100, configurable: true });
            Object.defineProperty(chipsContainer, 'scrollLeft', { value: 50, configurable: true });

            // Trigger resize
            if (triggerResize) {
                triggerResize([], { contentRect: { width: 100 } });
            }
            await el.updateComplete;
            el.requestUpdate();
            await el.updateComplete;

            // Trigger scroll event manually
            chipsContainer.dispatchEvent(new Event('scroll'));
            await el.updateComplete;

            const leftArrow = el.shadowRoot?.querySelector('.scroll-nav.left');
            expect(leftArrow).toBeTruthy();
        }
    });

    it('should show tooltip on hover', async () => {
        vi.useFakeTimers();
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

        vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue(rect);

        container?.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: 400 // Middle
        }));

        await vi.runAllTimersAsync();
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip).toBeTruthy();
        expect(tooltip?.textContent).toContain('temp');

        vi.useRealTimers();
    });

    it('should render binary sensor graph correctly', async () => {
        const now = Date.now();
        element.metricKey = 'optimal';
        element.sensorHistory = {
            'optimal': [
                { state: 'on', last_changed: new Date(now - 3600000).toISOString() },
                { state: 'off', last_changed: new Date(now - 1800000).toISOString(), attributes: { reasons: ['Temp high'] } }
            ] as any
        };

        await element.updateComplete;

        const path = element.shadowRoot?.querySelector('path');
        expect(path).toBeTruthy();

        const headerValue = element.shadowRoot?.querySelector('.gs-env-graph-header div div[style*="font-size:1.2em"]');
        expect(headerValue?.textContent).toContain('Temp high');
    });

    it('should render VPD specific logic', async () => {
        const now = Date.now();
        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [
                { state: '1.0', last_changed: new Date(now - 3600000).toISOString() },
                { state: '0.2', last_changed: new Date(now).toISOString() }
            ] as any
        };

        await element.updateComplete;

        const segments = element.shadowRoot?.querySelectorAll('path[stroke-width="2.5"]');
        expect(segments?.length).toBeGreaterThan(0);
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
        const headerValue = element.shadowRoot?.querySelector('.gs-env-graph-header div div[style*="font-size:1.2em"]');
        expect(headerValue?.textContent).toContain('22.0');
    });

    it('should handle toggle graph event', async () => {
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

    it('should use fallback VPD thresholds when device has no overview entity', async () => {
        element.device = {
            device_id: 'd1',
            name: 'Device 1',
            sensors: {}
        } as any;

        const now = Date.now();
        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [{ state: '1.0', last_changed: new Date(now).toISOString() }] as any
        };

        await element.updateComplete;

        const paths = element.shadowRoot?.querySelectorAll('path[stroke]');
        expect(paths?.length).toBeGreaterThan(0);
    });

    it('should format tooltip for dehumidifier binary sensor', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        element.metricKey = 'dehumidifier';
        element.sensorHistory = {
            'dehumidifier': [
                { state: '1', last_changed: new Date(now - 1800000).toISOString() },
                { state: '0', last_changed: new Date(now).toISOString() }
            ] as any
        };
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
        const rect = { left: 0, width: 800, top: 0, height: 200 } as DOMRect;
        vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue(rect);

        container?.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: 700
        }));

        await vi.runAllTimersAsync();
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip).toBeTruthy();

        vi.useRealTimers();
    });

    it('should format tooltip for optimal sensor with reasons', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        element.metricKey = 'optimal';
        element.sensorHistory = {
            'optimal': [
                { state: 'off', last_changed: new Date(now).toISOString(), attributes: { reasons: ['Temp high', 'VPD low'] } }
            ] as any
        };
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
        const rect = { left: 0, width: 800, top: 0, height: 200 } as DOMRect;
        vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue(rect);

        container?.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: 400
        }));

        await vi.runAllTimersAsync();
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip).toBeTruthy();
        expect(tooltip?.textContent).toContain('optimal');

        vi.useRealTimers();
    });

    it('should format tooltip for exhaust/humidifier with state meta', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        element.metricKey = 'exhaust';
        element.sensorHistory = {
            'exhaust': [
                { state: '5', last_changed: new Date(now).toISOString(), attributes: {} }
            ] as any
        };

        await element.updateComplete;

        // Access internal _renderSeries to inject meta
        if ((element as any)._renderSeries && (element as any)._renderSeries[0]) {
            const series = (element as any)._renderSeries[0];
            if (series.points.length > 0) {
                series.points[series.points.length - 1].meta = { state: 'High' };
            }
        }

        element.requestUpdate();
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
        const rect = { left: 0, width: 800, top: 0, height: 200 } as DOMRect;
        vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue(rect);

        container?.dispatchEvent(new MouseEvent('mousemove', {
            bubbles: true,
            clientX: 700
        }));

        await vi.runAllTimersAsync();
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip).toBeTruthy();

        vi.useRealTimers();
    });

    it('should optimize updates when history content is identical', async () => {
        const now = Date.now();
        const history = { 'temp': [{ state: '20', last_changed: new Date(now).toISOString() }] as any };

        element.metricKey = 'temp';
        element.sensorHistory = history;
        await element.updateComplete;

        // Spy on internal method
        const spy = vi.spyOn(element as any, '_computeGraphSeries');

        // Update with DIFFERENT reference but SAME content
        element.sensorHistory = { 'temp': history.temp };
        await element.updateComplete;

        expect(spy).not.toHaveBeenCalled();

        // Update with different content
        element.sensorHistory = { 'temp': [{ state: '21', last_changed: new Date(now).toISOString() }] as any };
        await element.updateComplete;

        expect(spy).toHaveBeenCalled();
    });

    it('should handle complex VPD threshold logic', async () => {
        // Mock device with specific attributes for day/night
        const hassVpdCheck = {
            states: {
                'sensor.overview': {
                    attributes: {
                        // Day specific
                        day_vpd_target_min: 0.8,
                        day_vpd_target_max: 1.2,
                        day_vpd_danger_min: 0.4,
                        day_vpd_danger_max: 1.6,
                        // Night (implied or explicit)
                        night_vpd_target_min: 0.5,
                        night_vpd_target_max: 1.0,
                        night_vpd_danger_min: 0.2,
                        night_vpd_danger_max: 1.2
                    }
                }
            }
        };

        const parentVpd = await fixture(html`<div><growspace-env-chart .device=${mockDevice}></growspace-env-chart></div>`);
        const elVpd = parentVpd.querySelector('growspace-env-chart') as GrowspaceEnvChart;
        new ContextProvider(parentVpd, hassContext, hassVpdCheck);

        const now = Date.now();
        // Create history spanning day logic
        const history = {
            'vpd': [
                { state: '1.0', last_changed: new Date(now - 3600000).toISOString() }, // Optimal day
                { state: '0.9', last_changed: new Date(now).toISOString() }
            ] as any,
            'light': [ // Light always ON = Day
                { state: 'on', last_changed: new Date(now - 3600000).toISOString() },
                { state: 'on', last_changed: new Date(now).toISOString() }
            ] as any
        };

        elVpd.metricKey = 'vpd';
        elVpd.sensorHistory = history;
        await elVpd.updateComplete;

        const segments = elVpd.shadowRoot?.querySelectorAll('path[stroke]');
        expect(segments?.length).toBeGreaterThan(0);

        // Verify optimal color usage (green #4caf50)
        const greenPath = elVpd.shadowRoot?.querySelector('path[stroke="#4caf50"]');
        expect(greenPath).toBeTruthy();
    });

    it('should scale flat lines correctly', async () => {
        const now = Date.now();
        element.metricKey = 'temp';
        // Constant value 20
        element.sensorHistory = {
            'temp': [
                { state: '20.0', last_changed: new Date(now - 3600000).toISOString() },
                { state: '20.0', last_changed: new Date(now).toISOString() }
            ] as any
        };
        await element.updateComplete;

        const series = (element as any)._renderSeries[0];
        // min should be 19, max 21
        expect(series.min).toBe(19);
        expect(series.max).toBe(21);
    });

    it('should use fixed range for specific metrics', async () => {
        const now = Date.now();
        element.metricKey = 'circulation_fan';
        element.sensorHistory = {
            'circulation_fan': [
                { state: '5', last_changed: new Date(now).toISOString() }
            ] as any
        };
        await element.updateComplete;

        const series = (element as any)._renderSeries[0];
        expect(series.min).toBe(0);
        expect(series.max).toBe(10);
    });

    it('should handle scroll interaction in combined header', async () => {
        const now = Date.now();
        const history = { 'temp': [{ state: '20', last_changed: new Date(now).toISOString() }] as any };

        // Force scrollable state
        element.isCombined = true;
        element.metrics = ['temp', 'humid', 'vpd', 'co2', 'light', 'irrigation']; // Many metrics
        element.sensorHistory = history;
        // Mock internal checkScroll to set state
        (element as any)._canScrollRight = true;

        await element.updateComplete;

        const rightArrow = element.shadowRoot?.querySelector('.scroll-nav.right') as HTMLElement;
        expect(rightArrow).toBeTruthy();

        // Spy on scrollBy
        const container = element.shadowRoot?.querySelector('.chips-scroll-container');
        const scrollSpy = vi.fn();
        if (container) container.scrollBy = scrollSpy;

        rightArrow.click();
        expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ left: 200 }));
    });

    it('should dispatch unlink events', async () => {
        const now = Date.now();
        element.isCombined = true;
        element.metrics = ['temp'];
        element.sensorHistory = { 'temp': [{ state: '20', last_changed: new Date(now).toISOString() }] as any };
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('unlink-graph', listener);
        element.addEventListener('unlink-graphs', listener);

        const chip = element.shadowRoot?.querySelector('.gs-legend-item') as HTMLElement;
        chip.click();
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: 'temp' }));

        const unlinkAll = element.shadowRoot?.querySelector('ha-icon-button[title="Unlink Graphs"]') as HTMLElement;
        unlinkAll.click();
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: -1 }));
    });
    it('should handle hover over binary search boundaries', async () => {
        vi.useFakeTimers();
        const now = Date.now();
        element.metricKey = 'temp';
        // Create points with specific timing to test binary search
        const history = {
            'temp': [
                { state: '10', last_changed: new Date(now - 10000).toISOString() },
                { state: '20', last_changed: new Date(now - 5000).toISOString() },
                { state: '30', last_changed: new Date(now).toISOString() }
            ] as any
        };
        element.sensorHistory = history;
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
        const rect = { left: 0, width: 800, top: 0, height: 200 } as DOMRect;
        vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue(rect);

        // Hover start (first point)
        container?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0 }));
        await vi.runAllTimersAsync();

        let tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip?.textContent).toContain('10');

        // Hover end (last point)
        container?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 790 }));
        await vi.runAllTimersAsync();

        // Force update since tooltip content changes
        await element.updateComplete;

        tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
        expect(tooltip?.textContent).toContain('30');

        vi.useRealTimers();
    });

    it('should render correct Y-Axis labels', async () => {
        // Test numeric 
        const numericSeries = (element as any)._renderYAxisHTML(10, 20, '°C');
        const numericTemplate = await fixture(html`<div>${numericSeries}</div>`);
        expect(numericTemplate.textContent).toContain('20°C');
        expect(numericTemplate.textContent).toContain('10°C');

        // Test binary/state
        const stateSeries = (element as any)._renderYAxisHTML(0, 1, 'state');
        const stateTemplate = await fixture(html`<div>${stateSeries}</div>`);
        expect(stateTemplate.textContent).toContain('ON');
        expect(stateTemplate.textContent).toContain('OFF');

        // Test inferred binary (min 0 max 1)
        const inferredTemplate = await fixture(html`<div>${(element as any)._renderYAxisHTML(0, 1, '')}</div>`);
        expect(inferredTemplate.textContent).toContain('ON');
        expect(inferredTemplate.textContent).toContain('OFF');
    });

    it('should adjust min/max for constant values', async () => {
        const now = Date.now();
        element.metricKey = 'temp';
        element.sensorHistory = {
            'temp': [
                { state: '25', last_changed: new Date(now).toISOString() }
            ] as any
        };
        await element.updateComplete;

        const series = (element as any)._renderSeries[0];
        // Should paddle range
        expect(series.min).toBe(24);
        expect(series.max).toBe(26);
    });

    it('should handle missing data gracefully (empty array)', async () => {
        element.metricKey = 'temp';
        element.sensorHistory = { 'temp': [] };
        await element.updateComplete;

        const card = element.shadowRoot?.querySelector('.gs-env-graph-card');
        expect(card?.textContent).toContain('No Data');
    });

    it('should project last known state forward if no recent updates', async () => {
        const now = Date.now();
        element.metricKey = 'temp';
        // Data completely out of range (too old)
        element.sensorHistory = {
            'temp': [
                { state: '25.0', last_changed: new Date(now - 100000000).toISOString() }
            ] as any
        };
        element.range = '1h';
        await element.updateComplete;

        const card = element.shadowRoot?.querySelector('.gs-env-graph-card');
        expect(card?.textContent).not.toContain('No Data');

        const headerValue = element.shadowRoot?.querySelector('.gs-env-graph-header div div[style*="font-size:1.2em"]');
        expect(headerValue?.textContent).toContain('25.0');
    });

    it('should render VPD segments with night cycle', async () => {
        const now = Date.now();
        const history = {
            'vpd': [
                { state: '1.0', last_changed: new Date(now - 3600000).toISOString() },
                { state: '0.8', last_changed: new Date(now).toISOString() }
            ] as any,
            'light': [
                { state: 'off', last_changed: new Date(now - 3600000).toISOString() },
                { state: 'off', last_changed: new Date(now).toISOString() }
            ] as any
        };

        element.metricKey = 'vpd';
        element.sensorHistory = history;
        await element.updateComplete;

        // Just verify it renders without throwing
        const segments = element.shadowRoot?.querySelectorAll('path[stroke]');
        expect(segments?.length).toBeGreaterThan(0);
    });

    it('should handle all metric type variations correctly', async () => {
        const now = Date.now();
        element.isCombined = true;
        // Test all special handling keys
        element.metrics = ['exhaust', 'humidifier', 'dehumidifier', 'optimal', 'light', 'irrigation', 'drain'];

        // Setup history for all of them
        const history = {};
        element.metrics.forEach(k => {
            history[k] = [{ state: k === 'optimal' ? 'on' : '5', last_changed: new Date(now).toISOString() }];
        });
        element.sensorHistory = history as any;

        await element.updateComplete;

        const seriesList = (element as any)._renderSeries;
        expect(seriesList.length).toBe(element.metrics.length);

        // Verify min/max clamping logic
        const exhaust = seriesList.find(s => s.id === 'exhaust');
        expect(exhaust.min).toBe(0);
        expect(exhaust.max).toBe(10);

        const dehum = seriesList.find(s => s.id === 'dehumidifier');
        expect(dehum.min).toBe(0);
        expect(dehum.max).toBe(1);

        const optimal = seriesList.find(s => s.id === 'optimal');
        expect(optimal.min).toBe(0);
        expect(optimal.max).toBe(1);
    });

    it('should handle time ranges correctly', async () => {
        // Ensure data exists so graph renders (not empty state)
        element.metricKey = 'temp';
        element.sensorHistory = { 'temp': [{ state: '20', last_changed: new Date().toISOString() }] as any };

        const ranges = ['1h', '6h', '7d', '24h'] as const;
        for (const r of ranges) {
            element.range = r;
            await element.updateComplete;

            // Query for the specific label text
            const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
            const labels = Array.from(container?.querySelectorAll('div') || []);
            const rangeLabel = labels.find(div => div.textContent?.includes(r === '24h' ? '-24h' : `-${r}`));

            expect(rangeLabel).toBeTruthy();
        }
    });

    it('should invalidate rect cache on resize', async () => {
        element.metricKey = 'temp';
        element.sensorHistory = { 'temp': [{ state: '20', last_changed: new Date().toISOString() }] as any };
        await element.updateComplete;

        (element as any)._cachedChartRect = { width: 100 };

        // Trigger resize
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('scroll'));

        expect((element as any)._cachedChartRect).toBeNull();
    });
});
