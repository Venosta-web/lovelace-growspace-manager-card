import { expect, test, describe, beforeEach, vi } from 'vitest';
import { GrowspaceCarouselCardEditor } from '../../../src/cards/editors/growspace-carousel-card-editor';
import type { GrowspaceCarouselCardConfig } from '../../../src/lib/types/config';

if (!customElements.get('growspace-carousel-card-editor')) {
    customElements.define('growspace-carousel-card-editor', GrowspaceCarouselCardEditor);
}

describe('GrowspaceCarouselCardEditor', () => {
    let element: GrowspaceCarouselCardEditor;
    let capturedCallback: any;

    beforeEach(() => {
        capturedCallback = null;
        element = new GrowspaceCarouselCardEditor();
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
                subscribeEvents: vi.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return Promise.resolve(vi.fn());
                }),
            }
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceCarouselCardEditor);
    });

    test('setConfig stores config', () => {
        const config: GrowspaceCarouselCardConfig = {
            type: 'custom:growspace-carousel-card',
            growspaces: ['gs1'],
            interval: 10,
        };
        element.setConfig(config);
        expect((element as any)._config).toEqual(config);
    });

    test('renders nothing if no config set', async () => {
        // @ts-ignore
        element._config = undefined;
        const template = element.render();
        // Lit empty template
        expect(template.values).toEqual([]);
    });

    test('renders options based on sensor.growspaces_list via controller', () => {
        const config: GrowspaceCarouselCardConfig = {
            type: 'custom:growspace-carousel-card',
            growspaces: ['gs1'],
        };
        element.setConfig(config);
        element.updated(new Map([['hass', null]]));

        const controller = (element as any)._gsController;
        expect(controller.options.length).toBe(2);
        expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Test Tent' });
        expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Veg Room' });
    });

    test('computeSchema returns correct form structure', () => {
        element.updated(new Map([['hass', null]]));
        const schema = (element as any)._computeSchema();

        expect(schema).toHaveLength(3);
        expect(schema[0].name).toBe('growspaces');
        expect(schema[0].selector.select.multiple).toBe(true);
        expect(schema[0].selector.select.options).toHaveLength(2);
        expect(schema[0].selector.select.options[0]).toEqual({ label: 'Test Tent', value: 'gs1' });

        expect(schema[1].name).toBe('interval');
        expect(schema[1].selector.number.min).toBe(5);
        expect(schema[1].selector.number.max).toBe(300);
        expect(schema[1].selector.number.unit_of_measurement).toBe('seconds');

        expect(schema[2].name).toBe('filter_empty');
        expect(schema[2].selector).toHaveProperty('boolean');
    });

    test('dispatches config-changed event via _valueChanged', () => {
        const config: GrowspaceCarouselCardConfig = {
            type: 'custom:growspace-carousel-card',
            growspaces: [],
        };
        element.setConfig(config);

        const dispatchEventSpy = vi.spyOn(element, 'dispatchEvent');

        (element as any)._valueChanged({
            detail: { value: { ...config, growspaces: ['gs2'], interval: 15 } }
        } as any);

        expect(dispatchEventSpy).toHaveBeenCalled();
        const eventArg = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(eventArg.type).toBe('config-changed');
        expect(eventArg.detail.config.growspaces).toEqual(['gs2']);
        expect(eventArg.detail.config.interval).toBe(15);
    });

    test('valueChanged guard: no dispatch when config is undefined', () => {
        (element as any)._config = undefined;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('updated() calls controller.update when hass key is present', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.updated(new Map([['hass', null]]));
        expect(spy).toHaveBeenCalledWith(element.hass);
    });

    test('updated() does not call controller.update when hass not in changedProps', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.updated(new Map([['config', null]]));
        expect(spy).not.toHaveBeenCalled();
    });

    test('updated() does not call controller.update when hass is falsy', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.hass = undefined as any;
        element.updated(new Map([['hass', null]]));
        expect(spy).not.toHaveBeenCalled();
    });

    test('render returns template when config is present', () => {
        const config: GrowspaceCarouselCardConfig = {
            type: 'custom:growspace-carousel-card',
            growspaces: ['gs1'],
        };
        element.setConfig(config);
        const template = element.render();
        expect(template).toBeDefined();
        // Verify it contains ha-form
        expect(template.strings[0]).toContain('ha-form');
    });

    test('renders options when sensor uses new {name, total_plants} attribute format', () => {
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    entity_id: 'sensor.growspaces_list',
                    state: 'OK',
                    attributes: {
                        growspaces: {
                            'gs1': { name: 'Test Tent', total_plants: 2 },
                            'gs2': { name: 'Veg Room', total_plants: 0 },
                        }
                    }
                }
            },
            connection: { subscribeEvents: vi.fn().mockResolvedValue(vi.fn()) }
        } as any;
        element.updated(new Map([['hass', null]]));

        const controller = (element as any)._gsController;
        expect(controller.options).toHaveLength(2);
        expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Test Tent' });
        expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Veg Room' });
    });

    test('computeSchema handles empty options', () => {
        element.hass = {
            states: {},
            connection: { subscribeEvents: vi.fn().mockResolvedValue(vi.fn()) }
        } as any;
        element.updated(new Map([['hass', null]]));
        
        const schema = (element as any)._computeSchema();
        expect(schema[0].selector.select.options).toHaveLength(0);
    });

    test('static styles are defined', () => {
        expect(GrowspaceCarouselCardEditor.styles).toBeDefined();
        expect((GrowspaceCarouselCardEditor.styles as any).cssText).toContain('ha-form');
    });
});
