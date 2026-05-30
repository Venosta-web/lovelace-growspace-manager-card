import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceManagerCard } from '../../../src/growspace-manager-card';
import { aHass } from '../../fixtures';
import { createMockDevice } from '../../mocks/device';

vi.mock('../../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../../src/features/ui/containers/growspace-toast.container', () => ({}));
vi.mock('../../../src/growspace-manager-card-editor.js', () => ({}));

if (!customElements.get('growspace-manager-card')) {
    customElements.define('growspace-manager-card', GrowspaceManagerCard);
}

test('growspace-manager-card visual snapshot', async () => {
    const element = await fixture<GrowspaceManagerCard>(html`<growspace-manager-card></growspace-manager-card>`);
    element.hass = aHass() as any;

    vi.spyOn(element.store.syncService, 'refreshGrowspaceData').mockResolvedValue(undefined);
    vi.spyOn(element.store.syncService, 'updateDevicesState').mockImplementation(() => {});

    element.setConfig({ type: 'custom:growspace-manager-card', default_growspace: 'test_tent' } as any);

    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([createMockDevice()]);
    element.store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
