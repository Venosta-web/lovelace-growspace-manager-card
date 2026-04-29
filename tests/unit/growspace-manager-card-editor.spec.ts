
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceManagerCardEditor } from '../../src/growspace-manager-card-editor';
import { GrowspaceManagerCardConfig } from '../../src/types';

describe('GrowspaceManagerCardEditor', () => {
    let element: GrowspaceManagerCardEditor;
    let container: HTMLElement;

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        element = new GrowspaceManagerCardEditor();
        container.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowspaceManagerCardEditor);
    });

    it('should set config correctly', async () => {
        const config: GrowspaceManagerCardConfig = { type: 'custom:growspace-manager-card' };
        element.setConfig(config);
        await element.updateComplete;

        expect((element as any)._config).toEqual(config);
    });

    it('should render nothing if no config set', async () => {
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
    });

    it('should load growspaces from HASS entity via controller', async () => {
        const mockHass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: { 'gs1': 'Tent A', 'gs2': 'Tent B' }
                    }
                }
            },
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(() => { })
            }
        };

        element.hass = mockHass as any;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        element.updated(new Map([['hass', null]]));

        const controller = (element as any)._gsController;
        expect(controller.options.length).toBe(2);
        expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Tent A' });
        expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Tent B' });
    });

    it('should handle missing growspaces list - controller returns empty options', async () => {
        const mockHass = {
            states: {},
            connection: { subscribeEvents: vi.fn().mockResolvedValue(() => { }) }
        };
        element.hass = mockHass as any;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        element.updated(new Map([['hass', null]]));

        const controller = (element as any)._gsController;
        expect(controller.options).toEqual([]);
    });

    it('should fire config-changed event on _valueChanged call', async () => {
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('config-changed', listener);

        (element as any)._valueChanged({
            detail: { value: { type: 'custom:growspace-manager-card', initial_view_mode: 'compact' } }
        } as any);

        expect(listener).toHaveBeenCalled();
        const eventDetail = listener.mock.calls[0][0].detail;
        expect(eventDetail.config.initial_view_mode).toBe('compact');
    });

    it('should fire config-changed event on default growspace change', async () => {
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('config-changed', listener);

        (element as any)._valueChanged({
            detail: { value: { type: 'custom:growspace-manager-card', default_growspace: 'gs1' } }
        } as any);

        expect(listener).toHaveBeenCalled();
        const eventDetail = listener.mock.calls[0][0].detail;
        expect(eventDetail.config.default_growspace).toBe('gs1');
    });

    it('should update growspaces on state_changed event via subscription', async () => {
        let subscriptionCallback: Function | undefined;
        const subscribeMock = vi.fn((cb) => {
            subscriptionCallback = cb;
            return Promise.resolve(() => { });
        });

        const mockHass = {
            states: {},
            connection: { subscribeEvents: subscribeMock }
        };

        element.hass = mockHass as any;
        element.setConfig({ type: 'test' });
        element.updated(new Map([['hass', null]]));
        await element.updateComplete;

        const controller = (element as any)._gsController;
        expect(controller.options).toEqual([]);

        if (subscriptionCallback) {
            subscriptionCallback({
                data: {
                    new_state: {
                        entity_id: 'sensor.growspaces_list',
                        attributes: { growspaces: { 'gs1': 'Updated Tent' } }
                    }
                }
            });
            await element.updateComplete;
            expect(controller.options).toEqual([{ id: 'gs1', name: 'Updated Tent' }]);
        } else {
            throw new Error('Subscription callback was not captured');
        }
    });

    it('should not dispatch config-changed if config is undefined', async () => {
        const listener = vi.fn();
        element.addEventListener('config-changed', listener);

        (element as any)._valueChanged({ detail: { value: {} } } as any);

        expect(listener).not.toHaveBeenCalled();
    });

    it('controller subscribes only once across multiple updated() calls', async () => {
        const subscribeMock = vi.fn().mockResolvedValue(() => { });
        const mockHass = {
            states: {},
            connection: { subscribeEvents: subscribeMock }
        };

        element.hass = mockHass as any;
        element.updated(new Map([['hass', null]]));
        element.updated(new Map([['hass', null]]));
        element.updated(new Map([['hass', null]]));

        expect(subscribeMock).toHaveBeenCalledTimes(1);
    });

    it('controller resets on hostDisconnected', async () => {
        const subscribeMock = vi.fn().mockResolvedValue(() => { });
        const mockHass = {
            states: {},
            connection: { subscribeEvents: subscribeMock }
        };

        element.hass = mockHass as any;
        element.updated(new Map([['hass', null]]));
        element.disconnectedCallback();
        element.updated(new Map([['hass', null]]));

        expect(subscribeMock).toHaveBeenCalledTimes(2);
    });

    it('updated() does not call controller.update when hass key is absent from changedProps', () => {
        element.hass = {
            states: {},
            connection: { subscribeEvents: vi.fn().mockResolvedValue(() => {}) }
        } as any;
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.updated(new Map([['config', null]]));
        expect(spy).not.toHaveBeenCalled();
    });

    it('updated() does not call controller.update when hass is falsy even if key is present', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.hass = undefined as any;
        element.updated(new Map([['hass', null]]));
        expect(spy).not.toHaveBeenCalled();
    });

    it('updated() calls controller.update when hass is present and key is in changedProps', () => {
        const spy = vi.spyOn((element as any)._gsController, 'update');
        element.hass = {
            states: { 'sensor.growspaces_list': { state: 'OK', attributes: { growspaces: {} } } },
            connection: { subscribeEvents: vi.fn().mockResolvedValue(() => {}) }
        } as any;
        element.updated(new Map([['hass', null]]));
        expect(spy).toHaveBeenCalled();
    });
});
