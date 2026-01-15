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
import '../../dialogs/add-plants-dialog';
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
import './ipm-dialog';
import '../../dialogs/nutrient-inventory-dialog';
import '../../dialogs/nutrient-dialog';

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
        const selectedDeviceData = devices.find((d) => d.device_id === selectedDeviceId);

        // Prepare options for select dropdowns if needed
        const growspaceOptions: Record<string, string> = {};
        devices.forEach((d) => {
            growspaceOptions[d.device_id] = d.name;
        });

        switch (active.type) {
            case 'ADD_PLANT':
                return this._renderAddPlantDialog(active, strainLibrary, selectedDeviceData);
            case 'ADD_PLANTS':
                return this._renderAddPlantsDialog(active, strainLibrary, selectedDeviceData);
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
            case 'IPM':
                return this._renderIPMDialog(active, selectedDeviceData);
            case 'NUTRIENT_INVENTORY':
                return this._renderNutrientInventoryDialog(active);
            case 'NUTRIENTS':
                return this._renderNutrientDialog(active);
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
            @close=${() => this.store.ui.closeDialog()}
            @add-plants-submit=${(e: CustomEvent) => this.store.confirmAddPlants(e.detail)}
        ></add-plants-dialog>
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
            @close=${() => {
                if (this._activeDialogController.value.type === 'PLANT_OVERVIEW') {
                    this.store.ui.closeDialog();
                }
            }}
            @update-plant=${(e: CustomEvent) =>
                this.store.updatePlantFromDialog({
                    plant: dialogState.plant,
                    editedAttributes: e.detail, // Event detail is the attributes object
                    selectedPlantIds: dialogState.selectedPlantIds
                })}
            @delete-plant=${(e: CustomEvent) =>
                this.store.actions.plant.delete(e.detail.plantId)}
            @harvest-plant=${(e: CustomEvent) => this.store.actions.plant.nextStage(e.detail.plant)}
            @finish-drying=${(e: CustomEvent) => this.store.finishDryingPlant(e.detail.plant)}
            @take-clone=${(e: CustomEvent) =>
                this.store.actions.plant.takeClone(e.detail.plant, e.detail.numClones)}
            @move-clone=${(e: CustomEvent) =>
                this.store.actions.plant.move(e.detail.plant, e.detail.targetGrowspace)}
            @open-watering=${(e: CustomEvent) =>
                this.store.ui.setActiveDialog({
                    type: 'WATERING',
                    payload: e.detail
                })}
            @open-training=${(e: CustomEvent) =>
                this.store.ui.setActiveDialog({
                    type: 'TRAINING',
                    payload: e.detail
                })}
            @open-ipm=${(e: CustomEvent) =>
                this.store.ui.setActiveDialog({
                    type: 'IPM',
                    payload: e.detail
                })}
            @open-strain-editor=${(e: CustomEvent) => {
                const { strain, phenotype } = e.detail;
                const strainLibrary = this.store.data.$strainLibrary.get();

                // Normalize empty strings, null, and undefined to compare properly
                const normalizedPhenotype = phenotype || '';
                let strainEntry = strainLibrary.find(s => {
                    const entryPhenotype = s.phenotype || '';
                    return s.strain === strain && entryPhenotype === normalizedPhenotype;
                });

                // If no match found, create a new entry for the user to complete
                if (!strainEntry && strain) {
                    const key = normalizedPhenotype
                        ? `${strain}_${normalizedPhenotype}`
                        : strain;
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
                    payload: { editingStrain: strainEntry }
                });
            }}
        ></plant-overview-dialog>
        `;
    }


    private _renderStrainLibraryDialog(
        active: ActiveDialogState,
        strainLibrary: StrainEntry[]
    ): TemplateResult {
        if (active.type !== 'STRAIN_LIBRARY') return html``;
        const payload = active.payload as any;
        return html`
        <strain-library-dialog
            .open=${true}
            .strains=${strainLibrary}
            .editingStrain=${payload?.editingStrain}
            @close=${() => {
                // Only close if we're still on STRAIN_LIBRARY to prevent closing the new dialog
                if (this._activeDialogController.value.type === 'STRAIN_LIBRARY') {
                    this.store.ui.closeDialog();
                }
            }}
            @save-strain=${(e: CustomEvent) => this.store.actions.strain.add(e.detail)}
            @delete-strain=${(e: CustomEvent) => this.store.actions.strain.remove(e.detail.key)}
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
            @add-growspace-submit=${(e: CustomEvent) => this.store.actions.growspace.add(e.detail)}
            @edit-growspace-submit=${(e: CustomEvent) => this.store.actions.growspace.update(e.detail)}
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
            .isLoading = ${dialogState.isLoading}
            .response = ${dialogState.response}
@close=${() => this.store.ui.closeDialog()}
@get-recommendation=${(e: CustomEvent) =>
                this.store.getStrainRecommendation(e.detail.query)
            }
        > </strain-recommendation-dialog>
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
            .device = ${selectedDeviceData}
            .growspaceName = ${selectedDeviceData?.name || ''}
@close=${() => this.store.ui.closeDialog()}
@closed=${() => this.store.ui.closeDialog()}
@data-changed=${() => this.store.refreshData()}
        > </irrigation-dialog>
    `;
    }

    private _renderLogbookDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'LOGBOOK') return html``;
        const dialogState = active.payload;
        return html`
    <logbook-dialog
        .open=${true}
            .growspaceId = ${dialogState.growspaceId}
@close=${() => this.store.ui.closeDialog()}
        > </logbook-dialog>
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
            .dialogState = ${dialogState}
            .growspaceName = ${selectedDeviceData?.name || ''}
@close=${() => this.store.ui.closeDialog()}
@data-changed=${() => this.store.refreshData()}
        > </watering-dialog>
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
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this.store.refreshData()}
    ></nutrient-presets-editor>
    `;
    }

    private _renderTrainingDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'TRAINING') return html``;
        return html`
    <training-dialog
        .open=${true}
            .store = ${this.store}
@close=${() => this.store.ui.closeDialog()}
        > </training-dialog>
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
        .growspaceId=${dialogState.growspaceId}
        .plantIds=${dialogState.plantIds || []}
        @close=${() => this.store.ui.closeDialog()}
        @data-changed=${() => this.store.refreshData()}
    ></ipm-dialog>
    `;
    }

    private _renderNutrientInventoryDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'NUTRIENT_INVENTORY') return html``;
        return html`
            <nutrient-inventory-dialog
                .open=${true}
                @close=${() => this.store.ui.closeDialog()}
                @data-changed=${() => this.store.refreshData()}
            ></nutrient-inventory-dialog>
        `;
    }

    private _renderNutrientDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'NUTRIENTS') return html``;
        return html`
            <nutrient-dialog
                .open=${true}
                @close=${() => this.store.ui.closeDialog()}
                @data-changed=${() => this.store.refreshData()}
            ></nutrient-dialog>
        `;
    }
}

