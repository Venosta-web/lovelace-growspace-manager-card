
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { html } from 'lit';

// Mock Dependencies
vi.mock('../../../src/components/ui/md3-text-input', () => ({
    Md3TextInput: class { }
}));
vi.mock('../../../src/components/ui/md3-number-input', () => ({
    Md3NumberInput: class { }
}));
vi.mock('../../../src/components/ui/md3-select', () => ({
    Md3Select: class { }
}));

describe('ConfigDialog', () => {
    let element: ConfigDialog;
    let mockHass: any;

    beforeEach(() => {
        if (!customElements.get('config-dialog')) {
            customElements.define('config-dialog', ConfigDialog);
        }
        if (!customElements.get('ha-dialog')) {
            customElements.define('ha-dialog', class extends HTMLElement { });
        }

        element = document.createElement('config-dialog') as ConfigDialog;

        mockHass = {
            states: {},
            services: { notify: {} },
            localize: (key: string) => `[${key}]`
        };
        element.hass = mockHass;

        element.growspaceOptions = {
            'gs1': 'Growspace 1',
            'gs2': 'Growspace 2'
        };

        element.devices = [
            {
                device_id: 'gs1',
                name: 'Growspace 1',
                rows: 4,
                plants_per_row: 4,
                notification_target: 'mobile_app_test',
                environment_attributes: {
                    temperature_sensor: 'sensor.temp',
                    humidity_sensor: 'sensor.hum',
                }
            } as any
        ];
    });

    it('should pre-select current growspace in Edit tab when initialized', async () => {
        // Setup initial state with a selected growspace
        element.setInitialState('edit_growspace', {
            selectedGrowspaceId: 'gs1',
            temp_sensor: '', humidity_sensor: '', vpd_sensor: '', co2_sensor: '',
            circulation_fan: '', stress_threshold: 0.8, mold_threshold: 0.8,
            light_sensor: '', exhaust_entity: '', humidifier_entity: '',
            dehumidifier_entity: '', soil_moisture_sensor: '',
            control_dehumidifier: false, dehumidifier_thresholds: {}
        });

        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;


        const select = element.shadowRoot?.querySelector('select.md3-input');
        if (select) {


        }
        expect(select).not.toBeNull();
        expect(select?.value).toBe('gs1');

        // Verify that other fields (name, rows) are populated because of the selection
        // NOTE: This relies on the fix I haven't implemented yet. 
        // Currently, it likely stays empty or default because setInitialState only sets currentTab.
        const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Growspace Name"]');
        expect((nameInput as any).value).toBe('Growspace 1');

        document.body.removeChild(element);
    });

    it('should pre-select growspace when environmentData property is set (reactive)', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        // Set the property directly (simulating binding)
        element.environmentData = {
            selectedGrowspaceId: 'gs1',
            temp_sensor: '', humidity_sensor: '', vpd_sensor: '', co2_sensor: '',
            circulation_fan: '', stress_threshold: 0.8, mold_threshold: 0.8,
            light_sensor: '', exhaust_entity: '', humidifier_entity: '',
            dehumidifier_entity: '', soil_moisture_sensor: '',
            control_dehumidifier: false, dehumidifier_thresholds: {}
        };

        await element.updateComplete; // Wait for reactive update cycle

        const select = element.shadowRoot?.querySelector('select.md3-input') as HTMLSelectElement;
        expect(select).not.toBeNull();
        expect(select?.value).toBe('gs1');
        expect((element as any).edit_selectedId).toBe('gs1');
    });
});
