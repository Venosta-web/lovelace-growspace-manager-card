import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';

import { GrowspaceTcCard } from '../../src/cards/growspace-tc-card';
import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import { resetTcPresence } from '../../src/slices/tc';
import { FakeHuiCard, mountInHuiCard } from './fake-hui-card';

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

/** The card's own verdict, once the probe has answered either way. */
async function settled(card: GrowspaceTcCard): Promise<void> {
  await vi.waitFor(() => expect((card as any)._presence.status).not.toBe('unknown'));
  await card.updateComplete;
}

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
});

afterEach(() => {
  resetTcPresence();
});

describe('GrowspaceTcCard inside hui-card', () => {
  test('reveals itself on an idle dashboard, with no further hass update', async () => {
    // Hold the manifest open so the window the bug lives in can be entered
    // deliberately: the card has hidden itself for the duration of the probe,
    // and the dashboard is still delivering the ordinary burst of `hass`
    // updates that follows a page load.
    let answerManifest: (manifest: unknown) => void = () => {};
    hassCallMock.mockReturnValue(
      new Promise((resolve) => {
        answerManifest = resolve;
      })
    );

    const wrapper = await mountInHuiCard('custom:growspace-tc-card', { language: 'en' });
    const card = wrapper.element as GrowspaceTcCard;
    await card.updateComplete;

    // One such update, landing while the answer is outstanding. This is all it
    // takes: the wrapper reads `hidden` off the card, caches it, and takes the
    // card out of the DOM.
    wrapper.hass = { language: 'en' };
    expect(wrapper.hidden).toBe(true);
    expect(card.parentElement).toBeNull();

    // From here the instance is quiet — nothing is assigned to `wrapper.hass`
    // again. Everything that follows is the card's own doing.
    answerManifest(MANIFEST);
    await settled(card);

    await vi.waitFor(() => expect(wrapper.hidden).toBe(false));
    expect(card.hasAttribute('hidden')).toBe(false);
    expect(card.parentElement).toBe(wrapper);
    expect(card.shadowRoot?.querySelector('growspace-tc-view')).not.toBeNull();
  });

  test('collapses the slot, and asks nothing more, when TC is absent', async () => {
    hassCallMock.mockRejectedValue(
      new WSError('internal_error', 'Unknown command growspace_manager_tc/get_manifest')
    );

    const wrapper = await mountInHuiCard('custom:growspace-tc-card', { language: 'en' });
    const card = wrapper.element as GrowspaceTcCard;
    await settled(card);

    expect(wrapper.hidden).toBe(true);
    expect(wrapper.style.display).toBe('none');
    // `hui-card` takes a hidden card back out of the DOM; nothing of the card
    // is left on the dashboard to reserve space.
    expect(card.parentElement).toBeNull();
    expect(hassCallMock).toHaveBeenCalledTimes(1);
  });
});
