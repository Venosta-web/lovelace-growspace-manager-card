import { fixture, html } from '@open-wc/testing-helpers';
import { expect, test, describe, beforeEach, vi, afterEach } from 'vitest';
import '../../../src/cards/editors/growspace-subarea-card-editor';
import { GrowspaceSubareaCardEditor } from '../../../src/cards/editors/growspace-subarea-card-editor';
import { DataService } from '../../../src/services/data-service';

// Mock DataService
vi.mock('../../../src/services/data-service', () => {
    return {
        DataService: class {
            updateHass = vi.fn();
            getSubareas = vi.fn().mockResolvedValue([
                { id: 'sa1', name: 'Veg Area' },
                { id: 'sa2', name: 'Flower Area' }
            ]);
        },
    };
});

describe('GrowspaceSubareaCardEditor', () => {
    let element: GrowspaceSubareaCardEditor;
    let mockHass: any;

    beforeEach(async () => {
        mockHass = {
            states: {
                'sensor.growspaces_list': {
                    attributes: {
                        growspaces: {
                            'gs1': 'Tent 1',
                            'gs2': 'Tent 2',
                        }
                    }
                }
            },
            callService: vi.fn(),
            connection: {
                sendMessagePromise: vi.fn(),
                subscribeEvents: vi.fn().mockResolvedValue(vi.fn()),
            },
            language: 'en',
        };

        element = new GrowspaceSubareaCardEditor();
        element.hass = mockHass;
        element.setConfig({
            type: 'custom:growspace-subarea-card'
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('is defined', () => {
        expect(element).toBeInstanceOf(GrowspaceSubareaCardEditor);
    });

    test('setConfig updates config and loads subareas when growspace_id set', async () => {
        const config = {
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        };

        const loadSubareasSpy = vi.spyOn(element as any, '_loadSubareas');
        element.setConfig(config as any);

        expect((element as any)._config).toEqual(config);
        expect(loadSubareasSpy).toHaveBeenCalledWith('gs1');
    });

    test('loads growspaces via controller after updated(hass)', () => {
        element.updated(new Map([['hass', null]]));
        const controller = (element as any)._gsController;
        expect(controller.options.length).toBe(2);
        expect(controller.options[0]).toEqual({ id: 'gs1', name: 'Tent 1' });
        expect(controller.options[1]).toEqual({ id: 'gs2', name: 'Tent 2' });
    });

    test('handles growspace change via _valueChanged', () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1'
        } as any);

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        (element as any)._valueChanged({
            detail: {
                value: {
                    type: 'custom:growspace-subarea-card',
                    growspace_id: 'gs2',
                    subarea_id: 'sa1'
                }
            }
        } as any);

        expect(configChangedSpy).toHaveBeenCalled();
        const detail = configChangedSpy.mock.calls[0][0].detail;
        expect(detail.config.growspace_id).toBe('gs2');
        expect(detail.config.subarea_id).toBe('');
    });

    test('handles subarea change via _valueChanged (same growspace)', () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        (element as any)._valueChanged({
            detail: {
                value: {
                    type: 'custom:growspace-subarea-card',
                    growspace_id: 'gs1',
                    subarea_id: 'sa2'
                }
            }
        } as any);

        expect(configChangedSpy).toHaveBeenCalled();
        expect(configChangedSpy.mock.calls[0][0].detail.config.subarea_id).toBe('sa2');
    });

    test('handles missing growspaces list entity - controller options empty', () => {
        element.hass = { ...mockHass, states: {} };
        element.updated(new Map([['hass', null]]));
        expect((element as any)._gsController.options).toEqual([]);
    });

    test('setConfig loads subareas when growspace_id is set', async () => {
        const loadSubareasSpy = vi.spyOn(element as any, '_loadSubareas');

        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: ''
        } as any);

        expect(loadSubareasSpy).toHaveBeenCalledWith('gs1');
    });

    test('_loadSubareas sets subareas from DataService', async () => {
        element.hass = mockHass;
        await (element as any)._loadSubareas('gs1');
        expect((element as any)._subareas.length).toBe(2);
        expect((element as any)._subareas[0].name).toBe('Veg Area');
    });

    test('_loadSubareas catches errors and sets empty subareas', async () => {
        const dataServiceMock = (element as any)._dataService || new DataService(mockHass);
        (element as any)._dataService = dataServiceMock;
        vi.spyOn(dataServiceMock, 'getSubareas').mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await (element as any)._loadSubareas('gs1');

        expect((element as any)._subareas).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('_valueChanged guard: does not dispatch when config is undefined', () => {
        (element as any)._config = undefined;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('_valueChanged guard: does not dispatch when hass is undefined', () => {
        element.setConfig({ type: 'custom:growspace-subarea-card' } as any);
        element.hass = undefined as any;
        const spy = vi.spyOn(element, 'dispatchEvent');
        (element as any)._valueChanged({ detail: { value: {} } } as any);
        expect(spy).not.toHaveBeenCalled();
    });

    test('updated: loads subareas when hass changes and growspace_id is set', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);

        const loadSubareasSpy = vi.spyOn(element as any, '_loadSubareas');
        element.hass = { ...mockHass };
        element.updated(new Map([['hass', null]]));

        expect(loadSubareasSpy).toHaveBeenCalledWith('gs1');
    });

    test('render returns empty template when hass or config missing', async () => {
        const el = await fixture<GrowspaceSubareaCardEditor>(html`
            <growspace-subarea-card-editor></growspace-subarea-card-editor>
        `);
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('.card-config')).toBeNull();
    });

    test('displays "No subareas found" when list is empty via _computeSchema', async () => {
        (element as any)._config = {
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1'
        };
        (element as any)._subareas = [];
        (element as any)._loadingSubareas = false;

        const schema = (element as any)._computeSchema();
        const subareaField = schema.find((s: any) => s.name === 'subarea_id');
        const firstOption = subareaField?.selector?.select?.options?.[0];
        expect(firstOption?.label).toBe('No subareas found');
    });

    test('displays "Select a growspace first" when no growspace selected via _computeSchema', () => {
        (element as any)._config = { type: 'custom:growspace-subarea-card', growspace_id: '' };
        (element as any)._subareas = [];
        (element as any)._loadingSubareas = false;

        const schema = (element as any)._computeSchema();
        const subareaField = schema.find((s: any) => s.name === 'subarea_id');
        const firstOption = subareaField?.selector?.select?.options?.[0];
        expect(firstOption?.label).toBe('Select a growspace first');
    });
});
