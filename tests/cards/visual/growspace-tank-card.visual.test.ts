import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceTankCard } from '../../../src/cards/growspace-tank-card';
import { aHass, aTankDevice } from '../../fixtures';


vi.mock('../../../src/cards/editors/growspace-tank-card-editor', () => ({}));

if (!customElements.get('growspace-tank-card')) {
    customElements.define('growspace-tank-card', GrowspaceTankCard);
}

test('growspace-tank-card visual snapshot', async () => {
    const element = await fixture<GrowspaceTankCard>(html`<growspace-tank-card></growspace-tank-card>`);
    element.hass = aHass() as any;

    vi.spyOn(element.store.syncService, 'refreshGrowspaceData').mockResolvedValue(undefined);
    vi.spyOn(element.store.syncService, 'updateDevicesState').mockImplementation(() => {});

    element.setConfig({ type: 'custom:growspace-tank-card', default_growspace: 'test_tent' } as any);

    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([aTankDevice()]);
    element.store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
