
import { describe, it, expect, vi } from 'vitest';
import { SensorTypeUtils } from '../../../src/utils/sensor-type-utils';
import { GrowspaceDevice } from '../../../src/types';

describe('SensorTypeUtils', () => {
    const createMockDevice = (sensorTypes?: Record<string, string>, irrigationTanks?: any[]): GrowspaceDevice => ({
        deviceId: 'test_device',
        name: 'Test',
        type: 'normal',
        rows: 1,
        plantsPerRow: 1,
        plants: [],
        grid: {},
        biologicalMetrics: {} as any,
        environmentAttributes: {
            sensorTypes: sensorTypes,
            irrigationTanks: irrigationTanks
        } as any,
        stats: {} as any,
        irrigationConfig: {} as any,
    } as GrowspaceDevice);

    const mockHass = {
        states: {
            'sensor.test_temp': {
                attributes: { device_class: 'temperature' },
                state: '20'
            },
            'sensor.test_tank': {
                attributes: {},
                state: '50'
            }
        }
    };

    it('should use explicit sensor types mapping when available', () => {
        const device = createMockDevice({
            'sensor.custom_id': 'temperature',
            'sensor.tank_1': 'irrigation_tank'
        });

        expect(SensorTypeUtils.isTemperature(device, mockHass, 'sensor.custom_id')).toBe(true);
        expect(SensorTypeUtils.isIrrigationTank(device, 'sensor.tank_1')).toBe(true);
    });

    it('should fallback to heuristics when mapping is missing', () => {
        const device = createMockDevice({});

        // Temperature heuristic
        expect(SensorTypeUtils.isTemperature(device, mockHass, 'sensor.test_temp')).toBe(true);

        // Irrigation Tank heuristic (by name)
        expect(SensorTypeUtils.isIrrigationTank(device, 'sensor.water_tank')).toBe(true);
    });

    it('should correctly identify irrigation tanks from environmentAttributes list', () => {
        const device = createMockDevice({}, [
            { sensorEntity: 'sensor.my_tank', name: 'Tank', warningLevel: 10, fillLevel: 50, isWarning: false }
        ]);

        expect(SensorTypeUtils.isIrrigationTank(device, 'sensor.my_tank')).toBe(true);
    });

    it('should prioritize explicit mapping over heuristics', () => {
        // A sensor that looks like temp (heuristic) but is mapped as something else (e.g. humidity - weird but good for test)
        const device = createMockDevice({
            'sensor.test_temp': 'humidity'
        });

        // Should return FALSE for temperature because logic checks map first
        expect(SensorTypeUtils.isTemperature(device, mockHass, 'sensor.test_temp')).toBe(false);
        expect(SensorTypeUtils.isHumidity(device, mockHass, 'sensor.test_temp')).toBe(true);
    });
    it('should identify light sensors', () => {
        const deviceWithExplicit = createMockDevice({ 'sensor.custom_light': 'light' });
        expect(SensorTypeUtils.isLight(deviceWithExplicit, mockHass, 'sensor.custom_light')).toBe(true);

        const hassWithHeuristics = {
            states: {
                'sensor.lux': { attributes: { device_class: 'illuminance' } },
                'sensor.fc': { attributes: { unit_of_measurement: 'fc' } },
                'sensor.lx': { attributes: { unit_of_measurement: 'lx' } },
                'sensor.custom_light': { attributes: { friendly_name: 'Light' }, state: 'on' }
            }
        };
        const device = createMockDevice({});
        expect(SensorTypeUtils.isLight(device, hassWithHeuristics, 'sensor.lux')).toBe(true);
        expect(SensorTypeUtils.isLight(device, hassWithHeuristics, 'sensor.fc')).toBe(true);
        expect(SensorTypeUtils.isLight(device, hassWithHeuristics, 'sensor.lx')).toBe(true);

        // Negative cases
        expect(SensorTypeUtils.isLight(device, hassWithHeuristics, 'sensor.humidifier_light')).toBe(false);
    });

    it('should identify environment sensors', () => {
        const deviceWithEnv = createMockDevice({ 'sensor.dehum1': 'dehumidifier' });
        // Manually inject co2Sensors into env attributes as createMockDevice helper might not cover it fully or we access it directly
        deviceWithEnv.environmentAttributes.co2Sensors = ['sensor.co2_1'];

        expect(SensorTypeUtils.isCO2(deviceWithEnv, 'sensor.co2_1')).toBe(true);
        expect(SensorTypeUtils.isDehumidifier(deviceWithEnv, 'sensor.dehum1')).toBe(true);

        // CO2 Heuristics
        expect(SensorTypeUtils.isCO2(deviceWithEnv, 'sensor.co2_raw')).toBe(true);
    });

    it('should identify humidifiers and dehumidifiers', () => {
        const device = createMockDevice({});
        device.environmentAttributes.humidifierEntities = ['humidifier.1'];
        device.environmentAttributes.dehumidifierEntities = ['dehumidifier.1'];

        expect(SensorTypeUtils.isHumidifier(device, 'humidifier.1')).toBe(true);
        expect(SensorTypeUtils.isDehumidifier(device, 'dehumidifier.1')).toBe(true);
    });

    it('should identify fans and exhaust', () => {
        const device = createMockDevice({});
        device.environmentAttributes.circulationFanEntities = ['fan.circ1'];
        device.environmentAttributes.exhaustFanEntities = ['fan.exhaust1'];

        expect(SensorTypeUtils.isFan(device, 'fan.circ1')).toBe(true);
        expect(SensorTypeUtils.isExhaust(device, 'fan.exhaust1')).toBe(true);
    });

    it('should handle identification with missing hass or state', () => {
        const device = createMockDevice({});
        expect(SensorTypeUtils.isLight(device, null, 'sensor.any')).toBe(false);
        expect(SensorTypeUtils.isTemperature(device, null, 'sensor.any')).toBe(false);
        expect(SensorTypeUtils.isHumidity(device, null, 'sensor.any')).toBe(false);
        expect(SensorTypeUtils.isVPD(device, null, 'sensor.any')).toBe(false);

        const emptyHass = { states: {} };
        expect(SensorTypeUtils.isLight(device, emptyHass, 'sensor.none')).toBe(false);
    });

    it('should correctly get sensor icons for all types', () => {
        const device = createMockDevice({
            'sensor.soil': 'soil_moisture',
            'sensor.i_pump': 'irrigation_pump',
            'sensor.d_pump': 'drain_pump',
            'sensor.co2_mapped': 'co2',
            'sensor.h_mapped': 'humidifier',
            'sensor.dh_mapped': 'dehumidifier'
        });
        const hass = {
            states: {
                'sensor.temp': { attributes: { device_class: 'temperature' } },
                'sensor.humi': { attributes: { device_class: 'humidity' } },
                'sensor.vpd': { attributes: { unit_of_measurement: 'vpd' } },
                'sensor.light': { attributes: { device_class: 'illuminance' } }
            }
        };

        device.environmentAttributes.circulationFanEntities = ['fan.circ'];
        device.environmentAttributes.exhaustFanEntities = ['fan.exh'];
        device.environmentAttributes.irrigationTanks = [{
            sensorEntity: 'sensor.tank',
            name: 'Tank',
            warningLevel: 10,
            fillLevel: 50,
            isWarning: false
        } as any];

        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.temp')).toBe('mdi:thermometer');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.humi')).toBe('mdi:water-percent');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.vpd')).toBe('mdi:cloud-outline');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.light')).toBe('mdi:lightbulb-on');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'fan.circ')).toBe('mdi:fan');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'fan.exh')).toBe('mdi:fan');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.soil')).toBe('mdi:water-percent');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.i_pump')).toBe('mdi:water');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.d_pump')).toBe('mdi:water-minus');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.co2_mapped')).toBe('mdi:weather-cloudy');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.h_mapped')).toBe('mdi:air-humidifier');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.dh_mapped')).toBe('mdi:air-humidifier-off');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.tank')).toBe('mdi:barrel');
        expect(SensorTypeUtils.getSensorIcon(device, hass, 'sensor.unknown')).toBe('mdi:sensor');
    });

    describe('isVPD', () => {
        it('should identify VPD from sensor groups', () => {
            const device = createMockDevice();
            device.environmentAttributes.sensorGroups = [{ vpd_sensors: ['sensor.gvpd'] } as any];
            expect(SensorTypeUtils.isVPD(device, null, 'sensor.gvpd')).toBe(true);
        });

        it('should identify VPD from unit or id', () => {
            const device = createMockDevice();
            const hass = {
                states: {
                    'sensor.v1': { attributes: { unit_of_measurement: 'hPa' } },
                    'sensor.v2': { attributes: { unit_of_measurement: 'vpd' } },
                    'sensor.calc_deficit': { attributes: {} }
                }
            };
            expect(SensorTypeUtils.isVPD(device, hass, 'sensor.v2')).toBe(true);
            expect(SensorTypeUtils.isVPD(device, hass, 'sensor.calc_deficit')).toBe(true);
        });
    });

    describe('isSoilMoisture', () => {
        it('should identify from environmentAttributes', () => {
            const device = createMockDevice();
            device.environmentAttributes.soilMoistureSensors = ['sensor.s1'];
            device.environmentAttributes.soilMoistureSensor = 'sensor.s2';
            expect(SensorTypeUtils.isSoilMoisture(device, 'sensor.s1')).toBe(true);
            expect(SensorTypeUtils.isSoilMoisture(device, 'sensor.s2')).toBe(true);
        });
    });

    describe('isIrrigationPump / isDrainPump', () => {
        it('should identify from irrigationConfig', () => {
            const device = createMockDevice();
            device.irrigationConfig = {
                irrigationPumpEntity: 'switch.i',
                drainPumpEntity: 'switch.d'
            } as any;
            expect(SensorTypeUtils.isIrrigationPump(device, 'switch.i')).toBe(true);
            expect(SensorTypeUtils.isDrainPump(device, 'switch.d')).toBe(true);
        });
    });

    describe('Heuristic Branches', () => {
        it('should handle missing data in light identification', () => {
            const device = createMockDevice();
            expect(SensorTypeUtils.isLight(undefined, {}, 's1')).toBe(false);
            expect(SensorTypeUtils.isLight(device, {}, '')).toBe(false);
            expect(SensorTypeUtils.isLight(device, { states: {} }, 's1')).toBe(false);
        });

        it('should identify temperature from degree unit', () => {
            const hass = { states: { 's1': { attributes: { unit_of_measurement: '°C' } } } };
            expect(SensorTypeUtils.isTemperature(createMockDevice(), hass, 's1')).toBe(true);
        });

        it('should identify humidity from % unit', () => {
            const hass = { states: { 's1': { attributes: { unit_of_measurement: '%' } } } };
            expect(SensorTypeUtils.isHumidity(createMockDevice(), hass, 's1')).toBe(true);
        });

        it('should use sensor groups for temp and humidity', () => {
            const device = createMockDevice();
            device.environmentAttributes.sensorGroups = [
                { temperature_sensors: ['t1'], humidity_sensors: ['h1'] } as any
            ];
            expect(SensorTypeUtils.isTemperature(device, null, 't1')).toBe(true);
            expect(SensorTypeUtils.isHumidity(device, null, 'h1')).toBe(true);
        });

        it('should identify from single entity fields (legacy)', () => {
            const device = createMockDevice();
            device.environmentAttributes.circulationFanEntity = 'fan.c';
            device.environmentAttributes.exhaustEntity = 'fan.e';
            device.environmentAttributes.humidifierEntity = 'h.1';
            device.environmentAttributes.dehumidifierEntity = 'dh.1';

            expect(SensorTypeUtils.isFan(device, 'fan.c')).toBe(true);
            expect(SensorTypeUtils.isExhaust(device, 'fan.e')).toBe(true);
            expect(SensorTypeUtils.isHumidifier(device, 'h.1')).toBe(true);
            expect(SensorTypeUtils.isDehumidifier(device, 'dh.1')).toBe(true);
        });
    });

    describe('Device undefined guards', () => {
        it('should return false when device is undefined for all methods', () => {
            expect(SensorTypeUtils.isFan(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isExhaust(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isSoilMoisture(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isIrrigationPump(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isDrainPump(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isCO2(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isHumidifier(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isDehumidifier(undefined, 's1')).toBe(false);
            expect(SensorTypeUtils.isIrrigationTank(undefined, 's1')).toBe(false);
        });
    });

    describe('isLight complex branches', () => {
        it('should exercise different combinations in isLight', () => {
            const device = createMockDevice();
            // Case 1: isIlluminance true via LUX unit
            const hass1 = { states: { 's1': { attributes: { unit_of_measurement: 'lux' } } } };
            expect(SensorTypeUtils.isLight(device, hass1, 's1')).toBe(true);

            // Case 2: isLightId true via name includes 'light_sensor'
            const hass2 = { states: { 'sensor.my_light_sensor': { attributes: {} } } };
            expect(SensorTypeUtils.isLight(device, hass2, 'sensor.my_light_sensor')).toBe(true);

            // Case 3: isLightId true via name includes 'illuminance'
            const hass3 = { states: { 'sensor.illuminance_raw': { attributes: {} } } };
            expect(SensorTypeUtils.isLight(device, hass3, 'sensor.illuminance_raw')).toBe(true);
        });
    });

    describe('Empty and missing config cases', () => {
        it('should return false for all types when config is empty', () => {
            const device = createMockDevice({}); // sensorTypes = {}
            device.environmentAttributes.sensorGroups = [];

            expect(SensorTypeUtils.isFan(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isExhaust(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isSoilMoisture(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isCO2(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isHumidifier(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isDehumidifier(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isIrrigationTank(device, 'any')).toBe(false);
        });

        it('should handle missing device or entityId in temperature, humidity, VPD', () => {
            const device = createMockDevice();
            expect(SensorTypeUtils.isTemperature(undefined, null, 's1')).toBe(false);
            expect(SensorTypeUtils.isTemperature(device, null, '')).toBe(false);
            expect(SensorTypeUtils.isHumidity(undefined, null, 's1')).toBe(false);
            expect(SensorTypeUtils.isHumidity(device, null, '')).toBe(false);
            expect(SensorTypeUtils.isVPD(undefined, null, 's1')).toBe(false);
            expect(SensorTypeUtils.isVPD(device, null, '')).toBe(false);
        });

        it('should handle undefined env.sensorTypes', () => {
            const device = createMockDevice();
            device.environmentAttributes.sensorTypes = undefined;
            expect(SensorTypeUtils.isCO2(device, 'any')).toBe(false);
            expect(SensorTypeUtils.isIrrigationTank(device, 'any')).toBe(false);
        });
    });
});
