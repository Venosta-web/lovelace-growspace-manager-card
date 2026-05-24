import type { HomeAssistant } from 'custom-card-helpers';

import type { LineageNode } from '../../features/plants/types';
import type { PollinationEvent, SeedBatch } from '../../types';
import { BaseAPI } from '../base-api';

const DOMAIN = 'growspace_manager';

export interface GeneticsData {
  seed_batches: Record<string, SeedBatch>;
  pollination_events: Record<string, PollinationEvent>;
}

export class GeneticsAPI extends BaseAPI {
  constructor(hass?: HomeAssistant) {
    super(hass);
  }

  async fetchGeneticsData(): Promise<GeneticsData> {
    const result = await this.sendWebSocketSafe<GeneticsData>(
      `${DOMAIN}/get_genetics_data`
    );
    return result ?? { seed_batches: {}, pollination_events: {} };
  }

  async addSeedBatch(data: {
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
    await this.callService(DOMAIN, 'add_seed_batch', data as Record<string, unknown>);
  }

  async updateSeedBatch(data: {
    batch_id: string;
    strain_name?: string;
    breeder?: string;
    quantity?: number;
    acquisition_date?: string;
    generation?: string;
    lineage?: string;
    parent_1_strain?: string | null;
    parent_1_phenotype?: string | null;
    parent_2_strain?: string | null;
    parent_2_phenotype?: string | null;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'update_seed_batch', data as Record<string, unknown>);
  }

  async logPollination(data: {
    date: string;
    donor_plant_id: string;
    receiver_plant_id: string;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'log_pollination', data as Record<string, unknown>);
  }

  async updatePollination(data: {
    event_id: string;
    date?: string;
    donor_plant_id?: string;
    receiver_plant_id?: string;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'update_pollination', data as Record<string, unknown>);
  }

  async deletePollination(event_id: string): Promise<void> {
    await this.callService(DOMAIN, 'delete_pollination', { event_id });
  }

  async harvestSeeds(data: {
    event_id: string;
    quantity: number;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'harvest_seeds', data as Record<string, unknown>);
  }

  async deleteSeedBatch(batch_id: string): Promise<void> {
    await this.callService(DOMAIN, 'delete_seed_batch', { batch_id });
  }

  async setPlantSex(plant_id: string, sex: string): Promise<void> {
    await this.callService(DOMAIN, 'set_plant_sex', { plant_id, sex });
  }

  async sowSeed(batch_id: string, plant_id: string): Promise<void> {
    await this.callService(DOMAIN, 'sow_seed', { batch_id, plant_id });
  }

  async getLineageTree(plant_id: string): Promise<LineageNode | null> {
    return this.sendWebSocketSafe<LineageNode>(
      `${DOMAIN}/get_lineage_tree`,
      { plant_id }
    );
  }

  async getStrainLineageTree(strain_name: string): Promise<LineageNode | null> {
    return this.sendWebSocketSafe<LineageNode>(
      `${DOMAIN}/get_strain_lineage_tree`,
      { strain_name }
    );
  }

  async updateStrainLineageTree(
    strain_name: string,
    parents: Array<{ name: string; source: 'library' | 'manual' }>
  ): Promise<{ lineage: string }> {
    return this.sendWebSocket<{ lineage: string }>(
      `${DOMAIN}/update_strain_lineage_tree`,
      { strain_name, parents }
    );
  }

  async importStrainLineageTree(
    strain_name: string,
    tree: Record<string, unknown>
  ): Promise<void> {
    await this.sendWebSocket(
      `${DOMAIN}/import_strain_lineage_tree`,
      { strain_name, tree }
    );
  }

}
