import { ContextProvider } from '@lit/context';
import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const localization = vi.hoisted(() => ({
  localizeWithParams: vi.fn(),
}));

vi.mock('../../src/localize/localize', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/localize/localize')>();
  localization.localizeWithParams.mockImplementation(actual.localizeWithParams);
  return { ...actual, localizeWithParams: localization.localizeWithParams };
});

import { hassContext } from '../../src/context';
import type { GrowspaceEnvChart } from '../../src/features/environment/components/env-chart';
import '../../src/features/environment/components/env-chart';
import type { MetricComboChart } from '../../src/features/environment/components/metric-combo-chart';
import '../../src/features/environment/components/metric-combo-chart';
import type { GrowspaceAnalyticsUI } from '../../src/features/ui/components/growspace-analytics-ui';
import '../../src/features/ui/components/growspace-analytics-ui';

for (const tag of ['ha-dialog', 'ha-icon-button', 'ha-svg-icon']) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}

const HASS = { locale: { language: 'de-DE' } } as any;
const DEVICE = { deviceId: 'growspace-1', name: 'Growspace 1' } as any;

describe('environment analytics localization', () => {
  beforeEach(() => {
    localization.localizeWithParams.mockClear();
    (globalThis as any).ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
    };
  });

  it('localizes analytics loading and Graph Wall controls with the Home Assistant locale', async () => {
    const element = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${true}
        .canFullscreen=${true}
        .hass=${HASS}
      ></growspace-analytics-ui>
    `);

    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'analytics.loading_history',
      {},
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'analytics.open_graph_wall',
      {},
      'de-DE'
    );

    element.fullscreen = true;
    await element.updateComplete;

    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'analytics.exit_graph_wall',
      {},
      'de-DE'
    );
  });

  it('localizes the chart no-data state and interpolates the selected range', async () => {
    const host = document.createElement('div');
    new ContextProvider(host, hassContext, HASS);
    const element = document.createElement('growspace-env-chart') as GrowspaceEnvChart;
    element.device = DEVICE;
    element.range = '7d';
    host.append(element);
    document.body.append(host);
    await element.updateComplete;

    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'environment_chart.graph',
      {},
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'environment_chart.no_data',
      {},
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'environment_chart.no_history_for_range',
      { range: '7d' },
      'de-DE'
    );

    host.remove();
  });

  it('localizes chart controls, axes, status values, and the render fallback', async () => {
    const host = document.createElement('div');
    new ContextProvider(host, hassContext, HASS);
    const element = document.createElement('growspace-env-chart') as GrowspaceEnvChart;
    element.device = DEVICE;
    host.append(element);
    document.body.append(host);
    await element.updateComplete;
    localization.localizeWithParams.mockClear();

    await fixture(html`<div>${(element as any)._renderXAxisHTML('24h')}</div>`);
    await fixture(html`<div>${(element as any)._renderYAxisHTML(0, 1, 'state')}</div>`);
    await fixture(html`<div>${(element as any)._renderCombinedHeader([])}</div>`);
    await fixture(
      html`<div>
        ${(element as any)._renderSingleHeader({
          id: 'optimal',
          title: 'Optimal',
          color: 'green',
          unit: 'state',
          icon: '',
          points: [{ time: 1, value: 1 }],
        })}
      </div>`
    );
    await fixture(
      html`<div>
        ${(element as any)._renderSingleHeader({
          id: 'optimal',
          title: 'Optimal',
          color: 'green',
          unit: 'state',
          icon: '',
          points: [{ time: 1, value: 0, meta: {} }],
        })}
      </div>`
    );

    for (const key of [
      'environment_chart.now',
      'environment_chart.on',
      'environment_chart.off',
      'environment_chart.unlink_graphs',
      'environment_chart.optimal',
      'environment_chart.not_optimal',
    ]) {
      expect(localization.localizeWithParams).toHaveBeenCalledWith(key, {}, 'de-DE');
    }

    (element as any)._renderSeries = [
      {
        id: 'temperature',
        title: 'Temperature',
        color: 'red',
        unit: '°C',
        icon: '',
        points: [{ time: Date.now(), value: 20 }],
        path: 'M 0 0',
        min: 20,
        max: 20,
        avg: 20,
        fillType: 'gradient',
      },
    ];
    element.requestUpdate();
    await element.updateComplete;

    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'environment_chart.render_failed',
      {},
      'de-DE'
    );

    host.remove();
  });

  it('localizes combo pane labels, caps, and accessible names with the Home Assistant locale', async () => {
    const host = document.createElement('div');
    new ContextProvider(host, hassContext, HASS);
    const element = document.createElement('metric-combo-chart') as MetricComboChart;
    host.append(element);
    document.body.append(host);
    await element.updateComplete;

    const dutyPane = {
      key: 'exhaust',
      title: 'Exhaust',
      color: 'green',
      unit: '%',
      bars: [{ startTime: 0, endTime: 1, value: 80 }],
      peak: 80,
    };
    const deltaPane = {
      key: 'runoff_ec',
      title: 'Runoff EC',
      baselineTitle: 'Feed EC',
      color: 'blue',
      unit: 'mS/cm',
      bars: [{ startTime: 0, endTime: 1, value: 0.5 }],
      peak: 0.5,
      limit: 1,
    };

    await fixture(html`<div>${(element as any)._renderIntervalPane(dutyPane, 0, 1)}</div>`);
    await fixture(html`<div>${(element as any)._renderIntervalPane(deltaPane, 0, 1)}</div>`);

    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'metric_combo.duty_label',
      { metric: 'Exhaust' },
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'metric_combo.delta_label',
      { metric: 'Runoff EC', baseline: 'Feed EC' },
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'metric_combo.limit_cap',
      { value: '1.0 mS/cm' },
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'metric_combo.pane_accessible_name',
      { metric: 'Exhaust duty', scale: '80%' },
      'de-DE'
    );

    host.remove();
  });
});
