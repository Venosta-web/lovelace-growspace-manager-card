import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './crop-steering-day-chart';
import type { CropSteeringDayChart } from './crop-steering-day-chart';
import { cropSteeringHistory$ } from '../../../slices/irrigation';
import { createGrowspaceDevice, type GrowspaceDevice } from '../../../services/types';
import { hassCall } from '../../../services/hass-call';
import { MetricKey } from '../constants';
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
      expect.anything(),
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
      expect.anything(),
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
      (t) => t.textContent ?? '',
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
    // P1 (Saturation) should start at the detected lights-on time (07:30), not the configured one (06:00).
    const text = strip!.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('07:30–08:00 · Reach FC');
    expect(text).not.toContain('06:00–06:30 · Reach FC');
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
      }),
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.cs-model-tooltip')).not.toBeNull();
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
