import { expect, test, describe, beforeEach, vi } from 'vitest';
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

    test('loads growspaces from array format via _loadGrowspaces', () => {
        (element as any)._loadGrowspaces();
        const opts = (element as any)._sensorGrowspaces as Array<{ id: string; name: string }>;
        expect(opts.length).toBe(3);
        expect(opts[0]).toEqual({ id: 'all', name: 'All Growspaces' });
        expect(opts[1]).toEqual({ id: 'gs1', name: 'Test Tent' });
    });

    test('loads growspaces from object (record) format', () => {
        element.hass = {
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
        (element as any)._loadGrowspaces();
        const opts = (element as any)._sensorGrowspaces as Array<{ id: string; name: string }>;
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
                            { id: 'gs1' },
                            { id: 'gs2', name: '' }
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

    test('_valueChanged dispatches config-changed', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-ai-insight-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        const spy = vi.spyOn(element, 'dispatchEvent');

        (element as any)._valueChanged({
            detail: { value: { ...config, default_growspace: 'gs2' } }
        } as any);

        expect(spy).toHaveBeenCalled();
        const eventArg = spy.mock.calls[0][0] as CustomEvent;
        expect(eventArg.type).toBe('config-changed');
        expect(eventArg.detail.config.default_growspace).toBe('gs2');
    });

    test('_valueChanged guard: no dispatch when config is undefined', () => {
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._config = undefined;
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('_valueChanged guard: no dispatch when hass is undefined', () => {
        element.setConfig({ type: 'custom:growspace-ai-insight-card' });
        element.hass = undefined as any;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('render returns empty template if hass or config is missing', async () => {
        const div = document.createElement('div');
        document.body.appendChild(div);
        div.appendChild(element);
        await element.updateComplete;

        // Config not set, should render empty
        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
        document.body.removeChild(div);
    });

    test('firstUpdated calls _loadGrowspaces', async () => {
        const spy = vi.spyOn(element as any, '_loadGrowspaces');
        const div = document.createElement('div');
        div.appendChild(element);
        document.body.appendChild(div);
        await element.updateComplete;
        expect(spy).toHaveBeenCalled();
        document.body.removeChild(div);
    });
});
