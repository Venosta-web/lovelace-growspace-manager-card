import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import type { RunView } from '../../src/slices/grow-run';
import { localToday, type StartPreview } from '../../src/slices/grow-run/start';
import type { GrowspaceRunStartDialog } from '../../src/features/grow-run/components/growspace-run-start-dialog';
import '../../src/features/grow-run/components/growspace-run-start-dialog';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const VIEW: RunView = {
  growspaceId: 'flower',
  entityId: 'sensor.flower_active_run',
  runId: null,
  state: 'none',
  sequenceNumber: null,
  label: null,
  startedAt: null,
  durationDays: null,
  participantCount: null,
  runRevision: 2,
  summary: 'Start run',
};

const EARLIER = '2026-07-31';
const ZONE = 'Europe/Berlin';

/** GSM's `grow_run_start_preview_v1` "clear" form, its day list shortened. */
const PREVIEW: StartPreview = {
  started_on: EARLIER,
  started_at: '2026-07-30T22:00:00+00:00',
  timezone: ZONE,
  run_revision: 2,
  retention_days: 365,
  retention_horizon: '2025-08-10T10:00:00+00:00',
  covered_since: '2026-08-01T07:00:00+00:00',
  covered_from: '2026-08-01T07:00:00+00:00',
  participant_count: 2,
  participations: [
    {
      plant_id: 'p1',
      opened_at: '2026-08-01T07:00:00+00:00',
      closed_at: '2026-08-04T06:00:00+00:00',
      name: 'OG Kush',
    },
    { plant_id: 'p2', opened_at: '2026-08-03T06:00:00+00:00', closed_at: null, name: null },
  ],
  claimed_facts: [
    {
      fact_id: 'f-out',
      plant_id: 'p1',
      at: '2026-08-04T06:00:00+00:00',
      kind: 'transplant',
      source_growspace_id: 'flower',
      target_growspace_id: 'veg',
      source_run_id: null,
      target_run_id: null,
      projected: true,
    },
  ],
  claimed_days: [
    { date: '2026-08-01', plant_ids: ['p1'], entries: 0, exits: 0 },
    { date: '2026-08-04', plant_ids: ['p1'], entries: 0, exits: 1 },
  ],
  gaps: [
    {
      start: '2026-07-30T22:00:00+00:00',
      end: '2026-08-01T07:00:00+00:00',
      reason: 'before_recording',
    },
    {
      start: '2026-08-01T22:00:00+00:00',
      end: '2026-08-03T22:00:00+00:00',
      reason: 'not_observed',
    },
    { start: '2026-08-05T22:00:00+00:00', end: '2026-08-06T22:00:00+00:00', reason: 'late_sensor' },
  ],
  conflict: null,
};

async function render(): Promise<GrowspaceRunStartDialog> {
  return fixture<GrowspaceRunStartDialog>(html`
    <growspace-run-start-dialog
      .view=${VIEW}
      .plantCount=${3}
      .timeZone=${ZONE}
    ></growspace-run-start-dialog>
  `);
}

function $<T extends HTMLElement = HTMLElement>(
  dialog: GrowspaceRunStartDialog,
  selector: string
): T | null {
  return dialog.shadowRoot!.querySelector<T>(selector);
}

async function settle(dialog: GrowspaceRunStartDialog): Promise<void> {
  await dialog.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await dialog.updateComplete;
}

async function pick(dialog: GrowspaceRunStartDialog, day: string): Promise<void> {
  const input = $<HTMLInputElement>(dialog, '#run-started-on')!;
  input.value = day;
  input.dispatchEvent(new Event('change'));
  await settle(dialog);
}

function startButton(dialog: GrowspaceRunStartDialog): HTMLButtonElement {
  return $<HTMLButtonElement>(dialog, '[data-action="start"]')!;
}

beforeEach(() => {
  hassCallMock.mockReset();
});

describe('growspace-run-start-dialog', () => {
  it('starts now by default, on today in the Run Timezone', async () => {
    const dialog = await render();
    const input = $<HTMLInputElement>(dialog, '#run-started-on')!;
    expect(input.value).toBe(localToday(ZONE));
    expect(input.max).toBe(localToday(ZONE));
    expect(input.getAttribute('aria-describedby')).toBe('run-started-on-hint');
    expect($(dialog, '[data-testid="participants"]')!.textContent).toBe(
      '3 plants are in this growspace now.'
    );
    expect(startButton(dialog).textContent!.trim()).toBe('Start run');

    hassCallMock.mockResolvedValue({
      outcome: 'started',
      run_revision: 3,
      active_run: {
        run_id: 'r',
        sequence_number: 3,
        label: null,
        started_at: '2026-08-10T10:00:00+00:00',
        timezone: ZONE,
        participant_count: 3,
        run_revision: 3,
      },
    });
    const closed = vi.fn();
    dialog.addEventListener('closed', closed);
    startButton(dialog).click();
    await settle(dialog);
    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/start_grow_run',
      { growspace_id: 'flower', expected_run_revision: 2 },
      expect.anything()
    );
    expect(closed).toHaveBeenCalledOnce();
  });

  it('previews an earlier day before anything can be started', async () => {
    let answer: (value: unknown) => void = () => undefined;
    hassCallMock.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const dialog = await render();
    await pick(dialog, EARLIER);

    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/preview_grow_run_start',
      { growspace_id: 'flower', started_on: EARLIER },
      expect.anything()
    );
    expect($(dialog, '[role="status"]')!.textContent).toBe(
      'Checking what this growspace recorded…'
    );
    expect(startButton(dialog).disabled).toBe(true);

    answer({
      outcome: 'preview',
      preview: {
        ...PREVIEW,
        claimed_safety_facts: [
          { fact_id: 'stop-1', at: '2026-08-03T06:00:00+00:00', kind: 'emergency_stop' },
        ],
      },
    });
    await settle(dialog);

    const claim = $(dialog, '[data-testid="start-preview"]')!;
    expect(claim.getAttribute('aria-label')).toBe('What this run would claim');
    expect($(dialog, '[data-testid="participants"]')!.textContent).toBe('2 plants take part.');
    expect($(dialog, '[data-testid="claimed-activity"]')!.textContent!.trim()).toBe(
      'Claims 1 movement over 2 recorded days.'
    );
    expect($(dialog, '[data-testid="claimed-safety"]')!.textContent!.trim()).toBe(
      '1 safety event will join this run.'
    );
    const participants = [...claim.querySelectorAll('[data-testid="start-participations"] li')];
    expect(participants.map((li) => li.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringMatching(/^OG Kush · .+ – .+$/),
      expect.stringMatching(/^p2 · .+ – present$/),
    ]);
    const gaps = [...claim.querySelectorAll('[data-testid="start-gaps"] li')].map((li) =>
      li.textContent!.replace(/\s+/g, ' ').trim()
    );
    expect(gaps[0]).toMatch(/before this growspace's activity was kept/);
    expect(gaps[1]).toMatch(/Home Assistant did not observe this growspace/);
    expect(gaps[2]).toMatch(/late sensor$/);
    expect(startButton(dialog).disabled).toBe(false);
    expect(startButton(dialog).textContent!.trim()).toBe('Start run on this day');

    hassCallMock.mockResolvedValue({
      outcome: 'started',
      run_revision: 3,
      active_run: {
        run_id: 'r',
        sequence_number: 3,
        label: 'Autumn',
        started_at: PREVIEW.started_at,
        timezone: ZONE,
        participant_count: 2,
        run_revision: 3,
      },
    });
    $<HTMLInputElement>(dialog, '#run-label')!.value = 'Autumn';
    startButton(dialog).click();
    await settle(dialog);
    expect(hassCallMock).toHaveBeenLastCalledWith(
      'growspace_manager/start_grow_run',
      { growspace_id: 'flower', expected_run_revision: 2, label: 'Autumn', started_on: EARLIER },
      expect.anything()
    );
  });

  it('describes an empty claim', async () => {
    hassCallMock.mockResolvedValue({
      outcome: 'preview',
      preview: { ...PREVIEW, participant_count: 0, participations: [], gaps: [] },
    });
    const dialog = await render();
    await pick(dialog, EARLIER);
    expect($(dialog, '[data-testid="participants"]')!.textContent).toBe('No plants take part.');
    expect($(dialog, '[data-testid="start-participations"]')).toBeNull();
    expect($(dialog, '[data-testid="start-gaps"]')).toBeNull();
  });

  it('shows a conflicting boundary and will not start on it', async () => {
    hassCallMock.mockResolvedValue({
      outcome: 'preview',
      preview: {
        ...PREVIEW,
        conflict: {
          code: 'grow_run.beyond_retention',
          message: 'Activity that old is no longer kept',
          boundary: PREVIEW.retention_horizon,
        },
      },
    });
    const dialog = await render();
    await pick(dialog, EARLIER);
    expect($(dialog, '[data-testid="start-conflict"]')!.textContent!.trim()).toMatch(
      /Record that history as an imported run instead/
    );
    expect($(dialog, '[data-testid="start-preview"]')).toBeNull();
    expect(startButton(dialog).disabled).toBe(true);
    dialog.shadowRoot!.querySelector('form')!.requestSubmit();
    await settle(dialog);
    expect(hassCallMock).toHaveBeenCalledOnce();
  });

  it('says why a preview was refused, or failed on the way', async () => {
    hassCallMock.mockResolvedValueOnce({
      outcome: 'refused',
      refusal: {
        code: 'grow_run.store_unreadable',
        message: 'unreadable',
        current_revision: null,
        active_run: null,
      },
    });
    const dialog = await render();
    await pick(dialog, EARLIER);
    expect($(dialog, '[role="alert"]')!.textContent).toMatch(/cannot be read/);

    hassCallMock.mockRejectedValueOnce(new WSError('validation_failed', 'Growspace gone'));
    await pick(dialog, '2026-07-30');
    expect($(dialog, '[role="alert"]')!.textContent).toBe('Refused: Growspace gone');
    expect(startButton(dialog).disabled).toBe(true);
  });

  it('keeps only the answer for the day last picked', async () => {
    const answers: ((value: unknown) => void)[] = [];
    hassCallMock.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    const dialog = await render();
    await pick(dialog, '2026-07-01');
    await pick(dialog, EARLIER);
    answers[1]({ outcome: 'preview', preview: PREVIEW });
    await settle(dialog);
    answers[0]({ outcome: 'preview', preview: { ...PREVIEW, participant_count: 9 } });
    await settle(dialog);
    expect($(dialog, '[data-testid="participants"]')!.textContent).toBe('2 plants take part.');
  });

  it('goes back to starting now when today is picked again', async () => {
    hassCallMock.mockResolvedValue({ outcome: 'preview', preview: PREVIEW });
    const dialog = await render();
    await pick(dialog, EARLIER);
    await pick(dialog, localToday(ZONE));
    expect($(dialog, '[data-testid="start-preview"]')).toBeNull();
    expect($(dialog, '[data-testid="participants"]')!.textContent).toBe(
      '3 plants are in this growspace now.'
    );
    expect(startButton(dialog).disabled).toBe(false);
    expect(hassCallMock).toHaveBeenCalledOnce();
  });

  it('keeps a backdated start refused at confirmation open, in words', async () => {
    hassCallMock.mockResolvedValueOnce({ outcome: 'preview', preview: PREVIEW });
    hassCallMock.mockResolvedValueOnce({
      outcome: 'refused',
      refusal: {
        code: 'grow_run.boundary_conflict',
        message: 'A Run cannot start in the future',
        current_revision: 2,
        active_run: null,
      },
    });
    const dialog = await render();
    await pick(dialog, EARLIER);
    startButton(dialog).click();
    await settle(dialog);
    expect($(dialog, 'p.refusal[role="alert"]')!.textContent).toMatch(
      /in the future, or before another run/
    );
  });
});
