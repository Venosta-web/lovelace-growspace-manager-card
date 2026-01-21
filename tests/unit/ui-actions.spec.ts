import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    openConfigDialog,
    openStrainLibraryDialog,
    openIrrigationDialog,
    openGrowMasterDialog,
    openWateringDialog,
    openTrainingDialog,
    openNutrientsDialog,
} from '../../src/store/ui/ui-actions';
import { ActionContext } from '../../src/store/core/action-context';
import { ConfigTab } from '../../src/constants';

describe('ui-actions', () => {
    let ctx: ActionContext;
    let setActiveDialogSpy: any;

    beforeEach(() => {
        setActiveDialogSpy = vi.fn();
        ctx = {
            ui: {
                setActiveDialog: setActiveDialogSpy
            },
            store: {},
            hass: {},
        } as unknown as ActionContext;
    });

    describe('openConfigDialog', () => {
        it('should handle undefined device with defaults', () => {
            openConfigDialog(ctx, undefined);

            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'CONFIG',
                payload: expect.objectContaining({
                    currentTab: ConfigTab.ENVIRONMENT,
                    environmentData: expect.objectContaining({
                        selectedGrowspaceId: '',
                        temperatureSensor: '',
                        dehumidifierControlEnabled: false,
                        dehumidifierThresholds: {}
                    })
                })
            });
        });

        it('should map device attributes correctly', () => {
            const mockDevice = {
                deviceId: 'dev1',
                environmentAttributes: {
                    temperatureSensor: 'sensor.temp',
                    humiditySensor: 'sensor.hum',
                    vpdSensor: 'sensor.vpd',
                    co2Sensor: 'sensor.co2',
                    circulationFanEntity: 'fan.circ',
                    lightSensor: 'sensor.light',
                    exhaustEntity: 'fan.exhaust',
                    humidifierEntity: 'humidifier.main',
                    dehumidifierEntity: 'dehumidifier.main',
                    soilMoistureSensor: 'sensor.soil',
                    dehumidifierControlEnabled: true,
                    dehumidifierThresholds: { min: 40, max: 60 }
                }
            } as any;

            openConfigDialog(ctx, mockDevice);

            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'CONFIG',
                payload: expect.objectContaining({
                    environmentData: expect.objectContaining({
                        selectedGrowspaceId: 'dev1',
                        temperatureSensor: 'sensor.temp',
                        dehumidifierControlEnabled: true,
                        dehumidifierThresholds: { min: 40, max: 60 }
                    })
                })
            });
        });
    });

    describe('openWateringDialog', () => {
        it('should default to growspace mode if no plants provided', () => {
            openWateringDialog(ctx, { growspaceId: 'gs1' });
            expect(setActiveDialogSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        mode: 'growspace',
                        growspaceId: 'gs1'
                    })
                })
            );
        });

        it('should default to plant mode if plants provided', () => {
            openWateringDialog(ctx, { plantIds: ['p1'] });
            expect(setActiveDialogSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        mode: 'plant',
                        plantIds: ['p1']
                    })
                })
            );
        });

        it('should respect explicit mode', () => {
            openWateringDialog(ctx, { plantIds: ['p1'], mode: 'growspace' });
            expect(setActiveDialogSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        mode: 'growspace'
                    })
                })
            );
        });
    });

    describe('Simple Dialogs', () => {
        it('should open strain library', () => {
            openStrainLibraryDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'STRAIN_LIBRARY', payload: {} });
        });

        it('should open irrigation dialog', () => {
            openIrrigationDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'IRRIGATION', payload: {} });
        });

        it('should open nutrients dialog', () => {
            openNutrientsDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
        });
    });

    describe('openGrowMasterDialog', () => {
        it('should open with correct initial state', () => {
            openGrowMasterDialog(ctx, 'gs1');
            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'GROW_MASTER',
                payload: {
                    growspaceId: 'gs1',
                    isLoading: false,
                    response: '',
                    mode: 'single'
                }
            });
        });
    });

    describe('openTrainingDialog', () => {
        it('should pass plantIds and growspaceId', () => {
            openTrainingDialog(ctx, ['p1'], 'gs1');
            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'TRAINING',
                payload: {
                    isOpen: true,
                    plantIds: ['p1'],
                    growspaceId: 'gs1'
                }
            });
        });
    });
});
