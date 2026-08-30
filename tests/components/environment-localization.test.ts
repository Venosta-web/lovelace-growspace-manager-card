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
      scale: 100,
    };
    const deltaPane = {
      key: 'runoff_ec',
      title: 'Runoff EC',
      baselineTitle: 'Feed EC',
      color: 'blue',
      unit: 'mS/cm',
      bars: [{ startTime: 0, endTime: 1, value: 0.5 }],
      scale: 1,
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
      { metric: 'Exhaust duty', scale: '100%' },
      'de-DE'
    );

    host.remove();
  });

  it('uses non-English word order in scrub labels and the accessible summary', async () => {
    const originalLocalize = localization.localizeWithParams.getMockImplementation();
    const german = {
      'environment_chart.environment_metrics': 'Umweltmesswerte',
      'environment_chart.optimal_band_label': 'Optimalbereich für {metric}',
      'environment_chart.guide_mark_label': '{mark} bei {metric}',
      'environment_chart.lower_limit_label': 'Untergrenze für {metric}',
      'environment_chart.upper_limit_label': 'Obergrenze für {metric}',
      'environment_chart.accessible_summary': '{window}-Fenster für {chart}. {descriptions}',
      'environment_chart.accessible_named_series':
        '{metric}: Bereich {minimum} bis {maximum}, Mittelwert {average}, aktuell {current}.',
      'guide_marks.circulation-fan-target': 'Umluft',
    } as Record<string, string>;

    localization.localizeWithParams.mockImplementation(
      (key: string, params: Record<string, string | number> = {}, language = 'en') => {
        if (language !== 'de-DE' || !german[key]) {
          return originalLocalize?.(key, params, language) ?? key;
        }
        return Object.entries(params).reduce(
          (translated, [name, value]) => translated.replaceAll(`{${name}}`, String(value)),
          german[key]
        );
      }
    );

    const host = document.createElement('div');
    new ContextProvider(host, hassContext, HASS);
    const element = document.createElement('growspace-env-chart') as GrowspaceEnvChart;
    element.device = DEVICE;
    element.isCombined = true;
    host.append(element);
    document.body.append(host);
    await element.updateComplete;

    const series = {
      id: 'vpd',
      title: 'VPD',
      color: 'green',
      metricColor: 'green',
      unit: 'kPa',
      icon: '',
      points: [{ time: 50, value: 1.1 }],
      min: 0.4,
      max: 1.6,
      observedMin: 1.1,
      observedMax: 1.1,
      avg: 1.1,
      path: 'M 0 0',
      fillType: 'none',
      guideBands: [
        {
          id: 'vpd-optimal',
          current: { min: 0.8, max: 1.2 },
          segments: [{ startTime: 0, endTime: 100, min: 0.8, max: 1.2 }],
        },
      ],
      guideLines: [
        {
          id: 'circulation-fan-target',
          current: 1,
          segments: [{ startTime: 0, endTime: 100, value: 1 }],
        },
      ],
      guideLimits: [
        {
          id: 'vpd-lower',
          side: 'lower',
          status: 'danger',
          current: 0.4,
          segments: [{ startTime: 0, endTime: 100, value: 0.4 }],
        },
        {
          id: 'vpd-upper',
          side: 'upper',
          status: 'danger',
          current: 1.6,
          segments: [{ startTime: 0, endTime: 100, value: 1.6 }],
        },
      ],
    } as any;

    (element as any)._cachedChartRect = { left: 0, width: 100 };
    (element as any)._handleGraphHover({ clientX: 50 } as PointerEvent, [series], {
      startTimeMs: 0,
      durationMillis: 100,
    });

    expect(
      (element as any)._activeTooltip.items.map((item: { title: string }) => item.title)
    ).toEqual([
      'VPD',
      'Optimalbereich für VPD',
      'Umluft bei VPD',
      'Untergrenze für VPD',
      'Obergrenze für VPD',
    ]);
    expect((element as any)._accessibleSummary([series])).toBe(
      '24h-Fenster für Umweltmesswerte. VPD: Bereich 1.1 kPa bis 1.1 kPa, Mittelwert 1.1 kPa, aktuell 1.1 kPa.'
    );

    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'environment_chart.optimal_band_label',
      { metric: 'VPD' },
      'de-DE'
    );
    expect(localization.localizeWithParams).toHaveBeenCalledWith(
      'environment_chart.accessible_summary',
      expect.any(Object),
      'de-DE'
    );

    localization.localizeWithParams.mockImplementation(originalLocalize!);
    host.remove();
  });
});
