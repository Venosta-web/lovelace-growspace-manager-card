import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { SensorGroupDialog } from '../../../src/dialogs/sensor-group-dialog';
import '../../../src/dialogs/sensor-group-dialog';
import { SensorGroup } from '../../../src/types';

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class MockHaDialog extends HTMLElement {
        open = false;
        heading = '';
        hideActions = false;
        scrimClickAction = '';
        escapeKeyAction = '';
    }
    customElements.define('ha-dialog', MockHaDialog);
}

// Mock other custom elements used in the dialog
['md3-text-input', 'md3-number-input', 'md3-button', 'ha-icon-button'].forEach(tag => {
    if (!customElements.get(tag)) {
        customElements.define(tag, class extends HTMLElement { });
    }
});

describe('SensorGroupDialog', () => {
    let element: SensorGroupDialog;
    const mockHass = {
        states: {
            'sensor.temp_1': { attributes: { device_class: 'temperature', friendly_name: 'Temp 1' } },
            'sensor.temp_2': { attributes: { device_class: 'temperature' } },
            'sensor.humid_1': { attributes: { device_class: 'humidity', friendly_name: 'Humid 1' } },
            'sensor.vpd_1': { attributes: { friendly_name: 'VPD 1' } },
            'sensor.other': { attributes: {} }
        }
    } as any;

    const mockSensorGroup: SensorGroup = {
        id: 'group_1',
        name: 'Test Group',
        x: 1,
        y: 2,
        z: 3,
        temperature_sensors: ['sensor.temp_1'],
        humidity_sensors: ['sensor.humid_1'],
        vpd_sensors: []
    };

    beforeEach(async () => {
        element = await fixture(html`<sensor-group-dialog></sensor-group-dialog>`);
        element.hass = mockHass;
        await element.updateComplete;
    });

    it('should show nothing when closed', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should render when open', async () => {
        element.open = true;
        await element.updateComplete;
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();
        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toBe('Add Group');
    });

    it('should update state when sensorGroup is set (Edit mode)', async () => {
        element.open = true;
        element.sensorGroup = mockSensorGroup;
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toBe('Edit Group');

        const nameInput = element.shadowRoot?.querySelector('md3-text-input') as any;
        expect(nameInput.value).toBe('Test Group');

        const numInputs = element.shadowRoot?.querySelectorAll('md3-number-input') as any;
        expect(numInputs[0].value).toBe(1); // X
        expect(numInputs[1].value).toBe(2); // Y
        expect(numInputs[2].value).toBe(3); // Z
    });

    it('should clear state when sensorGroup is removed', async () => {
        element.open = true;
        element.sensorGroup = mockSensorGroup;
        await element.updateComplete;

        element.sensorGroup = undefined;
        await element.updateComplete;

        const nameInput = element.shadowRoot?.querySelector('md3-text-input') as any;
        expect(nameInput).toBeTruthy();
        expect(nameInput.value).toBe('');
    });

    it('should handle name changes', async () => {
        element.open = true;
        await element.updateComplete;

        const nameInput = element.shadowRoot?.querySelector('md3-text-input') as any;
        nameInput.dispatchEvent(new CustomEvent('change', { detail: 'New Name' }));

        expect((element as any)._name).toBe('New Name');
    });

    it('should handle coordinate changes', async () => {
        element.open = true;
        await element.updateComplete;

        const numInputs = element.shadowRoot?.querySelectorAll('md3-number-input') as any;

        numInputs[0].dispatchEvent(new CustomEvent('change', { detail: '10.5' }));
        numInputs[1].dispatchEvent(new CustomEvent('change', { detail: '20.1' }));
        numInputs[2].dispatchEvent(new CustomEvent('change', { detail: '5.2' }));

        expect((element as any)._x).toBe(10.5);
        expect((element as any)._y).toBe(20.1);
        expect((element as any)._z).toBe(5.2);
    });

    it('should toggle sensors when checkboxes are clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const checkboxes = element.shadowRoot?.querySelectorAll('input[type="checkbox"]') as any;
        expect(checkboxes.length).toBeGreaterThan(0);

        // Toggle Temp 1
        checkboxes[0].click();
        await element.updateComplete;
        expect((element as any)._tempSensors).toContain('sensor.temp_1');

        // Toggle again to remove
        checkboxes[0].click();
        await element.updateComplete;
        expect((element as any)._tempSensors).not.toContain('sensor.temp_1');
    });

    it('should dispatch save-sensor-group event on save', async () => {
        const saveSpy = vi.fn();
        element.addEventListener('save-sensor-group', saveSpy);
        element.open = true;

        // Mock some state
        (element as any)._name = 'Saved Group';
        (element as any)._x = 5;
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('.md3-button.primary') as HTMLElement;
        saveBtn.click();

        expect(saveSpy).toHaveBeenCalled();
        const eventDetail = saveSpy.mock.calls[0][0].detail;
        expect(eventDetail.group.name).toBe('Saved Group');
        expect(eventDetail.group.x).toBe(5);
        expect(eventDetail.group.id).toMatch(/^group_/);
    });

    it('should use existing ID when editing', async () => {
        const saveSpy = vi.fn();
        element.addEventListener('save-sensor-group', saveSpy);
        element.open = true;
        element.sensorGroup = mockSensorGroup;
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('.md3-button.primary') as HTMLElement;
        saveBtn.click();

        const eventDetail = saveSpy.mock.calls[0][0].detail;
        expect(eventDetail.group.id).toBe('group_1');
    });

    it('should dispatch close event on close', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        element.open = true;
        await element.updateComplete;

        const closeBtn = element.shadowRoot?.querySelector('.dialog-header button') as HTMLElement;
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch close event via cancel button', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        element.open = true;
        await element.updateComplete;

        const cancelBtn = element.shadowRoot?.querySelector('.button-group .tonal') as HTMLElement;
        cancelBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle missing hass gracefully', async () => {
        element.hass = undefined as any;
        await element.updateComplete;
        const sensors = (element as any)._getAvailableSensors();
        expect(sensors.temp).toEqual([]);
    });

    it('should filter available sensors correctly', async () => {
        element.hass = mockHass;
        const sensors = (element as any)._getAvailableSensors();

        expect(sensors.temp).toContain('sensor.temp_1');
        expect(sensors.temp).toContain('sensor.temp_2');
        expect(sensors.humid).toContain('sensor.humid_1');
        expect(sensors.vpd).toContain('sensor.vpd_1');
        expect(sensors.temp).not.toContain('sensor.other');
    });

    it('should use default values for missing sensor lists in sensorGroup', async () => {
        element.open = true;
        const groupMinimal: any = {
            id: 'g2',
            name: 'Minimal',
            x: 0, y: 0, z: 0
            // temperature_sensors, humidity_sensors, vpd_sensors missing
        };
        element.sensorGroup = groupMinimal;
        await element.updateComplete;

        expect((element as any)._tempSensors).toEqual([]);
        expect((element as any)._humidSensors).toEqual([]);
        expect((element as any)._vpdSensors).toEqual([]);
    });

    it('should use default name if name is empty on save', async () => {
        const saveSpy = vi.fn();
        element.addEventListener('save-sensor-group', saveSpy);
        element.open = true;
        (element as any)._name = '';
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('.md3-button.primary') as HTMLElement;
        saveBtn.click();

        const eventDetail = saveSpy.mock.calls[0][0].detail;
        expect(eventDetail.group.name).toBe('Unnamed Group');
    });

    it('should render friendly names or entity IDs in checkboxes', async () => {
        element.open = true;
        await element.updateComplete;

        const labels = element.shadowRoot?.querySelectorAll('.checkbox-item') as any;

        // Temp 1 has friendly name
        expect(labels[0].textContent).toContain('Temp 1');

        // Temp 2 (index 1) has no friendly name, should use part of ID
        expect(labels[1].textContent).toContain('temp_2');
    });
});
