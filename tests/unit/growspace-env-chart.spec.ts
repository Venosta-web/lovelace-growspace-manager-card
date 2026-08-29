/**
 * `<growspace-env-chart>` — component-level behaviour only.
 *
 * Since ADR-0030 the chart derives nothing: it receives a Metric Descriptor table,
 * asks the Env Series builder for value-space series, and turns those into SVG at
 * its own width and height. Derivation is specified in `env-series.test.ts` and
 * `metric-descriptors.test.ts`; what remains here is what only the element can do —
 * geometry and axis rendering, chip scrolling, tooltips and their RAF handling,
 * resize observers, event dispatch, and the no-data render.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceEnvChart } from '../../src/growspace-env-chart';
import { hassContext } from '../../src/context';
import { ContextProvider } from '@lit/context';
import { computeMetricDescriptors } from '../../src/slices/metric-descriptors';
import { MetricKey, StatusLevel, STATUS_COLORS } from '../../src/features/environment/constants';

const OVERVIEW_ENTITY = {
  attributes: {
    vpd_target_min: 0.8,
    vpd_target_max: 1.2,
    vpd_danger_min: 0.4,
    vpd_danger_max: 1.6,
  },
};

const DESCRIPTORS = computeMetricDescriptors(null, {}, OVERVIEW_ENTITY);

function reading(msAgo: number, state: string, attributes: Record<string, unknown> = {}) {
  return {
    state,
    attributes,
    last_changed: new Date(Date.now() - msAgo).toISOString(),
  } as any;
}

describe('GrowspaceEnvChart', () => {
  let element: GrowspaceEnvChart;
  let parent: HTMLElement;
  let hassMock: any;

  const mockDevice: any = {
    deviceId: 'd1',
    name: 'Device 1',
    sensors: {},
    overviewEntityId: 'sensor.overview',
  };

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    };

    hassMock = {
      states: { 'sensor.overview': OVERVIEW_ENTITY },
      locale: { language: 'en' },
    };

    parent = await fixture(html`
      <div>
        <growspace-env-chart
          .device=${mockDevice}
          .descriptors=${DESCRIPTORS}
        ></growspace-env-chart>
      </div>
    `);

    element = parent.querySelector('growspace-env-chart') as GrowspaceEnvChart;
    new ContextProvider(parent, hassContext, hassMock);

    await element.updateComplete;
  });

  /** Drive one metric through the chart with the real descriptor table. */
  async function showMetric(metricKey: string, ...entries: any[]) {
    element.metricKey = metricKey;
    element.sensorHistory = { [metricKey]: entries } as any;
    await element.updateComplete;
  }

  async function showCombined(history: Record<string, any[]>) {
    element.isCombined = true;
    element.metrics = Object.keys(history);
    element.sensorHistory = history as any;
    await element.updateComplete;
  }

  function headerValue() {
    return element.shadowRoot?.querySelector(
      '.gs-env-graph-header div div[style*="font-size:1.2em"]'
    )?.textContent;
  }

  describe('render guards', () => {
    it('should be defined', () => {
      expect(element).toBeInstanceOf(GrowspaceEnvChart);
    });

    it('renders the no-data state when there is no history', async () => {
      element.sensorHistory = {};
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector('.gs-env-graph-card')).toBeTruthy();
      expect(element.shadowRoot?.textContent).toContain('No history data');
    });

    it('renders the no-data state for a metric whose history is empty', async () => {
      await showMetric(MetricKey.TEMPERATURE);

      expect(element.shadowRoot?.querySelector('.gs-env-graph-card')?.textContent).toContain(
        'No Data'
      );
    });

    it('renders nothing at all without a device', async () => {
      element.device = undefined;
      await element.updateComplete;

      expect(element.shadowRoot?.querySelector('.gs-env-graph-card')).toBeNull();
    });

    it('omits the icon in the no-data header when none is set', async () => {
      element.icon = '';
      element.title = 'Test Metric';
      element.sensorHistory = {};
      await element.updateComplete;

      const header = element.shadowRoot?.querySelector('.gs-env-graph-header');
      expect(header?.textContent).toContain('Test Metric');
      expect(header?.textContent).toContain('No Data');
      expect(element.shadowRoot?.querySelector('ha-icon')).toBeFalsy();
    });

    it('draws no trace for a series with an empty path', async () => {
      (element as any)._renderSeries = [
        {
          id: MetricKey.TEMPERATURE,
          title: 'Temp',
          color: 'red',
          unit: '°C',
          icon: '',
          points: [{ time: Date.now(), value: 20 }],
          path: '',
          min: 0,
          max: 100,
          avg: 50,
          fillType: 'gradient',
        },
      ];
      await element.updateComplete;

      const svg = element.shadowRoot?.querySelector('svg.chart-svg');
      expect(svg).toBeTruthy();
      expect(svg?.querySelector('path[stroke="red"]')).toBeNull();
    });

    it('renders a placeholder header value for a series with no points', async () => {
      (element as any)._renderSeries = [
        {
          id: MetricKey.TEMPERATURE,
          title: 'Temp',
          color: 'red',
          unit: '°C',
          icon: '',
          points: [],
          path: '',
          min: 0,
          max: 100,
          avg: 0,
          fillType: 'gradient',
        },
      ];
      await element.updateComplete;

      expect(headerValue()).toBe('-');
    });
  });

  describe('geometry and axes', () => {
    async function showTemperatureLimit(low: number | null, high: number | null) {
      element.descriptors = computeMetricDescriptors(null, {}, undefined, {
        deviceId: 'd1',
        name: 'Tent',
        biologicalMetrics: { granularStage: 'veg' },
        environmentAttributes: {
          circulationFanConfig: {
            critical_temp_low: low,
            critical_temp_high: high,
          },
        },
        irrigationConfig: {},
      } as any);
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '20'), reading(1_800_000, '24'));
    }

    it('renders a trace and the latest value for a single metric', async () => {
      await showMetric(
        MetricKey.TEMPERATURE,
        reading(3600000, '20'),
        reading(1800000, '21'),
        reading(0, '22')
      );

      expect(element.shadowRoot?.querySelector('path')).toBeTruthy();
      expect(headerValue()).toContain('22.0');
    });

    it('renders a binary metric with its reason as the header value', async () => {
      await showMetric(
        MetricKey.OPTIMAL,
        reading(3600000, 'on'),
        reading(1800000, 'off', { reasons: ['Temp high'] })
      );

      expect(element.shadowRoot?.querySelector('path')).toBeTruthy();
      expect(headerValue()).toContain('Temp high');
    });

    it('paints VPD status bands as their own strokes', async () => {
      await showMetric(MetricKey.VPD, reading(3600000, '1.0'), reading(0, '0.2'));

      const bands = element.shadowRoot?.querySelectorAll('path[stroke-width="2.5"]');
      expect(bands?.length).toBeGreaterThan(0);
    });

    it('colours a VPD band by its status', async () => {
      element.sensorHistory = {
        [MetricKey.VPD]: [reading(3600000, '1.0'), reading(0, '0.9')],
        [MetricKey.LIGHT]: [reading(3600000, 'on'), reading(0, 'on')],
      } as any;
      element.metricKey = MetricKey.VPD;
      await element.updateComplete;

      expect(
        element.shadowRoot?.querySelector(`path[stroke="${STATUS_COLORS[StatusLevel.OPTIMAL]}"]`)
      ).toBeTruthy();
    });

    it('falls back to the VPD colour for an unknown status', () => {
      expect((element as any)._getVpdStatusColor('unknown')).toBe('#9c27b0');
      expect((element as any)._getVpdStatusColor('danger')).toBe(STATUS_COLORS[StatusLevel.DANGER]);
    });

    it('renders an in-range Limit as a tight-dashed status-coloured line', async () => {
      await showTemperatureLimit(null, 22);

      const mark = element.shadowRoot?.querySelector(
        '[data-guide-id="circulation-critical-temperature-high"]'
      );
      expect(mark?.tagName.toLowerCase()).toBe('line');
      expect(mark?.getAttribute('data-guide-placement')).toBe('line');
      expect(mark?.getAttribute('stroke')).toBe(STATUS_COLORS[StatusLevel.DANGER]);
      expect(mark?.getAttribute('stroke-dasharray')).toBe('2 2.5');
      expect(element.shadowRoot?.querySelector('.gs-guide-label')).toBeNull();
    });

    it('renders far Limits as chevrons at the edge each one crossed', async () => {
      await showTemperatureLimit(0, 100);

      const low = element.shadowRoot?.querySelector(
        '[data-guide-id="circulation-critical-temperature-low"]'
      );
      const high = element.shadowRoot?.querySelector(
        '[data-guide-id="circulation-critical-temperature-high"]'
      );
      expect(low?.tagName.toLowerCase()).toBe('path');
      expect(low?.getAttribute('data-guide-placement')).toBe('lower-edge');
      expect(high?.tagName.toLowerCase()).toBe('path');
      expect(high?.getAttribute('data-guide-placement')).toBe('upper-edge');
    });

    it('labels the Y axis numerically, and as ON/OFF for binary ranges', async () => {
      const numeric = await fixture(
        html`<div>${(element as any)._renderYAxisHTML(10, 20, '°C')}</div>`
      );
      expect(numeric.textContent).toContain('20°C');
      expect(numeric.textContent).toContain('10°C');

      const stated = await fixture(
        html`<div>${(element as any)._renderYAxisHTML(0, 1, 'state')}</div>`
      );
      expect(stated.textContent).toContain('ON');
      expect(stated.textContent).toContain('OFF');

      const inferred = await fixture(
        html`<div>${(element as any)._renderYAxisHTML(0, 1, '')}</div>`
      );
      expect(inferred.textContent).toContain('ON');
      expect(inferred.textContent).toContain('OFF');
    });

    it.each(['1h', '6h', '24h', '7d'] as const)(
      'caps the X axis with the %s range',
      async (range) => {
        await showMetric(MetricKey.TEMPERATURE, reading(0, '20'));
        element.range = range;
        await element.updateComplete;

        const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
        const labels = Array.from(container?.querySelectorAll('span, div') || []);
        expect(labels.find((el) => el.textContent?.includes(`-${range}`))).toBeTruthy();
      }
    );
  });

  describe('tooltip', () => {
    it('shows a tooltip on hover', async () => {
      vi.useFakeTimers();
      await showMetric(MetricKey.TEMPERATURE, reading(3600000, '20'), reading(0, '22'));

      const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
      vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 800,
        top: 0,
        height: 200,
      } as DOMRect);

      container?.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 400,
          pointerId: 1,
          pointerType: 'mouse',
        })
      );
      await vi.runAllTimersAsync();
      await element.updateComplete;

      const tooltip = element.shadowRoot?.querySelector('.gs-tooltip');
      expect(tooltip?.textContent).toContain('Temperature');

      vi.useRealTimers();
    });

    it('shows optimal-band and unlabeled Limit values in the scrub tooltip', async () => {
      vi.useFakeTimers();
      await showMetric(MetricKey.VPD, reading(3_600_000, '1.0'), reading(0, '1.1'));

      const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
      vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 800,
        top: 0,
        height: 200,
      } as DOMRect);
      container?.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 400,
          pointerId: 1,
          pointerType: 'touch',
        })
      );
      await vi.runAllTimersAsync();
      await element.updateComplete;

      const tooltip = element.shadowRoot?.querySelector('.gs-tooltip')?.textContent ?? '';
      expect(tooltip).toContain('VPD optimal');
      expect(tooltip).toContain('0.8 kPa–1.2 kPa');
      expect(tooltip).toContain('VPD lower limit');
      expect(tooltip).toContain('0.4 kPa');
      expect(tooltip).toContain('VPD upper limit');
      expect(tooltip).toContain('1.6 kPa');

      vi.useRealTimers();
    });

    it('shows Setpoint values in the scrub tooltip alongside their names', async () => {
      vi.useFakeTimers();
      const setpointDevice: any = {
        ...mockDevice,
        biologicalMetrics: { granularStage: 'flower_mid' },
        environmentAttributes: {
          exhaustFanConfig: {
            enabled: true,
            temperature_target: 24,
            temperature_tolerance: 1.5,
          },
        },
        irrigationConfig: {},
      };
      element.device = setpointDevice;
      element.descriptors = computeMetricDescriptors(null, {}, undefined, setpointDevice);
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '22'), reading(0, '23'));

      const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
      vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 800,
        top: 0,
        height: 200,
      } as DOMRect);
      container?.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 400,
          pointerId: 1,
          pointerType: 'touch',
        })
      );
      await vi.runAllTimersAsync();
      await element.updateComplete;

      const tooltip = element.shadowRoot?.querySelector('.gs-tooltip')?.textContent ?? '';
      expect(tooltip).toContain('Temperature Exhaust');
      expect(tooltip).toContain('24 °C');

      vi.useRealTimers();
    });

    it('finds the closest point at either end of the window', async () => {
      vi.useFakeTimers();
      await showMetric(
        MetricKey.TEMPERATURE,
        reading(7200000, '10'),
        reading(3600000, '20'),
        reading(0, '30')
      );

      const container = element.shadowRoot?.querySelector('.gs-env-chart-container');
      vi.spyOn(container as Element, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 800,
        top: 0,
        height: 200,
      } as DOMRect);

      container?.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 0,
          pointerId: 1,
          pointerType: 'touch',
        })
      );
      await vi.runAllTimersAsync();
      expect(element.shadowRoot?.querySelector('.gs-tooltip')?.textContent).toContain('10');

      container?.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 790,
          pointerId: 1,
          pointerType: 'touch',
        })
      );
      await vi.runAllTimersAsync();
      await element.updateComplete;
      expect(element.shadowRoot?.querySelector('.gs-tooltip')?.textContent).toContain('30');

      vi.useRealTimers();
    });

    it('formats binary, optimal and metadata-carrying values', async () => {
      const series = [
        {
          id: MetricKey.OPTIMAL,
          title: 'Opt',
          unit: 'state',
          points: [{ time: 1000, value: 0 }],
          color: 'green',
          min: 0,
          max: 1,
          avg: 0,
        },
        {
          id: MetricKey.OPTIMAL,
          title: 'Opt',
          unit: 'state',
          points: [{ time: 1000, value: 1 }],
          color: 'green',
          min: 0,
          max: 1,
          avg: 1,
        },
        {
          id: MetricKey.DEHUMIDIFIER,
          title: 'Dehum',
          unit: 'state',
          points: [{ time: 1000, value: 0 }],
          color: 'blue',
          min: 0,
          max: 1,
          avg: 0,
        },
        {
          id: MetricKey.HUMIDIFIER,
          title: 'Humid',
          unit: '',
          points: [{ time: 1000, value: 5, meta: { state: 'High' } }],
          color: 'cyan',
          min: 0,
          max: 10,
          avg: 5,
        },
      ] as any;

      (element as any)._cachedChartRect = { left: 0, width: 100, top: 0, height: 100 };
      (element as any)._handleGraphHover({ clientX: 50 } as any, series, {
        startTimeMs: 0,
        durationMillis: 2000,
      });
      await element.updateComplete;

      const tooltip = (element as any)._activeTooltip;
      expect(tooltip.items.map((item: any) => item.value)).toEqual([
        'Not Optimal',
        'Optimal',
        'OFF',
        'High',
      ]);
    });

    it('caches the chart rect on the first hover that needs it', async () => {
      vi.useFakeTimers();
      await showMetric(MetricKey.TEMPERATURE, reading(0, '20'));

      (element as any)._cachedChartRect = null;
      const container = element.shadowRoot?.querySelector('.gs-env-chart-container') as HTMLElement;
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 10,
        top: 10,
        width: 800,
        height: 200,
      } as any);

      (element as any)._onPointerMove(
        new PointerEvent('pointermove', { clientX: 100 }),
        (element as any)._renderSeries,
        { startTimeMs: Date.now() - 3600000, durationMillis: 3600000 }
      );
      await vi.runAllTimersAsync();
      await element.updateComplete;

      expect((element as any)._activeTooltip).not.toBeNull();
      expect((element as any)._cachedChartRect).not.toBeNull();
      vi.useRealTimers();
    });

    it('returns early when there is no chart container to measure', () => {
      (element as any)._cachedChartRect = null;
      (element as any)._chartContainerRef = { value: null };

      expect(() =>
        (element as any)._handleGraphHover({ clientX: 50 } as any, [], {
          startTimeMs: Date.now(),
          durationMillis: 1000,
        })
      ).not.toThrow();
      expect((element as any)._activeTooltip).toBeFalsy();
    });

    it('throws on a series with no points — documenting the current guard gap', () => {
      (element as any)._cachedChartRect = { left: 0, width: 200, top: 0, height: 100 };
      const series = [
        { id: MetricKey.TEMPERATURE, title: 'Temp', unit: '°C', points: [], color: 'red' },
      ] as any;

      expect(() =>
        (element as any)._handleGraphHover({ clientX: 100 } as any, series, {
          startTimeMs: 0,
          durationMillis: 2000,
        })
      ).toThrow();
    });

    it('cancels a pending frame on the next pointermove', () => {
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
      (element as any)._tooltipRafId = 123;

      (element as any)._onPointerMove({ clientX: 50 } as PointerEvent, [], {
        startTimeMs: Date.now(),
        durationMillis: 1000,
      });

      expect(cancelSpy).toHaveBeenCalledWith(123);
      cancelSpy.mockRestore();
    });

    it('cancels a pending frame and clears the tooltip on pointerleave', () => {
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
      (element as any)._tooltipRafId = 456;
      (element as any)._activeTooltip = { id: 'test' };

      (element as any)._onPointerLeave();

      expect(cancelSpy).toHaveBeenCalledWith(456);
      expect((element as any)._activeTooltip).toBeNull();
      cancelSpy.mockRestore();
    });

    it('clears the tooltip on pointerleave without a pending frame', () => {
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
      (element as any)._tooltipRafId = null;
      (element as any)._activeTooltip = { id: 'test' };
      (element as any)._hoverTime = 12345;

      (element as any)._onPointerLeave();

      expect(cancelSpy).not.toHaveBeenCalled();
      expect((element as any)._activeTooltip).toBeNull();
      expect((element as any)._hoverTime).toBeNull();
      cancelSpy.mockRestore();
    });
  });

  describe('chip scrolling', () => {
    it('reveals the scroll arrows once the chips overflow', async () => {
      let triggerResize: any;
      (globalThis as any).ResizeObserver = class {
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
        constructor(cb: any) {
          triggerResize = cb;
        }
      };

      const wrapper = await fixture(html`
        <div style="width: 200px; display: block;">
          <growspace-env-chart
            .device=${mockDevice}
            .descriptors=${DESCRIPTORS}
            .isCombined=${true}
            .metrics=${[MetricKey.TEMPERATURE]}
            .sensorHistory=${{ [MetricKey.TEMPERATURE]: [reading(3600000, '22.5')] }}
          ></growspace-env-chart>
        </div>
      `);
      const el = wrapper.querySelector('growspace-env-chart') as GrowspaceEnvChart;

      const chips = el.shadowRoot?.querySelector('.chips-scroll-container');
      expect(chips).toBeTruthy();

      Object.defineProperty(chips!, 'scrollWidth', { value: 500, configurable: true });
      Object.defineProperty(chips!, 'clientWidth', { value: 100, configurable: true });
      Object.defineProperty(chips!, 'scrollLeft', { value: 50, configurable: true });

      triggerResize?.([], { contentRect: { width: 100 } });
      chips!.dispatchEvent(new Event('scroll'));
      await el.updateComplete;

      expect(el.shadowRoot?.querySelector('.scroll-nav.left')).toBeTruthy();
    });

    it('scrolls the chips right when the right arrow is clicked', async () => {
      await showCombined({ [MetricKey.TEMPERATURE]: [reading(0, '20')] });
      (element as any)._canScrollRight = true;
      await element.updateComplete;

      const chips = element.shadowRoot?.querySelector('.chips-scroll-container');
      const scrollSpy = vi.fn();
      if (chips) chips.scrollBy = scrollSpy;

      (element.shadowRoot?.querySelector('.scroll-nav.right') as HTMLElement).click();

      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ left: 200 }));
    });

    it('scrolls the chips left when the left arrow is clicked', async () => {
      await showCombined({ [MetricKey.TEMPERATURE]: [reading(0, '20')] });
      (element as any)._canScrollLeft = true;
      await element.updateComplete;

      const scrollSpy = vi.fn();
      (element as any)._scrollChips = scrollSpy;

      (element.shadowRoot?.querySelector('.scroll-nav.left') as HTMLElement).click();

      expect(scrollSpy).toHaveBeenCalledWith('left');
    });

    it('does not toggle the graph when the chips strip itself is clicked', async () => {
      await showCombined({ [MetricKey.TEMPERATURE]: [reading(0, '20')] });

      const listener = vi.fn();
      element.addEventListener('toggle-graph', listener);
      (element.shadowRoot?.querySelector('.chips-scroll-container') as HTMLElement).click();

      expect(listener).not.toHaveBeenCalled();
    });

    it('survives scroll handling with no chips container', () => {
      (element as any)._chipsContainerRef = { value: null };

      expect(() => (element as any)._checkScroll()).not.toThrow();
      expect(() => (element as any)._scrollChips('left')).not.toThrow();
    });
  });

  describe('observers', () => {
    it('checks scroll and invalidates the rect cache from the chips observer', () => {
      let observerCallback: (() => void) | undefined;
      (globalThis as any).ResizeObserver = class {
        constructor(cb: () => void) {
          observerCallback = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      (element as any)._chipsContainerRef = { value: document.createElement('div') };
      (element as any)._setupObservers();

      const checkScrollSpy = vi.spyOn(element as any, '_checkScroll');
      const invalidateSpy = vi.spyOn(element as any, '_invalidateRectCache');

      expect(observerCallback).toBeDefined();
      observerCallback!();

      expect(checkScrollSpy).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('re-checks scroll when the chips container emits one', () => {
      const container = document.createElement('div');
      (element as any)._chipsContainerRef = { value: container };
      (element as any)._checkScroll = vi.fn();

      (element as any)._setupObservers();
      container.dispatchEvent(new Event('scroll'));

      expect((element as any)._checkScroll).toHaveBeenCalled();
    });

    it('disconnects the chips observer once its container is gone', () => {
      const disconnect = vi.fn();
      (element as any)._chipsContainerRef = { value: null };
      (element as any)._resizeObserver = { disconnect };

      (element as any)._setupObservers();

      expect(disconnect).toHaveBeenCalled();
      expect((element as any)._resizeObserver).toBeUndefined();
    });

    it('connects and disconnects the chart observer with its container', () => {
      (element as any)._chartContainerRef = { value: document.createElement('div') };
      (element as any)._setupObservers();
      expect((element as any)._chartObserver).toBeDefined();

      const disconnectSpy = vi.spyOn((element as any)._chartObserver, 'disconnect');
      const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

      (element as any)._chartContainerRef = { value: null };
      (element as any)._setupObservers();

      expect(disconnectSpy).toHaveBeenCalled();
      expect((element as any)._chartObserver).toBeUndefined();
      expect(removeListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('invalidates the cached rect on window resize and scroll', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(0, '20'));
      (element as any)._cachedChartRect = { width: 100 };

      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));

      expect((element as any)._cachedChartRect).toBeNull();
    });

    it('tears down every observer, timer and listener on disconnect', () => {
      const disconnectResize = vi.fn();
      const disconnectChart = vi.fn();
      (element as any)._resizeObserver = { disconnect: disconnectResize };
      (element as any)._chartObserver = { disconnect: disconnectChart };
      (element as any)._scrollCheckTimeout = 999;
      (element as any)._tooltipRafId = 888;

      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');
      const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

      element.disconnectedCallback();

      expect(disconnectResize).toHaveBeenCalled();
      expect(disconnectChart).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(999);
      expect(cancelRafSpy).toHaveBeenCalledWith(888);
      expect(removeListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('events', () => {
    it('dispatches toggle-graph when the single header is clicked', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(0, '20'));

      const listener = vi.fn();
      element.addEventListener('toggle-graph', listener);
      (element.shadowRoot?.querySelector('.gs-env-graph-header') as HTMLElement).click();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ detail: MetricKey.TEMPERATURE })
      );
    });

    it('dispatches unlink-graph for a chip and unlink-graphs for the button', async () => {
      await showCombined({ [MetricKey.TEMPERATURE]: [reading(0, '20')] });

      const listener = vi.fn();
      element.addEventListener('unlink-graph', listener);
      element.addEventListener('unlink-graphs', listener);

      (element.shadowRoot?.querySelector('.gs-legend-item') as HTMLElement).click();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ detail: MetricKey.TEMPERATURE })
      );

      (
        element.shadowRoot?.querySelector('ha-icon-button[title="Unlink Graphs"]') as HTMLElement
      ).click();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: -1 }));
    });

    it('renders one chip per metric of a combined chart', async () => {
      await showCombined({
        [MetricKey.TEMPERATURE]: [reading(0, '22')],
        [MetricKey.HUMIDITY]: [reading(0, '60')],
      });

      expect(element.shadowRoot?.querySelectorAll('.gs-legend-item')?.length).toBe(2);
    });

    it('labels a combined pane as normalised and puts observed ranges on its chips', async () => {
      await showCombined({
        [MetricKey.TEMPERATURE]: [reading(3_600_000, '20.5'), reading(0, '22')],
        [MetricKey.HUMIDITY]: [reading(3_600_000, '54'), reading(0, '60.5')],
      });

      expect(element.shadowRoot?.querySelector('.gs-axis-normalised')?.textContent?.trim()).toBe(
        'Normalised'
      );
      expect(
        Array.from(element.shadowRoot?.querySelectorAll('.gs-legend-item') ?? []).map((chip) =>
          chip.textContent?.replace(/\s+/g, ' ').trim()
        )
      ).toEqual(['Temperature 20.5–22.0 °C', 'Humidity 54.0–60.5 %']);
    });

    it('leaves a single-metric graph with its value axis and no normalised label', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '20'), reading(0, '22'));

      expect(element.shadowRoot?.querySelector('.gs-axis-normalised')).toBeNull();
      expect(
        Array.from(element.shadowRoot?.querySelectorAll('.gs-axis-target') ?? []).map((cap) =>
          cap.textContent?.trim()
        )
      ).toEqual(['22°C', '20°C']);
    });

    it('dispatches chart-clicked with the hovered timestamp', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(1000, '20'));
      const now = Date.now();
      (element as any)._hoverTime = now;

      const listener = vi.fn();
      element.addEventListener('chart-clicked', listener);

      const container = element.shadowRoot?.querySelector('.gs-env-chart-container') as HTMLElement;
      container.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ detail: { timestamp: now } })
      );
    });

    it('stays silent on click when nothing is hovered', () => {
      (element as any)._hoverTime = null;
      const listener = vi.fn();
      element.addEventListener('chart-clicked', listener);

      (element as any)._onChartClick();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
