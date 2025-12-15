
import { describe, it, expect } from 'vitest';
import { MetricsUtils } from '../../src/utils/metrics-utils';
import { PlantStage } from '../../src/types';

describe('MetricsUtils', () => {
    const mockHass = {
        states: {
            'binary_sensor.test_room_optimal_conditions': {
                state: 'on',
                attributes: {
                    temperature: 25,
                    humidity: 60,
                    vpd: 1.2,
                    co2: 800,
                    is_lights_on: true,
                },
            },
            'sensor.test_room': {
                state: 'on',
                attributes: {
                    vpd_status: 'optimal',
                    soil_moisture_value: 45
                }
            },
            'binary_sensor.bad_conditions': {
                state: 'off',
                attributes: {
                    reasons: 'Too hot'
                }
            },
            'sensor.vpd_sensor': {
                state: '1.5'
            }
        },
    } as any;

    const mockDevice = {
        name: 'Test Room',
        overview_entity_id: 'sensor.test_room',
        plants: [],
        irrigation_times: [{ time: '12:00', duration: 10 }],
        drain_times: [{ time: '13:00', duration: 5 }],
        environment_attributes: {
            exhaust_entity: 'fan.exhaust',
            humidifier_entity: 'humidifier.main'
        }
    } as any;

    it('should compute main metric chips correctly', () => {
        const result = MetricsUtils.computeHeaderMetrics(
            mockHass,
            mockDevice,
            new Set(),
            []
        );

        expect(result.mainChips).toBeDefined();
        const tempChip = result.mainChips.find(c => c.key === 'temperature');
        expect(tempChip).toBeDefined();
        expect(tempChip.value).toBe('25°C');

        const vpdChip = result.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip).toBeDefined();
        expect(vpdChip.value).toBe('1.2 kPa');
        expect(vpdChip.status).toBe('optimal'); // From overview entity

        const lightChip = result.deviceChips.find(c => c.key === 'light');
        expect(lightChip).toBeDefined();
        expect(lightChip.value).toBe('On');
    });

    it('should fallback VPD logic if main entity missing VPD', () => {
        const fallbackHass = {
            states: {
                'binary_sensor.test_room_optimal_conditions': {
                    state: 'on',
                    attributes: { temperature: 25 } // No VPD
                },
                'sensor.vpd_sensor': { state: '1.5' },
                'sensor.test_room': { attributes: {} }
            }
        } as any;

        const fallbackDevice = {
            ...mockDevice,
            environment_attributes: { vpd_sensor: 'sensor.vpd_sensor' }
        } as any;

        const result = MetricsUtils.computeHeaderMetrics(
            fallbackHass,
            fallbackDevice,
            new Set(),
            []
        );

        const vpdChip = result.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip).toBeDefined();
        expect(vpdChip.value).toBe('1.5 kPa');
    });

    it('should handle irrigation times', () => {
        // Mock DateTime.now to control "current time"? 
        // computeHeaderMetrics uses DateTime.now().
        // For simplicity, we just check if it returns a formatted time or undefined.
        // Since our mock has 12:00, it should return something.

        const result = MetricsUtils.computeHeaderMetrics(
            mockHass,
            mockDevice,
            new Set(),
            []
        );

        const irrChip = result.mainChips.find(c => c.key === 'irrigation');
        expect(irrChip).toBeDefined();
        expect(irrChip.value).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should process device chips', () => {
        const hassWithDevices = {
            ...mockHass,
            states: {
                ...mockHass.states,
                'fan.exhaust': { state: 'on' },
                'humidifier.main': { state: 'off' }
            }
        } as any;

        const result = MetricsUtils.computeHeaderMetrics(
            hassWithDevices,
            mockDevice,
            new Set(),
            []
        );

        const exhaustChip = result.deviceChips.find(c => c.key === 'exhaust');
        expect(exhaustChip).toBeDefined();
        expect(exhaustChip.value).toBe('on');

        const humidChip = result.deviceChips.find(c => c.key === 'humidifier');
        expect(humidChip).toBeDefined();
        expect(humidChip.value).toBe('off');
    });
});
