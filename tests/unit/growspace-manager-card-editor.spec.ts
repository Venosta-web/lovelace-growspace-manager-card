
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

        // We can't access private _config easily in TS without casting or using internal inspection,
        // but we can check if it renders.
        // Or access it via (element as any)._config
        expect((element as any)._config).toEqual(config);
    });

    it('should render nothing if no config set', async () => {
        // expect no form groups
        const formGroups = element.shadowRoot?.querySelectorAll('.form-group');
        expect(formGroups?.length).toBe(0);
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
                subscribeEvents: vi.fn()
            }
        };

        element.hass = mockHass;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        // Check dropdown options for Growspace
        const growspaceSelect = element.shadowRoot?.querySelectorAll('select')[1]; // Second select is usually growspace
        const options = growspaceSelect?.querySelectorAll('option');

        // first option is "Select a growspace"
        // then 'Tent A', 'Tent B'
        expect(options?.length).toBe(3);
        expect(options?.[1].value).toBe('Tent A');
        expect(options?.[2].value).toBe('Tent B');
    });

    it('should handle missing growspaces list', async () => {
        const mockHass = {
            states: {},
            connection: { subscribeEvents: vi.fn() }
        };
        element.hass = mockHass;
        element.setConfig({ type: 'custom:growspace-manager-card' });
        await element.updateComplete;

        const growspaceSelect = element.shadowRoot?.querySelectorAll('select')[1];
        const options = growspaceSelect?.querySelectorAll('option');

        // "Select a growspace" + "No growspaces found" (disabled)
        expect(options?.length).toBe(2);
        expect(options?.[1].disabled).toBe(true);
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

    it('should subscribe to sensor updates', async () => {
        const subscribeMock = vi.fn();
        const mockHass = {
            states: {},
            connection: { subscribeEvents: subscribeMock }
        };

        // First update with hass
        element.hass = mockHass;
        // setConfig also triggers updates but updated() handles hass changes
        element.requestUpdate();
        await element.updateComplete;

        expect(subscribeMock).toHaveBeenCalled();
    });

    it('should update growspaces on state_changed event', async () => {
        // Setup initial hass with no data
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

        // Verify initial state (empty)
        expect((element as any)._growspaceOptions).toEqual([]);

        // Simulate event
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
            expect((element as any)._growspaceOptions).toEqual(['Updated Tent']);
        } else {
            throw new Error('Subscription callback was not captured');
        }
    });
});
