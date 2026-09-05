import { expect, test, vi, beforeEach } from 'vitest';

import { GrowspaceTcCard } from '../../src/cards/growspace-tc-card';
import { hassCall } from '../../src/services/hass-call';
import { resetTcPresence } from '../../src/slices/tc';
import { resetLazyChunks } from '../../src/lib/lazy-chunk';
import { mountInHuiCard } from './fake-hui-card';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  setHass: vi.fn(),
}));

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

/**
 * The stale-flag bug and the stale-chunk bug meet here: a user who has TC and a
 * HACS install serving last month's chunks must be told the view cannot load,
 * and "told" means on the dashboard, not on an element the wrapper has taken
 * out of the DOM.
 */
test('a TC install whose view chunk is missing is reported through the wrapper', async () => {
  let answerManifest: (manifest: unknown) => void = () => {};
  vi.mocked(hassCall).mockReturnValue(
    new Promise((resolve) => {
      answerManifest = resolve;
    })
  );

  const wrapper = await mountInHuiCard('custom:growspace-tc-card', { language: 'en' });
  const card = wrapper.element as GrowspaceTcCard;
  await card.updateComplete;

  // The same ordinary update that strands the working card, so that what this
  // asserts is the error surviving the wrapper's cached flag rather than the
  // wrapper never having cached one.
  wrapper.hass = { language: 'en' };
  expect(wrapper.hidden).toBe(true);

  answerManifest({
    contract_version: 1,
    integration_version: '0.1.0',
    features: [],
    collections: {},
  });
  await vi.waitFor(() => expect((card as any)._presence.status).toBe('present'));
  await card.updateComplete;

  await vi.waitFor(() => expect(wrapper.hidden).toBe(false));
  expect(card.parentElement).toBe(wrapper);
  expect(card.shadowRoot?.querySelector('growspace-tc-view')).toBeNull();
  const error = card.shadowRoot?.querySelector('growspace-lazy-chunk-error');
  expect(error).not.toBeNull();
  expect(error?.shadowRoot?.textContent).toContain('growspace-tc-*.js');
});
