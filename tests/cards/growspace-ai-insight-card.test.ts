import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceAiInsightCard } from '../../src/cards/growspace-ai-insight-card';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';

// Ensure the custom element is defined
if (!customElements.get('growspace-ai-insight-card')) {
    customElements.define('growspace-ai-insight-card', GrowspaceAiInsightCard);
}

describe('GrowspaceAiInsightCard', () => {
    let element: GrowspaceAiInsightCard;

    beforeEach(() => {
        element = new GrowspaceAiInsightCard();
        element.hass = {
            states: {},
            callService: vi.fn(),
            language: 'en',
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAiInsightCard);
    });

    test('initializes default growspace from config', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-ai-insight-card',
            default_growspace: 'test_tent',
        };

        element.setConfig(config);

        // Verify the card received the config so it's ready when devices load
        expect(element._config?.default_growspace).toBe('test_tent');
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceAiInsightCard>(html`<growspace-ai-insight-card></growspace-ai-insight-card>`);
        // We do intentionally pass undefined to test the error fallback
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error-state');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceAiInsightCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-ai-insight-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(4);
    });
});
