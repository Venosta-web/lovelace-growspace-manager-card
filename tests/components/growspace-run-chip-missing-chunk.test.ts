import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../src/services/hass-call';
import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
import type { RunView } from '../../src/slices/grow-run';
import '../../src/features/grow-run/components/growspace-run-chip';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

// A stale HACS install: the entry is current, the completion chunk is not there.
vi.mock('../../src/lib/lazy-chunk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/lazy-chunk')>()),
  loadLazyChunk: vi.fn(async () => null),
}));

const ACTIVE: RunView = {
  growspaceId: 'flower',
  entityId: 'sensor.flower_active_run',
  runId: 'run-4',
  state: 'active',
  sequenceNumber: 4,
  label: null,
  startedAt: '2026-07-24T20:30:00+00:00',
  durationDays: 70,
  participantCount: 3,
  runRevision: 4,
  summary: 'Run #4 · 70 days · 3 plants',
};

describe('growspace-run-chip with a missing Grow Run View chunk', () => {
  it('names the missing file instead of doing nothing', async () => {
    // The chip reads the Run list as it renders (GSM#673).
    vi.mocked(hassCall).mockResolvedValueOnce({ outcome: 'listed', run_revision: 4, runs: [] });
    const chip = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${ACTIVE}></growspace-run-chip>
    `);
    chip.shadowRoot!.querySelector<HTMLButtonElement>('.chip')!.click();
    await vi.waitFor(() =>
      expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).not.toBeNull()
    );
    expect(
      chip.shadowRoot!.querySelector<HTMLElement & { chunk: { name: string } }>(
        'growspace-lazy-chunk-error'
      )!.chunk.name
    ).toBe('growspace-run-view');
    expect(chip.shadowRoot!.querySelector('growspace-run-view')).toBeNull();

    chip.shadowRoot!.querySelector('ha-dialog')!.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).toBeNull();
  });
});

describe('growspace-run-chip with a missing completion chunk', () => {
  it('names the missing file when the View asks to complete', async () => {
    vi.mocked(hassCall).mockResolvedValueOnce({ outcome: 'listed', run_revision: 4, runs: [] });
    const chip = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${ACTIVE}></growspace-run-chip>
    `);
    // What the Grow Run View's Complete run button dispatches (GSM#675).
    (chip as any)._onViewAction(
      new CustomEvent('run-view-action', { detail: { action: 'complete', runId: 'run-4' } })
    );
    await vi.waitFor(() =>
      expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).not.toBeNull()
    );
    expect(chip.shadowRoot!.querySelector('growspace-run-completion-dialog')).toBeNull();

    chip.shadowRoot!.querySelector('ha-dialog')!.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).toBeNull();
  });
});

describe('growspace-run-chip with a missing finalization chunk', () => {
  it('names the missing file instead of doing nothing', async () => {
    vi.mocked(hassCall).mockResolvedValueOnce({
      outcome: 'listed',
      run_revision: 4,
      runs: [
        {
          run_id: 'run-3',
          sequence_number: 3,
          label: null,
          status: 'completed',
          started_at: '2026-04-01T08:00:00+00:00',
          completed_at: '2026-07-01T08:00:00+00:00',
          timezone: 'Europe/Berlin',
          participant_count: 3,
          metrics_state: 'pending',
          run_revision: 4,
        },
      ],
    });
    const chip = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${ACTIVE}></growspace-run-chip>
    `);
    await vi.waitFor(() =>
      expect(chip.shadowRoot!.querySelector('[data-action="finalize-run"]')).not.toBeNull()
    );
    chip.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="finalize-run"]')!.click();
    await vi.waitFor(() =>
      expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).not.toBeNull()
    );
    expect(chip.shadowRoot!.querySelector('growspace-run-finalization-dialog')).toBeNull();

    chip.shadowRoot!.querySelector('ha-dialog')!.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).toBeNull();
  });
});

describe('growspace-run-chip with a missing discard chunk', () => {
  it('names the missing file when the View asks to discard', async () => {
    vi.mocked(hassCall).mockResolvedValueOnce({ outcome: 'listed', run_revision: 4, runs: [] });
    const chip = await fixture<GrowspaceRunChip>(html`
      <growspace-run-chip .view=${ACTIVE}></growspace-run-chip>
    `);
    // What the Grow Run View's Discard run button dispatches (GSM#917).
    (chip as any)._onViewAction(
      new CustomEvent('run-view-action', {
        detail: { action: 'discard', runId: 'run-4', sequenceNumber: 4, runRevision: 4 },
      })
    );
    await vi.waitFor(() =>
      expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).not.toBeNull()
    );
    expect(chip.shadowRoot!.querySelector('growspace-run-discard-dialog')).toBeNull();

    chip.shadowRoot!.querySelector('ha-dialog')!.dispatchEvent(new CustomEvent('closed'));
    await chip.updateComplete;
    expect(chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')).toBeNull();
  });
});
