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
                        growspaces: [
                            { id: 'gs1', name: 'Tent 1' },
                            { id: 'gs2', name: 'Tent 2' }
                        ]
                    }
                }
            },
            callService: vi.fn(),
            connection: {
                sendMessagePromise: vi.fn(),
                subscribeEvents: vi.fn(),
            },
            language: 'en',
        };

        element = await fixture<GrowspaceSubareaCardEditor>(html`
            <growspace-subarea-card-editor .hass=${mockHass}></growspace-subarea-card-editor>
        `);
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

    test('setConfig updates config and loads data', async () => {
        const config = {
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        };
        
        // Spy on _loadSubareas
        const loadSubareasSpy = vi.spyOn(element as any, '_loadSubareas');
        
        element.setConfig(config as any);
        
        expect((element as any)._config).toEqual(config);
        expect(loadSubareasSpy).toHaveBeenCalledWith('gs1');
    });

    test('renders growspace dropdown correctly', async () => {
        await element.updateComplete;
        
        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        const options = Array.from(select.querySelectorAll('option'));
        
        expect(options.length).toBe(3); // placeholder + 2 growspaces
        expect(options[1].textContent?.trim()).toBe('Tent 1');
        expect(options[2].textContent?.trim()).toBe('Tent 2');
    });

    test('renders subareas dropdown after growspace selection', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1'
        } as any);
        
        await element.updateComplete;
        // Wait for subareas to load
        await new Promise(r => setTimeout(r, 10));
        await element.updateComplete;
        
        const selects = element.shadowRoot?.querySelectorAll('select');
        const subareaSelect = selects?.[1] as HTMLSelectElement;
        const options = Array.from(subareaSelect.querySelectorAll('option'));
        
        expect(options.length).toBe(3); // placeholder + 2 subareas
        expect(options[1].textContent?.trim()).toBe('Veg Area');
    });

    test('handles growspace change', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1'
        } as any);
        await element.updateComplete;

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);
        
        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        select.value = 'gs2';
        select.dispatchEvent(new Event('change'));
        
        expect(configChangedSpy).toHaveBeenCalled();
        expect(configChangedSpy.mock.calls[0][0].detail.config.growspace_id).toBe('gs2');
        expect(configChangedSpy.mock.calls[0][0].detail.config.subarea_id).toBe('');
    });

    test('handles subarea change', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);
        
        // Manual setup of subareas to avoid waiting for async load in this test
        (element as any)._subareas = [{ id: 'sa1', name: 'Veg' }, { id: 'sa2', name: 'Flower' }];
        (element as any)._loadingSubareas = false;
        await element.updateComplete;

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);
        
        const selects = element.shadowRoot?.querySelectorAll('select');
        const subareaSelect = selects?.[1] as HTMLSelectElement;
        subareaSelect.value = 'sa2';
        subareaSelect.dispatchEvent(new Event('change'));
        
        expect(configChangedSpy).toHaveBeenCalled();
        expect(configChangedSpy.mock.calls[0][0].detail.config.subarea_id).toBe('sa2');
    });

    test('handles missing growspaces list entity', async () => {
        element.hass = { ...mockHass, states: {} };
        await element.updateComplete;
        await element.updateComplete;
        
        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        expect(select.querySelectorAll('option').length).toBe(1); // Only placeholder
    });

    test('handles growspaces list as object instead of array', async () => {
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
        await element.updateComplete;
        await element.updateComplete;
        
        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        const options = Array.from(select.querySelectorAll('option'));
        expect(options[1].textContent?.trim()).toBe('Tent 3');
    });

    test('handles loadSubareas error', async () => {
        const dataServiceMock = (element as any)._dataService || new DataService(mockHass);
        (element as any)._dataService = dataServiceMock;
        vi.spyOn(dataServiceMock, 'getSubareas').mockRejectedValue(new Error('API Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        await (element as any)._loadSubareas('gs1');
        
        expect((element as any)._subareas).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test('updated: loads subareas when hass changes and growspace_id is set', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);
        await element.updateComplete;

        const loadSubareasSpy = vi.spyOn(element as any, '_loadSubareas');
        // Changing hass triggers updated() with changedProps.has('hass')
        element.hass = { ...mockHass };
        await element.updateComplete;

        expect(loadSubareasSpy).toHaveBeenCalledWith('gs1');
    });

    test('firstUpdated loads subareas when growspace_id is set and subareas empty', async () => {
        // Create a fresh element with config pre-set including growspace_id
        const freshElement = await fixture<GrowspaceSubareaCardEditor>(html`
            <growspace-subarea-card-editor .hass=${mockHass}></growspace-subarea-card-editor>
        `);

        // Set config with growspace_id before first update completes (simulate pre-config)
        (freshElement as any)._config = {
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: ''
        };
        (freshElement as any)._growspaces = [];
        (freshElement as any)._subareas = [];

        const loadSubareasSpy = vi.spyOn(freshElement as any, '_loadSubareas');
        await (freshElement as any).firstUpdated();

        expect(loadSubareasSpy).toHaveBeenCalledWith('gs1');
    });

    test('does not dispatch event when same growspace is selected again', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);
        await element.updateComplete;

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
        select.value = 'gs1'; // same value
        select.dispatchEvent(new Event('change'));

        expect(configChangedSpy).not.toHaveBeenCalled();
    });

    test('does not dispatch event when same subarea is selected again', async () => {
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1',
            subarea_id: 'sa1'
        } as any);
        (element as any)._subareas = [{ id: 'sa1', name: 'Veg' }];
        (element as any)._loadingSubareas = false;
        await element.updateComplete;

        const configChangedSpy = vi.fn();
        element.addEventListener('config-changed', configChangedSpy);

        const selects = element.shadowRoot?.querySelectorAll('select');
        const subareaSelect = selects?.[1] as HTMLSelectElement;
        subareaSelect.value = 'sa1'; // same value
        subareaSelect.dispatchEvent(new Event('change'));

        expect(configChangedSpy).not.toHaveBeenCalled();
    });

    test('renders empty when hass or config is missing', async () => {
        const emptyElement = await fixture<GrowspaceSubareaCardEditor>(html`
            <growspace-subarea-card-editor></growspace-subarea-card-editor>
        `);
        await emptyElement.updateComplete;
        expect(emptyElement.shadowRoot?.querySelector('.card-config')).toBeNull();
    });

    test('shows loading-text while subareas are loading', async () => {
        element.setConfig({ type: 'custom:growspace-subarea-card', growspace_id: 'gs1' } as any);
        (element as any)._loadingSubareas = true;
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.loading-text')?.textContent?.trim()).toBe('Loading subareas...');
    });

    test('displays "Select a growspace first" when no growspace selected', async () => {
        element.setConfig({ type: 'custom:growspace-subarea-card', growspace_id: '' } as any);
        (element as any)._loadingSubareas = false;
        await element.updateComplete;

        const selects = element.shadowRoot?.querySelectorAll('select');
        const subareaSelect = selects?.[1] as HTMLSelectElement;
        expect(subareaSelect?.querySelector('option')?.textContent?.trim()).toBe('Select a growspace first');
        expect(subareaSelect?.disabled).toBe(true);
    });

    test('displays "No subareas found" when list is empty', async () => {
        const dataServiceMock = (element as any)._dataService || new DataService(mockHass);
        (element as any)._dataService = dataServiceMock;
        vi.spyOn(dataServiceMock, 'getSubareas').mockResolvedValue([]);
        
        element.setConfig({
            type: 'custom:growspace-subarea-card',
            growspace_id: 'gs1'
        } as any);
        
        await (element as any)._loadSubareas('gs1');
        await element.updateComplete;
        
        const selects = element.shadowRoot?.querySelectorAll('select');
        const subareaSelect = selects?.[1] as HTMLSelectElement;
        expect(subareaSelect.querySelector('option')?.textContent?.trim()).toBe('No subareas found');
    });
});
