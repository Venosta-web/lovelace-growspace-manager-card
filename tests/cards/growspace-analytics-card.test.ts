import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceAnalyticsCard } from '../../src/cards/growspace-analytics-card';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';

// Ensure the custom element is defined
if (!customElements.get('growspace-analytics-card')) {
    customElements.define('growspace-analytics-card', GrowspaceAnalyticsCard);
}

describe('GrowspaceAnalyticsCard', () => {
    let element: GrowspaceAnalyticsCard;

    beforeEach(() => {
        element = new GrowspaceAnalyticsCard();
        element.hass = {
            states: {},
            callService: vi.fn(),
            language: 'en',
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAnalyticsCard);
    });

    test('initializes default growspace from config', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'test_tent',
        };

        element.setConfig(config);

        // Verify the card received the config so it's ready when devices load
        expect(element._config?.default_growspace).toBe('test_tent');
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceAnalyticsCard>(html`<growspace-analytics-card></growspace-analytics-card>`);
        // We do intentionally pass undefined to test the error fallback
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceAnalyticsCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-analytics-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(4);
    });
});
