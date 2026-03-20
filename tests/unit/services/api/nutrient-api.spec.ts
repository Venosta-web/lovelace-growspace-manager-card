import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '../../../../src/data-service';
import { HomeAssistant } from 'custom-card-helpers';

describe('DataService - NutrientAPI', () => {
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

    describe('IPM Actions', () => {
        it('should save IPM preset', async () => {
            const data = { name: 'Neem', type: 'Foliar', items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L' }] };
            await service.saveIPMPreset(data);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'save_ipm_preset', data);
        });

        it('should handle error in saveIPMPreset', async () => {
            callServiceMock.mockRejectedValue(new Error('Save Fail'));
            await expect(service.saveIPMPreset({ name: 'X', type: 'Y', items: [] }))
                .rejects.toThrow('Save Fail');
        });

        it('should remove IPM preset', async () => {
            await service.removeIPMPreset('p1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_ipm_preset', { preset_id: 'p1' });
        });

        it('should handle error in removeIPMPreset', async () => {
            callServiceMock.mockRejectedValue(new Error('Remove Fail'));
            await expect(service.removeIPMPreset('p1'))
                .rejects.toThrow('Remove Fail');
        });

        it('should apply IPM preset', async () => {
            const data = { preset_id: 'p1', growspace_id: 'g1' };
            await service.applyIPM(data);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'apply_ipm', data);
        });

        it('should handle error in applyIPM', async () => {
            callServiceMock.mockRejectedValue(new Error('Apply Fail'));
            await expect(service.applyIPM({ preset_id: 'p1' }))
                .rejects.toThrow('Apply Fail');
        });
    });

    describe('Nutrient Presets', () => {
        it('should save nutrient preset', async () => {
            const params = {
                name: 'Veg Week 1',
                nutrients: [{ name: 'Base', dose_ml_l: 2 }],
                stage: 'veg',
                min_days_in_stage: 7
            };
            await service.saveNutrientPreset(params);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'save_nutrient_preset', params);
        });

        it('should save nutrient preset with preset_id for update', async () => {
            const params = {
                preset_id: 'existing1',
                name: 'Updated Preset',
                nutrients: [{ name: 'Bloom', dose_ml_l: 3 }],
            };
            await service.saveNutrientPreset(params);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'save_nutrient_preset', params);
        });

        it('should handle error in saveNutrientPreset', async () => {
            callServiceMock.mockRejectedValue(new Error('Save preset failed'));
            await expect(service.saveNutrientPreset({ name: 'X', nutrients: [] })).rejects.toThrow('Save preset failed');
        });

        it('should remove nutrient preset', async () => {
            await service.removeNutrientPreset('preset123');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_nutrient_preset', {
                preset_id: 'preset123'
            });
        });

        it('should handle error in removeNutrientPreset', async () => {
            callServiceMock.mockRejectedValue(new Error('Remove preset failed'));
            await expect(service.removeNutrientPreset('p1')).rejects.toThrow('Remove preset failed');
        });
    });

    describe('Fetch Methods', () => {
        it('fetchNutrientPresets should fetch and return presets on success', async () => {
            const mockPresets = { 'p1': { id: 'p1', name: 'Preset 1', nutrients: [] } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockPresets);

            const res = await service.fetchNutrientPresets();
            expect(res).toEqual(mockPresets);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_nutrient_presets'
            }));
        });

        it('fetchIPMPresets should fetch and return presets on success', async () => {
            const mockPresets = { 'p1': { id: 'p1', name: 'IPM 1', type: 'foliar', items: [] } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockPresets);

            const res = await service.fetchIPMPresets();
            expect(res).toEqual(mockPresets);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_ipm_presets'
            }));
        });
    });

    describe('Nutrient Inventory', () => {
        it('fetchNutrientInventory should return inventory on success', async () => {
            const mockInventory = {
                stocks: {
                    'n1': { nutrient_id: 'n1', name: 'Grow A', current_ml: 500, initial_ml: 1000, last_updated: '2023-01-01' }
                }
            };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockInventory);

            const res = await service.fetchNutrientInventory();
            expect(res).toEqual(mockInventory);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_nutrient_inventory'
            }));
        });

        it('should update nutrient stock', async () => {
            await service.updateNutrientStock('n1', 'Base', 500, 1000);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/update_nutrient_stock',
                nutrient_id: 'n1',
                name: 'Base',
                current_ml: 500,
                initial_ml: 1000
            }));
        });

        it('should handle error in updateNutrientStock', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Update Fail'));
            await expect(service.updateNutrientStock('n1', 'Base', 500, 1000))
                .rejects.toThrow('Update Fail');
        });

        it('should remove nutrient stock', async () => {
            await service.removeNutrientStock('n1');
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/remove_nutrient_stock',
                nutrient_id: 'n1'
            }));
        });

        it('should handle error in removeNutrientStock', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Remove Fail'));
            await expect(service.removeNutrientStock('n1'))
                .rejects.toThrow('Remove Fail');
        });
    });

    describe('EC Ramp Curves', () => {
        it('fetchECRampCurves should fetch and return curves on success', async () => {
            const mockCurves = { 'c1': { name: 'Curve 1', points: [] } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(mockCurves);

            const res = await service.fetchECRampCurves();
            expect(res).toEqual(mockCurves);
            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
                type: 'growspace_manager/get_ec_ramp_curves'
            }));
        });

        it('saveECRampCurve should call service with transformed data', async () => {
            const data = { name: 'New Curve', points: [{ day: 1, target_ec: 1.0 }] };
            await service.saveECRampCurve(data);
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'save_ec_ramp_curve', {
                curve_id: undefined,
                name: 'New Curve',
                stage: 'flower',
                points: [{ week: 1, ec_min: 1.0, ec_max: 1.4 }]
            });
        });

        it('removeECRampCurve should call service with id', async () => {
            await service.removeECRampCurve('c1');
            expect(callServiceMock).toHaveBeenCalledWith('growspace_manager', 'remove_ec_ramp_curve', {
                curve_id: 'c1'
            });
        });

        it('saveECRampCurve should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Save fail'));
            await expect(service.saveECRampCurve({ name: 'X', points: [] })).rejects.toThrow('Save fail');
        });

        it('removeECRampCurve should handle error', async () => {
            callServiceMock.mockRejectedValue(new Error('Remove fail'));
            await expect(service.removeECRampCurve('c1')).rejects.toThrow('Remove fail');
        });
    });

    describe('Validation & Errors', () => {
        it('fetchNutrientPresets should return null if hass is missing', async () => {
            service.updateHass(undefined as any);
            expect(await service.fetchNutrientPresets()).toBeNull();
        });

        it('fetchNutrientPresets should return raw result and log error on validation failure', async () => {
            const badData = { p1: { name: 'missing_id' } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badData);
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchNutrientPresets();
            expect(res).toBe(badData);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Nutrient Presets Validation Failed:'), expect.anything());
        });

        it('fetchNutrientPresets should handle websocket error', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchNutrientPresets();
            expect(res).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[NutrientAPI:fetchNutrientPresets] Error:'), expect.any(Error));
        });

        it('fetchIPMPresets should return null if hass is missing', async () => {
            service.updateHass(undefined as any);
            expect(await service.fetchIPMPresets()).toBeNull();
        });

        it('fetchIPMPresets should return raw result and log error on validation failure', async () => {
            const badData = { p1: { name: 'missing_id' } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badData);
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchIPMPresets();
            expect(res).toBe(badData);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('IPM Presets Validation Failed:'), expect.anything());
        });

        it('fetchIPMPresets should handle websocket error', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('WS Fail'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchIPMPresets();
            expect(res).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[NutrientAPI:fetchIPMPresets] Error:'), expect.any(Error));
        });

        it('fetchNutrientInventory should return null and log error on WS failure', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Inv Fail'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchNutrientInventory();
            expect(res).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[NutrientAPI:fetchNutrientInventory] Error:'), expect.any(Error));
        });

        it('fetchNutrientInventory should return raw result and log error on validation failure', async () => {
            const badData = { 'stocks': { 'n1': { missing_fields: true } } };
            (mockHass.connection.sendMessagePromise as any).mockResolvedValue(badData);
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchNutrientInventory();
            expect(res).toBe(badData);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Nutrient Inventory Validation Failed:'), expect.anything());
        });

        it('fetchECRampCurves should return null and log error on WS failure', async () => {
            (mockHass.connection.sendMessagePromise as any).mockRejectedValue(new Error('Curve Fail'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const res = await service.fetchECRampCurves();
            expect(res).toBeNull();
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[NutrientAPI:fetchECRampCurves] Error:'), expect.any(Error));
        });

        it('should return null/void if hass is missing for all methods', async () => {
            service.updateHass(undefined as any);
            expect(await service.fetchNutrientInventory()).toBeNull();
            expect(await service.updateNutrientStock('n1', 'n', 1, 1)).toBeUndefined();
            expect(await service.removeNutrientStock('n1')).toBeUndefined();
            expect(await service.fetchIPMPresets()).toBeNull();
            expect(await service.fetchECRampCurves()).toBeNull();
        });
    });
});