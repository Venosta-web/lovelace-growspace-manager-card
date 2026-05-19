import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/dialogs/subarea-config-dialog';
import { SubareaConfigDialog } from '../../../src/dialogs/subarea-config-dialog';
import { DataService } from '../../../src/services/data-service';

// Mock DataService
vi.mock('../../../src/services/data-service', () => {
    return {
        DataService: class {
            updateSubarea = vi.fn();
        },
    };
});

describe('SubareaConfigDialog', () => {
    let element: SubareaConfigDialog;
    let mockHass: any;

    const mockSubarea = {
        id: 's1',
        name: 'Flower Room',
        environment_config: {
            temperature_sensors: ['sensor.t1'],
            humidity_sensors: ['sensor.h1'],
        }
    };

    beforeEach(async () => {
        mockHass = {
            states: {
                'sensor.t1': { attributes: { device_class: 'temperature' } },
                'sensor.t2': { attributes: { device_class: 'temperature' } },
                'sensor.h1': { attributes: { device_class: 'humidity' } },
                'fan.exhaust': { attributes: {} },
            },
            callService: vi.fn(),
            connection: {
                sendMessagePromise: vi.fn(),
            },
        };

        element = await fixture(html`
            <subarea-config-dialog
                .hass=${mockHass}
                .open=${true}
                .growspaceId=${'g1'}
                .subarea=${mockSubarea}
            ></subarea-config-dialog>
        `);
    });

    it('should render correctly when open', () => {
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeDefined();
        expect(element.shadowRoot?.textContent).toContain('Configure Subarea');
        expect(element.shadowRoot?.textContent).toContain('Flower Room');
    });

    it('should populate state from subarea on update', async () => {
        // Internal state check via chips
        const chips = element.shadowRoot?.querySelectorAll('.chip');
        const chipTexts = Array.from(chips || []).map(c => c.textContent?.trim().replace('×', '').trim());
        expect(chipTexts).toContain('sensor.t1');
        expect(chipTexts).toContain('sensor.h1');
    });

    it('should filter entities correctly', () => {
        // @ts-ignore - access private for testing
        const tempEntities = element._getEntities(['sensor'], 'temperature');
        expect(tempEntities).toContain('sensor.t1');
        expect(tempEntities).toContain('sensor.t2');
        expect(tempEntities).not.toContain('sensor.h1');
    });

    it('should add an entity via search input', async () => {
        const input = element.shadowRoot?.querySelector('.search-input-inner') as HTMLInputElement;
        input.value = 'sensor.t2';
        input.dispatchEvent(new Event('change'));
        await element.updateComplete;

        const chips = element.shadowRoot?.querySelectorAll('.chip');
        const chipTexts = Array.from(chips || []).map(c => c.textContent?.trim().replace('×', '').trim());
        expect(chipTexts).toContain('sensor.t2');
    });

    it('should remove an entity when clicking chip-remove', async () => {
        const removeBtn = element.shadowRoot?.querySelector('.chip-remove');
        removeBtn?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;

        const chips = element.shadowRoot?.querySelectorAll('.chip');
        const chipTexts = Array.from(chips || []).map(c => c.textContent?.trim().replace('×', '').trim());
        expect(chipTexts).not.toContain('sensor.t1');
    });

    it('should close on cancel click', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        
        const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Cancel');
        
        cancelBtn?.click();
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should save and dispatch event on success', async () => {
        const updatedSpy = vi.fn();
        element.addEventListener('subarea-updated', updatedSpy);
        
        const mockUpdatedSubarea = { ...mockSubarea, name: 'Updated' };
        const dataServiceMock = (element as any)._dataService;
        vi.spyOn(dataServiceMock, 'updateSubarea').mockResolvedValue(mockUpdatedSubarea);

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Save Configuration');
        
        saveBtn?.click();
        
        // Wait for async save
        await new Promise(r => setTimeout(r, 50));
        
        expect(dataServiceMock.updateSubarea).toHaveBeenCalledWith('g1', 's1', expect.any(Object));
        expect(updatedSpy).toHaveBeenCalledWith(expect.objectContaining({
            detail: { subarea: mockUpdatedSubarea }
        }));
    });

    it('should handle save error', async () => {
        const dataServiceMock = (element as any)._dataService;
        vi.spyOn(dataServiceMock, 'updateSubarea').mockRejectedValue(new Error('Save Failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Save Configuration');
        
        saveBtn?.click();
        
        await new Promise(r => setTimeout(r, 50));
        
        expect(element.shadowRoot?.textContent).toContain('Failed to save subarea configuration');
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should ignore duplicate or empty entities in search input', async () => {
        const input = element.shadowRoot?.querySelector('.search-input-inner') as HTMLInputElement;
        
        // Duplicate
        input.value = 'sensor.t1';
        input.dispatchEvent(new Event('change'));
        expect((element as any)._temperatureSensors).toHaveLength(1);

        // Empty
        input.value = '';
        input.dispatchEvent(new Event('change'));
        expect((element as any)._temperatureSensors).toHaveLength(1);
    });

    it('should initialize DataService lazily if missing during save', async () => {
        (element as any)._dataService = undefined;
        // Mock the constructor behavior if needed, but since it's mocked globally it should just work
        
        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Save Configuration');
        
        // We just want to see if it reaches the save logic without crashing
        saveBtn?.click();
        expect((element as any)._dataService).toBeDefined();
    });

    it('should update service instance when hass changes', async () => {
        const oldService = (element as any)._dataService;
        element.hass = { ...mockHass, new: true };
        await element.updateComplete;
        const newService = (element as any)._dataService;
        expect(newService).not.toBe(oldService);
    });

    it('should handle all sensor type change handlers', async () => {
        // Temperature (already tested, but let's do another)
        const inputs = element.shadowRoot?.querySelectorAll('.search-input-inner');
        
        // Let's just manually trigger some handlers to ensure they are covered
        // The previous test already covered the first one.
        // We can just iterate through them or target specific ones.
        
        // Humidity (index 1)
        const humidityInput = inputs?.[1] as HTMLInputElement;
        humidityInput.value = 'sensor.h2';
        humidityInput.dispatchEvent(new Event('change'));
        expect((element as any)._humiditySensors).toContain('sensor.h2');

        // VPD (index 2)
        const vpdInput = inputs?.[2] as HTMLInputElement;
        vpdInput.value = 'sensor.v1';
        vpdInput.dispatchEvent(new Event('change'));
        expect((element as any)._vpdSensors).toContain('sensor.v1');

        // Light (index 4)
        const lightInput = inputs?.[4] as HTMLInputElement;
        lightInput.value = 'light.l1';
        lightInput.dispatchEvent(new Event('change'));
        expect((element as any)._lightSensors).toContain('light.l1');
    });

    it('should handle camera entity changes', async () => {
        const inputs = element.shadowRoot?.querySelectorAll('.search-input-inner');
        const cameraInput = inputs?.[inputs.length - 1] as HTMLInputElement;
        cameraInput.value = 'camera.front';
        cameraInput.dispatchEvent(new Event('change'));
        expect((element as any)._cameraEntities).toContain('camera.front');
    });

    it('should show help tooltip', () => {
        const tooltip = element.shadowRoot?.querySelector('gs-help-tooltip');
        expect(tooltip).toBeDefined();
        expect(tooltip?.getAttribute('content')).toContain('Assign sensors and actuators');
    });

    it('should handle case where no subarea is provided', async () => {
        element.subarea = undefined;
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.textContent).not.toContain('Flower Room');
    });

    it('should handle all sensor type change handlers', async () => {
        // Temperature (already tested, but let's do another)
        const inputs = element.shadowRoot?.querySelectorAll('.search-input-inner');
        
        // Humidity (index 1)
        const humidityInput = inputs?.[1] as HTMLInputElement;
        humidityInput.value = 'sensor.h2';
        humidityInput.dispatchEvent(new Event('change'));
        expect((element as any)._humiditySensors).toContain('sensor.h2');

        // VPD (index 2)
        const vpdInput = inputs?.[2] as HTMLInputElement;
        vpdInput.value = 'sensor.v1';
        vpdInput.dispatchEvent(new Event('change'));
        expect((element as any)._vpdSensors).toContain('sensor.v1');

        // Substrate Temperature (index 3)
        const subTempInput = inputs?.[3] as HTMLInputElement;
        subTempInput.value = 'sensor.st1';
        subTempInput.dispatchEvent(new Event('change'));
        expect((element as any)._substrateTemperatureSensors).toContain('sensor.st1');

        // Light (index 4)
        const lightInput = inputs?.[4] as HTMLInputElement;
        lightInput.value = 'light.l1';
        lightInput.dispatchEvent(new Event('change'));
        expect((element as any)._lightSensors).toContain('light.l1');

        // Exhaust Fan (index 5)
        const exhaustInput = inputs?.[5] as HTMLInputElement;
        exhaustInput.value = 'fan.ex2';
        exhaustInput.dispatchEvent(new Event('change'));
        expect((element as any)._exhaustFanEntities).toContain('fan.ex2');

        // Circulation Fan (index 6)
        const circInput = inputs?.[6] as HTMLInputElement;
        circInput.value = 'fan.circ2';
        circInput.dispatchEvent(new Event('change'));
        expect((element as any)._circulationFanEntities).toContain('fan.circ2');

        // Humidifier (index 7)
        const humidifierInput = inputs?.[7] as HTMLInputElement;
        humidifierInput.value = 'humidifier.h1';
        humidifierInput.dispatchEvent(new Event('change'));
        expect((element as any)._humidifierEntities).toContain('humidifier.h1');

        // Dehumidifier (index 8)
        const dehumidifierInput = inputs?.[8] as HTMLInputElement;
        dehumidifierInput.value = 'dehumidifier.dh1';
        dehumidifierInput.dispatchEvent(new Event('change'));
        expect((element as any)._dehumidifierEntities).toContain('dehumidifier.dh1');
    });

    it('should remove entities for all fields when clicking chip-remove', async () => {
        element.subarea = {
            id: 's1',
            name: 'Flower Room',
            environment_config: {
                temperature_sensors: ['sensor.t1'],
                humidity_sensors: ['sensor.h1'],
                vpd_sensors: ['sensor.v1'],
                substrate_temperature_sensors: ['sensor.st1'],
                light_sensors: ['light.l1'],
                exhaust_fan_entities: ['fan.ex1'],
                circulation_fan_entities: ['fan.circ1'],
                humidifier_entities: ['humidifier.h1'],
                dehumidifier_entities: ['dehumidifier.dh1'],
                camera_entities: ['camera.c1'],
            }
        };
        await element.updateComplete;
        await element.updateComplete;

        const boxes = element.shadowRoot?.querySelectorAll('.multi-select-box');
        expect(boxes).toBeDefined();
        
        // Remove substrate temperature chip (index 3)
        const subTempRemove = boxes?.[3]?.querySelector('.chip-remove');
        subTempRemove?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;
        await element.updateComplete;
        expect((element as any)._substrateTemperatureSensors).toEqual([]);

        // Remove exhaust fan chip (index 5)
        const exhaustRemove = boxes?.[5]?.querySelector('.chip-remove');
        exhaustRemove?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;
        expect((element as any)._exhaustFanEntities).toEqual([]);

        // Remove circulation fan chip (index 6)
        const circRemove = boxes?.[6]?.querySelector('.chip-remove');
        circRemove?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;
        expect((element as any)._circulationFanEntities).toEqual([]);

        // Remove humidifier chip (index 7)
        const humidifierRemove = boxes?.[7]?.querySelector('.chip-remove');
        humidifierRemove?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;
        expect((element as any)._humidifierEntities).toEqual([]);

        // Remove dehumidifier chip (index 8)
        const dehumidifierRemove = boxes?.[8]?.querySelector('.chip-remove');
        dehumidifierRemove?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;
        expect((element as any)._dehumidifierEntities).toEqual([]);

        // Remove camera chip (index 9)
        const cameraRemove = boxes?.[9]?.querySelector('.chip-remove');
        cameraRemove?.dispatchEvent(new MouseEvent('click'));
        await element.updateComplete;
        expect((element as any)._cameraEntities).toEqual([]);
    });

    it('should default missing environment config fields to empty arrays', async () => {
        element.subarea = {
            id: 's2',
            name: 'Empty Room',
            environment_config: {}
        };
        await element.updateComplete;
        
        expect((element as any)._temperatureSensors).toEqual([]);
        expect((element as any)._humiditySensors).toEqual([]);
        expect((element as any)._vpdSensors).toEqual([]);
        expect((element as any)._lightSensors).toEqual([]);
        expect((element as any)._exhaustFanEntities).toEqual([]);
        expect((element as any)._circulationFanEntities).toEqual([]);
        expect((element as any)._humidifierEntities).toEqual([]);
        expect((element as any)._dehumidifierEntities).toEqual([]);
        expect((element as any)._substrateTemperatureSensors).toEqual([]);
        expect((element as any)._cameraEntities).toEqual([]);
    });

    it('should handle getEntities edge cases', () => {
        const oldHass = element.hass;
        (element as any).hass = undefined;
        // @ts-ignore
        expect(element._getEntities(['sensor'], 'temperature')).toEqual([]);

        (element as any).hass = { states: undefined } as any;
        // @ts-ignore
        expect(element._getEntities(['sensor'], 'temperature')).toEqual([]);

        (element as any).hass = {
            states: {
                'sensor.missing': undefined
            }
        } as any;
        // @ts-ignore
        expect(element._getEntities(['sensor'], 'temperature')).toEqual([]);

        element.hass = oldHass;
    });

    it('should not render anything when open is false', async () => {
        element.open = false;
        await element.updateComplete;
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeNull();
    });

    it('should return early in _save when subarea or growspaceId is missing', async () => {
        const dataServiceMock = (element as any)._dataService;
        const updateSpy = vi.spyOn(dataServiceMock, 'updateSubarea');

        const oldSubarea = element.subarea;
        element.subarea = undefined;
        // @ts-ignore
        await element._save();
        expect(updateSpy).not.toHaveBeenCalled();

        element.subarea = oldSubarea;
        element.growspaceId = '';
        // @ts-ignore
        await element._save();
        expect(updateSpy).not.toHaveBeenCalled();
    });
});
