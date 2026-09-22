import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
import type { LitElement } from 'lit';
import '../../src/features/environment/components/env-chart';
import type { GrowspaceEnvChart } from '../../src/features/environment/components/env-chart';
import { hassContext } from '../../src/context';
import { MetricKey } from '../../src/features/environment/constants';
import { computeMetricDescriptors } from '../../src/slices/metric-descriptors';

const OVERVIEW_ENTITY = { attributes: {} };
const DESCRIPTORS = computeMetricDescriptors(null, {}, OVERVIEW_ENTITY);
const DEVICE = {
  deviceId: 'device-1',
  name: 'Test growspace',
  sensors: {},
  overviewEntityId: 'sensor.test_growspace',
} as any;

function reading(state: string) {
  return {
    state,
    attributes: {},
    last_changed: new Date().toISOString(),
  } as any;
}

describe('GrowspaceEnvChart accessibility', () => {
  let element: GrowspaceEnvChart;
  let parent: HTMLElement;

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    };

    parent = await fixture(html`
      <div>
        <growspace-env-chart .device=${DEVICE} .descriptors=${DESCRIPTORS}></growspace-env-chart>
      </div>
    `);
    new ContextProvider(parent, hassContext, {
      states: { 'sensor.test_growspace': OVERVIEW_ENTITY },
      locale: { language: 'en' },
    } as any);
    element = parent.querySelector('growspace-env-chart') as GrowspaceEnvChart;
    await element.updateComplete;
  });

  function expectEveryPointerTargetToBeFocusableAndNamed() {
    const pointerTargets = Array.from(
      element.shadowRoot!.querySelectorAll<HTMLElement>('*')
    ).filter((target) => {
      const style = getComputedStyle(target);
      return style.cursor === 'pointer' && style.pointerEvents !== 'none';
    });

    expect(pointerTargets.length).toBeGreaterThan(0);
    for (const target of pointerTargets) {
      const bounds = target.getBoundingClientRect();
      expect(target.tabIndex, target.outerHTML).toBeGreaterThanOrEqual(0);
      expect(target.getAttribute('aria-label')?.trim(), target.outerHTML).toBeTruthy();
      expect(bounds.width, target.outerHTML).toBeGreaterThanOrEqual(24);
      expect(bounds.height, target.outerHTML).toBeGreaterThanOrEqual(24);
    }
  }

  it('makes every pointer target focusable and named in every chart header state', async () => {
    element.metricKey = MetricKey.TEMPERATURE;
    element.sensorHistory = {};
    await element.updateComplete;
    expectEveryPointerTargetToBeFocusableAndNamed();

    element.sensorHistory = { [MetricKey.TEMPERATURE]: [reading('22.5')] } as any;
    await element.updateComplete;
    expectEveryPointerTargetToBeFocusableAndNamed();

    element.isCombined = true;
    element.metrics = [MetricKey.TEMPERATURE, MetricKey.HUMIDITY];
    element.sensorHistory = {
      [MetricKey.TEMPERATURE]: [reading('22.5')],
      [MetricKey.HUMIDITY]: [reading('55')],
    } as any;
    (element as any)._canScrollLeft = true;
    (element as any)._canScrollRight = true;
    await element.updateComplete;
    expectEveryPointerTargetToBeFocusableAndNamed();
  });

  it('closes populated and empty single-metric graphs from named native buttons', async () => {
    element.metricKey = MetricKey.TEMPERATURE;
    await element.updateComplete;
    const toggles: CustomEvent[] = [];
    element.addEventListener('toggle-graph', (event) => toggles.push(event as CustomEvent));

    const emptyHeader = element.shadowRoot!.querySelector(
      '.gs-env-graph-header-button'
    ) as HTMLButtonElement;
    expect(emptyHeader).toBeInstanceOf(HTMLButtonElement);
    expect(emptyHeader.getAttribute('aria-label')).toBe('Close Temperature graph');
    emptyHeader.click();

    element.sensorHistory = { [MetricKey.TEMPERATURE]: [reading('22.5')] } as any;
    await element.updateComplete;
    const populatedHeader = element.shadowRoot!.querySelector(
      '.gs-env-graph-header-button'
    ) as HTMLButtonElement;
    expect(populatedHeader).toBeInstanceOf(HTMLButtonElement);
    expect(populatedHeader.getAttribute('aria-label')).toBe('Close Temperature graph');
    populatedHeader.click();

    expect(toggles.map((event) => event.detail)).toEqual([
      MetricKey.TEMPERATURE,
      MetricKey.TEMPERATURE,
    ]);
  });

  it('unlinks a combined metric from a named native legend button', async () => {
    element.isCombined = true;
    element.metrics = [MetricKey.TEMPERATURE, MetricKey.HUMIDITY];
    element.sensorHistory = {
      [MetricKey.TEMPERATURE]: [reading('22.5')],
      [MetricKey.HUMIDITY]: [reading('55')],
    } as any;
    await element.updateComplete;

    const unlinks: CustomEvent[] = [];
    element.addEventListener('unlink-graph', (event) => unlinks.push(event as CustomEvent));
    const legend = element.shadowRoot!.querySelector('.gs-legend-item') as HTMLButtonElement;

    expect(legend).toBeInstanceOf(HTMLButtonElement);
    expect(legend.getAttribute('aria-label')).toBe('Unlink Temperature graph');
    legend.click();
    expect(unlinks[0].detail).toBe(MetricKey.TEMPERATURE);
  });

  it('makes the populated chart body a named keyboard exploration target', async () => {
    element.metricKey = MetricKey.TEMPERATURE;
    element.sensorHistory = {
      [MetricKey.TEMPERATURE]: [reading('20'), reading('22.5')],
    } as any;
    await element.updateComplete;

    const chartBody = element.shadowRoot!.querySelector('.gs-env-chart-container') as HTMLElement;
    const instructions = element.shadowRoot!.querySelector('#env-chart-keyboard-instructions');

    expect(chartBody.tabIndex).toBe(0);
    expect(chartBody.getAttribute('role')).toBe('group');
    expect(chartBody.classList).toContain('focus-ring');
    expect(chartBody.getAttribute('aria-label')).toBe('Explore Temperature graph values');
    expect(chartBody.getAttribute('aria-describedby')).toBe('env-chart-keyboard-instructions');
    expect(chartBody.getAttribute('aria-keyshortcuts')).toBe(
      'ArrowLeft ArrowRight Home End Escape'
    );
    expect(instructions?.textContent).toContain('Left and Right Arrow keys');
    expect(instructions?.textContent).toContain('Home and End');
    expect(instructions?.textContent).toContain('Escape');
  });

  it('moves through a 24h window in one-hour steps and supports its edge and clear keys', async () => {
    const endTime = Date.now();
    const durationMillis = 24 * 60 * 60 * 1000;
    element.metricKey = MetricKey.TEMPERATURE;
    element.chartWindow = { startTimeMs: endTime - durationMillis, durationMillis };
    element.sensorHistory = {
      [MetricKey.TEMPERATURE]: [reading('20'), reading('22.5')],
    } as any;
    await element.updateComplete;

    const chartBody = element.shadowRoot!.querySelector('.gs-env-chart-container') as HTMLElement;
    const press = async (key: string) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      chartBody.dispatchEvent(event);
      await element.updateComplete;
      expect(event.defaultPrevented).toBe(true);
    };

    await press('Home');
    expect((element as any)._hoverTime).toBe(endTime - durationMillis);

    await press('ArrowRight');
    expect((element as any)._hoverTime).toBe(endTime - durationMillis + 60 * 60 * 1000);

    await press('End');
    expect((element as any)._hoverTime).toBe(endTime);

    await press('ArrowLeft');
    expect((element as any)._hoverTime).toBe(endTime - 60 * 60 * 1000);
    expect(element.shadowRoot!.querySelector('chart-scrub-tooltip')).not.toBeNull();

    await press('Escape');
    expect((element as any)._hoverTime).toBeNull();
    expect(element.shadowRoot!.querySelector('chart-scrub-tooltip')).toBeNull();
  });

  it('debounces a polite reading-only announcement and uses the pointer formatter', async () => {
    vi.useFakeTimers();
    try {
      element.metricKey = MetricKey.IRRIGATION;
      element.sensorHistory = {
        [MetricKey.IRRIGATION]: [reading('off'), reading('on')],
      } as any;
      await element.updateComplete;

      const chartBody = element.shadowRoot!.querySelector('.gs-env-chart-container') as HTMLElement;
      const announcer = element.shadowRoot!.querySelector('.scrub-announcer') as HTMLElement;

      chartBody.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await element.updateComplete;
      expect(announcer.textContent?.trim()).toBe('');

      chartBody.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      chartBody.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await vi.advanceTimersByTimeAsync(199);
      await element.updateComplete;
      expect(announcer.textContent?.trim()).toBe('');

      await vi.advanceTimersByTimeAsync(1);
      await element.updateComplete;
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      expect(announcer.getAttribute('aria-atomic')).toBe('true');
      expect(announcer.textContent).toContain('Irrigation: OFF');
      expect(announcer.textContent).not.toContain('1.0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps keyboard cursor movement instantaneous', async () => {
    element.metricKey = MetricKey.TEMPERATURE;
    element.sensorHistory = {
      [MetricKey.TEMPERATURE]: [reading('20'), reading('22.5')],
    } as any;
    await element.updateComplete;

    const chartBody = element.shadowRoot!.querySelector('.gs-env-chart-container') as HTMLElement;
    chartBody.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await element.updateComplete;

    const readout = element.shadowRoot!.querySelector('chart-scrub-tooltip') as LitElement;
    await readout.updateComplete;
    const cursor = readout.shadowRoot!.querySelector('.chart-scrub-cursor') as HTMLElement;
    expect(getComputedStyle(cursor).transitionProperty).not.toContain('left');
    expect(getComputedStyle(cursor).transitionProperty).not.toContain('transform');
  });
});
