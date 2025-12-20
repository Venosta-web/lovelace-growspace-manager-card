
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
        expect((select as HTMLSelectElement)?.value).toBe('gs1');

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

    describe('Dehumidifier Tab', () => {
        beforeEach(async () => {
            element.open = true;
            element.currentTab = 'dehumidifier';
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should initialize with "seedling" stage active by default', () => {
            const activeTab = element.shadowRoot?.querySelector('.sub-tabs .config-tab.active');
            expect(activeTab).not.toBeNull();
            expect(activeTab?.textContent?.trim()).toBe('Seedling');
        });

        it('should update active stage when clicking a tab', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.sub-tabs .config-tab');
            const vegTab = Array.from(tabs || []).find(t => t.textContent?.trim() === 'Vegetative') as HTMLElement;

            expect(vegTab).toBeDefined();
            vegTab.click();
            await element.updateComplete;

            expect((element as any)._activeDehumidifierStage).toBe('veg');

            const activeTab = element.shadowRoot?.querySelector('.sub-tabs .config-tab.active');
            expect(activeTab?.textContent?.trim()).toBe('Vegetative');
        });

        it('should render inputs for current stage', async () => {
            // Default is seedling
            let sunnyHeader = element.shadowRoot?.querySelector('svg path[d*="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,7.95C7.33,8.73 7.23,9.53 7.23,10.34L3.34,7M3.36,17L7.23,13.66C7.23,14.47 7.33,15.27 7.5,16.05L3.36,17M12,22L9.61,18.58C10.35,18.85 11.16,19 12,19C12.84,19 13.65,18.85 14.39,18.58L12,22M20.66,17L16.5,16.05C16.67,15.27 16.77,14.47 16.77,13.66L20.66,17M20.64,7L16.77,10.34C16.77,9.53 16.67,8.73 16.5,7.95L20.64,7Z"]'); // Using approx check or class check would be better if mdi icon string is long, but here checking headers

            const dayHeader = Array.from(element.shadowRoot?.querySelectorAll('h5') || []).find(h => h.textContent === 'Day Cycle');
            expect(dayHeader).toBeDefined();

            const nightHeader = Array.from(element.shadowRoot?.querySelectorAll('h5') || []).find(h => h.textContent === 'Night Cycle');
            expect(nightHeader).toBeDefined();

            const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
            // Expect 4 inputs (Day On/Off, Night On/Off)
            expect(inputs?.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Environment Tab', () => {
        beforeEach(async () => {
            element.open = true;
            element.currentTab = 'environment';
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render section headers with icons', () => {
            const monitoringHeader = Array.from(element.shadowRoot?.querySelectorAll('h3') || []).find(h => h.textContent === 'Monitoring');
            expect(monitoringHeader).toBeDefined();

            const climateHeader = Array.from(element.shadowRoot?.querySelectorAll('h3') || []).find(h => h.textContent === 'Climate Control');
            expect(climateHeader).toBeDefined();

            const thresholdsHeader = Array.from(element.shadowRoot?.querySelectorAll('h3') || []).find(h => h.textContent === 'Thresholds');
            expect(thresholdsHeader).toBeDefined();
        });

        it('should render thresholds with units', () => {
            const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
            const stressInput = Array.from(inputs || []).find(i => i.getAttribute('label') === 'Stress Threshold (VPD)');
            expect(stressInput).toBeDefined();
            expect((stressInput as any).unit).toBe('kPa');
        });
    });
});
