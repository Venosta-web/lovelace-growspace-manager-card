import { fixture } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { GrowspaceCarouselCard } from '../../../src/cards/growspace-carousel-card';
import { aHass } from '../../fixtures';

// Mock the inner manager card to avoid its full dependency tree in a carousel-focused snapshot
vi.mock('../../../src/growspace-manager-card', () => {
    class MockManagerCard extends HTMLElement {
        public hass: any;
        public _config: any;
        public store = { handleDeviceChange: vi.fn() };
        constructor() {
            super();
            this.attachShadow({ mode: 'open' }).innerHTML =
                '<div style="padding:24px;color:#e1e1e1;font-family:sans-serif;background:#1c1c1e;border-radius:12px;min-height:120px"><strong>Test Tent</strong><br><span style="color:#9e9e9e;font-size:12px">2 plants · Flower W2</span></div>';
        }
    }
    if (!customElements.get('growspace-manager-card')) {
        customElements.define('growspace-manager-card', MockManagerCard);
    }
    return { GrowspaceManagerCard: MockManagerCard };
});

if (!customElements.get('growspace-carousel-card')) {
    customElements.define('growspace-carousel-card', GrowspaceCarouselCard);
}

test('growspace-carousel-card visual snapshot', async () => {
    const element = await fixture<GrowspaceCarouselCard>(html`<growspace-carousel-card></growspace-carousel-card>`);
    element.hass = aHass() as any;
    element.setConfig({ type: 'custom:growspace-carousel-card', growspaces: ['test_tent'] } as any);
    await element.updateComplete;

    await expect(page.elementLocator(element)).toMatchScreenshot();
});
