import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeaderChip } from '../../src/slices/header-metrics';
import { ChartUtils } from '../../src/utils/chart-utils';
import '../../src/features/ui/components/growspace-header-hero-ui';
import type { GrowspaceHeaderHeroUI } from '../../src/features/ui/components/growspace-header-hero-ui';

const NOW = new Date('2026-08-29T12:00:00.000Z').getTime();

const history = [
  { last_changed: new Date(NOW - 60 * 60 * 1000).toISOString(), state: '0.9' },
  { last_changed: new Date(NOW - 30 * 60 * 1000).toISOString(), state: '1.1' },
  { last_changed: new Date(NOW).toISOString(), state: '1.0' },
];

function chip(key: 'temperature' | 'vpd'): HeaderChip {
  return {
    key,
    icon: 'M12,2 L12,22',
    label: key === 'vpd' ? 'VPD' : 'Temperature',
    value: key === 'vpd' ? '1.0 kPa' : '24.5 °C',
    status: 'optimal',
    active: false,
    linked: false,
    groupIndex: 0,
  };
}

describe('growspace header sparklines', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { key: 'temperature' as const, width: 300 },
    { key: 'temperature' as const, width: 600 },
    { key: 'vpd' as const, width: 300 },
    { key: 'vpd' as const, width: 600 },
  ])('keeps the $key sparkline undistorted in a $width px column', async ({ key, width }) => {
    const generate = vi.spyOn(
      ChartUtils,
      key === 'vpd' ? 'generateVpdSparklineSegments' : 'generateSparklinePath'
    );
    const element = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        style="width:${width}px"
        .chips=${[chip(key)]}
        .device=${{ overviewEntityId: 'sensor.growspace_overview' }}
        .hass=${{
          states: {
            'sensor.growspace_overview': { attributes: {} },
          },
        }}
        .historyCache=${{
          [key]: history,
          light: history.map((point) => ({ ...point, state: '1' })),
        }}
      ></growspace-header-hero-ui>
    `);

    const sparkline = element.shadowRoot!.querySelector('.hero-sparkline') as SVGSVGElement;
    await vi.waitFor(() => {
      const rendered = sparkline.getBoundingClientRect();
      expect(sparkline.viewBox.baseVal.width).toBeCloseTo(rendered.width, 1);
      expect(sparkline.viewBox.baseVal.height).toBeCloseTo(rendered.height, 1);
    });

    const rendered = sparkline.getBoundingClientRect();
    const viewBox = sparkline.viewBox.baseVal;
    expect(rendered.width).toBeGreaterThan(width * 0.8);
    expect(rendered.width / viewBox.width).toBeCloseTo(rendered.height / viewBox.height, 3);
    expect(sparkline.getAttribute('preserveAspectRatio')).not.toBe('none');

    const lastCall = generate.mock.calls.at(-1)!;
    expect(lastCall[1]).toBeCloseTo(rendered.width, 1);
    expect(lastCall[2]).toBeCloseTo(rendered.height, 1);
    expect(sparkline.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
