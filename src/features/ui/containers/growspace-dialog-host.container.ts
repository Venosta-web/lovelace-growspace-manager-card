import { LitElement, html, TemplateResult, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume, provide } from '@lit/context';
import { hassContext, storeContext, configContext } from '../../../lib/context';
import {
  waterPlant as sliceWaterPlant,
  waterGrowspace as sliceWaterGrowspace,
  addPlant as sliceAddPlant,
  addPlants as sliceAddPlants,
  updatePlant as sliceUpdatePlant,
  deletePlant as sliceDeletePlant,
  takeClone as sliceTakeClone,
  movePlantToGrowspace as sliceMovePlantToGrowspace,
  movePlantToNextStage as sliceMovePlantToNextStage,
} from '../../../slices/plant';
import { askGrowAdvice, analyzeAllGrowspaces } from '../../../slices/ai-insight';
import {
  seedBatches$,
  pollinationEvents$,
  fetchGeneticsData,
  addSeedBatch as sliceAddSeedBatch,
  updateSeedBatch as sliceUpdateSeedBatch,
  logPollinationEvent as sliceLogPollinationEvent,
  updatePollinationEvent as sliceUpdatePollinationEvent,
  deletePollinationEvent as sliceDeletePollinationEvent,
  removeSeedBatch as sliceRemoveSeedBatch,
  harvestSeeds as sliceHarvestSeeds,
} from '../../../slices/genetics';
import { updateVisionCheckupConfig } from '../../../slices/camera';
import {
  updateBreeder,
  deleteBreeder,
  updateStrainMeta,
  removeStrain as sliceRemoveStrain,
  addStrain as sliceAddStrain,
  fetchStrainLibrary,
  normalizeStrainFormData,
} from '../../../slices/strain';
import { importStrainLineageTree } from '../../../slices/genetics';
import {
  addGrowspace as sliceAddGrowspace,
  updateGrowspace as sliceUpdateGrowspace,
  removeGrowspace as sliceRemoveGrowspace,
  configureEnvironment as sliceConfigureEnvironment,
  removeEnvironment as sliceRemoveEnvironment,
} from '../../../slices/growspace';
import {
  activeDialog$,
  withToast,
  openDialog,
  closeDialog,
  showToast,
  openTrainingDialog,
  exportStrainLibrary,
  openStrainRecommendationDialog,
  isEditMode$,
  clearPlantSelection,
  setEditMode,
  deselectPlants,
} from '../../../slices/ui';
import { PlantUtils } from '../../../utils/plant-utils';
import { setHass } from '../../../services/hass-call';
import { GrowspaceStore } from '../../../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import { ActiveDialogState } from '../../../ui-state';
import {
  GrowspaceDevice,
  PlantEntity,
  StrainEntry,
  EnvironmentConfigEventDetail,
  SeedBatch,
  PollinationEvent,
  IPMPreset,
  NutrientPreset,
  NutrientInventory,
  GrowspaceManagerCardConfig,
  AddPlantsDialogState,
} from '../../../types';
import type {
  VisionCheckupConfigEventDetail,
  StrainLibraryDialogState,
} from '../../../lib/types/dialog';
import type { NutrientPresetsResponse } from '../../../slices/nutrient';
import {
  applyIPM,
  saveIPMPreset,
  removeIPMPreset,
  fetchNutrientPresets,
  fetchIPMPresets,
  fetchNutrientInventory,
} from '../../../slices/nutrient';

import './growspace-nutrient-presets-editor.container';
import '../../../dialogs/add-plant-dialog';
import '../../../dialogs/add-plants-dialog';
import '../../../dialogs/clone-dialog';
import '../../../dialogs/config-dialog';
import '../../../dialogs/crop-steering-dialog';
import '../../../dialogs/grow-master-dialog';
import '../../../dialogs/harvest-scoring-dialog';
import '../../../dialogs/irrigation-dialog';
import '../../../dialogs/logbook-dialog';
import '../../../dialogs/print-label-dialog';
import '../../../dialogs/batch-print-label-dialog';
import '../../../dialogs/batch-clone-dialog';
import '../../../dialogs/snapshots-dialog';
import '../../../dialogs/strain-library-dialog';
import '../../../dialogs/strain-recommendation-dialog';
import '../../../dialogs/training-dialog';
import '../../shared/ui/error-boundary';

import '../components/growspace-ipm-dialog-ui';
import '../components/growspace-nutrient-inventory-dialog-ui';
import '../../../dialogs/feed-and-water-dialog';
import '../../plants/containers/plant-overview.container';

import { HomeAssistant } from 'custom-card-helpers';

@customElement('growspace-dialog-host')
export class GrowspaceDialogHost extends LitElement {
  @provide({ context: hassContext })
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @provide({ context: storeContext })
  @property({ attribute: false })
  public store!: GrowspaceStore;

  @provide({ context: configContext })
  @property({ attribute: false })
  public config!: GrowspaceManagerCardConfig;

  // Controllers
  private _dialogHostController!: StoreController<{
    activeDialog: ActiveDialogState;
    devices: GrowspaceDevice[];
    selectedDevice: string | null;
    strainLibrary: StrainEntry[];
    nutrientPresets: NutrientPresetsResponse;
    ipmPresets: Record<string, IPMPreset>;
    nutrientInventory: NutrientInventory | null;
  }>;
  private _seedBatchesController!: StoreController<readonly SeedBatch[]>;
  private _pollinationEventsController!: StoreController<readonly PollinationEvent[]>;
  private _controllersInitialized = false;
  private _dialogPrefetchUnsub?: () => void;
  private _lastPrefetchedDialogType: ActiveDialogState['type'] = 'NONE';
  private _dataChangeTimeout?: any;
  private _geneticsLoaded = false;
  @state() private _addPlantsLibraryError = '';

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._initControllers();
    }
    this._subscribeDialogPrefetch();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._dialogPrefetchUnsub?.();
    this._dialogPrefetchUnsub = undefined;
  }

  /**
   * Subscribe the lazy-on-open prefetch to the active-dialog atom. Idempotent —
   * safe to call from both `_initControllers` (first mount) and
   * `connectedCallback` (re-attach after a disconnect unsubscribed it).
   */
  private _subscribeDialogPrefetch(): void {
    if (this._dialogPrefetchUnsub) return;
    this._dialogPrefetchUnsub = activeDialog$.subscribe((dialog) =>
      this._prefetchDialogData(dialog.type)
    );
  }

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('store')) {
      this._initControllers();
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('hass') && this.hass) {
      setHass(this.hass);
    }
  }

  private _initControllers(): void {
    if (!this.store) return;
    if (this._controllersInitialized) return;

    this._dialogHostController = new StoreController(this, this.store.$dialogHostState);
    this._seedBatchesController = new StoreController(this, seedBatches$);
    this._pollinationEventsController = new StoreController(this, pollinationEvents$);

    // Lazy-on-open chokepoint (ADR-0017): the dialog-host is the single
    // subscriber/render point for every dialog, so fetching dialog-only data
    // when the active dialog type changes catches all entry paths (header,
    // plant-overview, batch openers) regardless of how the dialog was opened.
    this._subscribeDialogPrefetch();
    this._controllersInitialized = true;
  }

  /**
   * Fetch the data a dialog reads, on transition into that dialog. Atoms cache
   * for the session; errors are swallowed so a failed fetch degrades the dialog
   * to empty rather than surfacing a toast (matching the legacy fetch behavior).
   */
  private _prefetchDialogData(type: ActiveDialogState['type']): void {
    if (type === this._lastPrefetchedDialogType) return;
    this._lastPrefetchedDialogType = type;
    switch (type) {
      case 'NUTRIENTS':
      case 'WATERING':
        fetchNutrientPresets().catch(() => undefined);
        fetchNutrientInventory().catch(() => undefined);
        break;
      case 'NUTRIENT_PRESETS':
        fetchNutrientPresets().catch(() => undefined);
        break;
      case 'NUTRIENT_INVENTORY':
        fetchNutrientInventory().catch(() => undefined);
        break;
      case 'IPM':
        fetchIPMPresets().catch(() => undefined);
        break;
    }
  }

  render() {
    if (!this.store || !this._controllersInitialized) return html``;

    const {
      activeDialog: active,
      devices,
      selectedDevice: selectedDeviceId,
      strainLibrary,
      nutrientPresets,
      ipmPresets,
      nutrientInventory,
    } = this._dialogHostController.value;

    if (active.type === 'NONE') return html``;
    const selectedDeviceData = devices.find((d) => d.deviceId === selectedDeviceId);

    // Prepare options for select dropdowns if needed
    const growspaceOptions: Record<string, string> = {};
    devices.forEach((d) => {
      growspaceOptions[d.deviceId] = d.name;
    });

    // Resolve context-specific device data (from payload or global selection)
    const payloadGrowspaceId = (active.payload as { growspaceId?: string })?.growspaceId;

    // activeDialog$ is a global singleton shared by every growspace-manager-card
    // instance, each of which mounts its own dialog-host portal. The irrigation
    // dialog is opened with an explicit growspaceId, so only the portal whose
    // `devices` list owns that growspace should render it — otherwise every other
    // portal renders a duplicate dialog stacked on top with no matching device.
    if (
      active.type === 'IRRIGATION' &&
      payloadGrowspaceId &&
      !devices.some((d) => d.deviceId === payloadGrowspaceId)
    ) {
      return html``;
    }

    const effectiveDeviceData =
      (payloadGrowspaceId ? devices.find((d) => d.deviceId === payloadGrowspaceId) : null) ||
      selectedDeviceData;

    return html`
      <error-boundary .fallbackMessage=${'Dialog error occurred'}>
        ${(() => {
        switch (active.type) {
          case 'ADD_PLANT':
            return this._renderAddPlantDialog(active, strainLibrary, effectiveDeviceData);
          case 'ADD_PLANTS':
            return this._renderAddPlantsDialog(active, strainLibrary, effectiveDeviceData);
          case 'PLANT_OVERVIEW':
            return this._renderPlantOverviewDialog(active, growspaceOptions, effectiveDeviceData);
          case 'STRAIN_LIBRARY':
            return this._renderStrainLibraryDialog(active, strainLibrary, effectiveDeviceData);
          case 'CONFIG':
            return this._renderConfigDialog(active, growspaceOptions, effectiveDeviceData);
          case 'GROW_MASTER':
            return this._renderGrowMasterDialog(active, effectiveDeviceData);
          case 'STRAIN_RECOMMENDATION':
            return this._renderStrainRecommendationDialog(active, effectiveDeviceData);
          case 'IRRIGATION':
            return this._renderIrrigationDialog(active, effectiveDeviceData);
          case 'LOGBOOK':
            return this._renderLogbookDialog(active, effectiveDeviceData);
          case 'ENVIRONMENT_CONFIG':
            return this._renderEnvironmentConfigDialog(active);
          case 'WATERING':
            return this._renderWateringDialog(
              active,
              nutrientPresets,
              nutrientInventory,
              effectiveDeviceData
            );
          case 'NUTRIENT_PRESETS':
            return this._renderNutrientPresetsDialog(active, effectiveDeviceData);
          case 'TRAINING':
            return this._renderTrainingDialog(active, effectiveDeviceData);
          case 'TAKE_CLONE':
            return this._renderCloneDialog(active, growspaceOptions, effectiveDeviceData);
          case 'IPM':
            return this._renderIPMDialog(active, ipmPresets, effectiveDeviceData);
          case 'NUTRIENT_INVENTORY':
            return this._renderNutrientInventoryDialog(
              active,
              nutrientInventory,
              effectiveDeviceData
            );
          case 'NUTRIENTS':
            return this._renderNutrientDialog(active, nutrientPresets, nutrientInventory);
          case 'PRINT_LABEL':
            return this._renderPrintLabelDialog(active, effectiveDeviceData);
          case 'BATCH_PRINT_LABELS':
            return this._renderBatchPrintLabelsDialog(active);
          case 'BATCH_CLONE':
            return this._renderBatchCloneDialog(active, growspaceOptions);
          case 'HARVEST_SCORING':
            return this._renderHarvestScoringDialog(active);
          case 'SNAPSHOTS':
            return this._renderSnapshotsDialog(active, effectiveDeviceData);
          case 'CROP_STEERING':
            return this._renderCropSteeringDialog(active, effectiveDeviceData);
          default:
            return html``;
        }
      })()}
      </error-boundary>
    `;
  }

  private _closeDialogIfActive(type: ActiveDialogState['type']) {
    const { store } = this;
    if (store && this._dialogHostController.value.activeDialog.type === type) {
      store.ui.closeDialog();
    }
  }

  private async _refreshGeneticsData(): Promise<void> {
    try {
      await fetchGeneticsData();
    } catch (e) {
      console.error('Failed to refresh genetics data', e);
    }
  }

  private _renderAddPlantDialog(
    active: ActiveDialogState,
    strainLibrary: StrainEntry[],
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'ADD_PLANT') return html``;
    const store = this.store;
    if (!store) return html``;
    const dialogState = active.payload;

    // Get all clone and seedling plants from all growspaces
    const devices = this._dialogHostController.value.devices;
    const clonePlants = this._getPlantsByStage(devices, 'clone');
    const seedlingPlants = this._getPlantsByStage(devices, 'seedling');
    const targetGrowspaceId = selectedDeviceData?.deviceId || '';

    return html`
      <add-plant-dialog
        .open=${true}
        .strainLibrary=${strainLibrary}
        .row=${dialogState?.row}
        .col=${dialogState?.col}
        .strain=${dialogState?.strain || ''}
        .phenotype=${dialogState?.phenotype || ''}
        .veg_start=${dialogState?.veg_start || ''}
        .flower_start=${dialogState?.flower_start || ''}
        .seedling_start=${dialogState?.seedling_start || ''}
        .mother_start=${dialogState?.mother_start || ''}
        .clone_start=${dialogState?.clone_start || ''}
        .dry_start=${dialogState?.dry_start || ''}
        .cure_start=${dialogState?.cure_start || ''}
        .growspaceName=${selectedDeviceData?.name || ''}
        .clonePlants=${clonePlants}
        .seedlingPlants=${seedlingPlants}
        .targetGrowspaceId=${targetGrowspaceId}
        .siblingPlants=${selectedDeviceData?.plants || []}
        @close=${() => this._closeDialogIfActive('ADD_PLANT')}
        @add-plant-submit=${(e: CustomEvent) => this._handleConfirmAddPlant(e.detail)}
        @transplant-plant-submit=${(e: CustomEvent) => this._handleTransplant(e.detail)}
        @create-new-strain=${(e: CustomEvent) => this._handleStrainCreatedAtSource(e)}
        @data-changed=${() => this._handleDataChanged()}
      ></add-plant-dialog>
    `;
  }

  /** Get all plants with a specific stage from all devices, including growspace name */
  private _getPlantsByStage(
    devices: GrowspaceDevice[],
    stage: string
  ): (PlantEntity & { _growspaceName?: string })[] {
    return devices
      .flatMap((d) =>
        (d.plants || []).map((p) => ({
          ...p,
          _growspaceName: d.name,
        }))
      )
      .filter((p) => p.attributes.stage === stage);
  }

  /** Handle transplant from clone/seedling to new location */
  private async _handleTransplant(detail: {
    plant_id: string;
    source_growspace_id: string;
    target_growspace_id: string;
    new_row: number;
    new_col: number;
    veg_start: string;
  }) {
    if (!this.store) return;
    await withToast(
      async () => {
        await sliceUpdatePlant(detail.plant_id, {
          row: detail.new_row,
          col: detail.new_col,
          growspace_id: detail.target_growspace_id,
          veg_start: detail.veg_start,
        });
        closeDialog();
        await this._handleDataChanged();
      },
      { success: 'Plant updated', errorPrefix: 'Failed to update plant' }
    );
  }

  /** Bulk-update a plant (or the current selection) from the overview dialog. */
  private async _handleUpdatePlantFromDialog(state: {
    plant: PlantEntity;
    editedAttributes: Record<string, unknown>;
    selectedPlantIds?: string[];
    activeTab?: string;
  }): Promise<void> {
    const { plant, editedAttributes, selectedPlantIds } = state;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    const targetIds =
      selectedPlantIds && selectedPlantIds.length > 0 ? selectedPlantIds : [plantId];
    const isBulkEdit = targetIds.length > 1;
    const payloadTemplate = PlantUtils.mapDialogToApiPayload(editedAttributes, isBulkEdit);

    await withToast(
      async () => {
        await Promise.all(targetIds.map((id) => sliceUpdatePlant(id, payloadTemplate)));
        closeDialog();
        await this._handleDataChanged();
        if (isEditMode$.get()) {
          clearPlantSelection();
          setEditMode(false);
        }
      },
      { errorPrefix: 'Failed to update plant(s)' }
    );
  }

  /** Delete a plant (or array of plants) from the overview dialog. */
  private async _handleDeletePlant(plantId: string | string[]): Promise<void> {
    const ids = Array.isArray(plantId) ? plantId : [plantId];
    const result = await withToast(
      () => Promise.all(ids.map((id) => sliceDeletePlant(id))),
      { errorPrefix: 'Failed to delete plant' }
    );
    if (result === undefined) return;
    deselectPlants(ids);
    closeDialog();
    await this._handleDataChanged();
  }

  /** Advance a plant to its next lifecycle stage (finish-drying / harvest flow). */
  private async _handleAdvancePlantStage(plant: PlantEntity): Promise<void> {
    const target = await withToast(() => sliceMovePlantToNextStage(plant), {
      errorPrefix: 'Failed to move plant',
    });
    if (target) {
      showToast(`Plant moved to ${target}`, 'success');
      closeDialog();
      this._handleDataChanged();
    }
  }

  /** Transplant a plant to a different growspace (move-clone event). */
  private async _handleMovePlant(plant: PlantEntity, targetGrowspace: string): Promise<void> {
    await withToast(() => sliceMovePlantToGrowspace(plant, targetGrowspace), {
      errorPrefix: 'Failed to move plant',
    });
    this._handleDataChanged();
  }

  /** Add a single plant from the ADD_PLANT dialog, optionally adding the strain to the library. */
  private async _handleConfirmAddPlant(detail: {
    row: number;
    col: number;
    strain?: string;
    phenotype?: string;
    veg_start?: string;
    flower_start?: string;
    seedling_start?: string;
    mother_start?: string;
    clone_start?: string;
    dry_start?: string;
    cure_start?: string;
    addToLibrary?: boolean;
  }): Promise<void> {
    if (!detail.strain) return;
    const selectedDevice = this.store?.grid.$selectedDevice.get();
    if (!selectedDevice) {
      showToast('No growspace selected', 'error');
      return;
    }

    await withToast(
      async () => {
        if (detail.addToLibrary) {
          try {
            await sliceAddStrain(
              normalizeStrainFormData({ strain: detail.strain, phenotype: detail.phenotype })
            );
            await fetchStrainLibrary();
            showToast(`Added ${detail.strain} ${detail.phenotype} to library`, 'success');
          } catch (e) {
            console.error('Failed to add strain to library:', e);
            showToast('Failed to add strain to library, conducting plant addition', 'info');
          }
        }
        await sliceAddPlant({
          growspace_id: selectedDevice,
          row: detail.row,
          col: detail.col,
          strain: detail.strain!,
          phenotype: detail.phenotype,
          veg_start: detail.veg_start,
          flower_start: detail.flower_start,
          seedling_start: detail.seedling_start,
          mother_start: detail.mother_start,
          clone_start: detail.clone_start,
          dry_start: detail.dry_start,
          cure_start: detail.cure_start,
        });
        closeDialog();
        await this._handleDataChanged();
      },
      { success: 'Plant added successfully', errorPrefix: 'Failed to add plant' }
    );
  }

  /** Batch-add plants from the ADD_PLANTS dialog, optionally seeding strain variants into the library. */
  private async _handleAddBatch(detail: AddPlantsDialogState): Promise<void> {
    const selectedDevice = this.store?.grid.$selectedDevice.get();
    if (!selectedDevice) {
      showToast('No growspace selected', 'error');
      return;
    }

    if (detail.addToLibrary) {
      const amount = detail.amount || 1;
      const startNumber = detail.start_number || 1;
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < amount; i++) {
        const currentNumber = startNumber + i;
        const phenoName = detail.phenotype
          ? `${detail.phenotype} #${currentNumber}`
          : `Strain #${currentNumber}`;
        if (detail.strain) {
          promises.push(
            sliceAddStrain(normalizeStrainFormData({ strain: detail.strain, phenotype: phenoName }))
          );
        }
      }
      try {
        await Promise.all(promises);
        await fetchStrainLibrary();
        showToast(`Added ${amount} strain variants to library`, 'success');
      } catch (e) {
        console.error('Failed to add strains to library:', e);
        throw e instanceof Error ? e : new Error('Failed to add strains to library');
      }
    }

    const { addToLibrary: _addToLibrary, ...apiPayload } = detail;
    await withToast(
      async () => {
        await sliceAddPlants({
          ...apiPayload,
          growspace_id: selectedDevice,
        } as Parameters<typeof sliceAddPlants>[0]);
        closeDialog();
        await this._handleDataChanged();
      },
      // rethrow so the @add-plants-submit handler's catch can surface the inline
      // library error (_addPlantsLibraryError) and keep the dialog open.
      { success: 'Batch plants added successfully', errorPrefix: 'Failed to add plants', rethrow: true }
    );
  }

  private _handleOpenStrainEditor(e: CustomEvent) {
    const { strain, phenotype, focusLineage } = e.detail;
    const strainLibrary = this._dialogHostController.value.strainLibrary;

    const normalizedPhenotype = phenotype || '';
    let strainEntry = strainLibrary.find((s) => {
      const entryPhenotype = s.phenotype || '';
      return s.strain === strain && entryPhenotype === normalizedPhenotype;
    });

    if (!strainEntry && strain) {
      const key = normalizedPhenotype ? `${strain}_${normalizedPhenotype}` : strain;
      strainEntry = {
        strain,
        phenotype: normalizedPhenotype,
        key,
        breeder: '',
        type: 'Hybrid',
        flowering_days_min: 60,
        flowering_days_max: 70,
        lineage: '',
        sex: 'Feminized',
        description: '',
        image: '',
        sativa_percentage: 50,
        indica_percentage: 50,
      } as StrainEntry;
    }

    openDialog({
      type: 'STRAIN_LIBRARY',
      payload: {
        view: 'editor',
        editingStrain: strainEntry,
        focusLineage: !!focusLineage,
      },
    });
  }

  protected _handleStrainCreatedAtSource(e: CustomEvent) {
    openDialog({
      type: 'STRAIN_LIBRARY',
      payload: {
        source: e.detail.source,
        returnPayload: e.detail.returnPayload,
        editingStrain: {
          strain: e.detail.returnPayload?.strain || '',
          phenotype: e.detail.returnPayload?.phenotype || '',
          key: '',
          type: 'Hybrid',
          flowering_days_min: 60,
          flowering_days_max: 70,
          sex: 'Feminized',
          sativa_percentage: 50,
          indica_percentage: 50,
        },
      },
    });
  }

  private _renderAddPlantsDialog(
    active: ActiveDialogState,
    strainLibrary: StrainEntry[],
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'ADD_PLANTS') return html``;
    return html`
      <add-plants-dialog
        .open=${true}
        .strainLibrary=${strainLibrary}
        .growspaceName=${selectedDeviceData?.name || ''}
        .growspaceDevice=${selectedDeviceData}
        .strain=${active.payload?.strain || ''}
        .phenotype=${active.payload?.phenotype || ''}
        .amount=${active.payload?.amount || 1}
        .start_number=${active.payload?.start_number || 1}
        .veg_start=${active.payload?.veg_start || ''}
        .flower_start=${active.payload?.flower_start || ''}
        .seedling_start=${active.payload?.seedling_start || ''}
        .mother_start=${active.payload?.mother_start || ''}
        .clone_start=${active.payload?.clone_start || ''}
        .dry_start=${active.payload?.dry_start || ''}
        .cure_start=${active.payload?.cure_start || ''}
        .libraryError=${this._addPlantsLibraryError}
        @close=${() => { this._addPlantsLibraryError = ''; this._closeDialogIfActive('ADD_PLANTS'); }}
        @show-toast=${(e: CustomEvent) =>
        showToast(e.detail.message, e.detail.type)}
        @add-plants-submit=${async (e: CustomEvent) => {
          this._addPlantsLibraryError = '';
          try {
            await this._handleAddBatch(e.detail);
          } catch (err) {
            this._addPlantsLibraryError = err instanceof Error ? err.message : 'Failed to add strains to library';
          }
        }}
        @create-new-strain=${(e: CustomEvent) => this._handleStrainCreatedAtSource(e)}
        @data-changed=${() => this._handleDataChanged()}
      ></add-plants-dialog>
    `;
  }

  private _renderPlantOverviewDialog(
    active: ActiveDialogState,
    _growspaceOptions: Record<string, string>,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'PLANT_OVERVIEW') return html``;
    const dialogState = active.payload;

    // Look up the live plant entity from fresh device data so the overview
    // reflects data saved during the session (e.g. after scoring/metrics save).
    const dialogPlantId =
      dialogState.plant.attributes?.plant_id || dialogState.plant.entity_id.replace('sensor.', '');
    const allPlants = this._dialogHostController.value.devices.flatMap((d) => d.plants || []);
    const livePlant =
      allPlants.find(
        (p) => (p.attributes?.plant_id || p.entity_id.replace('sensor.', '')) === dialogPlantId
      ) || dialogState.plant;

    return html`
      <plant-overview-container
        .open=${true}
        .plant=${livePlant}
        .editedAttributes=${dialogState.editedAttributes}
        @close=${() => this._closeDialogIfActive('PLANT_OVERVIEW')}
        @update-plant=${(e: CustomEvent) =>
        this._handleUpdatePlantFromDialog({
          plant: dialogState.plant,
          editedAttributes: e.detail,
          selectedPlantIds: dialogState.selectedPlantIds,
          activeTab: dialogState.activeTab || 'dashboard',
        })}
        @delete-plant=${(e: CustomEvent) => this._handleDeletePlant(e.detail.plantId)}
        @harvest-plant=${(e: CustomEvent) => {
        openDialog({
          type: 'HARVEST_SCORING',
          payload: { plant: e.detail.plant },
        });
      }}
        @finish-drying=${(e: CustomEvent) => this._handleAdvancePlantStage(e.detail.plant)}
        @take-clone=${(e: CustomEvent) =>
        withToast(() => sliceTakeClone(e.detail.plant, e.detail.numClones), {
          success: `Taking ${e.detail.numClones || 1} clone${(e.detail.numClones || 1) > 1 ? 's' : ''}...`,
          errorPrefix: 'Failed to take clone',
        })}
        @move-clone=${(e: CustomEvent) =>
        this._handleMovePlant(e.detail.plant, e.detail.targetGrowspace)}
        @open-watering=${(e: CustomEvent) =>
        openDialog({
          type: 'WATERING',
          payload: e.detail,
        })}
        @open-training=${(e: CustomEvent) => {
        openTrainingDialog(e.detail.plantIds, e.detail.growspaceId);
      }}
        @open-ipm=${(e: CustomEvent) =>
        openDialog({
          type: 'IPM',
          payload: e.detail,
        })}
        @open-clone=${(e: CustomEvent) =>
        openDialog({
          type: 'TAKE_CLONE',
          payload: e.detail,
        })}
        @open-strain-editor=${(e: CustomEvent) => this._handleOpenStrainEditor(e)}
        @open-log-pollination=${(e: CustomEvent) => this._handleOpenLogPollination(e)}
      ></plant-overview-container>
    `;
  }

  private _computeActivePlantCounts(devices: GrowspaceDevice[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const device of devices) {
      for (const plant of device.plants || []) {
        const strain = plant.attributes?.strain;
        const stage = (plant.state || plant.attributes?.stage || '').toLowerCase();
        const activeStages = [
          'seedling',
          'clone',
          'veg',
          'vegetative',
          'mother',
          'flower',
          'flowering',
        ];
        if (strain && activeStages.includes(stage)) {
          counts[strain] = (counts[strain] || 0) + 1;
        }
      }
    }
    return counts;
  }

  private _renderStrainLibraryDialog(
    active: ActiveDialogState,
    strainLibrary: StrainEntry[],
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'STRAIN_LIBRARY') return html``;
    const payload = active.payload as Record<string, unknown>;
    const activePlantCounts = this._computeActivePlantCounts(
      this._dialogHostController.value.devices ?? []
    );

    // Lazily load genetics data on first open
    if (!this._geneticsLoaded) {
      this._geneticsLoaded = true;
      this._refreshGeneticsData();
    }

    return html`
      <strain-library-dialog
        .open=${true}
        .hass=${this.hass}
        .store=${this.store}
        .strains=${strainLibrary}
        .editingStrain=${payload?.editingStrain}
        .activePlantCounts=${activePlantCounts}
        .focusLineage=${!!payload?.focusLineage}
        .source=${payload?.source}
        .returnPayload=${payload?.returnPayload}
        .seedBatches=${this._seedBatchesController.value as SeedBatch[]}
        .pollinationEvents=${this._pollinationEventsController.value as PollinationEvent[]}
        .plants=${this._dialogHostController.value.devices ?? []}
        .initialTab=${(active.payload as StrainLibraryDialogState).initialTab ?? 'strains'}
        .initialSubView=${(active.payload as StrainLibraryDialogState).initialSubView}
        .prefilledReceiverId=${(active.payload as StrainLibraryDialogState).prefilledReceiverId}
        .onSeedDataChanged=${() => this._refreshGeneticsData()}
        .onAddSeedBatch=${(data: Parameters<typeof sliceAddSeedBatch>[0]) =>
        withToast(
          async () => {
            await sliceAddSeedBatch(data);
            await fetchGeneticsData();
          },
          { success: 'Seed batch added', errorPrefix: 'Failed to add seed batch', rethrow: true }
        )}
        .onUpdateSeedBatch=${(data: Parameters<typeof sliceUpdateSeedBatch>[0]) =>
        withToast(
          async () => {
            await sliceUpdateSeedBatch(data);
            await fetchGeneticsData();
          },
          {
            success: 'Seed batch updated',
            errorPrefix: 'Failed to update seed batch',
            rethrow: true,
          }
        )}
        .onLogPollination=${(data: Parameters<typeof sliceLogPollinationEvent>[0]) =>
        withToast(
          async () => {
            await sliceLogPollinationEvent(data);
            await fetchGeneticsData();
          },
          {
            success: 'Pollination event logged',
            errorPrefix: 'Failed to log pollination',
            rethrow: true,
          }
        )}
        .onHarvestSeeds=${(data: Parameters<typeof sliceHarvestSeeds>[0]) =>
        withToast(
          async () => {
            await sliceHarvestSeeds(data);
            await fetchGeneticsData();
          },
          { success: 'Seeds harvested', errorPrefix: 'Failed to harvest seeds', rethrow: true }
        )}
        .onUpdatePollination=${(data: Parameters<typeof sliceUpdatePollinationEvent>[0]) =>
        withToast(
          async () => {
            await sliceUpdatePollinationEvent(data);
            await fetchGeneticsData();
          },
          {
            success: 'Pollination event updated',
            errorPrefix: 'Failed to update pollination',
            rethrow: true,
          }
        )}
        .onDeletePollination=${(event_id: string) =>
        withToast(
          async () => {
            await sliceDeletePollinationEvent(event_id);
            await fetchGeneticsData();
          },
          {
            success: 'Pollination event deleted',
            errorPrefix: 'Failed to delete pollination',
            rethrow: true,
          }
        )}
        .onDeleteSeedBatch=${async (batch_id: string) => {
        await withToast(
          async () => {
            await sliceRemoveSeedBatch(batch_id);
            await fetchGeneticsData();
          },
          { success: 'Seed batch deleted', errorPrefix: 'Failed to delete seed batch', rethrow: true }
        );
      }}
        .onSowSeeds=${async (data: {
        growspace_id: string;
        strain: string;
        amount: number;
        seed_batch_id: string;
        generation?: string;
      }) => {
        await this.store?.dataService.addPlants({
          growspace_id: data.growspace_id,
          strain: data.strain,
          amount: data.amount,
          seed_batch_id: data.seed_batch_id,
        } as Parameters<typeof this.store.dataService.addPlants>[0]);
        this.store?.refreshData();
      }}
        @close=${() => this._closeDialogIfActive('STRAIN_LIBRARY')}
        @strain-created-at-source=${(e: CustomEvent) => {
        const { source, returnPayload } = e.detail;
        if (source === 'ADD_PLANT' || source === 'ADD_PLANTS') {
          openDialog({
            type: source,
            payload: returnPayload,
          });
        }
      }}
        @save-strain=${async (e: CustomEvent) => {
        if (!this.store) return;
        try {
          await this._handleUpdateStrain(e.detail);
          await this._handleDataChanged();
        } catch (e: any) {
          console.error('[DialogHost] Save strain failed:', e);
        }
      }}
        @delete-strain=${async (e: CustomEvent) => {
        await this._handleRemoveStrain(e.detail.key);
        this._handleDataChanged();
      }}
        @update-breeder=${(e: CustomEvent) => this._handleUpdateBreeder(e.detail)}
        @save-breeder=${(e: CustomEvent) => this._handleSaveBreeder(e.detail)}
        @delete-breeder=${(e: CustomEvent) => this._handleDeleteBreeder(e.detail)}
        @import-library=${(e: CustomEvent) => this._performImport(e.detail)}
        @export-library=${() => exportStrainLibrary()}
        @get-recommendation=${() => openStrainRecommendationDialog()}
        @open-print-label=${(e: CustomEvent) => {
        openDialog({
          type: 'PRINT_LABEL',
          payload: e.detail,
        });
      }}
        @data-changed=${() => this._handleDataChanged()}
      ></strain-library-dialog>
    `;
  }

  private async _performImport(detail: { file: File; replace: boolean }) {
    if (!detail.file) return;

    try {
      await this.store?.actions.library.import(detail.file, detail.replace);
      await this._handleDataChanged();
      showToast('Strain library imported successfully', 'success');
      this.store?.actions.library.fetchStrains(true);
    } catch (e: any) {
      showToast(`Import failed: ${e.message || e}`, 'error');
    }
  }

  private async _handleUpdateStrain(strainData: Partial<StrainEntry>): Promise<void> {
    if (!strainData.strain) return;
    await withToast(
      async () => {
        await updateStrainMeta(normalizeStrainFormData(strainData));
        const tree = (strainData as { parents?: { parents?: unknown[] } }).parents;
        if (tree?.parents?.length) {
          await importStrainLineageTree(
            strainData.strain!,
            tree as unknown as Record<string, unknown>
          );
        }
        await fetchStrainLibrary();
      },
      { success: 'Strain updated successfully!', errorPrefix: 'Failed to update strain' }
    );
  }

  private async _handleRemoveStrain(key: string): Promise<void> {
    await withToast(
      async () => {
        await sliceRemoveStrain(key);
        await fetchStrainLibrary();
      },
      { errorPrefix: 'Failed to remove strain' }
    );
  }

  private async _handleUpdateBreeder(detail: { oldName: string; newName: string; logo: string }) {
    try {
      await withToast(
        async () => {
          await updateBreeder(detail.oldName, detail.newName, detail.logo);
          await this.store?.refreshData();
        },
        {
          success: 'Breeder updated successfully!',
          errorPrefix: 'Failed to update breeder',
          rethrow: true,
        }
      );
      await this.store?.actions.library.fetchStrains(true);
    } catch (err) {
      console.error('[DialogHost] Update breeder failed:', err);
    }
  }

  private async _handleSaveBreeder(_detail: any) {
    this.store?.ui.showToast(
      'Breeders are created automatically when you save a strain with breeder info.',
      'info'
    );
  }

  private async _handleDeleteBreeder(detail: { name: string }) {
    try {
      await withToast(
        async () => {
          await deleteBreeder(detail.name);
          await this.store?.refreshData();
        },
        {
          success: 'Breeder deleted successfully!',
          errorPrefix: 'Failed to delete breeder',
          rethrow: true,
        }
      );
      await this.store?.actions.library.fetchStrains(true);
    } catch (err) {
      console.error('[DialogHost] Delete breeder failed:', err);
    }
  }

  private _renderConfigDialog(
    active: ActiveDialogState,
    growspaceOptions: Record<string, string>,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'CONFIG') return html``;
    const dialogState = active.payload;
    return html`
      <config-dialog
        .open=${true}
        .hass=${this.hass}
        .devices=${this._dialogHostController.value.devices}
        .currentTab=${dialogState.currentTab}
        .environmentData=${dialogState.environmentData}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this._closeDialogIfActive('CONFIG')}
        @add-growspace-submit=${async (e: CustomEvent) => {
        if (!this.store) return;
        if (!e.detail?.name) {
          showToast('Name is required', 'error');
          return;
        }
        await withToast(
          async () => {
            await sliceAddGrowspace(e.detail);
            closeDialog();
            await this._handleDataChanged();
          },
          { success: 'Growspace added successfully!', errorPrefix: 'Failed to add growspace' }
        );
      }}
        @edit-growspace-submit=${async (e: CustomEvent) => {
        if (!this.store) return;
        await withToast(
          async () => {
            await sliceUpdateGrowspace({
              growspaceId: e.detail.growspaceId,
              name: e.detail.name,
              rows: e.detail.rows,
              plantsPerRow: e.detail.plantsPerRow,
            });
            await this._handleDataChanged();
          },
          { success: 'Growspace updated successfully!', errorPrefix: 'Failed to update growspace' }
        );
      }}
        @delete-growspace-submit=${(e: CustomEvent) => this._handleRemoveGrowspace(e.detail)}
        @remove-environment-submit=${(e: CustomEvent) => this._handleRemoveEnvironment(e.detail)}
        @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
        @vision-checkup-config-submit=${(e: CustomEvent) =>
        this._handleVisionCheckupConfig(e.detail)}
      ></config-dialog>
    `;
  }

  private async _handleRemoveGrowspace(detail: { growspace_id: string }) {
    await withToast(
      async () => {
        await sliceRemoveGrowspace(detail.growspace_id);
        await this._handleDataChanged();
      },
      { success: 'Growspace removed', errorPrefix: 'Failed to remove growspace' }
    );
  }

  private async _handleRemoveEnvironment(detail: { growspace_id: string }) {
    await withToast(
      async () => {
        await sliceRemoveEnvironment(detail.growspace_id);
        await this._handleDataChanged();
      },
      {
        success: 'Environment configuration removed',
        errorPrefix: 'Failed to remove environment',
      }
    );
  }

  private async _handleEnvironmentConfig(detail: any) {
    const temperatureSensors: string[] = detail.temperatureSensors || [];
    const humiditySensors: string[] = detail.humiditySensors || [];

    if (!detail.selectedGrowspaceId || !temperatureSensors.length || !humiditySensors.length) {
      showToast(
        'Growspace, Temperature, and Humidity sensors are mandatory',
        'error'
      );
      return;
    }

    try {
      await withToast(
        async () => {
          await sliceConfigureEnvironment({
            growspaceId: detail.selectedGrowspaceId,
        temperatureSensors,
        humiditySensors,
        vpdSensors: detail.vpdSensors,
        co2Sensor: detail.co2Sensor || undefined,
        circulationFanEntities: detail.circulationFanEntities,
        stressThreshold: detail.stressThreshold,
        moldThreshold: detail.moldThreshold,
        lightSensors: detail.lightSensors,
        exhaustFanEntities: detail.exhaustFanEntities,
        humidifierEntities: detail.humidifierEntities,
        humidifierThresholds: detail.humidifierThresholds,
        controlHumidifier: detail.humidifierControlEnabled,
        dehumidifierEntities: detail.dehumidifierEntities,
        dehumidifierThresholds: detail.dehumidifierThresholds,
        soilMoistureSensor: detail.soilMoistureSensor || undefined,
        controlDehumidifier: detail.dehumidifierControlEnabled,
        sensorGroups: detail.sensorGroups,
        sensorCoordinates: detail.sensorCoordinates,
        irrigationTanks: detail.irrigationTanks,
        cameraEntities: detail.cameraEntities,
        lungroomTempSensors: detail.lungroomTempSensors,
        substrateTemperatureSensors: detail.substrateTemperatureSensors,
        phSensors: detail.phSensors,
        feedEcSensors: detail.feedEcSensors,
        bulkEcSensors: detail.bulkEcSensors,
        poreEcSensors: detail.poreEcSensors,
        runoffEcSensors: detail.runoffEcSensors,
        drainVolumeSensors: detail.drainVolumeSensors,
        irrigationFlowSensors: detail.irrigationFlowSensors,
        powerSensors: detail.powerSensors,
        energySensors: detail.energySensors,
            circulationFanConfig: detail.circulationFanConfig,
            vpdOptimalOverrides: detail.vpdOptimalOverrides,
          });
          await this.store?.refreshData();
        },
        {
          success: 'Environment configured successfully!',
          errorPrefix: 'Failed to configure environment',
          rethrow: true,
        }
      );
      closeDialog();
    } catch (e: unknown) {
      console.error('[DialogHost] configureEnvironment failed:', e);
    }
  }

  private async _handleVisionCheckupConfig(detail: VisionCheckupConfigEventDetail) {
    try {
      await withToast(
        async () => {
          await updateVisionCheckupConfig(detail.growspaceId, detail.visionCheckupConfig);
          await this.store?.refreshData();
        },
        { success: 'Vision config saved', errorPrefix: 'Failed to save vision config', rethrow: true }
      );
      closeDialog();
    } catch (e: unknown) {
      console.error('[DialogHost] updateCheckupConfig failed:', e);
    }
  }

  private _renderGrowMasterDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'GROW_MASTER') return html``;
    const dialogState = active.payload;

    let isStressed = false;
    let personality;
    const selectedDevice = selectedDeviceData?.deviceId;

    if (selectedDevice && this.hass) {
      const id = selectedDevice;
      const stressEntityIds = [
        `binary_sensor.${id}_plants_under_stress`,
        `binary_sensor.${id}_stress`,
        `binary_sensor.growspace_manager_${id}_stress`,
      ];

      for (const eid of stressEntityIds) {
        const ent = this.hass.states[eid];
        if (ent && ent.state === 'on') {
          isStressed = true;
          break;
        }
      }

      const manager = this.hass.states['sensor.growspace_manager'];
      if (manager && manager.attributes) {
        personality =
          manager.attributes.personality ||
          (manager.attributes.ai_settings && manager.attributes.ai_settings.personality);
      }
    }

    return html`
      <grow-master-dialog
        .open=${true}
        .hass=${this.hass}
        .isStressed=${isStressed}
        .personality=${personality}
        .growspaceId=${dialogState.growspaceId}
        .growspaceName=${selectedDeviceData?.name || ''}
        .isLoading=${dialogState.isLoading}
        .response=${dialogState.response}
        @close=${() => this._closeDialogIfActive('GROW_MASTER')}
        @analyze-growspace=${(e: CustomEvent) => this._handleAskAdvice(e.detail.query)}
        @analyze-all-growspaces=${() => this._handleAnalyzeAll()}
        @data-changed=${() => this._handleDataChanged()}
      ></grow-master-dialog>
    `;
  }

  // The Grow Master selected device is a per-card atom, so the device id is
  // read here and threaded into the module-level slice mutator.
  private async _handleAskAdvice(query: string): Promise<void> {
    const selectedDevice = this.store?.grid.$selectedDevice.get();
    if (!selectedDevice) {
      showToast('No device selected', 'error');
      return;
    }
    await withToast(() => askGrowAdvice(selectedDevice, query), {
      errorPrefix: 'Failed to get advice',
    });
  }

  private async _handleAnalyzeAll(): Promise<void> {
    await withToast(() => analyzeAllGrowspaces(), { errorPrefix: 'Failed to analyze growspaces' });
  }

  private _renderStrainRecommendationDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'STRAIN_RECOMMENDATION') return html``;
    return html`
      <strain-recommendation-dialog
        .open=${true}
        @close=${() => this._closeDialogIfActive('STRAIN_RECOMMENDATION')}
        @data-changed=${() => this._handleDataChanged()}
      >
      </strain-recommendation-dialog>
    `;
  }

  private _renderIrrigationDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'IRRIGATION') return html``;
    return html`
      <irrigation-dialog
        .open=${true}
        .device=${selectedDeviceData}
        .growspaceName=${selectedDeviceData?.name || ''}
        .initialTab=${active.payload.initialTab}
        .scrollToField=${active.payload.scrollToField}
        @close=${() => this._closeDialogIfActive('IRRIGATION')}
        @closed=${() => this._closeDialogIfActive('IRRIGATION')}
        @data-changed=${() => this._handleDataChanged()}
      >
      </irrigation-dialog>
    `;
  }

  private _renderLogbookDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'LOGBOOK') return html``;
    const dialogState = active.payload;
    return html`
      <logbook-dialog
        .open=${true}
        .growspaceId=${dialogState.growspaceId || selectedDeviceData?.deviceId}
        @close=${() => this._closeDialogIfActive('LOGBOOK')}
        @data-changed=${() => this._handleDataChanged()}
      ></logbook-dialog>
    `;
  }

  private _renderWateringDialog(
    active: ActiveDialogState,
    nutrientPresets: NutrientPresetsResponse,
    nutrientInventory: NutrientInventory | null,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'WATERING') return html``;
    const payload = active.payload as any;

    const presetOptions = Object.values(nutrientPresets).map((p) => ({
      label: p.name,
      value: p.id,
    }));

    const targetText =
      payload?.mode === 'plant'
        ? `${(payload.plantIds || []).length} plant(s)`
        : selectedDeviceData?.name || 'Entire growspace';

    return html`
      <feed-and-water-dialog
        .open=${true}
        .presetOptions=${presetOptions}
        .targetText=${targetText}
        .inventory=${nutrientInventory}
        .presets=${nutrientPresets}
        @close=${() => this._closeDialogIfActive('WATERING')}
        @submit-watering=${(e: CustomEvent) =>
        this._handleWateringSubmit(e, payload, selectedDeviceData?.deviceId)}
      ></feed-and-water-dialog>
    `;
  }

  private async _handleWateringSubmit(
    e: CustomEvent,
    payload: any,
    fallbackGrowspaceId?: string
  ): Promise<void> {
    try {
      const { volume, nutrients, presetId } = e.detail;
      const nutrientRecord: Record<string, number> = {};
      if (Array.isArray(nutrients)) {
        for (const n of nutrients as Array<{ name: string; concentration: number }>) {
          if (n.name && n.concentration > 0) nutrientRecord[n.name] = n.concentration;
        }
      } else if (nutrients && typeof nutrients === 'object') {
        Object.assign(nutrientRecord, nutrients);
      }
      if (payload?.mode === 'plant') {
        const plantIds = payload?.plantIds || (payload?.plant_id ? [payload.plant_id] : []);
        const promises = plantIds.map((pid: string) =>
          sliceWaterPlant(pid, volume, nutrientRecord, presetId)
        );
        await Promise.all(promises);
      } else {
        const growspaceId = payload?.growspace_id || fallbackGrowspaceId;
        if (growspaceId) {
          await sliceWaterGrowspace(growspaceId, volume, nutrientRecord, presetId);
        }
      }
      if (Object.keys(nutrientRecord).length > 0) {
        await fetchNutrientInventory();
      }
      this.store?.ui.closeDialog();
      showToast('Watering recorded', 'success');
      await this._handleDataChanged();
    } catch (err: any) {
      showToast(`Watering failed: ${err.message || err}`, 'error');
    }
  }

  private _renderNutrientPresetsDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'NUTRIENT_PRESETS') return html``;
    return html`
      <growspace-nutrient-presets-editor
        .open=${true}
        .store=${this.store}
        .hass=${this.hass}
        .growspaceId=${selectedDeviceData?.deviceId}
        @close=${() => this._closeDialogIfActive('NUTRIENT_PRESETS')}
        @data-changed=${() => this._handleDataChanged()}
      ></growspace-nutrient-presets-editor>
    `;
  }

  private _renderTrainingDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'TRAINING') return html``;
    return html`
      <training-dialog
        .open=${true}
        .store=${this.store}
        @close=${() => this._closeDialogIfActive('TRAINING')}
        @data-changed=${() => this._handleDataChanged()}
      >
      </training-dialog>
    `;
  }

  private _renderIPMDialog(
    active: ActiveDialogState,
    ipmPresets: Record<string, IPMPreset>,
    effectiveDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'IPM') return html``;
    const payload = active.payload as any;
    const growspaceId = effectiveDeviceData?.deviceId || '';
    const plantIds: string[] = payload?.selectedPlantIds || [];
    return html`
      <growspace-ipm-dialog-ui
        .open=${true}
        .growspaceId=${growspaceId}
        .plantIds=${plantIds}
        .presets=${ipmPresets}
        @close=${() => this._closeDialogIfActive('IPM')}
        @apply-ipm=${(e: CustomEvent) => this._handleApplyIPM(e, growspaceId, plantIds)}
        @save-preset=${async (e: CustomEvent) => {
        try {
          const preset = e.detail;
          await withToast(
            async () => {
              await saveIPMPreset({
                preset_id: preset.preset_id ?? preset.id,
                name: preset.name,
                type: preset.type,
                items: preset.items,
                stage: preset.stage,
                min_days_in_stage: preset.min_days_in_stage,
              });
              await fetchIPMPresets();
            },
            {
              success: `Saved IPM preset: ${preset.name}`,
              errorPrefix: 'Failed to save IPM preset',
              rethrow: true,
            }
          );
          await this._handleDataChanged();
        } catch (e: any) {
          console.error('[DialogHost] IPM preset save failed:', e);
        }
      }}
        @delete-preset=${async (e: CustomEvent) => {
        try {
          await withToast(
            async () => {
              await removeIPMPreset(e.detail.presetId);
              await fetchIPMPresets();
            },
            { success: 'Removed IPM preset', errorPrefix: 'Failed to remove IPM preset', rethrow: true }
          );
          await this._handleDataChanged();
        } catch (e: any) {
          console.error('[DialogHost] IPM preset delete failed:', e);
        }
      }}
      ></growspace-ipm-dialog-ui>
    `;
  }

  private async _handleApplyIPM(
    e: CustomEvent,
    growspaceId: string,
    plantIds: string[]
  ): Promise<void> {
    try {
      await withToast(
        async () => {
          await applyIPM({
            preset_id: e.detail.presetId,
            growspace_id: growspaceId,
            plant_ids: plantIds,
            notes: e.detail.notes,
          });
          // IPM products often deduct from stock, so refresh inventory.
          await fetchNutrientInventory();
        },
        { success: 'IPM treatment applied', errorPrefix: 'IPM failed', rethrow: true }
      );
      this.store?.ui.closeDialog();
      await this._handleDataChanged();
    } catch (err: any) {
      console.error('[DialogHost] Apply IPM failed:', err);
    }
  }

  private _renderSnapshotsDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'SNAPSHOTS') return html``;
    return html`
      <snapshots-dialog
        .open=${true}
        .dialogState=${active.payload}
        .growspaceName=${selectedDeviceData?.name || ''}
        @close=${() => this._closeDialogIfActive('SNAPSHOTS')}
        @data-changed=${() => this._handleDataChanged()}
      ></snapshots-dialog>
    `;
  }

  private _renderCropSteeringDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'CROP_STEERING') return html``;
    return html`
      <crop-steering-dialog
        .open=${true}
        .dialogState=${active.payload}
        .growspaceName=${selectedDeviceData?.name || ''}
        @close=${() => this._closeDialogIfActive('CROP_STEERING')}
        @data-changed=${() => this._handleDataChanged()}
      ></crop-steering-dialog>
    `;
  }

  private _renderNutrientInventoryDialog(
    active: ActiveDialogState,
    nutrientInventory: NutrientInventory | null,
    _effectiveDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'NUTRIENT_INVENTORY') return html``;
    return html`
      <growspace-nutrient-inventory-dialog-ui
        .open=${true}
        .inventory=${nutrientInventory}
        @close=${() => this._closeDialogIfActive('NUTRIENT_INVENTORY')}
        @update-stock=${(e: CustomEvent) =>
        this.store?.actions.library.updateNutrientStock(
          e.detail.id,
          e.detail.name,
          e.detail.current_ml,
          e.detail.initial_ml
        )}
        @add-stock=${(e: CustomEvent) =>
        this.store?.actions.library.updateNutrientStock(
          e.detail.id || `nutrient_${Date.now()}`,
          e.detail.name,
          e.detail.current_ml,
          e.detail.initial_ml
        )}
        @data-changed=${() => this._handleDataChanged()}
      ></growspace-nutrient-inventory-dialog-ui>
    `;
  }

  private _renderCloneDialog(
    active: ActiveDialogState,
    growspaceOptions: Record<string, string>,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'TAKE_CLONE') return html``;
    const dialogState = active.payload;
    return html`
      <clone-dialog
        .open=${true}
        .store=${this.store}
        .sourcePlant=${dialogState.sourcePlant}
        .growspaceOptions=${growspaceOptions}
        .defaultGrowspace=${dialogState.defaultGrowspaceId}
        @take-clone-submit=${async (e: CustomEvent) => {
        const { numClones, targetGrowspaceId } = e.detail;
        try {
          await withToast(
            () => sliceTakeClone(dialogState.sourcePlant, numClones, targetGrowspaceId),
            {
              success: `Taking ${numClones || 1} clone${(numClones || 1) > 1 ? 's' : ''}...`,
              errorPrefix: 'Failed to take clone',
              rethrow: true,
            }
          );
          await this._handleDataChanged();
        } catch (e: any) {
          console.error('[DialogHost] Take clone failed:', e);
        }
      }}
        @close=${() => this._closeDialogIfActive('TAKE_CLONE')}
        @data-changed=${() => this._handleDataChanged()}
      ></clone-dialog>
    `;
  }

  private _renderNutrientDialog(
    active: ActiveDialogState,
    nutrientPresets: NutrientPresetsResponse,
    nutrientInventory: NutrientInventory | null
  ): TemplateResult {
    if (active.type !== 'NUTRIENTS') return html``;
    return html`
      <feed-and-water-dialog
        .open=${true}
        .inventory=${nutrientInventory}
        .presets=${nutrientPresets}
        @close=${() => this._closeDialogIfActive('NUTRIENTS')}
      ></feed-and-water-dialog>
    `;
  }

  private _renderPrintLabelDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'PRINT_LABEL') return html``;
    return html`
      <print-label-dialog
        .open=${true}
        .dialogState=${active.payload}
        @close=${() => this._closeDialogIfActive('PRINT_LABEL')}
        @data-changed=${() => this._handleDataChanged()}
      ></print-label-dialog>
    `;
  }

  private _renderBatchPrintLabelsDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'BATCH_PRINT_LABELS') return html``;
    return html`
      <batch-print-label-dialog
        .open=${true}
        .dialogState=${active.payload}
        @close=${() => this._closeDialogIfActive('BATCH_PRINT_LABELS')}
      ></batch-print-label-dialog>
    `;
  }

  private _renderBatchCloneDialog(
    active: ActiveDialogState,
    growspaceOptions: Record<string, string>
  ): TemplateResult {
    if (active.type !== 'BATCH_CLONE') return html``;
    return html`
      <batch-clone-dialog
        .open=${true}
        .dialogState=${active.payload}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this._closeDialogIfActive('BATCH_CLONE')}
      ></batch-clone-dialog>
    `;
  }

  private _renderHarvestScoringDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'HARVEST_SCORING') return html``;
    return html`
      <harvest-scoring-dialog
        .open=${true}
        .dialogState=${active.payload}
        @close=${() => this._closeDialogIfActive('HARVEST_SCORING')}
        @data-changed=${() => this._handleDataChanged()}
      ></harvest-scoring-dialog>
    `;
  }

  private _renderEnvironmentConfigDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'ENVIRONMENT_CONFIG') return html``;
    return html`
      <growspace-environment-config-dialog
        .open=${true}
        .deviceId=${active.payload?.deviceId}
        @close=${() => closeDialog()}
        @save-config=${(e: CustomEvent) => this._handleEnvironmentConfigSubmit(e)}
      ></growspace-environment-config-dialog>
    `;
  }

  private async _handleEnvironmentConfigSubmit(e: CustomEvent) {
    try {
      await withToast(
        async () => {
          await sliceConfigureEnvironment(e.detail);
          await this.store?.refreshData();
        },
        {
          success: 'Environment configured successfully!',
          errorPrefix: 'Failed to configure environment',
          rethrow: true,
        }
      );
      closeDialog();
    } catch (err: any) {
      console.error('[DialogHost] configureEnvironment failed:', err);
    }
  }

  private _handleOpenLogPollination(e: CustomEvent): void {
    const plantId: string = (e.detail as { plantId?: string })?.plantId ?? '';
    openDialog({
      type: 'STRAIN_LIBRARY',
      payload: {
        initialTab: 'seeds',
        initialSubView: 'log-pollination',
        prefilledReceiverId: plantId,
      },
    });
  }

  protected _handleDataChanged() {
    if (this._dataChangeTimeout) clearTimeout(this._dataChangeTimeout);
    this._dataChangeTimeout = window.setTimeout(() => this.store?.refreshData(), 500);
  }
}
