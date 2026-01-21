import * as plantActions from '../plant/plant-actions';
import * as strainActions from '../plant/strain-actions';
import { PlantEntity, StrainEntry, PlantOverviewDialogState, AddPlantsDialogState } from '../../types';
import { ActionContext } from './action-context';

interface IGrowspaceStore {
  context: ActionContext;
  undo(): Promise<void>;
  redo(): Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
}

export class ActionDispatcher {
  constructor(private store: IGrowspaceStore) { }

  private get ctx(): ActionContext {
    return this.store.context;
  }

  public readonly plant = {
    update: (id: string, updates: Partial<PlantEntity['attributes']>) =>
      plantActions.updatePlant(this.ctx, id, updates),

    delete: (id: string | string[]) => plantActions.handleDeletePlant(this.ctx, id),

    move: (plant: PlantEntity, growspace: string) =>
      plantActions.movePlantToGrowspace(this.ctx, plant, growspace),

    drop: (row: number, col: number, target: PlantEntity | null, source: PlantEntity | null) =>
      plantActions.handlePlantDrop(this.ctx, row, col, target, source),

    nextStage: (plant: PlantEntity) => plantActions.movePlantToNextStage(this.ctx, plant),

    takeClone: (mother: PlantEntity, num?: number, targetGrowspaceId?: string) =>
      plantActions.takeClone(this.ctx, mother, num, targetGrowspaceId),

    updateFromDialog: (state: PlantOverviewDialogState) => plantActions.updatePlantFromDialog(this.ctx, state),

    add: (gid: string, r: number, c: number, s: string, p?: string) =>
      plantActions.confirmAddPlant(this.ctx, {
        row: r,
        col: c,
        strain: s,
        phenotype: p,
      }),

    addBatch: (detail: AddPlantsDialogState) => plantActions.confirmAddPlants(this.ctx, detail),
  };

  public readonly growspace = {
    add: (detail: {
      name: string;
      rows: number;
      plantsPerRow: number;
      notificationService: string;
    }) =>
      strainActions.addGrowspace(
        this.ctx,
        detail.name,
        detail.rows,
        detail.plantsPerRow,
        detail.notificationService
      ),
    update: (detail: {
      growspaceId: string;
      name: string;
      rows: number;
      plantsPerRow: number;
    }) =>
      strainActions.updateGrowspace(
        this.ctx,
        detail.growspaceId,
        detail.name,
        detail.rows,
        detail.plantsPerRow
      ),
    remove: (id: string) => strainActions.removeGrowspace(this.ctx, id),
  };

  public readonly strain = {
    add: (data: Partial<StrainEntry>) => strainActions.addStrain(this.ctx, data),
    remove: (key: string) => strainActions.removeStrain(this.ctx, key),
  };

  public readonly history = {
    undo: () => this.store.undo(),
    redo: () => this.store.redo(),
    canUndo: () => this.store.canUndo,
    canRedo: () => this.store.canRedo,
  };
}
