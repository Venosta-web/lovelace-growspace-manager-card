import { atom, type WritableAtom } from 'nanostores';
import { z } from 'zod';
import { hassCall, callService } from '../../services/hass-call';
import { readCache, writeCache, type CacheOptions } from '../../lib/local-cache';
import {
  NutrientPresetsSchema,
  IPMPresetsSchema,
  NutrientInventorySchema,
  ECRampCurvesSchema,
  type NutrientPresetsResponse,
  type IPMPresetsResponse,
  type NutrientInventoryResponse,
  type ECRampCurvesResponse,
  type ECRampPoint,
} from './schema';

export type {
  NutrientPresetsResponse,
  IPMPresetsResponse,
  NutrientInventoryResponse,
  ECRampCurvesResponse,
};
export type { ECRampPoint };
export type { IPMPreset, ECRampCurve, NutrientStock, NutrientStockType } from './schema';
export { NUTRIENT_STOCK_TYPES } from './schema';

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

export const nutrientPresets$ = atom<NutrientPresetsResponse | null>(null);
export const ipmPresets$ = atom<IPMPresetsResponse | null>(null);
export const nutrientInventory$ = atom<NutrientInventoryResponse | null>(null);
export const ecRampCurves$ = atom<ECRampCurvesResponse | null>(null);

// ---------------------------------------------------------------------------
// Fetch mutators
// ---------------------------------------------------------------------------

/**
 * Shared read-through cache wrapper for the fetch mutators.
 *
 * Default (no `opts.cache`): a plain fresh fetch that sets the atom and rethrows
 * on failure — the contract the cross-slice refetch / dialog self-fetch callers
 * rely on. With `opts.cache`: serve a fresh-enough cached value, otherwise fetch,
 * cache, and (matching the retired library-actions wrapper) swallow fetch errors.
 */
async function _fetchWithOptionalCache<T>(
  opts: CacheOptions | undefined,
  cacheKey: string,
  ttlMs: number,
  store: WritableAtom<T | null>,
  fetcher: () => Promise<T>,
  errorLabel: string
): Promise<void> {
  if (!opts?.cache) {
    store.set(await fetcher());
    return;
  }
  if (!opts.force) {
    const cached = readCache<T>(cacheKey, ttlMs);
    if (cached) {
      store.set(cached);
      return;
    }
  }
  try {
    const result = await fetcher();
    store.set(result);
    writeCache(cacheKey, result);
  } catch (e) {
    console.error(errorLabel, e);
  }
}

const MINUTE = 60 * 1000;

export function fetchNutrientPresets(opts?: CacheOptions): Promise<void> {
  return _fetchWithOptionalCache(
    opts,
    'growspace_nutrient_presets',
    30 * MINUTE,
    nutrientPresets$,
    () => hassCall('growspace_manager/get_nutrient_presets', {}, NutrientPresetsSchema),
    'Failed to fetch nutrient presets:'
  );
}

export function fetchIPMPresets(opts?: CacheOptions): Promise<void> {
  return _fetchWithOptionalCache(
    opts,
    'growspace_ipm_presets',
    30 * MINUTE,
    ipmPresets$,
    () => hassCall('growspace_manager/get_ipm_presets', {}, IPMPresetsSchema),
    'Failed to fetch IPM presets:'
  );
}

export function fetchNutrientInventory(opts?: CacheOptions): Promise<void> {
  return _fetchWithOptionalCache(
    opts,
    'growspace_nutrient_inventory',
    5 * MINUTE,
    nutrientInventory$,
    () => hassCall('growspace_manager/get_nutrient_inventory', {}, NutrientInventorySchema),
    'Failed to fetch nutrient inventory:'
  );
}

export function fetchECRampCurves(opts?: CacheOptions): Promise<void> {
  return _fetchWithOptionalCache(
    opts,
    'growspace_ec_ramp_curves',
    30 * MINUTE,
    ecRampCurves$,
    () => hassCall('growspace_manager/get_ec_ramp_curves', {}, ECRampCurvesSchema),
    'Failed to fetch EC ramp curves:'
  );
}

// ---------------------------------------------------------------------------
// Write mutators — nutrient presets
// ---------------------------------------------------------------------------

export async function saveNutrientPreset(data: {
  preset_id?: string;
  name: string;
  nutrients: { nutrient_id: string; dose_ml_l: number }[];
  stage?: string;
  min_days_in_stage?: number;
  week?: number;
  ec_target?: number | null;
  ph_target?: number | null;
}): Promise<void> {
  await callService('growspace_manager', 'save_nutrient_preset', data as Record<string, unknown>);
}

export async function removeNutrientPreset(presetId: string): Promise<void> {
  await callService('growspace_manager', 'remove_nutrient_preset', { preset_id: presetId });
}

// ---------------------------------------------------------------------------
// Write mutators — IPM presets
// ---------------------------------------------------------------------------

export async function saveIPMPreset(data: {
  preset_id?: string;
  name: string;
  type: string;
  items: { name: string; dose_amount: number; dose_unit: string }[];
  stage?: string;
  min_days_in_stage?: number;
}): Promise<void> {
  await callService('growspace_manager', 'save_ipm_preset', data as Record<string, unknown>);
}

export async function removeIPMPreset(presetId: string): Promise<void> {
  await callService('growspace_manager', 'remove_ipm_preset', { preset_id: presetId });
}

export async function applyIPM(data: {
  preset_id: string;
  growspace_id?: string;
  plant_ids?: string[];
  notes?: string;
}): Promise<void> {
  await callService('growspace_manager', 'apply_ipm', data as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Write mutators — nutrient inventory
// ---------------------------------------------------------------------------

export async function updateNutrientStock(
  nutrientId: string,
  name: string,
  currentMl: number,
  initialMl: number,
  brand: string = '',
  stockType: string = 'base',
  npk: string = '',
  doseMlL: number = 0,
  notes: string = ''
): Promise<void> {
  await hassCall(
    'growspace_manager/update_nutrient_stock',
    {
      nutrient_id: nutrientId,
      name,
      current_ml: currentMl,
      initial_ml: initialMl,
      brand,
      stock_type: stockType,
      npk,
      dose_ml_l: doseMlL,
      notes,
    },
    z.unknown()
  );
}

export async function removeNutrientStock(nutrientId: string): Promise<void> {
  await hassCall(
    'growspace_manager/remove_nutrient_stock',
    { nutrient_id: nutrientId },
    z.unknown()
  );
}

// ---------------------------------------------------------------------------
// Write mutators — EC Ramp Curves
// ---------------------------------------------------------------------------

export async function saveECRampCurve(data: {
  curve_id?: string;
  name: string;
  stage?: string;
  points: ECRampPoint[];
}): Promise<void> {
  const backendData = {
    curve_id: data.curve_id,
    name: data.name,
    stage: data.stage ?? 'flower',
    points: data.points.map((p) => ({
      week: Math.floor((p.day - 1) / 7) + 1,
      ec_min: p.target_ec,
      ec_max: p.target_ec + 0.4,
    })),
  };
  await callService(
    'growspace_manager',
    'save_ec_ramp_curve',
    backendData as Record<string, unknown>
  );
}

export async function removeECRampCurve(curveId: string): Promise<void> {
  await callService('growspace_manager', 'remove_ec_ramp_curve', { curve_id: curveId });
}
