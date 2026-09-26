import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import type { RunView } from '../../src/slices/grow-run';
import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
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

async function openStart(chip: GrowspaceRunChip): Promise<void> {
  $(chip, '.chip')!.click();
  await chip.updateComplete;
}

async function submit(chip: GrowspaceRunChip): Promise<void> {
  $(chip, '[data-action="start"]')!.click();
  await chip.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await chip.updateComplete;
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
    const chip = await renderChip(ACTIVE);
    const button = $(chip, '.chip')!;
    expect(button.dataset.state).toBe('active');
    expect(button.textContent).toContain('Run #4 · Autumn · 61 days · 17 plants');
    expect(button.getAttribute('aria-label')).toBe(
      'Active grow run: Run #4 · Autumn · 61 days · 17 plants. Open details.'
    );

    const opened = vi.fn();
    chip.addEventListener('hass-more-info', (event) => opened((event as CustomEvent).detail));
    button.click();
    expect(opened).toHaveBeenCalledWith({ entityId: 'sensor.flower_active_run' });
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

    await openStart(chip);
    expect($(chip, '[data-testid="participants"]')!.textContent).toBe(
      '2 plants are in this growspace now.'
    );
  });

  it.each([
    [0, 'No plants are in this growspace yet. You can still start the run.'],
    [1, '1 plant is in this growspace now.'],
  ])('describes %i plants honestly', async (count, text) => {
    const chip = await renderChip(view('none'), count);
    await openStart(chip);
    expect($(chip, '[data-testid="participants"]')!.textContent).toBe(text);
  });

  it('starts on the revision it shows and closes when the backend agrees', async () => {
    hassCallMock.mockResolvedValue({ outcome: 'started', run_revision: 1, active_run: SUMMARY });
    const chip = await renderChip(view('none'));
    await openStart(chip);
    $<HTMLInputElement>(chip, '#run-label')!.value = 'Autumn';
    $<HTMLTextAreaElement>(chip, '#run-goals')!.value = 'Beat run #3';

    await submit(chip);

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
    expect($(chip, 'ha-dialog')).toBeNull();
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
    await openStart(chip);
    await submit(chip);

    expect($(chip, '[role="alert"]')!.textContent).toBe(
      'Run #1 is already active in this growspace.'
    );
    expect($(chip, 'ha-dialog')).not.toBeNull();
  });

  it('shows a transport failure in its own words', async () => {
    hassCallMock.mockRejectedValue(new WSError('validation_failed', 'Growspace gone'));
    const chip = await renderChip(view('none'));
    await openStart(chip);
    await submit(chip);
    expect($(chip, '[role="alert"]')!.textContent).toBe('Refused: Growspace gone');
    expect($<HTMLButtonElement>(chip, '[data-action="start"]')!.disabled).toBe(false);
  });

  it('cancels without sending anything', async () => {
    const chip = await renderChip(view('none'));
    await openStart(chip);
    $(chip, '[data-action="cancel"]')!.click();
    await chip.updateComplete;
    expect($(chip, 'ha-dialog')).toBeNull();
    expect(hassCallMock).not.toHaveBeenCalled();
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
