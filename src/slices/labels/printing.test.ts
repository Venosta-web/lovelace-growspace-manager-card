/**
 * What a record print puts on the wire: the approval alone, and the consent to
 * print anyway only when the operator gave it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const gated = vi.hoisted(() => vi.fn());
vi.mock('./gated', () => ({ gated }));

import { printLabelRecord, WS_PRINT_LABEL_RECORD } from './printing';

beforeEach(() => {
  gated.mockReset();
  gated.mockResolvedValue({ outcome: 'ok' });
});

describe('printLabelRecord', () => {
  it('sends only the approval when nobody asked to print anyway', async () => {
    await printLabelRecord('a1', 'sha256:r');
    expect(gated).toHaveBeenCalledWith(
      WS_PRINT_LABEL_RECORD,
      { approval_id: 'a1', expected_raster_identity: 'sha256:r' },
      expect.anything()
    );
  });

  it('sends the override beside the approval it consents to', async () => {
    await printLabelRecord('a1', 'sha256:r', true);
    expect(gated).toHaveBeenCalledWith(
      WS_PRINT_LABEL_RECORD,
      { approval_id: 'a1', expected_raster_identity: 'sha256:r', override: true },
      expect.anything()
    );
  });
});
