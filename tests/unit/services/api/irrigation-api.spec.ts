import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/services/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService - IrrigationAPI', () => {
    let service: DataService;
    let mockHass: HomeAssistant;
    let callServiceMock: any;

    beforeEach(() => {
        service = new DataService();
        callServiceMock = vi.fn().mockResolvedValue({});
        mockHass = {
            callService: callServiceMock,
            connection: {
                sendMessagePromise: vi.fn().mockResolvedValue({}), // For websocket calls
            },
            callApi: vi.fn().mockResolvedValue({}), // For API calls like getHistory
            callWS: vi.fn().mockResolvedValue({}), // For WS calls like getHistoryStats
            fetchWithAuth: vi.fn().mockResolvedValue({}), // For importStrainLibrary
        } as any;
        service.updateHass(mockHass);
    });

    describe('Environment & Irrigation', () => {
        it('should configure environment', async () => {
            const conf = { growspaceId: 'g1', temperatureSensor: 's.t', humiditySensor: 's.h', vpdSensor: 's.v' };
            await service.configureEnvironment(conf);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'configure_environment', expect.objectContaining({ growspace_id: 'g1' }));
        });

        it('should set dehumidifier control', async () => {
            await service.setDehumidifierControl('g1', true);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_dehumidifier_control', { growspace_id: 'g1', enabled: true });
        });

        it('should set irrigation settings', async () => {
            const args = { growspaceId: 'g1', irrigationPumpEntity: 'switch.p', drainPumpEntity: 'switch.d', irrigationDuration: 10, drainDuration: 5 };
            const expectedPayload = { growspace_id: 'g1', irrigation_pump_entity: 'switch.p', drain_pump_entity: 'switch.d', irrigation_duration: 10, drain_duration: 5 };
            await service.setIrrigationSettings(args);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_irrigation_settings', expectedPayload);
        });

        it('should manage irrigation times', async () => {
            await service.addIrrigationTime({ growspaceId: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_irrigation_time', { growspace_id: 'g1', time: '10:00' });

            await service.removeIrrigationTime({ growspaceId: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_irrigation_time', { growspace_id: 'g1', time: '10:00' });
        });

        it('should manage drain times', async () => {
            await service.addDrainTime({ growspaceId: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_drain_time', { growspace_id: 'g1', time: '10:00' });

            await service.removeDrainTime({ growspaceId: 'g1', time: '10:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_drain_time', { growspace_id: 'g1', time: '10:00' });
        });

        it('should set irrigation strategy', async () => {
            await service.setIrrigationStrategy('g1', { enabled: true, lightsOnTime: '06:00' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_irrigation_strategy', {
                growspace_id: 'g1',
                enabled: true,
                lights_on_time: '06:00'
            });
        });

        it('should set full irrigation strategy', async () => {
            await service.setIrrigationStrategy('g1', {
                enabled: true,
                lightsOnTime: '06:00',
                p0DurationMinutes: 10,
                p2StopBeforeLightsOffMinutes: 120,
                targetVwcPercent: 45,
                maintenanceDrybackPercent: 10,
                shotDurationSeconds: 5,
                shotIntervalMinutes: 15
            });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_irrigation_strategy', {
                growspace_id: 'g1',
                enabled: true,
                lights_on_time: '06:00',
                p0_duration_minutes: 10,
                p2_stop_before_lights_off_minutes: 120,
                target_vwc_percent: 45,
                maintenance_dryback_percent: 10,
                shot_duration_seconds: 5,
                shot_interval_minutes: 15
            });
        });
    });

    describe('Watering Services', () => {
        it('should call waterPlant with basic parameters', async () => {
            await service.waterPlant('plant1', 500);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'plant1',
                amount: 500
            });
        });

        it('should call waterPlant with nutrients', async () => {
            const nutrients = { CalMag: 2, Bloom: 3 };
            await service.waterPlant('plant1', 500, nutrients);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'plant1',
                amount: 500,
                nutrients
            });
        });

        it('should call waterPlant with preset_id', async () => {
            await service.waterPlant('plant1', 500, undefined, 'preset1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'plant1',
                amount: 500,
                preset_id: 'preset1'
            });
        });

        it('should call waterPlant with nutrients and preset_id', async () => {
            const nutrients = { N: 1 };
            await service.waterPlant('plant1', 500, nutrients, 'preset1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'plant1',
                amount: 500,
                nutrients,
                preset_id: 'preset1'
            });
        });

        it('should not include nutrients if empty object', async () => {
            await service.waterPlant('plant1', 500, {});
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'plant1',
                amount: 500
            });
        });

        it('should handle error in waterPlant', async () => {
            callServiceMock.mockRejectedValue(new Error('Water failed'));
            await expect(service.waterPlant('p1', 100)).rejects.toThrow('Water failed');
        });

        it('should call waterGrowspace with basic parameters', async () => {
            await service.waterGrowspace('gs1', 300);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_growspace', {
                growspace_id: 'gs1',
                amount: 300
            });
        });

        it('should call waterGrowspace with nutrients', async () => {
            const nutrients = { Base: 2 };
            await service.waterGrowspace('gs1', 300, nutrients);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_growspace', {
                growspace_id: 'gs1',
                amount: 300,
                nutrients
            });
        });

        it('should call waterGrowspace with preset_id', async () => {
            await service.waterGrowspace('gs1', 300, undefined, 'preset2');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_growspace', {
                growspace_id: 'gs1',
                amount: 300,
                preset_id: 'preset2'
            });
        });

        it('should handle error in waterGrowspace', async () => {
            callServiceMock.mockRejectedValue(new Error('GS Water failed'));
            await expect(service.waterGrowspace('gs1', 100)).rejects.toThrow('GS Water failed');
        });
        describe('Service Error Handling', () => {
            it('configureEnvironment should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.configureEnvironment({ growspaceId: 'g1', temperatureSensor: 'v', humiditySensor: 'v' })).rejects.toThrow('Fail');
            });

            it('setDehumidifierControl should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.setDehumidifierControl('g1', true)).rejects.toThrow('Fail');
            });

            it('setIrrigationSettings should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.setIrrigationSettings({ growspaceId: 'g1', irrigationPumpEntity: 'v', drainPumpEntity: 'v', irrigationDuration: 1, drainDuration: 1 })).rejects.toThrow('Fail');
            });

            it('addIrrigationTime should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.addIrrigationTime({ growspaceId: 'g1', time: '1' })).rejects.toThrow('Fail');
            });

            it('removeIrrigationTime should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.removeIrrigationTime({ growspaceId: 'g1', time: '1' })).rejects.toThrow('Fail');
            });

            it('addDrainTime should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.addDrainTime({ growspaceId: 'g1', time: '1' })).rejects.toThrow('Fail');
            });

            it('removeDrainTime should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.removeDrainTime({ growspaceId: 'g1', time: '1' })).rejects.toThrow('Fail');
            });

            it('setIrrigationStrategy should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.setIrrigationStrategy('g1', {})).rejects.toThrow('Fail');
            });
        });

        describe('Drain Monitoring & Readings', () => {
            it('should configure drain monitoring', async () => {
                const params = { enabled: true, maxEcDelta: 0.5, targetRunoffPercent: 15 };
                await service.configureDrainMonitoring('g1', params);
                expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'configure_drain_monitoring', {
                    growspace_id: 'g1',
                    enabled: true,
                    max_ec_delta: 0.5,
                    target_runoff_percent: 15
                });
            });

            it('should log drain reading', async () => {
                const params = { feedEc: 2.0, drainEc: 2.2 };
                await service.logDrainReading('g1', params);
                expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'log_drain_reading', {
                    growspace_id: 'g1',
                    feed_ec: 2.0,
                    drain_ec: 2.2
                });
            });
        });
    });
});