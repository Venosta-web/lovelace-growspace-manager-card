// @deprecated Import from specific domain instead:
// - Config types: import from './lib/types/config'
// - Plant types: import from './features/plants/types'
// - Environment types: import from './features/environment/types'
// - Service types: import from './services/types'

// Re-export everything for backwards compatibility
export * from './lib/types';
export * from './features/plants/types';
export * from './features/plants/constants';
export * from './features/environment/types';
export * from './features/environment/constants';
export * from './services/types';

// Re-export specific aliases for compatibility
export { GridOverlayMode as GridOverlayModeEnum } from './features/environment/constants';
export { GrowspaceType as GrowspaceTypeEnum } from './features/plants/types';

export interface SeedBatch {
  batch_id: string;
  strain_name: string;
  breeder: string;
  quantity: number;
  acquisition_date: string;
  generation: string;
  lineage: string;
  notes: string;
}

export interface PollinationEvent {
  event_id: string;
  date: string;
  donor_plant_id: string;
  receiver_plant_id: string;
  notes: string;
  result_seed_batch_id: string | null;
}

export interface PhenotypeScores {
  vigor: number | null;
  structure: number | null;
  aroma: number | null;
  resin: number | null;
  pest_resistance: number | null;
}
