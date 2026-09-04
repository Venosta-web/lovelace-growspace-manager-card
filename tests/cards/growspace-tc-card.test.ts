import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { GrowspaceTcCard } from '../../src/cards/growspace-tc-card';
import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import { resetTcPresence } from '../../src/slices/tc';

// The lazy TC chunk reaches the strain slice — the culture board resolves its
// phenotype references against Growspace Manager's library client-side — so the
// mock has to answer for every export that module imports, or the chunk fails
// to evaluate and the card reports itself missing.
vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

if (!customElements.get('growspace-tc-card')) {
  customElements.define('growspace-tc-card', GrowspaceTcCard);
}

const MANIFEST = {
  contract_version: 1,
  integration_version: '0.1.0',
  features: [],
  collections: {},
};

async function renderTcCard(): Promise<GrowspaceTcCard> {
  const element = await fixture<GrowspaceTcCard>('<growspace-tc-card></growspace-tc-card>');
  element.setConfig({ type: 'custom:growspace-tc-card' });
  element.hass = { language: 'en' } as any;
  await element.updateComplete;
  // The probe and, when TC answers, the chunk fetch both settle after the
  // first render. Wait for the verdict rather than for a fixed number of
  // ticks — loading the chunk is a real network round trip in the browser.
  await vi.waitFor(() => expect((element as any)._presence.status).not.toBe('unknown'));
  await element.updateComplete;
  return element;
}

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
});

afterEach(() => {
  resetTcPresence();
});

describe('GrowspaceTcCard', () => {
  test('throws on invalid config', async () => {
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'unknown command'));
    const element = await renderTcCard();

    expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
  });

  test('renders the TC view once the manifest answers', async () => {
    hassCallMock.mockResolvedValue(MANIFEST);

    const element = await renderTcCard();

    expect(element.shadowRoot?.querySelector('growspace-tc-view')).not.toBeNull();
    expect(element.hasAttribute('hidden')).toBe(false);
    expect(element.getCardSize()).toBe(4);
  });

  test('hides itself and renders nothing when TC is not installed', async () => {
    hassCallMock.mockRejectedValue(
      new WSError('internal_error', 'Unknown command growspace_manager_tc/get_manifest')
    );

    const element = await renderTcCard();

    expect(element.shadowRoot?.querySelector('growspace-tc-view')).toBeNull();
    expect(element.hasAttribute('hidden')).toBe(true);
    expect(element.getCardSize()).toBe(0);
  });

  test('asks Home Assistant exactly once, and only for the manifest', async () => {
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'unknown command'));

    await renderTcCard();

    expect(hassCallMock).toHaveBeenCalledTimes(1);
    expect(hassCallMock.mock.calls[0][0]).toBe('growspace_manager_tc/get_manifest');
  });

  test('provides a stub config for the card picker', () => {
    expect(GrowspaceTcCard.getStubConfig().type).toBe('custom:growspace-tc-card');
  });
});
