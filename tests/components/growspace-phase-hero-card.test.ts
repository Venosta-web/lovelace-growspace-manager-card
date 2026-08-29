import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderHeroUI } from '../../src/features/ui/components/growspace-header-hero-ui';
import { GrowspacePhaseHeroCard } from '../../src/features/ui/components/growspace-phase-hero-card';
import type { HeaderChip } from '../../src/slices/header-metrics';
import type { IrrigationStrategy } from '../../src/services/types';

const MINUTE_MS = 60 * 1000;

function chip(key: string): HeaderChip {
  return {
    key,
    icon: 'M12,2 L12,22',
    label: key === 'steering_phase' ? 'Phase' : 'Temperature',
    value: key === 'steering_phase' ? 'P2 · 12:30' : '24.5 °C',
    active: false,
    linked: false,
    groupIndex: 0,
  };
}

const strategy = {
  enabled: true,
  targetVwcPercent: 60,
  maintenanceDrybackPercent: 15,
  lightsOnTime: '06:00',
  p0DurationMinutes: 60,
  p2StopBeforeLightsOffMinutes: 120,
} as IrrigationStrategy;

function sevenDaysOfMinuteReadings() {
  const pointCount = 7 * 24 * 60 + 1;
  const start = Date.now() - (pointCount - 1) * MINUTE_MS;
  return Array.from({ length: pointCount }, (_, index) => ({
    last_changed: new Date(start + index * MINUTE_MS).toISOString(),
    state: String(50 + (index % 20) / 10),
  }));
}

describe('growspace-phase-hero-card', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives a 7d chart once across repeated hover renders without re-rendering siblings', async () => {
    const derive = vi.spyOn(GrowspacePhaseHeroCard.prototype as any, '_derive');
    const renderHero = vi.spyOn(GrowspaceHeaderHeroUI.prototype as any, '_renderHeroCard');
    const historyCache = { soil_moisture: sevenDaysOfMinuteReadings() };
    const element = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${[chip('temperature'), chip('steering_phase')]}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
        .timeRange=${'7d'}
      ></growspace-header-hero-ui>
    `);
    const phaseCard = element.shadowRoot!.querySelector(
      'growspace-phase-hero-card'
    ) as GrowspacePhaseHeroCard;
    await phaseCard.updateComplete;

    expect(derive).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot!.querySelectorAll('.phase-bar-seg').length).toBeGreaterThan(5);
    const siblingRenderCount = renderHero.mock.calls.length;
    const chart = element.shadowRoot!.querySelector('.phase-chart-svg') as SVGElement;
    vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 10,
      width: 100,
      height: 50,
      right: 110,
      bottom: 60,
      x: 10,
      y: 10,
      toJSON: () => {},
    });

    for (const clientX of [20, 60, 100]) {
      chart.dispatchEvent(new MouseEvent('mousemove', { clientX, bubbles: true }));
      await phaseCard.updateComplete;
    }

    expect(element.shadowRoot!.querySelector('.phase-tooltip')).not.toBeNull();
    expect(derive).toHaveBeenCalledTimes(1);
    expect(renderHero).toHaveBeenCalledTimes(siblingRenderCount);
  });

  it('transitions only the visual properties intended for hero-card interaction', async () => {
    const element = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${[chip('temperature')]}></growspace-header-hero-ui>
    `);
    const card = element.shadowRoot!.querySelector('.hero-card') as HTMLElement;

    expect(getComputedStyle(card).transitionProperty.split(', ')).toEqual([
      'background-color',
      'border-color',
      'box-shadow',
      'transform',
    ]);
  });
});
