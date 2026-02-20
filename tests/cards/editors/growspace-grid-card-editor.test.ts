import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceGridCardEditor } from '../../../src/cards/editors/growspace-grid-card-editor';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

// Ensure the custom element is defined
if (!customElements.get('growspace-grid-card-editor')) {
    customElements.define('growspace-grid-card-editor', GrowspaceGridCardEditor);
}

describe('GrowspaceGridCardEditor', () => {
    let element: GrowspaceGridCardEditor;

    beforeEach(() => {
        element = new GrowspaceGridCardEditor();
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    entity_id: 'sensor.growspaces_list',
                    state: 'OK',
                    attributes: {
                        growspaces: {
                            'gs1': 'Test Tent',
                            'gs2': 'Veg Room'
                        }
                    }
                }
            },
            callService: vi.fn(),
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(vi.fn()),
            }
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceGridCardEditor);
    });

    test('renders options based on sensor.growspaces_list', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'gs1',
        };

        const el = await fixture<GrowspaceGridCardEditor>(html`<growspace-grid-card-editor></growspace-grid-card-editor>`);
        el.hass = element.hass;
        el.setConfig(config);
        await el.updateComplete;

        expect(el).toBeTruthy();

        const select = el.shadowRoot?.querySelector('select');
        expect(select).toBeTruthy();

        // Should have 3 options: Default "Select", plus 'gs1' and 'gs2'
        const options = select?.querySelectorAll('option');
        expect(options?.length).toBe(3);

        if (options) {
            expect(options[1].value).toBe('gs1');
            expect(options[1].textContent).toBe('Test Tent');
        }
    });

    test('handles missing hass gracefully', () => {
        element.hass = undefined as any;
        expect(() => {
            element.setConfig({ type: 'custom:growspace-grid-card' });
        }).not.toThrow();
    });

    test('dispatches config-changed event when selection changes', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: '',
        };

        const el = await fixture<GrowspaceGridCardEditor>(html`<growspace-grid-card-editor></growspace-grid-card-editor>`);
        el.hass = element.hass;
        el.setConfig(config);
        await el.updateComplete;

        const dispatchEventSpy = vi.spyOn(el, 'dispatchEvent');

        const select = el.shadowRoot?.querySelector('select');

        if (select) {
            // Simulate user changing select to gs2
            select.value = 'gs2';
            select.dispatchEvent(new Event('change'));
        }

        expect(dispatchEventSpy).toHaveBeenCalled();
        const eventArg = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(eventArg.type).toBe('config-changed');
        expect(eventArg.detail.config.default_growspace).toBe('gs2');
    });
});
