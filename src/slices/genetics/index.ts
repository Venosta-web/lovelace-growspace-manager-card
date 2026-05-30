import { atom } from 'nanostores';
import { z } from 'zod';
import { hassCall, callService } from '../../services/hass-call';
import type { SeedBatch, PollinationEvent } from '../../types';
import { GeneticsDataSchema, LineageNodeSchema } from './schema';
import type { LineageNode } from '../../features/plants/types';

export const seedBatches$ = atom<SeedBatch[]>([]);
export const pollinationEvents$ = atom<PollinationEvent[]>([]);

export function setSeedBatches(batches: SeedBatch[]): void {
  seedBatches$.set(batches);
}

export function setPollinationEvents(events: PollinationEvent[]): void {
  pollinationEvents$.set(events);
}

export async function addSeedBatch(data: {
  strain_name: string;
  breeder: string;
  quantity: number;
  acquisition_date: string;
  generation: string;
  parent_1_strain?: string | null;
  parent_1_phenotype?: string | null;
  parent_2_strain?: string | null;
  parent_2_phenotype?: string | null;
  notes?: string;
}): Promise<void> {
  await callService('growspace_manager', 'add_seed_batch', data as Record<string, unknown>);
}

export async function removeSeedBatch(batchId: string): Promise<void> {
  await callService('growspace_manager', 'delete_seed_batch', { batch_id: batchId });
}

export async function updateSeedBatch(data: {
  batch_id: string;
  strain_name?: string;
  breeder?: string;
  quantity?: number;
  acquisition_date?: string;
  generation?: string;
  parent_1_strain?: string | null;
  parent_1_phenotype?: string | null;
  parent_2_strain?: string | null;
  parent_2_phenotype?: string | null;
  notes?: string;
}): Promise<void> {
  await callService('growspace_manager', 'update_seed_batch', data as Record<string, unknown>);
}

export async function logPollinationEvent(data: {
  date: string;
  donor_plant_id: string;
  receiver_plant_id: string;
  notes?: string;
}): Promise<void> {
  await callService('growspace_manager', 'log_pollination', data as Record<string, unknown>);
}

export async function updatePollinationEvent(data: {
  event_id: string;
  date?: string;
  donor_plant_id?: string;
  receiver_plant_id?: string;
  notes?: string;
}): Promise<void> {
  await callService('growspace_manager', 'update_pollination', data as Record<string, unknown>);
}

export async function deletePollinationEvent(eventId: string): Promise<void> {
  await callService('growspace_manager', 'delete_pollination', { event_id: eventId });
}

export async function getLineageTree(plantId: string): Promise<LineageNode | null> {
  try {
    return (await hassCall(
      'growspace_manager/get_lineage_tree',
      { plant_id: plantId },
      LineageNodeSchema
    )) as LineageNode;
  } catch {
    return null;
  }
}

export async function sowSeed(batchId: string, plantId: string): Promise<void> {
  await callService('growspace_manager', 'sow_seed', { batch_id: batchId, plant_id: plantId });
}

export async function setPlantSex(plantId: string, sex: string): Promise<void> {
  await callService('growspace_manager', 'set_plant_sex', { plant_id: plantId, sex });
}

export async function unlinkSeedBatch(plantId: string): Promise<void> {
  await callService('growspace_manager', 'unlink_seed_batch', { plant_id: plantId });
}

export async function harvestSeeds(data: {
  event_id: string;
  quantity: number;
  notes?: string;
}): Promise<void> {
  await callService('growspace_manager', 'harvest_seeds', data as Record<string, unknown>);
}

export async function getStrainLineageTree(strainName: string): Promise<LineageNode | null> {
  try {
    return (await hassCall(
      'growspace_manager/get_strain_lineage_tree',
      { strain_name: strainName },
      LineageNodeSchema
    )) as LineageNode;
  } catch {
    return null;
  }
}

export async function updateStrainLineageTree(
  strainName: string,
  parents: Array<{ name: string; source: 'library' | 'manual' }>
): Promise<{ lineage: string }> {
  return (await hassCall(
    'growspace_manager/update_strain_lineage_tree',
    { strain_name: strainName, parents },
    z.object({ lineage: z.string() })
  )) as { lineage: string };
}

export async function importStrainLineageTree(
  strainName: string,
  tree: Record<string, unknown>
): Promise<void> {
  await hassCall(
    'growspace_manager/import_strain_lineage_tree',
    { strain_name: strainName, tree },
    z.unknown()
  );
}

export async function fetchGeneticsData(): Promise<void> {
  const response = await hassCall('growspace_manager/get_genetics_data', {}, GeneticsDataSchema);
  seedBatches$.set(Object.values(response.seed_batches) as SeedBatch[]);
  pollinationEvents$.set(Object.values(response.pollination_events) as PollinationEvent[]);
}
