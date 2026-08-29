/**
 * `<growspace-env-chart>` — the hygiene guarantees an Env Graph makes about its
 * own marks (#48).
 *
 * Everything here is about the chart not contradicting itself: one window behind
 * the paths and the axis, one decision behind the header and the scrub, and no
 * dashed mark that a grower could mistake for a configured [[Guide Mark]]
 * (ADR-0048). Rendering behaviour at large is specified in
 * `tests/unit/growspace-env-chart.spec.ts`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { ContextProvider } from '@lit/context';
import '../../src/features/environment/components/env-chart';
import type { GrowspaceEnvChart } from '../../src/features/environment/components/env-chart';
import { hassContext } from '../../src/context';
import { computeMetricDescriptors } from '../../src/slices/metric-descriptors';
import { MetricKey } from '../../src/features/environment/constants';

const OVERVIEW_ENTITY = {
  attributes: {
    vpd_target_min: 0.8,
    vpd_target_max: 1.2,
    vpd_danger_min: 0.4,
    vpd_danger_max: 1.6,
  },
};

const DESCRIPTORS = computeMetricDescriptors(null, {}, OVERVIEW_ENTITY);

const DEVICE: any = {
  deviceId: 'd1',
  name: 'Device 1',
  sensors: {},
  overviewEntityId: 'sensor.overview',
};

function reading(msAgo: number, state: string, attributes: Record<string, unknown> = {}) {
  return {
    state,
    attributes,
    last_changed: new Date(Date.now() - msAgo).toISOString(),
  } as any;
}

describe('GrowspaceEnvChart hygiene', () => {
  let element: GrowspaceEnvChart;

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    };

    const parent = await fixture(html`
      <div>
        <growspace-env-chart .device=${DEVICE} .descriptors=${DESCRIPTORS}></growspace-env-chart>
      </div>
    `);
    element = parent.querySelector('growspace-env-chart') as GrowspaceEnvChart;
    new ContextProvider(parent, hassContext, { states: {}, locale: { language: 'en' } });
    await element.updateComplete;
  });

  async function showMetric(metricKey: string, ...entries: any[]) {
    element.metricKey = metricKey;
    element.sensorHistory = { [metricKey]: entries } as any;
    await element.updateComplete;
  }

  function chartSvg() {
    return element.shadowRoot?.querySelector('svg.chart-svg') as SVGSVGElement;
  }

  function headerValue() {
    return element.shadowRoot
      ?.querySelector('.gs-env-graph-header div div[style*="font-size:1.2em"]')
      ?.textContent?.trim();
  }

  function mockChartRect() {
    const container = element.shadowRoot?.querySelector('.gs-env-chart-container') as HTMLElement;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 200,
    } as DOMRect);
    return container;
  }

  /** Scrub to the right-hand edge, where the closest point is the latest one. */
  async function scrubToNow() {
    const container = mockChartRect();
    (element as any)._cachedChartRect = null;
    container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 800 }));
    await vi.runAllTimersAsync();
    await element.updateComplete;
    return element.shadowRoot?.querySelector('.gs-tooltip') as HTMLElement;
  }

  describe('gridlines', () => {
    it('draws a flat gridline set and no dashed mark of its own', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '20'), reading(0, '22'));

      const svg = chartSvg();
      expect(svg.getAttribute('viewBox')).toBe('0 0 800 200');
      expect(svg.querySelector('[stroke-dasharray]')).toBeNull();

      const gridlines = Array.from(svg.querySelectorAll('line')).filter(
        (line) => line.getAttribute('stroke-width') === '0.5'
      );
      expect(gridlines.map((line) => line.getAttribute('y1'))).toEqual([
        '200',
        '150',
        '100',
        '50',
        '0',
      ]);
    });

    it('keeps the gridlines where they are when the data range moves', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '20'), reading(0, '22'));
      const before = Array.from(chartSvg().querySelectorAll('line')).map((line) =>
        line.getAttribute('y1')
      );

      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '-5'), reading(0, '41'));

      expect(
        Array.from(chartSvg().querySelectorAll('line')).map((line) => line.getAttribute('y1'))
      ).toEqual(before);
    });
  });

  describe('one readout', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('agrees between header and scrub on a binary metric', async () => {
      await showMetric(MetricKey.IRRIGATION, reading(3_600_000, 'off'), reading(0, 'on'));

      const tooltip = await scrubToNow();

      expect(headerValue()).toBe('ON');
      expect(tooltip.textContent).toContain('ON');
      expect(tooltip.textContent).not.toContain('1.0');
    });

    it('agrees between header and scrub on a continuous metric', async () => {
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '20'), reading(0, '22'));

      const tooltip = await scrubToNow();

      expect(headerValue()).toBe('22.0 °C');
      expect(tooltip.textContent).toContain('22.0 °C');
    });
  });

  describe('one window', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('scrubs the window its paths were built for, not a fresher one', async () => {
      const builtAt = Date.now();
      await showMetric(MetricKey.TEMPERATURE, reading(3_600_000, '20'), reading(0, '22'));

      // An hour passes and the chart re-renders for a reason the path build
      // ignores. The axis and the scrub must not move without the paths.
      vi.setSystemTime(builtAt + 3_600_000);
      element.title = 'Renamed';
      await element.updateComplete;

      const tooltip = await scrubToNow();

      expect(tooltip.textContent).toContain(
        new Date(builtAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
      );
    });
  });

  describe('stroke weight', () => {
    it('gives band and non-band traces the same non-scaling stroke', async () => {
      // VPD is the only metric that draws status bands, so a chart holding both
      // kinds of trace has to be a combined one.
      element.isCombined = true;
      element.metrics = [MetricKey.VPD, MetricKey.TEMPERATURE];
      element.sensorHistory = {
        [MetricKey.VPD]: [reading(3_600_000, '1.0'), reading(0, '0.2')],
        [MetricKey.TEMPERATURE]: [reading(3_600_000, '20'), reading(0, '22')],
      } as any;
      await element.updateComplete;

      const traces = Array.from(chartSvg().querySelectorAll('path')).filter(
        (path) => (path.getAttribute('stroke') ?? 'none') !== 'none'
      );

      expect(traces.length).toBeGreaterThan(1);
      for (const trace of traces) {
        expect(trace.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      }
    });
  });
});
