import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionContext } from '../../src/store/action-context';
import {
    addStrain,
    removeStrain,
    addGrowspace,
    updateGrowspace,
    removeGrowspace,
} from '../../src/store/strain-actions';
import { StrainEntry } from '../../src/types';

describe('strain-actions', () => {
    describe('Strain Actions', () => {
        let ctx: ActionContext;
        let mockDataService: any;
        let strainLibrary: StrainEntry[];

        beforeEach(() => {
            strainLibrary = [
                { strain: 'Blue Dream', phenotype: 'default', key: 'Blue Dream|default' },
                { strain: 'OG Kush', phenotype: 'Alpha', key: 'OG Kush|Alpha' },
            ];

            mockDataService = {
                addStrain: vi.fn().mockResolvedValue({}),
                removeStrain: vi.fn().mockResolvedValue({}),
                fetchStrainLibrary: vi.fn().mockResolvedValue([
                    { strain: 'Blue Dream', phenotype: 'default', key: 'Blue Dream|default' },
                    { strain: 'New Strain', phenotype: 'Pheno1' }
                ]),
            };

            ctx = {
                dataService: mockDataService,
                showToast: vi.fn(),
                closeDialog: vi.fn(),
                refreshData: vi.fn().mockResolvedValue(undefined),
                hass: {} as any,
                data: {
                    setStrainLibrary: vi.fn((lib) => { strainLibrary = lib; }),
                    getStrainLibrary: vi.fn(() => strainLibrary),
                    $strainLibrary: { get: () => strainLibrary },
                    $devices: { get: vi.fn(() => []) },
                } as any,
            } as any;
        });

        describe('addStrain', () => {
            it('should add strain with full data', async () => {
                const strainData: Partial<StrainEntry> = {
                    strain: 'New Strain',
                    phenotype: 'Pheno1',
                    breeder: 'Test Breeder',
                    type: 'Hybrid',
                    flowering_days_min: 60,
                    flowering_days_max: 70,
                    lineage: 'Parent1 x Parent2',
                    sex: 'Regular',
                    description: 'A great strain',
                    image: 'base64image',
                    sativa_percentage: 60,
                    indica_percentage: 40,
                };

                const result = await addStrain(ctx, strainData);

                expect(result).toBe(true);
                expect(mockDataService.addStrain).toHaveBeenCalledWith(expect.objectContaining({
                    strain: 'New Strain',
                    phenotype: 'Pheno1',
                    breeder: 'Test Breeder',
                    flowering_days_min: 60,
                    flowering_days_max: 70,
                }));
                expect(ctx.showToast).toHaveBeenCalledWith('Strain saved successfully!', 'success');
                expect(mockDataService.fetchStrainLibrary).toHaveBeenCalled();
            });

            it('should return false when strain name missing', async () => {
                const result = await addStrain(ctx, { phenotype: 'Test' });

                expect(result).toBe(false);
                expect(mockDataService.addStrain).not.toHaveBeenCalled();
            });

            it('should return false on service error', async () => {
                mockDataService.addStrain.mockRejectedValue(new Error('Add failed'));

                const result = await addStrain(ctx, { strain: 'Test' });

                expect(result).toBe(false);
            });

            it('should convert flowering days to numbers', async () => {
                const strainData = {
                    strain: 'Test',
                    flowering_days_min: '55' as any,
                    flowering_days_max: '65' as any,
                };

                await addStrain(ctx, strainData);

                expect(mockDataService.addStrain).toHaveBeenCalledWith(expect.objectContaining({
                    flowering_days_min: 55,
                    flowering_days_max: 65,
                }));
            });
        });

        describe('removeStrain', () => {
            it('should remove strain with phenotype', async () => {
                const result = await removeStrain(ctx, 'OG Kush|Alpha');

                expect(result).toBe(true);
                expect(mockDataService.removeStrain).toHaveBeenCalledWith('OG Kush', 'Alpha');
                expect(ctx.data.setStrainLibrary).toHaveBeenCalled();
                expect(mockDataService.fetchStrainLibrary).toHaveBeenCalled();
            });

            it('should remove strain without phenotype (default)', async () => {
                const result = await removeStrain(ctx, 'Blue Dream|default');

                expect(result).toBe(true);
                expect(mockDataService.removeStrain).toHaveBeenCalledWith('Blue Dream', undefined);
            });

            it('should update local strain library on removal', async () => {
                await removeStrain(ctx, 'OG Kush|Alpha');

                // setStrainLibrary should be called with filtered array
                expect(ctx.data.setStrainLibrary).toHaveBeenCalledWith([
                    { strain: 'Blue Dream', phenotype: 'default', key: 'Blue Dream|default' },
                ]);
            });

            it('should return false on error', async () => {
                mockDataService.removeStrain.mockRejectedValue(new Error('Remove failed'));

                const result = await removeStrain(ctx, 'Test|default');

                expect(result).toBe(false);
            });
        });
    });

    describe('Growspace Actions', () => {
        let ctx: ActionContext;
        let mockDataService: any;

        beforeEach(() => {
            mockDataService = {
                addGrowspace: vi.fn().mockResolvedValue({}),
                updateGrowspace: vi.fn().mockResolvedValue({}),
                removeGrowspace: vi.fn().mockResolvedValue({}),
                analyzeAllGrowspaces: vi.fn().mockResolvedValue({ response: 'AI analysis result' }),
                askGrowAdvice: vi.fn().mockResolvedValue({ response: 'Advice for your plants' }),
                getStrainRecommendation: vi.fn().mockResolvedValue({ response: 'Try Blue Dream' }),
            };

            ctx = {
                dataService: mockDataService,
                showToast: vi.fn(),
                closeDialog: vi.fn(),
                refreshData: vi.fn().mockResolvedValue(undefined),
                data: {
                    $devices: { get: vi.fn(() => []), set: vi.fn() },
                } as any,
            } as any;
        });

        describe('addGrowspace', () => {
            it('should add growspace with defaults', async () => {
                const result = await addGrowspace(ctx, 'Flower Room');

                expect(result).toBe(true);
                expect(mockDataService.addGrowspace).toHaveBeenCalledWith({
                    name: 'Flower Room',
                    rows: 4,
                    plants_per_row: 4,
                    notification_service: 'mobile_app_notify',
                });
                expect(ctx.refreshData).toHaveBeenCalled();
                expect(ctx.closeDialog).toHaveBeenCalled();
            });

            it('should add growspace with custom values', async () => {
                const result = await addGrowspace(ctx, 'Veg Tent', 6, 8, 'custom_notify');

                expect(result).toBe(true);
                expect(mockDataService.addGrowspace).toHaveBeenCalledWith({
                    name: 'Veg Tent',
                    rows: 6,
                    plants_per_row: 8,
                    notification_service: 'custom_notify',
                });
            });

            it('should return false when name is empty', async () => {
                const result = await addGrowspace(ctx, '');

                expect(result).toBe(false);
                expect(ctx.showToast).toHaveBeenCalledWith('Name is required', 'error');
            });

            it('should return false on service error', async () => {
                mockDataService.addGrowspace.mockRejectedValue(new Error('Add failed'));

                const result = await addGrowspace(ctx, 'Test Room');

                expect(result).toBe(false);
                expect(ctx.showToast).toHaveBeenCalledWith('Error: Add failed', 'error');
            });
        });

        describe('updateGrowspace', () => {
            it('should update growspace successfully', async () => {
                const result = await updateGrowspace(ctx, 'gs123', 'Updated Name', 5, 6);

                expect(result).toBe(true);
                expect(mockDataService.updateGrowspace).toHaveBeenCalledWith({
                    growspace_id: 'gs123',
                    name: 'Updated Name',
                    rows: 5,
                    plants_per_row: 6,
                });
                expect(ctx.showToast).toHaveBeenCalledWith('Growspace updated successfully', 'success');
                expect(ctx.refreshData).toHaveBeenCalled();
                expect(ctx.closeDialog).toHaveBeenCalled();
            });

            it('should perform optimistic update', async () => {
                // Mock existing devices
                const devices = [{ device_id: 'gs123', rows: 4, plants_per_row: 4 }];
                (ctx.data.$devices.get as any).mockReturnValue(devices);

                await updateGrowspace(ctx, 'gs123', 'Updated Name', 5, 6);

                expect(ctx.data.$devices.set).toHaveBeenCalledWith(expect.arrayContaining([
                    expect.objectContaining({
                        device_id: 'gs123',
                        rows: 5,
                        plants_per_row: 6
                    })
                ]));
            });

            it('should return false on error', async () => {
                mockDataService.updateGrowspace.mockRejectedValue(new Error('Update failed'));

                const result = await updateGrowspace(ctx, 'gs123', 'Name', 4, 4);

                expect(result).toBe(false);
                expect(ctx.showToast).toHaveBeenCalledWith('Failed to update growspace: Update failed', 'error');
            });
        });

        describe('removeGrowspace', () => {
            it('should remove growspace successfully', async () => {
                const result = await removeGrowspace(ctx, 'gs123');

                expect(result).toBe(true);
                expect(mockDataService.removeGrowspace).toHaveBeenCalledWith('gs123');
                expect(ctx.showToast).toHaveBeenCalledWith('Growspace removed successfully', 'success');
                expect(ctx.refreshData).toHaveBeenCalled();
                expect(ctx.closeDialog).toHaveBeenCalled();
            });

        });
    });
});