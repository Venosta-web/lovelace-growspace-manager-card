import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it, vi } from 'vitest';

import type { GrowspaceRunChip } from '../../src/features/grow-run/components/growspace-run-chip';
import type { RunView } from '../../src/slices/grow-run';
import '../../src/features/grow-run/components/growspace-run-chip';

// A stale HACS install: the entry is current, the start dialog's chunk is gone.
vi.mock('../../src/lib/lazy-chunk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/lazy-chunk')>()),
  loadLazyChunk: vi.fn().mockResolvedValue(null),
}));

const NONE: RunView = {
  growspaceId: 'flower',
  entityId: 'sensor.flower_active_run',
  runId: null,
  state: 'none',
  sequenceNumber: null,
  label: null,
  startedAt: null,
  durationDays: null,
  participantCount: null,
  runRevision: 0,
  summary: 'Start run',
};

describe('growspace-run-chip without its start chunk', () => {
  it('names the missing file instead of opening nothing', async () => {
    const chip = await fixture<GrowspaceRunChip>(
      html`<growspace-run-chip .view=${NONE}></growspace-run-chip>`
    );
    chip.shadowRoot!.querySelector<HTMLElement>('.chip')!.click();
    await vi.waitFor(() => {
      if (!chip.shadowRoot!.querySelector('growspace-lazy-chunk-error')) {
        throw new Error('no chunk error yet');
      }
    });
    expect(chip.shadowRoot!.querySelector('growspace-run-start-dialog')).toBeNull();
  });
});
