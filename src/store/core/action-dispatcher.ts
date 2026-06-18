import * as plantActions from '../plant/plant-actions';
import * as strainActions from '../plant/strain-actions';
import * as uiActions from '../ui/ui-actions';
import * as libraryActions from '../plant/library-actions';
import * as aiActions from '../system/ai-actions';
import * as environmentActions from '../growspace/environment-actions';
import * as geneticsActions from '../plant/genetics-actions';
import * as dryingActions from '../plant/drying-actions';
import * as keyboardActions from '../system/keyboard-actions';
import {
  fetchCropSteeringHistory as sliceFetchCropSteeringHistory,
  applySteeringMode as sliceApplySteeringMode,
} from '../../slices/irrigation';
import type { SteeringMode } from '../../services/types';
import {
  PlantEntity,
  StrainEntry,
  PlantOverviewDialogState,
  AddPlantsDialogState,
  AddPlantDialogState,
} from '../../types';
import { ActionContext } from './action-context';
import { addOptimisticDeletedPlantId, removeOptimisticDeletedPlantId } from '../../slices/grid';
import { callService } from '../../services/hass-call';
import { removeEnvironment, resetWaterTracking } from '../../slices/growspace';
import { ViewMode } from '../../constants';
import type { GrowspaceHistoryStore } from '../history/history-store';

interface IGrowspaceStore {
  context: ActionContext;
  history: GrowspaceHistoryStore;
  refreshData(): void;
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

    harvest: (plant: PlantEntity, metrics?: Record<string, unknown>) =>
      plantActions.movePlantToNextStage(this.ctx, plant, metrics),

    takeClone: (mother: PlantEntity, num?: number, targetGrowspaceId?: string) =>
      plantActions.takeClone(this.ctx, mother, num, targetGrowspaceId),

    updateFromDialog: (
      state: Pick<
        PlantOverviewDialogState,
        'plant' | 'editedAttributes' | 'selectedPlantIds' | 'activeTab'
      >
    ) => plantActions.updatePlantFromDialog(this.ctx, state),

    finishDrying: (plant: PlantEntity) => plantActions.movePlantToNextStage(this.ctx, plant),

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

    printLabel: (params: Parameters<typeof plantActions.printLabel>[1]) =>
      plantActions.printLabel(this.ctx, params),

    logDryingWeight: (plantId: string, weightGrams: number, date?: string) =>
      dryingActions.logDryingWeight(this.ctx, plantId, weightGrams, date),

    logMoistureReading: (plantId: string, moisturePercent: number, date?: string) =>
      dryingActions.logMoistureReading(this.ctx, plantId, moisturePercent, date),

    setVisualTag: (plantId: string, visualTag: string | null) =>
      dryingActions.setVisualTag(this.ctx, plantId, visualTag),

    confirmAdd: async (detail: AddPlantDialogState) => {
      if (!detail.strain) return;
      await plantActions.confirmAddPlant(this.ctx, detail as Required<AddPlantDialogState>);
    },

    batchAction: async (
      action: 'remove' | 'transition' | 'harvest',
      entityIds: string[],
      data?: Record<string, unknown>
    ): Promise<void> => {
      if (entityIds.length === 0) return;
      if (action === 'remove') {
        entityIds.forEach((id) => addOptimisticDeletedPlantId(id));
      }
      try {
        await callService('growspace_manager', 'batch_action', {
          entity_ids: entityIds,
          action,
          data: data || {},
        });
        this.ctx.ui.showToast(
          `Batch ${action} completed for ${entityIds.length} plant(s)`,
          'success'
        );
        this.ctx.ui.clearPlantSelection();
        this.ctx.ui.setEditMode(false);
        await this.ctx.refreshData();
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Batch ${action} failed:`, err);
        this.ctx.ui.showToast(`Batch ${action} failed: ${error}`, 'error');
        if (action === 'remove') {
          entityIds.forEach((id) => removeOptimisticDeletedPlantId(id));
        }
      }
    },
  };

  public readonly growspace = {
    removeEnvironment: (id: string) => removeEnvironment(id),
    resetWaterTracking: (id: string) => resetWaterTracking(id),
  };

  public readonly strain = {
    add: (data: Partial<StrainEntry>) => strainActions.addStrain(this.ctx, data),
    update: (data: Partial<StrainEntry>) => strainActions.updateStrain(this.ctx, data),
    remove: (key: string) => strainActions.removeStrain(this.ctx, key),
  };

  // Pure UI-state leaf ops have been repointed to `slices/ui` setters and the
  // `slices/ui/dialogs` open* helpers — call them directly instead of through
  // this dispatcher. What remains here are the fetch-coupled / domain / history
  // ops that still carry orchestration (retired in later steps).
  public readonly ui = {
    /** Open add plant dialog at specific position (fetches the strain library) */
    openAddPlantDialog: (row?: number, col?: number) =>
      uiActions.openAddPlantDialog(this.ctx, row, col),

    /** Export strain library as JSON */
    exportStrainLibrary: () => uiActions.exportStrainLibrary(this.ctx),

    setIsCompactView: (value: boolean) => uiActions.setIsCompactView(this.ctx, value),

    /** Refresh all data */
    refreshData: () => this.store.refreshData(),

    openNutrientPresetsDialog: () => uiActions.openNutrientPresetsDialog(this.ctx),
    openIPMDialog: (context?: { growspaceId?: string; plantIds?: string[] }) =>
      uiActions.openIPMDialog(this.ctx, context),
    exitEditMode: () => uiActions.exitEditMode(this.ctx),
    handleDeepLink: (plantId: string) => uiActions.handleDeepLink(this.ctx, plantId),
    handleKeyboardNavigation: (key: string) =>
      keyboardActions.handleKeyboardNavigation(this.ctx, key),
    deleteSelectedPlants: async () => {
      const ids = Array.from(this.ctx.ui.$selectedPlants.get());
      if (!ids.length) return;
      await plantActions.handleDeletePlant(this.ctx, ids);
    },
    toggleEnvGraph: (metric: string) => {
      if (metric === 'crop_steering') {
        const gsId = this.ctx.grid.$selectedDevice.get();
        if (gsId) {
          uiActions.openIrrigationDialog(this.ctx, { growspaceId: gsId, initialTab: 'overview' });
        }
        return;
      }
      if (!this.store.history) return;
      const isNowActive = this.store.history.toggleEnvGraph(metric);
      if (isNowActive && this.ctx.ui.$viewMode.get() === ViewMode.HEADER) {
        this.ctx.ui.setViewMode(ViewMode.STANDARD);
      }
    },
  };

  public readonly library = {
    fetchStrains: (force = false) => libraryActions.fetchStrainLibrary(this.ctx, force),
    fetchNutrientPresets: (force = false) => libraryActions.fetchNutrientPresets(this.ctx, force),
    fetchIPMPresets: (force = false) => libraryActions.fetchIPMPresets(this.ctx, force),
    fetchNutrientInventory: (force = false) =>
      libraryActions.fetchNutrientInventory(this.ctx, force),
    updateNutrientStock: (id: string, name: string, currentMl: number, initialMl: number) =>
      libraryActions.updateNutrientStock(this.ctx, id, name, currentMl, initialMl),
    removeNutrientStock: (id: string) => libraryActions.removeNutrientStock(this.ctx, id),
    fetchECRampCurves: (force = false) => libraryActions.fetchECRampCurves(this.ctx, force),
    saveECRampCurve: (data: Parameters<typeof libraryActions.saveECRampCurve>[1]) =>
      libraryActions.saveECRampCurve(this.ctx, data),
    removeECRampCurve: (id: string) => libraryActions.removeECRampCurve(this.ctx, id),
    import: async (file: File, _replace: boolean) => {
      try {
        const content = await file.text();
        const strains = JSON.parse(content);
        if (!Array.isArray(strains)) throw new Error('Invalid format');
        for (const strain of strains) {
          await strainActions.addStrain(this.ctx, strain);
        }
        this.ctx.ui.showToast('Library imported successfully', 'success');
        await libraryActions.fetchStrainLibrary(this.ctx, true);
      } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        console.error('Import failed', e);
        this.ctx.ui.showToast('Import failed: ' + error, 'error');
      }
    },
  };

  public readonly ai = {
    /** Analyze all growspaces at once */
    analyzeAll: () => aiActions.analyzeGrowspace(this.ctx, '', true),
    /** Ask for advice about the currently selected device */
    askAdvice: (query: string) => aiActions.analyzeGrowspace(this.ctx, query, false),
    /** Get a strain recommendation */
    strainRecommendation: (query: string) => aiActions.getStrainRecommendation(this.ctx, query),
  };

  public readonly environment = {
    configure: (data: Parameters<typeof environmentActions.configureEnvironment>[1]) =>
      environmentActions.configureEnvironment(this.ctx, data),
    configureFanController: (
      data: Parameters<typeof environmentActions.configureFanController>[1]
    ) => environmentActions.configureFanController(this.ctx, data),
    configureExhaustFan: (
      data: Parameters<typeof environmentActions.configureExhaustFan>[1]
    ) => environmentActions.configureExhaustFan(this.ctx, data),
    remove: (growspaceId: string) => environmentActions.removeEnvironment(this.ctx, growspaceId),
    resetWaterTracking: (growspaceId: string) =>
      environmentActions.resetWaterTracking(this.ctx, growspaceId),
    waterPlant: (
      plantId: string,
      amount: number,
      nutrients?: Record<string, number>,
      presetId?: string
    ) => environmentActions.waterPlant(this.ctx, plantId, amount, nutrients, presetId),
    waterGrowspace: (
      growspaceId: string,
      amount: number,
      nutrients?: Record<string, number>,
      presetId?: string
    ) => environmentActions.waterGrowspace(this.ctx, growspaceId, amount, nutrients, presetId),
  };

  public readonly genetics = {
    addSeedBatch: (data: Parameters<typeof geneticsActions.addSeedBatch>[1]) =>
      geneticsActions.addSeedBatch(this.ctx, data),
    updateSeedBatch: (data: Parameters<typeof geneticsActions.updateSeedBatch>[1]) =>
      geneticsActions.updateSeedBatch(this.ctx, data),
    logPollination: (data: Parameters<typeof geneticsActions.logPollination>[1]) =>
      geneticsActions.logPollination(this.ctx, data),
    updatePollination: (data: Parameters<typeof geneticsActions.updatePollination>[1]) =>
      geneticsActions.updatePollination(this.ctx, data),
    deletePollination: (eventId: string) => geneticsActions.deletePollination(this.ctx, eventId),
    fetchData: () => geneticsActions.fetchGeneticsData(this.ctx),
    harvestSeeds: (data: Parameters<typeof geneticsActions.harvestSeeds>[1]) =>
      geneticsActions.harvestSeeds(this.ctx, data),
    deleteSeedBatch: (batchId: string) => geneticsActions.deleteSeedBatch(this.ctx, batchId),
    sowSeed: (batchId: string, plantId: string) =>
      geneticsActions.sowSeed(this.ctx, batchId, plantId),
    setPlantSex: (plantId: string, sex: string) =>
      geneticsActions.setPlantSex(this.ctx, plantId, sex),
    unlinkSeedBatch: (plantId: string) => geneticsActions.unlinkSeedBatch(this.ctx, plantId),
    getLineageTree: (plantId: string) => geneticsActions.getLineageTree(this.ctx, plantId),
    getStrainLineageTree: (strainName: string) =>
      geneticsActions.getStrainLineageTree(this.ctx, strainName),
    updateStrainLineageTree: (
      strainName: string,
      parents: Array<{ name: string; source: 'library' | 'manual' }>
    ) => geneticsActions.updateStrainLineageTree(this.ctx, strainName, parents),
  };

  public readonly irrigation = {
    fetchCropSteeringHistory: (growspaceId: string) =>
      sliceFetchCropSteeringHistory(growspaceId),
    applySteeringMode: (growspaceId: string, mode: SteeringMode) =>
      sliceApplySteeringMode(growspaceId, mode),
  };
}
