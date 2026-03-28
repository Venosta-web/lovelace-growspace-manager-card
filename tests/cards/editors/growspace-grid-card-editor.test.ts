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

    test('handles disconnectedCallback (Line 30-31)', () => {
        (element as any)._hasSubscription = true;
        element.disconnectedCallback();
        expect((element as any)._hasSubscription).toBe(false);
    });

    test('handles missing growspace sensor attribute (Line 70)', () => {
        element.hass.states['sensor.growspaces_list'].attributes.growspaces = undefined;
        (element as any)._loadGrowspaces();
        expect((element as any)._growspaceOptions).toEqual([]);
    });

    test('handles sensor update events (Lines 41-49)', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
            default_growspace: 'gs1',
        };
        element.setConfig(config);
        element.updated(new Map([['hass', null]]));

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
        expect((element as any)._growspaceOptions).toEqual([{ id: 'gs3', name: 'Update' }]);
    });

    test('handles sensor update events with missing growspaces (Line 51)', async () => {
        element.setConfig({ type: 'custom:growspace-grid-card' });
        element.updated(new Map([['hass', null]]));

        // Missing attributes.growspaces
        capturedCallback({
            data: {
                new_state: {
                    entity_id: 'sensor.growspaces_list',
                    attributes: {}
                }
            }
        });
        expect((element as any)._growspaceOptions).toEqual([]);
    });

    test('ignores events for other entities', async () => {
        element.setConfig({ type: 'custom:growspace-grid-card' });
        element.updated(new Map([['hass', null]]));
        
        const initialCount = (element as any)._growspaceOptions.length;

        capturedCallback({
            data: {
                new_state: {
                    entity_id: 'sensor.other_sensor',
                    attributes: { growspaces: { 'fail': 'fail' } }
                }
            }
        });
        expect((element as any)._growspaceOptions.length).toBe(initialCount);
    });

    test('subscription guard (Line 35)', async () => {
        // Test already subscribed
        (element as any)._hasSubscription = true;
        const spy = vi.spyOn((element as any)._subscriptionController, 'subscribeEvents');
        await (element as any)._subscribeToSensorUpdates();
        expect(spy).not.toHaveBeenCalled();

        // Test no hass
        (element as any)._hasSubscription = false;
        element.hass = undefined as any;
        await (element as any)._subscribeToSensorUpdates();
        expect(spy).not.toHaveBeenCalled();
    });

    test('valueChanged guard (Line 135)', () => {
        (element as any)._config = undefined;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged('key', 'val');
        expect(spy).not.toHaveBeenCalled();
    });

    test('template default value (Line 120)', async () => {
        const config: GrowspaceManagerCardConfig = {
            type: 'custom:growspace-grid-card',
        }; // default_growspace is missing
        const el = await fixture<GrowspaceGridCardEditor>(html`<growspace-grid-card-editor></growspace-grid-card-editor>`);
        el.hass = element.hass;
        el.setConfig(config);
        await el.updateComplete;
        
        const select = el.shadowRoot?.querySelector('select');
        expect(select?.value).toBe('');
    });

    test('updated() does not call _loadGrowspaces when hass not in changedProps', () => {
        const spy = vi.spyOn(element as any, '_loadGrowspaces');
        element.updated(new Map([['config', null]])); // 'hass' key absent
        expect(spy).not.toHaveBeenCalled();
    });

    test('updated() does not call _loadGrowspaces when hass is falsy', () => {
        const spy = vi.spyOn(element as any, '_loadGrowspaces');
        element.hass = undefined as any;
        element.updated(new Map([['hass', null]])); // hass key present but this.hass is falsy
        expect(spy).not.toHaveBeenCalled();
    });

    test('_loadGrowspaces sets empty options when sensor has no growspaces', () => {
        element.hass = {
            states: {
                'sensor.growspaces_list': {
                    entity_id: 'sensor.growspaces_list',
                    state: 'OK',
                    attributes: {}, // no growspaces attribute
                },
            },
        } as any;
        (element as any)._loadGrowspaces();
        expect((element as any)._growspaceOptions).toEqual([]);
    });

    test('_loadGrowspaces sets empty options when sensor not found', () => {
        element.hass = { states: {} } as any;
        (element as any)._loadGrowspaces();
        expect((element as any)._growspaceOptions).toEqual([]);
    });
});
