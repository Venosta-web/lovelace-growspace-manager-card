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

  it('calls hassCall with device id and range on connectedCallback', async () => {
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
      expect.anything(),
    );
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

  it('sets buckets to empty array on fetch error', async () => {
    mockHassCall.mockRejectedValue(new Error('network error'));
    const el = createElement();
    el.device = { deviceId: 'gs-1' } as any;
    await el.updateComplete;
    await vi.waitFor(() => !el.shadowRoot!.querySelector('.loading'));
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull();
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
    expect(el.shadowRoot!.querySelector('.loading')).not.toBeNull();
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
      (t) => t.textContent ?? '',
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
});
