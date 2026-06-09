import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../slices/strain', () => ({
  fetchStrainLibrary: vi.fn(),
  setStrainLibrary: vi.fn(),
}));

vi.mock('../../slices/nutrient', () => ({
  nutrientPresets$: { get: vi.fn(), set: vi.fn() },
  ipmPresets$: { get: vi.fn(), set: vi.fn() },
  nutrientInventory$: { get: vi.fn(), set: vi.fn() },
  ecRampCurves$: { get: vi.fn(), set: vi.fn() },
}));

import {
  fetchStrainLibrary,
  fetchNutrientPresets,
  fetchIPMPresets,
  fetchNutrientInventory,
  fetchECRampCurves,
  saveIPMPreset,
  removeIPMPreset,
} from './library-actions';

import {
  fetchStrainLibrary as strainSliceFetch,
  setStrainLibrary,
} from '../../slices/strain';

import {
  nutrientPresets$,
  ipmPresets$,
  nutrientInventory$,
  ecRampCurves$,
} from '../../slices/nutrient';

function makeCtx(dsOverrides: Record<string, unknown> = {}) {
  return {
    dataService: {
      fetchNutrientPresets: vi.fn().mockResolvedValue(undefined),
      fetchIPMPresets: vi.fn().mockResolvedValue(undefined),
      fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
      fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
      saveIPMPreset: vi.fn().mockResolvedValue(undefined),
      removeIPMPreset: vi.fn().mockResolvedValue(undefined),
      ...dsOverrides,
    },
    data: {},
    ui: { showToast: vi.fn() },
  } as any;
}

const STRAIN_KEY = 'growspace_strain_library_v2';
const NUTRIENT_PRESETS_KEY = 'growspace_nutrient_presets';
const IPM_PRESETS_KEY = 'growspace_ipm_presets';
const NUTRIENT_INVENTORY_KEY = 'growspace_nutrient_inventory';
const EC_RAMP_KEY = 'growspace_ec_ramp_curves';

function freshCache(data: unknown, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ timestamp: Date.now(), data, ...extra });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// fetchStrainLibrary
// ---------------------------------------------------------------------------

describe('fetchStrainLibrary', () => {
  it('uses cached data when cache is valid v2 and fresh', async () => {
    const strains = [{ name: 'OG Kush' }];
    localStorage.setItem(
      STRAIN_KEY,
      JSON.stringify({ version: 2, timestamp: Date.now(), data: strains })
    );

    await fetchStrainLibrary({} as any);

    expect(vi.mocked(setStrainLibrary)).toHaveBeenCalledWith(strains);
    expect(vi.mocked(strainSliceFetch)).not.toHaveBeenCalled();
  });

  it('fetches from server when cache is stale', async () => {
    const strains = [{ name: 'Blue Dream' }];
    localStorage.setItem(
      STRAIN_KEY,
      JSON.stringify({ version: 2, timestamp: Date.now() - 25 * 60 * 60 * 1000, data: strains })
    );
    vi.mocked(strainSliceFetch).mockResolvedValue(strains as any);

    await fetchStrainLibrary({} as any);

    expect(vi.mocked(strainSliceFetch)).toHaveBeenCalled();
  });

  it('removes corrupt cache and fetches from server', async () => {
    localStorage.setItem(STRAIN_KEY, 'not-valid-json');
    vi.mocked(strainSliceFetch).mockResolvedValue([] as any);

    await fetchStrainLibrary({} as any);

    expect(localStorage.getItem(STRAIN_KEY)).not.toBe('not-valid-json');
    expect(vi.mocked(strainSliceFetch)).toHaveBeenCalled();
  });

  it('stores fetched strains in localStorage cache', async () => {
    const strains = [{ name: 'Gorilla Glue' }];
    vi.mocked(strainSliceFetch).mockResolvedValue(strains as any);

    await fetchStrainLibrary({} as any, true);

    const stored = JSON.parse(localStorage.getItem(STRAIN_KEY)!);
    expect(stored.version).toBe(2);
    expect(stored.data).toEqual(strains);
  });

  it('does not cache when fetch returns non-array', async () => {
    vi.mocked(strainSliceFetch).mockResolvedValue(null as any);

    await fetchStrainLibrary({} as any, true);

    expect(localStorage.getItem(STRAIN_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchNutrientPresets
// ---------------------------------------------------------------------------

describe('fetchNutrientPresets', () => {
  it('uses cached presets when fresh', async () => {
    const presets = [{ name: 'Veg Mix' }];
    localStorage.setItem(NUTRIENT_PRESETS_KEY, freshCache(presets));
    const ctx = makeCtx();

    await fetchNutrientPresets(ctx);

    expect(vi.mocked(nutrientPresets$).set).toHaveBeenCalledWith(presets);
    expect(ctx.dataService.fetchNutrientPresets).not.toHaveBeenCalled();
  });

  it('removes corrupt cache entry and fetches from server', async () => {
    localStorage.setItem(NUTRIENT_PRESETS_KEY, '{bad json---');
    const ctx = makeCtx();
    vi.mocked(nutrientPresets$).get.mockReturnValue(null);

    await fetchNutrientPresets(ctx);

    expect(localStorage.getItem(NUTRIENT_PRESETS_KEY)).toBeNull();
    expect(ctx.dataService.fetchNutrientPresets).toHaveBeenCalled();
  });

  it('caches result after server fetch', async () => {
    const ctx = makeCtx();
    const presets = [{ name: 'Bloom Mix' }];
    vi.mocked(nutrientPresets$).get.mockReturnValue(presets as any);

    await fetchNutrientPresets(ctx, true);

    const stored = JSON.parse(localStorage.getItem(NUTRIENT_PRESETS_KEY)!);
    expect(stored.data).toEqual(presets);
  });
});

// ---------------------------------------------------------------------------
// fetchIPMPresets
// ---------------------------------------------------------------------------

describe('fetchIPMPresets', () => {
  it('uses cached IPM presets when fresh', async () => {
    const presets = [{ name: 'Neem spray' }];
    localStorage.setItem(IPM_PRESETS_KEY, freshCache(presets));
    const ctx = makeCtx();

    await fetchIPMPresets(ctx);

    expect(vi.mocked(ipmPresets$).set).toHaveBeenCalledWith(presets);
    expect(ctx.dataService.fetchIPMPresets).not.toHaveBeenCalled();
  });

  it('removes corrupt IPM cache and fetches from server', async () => {
    localStorage.setItem(IPM_PRESETS_KEY, 'oops-not-json');
    const ctx = makeCtx();
    vi.mocked(ipmPresets$).get.mockReturnValue(null);

    await fetchIPMPresets(ctx);

    expect(localStorage.getItem(IPM_PRESETS_KEY)).toBeNull();
    expect(ctx.dataService.fetchIPMPresets).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// fetchNutrientInventory
// ---------------------------------------------------------------------------

describe('fetchNutrientInventory', () => {
  it('uses cached inventory when fresh', async () => {
    const inventory = [{ id: 'n1', name: 'CalMag' }];
    localStorage.setItem(NUTRIENT_INVENTORY_KEY, freshCache(inventory));
    const ctx = makeCtx();

    await fetchNutrientInventory(ctx);

    expect(vi.mocked(nutrientInventory$).set).toHaveBeenCalledWith(inventory);
    expect(ctx.dataService.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('removes corrupt inventory cache and fetches from server', async () => {
    localStorage.setItem(NUTRIENT_INVENTORY_KEY, 'broken');
    const ctx = makeCtx();
    vi.mocked(nutrientInventory$).get.mockReturnValue(null);

    await fetchNutrientInventory(ctx);

    expect(localStorage.getItem(NUTRIENT_INVENTORY_KEY)).toBeNull();
    expect(ctx.dataService.fetchNutrientInventory).toHaveBeenCalled();
  });

  it('caches inventory result after server fetch', async () => {
    const ctx = makeCtx();
    const inventory = [{ id: 'n2', name: 'GH Trio' }];
    vi.mocked(nutrientInventory$).get.mockReturnValue(inventory as any);

    await fetchNutrientInventory(ctx, true);

    const stored = JSON.parse(localStorage.getItem(NUTRIENT_INVENTORY_KEY)!);
    expect(stored.data).toEqual(inventory);
  });
});

// ---------------------------------------------------------------------------
// fetchECRampCurves
// ---------------------------------------------------------------------------

describe('fetchECRampCurves', () => {
  it('uses cached EC ramp curves when fresh', async () => {
    const curves = [{ id: 'c1', name: 'Veg ramp' }];
    localStorage.setItem(EC_RAMP_KEY, freshCache(curves));
    const ctx = makeCtx();

    await fetchECRampCurves(ctx);

    expect(vi.mocked(ecRampCurves$).set).toHaveBeenCalledWith(curves);
    expect(ctx.dataService.fetchECRampCurves).not.toHaveBeenCalled();
  });

  it('removes corrupt EC ramp cache and fetches from server', async () => {
    localStorage.setItem(EC_RAMP_KEY, 'not-json!');
    const ctx = makeCtx();
    vi.mocked(ecRampCurves$).get.mockReturnValue(null);

    await fetchECRampCurves(ctx);

    expect(localStorage.getItem(EC_RAMP_KEY)).toBeNull();
    expect(ctx.dataService.fetchECRampCurves).toHaveBeenCalled();
  });

  it('caches EC ramp result after server fetch', async () => {
    const ctx = makeCtx();
    const curves = [{ id: 'c2', name: 'Bloom ramp' }];
    vi.mocked(ecRampCurves$).get.mockReturnValue(curves as any);

    await fetchECRampCurves(ctx, true);

    const stored = JSON.parse(localStorage.getItem(EC_RAMP_KEY)!);
    expect(stored.data).toEqual(curves);
  });

  it('logs error and does not throw when server fetch fails', async () => {
    const ctx = makeCtx({
      fetchECRampCurves: vi.fn().mockRejectedValue(new Error('server error')),
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchECRampCurves(ctx, true)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to fetch EC ramp curves:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});


// ---------------------------------------------------------------------------
// removeIPMPreset
// ---------------------------------------------------------------------------

describe('removeIPMPreset', () => {
  it('calls dataService.removeIPMPreset and shows success toast', async () => {
    const ctx = makeCtx();
    vi.mocked(ipmPresets$).get.mockReturnValue(null);

    await removeIPMPreset(ctx, 'ipm-1');

    expect(ctx.dataService.removeIPMPreset).toHaveBeenCalledWith('ipm-1');
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Removed IPM preset', 'success');
  });

  it('shows error toast and rethrows on failure', async () => {
    const ctx = makeCtx({
      removeIPMPreset: vi.fn().mockRejectedValue(new Error('ipm remove failed')),
    });

    await expect(removeIPMPreset(ctx, 'ipm-1')).rejects.toThrow('ipm remove failed');
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('ipm remove failed'),
      'error'
    );
  });
});

// ---------------------------------------------------------------------------
// saveIPMPreset (existing coverage kept)
// ---------------------------------------------------------------------------

const validPreset = {
  name: 'Weekly Neem',
  type: 'foliar' as const,
  items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L', phi_days: 3 }],
};

describe('saveIPMPreset', () => {
  it('calls dataService.saveIPMPreset with the preset data', async () => {
    const ctx = makeCtx();
    vi.mocked(ipmPresets$).get.mockReturnValue(null);

    await saveIPMPreset(ctx, validPreset);

    expect(ctx.dataService.saveIPMPreset).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Weekly Neem' })
    );
  });

  it('refreshes IPM presets after saving', async () => {
    const ctx = makeCtx();
    vi.mocked(ipmPresets$).get.mockReturnValue(null);

    await saveIPMPreset(ctx, validPreset);

    expect(ctx.dataService.fetchIPMPresets).toHaveBeenCalled();
  });

  it('shows success toast after saving', async () => {
    const ctx = makeCtx();
    vi.mocked(ipmPresets$).get.mockReturnValue(null);

    await saveIPMPreset(ctx, validPreset);

    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Weekly Neem'),
      'success'
    );
  });

  it('shows error toast and rethrows when save fails', async () => {
    const ctx = makeCtx({
      saveIPMPreset: vi.fn().mockRejectedValue(new Error('network error')),
    });

    await expect(saveIPMPreset(ctx, validPreset)).rejects.toThrow('network error');
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('network error'),
      'error'
    );
  });

  it('shows "Unknown error" in toast when a non-Error is thrown', async () => {
    const ctx = makeCtx({
      saveIPMPreset: vi.fn().mockRejectedValue('plain string error'),
    });

    await expect(saveIPMPreset(ctx, validPreset)).rejects.toBe('plain string error');
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Unknown error'),
      'error'
    );
  });
});

// ---------------------------------------------------------------------------
// Non-Error throw branches for removeIPMPreset
// ---------------------------------------------------------------------------

describe('removeIPMPreset — non-Error throw', () => {
  it('shows "Unknown error" in toast when a non-Error is thrown', async () => {
    const ctx = makeCtx({
      removeIPMPreset: vi.fn().mockRejectedValue({ code: 500 }),
    });

    await expect(removeIPMPreset(ctx, 'ipm-1')).rejects.toEqual({ code: 500 });
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('Unknown error'),
      'error'
    );
  });
});

describe('fetchECRampCurves — stale cache', () => {
  it('bypasses stale cache and fetches from server', async () => {
    const staleCache = JSON.stringify({ timestamp: Date.now() - 31 * 60 * 1000, data: [] });
    localStorage.setItem(EC_RAMP_KEY, staleCache);
    const ctx = makeCtx();
    vi.mocked(ecRampCurves$).get.mockReturnValue(null);

    await fetchECRampCurves(ctx);

    expect(ctx.dataService.fetchECRampCurves).toHaveBeenCalled();
  });
});
