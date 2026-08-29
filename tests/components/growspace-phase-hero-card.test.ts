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

function pointerEvent(type: string, clientX: number, pointerType: 'mouse' | 'touch' = 'touch') {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    isPrimary: true,
    pointerId: 1,
    pointerType,
  });
}

function stubChartBounds(chart: SVGElement) {
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
    stubChartBounds(chart);

    for (const clientX of [20, 60, 100]) {
      chart.dispatchEvent(pointerEvent('pointermove', clientX, 'mouse'));
      await phaseCard.updateComplete;
    }

    expect(element.shadowRoot!.querySelector('.phase-tooltip')).not.toBeNull();
    expect(derive).toHaveBeenCalledTimes(1);
    expect(renderHero).toHaveBeenCalledTimes(siblingRenderCount);
  });

  it('scrubs with touch without toggling after a drag, while a tap still toggles', async () => {
    const now = Date.now();
    const element = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${[chip('steering_phase')]}
        .irrigationStrategy=${strategy}
        .historyCache=${{
          soil_moisture: [
            { last_changed: new Date(now - 2 * MINUTE_MS).toISOString(), state: '50' },
            { last_changed: new Date(now - MINUTE_MS).toISOString(), state: '55' },
            { last_changed: new Date(now).toISOString(), state: '60' },
          ],
        }}
      ></growspace-header-hero-ui>
    `);
    const phaseCard = element.shadowRoot!.querySelector(
      'growspace-phase-hero-card'
    ) as GrowspacePhaseHeroCard;
    const button = element.shadowRoot!.querySelector('.phase-hero-card') as HTMLButtonElement;
    const chart = element.shadowRoot!.querySelector('.phase-chart-svg') as SVGElement;
    const toggle = vi.fn();
    phaseCard.addEventListener('toggle-graph', toggle);
    stubChartBounds(chart);

    chart.dispatchEvent(pointerEvent('pointerdown', 20));
    chart.dispatchEvent(pointerEvent('pointermove', 60));
    chart.dispatchEvent(pointerEvent('pointerup', 60));
    button.click();
    await phaseCard.updateComplete;

    expect(element.shadowRoot!.querySelector('.phase-tooltip')).not.toBeNull();
    expect(toggle).not.toHaveBeenCalled();

    chart.dispatchEvent(pointerEvent('pointerdown', 60));
    chart.dispatchEvent(pointerEvent('pointerup', 60));
    button.click();

    expect(toggle).toHaveBeenCalledOnce();
  });

  it('steps through samples with arrow keys and announces the landed reading', async () => {
    const sampleTimes = [
      new Date(2026, 7, 29, 9, 0),
      new Date(2026, 7, 29, 10, 0),
      new Date(2026, 7, 29, 11, 0),
    ];
    const element = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${[chip('steering_phase')]}
        .irrigationStrategy=${strategy}
        .historyCache=${{
          soil_moisture: sampleTimes.map((at, index) => ({
            last_changed: at.toISOString(),
            state: String(50 + index * 5),
          })),
        }}
      ></growspace-header-hero-ui>
    `);
    const phaseCard = element.shadowRoot!.querySelector(
      'growspace-phase-hero-card'
    ) as GrowspacePhaseHeroCard;
    const button = element.shadowRoot!.querySelector('.phase-hero-card') as HTMLButtonElement;
    const toggle = vi.fn();
    phaseCard.addEventListener('toggle-graph', toggle);
    button.focus();

    const handled = !button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    );
    await phaseCard.updateComplete;

    const state = element.shadowRoot!.querySelector('#steering-phase-state') as HTMLElement;
    expect(handled).toBe(true);
    expect(state.getAttribute('aria-live')).toBe('polite');
    expect(state.textContent).toBe('Phase P1. Time 10:00. VWC 55.0%.');
    expect(element.shadowRoot!.querySelector('.phase-vwc-readout')?.textContent).toContain('55.0%');
    expect(toggle).not.toHaveBeenCalled();

    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    );
    await phaseCard.updateComplete;
    expect(state.textContent).toBe('Phase P1. Time 09:00. VWC 50.0%.');

    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );
    await phaseCard.updateComplete;
    expect(state.textContent).toBe('Phase P1. Time 10:00. VWC 55.0%.');
  });

  it('clears the scrubber on pointer leave and blur', async () => {
    const now = Date.now();
    const element = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${[chip('steering_phase')]}
        .irrigationStrategy=${strategy}
        .historyCache=${{
          soil_moisture: [
            { last_changed: new Date(now - MINUTE_MS).toISOString(), state: '50' },
            { last_changed: new Date(now).toISOString(), state: '60' },
          ],
        }}
      ></growspace-header-hero-ui>
    `);
    const phaseCard = element.shadowRoot!.querySelector(
      'growspace-phase-hero-card'
    ) as GrowspacePhaseHeroCard;
    const button = element.shadowRoot!.querySelector('.phase-hero-card') as HTMLButtonElement;
    const chart = element.shadowRoot!.querySelector('.phase-chart-svg') as SVGElement;
    stubChartBounds(chart);

    chart.dispatchEvent(pointerEvent('pointermove', 60, 'mouse'));
    await phaseCard.updateComplete;
    expect(element.shadowRoot!.querySelector('.phase-tooltip')).not.toBeNull();

    chart.dispatchEvent(pointerEvent('pointerleave', 60, 'mouse'));
    await phaseCard.updateComplete;
    expect(element.shadowRoot!.querySelector('.phase-tooltip')).toBeNull();

    button.focus();
    button.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })
    );
    await phaseCard.updateComplete;
    expect(element.shadowRoot!.querySelector('.phase-tooltip')).not.toBeNull();

    button.blur();
    await phaseCard.updateComplete;
    expect(element.shadowRoot!.querySelector('.phase-tooltip')).toBeNull();
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

  it.each([300, 600])(
    'keeps chart strokes, labels, and the now marker undistorted in a %spx column',
    async (width) => {
      const now = Date.now();
      const historyCache = {
        soil_moisture: [
          { last_changed: new Date(now - 24 * 60 * 60 * 1000).toISOString(), state: '50.0' },
          { last_changed: new Date(now - 12 * 60 * 60 * 1000).toISOString(), state: '62.0' },
          { last_changed: new Date(now).toISOString(), state: '55.5' },
        ],
      };
      const element = await fixture<GrowspaceHeaderHeroUI>(html`
        <growspace-header-hero-ui
          style="width:${width}px"
          .chips=${[chip('steering_phase')]}
          .irrigationStrategy=${strategy}
          .historyCache=${historyCache}
        ></growspace-header-hero-ui>
      `);
      const phaseCard = element.shadowRoot!.querySelector(
        'growspace-phase-hero-card'
      ) as GrowspacePhaseHeroCard;
      await phaseCard.updateComplete;

      const container = element.shadowRoot!.querySelector('.phase-chart-container') as HTMLElement;
      const chart = container.querySelector('.phase-chart-svg') as SVGSVGElement;
      await vi.waitFor(() => {
        const rendered = chart.getBoundingClientRect();
        expect(chart.viewBox.baseVal.width).toBeCloseTo(rendered.width, 1);
        expect(chart.viewBox.baseVal.height).toBeCloseTo(rendered.height, 1);
      });

      const rendered = chart.getBoundingClientRect();
      const viewBox = chart.viewBox.baseVal;
      expect(rendered.width).toBeGreaterThan(width * 0.8);
      expect(rendered.width / viewBox.width).toBeCloseTo(rendered.height / viewBox.height, 3);
      expect(chart.getAttribute('preserveAspectRatio')).not.toBe('none');
      expect(chart.querySelector('text')).toBeNull();
      expect(chart.querySelector('circle')).toBeNull();

      const labels = Array.from(container.querySelectorAll<HTMLElement>('.phase-reference-label'));
      expect(labels).toHaveLength(2);
      expect(labels.every((label) => getComputedStyle(label).fontSize === '11px')).toBe(true);

      const dot = container.querySelector('.phase-now-dot') as HTMLElement;
      const dotBounds = dot.getBoundingClientRect();
      expect(dotBounds.width).toBeCloseTo(dotBounds.height, 3);
    }
  );
});
