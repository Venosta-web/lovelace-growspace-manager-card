import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService', () => {
    let service: DataService;
    let mockHass: HomeAssistant;
    let callServiceMock: any;

    beforeEach(() => {
        service = new DataService();
        callServiceMock = vi.fn().mockResolvedValue({});
        mockHass = {
            callService: callServiceMock,
            // Add other required properties as needed by Typescript, usually mocked as any for unit tests
        } as any;
        service.updateHass(mockHass);
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

        it('should handle custom target names correctly', async () => {
            // Logic in DataService attempts to map 'dry' -> 'dry', 'cure' -> 'cure'
            // If we pass 'My Custom Dry Room', it passes it through unless it detects keywords?
            // "if (hint.includes('dry') && target !== 'dry') payload.target_growspace_id = 'dry';"

            await service.harvestPlant('plant_123', 'My Dry Room');
            // 'My Dry Room' includes 'dry' but is not 'dry'.
            // The logic: 
            // const hint = target.toLowerCase(); 
            // if (hint.includes('dry') && target !== 'dry') payload.target_growspace_id = 'dry';

            // So for 'My Dry Room', we expect payload to be 'dry' if logic stands, 
            // OR if the user intended to support custom IDs.
            // Let's verify the CURRENT implementation logic via test.

            expect(callServiceMock).toHaveBeenCalledWith(
                'growspace_manager',
                'harvest_plant',
                {
                    plant_id: 'plant_123',
                    target_growspace_id: 'dry' // Because it contained 'dry'
                }
            );
        });

        it('should pass through unknown targets as-is', async () => {
            await service.harvestPlant('plant_123', 'tent_2');
            // 'tent_2' does not contain 'dry', 'cure', 'mother', 'clone'
            // So it should pass as 'tent_2'

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
});
