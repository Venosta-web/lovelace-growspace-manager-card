import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';

// Define the card configuration interface
interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
}

// Plant interface based on entity attributes
interface PlantEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    device_id?: string;
    row?: number;
    col?: number;
    stage?: string;
    strain?: string;
    phenotype?: string;
    veg_days?: number;
    flower_days?: number;
    plant_name?: string;
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
  @state() private _addPlantDialog: { open: boolean; row: number; col: number; strain?: string } | null = null;
  public static async getConfigElement() {
    return document.createElement('div');
  }

  public static getStubConfig(): GrowspaceManagerCardConfig {
    return {
      type: 'custom:growspace-manager-card',
      title: 'Growspace Manager'
    };
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      
      ha-card {
        padding: 16px;
        --ha-card-border-radius: var(--ha-card-border-radius, 12px);
      }
      
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .selector-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .selector-container label {
        font-weight: 500;
        color: var(--primary-text-color);
      }
      
      select {
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-family: inherit;
        cursor: pointer;
        min-width: 150px;
      }
      
      select:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      
      .grid {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }
      
      .plant {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 8px);
        text-align: center;
        padding: 12px;
        background: var(--card-background-color);
        box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.12));
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        min-height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        cursor: pointer;
        aspect-ratio: 1 / 1;
        max-width: 90%;
        margin: 5% 5%;
      }
      
      .plant:hover {
        transform: translateY(-2px);
        box-shadow: var(--ha-card-box-shadow, 0 4px 8px rgba(0,0,0,0.15));
      }
      
      .plant.empty {
        background: var(--disabled-text-color);
        opacity: 0.3;
        border-style: dashed;
      }
      
      .plant-name {
        font-weight: 600;
        color: var(--primary-text-color);
        margin-bottom: 4px;
        font-size: 0.9em;
      }
      
      .plant-stage {
        color: var(--secondary-text-color);
        font-size: 0.8em;
        margin-bottom: 2px;
      }
      
      .plant-health {
        color: var(--secondary-text-color);
        font-size: 0.75em;
      }
      
      .plant-state {
        color: var(--accent-color);
        font-size: 0.75em;
        font-weight: 500;
      }
      
      .no-data {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 32px 16px;
        font-style: italic;
      }
      
      .debug-info {
        background: var(--code-editor-background-color, #f5f5f5);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px;
        margin: 16px 0;
        font-family: monospace;
        font-size: 0.8em;
      }
      
      .debug-info details {
        margin-top: 8px;
      }
      
      .debug-info pre {
        margin: 8px 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      .error {
        color: var(--error-color);
        padding: 16px;
        background: rgba(var(--error-color-rgb, 244, 67, 54), 0.1);
        border-radius: 8px;
        margin: 16px 0;
      }
    `;
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;
  @state() private selectedDevice: string | null = null;

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  private _getGrowspaceDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];

    const allStates = Object.values(this.hass.states);

    // First, collect all overview sensors
    const overviewSensors = allStates.filter(
      (entity: any) => entity.entity_id.endsWith('_overview')
    );

    // Then group plants by growspace_id (fallback to overview)
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

  private _getDeviceName(deviceId: string, plants: PlantEntity[]): string {
    // Extract device name from entity names
    if (plants.length > 0) {
      const firstEntity = plants[0];
      const entityName = firstEntity.attributes?.friendly_name || firstEntity.entity_id;

      // Try to extract growspace name from entity name
      // Look for patterns like "4x4_plant_0_0" -> "4x4" or "Growspace 4x4 Plant 1" -> "Growspace 4x4"
      const patterns = [
        /^([^_]+)_plant/i,  // "4x4_plant_0_0" -> "4x4"
        /^(.+?)\s+plant/i,  // "4x4 Plant 1" -> "4x4"
        /^(.*?)(?:\s+\d+)?$/i  // fallback pattern
      ];

      for (const pattern of patterns) {
        const match = entityName.match(pattern);
        if (match && match[1] && match[1] !== entityName) {
          return match[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      }

      // If no pattern matched, try to clean up the entity name
      return entityName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return deviceId === 'unknown' ? 'Unknown Growspace' : deviceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private _openAddPlantDialog(row: number, col: number) {
    this._addPlantDialog = { open: true, row, col };
  }
  private _addPlant() {
    if (!this._addPlantDialog || !this.selectedDevice) return;
    const { row, col, strain } = this._addPlantDialog;

    if (!strain) {
      alert('Please enter a strain!');
      return;
    }

    this.hass.callService('growspace_manager', 'add_plant', {
      growspace_id: this.selectedDevice,
      row: row + 1,   // integration uses 1-based index
      col: col + 1,
      strain
    }).then(() => {
      console.log('Add plant requested', { row, col, strain });
      this._addPlantDialog = null;
    }).catch(err => {
      console.error('Error calling growspace_manager.add_plant', err);
    });
  }

  private _createGridLayout(plants: PlantEntity[], rows: number, cols: number): { rows: number; cols: number; grid: (PlantEntity | null)[][] } {
    // Always create a full grid based on growspace definition
    const grid: (PlantEntity | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
    );

    // Place plants into their slots
    plants.forEach(plant => {
      const row = (plant.attributes?.row ?? 1) - 1; // shift to 0-based index
      const col = (plant.attributes?.col ?? 1) - 1;
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col] = plant;
      }
    });

    return { rows, cols, grid };
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`
      <ha-card>
        <div class="error">Home Assistant not available</div>
      </ha-card>
    `;
    }

    const devices = this._getGrowspaceDevices();

    if (!devices.length) {
      return html`
      <ha-card>
        <div class="no-data">No growspace devices found.</div>
      </ha-card>
    `;
    }

    // Set default selection
    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      this.selectedDevice = devices[0].device_id;
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">Selected device not found</div></ha-card>`;
    }

    const { rows, cols, grid } = this._createGridLayout(
      selectedDeviceData.plants,
      selectedDeviceData.rows,
      selectedDeviceData.plants_per_row
    );

    return html`
    <ha-card>
      <div class="header">
        ${this._config.title ? html`<h2>${this._config.title}</h2>` : ''}
        <div class="selector-container">
          <label for="device-select">Growspace:</label>
          <select
            id="device-select"
            .value=${this.selectedDevice}
            @change=${this._handleDeviceChange}
          >
            ${devices.map(device => html`
              <option value="${device.device_id}" ?selected=${device.device_id === this.selectedDevice}>
                ${device.name} (${device.plants.length} plants)
              </option>
            `)}
          </select>
        </div>
      </div>

      <div
        class="grid"
        style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);"
      >
        ${grid.flat().map((plant, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;

          if (!plant) {
            return html`
              <div 
                class="plant empty"
                style="grid-row: ${row + 1}; grid-column: ${col + 1};"
                title="Empty slot (${row}, ${col})"
                @click=${() => this._handleEmptyClick(row, col)}
              >
                <div class="plant-name">Empty</div>
                <div class="plant-stage">Empty</div>
              </div>
            `;
          }

          return html`
            <div
              class="plant"
              style="grid-row: ${row + 1}; grid-column: ${col + 1};"
              title="Click to view details"
              @click=${() => this._handlePlantClick(plant)}
            >
              <div class="plant-name">${plant.attributes?.strain}</div>
              <div class="phenotype">
                ${plant.attributes?.phenotype ? html`<div class="plant-phenotype">Phenotype: ${plant.attributes.phenotype}</div>` : ''}
              </div>
              <div class="plant-stage">${plant.state}</div>
              ${plant.attributes?.veg_days && plant.attributes?.stage === 'vegetative'
                ? html`<div class="plant-veg-days">Days in Veg: ${plant.attributes.veg_days}</div>`
                : ''}
              ${plant.attributes?.flower_days && plant.attributes?.stage === 'flowering'
                ? html`<div class="plant-flower-days">Days in Flower: ${plant.attributes.flower_days}</div>`
                : ''}
            </div>
          `;
        })}
      </div>
    </ha-card>

    ${this._addPlantDialog?.open ? html`
      <ha-dialog
        open
        @closed=${() => this._addPlantDialog = null}
        heading="Add Plant at Row ${this._addPlantDialog.row + 1}, Col ${this._addPlantDialog.col + 1}"
      >
        <div>
          <label for="strain-select">Enter strain:</label>
          <input
            id="strain-select"
            type="text"
            .value=${this._addPlantDialog.strain || ''}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              if (this._addPlantDialog) this._addPlantDialog.strain = target.value;
            }}
          >
        </div>
        <mwc-button slot="primaryAction" @click=${this._addPlant}>Add</mwc-button>
        <mwc-button slot="secondaryAction" @click=${() => this._addPlantDialog = null}>Cancel</mwc-button>
      </ha-dialog>
    ` : ''}
  `;
}

  // Add this helper method
  private _handleEmptyClick(row: number, col: number) {
    this._openAddPlantDialog(row, col);
  }
              

  private _handleDeviceChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.selectedDevice = target.value;
  }

  private _handlePlantClick(plant: PlantEntity): void {
    // Fire a custom event or show more info dialog
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: plant.entity_id }
    });
    this.dispatchEvent(event);
  }
}

// Register the card
declare global {
  interface HTMLElementTagNameMap {
    'growspace-manager-card': GrowspaceManagerCard;
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'growspace-manager-card',
  name: 'Growspace Manager Card',
  description: 'A card to manage and display growspace plants in a grid layout'
});

if (!customElements.get('growspace-manager-card')) {
  customElements.define('growspace-manager-card', GrowspaceManagerCard);
}