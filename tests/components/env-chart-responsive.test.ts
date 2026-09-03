import { fixture, html } from '@open-wc/testing-helpers';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { GrowspaceEnvChart } from '../../src/features/environment/components/env-chart';
import { MetricKey } from '../../src/features/environment/constants';
import type { GraphSeries } from '../../src/features/environment/types';

function phoneWidthVpdSeries(): GraphSeries[] {
  const now = Date.now();
  const start = now - 86_400_000;

  return [
    {
      id: MetricKey.VPD,
      title: 'Vapour Pressure Deficit With A Deliberately Long Localized Name',
      color: '#ce93d8',
      metricColor: '#9c27b0',
      unit: 'kPa',
      icon: '',
      points: [
        { time: start, value: 1 },
        { time: now, value: 1.1 },
      ],
      min: 0,
      max: 2,
      observedMin: 1,
      observedMax: 1.1,
      avg: 1.05,
      path: 'M 0 100 L 800 90',
      fillType: 'gradient',
      guideBands: [
        {
          id: 'vpd-optimal',
          segments: [{ startTime: start, endTime: now, min: 0.8, max: 1.2 }],
          current: { min: 0.8, max: 1.2 },
        },
      ],
    },
    {
      id: MetricKey.TEMPERATURE,
      title: 'Temperature',
      color: '#4fc3f7',
      unit: '°C',
      icon: '',
      points: [
        { time: start, value: 21 },
        { time: now, value: 26 },
      ],
      min: 20,
      max: 30,
      observedMin: 21,
      observedMax: 26,
      avg: 23.5,
      path: 'M 0 180 L 800 80',
      fillType: 'none',
    },
    {
      id: MetricKey.HUMIDITY,
      title: 'Humidity',
      color: '#81c784',
      unit: '%',
      icon: '',
      points: [
        { time: start, value: 62 },
        { time: now, value: 48 },
      ],
      min: 0,
      max: 100,
      observedMin: 48,
      observedMax: 62,
      avg: 55,
      path: 'M 0 76 L 800 104',
      fillType: 'none',
    },
  ];
}

function overlaps(first: DOMRect, second: DOMRect): boolean {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

describe('Env Graph phone-width layout', () => {
  afterEach(async () => {
    await page.viewport(1280, 720);
  });

  it('keeps a VPD combo legible inside a 390px companion-app-sized viewport', async () => {
    await page.viewport(390, 844);
    const element = await fixture<GrowspaceEnvChart>(html`
      <growspace-env-chart
        style="width: 298px"
        .device=${{ deviceId: 'd1', name: 'Tent' }}
        .overlayMetrics=${[MetricKey.TEMPERATURE, MetricKey.HUMIDITY]}
      ></growspace-env-chart>
    `);
    expect(element).toBeInstanceOf(GrowspaceEnvChart);
    (element as unknown as { _renderSeries: GraphSeries[] })._renderSeries = phoneWidthVpdSeries();
    await element.updateComplete;

    const root = element.shadowRoot!;
    const pane = root.querySelector<HTMLElement>('.gs-env-chart-container')!;
    const title = root.querySelector<HTMLElement>('.gs-env-graph-title')!;
    const value = root.querySelector<HTMLElement>('.gs-env-graph-value')!;
    const header = root.querySelector<HTMLElement>('.gs-env-graph-header')!;
    const primaryAxisLabel = root.querySelector<HTMLElement>('.gs-value-axis-label.primary')!;
    const secondaryAxisLabel = root.querySelector<HTMLElement>('.gs-value-axis-label.secondary')!;
    const visibleAxisLabels = [primaryAxisLabel, secondaryAxisLabel].filter(
      (label) => label.getBoundingClientRect().width > 0
    );
    const guideLabels = [...root.querySelectorAll<HTMLElement>('.gs-guide-label')];

    const paneRect = pane.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const valueRect = value.getBoundingClientRect();

    expect(paneRect.width).toBeCloseTo(266, 0);
    expect(paneRect.width / paneRect.height).toBeGreaterThanOrEqual(1.95);

    expect(getComputedStyle(title).textOverflow).toBe('ellipsis');
    expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    expect(valueRect.right).toBeLessThanOrEqual(headerRect.right);
    expect(valueRect.left).toBeGreaterThan(title.getBoundingClientRect().right);

    expect(getComputedStyle(primaryAxisLabel).display).toBe('none');
    expect(secondaryAxisLabel.textContent).toContain('Temperature · °C');
    expect(secondaryAxisLabel.textContent).toContain('Humidity · %');
    for (const label of secondaryAxisLabel.querySelectorAll<HTMLElement>('.series-label')) {
      expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
    }
    expect(visibleAxisLabels).toHaveLength(1);
    expect(guideLabels.length).toBeGreaterThan(0);
    for (const axisLabel of visibleAxisLabels) {
      const axisRect = axisLabel.getBoundingClientRect();
      expect(axisRect.bottom).toBeLessThanOrEqual(paneRect.top);
      for (const guideLabel of guideLabels) {
        expect(overlaps(axisRect, guideLabel.getBoundingClientRect())).toBe(false);
      }
    }

    await expect(page.elementLocator(element)).toMatchScreenshot('env-graph-phone-width.png');
  });
});
