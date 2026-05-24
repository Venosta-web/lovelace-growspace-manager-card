import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataService } from '../../../../src/services/data-service';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceAdapter } from '../../../../src/adapters/growspace-adapter';

describe('GrowspaceAPI Extra Coverage', () => {
    let service: DataService;
    let mockHass: HomeAssistant;

    beforeEach(() => {
        service = new DataService();
        mockHass = {
            states: {},
            connection: {
                sendMessagePromise: vi.fn(),
            },
            callService: vi.fn().mockResolvedValue({}),
        } as any;
        service.updateHass(mockHass);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Cache Management', () => {
        it('should invalidate specific growspace and all from cache', () => {
            expect(() => service.invalidateCache('gs1')).not.toThrow();
            expect(() => service.invalidateCache()).not.toThrow();
        });
    });

    describe('fetchGrowspaceData gaps', () => {
        it('should return cached data if valid', async () => {
            const mockData = { gs1: { growspace_id: 'gs1', name: 'G1', type: 'normal', rows: 1, plants_per_row: 1, grid: {} } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            // First fetch (populate cache)
            await service.fetchGrowspaceData();

            // Second fetch (should use cache)
            const result = await service.fetchGrowspaceData();
            expect(result).toMatchObject(mockData);
        });

        it('should handle single growspace success path', async () => {
            const mockData = { growspace_id: 'gs1', name: 'G1', type: 'normal', rows: 1, plants_per_row: 1, grid: {} };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            const result = await service.fetchGrowspaceData('gs1');
            expect(result).toMatchObject(mockData);
        });

        it('should handle collection success path', async () => {
            const mockData = {
                gs1: { growspace_id: 'gs1', name: 'G1', type: 'normal', rows: 1, plants_per_row: 1, grid: {} }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockData);

            const result = await service.fetchGrowspaceData();
            expect(result).toMatchObject(mockData);
        });

        it('should handle sendMessagePromise failure', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = await service.fetchGrowspaceData('gs1');
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error:'), expect.any(Error));
        });
    });

    describe('configureEnvironment gaps', () => {
        const config = {
            growspaceId: 'gs1',
            temperatureSensors: ['sensor.t'],
            humiditySensors: ['sensor.h']
        };

        it('should call service on success', async () => {
            await service.configureEnvironment(config);
            expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'configure_environment', {
                growspace_id: 'gs1',
                temperature_sensors: ['sensor.t'],
                humidity_sensors: ['sensor.h']
            });
        });

        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Config Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await expect(service.configureEnvironment(config)).rejects.toThrow('Config Fail');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('setDehumidifierControl gaps', () => {
        it('should call service on success', async () => {
            await service.setDehumidifierControl('gs1', true);
            expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'set_dehumidifier_control', {
                growspace_id: 'gs1',
                enabled: true
            });
        });

        it('should handle service error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Control Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await expect(service.setDehumidifierControl('gs1', false)).rejects.toThrow('Control Fail');
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log detailed validation errors for collection', async () => {
            // growspace_id must be string; number forces a Zod type mismatch that survives .default()
            const invalidCollection = {
                gs1: { identity: { growspace_id: 123 } },
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(invalidCollection);
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await service.fetchGrowspaceData();

            // Should log collection error
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('API Validation Failed for Collection'), expect.anything());
            // Should log individual item error
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('Found problematic item: gs1'), expect.anything());
        });
    });

    describe('getGrowspaceDevices gaps', () => {
        it('should filter out null devices from adapter', () => {
            const mockWsData = { growspace_id: 'gs1' };
            const wsMap = { gs1: mockWsData as any };

            // Mock adapter to return null
            vi.spyOn(GrowspaceAdapter, 'transformGrowspace').mockReturnValue(null as any);

            const res = service.getGrowspaceDevices(wsMap);
            expect(res).toEqual([]);
        });

        it('should return empty array for undefined input', () => {
            const res = service.getGrowspaceDevices(undefined as any);
            expect(res).toEqual([]);
        });
    });

    describe('Configure Environment Coverage', () => {
        it('should configure environment with all options', async () => {
            await service.configureEnvironment({
                growspaceId: 'g1',
                temperatureSensors: ['s.t'],
                humiditySensors: ['s.h'],
                vpdSensors: ['s.vpd'],
                co2Sensor: 's.co2',
                circulationFanEntity: 's.fan',
                circulationFanEntities: ['s.fan1', 's.fan2'],
                stressThreshold: 1,
                moldThreshold: 2,
                lightSensor: 's.light',
                lightSensors: ['s.l1'],
                exhaustEntity: 's.ex',
                exhaustFanEntities: ['s.ex1'],
                humidifierEntity: 's.hum',
                humidifierEntities: ['s.h1'],
                dehumidifierEntity: 's.dehum',
                dehumidifierEntities: ['s.d1'],
                dehumidifierThresholds: { cure: { default: { on: 1.1, off: 1.2 } } },
                soilMoistureSensor: 's.m',
                controlDehumidifier: true,
                vegDayHours: 18,
                flowerEarlyDayHours: 12,
                flowerMidDayHours: 12,
                flowerLateDayHours: 12,
                minimumSourceAirTemperature: 20,
                phSensors: ['s.ph'],
                feedEcSensors: ['s.feed_ec'],
                substrateEcSensors: ['s.sub_ec'],
                runoffEcSensors: ['s.runoff'],
                drainVolumeSensors: ['s.drain'],
                irrigationFlowSensors: ['s.flow'],
                powerSensors: ['s.power'],
                energySensors: ['s.energy'],
            });

            expect(mockHass.callService).toHaveBeenCalledWith(
                'growspace_manager',
                'configure_environment',
                expect.objectContaining({
                    growspace_id: 'g1',
                    temperature_sensors: ['s.t'],
                    humidity_sensors: ['s.h'],
                    vpd_sensors: ['s.vpd'],
                    co2_sensor: 's.co2',
                    circulation_fan_entity: 's.fan',
                    circulation_fan_entities: ['s.fan1', 's.fan2'],
                    stress_threshold: 1,
                    mold_threshold: 2,
                    light_sensor: 's.light',
                    light_sensors: ['s.l1'],
                    exhaust_entity: 's.ex',
                    exhaust_fan_entities: ['s.ex1'],
                    humidifier_entity: 's.hum',
                    humidifier_entities: ['s.h1'],
                    dehumidifier_entity: 's.dehum',
                    dehumidifier_entities: ['s.d1'],
                    dehumidifier_thresholds: { cure: { default: { on: 1.1, off: 1.2 } } },
                    soil_moisture_sensor: 's.m',
                    control_dehumidifier: true,
                    veg_day_hours: 18,
                    flower_early_day_hours: 12,
                    flower_mid_day_hours: 12,
                    flower_late_day_hours: 12,
                    minimum_source_air_temperature: 20,
                    ph_sensors: ['s.ph'],
                    feed_ec_sensors: ['s.feed_ec'],
                    substrate_ec_sensors: ['s.sub_ec'],
                    runoff_ec_sensors: ['s.runoff'],
                    drain_volume_sensors: ['s.drain'],
                    irrigation_flow_sensors: ['s.flow'],
                    power_sensors: ['s.power'],
                    energy_sensors: ['s.energy'],
                })
            );
        });
    });

    describe('Environment Management', () => {
        it('removeEnvironment should call service', async () => {
            await service.removeEnvironment('gs1');
            expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'remove_environment', {
                growspace_id: 'gs1'
            });
        });

        it('resetWaterTracking should call service', async () => {
            await service.resetWaterTracking('gs1');
            expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'reset_water_tracking', {
                growspace_id: 'gs1'
            });
        });

        it('removeEnvironment should handle error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Fail'));
            await expect(service.removeEnvironment('gs1')).rejects.toThrow('Fail');
        });

        it('resetWaterTracking should handle error', async () => {
            mockHass.callService = vi.fn().mockRejectedValue(new Error('Fail'));
            await expect(service.resetWaterTracking('gs1')).rejects.toThrow('Fail');
        });
    });
});
