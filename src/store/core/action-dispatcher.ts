import * as plantActions from '../plant/plant-actions';
import * as strainActions from '../plant/strain-actions';
import * as uiActions from '../ui/ui-actions';
import * as libraryActions from '../plant/library-actions';
import * as snapshotActions from '../plant/snapshot-actions';
import * as reportActions from '../plant/report-actions';
import * as aiActions from '../system/ai-actions';
import * as environmentActions from '../growspace/environment-actions';
import * as growspaceActions from '../growspace/growspace-actions';
import * as breederActions from '../plant/breeder-actions';
import * as geneticsActions from '../plant/genetics-actions';
import * as ipmActions from '../plant/ipm-actions';
import * as dryingActions from '../plant/drying-actions';
import * as keyboardActions from '../system/keyboard-actions';
import {
  PlantEntity,
  StrainEntry,
  PlantOverviewDialogState,
  AddPlantsDialogState,
  AddPlantDialogState,
} from '../../types';
import { ActionContext } from './action-context';
import { ViewMode } from '../../constants';
import type { VisionCheckupConfig } from '../../lib/types/dialog';
import type { GrowspaceHistoryStore } from '../history/history-store';

interface IGrowspaceStore {
  context: ActionContext;
  history: GrowspaceHistoryStore;
  undo(): Promise<void>;
  redo(): Promise<void>;
  refreshData(): void;
  canUndo: boolean;
  canRedo: boolean;
}

export class ActionDispatcher {
  constructor(private store: IGrowspaceStore) {}

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
        entityIds.forEach((id) => this.ctx.data.addOptimisticDeletedPlantId(id));
      }
      try {
        await this.ctx.dataService.callService('growspace_manager', 'batch_action', {
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
          entityIds.forEach((id) => this.ctx.data.removeOptimisticDeletedPlantId(id));
        }
      }
    },
  };

  public readonly growspace = {
    add: (detail: {
      name: string;
      rows: number;
      plantsPerRow: number;
      notificationService: string;
    }) =>
      growspaceActions.addGrowspace(
        this.ctx,
        detail.name,
        detail.rows,
        detail.plantsPerRow,
        detail.notificationService
      ),
    update: (detail: { growspaceId: string; name: string; rows: number; plantsPerRow: number }) =>
      growspaceActions.updateGrowspace(
        this.ctx,
        detail.growspaceId,
        detail.name,
        detail.rows,
        detail.plantsPerRow
      ),
    remove: (id: string) => growspaceActions.removeGrowspace(this.ctx, id),
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

    /** Open add plant dialog at specific position */
    openAddPlantDialog: (row?: number, col?: number) =>
      uiActions.openAddPlantDialog(this.ctx, row, col),

    /** Open plant overview dialog */
    openPlantOverviewDialog: (plant: import('../../types').PlantEntity, selectedIds?: string[]) =>
      uiActions.openPlantOverviewDialog(this.ctx, plant, selectedIds),

    /** Select all plants in current growspace */
    selectAllPlants: () => uiActions.selectAllPlants(this.ctx),

    /** Open strain recommendation dialog */
    openStrainRecommendationDialog: () => uiActions.openStrainRecommendationDialog(this.ctx),

    /** Export strain library as JSON */
    exportStrainLibrary: () => uiActions.exportStrainLibrary(this.ctx),

    setIsCompactView: (value: boolean) => uiActions.setIsCompactView(this.ctx, value),

    toggleHeaderExpansion: () => uiActions.toggleHeaderExpansion(this.ctx),

    showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') =>
      uiActions.showToast(this.ctx, message, type),

    /** Refresh all data */
    refreshData: () => this.store.refreshData(),

    /** Set the active dialog */
    setActiveDialog: (dialog: import('../../ui-state').ActiveDialogState) =>
      uiActions.setActiveDialog(this.ctx, dialog),

    /** Close the current dialog */
    closeDialog: () => uiActions.closeDialog(this.ctx),
    toast: (message: string, type: 'success' | 'error' | 'info' = 'info') =>
      uiActions.showToast(this.ctx, message, type),

    openNutrientPresetsDialog: () => uiActions.openNutrientPresetsDialog(this.ctx),
    openIPMDialog: (context?: { growspaceId?: string; plantIds?: string[] }) =>
      uiActions.openIPMDialog(this.ctx, context),
    openLogbookDialog: () => uiActions.openLogbookDialog(this.ctx),
    openConfigDialog: (device?: import('../../types').GrowspaceDevice) =>
      uiActions.openConfigDialog(this.ctx, device),
    openStrainLibraryDialog: () => uiActions.openStrainLibraryDialog(this.ctx),
    openIrrigationDialog: (options?: { initialTab?: string; scrollToField?: string }) =>
      uiActions.openIrrigationDialog(this.ctx, options),
    openGrowMasterDialog: (growspaceId: string) =>
      uiActions.openGrowMasterDialog(this.ctx, growspaceId),
    openWateringDialog: (options: {
      plantIds?: string[];
      growspaceId?: string;
      mode?: 'plant' | 'growspace';
    }) => uiActions.openWateringDialog(this.ctx, options),
    openTrainingDialog: (plantIds: string[], growspaceId?: string) =>
      uiActions.openTrainingDialog(this.ctx, plantIds, growspaceId),
    openNutrientsDialog: () => uiActions.openNutrientsDialog(this.ctx),
    openSnapshotsDialog: (growspaceId?: string) =>
      uiActions.openSnapshotsDialog(this.ctx, growspaceId),
    openCropSteeringDialog: (growspaceId?: string) =>
      uiActions.openCropSteeringDialog(this.ctx, growspaceId),
    openECRampDialog: (growspaceId?: string) => uiActions.openECRampDialog(this.ctx, growspaceId),
    openGrowReportDialog: (growspaceId?: string) =>
      uiActions.openGrowReportDialog(this.ctx, growspaceId),
    openBatchWateringDialog: (growspaceId?: string) =>
      uiActions.openBatchWateringDialog(this.ctx, growspaceId),
    openBatchTrainingDialog: (growspaceId?: string) =>
      uiActions.openBatchTrainingDialog(this.ctx, growspaceId),
    openBatchCloneDialog: () => uiActions.openBatchCloneDialog(this.ctx),
    openBatchPrintLabelsDialog: () => uiActions.openBatchPrintLabelsDialog(this.ctx),
    clearPlantSelection: () => uiActions.clearPlantSelection(this.ctx),
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
        if (gsId) uiActions.openCropSteeringDialog(this.ctx, gsId);
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

  public readonly nutrient = {
    savePreset: (preset: Parameters<typeof libraryActions.saveNutrientPreset>[1]) =>
      libraryActions.saveNutrientPreset(this.ctx, preset),
    removePreset: (id: string) => libraryActions.removeNutrientPreset(this.ctx, id),
  };

  public readonly snapshots = {
    list: (growspaceId: string) => snapshotActions.getSnapshots(this.ctx, growspaceId),
    capture: (growspaceId: string) => snapshotActions.captureSnapshot(this.ctx, growspaceId),
    visionHistory: (growspaceId: string) => snapshotActions.getVisionHistory(this.ctx, growspaceId),
    triggerCheckup: (growspaceId: string) =>
      snapshotActions.triggerVisionCheckup(this.ctx, growspaceId),
    updateCheckupConfig: (growspaceId: string, config: VisionCheckupConfig) =>
      snapshotActions.updateVisionCheckupConfig(this.ctx, growspaceId, config),
  };

  public readonly report = {
    fetch: (growspaceId: string) => reportActions.fetchGrowReport(this.ctx, growspaceId),
    export: (growspaceId: string, format: string) =>
      reportActions.exportGrowReport(this.ctx, growspaceId, format),
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

  public readonly breeder = {
    update: (oldName: string, newName: string, logo?: string) =>
      breederActions.updateBreeder(this.ctx, oldName, newName, logo),
    delete: (name: string) => breederActions.deleteBreeder(this.ctx, name),
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
    setPlantSex: (plantId: string, sex: string) =>
      geneticsActions.setPlantSex(this.ctx, plantId, sex),
    sowSeed: (batchId: string, plantId: string) =>
      geneticsActions.sowSeed(this.ctx, batchId, plantId),
    getLineageTree: (plantId: string) => geneticsActions.getLineageTree(this.ctx, plantId),
    getStrainLineageTree: (strainName: string) =>
      geneticsActions.getStrainLineageTree(this.ctx, strainName),
    updateStrainLineageTree: (
      strainName: string,
      parents: Array<{ name: string; source: 'library' | 'manual' }>
    ) => geneticsActions.updateStrainLineageTree(this.ctx, strainName, parents),
  };

  public readonly ipm = {
    apply: (detail: Parameters<typeof ipmActions.applyIPM>[1]) =>
      ipmActions.applyIPM(this.ctx, detail),
    savePreset: (preset: Parameters<typeof libraryActions.saveIPMPreset>[1]) =>
      libraryActions.saveIPMPreset(this.ctx, preset),
    removePreset: (presetId: string) => libraryActions.removeIPMPreset(this.ctx, presetId),
  };
}
