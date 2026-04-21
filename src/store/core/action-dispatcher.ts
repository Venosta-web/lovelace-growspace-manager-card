import * as plantActions from '../plant/plant-actions';
import * as strainActions from '../plant/strain-actions';
import * as uiActions from '../ui/ui-actions';
import * as libraryActions from '../plant/library-actions';
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

    saveHarvestMetrics: (plantId: string, metrics: Record<string, unknown>) =>
      plantActions.saveHarvestMetrics(this.ctx, plantId, metrics),

    scorePhenotype: (plantId: string, scores: Record<string, number | null>) =>
      plantActions.scorePhenotype(this.ctx, plantId, scores),
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
    removeEnvironment: (id: string) => this.ctx.dataService.removeEnvironment(id),
    resetWaterTracking: (id: string) => this.ctx.dataService.resetWaterTracking(id),
  };

  public readonly strain = {
    add: (data: Partial<StrainEntry>) => strainActions.addStrain(this.ctx, data),
    update: (data: Partial<StrainEntry>) => strainActions.updateStrain(this.ctx, data),
    remove: (key: string) => strainActions.removeStrain(this.ctx, key),
  };

  public readonly history = {
    undo: () => this.store.undo(),
    redo: () => this.store.redo(),
    canUndo: () => this.store.canUndo,
    canRedo: () => this.store.canRedo,
  };

  public readonly ui = {
    /** Toggle plant selection state */
    togglePlantSelection: (plantOrId: string | PlantEntity) =>
      uiActions.togglePlantSelection(this.ctx, plantOrId),

    /** Handle plant card click (opens overview dialog) */
    handlePlantClick: (plant: PlantEntity) =>
      uiActions.handlePlantClick(this.ctx, plant),

    /** Open add plant dialog at specific position */
    openAddPlantDialog: (row?: number, col?: number) =>
      uiActions.openAddPlantDialog(this.ctx, row, col),

    /** Select all plants in current growspace */
    selectAllPlants: () =>
      uiActions.selectAllPlants(this.ctx),
  };

  public readonly library = {
    fetchStrains: (force = false) => libraryActions.fetchStrainLibrary(this.ctx, force),
    fetchNutrientPresets: (force = false) => libraryActions.fetchNutrientPresets(this.ctx, force),
    fetchIPMPresets: (force = false) => libraryActions.fetchIPMPresets(this.ctx, force),
    fetchNutrientInventory: (force = false) => libraryActions.fetchNutrientInventory(this.ctx, force),
    updateNutrientStock: (id: string, name: string, currentMl: number, initialMl: number) =>
      libraryActions.updateNutrientStock(this.ctx, id, name, currentMl, initialMl),
    removeNutrientStock: (id: string) => libraryActions.removeNutrientStock(this.ctx, id),
    fetchECRampCurves: (force = false) => libraryActions.fetchECRampCurves(this.ctx, force),
    saveECRampCurve: (data: Parameters<typeof libraryActions.saveECRampCurve>[1]) =>
      libraryActions.saveECRampCurve(this.ctx, data),
    removeECRampCurve: (id: string) => libraryActions.removeECRampCurve(this.ctx, id),
  };

  public readonly nutrient = {
    savePreset: (preset: Parameters<typeof libraryActions.saveNutrientPreset>[1]) =>
      libraryActions.saveNutrientPreset(this.ctx, preset),
    removePreset: (id: string) => libraryActions.removeNutrientPreset(this.ctx, id),
  };
}
