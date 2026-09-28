import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import type { RunView } from '../../src/slices/grow-run';
import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
import type { GrowspaceRunStartDialog } from '../../src/features/grow-run/components/growspace-run-start-dialog';
import type { GrowspaceHeaderUI } from '../../src/features/ui/components/growspace-header-ui';
import type { GrowspaceDevice } from '../../src/types';
import '../../src/features/grow-run/components/growspace-run-chip';
import '../../src/features/ui/components/growspace-header-ui';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const SUMMARY = {
  run_id: 'run-1',
  sequence_number: 1,
  label: 'Autumn',
  started_at: '2026-09-26T08:00:00+00:00',
  timezone: 'Europe/Berlin',
  participant_count: 2,
  run_revision: 1,
};

function view(state: RunView['state'], extra: Partial<RunView> = {}): RunView {
  const base: RunView = {
    growspaceId: 'flower',
    entityId: 'sensor.flower_active_run',
    runId: null,
    state,
    sequenceNumber: null,
    label: null,
    startedAt: null,
    durationDays: null,
    participantCount: null,
    runRevision: state === 'unavailable' ? null : 0,
    summary: state === 'none' ? 'Start run' : 'Run unavailable',
  };
  return { ...base, ...extra };
}

const ACTIVE = view('active', {
  runId: 'run-4',
  sequenceNumber: 4,
  label: 'Autumn',
  durationDays: 61,
  participantCount: 17,
  runRevision: 4,
  summary: 'Run #4 · Autumn · 61 days · 17 plants',
});

async function renderChip(runView: RunView, plantCount = 2): Promise<GrowspaceRunChip> {
  return fixture<GrowspaceRunChip>(html`
    <growspace-run-chip .view=${runView} .plantCount=${plantCount}></growspace-run-chip>
  `);
}

function $<T extends HTMLElement = HTMLElement>(
  chip: GrowspaceRunChip,
  selector: string
): T | null {
  return chip.shadowRoot!.querySelector<T>(selector);
}

/**
 * Open Start and wait for its lazy chunk. Returns the dialog element, whose
 * shadow root is where the form lives now.
 */
async function openStart(chip: GrowspaceRunChip): Promise<GrowspaceRunStartDialog> {
  $(chip, '.chip')!.click();
  await vi.waitFor(() => {
    if (!$(chip, 'growspace-run-start-dialog')) throw new Error('start dialog not loaded');
  });
  const dialog = $<GrowspaceRunStartDialog>(chip, 'growspace-run-start-dialog')!;
  await dialog.updateComplete;
  return dialog;
}

function $$<T extends HTMLElement = HTMLElement>(
  dialog: GrowspaceRunStartDialog,
  selector: string
): T | null {
  return dialog.shadowRoot!.querySelector<T>(selector);
}

async function submit(dialog: GrowspaceRunStartDialog): Promise<void> {
  $$(dialog, '[data-action="start"]')!.click();
  await dialog.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await dialog.updateComplete;
}

beforeEach(() => {
  hassCallMock.mockReset();
});

describe('growspace-run-chip', () => {
  it('renders nothing without a view', async () => {
    const chip = await fixture<GrowspaceRunChip>(html`<growspace-run-chip></growspace-run-chip>`);
    expect(chip.shadowRoot!.children.length).toBe(0);
  });

  it('shows the Active Run compactly and opens its details', async () => {
    hassCallMock.mockResolvedValue({
      outcome: 'found',
      run: {
        ...SUMMARY,
        participations: [
          { plant_id: 'plant-1', opened_at: '2026-09-26T08:00:00+00:00', closed_at: null },
        ],
        movement_history: [
          {
            fact_id: 'fact-1',
            plant_id: 'plant-1',
            at: '2026-09-27T08:00:00+00:00',
            kind: 'entry',
            source_growspace_id: null,
            target_growspace_id: 'flower',
          },
        ],
      },
    });
    const chip = await renderChip(ACTIVE);
    const button = $(chip, '.chip')!;
    expect(button.dataset.state).toBe('active');
    expect(button.textContent).toContain('Run #4 · Autumn · 61 days · 17 plants');
    expect(button.getAttribute('aria-label')).toBe(
      'Active grow run: Run #4 · Autumn · 61 days · 17 plants. Open details.'
    );

    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await chip.updateComplete;
    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/get_grow_run',
      { growspace_id: 'flower', run_id: 'run-4' },
      expect.anything()
    );
    expect($(chip, '[data-testid="run-participations"]')?.textContent).toContain('plant-1');
    expect($(chip, '[data-testid="run-movements"]')?.textContent).toContain('entered');
  });

  it('says an unreadable history is unavailable, never that there is no run', async () => {
    const chip = await renderChip(view('unavailable'));
    const button = $(chip, '.chip')!;
    expect(button.dataset.state).toBe('unavailable');
    expect(button.getAttribute('aria-label')).toMatch(/history unavailable/);
  });

  it('offers Start run and names how many plants will take part', async () => {
    const chip = await renderChip(view('none'), 2);
    const button = $(chip, '.chip')!;
    expect(button.getAttribute('aria-label')).toBe('Start a grow run in this growspace');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');

    const dialog = await openStart(chip);
    expect($$(dialog, '[data-testid="participants"]')!.textContent).toBe(
      '2 plants are in this growspace now.'
    );
  });

  it.each([
    [0, 'No plants are in this growspace yet. You can still start the run.'],
    [1, '1 plant is in this growspace now.'],
  ])('describes %i plants honestly', async (count, text) => {
    const chip = await renderChip(view('none'), count);
    const dialog = await openStart(chip);
    expect($$(dialog, '[data-testid="participants"]')!.textContent).toBe(text);
  });

  it('starts on the revision it shows and closes when the backend agrees', async () => {
    hassCallMock.mockResolvedValue({ outcome: 'started', run_revision: 1, active_run: SUMMARY });
    const chip = await renderChip(view('none'));
    const dialog = await openStart(chip);
    $$<HTMLInputElement>(dialog, '#run-label')!.value = 'Autumn';
    $$<HTMLTextAreaElement>(dialog, '#run-goals')!.value = 'Beat run #3';

    await submit(dialog);
    await chip.updateComplete;

    expect(hassCallMock).toHaveBeenCalledWith(
      'growspace_manager/start_grow_run',
      {
        growspace_id: 'flower',
        expected_run_revision: 0,
        label: 'Autumn',
        goals: 'Beat run #3',
      },
      expect.anything()
    );
    expect($(chip, 'growspace-run-start-dialog')).toBeNull();
  });

  it('keeps the dialog open and says why when the backend refuses', async () => {
    hassCallMock.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'grow_run.already_active',
        message: 'Run #1 is already active',
        current_revision: 1,
        active_run: SUMMARY,
      },
    });
    const chip = await renderChip(view('none'));
    const dialog = await openStart(chip);
    await submit(dialog);

    expect($$(dialog, '[role="alert"]')!.textContent).toBe(
      'Run #1 is already active in this growspace.'
    );
    expect($$(dialog, 'ha-dialog')).not.toBeNull();
  });

  it('shows a transport failure in its own words', async () => {
    hassCallMock.mockRejectedValue(new WSError('validation_failed', 'Growspace gone'));
    const chip = await renderChip(view('none'));
    const dialog = await openStart(chip);
    await submit(dialog);
    expect($$(dialog, '[role="alert"]')!.textContent).toBe('Refused: Growspace gone');
    expect($$<HTMLButtonElement>(dialog, '[data-action="start"]')!.disabled).toBe(false);
  });

  it('cancels without sending anything', async () => {
    const chip = await renderChip(view('none'));
    const dialog = await openStart(chip);
    $$(dialog, '[data-action="cancel"]')!.click();
    await chip.updateComplete;
    expect($(chip, 'growspace-run-start-dialog')).toBeNull();
    expect(hassCallMock).not.toHaveBeenCalled();

    // Reopening does not fetch the chunk again.
    await openStart(chip);
    expect($(chip, 'growspace-lazy-chunk-error')).toBeNull();
  });
});

describe('growspace-header-ui', () => {
  const device = {
    deviceId: 'flower',
    name: 'Flower',
    plants: [{}, {}, {}],
    rows: 2,
    plantsPerRow: 2,
  } as unknown as GrowspaceDevice;

  it('puts the run chip beside the growspace name', async () => {
    const header = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .deviceId=${'flower'}
        .config=${{ default_growspace: 'flower' }}
        .run=${view('none')}
      ></growspace-header-ui>
    `);
    const chip = header.shadowRoot!.querySelector<GrowspaceRunChip>(
      '.header-title-row growspace-run-chip'
    );
    expect(chip).not.toBeNull();
    expect(chip!.plantCount).toBe(3);
  });

  it('shows no run chip against a backend without an Active Run Sensor', async () => {
    const header = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui .device=${device} .deviceId=${'flower'}></growspace-header-ui>
    `);
    expect(header.shadowRoot!.querySelector('growspace-run-chip')).toBeNull();
  });
});
