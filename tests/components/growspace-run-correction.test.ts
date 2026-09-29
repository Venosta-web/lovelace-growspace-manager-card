import { fixture, html } from '@open-wc/testing-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHass, hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import type { RunSnapshot } from '../../src/slices/grow-run/schema';
import type { RunView } from '../../src/slices/grow-run';
import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
import type { GrowspaceRunDiscardDialog } from '../../src/features/grow-run/components/growspace-run-discard-dialog';
import type { GrowspaceRunFinalizationDialog } from '../../src/features/grow-run/components/growspace-run-finalization-dialog';
import '../../src/features/grow-run/components/growspace-run-chip';
import '../../src/features/grow-run/components/growspace-run-discard-dialog';
import '../../src/features/grow-run/components/growspace-run-finalization-dialog';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);
const getHassMock = vi.mocked(getHass);

const SUMMARY = {
  run_id: 'run-4',
  sequence_number: 4,
  label: 'Autumn',
  started_at: '2026-07-24T20:30:00+00:00',
  timezone: 'Europe/Berlin',
  participant_count: 2,
};

/** GSM's `grow_run_refinalized_details_v1` snapshot, trimmed to one Plant. */
function snapshot(value: number | null): RunSnapshot {
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
    harvest_window: { first: '2026-09-26', last: '2026-09-26' },
    participants: [
      {
        plant_id: 'p1',
        plant_name: 'Plant p1',
        strain_id: 7,
        strain_name: 'OG Kush',
        phenotype_id: 1,
        phenotype_name: 'A',
      },
    ],
    counts: {
      participants: 1,
      harvest_source_plants: 1,
      recorded: value === null ? 0 : 1,
      no_usable_yield: 0,
      missing_outcomes: value === null ? 1 : 0,
    },
    strains: [{ strain_id: 7, strain_name: 'OG Kush', participants: 1, harvest_source_plants: 1 }],
    metrics: [
      {
        metric: 'yield',
        unit: 'g',
        definition_version: 1,
        value,
        complete: value !== null,
        missing: value === null ? [{ kind: 'dry_weight', plant_id: 'p1' }] : [],
      },
    ],
    coverage: [],
    uncovered_gaps: [],
    missing: value === null ? [{ kind: 'dry_weight', plant_id: 'p1' }] : [],
    complete: value !== null,
  };
}

function refused(code: string, reasons?: string[]) {
  return {
    outcome: 'refused',
    refusal: {
      code,
      message: `backend says ${code}`,
      current_revision: 5,
      active_run: null,
      ...(reasons ? { reasons } : {}),
    },
  };
}

function finalizedDetails(superseded = 1, status = 'finalized', frozen = snapshot(88)) {
  return {
    outcome: 'found',
    run: {
      ...SUMMARY,
      status,
      completed_at: '2026-10-02T20:30:00+00:00',
      metrics_state: 'frozen',
      run_revision: 5,
      participations: [],
      movement_history: [],
      harvest_outcomes: [],
      audit: [],
      snapshot: status === 'finalized' ? frozen : null,
      superseded_snapshots: Array.from({ length: superseded }, (_, index) => ({
        finalized_revision: 3 + index * 2,
        superseded_revision: 4 + index * 2,
        snapshot: snapshot(null),
      })),
    },
  };
}

function preview() {
  return {
    outcome: 'preview',
    preview: {
      run: { ...SUMMARY, status: 'completed', run_revision: 6 },
      snapshot: snapshot(88),
      warnings: [],
    },
  };
}

async function settle(element: HTMLElement & { updateComplete: Promise<boolean> }) {
  for (let i = 0; i < 4; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
  }
}

function $<T extends HTMLElement = HTMLElement>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot!.querySelector<T>(selector);
}

function text(host: HTMLElement, selector: string): string {
  return ($(host, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

async function type(host: HTMLElement & { updateComplete: Promise<boolean> }, value: string) {
  const field = $<HTMLTextAreaElement>(host, '[data-field="reason"]')!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await host.updateComplete;
}

function admin(isAdmin: boolean): void {
  getHassMock.mockReturnValue({ user: { is_admin: isAdmin } } as unknown as HomeAssistant);
}

beforeEach(() => {
  hassCallMock.mockReset();
  getHassMock.mockReset();
});

describe('growspace-run-discard-dialog', () => {
  async function open(): Promise<GrowspaceRunDiscardDialog> {
    const dialog = await fixture<GrowspaceRunDiscardDialog>(html`
      <growspace-run-discard-dialog
        .growspaceId=${'tent'}
        .runId=${'run-4'}
        .sequenceNumber=${4}
        .runRevision=${7}
      ></growspace-run-discard-dialog>
    `);
    await dialog.updateComplete;
    return dialog;
  }

  async function discard(dialog: GrowspaceRunDiscardDialog): Promise<void> {
    $<HTMLButtonElement>(dialog, '[data-action="discard"]')!.click();
    await settle(dialog);
  }

  it('discards on the revision it was opened on, with the reason given', async () => {
    const dialog = await open();
    expect(dialog.shadowRoot!.textContent).toContain('as if it had never started');
    await type(dialog, '  Wrong tent  ');
    hassCallMock.mockResolvedValueOnce({
      outcome: 'discarded',
      run_revision: 8,
      run_id: 'run-4',
      sequence_number: 4,
    });

    await discard(dialog);

    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/discard_grow_run',
      { growspace_id: 'tent', run_id: 'run-4', expected_run_revision: 7, reason: 'Wrong tent' },
      expect.anything()
    );
    expect(text(dialog, '[role="status"]')).toBe('Run #4 is discarded.');
    const closed = vi.fn();
    dialog.addEventListener('closed', closed);
    $<HTMLButtonElement>(dialog, '[data-action="close"]')!.click();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('sends no reason when none was given', async () => {
    const dialog = await open();
    hassCallMock.mockResolvedValueOnce({
      outcome: 'discarded',
      run_revision: 8,
      run_id: 'run-4',
      sequence_number: 4,
    });
    await discard(dialog);
    expect(hassCallMock.mock.calls[0][1]).toEqual({
      growspace_id: 'tent',
      run_id: 'run-4',
      expected_run_revision: 7,
    });
  });

  it('names every kind of activity that keeps the run, and offers no retry', async () => {
    const dialog = await open();
    hassCallMock.mockResolvedValueOnce(
      refused('grow_run.has_activity', [
        'activity_facts',
        'participants_changed',
        'harvest_outcomes',
        'water_events',
      ])
    );
    await discard(dialog);

    expect(text(dialog, '[data-testid="discard-refusal"]')).toBe(
      'This run has recorded activity, so it cannot be discarded. Complete it instead.'
    );
    const blockers = [
      ...dialog.shadowRoot!.querySelectorAll('[data-testid="discard-blockers"] li'),
    ].map((row) => row.textContent!.trim());
    expect(blockers).toEqual([
      'Plants moved into, out of or within this growspace',
      'Plants joined or left the run',
      'Plants were harvested from it',
      'water events',
    ]);
    expect($<HTMLButtonElement>(dialog, '[data-action="discard"]')!.disabled).toBe(true);
  });

  it('says why in its own words when the backend refuses without reasons', async () => {
    const dialog = await open();
    hassCallMock.mockResolvedValueOnce(refused('grow_run.revision_conflict'));
    await discard(dialog);
    expect(text(dialog, '[data-testid="discard-refusal"]')).toBe(
      'This growspace changed while the dialog was open. It now shows the current run.'
    );
    expect($(dialog, '[data-testid="discard-blockers"]')).toBeNull();
    expect($<HTMLButtonElement>(dialog, '[data-action="discard"]')!.disabled).toBe(false);

    hassCallMock.mockRejectedValueOnce(new WSError('home_assistant_error', 'Disk full'));
    await discard(dialog);
    expect(text(dialog, '[data-testid="discard-refusal"]')).toBe('Refused: Disk full');
  });

  it('cancels without sending anything', async () => {
    const dialog = await open();
    const closed = vi.fn();
    dialog.addEventListener('closed', closed);
    $<HTMLButtonElement>(dialog, '[data-action="cancel"]')!.click();
    expect(closed).toHaveBeenCalledOnce();
    expect(hassCallMock).not.toHaveBeenCalled();
  });
});

describe('growspace-run-chip discard', () => {
  const ACTIVE: RunView = {
    growspaceId: 'tent',
    entityId: 'sensor.tent_active_run',
    runId: 'run-4',
    state: 'active',
    sequenceNumber: 4,
    label: null,
    startedAt: '2026-10-03T08:00:00+00:00',
    durationDays: 0,
    participantCount: 2,
    runRevision: 7,
    summary: 'Run #4 · 0 days · 2 plants',
  };

  function details(movements: number) {
    return {
      outcome: 'found',
      run: {
        ...SUMMARY,
        status: 'active',
        run_revision: 7,
        participations: [],
        movement_history: Array.from({ length: movements }, (_, index) => ({
          fact_id: `fact-${index}`,
          plant_id: 'p3',
          at: '2026-10-03T09:00:00+00:00',
          kind: 'entry',
          source_growspace_id: null,
          target_growspace_id: 'tent',
          source_run_id: null,
          target_run_id: 'run-4',
          projected: true,
        })),
      },
    };
  }

  async function openDetails(result: unknown): Promise<GrowspaceRunChip> {
    hassCallMock.mockImplementation(async (type: string) =>
      type === 'growspace_manager/get_grow_run'
        ? result
        : { outcome: 'listed', run_revision: 7, runs: [] }
    );
    const chip = await fixture<GrowspaceRunChip>(
      html`<growspace-run-chip .view=${ACTIVE}></growspace-run-chip>`
    );
    await settle(chip);
    $<HTMLButtonElement>(chip, '.chip')!.click();
    await settle(chip);
    return chip;
  }

  it('offers to discard a run that recorded nothing, on the revision it read', async () => {
    const chip = await openDetails(details(0));
    const offer = $<HTMLButtonElement>(chip, '[data-action="discard-run"]')!;
    expect(offer.textContent!.trim()).toBe('Discard run…');

    offer.click();
    await vi.waitFor(() => {
      if (!$(chip, 'growspace-run-discard-dialog')) throw new Error('not loaded');
    });
    const dialog = $<GrowspaceRunDiscardDialog>(chip, 'growspace-run-discard-dialog')!;
    expect([dialog.growspaceId, dialog.runId, dialog.sequenceNumber, dialog.runRevision]).toEqual([
      'tent',
      'run-4',
      4,
      7,
    ]);
    expect($(chip, '[data-action="discard-run"]')).toBeNull();

    dialog.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect($(chip, 'growspace-run-discard-dialog')).toBeNull();
  });

  it('does not offer it once the run has recorded a movement', async () => {
    const chip = await openDetails(details(1));
    expect($(chip, '[data-action="complete-run"]')).not.toBeNull();
    expect($(chip, '[data-action="discard-run"]')).toBeNull();
  });
});

describe('growspace-run-finalization-dialog reopening', () => {
  async function open(): Promise<GrowspaceRunFinalizationDialog> {
    const dialog = await fixture<GrowspaceRunFinalizationDialog>(html`
      <growspace-run-finalization-dialog
        .growspaceId=${'tent'}
        .runId=${'run-4'}
      ></growspace-run-finalization-dialog>
    `);
    await settle(dialog);
    return dialog;
  }

  async function openFinalized(details: unknown = finalizedDetails()) {
    hassCallMock
      .mockResolvedValueOnce(refused('grow_run.not_completed'))
      .mockResolvedValueOnce(details);
    return open();
  }

  it('shows a Finalized Run frozen, with what earlier reopenings superseded', async () => {
    const dialog = await openFinalized(finalizedDetails(2));
    expect(hassCallMock).toHaveBeenLastCalledWith(
      'growspace_manager/get_grow_run',
      { growspace_id: 'tent', run_id: 'run-4' },
      expect.anything()
    );
    expect(text(dialog, '[role="status"]')).toBe('Run #4 is finalized.');
    expect(text(dialog, '[data-metric="yield"]')).toBe('88 g (v1)');
    expect(text(dialog, '[data-testid="superseded"]')).toBe(
      '2 earlier snapshots of this run were superseded.'
    );
    expect($(dialog, '[data-action="finalize"]')).toBeNull();
    // Only an administrator is offered the reopening.
    expect($(dialog, '[data-action="reopen-offer"]')).toBeNull();

    const once = await openFinalized(finalizedDetails(0));
    expect($(once, '[data-testid="superseded"]')).toBeNull();
  });

  it('keeps the refusal when the run is not finalized after all', async () => {
    const active = await openFinalized(finalizedDetails(0, 'active'));
    expect(text(active, '[role="alert"]')).toBe('Only a completed run can be finalized.');

    const gone = await openFinalized({ outcome: 'not_found' });
    expect(text(gone, '[role="alert"]')).toBe('Only a completed run can be finalized.');

    const bare = await openFinalized({
      ...finalizedDetails(0),
      run: { ...finalizedDetails(0).run, snapshot: null },
    });
    expect(text(bare, '[role="alert"]')).toBe('Only a completed run can be finalized.');
  });

  it('lets an administrator reopen with a reason, then finalize again', async () => {
    admin(true);
    const dialog = await openFinalized();
    $<HTMLButtonElement>(dialog, '[data-action="reopen-offer"]')!.click();
    await dialog.updateComplete;
    expect(text(dialog, '[data-testid="reopen-form"]')).toContain(
      'Reopening returns Run #4 to completed'
    );
    const confirm = () => $<HTMLButtonElement>(dialog, '[data-action="reopen"]')!;
    expect(confirm().disabled).toBe(true);
    await type(dialog, '   ');
    expect(confirm().disabled).toBe(true);
    await type(dialog, ' Dry weight came in late ');
    expect(confirm().disabled).toBe(false);

    hassCallMock
      .mockResolvedValueOnce({
        outcome: 'reopened',
        run_revision: 6,
        run: { ...SUMMARY, status: 'completed', metrics_state: 'pending', run_revision: 6 },
      })
      .mockResolvedValueOnce(preview());
    confirm().click();
    await settle(dialog);

    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/reopen_grow_run',
      {
        growspace_id: 'tent',
        run_id: 'run-4',
        expected_run_revision: 5,
        reason: 'Dry weight came in late',
      },
      expect.anything()
    );
    expect(text(dialog, '[data-testid="reopen-notice"]')).toBe(
      'Run #4 is reopened. Correct it, then finalize it again.'
    );
    expect($(dialog, '[data-testid="finalization-done"]')).toBeNull();
    expect($<HTMLButtonElement>(dialog, '[data-action="finalize"]')!.disabled).toBe(false);
  });

  it('says why a reopening was refused, and can be put away', async () => {
    admin(true);
    const dialog = await openFinalized();
    $<HTMLButtonElement>(dialog, '[data-action="reopen-offer"]')!.click();
    await dialog.updateComplete;
    await type(dialog, 'Late weight');
    const reopen = async () => {
      $<HTMLButtonElement>(dialog, '[data-action="reopen"]')!.click();
      await settle(dialog);
      return text(dialog, '[data-testid="reopen-refusal"]');
    };

    hassCallMock.mockResolvedValueOnce(refused('grow_run.not_authorized'));
    expect(await reopen()).toBe('Only a Home Assistant administrator can reopen a run.');
    hassCallMock.mockResolvedValueOnce(refused('grow_run.not_finalized'));
    expect(await reopen()).toBe('Only a finalized run can be reopened.');
    hassCallMock.mockResolvedValueOnce(refused('grow_run.reason_required'));
    expect(await reopen()).toBe('Say why the run is being reopened.');
    hassCallMock.mockRejectedValueOnce(new WSError('home_assistant_error', 'Disk full'));
    expect(await reopen()).toBe('Refused: Disk full');

    $<HTMLButtonElement>(dialog, '[data-action="reopen-cancel"]')!.click();
    await dialog.updateComplete;
    expect($(dialog, '[data-testid="reopen-form"]')).toBeNull();
    expect($(dialog, '[data-action="reopen-offer"]')).not.toBeNull();
  });

  it('offers reopening straight after finalizing, from the snapshot it froze', async () => {
    admin(true);
    hassCallMock.mockResolvedValueOnce(preview());
    const dialog = await open();
    hassCallMock.mockResolvedValueOnce({
      outcome: 'finalized',
      run_revision: 7,
      run: { ...SUMMARY, status: 'finalized', metrics_state: 'frozen', run_revision: 7 },
      snapshot: snapshot(88),
    });
    $<HTMLButtonElement>(dialog, '[data-action="finalize"]')!.click();
    await settle(dialog);
    $<HTMLButtonElement>(dialog, '[data-action="reopen-offer"]')!.click();
    await dialog.updateComplete;
    await type(dialog, 'Typo in the weight');
    hassCallMock.mockResolvedValueOnce(refused('grow_run.revision_conflict'));
    $<HTMLButtonElement>(dialog, '[data-action="reopen"]')!.click();
    await settle(dialog);
    expect(hassCallMock.mock.lastCall![1]).toMatchObject({ expected_run_revision: 7 });
  });
});
