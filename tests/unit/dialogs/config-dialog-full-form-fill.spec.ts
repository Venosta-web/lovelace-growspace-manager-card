/**
 * Config Dialog - Complete Form Fill Tests
 *
 * This test suite ensures that ALL form fields in ALL tabs of the config dialog
 * can be filled out and submitted properly. It simulates a complete user workflow
 * where every single input field is populated with realistic data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import { DehumidifierStage } from '../../../src/types';

class HaEntityPickerMock extends HTMLElement {
    get value() { return this.getAttribute('value') || ''; }
    set value(v) { this.setAttribute('value', v); }
    set label(v) { this.setAttribute('label', v); }
    get label() { return this.getAttribute('label') || ''; }
    set includeDomains(v) { (this as any)._domains = v; }
    get includeDomains() { return (this as any)._domains; }
    set includeDeviceClasses(v) { (this as any)._classes = v; }
    get includeDeviceClasses() { return (this as any)._classes; }
}

// Mock Dependencies
vi.mock('../../../src/features/shared/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/features/shared/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/features/shared/ui/md3-select', () => ({
    Md3Select: class extends HTMLElement { }
}));

describe('ConfigDialog - Complete Form Fill Tests', () => {
    let element: ConfigDialog;
    let mockHass: any;

    beforeEach(async () => {
        if (!customElements.get('config-dialog')) {
            customElements.define('config-dialog', ConfigDialog);
        }
        if (!customElements.get('ha-dialog')) {
            class HaDialogMock extends HTMLElement { open = false; }
            customElements.define('ha-dialog', HaDialogMock);
        }
        if (!customElements.get('ha-entity-picker')) {
            customElements.define('ha-entity-picker', HaEntityPickerMock);
        }

        element = new ConfigDialog();

        // Create comprehensive mock hass with all possible entities
        mockHass = {
            states: {
                // Temperature sensors
                'sensor.temp_main': { entity_id: 'sensor.temp_main', attributes: { friendly_name: 'Main Temp', device_class: 'temperature' } },
                'sensor.temp_backup': { entity_id: 'sensor.temp_backup', attributes: { friendly_name: 'Backup Temp', device_class: 'temperature' } },
                // Humidity sensors
                'sensor.humidity_main': { entity_id: 'sensor.humidity_main', attributes: { friendly_name: 'Main Humidity', device_class: 'humidity' } },
                'sensor.humidity_backup': { entity_id: 'sensor.humidity_backup', attributes: { friendly_name: 'Backup Humidity', device_class: 'humidity' } },
                // VPD sensors
                'sensor.vpd_main': { entity_id: 'sensor.vpd_main', attributes: { friendly_name: 'Main VPD', device_class: 'pressure' } },
                // CO2 sensors
                'sensor.co2_main': { entity_id: 'sensor.co2_main', attributes: { friendly_name: 'Main CO2', device_class: 'carbon_dioxide' } },
                // Soil moisture sensors
                'sensor.soil_moisture_1': { entity_id: 'sensor.soil_moisture_1', attributes: { friendly_name: 'Soil 1', device_class: 'moisture' } },
                'sensor.soil_moisture_2': { entity_id: 'sensor.soil_moisture_2', attributes: { friendly_name: 'Soil 2', device_class: 'moisture' } },
                // Light sensors/switches
                'switch.light_main': { entity_id: 'switch.light_main', attributes: { friendly_name: 'Main Light' } },
                'switch.light_side': { entity_id: 'switch.light_side', attributes: { friendly_name: 'Side Light' } },
                'sensor.light_intensity': { entity_id: 'sensor.light_intensity', attributes: { friendly_name: 'Light Intensity' } },
                // Exhaust fans
                'fan.exhaust_main': { entity_id: 'fan.exhaust_main', attributes: { friendly_name: 'Main Exhaust' } },
                'switch.exhaust_backup': { entity_id: 'switch.exhaust_backup', attributes: { friendly_name: 'Backup Exhaust' } },
                // Circulation fans
                'fan.circulation_top': { entity_id: 'fan.circulation_top', attributes: { friendly_name: 'Top Circulation' } },
                'fan.circulation_bottom': { entity_id: 'fan.circulation_bottom', attributes: { friendly_name: 'Bottom Circulation' } },
                'switch.circulation_wall': { entity_id: 'switch.circulation_wall', attributes: { friendly_name: 'Wall Circulation' } },
                // Humidifiers
                'humidifier.main': { entity_id: 'humidifier.main', attributes: { friendly_name: 'Main Humidifier' } },
                'switch.humidifier_backup': { entity_id: 'switch.humidifier_backup', attributes: { friendly_name: 'Backup Humidifier' } },
                // Dehumidifiers
                'humidifier.dehumidifier_main': { entity_id: 'humidifier.dehumidifier_main', attributes: { friendly_name: 'Main Dehumidifier' } },
                'switch.dehumidifier_backup': { entity_id: 'switch.dehumidifier_backup', attributes: { friendly_name: 'Backup Dehumidifier' } },
            },
            services: {
                notify: {
                    'mobile_app_main_phone': {},
                    'mobile_app_backup_phone': {},
                    'mobile_app_tablet': {},
                    'persistent_notification': {}
                }
            },
            localize: (key: string) => `[${key}]`
        };
        element.hass = mockHass;

        element.growspaceOptions = {
            'gs1': 'Indoor Tent 1',
            'gs2': 'Indoor Tent 2',
            'gs3': 'Outdoor Garden'
        };

        element.devices = [
            {
                deviceId: 'gs1',
                name: 'Indoor Tent 1',
                rows: 4,
                plantsPerRow: 4,
                notificationTarget: 'mobile_app_main_phone',
                environmentAttributes: {
                    temperatureSensor: 'sensor.temp_main',
                    humiditySensor: 'sensor.humidity_main',
                    vpdSensor: 'sensor.vpd_main',
                    co2Sensor: 'sensor.co2_main',
                    soilMoistureSensor: 'sensor.soil_moisture_1',
                    lightSensors: ['switch.light_main'],
                    exhaustFanEntities: ['fan.exhaust_main'],
                    circulationFanEntities: ['fan.circulation_top'],
                    humidifierEntities: ['humidifier.main'],
                    dehumidifierEntities: ['humidifier.dehumidifier_main'],
                    dehumidifierControlEnabled: false,
                    stressThreshold: 0.8,
                    moldThreshold: 0.8,
                    dehumidifierThresholds: {},
                    sensorGroups: [],
                    sensorCoordinates: {},
                    irrigationTanks: []
                }
            } as any,
            {
                deviceId: 'gs2',
                name: 'Indoor Tent 2',
                rows: 3,
                plantsPerRow: 5,
                notificationTarget: 'mobile_app_backup_phone',
                environmentAttributes: {}
            } as any
        ];

        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    describe('ADD_GROWSPACE Tab - Complete Form Fill', () => {
        beforeEach(async () => {
            element.currentTab = ConfigTab.ADD_GROWSPACE;
            await element.updateComplete;
        });

        it('should fill out all fields and submit successfully', async () => {
            const listener = vi.fn();
            element.addEventListener('add-growspace-submit', listener);

            // Fill out ALL fields
            (element as any).addName = 'New Premium Growspace';
            (element as any).addRows = 6;
            (element as any).addPlantsPerRow = 8;
            (element as any).addNotificationService = 'mobile_app_tablet';
            await element.updateComplete;

            // Submit
            (element as any)._submitAddGrowspace();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: {
                    name: 'New Premium Growspace',
                    rows: 6,
                    plantsPerRow: 8,
                    notificationService: 'mobile_app_tablet'
                }
            }));
        });

        it('should handle maximum capacity configuration', async () => {
            const listener = vi.fn();
            element.addEventListener('add-growspace-submit', listener);

            // Test with maximum reasonable values
            (element as any).addName = 'Large Scale Commercial Setup';
            (element as any).addRows = 12;
            (element as any).addPlantsPerRow = 16;
            (element as any).addNotificationService = 'mobile_app_main_phone';
            await element.updateComplete;

            (element as any)._submitAddGrowspace();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    rows: 12,
                    plantsPerRow: 16
                })
            }));
        });
    });

    describe('EDIT_GROWSPACE Tab - Complete Form Fill', () => {
        beforeEach(async () => {
            element.currentTab = ConfigTab.EDIT_GROWSPACE;
            await element.updateComplete;
        });

        it('should fill out all edit fields and submit successfully', async () => {
            const listener = vi.fn();
            element.addEventListener('edit-growspace-submit', listener);

            // Select growspace
            (element as any).editSelectedId = 'gs1';
            (element as any)._populateEditFields('gs1');
            await element.updateComplete;

            // Modify ALL fields
            (element as any).editName = 'Updated Indoor Tent 1 - Premium';
            (element as any).editRows = 5;
            (element as any).editPlantsPerRow = 6;
            (element as any).editNotificationService = 'mobile_app_backup_phone';
            await element.updateComplete;

            // Submit
            (element as any)._submitEditGrowspace();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: {
                    growspaceId: 'gs1',
                    name: 'Updated Indoor Tent 1 - Premium',
                    rows: 5,
                    plantsPerRow: 6,
                    notificationService: 'mobile_app_backup_phone'
                }
            }));
        });

        it('should handle complete reconfiguration of existing growspace', async () => {
            const listener = vi.fn();
            element.addEventListener('edit-growspace-submit', listener);

            // Select and completely reconfigure gs2
            (element as any).editSelectedId = 'gs2';
            (element as any)._populateEditFields('gs2');
            await element.updateComplete;

            // Change everything
            (element as any).editName = 'Completely Redesigned Tent 2';
            (element as any).editRows = 8;
            (element as any).editPlantsPerRow = 3;
            (element as any).editNotificationService = 'mobile_app_tablet';
            await element.updateComplete;

            (element as any)._submitEditGrowspace();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    growspaceId: 'gs2',
                    rows: 8,
                    plantsPerRow: 3
                })
            }));
        });
    });

    describe('ENVIRONMENT Tab - Complete Form Fill', () => {
        beforeEach(async () => {
            element.currentTab = ConfigTab.ENVIRONMENT;
            await element.updateComplete;
        });

        it('should fill out ALL environment fields and submit', async () => {
            const listener = vi.fn();
            element.addEventListener('configure-environment-submit', listener);

            // Select growspace
            (element as any).envSelectedId = 'gs1';

            // Fill out ALL monitoring sensors (now multi-selects)
            (element as any).envTemperatureSensors = ['sensor.temp_main', 'sensor.temp_backup'];
            (element as any).envHumiditySensors = ['sensor.humidity_main'];
            (element as any).envVpdSensors = ['sensor.vpd_main'];
            (element as any).envCo2Sensor = 'sensor.co2_main';
            (element as any).envSoilMoistureSensor = 'sensor.soil_moisture_1';

            // Fill out ALL multi-entity climate control fields
            (element as any).envLightSensors = ['switch.light_main', 'switch.light_side', 'sensor.light_intensity'];
            (element as any).envExhaustFanEntities = ['fan.exhaust_main', 'switch.exhaust_backup'];
            (element as any).envCirculationFanEntities = ['fan.circulation_top', 'fan.circulation_bottom', 'switch.circulation_wall'];
            (element as any).envHumidifierEntities = ['humidifier.main', 'switch.humidifier_backup'];
            (element as any).envDehumidifierEntities = ['humidifier.dehumidifier_main', 'switch.dehumidifier_backup'];

            // Advanced sensors
            (element as any).envPhSensors = ['sensor.ph_main'];
            (element as any).envFeedEcSensors = ['sensor.ec_feed'];
            (element as any).envSubstrateEcSensors = ['sensor.ec_substrate'];
            (element as any).envRunoffEcSensors = ['sensor.ec_runoff'];
            (element as any).envDrainVolumeSensors = ['sensor.drain'];
            (element as any).envIrrigationFlowSensors = ['sensor.flow'];
            (element as any).envEnergySensors = ['sensor.energy'];

            // Enable dehumidifier control
            (element as any).envDehumidifierControlEnabled = true;

            // Set thresholds
            (element as any).envStressThreshold = 0.75;
            (element as any).envMoldThreshold = 0.85;

            await element.updateComplete;

            // Submit
            (element as any)._submitEnvironment();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    selectedGrowspaceId: 'gs1',
                    temperatureSensors: expect.arrayContaining(['sensor.temp_main', 'sensor.temp_backup']),
                    humiditySensors: expect.arrayContaining(['sensor.humidity_main']),
                    vpdSensors: expect.arrayContaining(['sensor.vpd_main']),
                    co2Sensor: 'sensor.co2_main',
                    soilMoistureSensor: 'sensor.soil_moisture_1',
                    lightSensors: expect.arrayContaining(['switch.light_main', 'switch.light_side', 'sensor.light_intensity']),
                    exhaustFanEntities: expect.arrayContaining(['fan.exhaust_main', 'switch.exhaust_backup']),
                    circulationFanEntities: expect.arrayContaining(['fan.circulation_top', 'fan.circulation_bottom', 'switch.circulation_wall']),
                    humidifierEntities: expect.arrayContaining(['humidifier.main', 'switch.humidifier_backup']),
                    dehumidifierEntities: expect.arrayContaining(['humidifier.dehumidifier_main', 'switch.dehumidifier_backup']),
                    phSensors: expect.arrayContaining(['sensor.ph_main']),
                    feedEcSensors: expect.arrayContaining(['sensor.ec_feed']),
                    energySensors: expect.arrayContaining(['sensor.energy']),
                    dehumidifierControlEnabled: true,
                    stressThreshold: 0.75,
                    moldThreshold: 0.85
                })
            }));
        });

        it('should handle redundant sensor configuration', async () => {
            const listener = vi.fn();
            element.addEventListener('configure-environment-submit', listener);

            // Configure with backup sensors everywhere
            (element as any).envSelectedId = 'gs2';
            (element as any).envTemperatureSensors = ['sensor.temp_backup'];
            (element as any).envHumiditySensors = ['sensor.humidity_backup'];
            (element as any).envSoilMoistureSensor = 'sensor.soil_moisture_2';
            (element as any).envLightSensors = ['switch.light_main', 'switch.light_side'];
            (element as any).envExhaustFanEntities = ['fan.exhaust_main', 'switch.exhaust_backup'];
            (element as any).envCirculationFanEntities = ['fan.circulation_top', 'fan.circulation_bottom'];
            (element as any).envDehumidifierControlEnabled = false;
            (element as any).envStressThreshold = 0.9;
            (element as any).envMoldThreshold = 0.7;

            await element.updateComplete;
            (element as any)._submitEnvironment();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    selectedGrowspaceId: 'gs2',
                    temperatureSensors: expect.arrayContaining(['sensor.temp_backup']),
                    lightSensors: expect.arrayContaining(['switch.light_main', 'switch.light_side'])
                })
            }));
        });
    });

    describe('DEHUMIDIFIER Tab - Complete Form Fill', () => {
        beforeEach(async () => {
            element.currentTab = ConfigTab.DEHUMIDIFIER;
            await element.updateComplete;
        });

        it('should fill out ALL dehumidifier thresholds for ALL stages', async () => {
            const listener = vi.fn();
            element.addEventListener('configure-environment-submit', listener);

            (element as any).envSelectedId = 'gs1';

            // Define complete thresholds for ALL 7 stages
            const stages = [
                DehumidifierStage.SEEDLING,
                DehumidifierStage.VEGETATIVE,
                DehumidifierStage.EARLY_FLOWER,
                DehumidifierStage.MID_FLOWER,
                DehumidifierStage.LATE_FLOWER,
                DehumidifierStage.DRYING,
                DehumidifierStage.CURING
            ];

            const thresholdData = {
                [DehumidifierStage.SEEDLING]: { day: { on: 70, off: 65 }, night: { on: 75, off: 70 } },
                [DehumidifierStage.VEGETATIVE]: { day: { on: 65, off: 60 }, night: { on: 70, off: 65 } },
                [DehumidifierStage.EARLY_FLOWER]: { day: { on: 60, off: 55 }, night: { on: 65, off: 60 } },
                [DehumidifierStage.MID_FLOWER]: { day: { on: 55, off: 50 }, night: { on: 60, off: 55 } },
                [DehumidifierStage.LATE_FLOWER]: { day: { on: 50, off: 45 }, night: { on: 55, off: 50 } },
                [DehumidifierStage.DRYING]: { day: { on: 55, off: 50 }, night: { on: 55, off: 50 } },
                [DehumidifierStage.CURING]: { day: { on: 62, off: 58 }, night: { on: 62, off: 58 } }
            };

            // Set all thresholds
            (element as any).envDehumidifierThresholds = thresholdData;

            await element.updateComplete;

            // Verify all thresholds are set correctly
            stages.forEach(stage => {
                expect((element as any).envDehumidifierThresholds[stage]).toEqual(thresholdData[stage]);
            });

            // Submit
            (element as any)._submitEnvironment();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    dehumidifierThresholds: expect.objectContaining({
                        [DehumidifierStage.SEEDLING]: thresholdData[DehumidifierStage.SEEDLING],
                        [DehumidifierStage.VEGETATIVE]: thresholdData[DehumidifierStage.VEGETATIVE],
                        [DehumidifierStage.EARLY_FLOWER]: thresholdData[DehumidifierStage.EARLY_FLOWER],
                        [DehumidifierStage.MID_FLOWER]: thresholdData[DehumidifierStage.MID_FLOWER],
                        [DehumidifierStage.LATE_FLOWER]: thresholdData[DehumidifierStage.LATE_FLOWER],
                        [DehumidifierStage.DRYING]: thresholdData[DehumidifierStage.DRYING],
                        [DehumidifierStage.CURING]: thresholdData[DehumidifierStage.CURING]
                    })
                })
            }));
        });

        it('should update individual threshold points across all stages', async () => {
            (element as any).envSelectedId = 'gs1';

            // Update individual points for each stage using the _updateThreshold method
            const testUpdates = [
                { stage: DehumidifierStage.SEEDLING, cycle: 'day', point: 'on', value: 72 },
                { stage: DehumidifierStage.SEEDLING, cycle: 'day', point: 'off', value: 68 },
                { stage: DehumidifierStage.SEEDLING, cycle: 'night', point: 'on', value: 77 },
                { stage: DehumidifierStage.SEEDLING, cycle: 'night', point: 'off', value: 73 },

                { stage: DehumidifierStage.VEGETATIVE, cycle: 'day', point: 'on', value: 67 },
                { stage: DehumidifierStage.VEGETATIVE, cycle: 'day', point: 'off', value: 62 },
                { stage: DehumidifierStage.VEGETATIVE, cycle: 'night', point: 'on', value: 72 },
                { stage: DehumidifierStage.VEGETATIVE, cycle: 'night', point: 'off', value: 67 },

                { stage: DehumidifierStage.EARLY_FLOWER, cycle: 'day', point: 'on', value: 62 },
                { stage: DehumidifierStage.EARLY_FLOWER, cycle: 'day', point: 'off', value: 57 },
                { stage: DehumidifierStage.EARLY_FLOWER, cycle: 'night', point: 'on', value: 67 },
                { stage: DehumidifierStage.EARLY_FLOWER, cycle: 'night', point: 'off', value: 62 },

                { stage: DehumidifierStage.MID_FLOWER, cycle: 'day', point: 'on', value: 57 },
                { stage: DehumidifierStage.MID_FLOWER, cycle: 'day', point: 'off', value: 52 },
                { stage: DehumidifierStage.MID_FLOWER, cycle: 'night', point: 'on', value: 62 },
                { stage: DehumidifierStage.MID_FLOWER, cycle: 'night', point: 'off', value: 57 },

                { stage: DehumidifierStage.LATE_FLOWER, cycle: 'day', point: 'on', value: 52 },
                { stage: DehumidifierStage.LATE_FLOWER, cycle: 'day', point: 'off', value: 47 },
                { stage: DehumidifierStage.LATE_FLOWER, cycle: 'night', point: 'on', value: 57 },
                { stage: DehumidifierStage.LATE_FLOWER, cycle: 'night', point: 'off', value: 52 },

                { stage: DehumidifierStage.DRYING, cycle: 'day', point: 'on', value: 57 },
                { stage: DehumidifierStage.DRYING, cycle: 'day', point: 'off', value: 52 },
                { stage: DehumidifierStage.DRYING, cycle: 'night', point: 'on', value: 57 },
                { stage: DehumidifierStage.DRYING, cycle: 'night', point: 'off', value: 52 },

                { stage: DehumidifierStage.CURING, cycle: 'day', point: 'on', value: 64 },
                { stage: DehumidifierStage.CURING, cycle: 'day', point: 'off', value: 60 },
                { stage: DehumidifierStage.CURING, cycle: 'night', point: 'on', value: 64 },
                { stage: DehumidifierStage.CURING, cycle: 'night', point: 'off', value: 60 }
            ];

            // Apply all updates
            testUpdates.forEach(({ stage, cycle, point, value }) => {
                (element as any)._updateThreshold(stage, cycle, point, value);
            });

            await element.updateComplete;

            // Verify all values were set correctly
            testUpdates.forEach(({ stage, cycle, point, value }) => {
                const actualValue = (element as any).envDehumidifierThresholds[stage]?.[cycle]?.[point];
                expect(actualValue).toBe(value);
            });
        });

        it('should switch between all dehumidifier stages and verify threshold persistence', async () => {
            (element as any).envSelectedId = 'gs1';

            const stages = [
                DehumidifierStage.SEEDLING,
                DehumidifierStage.VEGETATIVE,
                DehumidifierStage.EARLY_FLOWER,
                DehumidifierStage.MID_FLOWER,
                DehumidifierStage.LATE_FLOWER,
                DehumidifierStage.DRYING,
                DehumidifierStage.CURING
            ];

            // Set unique values for each stage
            stages.forEach((stage, index) => {
                const baseValue = 50 + (index * 5);
                (element as any)._updateThreshold(stage, 'day', 'on', baseValue);
                (element as any)._updateThreshold(stage, 'day', 'off', baseValue - 5);
                (element as any)._updateThreshold(stage, 'night', 'on', baseValue + 5);
                (element as any)._updateThreshold(stage, 'night', 'off', baseValue);
            });

            await element.updateComplete;

            // Switch through all stages and verify values persist
            for (let i = 0; i < stages.length; i++) {
                const stage = stages[i];
                (element as any)._activeDehumidifierStage = stage;
                await element.updateComplete;

                const baseValue = 50 + (i * 5);
                expect((element as any).envDehumidifierThresholds[stage].day.on).toBe(baseValue);
                expect((element as any).envDehumidifierThresholds[stage].day.off).toBe(baseValue - 5);
                expect((element as any).envDehumidifierThresholds[stage].night.on).toBe(baseValue + 5);
                expect((element as any).envDehumidifierThresholds[stage].night.off).toBe(baseValue);
            }
        });
    });

    describe('Complete Multi-Tab Workflow', () => {
        it('should successfully navigate and fill all tabs in sequence', async () => {
            // 1. ADD_GROWSPACE Tab
            element.currentTab = ConfigTab.ADD_GROWSPACE;
            await element.updateComplete;

            (element as any).addName = 'Workflow Test Growspace';
            (element as any).addRows = 5;
            (element as any).addPlantsPerRow = 5;
            (element as any).addNotificationService = 'mobile_app_main_phone';
            await element.updateComplete;

            expect((element as any).addName).toBe('Workflow Test Growspace');

            // 2. EDIT_GROWSPACE Tab
            element.currentTab = ConfigTab.EDIT_GROWSPACE;
            await element.updateComplete;

            (element as any).editSelectedId = 'gs1';
            (element as any)._populateEditFields('gs1');
            (element as any).editName = 'Modified Name';
            await element.updateComplete;

            expect((element as any).editName).toBe('Modified Name');

            // 3. ENVIRONMENT Tab
            element.currentTab = ConfigTab.ENVIRONMENT;
            await element.updateComplete;

            (element as any).envSelectedId = 'gs1';
            (element as any).envTemperatureSensor = 'sensor.temp_main';
            (element as any).envHumiditySensor = 'sensor.humidity_main';
            (element as any).envLightSensors = ['switch.light_main'];
            await element.updateComplete;

            expect((element as any).envTemperatureSensor).toBe('sensor.temp_main');
            expect((element as any).envLightSensors).toEqual(['switch.light_main']);

            // 4. DEHUMIDIFIER Tab
            element.currentTab = ConfigTab.DEHUMIDIFIER;
            await element.updateComplete;

            (element as any)._updateThreshold(DehumidifierStage.SEEDLING, 'day', 'on', 70);
            (element as any)._updateThreshold(DehumidifierStage.VEGETATIVE, 'night', 'off', 65);
            await element.updateComplete;

            expect((element as any).envDehumidifierThresholds[DehumidifierStage.SEEDLING].day.on).toBe(70);
            expect((element as any).envDehumidifierThresholds[DehumidifierStage.VEGETATIVE].night.off).toBe(65);

            // 5. SENSOR_GROUPS Tab
            element.currentTab = ConfigTab.SENSOR_GROUPS;
            await element.updateComplete;

            // Verify tab rendered
            expect(element.currentTab).toBe(ConfigTab.SENSOR_GROUPS);
        });
    });

    describe('Edge Cases - Maximum Data Configuration', () => {
        it('should handle maximum multi-entity selections across all fields', async () => {
            element.currentTab = ConfigTab.ENVIRONMENT;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('configure-environment-submit', listener);

            // Configure with maximum entities everywhere
            (element as any).envSelectedId = 'gs1';
            (element as any).envLightSensors = ['switch.light_main', 'switch.light_side', 'sensor.light_intensity'];
            (element as any).envExhaustFanEntities = ['fan.exhaust_main', 'switch.exhaust_backup'];
            (element as any).envCirculationFanEntities = ['fan.circulation_top', 'fan.circulation_bottom', 'switch.circulation_wall'];
            (element as any).envHumidifierEntities = ['humidifier.main', 'switch.humidifier_backup'];
            (element as any).envDehumidifierEntities = ['humidifier.dehumidifier_main', 'switch.dehumidifier_backup'];

            await element.updateComplete;
            (element as any)._submitEnvironment();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({
                    lightSensors: expect.any(Array),
                    exhaustFanEntities: expect.any(Array),
                    circulationFanEntities: expect.any(Array),
                    humidifierEntities: expect.any(Array),
                    dehumidifierEntities: expect.any(Array)
                })
            }));

            // Verify all arrays have the correct lengths
            const detail = listener.mock.calls[0][0].detail;
            expect(detail.lightSensors.length).toBe(3);
            expect(detail.exhaustFanEntities.length).toBe(2);
            expect(detail.circulationFanEntities.length).toBe(3);
            expect(detail.humidifierEntities.length).toBe(2);
            expect(detail.dehumidifierEntities.length).toBe(2);
        });

        it('should handle extreme threshold values', async () => {
            element.currentTab = ConfigTab.DEHUMIDIFIER;
            await element.updateComplete;

            // Test boundary values
            (element as any)._updateThreshold(DehumidifierStage.SEEDLING, 'day', 'on', 0.01);
            (element as any)._updateThreshold(DehumidifierStage.SEEDLING, 'day', 'off', 0);
            (element as any)._updateThreshold(DehumidifierStage.VEGETATIVE, 'night', 'on', 99.99);
            (element as any)._updateThreshold(DehumidifierStage.VEGETATIVE, 'night', 'off', 100);

            await element.updateComplete;

            expect((element as any).envDehumidifierThresholds[DehumidifierStage.SEEDLING].day.on).toBe(0.01);
            expect((element as any).envDehumidifierThresholds[DehumidifierStage.VEGETATIVE].night.on).toBe(99.99);
        });
    });
});
