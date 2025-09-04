import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';
import { mdiClose } from '@mdi/js';


interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  default_growspace?: string; // optional default growspace
}

interface PlantEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_id?: string;
    row?: number;
    col?: number;
    strain?: string;
    phenotype?: string;
    veg_days?: number;
    flower_days?: number;
    veg_start?: string;
    flower_start?: string;
    [key: string]: any;
  };
}

interface GrowspaceDevice {
  device_id: string;
  name: string;
  plants: PlantEntity[];
  rows: number;
  plants_per_row: number;
}

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  @state() private _addPlantDialog: {
    open: boolean;
    row: number;
    col: number;
    strain?: string;
    phenotype?: string;
    veg_start?: string;
    flower_start?: string;
  } | null = null;

  @state() private _defaultApplied = false;

  @state() private _plantOverviewDialog: {
    open: boolean;
    plant: PlantEntity;
    editedAttributes: { [key: string]: any };
  } | null = null;

  @state() private _strainLibraryDialog: {
    open: boolean;
    newStrain: string;
    strains: string[]; // <-- local copy of strains
  } | null = null;


  @state() private selectedDevice: string | null = null;

  private _draggedPlant: PlantEntity | null = null;

  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;

  private get _strainLibrary(): string[] {
    const strainSensor = Object.values(this.hass.states).find(s => s.entity_id.endsWith('_strain_library'));
    return strainSensor?.attributes?.strains || [];
  }

  // ----------------- strain library helpers -----------------
  private _openStrainLibraryDialog() {
    const currentStrains = this._strainLibrary || []; // get from HA state
    this._strainLibraryDialog = { open: true, newStrain: '' ,strains: currentStrains};
  }

  private async _addStrain() {
    if (!this._strainLibraryDialog?.newStrain) return;

    // Update local list immediately
    this._strainLibraryDialog.strains.push(this._strainLibraryDialog.newStrain);

    // Call HA service
    await this.hass.callService('growspace_manager', 'import_strain_library', {
      strains: this._strainLibraryDialog.strains,
      replace: true
    });

    this._strainLibraryDialog.newStrain = '';
  }

  private async _removeStrain(strain: string) {
    if (!this._strainLibraryDialog) return;

    // Remove locally for immediate UI update
    this._strainLibraryDialog.strains = this._strainLibraryDialog.strains.filter(s => s !== strain);

    // Persist changes
    await this.hass.callService('growspace_manager', 'import_strain_library', {
      strains: this._strainLibraryDialog.strains,
      replace: true
    });
  }


  private async _clearStrains() {
    await this.hass.callService('growspace_manager', 'clear_strain_library', {});
  }

  public static async getConfigElement() {
    return document.createElement('div');
  }

  public static getStubConfig(): GrowspaceManagerCardConfig {
    return { type: 'custom:growspace-manager-card', title: 'Growspace Manager' };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = config;
  }


  public getCardSize(): number { return 3; }

  static get styles(): CSSResultGroup {
    return css`
      :host { 
        display: block;
      }
      /* Force override ha-button styles with !important */  
      /* Custom button class for more specific targeting */
      ha-button.growspace-button::part(base),
      .growspace-button::part(base):hover,
      .growspace-button::part(base):active {
        background-color: #2196f3;
        color: var(--text-primary-color);
      }
      
      /* Strain library specific buttons */
      .strain-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 5%;
      }

      .strain-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        background: var(--card-background-color);
        border-radius: 6px;
      }

      .remove-button {
        background: none;
        border: none;
        padding: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--error-color, red); /* optional */
        transition: color 0.2s;
      }

      .remove-button:hover {
        color: var(--error-color, darkred);
      }

      .remove-icon {
        display: block;
      }
      
      
      ha-card { padding: 16px; --ha-card-border-radius: var(--ha-card-border-radius, 12px); }
      .header { display: flex; align-items: start; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; margin: 1% 2%}
      .selector-container { display: flex; align-items: center; gap: 8px; }
      select { padding: 8px 12px; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; cursor: pointer; min-width: 150px; }
      select:focus { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .grid { display: grid; gap: 12px; margin-top: 16px; }
      .plant { border: 1px solid var(--divider-color); border-radius: var(--ha-card-border-radius, 8px); text-align: center; padding: 12px; background: var(--card-background-color); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.12)); transition: transform 0.2s ease, box-shadow 0.2s ease; min-height: 80px; display: flex; flex-direction: column; justify-content: center; cursor: pointer; aspect-ratio: 1 / 1; max-width: 90%; margin: 5% 5%; }
      .plant:hover { transform: translateY(-2px); box-shadow: var(--ha-card-box-shadow, 0 4px 8px rgba(0,0,0,0.15)); }
      .plant.empty { background: var(--disabled-text-color); opacity: 0.3; border-style: dashed; }
      .plant-name { font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px; font-size: 0.9em; }
      .plant-stage { color: var(--secondary-text-color); font-size: 0.8em; margin-bottom: 2px; }
      .no-data { text-align: center; color: var(--secondary-text-color); padding: 32px 16px; font-style: italic; }
      .error { color: var(--error-color); padding: 16px; background: rgba(var(--error-color-rgb, 244, 67, 54), 0.1); border-radius: 8px; margin: 16px 0; }
      .overview-fields { display: flex; flex-direction: column; gap: 8px; }
      .overview-fields label { display: flex; flex-direction: column; font-size: 0.85em; }
      .overview-fields input, .overview-fields select { padding: 6px 8px; font-family: inherit; border-radius: 6px; border: 1px solid var(--divider-color); }
    `;
  }
  
  private _getGrowspaceDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];
    const allStates = Object.values(this.hass.states);
    const overviewSensors = allStates.filter((entity: any) => entity.entity_id.endsWith('_overview'));
    const deviceGroups = new Map<string, PlantEntity[]>();

    allStates.forEach((entity: any) => {
      if (entity.attributes?.row !== undefined && entity.attributes?.col !== undefined) {
        const growspaceId = entity.attributes?.growspace_id
          || overviewSensors.find(ov => ov.entity_id.startsWith(entity.entity_id.split('_')[0]))?.attributes?.growspace_id
          || 'unknown';
        if (!deviceGroups.has(growspaceId)) deviceGroups.set(growspaceId, []);
        deviceGroups.get(growspaceId)!.push(entity as PlantEntity);
      }
    });

    const devices: GrowspaceDevice[] = [];
    deviceGroups.forEach((plants, growspaceId) => {
      const overview = overviewSensors.find(ov => ov.attributes?.growspace_id === growspaceId);
      devices.push({
        device_id: growspaceId,
        name: overview?.attributes?.friendly_name || `Growspace ${growspaceId}`,
        plants,
        rows: overview?.attributes?.rows ?? 3,
        plants_per_row: overview?.attributes?.plants_per_row ?? 3,
      });
    });

    return devices;
  }

  private _createGridLayout(plants: PlantEntity[], rows: number, cols: number): { rows: number; cols: number; grid: (PlantEntity | null)[][] } {
    const grid: (PlantEntity | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    plants.forEach(plant => {
      const row = (plant.attributes?.row ?? 1) - 1;
      const col = (plant.attributes?.col ?? 1) - 1;
      if (row >= 0 && row < rows && col >= 0 && col < cols) grid[row][col] = plant;
    });
    return { rows, cols, grid };
  }

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

  private _openAddPlantDialog(row: number, col: number) {
    const today = new Date().toISOString().slice(0, 16);
    const defaultStrain = this._strainLibrary?.[0] || '';
    this._addPlantDialog = {
      open: true,
      row,
      col,
      strain: defaultStrain,
      phenotype: '',
      veg_start: today,
      flower_start: today,
    };
  }

  private _confirmAddPlant() {
    if (!this._addPlantDialog || !this.selectedDevice) return;
    if (!this._addPlantDialog.strain) { alert('Please enter a strain!'); return; }

    const vegStart = this._addPlantDialog.veg_start || new Date().toISOString().slice(0, 16);
    const flowerStart = this._addPlantDialog.flower_start || new Date().toISOString().slice(0, 16);

    this.hass.callService('growspace_manager', 'add_plant', {
      growspace_id: this.selectedDevice,
      row: this._addPlantDialog.row + 1,
      col: this._addPlantDialog.col + 1,
      strain: this._addPlantDialog.strain,
      phenotype: this._addPlantDialog.phenotype,
      veg_start: vegStart,
      flower_start: flowerStart,
    }).then(() => { this._addPlantDialog = null; })
      .catch(err => console.error('Error calling growspace_manager.add_plant', err));
  }

  private async _updatePlant() {
    if (!this._plantOverviewDialog) return;
    const attrs = this._plantOverviewDialog.editedAttributes;
    const payload: any = { plant_id: this._plantOverviewDialog.plant.attributes?.plant_id || this._plantOverviewDialog.plant.entity_id.replace('sensor.', '') };

    ['strain', 'phenotype', 'row', 'col', 'veg_start', 'flower_start']
      .forEach(field => {
        if (attrs[field] !== undefined && attrs[field] !== null) payload[field] = attrs[field];
      });

    try {
      await this.hass.callService('growspace_manager', 'update_plant', payload);
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error("Error updating plant:", err);
    }
  }


  private _handleDragStart(e: DragEvent, plant: PlantEntity) {
    this._draggedPlant = plant;
    e.dataTransfer?.setData("text/plain", JSON.stringify({ id: plant.entity_id }));
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
      // swap positions
      this._movePlant(sourcePlant, targetRow, targetCol);
      this._movePlant(targetPlant, sourcePlant.attributes.row!, sourcePlant.attributes.col!);
    } else {
      // just move
      this._movePlant(sourcePlant, targetRow, targetCol);
    }
  }

  private async _movePlant(plant: PlantEntity, newRow: number, newCol: number) {
    try {
      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      await this.hass.callService('growspace_manager', 'update_plant', {
        plant_id: plantId,
        row: newRow,
        col: newCol,
      });
    } catch (err) {
      console.error("Error moving plant:", err);
    }
  }
  protected firstUpdated() {
    const devices = this._getGrowspaceDevices();
    if (!this.selectedDevice && devices.length) {
      let defaultDevice: GrowspaceDevice | undefined;
      if (this._config?.default_growspace) {
        defaultDevice = devices.find(d =>
          d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
        );
      }
      this.selectedDevice = defaultDevice?.device_id || devices[0].device_id;
      console.log('Default growspace applied:', devices.find(d => d.device_id === this.selectedDevice)?.name);
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;

    const devices = this._getGrowspaceDevices();
    console.log('devices detected:', devices);
    console.log('current selectedDevice:', this.selectedDevice);
    console.log('default from config:', this._config?.default_growspace);
    if (!devices.length) return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;

    // Apply default growspace only once
    if (!this._defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      
      if (match) this.selectedDevice = match.device_id;
        console.log('Applying default growspace:', match?.name);
        this._defaultApplied = true;
    }

    // fallback if nothing selected and no default is configured
    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      if (!this._config?.default_growspace) {
        this.selectedDevice = devices[0].device_id;
      } else {
        // use the default growspace from config
        const match = devices.find(d =>
          d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
        );
        if (match) this.selectedDevice = match.device_id;
      }
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice)!;  

    const { rows, cols, grid } = this._createGridLayout(selectedDeviceData.plants, selectedDeviceData.rows, selectedDeviceData.plants_per_row);

    return html`
      <ha-card>
        <div class="header">
          <div class="selector-container">
            ${!this._config?.default_growspace ? html`
              <label for="device-select">Growspace:</label>
              <select id="device-select" .value=${this.selectedDevice} @change=${this._handleDeviceChange}>
                ${devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
              </select>
            ` : html`<span>Growspace: ${devices.find(d => d.device_id === this.selectedDevice)?.name}</span>`}
          </div>

          <ha-button 
            variant="neutral" 
            class="growspace-button" 
            @click=${this._openStrainLibraryDialog}>
            Manage Strain Library
          </ha-button>
        </div>

        <div class="grid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
          ${grid.flat().map((plant, index) => {
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;
      if (!plant) {
        return html`
                <div class="plant empty" 
                     style="grid-row: ${row}; grid-column: ${col}" 
                     @click=${() => this._openAddPlantDialog(row - 1, col - 1)}
                     @dragover=${this._handleDragOver}
                     @drop=${(e: DragEvent) => this._handleDrop(e, row, col, null)}>
                  <div class="plant-name">Empty</div>
                  <div class="plant-stage">Empty</div>
                </div>
              `;
      }
      return html`
              <div class="plant" 
                   style="grid-row: ${row}; grid-column: ${col}" 
                   draggable="true"
                   @dragstart=${(e: DragEvent) => this._handleDragStart(e, plant)}
                   @dragover=${this._handleDragOver}
                   @drop=${(e: DragEvent) => this._handleDrop(e, row, col, plant)}
                   @click=${() => this._handlePlantClick(plant)}>
                <div class="plant-name">${plant.attributes?.strain}</div>
                ${plant.attributes?.phenotype ? html`<div class="plant-phenotype">Phenotype: ${plant.attributes.phenotype}</div>` : ''}
                <div class="plant-stage">${plant.state}</div>
                ${plant.attributes?.veg_days ? html`<div class="plant-veg-days">Days in Veg: ${plant.attributes.veg_days}</div>` : ''}
                ${plant.attributes?.flower_days ? html`<div class="plant-flower-days">Days in Flower: ${plant.attributes.flower_days}</div>` : ''}
              </div>
            `;
    })}
        </div>

        <!-- Add Plant Dialog -->
        ${this._addPlantDialog?.open ? html`
          <ha-dialog
            open
            @closed=${() => this._addPlantDialog = null}
            heading="Add Plant at Row ${this._addPlantDialog.row + 1}, Col ${this._addPlantDialog.col + 1}"
          >
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label>Strain:
                <select .value=${this._addPlantDialog.strain} @change=${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          if (this._addPlantDialog) this._addPlantDialog.strain = target.value;
        }}>
                  ${this._strainLibrary.map(s => html`<option value="${s}" ?selected=${this._addPlantDialog?.strain === s}>${s}</option>`)}
                </select>
              </label>

              <label>Phenotype:
                <input type="text" .value=${this._addPlantDialog.phenotype || ''} @input=${(e: any) => this._addPlantDialog!.phenotype = e.target.value} />
              </label>

              <label>Vegetative Start:
                <input type="datetime-local" .value=${this._addPlantDialog.veg_start || ''} @input=${(e: any) => this._addPlantDialog!.veg_start = e.target.value} />
              </label>

              <label>Flower Start:
                <input type="datetime-local" .value=${this._addPlantDialog.flower_start || ''} @input=${(e: any) => this._addPlantDialog!.flower_start = e.target.value} />
              </label>
            </div>

            <ha-button class="growspace-button" slot="primaryAction" @click=${this._confirmAddPlant}>Add Plant</ha-button>
            <ha-button class="growspace-button" slot="secondaryAction" @click=${() => this._addPlantDialog = null}>Cancel</ha-button>
          </ha-dialog>
        ` : ''}

        <!-- Plant Overview Dialog -->
        ${this._plantOverviewDialog?.open ? html`
          <ha-dialog
            open
            @closed=${() => this._plantOverviewDialog = null}
            heading="Plant Overview: ${this._plantOverviewDialog.editedAttributes.strain || 'Unnamed'}"
          >
            <div class="overview-fields">
              <label>Strain:
                <input type="text" .value=${this._plantOverviewDialog.editedAttributes.strain || ''} 
                       @input=${(e: Event) => this._plantOverviewDialog!.editedAttributes.strain = (e.target as HTMLInputElement).value}>
              </label>

              <label>Phenotype:
                <input type="text" .value=${this._plantOverviewDialog.editedAttributes.phenotype || ''} 
                       @input=${(e: Event) => this._plantOverviewDialog!.editedAttributes.phenotype = (e.target as HTMLInputElement).value}>
              </label>

              <label>Row:
                <input type="number" .value=${this._plantOverviewDialog.editedAttributes.row || 1} 
                       @input=${(e: Event) => this._plantOverviewDialog!.editedAttributes.row = parseInt((e.target as HTMLInputElement).value)}>
              </label>

              <label>Col:
                <input type="number" .value=${this._plantOverviewDialog.editedAttributes.col || 1} 
                       @input=${(e: Event) => this._plantOverviewDialog!.editedAttributes.col = parseInt((e.target as HTMLInputElement).value)}>
              </label>

              <label>Vegetative Start:
                <input type="datetime-local" .value=${this._plantOverviewDialog.editedAttributes.veg_start || ''} 
                       @input=${(e: Event) => this._plantOverviewDialog!.editedAttributes.veg_start = (e.target as HTMLInputElement).value}>
              </label>

              <label>Flower Start:
                <input type="datetime-local" .value=${this._plantOverviewDialog.editedAttributes.flower_start || ''} 
                       @input=${(e: Event) => this._plantOverviewDialog!.editedAttributes.flower_start = (e.target as HTMLInputElement).value}>
              </label>
            </div>

            <ha-button slot="primaryAction" @click=${this._updatePlant}>Update</ha-button>
            <ha-button slot="secondaryAction" @click=${() => this._plantOverviewDialog = null}>Cancel</ha-button>
          </ha-dialog>
          
        ` : ''}
      </ha-card>
      <!-- strain library dialog -->
        ${this._strainLibraryDialog?.open ? html`
          <ha-dialog open heading="Strain Library" @closed=${() => this._strainLibraryDialog = null}>
            <div>
              <label>Add new strain:</label>
              <input type="text" .value=${this._strainLibraryDialog.newStrain}
                     @input=${(e: any) => this._strainLibraryDialog!.newStrain = e.target.value}>
              <ha-button variant="neutral" class="growspace-button" size="small" @click=${this._addStrain}>Add</ha-button>
            </div>
            </div>
            <div class="strain-list">
              ${this._strainLibraryDialog?.strains.map(s => html`
                <div class="strain-item">
                  <span>${s}</span>
                  <button 
                    class="remove-button"
                    title="Remove"
                    type="button"
                    @click=${() => this._removeStrain(s)}
                  >
                    <svg
                      class="remove-icon"
                      style="width:16px;height:16px;fill:currentColor;vertical-align:middle;"
                      viewBox="0 0 24 24"
                    >
                      <path d="${mdiClose}"></path>
                    </svg>
                  </button>
                </div>
              `)}
            </div>

            <ha-button variant="neutral" class="growspace-button" size="small" slot="secondaryAction" @click=${this._clearStrains}>Clear All</ha-button>
            <ha-button variant="neutral" class="growspace-button" size="small" slot="primaryAction" @click=${() => this._strainLibraryDialog = null}>Close</ha-button>
   
          </ha-dialog>
        `: ''}
    `;
  }

}
