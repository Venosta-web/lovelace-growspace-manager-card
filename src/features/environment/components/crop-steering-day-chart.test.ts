import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './crop-steering-day-chart';
import type { CropSteeringDayChart } from './crop-steering-day-chart';
import { cropSteeringHistory$ } from '../../../slices/irrigation';
import { createGrowspaceDevice, type GrowspaceDevice } from '../../../services/types';
import { hassCall } from '../../../services/hass-call';
import { METRIC_CONFIG, MetricKey } from '../constants';
import type { HistorySensorState, SensorHistories } from '../types';

vi.mock('../../../services/hass-call', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hassCall: vi.fn(),
}));

const mockHassCall = vi.mocked(hassCall);

const LIGHTS_ON_ISO = '2024-01-15T06:00:00.000Z';

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

  it('shows "Target X%" and "P3 trigger X%" reference labels', async () => {
    const el = createElement();
    el.device = makeDevice();
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.cs-model') !== null);

    const labels = Array.from(el.shadowRoot!.querySelectorAll('.cm-target')).map(
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
    const rect = model.getBoundingClientRect();
    model.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      })
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.cs-model-tooltip')).not.toBeNull();
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
      el.shadowRoot!.querySelectorAll<HTMLElement>('.cm-tick, .cm-target')
    ).map((overlay) => overlay.style.top);
    expect(overlayPositions.length).toBeGreaterThan(0);
    expect(overlayPositions.every((position) => position.endsWith('%'))).toBe(true);
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
