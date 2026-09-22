/**
 * What the print and retry calls put on the wire: consent is sent only when
 * it was given, and printing anyway is its own field, never folded into the
 * warning acknowledgement.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const gated = vi.hoisted(() => vi.fn());
vi.mock('./gated', () => ({ gated }));

import {
  printLabelBatch,
  retryLabelBatch,
  WS_PRINT_LABEL_BATCH,
  WS_RETRY_LABEL_BATCH,
} from './batch';

beforeEach(() => {
  gated.mockReset();
  gated.mockResolvedValue({ outcome: 'ok' });
});

describe('printLabelBatch', () => {
  it('sends only the preflight when no consent was given', async () => {
    await printLabelBatch('p1', null);
    expect(gated).toHaveBeenCalledWith(
      WS_PRINT_LABEL_BATCH,
      { preflight_id: 'p1' },
      expect.anything()
    );
  });

  it('sends the override beside the acknowledgement', async () => {
    await printLabelBatch('p1', 'sha256:r', 'sha256:r');
    expect(gated).toHaveBeenCalledWith(
      WS_PRINT_LABEL_BATCH,
      { preflight_id: 'p1', acknowledgement: 'sha256:r', override: 'sha256:r' },
      expect.anything()
    );
  });
});

describe('retryLabelBatch', () => {
  it('repeats the override only when given one', async () => {
    await retryLabelBatch('j1', 'sha256:r');
    expect(gated).toHaveBeenLastCalledWith(
      WS_RETRY_LABEL_BATCH,
      { job_id: 'j1', acknowledgement: 'sha256:r' },
      expect.anything()
    );
    await retryLabelBatch('j1', null, 'sha256:r');
    expect(gated).toHaveBeenLastCalledWith(
      WS_RETRY_LABEL_BATCH,
      { job_id: 'j1', override: 'sha256:r' },
      expect.anything()
    );
  });
});
