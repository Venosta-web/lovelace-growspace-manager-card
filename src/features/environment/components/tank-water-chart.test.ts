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
  it('shows empty message when buckets array is empty', async () => {
    mockHassCall.mockResolvedValue({ buckets: [] });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelector('.empty') !== null);
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toContain('No water data');
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

  it('each bar has a title with timestamp and liter value', async () => {
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelectorAll('rect').length === 3);
    const titles = Array.from(el.shadowRoot!.querySelectorAll('rect title')).map(
      (t) => t.textContent ?? ''
    );
    expect(titles[0]).toContain('4.0 L');
    expect(titles[1]).toContain('2.0 L');
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

  it.each([96, 168])('renders positive-width bars for a %i-bucket response', async (count) => {
    mockHassCall.mockResolvedValue({
      buckets: Array.from({ length: count }, (_, i) =>
        mkBucket(new Date(2024, 0, 1, 0, i * 15).toISOString(), i % 4 === 0 ? 1 : 0)
      ),
    });
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => el.shadowRoot!.querySelectorAll('rect').length === count);

    const widths = Array.from(el.shadowRoot!.querySelectorAll<SVGRectElement>('rect')).map((r) =>
      parseFloat(r.getAttribute('width') ?? '0')
    );
    expect(widths).toHaveLength(count);
    expect(widths.every((width) => width > 0)).toBe(true);
  });
});
