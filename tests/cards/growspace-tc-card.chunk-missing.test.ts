import { expect, test, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcCard } from '../../src/cards/growspace-tc-card';
import { hassCall } from '../../src/services/hass-call';
import { resetTcPresence } from '../../src/slices/tc';
import { resetLazyChunks } from '../../src/lib/lazy-chunk';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  setHass: vi.fn(),
}));

// A HACS install can serve a current entry bundle on top of a months-old chunk
// set, and `loadLazyChunk` reports that by resolving to null. Only that one
// export is replaced: `LAZY_CHUNKS` and `lazyChunkMessage` are the real ones,
// so the message the user reads is the message the card would really print.
vi.mock('../../src/lib/lazy-chunk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/lazy-chunk')>()),
  loadLazyChunk: vi.fn().mockResolvedValue(null),
}));

if (!customElements.get('growspace-tc-card')) {
  customElements.define('growspace-tc-card', GrowspaceTcCard);
}

beforeEach(() => {
  resetTcPresence();
  resetLazyChunks();
  vi.clearAllMocks();
});

test('a TC install whose view chunk is missing is reported, not hidden', async () => {
  vi.mocked(hassCall).mockResolvedValue({
    contract_version: 1,
    integration_version: '0.1.0',
    features: [],
    collections: {},
  });

  const element = await fixture<GrowspaceTcCard>('<growspace-tc-card></growspace-tc-card>');
  element.setConfig({ type: 'custom:growspace-tc-card' });
  element.hass = { language: 'en' } as any;
  await element.updateComplete;
  await vi.waitFor(() => expect((element as any)._presence.status).toBe('present'));
  await element.updateComplete;

  expect(element.hasAttribute('hidden')).toBe(false);
  expect(element.shadowRoot?.querySelector('growspace-tc-view')).toBeNull();
  const error = element.shadowRoot?.querySelector('growspace-lazy-chunk-error');
  expect(error).not.toBeNull();
  expect(error?.shadowRoot?.textContent).toContain('growspace-tc-*.js');
});
