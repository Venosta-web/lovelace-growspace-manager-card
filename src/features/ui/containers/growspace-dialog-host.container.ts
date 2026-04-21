import { LitElement, html, TemplateResult, PropertyValues, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume, provide } from '@lit/context';
import { hassContext, storeContext, configContext } from '../../../lib/context';
import { GrowspaceStore } from '../../../store/core/growspace-store';
import { FEATURE_FLAGS } from '../../../features/shared/config/feature-flags';
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
} from '../../../types';
import type { VisionCheckupConfigEventDetail, StrainLibraryDialogState } from '../../../lib/types/dialog';
import { openStrainLibraryDialog } from '../../../store/ui/ui-actions';

import './growspace-nutrient-presets-editor.container';
import '../../../dialogs/add-plant-dialog';
import '../../../dialogs/add-plants-dialog';
import '../../../dialogs/clone-dialog';
import '../../../dialogs/config-dialog';
import '../../../dialogs/crop-steering-dialog';
import '../../../dialogs/ec-ramp-editor-dialog';
import '../../../dialogs/grow-master-dialog';
import '../../../dialogs/grow-report-dialog';
import '../../../dialogs/harvest-scoring-dialog';
import '../../../dialogs/irrigation-dialog';
import '../../../dialogs/logbook-dialog';
import '../../../dialogs/nutrient-dialog';
import '../../../dialogs/plant-overview-dialog';
import '../../../dialogs/print-label-dialog';
import '../../../dialogs/snapshots-dialog';
import '../../../dialogs/strain-library-dialog';
import '../../../dialogs/strain-recommendation-dialog';
import '../../../dialogs/training-dialog';
import '../../../components/error-boundary';

import '../components/growspace-ipm-dialog-ui';
import '../components/growspace-watering-dialog-ui';
import '../components/growspace-nutrient-inventory-dialog-ui';
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
    nutrientPresets: Record<string, NutrientPreset>;
    ipmPresets: Record<string, IPMPreset>;
    nutrientInventory: NutrientInventory | null;
  }>;
  private _controllersInitialized = false;
  private _dataChangeTimeout?: any;

  // Genetics state
  @state() private _seedBatches: Record<string, SeedBatch> = {};
  @state() private _pollinationEvents: Record<string, PollinationEvent> = {};
  private _geneticsLoaded = false;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._initControllers();
    }
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('store')) {
      this._initControllers();
    }
  }

  private _initControllers(): void {
    if (!this.store) return;

    // Always create a new controller if the store changes
    this._dialogHostController = new StoreController(this, this.store.$dialogHostState);
    this._controllersInitialized = true;
  }

  render() {
    if (!this.store || !this._controllersInitialized) return html``;
    const { store } = this;

    const {
      activeDialog: active,
      devices,
      selectedDevice: selectedDeviceId,
      strainLibrary,
      nutrientPresets,
      ipmPresets,
      nutrientInventory,
    } = this._dialogHostController.value;

    console.log('[DialogHost] Rendering with active type:', active.type);
    if (active.type === 'NONE') return html``;
    const selectedDeviceData = devices.find((d) => d.deviceId === selectedDeviceId);

    // Prepare options for select dropdowns if needed
    const growspaceOptions: Record<string, string> = {};
    devices.forEach((d) => {
      growspaceOptions[d.deviceId] = d.name;
    });

    // Resolve context-specific device data (from payload or global selection)
    const payloadGrowspaceId = (active.payload as { growspaceId?: string })?.growspaceId;
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
            return this._renderWateringDialog(active, nutrientPresets, nutrientInventory, effectiveDeviceData);
          case 'NUTRIENT_PRESETS':
            return this._renderNutrientPresetsDialog(active, effectiveDeviceData);
          case 'TRAINING':
            return this._renderTrainingDialog(active, effectiveDeviceData);
          case 'TAKE_CLONE':
            return this._renderCloneDialog(active, growspaceOptions, effectiveDeviceData);
          case 'IPM':
            return this._renderIPMDialog(active, ipmPresets, effectiveDeviceData);
          case 'NUTRIENT_INVENTORY':
            return this._renderNutrientInventoryDialog(active, nutrientInventory, effectiveDeviceData);
          case 'NUTRIENTS':
            return this._renderNutrientDialog(active, effectiveDeviceData);
          case 'PRINT_LABEL':
            return this._renderPrintLabelDialog(active, effectiveDeviceData);
          case 'HARVEST_SCORING':
            return this._renderHarvestScoringDialog(active);
          case 'SNAPSHOTS':
            return this._renderSnapshotsDialog(active, effectiveDeviceData);
          case 'CROP_STEERING':
            return this._renderCropSteeringDialog(active, effectiveDeviceData);
          case 'EC_RAMP_EDITOR':
            return this._renderECRampEditorDialog(active, effectiveDeviceData);
          case 'GROW_REPORT':
            return this._renderGrowReportDialog(active, effectiveDeviceData);
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
    const { store } = this;
    if (!store) return;
    try {
      const data = await store.dataService.fetchGeneticsData();
      if (data) {
        this._seedBatches = data.seed_batches;
        this._pollinationEvents = data.pollination_events;
      }
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
        @close=${() => this._closeDialogIfActive('ADD_PLANT')}
        @add-plant-submit=${(e: CustomEvent) => store.confirmAddPlant(e.detail)}
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
    try {
      // Update plant position and growspace
      await this.hass.callService('growspace_manager', 'update_plant', {
        plant_id: detail.plant_id,
        row: detail.new_row,
        col: detail.new_col,
        growspace_id: detail.target_growspace_id,
        veg_start: detail.veg_start,
      });

      this.store?.ui.showToast('Plant transplanted successfully!', 'success');
      this.store?.ui.closeDialog();

      // Refresh data after a small delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.store?.refreshData();
    } catch (e: any) {
      console.error('[DialogHost] Transplant failed:', e);
      this.store?.ui.showToast(`Error: ${e.message || e}`, 'error');
    }
  }

  private _handleOpenStrainEditor(e: CustomEvent) {
    const { strain, phenotype } = e.detail;
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

    this.store?.ui.setActiveDialog({
      type: 'STRAIN_LIBRARY',
      payload: {
        view: 'editor',
        editingStrain: strainEntry
      },
    });
  }

  protected _handleStrainCreatedAtSource(e: CustomEvent) {
    this.store?.ui.setActiveDialog({
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
        @close=${() => this._closeDialogIfActive('ADD_PLANTS')}
        @show-toast=${(e: CustomEvent) => this.store?.showToast(e.detail.message, e.detail.type)}
        @add-plants-submit=${(e: CustomEvent) => this.store?.confirmAddPlants(e.detail)}
        @create-new-strain=${(e: CustomEvent) => this._handleStrainCreatedAtSource(e)}
        @data-changed=${() => this._handleDataChanged()}
      ></add-plants-dialog>
    `;
  }

  private _renderPlantOverviewDialog(
    active: ActiveDialogState,
    growspaceOptions: Record<string, string>,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'PLANT_OVERVIEW') return html``;
    const dialogState = active.payload;

    // Phase 3: Feature flag to toggle between old and new dialog
    const useNewDialog = FEATURE_FLAGS.USE_NEW_DIALOGS;

    if (useNewDialog) {
      // New refactored dialog with ViewModel pattern
      return html`
        <plant-overview-container
          .open=${true}
          .plant=${dialogState.plant}
          .editedAttributes=${dialogState.editedAttributes}
          @close=${() => this._closeDialogIfActive('PLANT_OVERVIEW')}
          @update-plant=${(e: CustomEvent) =>
          this.store?.updatePlantFromDialog({
            plant: dialogState.plant,
            editedAttributes: e.detail,
            selectedPlantIds: dialogState.selectedPlantIds,
          })}
          @delete-plant=${(e: CustomEvent) => this.store?.handleDeletePlant(e.detail.plantId)}
          @harvest-plant=${(e: CustomEvent) => {
          const plant = e.detail.plant;
          this.store?.ui.setActiveDialog({
            type: 'HARVEST_SCORING',
            payload: { plant },
          });
        }}
          @finish-drying=${(e: CustomEvent) => this.store?.finishDryingPlant(e.detail.plant)}
          @take-clone=${(e: CustomEvent) =>
          this.store?.handleTakeClone(e.detail.plant, e.detail.numClones)}
          @move-clone=${(e: CustomEvent) =>
          this.store?.movePlantToGrowspace(e.detail.plant, e.detail.targetGrowspace)}
          @open-watering=${(e: CustomEvent) =>
          this.store?.ui.setActiveDialog({
            type: 'WATERING',
            payload: e.detail,
          })}
          @open-training=${(e: CustomEvent) => {
          this.store?.openTrainingDialog(e.detail.plantIds, e.detail.growspaceId);
        }}
          @open-ipm=${(e: CustomEvent) =>
          this.store?.ui.setActiveDialog({
            type: 'IPM',
            payload: e.detail,
          })}
          @open-clone=${(e: CustomEvent) =>
          this.store?.ui.setActiveDialog({
            type: 'TAKE_CLONE',
            payload: e.detail,
          })}
          @open-strain-editor=${(e: CustomEvent) => this._handleOpenStrainEditor(e)}
        ></plant-overview-container>
      `;
    }

    // Old dialog implementation
    return html`
      <plant-overview-dialog
        .open=${true}
        .plant=${dialogState.plant}
        .editedAttributes=${dialogState.editedAttributes}
        .activeTab=${dialogState.activeTab}
        .selectedPlantIds=${dialogState.selectedPlantIds}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this._closeDialogIfActive('PLANT_OVERVIEW')}
        @update-plant=${(e: CustomEvent) =>
        this.store?.updatePlantFromDialog({
          plant: dialogState.plant,
          editedAttributes: e.detail,
          selectedPlantIds: dialogState.selectedPlantIds,
        })}
        @delete-plant=${(e: CustomEvent) => this.store?.handleDeletePlant(e.detail.plantId)}
        @harvest-plant=${(e: CustomEvent) => {
        const plant = e.detail.plant;
        this.store?.ui.setActiveDialog({
          type: 'HARVEST_SCORING',
          payload: { plant },
        });
      }}
        @finish-drying=${(e: CustomEvent) => this.store?.finishDryingPlant(e.detail.plant)}
        @take-clone=${(e: CustomEvent) =>
        this.store?.handleTakeClone(e.detail.plant, e.detail.numClones)}
        @move-clone=${(e: CustomEvent) =>
        this.store?.movePlantToGrowspace(e.detail.plant, e.detail.targetGrowspace)}
        @open-watering=${(e: CustomEvent) =>
        this.store?.ui.setActiveDialog({
          type: 'WATERING',
          payload: e.detail,
        })}
        @open-training=${(e: CustomEvent) => {
        if (!this.store) return;
        this.store.openTrainingDialog(e.detail.plantIds, e.detail.growspaceId);
      }}
        @open-ipm=${(e: CustomEvent) =>
        this.store?.ui.setActiveDialog({
          type: 'IPM',
          payload: e.detail,
        })}
        @open-clone=${(e: CustomEvent) =>
        this.store?.ui.setActiveDialog({
          type: 'TAKE_CLONE',
          payload: e.detail,
        })}
        @open-strain-editor=${(e: CustomEvent) => this._handleOpenStrainEditor(e)}
        @print-label=${(e: CustomEvent<{ plant: PlantEntity }>) => {
        const { plant } = e.detail;
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
        this.store?.ui.setActiveDialog({
          type: 'PRINT_LABEL',
          payload: {
            plantId,
          },
        });
      }}
        @open-log-pollination=${() => {
        if (this.store) openStrainLibraryDialog(this.store.context, 'seeds');
      }}
      ></plant-overview-dialog>
    `;
  }

  private _renderStrainLibraryDialog(
    active: ActiveDialogState,
    strainLibrary: StrainEntry[],
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'STRAIN_LIBRARY') return html``;
    const payload = active.payload as Record<string, unknown>;

    // Lazily load genetics data on first open
    if (!this._geneticsLoaded) {
      this._geneticsLoaded = true;
      this._refreshGeneticsData();
    }

    return html`
      <strain-library-dialog
        .open=${true}
        .strains=${strainLibrary}
        .editingStrain=${payload?.editingStrain}
        .source=${payload?.source}
        .returnPayload=${payload?.returnPayload}
        .seedBatches=${Object.values(this._seedBatches)}
        .pollinationEvents=${Object.values(this._pollinationEvents)}
        .plants=${this._dialogHostController.value.devices ?? []}
        .initialTab=${(active.payload as StrainLibraryDialogState).initialTab ?? 'strains'}
        .onSeedDataChanged=${() => this._refreshGeneticsData()}
        .onAddSeedBatch=${(data: Parameters<typeof this.store.dataService.addSeedBatch>[0]) => this.store?.dataService.addSeedBatch(data)}
        .onUpdateSeedBatch=${(data: Parameters<typeof this.store.dataService.updateSeedBatch>[0]) => this.store?.dataService.updateSeedBatch(data)}
        .onLogPollination=${(data: Parameters<typeof this.store.dataService.logPollination>[0]) => this.store?.dataService.logPollination(data)}
        .onHarvestSeeds=${(data: Parameters<typeof this.store.dataService.harvestSeeds>[0]) => this.store?.dataService.harvestSeeds(data)}
        .onUpdatePollination=${(data: Parameters<typeof this.store.dataService.updatePollination>[0]) => this.store?.dataService.updatePollination(data)}
        .onDeletePollination=${(event_id: string) => this.store?.dataService.deletePollination(event_id)}
        @close=${() => this._closeDialogIfActive('STRAIN_LIBRARY')}
        @strain-created-at-source=${(e: CustomEvent) => {
        const { strain, source, returnPayload } = e.detail;
        if (source === 'add-plant') {
          this.store?.ui.setActiveDialog({
            type: 'ADD_PLANT',
            payload: {
              ...returnPayload,
              strain: strain.strain,
              phenotype: strain.phenotype,
            },
          });
        } else if (source === 'add-plants') {
          this.store?.ui.setActiveDialog({
            type: 'ADD_PLANTS',
            payload: {
              ...returnPayload,
              strain: strain.strain,
              phenotype: strain.phenotype,
            },
          });
        }
      }}
        @save-strain=${async (e: CustomEvent) => {
        if (!this.store) return;
        try {
          await this.store.updateStrain(e.detail);
          await this._handleDataChanged();
          this.store.ui.closeDialog();
        } catch (e: any) {
          console.error('[DialogHost] Save strain failed:', e);
          this.store?.ui.showToast(`Error: ${e.message || e}`, 'error');
        }
      }}
        @delete-strain=${(e: CustomEvent) => this.store?.removeStrain(e.detail.key)}
        @update-breeder=${(e: CustomEvent) => this._handleUpdateBreeder(e.detail)}
        @save-breeder=${(e: CustomEvent) => this._handleSaveBreeder(e.detail)}
        @delete-breeder=${(e: CustomEvent) => this._handleDeleteBreeder(e.detail)}
        @import-library=${(e: CustomEvent) => this._performImport(e.detail.file, e.detail.replace)}
        @export-library=${() => this.store?.handleExportLibrary()}
        @get-recommendation=${() => this.store?.openStrainRecommendationDialog()}
        @open-print-label=${(e: CustomEvent) => {
        this.store?.ui.setActiveDialog({
          type: 'PRINT_LABEL',
          payload: e.detail,
        });
      }}
        @data-changed=${() => this._handleDataChanged()}
      ></strain-library-dialog>
    `;
  }

  private async _performImport(file: File, replace: boolean) {
    if (!file) return;
    try {
      await this.store?.performImport(file, replace);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      console.error('Import failed:', err);
      this.store?.showToast(`Import failed: ${errorMessage}`, 'error');
    }
  }

  private async _handleUpdateBreeder(detail: { oldName: string; newName: string; logo?: string }) {
    try {
      await this.store?.dataService.strainAPI.updateBreeder(
        detail.oldName,
        detail.newName,
        detail.logo
      );
      this.store?.showToast('Breeder updated successfully!', 'success');
      await this.store?.refreshData();
      await this.store?.fetchStrainLibrary(true);
    } catch (err) {
      console.error('[DialogHost] Update breeder failed:', err);
      this.store?.showToast('Failed to update breeder', 'error');
    }
  }

  private async _handleSaveBreeder(_detail: { name: string; logo?: string }) {
    // Breeders are derived from strains — there is no standalone breeder concept in the backend.
    // The "save-breeder" event cannot persist without at least one strain using the breeder name.
    this.store?.showToast(
      'Breeders are created automatically when you save a strain with breeder info.',
      'info'
    );
  }

  private async _handleDeleteBreeder(detail: { name: string }) {
    try {
      await this.store?.dataService.strainAPI.deleteBreeder(detail.name);
      this.store?.showToast('Breeder deleted successfully!', 'success');
      await this.store?.refreshData();
      await this.store?.fetchStrainLibrary(true);
    } catch (err) {
      console.error('[DialogHost] Delete breeder failed:', err);
      this.store?.showToast('Failed to delete breeder', 'error');
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
        @submit=${async (e: CustomEvent) => {
        if (!this.store) return;
        try {
          await this.store.handleAddGrowspace(e.detail);
          this.store.ui.closeDialog();
          await this._handleDataChanged();
          this.store.ui.showToast('Growspace added', 'success');
        } catch (err: any) {
          this.store.ui.showToast(`Failed: ${err.message || err}`, 'error');
        }
      }}
        @edit-growspace-submit=${(e: CustomEvent) => {
        if (!this.store) return;
        this.store.handleUpdateGrowspace({
          growspace_id: e.detail.growspaceId,
          name: e.detail.name,
          rows: e.detail.rows,
          plantsPerRow: e.detail.plantsPerRow,
        });
      }}
        @delete-growspace-submit=${(e: CustomEvent) => this.store?.handleRemoveGrowspace(e.detail.growspace_id)}
        @remove-environment-submit=${(e: CustomEvent) => this.store?.handleRemoveEnvironment(e.detail.growspace_id)}
        @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
        @vision-checkup-config-submit=${(e: CustomEvent) => this._handleVisionCheckupConfig(e.detail as VisionCheckupConfigEventDetail)}
        @generate-grow-report=${(e: CustomEvent) => this.store?.ui.setActiveDialog({
        type: 'GROW_REPORT',
        payload: { growspaceId: e.detail.growspace_id }
      })}
      ></config-dialog>
    `;
  }

  private async _handleEnvironmentConfig(detail: EnvironmentConfigEventDetail) {
    const {
      selectedGrowspaceId,
      temperatureSensor,
      humiditySensor,
      vpdSensor,
      co2Sensor,
      circulationFanEntity,
      stressThreshold,
      moldThreshold,
      lightSensor,
      exhaustEntity,
      humidifierEntity,
      dehumidifierEntity,
      dehumidifierThresholds,
      soilMoistureSensor,
      dehumidifierControlEnabled,
    } = detail;

    if (!selectedGrowspaceId || !temperatureSensor || !humiditySensor) {
      this.store?.showToast('Growspace, Temperature, and Humidity sensors are mandatory', 'error');
      return;
    }

    try {
      await this.store?.dataService.configureEnvironment({
        growspaceId: selectedGrowspaceId,
        temperatureSensor,
        humiditySensor,
        vpdSensor: vpdSensor || undefined,
        co2Sensor: co2Sensor || undefined,
        circulationFanEntity: circulationFanEntity || undefined,
        stressThreshold,
        moldThreshold,
        lightSensor: lightSensor || undefined,
        exhaustEntity: exhaustEntity || undefined,
        humidifierEntity: humidifierEntity || undefined,
        dehumidifierEntity: dehumidifierEntity || undefined,
        dehumidifierThresholds,
        soilMoistureSensor: soilMoistureSensor || undefined,
        controlDehumidifier: dehumidifierControlEnabled,
        // Multi-device fields
        circulationFanEntities: detail.circulationFanEntities,
        lightSensors: detail.lightSensors,
        exhaustFanEntities: detail.exhaustFanEntities,
        humidifierEntities: detail.humidifierEntities,
        dehumidifierEntities: detail.dehumidifierEntities,
        sensorGroups: detail.sensorGroups,
        sensorCoordinates: detail.sensorCoordinates,
        irrigationTanks: detail.irrigationTanks,
      });
      this.store?.showToast('Environment configured successfully!', 'success');
      await this.store?.refreshData();
      this.store?.ui.closeDialog();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Configuration failed';
      this.store?.showToast(`Error: ${errorMessage}`, 'error');
    }
  }

  private async _handleVisionCheckupConfig(detail: VisionCheckupConfigEventDetail) {
    try {
      await this.store?.dataService.updateVisionCheckupConfig(
        detail.growspaceId,
        detail.visionCheckupConfig
      );
      this.store?.showToast('Vision checkup config saved', 'success');
      await this.store?.refreshData();
      this.store?.ui.closeDialog();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      this.store?.showToast(`Error: ${msg}`, 'error');
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
        .isStressed=${isStressed}
        .personality=${personality}
        .isLoading=${dialogState.isLoading}
        .response=${dialogState.response}
        @close=${() => this._closeDialogIfActive('GROW_MASTER')}
        @analyze-growspace=${(e: CustomEvent) => this.store?.analyzeGrowspace(e.detail.query, false)}
        @analyze-all-growspaces=${(e: CustomEvent) =>
        this.store?.analyzeGrowspace(e.detail.query, true)}
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
        this.store?.getStrainRecommendation(e.detail.query)}
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
    nutrientPresets: Record<string, NutrientPreset>,
    nutrientInventory: NutrientInventory | null,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'WATERING') return html``;
    const payload = active.payload as any;

    return html`
      <growspace-watering-dialog-ui
        .open=${true}
        .plantIds=${payload?.plantIds || []}
        .growspaceId=${selectedDeviceData?.deviceId || ''}
        .nutrientPresets=${nutrientPresets}
        .nutrientInventory=${nutrientInventory}
        @close=${() => this._closeDialogIfActive('WATERING')}
        @submit-watering=${(e: CustomEvent) => {
        if (payload?.mode === 'growspace') {
          this.store?.waterGrowspace(
            selectedDeviceData?.deviceId || '',
            e.detail.amount,
            e.detail.nutrients,
            e.detail.presetId
          );
        } else {
          (payload?.plantIds || []).forEach((pid: string) =>
            this.store?.waterPlant(pid, e.detail.amount, e.detail.nutrients, e.detail.presetId)
          );
        }
      }}
        @save-preset=${(e: CustomEvent) => this.store?.addNutrientPreset(e.detail)}
        @update-stock=${(e: CustomEvent) =>
        this.store?.updateNutrientStock(
          e.detail.id,
          e.detail.name,
          e.detail.current_ml,
          e.detail.initial_ml
        )}
        @data-changed=${() => this._handleDataChanged()}
      ></growspace-watering-dialog-ui>
    `;
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
    return html`
      <growspace-ipm-dialog-ui
        .open=${true}
        .growspaceId=${effectiveDeviceData?.deviceId || ''}
        .plantIds=${payload?.selectedPlantIds || []}
        .presets=${ipmPresets}
        @close=${() => this._closeDialogIfActive('IPM')}
        @apply-ipm=${async (e: CustomEvent) => {
        await this.store?.applyIPM({
          preset_id: e.detail.presetId,
          notes: e.detail.notes,
          growspace_id: effectiveDeviceData?.deviceId,
          plant_ids: payload?.selectedPlantIds,
        });
        this._handleDataChanged();
      }}
      ></growspace-ipm-dialog-ui>
    `;
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
        this.store?.updateNutrientStock(
          e.detail.id,
          e.detail.name,
          e.detail.current_ml,
          e.detail.initial_ml
        )}
        @add-stock=${(e: CustomEvent) =>
        this.store?.updateNutrientStock(
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
          await this.store?.handleTakeClone(
            dialogState.sourcePlant,
            numClones,
            targetGrowspaceId
          );
          await this._handleDataChanged();
          this.store?.showToast(
            `Taking ${numClones} clone${numClones > 1 ? 's' : ''}...`,
            'success'
          );
        } catch (e: any) {
          console.error('[DialogHost] Transplant failed:', e);
          this.store?.showToast(`Error: ${e.message || e}`, 'error');
        }
      }}
        @close=${() => this._closeDialogIfActive('TAKE_CLONE')}
        @data-changed=${() => this._handleDataChanged()}
      ></clone-dialog>
    `;
  }

  private _renderNutrientDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'NUTRIENTS') return html``;
    return html`
      <nutrient-dialog
        .open=${true}
        @close=${() => this._closeDialogIfActive('NUTRIENTS')}
        @data-changed=${() => this._handleDataChanged()}
      ></nutrient-dialog>
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

  private _renderECRampEditorDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'EC_RAMP_EDITOR') return html``;
    return html`
      <ec-ramp-editor-dialog
        .open=${true}
        .dialogState=${active.payload}
        .growspaceName=${selectedDeviceData?.name || ''}
        @close=${() => this._closeDialogIfActive('EC_RAMP_EDITOR')}
        @strain-created-at-source=${(e: CustomEvent) => this._handleStrainCreatedAtSource(e)}
        @data-changed=${() => this._handleDataChanged()}
      ></ec-ramp-editor-dialog>
    `;
  }

  private _renderGrowReportDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'GROW_REPORT') return html``;
    return html`
      <grow-report-dialog
        .open=${true}
        .store=${this.store}
        .state=${active.payload}
        @close=${() => this._closeDialogIfActive('GROW_REPORT')}
        @data-changed=${() => this._handleDataChanged()}
      ></grow-report-dialog>
      `;
  }

  private _renderEnvironmentConfigDialog(active: ActiveDialogState): TemplateResult {
    if (active.type !== 'ENVIRONMENT_CONFIG') return html``;
    return html`
      <growspace-environment-config-dialog
        .open=${true}
        .deviceId=${active.payload?.deviceId}
        @close=${() => this.store?.ui.closeDialog()}
        @save-config=${(e: CustomEvent) => this._handleEnvironmentConfigSubmit(e)}
      ></growspace-environment-config-dialog>
    `;
  }

  private async _handleEnvironmentConfigSubmit(e: CustomEvent) {
    try {
      await this.store?.dataService.configureEnvironment(e.detail);
      this.store?.showToast('Environment configured!', 'success');
      this.store?.ui.closeDialog();
      await this.store?.refreshData();
    } catch (err: any) {
      this.store?.showToast(`Failed to configure environment: ${err.message}`, 'error');
    }
  }

  private _handleDataChanged() {
    if (this._dataChangeTimeout) clearTimeout(this._dataChangeTimeout);
    this._dataChangeTimeout = window.setTimeout(() => this.store?.refreshData(), 500);
  }
}
