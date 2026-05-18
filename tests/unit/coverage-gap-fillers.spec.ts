
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../../src/services/sync-service';
import { MetricsUtils } from '../../src/utils/metrics-utils';
import { DataService } from '../../src/data-service';
import { GrowspaceDataStore } from '../../src/store/core/data-store';
import { GrowspaceUIStore } from '../../src/store/ui/ui-store';
import { GrowspaceDevice, PlantEntity } from '../../src/types';
import { DateTime } from 'luxon';
import { MetricKey, EntityState, StatusLevel } from '../../src/constants';

// Mocks
vi.mock('../../src/data-service');
vi.mock('../../src/store/core/data-store');
vi.mock('../../src/store/ui/ui-store');

// Mock PlantUtils to avoid dependency issues if needed, or use real one if it's pure
// MetricsUtils uses PlantUtils static methods. Ideally we let it run.

describe('Coverage Gap Fillers', () => {

    describe('SyncService Coverage', () => {
        let syncService: SyncService;
        let mockDataService: any;
        let mockDataStore: any;
        let mockUIStore: any;
        let mockGridStore: any;

        beforeEach(() => {
            mockDataService = new DataService() as any;
            mockDataStore = new GrowspaceDataStore() as any;
            mockUIStore = new GrowspaceUIStore() as any;

            // Setup default mock returns for atomic getters
            mockDataStore.$devices = { get: vi.fn(() => []) };
            mockDataStore.$wsDataCache = { get: vi.fn(() => ({})) };
            mockDataStore.$config = { get: vi.fn(() => ({})) };

            mockGridStore = {
                $selectedDevice: { get: vi.fn(() => null) },
                setSelectedDevice: vi.fn(),
            };

            mockUIStore.$defaultApplied = { get: vi.fn(() => false) };

            mockDataStore.setDevices = vi.fn();
            mockUIStore.setDefaultApplied = vi.fn();
            // Mock getGrowspaceDevices to return mapped devices
            mockDataService.getGrowspaceDevices = vi.fn((cache) => []);

            syncService = new SyncService(mockDataService, mockDataStore, mockUIStore, mockGridStore);
        });

        it('should add plant entity IDs to watchedEntities (lines 110)', () => {
            const devices: GrowspaceDevice[] = [{
                deviceId: 'd1',
                name: 'Device 1',
                plants: [
                    { entity_id: 'sensor.plant1' } as PlantEntity
                ]
            } as any];

            (mockDataService.getGrowspaceDevices as any).mockReturnValue(devices);
            (mockDataStore.$devices.get as any).mockReturnValue([]); // different to trigger update

            syncService.updateDevicesState();

            // Verify watchedEntities private member
            const watched = (syncService as any)._watchedEntities as Set<string>;
            expect(watched.has('sensor.plant1')).toBe(true);
        });

        it('should NOT auto-select device if defaultApplied is true (line 133)', () => {
            const devices: GrowspaceDevice[] = [{
                deviceId: 'd1',
                name: 'Device 1'
            } as any];

            (mockDataService.getGrowspaceDevices as any).mockReturnValue(devices);
            (mockDataStore.$devices.get as any).mockReturnValue(devices); // same devices to avoid setDevices call, but focus on selection logic

            // Current selection is null
            (mockGridStore.$selectedDevice.get as any).mockReturnValue(null);

            // BUT default is already applied
            (mockUIStore.$defaultApplied.get as any).mockReturnValue(true);

            syncService.updateDevicesState();

            expect(mockGridStore.setSelectedDevice).not.toHaveBeenCalled();
            expect(mockUIStore.setDefaultApplied).not.toHaveBeenCalled();
        });
    });

    describe('MetricsUtils Coverage', () => {
        const mockHass: any = {
            states: {
                'sensor.calc_vpd': { state: '1.2', attributes: {} },
                'sensor.d1_calculated_vpd': { state: '1.5', attributes: {} }, // Legace fallback
                'binary_sensor.device_1_optimal_conditions': {
                    state: 'on',
                    attributes: {
                        temperature: 25,
                        humidity: 60
                        // vpd missing to trigger fallback
                    }
                }
            }
        };

        const mockDevice: GrowspaceDevice = {
            deviceId: 'd1',
            name: 'Device 1',
            plants: [],
            environmentAttributes: {},
            irrigationConfig: {
                irrigationTimes: [],
                drainTimes: []
            }
        } as any;

        it('should compute irrigation/drain next events (Line 209-226)', () => {
            // Future time
            const future = DateTime.now().plus({ hours: 1 });
            const timeStr = future.toFormat('HH:mm');

            const deviceWithSched = {
                ...mockDevice,
                irrigationConfig: {
                    irrigationTimes: [{ time: timeStr, duration: 10, gallons: 1 }],
                    drainTimes: []
                }
            };

            const metrics = MetricsUtils.computeHeaderMetrics(mockHass, deviceWithSched, new Set(), []);

            const irrChip = metrics.mainChips.find(c => c.key === MetricKey.IRRIGATION);
            expect(irrChip).toBeDefined();
            expect(irrChip?.value).toBe(timeStr);
        });

        it('should correctly mark chips as active and linked (Lines 216-231)', () => {
            // Setup linked graph group
            const linkedGroups = [[MetricKey.TEMPERATURE, MetricKey.HUMIDITY]];
            // Setup active set
            const activeSet = new Set([MetricKey.TEMPERATURE]);

            const metrics = MetricsUtils.computeHeaderMetrics(mockHass, mockDevice, activeSet, linkedGroups);

            const tempChip = metrics.mainChips.find(c => c.key === MetricKey.TEMPERATURE);
            expect(tempChip).toBeDefined();
            expect(tempChip?.active).toBe(true);
            expect(tempChip?.linked).toBe(true);
            expect(tempChip?.groupIndex).toBe(0);

            const humChip = metrics.mainChips.find(c => c.key === MetricKey.HUMIDITY);
            expect(humChip).toBeDefined();
            expect(humChip?.active).toBe(false); // Not active itself
            expect(humChip?.linked).toBe(true); // But is linked
        });

        it('should use legacy calculated vpd fallback (Line 160)', () => {
            // Env entity has NO vpd
            const hassNoVpd = {
                states: {
                    'binary_sensor.device_1_optimal_conditions': {
                        state: 'on',
                        attributes: {
                            temperature: 25,
                            humidity: 60,
                            vpd: undefined // Explictly undefined
                        }
                    },
                    // Legacy ID fallback
                    'sensor.d1_calculated_vpd': { state: '1.5', attributes: {} }
                }
            };

            const metrics = MetricsUtils.computeHeaderMetrics(hassNoVpd as any, mockDevice, new Set(), []);

            const vpdChip = metrics.mainChips.find(c => c.key === MetricKey.VPD);
            expect(vpdChip).toBeDefined();
            expect(vpdChip?.value).toBe('1.5 kPa');
        });

        it('should handle dominant stage logic (Lines 85-89)', () => {
            // Mock device with plants having correct structure
            const deviceWithPlants = {
                ...mockDevice,
                plants: [
                    {
                        entity_id: 'p1',
                        state: 'veg', // Key fix: define state so normalized stage is correct
                        attributes: {
                            veg_days: 10
                        }
                    },
                    {
                        entity_id: 'p2',
                        state: 'veg',
                        attributes: {
                            veg_days: 5
                        }
                    }
                ] as any
            };

            const metrics = MetricsUtils.computeHeaderMetrics(mockHass, deviceWithPlants, new Set(), []);

            expect(metrics.dominant).toBeDefined();
            // Adjust expectation to match typical output format '10 Days Veg' or similar
            // Note: getDominantStage returns { stage: 'veg', days: 10 }
            // computeHeaderMetrics: daysLabel: `${dominantRaw.days} Day... ${stageName}`
            expect(metrics.dominant?.daysLabel).toBe('10 Days Veg');
        });

        it('should clean overview entity ID (Line 99)', () => {
            const deviceOverview = {
                ...mockDevice,
                overviewEntityId: 'sensor.my_grow_overview'
            };
            // Internal slug usage check is hard without spying, but we can infer from envEntityId construction logic if it used the slug?
            // "slug = device.overviewEntityId.replace..."
            // "envEntityId = binary_sensor.${slug}_optimal_conditions"

            // If overview is 'sensor.my_grow_overview', slug become 'my_grow'
            // envEntityId -> binary_sensor.my_grow_optimal_conditions

            // Let's ensure access to that state
            const hassSpecial = {
                states: {
                    'binary_sensor.my_grow_optimal_conditions': { state: 'on', attributes: {} }
                }
            };

            const metrics = MetricsUtils.computeHeaderMetrics(hassSpecial as any, deviceOverview, new Set(), []);
            // If it found the entity, the 'optimal' chip should exist and be Optimal
            const optChip = metrics.mainChips.find(c => c.key === MetricKey.OPTIMAL);
            expect(optChip).toBeDefined();
        });

        it('should handle Cure/Dry special slugs (Lines 107-109)', () => {
            const cureDevice = { ...mockDevice, name: 'Cure' };
            const dryDevice = { ...mockDevice, name: 'Dry' };

            const hassSpecial = {
                states: {
                    'binary_sensor.cure_optimal_curing': { state: 'on', attributes: {} },
                    'binary_sensor.dry_optimal_drying': { state: 'on', attributes: {} }
                }
            };

            const mCure = MetricsUtils.computeHeaderMetrics(hassSpecial as any, cureDevice, new Set(), []);
            const mDry = MetricsUtils.computeHeaderMetrics(hassSpecial as any, dryDevice, new Set(), []);

            expect(mCure.mainChips.find(c => c.key === MetricKey.OPTIMAL)).toBeDefined();
            expect(mDry.mainChips.find(c => c.key === MetricKey.OPTIMAL)).toBeDefined();
        });

        it('should use VPD sensor from attributes (Lines 126-129)', () => {
            const hassVpdSensor = {
                states: {
                    'sensor.external_vpd': { state: '1.8', attributes: {} }
                }
            };
            const deviceVpd = {
                ...mockDevice,
                environmentAttributes: {
                    vpdSensor: 'sensor.external_vpd'
                }
            };

            const metrics = MetricsUtils.computeHeaderMetrics(hassVpdSensor as any, deviceVpd, new Set(), []);
            const vpdChip = metrics.mainChips.find(c => c.key === MetricKey.VPD);
            expect(vpdChip?.value).toBe('1.8 kPa');
        });

        it('should handle VPD status danger/warning (Lines 179-184)', () => {
            const hassStatus = {
                states: {
                    // Slug derived from overviewEntityId 'sensor.overview' -> 'overview'
                    'binary_sensor.overview_optimal_conditions': { state: 'off', attributes: { vpd: 3.0 } },
                    'sensor.overview': {
                        attributes: {
                            vpd_target_min: 0.8, vpd_target_max: 1.2,
                            vpd_danger_min: 0.4, vpd_danger_max: 2.5
                        }
                    }
                }
            };
            // Ensure device name matches slug logic for "device_1"
            const deviceStatus = {
                ...mockDevice,
                overviewEntityId: 'sensor.overview'
            };

            const metrics = MetricsUtils.computeHeaderMetrics(hassStatus as any, deviceStatus, new Set(), []);
            const vpdChip = metrics.mainChips.find(c => c.key === MetricKey.VPD);

            // Detailed Debug
            if (vpdChip?.status !== StatusLevel.DANGER) {
                console.log('VPD Chip DEBUG:', JSON.stringify(vpdChip, null, 2));
                console.log('Metrics Main Chips:', JSON.stringify(metrics.mainChips, null, 2));
            }
            expect(vpdChip?.status).toBe(StatusLevel.DANGER);
        });

        it('should handle VPD status warning and optimal', () => {
            const baseAttr = {
                vpd_target_min: 1.0, vpd_target_max: 1.5,
                vpd_danger_min: 0.5, vpd_danger_max: 2.0
            };
            // Warning: 0.8 (between danger 0.5 and target 1.0)
            const hassWarn = {
                states: {
                    'binary_sensor.overview_optimal_conditions': { state: 'off', attributes: { vpd: 0.8 } },
                    'sensor.overview': { attributes: baseAttr }
                }
            };
            const deviceWarn = { ...mockDevice, overviewEntityId: 'sensor.overview' };
            const mWarn = MetricsUtils.computeHeaderMetrics(hassWarn as any, deviceWarn, new Set(), []);
            expect(mWarn.mainChips.find(c => c.key === MetricKey.VPD)?.status).toBe(StatusLevel.WARNING);

            // Optimal: 1.2 (between 1.0 and 1.5)
            const hassOpt = {
                states: {
                    'binary_sensor.overview_optimal_conditions': { state: 'on', attributes: { vpd: 1.2 } },
                    'sensor.overview': { attributes: baseAttr }
                }
            };
            const mOpt = MetricsUtils.computeHeaderMetrics(hassOpt as any, deviceWarn, new Set(), []);
            expect(mOpt.mainChips.find(c => c.key === MetricKey.VPD)?.status).toBe(StatusLevel.OPTIMAL);
        });

        it('should fetch attributes from observations (Line 49)', () => {
            const hassObs = {
                states: {
                    'binary_sensor.device_1_optimal_conditions': {
                        state: 'on',
                        attributes: {
                            observations: {
                                temperature: 28
                            }
                        }
                    }
                }
            };
            const metrics = MetricsUtils.computeHeaderMetrics(hassObs as any, mockDevice, new Set(), []);
            const tempChip = metrics.mainChips.find(c => c.key === MetricKey.TEMPERATURE);
            expect(tempChip?.value).toBe('28°C');
        });

        it('should return defaults if inputs missing (Lines 79-80)', () => {
            const res = MetricsUtils.computeHeaderMetrics(undefined as any, undefined as any, new Set(), []);
            expect(res.mainChips).toEqual([]);
        });

        it('should handle Optimal Label Reasons (Lines 235-240)', () => {
            const hassReason = {
                states: {
                    'binary_sensor.device_1_optimal_conditions': {
                        state: 'off',
                        attributes: { reasons: ['Temp High', 'Humidity Low'] }
                    }
                }
            };
            const metrics = MetricsUtils.computeHeaderMetrics(hassReason as any, mockDevice, new Set(), []);
            const optChip = metrics.mainChips.find(c => c.key === MetricKey.OPTIMAL);
            expect(optChip?.value).toContain('Temp High, Humidity Low');
        });

        it('should handle Aggregate State (Lines 296-324)', () => {
            const hassAgg = {
                states: {
                    'fan.e1': { state: 'on' },
                    'fan.e2': { state: 'off' },
                    'fan.single': { state: 'on' },
                    'sensor.fan': { state: 'on' }
                }
            };

            // Case 1: Multiple values
            const deviceMulti = {
                ...mockDevice,
                environmentAttributes: {
                    exhaustFanEntities: ['fan.e1', 'fan.e2']
                }
            };
            const mMulti = MetricsUtils.computeHeaderMetrics(hassAgg as any, deviceMulti, new Set(), []);
            const fanChipMulti = mMulti.deviceChips.find(c => c.key === MetricKey.EXHAUST);
            expect(fanChipMulti?.value).toBe('Multiple');
            expect(fanChipMulti?.multiValues).toEqual(['on', 'off']);

            // Case 2: Single via list
            const deviceSingleList = {
                ...mockDevice,
                environmentAttributes: {
                    exhaustFanEntities: ['fan.e1']
                }
            };
            const mSingleList = MetricsUtils.computeHeaderMetrics(hassAgg as any, deviceSingleList, new Set(), []);
            expect(mSingleList.deviceChips.find(c => c.key === MetricKey.EXHAUST)?.value).toBe('on');

            // Case 3: Single via singular prop
            const deviceSingle = {
                ...mockDevice,
                environmentAttributes: {
                    exhaustEntity: 'fan.single'
                }
            };
            const mSingle = MetricsUtils.computeHeaderMetrics(hassAgg as any, deviceSingle, new Set(), []);
            expect(mSingle.deviceChips.find(c => c.key === MetricKey.EXHAUST)?.value).toBe('on');

            // Case 4: Sensor fallback
            const deviceSensor = {
                ...mockDevice,
                environmentAttributes: {
                    exhaustSensor: 'sensor.fan'
                }
            };
            const mSensor = MetricsUtils.computeHeaderMetrics(hassAgg as any, deviceSensor, new Set(), []);
            expect(mSensor.deviceChips.find(c => c.key === MetricKey.EXHAUST)?.value).toBe('on');
        });
    });
});
