
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { html } from 'lit';

// Mock Dependencies
vi.mock('../../../src/components/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) {
            this.setAttribute('value', v);
            // Simulate internal update if needed, but for tests usually we dispatch event manually or check attribute
        }
    }
}));
vi.mock('../../../src/components/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/components/ui/md3-select', () => ({
    Md3Select: class extends HTMLElement { }
}));

describe('ConfigDialog', () => {
    let element: ConfigDialog;
    let mockHass: any;

    beforeEach(async () => {
        if (!customElements.get('config-dialog')) {
            customElements.define('config-dialog', ConfigDialog);
        }
        // Mock ha-dialog
        if (!customElements.get('ha-dialog')) {
            class HaDialogMock extends HTMLElement { open = false; }
            customElements.define('ha-dialog', HaDialogMock);
        }

        element = new ConfigDialog();

        mockHass = {
            states: {
                'sensor.temp': { entity_id: 'sensor.temp', attributes: { friendly_name: 'Temp Sensor', device_class: 'temperature' } },
                'sensor.hum': { entity_id: 'sensor.hum', attributes: { friendly_name: 'Hum Sensor', device_class: 'humidity' } },
                'switch.fan': { entity_id: 'switch.fan', attributes: { friendly_name: 'Fan Switch' } },
                'mobile_app_test': { entity_id: 'mobile_app_test', attributes: {} }
            },
            services: {
                notify: {
                    'mobile_app_phone': {},
                    'mobile_app_test': {},
                    'persistent_notification': {}
                }
            },
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
                notification_target: 'mobile_app_phone',
                environment_attributes: {
                    temperature_sensor: 'sensor.temp',
                    humidity_sensor: 'sensor.hum',
                }
            } as any
        ];

        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    describe('Tabs Navigation', () => {
        it('should switch tabs', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.config-tab');
            const editTab = Array.from(tabs || []).find(t => t.textContent?.includes('Edit Growspace'));
            (editTab as HTMLElement)?.click();
            await element.updateComplete;
            expect(element.currentTab).toBe('edit_growspace');
        });
    });

    describe('Add Growspace Tab', () => {
        beforeEach(async () => {
            element.currentTab = 'add_growspace';
            await element.updateComplete;
        });

        it('should render inputs', () => {
            const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Growspace Name"]');
            expect(nameInput).toBeTruthy();
        });

        it('should submit new growspace', async () => {
            const listener = vi.fn();
            element.addEventListener('add-growspace-submit', listener);

            // Simulate input
            (element as any).add_name = 'New GS';
            (element as any).add_rows = 5;

            // Find submit button
            const btn = element.shadowRoot?.querySelector('button.md3-button.primary');
            (btn as HTMLElement)?.click();

            expect(listener).toHaveBeenCalled();
            const detail = listener.mock.calls[0][0].detail;
            expect(detail.name).toBe('New GS');
            expect(detail.rows).toBe(5);
        });

        it('should list mobile app services', () => {
            const select = element.shadowRoot?.querySelector('select');
            const options = select?.querySelectorAll('option');
            // None + mobile_app_phone = 2
            expect(options?.length).toBeGreaterThanOrEqual(2);
            expect(select?.innerHTML).toContain('phone');
        });
    });

    describe('Edit Growspace Tab', () => {
        beforeEach(async () => {
            element.currentTab = 'edit_growspace';
            await element.updateComplete;
        });

        it('should populate fields when growspace selected', async () => {
            const select = element.shadowRoot?.querySelector('select.md3-input') as HTMLSelectElement;
            select.value = 'gs1';
            select.dispatchEvent(new Event('change'));
            await element.updateComplete;

            expect((element as any).edit_name).toBe('Growspace 1');
            expect((element as any).edit_rows).toBe(4);

            const nameInput = element.shadowRoot?.querySelector('md3-text-input[label="Growspace Name"]');
            expect((nameInput as any).value).toBe('Growspace 1');
        });

        it('should submit updates', async () => {
            (element as any).edit_selectedId = 'gs1';
            (element as any).edit_name = 'Updated GS';
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('edit-growspace-submit', listener);

            const btn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Save Changes'));
            (btn as HTMLElement)?.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.name).toBe('Updated GS');
        });

        it('should handle delete confirmation flow', async () => {
            (element as any).edit_selectedId = 'gs1';
            (element as any).edit_name = 'GS 1';
            await element.updateComplete;

            // Click Delete
            const delBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Delete'));
            (delBtn as HTMLElement)?.click();
            await element.updateComplete;

            // Should show confirmation
            expect(element.shadowRoot?.querySelector('h3')?.textContent).toContain('Delete Growspace?');

            // Click Confirm
            const listener = vi.fn();
            element.addEventListener('delete-growspace-submit', listener);

            const confirmBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Confirm Delete'));
            (confirmBtn as HTMLElement)?.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.growspace_id).toBe('gs1');

            // Should reset
            expect((element as any).edit_selectedId).toBe('');
        });
    });

    describe('Environment Tab', () => {
        beforeEach(async () => {
            element.currentTab = 'environment';
            await element.updateComplete;
        });

        it('should load initial state', async () => {
            element.setInitialState('environment', {
                selectedGrowspaceId: 'gs1',
                temp_sensor: 'sensor.temp',
                humidity_sensor: 'sensor.hum',
                vpd_sensor: '', co2_sensor: '', circulation_fan: '',
                stress_threshold: 0, mold_threshold: 0, light_sensor: '',
                exhaust_entity: '', humidifier_entity: '', dehumidifier_entity: '',
                soil_moisture_sensor: '', control_dehumidifier: true, dehumidifier_thresholds: {}
            });
            await element.updateComplete;

            // Check selected growspace
            const gsSelect = element.shadowRoot?.querySelector('select.md3-input');
            expect((gsSelect as HTMLSelectElement)?.value).toBe('gs1');
        });

        it('should filter entities by domain/device class', async () => {
            // Check Temp Sensor select
            // It should include sensor.temp but NOT switch.fan
            const selects = element.shadowRoot?.querySelectorAll('.row-col-grid select');
            const tempSelect = selects?.[0]; // First one is temp

            expect(tempSelect?.innerHTML).toContain('sensor.temp');
            expect(tempSelect?.innerHTML).not.toContain('switch.fan');

            // Check Light Source (mixed domains)
            // Should find switch.fan (assuming domain allowed)
            // domains: ['switch', 'light', ...]
            // But we need to find the specific select.
            // Label is "Light Source / Sensor"
        });

        it('should submit configuration', async () => {
            (element as any).env_selectedGrowspaceId = 'gs1';
            (element as any).env_temp_sensor = 'sensor.new';

            const listener = vi.fn();
            element.addEventListener('configure-environment-submit', listener);

            const btn = element.shadowRoot?.querySelector('button.md3-button.primary');
            (btn as HTMLElement)?.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.temp_sensor).toBe('sensor.new');
        });
    });

    describe('Dehumidifier Tab', () => {
        beforeEach(async () => {
            element.currentTab = 'dehumidifier';
            await element.updateComplete;
        });

        it('should update stage inputs', async () => {
            // Verify inputs exist
            const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
            expect(inputs?.length).toBeGreaterThan(0);

            // Check stage switching
            const tabs = element.shadowRoot?.querySelectorAll('.sub-tabs .config-tab');
            (tabs?.[1] as HTMLElement).click(); // Clone/Veg
            await element.updateComplete;

            expect((element as any)._activeDehumidifierStage).not.toBe('seedling');
        });
    });

    describe('Entity Filtering & Sorting', () => {
        it('should sort entities by friendly name', () => {
            mockHass.states = {
                'sensor.b': { entity_id: 'sensor.b', attributes: { friendly_name: 'Zebra', device_class: 'temperature' } },
                'sensor.a': { entity_id: 'sensor.a', attributes: { friendly_name: 'Apple', device_class: 'temperature' } }
            };
            element.requestUpdate(); // Re-render

            // Access private method or check render order
            const sorted = (element as any)._getEntities(['sensor'], 'temperature');
            expect(sorted[0].attributes.friendly_name).toBe('Apple');
            expect(sorted[1].attributes.friendly_name).toBe('Zebra');
        });

        it('should fall back to entity_id for sorting if no friendly_name', () => {
            mockHass.states = {
                'sensor.z': { entity_id: 'sensor.z', attributes: { device_class: 'temperature' } },
                'sensor.a': { entity_id: 'sensor.a', attributes: { device_class: 'temperature' } }
            };
            const sorted = (element as any)._getEntities(['sensor'], 'temperature');
            expect(sorted[0].entity_id).toBe('sensor.a');
        });

        it('should filter by direct device class match', () => {
            mockHass.states = {
                'sensor.match': { entity_id: 'sensor.match', attributes: { device_class: 'humidity' } },
                'sensor.no_match': { entity_id: 'sensor.no_match', attributes: { device_class: 'temperature' } }
            };
            const filtered = (element as any)._getEntities(['sensor'], 'humidity');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].entity_id).toBe('sensor.match');
        });

        it('should allow null device class to match anything', () => {
            mockHass.states = {
                'switch.fan': { entity_id: 'switch.fan', attributes: {} },
                'light.grow': { entity_id: 'light.grow', attributes: {} }
            };
            const filtered = (element as any)._getEntities(['switch', 'light'], null);
            expect(filtered).toHaveLength(2);
        });

        it('should return empty if hass not set', () => {
            element.hass = undefined as any;
            const res = (element as any)._getEntities(['sensor'], null);
            expect(res).toEqual([]);
        });
    });

    describe('State Management & Initial State', () => {
        it.skip('should apply initial state only once when opening', async () => {
            element.open = false;
            await element.updateComplete;

            element.currentTab = 'add_growspace';
            element.initialTab = 'dehumidifier';

            // Open dialog
            element.open = true;
            await element.updateComplete;

            // Should respect initialTab on first open
            expect(element.currentTab).toBe('dehumidifier');

            // Change tab manually
            element.currentTab = 'environment';

            // Close and Open again
            element.open = false;
            await element.updateComplete;
            element.open = true;
            await element.updateComplete;

            // Should reset to initialTab because it re-applies on open
            expect(element.currentTab).toBe('dehumidifier');
        });

        it('should populate fields from environmentData in setInitialState', () => {
            const data = {
                selectedGrowspaceId: 'gs1',
                temp_sensor: 'T', humidity_sensor: 'H', vpd_sensor: 'V', co2_sensor: 'C',
                circulation_fan: 'F', stress_threshold: 1, mold_threshold: 2,
                light_sensor: 'L', exhaust_entity: 'E', humidifier_entity: 'HE',
                dehumidifier_entity: 'DE', soil_moisture_sensor: 'S',
                control_dehumidifier: true,
                dehumidifier_thresholds: { veg: { day: { on: 1, off: 2 } } } as any
            };

            // spy on _populateEditFields
            const spy = vi.spyOn((element as any), '_populateEditFields');

            element.setInitialState('environment', data);

            expect((element as any).env_temp_sensor).toBe('T');
            expect((element as any).env_dehumidifier_thresholds.veg.day.on).toBe(1);
            expect(spy).toHaveBeenCalledWith('gs1');
        });

        it('should populate edit fields correctly', () => {
            element.devices = [
                { device_id: 'gs1', name: 'Growspace 1', rows: 4, plants_per_row: 4, notification_target: 'mobile_app_phone' } as any
            ];
            (element as any)._populateEditFields('gs1');

            expect((element as any).edit_name).toBe('Growspace 1');
            expect((element as any).edit_rows).toBe(4);
            expect((element as any).edit_plants_per_row).toBe(4);
            expect((element as any).edit_notification_service).toBe('mobile_app_phone');
        });

        it('should not crash populate edit fields if device missing', () => {
            (element as any)._populateEditFields('unknown_id');
            expect((element as any).edit_selectedId).toBe('unknown_id');
        });
    });

    describe('Dehumidifier Logic', () => {
        beforeEach(async () => {
            element.currentTab = 'dehumidifier';
            (element as any).env_dehumidifier_thresholds = {
                seedling: { day: { on: 0.8, off: 1.0 }, night: { on: 0.9, off: 1.1 } }
            };
            await element.updateComplete;
        });

        it('should render active stage thresholds', () => {
            const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
            expect(inputs?.length).toBeGreaterThanOrEqual(4);
            expect((inputs?.[0] as any).value).toBe(0.8);
        });

        it('should update thresholds on input change', async () => {
            const input = element.shadowRoot?.querySelector('md3-number-input') as HTMLElement;
            input.dispatchEvent(new CustomEvent('change', { detail: '1.5' }));
            await element.updateComplete;

            expect((element as any).env_dehumidifier_thresholds.seedling.day.on).toBe(1.5);
        });

        it('should ignore NaN input for thresholds', async () => {
            const input = element.shadowRoot?.querySelector('md3-number-input') as HTMLElement;
            input.dispatchEvent(new CustomEvent('change', { detail: 'invalid' }));
            await element.updateComplete;

            expect((element as any).env_dehumidifier_thresholds.seedling.day.on).toBe(0.8);
        });

        it('should initialize missing stage structure on write', async () => {
            (element as any)._activeDehumidifierStage = 'late_flower';
            (element as any).env_dehumidifier_thresholds = {};
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector('md3-number-input') as HTMLElement;
            if (input) {
                input.dispatchEvent(new CustomEvent('change', { detail: '2.0' }));
                await element.updateComplete;
                expect((element as any).env_dehumidifier_thresholds.late_flower.day.on).toBe(2.0);
            }
        });

        it('should handle missing thresholds gracefully (read)', () => {
            (element as any).env_dehumidifier_thresholds = {};
            const val = (element as any)._getThresholdValue('seedling', 'day', 'on');
            expect(val).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should switch mobile_app notify service', async () => {
            element.currentTab = 'add_growspace';
            await element.updateComplete;

            const select = element.shadowRoot?.querySelector('select');
            if (select) {
                select.value = 'mobile_app_test';
                select.dispatchEvent(new Event('change'));
                await element.updateComplete;
                expect((element as any).add_notification_service).toBe('mobile_app_test');
            }
        });

        it('should cancel delete process', async () => {
            element.currentTab = 'edit_growspace';
            (element as any).edit_selectedId = 'gs1';
            await element.updateComplete;

            (element as any)._submitDeleteGrowspace();
            await element.updateComplete;
            expect((element as any)._showDeleteConfirm).toBe(true);

            (element as any)._cancelDeleteGrowspace();
            await element.updateComplete;
            expect((element as any)._showDeleteConfirm).toBe(false);
        });

        it('should handle environment growspace change', async () => {
            element.currentTab = 'environment';
            element.devices = [{
                device_id: 'gs1',
                environment_attributes: {
                    temperature_sensor: 's.t',
                    dehumidifier_control_enabled: true
                }
            } as any];
            await element.updateComplete;

            (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs1' } });
            await element.updateComplete;
            expect((element as any).env_temp_sensor).toBe('s.t');
            expect((element as any).env_control_dehumidifier).toBe(true);

            // Change to unknown should reset
            (element as any)._handleEnvGrowspaceChange({ target: { value: '' } });
            expect((element as any).env_temp_sensor).toBe('');
            expect((element as any).env_control_dehumidifier).toBe(false);
        });
    });
});
