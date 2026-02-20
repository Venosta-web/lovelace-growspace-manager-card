import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceAnalyticsCardEditor } from '../../../src/cards/editors/growspace-analytics-card-editor';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

if (!customElements.get('growspace-analytics-card-editor')) {
    customElements.define('growspace-analytics-card-editor', GrowspaceAnalyticsCardEditor);
}

describe('GrowspaceAnalyticsCardEditor', () => {
    let element: GrowspaceAnalyticsCardEditor;

    beforeEach(() => {
        element = new GrowspaceAnalyticsCardEditor();
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    state: '2',
                    attributes: {
                        growspaces: [
                            { id: 'all', name: 'All Growspaces' },
                            { id: 'gs1', name: 'Test Tent' },
                            { id: 'gs2', name: 'Another Tent' }
                        ]
                    }
                }
            },
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAnalyticsCardEditor);
    });

    test('loads configured value on setConfig', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        expect(element._default_growspace).toBe('gs1');
    });

    test('renders options based on sensor.growspaces_list', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'gs1',
        };

        const el = await fixture<GrowspaceAnalyticsCardEditor>(html`<growspace-analytics-card-editor></growspace-analytics-card-editor>`);
        el.hass = element.hass;
        el.setConfig(config);
        await el.updateComplete;

        expect(el).toBeTruthy();

        const select = el.shadowRoot?.querySelector('select');
        expect(select).toBeTruthy();

        // Should have 4 options: Default "Select", plus 'all', 'gs1', and 'gs2'
        const options = select?.querySelectorAll('option');
        expect(options?.length).toBe(4);

        if (options) {
            expect(options[1].value).toBe('all');
            expect(options[1].textContent?.trim()).toBe('All Growspaces');

            // GS1 should be the selected option based on config
            expect((options[2] as HTMLOptionElement).selected).toBe(true);
        }
    });

    test('dispatches config-changed event when selection changes', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: '',
        };

        const el = await fixture<GrowspaceAnalyticsCardEditor>(html`<growspace-analytics-card-editor></growspace-analytics-card-editor>`);
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
