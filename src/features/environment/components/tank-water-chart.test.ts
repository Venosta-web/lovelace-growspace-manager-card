import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './tank-water-chart';
import type { TankWaterChart } from './tank-water-chart';

vi.mock('../../../services/hass-call', () => ({
  hassCall: vi.fn(),
}));

import { hassCall } from '../../../services/hass-call';
const mockHassCall = vi.mocked(hassCall);

function mkBucket(timestamp: string, liters: number) {
  return { timestamp, liters };
}

function mkDevice(tanks: unknown[] = [], deviceId = 'gs-1') {
  return { deviceId, environmentAttributes: { irrigationTanks: tanks } } as any;
}

function mkTank(over: Record<string, unknown> = {}) {
  return {
    sensorEntity: 'sensor.tank_1_level',
    name: 'Tank 1',
    warningLevel: 25,
    fillLevel: 84,
    isWarning: false,
    hoursRemaining: 74.4,
    ...over,
  };
}

function createElement(): TankWaterChart {
  const el = document.createElement('tank-water-chart') as TankWaterChart;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  mockHassCall.mockReset();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ─── fetch / data loading ─────────────────────────────────────────────────────

describe('TankWaterChart – _fetch', () => {
  it('does nothing when device is not set', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    await el.updateComplete;
    expect(mockHassCall).not.toHaveBeenCalled();
  });

  it('calls hassCall once with the initial device id and range', async () => {
    const device = { deviceId: 'gs-1' } as any;
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = device;
    el.range = '7d';
    // trigger updated by waiting one cycle after setting properties
    await el.updateComplete;
    expect(mockHassCall).toHaveBeenCalledWith(
      'growspace_manager/get_tank_water_history',
      { growspace_id: 'gs-1', range: '7d' },
      expect.anything()
    );
    expect(mockHassCall).toHaveBeenCalledTimes(1);
  });

  it('populates buckets on successful fetch', async () => {
    const buckets = [mkBucket('2024-01-01T00:00:00Z', 2.5), mkBucket('2024-01-01T01:00:00Z', 1.2)];
    mockHassCall.mockResolvedValue({ buckets });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    // wait for the async fetch to settle
    await vi.waitFor(() => el.shadowRoot!.querySelectorAll('rect').length === 2);
    expect(el.shadowRoot!.querySelectorAll('rect').length).toBe(2);
  });

  it('shows a recoverable error when the fetch fails', async () => {
    mockHassCall.mockRejectedValue(new Error('network error'));
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => !el.shadowRoot!.querySelector('.loading'));
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.shadowRoot!.textContent).toContain('Water history could not be loaded');
  });

  it('retries a failed request when Try again is activated', async () => {
    mockHassCall
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ buckets: [mkBucket('2024-01-01T00:00:00Z', 3)] });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.retry-button')).not.toBeNull()
    );

    el.shadowRoot!.querySelector<HTMLButtonElement>('.retry-button')!.click();

    await vi.waitFor(() => el.shadowRoot!.textContent!.includes('3.0 L'));
    expect(mockHassCall).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when range property changes', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    const callsBefore = mockHassCall.mock.calls.length;
    el.range = '7d';
    await el.updateComplete;
    expect(mockHassCall.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('re-fetches when device property changes', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    const callsBefore = mockHassCall.mock.calls.length;
    el.device = { deviceId: 'gs-2' } as any;
    await el.updateComplete;
    expect(mockHassCall.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('does not re-fetch when the device object changes but its id does not', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = { deviceId: 'gs-1', name: 'First object' } as any;
    await el.updateComplete;
    await vi.waitFor(() => expect(mockHassCall).toHaveBeenCalledTimes(1));

    el.device = { deviceId: 'gs-1', name: 'Replacement object' } as any;
    await el.updateComplete;

    expect(mockHassCall).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale response after the range changes', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    mockHassCall
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)));

    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    el.range = '7d';
    await el.updateComplete;

    resolveSecond({ buckets: [mkBucket('2024-01-02T00:00:00Z', 7)] });
    await vi.waitFor(() => el.shadowRoot!.textContent!.includes('7.0 L'));
    resolveFirst({ buckets: [mkBucket('2024-01-01T00:00:00Z', 1)] });
    await Promise.resolve();
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('7.0 L');
    expect(el.shadowRoot!.textContent).not.toContain('1.0 L');
  });
});

// ─── loading state ────────────────────────────────────────────────────────────

describe('TankWaterChart – loading state', () => {
  it('shows loading indicator while fetch is in progress', async () => {
    let resolve!: (v: unknown) => void;
    mockHassCall.mockReturnValue(new Promise((_resolve) => (resolve = _resolve)));
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    // _loading = true triggers a second update cycle
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.loading')?.getAttribute('role')).toBe('status');
    expect(el.shadowRoot!.querySelector('.loading')?.getAttribute('aria-live')).toBe('polite');
    resolve({ buckets: [] });
    await el.updateComplete;
  });
});

// ─── empty state ──────────────────────────────────────────────────────────────

describe('TankWaterChart – empty state', () => {
  it('says so inside the usage pane when nothing was drawn in the range', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.usage-empty')).not.toBeNull());
    expect(el.shadowRoot!.querySelector('.usage-empty')!.textContent).toContain(
      'No irrigation in this range'
    );
  });

  it('keeps the usage pane framed rather than collapsing the card', async () => {
    // The card has to stay the same height at every range, or the Graph Wall
    // grid reflows every time you press a range button.
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.usage-pane')).not.toBeNull());
    expect(el.shadowRoot!.querySelector('.level-pane')).not.toBeNull();
  });

  it('treats a range whose buckets are all zero as empty', async () => {
    mockHassCall.mockResolvedValue({
      buckets: [mkBucket('2024-01-01T00:00:00Z', 0), mkBucket('2024-01-01T01:00:00Z', 0)],
    });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.usage-empty')).not.toBeNull());
    expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(0);
  });

  it('labels the usage pane Water Consumption', async () => {
    mockHassCall.mockResolvedValue({ buckets: [mkBucket('2024-01-01T00:00:00Z', 3)] });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.usage-eyebrow')!.textContent).toContain(
        'Water Consumption'
      )
    );
  });
});

// ─── bar rendering ────────────────────────────────────────────────────────────

describe('TankWaterChart – _renderBars', () => {
  beforeEach(() => {
    mockHassCall.mockResolvedValue({
      buckets: [
        mkBucket('2024-01-01T00:00:00Z', 4),
        mkBucket('2024-01-01T01:00:00Z', 2),
        mkBucket('2024-01-01T02:00:00Z', 0),
      ],
    });
  });

  it('renders one rect per bucket', async () => {
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelectorAll('rect').length === 3);
    expect(el.shadowRoot!.querySelectorAll('rect').length).toBe(3);
  });

  it('renders an svg element', async () => {
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('svg') !== null);
    expect(el.shadowRoot!.querySelector('svg')).not.toBeNull();
  });

  it('uses the shared Env Graph height as its wall plot floor', async () => {
    const el = createElement();
    el.style.setProperty('--gs-env-chart-height', '420px');
    el.device = { deviceId: 'gs-1' } as any;
    await vi.waitFor(() => el.shadowRoot!.querySelector('svg') !== null);

    const wrapper = el.shadowRoot!.querySelector<HTMLElement>('.chart-wrapper')!;

    expect(getComputedStyle(wrapper).display).toBe('flex');
    expect(wrapper.getBoundingClientRect().height).toBe(el.getBoundingClientRect().height);
    await vi.waitFor(() => {
      const chart = el.shadowRoot!.querySelector('svg')!;
      expect(getComputedStyle(chart).flexBasis).toBe('420px');
      expect(getComputedStyle(chart).minHeight).toBe('420px');
    });
  });

  it('does not attach a browser-native title tooltip to usage bars', async () => {
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelectorAll('rect').length === 3);
    expect(el.shadowRoot!.querySelector('.bar title')).toBeNull();
  });

  it('makes interval bar values reachable by touch through the shared tooltip', async () => {
    mockHassCall.mockResolvedValue({
      buckets: Array.from({ length: 24 }, (_, hour) =>
        mkBucket(new Date(Date.UTC(2024, 0, 1, hour)).toISOString(), hour === 0 ? 1 : 0.5)
      ),
    });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    el.range = '24h';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar')).toHaveLength(24));
    const pane = el.shadowRoot!.querySelector<HTMLElement>('.usage-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 240,
      height: 64,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 5,
        pointerId: 1,
        pointerType: 'touch',
      })
    );
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector('chart-scrub-tooltip');
    expect(overlay).not.toBeNull();
    expect(overlay!.shadowRoot!.textContent).toContain('Water Consumption');
    expect(overlay!.shadowRoot!.textContent).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}\s*·\s*1\.0 L/);
    expect(getComputedStyle(pane).touchAction).toBe('pan-y');
  });

  it('tallest bar corresponds to the bucket with most liters', async () => {
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelectorAll('rect').length === 3);
    const rects = el.shadowRoot!.querySelectorAll<SVGRectElement>('rect');
    const heights = Array.from(rects).map((r) => parseFloat(r.getAttribute('height') ?? '0'));
    expect(heights[0]).toBeGreaterThan(heights[1]);
    expect(heights[1]).toBeGreaterThan(heights[2]);
  });

  it('uses a visible water color when card tokens are not inherited', async () => {
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('rect') !== null);

    const bar = el.shadowRoot!.querySelector<SVGRectElement>('rect')!;
    expect(getComputedStyle(bar).fill).toBe('rgb(3, 169, 244)');
  });

  it.each([
    ['24h' as const, 96, 24],
    ['7d' as const, 168, 7],
  ])('renders %s as %i buckets folded into positive-width bars', async (range, count, expected) => {
    mockHassCall.mockResolvedValue({
      buckets: Array.from({ length: count }, (_, i) =>
        mkBucket(new Date(2024, 0, 1, 0, i * 15).toISOString(), i % 4 === 0 ? 1 : 0)
      ),
    });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    el.range = range;
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(expected));

    const widths = Array.from(el.shadowRoot!.querySelectorAll<SVGRectElement>('.bar')).map((r) =>
      parseFloat(r.getAttribute('width') ?? '0')
    );
    expect(widths).toHaveLength(expected);
    expect(widths.every((width) => width > 0)).toBe(true);
  });
});

// ─── usage pane bucket folding ────────────────────────────────────────────────

describe('TankWaterChart – usage bucket folding', () => {
  function fifteenMinuteBuckets(count: number, liters = 1) {
    return Array.from({ length: count }, (_, i) =>
      mkBucket(new Date(Date.UTC(2024, 0, 1, 0, i * 15)).toISOString(), liters)
    );
  }

  it('folds a 96-bucket 24h response into 24 hourly bars', async () => {
    mockHassCall.mockResolvedValue({ buckets: fifteenMinuteBuckets(96) });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    el.range = '24h';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(24));
  });

  it('sums the liters of the buckets it folds together', async () => {
    // 96 buckets of 1 L each, folded 4:1, is 4 L in every hourly bar.
    mockHassCall.mockResolvedValue({ buckets: fifteenMinuteBuckets(96) });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    el.range = '24h';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(24));

    const pane = el.shadowRoot!.querySelector<HTMLElement>('.usage-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 240,
      height: 64,
    } as DOMRect);
    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 5,
        pointerId: 1,
        pointerType: 'touch',
      })
    );
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('chart-scrub-tooltip')!.shadowRoot!.textContent).toContain(
      '4.0 L'
    );
  });

  it('folds a 168-bucket 7d response into 7 daily bars', async () => {
    mockHassCall.mockResolvedValue({
      buckets: Array.from({ length: 168 }, (_, i) =>
        mkBucket(new Date(Date.UTC(2024, 0, 1, i)).toISOString(), 0.5)
      ),
    });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    el.range = '7d';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(7));
  });

  it('leaves a response that is already under the target alone', async () => {
    mockHassCall.mockResolvedValue({ buckets: fifteenMinuteBuckets(4) });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    el.range = '1h';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(4));
  });
});

// ─── tank level header ────────────────────────────────────────────────────────

describe('TankWaterChart – tank level header', () => {
  beforeEach(() => {
    mockHassCall.mockResolvedValue({ buckets: [] });
  });

  it('titles the card Tank Level', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.tank-title')!.textContent).toContain('Tank Level')
    );
  });

  it('reads the live fill level out of the configured tank', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ fillLevel: 84 })]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.tank-level')!.textContent).toContain('84.0 %')
    );
  });

  it('averages the fill level across several tanks', async () => {
    const el = createElement();
    el.device = mkDevice([
      mkTank({ fillLevel: 80 }),
      mkTank({ sensorEntity: 'sensor.tank_2_level', fillLevel: 60 }),
    ]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.tank-level')!.textContent).toContain('70.0 %')
    );
  });

  it('shows the time remaining in days once it is more than two days out', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ hoursRemaining: 74.4 })]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.tank-remaining')!.textContent).toContain('3.1 d left')
    );
  });

  it('shows the time remaining in hours when depletion is near', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ hoursRemaining: 9 })]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.tank-remaining')!.textContent).toContain('9 h left')
    );
  });

  it('omits the remaining readout when the backend has no estimate', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ hoursRemaining: null })]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.tank-level')).not.toBeNull());
    expect(el.shadowRoot!.querySelector('.tank-remaining')).toBeNull();
  });

  it('badges the header with the range being shown', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.range = '6h';
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.range-badge')!.textContent).toContain('6h')
    );
  });
});

// ─── level pane ───────────────────────────────────────────────────────────────

describe('TankWaterChart – level pane', () => {
  beforeEach(() => {
    mockHassCall.mockResolvedValue({ buckets: [] });
  });

  /** Every y coordinate in the first level trace's path data. */
  function traceYs(el: TankWaterChart): number[] {
    const d = el.shadowRoot!.querySelector('.level-trace')!.getAttribute('d')!;
    return Array.from(d.matchAll(/[ML]\s*[-\d.eE+]+,([-\d.eE+]+)/g)).map((m) => parseFloat(m[1]));
  }

  /** A descending level trace over the last `hours` hours, one sample an hour. */
  function levelHistory(values: number[], entityId = 'sensor.tank_1_level') {
    const now = Date.now();
    const step = 3_600_000;
    return values.map((value, i) => ({
      entity_id: entityId,
      state: String(value),
      attributes: { unit_of_measurement: '%' },
      last_changed: new Date(now - (values.length - 1 - i) * step).toISOString(),
    }));
  }

  it('draws a trace from the single tank history', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.sensorHistory = { irrigation_tank_level: levelHistory([90, 88, 86, 84]) };
    await el.updateComplete;
    await vi.waitFor(() => {
      const trace = el.shadowRoot!.querySelector('.level-trace');
      expect(trace).not.toBeNull();
      expect(trace!.getAttribute('d')).toMatch(/^M/);
    });
  });

  it('draws one trace per tank when several are configured', async () => {
    const el = createElement();
    el.device = mkDevice([
      mkTank(),
      mkTank({ sensorEntity: 'sensor.tank_2_level', name: 'Tank 2' }),
    ]);
    el.sensorHistory = {
      'sensor.tank_1_level': levelHistory([90, 84], 'sensor.tank_1_level'),
      'sensor.tank_2_level': levelHistory([70, 60], 'sensor.tank_2_level'),
    };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.level-trace').length).toBe(2));
  });

  it('holds the value axis at 20-100% instead of scaling to the data', async () => {
    // Both traces sit in the top half; a fitted axis would put the flatter one
    // at the frame edge. The fixed domain is what keeps refill dots and the
    // warning line comparable across ranges.
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.sensorHistory = { irrigation_tank_level: levelHistory([100, 100, 100, 100]) };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.level-trace')).not.toBeNull());

    // 100% is the top of a 20-100 domain, so every y pins to 0 in the 200-unit box.
    expect(traceYs(el)).toSatisfy((ys: number[]) => ys.every((y) => Math.abs(y) < 0.001));
    expect(el.shadowRoot!.querySelector('.level-axis-max')!.textContent).toContain('100%');
    expect(el.shadowRoot!.querySelector('.level-axis-min')!.textContent).toContain('20%');
  });

  it('places a mid-domain reading halfway down the level pane', async () => {
    // 60% on a 20-100 domain over a 200-unit box: (100 - 60) / 80 * 200 = 100.
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.sensorHistory = { irrigation_tank_level: levelHistory([60, 60, 60]) };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.level-trace')).not.toBeNull());

    expect(traceYs(el)).toSatisfy((ys: number[]) => ys.every((y) => Math.abs(y - 100) < 0.001));
  });

  it('renders the tank warning level as an in-range warning Limit', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ warningLevel: 25 })]);
    el.sensorHistory = { irrigation_tank_level: levelHistory([90, 84]) };
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('[data-guide-id="tank-warning-0"]')).not.toBeNull()
    );

    // 25% on a 20-100 domain over a 200-unit box: (100 - 25) / 80 * 200 = 187.5
    const line = el.shadowRoot!.querySelector('[data-guide-id="tank-warning-0"]')!;
    expect(line.tagName.toLowerCase()).toBe('line');
    expect(line.getAttribute('data-guide-placement')).toBe('line');
    expect(line.getAttribute('stroke')).toContain('--gm-status-warning');
    expect(line.getAttribute('stroke-dasharray')).toBe('2 2.5');
    expect(parseFloat(line.getAttribute('y1')!)).toBeCloseTo(187.5, 1);
  });

  it('renders an off-scale tank warning Limit as a lower-edge chevron', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ warningLevel: 10 })]);
    el.sensorHistory = { irrigation_tank_level: levelHistory([90, 84]) };
    await el.updateComplete;

    const mark = el.shadowRoot!.querySelector('[data-guide-id="tank-warning-0"]')!;
    expect(mark.tagName.toLowerCase()).toBe('path');
    expect(mark.getAttribute('data-guide-placement')).toBe('lower-edge');
  });

  it('keeps the level pane framed when no history has arrived yet', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.level-pane')).not.toBeNull());
    expect(el.shadowRoot!.querySelector('.level-trace')).toBeNull();
  });
});

// ─── level tooltip ────────────────────────────────────────────────────────────

describe('TankWaterChart – level tooltip', () => {
  beforeEach(() => {
    mockHassCall.mockResolvedValue({ buckets: [] });
  });

  function levelHistory(values: Array<{ minutesAgo: number; value: number }>) {
    const now = Date.now();
    return values.map(({ minutesAgo, value }) => ({
      entity_id: 'sensor.tank_1_level',
      state: String(value),
      attributes: { unit_of_measurement: '%' },
      last_changed: new Date(now - minutesAgo * 60_000).toISOString(),
    }));
  }

  it('shows tank fill percentage and cursor time on hover', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ name: 'Main Tank' })]);
    el.range = '1h';
    el.sensorHistory = {
      irrigation_tank_level: levelHistory([
        { minutesAgo: 50, value: 40 },
        { minutesAgo: 30, value: 42 },
      ]),
    };
    await el.updateComplete;

    const pane = el.shadowRoot!.querySelector<HTMLElement>('.level-pane')!;
    expect(getComputedStyle(pane).touchAction).toBe('pan-y');
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 200,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 400,
        pointerId: 1,
        pointerType: 'touch',
      })
    );
    await el.updateComplete;

    const tooltip = el.shadowRoot!.querySelector<HTMLElement>('.tank-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Main Tank');
    expect(tooltip!.textContent).toContain('42.0 %');
    expect(tooltip!.textContent).toContain('Warning limit');
    expect(tooltip!.textContent).toContain('25.0 %');
    expect(tooltip!.textContent).toMatch(/\d{2}:\d{2}/);
    expect(tooltip!.style.left).toBe('400px');
  });

  it('exposes the level metric, window, statistics and current value as one image', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank({ name: 'Main Tank' })]);
    el.range = '1h';
    el.sensorHistory = {
      irrigation_tank_level: levelHistory([
        { minutesAgo: 50, value: 40 },
        { minutesAgo: 30, value: 60 },
      ]),
    };
    await el.updateComplete;

    const svg = el.shadowRoot!.querySelector('.level-pane svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(
      'Tank Level, 1h window. Main Tank: range 40.0% to 60.0%, average 50.0%, current 60.0%.'
    );
  });

  it('names the level chart as having no data before history arrives', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;

    const svg = el.shadowRoot!.querySelector('.level-pane svg')!;
    expect(svg.getAttribute('aria-label')).toBe('Tank Level, 24h window, no data.');
  });

  it('clears the tooltip when the pointer leaves the level pane', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.range = '1h';
    el.sensorHistory = {
      irrigation_tank_level: levelHistory([
        { minutesAgo: 50, value: 40 },
        { minutesAgo: 30, value: 42 },
      ]),
    };
    await el.updateComplete;

    const pane = el.shadowRoot!.querySelector<HTMLElement>('.level-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 200,
    } as DOMRect);
    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 400,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.tank-tooltip')).not.toBeNull();

    pane.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch' }));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.tank-tooltip')).toBeNull();
  });
});

// ─── refill markers ───────────────────────────────────────────────────────────

describe('TankWaterChart – refill markers', () => {
  beforeEach(() => {
    mockHassCall.mockResolvedValue({ buckets: [] });
  });

  function levelHistory(values: number[], entityId = 'sensor.tank_1_level') {
    const now = Date.now();
    const step = 3_600_000;
    return values.map((value, i) => ({
      entity_id: entityId,
      state: String(value),
      attributes: { unit_of_measurement: '%' },
      last_changed: new Date(now - (values.length - 1 - i) * step).toISOString(),
    }));
  }

  it('rings the sample where the level jumps back up', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    // Draws down to 30%, is refilled to 95%, then draws down again.
    el.sensorHistory = { irrigation_tank_level: levelHistory([50, 40, 30, 95, 90, 85]) };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.refill-dot').length).toBe(1));
  });

  it('puts the marker at the level the tank was filled to', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.sensorHistory = { irrigation_tank_level: levelHistory([50, 40, 100, 95]) };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.refill-dot')).not.toBeNull());

    // 100% is the top of the 20-100 domain.
    const dot = el.shadowRoot!.querySelector('.refill-dot')!;
    expect(parseFloat(dot.getAttribute('cy')!)).toBeCloseTo(0, 3);
  });

  it('marks every refill in the window', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.sensorHistory = {
      irrigation_tank_level: levelHistory([60, 40, 90, 70, 50, 95, 80]),
    };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.refill-dot').length).toBe(2));
  });

  it('ignores sensor noise that is not a refill', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    // A steady draw-down with a 1-point wobble: no tank was topped up here.
    el.sensorHistory = { irrigation_tank_level: levelHistory([84, 83, 84, 82, 81]) };
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.level-trace')).not.toBeNull());
    expect(el.shadowRoot!.querySelectorAll('.refill-dot').length).toBe(0);
  });
});

// ─── usage pane chrome ────────────────────────────────────────────────────────

describe('TankWaterChart – usage pane chrome', () => {
  function hourlyBuckets(liters: number[]) {
    return liters.map((value, i) =>
      mkBucket(new Date(Date.UTC(2024, 0, 1, i)).toISOString(), value)
    );
  }

  it('caps the pane with the tallest bar so full height has a value', async () => {
    mockHassCall.mockResolvedValue({ buckets: hourlyBuckets([1, 4.5, 2]) });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.usage-peak')!.textContent).toContain('4.5 L')
    );
  });

  it('caps the pane with the range total', async () => {
    mockHassCall.mockResolvedValue({ buckets: hourlyBuckets([1, 4.5, 2]) });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.usage-total')!.textContent).toContain('7.5 L')
    );
  });

  it('totals the raw response, not the folded bars', async () => {
    // 96 × 0.25 L is 24 L however it is bucketed.
    mockHassCall.mockResolvedValue({
      buckets: Array.from({ length: 96 }, (_, i) =>
        mkBucket(new Date(Date.UTC(2024, 0, 1, 0, i * 15)).toISOString(), 0.25)
      ),
    });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.range = '24h';
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.usage-total')!.textContent).toContain('24.0 L')
    );
  });

  it('anchors the X axis with the range on the left and Now on the right', async () => {
    mockHassCall.mockResolvedValue({ buckets: hourlyBuckets([1, 2]) });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.range = '6h';
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.usage-axis-left')!.textContent).toContain('-6h')
    );
    expect(el.shadowRoot!.querySelector('.usage-axis-right')!.textContent).toContain('Now');
  });

  it('keeps the X axis caps when the range has no irrigation', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.range = '7d';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.usage-empty')).not.toBeNull());
    expect(el.shadowRoot!.querySelector('.usage-axis-left')!.textContent).toContain('-7d');
  });

  it.each([
    ['6h' as const, 24, '24 × 15 min'],
    ['24h' as const, 96, '24 × 1 h'],
    ['7d' as const, 168, '7 × 1 d'],
  ])('summarises %s as %i buckets folded to "%s"', async (range, count, summary) => {
    mockHassCall.mockResolvedValue({
      buckets: Array.from({ length: count }, (_, i) =>
        mkBucket(new Date(Date.UTC(2024, 0, 1, 0, i * 15)).toISOString(), 1)
      ),
    });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.range = range;
    await el.updateComplete;
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector('.usage-buckets')!.textContent).toContain(summary)
    );
  });
});

// ─── usage pane geometry ──────────────────────────────────────────────────────

describe('TankWaterChart – usage pane geometry', () => {
  it('grows the tallest bar to the full height of the plot box', async () => {
    mockHassCall.mockResolvedValue({
      buckets: [mkBucket('2024-01-01T00:00:00Z', 1), mkBucket('2024-01-01T01:00:00Z', 4)],
    });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(2));

    const svg = el.shadowRoot!.querySelector('.usage-pane svg')!;
    const boxHeight = parseFloat(svg.getAttribute('viewBox')!.split(' ')[3]);
    const tallest = el.shadowRoot!.querySelectorAll<SVGRectElement>('.bar')[1];
    const bottom =
      parseFloat(tallest.getAttribute('y')!) + parseFloat(tallest.getAttribute('height')!);

    expect(parseFloat(tallest.getAttribute('height')!)).toBeCloseTo(boxHeight, 3);
    expect(bottom).toBeCloseTo(boxHeight, 3);
  });

  it('renders the bars inside the pane rather than overflowing it', async () => {
    mockHassCall.mockResolvedValue({ buckets: [mkBucket('2024-01-01T00:00:00Z', 4)] });
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.bar')).not.toBeNull());

    const pane = el.shadowRoot!.querySelector('.usage-pane')!.getBoundingClientRect();
    const svg = el.shadowRoot!.querySelector('.usage-pane svg')!.getBoundingClientRect();
    expect(svg.height).toBeLessThanOrEqual(pane.height + 0.5);
  });

  it('keeps the retry button clickable instead of clipping it out of the pane', async () => {
    mockHassCall.mockRejectedValue(new Error('network error'));
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await vi.waitFor(() =>
      expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.retry-button')).not.toBeNull()
    );

    const pane = el.shadowRoot!.querySelector('.usage-pane')!.getBoundingClientRect();
    const button = el.shadowRoot!.querySelector('.retry-button')!.getBoundingClientRect();
    expect(button.height).toBeGreaterThan(0);
    expect(button.bottom).toBeLessThanOrEqual(pane.bottom + 0.5);
    expect(button.top).toBeGreaterThanOrEqual(pane.top - 0.5);
  });
});

// ─── closing the graph ────────────────────────────────────────────────────────

describe('TankWaterChart – toggle-graph', () => {
  beforeEach(() => {
    mockHassCall.mockResolvedValue({ buckets: [] });
  });

  it('asks the host to close the graph when the header is clicked', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.tank-header')).not.toBeNull());

    const seen: CustomEvent[] = [];
    el.addEventListener('toggle-graph', (e) => seen.push(e as CustomEvent));
    el.shadowRoot!.querySelector<HTMLElement>('.tank-header')!.click();

    expect(seen).toHaveLength(1);
    expect(seen[0].composed).toBe(true);
  });

  it('names the metric it was routed for, so the right graph closes', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    el.metricKey = 'irrigation_tank_level';
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.tank-header')).not.toBeNull());

    const seen: CustomEvent[] = [];
    el.addEventListener('toggle-graph', (e) => seen.push(e as CustomEvent));
    el.shadowRoot!.querySelector<HTMLElement>('.tank-header')!.click();

    expect(seen[0].detail).toBe('irrigation_tank_level');
  });

  it('closes the water graph by default, the metric it has always been routed for', async () => {
    const el = createElement();
    el.device = mkDevice([mkTank()]);
    await el.updateComplete;
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.tank-header')).not.toBeNull());

    const seen: CustomEvent[] = [];
    el.addEventListener('toggle-graph', (e) => seen.push(e as CustomEvent));
    el.shadowRoot!.querySelector<HTMLElement>('.tank-header')!.click();

    expect(seen[0].detail).toBe('water');
  });
});
