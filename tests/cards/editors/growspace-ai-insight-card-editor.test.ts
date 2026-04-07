import { fixture } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { GrowspaceAiInsightCardEditor } from '../../../src/cards/editors/growspace-ai-insight-card-editor';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

if (!customElements.get('growspace-ai-insight-card-editor')) {
    customElements.define('growspace-ai-insight-card-editor', GrowspaceAiInsightCardEditor);
}

describe('GrowspaceAiInsightCardEditor', () => {
    let element: GrowspaceAiInsightCardEditor;

    beforeEach(() => {
        element = new GrowspaceAiInsightCardEditor();
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
        expect(element).toBeInstanceOf(GrowspaceAiInsightCardEditor);
    });

    test('loads configured value on setConfig', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-ai-insight-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        expect(element._default_growspace).toBe('gs1');
    });

    test('renders options based on sensor.growspaces_list', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-ai-insight-card',
            default_growspace: 'gs1',
        };

        const el = await fixture<GrowspaceAiInsightCardEditor>(html`<growspace-ai-insight-card-editor></growspace-ai-insight-card-editor>`);
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
            type: 'custom:growspace-ai-insight-card',
            default_growspace: '',
        };

        const el = await fixture<GrowspaceAiInsightCardEditor>(html`<growspace-ai-insight-card-editor></growspace-ai-insight-card-editor>`);
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

    test('loads growspaces from object (record) format', () => {
        const el = new GrowspaceAiInsightCardEditor();
        el.hass = {
            states: {
                'sensor.growspaces_list': {
                    state: '2',
                    attributes: {
                        growspaces: {
                            gs1: 'Tent 1',
                            gs2: 'Tent 2',
                        },
                    },
                },
            },
        } as any;
        (el as any)._loadGrowspaces();
        const opts = (el as any)._sensorGrowspaces as Array<{ id: string; name: string }>;
        expect(opts.length).toBe(2);
        expect(opts[0].id).toBe('gs1');
        expect(opts[0].name).toBe('Tent 1');
    });

    test('handles _loadGrowspaces with missing hass', () => {
        element.hass = undefined as any;
        (element as any)._loadGrowspaces();
        expect((element as any)._sensorGrowspaces).toEqual([]);
    });

    test('handles _loadGrowspaces with missing sensor or attributes', () => {
        element.hass = { states: {} } as any;
        (element as any)._loadGrowspaces();
        expect((element as any)._sensorGrowspaces).toEqual([]);

        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {}
                }
            }
        } as any;
        (element as any)._loadGrowspaces();
        expect((element as any)._sensorGrowspaces).toEqual([]);
    });

    test('loads growspaces with fallback names in array format', () => {
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: [
                            { id: 'gs1' }, // Missing name
                            { id: 'gs2', name: '' } // Empty name
                        ]
                    }
                }
            }
        } as any;
        (element as any)._loadGrowspaces();
        const opts = (element as any)._sensorGrowspaces;
        expect(opts[0].name).toBe('gs1');
        expect(opts[1].name).toBe('gs2');
    });

    test('loads growspaces with fallback names in object format', () => {
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: {
                            gs1: '',
                        }
                    }
                }
            }
        } as any;
        (element as any)._loadGrowspaces();
        const opts = (element as any)._sensorGrowspaces;
        expect(opts[0].name).toBe('gs1');
    });

    test('_valueChanged guard (missing config or hass)', () => {
        const spy = vi.spyOn(element, 'dispatchEvent');
        
        (element as any)._config = undefined;
        (element as any)._valueChanged(new Event('change'));
        expect(spy).not.toHaveBeenCalled();

        (element as any)._config = { type: 'custom:growspace-ai-insight-card' };
        element.hass = undefined as any;
        (element as any)._valueChanged(new Event('change'));
        expect(spy).not.toHaveBeenCalled();
    });

    test('_valueChanged does nothing if value is the same', () => {
        (element as any)._config = { 
            type: 'custom:growspace-ai-insight-card',
            default_growspace: 'gs1'
        };
        const spy = vi.spyOn(element, 'dispatchEvent');
        
        const event = { target: { value: 'gs1' } } as any;
        (element as any)._valueChanged(event);
        expect(spy).not.toHaveBeenCalled();
    });

    test('render returns empty template if hass or config is missing', async () => {
        const el = await fixture<GrowspaceAiInsightCardEditor>(html`<growspace-ai-insight-card-editor></growspace-ai-insight-card-editor>`);
        
        el.hass = undefined as any;
        (el as any)._config = undefined;
        await el.updateComplete;
        expect(el.shadowRoot?.innerHTML).toContain('<!---->');

        el.hass = element.hass;
        (el as any)._config = undefined;
        await el.updateComplete;
        expect(el.shadowRoot?.innerHTML).toContain('<!---->');

        el.hass = undefined as any;
        (el as any)._config = { type: 'test' };
        await el.updateComplete;
        expect(el.shadowRoot?.innerHTML).toContain('<!---->');
    });

    test('firstUpdated calls _loadGrowspaces', async () => {
        const el = new GrowspaceAiInsightCardEditor();
        const spy = vi.spyOn(el as any, '_loadGrowspaces');
        el.hass = element.hass;
        
        // Use document.createElement to avoid fixture rendering immediately
        const div = document.createElement('div');
        div.appendChild(el);
        document.body.appendChild(div);
        
        await el.updateComplete;
        expect(spy).toHaveBeenCalled();
        document.body.removeChild(div);
    });
});
