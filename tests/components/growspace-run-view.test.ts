import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import type {
  GrowspaceRunView,
  RunViewTab,
} from '../../src/features/grow-run/components/growspace-run-view';
import '../../src/features/grow-run/components/growspace-run-view';
import activeDetails from '../fixtures/contract/grow_run_details_v1.json';
import completedDetails from '../fixtures/contract/grow_run_completed_details_v1.json';
import finalizedDetails from '../fixtures/contract/grow_run_finalized_details_v1.json';
import comparisonFixture from '../fixtures/contract/grow_run_comparison_v1.json';
import comparisonRefused from '../fixtures/contract/grow_run_comparison_refused_v1.json';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

type Details = typeof finalizedDetails;

const SUMMARY = {
  label: null,
  started_at: '2026-01-05T20:00:00+00:00',
  completed_at: '2026-03-16T20:00:00+00:00',
  timezone: 'Europe/Berlin',
  participant_count: 2,
  metrics_state: 'frozen',
  run_revision: 9,
};
const RUNS = [
  { ...SUMMARY, run_id: 'run-2', sequence_number: 2, status: 'finalized' },
  { ...SUMMARY, run_id: 'run-1', sequence_number: 1, status: 'finalized', label: 'First' },
];

/** Answer each WebSocket read the View makes, from GSM's contract fixtures. */
function backend(
  details: Details | Record<string, unknown> = finalizedDetails,
  comparison: unknown = comparisonFixture
): void {
  hassCallMock.mockImplementation(async (type: string) => {
    if (type === 'growspace_manager/get_grow_run') return details;
    if (type === 'growspace_manager/list_grow_runs') {
      return { outcome: 'listed', run_revision: 9, runs: RUNS };
    }
    if (type === 'growspace_manager/compare_grow_runs') return comparison;
    throw new Error(`unexpected ${type}`);
  });
}

async function renderView(tab: RunViewTab = 'overview', width = 900): Promise<GrowspaceRunView> {
  const wrapper = await fixture<HTMLDivElement>(html`
    <div style="width: ${width}px">
      <growspace-run-view growspaceId="tent" runId="run-1" .tab=${tab}></growspace-run-view>
    </div>
  `);
  const runView = wrapper.querySelector<GrowspaceRunView>('growspace-run-view')!;
  await settle(runView);
  return runView;
}

async function settle(runView: GrowspaceRunView): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await runView.updateComplete;
  }
}

function $<T extends Element = HTMLElement>(runView: GrowspaceRunView, selector: string): T | null {
  return runView.shadowRoot!.querySelector<T>(selector);
}

function $$(runView: GrowspaceRunView, selector: string): HTMLElement[] {
  return [...runView.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
}

function text(runView: GrowspaceRunView, selector: string): string {
  return ($(runView, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

async function selectTab(runView: GrowspaceRunView, tab: RunViewTab): Promise<void> {
  $(runView, `[role="tab"][data-tab="${tab}"]`)!.click();
  await settle(runView);
}

beforeEach(() => {
  hassCallMock.mockReset();
});

describe('growspace-run-view', () => {
  it('names its sections as tabs, each labelling the panel it shows', async () => {
    backend();
    const runView = await renderView();
    expect($(runView, '[role="tablist"]')!.getAttribute('aria-label')).toBe('Grow run sections');
    expect($$(runView, '[role="tab"]').map((tab) => tab.textContent?.trim())).toEqual([
      'Overview',
      'Participants',
      'Performance',
      'History',
      'Compare',
    ]);
    for (const tab of ['overview', 'participants', 'performance', 'history', 'compare'] as const) {
      await selectTab(runView, tab);
      const panel = $(runView, '[role="tabpanel"]')!;
      expect(panel.dataset.tab).toBe(tab);
      expect(runView.shadowRoot!.getElementById(panel.getAttribute('aria-labelledby')!)).toBe(
        $(runView, `[role="tab"][data-tab="${tab}"]`)
      );
    }
  });

  it('gives the dialog the Run as its heading, with its status', async () => {
    backend();
    const runView = await renderView();
    const dialog = $<HTMLElement & { heading: string; subtitle: string }>(runView, 'gs-dialog')!;
    expect(dialog.heading).toBe('Run #4 · Autumn 2026');
    expect(dialog.subtitle).toBe('Finalized · Final');
  });

  describe('Overview', () => {
    it('describes the Run: dates, duration, description and lifecycle', async () => {
      backend();
      const runView = await renderView();
      expect(text(runView, '[data-testid="run-status"]')).toBe('Finalized');
      expect(text(runView, '[data-testid="run-duration"]')).toBe('70 days');
      const overview = text(runView, '[role="tabpanel"]');
      expect(overview).toContain('Beat #3');
      expect(overview).toContain('organic');
      expect(overview).toContain('Unknown: a harvest date is missing');
      expect(
        $$(runView, '[data-testid="run-audit"] li').map((row) => row.textContent)
      ).toHaveLength(4);
      expect(text(runView, '[data-testid="run-audit"]')).toContain('Description edited');
      // A Finalized Run has nothing left to act on.
      expect($(runView, '.actions')).toBeNull();
    });

    it.each([
      ['complete', activeDetails, 'complete-run'],
      ['finalize', completedDetails, 'finalize-run'],
    ])('asks the chip to %s the Run on show', async (action, details, button) => {
      backend(details as Details);
      const runView = await renderView();
      const asked = vi.fn();
      runView.addEventListener('run-view-action', (event) => asked((event as CustomEvent).detail));
      $(runView, `[data-action="${button}"]`)!.click();
      expect(asked).toHaveBeenCalledWith({ action, runId: 'run-1' });
    });

    it('closes when its frame closes', async () => {
      backend();
      const runView = await renderView();
      const closed = vi.fn();
      runView.addEventListener('closed', closed);
      $(runView, 'gs-dialog')!.dispatchEvent(new CustomEvent('close'));
      expect(closed).toHaveBeenCalledOnce();
    });

    it('says a Run the ledger no longer holds is gone, and a failed read why', async () => {
      backend({ outcome: 'not_found' });
      let runView = await renderView();
      expect(text(runView, '[role="tabpanel"]')).toBe('This run is no longer available.');

      hassCallMock.mockReset();
      hassCallMock.mockRejectedValue(new Error('socket closed'));
      runView = await renderView();
      expect(text(runView, '[role="alert"]')).toBe('Error: socket closed');
    });
  });

  describe('Participants', () => {
    it('names each Participant as frozen, with genetics and intervals', async () => {
      backend();
      const runView = await renderView('participants');
      const rows = $$(runView, '[data-testid="run-participants"] > li');
      expect(rows).toHaveLength(3);
      expect(rows[0].textContent).toContain('OG Kush (1,1)');
      expect(rows[0].textContent).toContain('OG Kush · A');
      // Never identified: named as such, not as a bare ID.
      expect(rows[2].textContent).toContain('Unnamed plant');
      expect(text(runView, '[data-testid="run-movements"]')).toContain('harvested');
    });

    it('falls back to the Plant ID when nothing ever named it', async () => {
      backend(activeDetails as Details);
      const runView = await renderView('participants');
      expect(text(runView, '[data-testid="run-participants"]')).toContain('p1');
      expect(text(runView, '[data-testid="run-participants"]')).toContain('present');
    });
  });

  describe('Performance', () => {
    it('shows a selected Run’s safety counts and latest fault acknowledgement', async () => {
      const details = structuredClone(finalizedDetails);
      const response = {
        ...details,
        run: {
          ...details.run,
          snapshot: {
            ...details.run.snapshot,
            reliability: {
              state: 'final',
              definition_version: 1,
              coverage_started_at: details.run.started_at,
              complete: true,
              counts: { fault: 2, inhibit: 1, emergency_stop: 1, ha_restart: 1 },
              latest_fault: {
                fact_id: 'fault-2',
                at: '2026-03-01T10:00:00+00:00',
                reason_code: 'pump_stuck',
                acknowledged: true,
              },
            },
          },
        },
      };
      backend(response);
      const runView = await renderView('performance');
      expect(text(runView, '[data-kind="fault"]')).toBe('2');
      expect(text(runView, '[data-kind="inhibit"]')).toBe('1');
      expect(text(runView, '[data-kind="ha_restart"]')).toBe('1');
      expect(text(runView, '[data-testid="run-latest-fault"]')).toContain(
        'pump_stuck · Mar 1, 2026 · Acknowledged'
      );
    });

    it('shows old finalized Runs as not recorded', async () => {
      const details = structuredClone(finalizedDetails);
      backend({
        ...details,
        run: {
          ...details.run,
          reliability: { state: 'not_recorded', definition_version: null },
          snapshot: { ...details.run.snapshot, reliability: null },
        },
      });
      const runView = await renderView('performance');
      expect(text(runView, '[data-testid="run-reliability"]')).toContain(
        'Not recorded for this run.'
      );
    });

    it('names each water source and leaves unknown volume incomplete', async () => {
      const details = structuredClone(finalizedDetails);
      details.run.snapshot!.water_applications = [
        {
          application_id: 'hand-1',
          at: '2026-08-01T10:00:00+00:00',
          source: 'manual',
          liters: 1.5,
        },
        {
          application_id: 'pump-1',
          at: '2026-08-02T10:00:00+00:00',
          source: 'unknown',
          liters: null,
        },
      ];
      details.run.metrics = details.run.metrics.map((metric) =>
        metric.metric === 'water_applied'
          ? {
              ...metric,
              value: null,
              complete: false,
              missing: [{ kind: 'water_volume', plant_id: 'pump-1' }],
            }
          : metric
      );
      backend(details);
      const runView = await renderView('performance');
      expect(text(runView, '[data-metric="water_applied"]')).toContain('Incomplete');
      expect(text(runView, '[data-testid="run-water-sources"]')).toContain('Recorded by grower');
      expect(text(runView, '[data-testid="run-water-sources"]')).toContain('1.5 L');
      expect(text(runView, '[data-testid="run-water-sources"]')).toContain('Volume unknown');
    });

    it.each([
      ['Active', activeDetails, 'live', 'Live'],
      ['Completed', completedDetails, 'pending', 'Pending'],
      ['Finalized', finalizedDetails, 'frozen', 'Final'],
    ])('marks a %s Run’s metrics as what they are', async (_, details, state, label) => {
      backend(details as Details);
      const runView = await renderView('performance');
      const marker = $(runView, '[data-testid="metrics-state"]')!;
      expect(marker.dataset.state).toBe(state);
      expect(marker.textContent?.trim()).toBe(label);
    });

    it('shows a missing metric as incomplete, never as zero, beside its counts', async () => {
      backend();
      const runView = await renderView('performance');
      expect(text(runView, '[data-metric="yield"]')).toBe('Incomplete (v1)');
      expect(text(runView, '[data-testid="run-counts"]')).toBe(
        'Harvested plants 2 No usable yield 0 Missing outcomes 1'
      );
      const outcomes = $$(runView, '[data-testid="run-harvest-outcomes"] li').map((row) =>
        row.textContent?.replace(/\s+/g, ' ').trim()
      );
      expect(outcomes).toEqual([
        'OG Kush (1,1) · dry weight unknown',
        'OG Kush (1,2) · 112.5 g dry',
      ]);
    });

    it('counts a live Run’s outcomes from what has arrived', async () => {
      backend(activeDetails as Details);
      const runView = await renderView('performance');
      expect(text(runView, '[data-testid="run-counts"]')).toBe(
        'Harvested plants 1 No usable yield 0 Missing outcomes 1'
      );
    });
  });

  describe('History', () => {
    it('lists the growspace’s Runs and moves the View to the one picked', async () => {
      backend();
      const runView = await renderView('history');
      const rows = $$(runView, '[data-testid="run-history"] button');
      expect(rows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Run #2 · Finalized · Jan 5, 2026 – Mar 16, 2026',
        'Run #1 · First · Finalized · Jan 5, 2026 – Mar 16, 2026',
      ]);
      // The Run on show is marked as such.
      expect(rows.map((row) => row.getAttribute('aria-current'))).toEqual(['false', 'true']);

      rows[0].click();
      await settle(runView);
      expect(runView.runId).toBe('run-2');
      expect(runView.tab).toBe('overview');
      expect(hassCallMock).toHaveBeenLastCalledWith(
        'growspace_manager/get_grow_run',
        { growspace_id: 'tent', run_id: 'run-2' },
        expect.anything()
      );
      await selectTab(runView, 'history');
      expect($(runView, '[data-run-id="run-2"]')!.getAttribute('aria-current')).toBe('true');
      // The list is read once per opening.
      expect(
        hassCallMock.mock.calls.filter(([type]) => type === 'growspace_manager/list_grow_runs')
      ).toHaveLength(1);
    });
  });

  describe('Compare', () => {
    it('treats water applied as neutral and water productivity as higher is better', async () => {
      backend();
      const runView = await renderView('compare');
      expect(text(runView, 'tr[data-metric="water_applied"] td.change')).toBe('Lower by 1 L');
      expect(text(runView, 'tr[data-metric="water_productivity"] td.change')).toBe(
        'Higher by 15 g/L (better)'
      );
    });

    it('defaults to the newest Finalized Run and its predecessor', async () => {
      backend();
      const runView = await renderView('compare');
      expect(hassCallMock).toHaveBeenCalledWith(
        'growspace_manager/compare_grow_runs',
        { growspace_id: 'tent' },
        expect.anything()
      );
      expect($<HTMLSelectElement>(runView, '#run-compare-later')!.value).toBe('run-6');
      expect($<HTMLSelectElement>(runView, '#run-compare-earlier')!.value).toBe('run-5');
      expect($$(runView, 'thead th').map((cell) => cell.textContent?.trim())).toEqual([
        'Run #5 · Autumn 2026',
        'Run #6 · Autumn 2026',
        'Change',
      ]);
    });

    it('shows Yield moving without judging it', async () => {
      backend();
      const runView = await renderView('compare');
      const row = $(runView, 'tr[data-metric="yield"]')!;
      expect(row.dataset.state).toBe('comparable');
      expect([...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim())).toEqual([
        '150 g',
        '180 g',
        'Higher by 30 g',
      ]);
      expect(row.textContent).not.toMatch(/better|worse/);
      expect(text(runView, '[role="tabpanel"]')).toContain(
        'Yield is shown without a better or worse judgment'
      );
    });

    it('sets the Runs’ context side by side, with no direction', async () => {
      backend();
      const runView = await renderView('compare');
      const context = $$(runView, 'tr[data-context]').map((row) => [
        row.querySelector('th')!.textContent!.trim(),
        ...[...row.querySelectorAll('td')].map((cell) => cell.textContent!.trim()),
      ]);
      expect(context.map(([label]) => label)).toEqual([
        'Participants',
        'Harvested plants',
        'Strains',
        'Duration',
        'Harvest window',
        'Coverage',
        'No usable yield',
        'Missing outcomes',
        'Unrecorded stretches',
      ]);
      expect(context[2]).toEqual([
        'Strains',
        'Unknown strain (1), OG Kush (2)',
        'Unknown strain (1), OG Kush (2)',
        '',
      ]);
    });

    it('compares the pair the grower picks', async () => {
      backend();
      const runView = await renderView('compare');
      const earlier = $<HTMLSelectElement>(runView, '#run-compare-earlier')!;
      // Run #4 is the fixture's first Run, whose id is `run-1`.
      earlier.value = 'run-1';
      earlier.dispatchEvent(new Event('change'));
      await settle(runView);
      expect(hassCallMock).toHaveBeenLastCalledWith(
        'growspace_manager/compare_grow_runs',
        { growspace_id: 'tent', run_ids: ['run-6', 'run-1'] },
        expect.anything()
      );

      const later = $<HTMLSelectElement>(runView, '#run-compare-later')!;
      later.value = 'run-5';
      later.dispatchEvent(new Event('change'));
      await settle(runView);
      expect(hassCallMock).toHaveBeenLastCalledWith(
        'growspace_manager/compare_grow_runs',
        { growspace_id: 'tent', run_ids: ['run-5', 'run-5'] },
        expect.anything()
      );
    });

    it('labels both pickers', async () => {
      backend();
      const runView = await renderView('compare');
      for (const [id, name] of [
        ['run-compare-later', 'Run'],
        ['run-compare-earlier', 'Compared with'],
      ]) {
        const label = $(runView, `label[for="${id}"]`)!;
        expect(label.textContent).toContain(name);
        expect(label.querySelector(`#${id}`)).not.toBeNull();
      }
    });

    it.each([
      ['missing', {}, 'Not comparable: a value is missing'],
      [
        'incompatible',
        { later: { ...comparisonFixture.comparison.metrics[0].later, definition_version: 2 } },
        'Not comparable: calculated differently (v1 and v2)',
      ],
      ['unavailable', { earlier: null }, 'Not recorded for both runs'],
    ])('says why a %s row has no direction', async (state, change, words) => {
      const [first, ...rest] = comparisonFixture.comparison.metrics;
      backend(finalizedDetails, {
        ...comparisonFixture,
        comparison: {
          ...comparisonFixture.comparison,
          metrics: [
            { ...first, ...change, state, delta: null, direction: null, judgment: null },
            ...rest,
          ],
        },
      });
      const runView = await renderView('compare');
      const cell = $(runView, 'tr[data-metric="yield"] td.change')!;
      expect(cell.textContent?.trim()).toBe(words);
      expect(cell.dataset.direction).toBe('');
    });

    it('judges a metric only against an agreed goal', async () => {
      const [first, ...rest] = comparisonFixture.comparison.metrics;
      backend(finalizedDetails, {
        ...comparisonFixture,
        comparison: {
          ...comparisonFixture.comparison,
          metrics: [{ ...first, goal: 'higher', judgment: 'better' }, ...rest],
        },
      });
      const runView = await renderView('compare');
      expect(text(runView, 'tr[data-metric="yield"] td.change')).toBe('Higher by 30 g (better)');
    });

    it('says why there is nothing to compare yet', async () => {
      backend(finalizedDetails, comparisonRefused);
      const runView = await renderView('compare');
      expect(text(runView, '[data-testid="compare-refusal"]')).toBe(
        'Finalize at least two runs in this growspace to compare them.'
      );
      expect($(runView, 'table')).toBeNull();
    });

    it('stacks each row under its label at phone width', async () => {
      backend();
      const runView = await renderView('compare', 360);
      const row = $(runView, 'tr[data-metric="yield"]')!;
      expect(getComputedStyle(row).display).toBe('grid');
      expect(getComputedStyle($(runView, 'thead')!).position).toBe('absolute');
      const table = $(runView, 'table')!;
      expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(360);
      expect(getComputedStyle(row.querySelector('td')!, '::before').content).toBe(
        '"Run #5 · Autumn 2026"'
      );
      // A context row has no change, so no empty caption for one.
      const context = $(runView, 'tr[data-context] td.change')!;
      expect(getComputedStyle(context).display).toBe('none');
    });

    it('keeps the four columns at dialog width', async () => {
      backend();
      const runView = await renderView('compare', 900);
      expect(getComputedStyle($(runView, 'tr[data-metric="yield"]')!).display).toBe('table-row');
    });
  });
});
