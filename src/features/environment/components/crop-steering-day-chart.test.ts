import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './crop-steering-day-chart';
import type { CropSteeringDayChart } from './crop-steering-day-chart';
import { cropSteeringHistory$ } from '../../../slices/irrigation';
import {
  createGrowspaceDevice,
  type GrowspaceDevice,
  type IrrigationStrategy,
} from '../../../services/types';
import { hassCall } from '../../../services/hass-call';
import { METRIC_CONFIG, MetricKey } from '../constants';
import type { HistorySensorState, SensorHistories } from '../types';

vi.mock('../../../services/hass-call', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hassCall: vi.fn(),
}));

const mockHassCall = vi.mocked(hassCall);

const LIGHTS_ON_ISO = '2024-01-15T06:00:00.000Z';

function contrastRatio(foreground: string, background: string): number {
  const parse = (color: string) => {
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (!channels || channels.length < 3) throw new Error(`Unsupported CSS color: ${color}`);
    if (color.startsWith('color(srgb')) {
      return { rgb: channels.slice(0, 3).map((channel) => channel * 255), alpha: channels[3] ?? 1 };
    }
    return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 };
  };
  const backgroundColor = parse(background);
  const foregroundColor = parse(foreground);
  const composite = foregroundColor.rgb.map(
    (channel, index) =>
      channel * foregroundColor.alpha + backgroundColor.rgb[index] * (1 - foregroundColor.alpha)
  );
  const luminance = (channels: number[]) =>
    channels
      .map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      })
      .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const foregroundLuminance = luminance(composite);
  const backgroundLuminance = luminance(backgroundColor.rgb);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function mkBucket(minutesAfterLightsOn: number, v: number | null) {
  return {
    timestamp: new Date(Date.parse(LIGHTS_ON_ISO) + minutesAfterLightsOn * 60000).toISOString(),
    value: v,
  };
}

function makeDevice(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationStrategy: {
      enabled: true,
      lightsOnTime: '06:00:00',
      p0DurationMinutes: 30,
      p2StopBeforeLightsOffMinutes: 60,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 20,
    },
    ...overrides,
  });
}

function mkHistoryState(minutesAgo: number, value: number, now: Date): HistorySensorState {
  const ts = new Date(now.getTime() - minutesAgo * 60000).toISOString();
  return {
    entity_id: 'sensor.fixture',
    state: String(value),
    attributes: {},
    last_changed: ts,
    last_updated: ts,
  };
}

function makeSensorHistory(now: Date): SensorHistories {
  return {
    [MetricKey.SOIL_MOISTURE]: [
      mkHistoryState(120, 60, now),
      mkHistoryState(60, 62, now),
      mkHistoryState(5, 64, now),
    ],
    [MetricKey.PORE_EC]: [mkHistoryState(90, 3.1, now), mkHistoryState(10, 3.4, now)],
  };
}

function createElement(): CropSteeringDayChart {
  const el = document.createElement('crop-steering-day-chart') as CropSteeringDayChart;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  cropSteeringHistory$.set(new Map());
  mockHassCall.mockResolvedValue({
    growspace_id: 'gs1',
    lights_on: LIGHTS_ON_ISO,
    soil_moisture: [mkBucket(0, 55), mkBucket(30, 58)],
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ─── data lifecycle ───────────────────────────────────────────────────────────

describe('CropSteeringDayChart – history fetch lifecycle', () => {
  it('fetches crop steering history for the device on connect', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => mockHassCall.mock.calls.length > 0);

    expect(mockHassCall).toHaveBeenCalledWith(
      'growspace_manager/get_crop_steering_history',
      { growspace_id: 'gs1' },
      expect.anything()
    );
  });

  it('re-fetches when the device changes', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => mockHassCall.mock.calls.length > 0);
    const callsBefore = mockHassCall.mock.calls.length;

    el.device = makeDevice({ deviceId: 'gs2' });
    await el.updateComplete;

    await vi.waitFor(() => mockHassCall.mock.calls.length > callsBefore);
    expect(mockHassCall).toHaveBeenLastCalledWith(
      'growspace_manager/get_crop_steering_history',
      { growspace_id: 'gs2' },
      expect.anything()
    );
  });

  it('starts polling for fresh history while connected', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => mockHassCall.mock.calls.length > 0);

    expect((el as any)._poller?.running).toBe(true);
  });
});

// ─── rendering ────────────────────────────────────────────────────────────────

describe('CropSteeringDayChart – rendering', () => {
  it('shows a placeholder message when no strategy is configured', async () => {
    const el = createElement();
    el.device = makeDevice({ irrigationStrategy: undefined });
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('No strategy configured');
  });

  it('renders the substrate model title and a live VWC readout once history loads', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cm-readout') !== null);

    expect(el.shadowRoot!.textContent).toContain('Substrate model · live + projected');
    const readout = el.shadowRoot!.querySelector('.cm-readout');
    expect(readout?.textContent?.replace(/\s+/g, ' ')).toMatch(/VWC\s*[\d.]+%/);
  });

  it('shows "Target X%" and "P2 trigger X%" reference labels', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model') !== null);

    const labels = Array.from(el.shadowRoot!.querySelectorAll('.gs-guide-label')).map(
      (t) => t.textContent ?? ''
    );
    expect(labels.some((l) => l.includes('Target') && l.includes('%'))).toBe(true);
    expect(labels.some((l) => l.includes('P2 trigger') && l.includes('%'))).toBe(true);
  });

  it('renders a phase strip above the chart, anchored on detectedLightsOnTime when set', async () => {
    const el = createElement();
    el.device = makeDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 30,
        p2StopBeforeLightsOffMinutes: 60,
        targetVwcPercent: 65,
        maintenanceDrybackPercent: 3,
        shotDurationSeconds: 30,
        shotIntervalMinutes: 20,
        autoLightTracking: true,
        detectedLightsOnTime: '07:30:00',
      },
    });
    await el.updateComplete;

    const strip = el.shadowRoot!.querySelector('.cs-phase-strip');
    expect(strip).not.toBeNull();
    // P0 (Activation) should start at the detected lights-on time (07:30), not the configured one (06:00).
    const text = strip!.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('P0 · Activation 07:30–08:00');
    expect(text).not.toContain('06:00–06:30');
  });

  it('gives the phase strip a P0 block, and starts P1 where it ends', async () => {
    const el = createElement();
    el.device = makeDevice({
      irrigationStrategy: {
        enabled: true,
        lightsOnTime: '06:00:00',
        p0DurationMinutes: 30,
        p2StopBeforeLightsOffMinutes: 60,
        targetVwcPercent: 65,
        maintenanceDrybackPercent: 3,
        shotDurationSeconds: 30,
        shotIntervalMinutes: 20,
      },
    });
    await el.updateComplete;

    const text =
      el.shadowRoot!.querySelector('.cs-phase-strip')!.textContent?.replace(/\s+/g, ' ') ?? '';

    // P0 owns the pre-first-shot hold; P1 begins at 06:30 where P0 ends.
    expect(text).toContain('P0 · Activation 06:00–06:30 · No shots');
    expect(text).toContain('P1 · Saturation 06:30');
  });

  it('shows a tooltip when the mouse moves over the chart', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model') !== null);

    const model = el.shadowRoot!.querySelector('.cs-model') as HTMLElement;
    expect(getComputedStyle(model).touchAction).toBe('pan-y');
    const rect = model.getBoundingClientRect();
    model.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
        pointerId: 1,
        pointerType: 'touch',
      })
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.cs-model-tooltip')).not.toBeNull();
  });

  it('exposes the model as one named image with its window and measured VWC summary', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model') !== null);

    const svg = el.shadowRoot!.querySelector('.cs-model svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toMatch(
      /^Crop steering substrate model, 24h window\. VWC: range 55\.0% to 58\.0%, average 56\.5%, current 58\.0%\.$/
    );
  });

  it('names the model as having no data when no measured trace is available', async () => {
    mockHassCall.mockResolvedValue({
      growspace_id: 'gs1',
      lights_on: LIGHTS_ON_ISO,
      soil_moisture: [],
    });
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(
      () =>
        el.shadowRoot!.querySelector('.cs-model svg')?.getAttribute('aria-label') ===
        'Crop steering substrate model, 24h window, no data.'
    );

    expect(el.shadowRoot!.querySelector('.cs-model svg')!.getAttribute('aria-label')).toBe(
      'Crop steering substrate model, 24h window, no data.'
    );
  });

  it('grows the trace under the shared Env Graph height without desynchronizing overlays', async () => {
    const el = createElement();
    el.style.setProperty('--gs-env-chart-height', '420px');
    el.device = makeDevice();
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model') !== null);

    const model = el.shadowRoot!.querySelector<HTMLElement>('.cs-model')!;
    expect(getComputedStyle(model).flexBasis).toBe('420px');
    expect(getComputedStyle(model).minHeight).toBe('420px');

    const overlayPositions = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLElement>('.cm-tick, .gs-guide-label')
    ).map((overlay) => overlay.style.top);
    expect(overlayPositions.length).toBeGreaterThan(0);
    expect(overlayPositions.every((position) => position.endsWith('%'))).toBe(true);
  });
});

// ─── guide marks ──────────────────────────────────────────────────────────────

describe('CropSteeringDayChart – guide marks', () => {
  async function mountChart(): Promise<CropSteeringDayChart> {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.cs-model svg')).not.toBeNull());
    return el;
  }

  it('draws the P2 trigger as a Setpoint, carrying the Saturation Target’s mark', async () => {
    const el = await mountChart();

    const target = el.shadowRoot!.querySelector('[data-guide-id="saturation-target"]')!;
    const trigger = el.shadowRoot!.querySelector('[data-guide-id="p2-trigger"]')!;

    // ADR 0048: both are values the controller acts on, so they carry one mark —
    // the looser setpoint dash, never the Limit's tighter one.
    expect(target.getAttribute('stroke-dasharray')).toBe('6 4');
    expect(target.getAttribute('stroke-opacity')).toBe('0.6');
    expect(trigger.getAttribute('stroke-dasharray')).toBe('6 4');
    expect(trigger.getAttribute('stroke-opacity')).toBe('0.6');

    // ADR 0047: the trigger is the VWC floor P2 maintains, so its line reads as
    // P2 and not as a warning. The label itself follows the theme foreground so
    // it remains AA-legible on the theme-owned pane (issue #859).
    expect(trigger.getAttribute('stroke')).toContain('--phase-p2');
    const triggerLabel = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.gs-guide-label')].find(
      (label) => label.textContent?.includes('P2 trigger')
    )!;
    el.style.setProperty('--primary-text-color', 'rgb(33, 33, 33)');
    expect(triggerLabel.style.color).toBe('');
    expect(getComputedStyle(triggerLabel).color).toBe('rgb(33, 33, 33)');
  });

  it('holds every guide mark’s dash rhythm when the pane is stretched', async () => {
    const el = createElement();
    el.device = makeDevice({
      biologicalMetrics: { granularStage: 'veg' },
      irrigationConfig: { ecTargetRanges: [{ stage: 'veg', minEc: 2.5, maxEc: 3.5 }] },
    } as Partial<GrowspaceDevice>);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.cs-model svg')).not.toBeNull());

    // The pane is a fixed 1000x300 viewBox drawn with preserveAspectRatio="none",
    // so a scaled dash pattern reads at a different rhythm from the trace beside it.
    const marks = [...el.shadowRoot!.querySelectorAll('[data-guide-kind]')];
    expect(marks.map((mark) => mark.getAttribute('data-guide-id'))).toEqual([
      'saturation-target',
      'p2-trigger',
      'pore-ec-target',
    ]);
    for (const mark of marks) {
      expect(mark.getAttribute('vector-effect')).toBe('non-scaling-stroke');
      // One kind is one mark, on the second value axis as much as the first.
      expect(mark.getAttribute('stroke-dasharray')).toBe('6 4');
      expect(mark.getAttribute('stroke-opacity')).toBe('0.6');
    }
  });

  it('rings the current-value dots in the pane’s own ground, whatever the theme', async () => {
    const el = createElement();
    // A light Home Assistant theme. The pane follows it, so the halo separating a
    // dot from the traces under it has to follow it too — a fixed dark surface
    // colour here is a black ring on a light card.
    el.style.setProperty('--secondary-background-color', 'rgb(250, 250, 250)');
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.cm-now-dot')).not.toBeNull());

    const pane = el.shadowRoot!.querySelector<HTMLElement>('.cs-model')!;
    expect(getComputedStyle(pane).backgroundColor).toBe('rgb(250, 250, 250)');

    const dots = [...el.shadowRoot!.querySelectorAll<SVGCircleElement>('.cm-now-dot')];
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      expect(getComputedStyle(dot).stroke).toBe('rgb(250, 250, 250)');
    }
  });

  it('places a guide label on its own mark, with no clamp of its own', async () => {
    // A Pore EC target that lands within a couple of pixels of the axis floor,
    // where the chart used to shunt its label clear of the "mS/cm" axis cap.
    mockHassCall.mockResolvedValue({
      growspace_id: 'gs1',
      lights_on: LIGHTS_ON_ISO,
      soil_moisture: [mkBucket(0, 55), mkBucket(30, 58)],
      pore_ec: [mkBucket(0, 0.05), mkBucket(30, 5)],
    });
    const el = createElement();
    el.device = makeDevice({
      biologicalMetrics: { granularStage: 'veg' },
      irrigationConfig: { ecTargetRanges: [{ stage: 'veg', minEc: 0.05, maxEc: 0.05 }] },
    } as Partial<GrowspaceDevice>);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('[data-guide-id="pore-ec-target"]')).not.toBeNull()
    );

    const svgEl = el.shadowRoot!.querySelector('.cs-model svg')!;
    const paneHeight = Number(svgEl.getAttribute('viewBox')!.split(' ')[3]);
    const line = el.shadowRoot!.querySelector('[data-guide-id="pore-ec-target"]')!;
    const label = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.gs-guide-label')].find(
      (candidate) => candidate.textContent?.includes('Pore EC target')
    )!;

    // The mark lands in the band the retired clamp used to shunt a label out of.
    expect(parseFloat(line.getAttribute('y1')!)).toBeGreaterThan(paneHeight - 30);

    // The drawn y is rounded to a tenth of a viewBox unit; the clamp this replaces
    // moved the label by more than half a percent of the pane.
    expect(parseFloat(label.style.top)).toBeCloseTo(
      (parseFloat(line.getAttribute('y1')!) / paneHeight) * 100,
      1
    );
  });

  it.each([
    {
      scheme: 'default light',
      ground: 'rgb(250, 250, 250)',
      primary: 'rgb(33, 33, 33)',
      secondary: 'rgb(97, 97, 97)',
      divider: 'rgba(0, 0, 0, 0.12)',
    },
    {
      scheme: 'default dark',
      ground: 'rgb(17, 17, 17)',
      primary: 'rgb(225, 225, 225)',
      secondary: 'rgb(176, 176, 176)',
      divider: 'rgba(255, 255, 255, 0.12)',
    },
  ])('keeps chart text and rules at AA contrast in the $scheme scheme', async (theme) => {
    const el = createElement();
    el.style.setProperty('--secondary-background-color', theme.ground);
    el.style.setProperty('--primary-text-color', theme.primary);
    el.style.setProperty('--secondary-text-color', theme.secondary);
    el.style.setProperty('--divider-color', theme.divider);
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.cm-readout')).not.toBeNull());

    const text = [
      ...el.shadowRoot!.querySelectorAll<HTMLElement>(
        '.cm-title, .cm-readout, .cm-readout b, .cm-axis-cap, .cm-tick, .x-label, .cs-phase-nm, .cs-phase-meta'
      ),
    ];
    expect(text.length).toBeGreaterThan(6);
    for (const node of text) {
      const color = getComputedStyle(node).color;
      expect(color, `${node.className} follows the theme's primary text role`).toBe(theme.primary);
      expect(
        contrastRatio(color, theme.ground),
        `${node.className} reaches 4.5:1`
      ).toBeGreaterThanOrEqual(4.5);
    }

    const panes = [
      ...el.shadowRoot!.querySelectorAll<HTMLElement>('.cs-model, .cs-track, .cs-phase-strip'),
    ];
    expect(panes).toHaveLength(3);
    for (const pane of panes) {
      const style = getComputedStyle(pane);
      expect(
        contrastRatio(style.borderTopColor, style.backgroundColor),
        `${pane.className} frame reaches 3:1`
      ).toBeGreaterThanOrEqual(3);
    }

    const gridRule = el.shadowRoot!.querySelector<HTMLElement>('.grid-v.major')!;
    const ruleColor = getComputedStyle(gridRule).backgroundColor;
    expect(contrastRatio(ruleColor, theme.ground)).toBeGreaterThanOrEqual(3);
  });

  it('uses on-overlay roles for every label and border on its fixed-dark tooltip', async () => {
    const el = createElement();
    el.style.setProperty('--secondary-background-color', 'rgb(250, 250, 250)');
    el.style.setProperty('--primary-text-color', 'rgb(33, 33, 33)');
    el.style.setProperty('--secondary-text-color', 'rgb(97, 97, 97)');
    el.style.setProperty('--on-overlay-primary', 'rgb(245, 245, 245)');
    el.style.setProperty('--on-overlay-muted', 'rgba(255, 255, 255, 0.55)');
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.cs-model')).not.toBeNull());

    el.shadowRoot!.querySelector<HTMLElement>('.cs-model')!.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 })
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.cs-model-tooltip')).not.toBeNull()
    );

    const tooltip = el.shadowRoot!.querySelector<HTMLElement>('.cs-model-tooltip')!;
    const tooltipStyle = getComputedStyle(tooltip);
    expect(tooltipStyle.backgroundColor).toBe('rgb(20, 20, 20)');
    expect(
      contrastRatio(tooltipStyle.borderTopColor, tooltipStyle.backgroundColor)
    ).toBeGreaterThanOrEqual(3);

    const labels = [
      el.shadowRoot!.querySelector<HTMLElement>('.cs-model-tooltip-time')!,
      ...el.shadowRoot!.querySelectorAll<HTMLElement>('.cs-model-tooltip-row span'),
    ];
    expect(labels.length).toBeGreaterThan(2);
    for (const label of labels) {
      const color = getComputedStyle(label).color;
      expect(color).toBe('rgb(245, 245, 245)');
      expect(contrastRatio(color, tooltipStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// ─── strategy override (live preview) ─────────────────────────────────────────

describe('CropSteeringDayChart – strategyOverride', () => {
  /**
   * Lights 06:00–18:00 (no `resolvedDayHours`, so the 12h default), P0 ends
   * 07:00, P2 stops 180m before lights-off (15:00), shots every 120m →
   * 07:00 · 09:00 · 11:00 · 13:00 = four shots.
   */
  function fourShotStrategy(): IrrigationStrategy {
    return {
      enabled: true,
      lightsOnTime: '06:00:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 180,
      targetVwcPercent: 65,
      maintenanceDrybackPercent: 3,
      shotDurationSeconds: 30,
      shotIntervalMinutes: 120,
    };
  }

  /** The same day with P2 stopping 420m early (11:00) → 07:00 · 09:00 = two. */
  function twoShotOverride(): IrrigationStrategy {
    return { ...fourShotStrategy(), p2StopBeforeLightsOffMinutes: 420 };
  }

  const shotCount = (el: CropSteeringDayChart) =>
    el.shadowRoot!.querySelectorAll('.cs-event').length;

  it('draws the device strategy when no override is given', async () => {
    const el = createElement();
    el.device = makeDevice({ irrigationStrategy: fourShotStrategy() });
    await el.updateComplete;

    expect(shotCount(el)).toBe(4);
  });

  it('draws an unsaved override instead of the persisted strategy (growspace_manager_workspace#130)', async () => {
    const el = createElement();
    el.device = makeDevice({ irrigationStrategy: fourShotStrategy() });
    await el.updateComplete;
    expect(shotCount(el)).toBe(4);

    // The grower moves the P2 stop boundary in the dialog. Nothing is saved —
    // the device still carries the four-shot strategy — but the preview follows.
    el.strategyOverride = twoShotOverride();
    await el.updateComplete;

    expect(el.device!.irrigationStrategy!.p2StopBeforeLightsOffMinutes).toBe(180);
    expect(shotCount(el)).toBe(2);
  });

  it('falls back to the device strategy when the override is cleared', async () => {
    const el = createElement();
    el.device = makeDevice({ irrigationStrategy: fourShotStrategy() });
    el.strategyOverride = twoShotOverride();
    await el.updateComplete;
    expect(shotCount(el)).toBe(2);

    el.strategyOverride = undefined;
    await el.updateComplete;

    expect(shotCount(el)).toBe(4);
  });

  it('shows the empty state when the override disables steering', async () => {
    const el = createElement();
    el.device = makeDevice({ irrigationStrategy: fourShotStrategy() });
    el.strategyOverride = { ...fourShotStrategy(), enabled: false };
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.placeholder')?.textContent).toContain(
      'No strategy configured'
    );
  });
});

describe('CropSteeringDayChart – rolling window mode', () => {
  const now = new Date();

  it('shows the phase strip for the 24h range', async () => {
    const el = createElement();
    el.device = makeDevice();
    el.rollingWindow = true;
    el.range = '24h';
    el.sensorHistory = makeSensorHistory(now);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.cs-phase-strip')).not.toBeNull();
  });

  it.each(['1h', '6h', '7d'] as const)('hides the phase strip for the %s range', async (range) => {
    const el = createElement();
    el.device = makeDevice();
    el.rollingWindow = true;
    el.range = range;
    el.sensorHistory = makeSensorHistory(now);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.cs-phase-strip')).toBeNull();
  });

  it('drops the now-line and renders -<range>/Now axis labels instead', async () => {
    const el = createElement();
    el.device = makeDevice();
    el.rollingWindow = true;
    el.range = '6h';
    el.sensorHistory = makeSensorHistory(now);
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model') !== null);

    expect(el.shadowRoot!.querySelector('.cs-now-line')).toBeNull();
    const text = el.shadowRoot!.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('-6h');
    expect(text).toContain('Now');
  });

  it('averages a multi-sensor metric whose histories are keyed by entity id', async () => {
    cropSteeringHistory$.set(new Map());
    const el = createElement();
    el.device = makeDevice({
      environmentAttributes: { soilMoistureSensors: ['sensor.vwc_a', 'sensor.vwc_b'] },
    } as Partial<GrowspaceDevice>);
    el.rollingWindow = true;
    el.range = '24h';
    // Since #473 `history-store` files each sensor of a multi-sensor metric
    // under its own entity id, with nothing naming the metric it belongs to.
    el.sensorHistory = {
      'sensor.vwc_a': [mkHistoryState(60, 60, now), mkHistoryState(5, 64, now)],
      'sensor.vwc_b': [mkHistoryState(60, 62, now), mkHistoryState(5, 66, now)],
      [MetricKey.PORE_EC]: [mkHistoryState(10, 3.4, now)],
    };
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cm-readout') !== null);

    const readout = el.shadowRoot!.querySelector('.cm-readout');
    expect(readout?.textContent?.replace(/\s+/g, ' ')).toMatch(/VWC\s*65\.0%/);
  });

  it('sources its trace data from sensorHistory rather than cropSteeringHistory', async () => {
    cropSteeringHistory$.set(new Map());
    const el = createElement();
    el.device = makeDevice();
    el.rollingWindow = true;
    el.range = '24h';
    el.sensorHistory = makeSensorHistory(now);
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cm-readout') !== null);

    const readout = el.shadowRoot!.querySelector('.cm-readout');
    expect(readout?.textContent?.replace(/\s+/g, ' ')).toMatch(/VWC\s*64\.0%/);
    expect(readout?.textContent?.replace(/\s+/g, ' ')).toMatch(/Pore\s*3\.4/);
  });
});

// ─── axis domains ─────────────────────────────────────────────────────────────

/** Y coordinates of every vertex in a path's `d`, in draw order. */
function pathYs(el: CropSteeringDayChart, selector: string): number[] {
  const d = el.shadowRoot!.querySelector(selector)?.getAttribute('d') ?? '';
  return [...d.matchAll(/[ML]\s*[-\d.]+\s*,\s*([-\d.]+)/g)].map((m) => Number(m[1]));
}

/** A trace pinned against an axis edge by clamping has zero y-variance. */
function isFlat(ys: number[]): boolean {
  return ys.length > 1 && ys.every((y) => y === ys[0]);
}

describe('CropSteeringDayChart – axis domains', () => {
  const now = new Date();

  it('scales the EC axis to its data when the configured EC target sits outside it', async () => {
    cropSteeringHistory$.set(new Map());
    const el = createElement();
    el.device = makeDevice({
      biologicalMetrics: { granularStage: 'veg' },
      // An unconfigured stage range yields a 0.0 midpoint, which used to pin the
      // EC axis to [0, 2] and flatten real 2.6–4.0 mS/cm readings against the top.
      irrigationConfig: { ecTargetRanges: [{ stage: 'veg', minEc: 0, maxEc: 0 }] },
    } as Partial<GrowspaceDevice>);
    el.rollingWindow = true;
    el.range = '24h';
    el.sensorHistory = {
      [MetricKey.SOIL_MOISTURE]: [mkHistoryState(120, 30, now), mkHistoryState(5, 34.9, now)],
      [MetricKey.PORE_EC]: [
        mkHistoryState(120, 2.6, now),
        mkHistoryState(60, 3.3, now),
        mkHistoryState(5, 4.03, now),
      ],
    };
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model svg') !== null);

    const ys = pathYs(el, 'path[stroke-width="1.6"]');
    expect(ys.length).toBeGreaterThan(1);
    expect(isFlat(ys)).toBe(false);

    // The right-hand EC ticks must bracket the readings they are scaling.
    const ecTicks = Array.from(el.shadowRoot!.querySelectorAll('.cm-tick.right')).map((t) =>
      Number(t.textContent)
    );
    expect(Math.max(...ecTicks)).toBeGreaterThanOrEqual(4.03);
  });

  it('labels both axes in their own units — VWC left, EC right', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model svg') !== null);

    const left = Array.from(el.shadowRoot!.querySelectorAll('.cm-tick.left')).map(
      (t) => t.textContent ?? ''
    );
    const right = Array.from(el.shadowRoot!.querySelectorAll('.cm-tick.right')).map(
      (t) => t.textContent ?? ''
    );
    expect(left.length).toBeGreaterThan(1);
    expect(left.every((l) => l.endsWith('%'))).toBe(true);
    expect(right.length).toBe(left.length);
    expect(right.every((l) => /^\d+\.\d$/.test(l))).toBe(true);
  });

  it('widens the EC axis to cover the projection so it is not clipped', async () => {
    // Pore EC concentrates through the projected drybacks, climbing well past the
    // historical range — a domain derived from history alone clips the overshoot.
    mockHassCall.mockResolvedValue({
      growspace_id: 'gs1',
      lights_on: LIGHTS_ON_ISO,
      soil_moisture: [mkBucket(0, 20), mkBucket(30, 19.8)],
      pore_ec: [mkBucket(0, 3.3), mkBucket(30, 3.4)],
    });
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model svg') !== null);

    const poreEcColor = METRIC_CONFIG[MetricKey.PORE_EC].color;
    const ys = pathYs(el, `path[stroke-width="1.4"][stroke="${poreEcColor}"]`);
    expect(ys.length).toBeGreaterThan(1);
    expect(isFlat(ys)).toBe(false);
    // padT is the plot ceiling; anything landing on it is the clamp saturating.
    expect(Math.min(...ys)).toBeGreaterThan(28);
  });
});
