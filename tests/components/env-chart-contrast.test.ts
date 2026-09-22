import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { GrowspaceEnvChart } from '../../src/growspace-env-chart';
import { MetricKey } from '../../src/features/environment/constants';
import type { GraphSeries } from '../../src/features/environment/types';

const HA_DEFAULT_THEMES = [
  {
    name: 'light',
    primaryText: '#212121',
    secondaryText: '#727272',
    cardBackground: '#ffffff',
    paneBackground: '#e5e5e5',
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  {
    name: 'dark',
    primaryText: '#e1e1e1',
    secondaryText: '#9b9b9b',
    cardBackground: '#1c1c1c',
    paneBackground: '#282828',
    divider: 'rgba(225, 225, 225, 0.12)',
  },
] as const;

interface Rgba {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

function parseCssColor(color: string): Rgba {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length < 3) throw new Error(`Unsupported CSS color: ${color}`);
  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
}

function relativeLuminance({ red, green, blue }: Rgba): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function contrastRatio(foreground: Rgba, background: Rgba): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function opaqueBackgroundFor(label: HTMLElement): Rgba {
  let candidate: HTMLElement | null = label;
  while (candidate) {
    const background = parseCssColor(getComputedStyle(candidate).backgroundColor);
    if (background.alpha === 1) return background;
    candidate = candidate.parentElement;
  }
  throw new Error(`No opaque background found behind ${label.className}`);
}

function seriesFixture(): GraphSeries[] {
  const now = Date.now();
  const start = now - 3_600_000;
  return [
    {
      id: MetricKey.VPD,
      title: 'VPD',
      color: '#ce93d8',
      metricColor: '#9c27b0',
      unit: 'kPa',
      icon: '',
      points: [
        { time: start, value: 1 },
        { time: now, value: 1.2 },
      ],
      min: 0,
      max: 2,
      observedMin: 1,
      observedMax: 1.2,
      avg: 1.1,
      path: 'M 0 100 L 800 80',
      fillType: 'gradient',
      guideBands: [
        {
          id: 'vpd-optimal',
          segments: [{ startTime: start, endTime: now, min: 0.8, max: 1.2 }],
          current: { min: 0.8, max: 1.2 },
        },
      ],
      guideLines: [
        {
          id: 'exhaust-fan-target',
          segments: [{ startTime: start, endTime: now, value: 1 }],
          current: 1,
        },
      ],
    },
    {
      id: MetricKey.HUMIDITY,
      title: 'Humidity',
      color: '#81c784',
      unit: '%',
      icon: '',
      points: [
        { time: start, value: 55 },
        { time: now, value: 60 },
      ],
      min: 0,
      max: 100,
      observedMin: 55,
      observedMax: 60,
      avg: 57.5,
      path: 'M 0 90 L 800 80',
      fillType: 'none',
    },
  ];
}

describe('Env Graph quantitative label contrast', () => {
  it.each(HA_DEFAULT_THEMES)(
    'keeps every axis, Guide Mark, and overlay label at AA contrast in the default $name theme',
    async (theme) => {
      const element = await fixture<GrowspaceEnvChart>(html`
        <growspace-env-chart
          .device=${{ deviceId: 'd1', name: 'Tent' }}
          .overlayMetrics=${[MetricKey.HUMIDITY]}
        ></growspace-env-chart>
      `);
      expect(element).toBeInstanceOf(GrowspaceEnvChart);
      element.style.setProperty('--primary-text-color', theme.primaryText);
      element.style.setProperty('--secondary-text-color', theme.secondaryText);
      element.style.setProperty('--text-muted', 'var(--secondary-text-color)');
      element.style.setProperty('--card-background-color', theme.cardBackground);
      element.style.setProperty('--secondary-background-color', theme.paneBackground);
      element.style.setProperty('--divider-color', theme.divider);
      (element as unknown as { _renderSeries: GraphSeries[] })._renderSeries = seriesFixture();
      await element.updateComplete;

      const root = element.shadowRoot!;
      const labels = [
        ...root.querySelectorAll<HTMLElement>('.gs-axis-cap'),
        ...root.querySelectorAll<HTMLElement>('.gs-axis-target'),
        ...root.querySelectorAll<HTMLElement>('.gs-guide-label'),
        ...root.querySelectorAll<HTMLElement>('.gs-value-axis-label.primary, .series-label'),
      ];

      expect(labels).toHaveLength(9);
      for (const label of labels) {
        const style = getComputedStyle(label);
        const foreground = parseCssColor(style.color);
        const background = opaqueBackgroundFor(label);
        const description = `${theme.name} ${label.className}: ${label.textContent?.trim()}`;

        expect(style.opacity, description).toBe('1');
        expect(style.textShadow, description).toBe('none');
        expect(foreground.alpha, description).toBe(1);
        expect(contrastRatio(foreground, background), description).toBeGreaterThanOrEqual(4.5);
      }
    }
  );
});
