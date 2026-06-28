/**
 * Irrigation Water Analytics Tab Component — mount-and-assert test (ADR-0019).
 *
 * Mounts the dumb presentational element from a hand-built ViewModel — no state
 * machine, no slices, no host — and asserts both halves of its contract:
 * `{ vm-in }` (KPI cards, tank levels, schedule summary, stage aggregates,
 * volume history render from the VM) and `{ intents-out }` (the two semantic Tab
 * Intents: open-steering link + reset-tracking button). The component holds no
 * `@state()`.
 */
import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { IrrigationWaterAnalyticsTab } from '../../../../../src/features/irrigation/components/irrigation-water-analytics-tab';
import type { WaterAnalyticsTabViewModel } from '../../../../../src/features/irrigation/viewmodels/water-analytics-tab.viewmodel';

if (!customElements.get('irrigation-water-analytics-tab')) {
  customElements.define('irrigation-water-analytics-tab', IrrigationWaterAnalyticsTab);
}

function makeVm(overrides: Partial<WaterAnalyticsTabViewModel> = {}): WaterAnalyticsTabViewModel {
  return {
    hasPump: false,
    cyclesToday: 0,
    volumeDispensedToday: 0,
    lastCycleTimestamp: null,
    nextScheduledCycle: null,
    waterUsage: undefined,
    avgRunoff: null,
    readingsWithVolumesCount: 0,
    tanks: [],
    warningTankCount: 0,
    avgTankLevel: null,
    hasTankSensors: false,
    tankLitersToday: 0,
    tankLiters7d: 0,
    tankAvgPerDay: 0,
    tankBuckets24h: [],
    tankRefills: [],
    hasTankHistory: false,
    isCropSteering: false,
    cropSteering: { shots: [], drainRows: [], totalDrain: 0, drainDuration: 0 },
    schedule: {
      totalIrrig: 0,
      totalDrain: 0,
      irrigDuration: 0,
      drainDuration: 0,
      irrigRows: [],
      drainRows: [],
    },
    stageAggregates: null,
    hasDrainPumpEntity: false,
    volumeRows: [],
    totalFeedMl: 0,
    totalDrainMl: 0,
    ...overrides,
  };
}

async function mount(vm: WaterAnalyticsTabViewModel): Promise<IrrigationWaterAnalyticsTab> {
  const el = await fixture<IrrigationWaterAnalyticsTab>(
    html`<irrigation-water-analytics-tab .vm=${vm}></irrigation-water-analytics-tab>`
  );
  await el.updateComplete;
  return el;
}

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function captureIntent(
  el: IrrigationWaterAnalyticsTab,
  type: string,
  act: () => void
): Promise<CustomEvent> {
  return await new Promise<CustomEvent>((resolve) => {
    el.addEventListener(type, (e) => resolve(e as CustomEvent), { once: true });
    act();
  });
}

describe('irrigation-water-analytics-tab', () => {
  it('holds no @state() of its own — only the `vm` reactive property', () => {
    const props = (
      IrrigationWaterAnalyticsTab as unknown as {
        elementProperties: Map<string, { state?: boolean }>;
      }
    ).elementProperties;
    const stateProps = [...props.entries()].filter(([, def]) => def.state === true);
    expect(stateProps).toEqual([]);
  });

  it('renders today-usage KPIs from the VM when pump-gated', async () => {
    const el = await mount(
      makeVm({
        hasPump: true,
        waterUsage: { litersToday: 10.5, litersPerPlantPerDay: 0.65, waterEfficiency: 0.85 } as any,
        avgRunoff: 20,
        readingsWithVolumesCount: 1,
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('10.5');
    expect(text).toContain('0.65');
    expect(text).toContain('85'); // efficiency %
    expect(text).toContain('Excellent');
    expect(text).toContain('20.0'); // runoff
  });

  it('hides the pump-gated cards when hasPump is false', async () => {
    const el = await mount(makeVm({ hasPump: false }));
    const text = norm(el.shadowRoot!.textContent);
    expect(text).not.toContain("Today's Usage");
    expect(text).not.toContain('Cycle Telemetry');
  });

  it('renders tank levels with a warning badge', async () => {
    const el = await mount(
      makeVm({
        tanks: [{ name: 'Warning Tank', fillLevel: 10, isWarning: true, hoursRemaining: 20 }],
        warningTankCount: 1,
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Tank Levels');
    expect(text).toContain('Warning Tank');
    expect(text).toContain('⚠');
  });

  it('renders the full 24h consumption history from tankBuckets24h (not a truncated slice)', async () => {
    // Regression: the 24h chart used to bucket only the last 20 raw events, so
    // consumption from earlier in the day vanished. It now renders the backend's
    // full-data buckets. A bucket ~20h ago must still produce a bar.
    const align = (ms: number): string => {
      const bucket15 = 15 * 60 * 1000;
      return new Date(Math.floor(ms / bucket15) * bucket15).toISOString();
    };
    const now = Date.now();
    const el = await mount(
      makeVm({
        hasTankSensors: true,
        hasTankHistory: true,
        tankLitersToday: 32.8,
        tankBuckets24h: [
          { ts: align(now - 20 * 60 * 60 * 1000), liters: 3.5 }, // ~20h ago
          { ts: align(now - 30 * 60 * 1000), liters: 1.25 }, // recent
        ],
        tankRefills: [
          { event_type: 'refill', timestamp: align(now - 60 * 60 * 1000), liters: 7.8 } as any,
        ],
      })
    );
    const titles = [...el.shadowRoot!.querySelectorAll('[title]')].map((n) =>
      n.getAttribute('title')
    );
    // The old, earlier-in-the-day bucket must be present (not truncated away).
    expect(titles.some((t) => t?.includes('3.50 L'))).toBe(true);
    expect(titles.some((t) => t?.includes('1.25 L'))).toBe(true);
    // Refills render from the VM's tankRefills summary.
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('Recent refills');
    expect(text).toContain('+7.8 L');
  });

  it('renders the plain schedule summary from the VM rows', async () => {
    const el = await mount(
      makeVm({
        schedule: {
          totalIrrig: 1,
          totalDrain: 1,
          irrigDuration: 30,
          drainDuration: 45,
          irrigRows: [{ time: '08:00', duration: 30 }],
          drainRows: [{ time: '09:00', duration: 45 }],
        },
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('1 events/day');
    expect(text).toContain('08:00');
    expect(text).toContain('09:00');
  });

  it('renders the crop-steering shot summary and stage aggregates', async () => {
    const el = await mount(
      makeVm({
        isCropSteering: true,
        cropSteering: {
          shots: [{ time: '06:00:00', duration: 30 } as any],
          drainRows: [],
          totalDrain: 0,
          drainDuration: 0,
        },
        stageAggregates: { veg: 15, flower: 25 },
      })
    );
    const text = norm(el.shadowRoot!.textContent);
    expect(text).toContain('shots/day');
    expect(text).toContain('edit in Steering');
    expect(text).toContain('Water Usage by Growth Stage');
    expect(text).toContain('25.0 L');
  });

  it('renders the volume-history table when gated on a drain pump entity', async () => {
    const el = await mount(
      makeVm({
        hasDrainPumpEntity: true,
        totalFeedMl: 1000,
        totalDrainMl: 200,
        avgRunoff: 20,
        volumeRows: [
          {
            timestamp: '2026-01-01T12:00:00Z',
            feedVolumeMl: 1000,
            drainVolumeMl: 200,
            runoff: 20,
            ecDelta: 0.3,
          },
        ],
      })
    );
    const rows = el.shadowRoot!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(norm(rows[0].textContent)).toContain('20.0%');
    expect(norm(rows[0].textContent)).toContain('+0.30');
  });

  it('emits water-analytics-open-steering when the edit link is clicked', async () => {
    const el = await mount(
      makeVm({
        isCropSteering: true,
        cropSteering: {
          shots: [{ time: '06:00:00', duration: 30 } as any],
          drainRows: [],
          totalDrain: 0,
          drainDuration: 0,
        },
      })
    );
    const link = Array.from(el.shadowRoot!.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('edit in Steering')
    )!;
    const ev = await captureIntent(el, 'water-analytics-open-steering', () => link.click());
    expect(ev.type).toBe('water-analytics-open-steering');
  });

  it('emits water-analytics-reset-tracking when Reset All Data is clicked', async () => {
    const el = await mount(makeVm());
    const btn = Array.from(el.shadowRoot!.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reset All Data')
    )!;
    const ev = await captureIntent(el, 'water-analytics-reset-tracking', () => btn.click());
    expect(ev.type).toBe('water-analytics-reset-tracking');
  });
});
