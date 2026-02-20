import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceGridCard } from '../../src/cards/growspace-grid-card';
import { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';

// Ensure the custom element is defined
if (!customElements.get('growspace-grid-card')) {
    customElements.define('growspace-grid-card', GrowspaceGridCard);
}

describe('GrowspaceGridCard', () => {
    let element: GrowspaceGridCard;

    beforeEach(() => {
        element = new GrowspaceGridCard();
        element.hass = {
            states: {},
            callService: vi.fn(),
            language: 'en',
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceGridCard);
    });

    test('forces compact mode and standard view on config set', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'test_tent',
            // User might try to set these, but the card should override them
            compact: false,
            initial_view_mode: 'heatmap' as any,
        };

        element.setConfig(config);

        // Verify the store received the forced config
        expect(element.store.ui.$cardViewState.get().viewMode).toBe(ViewMode.STANDARD);
    });

    test('renders error state when hass is missing', async () => {
        const el = await fixture<GrowspaceGridCard>(html`<growspace-grid-card></growspace-grid-card>`);
        // We do intentionally pass undefined to test the error fallback
        el.hass = undefined as any;
        await el.updateComplete;

        const errorDiv = el.shadowRoot?.querySelector('.error');
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain('Home Assistant not available');
    });

    test('provides fallback stub config', () => {
        const stub = GrowspaceGridCard.getStubConfig();
        expect(stub.type).toBe('custom:growspace-grid-card');
        expect(stub).toHaveProperty('default_growspace');
    });

    test('returns standard card size', () => {
        expect(element.getCardSize()).toBe(3);
    });
});
