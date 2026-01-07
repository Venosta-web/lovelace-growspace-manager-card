import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext, storeContext, strainLibraryContext } from '../../context';
import { GrowspaceStore } from '../../store/growspace-store';
// Global store imports removed
import { StoreController } from '@nanostores/lit';
import { ActiveDialogState } from '../../ui-state';
import { GrowspaceDevice, PlantEntity, StrainEntry } from '../../types';

import '../../dialogs/add-plant-dialog';
import '../../dialogs/plant-overview-dialog';
import '../../dialogs/strain-library-dialog';
import '../../dialogs/config-dialog';
import '../../dialogs/grow-master-dialog';
import '../../dialogs/strain-recommendation-dialog';
import '../../dialogs/irrigation-dialog';
import '../../dialogs/logbook-dialog';
import '../../dialogs/watering-dialog';
import '../../dialogs/training-dialog';
import './nutrient-presets-editor';

import { HomeAssistant } from 'custom-card-helpers';

@customElement('growspace-dialog-host')
export class DialogHost extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    accessor hass!: HomeAssistant;

    @consume({ context: storeContext, subscribe: true })
    accessor store!: GrowspaceStore;

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
    accessor strainLibrary: StrainEntry[] = [];

    render() {
        if (!this.store) return html``;

        const active = this._activeDialogController.value;
        const devices = this._devicesController.value;
        const selectedDeviceId = this._selectedDeviceController.value;

        console.log('[DialogHost] Rendering with active type:', active.type);
        if (active.type === 'NONE') return html``;

        const strainLibrary = this.strainLibrary || [];
        const selectedDeviceData = devices.find((d) => d.device_id === selectedDeviceId);

        // Prepare options for select dropdowns if needed
        const growspaceOptions: Record<string, string> = {};
        devices.forEach((d) => {
            growspaceOptions[d.device_id] = d.name;
        });

        switch (active.type) {
            case 'ADD_PLANT':
                return this._renderAddPlantDialog(active, strainLibrary, selectedDeviceData);
            case 'PLANT_OVERVIEW':
                return this._renderPlantOverviewDialog(active, growspaceOptions);
            case 'STRAIN_LIBRARY':
                return this._renderStrainLibraryDialog(active, strainLibrary);
            case 'CONFIG':
                return this._renderConfigDialog(active, growspaceOptions);
            case 'GROW_MASTER':
                return this._renderGrowMasterDialog(active);
            case 'STRAIN_RECOMMENDATION':
                return this._renderStrainRecommendationDialog(active);
            case 'IRRIGATION':
                return this._renderIrrigationDialog(active, selectedDeviceData);
            case 'LOGBOOK':
                return this._renderLogbookDialog(active);
            case 'WATERING':
                return this._renderWateringDialog(active, selectedDeviceData);
            case 'NUTRIENT_PRESETS':
                return this._renderNutrientPresetsDialog(active, selectedDeviceData);
            case 'TRAINING':
                return this._renderTrainingDialog(active);
            default:
                return html``;
        }
    }

    private _renderAddPlantDialog(
        active: ActiveDialogState,
        strainLibrary: StrainEntry[],
        selectedDeviceData?: GrowspaceDevice
    ): TemplateResult {
        if (active.type !== 'ADD_PLANT') return html``;
        const dialogState = active.payload;
        return html`
        <add-plant-dialog
            .open=${true}
            .strainLibrary=${strainLibrary}
            .row=${dialogState?.row}
            .col=${dialogState?.col}
            .growspaceName=${selectedDeviceData?.name || ''}
            @close=${() => this.store.ui.closeDialog()}
            @add-plant-submit=${(e: CustomEvent) => this.store.confirmAddPlant(e.detail)}
        ></add-plant-dialog>
        `;
    }

    private _renderPlantOverviewDialog(
        active: ActiveDialogState,
        growspaceOptions: Record<string, string>
    ): TemplateResult {
        if (active.type !== 'PLANT_OVERVIEW') return html``;
        const dialogState = active.payload;
        return html`
        <plant-overview-dialog
            .open=${true}
            .plant=${dialogState.plant}
            .editedAttributes=${dialogState.editedAttributes}
            .activeTab=${dialogState.activeTab}
            .selectedPlantIds=${dialogState.selectedPlantIds}
            .growspaceOptions=${growspaceOptions}
            @close=${() => this.store.ui.closeDialog()}
            @update-plant=${(e: CustomEvent) =>
                this.store.updatePlantFromDialog({
                    plant: dialogState.plant,
                    editedAttributes: e.detail, // Event detail is the attributes object
                    selectedPlantIds: dialogState.selectedPlantIds
                })}
            @delete-plant=${(e: CustomEvent) =>
                this.store.handleDeletePlant(e.detail.plantId)}
            @harvest-plant=${(e: CustomEvent) => this.store.harvestPlant(e.detail.plant)}
            @finish-drying=${(e: CustomEvent) => this.store.finishDryingPlant(e.detail.plant)}
            @take-clone=${(e: CustomEvent) =>
                this.store.handleTakeClone(e.detail.plant, e.detail.numClones)}
            @move-clone=${(e: CustomEvent) =>
                this.store.movePlantToGrowspace(e.detail.plant, e.detail.targetGrowspace)}
        ></plant-overview-dialog>
        `;
    }


    private _renderStrainLibraryDialog(
        active: ActiveDialogState,
        strainLibrary: StrainEntry[]
    ): TemplateResult {
        if (active.type !== 'STRAIN_LIBRARY') return html``;
        return html`
        <strain-library-dialog
            .open=${true}
            .strains=${strainLibrary}
            @close=${() => {
                // Only close if we're still on STRAIN_LIBRARY to prevent closing the new dialog
                if (this._activeDialogController.value.type === 'STRAIN_LIBRARY') {
                    this.store.ui.closeDialog();
                }
            }}
            @save-strain=${(e: CustomEvent) => this.store.addStrain(e.detail)}
            @delete-strain=${(e: CustomEvent) => this.store.removeStrain(e.detail.key)}
            @import-library=${(e: CustomEvent) => this._performImport(e.detail.file, e.detail.replace)}
            @export-library=${() => this.store.handleExportLibrary()}
            @get-recommendation=${() => this.store.openStrainRecommendationDialog()}
        ></strain-library-dialog>
        `;
    }

    private async _performImport(file: File, replace: boolean) {
        if (!file) return;
        try {
            await this.store.performImport(file, replace);
        } catch (err: any) {
            console.error('Import failed:', err);
            this.store.showToast(`Import failed: ${err.message}`, 'error');
        }
    }

    private _renderConfigDialog(
        active: ActiveDialogState,
        growspaceOptions: Record<string, string>
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
            @add-growspace-submit=${(e: CustomEvent) => this.store.handleAddGrowspace(e.detail)}
            @edit-growspace-submit=${(e: CustomEvent) => this.store.handleUpdateGrowspace(e.detail)}
            @configure-environment-submit=${(e: CustomEvent) => this._handleEnvironmentConfig(e.detail)}
        ></config-dialog>
        `;
    }

    private async _handleEnvironmentConfig(detail: any) {
        const {
            selectedGrowspaceId,
            temp_sensor,
            humidity_sensor,
            vpd_sensor,
            co2_sensor,
            circulation_fan,
            stress_threshold,
            mold_threshold,
            light_sensor,
            exhaust_entity,
            humidifier_entity,
            dehumidifier_entity,
            dehumidifier_thresholds,
            soil_moisture_sensor,
            control_dehumidifier,
        } = detail;

        if (!selectedGrowspaceId || !temp_sensor || !humidity_sensor) {
            this.store.showToast('Growspace, Temperature, and Humidity sensors are mandatory', 'error');
            return;
        }

        try {
            await this.store.dataService.configureEnvironment({
                growspace_id: selectedGrowspaceId,
                temperature_sensor: temp_sensor,
                humidity_sensor,
                vpd_sensor: vpd_sensor || undefined,
                co2_sensor: co2_sensor || undefined,
                circulation_fan_entity: circulation_fan || undefined,
                stress_threshold,
                mold_threshold,
                light_sensor: light_sensor || undefined,
                exhaust_entity: exhaust_entity || undefined,
                humidifier_entity: humidifier_entity || undefined,
                dehumidifier_entity: dehumidifier_entity || undefined,
                dehumidifier_thresholds, // Pass thresholds if provided
                soil_moisture_sensor: soil_moisture_sensor || undefined,
                control_dehumidifier,
            });
            this.store.showToast('Environment configured successfully!', 'success');
            await this.store.refreshData();
            this.store.ui.closeDialog();
        } catch (e: any) {
            this.store.showToast(`Error: ${e.message}`, 'error');
        }
    }

    private _renderGrowMasterDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'GROW_MASTER') return html``;
        const dialogState = active.payload;

        let isStressed = false;
        let personality;
        const selectedDevice = this._selectedDeviceController.value;

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
            if (manager && manager.attributes && manager.attributes.ai_settings) {
                personality = manager.attributes.personality || manager.attributes.ai_settings.personality;
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

    private _renderStrainRecommendationDialog(active: ActiveDialogState): TemplateResult {
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
        ></strain-recommendation-dialog>
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
            @data-changed=${() => this.store.refreshData()}
        ></irrigation-dialog>
        `;
    }

    private _renderLogbookDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'LOGBOOK') return html``;
        const dialogState = active.payload;
        return html`
        <logbook-dialog
            .open=${true}
            .growspaceId=${dialogState.growspaceId}
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
            @data-changed=${() => this.store.refreshData()}
        ></watering-dialog>
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
            .hass=${this.hass}
            .dataService=${this.store.dataService}
            .presets=${selectedDeviceData?.nutrient_presets || {}}
            @data-changed=${() => this.store.refreshData()}
        ></nutrient-presets-editor>
        `;
    }

    private _renderTrainingDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'TRAINING') return html``;
        return html`
        <training-dialog
            .store=${this.store}
        ></training-dialog>
        `;
    }
}
