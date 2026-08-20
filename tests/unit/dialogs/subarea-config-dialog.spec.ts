import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../src/dialogs/subarea-config-dialog';
import { SubareaConfigDialog } from '../../../src/dialogs/subarea-config-dialog';
import { pickEntityIn, pickerOptions } from '../../harness/entity-picker';

/** The nth entity field in the dialog, in render order. */
function field(element: SubareaConfigDialog, index: number): Element {
    const fields = element.shadowRoot?.querySelectorAll('config-entity-multi-select') ?? [];
    const found = fields[index];
    if (!found) throw new Error(`No entity field at index ${index}`);
    return found;
}

/** Pick `entityId` in the nth entity field, the way the HA picker commits one. */
function pick(element: SubareaConfigDialog, index: number, entityId: string): void {
    const picker = field(element, index).shadowRoot?.querySelector('gm-entity-picker');
    if (!picker) throw new Error(`Entity field ${index} rendered no picker`);
    pickEntityIn(picker, entityId);
}

/** The entity ids the nth field offers. */
function options(element: SubareaConfigDialog, index: number): string[] {
    return pickerOptions(field(element, index).shadowRoot!);
}

/** Remove the first chip in the nth entity field. */
function removeFirstChip(element: SubareaConfigDialog, index: number): void {
    const remove = field(element, index).shadowRoot?.querySelector<HTMLButtonElement>('.chip-remove');
    if (!remove) throw new Error(`Entity field ${index} has no chip to remove`);
    remove.click();
}

// Mock the subarea slice so we can control updateSubarea behaviour
vi.mock('../../../src/slices/subarea', () => ({
    updateSubarea: vi.fn().mockResolvedValue(undefined),
    getSubareas: vi.fn().mockResolvedValue([]),
    addSubarea: vi.fn().mockResolvedValue({}),
    removeSubarea: vi.fn().mockResolvedValue(undefined),
    setSubareas: vi.fn(),
    subareas$: { get: vi.fn().mockReturnValue([]), set: vi.fn(), subscribe: vi.fn() },
}));

import * as subareaSlice from '../../../src/slices/subarea';

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
        vi.clearAllMocks();
        vi.mocked(subareaSlice.updateSubarea).mockResolvedValue(undefined);

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
        const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as any;
        expect(gsDialog).toBeDefined();
        expect(gsDialog?.heading).toBe('Configure Subarea');
        expect(gsDialog?.subtitle).toBe('Flower Room');
    });

    it('should populate state from subarea on update', async () => {
        expect(field(element, 0).shadowRoot?.querySelector('.chip-name')?.textContent).toBe('sensor.t1');
        expect(field(element, 1).shadowRoot?.querySelector('.chip-name')?.textContent).toBe('sensor.h1');
    });

    it('should pass its own filtered option source to the picker', async () => {
        // sensor.t2 is a free temperature sensor; sensor.t1 is already a chip and
        // sensor.h1 is the wrong device class.
        expect(options(element, 0)).toEqual(['sensor.t2']);
    });

    it('should ignore a pick that names no entity', async () => {
        pick(element, 0, '');
        expect((element as any)._temperatureSensors).toEqual(['sensor.t1']);
    });

    it('should filter entities correctly', () => {
        // @ts-ignore - access private for testing
        const tempEntities = element._getEntities(['sensor'], 'temperature');
        expect(tempEntities).toContain('sensor.t1');
        expect(tempEntities).toContain('sensor.t2');
        expect(tempEntities).not.toContain('sensor.h1');
    });

    it('should add an entity picked in the picker', async () => {
        pick(element, 0, 'sensor.t2');
        await element.updateComplete;

        expect((element as any)._temperatureSensors).toContain('sensor.t2');
    });

    it('should remove an entity when clicking chip-remove', async () => {
        removeFirstChip(element, 0);
        await element.updateComplete;

        expect((element as any)._temperatureSensors).toEqual([]);
    });

    it('should close on cancel click', () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Cancel');

        cancelBtn?.click();
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should save by calling updateSubarea and dispatch subarea-updated event', async () => {
        const updatedSpy = vi.fn();
        element.addEventListener('subarea-updated', updatedSpy);

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Save Configuration');

        saveBtn?.click();
        await new Promise(r => setTimeout(r, 50));

        expect(subareaSlice.updateSubarea).toHaveBeenCalledWith('g1', 's1', expect.any(Object));
        expect(updatedSpy).toHaveBeenCalled();
    });

    it('should handle save error', async () => {
        vi.mocked(subareaSlice.updateSubarea).mockRejectedValueOnce(new Error('Save Failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Save Configuration');

        saveBtn?.click();
        await new Promise(r => setTimeout(r, 50));
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Failed to save subarea configuration');
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not offer an entity that is already a chip', async () => {
        expect(options(element, 0)).not.toContain('sensor.t1');
    });

    it('should save a cleared field as an empty list, never an omitted key', async () => {
        removeFirstChip(element, 0);
        await element.updateComplete;

        const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.textContent?.trim() === 'Save Configuration');
        saveBtn?.click();
        await new Promise(r => setTimeout(r, 50));

        const config = vi.mocked(subareaSlice.updateSubarea).mock.calls[0][2] as Record<string, unknown>;
        expect(config).toHaveProperty('temperature_sensors');
        expect(config.temperature_sensors).toEqual([]);
    });

    it('should return early in _save when subarea or growspaceId is missing', async () => {
        const oldSubarea = element.subarea;
        element.subarea = undefined;
        // @ts-ignore
        await element._save();
        expect(subareaSlice.updateSubarea).not.toHaveBeenCalled();

        element.subarea = oldSubarea;
        element.growspaceId = '';
        // @ts-ignore
        await element._save();
        expect(subareaSlice.updateSubarea).not.toHaveBeenCalled();
    });

    it('should handle camera entity changes', async () => {
        pick(element, 9, 'camera.front');
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

    it.each([
        [1, '_humiditySensors', 'sensor.h2'],
        [2, '_vpdSensors', 'sensor.v1'],
        [3, '_substrateTemperatureSensors', 'sensor.st1'],
        [4, '_lightSensors', 'light.l1'],
        [5, '_exhaustFanEntities', 'fan.ex2'],
        [6, '_circulationFanEntities', 'fan.circ2'],
        [7, '_humidifierEntities', 'humidifier.h1'],
        [8, '_dehumidifierEntities', 'dehumidifier.dh1'],
    ] as [number, string, string][])('should route field %i to %s', (index, stateField, entityId) => {
        pick(element, index, entityId);
        expect((element as any)[stateField]).toContain(entityId);
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

        const fields: [number, string][] = [
            [3, '_substrateTemperatureSensors'],
            [5, '_exhaustFanEntities'],
            [6, '_circulationFanEntities'],
            [7, '_humidifierEntities'],
            [8, '_dehumidifierEntities'],
            [9, '_cameraEntities'],
        ];

        for (const [index, stateField] of fields) {
            removeFirstChip(element, index);
            await element.updateComplete;
            expect((element as any)[stateField]).toEqual([]);
        }
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
        const dialog = element.shadowRoot?.querySelector('gs-dialog');
        expect(dialog).toBeNull();
    });
});
