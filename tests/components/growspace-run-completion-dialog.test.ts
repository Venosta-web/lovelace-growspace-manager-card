import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import type { CompletionPreview } from '../../src/slices/grow-run/completion';
import type { GrowspaceRunCompletionDialog } from '../../src/features/grow-run/components/growspace-run-completion-dialog';
import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
import type { RunView } from '../../src/slices/grow-run';
import '../../src/features/grow-run/components/growspace-run-completion-dialog';
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
  status: 'active' as const,
  started_at: '2026-07-24T20:30:00+00:00',
  completed_at: null,
  timezone: 'Europe/Berlin',
  participant_count: 3,
  metrics_state: 'live' as const,
  run_revision: 4,
};

function preview(extra: Partial<CompletionPreview> = {}): CompletionPreview {
  return {
    run: RUN,
    completed_at: '2026-10-02T20:30:00+00:00',
    duration_days: 70,
    closing_participations: [
      { plant_id: 'p3', opened_at: '2026-09-26T20:30:00+00:00', closed_at: null },
    ],
    plants_present: [
      { plant_id: 'p3', strain_name: 'OG Kush', phenotype_name: 'Pheno #1', stage: 'flower' },
    ],
    missing_outcomes: [
      { plant_id: 'p2', strain: 'Amnesia', phenotype: '', state: 'pending' },
      { plant_id: 'p5', strain: '', phenotype: '', state: 'incomplete' },
    ],
    coverage: [],
    attribution_gaps: [
      { kind: 'pending_fact', plant_id: 'p6', fact_id: 'f6', at: '2026-09-30T08:00:00+00:00' },
      { kind: 'unrecorded_presence', plant_id: 'p4', fact_id: null, at: null },
    ],
    retrospective_note: 'Written while growing',
    delivering_outputs: [],
    warnings: ['plants_present', 'missing_outcomes', 'attribution_gaps'],
    blockers: [],
    ...extra,
  };
}

const COMPLETED = {
  outcome: 'completed',
  run_revision: 5,
  run: {
    ...RUN,
    status: 'completed',
    completed_at: '2026-10-02T20:30:00+00:00',
    metrics_state: 'pending',
    run_revision: 5,
  },
};

function refused(code: string, message = 'refused') {
  return {
    outcome: 'refused',
    refusal: { code, message, current_revision: 4, active_run: RUN },
  };
}

async function settle(element: HTMLElement & { updateComplete: Promise<boolean> }) {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await element.updateComplete;
  }
}

async function open(first: unknown): Promise<GrowspaceRunCompletionDialog> {
  hassCallMock.mockResolvedValueOnce(first);
  const dialog = await fixture<GrowspaceRunCompletionDialog>(html`
    <growspace-run-completion-dialog .growspaceId=${'flower'}></growspace-run-completion-dialog>
  `);
  await settle(dialog);
  return dialog;
}

function $<T extends HTMLElement = HTMLElement>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot!.querySelector<T>(selector);
}

function completeButton(dialog: HTMLElement): HTMLButtonElement {
  return $<HTMLButtonElement>(dialog, '[data-action="complete"]')!;
}

async function tick(dialog: GrowspaceRunCompletionDialog, code: string): Promise<void> {
  const box = $<HTMLInputElement>(dialog, `[data-ack="${code}"]`)!;
  box.checked = true;
  box.dispatchEvent(new Event('change'));
  await dialog.updateComplete;
}

async function submit(dialog: GrowspaceRunCompletionDialog): Promise<void> {
  completeButton(dialog).click();
  await settle(dialog);
}

beforeEach(() => {
  hassCallMock.mockReset();
});

describe('growspace-run-completion-dialog', () => {
  it('previews the boundary, what closes and every warning', async () => {
    const dialog = await open({ outcome: 'preview', preview: preview() });

    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/preview_grow_run_completion',
      { growspace_id: 'flower' },
      expect.anything()
    );
    expect($(dialog, '[data-testid="completion-boundary"]')!.textContent).toContain('70 days');
    expect($(dialog, '[data-testid="completion-closing"]')!.textContent).toContain(
      '1 participation closes now.'
    );
    expect($(dialog, '[data-testid="completion-present"]')!.textContent).toContain(
      'OG Kush Pheno #1'
    );
    const outcomes = $(dialog, '[data-testid="completion-outcomes"]')!.textContent!;
    expect(outcomes).toMatch(/Amnesia\s*·\s*no dry weight/);
    expect(outcomes).toMatch(/p5\s*·\s*recorded as incomplete/);
    const gaps = $(dialog, '[data-testid="completion-gaps"]')!.textContent!;
    expect(gaps).toContain('p6 moved');
    expect(gaps).toContain('p4 is here but not recorded');
    expect($(dialog, '[data-testid="completion-coverage"]')!.textContent).toContain(
      'No run metrics are measured yet'
    );
    expect($<HTMLTextAreaElement>(dialog, '#run-note')!.value).toBe('Written while growing');
    expect(dialog.shadowRoot!.querySelectorAll('[data-ack]')).toHaveLength(3);
  });

  it('completes only once every warning is acknowledged, then marks metrics Pending', async () => {
    const dialog = await open({ outcome: 'preview', preview: preview() });
    expect(completeButton(dialog).disabled).toBe(true);
    await tick(dialog, 'plants_present');
    await tick(dialog, 'missing_outcomes');
    expect(completeButton(dialog).disabled).toBe(true);
    await tick(dialog, 'attribution_gaps');
    expect(completeButton(dialog).disabled).toBe(false);

    const note = $<HTMLTextAreaElement>(dialog, '#run-note')!;
    note.value = '  Dense buds  ';
    note.dispatchEvent(new Event('input'));
    hassCallMock.mockResolvedValueOnce(COMPLETED);
    await submit(dialog);

    expect(hassCallMock).toHaveBeenLastCalledWith(
      'growspace_manager/complete_grow_run',
      {
        growspace_id: 'flower',
        run_id: 'run-4',
        expected_run_revision: 4,
        acknowledged_warnings: ['plants_present', 'missing_outcomes', 'attribution_gaps'],
        retrospective_note: 'Dense buds',
      },
      expect.anything()
    );
    expect($(dialog, '[role="status"]')!.textContent).toBe('Run #4 is completed.');
    expect($(dialog, '[data-testid="metrics-state"]')!.textContent).toBe('Metrics pending');
    expect($(dialog, '[data-testid="completion-summary"]')!.textContent).toContain(
      '70 days · 3 plants'
    );
  });

  it('completes a clean run without asking, and a blank note clears it', async () => {
    const dialog = await open({
      outcome: 'preview',
      preview: preview({
        plants_present: [],
        missing_outcomes: [],
        attribution_gaps: [],
        closing_participations: [],
        warnings: [],
        retrospective_note: null,
      }),
    });
    expect($(dialog, '[data-testid="completion-closing"]')!.textContent).toContain(
      'No participation is still open.'
    );
    hassCallMock.mockResolvedValueOnce(COMPLETED);
    await submit(dialog);
    expect(hassCallMock.mock.lastCall![1]).toMatchObject({
      acknowledged_warnings: [],
      retrospective_note: null,
    });
  });

  it('refuses while irrigation is delivering and checks again on request', async () => {
    const dialog = await open({
      outcome: 'preview',
      preview: preview({
        warnings: [],
        plants_present: [],
        missing_outcomes: [],
        attribution_gaps: [],
        delivering_outputs: ['switch.tent_pump'],
        blockers: ['grow_run.irrigation_delivering'],
      }),
    });
    expect($(dialog, '[data-testid="completion-blocker"]')!.textContent).toContain(
      'switch.tent_pump'
    );
    expect(completeButton(dialog).disabled).toBe(true);

    hassCallMock.mockResolvedValueOnce({
      outcome: 'preview',
      preview: preview({
        warnings: [],
        plants_present: [],
        missing_outcomes: [],
        attribution_gaps: [],
      }),
    });
    $<HTMLButtonElement>(dialog, '[data-action="recheck"]')!.click();
    await settle(dialog);
    expect($(dialog, '[data-testid="completion-blocker"]')).toBeNull();
    expect(completeButton(dialog).disabled).toBe(false);
  });

  it('re-reads the preview when a new warning appeared and keeps only live acknowledgements', async () => {
    const dialog = await open({
      outcome: 'preview',
      preview: preview({
        warnings: ['missing_outcomes'],
        plants_present: [],
        attribution_gaps: [],
      }),
    });
    await tick(dialog, 'missing_outcomes');
    hassCallMock
      .mockResolvedValueOnce(refused('grow_run.acknowledgement_required'))
      .mockResolvedValueOnce({ outcome: 'preview', preview: preview() });
    await submit(dialog);

    expect($(dialog, '[data-testid="completion-refusal"]')!.textContent).toContain(
      'Something changed.'
    );
    expect($<HTMLInputElement>(dialog, '[data-ack="missing_outcomes"]')!.checked).toBe(true);
    expect($<HTMLInputElement>(dialog, '[data-ack="plants_present"]')!.checked).toBe(false);
    expect(completeButton(dialog).disabled).toBe(true);
  });

  it('says when there is no Active Run to complete', async () => {
    const dialog = await open(refused('grow_run.not_active'));
    expect($(dialog, '[role="alert"]')!.textContent).toBe(
      'This growspace has no active run to complete.'
    );
    expect($(dialog, '[data-action="complete"]')).toBeNull();
  });

  it('shows transport failures in their own words', async () => {
    hassCallMock.mockRejectedValueOnce(new WSError('unknown_error', 'Connection lost'));
    const dialog = await fixture<GrowspaceRunCompletionDialog>(html`
      <growspace-run-completion-dialog .growspaceId=${'flower'}></growspace-run-completion-dialog>
    `);
    await settle(dialog);
    expect($(dialog, '[role="alert"]')!.textContent).toBe('Refused: Connection lost');

    const ready = await open({ outcome: 'preview', preview: preview({ warnings: [] }) });
    hassCallMock.mockRejectedValueOnce(new WSError('unknown_error', 'Timed out'));
    await submit(ready);
    expect($(ready, '[data-testid="completion-refusal"]')!.textContent!.trim()).toBe(
      'Refused: Timed out'
    );
    expect(completeButton(ready).disabled).toBe(false);
  });

  it('asks about a warning it does not know in the backend code', async () => {
    const dialog = await open({
      outcome: 'preview',
      preview: preview({
        warnings: ['low_coverage'],
        plants_present: [],
        missing_outcomes: [],
        attribution_gaps: [],
      }),
    });
    const label = $(dialog, '[data-warning="low_coverage"] .ack')!;
    expect(label.textContent).toContain('Complete despite: low_coverage');
    await tick(dialog, 'low_coverage');
    expect(completeButton(dialog).disabled).toBe(false);
  });

  it('closes through Cancel without sending a completion', async () => {
    const dialog = await open({ outcome: 'preview', preview: preview() });
    const closed = vi.fn();
    dialog.addEventListener('closed', closed);
    $<HTMLButtonElement>(dialog, '[data-action="cancel"]')!.click();
    expect(closed).toHaveBeenCalledOnce();
    expect(hassCallMock).toHaveBeenCalledTimes(1);
  });
});

describe('growspace-run-chip completion', () => {
  const ACTIVE: RunView = {
    growspaceId: 'flower',
    entityId: 'sensor.flower_active_run',
    runId: 'run-4',
    state: 'active',
    sequenceNumber: 4,
    label: 'Autumn',
    startedAt: RUN.started_at,
    durationDays: 70,
    participantCount: 3,
    runRevision: 4,
    summary: 'Run #4 · Autumn · 70 days · 3 plants',
  };

  function details(extra: Record<string, unknown> = {}) {
    return {
      outcome: 'found',
      run: { ...RUN, notes: null, participations: [], movement_history: [], ...extra },
    };
  }

  async function openDetails(result: unknown): Promise<GrowspaceRunChip> {
    // The chip reads the Run list as it renders (GSM#673), then the details.
    hassCallMock
      .mockResolvedValueOnce({ outcome: 'listed', run_revision: 4, runs: [] })
      .mockResolvedValueOnce(result);
    const chip = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${ACTIVE}></growspace-run-chip>
    `);
    $(chip, '.chip')!.click();
    await settle(chip);
    return chip;
  }

  it('offers Complete run from the Active Run and opens the preview', async () => {
    const chip = await openDetails(details());
    expect($(chip, '[data-testid="run-metrics-state"]')!.textContent).toContain('Live metrics');

    hassCallMock.mockResolvedValueOnce({ outcome: 'preview', preview: preview() });
    $<HTMLButtonElement>(chip, '[data-action="complete-run"]')!.click();
    await settle(chip);

    const dialog = $<GrowspaceRunCompletionDialog>(chip, 'growspace-run-completion-dialog')!;
    expect(dialog).not.toBeNull();
    expect(dialog.growspaceId).toBe('flower');
    await settle(dialog);
    expect($(dialog, '[data-testid="completion-boundary"]')).not.toBeNull();

    // The sensor reads `none` once the Run completes; the dialog stays.
    chip.view = { ...ACTIVE, state: 'none', runId: null, summary: 'Start run' };
    await chip.updateComplete;
    expect($(chip, 'growspace-run-completion-dialog')).toBe(dialog);
    dialog.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect($(chip, 'growspace-run-completion-dialog')).toBeNull();
  });

  it('does not offer completion against a backend without it', async () => {
    const { status: _status, metrics_state: _metrics, completed_at: _completed, ...old } = RUN;
    const chip = await openDetails({
      outcome: 'found',
      run: { ...old, participations: [], movement_history: [] },
    });
    expect($(chip, '[data-action="complete-run"]')).toBeNull();
    expect($(chip, '[data-testid="run-metrics-state"]')).toBeNull();
  });
});
