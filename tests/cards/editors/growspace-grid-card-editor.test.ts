import { expect, test, describe, beforeEach, vi } from 'vitest';
import { GrowspaceGridCardEditor } from '../../../src/cards/editors/growspace-grid-card-editor';
import type { GrowspaceManagerCardConfig } from '../../../src/lib/types/config';

if (!customElements.get('growspace-grid-card-editor')) {
    customElements.define('growspace-grid-card-editor', GrowspaceGridCardEditor);
}

describe('GrowspaceGridCardEditor', () => {
    let element: GrowspaceGridCardEditor;

    let capturedCallback: any;
    beforeEach(() => {
        capturedCallback = null;
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
                subscribeEvents: vi.fn().mockImplementation((callback) => {
                    capturedCallback = callback;
                    return Promise.resolve(vi.fn());
                }),
            }
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceGridCardEditor);
    });

    test('setConfig stores config', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        expect((element as any)._config).toEqual(config);
    });

    test('renders options based on sensor.growspaces_list via controller', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        (element as any).willUpdate(new Map([['hass', null]]));

        const controller = (element as any)._gsController;
        expect(controller.options.length).toBe(2);
        expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Test Tent' });
        expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Veg Room' });
    });

    test('handles missing hass gracefully', () => {
        element.hass = undefined as any;
        expect(() => {
            element.setConfig({ type: 'custom:growspace-grid-card' });
        }).not.toThrow();
    });

    test('dispatches config-changed event via _valueChanged', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: '',
        };
        element.setConfig(config);

        const dispatchEventSpy = vi.spyOn(element, 'dispatchEvent');

        (element as any)._valueChanged({
            detail: { value: { ...config, default_growspace: 'gs2' } }
        } as any);

        expect(dispatchEventSpy).toHaveBeenCalled();
        const eventArg = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
        expect(eventArg.type).toBe('config-changed');
        expect(eventArg.detail.config.default_growspace).toBe('gs2');
    });

    test('handles sensor update events via subscription callback', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        (element as any).willUpdate(new Map([['hass', null]]));

        expect(capturedCallback).toBeDefined();

        // Matching entity_id
        capturedCallback({
            data: {
                new_state: {
                    entity_id: 'sensor.growspaces_list',
                    attributes: {
                        growspaces: { 'gs3': 'Update' }
                    }
                }
            }
        });

        const controller = (element as any)._gsController;
        expect(controller.options).toEqual([{ id: 'gs3', name: 'Update' }]);
    });

    test('handles sensor update events with missing growspaces', async () => {
        element.setConfig({ type: 'custom:growspace-grid-card' });
        (element as any).willUpdate(new Map([['hass', null]]));

        capturedCallback({
            data: {
                new_state: {
                    entity_id: 'sensor.growspaces_list',
                    attributes: {}
                }
            }
        });

        const controller = (element as any)._gsController;
        expect(controller.options).toEqual([]);
    });

    test('ignores events for other entities', async () => {
        element.setConfig({ type: 'custom:growspace-grid-card' });
        (element as any).willUpdate(new Map([['hass', null]]));

        const controller = (element as any)._gsController;
        const initialOptions = [...controller.options];

        capturedCallback({
            data: {
                new_state: {
                    entity_id: 'sensor.other_sensor',
                    attributes: { growspaces: { 'fail': 'fail' } }
                }
            }
        });

        expect(controller.options).toEqual(initialOptions);
    });

    test('valueChanged guard: no dispatch when config is undefined', () => {
        (element as any)._config = undefined;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('willUpdate() calls controller.update when hass key is present', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        (element as any).willUpdate(new Map([['hass', null]]));
        expect(spy).toHaveBeenCalledWith(element.hass);
    });

    test('willUpdate() does not call controller.update when hass not in changedProps', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        (element as any).willUpdate(new Map([['config', null]]));
        expect(spy).not.toHaveBeenCalled();
    });

    test('willUpdate() does not call controller.update when hass is falsy', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.hass = undefined as any;
        (element as any).willUpdate(new Map([['hass', null]]));
        expect(spy).not.toHaveBeenCalled();
    });

    test('controller sets empty options when sensor has no growspaces', () => {
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    entity_id: 'sensor.growspaces_list',
                    state: 'OK',
                    attributes: {},
                },
            },
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(vi.fn()),
            },
        } as any;
        (element as any).willUpdate(new Map([['hass', null]]));
        expect((element as any)._gsController.options).toEqual([]);
    });

    test('controller sets empty options when sensor not found', () => {
        element.hass = {
            states: {},
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(vi.fn()),
            },
        } as any;
        (element as any).willUpdate(new Map([['hass', null]]));
        expect((element as any)._gsController.options).toEqual([]);
    });

    test('_computeSchema returns options from controller', () => {
        (element as any).willUpdate(new Map([['hass', null]]));
        const schema = (element as any)._computeSchema();
        const growspaceField = schema.find((f: any) => f.name === 'default_growspace');
        expect(growspaceField.selector.select.options).toContainEqual({ label: 'Select a growspace...', value: '' });
        expect(growspaceField.selector.select.options).toContainEqual({ label: 'Test Tent', value: 'gs1' });
        expect(growspaceField.selector.select.options).toContainEqual({ label: 'Veg Room', value: 'gs2' });
    });

    test('render returns empty template if config is missing', () => {
        (element as any)._config = undefined;
        const result = element.render();
        expect(result.values).toEqual([]);
    });

    test('render returns full template if config is present', () => {
        element.setConfig({ type: 'custom:growspace-grid-card' });
        const result = element.render();
        expect(result).toBeTruthy();
        // result is a TemplateResult, check strings for ha-form
        expect(result.strings[0]).toContain('ha-form');
    });
});
