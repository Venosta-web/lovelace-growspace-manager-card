import { LitElement, html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext, storeContext, strainLibraryContext } from '../../context';
import { GrowspaceStore } from '../../store/core/growspace-store';
import { FEATURE_FLAGS } from '../../features/shared/config/feature-flags';
// Global store imports removed
import { StoreController } from '@nanostores/lit';
import { ActiveDialogState } from '../../ui-state';
import {
  GrowspaceDevice,
  PlantEntity,
  StrainEntry,
  EnvironmentConfigEventDetail,
} from '../../types';

import '../../dialogs/add-plant-dialog';
import '../../dialogs/add-plants-dialog';
import '../../dialogs/plant-overview-dialog';
import '../../features/plants/containers/plant-overview.container'; // Phase 3: New dialog
import '../../dialogs/strain-library-dialog';
import '../../dialogs/config-dialog';
import '../../dialogs/grow-master-dialog';
import '../../dialogs/strain-recommendation-dialog';
import '../../dialogs/irrigation-dialog';
import '../../dialogs/logbook-dialog';
import '../../dialogs/watering-dialog';
import '../../dialogs/training-dialog';
import '../../dialogs/clone-dialog';
import './nutrient-presets-editor';
import './ipm-dialog';
import '../../dialogs/nutrient-inventory-dialog';
import '../../dialogs/nutrient-dialog';
import '../../dialogs/print-label-dialog';
import '../error-boundary';

import { HomeAssistant } from 'custom-card-helpers';

@customElement('growspace-dialog-host')
export class DialogHost extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  store!: GrowspaceStore;

  // Controllers
  private _activeDialogController!: StoreController<ActiveDialogState>;
  private _devicesController!: StoreController<GrowspaceDevice[]>;
  private _selectedDeviceController!: StoreController<string | null>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._activeDialogController = new StoreController(this, this.store.ui.$activeDialog);
      this._devicesController = new StoreController(this, this.store.data.$devices);
      this._selectedDeviceController = new StoreController(this, this.store.data.$selectedDevice);
    }
  }

  @consume({ context: strainLibraryContext, subscribe: true })
  strainLibrary: StrainEntry[] = [];

  render() {
    if (!this.store) return html``;

    const active = this._activeDialogController.value;
    const devices = this._devicesController.value;
    const selectedDeviceId = this._selectedDeviceController.value;

    console.log('[DialogHost] Rendering with active type:', active.type);
    if (active.type === 'NONE') return html``;

    const strainLibrary = this.strainLibrary || [];
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
          case 'WATERING':
            return this._renderWateringDialog(active, effectiveDeviceData);
          case 'NUTRIENT_PRESETS':
            return this._renderNutrientPresetsDialog(active, effectiveDeviceData);
          case 'TRAINING':
            return this._renderTrainingDialog(active, effectiveDeviceData);
          case 'TAKE_CLONE':
            return this._renderCloneDialog(active, growspaceOptions, effectiveDeviceData);
          case 'IPM':
            return this._renderIPMDialog(active, effectiveDeviceData);
          case 'NUTRIENT_INVENTORY':
            return this._renderNutrientInventoryDialog(active, effectiveDeviceData);
          case 'NUTRIENTS':
            return this._renderNutrientDialog(active, effectiveDeviceData);
          case 'PRINT_LABEL':
            return this._renderPrintLabelDialog(active, effectiveDeviceData);
          default:
            return html``;
        }
      })()}
      </error-boundary>
    `;
  }

  private async _handleDataChanged() {
    // Add a small delay to ensure backend has persisted changes
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.store.refreshData();
  }

  private _renderAddPlantDialog(
    active: ActiveDialogState,
    strainLibrary: StrainEntry[],
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'ADD_PLANT') return html``;
    const dialogState = active.payload;

    // Get all clone and seedling plants from all growspaces
    const devices = this._devicesController.value;
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
        @close=${() => {
        if (this._activeDialogController.value.type === 'ADD_PLANT') {
          this.store.ui.closeDialog();
        }
      }}
        @add-plant-submit=${(e: CustomEvent) => this.store.confirmAddPlant(e.detail)}
        @transplant-plant-submit=${(e: CustomEvent) => this._handleTransplant(e.detail)}
        @create-new-strain=${(e: CustomEvent) => {
        this.store.ui.setActiveDialog({
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
      }}
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

      this.store.ui.showToast('Plant transplanted successfully', 'success');
      this.store.ui.closeDialog();

      // Refresh data after a small delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.store.refreshData();
    } catch (e) {
      console.error('[DialogHost] Transplant failed:', e);
      this.store.ui.showToast('Failed to transplant plant', 'error');
    }
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
        @close=${() => {
        if (this._activeDialogController.value.type === 'ADD_PLANTS') {
          this.store.ui.closeDialog();
        }
      }}
        @show-toast=${(e: CustomEvent) => this.store.showToast(e.detail.message, e.detail.type)}
        @add-plants-submit=${(e: CustomEvent) => this.store.confirmAddPlants(e.detail)}
        @create-new-strain=${(e: CustomEvent) => {
        this.store.ui.setActiveDialog({
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
      }}
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
          @update-plant=${(e: CustomEvent) =>
          this.store.updatePlantFromDialog({
            plant: dialogState.plant,
            editedAttributes: e.detail,
            selectedPlantIds: dialogState.selectedPlantIds,
          })}
          @delete-plant=${(e: CustomEvent) => this.store.actions.plant.delete(e.detail.plantId)}
          @harvest-plant=${(e: CustomEvent) => this.store.actions.plant.nextStage(e.detail.plant)}
          @finish-drying=${(e: CustomEvent) => this.store.finishDryingPlant(e.detail.plant)}
          @take-clone=${(e: CustomEvent) =>
          this.store.actions.plant.takeClone(e.detail.plant, e.detail.numClones)}
          @move-clone=${(e: CustomEvent) =>
          this.store.actions.plant.move(e.detail.plant, e.detail.targetGrowspace)}
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
        @close=${() => {
        if (this._activeDialogController.value.type === 'PLANT_OVERVIEW') {
          this.store.ui.closeDialog();
        }
      }}
        @update-plant=${(e: CustomEvent) =>
        this.store.updatePlantFromDialog({
          plant: dialogState.plant,
          editedAttributes: e.detail,
          selectedPlantIds: dialogState.selectedPlantIds,
        })}
        @delete-plant=${(e: CustomEvent) => this.store.actions.plant.delete(e.detail.plantId)}
        @harvest-plant=${(e: CustomEvent) => this.store.actions.plant.nextStage(e.detail.plant)}
        @finish-drying=${(e: CustomEvent) => this.store.finishDryingPlant(e.detail.plant)}
        @take-clone=${(e: CustomEvent) =>
        this.store.actions.plant.takeClone(e.detail.plant, e.detail.numClones)}
        @move-clone=${(e: CustomEvent) =>
        this.store.actions.plant.move(e.detail.plant, e.detail.targetGrowspace)}
        @open-watering=${(e: CustomEvent) =>
        this.store.ui.setActiveDialog({
          type: 'WATERING',
          payload: e.detail,
        })}
        @open-training=${(e: CustomEvent) =>
        this.store.ui.setActiveDialog({
          type: 'TRAINING',
          payload: e.detail,
        })}
        @open-ipm=${(e: CustomEvent) =>
        this.store.ui.setActiveDialog({
          type: 'IPM',
          payload: e.detail,
        })}
        @open-clone=${(e: CustomEvent) =>
        this.store.ui.setActiveDialog({
          type: 'TAKE_CLONE',
          payload: e.detail,
        })}
        @open-strain-editor=${(e: CustomEvent) => {
        const { strain, phenotype } = e.detail;
        const strainLibrary = this.store.data.$strainLibrary.get();

        // Normalize empty strings, null, and undefined to compare properly
        const normalizedPhenotype = phenotype || '';
        let strainEntry = strainLibrary.find((s) => {
          const entryPhenotype = s.phenotype || '';
          return s.strain === strain && entryPhenotype === normalizedPhenotype;
        });

        // If no match found, create a new entry for the user to complete
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
          };
        }

        this.store.ui.setActiveDialog({
          type: 'STRAIN_LIBRARY',
          payload: { editingStrain: strainEntry },
        });
      }}
        @print-label=${(e: CustomEvent<{ plant: PlantEntity }>) => {
        const { plant } = e.detail;
        const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
        this.store.ui.setActiveDialog({
          type: 'PRINT_LABEL',
          payload: {
            plantId,
          },
        });
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
    return html`
      <strain-library-dialog
        .open=${true}
        .strains=${strainLibrary}
        .editingStrain=${payload?.editingStrain}
        .source=${payload?.source}
        .returnPayload=${payload?.returnPayload}
        @close=${() => {
        // Only close if we're still on STRAIN_LIBRARY to prevent closing the new dialog
        if (this._activeDialogController.value.type === 'STRAIN_LIBRARY') {
          this.store.ui.closeDialog();
        }
      }}
        @strain-created-at-source=${(e: CustomEvent) => {
        const { strain, source, returnPayload } = e.detail;
        if (source === 'add-plant') {
          this.store.ui.setActiveDialog({
            type: 'ADD_PLANT',
            payload: {
              ...returnPayload,
              strain: strain.strain,
              phenotype: strain.phenotype,
            },
          });
        } else if (source === 'add-plants') {
          this.store.ui.setActiveDialog({
            type: 'ADD_PLANTS',
            payload: {
              ...returnPayload,
              strain: strain.strain,
              phenotype: strain.phenotype,
            },
          });
        }
      }}
        @save-strain=${(e: CustomEvent) => this.store.actions.strain.add(e.detail)}
        @delete-strain=${(e: CustomEvent) => this.store.actions.strain.remove(e.detail.key)}
        @update-breeder=${(e: CustomEvent) => this._handleUpdateBreeder(e.detail)}
        @save-breeder=${(e: CustomEvent) => this._handleSaveBreeder(e.detail)}
        @delete-breeder=${(e: CustomEvent) => this._handleDeleteBreeder(e.detail)}
        @import-library=${(e: CustomEvent) => this._performImport(e.detail.file, e.detail.replace)}
        @export-library=${() => this.store.handleExportLibrary()}
        @get-recommendation=${() => this.store.openStrainRecommendationDialog()}
        @open-print-label=${(e: CustomEvent) => {
        this.store.ui.setActiveDialog({
          type: 'PRINT_LABEL',
          payload: e.detail,
        });
      }}
      ></strain-library-dialog>
    `;
  }

  private async _performImport(file: File, replace: boolean) {
    if (!file) return;
    try {
      await this.store.performImport(file, replace);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      console.error('Import failed:', err);
      this.store.showToast(`Import failed: ${errorMessage}`, 'error');
    }
  }

  private async _handleUpdateBreeder(detail: { oldName: string; newName: string; logo?: string }) {
    try {
      await this.store.dataService.strainAPI.updateBreeder(
        detail.oldName,
        detail.newName,
        detail.logo
      );
      this.store.showToast('Breeder updated successfully!', 'success');
      await this.store.refreshData();
    } catch (err) {
      console.error('[DialogHost] Update breeder failed:', err);
      this.store.showToast('Failed to update breeder', 'error');
    }
  }

  private async _handleSaveBreeder(detail: { name: string; logo?: string }) {
    try {
      await this.store.dataService.strainAPI.updateBreeder('', detail.name, detail.logo);
      this.store.showToast('Breeder created successfully!', 'success');
      await this.store.refreshData();
    } catch (err) {
      console.error('[DialogHost] Save breeder failed:', err);
      this.store.showToast('Failed to create breeder', 'error');
    }
  }

  private async _handleDeleteBreeder(detail: { name: string }) {
    try {
      await this.store.dataService.strainAPI.deleteBreeder(detail.name);
      this.store.showToast('Breeder deleted successfully!', 'success');
      await this.store.refreshData();
    } catch (err) {
      console.error('[DialogHost] Delete breeder failed:', err);
      this.store.showToast('Failed to delete breeder', 'error');
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
        .devices=${this._devicesController.value}
        .currentTab=${dialogState.currentTab}
        .environmentData=${dialogState.environmentData}
        .growspaceOptions=${growspaceOptions}
        @close=${() => this.store.ui.closeDialog()}
        @add-growspace-submit=${(e: CustomEvent) => this.store.actions.growspace.add(e.detail)}
        @edit-growspace-submit=${(e: CustomEvent) => this.store.actions.growspace.update(e.detail)}
        @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
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
      this.store.showToast('Growspace, Temperature, and Humidity sensors are mandatory', 'error');
      return;
    }

    try {
      await this.store.dataService.configureEnvironment({
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
      this.store.showToast('Environment configured successfully!', 'success');
      await this.store.refreshData();
      this.store.ui.closeDialog();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Configuration failed';
      this.store.showToast(`Error: ${errorMessage}`, 'error');
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
        @close=${() => this.store.ui.closeDialog()}
        @analyze-growspace=${(e: CustomEvent) => this.store.analyzeGrowspace(e.detail.query, false)}
        @analyze-all-growspaces=${(e: CustomEvent) =>
        this.store.analyzeGrowspace(e.detail.query, true)}
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
        @close=${() => this.store.ui.closeDialog()}
        @get-recommendation=${(e: CustomEvent) =>
        this.store.getStrainRecommendation(e.detail.query)}
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
        @close=${() => this.store.ui.closeDialog()}
        @closed=${() => this.store.ui.closeDialog()}
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
        @close=${() => this.store.ui.closeDialog()}
      ></logbook-dialog>
    `;
  }

  private _renderWateringDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'WATERING') return html``;
    const dialogState = active.payload;
    return html`
      <watering-dialog
        .open=${true}
        .dialogState=${dialogState}
        .growspaceName=${selectedDeviceData?.name || ''}
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this._handleDataChanged()}
      >
      </watering-dialog>
    `;
  }

  private _renderNutrientPresetsDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'NUTRIENT_PRESETS') return html``;
    return html`
      <nutrient-presets-editor
        .open=${true}
        .store=${this.store}
        .hass=${this.hass}
        .growspaceId=${selectedDeviceData?.deviceId}
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this._handleDataChanged()}
      ></nutrient-presets-editor>
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
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this._handleDataChanged()}
      >
      </training-dialog>
    `;
  }

  private _renderIPMDialog(
    active: ActiveDialogState,
    selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'IPM') return html``;
    const dialogState = active.payload;
    return html`
      <ipm-dialog
        .open=${true}
        .store=${this.store}
        .hass=${this.hass}
        .growspaceId=${dialogState.growspaceId || selectedDeviceData?.deviceId}
        .plantIds=${dialogState.plantIds || []}
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this._handleDataChanged()}
      ></ipm-dialog>
    `;
  }

  private _renderNutrientInventoryDialog(
    active: ActiveDialogState,
    _selectedDeviceData?: GrowspaceDevice
  ): TemplateResult {
    if (active.type !== 'NUTRIENT_INVENTORY') return html``;
    return html`
      <nutrient-inventory-dialog
        .open=${true}
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this._handleDataChanged()}
      ></nutrient-inventory-dialog>
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
        await this.store.actions.plant.takeClone(
          dialogState.sourcePlant,
          numClones,
          targetGrowspaceId
        );
        await this._handleDataChanged();
        this.store.showToast(
          `Taking ${numClones} clone${numClones > 1 ? 's' : ''}...`,
          'success'
        );
      }}
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
        @close=${() => this.store.ui.closeDialog()}
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
        @close=${() => this.store.ui.closeDialog()}
      ></print-label-dialog>
    `;
  }
}
