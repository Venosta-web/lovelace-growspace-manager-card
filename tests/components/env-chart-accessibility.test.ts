import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
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
});
