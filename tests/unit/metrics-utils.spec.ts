import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricsUtils } from '../../src/utils/metrics-utils';
import { PlantUtils } from '../../src/utils/plant-utils';
import { EntityState, StatusLevel, MetricKey } from '../../src/constants';
import { DateTime } from 'luxon';

// Mock PlantUtils
vi.mock('../../src/utils/plant-utils', () => ({
    PlantUtils: {
        getDominantStage: vi.fn(),
        getPlantStageIcon: vi.fn(),
    }
}));

describe('MetricsUtils', () => {
    let mockHass: any;
    let mockDevice: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockHass = {
            states: {}
        };

        mockDevice = {
            name: 'Grow Tent',
            deviceId: 'gs1',
            plants: [],
            environmentAttributes: {},
            irrigationConfig: {
                irrigationTimes: [],
                drainTimes: []
            }
        };

        // Default mock implementation
        (PlantUtils.getDominantStage as any).mockReturnValue(undefined);
        (PlantUtils.getPlantStageIcon as any).mockReturnValue('mdi:flower');
    });

    describe('computeHeaderMetrics', () => {
        it('should return empty keys if no device or hass', () => {
            const res = MetricsUtils.computeHeaderMetrics(undefined as any, undefined as any, new Set(), []);
            expect(res.mainChips).toEqual([]);
        });

        it('should compute dominant stage info', () => {
            (PlantUtils.getDominantStage as any).mockReturnValue({ stage: 'flowering', days: 10 });

            const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);

            expect(res.dominant).toBeDefined();
            expect(res.dominant?.daysLabel).toBe('10 Days Flowering');
            expect(res.dominant?.weeksLabel).toBe('2 Weeks Flowering');
        });

        describe('Environment Sensors', () => {
            beforeEach(() => {
                mockDevice.environmentAttributes = {
                    temperatureSensor: 'sensor.temp',
                    humiditySensor: 'sensor.hum',
                    co2Sensor: 'sensor.co2',
                    vpdSensor: 'sensor.vpd'
                };
            });

            it('should pick up primary sensors', () => {
                mockHass.states = {
                    'sensor.temp': { state: '25.5' },
                    'sensor.hum': { state: '60' },
                    'sensor.co2': { state: '400' },
                    'sensor.vpd': { state: '1.2' },
                    'binary_sensor.grow_tent_optimal_conditions': { state: 'on', attributes: {} }
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);

                const tempChip = res.mainChips.find(c => c.key === MetricKey.TEMPERATURE);
                const humChip = res.mainChips.find(c => c.key === MetricKey.HUMIDITY);
                const vpdChip = res.mainChips.find(c => c.key === MetricKey.VPD);

                expect(tempChip?.value).toBe('25.5°C');
                expect(humChip?.value).toBe('60%');
                expect(vpdChip?.value).toBe('1.2 kPa');
            });

            it('should handle unavailable states', () => {
                mockHass.states = {
                    'sensor.temp': { state: 'unavailable' },
                    'sensor.hum': { state: 'known' },
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);

                const tempChip = res.mainChips.find(c => c.key === MetricKey.TEMPERATURE);
                expect(tempChip).toBeUndefined();
            });

            it('should aggregate multiple sensors', () => {
                mockDevice.environmentAttributes.temperatureSensors = ['sensor.t1', 'sensor.t2'];
                mockHass.states = {
                    'sensor.t1': { state: '20' },
                    'sensor.t2': { state: '22' },
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tempChip = res.mainChips.find(c => c.key === MetricKey.TEMPERATURE);

                expect(tempChip?.value).toBe('Multiple');
                expect(tempChip?.multiValues).toEqual(['20°C', '22°C']);
            });
        });

        describe('VPD Logic', () => {
            it('should calculate VPD status based on thresholds', () => {
                mockDevice.overviewEntityId = 'sensor.overview';
                mockHass.states = {
                    'sensor.vpd': { state: '1.5' },
                    'sensor.overview': {
                        attributes: {
                            soil_moisture_value: 0,
                            vpd_target_min: 0.8,
                            vpd_target_max: 1.2,
                            vpd_danger_min: 0.4,
                            vpd_danger_max: 1.6
                        }
                    },
                    'binary_sensor.grow_tent_optimal_conditions': { state: 'on', attributes: {} }
                };
                mockDevice.environmentAttributes = { vpdSensor: 'sensor.vpd' };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const vpdChip = res.mainChips.find(c => c.key === MetricKey.VPD);

                expect(vpdChip?.status).toBe(StatusLevel.WARNING);
            });

            it('should fallback to calculated VPD sensor if primary missing', () => {
                mockHass.states = {
                    'sensor.grow_tent_calculated_vpd': { state: '1.1' },
                    'binary_sensor.grow_tent_optimal_conditions': { state: 'on', attributes: {} }
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const vpdChip = res.mainChips.find(c => c.key === MetricKey.VPD);
                expect(vpdChip?.value).toBe('1.1 kPa');
            });

            it('should fallback to legacy usage of uuid based calculated vpd', () => {
                const device = { ...mockDevice, deviceId: 'uuid123', name: 'Tent' };
                // Primary: sensor.tent_calculated_vpd (missing)
                // Legacy: sensor.uuid123_calculated_vpd (present)

                mockHass.states = {
                    'sensor.uuid123_calculated_vpd': { state: '1.2' },
                    'binary_sensor.grow_tent_optimal_conditions': { state: 'on', attributes: {} }
                };

                device.environmentAttributes = {}; // No explicit vpdSensor

                const res = MetricsUtils.computeHeaderMetrics(mockHass, device, new Set(), []);
                const vpdChip = res.mainChips.find(c => c.key === MetricKey.VPD);
                expect(vpdChip?.value).toBe('1.2 kPa');
            });

            it('should mark VPD as DANGER if outside danger limits', () => {
                // Setup thresholds
                mockHass.states = {
                    'sensor.vpd': { state: '3.0' }, // Danger (max 1.6)
                    'sensor.overview': {
                        attributes: {
                            vpd_target_min: 0.8, vpd_target_max: 1.2,
                            vpd_danger_min: 0.4, vpd_danger_max: 1.6,
                            // No predefined calculate status
                            vpd_status: 'unknown'
                        }
                    },
                    'binary_sensor.grow_tent_optimal_conditions': { state: 'on', attributes: {} }
                };
                mockDevice.environmentAttributes = { vpdSensor: 'sensor.vpd' };
                mockDevice.overviewEntityId = 'sensor.overview';

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const vpdChip = res.mainChips.find(c => c.key === MetricKey.VPD);
                expect(vpdChip?.status).toBe(StatusLevel.DANGER);
            });

            it('should mark VPD as OPTIMAL if within target limits', () => {
                mockHass.states = {
                    'sensor.vpd': { state: '1.0' }, // Target (0.8-1.2)
                    'sensor.overview': {
                        attributes: {
                            vpd_target_min: 0.8, vpd_target_max: 1.2,
                            vpd_danger_min: 0.4, vpd_danger_max: 1.6,
                            vpd_status: 'unknown'
                        }
                    },
                    'binary_sensor.grow_tent_optimal_conditions': { state: 'on', attributes: {} }
                };
                mockDevice.environmentAttributes = { vpdSensor: 'sensor.vpd' };
                mockDevice.overviewEntityId = 'sensor.overview';

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const vpdChip = res.mainChips.find(c => c.key === MetricKey.VPD);
                expect(vpdChip?.status).toBe(StatusLevel.OPTIMAL);
            });
        });

        describe('Irrigation & Drain', () => {
            it('should compute next irrigation time', () => {
                mockDevice.irrigationConfig.irrigationTimes = [{ time: '23:59', duration: 10 }];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const irrChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION);
                expect(irrChip?.value).toBe('23:59');
            });

            it('should aggregate tanks', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    { sensorEntity: 'sensor.tank1', fillLevel: 50, isWarning: false },
                    { sensorEntity: 'sensor.tank2', fillLevel: 30, isWarning: true }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.value).toBe('40%'); // Average
                expect(tankChip?.status).toBeUndefined(); // No depletion data
            });

            it('should handle single tank', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    { sensorEntity: 'sensor.tank1', fillLevel: 75, isWarning: true }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.value).toBe('75%');
                expect(tankChip?.status).toBeUndefined(); // No depletion data
            });

            it('should display tank with depletion time in hours when < 48h', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        name: 'Main Tank',
                        fillLevel: 40,
                        isWarning: false,
                        hoursRemaining: 18,
                        depletionStatus: 'depleting'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.value).toBe('40% 18h');
                expect(tankChip?.tooltip).toBe('Main Tank: 40% (18h remaining)');
            });

            it('should display tank with depletion time in days when >= 48h', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        name: 'Main Tank',
                        fillLevel: 80,
                        isWarning: false,
                        hoursRemaining: 72,
                        depletionStatus: 'depleting'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.value).toBe('80% 3d');
            });

            it('should show DANGER status when hours_remaining < 12', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        fillLevel: 15,
                        isWarning: false,
                        hoursRemaining: 8,
                        depletionStatus: 'depleting'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.status).toBe(StatusLevel.DANGER);
                expect(tankChip?.value).toBe('15% 8h');
            });

            it('should show WARNING status when hours_remaining < 24', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        fillLevel: 30,
                        isWarning: false,
                        hoursRemaining: 20,
                        depletionStatus: 'depleting'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.status).toBe(StatusLevel.WARNING);
            });

            it('should show OPTIMAL status when hours_remaining >= 48', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        fillLevel: 90,
                        isWarning: false,
                        hoursRemaining: 120,
                        depletionStatus: 'depleting'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.status).toBe(StatusLevel.OPTIMAL);
            });

            it('should show no status when depletion_status is insufficient_data', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        fillLevel: 50,
                        isWarning: false,
                        hoursRemaining: null,
                        depletionStatus: 'insufficient_data'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.status).toBeUndefined();
                expect(tankChip?.value).toBe('50%'); // No time appended
            });

            it('should show OPTIMAL status when tank is refilling', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        fillLevel: 60,
                        isWarning: false,
                        hoursRemaining: null,
                        depletionStatus: 'refilling'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.status).toBe(StatusLevel.OPTIMAL);
            });

            it('should handle multiple tanks with depletion data', () => {
                mockDevice.environmentAttributes.irrigationTanks = [
                    {
                        sensorEntity: 'sensor.tank1',
                        fillLevel: 50,
                        isWarning: false,
                        hoursRemaining: 10,
                        depletionStatus: 'depleting'
                    },
                    {
                        sensorEntity: 'sensor.tank2',
                        fillLevel: 30,
                        isWarning: false,
                        hoursRemaining: 60,
                        depletionStatus: 'depleting'
                    }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tankChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION_TANK_LEVEL);

                expect(tankChip?.value).toBe('40%'); // Average
                expect(tankChip?.multiValues).toEqual(['50% 10h', '30% 2d']);
                expect(tankChip?.status).toBe(StatusLevel.DANGER); // Most urgent
            });

            it('should pick nearest future event from multiple times', () => {
                const now = DateTime.now();
                const past = now.minus({ minutes: 30 }).toFormat('HH:mm');
                const soon = now.plus({ minutes: 30 }).toFormat('HH:mm');
                const later = now.plus({ minutes: 60 }).toFormat('HH:mm');

                mockDevice.irrigationConfig.irrigationTimes = [
                    { time: later, duration: 10 },
                    { time: past, duration: 10 },
                    { time: soon, duration: 10 }
                ];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const irrChip = res.mainChips.find(c => c.key === MetricKey.IRRIGATION);
                expect(irrChip?.value).toBe(soon);
            });
        });

        describe('Device Chips', () => {
            it('should create device chips for equipment', () => {
                mockDevice.environmentAttributes = {
                    exhaustEntity: 'fan.exhaust',
                    exhaustFanEntities: [],
                    humidifierEntity: 'humidifier.main',
                    dehumidifierEntity: 'switch.dehum',
                    circulationFanEntity: 'fan.circ',
                    lightSensor: 'sensor.light'
                };

                mockHass.states = {
                    'fan.exhaust': { state: 'on' },
                    'humidifier.main': { state: 'off' },
                    'switch.dehum': { state: 'on' },
                    'fan.circ': { state: 'on' },
                    'binary_sensor.grow_tent_optimal_conditions': {
                        state: 'on',
                        attributes: { is_lights_on: true }
                    }
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);

                const exhaust = res.deviceChips.find(c => c.key === MetricKey.EXHAUST);
                expect(exhaust?.value).toBe('on');

                const light = res.deviceChips.find(c => c.key === MetricKey.LIGHT);
                expect(light?.value).toBe('On');
            });
        });

        describe('Special Growspaces', () => {
            it('should handle cure slug', () => {
                mockDevice.name = 'Cure';
                mockHass.states = {
                    'binary_sensor.cure_optimal_curing': { state: 'on', attributes: {} }
                };
                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const opt = res.mainChips.find(c => c.key === MetricKey.OPTIMAL);
                expect(opt).toBeDefined();
            });

            it('should handle dry slug', () => {
                mockDevice.name = 'Dry';
                mockHass.states = {
                    'binary_sensor.dry_optimal_drying': { state: 'on', attributes: {} }
                };
                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const opt = res.mainChips.find(c => c.key === MetricKey.OPTIMAL);
                expect(opt).toBeDefined();
            });
        });

        describe('Edge Cases', () => {
            it('should read from observations attribute on envEntity if primary sensor missing', () => {
                mockHass.states = {
                    'binary_sensor.grow_tent_optimal_conditions': {
                        state: 'on',
                        attributes: {
                            observations: { temperature: 24.5 }
                        }
                    }
                };
                mockDevice.environmentAttributes = { temperatureSensor: 'sensor.missing' };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const tempChip = res.mainChips.find(c => c.key === MetricKey.TEMPERATURE);
                expect(tempChip?.value).toBe('24.5°C');
            });

            it('should mark linked metrics', () => {
                mockHass.states = { 'sensor.temp': { state: '20' } };
                mockDevice.environmentAttributes = { temperatureSensor: 'sensor.temp' };
                const linkedGroups = [[MetricKey.TEMPERATURE, MetricKey.HUMIDITY]];

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), linkedGroups);
                const tempChip = res.mainChips.find(c => c.key === MetricKey.TEMPERATURE);

                expect(tempChip?.linked).toBe(true);
                expect(tempChip?.groupIndex).toBe(0);
            });

            it('should show reasons for non-optimal conditions', () => {
                mockHass.states = {
                    'binary_sensor.grow_tent_optimal_conditions': {
                        state: 'off',
                        attributes: { reasons: ['Too hot', 'Low humidity'] }
                    }
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const optChip = res.mainChips.find(c => c.key === MetricKey.OPTIMAL);

                expect(optChip?.value).toContain('Too hot, Low humidity');
                expect(optChip?.status).toBe(StatusLevel.WARNING);
            });

            it('should show "Not Optimal" if off but no reasons', () => {
                mockHass.states = {
                    'binary_sensor.grow_tent_optimal_conditions': {
                        state: 'off',
                        attributes: { reasons: [] }
                    }
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const optChip = res.mainChips.find(c => c.key === MetricKey.OPTIMAL);

                expect(optChip?.value).toBe('Not Optimal');
                expect(optChip?.status).toBe(StatusLevel.WARNING);
            });

            it('should aggregate multiple device entities', () => {
                mockDevice.environmentAttributes = {
                    exhaustFanEntities: ['fan.ex1', 'fan.ex2']
                };
                mockHass.states = {
                    'fan.ex1': { state: 'on' },
                    'fan.ex2': { state: 'off' }
                };

                const res = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, new Set(), []);
                const exhaust = res.deviceChips.find(c => c.key === MetricKey.EXHAUST);

                expect(exhaust?.value).toBe('Multiple');
                expect(exhaust?.multiValues).toEqual(['on', 'off']);
            });
        });
    });
});
