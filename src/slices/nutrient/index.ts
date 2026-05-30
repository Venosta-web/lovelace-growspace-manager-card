import { atom } from 'nanostores';
import { z } from 'zod';
import { hassCall, callService } from '../../services/hass-call';
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

export type { NutrientPresetsResponse, IPMPresetsResponse, NutrientInventoryResponse, ECRampCurvesResponse };
export type { ECRampPoint };
export type { IPMPreset, ECRampCurve, NutrientStock } from './schema';

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

export async function fetchNutrientPresets(): Promise<void> {
  const result = await hassCall('growspace_manager/get_nutrient_presets', {}, NutrientPresetsSchema);
  nutrientPresets$.set(result);
}

export async function fetchIPMPresets(): Promise<void> {
  const result = await hassCall('growspace_manager/get_ipm_presets', {}, IPMPresetsSchema);
  ipmPresets$.set(result);
}

export async function fetchNutrientInventory(): Promise<void> {
  const result = await hassCall('growspace_manager/get_nutrient_inventory', {}, NutrientInventorySchema);
  nutrientInventory$.set(result);
}

export async function fetchECRampCurves(): Promise<void> {
  const result = await hassCall('growspace_manager/get_ec_ramp_curves', {}, ECRampCurvesSchema);
  ecRampCurves$.set(result);
}

// ---------------------------------------------------------------------------
// Write mutators — nutrient presets
// ---------------------------------------------------------------------------

export async function saveNutrientPreset(data: {
  preset_id?: string;
  name: string;
  nutrients: { name: string; dose_ml_l: number }[];
  stage?: string;
  min_days_in_stage?: number;
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
  initialMl: number
): Promise<void> {
  await hassCall(
    'growspace_manager/update_nutrient_stock',
    { nutrient_id: nutrientId, name, current_ml: currentMl, initial_ml: initialMl },
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
  await callService('growspace_manager', 'save_ec_ramp_curve', backendData as Record<string, unknown>);
}

export async function removeECRampCurve(curveId: string): Promise<void> {
  await callService('growspace_manager', 'remove_ec_ramp_curve', { curve_id: curveId });
}
