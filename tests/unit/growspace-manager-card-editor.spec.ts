
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
        const selects = element.shadowRoot?.querySelectorAll('select');
        expect(selects?.length).toBe(0);
    });

    it('should render inputs when config is set', async () => {
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const selects = element.shadowRoot?.querySelectorAll('select');
        expect(selects?.length).toBeGreaterThan(0);
    });

    it('should load growspaces from HASS entity attributes', async () => {
        const mockHass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: ['Tent A', 'Tent B']
                    }
                }
            },
            connection: {
                subscribeEvents: vi.fn().mockResolvedValue(() => { })
            }
        };

        element.hass = mockHass;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        // Check dropdown options for Growspace (second select)
        const selects = element.shadowRoot?.querySelectorAll('select');
        const growspaceSelect = selects?.[1];
        const options = growspaceSelect?.querySelectorAll('option');

        // "Select a growspace" + "Tent A" + "Tent B"
        expect(options?.length).toBe(3);

        expect(options?.[1].value).toBe('0');
        expect(options?.[1].textContent).toBe('Tent A');
        expect(options?.[2].value).toBe('1');
        expect(options?.[2].textContent).toBe('Tent B');
    });

    it('should handle missing growspaces list', async () => {
        const mockHass = {
            states: {},
            connection: { subscribeEvents: vi.fn().mockResolvedValue(() => { }) }
        };
        element.hass = mockHass;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const selects = element.shadowRoot?.querySelectorAll('select');
        const growspaceSelect = selects?.[1];
        const options = growspaceSelect?.querySelectorAll('option');

        // Only "Select a growspace"
        expect(options?.length).toBe(1);
    });

    it('should fire config-changed event on view mode change', async () => {
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('config-changed', listener);

        const viewModeSelect = element.shadowRoot?.querySelectorAll('select')[0];
        if (viewModeSelect) {
            viewModeSelect.value = 'compact';
            viewModeSelect.dispatchEvent(new Event('change'));
        }

        expect(listener).toHaveBeenCalled();
        const eventDetail = listener.mock.calls[0][0].detail;
        expect(eventDetail.config.initial_view_mode).toBe('compact');
    });

    it('should fire config-changed event on default growspace change', async () => {
        const mockHass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: { growspaces: ['Tent A', 'Tent B'] }
                }
            },
            connection: { subscribeEvents: vi.fn().mockResolvedValue(() => { }) }
        };

        element.hass = mockHass;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('config-changed', listener);

        const growspaceSelect = element.shadowRoot?.querySelectorAll('select')[1];
        if (growspaceSelect) {
            growspaceSelect.value = '1';
            growspaceSelect.dispatchEvent(new Event('change'));
        }

        expect(listener).toHaveBeenCalled();
        const eventDetail = listener.mock.calls[0][0].detail;
        expect(eventDetail.config.default_growspace).toBe('1');
    });

    it('should subscribe to sensor updates', async () => {
        const subscribeMock = vi.fn().mockResolvedValue(() => { });
        const mockHass = {
            states: {},
            connection: { subscribeEvents: subscribeMock }
        };

        element.hass = mockHass;
        element.requestUpdate();
        await element.updateComplete;

        expect(subscribeMock).toHaveBeenCalled();
    });

    it('should update growspaces on state_changed event', async () => {
        let subscriptionCallback: Function | undefined;
        const subscribeMock = vi.fn((cb) => {
            subscriptionCallback = cb;
            return () => { };
        });

        const mockHass = {
            states: {},
            connection: { subscribeEvents: subscribeMock }
        };

        element.hass = mockHass;
        element.setConfig({ type: 'test' });
        await element.updateComplete;

        expect((element as any)._growspaceOptions).toEqual([]);

        if (subscriptionCallback) {
            subscriptionCallback({
                data: {
                    new_state: {
                        entity_id: 'sensor.growspaces_list',
                        attributes: { growspaces: ['Updated Tent'] }
                    }
                }
            });
            await element.updateComplete;
            expect((element as any)._growspaceOptions).toEqual([{ id: '0', name: 'Updated Tent' }]);
        } else {
            throw new Error('Subscription callback was not captured');
        }
    });

    describe('Coverage Gap Fillers', () => {
        it('should not subscribe twice if already subscribed', async () => {
            const subscribeMock = vi.fn().mockResolvedValue(() => { });
            const mockHass = {
                states: {},
                connection: { subscribeEvents: subscribeMock }
            };

            element.hass = mockHass;
            await element.updateComplete;

            // First subscription
            expect(subscribeMock).toHaveBeenCalledTimes(1);

            // Trigger update again
            element.hass = { ...mockHass };
            await element.updateComplete;

            // Should still be 1 call due to _hasSubscription guard
            expect(subscribeMock).toHaveBeenCalledTimes(1);
        });

        it('should reset subscription flag on disconnectedCallback', async () => {
            const subscribeMock = vi.fn().mockResolvedValue(() => { });
            const mockHass = {
                states: {},
                connection: { subscribeEvents: subscribeMock }
            };

            element.hass = mockHass;
            await element.updateComplete;

            expect((element as any)._hasSubscription).toBe(true);

            element.disconnectedCallback();

            expect((element as any)._hasSubscription).toBe(false);
        });

        it('should handle state_changed event with no gsObj', async () => {
            let subscriptionCallback: Function | undefined;
            const subscribeMock = vi.fn((cb) => {
                subscriptionCallback = cb;
                return () => { };
            });

            const mockHass = {
                states: {},
                connection: { subscribeEvents: subscribeMock }
            };

            element.hass = mockHass;
            element.setConfig({ type: 'test' });
            await element.updateComplete;

            expect((element as any)._growspaceOptions).toEqual([]);

            // Fire event with missing growspaces attribute
            if (subscriptionCallback) {
                subscriptionCallback({
                    data: {
                        new_state: {
                            entity_id: 'sensor.growspaces_list',
                            attributes: {}
                        }
                    }
                });
                await element.updateComplete;
                expect((element as any)._growspaceOptions).toEqual([]);
            }
        });

        it('should ignore state_changed event for unrelated entities', async () => {
            let subscriptionCallback: Function | undefined;
            const subscribeMock = vi.fn((cb) => {
                subscriptionCallback = cb;
                return () => { };
            });

            const mockHass = {
                states: {},
                connection: { subscribeEvents: subscribeMock }
            };

            element.hass = mockHass;
            element.setConfig({ type: 'test' });
            await element.updateComplete;

            // Pre-populate to verify it doesn't get cleared
            (element as any)._growspaceOptions = [{ id: '0', name: 'Existing' }];

            if (subscriptionCallback) {
                // Fire event with different entity_id
                subscriptionCallback({
                    data: {
                        new_state: {
                            entity_id: 'sensor.something_else',
                            attributes: { growspaces: ['New Stuff'] }
                        }
                    }
                });
                await element.updateComplete;
                // Should remain unchanged
                expect((element as any)._growspaceOptions).toEqual([{ id: '0', name: 'Existing' }]);
            }
        });

        it('should not dispatch config-changed if config is undefined', async () => {
            const listener = vi.fn();
            element.addEventListener('config-changed', listener);

            // Call _valueChanged without config
            (element as any)._valueChanged('initial_view_mode', 'compact');

            expect(listener).not.toHaveBeenCalled();
        });

        it('should not subscribe if hass is undefined', async () => {
            const newElement = new GrowspaceManagerCardEditor();
            container.appendChild(newElement);
            await newElement.updateComplete;

            // _hasSubscription should remain false
            expect((newElement as any)._hasSubscription).toBe(false);
        });
    });
});
