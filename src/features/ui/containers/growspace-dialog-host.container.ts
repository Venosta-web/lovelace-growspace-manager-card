import { LitElement, html, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { hassContext, storeContext, configContext } from '../../../lib/context';
import {
  waterPlant as sliceWaterPlant,
  addPlants,
  addPlant,
  deletePlant,
  updatePlant,
  takeClone,
  movePlantToGrowspace,
  advancePlantStage,
  waterGrowspace as sliceWaterGrowspace,
} from '../../../slices/plant';
import {
  seedBatches$,
  pollinationEvents$,
  addSeedBatch,
  updateSeedBatch,
  removeSeedBatch,
  logPollinationEvent,
  updatePollinationEvent,
  deletePollinationEvent,
  harvestSeeds,
  fetchGeneticsData,
} from '../../../slices/genetics';
import { updateVisionCheckupConfig } from '../../../slices/camera';
import { getStrainRecommendation } from '../../../slices/ai-insight';
import { PlantUtils } from '../../../utils/plant-utils';
import { needsExhaustCall } from '../../config/environment-save';
import {
  updateBreeder,
  deleteBreeder,
  addStrain,
  fetchStrainLibrary,
  updateStrainMeta,
  removeStrain,
  strainLibrary$,
  setStrainLibrary,
} from '../../../slices/strain';
import {
  addGrowspace,
  updateGrowspace,
  removeGrowspace,
  configureEnvironment,
  configureExhaustFan,
  removeEnvironment,
} from '../../../slices/growspace';
import { saveNotificationSettings } from '../../../slices/notification';
import { withToast, showError, showToast, closeDialog } from '../../../slices/ui';
import * as uiSlice from '../../../slices/ui';
import { setHass } from '../../../services/hass-call';
import { GrowspaceStore } from '../../../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import { ActiveDialogState } from '../../../ui-state';
import {
  GrowspaceDevice,
  PlantEntity,
  StrainEntry,
  SeedBatch,
  PollinationEvent,
  IPMPreset,
  NutrientInventory,
  GrowspaceManagerCardConfig,
  AddPlantsDialogState,
  AddPlantDialogState,
  PlantOverviewDialogState,
} from '../../../types';
import type {
  EnvironmentConfigEventDetail,
  VisionCheckupConfigEventDetail,
  StrainLibraryDialogState,
} from '../../../lib/types/dialog';
import type { NutrientPresetsResponse } from '../../../slices/nutrient';
import {
  applyIPM,
  saveIPMPreset,
  removeIPMPreset,
  fetchIPMPresets,
  fetchNutrientInventory,
  updateNutrientStock as sliceUpdateNutrientStock,
} from '../../../slices/nutrient';

import './growspace-nutrient-presets-editor.container';
import '../../../dialogs/add-plant-dialog';
import '../../../dialogs/add-plants-dialog';
import '../../../dialogs/clone-dialog';
import '../../../dialogs/config-dialog';
import type { RemoveEnvironmentEventDetail } from '../../../dialogs/config-dialog';
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
import { portalVariables } from '../../../styles/variables';

@customElement('growspace-dialog-host')
export class GrowspaceDialogHost extends LitElement {
  /**
   * This element is appended to `document.body`, so it is a sibling of the card
   * and inherits none of the card's `:host` custom properties. Declaring them
   * here is what lets everything below it reference tokens bare. See ADR 0036.
   */
  static styles = portalVariables;

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
  private _dataChangeTimeout?: any;
  private _geneticsLoaded = false;
  @state() private _addPlantsLibraryError = '';

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._initControllers();
    }
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
    this._controllersInitialized = true;
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

  /**
   * Run a Genetics slice mutator, refresh data, and surface success/failure via
   * the shared toast helper — the per-site orchestration the retired
   * genetics-actions wrapper used to carry.
   */
  private _runGenetics<T>(
    fn: () => Promise<T>,
    success: string,
    errorPrefix: string
  ): Promise<T | undefined> {
    return withToast(
      async () => {
        const result = await fn();
        await this.store?.refreshData();
        return result;
      },
      { success, errorPrefix, rethrow: true }
    );
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
        @add-plant-submit=${(e: CustomEvent) => this._confirmAddPlant(e.detail)}
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
    try {
      // Update plant position and growspace via the Plant slice mutator.
      await updatePlant(detail.plant_id, {
        row: detail.new_row,
        col: detail.new_col,
        growspace_id: detail.target_growspace_id,
        veg_start: detail.veg_start,
      });

      this.store.ui.closeDialog();
      await this._handleDataChanged();
    } catch (e: any) {
      console.error('[DialogHost] Transplant failed:', e);
      // Toast handles in dispatcher or action
    }
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

    uiSlice.openDialog({
      type: 'STRAIN_LIBRARY',
      payload: {
        view: 'editor',
        editingStrain: strainEntry,
        focusLineage: !!focusLineage,
      },
    });
  }

  protected _handleStrainCreatedAtSource(e: CustomEvent) {
    uiSlice.openDialog({
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
        @close=${() => {
          this._addPlantsLibraryError = '';
          this._closeDialogIfActive('ADD_PLANTS');
        }}
        @show-toast=${(e: CustomEvent) => uiSlice.showToast(e.detail.message, e.detail.type)}
        @add-plants-submit=${async (e: CustomEvent) => {
          this._addPlantsLibraryError = '';
          try {
            await this._confirmAddPlants(e.detail);
          } catch (err) {
            this._addPlantsLibraryError =
              err instanceof Error ? err.message : 'Failed to add strains to library';
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
          this._updatePlantFromDialog({
            plant: dialogState.plant,
            editedAttributes: e.detail,
            selectedPlantIds: dialogState.selectedPlantIds,
            activeTab: dialogState.activeTab || 'dashboard',
          })}
        @delete-plant=${(e: CustomEvent) => this._handleDeletePlant(e.detail.plantId)}
        @harvest-plant=${(e: CustomEvent) => {
          uiSlice.openDialog({
            type: 'HARVEST_SCORING',
            payload: { plant: e.detail.plant },
          });
        }}
        @finish-drying=${(e: CustomEvent) => this._advancePlantStage(e.detail.plant)}
        @take-clone=${(e: CustomEvent) => this._takeClone(e.detail.plant, e.detail.numClones)}
        @move-clone=${(e: CustomEvent) => this._movePlant(e.detail.plant, e.detail.targetGrowspace)}
        @open-watering=${(e: CustomEvent) =>
          uiSlice.openDialog({
            type: 'WATERING',
            payload: e.detail,
          })}
        @open-training=${(e: CustomEvent) => {
          uiSlice.openTrainingDialog(e.detail.plantIds, e.detail.growspaceId);
        }}
        @open-ipm=${(e: CustomEvent) =>
          uiSlice.openDialog({
            type: 'IPM',
            payload: e.detail,
          })}
        @open-clone=${(e: CustomEvent) =>
          uiSlice.openDialog({
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
        .onAddSeedBatch=${(data: Parameters<typeof addSeedBatch>[0]) =>
          this._runGenetics(
            () => addSeedBatch(data),
            'Seed batch added',
            'Failed to add seed batch'
          )}
        .onUpdateSeedBatch=${(data: Parameters<typeof updateSeedBatch>[0]) =>
          this._runGenetics(
            () => updateSeedBatch(data),
            'Seed batch updated',
            'Failed to update seed batch'
          )}
        .onLogPollination=${(data: Parameters<typeof logPollinationEvent>[0]) =>
          this._runGenetics(
            () => logPollinationEvent(data),
            'Pollination event logged',
            'Failed to log pollination'
          )}
        .onHarvestSeeds=${(data: Parameters<typeof harvestSeeds>[0]) =>
          this._runGenetics(() => harvestSeeds(data), 'Seeds harvested', 'Failed to harvest seeds')}
        .onUpdatePollination=${(data: Parameters<typeof updatePollinationEvent>[0]) =>
          this._runGenetics(
            () => updatePollinationEvent(data),
            'Pollination event updated',
            'Failed to update pollination'
          )}
        .onDeletePollination=${(event_id: string) =>
          this._runGenetics(
            () => deletePollinationEvent(event_id),
            'Pollination event deleted',
            'Failed to delete pollination'
          )}
        .onDeleteSeedBatch=${async (batch_id: string) => {
          await this._runGenetics(
            () => removeSeedBatch(batch_id),
            'Seed batch deleted',
            'Failed to delete seed batch'
          );
          this._refreshGeneticsData();
        }}
        .onSowSeeds=${async (data: {
          growspace_id: string;
          strain: string;
          amount: number;
          seed_batch_id: string;
          generation?: string;
        }) => {
          await addPlants({
            growspace_id: data.growspace_id,
            strain: data.strain,
            amount: data.amount,
            seed_batch_id: data.seed_batch_id,
          });
          this.store?.refreshData();
        }}
        @close=${() => this._closeDialogIfActive('STRAIN_LIBRARY')}
        @strain-created-at-source=${(e: CustomEvent) => {
          const { source, returnPayload } = e.detail;
          if (source === 'ADD_PLANT' || source === 'ADD_PLANTS') {
            uiSlice.openDialog({
              type: source,
              payload: returnPayload,
            });
          }
        }}
        @save-strain=${async (e: CustomEvent) => {
          if (!this.store) return;
          try {
            await updateStrainMeta(e.detail);
            showToast('Strain updated successfully!', 'success');
            await fetchStrainLibrary({ cache: true, force: true });
            await this._handleDataChanged();
          } catch (err) {
            showError(err, 'Failed to update strain');
          }
        }}
        @delete-strain=${(e: CustomEvent) => this._handleDeleteStrain(e.detail.key)}
        @update-breeder=${(e: CustomEvent) => this._handleUpdateBreeder(e.detail)}
        @save-breeder=${(e: CustomEvent) => this._handleSaveBreeder(e.detail)}
        @delete-breeder=${(e: CustomEvent) => this._handleDeleteBreeder(e.detail)}
        @import-library=${(e: CustomEvent) => this._performImport(e.detail)}
        @export-library=${() => this._exportStrainLibrary()}
        @get-recommendation=${() => uiSlice.openStrainRecommendationDialog()}
        @open-print-label=${(e: CustomEvent) => {
          uiSlice.openDialog({
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
      const content = await detail.file.text();
      const strains = JSON.parse(content);
      if (!Array.isArray(strains)) throw new Error('Invalid format');
      for (const strain of strains) {
        await addStrain(strain);
      }
      await this._handleDataChanged();
      uiSlice.showToast('Strain library imported successfully', 'success');
      await fetchStrainLibrary({ cache: true, force: true });
    } catch (e: any) {
      uiSlice.showToast(`Import failed: ${e.message || e}`, 'error');
    }
  }

  private async _handleDeleteStrain(key: string) {
    try {
      await removeStrain(key);
      // Optimistic local removal so the list updates before the refetch lands.
      setStrainLibrary(strainLibrary$.get().filter((s) => s.key !== key));
      await fetchStrainLibrary({ cache: true, force: true });
    } catch (err) {
      console.error('Error removing strain:', err);
    }
    await this._handleDataChanged();
  }

  // ── Plant write handlers (repointed off the dispatcher) ──────────────────────

  private async _updatePlant(
    plantId: string,
    updates: Partial<PlantEntity['attributes']>
  ): Promise<void> {
    try {
      await updatePlant(plantId, updates);
      showToast('Plant updated', 'success');
    } catch (e) {
      showError(e, 'Failed to update plant');
    }
  }

  /**
   * Resolve the growspace an add-plant dialog targets: the id captured in the
   * open payload (ADR-0027), falling back to this card's per-card selection.
   * Never the page-global `selectedDeviceId$`, which is dead (always null).
   */
  private _activeGrowspaceId(): string | null {
    const active = this.store.ui.$activeDialog.get() as { payload?: { growspaceId?: string } };
    return active.payload?.growspaceId ?? this.store.grid.$selectedDevice.get();
  }

  private async _confirmAddPlant(detail: AddPlantDialogState): Promise<void> {
    if (!detail.strain) return;
    const selectedDevice = this._activeGrowspaceId();
    if (!selectedDevice) {
      showToast('No growspace selected', 'error');
      return;
    }
    try {
      if (detail.addToLibrary) {
        try {
          await addStrain({ strain: detail.strain, phenotype: detail.phenotype });
          await fetchStrainLibrary({ cache: true, force: true });
          showToast(`Added ${detail.strain} ${detail.phenotype ?? ''} to library`, 'success');
        } catch (e) {
          console.error('Failed to add strain to library:', e);
          showToast('Failed to add strain to library, continuing plant addition', 'info');
        }
      }
      await addPlant({
        growspace_id: selectedDevice,
        row: detail.row!,
        col: detail.col!,
        strain: detail.strain,
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
      showToast('Plant added successfully', 'success');
    } catch (e) {
      showError(e, 'Failed to add plant');
    }
  }

  private async _confirmAddPlants(detail: AddPlantsDialogState): Promise<void> {
    const selectedDevice = this._activeGrowspaceId();
    if (!selectedDevice) {
      showToast('No growspace selected', 'error');
      return;
    }

    if (detail.addToLibrary) {
      const amount = detail.amount || 1;
      const startNumber = detail.start_number || 1;
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < amount; i++) {
        const phenoName = detail.phenotype
          ? `${detail.phenotype} #${startNumber + i}`
          : `Strain #${startNumber + i}`;
        if (detail.strain)
          promises.push(addStrain({ strain: detail.strain, phenotype: phenoName }));
      }
      try {
        await Promise.all(promises);
        await fetchStrainLibrary({ cache: true, force: true });
        showToast(`Added ${amount} strain variants to library`, 'success');
      } catch (e) {
        throw e instanceof Error ? e : new Error('Failed to add strains to library');
      }
    }

    const { addToLibrary: _addToLibrary, ...apiPayload } = detail;
    await addPlants({
      ...apiPayload,
      growspace_id: selectedDevice,
    } as Parameters<typeof addPlants>[0]);
    showToast('Batch plants added successfully', 'success');
    closeDialog();
    await this._handleDataChanged();
  }

  private async _updatePlantFromDialog(
    dialogState: Pick<
      PlantOverviewDialogState,
      'plant' | 'editedAttributes' | 'selectedPlantIds' | 'activeTab'
    >
  ): Promise<void> {
    const { plant, editedAttributes, selectedPlantIds } = dialogState;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    const targetIds =
      selectedPlantIds && selectedPlantIds.length > 0 ? selectedPlantIds : [plantId];
    const payloadTemplate = PlantUtils.mapDialogToApiPayload(
      editedAttributes,
      targetIds.length > 1
    );

    try {
      await Promise.all(targetIds.map((id) => updatePlant(id, payloadTemplate)));
      closeDialog();
      await this._handleDataChanged();
      if (this.store.ui.$isEditMode.get()) {
        this.store.ui.setEditMode(false);
      }
    } catch (e) {
      showError(e, 'Failed to update plant(s)');
    }
  }

  private async _handleDeletePlant(plantId: string | string[]): Promise<void> {
    const ids = Array.isArray(plantId) ? plantId : [plantId];
    try {
      await Promise.all(ids.map((id) => deletePlant(id)));
      this.store.ui.deselectPlants(ids);
      if (uiSlice.activeDialog$.get().type === 'PLANT_OVERVIEW') closeDialog();
      await this._handleDataChanged();
    } catch (e) {
      showError(e, 'Failed to delete plant');
    }
  }

  private async _advancePlantStage(plant: PlantEntity): Promise<void> {
    try {
      const target = await advancePlantStage(plant);
      showToast(`Plant moved to ${target}`, 'success');
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this._handleDataChanged();
    } catch (e) {
      showError(e, 'Failed to move plant');
    }
  }

  private async _takeClone(
    plant: PlantEntity,
    numClones?: number,
    targetGrowspaceId?: string
  ): Promise<void> {
    try {
      await takeClone(plant, numClones, targetGrowspaceId);
      const count = numClones || 1;
      showToast(`Taking ${count} clone${count > 1 ? 's' : ''}...`, 'success');
      await this._handleDataChanged();
    } catch (e) {
      showError(e, 'Failed to take clone');
    }
  }

  private async _movePlant(plant: PlantEntity, targetGrowspace: string): Promise<void> {
    try {
      await movePlantToGrowspace(plant, targetGrowspace);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this._handleDataChanged();
    } catch (e) {
      showError(e, 'Failed to move plant');
    }
  }

  /** Download the strain library as a JSON file (client-side export). */
  private async _exportStrainLibrary(): Promise<void> {
    try {
      const library = await fetchStrainLibrary();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(library));
      const anchor = document.createElement('a');
      anchor.setAttribute('href', dataStr);
      anchor.setAttribute('download', 'strain_library_export.json');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (e) {
      showError(e, 'Failed to export library');
    }
  }

  private async _handleUpdateNutrientStock(
    id: string,
    name: string,
    currentMl: number,
    initialMl: number
  ) {
    try {
      await sliceUpdateNutrientStock(id, name, currentMl, initialMl);
      await fetchNutrientInventory({ cache: true, force: true });
      showToast(`Updated stock: ${name}`, 'success');
    } catch (e) {
      showError(e, 'Failed to update stock');
    }
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
      await fetchStrainLibrary({ cache: true, force: true });
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
      await fetchStrainLibrary({ cache: true, force: true });
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
        .initialTab=${dialogState.currentTab}
        .scrollToField=${dialogState.scrollToField}
        .growspaceId=${dialogState.growspaceId}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this._closeDialogIfActive('CONFIG')}
        @add-growspace-submit=${async (e: CustomEvent) => {
          if (!this.store) return;
          if (!e.detail.name) {
            showToast('Name is required', 'error');
            return;
          }
          try {
            await addGrowspace(e.detail);
            showToast('Growspace added successfully!', 'success');
            closeDialog();
            await this._handleDataChanged();
          } catch (err) {
            showError(err, 'Failed to add growspace');
          }
        }}
        @edit-growspace-submit=${async (e: CustomEvent) => {
          if (!this.store) return;
          try {
            await updateGrowspace({
              growspaceId: e.detail.growspaceId,
              name: e.detail.name,
              rows: e.detail.rows,
              plantsPerRow: e.detail.plantsPerRow,
              notificationService: e.detail.notificationService,
            });
            showToast('Growspace updated successfully', 'success');
            closeDialog();
            await this._handleDataChanged();
          } catch (err) {
            showError(err, 'Failed to update growspace');
          }
        }}
        @delete-growspace-submit=${(e: CustomEvent) => this._handleRemoveGrowspace(e.detail)}
        @remove-environment-submit=${(e: CustomEvent<RemoveEnvironmentEventDetail>) => {
          e.detail.completion = this._handleRemoveEnvironment(e.detail);
        }}
        @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
        @save-notification-settings-submit=${(e: CustomEvent) =>
          this._handleSaveNotificationSettings(e.detail)}
        @vision-checkup-config-submit=${(e: CustomEvent) =>
          this._handleVisionCheckupConfig(e.detail)}
      ></config-dialog>
    `;
  }

  private async _handleRemoveGrowspace(detail: { growspace_id: string }) {
    try {
      await removeGrowspace(detail.growspace_id);
      showToast('Growspace removed successfully', 'success');
      closeDialog();
      await this._handleDataChanged();
    } catch (e) {
      showError(e, 'Failed to remove growspace');
    }
  }

  private async _handleRemoveEnvironment(
    detail: RemoveEnvironmentEventDetail
  ): Promise<GrowspaceDevice | undefined> {
    try {
      await removeEnvironment(detail.growspace_id);
      showToast('Environment configuration removed', 'success');
      await this.store?.refreshData();
      return this.store?.$dialogHostState
        .get()
        .devices.find((device) => device.deviceId === detail.growspace_id);
    } catch (e) {
      showError(e, 'Failed to remove environment');
      return undefined;
    }
  }

  /**
   * Guard the mandatory sensors — but only for a patch that actually carries
   * them. Under sparse saves (ADR-0032) an untouched Sensors tab omits both
   * keys, and the stored sensors still stand; rejecting that save would make
   * every other tab unsavable.
   */
  private _isEnvironmentPatchValid(detail: EnvironmentConfigEventDetail): boolean {
    const clearsTemperature =
      'temperatureSensors' in detail && !(detail.temperatureSensors ?? []).length;
    const clearsHumidity = 'humiditySensors' in detail && !(detail.humiditySensors ?? []).length;

    if (!detail.selectedGrowspaceId || clearsTemperature || clearsHumidity) {
      uiSlice.showToast('Growspace, Temperature, and Humidity sensors are mandatory', 'error');
      return false;
    }
    return true;
  }

  private async _handleEnvironmentConfig(detail: EnvironmentConfigEventDetail) {
    if (!this._isEnvironmentPatchValid(detail)) return;

    try {
      await configureEnvironment(detail);
      // Exhaust config can't ride the configure_environment payload (the backend
      // service doesn't accept it), so persist it via its dedicated service.
      // Under patch semantics (GSM ADR-0026) configure_environment preserves
      // exhaust_fan_config, so the ordering is no longer load-bearing.
      // Only when the user actually edited it (ADR-0032): an unrelated
      // environment edit must not re-write the stored exhaust config.
      if (needsExhaustCall(detail) && detail.exhaustFanConfig) {
        await configureExhaustFan({
          growspaceId: detail.selectedGrowspaceId,
          fanConfig: detail.exhaustFanConfig,
        });
      }
      showToast('Environment configured successfully!', 'success');
      await this._handleDataChanged();
      uiSlice.closeDialog();
    } catch (e: unknown) {
      showError(e, 'Failed to configure environment');
    }
  }

  private async _handleSaveNotificationSettings(detail: {
    notification_settings: Record<string, number>;
    ai_auto_alerts: boolean;
    timed_notifications?: {
      id: string;
      message: string;
      trigger_type: string;
      day: number;
      growspace_ids: string[];
    }[];
  }) {
    try {
      await withToast(
        async () => {
          await saveNotificationSettings(detail);
          await this.store?.refreshData();
        },
        {
          success: 'Notification settings saved',
          errorPrefix: 'Failed to save notification settings',
          rethrow: true,
        }
      );
      uiSlice.closeDialog();
    } catch (e: unknown) {
      console.error('[DialogHost] saveNotificationSettings failed:', e);
    }
  }

  private async _handleVisionCheckupConfig(detail: VisionCheckupConfigEventDetail) {
    try {
      await withToast(
        async () => {
          await updateVisionCheckupConfig(detail.growspaceId, detail.visionCheckupConfig);
          await this.store?.refreshData();
        },
        {
          success: 'Vision config saved',
          errorPrefix: 'Failed to save vision config',
          rethrow: true,
        }
      );
      uiSlice.closeDialog();
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
        @close=${() => this._closeDialogIfActive('GROW_MASTER')}
        @data-changed=${() => this._handleDataChanged()}
      ></grow-master-dialog>
    `;
  }

  private _renderStrainRecommendationDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'STRAIN_RECOMMENDATION') return html``;
    const dialogState = active.payload;
    return html`
      <strain-recommendation-dialog
        .open=${true}
        .isLoading=${dialogState.isLoading}
        .response=${dialogState.response}
        @close=${() => this._closeDialogIfActive('STRAIN_RECOMMENDATION')}
        @get-recommendation=${(e: CustomEvent) =>
          this._handleGetStrainRecommendation(e.detail.query)}
        @data-changed=${() => this._handleDataChanged()}
      >
      </strain-recommendation-dialog>
    `;
  }

  /**
   * Run the AI strain-recommendation via the ai-insight slice and drive the
   * STRAIN_RECOMMENDATION dialog's loading/response payload (the dialog renders
   * from these). Failures surface through the shared showError toast.
   */
  private async _handleGetStrainRecommendation(query: string): Promise<void> {
    uiSlice.openDialog({
      type: 'STRAIN_RECOMMENDATION',
      payload: { isLoading: true, response: null },
    });
    try {
      const res = await getStrainRecommendation(query);
      const inner =
        typeof res === 'object' && res !== null && 'response' in res
          ? (res as { response: unknown }).response
          : res;
      const text = typeof inner === 'string' ? inner : JSON.stringify(inner);
      uiSlice.openDialog({
        type: 'STRAIN_RECOMMENDATION',
        payload: { isLoading: false, response: text },
      });
    } catch (e) {
      showError(e, 'Failed to get strain recommendation');
      uiSlice.openDialog({
        type: 'STRAIN_RECOMMENDATION',
        payload: { isLoading: false, response: null },
      });
    }
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
      this.store?.ui.closeDialog();
      uiSlice.showToast('Watering recorded', 'success');
      await this._handleDataChanged();
    } catch (err: any) {
      uiSlice.showToast(`Watering failed: ${err.message || err}`, 'error');
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
              {
                success: 'Removed IPM preset',
                errorPrefix: 'Failed to remove IPM preset',
                rethrow: true,
              }
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
        .device=${selectedDeviceData}
        @close=${() => this._closeDialogIfActive('SNAPSHOTS')}
        @data-changed=${() => this._handleDataChanged()}
      ></snapshots-dialog>
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
          this._handleUpdateNutrientStock(
            e.detail.id,
            e.detail.name,
            e.detail.current_ml,
            e.detail.initial_ml
          )}
        @add-stock=${(e: CustomEvent) =>
          this._handleUpdateNutrientStock(
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
        @take-clone-submit=${(e: CustomEvent) => {
          const { numClones, targetGrowspaceId } = e.detail;
          void this._takeClone(dialogState.sourcePlant, numClones, targetGrowspaceId);
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

  private _handleOpenLogPollination(e: CustomEvent): void {
    const plantId: string = (e.detail as { plantId?: string })?.plantId ?? '';
    uiSlice.openDialog({
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
