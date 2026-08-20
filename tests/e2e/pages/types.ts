export interface PlantData {
  growspace_id: string;
  strain: string;
  row: number;
  col: number;
  phenotype?: string;
  // Optional date fields
  seedling_start?: string;
  veg_start?: string;
  flower_start?: string;
}

export interface Position {
  row: number;
  col: number;
}

export type PlantStage = 'seedling' | 'mother' | 'clone' | 'veg' | 'flower' | 'dry' | 'cure';
