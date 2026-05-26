import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceAiInsightCard } from '../../../src/cards/growspace-ai-insight-card';
import { createMockHass } from '../../mocks/hass';
import { createMockDevice } from '../../mocks/device';

vi.mock('../../../src/cards/editors/growspace-ai-insight-card-editor', () => ({
    GrowspaceAiInsightCardEditor: class extends HTMLElement {}
}));

if (!customElements.get('growspace-ai-insight-card')) {
    customElements.define('growspace-ai-insight-card', GrowspaceAiInsightCard);
}

test('growspace-ai-insight-card visual snapshot', async () => {
    const element = await fixture<GrowspaceAiInsightCard>(html`<growspace-ai-insight-card></growspace-ai-insight-card>`);
    element.hass = createMockHass() as any;

    vi.spyOn(element.store.syncService, 'refreshGrowspaceData').mockResolvedValue(undefined);
    vi.spyOn(element.store.syncService, 'updateDevicesState').mockImplementation(() => {});

    element.setConfig({ type: 'custom:growspace-ai-insight-card', default_growspace: 'test_tent' } as any);

    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([createMockDevice()]);
    element.store.grid.$selectedDevice.set('test_tent');
    (element as any)._response = 'Gorilla Glue #4 is in week 2 of flower and looks healthy. Consider raising EC to 1.8 and maintaining 12/12 light. VPD is optimal at 1.2 kPa. Blue Dream in veg is on track for a 5-week cycle.';
    await element.requestUpdate();
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
