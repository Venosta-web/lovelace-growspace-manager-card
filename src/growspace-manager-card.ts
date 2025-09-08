import { LitElement, html, css, unsafeCSS, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard } from 'custom-card-helpers';
import { mdiPlus, mdiSprout, mdiFlower, mdiDna, mdiCannabis, mdiHairDryer } from '@mdi/js';
import { DateTime } from 'luxon'; 
import { variables } from './styles/variables';


// Import our modules
import { 
  GrowspaceManagerCardConfig, 
  PlantEntity, 
  PlantStage,
  AddPlantDialogState, 
  PlantOverviewDialogState, 
  StrainLibraryDialogState,
  GrowspaceDevice 
} from './types';
import { PlantUtils } from "./utils";
import { DataService } from './data-service';
import { DialogRenderer } from './dialog-renderer';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  @state() private _addPlantDialog: AddPlantDialogState | null = null;
  @state() private _defaultApplied = false;
  @state() private _plantOverviewDialog: PlantOverviewDialogState | null = null;
  @state() private _strainLibraryDialog: StrainLibraryDialogState | null = null;
  @state() private selectedDevice: string | null = null;
  @state() private _draggedPlant: PlantEntity | null = null;
  @state() private _isCompactView: boolean = false;
  

  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;

  private dataService!: DataService;
  static styles: CSSResultGroup = [
    variables,
    css`
      :host {
        display: block;
        font-family: 'Roboto', sans-serif;
        color: var(--growspace-card-text);
      }

      ha-card {
        padding: var(--spacing-lg);
        border-radius: var(--border-radius-lg);
        background: var(--growspace-card-bg);
        box-shadow: var(--card-shadow);
        transition: var(--transition-medium);
      }

      ha-card:hover {
        box-shadow: var(--card-shadow-hover);
      }

      ha-card.wide-growspace .plant-name,
      ha-card.wide-growspace .plant-stage,
      ha-card.wide-growspace .plant-phenotype {
        font-size: var(--font-size-sm);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) 0;
        border-bottom: 2px solid var(--divider-color);
      }

      .header-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        margin: 0;
      }

      .selector-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex: 1;
        text-transform: capitalize;
      }
      
      .growspace-select {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius-md);
        background: var(--growspace-card-bg);
        color: var(--growspace-card-text);
        font-family: inherit;
        font-size: var(--font-size-sm);
        cursor: pointer;
        min-width: 180px;
        transition: var(--transition-fast);
      }

      .growspace-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      .action-button {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: var(--border-radius-md);
        font-family: inherit;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        background: var(--plant-border-color-default);
        color: var(--growspace-card-text);
        box-shadow: var(--card-shadow);
        transition: var(--transition-fast);
      }

      .action-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--card-shadow-hover);
      }

      .view-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: var(--font-size-xs);
        color: var(--secondary-text-color);
      }

      .grid {
        display: grid;
        gap: var(--spacing-md);
        margin-top: var(--spacing-lg);
        padding: var(--spacing-sm);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      .plant {
        border: 2px solid transparent;
        border-radius: var(--border-radius-md);
        text-align: center;
        padding: var(--spacing-md);
        background: var(--growspace-card-bg);
        box-shadow: var(--card-shadow);
        transition: var(--transition-medium);
        min-height: 100px;
        display: grid; 
          grid-template-columns: 1fr; 
          grid-template-rows: 2fr 1fr 1fr 2fr; 
          gap: 0px 0px; 
          grid-template-areas: 
            "icon"
            "name"
            "stage"
            "days"; 
        align-items: center;
        justify-items: center;
        cursor: pointer;
        aspect-ratio: 1;
        position: relative;
        overflow: hidden;
      }

      .plant::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--plant-border-color-default);
        transition: var(--transition-medium);
      }

      .plant:hover {
        transform: translateY(-4px);
        box-shadow: var(--card-shadow-hover);
        border-color: var(--plant-border-color-default);
      }

      .plant.empty {
        background: var(--growspace-empty-bg);
        border: 2px dashed var(--divider-color);
        opacity: 0.7;
      }

      .plant.empty:hover {
        opacity: 1;
        background: var(--growspace-empty-bg-hover);
        border-color: var(--plant-border-color-default);
      }

      .plant.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      .plant-name,
      .plant-phenotype,
      .plant-stage,
      .plant-days {
        min-height: 1.2em; /* reserve space */
        text-align: center;
      }

      .plant-phenotype:empty::before,
      .plant-name:empty::before,
      .plant-stage:empty::before,
      .plant-days:empty::before {
        content: "—";
        color: var(--disabled-text-color);
      }

      .plant-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-xs);
      }

      .plant.empty .plant-header {
        margin-top: inherit;
      }

      .plant-icon {
        width: 2rem;
        height: 2rem;
        fill: var(--stage-color, var(--secondary-text-color));
      }

      .plant-name {
        font-weight: var(--font-weight-bold);
        color: var(--growspace-card-text);
        font-size: var(--font-size-lg);
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage {
        color: var(--stage-color, var(--secondary-text-color));
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        color: var(--secondary-text-color);
        font-size: var(--font-size-md);
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
        display: flex;
        justify-content: space-around;
        align-items: center;
        font-size: var(--font-size-md);
        color: var(--secondary-text-color);
        width: 100%;
      }

      .plant-days span {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 5px;
      }

      .compact .plant {
        min-height: 80px;
        padding: var(--spacing-sm);
      }

      .compact .plant-name {
        font-size: var(--font-size-sm);
      }

      .compact .plant-days {
        font-size: var(--font-size-xs);
      }

      ha-dialog {
        --mdc-dialog-border-radius: var(--border-radius-md);
        --mdc-dialog-box-shadow: var(--card-shadow-hover);
      }

      .no-data {
        text-align: center;
        color: var(--secondary-text-color);
        padding: var(--spacing-lg);
        font-style: italic;
        background: var(--growspace-empty-bg);
        border-radius: var(--border-radius-md);
        margin: var(--spacing-md) 0;
      }

      .error {
        color: var(--error-color);
        padding: var(--spacing-md);
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        border-radius: var(--border-radius-md);
        margin: var(--spacing-md) 0;
      }
      /* Dialog Styles */
      ha-dialog {
        --mdc-dialog-border-radius: var(--border-radius);
        --mdc-dialog-box-shadow: var(--surface-elevation-hover);
      }
      
      ha-dialog .mdc-dialog--open .mdc-dialog__container,
      ha-dialog .mdc-dialog--open {
        align-items: start;
        margin-top: 5vh;
      }
      
      ha-dialog.strain-dialog .mdc-dialog--open .mdc-dialog__container .mdc-dialog__surface {
        width: 800px;
        max-width: 90vw;
        height: 600px;
        max-height: 90vh;
      }
      ha-dialog.strain-dialog .mdc-dialog--open .dialog-content .strain-library-header {
        justify-content: space-between;
      }
      ha-dialog.strain-dialog {
        --mdc-dialog-min-width: 45vw;
        --mdc-dialog-max-width: 45vw;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        padding: var(--spacing-md) 0;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .form-group label {
        font-weight: 500;
        color: var(--primary-text-color);
        font-size: 0.9rem;
      }

      .form-input {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius);
        font-family: inherit;
        font-size: 0.9rem;
        transition: var(--transition);
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      .form-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      /* Strain Library Styles */
      .strain-library-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
      }

      .strain-input-group {
        display: flex;
        gap: var(--spacing-sm);
        align-items: center;
      }

      .strain-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        max-height: 500px;
        overflow-y: auto;
        margin-top: var(--spacing-md);
        padding-right: var(--spacing-md)
      }

      .strain-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-sm) var(--spacing-md);
        background: rgba(var(--rgb-primary-color), 0.05);
        border: 1px solid rgba(var(--rgb-primary-color), 0.1);
        border-radius: var(--border-radius);
        transition: var(--transition);
      }

      .strain-item:hover {
        background: rgba(var(--rgb-primary-color), 0.1);
      }

      .strain-name {
        font-weight: 500;
        flex: 1;
      }

      .remove-button {
        background: none;
        border: none;
        padding: var(--spacing-xs);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--error-color);
        border-radius: 50%;
        transition: var(--transition);
      }

      .remove-button:hover {
        background: rgba(var(--rgb-error-color), 0.1);
        transform: scale(1.1);
      }

      .remove-icon {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      @media (max-width: 600px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
        .selector-container {
          justify-content: center;
        }
        .grid {
          gap: var(--spacing-sm);
        }
        .plant {
          min-height: 80px;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .plant {
        animation: fadeIn 0.3s ease-out;
      }
    `
  ];
  protected firstUpdated() {
    this.dataService = new DataService(this.hass);
    this.initializeSelectedDevice();
  }

  private initializeSelectedDevice() {
    const devices = this.dataService.getGrowspaceDevices();
    if (!devices.length || this.selectedDevice) return;

    // Try to apply default from config
    if (this._config?.default_growspace) {
      const defaultDevice = devices.find(d =>
        d.device_id === this._config.default_growspace ||
        d.name === this._config.default_growspace
      );
      if (defaultDevice) {
        this.selectedDevice = defaultDevice.device_id;
        return;
      }
    }

    // Fallback to first device
    this.selectedDevice = devices[0].device_id;
  }

  public static getConfigElement() {
    return document.createElement("growspace-manager-card-editor");
  }

  public static getStubConfig(): GrowspaceManagerCardConfig {
    
    return { type: 'custom:growspace-manager-card', title: 'Growspace Manager', compact: false, };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = config;
  }

  public getCardSize(): number { return 4; }

  // Event handlers
  private _handleDeviceChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.selectedDevice = target.value;
  }

  private _handlePlantClick(plant: PlantEntity): void {
    this._plantOverviewDialog = {
      open: true,
      plant,
      editedAttributes: { ...plant.attributes }
    };
  }

  private getHaDateTimeString(): string {
    // hass.config.time_zone is your Home Assistant timezone
    const tz = this.hass.config.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return DateTime.now()
      .setZone(tz)                  // Use HA timezone
      .toFormat("yyyy-LL-dd'T'HH:mm"); // Format for datetime-local input
  }

  private _openAddPlantDialog(row: number, col: number) {
    const today = this.getHaDateTimeString();
    const strainLibrary = this.dataService.getStrainLibrary();
    
    this._addPlantDialog = {
      open: true,
      row,
      col,
      strain: strainLibrary[0] || '',
      phenotype: '',
      veg_start: today,
      flower_start: today,
      dry_start: today,
      cure_start: today,
    };
  }

  private async _confirmAddPlant() {
    if (!this._addPlantDialog || !this.selectedDevice) return;
    if (!this._addPlantDialog.strain) {
      alert('Please enter a strain!');
      return;
    }

    const { row, col, strain, phenotype, veg_start, flower_start, dry_start, cure_start } = this._addPlantDialog;

    try {
      const payload = {
        growspace_id: this.selectedDevice,
        row: row + 1,
        col: col + 1,
        strain,
        phenotype,
        veg_start: PlantUtils.parseDateTimeLocal(veg_start) 
          ?? PlantUtils.getCurrentDateTime(),
        flower_start: PlantUtils.parseDateTimeLocal(flower_start) 
          ?? PlantUtils.getCurrentDateTime(),
        dry_start: PlantUtils.parseDateTimeLocal(dry_start) 
          ?? PlantUtils.getCurrentDateTime(),
        cure_start: PlantUtils.parseDateTimeLocal(cure_start) 
          ?? PlantUtils.getCurrentDateTime(),
      };
      console.log("Adding plant to growspace:", this.selectedDevice, payload);
      console.log("Adding plant:", payload);
      await this.dataService.addPlant(payload);

      this._addPlantDialog = null;
    } catch (err) {
      console.error('Error adding plant:', err);
    }
  }


  private async _updatePlant() {
    if (!this._plantOverviewDialog) return;
    
    const { plant, editedAttributes } = this._plantOverviewDialog;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    
    const payload: any = { plant_id: plantId };
    ['strain', 'phenotype', 'row', 'col', 'veg_start', 'flower_start', 'dry_start', 'cure_start']
      .forEach(field => {
        if (editedAttributes[field] !== undefined && editedAttributes[field] !== null) {
          payload[field] = editedAttributes[field];
        }
      });

    try {
      await this.dataService.updatePlant(payload);
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error updating plant:", err);
    }
  }

  private async _handleDeletePlant(plantId: string) {
    if (!confirm("Are you sure you want to delete this plant?")) return;

    try {
      await this.dataService.removePlant(plantId);
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error deleting plant:", err);
    }
  }
  private async _movePlantToNextStage(_: PlantEntity) {
    if (!this._plantOverviewDialog?.plant) {
      console.error("No plant found in overview dialog");
      return;
    }

    const plant = this._plantOverviewDialog.plant;
    const stage = PlantUtils.getPlantStage(plant);

    if (!stage || (stage !== "dry" && stage !== "cure")) {
      alert("Plant must be in dry or cure stage to move.");
      return;
    }

    // Decide the target growspace
    let targetGrowspace: string;
    if (stage === "dry") {
      targetGrowspace = "cure_overview"; // move to curing
    } else if (stage === "cure") {
      targetGrowspace = "harvested_overview"; // final harvested
    } else
      targetGrowspace = "bin"; // fallback to dry

    try {
      const plantId =
        plant.attributes?.plant_id || plant.entity_id.replace("sensor.", "");

      // Call your coordinator/service
      await this.dataService.harvestPlant(plantId, targetGrowspace);

      // Close dialog
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error moving plant to next stage:", err);
    }
  }
  private async _harvestPlant(plantEntity: PlantEntity): Promise<void> {
    await this._movePlantToNextStage(plantEntity);
  }

  private async _finishDryingPlant(plantEntity: PlantEntity): Promise<void> {
    await this._movePlantToNextStage(plantEntity);
  }


  // Strain library methods
  private _openStrainLibraryDialog() {
    const currentStrains = this.dataService.getStrainLibrary();
    this._strainLibraryDialog = { open: true, newStrain: '', strains: currentStrains };
  }

  private async _addStrain() {
    if (!this._strainLibraryDialog?.newStrain) return;
    
    this._strainLibraryDialog.strains.push(this._strainLibraryDialog.newStrain);
    await this.dataService.importStrainLibrary(this._strainLibraryDialog.strains, true);
    this._strainLibraryDialog.newStrain = '';
  }

  private async _removeStrain(strain: string) {
    if (!this._strainLibraryDialog) return;
    
    this._strainLibraryDialog.strains = this._strainLibraryDialog.strains.filter(s => s !== strain);
    await this.dataService.importStrainLibrary(this._strainLibraryDialog.strains, true);
  }

  private async _clearStrains() {
    await this.dataService.clearStrainLibrary();
  }

  // Drag and drop handlers
  private _handleDragStart(e: DragEvent, plant: PlantEntity) {
    this._draggedPlant = plant;
    e.dataTransfer?.setData("text/plain", JSON.stringify({ id: plant.entity_id }));
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  }

  private _handleDragEnd(e: DragEvent) {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
  }

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private _handleDrop(e: DragEvent, targetRow: number, targetCol: number, targetPlant: PlantEntity | null) {
    e.preventDefault();
    if (!this._draggedPlant) return;

    const sourcePlant = this._draggedPlant;
    this._draggedPlant = null;

    if (targetPlant) {
      this._movePlant(sourcePlant, targetRow, targetCol);
      this._movePlant(targetPlant, sourcePlant.attributes.row!, sourcePlant.attributes.col!);
    } else {
      this._movePlant(sourcePlant, targetRow, targetCol);
    }
  }

  private async _movePlant(plant: PlantEntity, newRow: number, newCol: number) {
    try {
      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      await this.dataService.updatePlant({
        plant_id: plantId,
        row: newRow,
        col: newCol,
      });
    } catch (err) {
      console.error("Error moving plant:", err);
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    this.dataService = new DataService(this.hass);
    const devices = this.dataService.getGrowspaceDevices();
    
    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    // Apply default growspace logic
    if (!this._defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      if (match) this.selectedDevice = match.device_id;
      this._defaultApplied = true;
    }

    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      this.selectedDevice = devices[0].device_id;
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    // Check if growspace is empty
    if (selectedDeviceData.plants.length === 0) {
      return html`
        <ha-card>
          <div class="no-data" style="text-align:center; padding: 1.5rem;">
            Growspace <strong>${selectedDeviceData.name}</strong> is currently empty.
          </div>
        </ha-card>
      `;
    }

    const effectiveRows = PlantUtils.calculateEffectiveRows(selectedDeviceData);
    const { grid } = PlantUtils.createGridLayout(
      selectedDeviceData.plants,
      effectiveRows,
      selectedDeviceData.plants_per_row
    );

    const isWide = selectedDeviceData.plants_per_row > 6;

    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        ${this.renderHeader(devices)}
        ${this.renderGrid(grid, effectiveRows, selectedDeviceData.plants_per_row)}
      </ha-card>
      
      ${this.renderDialogs()}
    `;
  }

  private renderHeader(devices: GrowspaceDevice[]): TemplateResult {
    const selectedDevice = devices.find(d => d.device_id === this.selectedDevice);
    
    return html`
      <div class="header">
        ${this._config?.title ? html`<h2 class="header-title">${this._config.title}</h2>` : ''}
        
        <div class="selector-container">
          ${!this._config?.default_growspace ? html`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice || ''} 
              @change=${this._handleDeviceChange}
            >
              ${devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
            </select>
          ` : html`<span class="selected-growspace">${selectedDevice?.name}</span>`}
        </div>

        <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
          <div class="view-toggle">
            <input 
              type="checkbox" 
              id="compact-view" 
              .checked=${this._isCompactView}
              @change=${(e: Event) => this._isCompactView = (e.target as HTMLInputElement).checked}
            >
            <label for="compact-view">Compact</label>
          </div>
          
          <button class="action-button" @click=${this._openStrainLibraryDialog}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDna}"></path>
            </svg>
            Strains
          </button>
        </div>
      </div>
    `;
  }

  private renderGrid(grid: (PlantEntity | null)[][], rows: number, cols: number): TemplateResult {
    return html`
      <div class="grid ${this._isCompactView ? 'compact' : ''}" 
           style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
        ${grid.flat().map((plant, index) => {
          const row = Math.floor(index / cols) + 1;
          const col = (index % cols) + 1;
          
          if (!plant) {
            return this.renderEmptySlot(row, col);
          }
          
          return this.renderPlantSlot(plant, row, col);
        })}
      </div>
    `;
  }

  private renderEmptySlot(row: number, col: number): TemplateResult {
    return html`
      <div 
        class="plant empty" 
        style="grid-row: ${row}; grid-column: ${col}" 
        @click=${() => this._openAddPlantDialog(row - 1, col - 1)}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, null)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${mdiPlus}"></path>
          </svg>
        </div>
        <div class="plant-name">Add Plant</div>
        <div class="plant-stage">Empty Slot</div>
      </div>
    `;
  }

  private renderPlantSlot(plant: PlantEntity, row: number, col: number): TemplateResult {
    const stageColor = PlantUtils.getPlantStageColor(plant.state);
    const stageIcon = PlantUtils.getPlantStageIcon(plant.state);
    
    return html`
      <div 
        class="plant" 
        style="grid-row: ${row}; grid-column: ${col}; --stage-color: ${stageColor}" 
        draggable="true"
        @dragstart=${(e: DragEvent) => this._handleDragStart(e, plant)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${(e: DragEvent) => this._handleDrop(e, row, col, plant)}
        @click=${() => this._handlePlantClick(plant)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${stageIcon}"></path>
          </svg>
        </div>

        <!-- Always render strain slot -->
        <div class="plant-name">
          ${plant.attributes?.strain || '—'}
        </div>

        <!-- Always render phenotype slot -->
        <div class="plant-phenotype">
          ${plant.attributes?.phenotype || '—'}
        </div>

        <!-- Always render state slot -->
        <div class="plant-stage">
          ${plant.state || '—'}
        </div>

        <!-- Always render plant-days slot -->
        <div class="plant-days">
          ${!this._isCompactView ? this.renderPlantDays(plant) : '—'}
        </div>
      </div>
    `;
  }

  private renderPlantDays(plant: PlantEntity): TemplateResult {
    const days = [
      { days: plant.attributes?.veg_days, icon: mdiSprout, title: "Days in Vegetative" },
      { days: plant.attributes?.flower_days, icon: mdiFlower, title: "Days in Flower" },
      { days: plant.attributes?.dry_days, icon: mdiHairDryer, title: "Days in Dry" },
      { days: plant.attributes?.cure_days, icon: mdiCannabis, title: "Days in Cure" }
    ].filter(d => d.days);

    if (!days.length) return html``;

    return html`
      <div class="plant-days">
        ${days.map(({ days, icon, title }) => html`
          <span title="${title}">
            <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${icon}"></path>
            </svg>
            ${days}d
          </span>
        `)}
      </div>
    `;
  }

  private renderDialogs(): TemplateResult {
    const strainLibrary = this.dataService?.getStrainLibrary() || [];

    return html`
      ${DialogRenderer.renderAddPlantDialog(
        this._addPlantDialog,
        strainLibrary,
        {
          onClose: () => this._addPlantDialog = null,
          onConfirm: () => this._confirmAddPlant(),
          onStrainChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.strain = value; },
          onPhenotypeChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.phenotype = value; },
          onVegStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.veg_start = value; },
          onFlowerStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.flower_start = value; },
          onDryStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.dry_start = value; },
          onCureStartChange: (value) => { if (this._addPlantDialog) this._addPlantDialog.cure_start = value; },
        }
      )}

      ${DialogRenderer.renderPlantOverviewDialog(
      this._plantOverviewDialog,
      {
        onClose: () => this._plantOverviewDialog = null,
        onUpdate: () => { this._updatePlant(); },
        onDelete: (plantId) => { this._handleDeletePlant(plantId); },
        onHarvest: (plantEntity) => { this._harvestPlant(plantEntity); },
        onFinishDrying: (plantEntity) => { this._finishDryingPlant(plantEntity); },
        _harvestPlant: this._harvestPlant.bind(this),
        _finishDryingPlant: this._finishDryingPlant.bind(this),
        onAttributeChange: (key, value) => {
          if (this._plantOverviewDialog) {
            this._plantOverviewDialog.editedAttributes[key] = value;
          }
        },
      }
    )}

      ${DialogRenderer.renderStrainLibraryDialog(
        this._strainLibraryDialog,
        {
          onClose: () => this._strainLibraryDialog = null,
          onAddStrain: () => this._addStrain(),
          onRemoveStrain: (strain) => this._removeStrain(strain),
          onClearAll: () => this._clearStrains(),
          onNewStrainChange: (value) => { 
            if (this._strainLibraryDialog) this._strainLibraryDialog.newStrain = value; 
          },
          onEnterKey: (e) => { if (e.key === 'Enter') this._addStrain(); },
        }
      )}
    `;
  }


}

@customElement("growspace-manager-card-editor")
export class GrowspaceManagerCardEditor extends LitElement {
  @property({ attribute: false }) public hass!: any;
  @state() private _config!: GrowspaceManagerCardConfig;

  setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = { ...config };
  }

  private _valueChanged(ev: Event) {
    const target = ev.target as HTMLInputElement;
    if (!this._config || !target) return;

    const value =
      target.type === "checkbox" ? target.checked : target.value;

    if (this._config[target.name as keyof GrowspaceManagerCardConfig] === value) {
      return;
    }
  this._config = {
      ...this._config,
      [target.name]: value,
    };

    this.dispatchEvent(new CustomEvent("config-changed", { 
      detail: { config: this._config } 
    }));
  }

  render() {
    if (!this._config) return html``;

    return html`
      <ha-formfield label="Compact mode">
        <ha-switch
          .checked=${this._config.compact ?? false}
          .name=${"compact"}
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
    `;
  }
}