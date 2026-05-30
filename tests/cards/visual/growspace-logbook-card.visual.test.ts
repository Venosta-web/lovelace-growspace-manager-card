import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceLogbookCard } from '../../../src/cards/growspace-logbook-card';
import { aHass } from '../../fixtures';
import { createMockDevice } from '../../mocks/device';

// Mock the timeline service so growspace-logbook renders empty events instead of fetching
vi.mock('../../../src/services/timeline-service', () => ({
    getTimelineService: () => ({
        fetchGrowspaceEvents: async () => ([
            { category: 'watering', sensor_type: 'watering', growspace_id: 'test_tent', timestamp: '2026-05-20T10:00:00Z', data: { amount_ml: 500 } },
            { category: 'training', sensor_type: 'lst', growspace_id: 'test_tent', timestamp: '2026-05-19T14:00:00Z', data: {} },
        ]),
    }),
}));
vi.mock('../../../src/cards/editors/growspace-logbook-card-editor', () => ({}));

if (!customElements.get('growspace-logbook-card')) {
    customElements.define('growspace-logbook-card', GrowspaceLogbookCard);
}

test('growspace-logbook-card visual snapshot', async () => {
    const element = await fixture<GrowspaceLogbookCard>(html`<growspace-logbook-card></growspace-logbook-card>`);
    element.hass = aHass() as any;

    vi.spyOn((element as any)._store.syncService, 'refreshGrowspaceData').mockResolvedValue(undefined);
    vi.spyOn((element as any)._store.syncService, 'updateDevicesState').mockImplementation(() => {});

    element.setConfig({ type: 'custom:growspace-logbook-card', default_growspace: 'test_tent' } as any);

    (element as any)._store.ui.$isLoading.set(false);
    (element as any)._store.data.$devices.set([createMockDevice()]);
    (element as any)._store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;
    // Allow the async _fetchEvents to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
