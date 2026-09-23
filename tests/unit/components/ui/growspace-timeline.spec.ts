import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrowspaceTimeline } from '../../../../src/features/shared/ui/growspace-timeline';
import '../../../../src/features/shared/ui/growspace-timeline';

const { mockFetchGrowspaceEvents } = vi.hoisted(() => ({
  mockFetchGrowspaceEvents: vi.fn(),
}));

vi.mock('../../../../src/slices/logbook', () => ({
  fetchGrowspaceEvents: mockFetchGrowspaceEvents,
}));

const events = [
  {
    growspace_id: 'tent',
    category: 'note',
    timestamp: '2026-09-23T10:00:00',
    notes: 'Checked leaves',
    reasons: [],
  },
  {
    growspace_id: 'tent',
    category: 'alert',
    sensor_type: 'temperature',
    timestamp: '2026-09-23T08:00:00',
    reasons: ['High temperature'],
    severity: 0.9,
  },
  {
    growspace_id: 'tent',
    category: 'irrigation',
    sensor_type: 'water',
    timestamp: '2026-09-22T18:00:00',
    reasons: [],
  },
];

async function createTimeline(): Promise<GrowspaceTimeline> {
  const element = await fixture<GrowspaceTimeline>(html`
    <growspace-timeline .hass=${{}} .growspaceId=${'tent'}></growspace-timeline>
  `);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
  return element;
}

describe('GrowspaceTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchGrowspaceEvents.mockResolvedValue(events);
  });

  it('groups events by day and opens the newest day', async () => {
    const element = await createTimeline();
    const root = element.shadowRoot!;
    expect(mockFetchGrowspaceEvents).toHaveBeenCalledWith('tent', 100);
    expect(root.querySelectorAll('.day')).toHaveLength(2);
    expect(root.querySelector('.day[aria-pressed="true"]')?.textContent).toContain('2 events');
    expect(root.querySelectorAll('.event-row')).toHaveLength(2);
    expect(root.textContent).toContain('Checked leaves');
    expect(root.textContent).toContain('High temperature');
    expect(root.querySelector('.marker-alert')).toBeTruthy();
    expect(root.textContent).not.toContain('water');
  });

  it('shows another day without overlapping or losing events', async () => {
    const element = await createTimeline();
    const days = element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.day');
    days[1].click();
    await element.updateComplete;

    expect(element.shadowRoot!.querySelectorAll('.event-row')).toHaveLength(1);
    expect(element.shadowRoot!.querySelector('.marker-water')).toBeTruthy();
    expect(days[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a busy day in a scrollable vertical sequence', async () => {
    mockFetchGrowspaceEvents.mockResolvedValueOnce(
      Array.from({ length: 24 }, (_, index) => ({
        ...events[0],
        timestamp: `2026-09-23T${String(index).padStart(2, '0')}:00:00`,
        notes: `Observation ${index}`,
      }))
    );
    const element = await createTimeline();
    element.style.width = '420px';
    element.style.height = '320px';
    await element.updateComplete;

    const detail = element.shadowRoot!.querySelector<HTMLElement>('.day-detail')!;
    const markers = element.shadowRoot!.querySelectorAll<HTMLElement>('.event-marker');
    expect(markers).toHaveLength(24);
    expect(markers[0].getBoundingClientRect().bottom).toBeLessThan(
      markers[1].getBoundingClientRect().top
    );
    expect(detail.scrollHeight).toBeGreaterThan(detail.clientHeight);
    expect(detail.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      element.getBoundingClientRect().bottom
    );
  });

  it('refreshes its selected day for a new growspace', async () => {
    const element = await createTimeline();
    element.shadowRoot!.querySelectorAll<HTMLButtonElement>('.day')[1].click();
    await element.updateComplete;
    mockFetchGrowspaceEvents.mockResolvedValueOnce([events[0]]);
    element.growspaceId = 'other';
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;

    expect(mockFetchGrowspaceEvents).toHaveBeenCalledWith('other', 100);
    expect(element.shadowRoot!.querySelectorAll('.day')).toHaveLength(1);
    expect(element.shadowRoot!.querySelector('.day')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders empty and error states', async () => {
    mockFetchGrowspaceEvents.mockResolvedValueOnce([]);
    const empty = await createTimeline();
    expect(empty.shadowRoot!.textContent).toContain('No events to display');

    mockFetchGrowspaceEvents.mockRejectedValueOnce(new Error('Fetch failed'));
    const failed = await createTimeline();
    expect(failed.shadowRoot!.querySelector('[role="alert"]')?.textContent).toContain(
      'Fetch failed'
    );
  });
});
