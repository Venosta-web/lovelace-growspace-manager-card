import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    fetchStrainLibrary,
    fetchNutrientPresets,
    fetchIPMPresets,
    fetchNutrientInventory,
    updateNutrientStock,
    removeNutrientStock,
    fetchECRampCurves,
    saveECRampCurve,
    removeECRampCurve,
    saveNutrientPreset,
    removeNutrientPreset,
    removeIPMPreset,
} from '../../src/store/plant/library-actions';
import { ActionContext } from '../../src/store/core/action-context';

describe('LibraryActions', () => {
    let ctx: ActionContext;
    let mockDataService: any;
    let mockData: any;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.useFakeTimers();

        mockDataService = {
            fetchStrainLibrary: vi.fn(),
            fetchNutrientPresets: vi.fn(),
            fetchIPMPresets: vi.fn(),
            fetchNutrientInventory: vi.fn(),
            updateNutrientStock: vi.fn(),
            removeNutrientStock: vi.fn(),
            fetchECRampCurves: vi.fn(),
            saveECRampCurve: vi.fn(),
            removeECRampCurve: vi.fn(),
            saveNutrientPreset: vi.fn(),
            removeNutrientPreset: vi.fn(),
            removeIPMPreset: vi.fn(),
        };

        mockData = {
            setStrainLibrary: vi.fn(),
            setNutrientPresets: vi.fn(),
            setIPMPresets: vi.fn(),
            setNutrientInventory: vi.fn(),
            setECRampCurves: vi.fn(),
        };

        ctx = {
            hass: { connection: {} },
            dataService: mockDataService,
            data: mockData,
            showToast: vi.fn(),
            ui: { showToast: vi.fn() } as any,
            refreshData: vi.fn(),
        } as any;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('fetchECRampCurves', () => {
        const CACHE_KEY = 'growspace_ec_ramp_curves';
        const mockCurves = [{ curve_id: 'c1', name: 'Curve 1' }];

        // hass guard removed — ActionDispatcher guards against calling fetches before hass is ready

        it('should fetch from server and cache when no cache exists', async () => {
            mockDataService.fetchECRampCurves.mockResolvedValue(mockCurves);

            await fetchECRampCurves(ctx);

            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled();
            expect(mockData.setECRampCurves).toHaveBeenCalledWith(mockCurves);

            const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            expect(cached.data).toEqual(mockCurves);
            expect(cached.timestamp).toBeDefined();
        });

        it('should use valid cache and not fetch from server', async () => {
            const cacheData = {
                timestamp: Date.now(),
                data: mockCurves
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

            await fetchECRampCurves(ctx);

            expect(mockDataService.fetchECRampCurves).not.toHaveBeenCalled();
            expect(mockData.setECRampCurves).toHaveBeenCalledWith(mockCurves);
        });

        it('should fetch from server if cache is expired', async () => {
            const expiredTimestamp = Date.now() - (31 * 60 * 1000); // 31 mins ago
            const cacheData = {
                timestamp: expiredTimestamp,
                data: mockCurves
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            mockDataService.fetchECRampCurves.mockResolvedValue([{ curve_id: 'fresh' }]);

            await fetchECRampCurves(ctx);

            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled();
            expect(mockData.setECRampCurves).toHaveBeenCalledWith([{ curve_id: 'fresh' }]);
        });

        it('should fetch from server if force is true', async () => {
            const cacheData = {
                timestamp: Date.now(),
                data: mockCurves
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            mockDataService.fetchECRampCurves.mockResolvedValue([{ curve_id: 'forced' }]);

            await fetchECRampCurves(ctx, true);

            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled();
        });

        it('should handle corrupt cache', async () => {
            localStorage.setItem(CACHE_KEY, 'invalid-json');
            mockDataService.fetchECRampCurves.mockResolvedValue(mockCurves);

            await fetchECRampCurves(ctx);

            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled();
            expect(localStorage.getItem(CACHE_KEY)).not.toBe('invalid-json');
        });

        it('should log error on fetch failure', async () => {
            const error = new Error('Fetch failed');
            mockDataService.fetchECRampCurves.mockRejectedValue(error);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await fetchECRampCurves(ctx);

            expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch EC ramp curves:', error);
            consoleSpy.mockRestore();
        });

        it('should handle missing timestamp in cache (line 210)', async () => {
            const cacheData = {
                data: mockCurves
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            // Should fallback to 0 and likely be expired (Age = Date.now())
            mockDataService.fetchECRampCurves.mockResolvedValue(mockCurves);
            await fetchECRampCurves(ctx);
            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled();
        });
    });

    describe('saveECRampCurve', () => {
        const curveData = { name: 'New Curve', points: [] };

        it('should save curve, refresh and show toast', async () => {
            mockDataService.saveECRampCurve.mockResolvedValue({ success: true });

            await saveECRampCurve(ctx, curveData);

            expect(mockDataService.saveECRampCurve).toHaveBeenCalledWith(curveData);
            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled(); // via refresh
            expect(ctx.ui.showToast).toHaveBeenCalledWith(`Saved EC ramp: ${curveData.name}`, 'success');
        });

        it('should handle errors and show error toast', async () => {
            mockDataService.saveECRampCurve.mockRejectedValue(new Error('Save error'));

            await saveECRampCurve(ctx, curveData);

            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to save EC ramp: Save error', 'error');
        });

        it('should handle unknown errors gently', async () => {
            mockDataService.saveECRampCurve.mockRejectedValue('String Error');

            await saveECRampCurve(ctx, curveData);

            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to save EC ramp: Unknown error', 'error');
        });
    });

    describe('removeECRampCurve', () => {
        it('should remove curve, refresh and show toast', async () => {
            mockDataService.removeECRampCurve.mockResolvedValue({ success: true });

            await removeECRampCurve(ctx, 'c1');

            expect(mockDataService.removeECRampCurve).toHaveBeenCalledWith('c1');
            expect(mockDataService.fetchECRampCurves).toHaveBeenCalled();
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Removed EC ramp curve', 'success');
        });

        it('should handle removal errors', async () => {
            mockDataService.removeECRampCurve.mockRejectedValue(new Error('Remove error'));

            await removeECRampCurve(ctx, 'c1');

            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to remove EC ramp: Remove error', 'error');
        });

        it('should handle non-Error catch in removeECRampCurve (line 261)', async () => {
            mockDataService.removeECRampCurve.mockRejectedValue('string error');
            await removeECRampCurve(ctx, 'c1');
            expect(ctx.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
        });
    });

    describe('fetchStrainLibrary', () => {
        const CACHE_KEY = 'growspace_strain_library_v2';
        const mockStrains = [{ name: 'S1' }];

        // hass guard removed — ActionDispatcher guards against calling fetches before hass is ready

        it('should handle fetchStrainLibrary correctly (cache miss)', async () => {
            mockDataService.fetchStrainLibrary.mockResolvedValue(mockStrains);
            await fetchStrainLibrary(ctx);
            expect(mockData.setStrainLibrary).toHaveBeenCalledWith(mockStrains);
            expect(localStorage.getItem(CACHE_KEY)).toContain('S1');
        });

        it('should use valid cache', async () => {
            const cacheData = {
                version: 2,
                timestamp: Date.now(),
                data: mockStrains
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            await fetchStrainLibrary(ctx);
            expect(mockDataService.fetchStrainLibrary).not.toHaveBeenCalled();
            expect(mockData.setStrainLibrary).toHaveBeenCalledWith(mockStrains);
        });

        it('should handle invalid cache version or data', async () => {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, data: [] }));
            mockDataService.fetchStrainLibrary.mockResolvedValue(mockStrains);
            await fetchStrainLibrary(ctx);
            expect(mockDataService.fetchStrainLibrary).toHaveBeenCalled();
        });

        it('should handle JSON parse error', async () => {
            localStorage.setItem(CACHE_KEY, 'invalid-json');
            mockDataService.fetchStrainLibrary.mockResolvedValue(mockStrains);
            await fetchStrainLibrary(ctx);
            expect(mockDataService.fetchStrainLibrary).toHaveBeenCalled();
            expect(localStorage.getItem(CACHE_KEY)).not.toBe('invalid-json');
        });

        it('should handle fetch error', async () => {
            const error = new Error('fail');
            mockDataService.fetchStrainLibrary.mockRejectedValue(error);
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await fetchStrainLibrary(ctx);
            expect(spy).toHaveBeenCalledWith('Failed to fetch strain library:', error);
            spy.mockRestore();
        });
    });

    describe('fetchNutrientPresets', () => {
        const CACHE_KEY = 'growspace_nutrient_presets';
        it('should use valid cache', async () => {
            const data = { p1: {} };
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
            await fetchNutrientPresets(ctx);
            expect(mockData.setNutrientPresets).toHaveBeenCalledWith(data);
        });

        it('should handle parse error', async () => {
            localStorage.setItem(CACHE_KEY, '{corrupt');
            mockDataService.fetchNutrientPresets.mockResolvedValue(null);
            await fetchNutrientPresets(ctx);
            expect(localStorage.getItem(CACHE_KEY)).toBeNull();
        });

        it('should handle fetch error', async () => {
            mockDataService.fetchNutrientPresets.mockRejectedValue('error');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await fetchNutrientPresets(ctx);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should fetch from server and cache on success', async () => {
            const data = { p1: { name: 'P' } };
            mockDataService.fetchNutrientPresets.mockResolvedValue(data);
            await fetchNutrientPresets(ctx, true);
            expect(mockData.setNutrientPresets).toHaveBeenCalledWith(data);
            expect(localStorage.getItem(CACHE_KEY)).toContain('"data":{"p1":{"name":"P"}}');
        });
    });

    describe('fetchIPMPresets', () => {
        const CACHE_KEY = 'growspace_ipm_presets';
        it('should use valid cache', async () => {
            const data = { i1: {} };
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
            await fetchIPMPresets(ctx);
            expect(mockData.setIPMPresets).toHaveBeenCalledWith(data);
        });

        it('should handle parse error', async () => {
            localStorage.setItem(CACHE_KEY, '{corrupt');
            mockDataService.fetchIPMPresets.mockResolvedValue(null);
            await fetchIPMPresets(ctx);
            expect(localStorage.getItem(CACHE_KEY)).toBeNull();
        });

        it('should handle fetch error', async () => {
            mockDataService.fetchIPMPresets.mockRejectedValue('error');
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await fetchIPMPresets(ctx);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should fetch from server and cache on success', async () => {
            const data = { i1: { name: 'I' } };
            mockDataService.fetchIPMPresets.mockResolvedValue(data);
            await fetchIPMPresets(ctx, true);
            expect(mockData.setIPMPresets).toHaveBeenCalledWith(data);
            expect(localStorage.getItem(CACHE_KEY)).toContain('"data":{"i1":{"name":"I"}}');
        });
    });

    describe('fetchNutrientInventory', () => {
        const CACHE_KEY = 'growspace_nutrient_inventory';
        it('should use valid cache', async () => {
            const data = [{ id: 'n1' }];
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
            await fetchNutrientInventory(ctx);
            expect(mockData.setNutrientInventory).toHaveBeenCalledWith(data);
        });

        it('should handle parse error', async () => {
            localStorage.setItem(CACHE_KEY, '{corrupt');
            mockDataService.fetchNutrientInventory.mockResolvedValue(null);
            await fetchNutrientInventory(ctx);
            expect(localStorage.getItem(CACHE_KEY)).toBeNull(); // Line 151
        });

        it('should handle fetch error', async () => {
            mockDataService.fetchNutrientInventory.mockRejectedValue(new Error('fail'));
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            await fetchNutrientInventory(ctx);
            expect(spy).toHaveBeenCalled(); // Line 168
            spy.mockRestore();
        });

        it('should fetch from server and cache on success', async () => {
            const data = [{ id: 'n1', name: 'N1' }];
            mockDataService.fetchNutrientInventory.mockResolvedValue(data);
            await fetchNutrientInventory(ctx, true);
            expect(mockData.setNutrientInventory).toHaveBeenCalledWith(data);
            expect(localStorage.getItem(CACHE_KEY)).toContain('"data":[{"id":"n1","name":"N1"}]');
        });
    });

    describe('updateNutrientStock', () => {
        it('should update stock and refresh', async () => {
            await updateNutrientStock(ctx, 'n1', 'Nutrient', 100, 1000);
            expect(mockDataService.updateNutrientStock).toHaveBeenCalled();
            expect(mockDataService.fetchNutrientInventory).toHaveBeenCalled();
        });

        it('should handle update error', async () => {
            mockDataService.updateNutrientStock.mockRejectedValue(new Error('fail'));
            await updateNutrientStock(ctx, 'n1', 'Nutrient', 100, 1000);
            expect(ctx.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
        });

        it('should handle non-Error catch', async () => {
            mockDataService.updateNutrientStock.mockRejectedValue('string error');
            await updateNutrientStock(ctx, 'n1', 'Nutrient', 100, 1000);
            expect(ctx.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
        });
    });

    describe('saveNutrientPreset', () => {
        const preset = {
            name: 'Bloom Boost',
            nutrients: [{ name: 'PK 13/14', dose_ml_l: 1.5 }],
            stage: 'flower',
        };

        it('saves preset via dataService and shows success toast', async () => {
            mockDataService.saveNutrientPreset.mockResolvedValue(undefined);
            mockDataService.fetchNutrientPresets.mockResolvedValue(null);

            await saveNutrientPreset(ctx, preset);

            expect(mockDataService.saveNutrientPreset).toHaveBeenCalledWith(preset);
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Saved preset: Bloom Boost', 'success');
        });

        it('refreshes nutrient presets after saving', async () => {
            mockDataService.saveNutrientPreset.mockResolvedValue(undefined);
            mockDataService.fetchNutrientPresets.mockResolvedValue(null);

            await saveNutrientPreset(ctx, preset);

            expect(mockDataService.fetchNutrientPresets).toHaveBeenCalled();
        });

        it('shows error toast with message and rethrows when save fails (Error)', async () => {
            mockDataService.saveNutrientPreset.mockRejectedValue(new Error('server error'));

            await expect(saveNutrientPreset(ctx, preset)).rejects.toThrow('server error');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to save preset: server error', 'error');
        });

        it('shows "Unknown error" toast and rethrows when save fails (non-Error)', async () => {
            mockDataService.saveNutrientPreset.mockRejectedValue('string failure');

            await expect(saveNutrientPreset(ctx, preset)).rejects.toBe('string failure');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to save preset: Unknown error', 'error');
        });
    });

    describe('removeNutrientPreset', () => {
        it('removes preset via dataService and shows success toast', async () => {
            mockDataService.removeNutrientPreset.mockResolvedValue(undefined);
            mockDataService.fetchNutrientPresets.mockResolvedValue(null);

            await removeNutrientPreset(ctx, 'preset-1');

            expect(mockDataService.removeNutrientPreset).toHaveBeenCalledWith('preset-1');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Removed nutrient preset', 'success');
        });

        it('refreshes nutrient presets after removal', async () => {
            mockDataService.removeNutrientPreset.mockResolvedValue(undefined);
            mockDataService.fetchNutrientPresets.mockResolvedValue(null);

            await removeNutrientPreset(ctx, 'preset-1');

            expect(mockDataService.fetchNutrientPresets).toHaveBeenCalled();
        });

        it('shows error toast with message and rethrows when removal fails (Error)', async () => {
            mockDataService.removeNutrientPreset.mockRejectedValue(new Error('not found'));

            await expect(removeNutrientPreset(ctx, 'preset-1')).rejects.toThrow('not found');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to remove preset: not found', 'error');
        });

        it('shows "Unknown error" toast and rethrows when removal fails (non-Error)', async () => {
            mockDataService.removeNutrientPreset.mockRejectedValue(42);

            await expect(removeNutrientPreset(ctx, 'preset-1')).rejects.toBe(42);
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to remove preset: Unknown error', 'error');
        });
    });

    describe('removeIPMPreset', () => {
        it('removes IPM preset via dataService and shows success toast', async () => {
            mockDataService.removeIPMPreset.mockResolvedValue(undefined);
            mockDataService.fetchIPMPresets.mockResolvedValue(null);

            await removeIPMPreset(ctx, 'ipm-1');

            expect(mockDataService.removeIPMPreset).toHaveBeenCalledWith('ipm-1');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Removed IPM preset', 'success');
        });

        it('refreshes IPM presets after removal', async () => {
            mockDataService.removeIPMPreset.mockResolvedValue(undefined);
            mockDataService.fetchIPMPresets.mockResolvedValue(null);

            await removeIPMPreset(ctx, 'ipm-1');

            expect(mockDataService.fetchIPMPresets).toHaveBeenCalled();
        });

        it('shows error toast with message and rethrows when removal fails (Error)', async () => {
            mockDataService.removeIPMPreset.mockRejectedValue(new Error('forbidden'));

            await expect(removeIPMPreset(ctx, 'ipm-1')).rejects.toThrow('forbidden');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to remove IPM preset: forbidden', 'error');
        });

        it('shows "Unknown error" toast and rethrows when removal fails (non-Error)', async () => {
            mockDataService.removeIPMPreset.mockRejectedValue('oops');

            await expect(removeIPMPreset(ctx, 'ipm-1')).rejects.toBe('oops');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to remove IPM preset: Unknown error', 'error');
        });
    });

    describe('removeNutrientStock', () => {
        it('should remove stock and refresh', async () => {
            await removeNutrientStock(ctx, 'n1');
            expect(mockDataService.removeNutrientStock).toHaveBeenCalled();
        });
        it('should handle removal errors', async () => {
            mockDataService.removeNutrientStock.mockRejectedValue(new Error('delete fail'));
            await removeNutrientStock(ctx, 'n1');
            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to remove stock: delete fail', 'error');
        });

        it('should handle non-Error catch in removeNutrientStock (line 195)', async () => {
            mockDataService.removeNutrientStock.mockRejectedValue('string error');
            await removeNutrientStock(ctx, 'n1');
            expect(ctx.ui.showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
        });
    });
});
