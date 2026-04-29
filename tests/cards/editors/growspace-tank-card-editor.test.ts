import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import '../../../src/cards/editors/growspace-tank-card-editor';
import { GrowspaceTankCardEditor } from '../../../src/cards/editors/growspace-tank-card-editor';

describe('GrowspaceTankCardEditor', () => {
    let element: GrowspaceTankCardEditor;
    let mockHass: any;

    beforeEach(async () => {
        mockHass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: [
                            { id: 'gs1', name: 'Growroom 1' },
                            { id: 'gs2', name: 'Growroom 2' }
                        ]
                    }
                }
            },
            language: 'en',
        };

        element = new GrowspaceTankCardEditor();
        element.hass = mockHass;
        element.setConfig({
            type: 'custom:growspace-tank-card',
            default_growspace: 'gs1'
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceTankCardEditor);
    });

    test('_loadGrowspaces populates _sensorGrowspaces from array format', () => {
        (element as any)._loadGrowspaces();
        const opts = (element as any)._sensorGrowspaces as Array<{ id: string; name: string }>;
        expect(opts.length).toBe(2);
        expect(opts[0]).toEqual({ id: 'gs1', name: 'Growroom 1' });
        expect(opts[1]).toEqual({ id: 'gs2', name: 'Growroom 2' });
    });

    test('handles growspace change and dispatches config-changed via _valueChanged', () => {
        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        const newConfig = { type: 'custom:growspace-tank-card', default_growspace: 'gs2' };
        (element as any)._valueChanged({ detail: { value: newConfig } } as any);

        expect(configChangedSpy).toHaveBeenCalled();
        expect(configChangedSpy.mock.calls[0][0].detail.config.default_growspace).toBe('gs2');
    });

    test('does not dispatch event if _valueChanged guard prevents it (no config)', () => {
        (element as any)._config = undefined;
        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(configChangedSpy).not.toHaveBeenCalled();
    });

    test('handles missing growspaces list sensor', () => {
        element.hass = { ...mockHass, states: {} };
        (element as any)._loadGrowspaces();
        expect((element as any)._sensorGrowspaces).toEqual([]);
    });

    test('handles growspaces list as object format', () => {
        element.hass = {
            ...mockHass,
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: {
                            'gs3': 'Tent 3',
                            'gs4': 'Tent 4'
                        }
                    }
                }
            }
        };
        (element as any)._loadGrowspaces();
        const opts = (element as any)._sensorGrowspaces as Array<{ id: string; name: string }>;
        expect(opts.length).toBe(2);
        expect(opts[0]).toEqual({ id: 'gs3', name: 'Tent 3' });
        expect(opts[1]).toEqual({ id: 'gs4', name: 'Tent 4' });
    });

    test('handles uninitialized config in render', async () => {
        const div = document.createElement('div');
        div.appendChild(element);
        document.body.appendChild(div);
        (element as any)._config = undefined;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML.trim()).not.toContain('ha-form');
        document.body.removeChild(div);
    });

    test('updated() calls _loadGrowspaces when hass changes', () => {
        const spy = vi.spyOn(element as any, '_loadGrowspaces');
        element.updated(new Map([['hass', null]]));
        expect(spy).toHaveBeenCalled();
    });

    test('setConfig calls _loadGrowspaces', () => {
        const spy = vi.spyOn(element as any, '_loadGrowspaces');
        element.setConfig({ type: 'custom:growspace-tank-card', default_growspace: 'gs1' } as any);
        expect(spy).toHaveBeenCalled();
    });
});
