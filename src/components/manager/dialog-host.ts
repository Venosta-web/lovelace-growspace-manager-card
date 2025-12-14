import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext, storeContext, strainLibraryContext } from '../../context';
import { GrowspaceStore } from '../../store/growspace-store';
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

import { HomeAssistant } from 'custom-card-helpers';

@customElement('growspace-dialog-host')
export class DialogHost extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    hass!: HomeAssistant;

    @consume({ context: storeContext, subscribe: true })
    store!: GrowspaceStore;

    @property({ attribute: false })
    activeDialogState!: ActiveDialogState;

    @property({ attribute: false })
    devices: GrowspaceDevice[] = [];

    @consume({ context: strainLibraryContext, subscribe: true })
    strainLibrary: StrainEntry[] = [];

    render() {
        if (!this.store) return html``;

        const active = this.activeDialogState || this.store.state.activeDialog;
        console.log('[DialogHost] Rendering with active type:', active.type);
        if (active.type === 'NONE') return html``;

        const strainLibrary = this.strainLibrary || [];
        const devices = this.devices || this.store.state.devices;
        const selectedDeviceData = devices.find((d) => d.device_id === this.store.state.selectedDevice);

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
            .row=${dialogState.row}
            .col=${dialogState.col}
            .growspaceName=${selectedDeviceData?.name || ''}
            @close=${() => this.store.closeActiveDialog()}
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
            @close=${() => this.store.closeActiveDialog()}
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
                this.store.clonePlant(e.detail.plant, e.detail.numClones)}
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
            @close=${() => this.store.closeActiveDialog()}
            @save-strain=${(e: CustomEvent) => this.store.addStrain(e.detail)}
            @delete-strain=${(e: CustomEvent) => this.store.removeStrain(e.detail.key)}
            @import-library=${(e: CustomEvent) => this._performImport(e.detail.file, e.detail.replace)}
            @export-library=${() => this.store.handleExportLibrary()}
        ></strain-library-dialog>
        `;
    }

    private async _performImport(file: File, replace: boolean) {
        if (!file) return;
        try {
            const result = await this.store.dataService.importStrainLibrary(file, replace);
            this.store.showToast(`Import successful! ${result.imported_count || ''} strains imported.`, 'success');
            await this.store.fetchStrainLibrary();
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
            .devices=${this.store.state.devices}
            .currentTab=${dialogState.currentTab}
            .environmentData=${dialogState.environmentData}
            .growspaceOptions=${growspaceOptions}
            @close=${() => this.store.closeActiveDialog()}
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
                circulation_fan: circulation_fan || undefined,
                stress_threshold,
                mold_threshold,
            });
            this.store.showToast('Environment configured successfully!', 'success');
            await this.store.refreshData();
            this.store.closeActiveDialog();
        } catch (e: any) {
            this.store.showToast(`Error: ${e.message}`, 'error');
        }
    }

    private _renderGrowMasterDialog(active: ActiveDialogState): TemplateResult {
        if (active.type !== 'GROW_MASTER') return html``;
        const dialogState = active.payload;

        // Determine stress state (logic moved from card or duplicated/simplified?)
        // Ideally store should calculate this derived state or pass it in payload.
        // For now, I'll access hass via store? No, store has hass but it's not reactive property of DialogHost
        // But store.hass IS available.

        let isStressed = false;
        let personality;

        if (this.store.state.selectedDevice && this.store.hass) {
            const id = this.store.state.selectedDevice;
            const stressEntityIds = [
                `binary_sensor.${id}_plants_under_stress`,
                `binary_sensor.${id}_stress`,
                `binary_sensor.growspace_manager_${id}_stress`,
            ];

            for (const eid of stressEntityIds) {
                const ent = this.store.hass.states[eid];
                if (ent && ent.state === 'on') {
                    isStressed = true;
                    break;
                }
            }

            const manager = this.store.hass.states['sensor.growspace_manager'];
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
            @close=${() => this.store.closeActiveDialog()}
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
            @close=${() => this.store.closeActiveDialog()}
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
            @close=${() => this.store.closeActiveDialog()}
            @closed=${() => this.store.closeActiveDialog()}
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
            @close=${() => this.store.closeActiveDialog()}
        ></logbook-dialog>
        `;
    }
}
