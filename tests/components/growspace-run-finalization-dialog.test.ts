import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import type { RunSnapshot } from '../../src/slices/grow-run/details-schema';
import type { RunView } from '../../src/slices/grow-run';
import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
import type { GrowspaceRunFinalizationDialog } from '../../src/features/grow-run/components/growspace-run-finalization-dialog';
import '../../src/features/grow-run/components/growspace-run-finalization-dialog';
import '../../src/features/grow-run/components/growspace-run-chip';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const RUN = {
  run_id: 'run-4',
  sequence_number: 4,
  label: 'Autumn',
  status: 'completed' as const,
  started_at: '2026-07-24T20:30:00+00:00',
  completed_at: '2026-10-02T20:30:00+00:00',
  timezone: 'Europe/Berlin',
  participant_count: 3,
  metrics_state: 'pending' as const,
  run_revision: 5,
};

/** GSM's `grow_run_finalization_preview_v1` snapshot: p1 still unweighed. */
function snapshot(extra: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    format: 1,
    finalized_at: '2026-10-23T20:30:00+00:00',
    run_id: 'run-4',
    growspace_id: 'tent',
    growspace_name: 'Tent',
    sequence_number: 4,
    timezone: 'Europe/Berlin',
    started_at: '2026-07-24T20:30:00+00:00',
    completed_at: '2026-10-02T20:30:00+00:00',
    duration_days: 70,
    harvest_window: null,
    participants: [
      {
        plant_id: 'p1',
        plant_name: 'OG Kush (1,1)',
        strain_id: 7,
        strain_name: 'OG Kush',
        phenotype_id: 11,
        phenotype_name: 'A',
      },
      {
        plant_id: 'p2',
        plant_name: 'OG Kush (1,2)',
        strain_id: 7,
        strain_name: 'OG Kush',
        phenotype_id: 12,
        phenotype_name: 'Pheno #1',
      },
      {
        plant_id: 'p3',
        plant_name: '',
        strain_id: null,
        strain_name: '',
        phenotype_id: null,
        phenotype_name: '',
      },
    ],
    counts: {
      participants: 3,
      harvest_source_plants: 2,
      recorded: 1,
      no_usable_yield: 0,
      missing_outcomes: 1,
    },
    strains: [
      { strain_id: null, strain_name: '', participants: 1, harvest_source_plants: 0 },
      { strain_id: 7, strain_name: 'OG Kush', participants: 2, harvest_source_plants: 2 },
    ],
    metrics: [
      {
        metric: 'yield',
        unit: 'g',
        definition_version: 1,
        value: null,
        complete: false,
        missing: [{ kind: 'dry_weight', plant_id: 'p1' }],
      },
      {
        metric: 'yield_per_harvest_source_plant',
        unit: 'g',
        definition_version: 1,
        value: null,
        complete: false,
        missing: [{ kind: 'yield', plant_id: null }],
      },
    ],
    coverage: [],
    uncovered_gaps: [],
    missing: [
      { kind: 'participant_identity', plant_id: 'p3' },
      { kind: 'entered_dry_at', plant_id: 'p1' },
      { kind: 'dry_weight', plant_id: 'p1' },
    ],
    complete: false,
    ...extra,
  };
}

/** The same Run with every fact in: what a clean finalization freezes. */
function complete(): RunSnapshot {
  return snapshot({
    harvest_window: { first: '2026-09-26', last: '2026-09-26' },
    metrics: [
      {
        metric: 'yield',
        unit: 'g',
        definition_version: 1,
        value: 225,
        complete: true,
        missing: [],
      },
      {
        metric: 'yield_per_harvest_source_plant',
        unit: 'g',
        definition_version: 1,
        value: 112.5,
        complete: true,
        missing: [],
      },
    ],
    coverage: [{ metric: 'water_applied', coverage_percent: 87.4 }],
    uncovered_gaps: [
      {
        start: '2026-07-24T20:30:00+00:00',
        end: '2026-07-25T20:30:00+00:00',
        reason: 'not_observed',
      },
    ],
    missing: [],
    complete: true,
  });
}

function preview(frozen: RunSnapshot = snapshot(), warnings = ['incomplete_snapshot']) {
  return { outcome: 'preview', preview: { run: RUN, snapshot: frozen, warnings } };
}

function finalized(frozen: RunSnapshot = snapshot()) {
  return {
    outcome: 'finalized',
    run_revision: 6,
    run: { ...RUN, status: 'finalized', metrics_state: 'frozen', run_revision: 6 },
    snapshot: frozen,
  };
}

function refused(code: string, message = 'refused') {
  return {
    outcome: 'refused',
    refusal: { code, message, current_revision: 5, active_run: null },
  };
}

async function settle(element: HTMLElement & { updateComplete: Promise<boolean> }) {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
  }
}

async function open(first: unknown): Promise<GrowspaceRunFinalizationDialog> {
  if (first instanceof Error) hassCallMock.mockRejectedValueOnce(first);
  else hassCallMock.mockResolvedValueOnce(first);
  const dialog = await fixture<GrowspaceRunFinalizationDialog>(html`
    <growspace-run-finalization-dialog
      .growspaceId=${'tent'}
      .runId=${'run-4'}
    ></growspace-run-finalization-dialog>
  `);
  await settle(dialog);
  return dialog;
}

function $<T extends HTMLElement = HTMLElement>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot!.querySelector<T>(selector);
}

function text(host: HTMLElement, selector: string): string {
  return ($(host, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function finalizeButton(dialog: HTMLElement): HTMLButtonElement {
  return $<HTMLButtonElement>(dialog, '[data-action="finalize"]')!;
}

async function tick(dialog: GrowspaceRunFinalizationDialog, code: string): Promise<void> {
  const box = $<HTMLInputElement>(dialog, `[data-ack="${code}"]`)!;
  box.checked = true;
  box.dispatchEvent(new Event('change'));
  await dialog.updateComplete;
}

async function submit(dialog: GrowspaceRunFinalizationDialog): Promise<void> {
  finalizeButton(dialog).click();
  await settle(dialog);
}

beforeEach(() => {
  hassCallMock.mockReset();
});

describe('growspace-run-finalization-dialog', () => {
  it('shows the snapshot it would freeze, and every fact it lacks', async () => {
    const dialog = await open(preview());

    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/preview_grow_run_finalization',
      { growspace_id: 'tent', run_id: 'run-4' },
      expect.anything()
    );
    const results = text(dialog, '[data-testid="snapshot-boundaries"]');
    // Local dates in the Run Timezone: 20:30 UTC is already the next day.
    expect(results).toContain('Jul 24, 2026 – Oct 2, 2026 · 70 days');
    expect(results).toContain('Dates in Europe/Berlin.');
    expect(text(dialog, '[data-testid="snapshot-harvest-window"]')).toBe(
      'Unknown: a harvest date is missing'
    );
    expect(text(dialog, '[data-testid="snapshot-counts"]')).toBe('3 plants · 2 harvested');
    // A missing fact leaves the metric without a value, never zero.
    expect(text(dialog, '[data-metric="yield"]')).toBe('Incomplete (v1)');
    expect(text(dialog, '[data-metric="yield_per_harvest_source_plant"]')).toBe('Incomplete (v1)');
    expect(text(dialog, '[data-testid="snapshot-strains"]')).toBe(
      'Unknown strain · 1 plant OG Kush · 2 plants'
    );
    const missing = [...dialog.shadowRoot!.querySelectorAll('[data-testid="snapshot-missing"] li')];
    expect(missing.map((row) => row.textContent!.trim())).toEqual([
      'p3: never identified',
      'OG Kush (1,1): no harvest date',
      'OG Kush (1,1): no dry weight',
    ]);
    expect(finalizeButton(dialog).disabled).toBe(true);
  });

  it('finalizes once the missing facts are acknowledged, then shows them frozen', async () => {
    const dialog = await open(preview());
    await tick(dialog, 'incomplete_snapshot');
    expect(finalizeButton(dialog).disabled).toBe(false);

    hassCallMock.mockResolvedValueOnce(finalized());
    await submit(dialog);

    expect(hassCallMock).toHaveBeenLastCalledWith(
      'growspace_manager/finalize_grow_run',
      {
        growspace_id: 'tent',
        run_id: 'run-4',
        expected_run_revision: 5,
        acknowledged_warnings: ['incomplete_snapshot'],
      },
      expect.anything()
    );
    expect(text(dialog, '[role="status"]')).toBe('Run #4 is finalized.');
    expect(text(dialog, '[data-testid="metrics-state"]')).toBe('Metrics frozen');
    expect(text(dialog, '[data-metric="yield"]')).toBe('Incomplete (v1)');
    expect($(dialog, '[data-testid="snapshot-missing"]')).not.toBeNull();
    expect($(dialog, '[data-action="finalize"]')).toBeNull();
  });

  it('freezes a complete snapshot without asking', async () => {
    const dialog = await open(preview(complete(), []));
    expect($(dialog, '[data-ack]')).toBeNull();
    expect(finalizeButton(dialog).disabled).toBe(false);
    expect(text(dialog, '[data-testid="snapshot-harvest-window"]')).toBe('Sep 26, 2026');
    expect(text(dialog, '[data-metric="yield"]')).toBe('225 g (v1)');
    expect(text(dialog, '[data-metric="yield_per_harvest_source_plant"]')).toBe('112.5 g (v1)');
    expect(text(dialog, '[data-testid="snapshot-gaps"]')).toBe(
      '1 stretch of this run was not recorded.'
    );
    expect(dialog.shadowRoot!.textContent).toContain('Water applied · 87%');
    expect($(dialog, '[data-testid="snapshot-missing"]')).toBeNull();

    hassCallMock.mockResolvedValueOnce(finalized(complete()));
    await submit(dialog);
    expect(text(dialog, '[data-metric="yield"]')).toBe('225 g (v1)');
  });

  it('draws a harvest spanning days, and a Run nothing was harvested from', async () => {
    const spanning = await open(
      preview(snapshot({ harvest_window: { first: '2026-09-26', last: '2026-09-29' } }))
    );
    expect(text(spanning, '[data-testid="snapshot-harvest-window"]')).toBe(
      'Sep 26, 2026 – Sep 29, 2026'
    );
    const empty = await open(
      preview(
        snapshot({
          counts: {
            participants: 1,
            harvest_source_plants: 0,
            recorded: 0,
            no_usable_yield: 0,
            missing_outcomes: 0,
          },
          strains: [],
          missing: [{ kind: 'harvest_source_plants', plant_id: null }],
        })
      )
    );
    expect(text(empty, '[data-testid="snapshot-harvest-window"]')).toBe('Nothing was harvested');
    expect(text(empty, '[data-testid="snapshot-missing"]')).toBe(
      'Missing facts Nothing was harvested, so there is no yield'
    );
    expect($(empty, '[data-testid="snapshot-strains"]')).toBeNull();
  });

  it('renders what a newer backend adds in its own words', async () => {
    const dialog = await open(
      preview(
        snapshot({
          metrics: [
            {
              metric: 'energy_efficiency',
              unit: 'g/L',
              definition_version: 2,
              value: 1.25,
              complete: true,
              missing: [],
            },
          ],
          missing: [{ kind: 'meter_reset', plant_id: null }],
        }),
        ['incomplete_snapshot', 'energy_gap']
      )
    );
    expect(text(dialog, '[data-metric="energy_efficiency"]')).toBe('1.25 g/L (v2)');
    expect(dialog.shadowRoot!.textContent).toContain('energy efficiency');
    expect(text(dialog, '[data-testid="snapshot-missing"]')).toBe('Missing facts : meter reset');
    expect(text(dialog, '[data-warning="energy_gap"]')).toBe('Complete despite: energy_gap');
    await tick(dialog, 'incomplete_snapshot');
    expect(finalizeButton(dialog).disabled).toBe(true);
    await tick(dialog, 'energy_gap');
    expect(finalizeButton(dialog).disabled).toBe(false);
    const box = $<HTMLInputElement>(dialog, '[data-ack="energy_gap"]')!;
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    await dialog.updateComplete;
    expect(finalizeButton(dialog).disabled).toBe(true);
  });

  it('re-reads a snapshot that moved and keeps only live acknowledgements', async () => {
    const dialog = await open(preview(complete(), []));
    hassCallMock
      .mockResolvedValueOnce(refused('grow_run.acknowledgement_required'))
      .mockResolvedValueOnce(preview());
    await submit(dialog);
    expect(text(dialog, '[data-testid="finalization-refusal"]')).toBe(
      'Something changed. Review the warnings and confirm again.'
    );
    expect($<HTMLInputElement>(dialog, '[data-ack="incomplete_snapshot"]')!.checked).toBe(false);
    expect(finalizeButton(dialog).disabled).toBe(true);
  });

  it('says why a Run cannot be finalized', async () => {
    const dialog = await open(refused('grow_run.not_completed'));
    expect(text(dialog, '[role="alert"]')).toBe('Only a completed run can be finalized.');
    expect($(dialog, '[data-action="finalize"]')).toBeNull();

    const gone = await open(refused('grow_run.not_found'));
    expect(text(gone, '[role="alert"]')).toBe("This run is no longer in this growspace's history.");
  });

  it('shows transport failures in their own words', async () => {
    const broken = await open(new WSError('unknown_command', 'Unknown command'));
    expect(text(broken, '[role="alert"]')).toBe('Refused: Unknown command');

    const dialog = await open(preview(complete(), []));
    hassCallMock.mockRejectedValueOnce(new WSError('home_assistant_error', 'Disk full'));
    await submit(dialog);
    expect(text(dialog, '[data-testid="finalization-refusal"]')).toBe('Refused: Disk full');
    expect(finalizeButton(dialog).disabled).toBe(false);

    hassCallMock.mockResolvedValueOnce(refused('grow_run.not_authorized'));
    await submit(dialog);
    expect(text(dialog, '[data-testid="finalization-refusal"]')).toBe(
      'You do not have permission to start or complete a run in this growspace.'
    );
  });

  it('closes through Cancel or Close without sending a finalization', async () => {
    const dialog = await open(preview());
    const closed = vi.fn();
    dialog.addEventListener('closed', closed);
    $<HTMLButtonElement>(dialog, '[data-action="cancel"]')!.click();
    expect(closed).toHaveBeenCalledOnce();
    expect(hassCallMock).toHaveBeenCalledTimes(1);

    const done = await open(preview(complete(), []));
    hassCallMock.mockResolvedValueOnce(finalized(complete()));
    await submit(done);
    done.addEventListener('closed', closed);
    $<HTMLButtonElement>(done, '[data-action="close"]')!.click();
    expect(closed).toHaveBeenCalledTimes(2);
  });
});

describe('growspace-run-chip finalization', () => {
  const ACTIVE: RunView = {
    growspaceId: 'tent',
    entityId: 'sensor.tent_active_run',
    runId: 'run-5',
    state: 'active',
    sequenceNumber: 5,
    label: null,
    startedAt: '2026-10-03T08:00:00+00:00',
    durationDays: 4,
    participantCount: 2,
    runRevision: 6,
    summary: 'Run #5 · 4 days · 2 plants',
  };

  function listed(...statuses: [number, string][]) {
    return {
      outcome: 'listed',
      run_revision: 6,
      runs: statuses.map(([number, status]) => ({
        ...RUN,
        run_id: `run-${number}`,
        sequence_number: number,
        status,
      })),
    };
  }

  async function render(list: unknown, view: RunView = ACTIVE): Promise<GrowspaceRunChip> {
    hassCallMock.mockResolvedValueOnce(list);
    const chip = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${view}></growspace-run-chip>
    `);
    await settle(chip);
    return chip;
  }

  it('offers the Completed Run that has waited longest, and opens its snapshot', async () => {
    const chip = await render(
      listed([5, 'active'], [4, 'completed'], [3, 'completed'], [2, 'finalized'])
    );
    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/list_grow_runs',
      { growspace_id: 'tent' },
      expect.anything()
    );
    const offer = $<HTMLButtonElement>(chip, '[data-action="finalize-run"]')!;
    expect(offer.textContent!.trim()).toBe('Finalize Run #3');
    expect(offer.getAttribute('aria-label')).toBe(
      'Run #3 is completed. Finalize it to freeze its results.'
    );

    hassCallMock.mockResolvedValueOnce(preview());
    offer.click();
    await vi.waitFor(() => {
      if (!$(chip, 'growspace-run-finalization-dialog')) throw new Error('not loaded');
    });
    const dialog = $<GrowspaceRunFinalizationDialog>(chip, 'growspace-run-finalization-dialog')!;
    expect(dialog.runId).toBe('run-3');
    expect(dialog.growspaceId).toBe('tent');

    // Finalizing moves the Run Revision and empties the offer; the dialog
    // stays, showing the snapshot it froze, until the grower closes it.
    hassCallMock.mockResolvedValueOnce(listed([5, 'active'], [4, 'completed'], [3, 'finalized']));
    chip.view = { ...ACTIVE, runRevision: 7 };
    await settle(chip);
    expect($(chip, '[data-action="finalize-run"]')!.textContent!.trim()).toBe('Finalize Run #4');
    expect($(chip, 'growspace-run-finalization-dialog')).toBe(dialog);
    expect(dialog.runId).toBe('run-3');
    dialog.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect($(chip, 'growspace-run-finalization-dialog')).toBeNull();
  });

  it('asks again only when the Run Revision moves', async () => {
    const chip = await render(listed([4, 'completed']));
    expect($(chip, '[data-action="finalize-run"]')).not.toBeNull();

    chip.view = { ...ACTIVE, durationDays: 5 };
    await settle(chip);
    expect(hassCallMock).toHaveBeenCalledTimes(1);

    hassCallMock.mockResolvedValueOnce(listed([4, 'finalized']));
    chip.view = { ...ACTIVE, runRevision: 7 };
    await settle(chip);
    expect(hassCallMock).toHaveBeenCalledTimes(2);
    expect($(chip, '[data-action="finalize-run"]')).toBeNull();
  });

  it('offers nothing when the list is refused, fails, or cannot be read', async () => {
    const refusedList = await render(refused('grow_run.store_unreadable'));
    expect($(refusedList, '[data-action="finalize-run"]')).toBeNull();

    hassCallMock.mockRejectedValueOnce(new WSError('unknown_command', 'Unknown command'));
    const older = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${ACTIVE}></growspace-run-chip>
    `);
    await settle(older);
    expect($(older, '[data-action="finalize-run"]')).toBeNull();

    const shown = await render(listed([4, 'completed']));
    shown.view = { ...ACTIVE, state: 'unavailable', runRevision: null };
    await settle(shown);
    expect($(shown, '[data-action="finalize-run"]')).toBeNull();
    expect(hassCallMock).toHaveBeenCalledTimes(3);
  });
});
