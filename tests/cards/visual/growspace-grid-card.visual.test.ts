import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceGridCard } from '../../../src/cards/growspace-grid-card';
import { createMockHass } from '../../mocks/hass';
import { createMockDevice } from '../../mocks/device';

// Keep only non-visual mocks so the card renders its actual content
vi.mock('../../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../../src/features/ui/containers/growspace-toast.container', () => ({}));
vi.mock('../../../src/cards/editors/growspace-grid-card-editor', () => ({
    GrowspaceGridCardEditor: class extends HTMLElement {}
}));

if (!customElements.get('growspace-grid-card')) {
    customElements.define('growspace-grid-card', GrowspaceGridCard);
}

test('growspace-grid-card visual snapshot', async () => {
    const element = await fixture<GrowspaceGridCard>(html`<growspace-grid-card></growspace-grid-card>`);
    element.hass = createMockHass() as any;

    vi.spyOn(element.store.syncService, 'refreshGrowspaceData').mockResolvedValue(undefined);
    vi.spyOn(element.store.syncService, 'updateDevicesState').mockImplementation(() => {});

    element.setConfig({ type: 'custom:growspace-grid-card', default_growspace: 'test_tent' } as any);

    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([createMockDevice()]);
    element.store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
