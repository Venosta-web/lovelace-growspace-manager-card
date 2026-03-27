import type { HomeAssistant } from 'custom-card-helpers';

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
    const result = await this.sendWebSocket<GeneticsData>(
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
    lineage: string;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'add_seed_batch', data as Record<string, unknown>);
  }

  async logPollination(data: {
    date: string;
    donor_plant_id: string;
    receiver_plant_id: string;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'log_pollination', data as Record<string, unknown>);
  }

  async harvestSeeds(data: {
    event_id: string;
    quantity: number;
    notes?: string;
  }): Promise<void> {
    await this.callService(DOMAIN, 'harvest_seeds', data as Record<string, unknown>);
  }

  async scorePlant(data: {
    plant_id: string;
    vigor?: number | null;
    structure?: number | null;
    aroma?: number | null;
    resin?: number | null;
    pest_resistance?: number | null;
  }): Promise<void> {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v != null)
    );
    await this.callService(DOMAIN, 'score_plant', payload);
  }
}
