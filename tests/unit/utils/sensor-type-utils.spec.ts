
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
});
