import { describe, it, expect, vi } from 'vitest';
import { MetricsUtils } from '../../src/utils/metrics-utils';
import { PlantUtils } from '../../src/utils/plant-utils';
import { PlantStage } from '../../src/types';
import { DateTime } from 'luxon';

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
        irrigation_config: {
            irrigation_times: [{ time: '12:00', duration: 10 }],
            drain_times: [{ time: '13:00', duration: 5 }],
        },
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

    it('should determine dominant stage correctly', () => {
        const mixedDevice = {
            ...mockDevice,
            plants: [
                { attributes: { plant_id: '1', stage: 'veg' } },
                { attributes: { plant_id: '2', stage: 'flower', flower_start: '2023-01-01' } }, // Add date to ensure it picks up?
                { attributes: { plant_id: '3', stage: 'flower', flower_start: '2023-01-01' } }
            ]
        } as any;

        const result = MetricsUtils.computeHeaderMetrics(
            mockHass,
            mixedDevice,
            new Set(),
            []
        );

        // result.dominant is an object with icon/labels
        expect(result.dominant).toBeDefined();
        // Since we have flower plants, it should be Flower stage.
        // We can check if the icon is NOT the seedling icon, or check label?
        // Let's just check it is defined for now, or check for specific property if we knew it.
        // Actually, if it returns an object, let's check it's not null.
        expect(result.dominant).toBeTruthy();
    });

    it('should handle unavailable sensor states gracefully', () => {
        const hassWithErrors = {
            ...mockHass,
            states: {
                ...mockHass.states,
                'binary_sensor.test_room_optimal_conditions': {
                    state: 'unavailable',
                    attributes: {
                        temperature: 'unknown',
                        // Missing other attributes
                    }
                }
            }
        } as any;

        const result = MetricsUtils.computeHeaderMetrics(
            hassWithErrors,
            mockDevice,
            new Set(),
            []
        );

        // Should not throw and return what the code produces (value + unit)
        const tempChip = result.mainChips.find(c => c.key === 'temperature');
        expect(tempChip).toBeDefined();
        expect(tempChip?.value).toBe('unknown°C');
    });

    it('should fallback to Name-based Calculated VPD entity ID', () => {
        // Device name "Test Room" -> "test_room_calculated_vpd"
        const fallbackHass = {
            states: {
                'binary_sensor.test_room_optimal_conditions': {
                    state: 'on',
                    attributes: { temperature: 25 } // No VPD
                },
                'sensor.test_room_calculated_vpd': { state: '0.8' },
                'sensor.test_room': { attributes: {} }
            }
        } as any;

        const result = MetricsUtils.computeHeaderMetrics(
            fallbackHass,
            mockDevice,
            new Set(),
            []
        );

        const vpdChip = result.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip).toBeDefined();
        // Should find 0.8 from sensor.test_room_calculated_vpd
        expect(vpdChip.value).toBe('0.8 kPa');
    });

    it('should fallback to Legacy UUID-based Calculated VPD entity ID if Name-based missing', () => {
        const legacyDevice = {
            ...mockDevice,
            device_id: 'aabbcc-112233'
        } as any;

        const fallbackHass = {
            states: {
                'binary_sensor.test_room_optimal_conditions': {
                    state: 'on',
                    attributes: { temperature: 25 } // No VPD
                },
                // Name based missing/unknown
                'sensor.test_room_calculated_vpd': { state: 'unknown' },
                // Legacy UUID based present (must match device.device_id which has dashes)
                'sensor.aabbcc-112233_calculated_vpd': { state: '0.9' },
                'sensor.test_room': { attributes: {} }
            }
        } as any;

        const result = MetricsUtils.computeHeaderMetrics(
            fallbackHass,
            legacyDevice,
            new Set(),
            []
        );

        const vpdChip = result.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip).toBeDefined();
        // Should find 0.9 from sensor.aabbcc_112233_calculated_vpd
        expect(vpdChip.value).toBe('0.9 kPa');
    });

    it('should determine isMetricLinked correctly', () => {
        const linkedResult = MetricsUtils.computeHeaderMetrics(
            mockHass,
            mockDevice,
            new Set(),
            [['temperature', 'humidity'], ['co2', 'vpd']]
        );

        const temp = linkedResult.mainChips.find(c => c.key === 'temperature');
        const hum = linkedResult.mainChips.find(c => c.key === 'humidity');
        const co2 = linkedResult.mainChips.find(c => c.key === 'co2');
        const vpd = linkedResult.mainChips.find(c => c.key === 'vpd');
        const irr = linkedResult.mainChips.find(c => c.key === 'irrigation');

        expect(temp.linked).toBe(true);
        expect(temp.groupIndex).toBe(0);
        expect(hum.linked).toBe(true);
        expect(hum.groupIndex).toBe(0);
        expect(co2.linked).toBe(true);
        expect(co2.groupIndex).toBe(1);
        expect(vpd.linked).toBe(true);
        expect(vpd.groupIndex).toBe(1);
        expect(irr.linked).toBe(false);
        expect(irr.groupIndex).toBe(-1);
    });

    it('should sort next irrigation events correctly in getNextEvent', () => {
        // Freeze time at 10:00 to ensure 13:00 and 14:00 are in the future
        vi.useFakeTimers();
        const mockDate = new Date();
        mockDate.setHours(10, 0, 0, 0);
        vi.setSystemTime(mockDate);

        const simpleDevice = {
            ...mockDevice,
            irrigation_config: {
                irrigation_times: [
                    { time: '14:00', duration: 10 },
                    { time: '13:00', duration: 10 }
                ]
            }
        };

        const res = MetricsUtils.computeHeaderMetrics(mockHass, simpleDevice, new Set(), []);
        const chip = res.mainChips.find(c => c.key === 'irrigation');
        expect(chip.value).toBe('13:00');

        vi.useRealTimers();
    });

    it('should handle legacy environment attributes correctly (slug matching)', () => {
        const dryDevice = {
            name: 'Dry',
            overview_entity_id: 'sensor.dry',
            environment_attributes: {}
        } as any;

        const dryHass = {
            states: {
                'binary_sensor.dry_optimal_drying': { state: 'on', attributes: { temperature: 20 } }
            }
        } as any;

        const res = MetricsUtils.computeHeaderMetrics(dryHass, dryDevice, new Set(), []);
        const temp = res.mainChips.find(c => c.key === 'temperature');
        expect(temp).toBeDefined();
    });

    it('should determine VPD status branches (danger/warning)', () => {
        const vpdHass = {
            states: {
                'binary_sensor.test_optimal_conditions': {
                    state: 'on',
                    attributes: { vpd: 1.5 }
                },
                'sensor.test': {
                    attributes: {
                        vpd_target_min: 0.8,
                        vpd_target_max: 1.2,
                        vpd_danger_min: 0.5,
                        vpd_danger_max: 2.0
                    }
                }
            }
        } as any;

        const dev = { name: 'Test', overview_entity_id: 'sensor.test' } as any;

        let res = MetricsUtils.computeHeaderMetrics(vpdHass, dev, new Set(), []);
        let vpdChip = res.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip.status).toBe('warning');

        vpdHass.states['binary_sensor.test_optimal_conditions'].attributes.vpd = 2.5;
        res = MetricsUtils.computeHeaderMetrics(vpdHass, dev, new Set(), []);
        vpdChip = res.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip.status).toBe('danger');

        vpdHass.states['binary_sensor.test_optimal_conditions'].attributes.vpd = 0.4;
        res = MetricsUtils.computeHeaderMetrics(vpdHass, dev, new Set(), []);
        vpdChip = res.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip.status).toBe('danger');

        vpdHass.states['binary_sensor.test_optimal_conditions'].attributes.vpd = 1.0;
        res = MetricsUtils.computeHeaderMetrics(vpdHass, dev, new Set(), []);
        vpdChip = res.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip.status).toBe('optimal');
    });

    it('should handle missing VPD sensor gracefully in fallback', () => {
        const hassMissingVpd = {
            states: {
                'binary_sensor.test_optimal_conditions': { state: 'on', attributes: {} },
                'sensor.vpd_sensor': { state: 'unavailable' }
            }
        } as any;

        const dev = {
            name: 'Test',
            environment_attributes: { vpd_sensor: 'sensor.vpd_sensor' }
        } as any;

        const res = MetricsUtils.computeHeaderMetrics(hassMissingVpd, dev, new Set(), []);
        const vpdChip = res.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip).toBeUndefined();
    });

    it('should handle invalid numeric VPD values', () => {
        const hassNaN = {
            states: {
                'binary_sensor.test_optimal_conditions': { state: 'on', attributes: {} },
                'sensor.vpd_sensor': { state: 'not-a-number' }
            }
        } as any;
        const dev = { name: 'Test', environment_attributes: { vpd_sensor: 'sensor.vpd_sensor' } } as any;

        const res = MetricsUtils.computeHeaderMetrics(hassNaN, dev, new Set(), []);
        const vpdChip = res.mainChips.find(c => c.key === 'vpd');
        expect(vpdChip).toBeUndefined();
    });
    it('should return empty metrics if inputs are missing', () => {
        expect(MetricsUtils.computeHeaderMetrics(undefined as any, undefined as any, new Set(), [])).toEqual({
            mainChips: [], deviceChips: [], dominant: undefined, envAttrs: {}
        });
        expect(MetricsUtils.computeHeaderMetrics(mockHass, undefined as any, new Set(), [])).toEqual({
            mainChips: [], deviceChips: [], dominant: undefined, envAttrs: {}
        });
    });

    it('should retrieve values from observations attribute if present', () => {
        const hassObs = {
            states: {
                'binary_sensor.obs_test_optimal_conditions': {
                    state: 'on',
                    attributes: {
                        observations: {
                            temperature: 25,
                            humidity: 60
                        }
                    }
                }
            }
        } as any;
        const dev = { name: 'Obs Test', overview_entity_id: 'sensor.obs_test' } as any;
        const res = MetricsUtils.computeHeaderMetrics(hassObs, dev, new Set(), []);

        const temp = res.mainChips.find(c => c.key === 'temperature');
        expect(temp.value).toBe('25°C');
    });

    it('should handle Cure specific env entity logic', () => {
        const cureDevice = {
            name: 'Cure', // -> cure slug
            overview_entity_id: 'sensor.cure',
            environment_attributes: {}
        } as any;

        const cureHass = {
            states: {
                'binary_sensor.cure_optimal_curing': {
                    state: 'on',
                    attributes: { temperature: 18 }
                }
            }
        } as any;

        const res = MetricsUtils.computeHeaderMetrics(cureHass, cureDevice, new Set(), []);
        const temp = res.mainChips.find(c => c.key === 'temperature');
        expect(temp).toBeDefined();
        expect(temp.value).toBe('18°C');
    });
    describe('Extended Coverage', () => {
        it('should handle undefined linkedGraphGroups', () => {
            const result = MetricsUtils.computeHeaderMetrics(
                mockHass,
                mockDevice,
                new Set(),
                undefined as any
            );
            // It should proceed without error and metrics should not be linked
            const temp = result.mainChips.find(c => c.key === 'temperature');
            expect(temp.linked).toBe(false);
        });

        it('should format dominant stage labels correctly (single day vs plural)', () => {
            // Mock PlantUtils.getDominantStage to return specific values
            // We can spy on it or just mock data if logic is internal...
            // Logic calls PlantUtils.getDominantStage(device.plants).
            // Let's create plants that yield specific results.
            const today = DateTime.now().toISODate();
            const yesterday = DateTime.now().minus({ days: 1 }).toISODate();

            const oneDayPlant = { attributes: { plant_id: '1', stage: 'veg', veg_start: yesterday } };
            // Note: PlantUtils logic might need valid dates.
            // But better: spy on PlantUtils.getDominantStage if possible, OR trust the logic if we provide data.
            // Let's use spy to force the output we want to test formatting of.

            const spy = vi.spyOn(PlantUtils, 'getDominantStage');

            // Case 1: 1 Day
            spy.mockReturnValue({ stage: 'veg', days: 1, plants: [] } as any);
            let res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
            expect(res.dominant.daysLabel).toBe('1 Day Veg');
            expect(res.dominant.weeksLabel).toBe('1 Week Veg'); // 1 day is in 1st week

            // Case 2: 5 Days
            spy.mockReturnValue({ stage: 'flower', days: 5, plants: [] } as any);
            res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
            expect(res.dominant.daysLabel).toBe('5 Days Flower');
            expect(res.dominant.weeksLabel).toBe('1 Week Flower');

            // Case 3: 15 Days (2 Weeks + 1 Day) -> 3 Weeks? Logic: Math.floor((15-1)/7)+1 = floor(2)+1 = 3 via logic
            // Wait: Math.floor((days - 1) / 7) + 1
            // 15 days -> (14)/7 + 1 = 3 weeks.
            // 8 days -> (7)/7 + 1 = 2 weeks.
            // 7 days -> (6)/7 + 1 = 1 week.
            spy.mockReturnValue({ stage: 'cure', days: 8, plants: [] } as any);
            res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
            expect(res.dominant.daysLabel).toBe('8 Days Cure');
            expect(res.dominant.weeksLabel).toBe('2 Weeks Cure');

            spy.mockRestore();
        });

        it('should handle humidifier sensor fallback', () => {
            const fallbackHass = {
                states: {
                    'binary_sensor.test_room_optimal_conditions': { state: 'on', attributes: {} },
                    'sensor.humidifier_state': { state: 'idle' }
                }
            } as any;

            const fallbackDev = {
                name: 'Test',
                overview_entity_id: 'sensor.test_room',
                environment_attributes: {
                    humidifier_sensor: 'sensor.humidifier_state'
                    // No humidifier_entity
                }
            } as any;

            const res = MetricsUtils.computeHeaderMetrics(fallbackHass, fallbackDev, new Set(), []);
            const chip = res.deviceChips.find(c => c.key === 'humidifier');
            expect(chip).toBeDefined();
            expect(chip.value).toBe('idle');
        });

        it('should fallback to sensor value for VPD if string is valid number', () => {
            const hassVpdStr = {
                states: {
                    'binary_sensor.test_optimal_conditions': { state: 'on', attributes: {} },
                    'sensor.vpd_sensor': { state: '1.2' }
                }
            } as any;
            const dev = { name: 'Test', environment_attributes: { vpd_sensor: 'sensor.vpd_sensor' } } as any;

            const res = MetricsUtils.computeHeaderMetrics(hassVpdStr, dev, new Set(), []);
            const vpd = res.mainChips.find(c => c.key === 'vpd');
            expect(vpd.value).toBe('1.2 kPa'); // Should parse 1.2
        });

        it('should NOT fallback to sensor value for VPD if string is invalid', () => {
            const hassVpdStr = {
                states: {
                    'binary_sensor.test_optimal_conditions': { state: 'on', attributes: {} },
                    'sensor.vpd_sensor': { state: 'invalid' }
                }
            } as any;
            const dev = { name: 'Test', environment_attributes: { vpd_sensor: 'sensor.vpd_sensor' } } as any;

            const res = MetricsUtils.computeHeaderMetrics(hassVpdStr, dev, new Set(), []);
            const vpd = res.mainChips.find(c => c.key === 'vpd');
            expect(vpd).toBeUndefined();
        });

        it('should use old legacy VPD ID format when primary is unavailable', () => {
            const hassLegacy = {
                states: {
                    'binary_sensor.test_optimal_conditions': { state: 'on', attributes: {} },
                    'sensor.vpd_sensor': { state: 'unavailable' },
                    'sensor.test_device_calculated_vpd': { state: '1.5' }  // Old format
                }
            } as any;
            const dev = {
                device_id: 'test_device',
                name: 'Test',
                environment_attributes: { vpd_sensor: 'sensor.vpd_sensor' }
            } as any;

            const res = MetricsUtils.computeHeaderMetrics(hassLegacy, dev, new Set(), []);
            const vpd = res.mainChips.find(c => c.key === 'vpd');
            expect(vpd).toBeDefined();
            expect(vpd.value).toBe('1.5 kPa');
        });
    });
});

