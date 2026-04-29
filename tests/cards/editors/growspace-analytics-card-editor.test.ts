import { expect, test, describe, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';

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
                        growspaces: {
                            'all': 'All Growspaces',
                            'gs1': 'Test Tent',
                            'gs2': 'Another Tent',
                        }
                    }
                }
            },
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(vi.fn()),
            },
        } as any;
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAnalyticsCardEditor);
    });

    test('setConfig stores config', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        expect((element as any)._config).toEqual(config);
    });

    test('loads configured value on setConfig via _default_growspace getter', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        expect((element as any)._config.default_growspace).toBe('gs1');
    });

    test('loads growspaces from object format via controller', () => {
        element.updated(new Map([['hass', null]]));
        const controller = (element as any)._gsController;
        expect(controller.options.length).toBe(3);
        expect(controller.options[0]).toEqual({ id: 'all', name: 'All Growspaces' });
        expect(controller.options[1]).toEqual({ id: 'gs1', name: 'Test Tent' });
    });

    test('dispatches config-changed event via _valueChanged', () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
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

    test('_valueChanged does nothing if config is undefined', () => {
        (element as any)._config = undefined;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('_valueChanged does nothing if hass is undefined', () => {
        element.setConfig({ type: 'custom:growspace-analytics-card' });
        element.hass = undefined as any;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('controller sets empty options when hass has no sensor', () => {
        element.hass = {
            states: {},
            connection: { subscribeEvents: vi.fn().mockResolvedValue(vi.fn()) },
        } as any;
        element.updated(new Map([['hass', null]]));
        expect((element as any)._gsController.options).toEqual([]);
    });

    test('controller sets empty options when sensor attributes missing growspaces', () => {
        element.hass = {
            states: {
                'sensor.growspaces_list': { attributes: {} }
            },
            connection: { subscribeEvents: vi.fn().mockResolvedValue(vi.fn()) },
        } as any;
        element.updated(new Map([['hass', null]]));
        expect((element as any)._gsController.options).toEqual([]);
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

    test('renders form when hass and config are provided', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
            default_growspace: 'gs1',
        };
        const el = await fixture<GrowspaceAnalyticsCardEditor>(html`
            <growspace-analytics-card-editor></growspace-analytics-card-editor>
        `);
        el.hass = element.hass;
        el.setConfig(config);
        await el.updateComplete;
        
        const form = el.shadowRoot?.querySelector('ha-form');
        expect(form).not.toBeNull();
    });

    test('render returns empty template when hass is missing', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-analytics-card',
        };
        const el = await fixture<GrowspaceAnalyticsCardEditor>(html`
            <growspace-analytics-card-editor></growspace-analytics-card-editor>
        `);
        el.setConfig(config);
        el.hass = undefined as any;
        await el.updateComplete;
        
        expect(el.shadowRoot?.innerHTML).toContain('<!---->');
    });

    test('render returns empty template when config is missing', async () => {
        const el = await fixture<GrowspaceAnalyticsCardEditor>(html`
            <growspace-analytics-card-editor></growspace-analytics-card-editor>
        `);
        el.hass = element.hass;
        await el.updateComplete;
        
        expect(el.shadowRoot?.innerHTML).toContain('<!---->');
    });

    test('_computeSchema returns correct schema structure', () => {
        (element as any).updated(new Map([['hass', null]]));
        const schema = (element as any)._computeSchema();
        expect(schema).toBeDefined();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema[0].name).toBe('default_growspace');
        expect(schema[0].selector.select.options.length).toBe(4); // 1 default + 3 from mock
        expect(schema[0].selector.select.options[0].label).toBe('Select a growspace...');
        expect(schema[0].selector.select.options[1].value).toBe('all');
    });
});
