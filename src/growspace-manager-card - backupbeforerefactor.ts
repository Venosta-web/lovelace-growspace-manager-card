import { LitElement, html, css, CSSResultGroup, TemplateResult ,nothing} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';
import { mdiClose, mdiPlus, mdiDragHorizontalVariant, mdiSprout, mdiFlower, mdiCalendarClock, mdiDna, mdiCannabis, mdiHairDryer } from '@mdi/js';

interface GrowspaceManagerCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  default_growspace?: string;
  theme?: 'dark' | 'default' | 'green';
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
    dry_days?: number;
    cure_days?: number;
    veg_start?: string;
    flower_start?: string;
    dry_start?: string;
    cure_start?: string;
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
    dry_start?: string;
    cure_start?: string;
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
    strains: string[];
  } | null = null;
  
  @state() private selectedDevice: string | null = null;
  @state() private _draggedPlant: PlantEntity | null = null;
  @state() private _isCompactView: boolean = false;

  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceManagerCardConfig;

  private get _strainLibrary(): string[] {
    const strainSensor = Object.values(this.hass.states).find(s => s.entity_id.endsWith('_strain_library'));
    return strainSensor?.attributes?.strains || [];
  }

  // Plant stage colors for better visual feedback
  private _getPlantStageColor(state: string): string {
    switch (state.toLowerCase()) {
      case 'seedling': return '#4CAF50';
      case 'vegetative': return '#8BC34A';
      case 'flower': return '#FF9800';
      case 'dry': return '#795548';
      case 'cure': return '#9C27B0';
      default: return '#757575';
    }
  }

  private _getPlantStageIcon(state: string): string {
    switch (state.toLowerCase()) {
      case 'seedling': return mdiSprout;
      case 'vegetative': return mdiSprout;
      case 'flower': return mdiFlower;
      case 'dry': return mdiHairDryer;
      case 'cure': return mdiCannabis;
      default: return mdiSprout;
    }
  }
  
  private async _harvestPlant(plantId: string) {
    if (!this._plantOverviewDialog) return;
      const plant = this._plantOverviewDialog.plant;

    if (!plantId) {
      alert("Cannot determine plant ID.");
      return;
    }

    if (plant.state.toLowerCase() !== 'flower') {
      alert('Only flowering plants can be harvested.');
      return;
    }

    try {
      await this.hass.callService('growspace_manager', 'harvest_plant', {
        plant_id: plantId,
        target_growspace_name: 'dry', // backend resolves to ID
      });
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error('Error harvesting plant:', err);
    }
  }


  private async _finishDryingPlant() {
    if (!this._plantOverviewDialog) return;

    const plant = this._plantOverviewDialog.plant;

    if (plant.state.toLowerCase() !== 'dry') {
      alert('Only harvested plants can be finished drying.');
      return;
    }

    try {
      await this.hass.callService('growspace_manager', 'harvest_plant', {
        plant_id: plant.attributes?.plant_id || plant.entity_id.replace('sensor.', ''),
        target_growspace_name: 'cure', // your cure growspace ID
      });
      this._plantOverviewDialog = null;
    } catch (err) {
      console.error('Error finishing drying plant:', err);
    }
  }

  // Strain library methods (unchanged)
  private _openStrainLibraryDialog() {
    const currentStrains = this._strainLibrary || [];
    this._strainLibraryDialog = { open: true, newStrain: '', strains: currentStrains };
  }

  private async _addStrain() {
    if (!this._strainLibraryDialog?.newStrain) return;
    this._strainLibraryDialog.strains.push(this._strainLibraryDialog.newStrain);
    await this.hass.callService('growspace_manager', 'import_strain_library', {
      strains: this._strainLibraryDialog.strains,
      replace: true
    });
    this._strainLibraryDialog.newStrain = '';
  }

  private async _removeStrain(strain: string) {
    if (!this._strainLibraryDialog) return;
    this._strainLibraryDialog.strains = this._strainLibraryDialog.strains.filter(s => s !== strain);
    await this.hass.callService('growspace_manager', 'import_strain_library', {
      strains: this._strainLibraryDialog.strains,
      replace: true
    });
  }
  private async _handleDeletePlant(plantId: string) {
    if (!confirm("Are you sure you want to delete this plant?")) {
      return; // user clicked Cancel
    }

    try {
      await this.hass.callService("growspace_manager", "remove_plant", {
        plant_id: plantId,
      });
      // optional: close the dialog after deletion
    } catch (err) {
      console.error("Error deleting plant:", err);
    }
  }


  private async _clearStrains() {
    await this.hass.callService('growspace_manager', 'clear_strain_library', {});
  }

  // Configuration methods (unchanged)
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

  public getCardSize(): number { return 4; }

  static get styles(): CSSResultGroup {
    return css`
      :host { 
        display: block;
        --primary-gradient: linear-gradient(135deg, #4CAF50, #45a049);
        --secondary-gradient: linear-gradient(135deg, #2196F3, #1976D2);
        --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);
        --surface-elevation: 0 4px 8px rgba(0,0,0,0.12);
        --surface-elevation-hover: 0 8px 16px rgba(0,0,0,0.16);
        --border-radius: 12px;
        --spacing-xs: 4px;
        --spacing-sm: 8px;
        --spacing-md: 16px;
        --spacing-lg: 24px;
        --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      ha-card { 
        padding: var(--spacing-lg); 
        border-radius: var(--border-radius);
        backdrop-filter: blur(10px);
        box-shadow: var(--surface-elevation);
        transition: var(--transition);
      }

      ha-card:hover {
        box-shadow: var(--surface-elevation-hover);
      }

      ha-card.wide-growspace .plant-name,
      ha-card.wide-growspace .plant-stage,
      ha-card.wide-growspace .plant-phenotype {
        font-size: 0.9rem; 
      }

      /* Header Styles */
      .header { 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        margin-bottom: var(--spacing-lg);
        flex-wrap: wrap; 
        gap: var(--spacing-md);
        padding: var(--spacing-sm) 0;
        border-bottom: 2px solid var(--divider-color);
      }

      .header-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--primary-text-color);
        margin: 0;
      }

      .selector-container { 
        display: flex; 
        align-items: center; 
        gap: var(--spacing-sm);
        flex: 1;
      }
      div.no-data strong,
      .selected-growspace {
        text-transform: capitalize;
      }
      .growspace-select {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-family: inherit;
        font-size: 0.9rem;
        cursor: pointer;
        min-width: 180px;
        transition: var(--transition);
      }

      .growspace-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }
      

      /* Button Styles */
      .action-button {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: var(--border-radius);
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition);
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        text-decoration: none;
        background: var(--secondary-gradient);
        color: white;
        box-shadow: var(--surface-elevation);
      }

      .action-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--surface-elevation-hover);
      }

      .action-button.primary {
        background: var(--primary-gradient);
      }

      .action-button.danger {
        background: var(--danger-gradient);
      }

      .view-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }

      /* Grid Styles */
      .grid { 
        display: grid; 
        gap: var(--spacing-md); 
        margin-top: var(--spacing-lg);
        padding: var(--spacing-sm);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      /* Plant Card Styles */
      .plant { 
        border: 2px solid transparent;
        border-radius: var(--border-radius);
        text-align: center;
        padding: var(--spacing-md);
        background: var(--card-background-color);
        box-shadow: var(--surface-elevation);
        transition: var(--transition);
        min-height: 100px;
        display: flex;
        flex-direction: column;
        justify-content: center;
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
        background: var(--secondary-gradient);
        transition: var(--transition);
      }

      .plant:hover { 
        transform: translateY(-4px);
        box-shadow: var(--surface-elevation-hover);
        border-color: var(--secondary-gradient);
      }

      .plant.empty { 
        background: linear-gradient(135deg, rgba(var(--rgb-disabled-text-color, 158, 158, 158), 0.1), rgba(var(--rgb-disabled-text-color, 158, 158, 158), 0.05));
        border: 2px dashed var(--divider-color);
        opacity: 0.7;
      }

      .plant.empty:hover {
        opacity: 1;
        background: linear-gradient(135deg, rgba(var(--rgb-primary-color), 0.1), rgba(var(--rgb-primary-color), 0.05));
        border-color: var(--primary-color);
      }

      .plant.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      .grid.compact .plant-header {
        margin-top: inherit;
      }
      .plant-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-xs);
        margin-top: auto;
      }
      .plant.empty .plant-header {
        margin-top: inherit;
      }

      .plant-icon {
        width: 2rem;
        height: 2rem;
        fill: var(--stage-color, #757575);
      }

      .plant-name { 
        font-weight: 600;
        color: var(--primary-text-color);
        font-size: 2rem;
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage { 
        color: var(--stage-color, #757575);
        font-size: 2rem;
        font-weight: 500;
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        color: var(--secondary-text-color);
        font-size: 1.2rem;
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.2rem;
        color: var(--secondary-text-color);
        margin-top: auto;
      }
      .plant.empty .plant-days {
        margin: auto;
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
        font-size: 0.85rem;
      }

      .compact .plant-days {
        font-size: 0.65rem;
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

      /* Utility Classes */
      .no-data { 
        text-align: center;
        color: var(--secondary-text-color);
        padding: var(--spacing-lg);
        font-style: italic;
        background: rgba(var(--rgb-secondary-text-color), 0.05);
        border-radius: var(--border-radius);
        margin: var(--spacing-md) 0;
      }

      .error { 
        color: var(--error-color);
        padding: var(--spacing-md);
        background: rgba(var(--rgb-error-color), 0.1);
        border: 1px solid rgba(var(--rgb-error-color), 0.2);
        border-radius: var(--border-radius);
        margin: var(--spacing-md) 0;
      }

      /* Responsive Design */
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

      /* Animation keyframes */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .plant {
        animation: fadeIn 0.3s ease-out;
      }
    `;
  }

  // Data methods (unchanged core logic)
  private _getGrowspaceDevices(): GrowspaceDevice[] {
    if (!this.hass) return [];
    const allStates = Object.values(this.hass.states);
    const overviewSensors = allStates.filter((entity: any) => entity.entity_id.endsWith('_overview'));

    // Start with an entry for each overview sensor so empty growspaces are included
    const deviceGroups = new Map<string, PlantEntity[]>();
    overviewSensors.forEach((ov: any) => {
      const gid = ov.attributes?.growspace_id ?? ov.entity_id;
      deviceGroups.set(gid, []);
    });

    // Collect plants and add them to their growspace group (will create group if missing)
    allStates.forEach((entity: any) => {
      if (entity.attributes?.row !== undefined && entity.attributes?.col !== undefined) {
        const growspaceId =
          entity.attributes?.growspace_id ||
          overviewSensors.find(ov => ov.entity_id.startsWith(entity.entity_id.split('_')[0]))?.attributes?.growspace_id ||
          'unknown';

        if (!deviceGroups.has(growspaceId)) deviceGroups.set(growspaceId, []);
        deviceGroups.get(growspaceId)!.push(entity as PlantEntity);
      }
    });

    // Build devices array from the groups (keeps empty arrays too)
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

  // Event handlers (enhanced)
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
      dry_start: today,
      cure_start: today,
    };
  }

  private _confirmAddPlant() {
    if (!this._addPlantDialog || !this.selectedDevice) return;
    if (!this._addPlantDialog.strain) { alert('Please enter a strain!'); return; }

    const vegStart = this._addPlantDialog.veg_start || new Date().toISOString().slice(0, 16);
    const flowerStart = this._addPlantDialog.flower_start || new Date().toISOString().slice(0, 16);
    const dryStart = this._addPlantDialog.dry_start || new Date().toISOString().slice(0, 16);
    const cureStart = this._addPlantDialog.cure_start || new Date().toISOString().slice(0, 16);

    this.hass.callService('growspace_manager', 'add_plant', {
      growspace_id: this.selectedDevice,
      row: this._addPlantDialog.row + 1,
      col: this._addPlantDialog.col + 1,
      strain: this._addPlantDialog.strain,
      phenotype: this._addPlantDialog.phenotype,
      veg_start: vegStart,
      flower_start: flowerStart,
      dry_start: dryStart,
      cure_start: cureStart,
    }).then(() => { this._addPlantDialog = null; })
      .catch(err => console.error('Error calling growspace_manager.add_plant', err));
  }

  private async _updatePlant() {
    if (!this._plantOverviewDialog) return;
    const attrs = this._plantOverviewDialog.editedAttributes;
    const payload: any = { plant_id: this._plantOverviewDialog.plant.attributes?.plant_id || this._plantOverviewDialog.plant.entity_id.replace('sensor.', '') };

    ['strain', 'phenotype', 'row', 'col', 'veg_start', 'flower_start', 'dry_start', 'cure_start']
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

  // Drag and drop handlers (enhanced with visual feedback)
  private _handleDragStart(e: DragEvent, plant: PlantEntity) {
    this._draggedPlant = plant;
    e.dataTransfer?.setData("text/plain", JSON.stringify({ id: plant.entity_id }));
    // Add visual feedback
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
    if (!devices.length) return;

    if (!this.selectedDevice) {
      // Try default config
      let defaultDevice: GrowspaceDevice | undefined;
      if (this._config?.default_growspace) {
        defaultDevice = devices.find(d =>
          d.device_id === this._config.default_growspace ||
          d.name === this._config.default_growspace
        );
      }
      this.selectedDevice = defaultDevice?.device_id || devices[0].device_id;
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;

    const devices = this._getGrowspaceDevices();
    if (!devices.length) return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;

    // Apply default growspace logic (unchanged)
    if (!this._defaultApplied && this._config?.default_growspace) {
      const match = devices.find(d =>
        d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
      );
      if (match) this.selectedDevice = match.device_id;
      this._defaultApplied = true;
    }

    if (!this.selectedDevice || !devices.find(d => d.device_id === this.selectedDevice)) {
      if (!this._config?.default_growspace) {
        this.selectedDevice = devices[0].device_id;
      } else {
        const match = devices.find(d =>
          d.device_id === this._config.default_growspace || d.name === this._config.default_growspace
        );
        if (match) this.selectedDevice = match.device_id;
      }
    }

    const selectedDeviceData = devices.find(d => d.device_id === this.selectedDevice);

      if (!selectedDeviceData) {
        return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
      }

      // If growspace exists but has no plants, show explicit message
      if ((selectedDeviceData.plants ?? []).length === 0) {
        return html`
          <ha-card>
            <div class="no-data" style="text-align:center; padding: 1.5rem;">
              Growspace <strong>${selectedDeviceData.name}</strong> is currently empty.
            </div>
          </ha-card>
        `;
      }

      const plants = selectedDeviceData.plants!;
      //set default displayed rows
      const plantsPerRow = selectedDeviceData.plants_per_row;
      var effectiveRows = selectedDeviceData.plants_per_row;
      // if growspace name is dry or cure show rows dynamic
      if(selectedDeviceData.name === "dry Overview" || selectedDeviceData.name === "cure Overview") {
        // Calculate maximum row currently used
        const maxRowUsed = plants.length > 0
          ? Math.max(...plants.map(p => p.attributes?.row || 1))
          : 1;

        // Get how many plants per row this growspace allows
        const plantsPerRow = selectedDeviceData.plants_per_row;

        // Count how many plants are in the last row
        const lastRowCount = plants.filter(p => (p.attributes?.row || 1) === maxRowUsed).length;

        // If the last row is full, allow one more row to display
        effectiveRows = lastRowCount >= plantsPerRow
          ? maxRowUsed + 1
          : maxRowUsed;
      }
      

      // Build grid with compact rows
      const { rows, cols, grid } = this._createGridLayout(
        plants,
        effectiveRows,
        plantsPerRow,
      );
      const isWide = cols > 6;
    return html`
      <ha-card class=${isWide ? 'wide-growspace' : ''}>
        <div class="header">
          ${this._config?.title ? html`<h2 class="header-title">${this._config.title}</h2>` : ''}
          
          <div class="selector-container">
            ${!this._config?.default_growspace ? html`
              <label for="device-select">Growspace:</label>
              <select 
                id="device-select" 
                class="growspace-select"
                .value=${this.selectedDevice} 
                @change=${this._handleDeviceChange}
              >
                ${devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
              </select>
            ` : html`<span class="selected-growspace"> ${devices.find(d => d.device_id === this.selectedDevice)?.name}</span>`}
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

        <div class="grid ${this._isCompactView ? 'compact' : ''}" 
             style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
          ${grid.flat().map((plant, index) => {
            const row = Math.floor(index / cols) + 1;
            const col = (index % cols) + 1;
            
            if (!plant) {
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

            const stageColor = this._getPlantStageColor(plant.state);
            const stageIcon = this._getPlantStageIcon(plant.state);
            
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
                <div class="plant-name">${plant.attributes?.strain || 'Unknown'}</div>
                ${plant.attributes?.phenotype ? html`<div class="plant-phenotype">${plant.attributes.phenotype}</div>` : ''}
                <div class="plant-stage">${plant.state}</div>
                
                ${!this._isCompactView ? html`
                  <div class="plant-days">
                    ${plant.attributes?.veg_days ? html`
                      <span title="Days in Vegetative">
                        <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiSprout}"></path>
                        </svg>
                        ${plant.attributes.veg_days}d
                      </span>
                    ` : ''}
                    ${plant.attributes?.flower_days ? html`
                      <span title="Days in Flower">
                        <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiFlower}"></path>
                        </svg>
                        ${plant.attributes.flower_days}d
                      </span>
                    ` : ''}
                    ${plant.attributes?.dry_days ? html`
                      <span title="Days in Dry">
                        <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiHairDryer}"></path>
                        </svg>
                        ${plant.attributes.dry_days}d
                      </span>
                    ` : ''}
                    ${plant.attributes?.cure_days ? html`
                      <span title="Days in Cure">
                        <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiCannabis}"></path>
                        </svg>
                        ${plant.attributes.cure_days}d
                      </span>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          })}
        </div>

        

        
      </ha-card>
      <!-- Enhanced Add Plant Dialog -->
        ${this._addPlantDialog?.open ? html`
          <ha-dialog
            open
            @closed=${() => this._addPlantDialog = null}
            heading="Add New Plant"
            .scrimClickAction=${''}
            .escapeKeyAction=${''}
          >
            <div class="dialog-content">
              <div class="form-group">
                <label>
                  <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                    <path d="${mdiDna}"></path>
                  </svg>
                  Strain *
                </label>
                <select 
                  class="form-input"
                  .value=${this._addPlantDialog.strain} 
                  @change=${(e: Event) => {
                    const target = e.target as HTMLSelectElement;
                    if (this._addPlantDialog) this._addPlantDialog.strain = target.value;
                  }}
                >
                  <option value="">Select a strain...</option>
                  ${this._strainLibrary.map(s => html`
                    <option value="${s}" ?selected=${this._addPlantDialog?.strain === s}>${s}</option>
                  `)}
                </select>
              </div>

              <div class="form-group">
                <label>Phenotype</label>
                <input 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., Pheno #1, Purple variant..."
                  .value=${this._addPlantDialog.phenotype || ''} 
                  @input=${(e: Event) => {
                    const target = e.target as HTMLInputElement;
                    if (this._addPlantDialog) this._addPlantDialog.phenotype = target.value;
                  }} 
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${mdiCalendarClock}"></path>
                    </svg>
                    Vegetative Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.veg_start || ''} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._addPlantDialog) this._addPlantDialog.veg_start = target.value;
                    }} 
                  />
                </div>

                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${mdiFlower}"></path>
                    </svg>
                    Flower Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.flower_start || ''} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._addPlantDialog) this._addPlantDialog.flower_start = target.value;
                    }} 
                  />
                </div>
                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${mdiFlower}"></path>
                    </svg>
                    Dry Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.dry_start || ''} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._addPlantDialog) this._addPlantDialog.dry_start = target.value;
                    }} 
                  />
                </div>
                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${mdiFlower}"></path>
                    </svg>
                    Cure Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.cure_start || ''} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._addPlantDialog) this._addPlantDialog.cure_start = target.value;
                    }} 
                  />
                </div>
              </div>

              <div style="background: rgba(var(--rgb-primary-color), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--primary-color);">
                <strong>Position:</strong> Row ${this._addPlantDialog.row + 1}, Column ${this._addPlantDialog.col + 1}
              </div>
            </div>

            <button class="action-button primary" slot="primaryAction" @click=${this._confirmAddPlant}>
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiSprout}"></path>
              </svg>
              Add Plant
            </button>
            <button class="action-button" slot="secondaryAction" @click=${() => this._addPlantDialog = null}>
              Cancel
            </button>
          </ha-dialog>
        ` : ''}

        <!-- Enhanced Plant Overview Dialog -->
        ${this._plantOverviewDialog?.open ? html`
          <ha-dialog
            open
            @closed=${() => this._plantOverviewDialog = null}
            heading=" ${this._plantOverviewDialog.editedAttributes.strain || 'Plant'} Details"
            .scrimClickAction=${''}
            .escapeKeyAction=${''}
          >
            <div class="dialog-content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Strain</label>
                  <input 
                    type="text" 
                    class="form-input"
                    .value=${this._plantOverviewDialog.editedAttributes.strain || ''} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._plantOverviewDialog) this._plantOverviewDialog.editedAttributes.strain = target.value;
                    }}
                  />
                </div>

                <div class="form-group">
                  <label>Phenotype</label>
                  <input 
                    type="text" 
                    class="form-input"
                    .value=${this._plantOverviewDialog.editedAttributes.phenotype || ''} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._plantOverviewDialog) this._plantOverviewDialog.editedAttributes.phenotype = target.value;
                    }}
                  />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Row</label>
                  <input 
                    type="number" 
                    class="form-input"
                    min="1"
                    .value=${this._plantOverviewDialog.editedAttributes.row || 1} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._plantOverviewDialog) this._plantOverviewDialog.editedAttributes.row = parseInt(target.value);
                    }}
                  />
                </div>

                <div class="form-group">
                  <label>Column</label>
                  <input 
                    type="number" 
                    class="form-input"
                    min="1"
                    .value=${this._plantOverviewDialog.editedAttributes.col || 1} 
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._plantOverviewDialog) this._plantOverviewDialog.editedAttributes.col = parseInt(target.value);
                    }}
                  />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <!-- Only render Veg Start when plant stage is "veg" or "flower" -->
                ${this._plantOverviewDialog.editedAttributes.stage === "veg" ||
                  this._plantOverviewDialog.editedAttributes.stage === "flower"
                  ? html`
                      <div class="form-group">
                        <label>Vegetative Start</label>
                        <input
                          type="datetime-local"
                          class="form-input"
                          .value=${this._plantOverviewDialog.editedAttributes.veg_start || ""}
                          @input=${(e: Event) => {
                            const target = e.target as HTMLInputElement;
                            if (this._plantOverviewDialog)
                              this._plantOverviewDialog.editedAttributes.veg_start =
                                target.value;
                          }}
                        />
                      </div>
                    `
                  : nothing}

                  <div class="form-group">
                    <label>Flower Start</label>
                    <input 
                      type="datetime-local" 
                      class="form-input"
                      .value=${this._plantOverviewDialog.editedAttributes.flower_start || ''} 
                      @input=${(e: Event) => {
                        const target = e.target as HTMLInputElement;
                        if (this._plantOverviewDialog) this._plantOverviewDialog.editedAttributes.flower_start = target.value;
                      }}
                    />
                  </div>

                <!-- Only render Dry Start when plant stage is "dry" or "cure" -->
                ${this._plantOverviewDialog.editedAttributes.stage === "dry" ||
                  this._plantOverviewDialog.editedAttributes.stage === "cure"
                  ? html`
                      <div class="form-group">
                        <label>Dry Start</label>
                        <input
                          type="datetime-local"
                          class="form-input"
                          .value=${this._plantOverviewDialog.editedAttributes.dry_start || ""}
                          @input=${(e: Event) => {
                            const target = e.target as HTMLInputElement;
                            if (this._plantOverviewDialog)
                              this._plantOverviewDialog.editedAttributes.dry_start =
                                target.value;
                          }}
                        />
                      </div>
                    `
                  : nothing}

                <!-- Only render Cure Start when plant stage is "cure" -->
                ${this._plantOverviewDialog.editedAttributes.stage === "cure"
                  ? html`
                      <div class="form-group">
                        <label>Cure Start</label>
                        <input
                          type="datetime-local"
                          class="form-input"
                          .value=${this._plantOverviewDialog.editedAttributes.cure_start || ""}
                          @input=${(e: Event) => {
                            const target = e.target as HTMLInputElement;
                            if (this._plantOverviewDialog)
                              this._plantOverviewDialog.editedAttributes.cure_start =
                                target.value;
                          }}
                        />
                      </div>
                    `
                  : nothing}
                </div>
              </div>

              ${this._plantOverviewDialog.plant.attributes?.veg_days || this._plantOverviewDialog.plant.attributes?.flower_days ? html`
                <div style="background: rgba(var(--rgb-info-color, 33, 150, 243), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--info-color, #2196F3);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>Current Stage:</strong> ${this._plantOverviewDialog.plant.state}</span>
                    <div style="display: flex; gap: var(--spacing-md);">
                      ${this._plantOverviewDialog.plant.attributes?.veg_days ? html`
                        <span>${this._plantOverviewDialog.plant.attributes.veg_days} days veg</span>
                      ` : ''}
                      ${this._plantOverviewDialog.plant.attributes?.flower_days ? html`
                        <span>${this._plantOverviewDialog.plant.attributes.flower_days} days flower</span>
                      ` : ''}
                      ${this._plantOverviewDialog.plant.attributes?.dry_days ? html`
                        <span>${this._plantOverviewDialog.plant.attributes.dry_days} days drying</span>
                      ` : ''}
                      ${this._plantOverviewDialog.plant.attributes?.cure_days ? html`
                        <span>${this._plantOverviewDialog.plant.attributes.cure_days} days curing</span>
                      ` : ''}
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>

            <button class="action-button primary" slot="primaryAction" @click=${this._updatePlant}>
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"></path>
              </svg>
              Update Plant
            </button>
            <button class="action-button" slot="secondaryAction" @click=${() => this._handleDeletePlant(this._plantOverviewDialog!.plant.attributes?.plant_id)}>
              Remove Plant
            </button>
            <button class="action-button" slot="secondaryAction" @click=${() => this._plantOverviewDialog = null}>
              Cancel
            </button>
            ${this._plantOverviewDialog.plant.state.toLowerCase() === 'flower' ? html`            
              <button class="action-button primary" @click=${() => this._harvestPlant(this._plantOverviewDialog!.plant.attributes?.plant_id)}>
                Harvest
              </button>
            ` : ''}

            ${this._plantOverviewDialog.plant.state.toLowerCase() === 'dry' ? html`
              <button class="action-button primary" @click=${this._finishDryingPlant}>
                Finish Drying
              </button>
            ` : ''}
          </ha-dialog>
        ` : ''}
      <!-- Enhanced Strain Library Dialog -->
        ${this._strainLibraryDialog?.open ? html`
          <ha-dialog 
            open 
            heading="Strain Library Management" 
            @closed=${() => this._strainLibraryDialog = null}
            .scrimClickAction=${''}
            .escapeKeyAction=${'close'}
            .className = ${'strain-dialog'}
          >
            <div class="dialog-content">
              <div class="strain-library-header">
                <div class="strain-input-group">
                  <input 
                    type="text" 
                    class="form-input"
                    placeholder="Enter new strain name..."
                    .value=${this._strainLibraryDialog.newStrain}
                    @input=${(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      if (this._strainLibraryDialog) this._strainLibraryDialog.newStrain = target.value;
                    }}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') this._addStrain();
                    }}
                  />
                  <button class="action-button primary" @click=${this._addStrain}>
                    <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiPlus}"></path>
                    </svg>
                    Add
                  </button>
                </div>
              </div>

              ${this._strainLibraryDialog.strains.length > 0 ? html`
                <div class="strain-list">
                  ${this._strainLibraryDialog.strains.map(strain => html`
                    <div class="strain-item">
                      <span class="strain-name">${strain}</span>
                      <button 
                        class="remove-button"
                        title="Remove ${strain}"
                        @click=${() => this._removeStrain(strain)}
                      >
                        <svg class="remove-icon" viewBox="0 0 24 24">
                          <path d="${mdiClose}"></path>
                        </svg>
                      </button>
                    </div>
                  `)}
                </div>
              ` : html`
                <div class="no-data">
                  No strains in library. Add some strains to get started!
                </div>
              `}
            </div>

            <button class="action-button danger" slot="secondaryAction" @click=${this._clearStrains}>
              Clear All
            </button>
            <button class="action-button" slot="primaryAction" @click=${() => this._strainLibraryDialog = null}>
              Done
            </button>
          </ha-dialog>
        ` : ''}
    `;
  }
}