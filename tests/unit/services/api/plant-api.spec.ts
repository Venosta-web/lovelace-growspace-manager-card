import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService - PlantAPI', () => {
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

    describe('Plant Actions', () => {
        it('should add plant with auto-dates for special rooms', async () => {
            await service.addPlant({ growspace_id: 'mother', strain: 'XS', row: 0, col: 0 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_plant', expect.objectContaining({
                growspace_id: 'mother',
                mother_start: expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
            }));
        });

        it('should update plant', async () => {
            await service.updatePlant({ plant_id: 'p1', notes: 'Hi' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_plant', { plant_id: 'p1', notes: 'Hi' });
        });

        it('should remove plant', async () => {
            await service.removePlant('p1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_plant', { plant_id: 'p1' });
        });

        it('should swap plants', async () => {
            await service.swapPlants('p1', 'p2');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'switch_plants', { plant1_id: 'p1', plant2_id: 'p2' });
        });

        it('should take clone', async () => {
            await service.takeClone({ mother_plant_id: 'm1' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'take_clone', { mother_plant_id: 'm1' });
        });
    });

    describe('harvestPlant', () => {
        it('should call harvest_plant service with correct payload', async () => {
            await service.harvestPlant('plant_123', 'dry');

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager', // DOMAIN
                'harvest_plant',     // SERVICE
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'dry'
                }
            );
        });

        it('should pass custom target IDs directly', async () => {
            // No legacy mapping - pass IDs directly
            await service.harvestPlant('plant_123', 'my_custom_dry_room');

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'harvest_plant',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'my_custom_dry_room'
                }
            );
        });

        it('should pass through unknown targets as-is', async () => {
            await service.harvestPlant('plant_123', 'tent_2');
            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'harvest_plant',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'tent_2'
                }
            );
        });
    });

    describe('moveClone', () => {
        it('should call move_clone with transition date if provided', async () => {
            const date = '2023-12-01';
            await service.moveClone('plant_123', 'veg_tent', date);

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'move_clone',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'veg_tent',
                    transition_date: date
                }
            );
        });

        it('should call move_clone without transition date if optional', async () => {
            await service.moveClone('plant_123', 'veg_tent');

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'move_clone',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'veg_tent'
                }
            );
        });
    });

    describe('Plant Actions Extensions', () => {
        it('should set clone_start if growspace is clone', async () => {
            await service.addPlant({ growspace_id: 'clone', strain: 'X', row: 1, col: 1 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_plant', expect.objectContaining({
                clone_start: expect.any(String)
            }));
        });

        it('should clean undefined keys in addStrain', async () => {
            await service.addStrain({ strain: 'X', breeder: undefined });
            // Verify breeder is NOT in call
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_strain', {
                strain: 'X'
            });
        });

        it('should call takeClone and remove target if undefined', async () => {
            // Technically target_growspace_id is omitted from payload if not present
            await service.takeClone({ mother_plant_id: 'p1' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'take_clone', { mother_plant_id: 'p1' });
        });
    });

    describe('Harvest Strict ID Passing', () => {
        it('should pass target ID directly without transformation', async () => {
            // Since legacy mapping was removed, IDs are passed directly
            await service.harvestPlant('p1', 'cure');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1', target_growspace_id: 'cure'
            });
        });

        it('should pass any custom growspace ID as-is', async () => {
            await service.harvestPlant('p1', 'my_custom_room_123');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1', target_growspace_id: 'my_custom_room_123'
            });
        });

        it('should use default target of dry', async () => {
            await service.harvestPlant('p1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1', target_growspace_id: 'dry'
            });
        });

        it('should call harvestPlant with all metrics parameters', async () => {
            const metrics = {
                wet_weight: 120.5,
                dry_weight: 25.2,
                trim_weight: 5.1,
                thc_percentage: 24.8,
                cbd_percentage: 0.1,
                terpene_profile: 'Limonene'
            };
            await service.harvestPlant('p1', 'dry', metrics);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1',
                target_growspace_id: 'dry',
                ...metrics
            });
        });

        it('should handle falsy, null or undefined values in metrics', async () => {
            const metrics = {
                wet_weight: null as any,
                dry_weight: undefined,
                trim_weight: 0,
                thc_percentage: null as any,
                cbd_percentage: undefined,
                terpene_profile: ''
            };
            await service.harvestPlant('p1', 'dry', metrics);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1',
                target_growspace_id: 'dry',
                trim_weight: 0
            });
        });
    });

    describe('Batch Plant Actions', () => {
        it('should add multiple plants via addPlants', async () => {
            await service.addPlants({ growspace_id: 'g1', strain: 'X', amount: 5 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'add_plants', expect.objectContaining({
                growspace_id: 'g1',
                strain: 'X',
                amount: 5
            }));
        });

        it('should handle error in addPlants', async () => {
            callServiceMock.mockRejectedValue(new Error('Batch Fail'));
            await expect(service.addPlants({ growspace_id: 'g1', strain: 'X', amount: 5 }))
                .rejects.toThrow('Batch Fail');
        });

        it('should handle non-Error rejection in addPlants', async () => {
            callServiceMock.mockRejectedValue('String Error');
            await expect(service.addPlants({ growspace_id: 'g1', strain: 'X', amount: 5 }))
                .rejects.toThrow('Failed to add plants');
        });
    });

    // From Branch Booster
    describe('Edge Cases', () => {
        it('takeClone should preserve target_growspace_id if provided', async () => {
            const params = { mother_plant_id: 'm1', target_growspace_id: 'custom_room' };
            await service.takeClone(params);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'take_clone', params);
        });
        describe('Service Error Handling', () => {
            it('addPlant should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.addPlant({ growspace_id: 'g1', strain: 's', row: 1, col: 1 })).rejects.toThrow('Fail');
            });

            it('addPlant should handle non-Error rejections', async () => {
                callServiceMock.mockRejectedValue('String Fail');
                await expect(service.addPlant({ growspace_id: 'g1', strain: 's', row: 1, col: 1 })).rejects.toThrow('Failed to add plant');
            });

            it('updatePlant should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.updatePlant({ plant_id: 'p1' })).rejects.toThrow('Fail');
            });

            it('removePlant should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.removePlant('p1')).rejects.toThrow('Fail');
            });

            it('swapPlants should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.swapPlants('p1', 'p2')).rejects.toThrow('Fail');
            });

            it('harvestPlant should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.harvestPlant('p1', 'dry')).rejects.toThrow('Fail');
            });

            it('takeClone should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.takeClone({ mother_plant_id: 'p1' })).rejects.toThrow('Fail');
            });

            it('moveClone should handle error', async () => {
                callServiceMock.mockRejectedValue(new Error('Fail'));
                await expect(service.moveClone('p1', 'target')).rejects.toThrow('Fail');
            });
        });
    });

    describe('waterPlant', () => {
        it('should call water_plant service with correct params', async () => {
            const nutrients = { CalMag: 1.0 };
            const params = { plant_id: 'p1', amount: 500, nutrients };
            // Note: method signature: waterPlant(id, amount, nutrients, preset)
            await service.waterPlant('p1', 500, nutrients);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'p1',
                amount: 500,
                nutrients
            });
        });

        it('should handle presetId', async () => {
            await service.waterPlant('p1', 500, undefined, 'preset1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'water_plant', {
                plant_id: 'p1',
                amount: 500,
                preset_id: 'preset1'
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Water fail'));
            await expect(service.waterPlant('p1', 100))
                .rejects.toThrow('Water fail');
        });
    });

    describe('printLabel', () => {
        it('should call print_label service with params', async () => {
            const params = { plant_id: 'p1', copies: 2 };
            await service.printLabel(params);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'print_label', params);
        });

        it('should handle printing error', async () => {
            callServiceMock.mockRejectedValue(new Error('Print failed'));
            await expect(service.printLabel({ strain: 'X' }))
                .rejects.toThrow('Print failed');
        });
    });

    describe('scorePlant', () => {
        it('should call score_plant service with correct payload', async () => {
            const scores = { vigor: 5, aroma: 4 };
            await service.scorePlant({ plant_id: 'p1', ...scores });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'score_plant', {
                plant_id: 'p1',
                ...scores
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Score fail'));
            await expect(service.scorePlant({ plant_id: 'p1' })).rejects.toThrow('Score fail');
        });

        it('should include structure, resin, and pest_resistance when provided', async () => {
            await service.scorePlant({ plant_id: 'p1', structure: 3, resin: 4, pest_resistance: 5 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'score_plant', {
                plant_id: 'p1',
                structure: 3,
                resin: 4,
                pest_resistance: 5,
            });
        });

        it('should include all parameters when provided', async () => {
            const params = {
                plant_id: 'p1',
                vigor: 5,
                structure: 4,
                aroma: 3,
                resin: 5,
                pest_resistance: 4,
                internodal_spacing: 3,
                terpene_intensity: 5,
                mold_resistance: 4,
                yield_potential: 5,
                keeper: true,
                notes: 'Superb keeper'
            };
            await service.scorePlant(params);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'score_plant', params);
        });

        it('should include explicitly passed null values', async () => {
            const params = {
                plant_id: 'p1',
                vigor: null,
                structure: null,
                notes: null
            };
            await service.scorePlant(params);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'score_plant', {
                plant_id: 'p1',
                vigor: null,
                structure: null,
                notes: null
            });
        });
    });

    describe('updateHarvestMetrics', () => {
        it('should call update_harvest_metrics service with correct payload', async () => {
            const metrics = { wet_weight: 100, dry_weight: 80 };
            await service.updateHarvestMetrics({ plant_id: 'p1', ...metrics });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_harvest_metrics', {
                plant_id: 'p1',
                ...metrics
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Metrics fail'));
            await expect(service.updateHarvestMetrics({ plant_id: 'p1' })).rejects.toThrow('Metrics fail');
        });

        it('should include trim_weight, thc_percentage, cbd_percentage, terpene_profile when provided', async () => {
            await service.updateHarvestMetrics({
                plant_id: 'p1',
                trim_weight: 10,
                thc_percentage: 20,
                cbd_percentage: 1,
                terpene_profile: 'citrus',
            });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'update_harvest_metrics', {
                plant_id: 'p1',
                trim_weight: 10,
                thc_percentage: 20,
                cbd_percentage: 1,
                terpene_profile: 'citrus',
            });
        });
    });

    describe('movePlant', () => {
        it('should call move_plant service with correct payload', async () => {
            await service.movePlant('p1', 'g2');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'move_plant', {
                plant_id: 'p1',
                target_growspace_id: 'g2'
            });
        });

        it('should call move_plant service with transition date', async () => {
            await service.movePlant('p1', 'g2', '2023-12-01');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'move_plant', {
                plant_id: 'p1',
                target_growspace_id: 'g2',
                transition_date: '2023-12-01'
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Move fail'));
            await expect(service.movePlant('p1', 'g2')).rejects.toThrow('Move fail');
        });
    });

    describe('harvestPlant with metrics', () => {
        it('should call harvest_plant with metrics', async () => {
            const metrics = { wet_weight: 150 };
            await service.harvestPlant('p1', 'dry', metrics);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'harvest_plant', {
                plant_id: 'p1',
                target_growspace_id: 'dry',
                ...metrics
            });
        });
    });

    describe('logDryingWeight', () => {
        it('should call log_drying_weight service with correct params', async () => {
            await service.logDryingWeight({ plant_id: 'p1', weight_grams: 150 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'log_drying_weight', {
                plant_id: 'p1',
                weight_grams: 150
            });
        });

        it('should include date when provided', async () => {
            await service.logDryingWeight({ plant_id: 'p1', weight_grams: 150, date: '2026-05-19' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'log_drying_weight', {
                plant_id: 'p1',
                weight_grams: 150,
                date: '2026-05-19'
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Log fail'));
            await expect(service.logDryingWeight({ plant_id: 'p1', weight_grams: 150 })).rejects.toThrow('Log fail');
        });
    });

    describe('logMoistureReading', () => {
        it('should call log_moisture_reading service with correct params', async () => {
            await service.logMoistureReading({ plant_id: 'p1', moisture_percent: 12.5 });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'log_moisture_reading', {
                plant_id: 'p1',
                moisture_percent: 12.5
            });
        });

        it('should include date when provided', async () => {
            await service.logMoistureReading({ plant_id: 'p1', moisture_percent: 12.5, date: '2026-05-19' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'log_moisture_reading', {
                plant_id: 'p1',
                moisture_percent: 12.5,
                date: '2026-05-19'
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Moisture fail'));
            await expect(service.logMoistureReading({ plant_id: 'p1', moisture_percent: 12.5 })).rejects.toThrow('Moisture fail');
        });
    });

    describe('setVisualTag', () => {
        it('should call set_visual_tag service with tag string', async () => {
            await service.setVisualTag({ plant_id: 'p1', visual_tag: 'tag123' });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_visual_tag', {
                plant_id: 'p1',
                visual_tag: 'tag123'
            });
        });

        it('should call set_visual_tag service with null', async () => {
            await service.setVisualTag({ plant_id: 'p1', visual_tag: null });
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'set_visual_tag', {
                plant_id: 'p1',
                visual_tag: null
            });
        });

        it('should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Tag fail'));
            await expect(service.setVisualTag({ plant_id: 'p1', visual_tag: 'tag' })).rejects.toThrow('Tag fail');
        });
    });
});