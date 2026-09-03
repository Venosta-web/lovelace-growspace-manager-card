import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './env-chart';
import type { GrowspaceEnvChart } from './env-chart';
import { computeMetricDescriptors } from '../../../slices/metric-descriptors';
import { MetricKey } from '../constants';
import type { HistorySensorState, SensorHistories } from '../types';
import type { GrowspaceDevice } from '../../../services/types';

/**
 * The chart seam for [[Guide Mark]]s and dark-period shading (ADR-0048).
 *
 * Everything here is asserted on the rendered pane rather than on the series
 * derivation: a stepped mark that a grower cannot see stepping is the bug the
 * issue describes, and `env-series.test.ts` already pins the value-space side.
 */

const NOW = new Date('2026-05-01T12:00:00.000Z');
const MINUTE_MS = 60 * 1000;

/** The pane the chart draws into — `CHART_PANE`, in its own drawing units. */
const PANE_WIDTH = 800;

function entry(entityId: string, minutesAgo: number, state: string): HistorySensorState {
  return {
    entity_id: entityId,
    state,
    attributes: {},
    last_changed: new Date(NOW.getTime() - minutesAgo * MINUTE_MS).toISOString(),
  };
}

const DEVICE = { deviceId: 'gs-1', name: 'Tent' } as unknown as GrowspaceDevice;

/** A growspace steering VPD to 1–2 kPa by day and 0.4–0.6 by night. */
const VPD_DESCRIPTORS = computeMetricDescriptors(
  null,
  {},
  {
    attributes: {
      day_vpd_target_min: 1,
      day_vpd_target_max: 2,
      day_vpd_danger_min: 0.5,
      day_vpd_danger_max: 2.5,
      night_vpd_target_min: 0.4,
      night_vpd_target_max: 0.6,
      night_vpd_danger_min: 0.2,
      night_vpd_danger_max: 0.8,
    },
  }
);

/** VPD readings across the window, with the lights going off half way. */
function vpdHistory(lights: HistorySensorState[]): SensorHistories {
  return {
    [MetricKey.VPD]: [entry('sensor.tent_vpd', 50, '1.5'), entry('sensor.tent_vpd', 10, '1.5')],
    ...(lights.length > 0 ? { [MetricKey.LIGHT]: lights } : {}),
  };
}

async function mountChart(options: {
  descriptors: ReturnType<typeof computeMetricDescriptors>;
  history: SensorHistories;
  metricKey: MetricKey;
  metrics?: MetricKey[];
  isCombined?: boolean;
}): Promise<GrowspaceEnvChart> {
  const el = document.createElement('growspace-env-chart') as GrowspaceEnvChart;
  el.device = DEVICE;
  el.descriptors = options.descriptors;
  el.sensorHistory = options.history;
  el.metricKey = options.metricKey;
  el.metrics = options.metrics ?? [];
  el.isCombined = options.isCombined ?? false;
  el.range = '1h';
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function pane(el: GrowspaceEnvChart): SVGSVGElement {
  const svg = el.shadowRoot?.querySelector('svg.chart-svg');
  if (!svg) throw new Error('chart pane did not render');
  return svg as SVGSVGElement;
}

/** The inline guide-mark labels, in the order the chart renders them. */
function guideLabels(el: GrowspaceEnvChart): string[] {
  return [...(el.shadowRoot?.querySelectorAll('.gs-guide-label') ?? [])].map(
    (span) => span.textContent?.trim() ?? ''
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('GrowspaceEnvChart — dark-period shading', () => {
  it('shades the dark period on a chart with no targets at all', async () => {
    // Temperature carries no configured target here, and getIsDay reads the
    // half-hour before the first OFF event as lit.
    const el = await mountChart({
      descriptors: computeMetricDescriptors(),
      history: {
        [MetricKey.TEMPERATURE]: [
          entry('sensor.tent_temperature', 50, '24'),
          entry('sensor.tent_temperature', 10, '22'),
        ],
        [MetricKey.LIGHT]: [entry('light.tent', 30, 'off')],
      },
      metricKey: MetricKey.TEMPERATURE,
    });

    const shading = [...pane(el).querySelectorAll('rect.gs-dark-period')];
    expect(shading).toHaveLength(1);
    // The last half of a one-hour window is the unlit half.
    expect(Number(shading[0].getAttribute('x'))).toBeCloseTo(PANE_WIDTH / 2, 0);
    expect(Number(shading[0].getAttribute('width'))).toBeCloseTo(PANE_WIDTH / 2, 0);
  });

  it('paints the shading behind the gridlines', async () => {
    const el = await mountChart({
      descriptors: computeMetricDescriptors(),
      history: {
        [MetricKey.TEMPERATURE]: [entry('sensor.tent_temperature', 50, '24')],
        [MetricKey.LIGHT]: [entry('light.tent', 30, 'off')],
      },
      metricKey: MetricKey.TEMPERATURE,
    });

    const svg = pane(el);
    const shading = svg.querySelector('rect.gs-dark-period')!;
    const gridline = svg.querySelector('line')!;
    // SVG paints in document order, so "behind" is "drawn first".
    expect(
      shading.compareDocumentPosition(gridline) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders unshaded when the growspace has no light history', async () => {
    const el = await mountChart({
      descriptors: computeMetricDescriptors(),
      history: {
        [MetricKey.TEMPERATURE]: [entry('sensor.tent_temperature', 50, '24')],
      },
      metricKey: MetricKey.TEMPERATURE,
    });

    expect(pane(el).querySelectorAll('rect.gs-dark-period')).toHaveLength(0);
  });
});

describe('GrowspaceEnvChart — period-indexed guide marks', () => {
  it('steps an optimal band at lights-off instead of drawing one flat line', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([entry('light.tent', 30, 'off')]),
      metricKey: MetricKey.VPD,
    });

    // Two segments, each its own region: the lit half at 1–2 and the unlit at
    // 0.4–0.6. A flat line would be one region spanning the whole pane.
    const regions = [...pane(el).querySelectorAll('rect')].filter(
      (rect) => !rect.classList.contains('gs-dark-period')
    );
    expect(regions).toHaveLength(2);

    const [lit, unlit] = regions.map((rect) => ({
      x: Number(rect.getAttribute('x')),
      y: Number(rect.getAttribute('y')),
    }));
    expect(lit.x).toBeCloseTo(0, 0);
    expect(unlit.x).toBeCloseTo(PANE_WIDTH / 2, 0);
    // The night band sits lower in value space, so lower on the pane.
    expect(unlit.y).toBeGreaterThan(lit.y);
  });

  it('labels the band with the bounds in force at the current time', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([entry('light.tent', 30, 'off')]),
      metricKey: MetricKey.VPD,
    });

    // The lights are off now, so the night bounds are the ones a grower is
    // steering to — the day bounds have not applied for half an hour.
    expect(guideLabels(el)).toEqual(['0.6 kPa', '0.4 kPa']);
  });

  it('steps exactly where the dark-period shading begins', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([entry('light.tent', 30, 'off')]),
      metricKey: MetricKey.VPD,
    });

    const rects = [...pane(el).querySelectorAll('rect')];
    const shading = rects.find((rect) => rect.classList.contains('gs-dark-period'))!;
    const nightBand = rects.filter((rect) => !rect.classList.contains('gs-dark-period'))[1];

    // Not "both near lights-off" — the same number. They are cut from one
    // photoperiod list precisely so they cannot round apart.
    expect(nightBand.getAttribute('x')).toBe(shading.getAttribute('x'));
    expect(nightBand.getAttribute('width')).toBe(shading.getAttribute('width'));
  });

  it('falls back to the day bounds, unshaded, with no light history', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([]),
      metricKey: MetricKey.VPD,
    });

    expect(pane(el).querySelectorAll('rect.gs-dark-period')).toHaveLength(0);
    expect(guideLabels(el)).toEqual(['2.0 kPa', '1.0 kPa']);
    // One region for the whole window, not a step with nothing to step on.
    expect(pane(el).querySelectorAll('rect')).toHaveLength(1);
  });
});

describe('GrowspaceEnvChart — the header does not tint its text', () => {
  /**
   * DESIGN.md § Contrast Target: never tint the text. A metric hue is measured
   * against the card surface, and every one of them failed 4.5:1 on the default
   * light scheme while CO2 failed on dark too. `--primary-text-color` is the one
   * colour the active theme guarantees against its own surface, so the assertion
   * is on the declared colour rather than on a ratio computed here — jsdom
   * resolves no theme, and pinning a ratio would pin the default palette instead
   * of the rule.
   */
  const THEME_TEXT = 'var(--primary-text-color, #e1e1e1)';

  function declaredColor(el: GrowspaceEnvChart, selector: string): string {
    const node = el.shadowRoot?.querySelector(selector);
    if (!node) throw new Error(`${selector} did not render`);
    // The inline style is where the hue used to be written; the class rule is
    // where the theme colour now lives.
    return (node as HTMLElement).style.color;
  }

  function ruleFor(el: GrowspaceEnvChart, selector: string): string {
    const sheet = (el.constructor as typeof GrowspaceEnvChart).styles;
    const cssText = (Array.isArray(sheet) ? sheet : [sheet])
      .map((style) => String((style as { cssText?: string }).cssText ?? style))
      .join('\n');
    const rule = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(cssText);
    if (!rule) throw new Error(`no rule for ${selector}`);
    return rule[1];
  }

  it('leaves the metric title and the primary value at the theme text colour', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([]),
      metricKey: MetricKey.VPD,
    });

    expect(declaredColor(el, '.gs-env-graph-title')).toBe('');
    expect(declaredColor(el, '.gs-env-graph-value')).toBe('');
    expect(ruleFor(el, '.gs-env-graph-title')).toContain(THEME_TEXT);
    expect(ruleFor(el, '.gs-env-graph-value')).toContain(THEME_TEXT);
  });

  it('keeps the metric hue on the header icon, which only needs 3:1', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([]),
      metricKey: MetricKey.VPD,
    });

    // The identity signal does not disappear when the words stop carrying it.
    expect(declaredColor(el, '.gs-env-graph-icon')).not.toBe('');
  });

  it('leaves the combined legend titles at the theme text colour too', async () => {
    const el = await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: {
        ...vpdHistory([]),
        [MetricKey.TEMPERATURE]: [
          entry('sensor.tent_temperature', 50, '24'),
          entry('sensor.tent_temperature', 10, '22'),
        ],
      },
      metricKey: MetricKey.VPD,
      metrics: [MetricKey.VPD, MetricKey.TEMPERATURE],
      isCombined: true,
    });

    const titles = [...(el.shadowRoot?.querySelectorAll('.gs-legend-title') ?? [])];
    expect(titles.length).toBeGreaterThan(1);
    for (const title of titles) {
      expect((title as HTMLElement).style.color).toBe('');
    }
    expect(ruleFor(el, '.gs-legend-title')).toContain(THEME_TEXT);
  });
});

describe('GrowspaceEnvChart — only the traces carry the morph transition', () => {
  /**
   * A bare `svg path` rule put `transition: d` and a standing `will-change: d`
   * on every path in the shadow root — the header icon, the scroll chevrons,
   * the gradient fill and the [[Guide Mark]] limit chevrons included. None of
   * those have a `d` worth interpolating, interpolating `d` is CPU path
   * morphing rather than a compositor property, and the render series rebuilds
   * on every sensor tick, so on an [[Env Graph Wall]] tiling eight charts the
   * hint was the cost without the benefit.
   */
  const TRACE_CLASSES = ['.gs-primary-trace', '.gs-secondary-trace', '.gs-vpd-status-trace'];

  /** The composed sheet, less its comments — which discuss the rule below. */
  function sheetText(el: GrowspaceEnvChart): string {
    const sheet = (el.constructor as typeof GrowspaceEnvChart).styles;
    return (Array.isArray(sheet) ? sheet : [sheet])
      .map((style) => String((style as { cssText?: string }).cssText ?? style))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  /** The selector list and declarations of the rule that transitions `d`. */
  function morphRule(el: GrowspaceEnvChart): { selectors: string[]; declarations: string } {
    const match = /([^{}]+)\{(\s*transition:\s*d\s[^}]*)\}/.exec(sheetText(el));
    if (!match) throw new Error('no rule transitions d');
    return {
      selectors: match[1]
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean),
      declarations: match[2],
    };
  }

  async function mountVpdChart(): Promise<GrowspaceEnvChart> {
    return await mountChart({
      descriptors: VPD_DESCRIPTORS,
      history: vpdHistory([]),
      metricKey: MetricKey.VPD,
    });
  }

  it('names the trace paths and nothing else', async () => {
    const el = await mountVpdChart();

    expect(morphRule(el).selectors.sort()).toEqual([...TRACE_CLASSES].sort());
  });

  it('leaves no standing compositor hint at rest', async () => {
    const el = await mountVpdChart();

    expect(sheetText(el)).not.toContain('will-change');
  });

  it('takes its duration from the MD3 motion scale rather than a literal', async () => {
    const el = await mountVpdChart();
    const { declarations } = morphRule(el);

    expect(declarations).toContain('var(--md3-motion-duration-medium2)');
    expect(declarations).not.toMatch(/\b\d+(\.\d+)?m?s\b/);
  });

  it('matches the rendered traces and none of the chart other paths', async () => {
    const el = await mountVpdChart();
    const selector = TRACE_CLASSES.join(', ');
    const paths = [...(el.shadowRoot?.querySelectorAll('path') ?? [])];

    // The header icon, the scroll chevrons and the gradient fill all draw a
    // path; the chart is not worth asserting on if none of them rendered.
    expect(paths.some((path) => !path.matches(selector))).toBe(true);
    expect(paths.some((path) => path.matches(selector))).toBe(true);
    for (const path of paths) {
      expect(path.matches(selector)).toBe(
        TRACE_CLASSES.some((traceClass) => path.classList.contains(traceClass.slice(1)))
      );
    }
  });
});
