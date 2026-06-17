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
  fetchNutrientPresets: vi.fn().mockResolvedValue(undefined),
  fetchIPMPresets: vi.fn().mockResolvedValue(undefined),
  fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
  fetchECRampCurves: vi.fn().mockResolvedValue(undefined),
  updateNutrientStock: vi.fn().mockResolvedValue(undefined),
  removeNutrientStock: vi.fn().mockResolvedValue(undefined),
  saveECRampCurve: vi.fn().mockResolvedValue(undefined),
  removeECRampCurve: vi.fn().mockResolvedValue(undefined),
}));

import {
  fetchStrainLibrary,
  fetchNutrientPresets,
  fetchIPMPresets,
  fetchNutrientInventory,
  fetchECRampCurves,
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
  fetchNutrientPresets as nutrientSliceFetchPresets,
  fetchIPMPresets as nutrientSliceFetchIPMPresets,
  fetchNutrientInventory as nutrientSliceFetchInventory,
  fetchECRampCurves as nutrientSliceFetchECRampCurves,
} from '../../slices/nutrient';

function makeCtx() {
  return {
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
    expect(nutrientSliceFetchPresets).not.toHaveBeenCalled();
  });

  it('removes corrupt cache entry and fetches from server', async () => {
    localStorage.setItem(NUTRIENT_PRESETS_KEY, '{bad json---');
    const ctx = makeCtx();
    vi.mocked(nutrientPresets$).get.mockReturnValue(null);

    await fetchNutrientPresets(ctx);

    expect(localStorage.getItem(NUTRIENT_PRESETS_KEY)).toBeNull();
    expect(nutrientSliceFetchPresets).toHaveBeenCalled();
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
    expect(nutrientSliceFetchIPMPresets).not.toHaveBeenCalled();
  });

  it('removes corrupt IPM cache and fetches from server', async () => {
    localStorage.setItem(IPM_PRESETS_KEY, 'oops-not-json');
    const ctx = makeCtx();
    vi.mocked(ipmPresets$).get.mockReturnValue(null);

    await fetchIPMPresets(ctx);

    expect(localStorage.getItem(IPM_PRESETS_KEY)).toBeNull();
    expect(nutrientSliceFetchIPMPresets).toHaveBeenCalled();
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
    expect(nutrientSliceFetchInventory).not.toHaveBeenCalled();
  });

  it('removes corrupt inventory cache and fetches from server', async () => {
    localStorage.setItem(NUTRIENT_INVENTORY_KEY, 'broken');
    const ctx = makeCtx();
    vi.mocked(nutrientInventory$).get.mockReturnValue(null);

    await fetchNutrientInventory(ctx);

    expect(localStorage.getItem(NUTRIENT_INVENTORY_KEY)).toBeNull();
    expect(nutrientSliceFetchInventory).toHaveBeenCalled();
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
    expect(nutrientSliceFetchECRampCurves).not.toHaveBeenCalled();
  });

  it('removes corrupt EC ramp cache and fetches from server', async () => {
    localStorage.setItem(EC_RAMP_KEY, 'not-json!');
    const ctx = makeCtx();
    vi.mocked(ecRampCurves$).get.mockReturnValue(null);

    await fetchECRampCurves(ctx);

    expect(localStorage.getItem(EC_RAMP_KEY)).toBeNull();
    expect(nutrientSliceFetchECRampCurves).toHaveBeenCalled();
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
    vi.mocked(nutrientSliceFetchECRampCurves).mockRejectedValueOnce(new Error('server error'));
    const ctx = makeCtx();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchECRampCurves(ctx, true)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to fetch EC ramp curves:',
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});

describe('fetchECRampCurves — stale cache', () => {
  it('bypasses stale cache and fetches from server', async () => {
    const staleCache = JSON.stringify({ timestamp: Date.now() - 31 * 60 * 1000, data: [] });
    localStorage.setItem(EC_RAMP_KEY, staleCache);
    const ctx = makeCtx();
    vi.mocked(ecRampCurves$).get.mockReturnValue(null);

    await fetchECRampCurves(ctx);

    expect(nutrientSliceFetchECRampCurves).toHaveBeenCalled();
  });
});
