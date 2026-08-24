import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceTankCard } from '../../../src/cards/growspace-tank-card';
import { setDevices } from '../../../src/slices/grid';
import { aHass, aTankDevice } from '../../fixtures';

vi.mock('../../../src/cards/editors/growspace-tank-card-editor', () => ({}));
vi.mock('../../../src/slices/growspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/slices/growspace')>();
  // Never-resolving mock so the bootstrap controller's async fetch doesn't
  // race with the manual setDevices() seed in this rendering test.
  return { ...actual, fetchRawCollection: vi.fn(() => new Promise(() => {})) };
});

if (!customElements.get('growspace-tank-card')) {
  customElements.define('growspace-tank-card', GrowspaceTankCard);
}

test('growspace-tank-card visual snapshot', async () => {
  const element = await fixture<GrowspaceTankCard>(
    html`<growspace-tank-card></growspace-tank-card>`
  );
  element.hass = aHass() as any;

  element.setConfig({ type: 'custom:growspace-tank-card', default_growspace: 'test_tent' } as any);

  element.store.ui.$isLoading.set(false);
  setDevices([aTankDevice()]);
  element.store.grid.$selectedDevice.set('test_tent');
  await element.updateComplete;

  await expect(page.elementLocator(element)).toMatchScreenshot();
});
