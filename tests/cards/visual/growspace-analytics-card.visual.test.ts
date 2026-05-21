import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceAnalyticsCard } from '../../../src/cards/growspace-analytics-card';
import { createMockHass } from '../../mocks/hass';
import { createMockDevice } from '../../mocks/device';

vi.mock('../../../src/cards/editors/growspace-analytics-card-editor', () => ({
    GrowspaceAnalyticsCardEditor: class extends HTMLElement {}
}));

if (!customElements.get('growspace-analytics-card')) {
    customElements.define('growspace-analytics-card', GrowspaceAnalyticsCard);
}

test('growspace-analytics-card visual snapshot', async () => {
    const element = await fixture<GrowspaceAnalyticsCard>(html`<growspace-analytics-card></growspace-analytics-card>`);
    element.hass = createMockHass() as any;

    vi.spyOn(element.store.syncService, 'refreshGrowspaceData').mockResolvedValue(undefined);
    vi.spyOn(element.store.syncService, 'updateDevicesState').mockImplementation(() => {});

    element.setConfig({ type: 'custom:growspace-analytics-card', default_growspace: 'test_tent' } as any);

    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([createMockDevice()]);
    element.store.grid.$selectedDevice.set('test_tent');
    element.store.history.$historyLoaded.set(true);
    element.store.history.$historyCache.setKey('temperature', [
        { entity_id: 'sensor.test_tent_temp', state: '23.5', attributes: {}, last_changed: '2026-05-20T10:00:00Z' },
        { entity_id: 'sensor.test_tent_temp', state: '24.0', attributes: {}, last_changed: '2026-05-20T11:00:00Z' },
        { entity_id: 'sensor.test_tent_temp', state: '24.2', attributes: {}, last_changed: '2026-05-20T12:00:00Z' },
    ]);
    element.store.history.$historyCache.setKey('humidity', [
        { entity_id: 'sensor.test_tent_humidity', state: '58', attributes: {}, last_changed: '2026-05-20T10:00:00Z' },
        { entity_id: 'sensor.test_tent_humidity', state: '60', attributes: {}, last_changed: '2026-05-20T11:00:00Z' },
        { entity_id: 'sensor.test_tent_humidity', state: '62', attributes: {}, last_changed: '2026-05-20T12:00:00Z' },
    ]);
    element.store.history.$activeEnvGraphs.set(new Set(['temperature', 'humidity']));
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
