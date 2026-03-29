import { LitElement, html, css, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiPlus,
  mdiClose,
  mdiMagnify,
  mdiDelete,
  mdiCheck,
  mdiContentCopy,
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiTuneVariant,
  mdiLeaf,
  mdiArrowLeft,
  mdiCloudUpload,
  mdiPencil,
  mdiDownload,
  mdiBrain,
  mdiCamera,
  mdiImage,
  mdiViewDashboard,
  mdiChevronLeft,
  mdiChevronRight,
  mdiDotsVertical,
  mdiAccountGroup,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, CropMeta, SeedBatch, PollinationEvent } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/gs-help-tooltip';

@customElement('strain-library-dialog')
export class StrainLibraryDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ type: Object }) editingStrain?: StrainEntry;
  @property({ type: String }) source?: string;
  @property({ type: Object }) returnPayload?: unknown;

  @state() private _view: 'browse' | 'editor' = 'browse';
  @state() private _searchQuery = '';
  @state() private _editorState: Partial<StrainEntry> = {};
  @state() private _isCropping = false;
  @state() private _isImageSelectorOpen = false;
  @state() private _importDialogOpen = false;
  @state() private _mobileMenuOpen = false;
  @state() private _pendingDeleteKey: string | null = null;

  @state() private _importReplace = false;

  @state() private _breederDialogOpen = false;
  @state() private _breederEditorState: { name: string; logo: string; originalName: string } | null = null;
  @state() private _pendingDeleteBreeder: string | null = null;

  // Seeds & Genetics tab state
  @property({ type: Array }) seedBatches: SeedBatch[] = [];
  @property({ type: Array }) pollinationEvents: PollinationEvent[] = [];
  @property({ type: Array }) plants: GrowspaceDevice[] = [];
  @property({ type: String }) initialTab: 'strains' | 'seeds' = 'strains';
  @property({ type: Function }) onSeedDataChanged?: () => void;
  @property({ attribute: false }) onAddSeedBatch?: (data: {
    strain_name: string;
    breeder: string;
    quantity: number;
    acquisition_date: string;
    generation: string;
    parent_1_strain?: string | null;
    parent_1_phenotype?: string | null;
    parent_2_strain?: string | null;
    parent_2_phenotype?: string | null;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onUpdateSeedBatch?: (data: {
    batch_id: string;
    strain_name?: string;
    breeder?: string;
    quantity?: number;
    acquisition_date?: string;
    generation?: string;
    lineage?: string;
    parent_1_strain?: string | null;
    parent_1_phenotype?: string | null;
    parent_2_strain?: string | null;
    parent_2_phenotype?: string | null;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onLogPollination?: (data: {
    date: string; donor_plant_id: string; receiver_plant_id: string; notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onHarvestSeeds?: (data: {
    event_id: string; quantity: number; notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onUpdatePollination?: (data: {
    event_id: string; date?: string; donor_plant_id?: string; receiver_plant_id?: string; notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onDeletePollination?: (event_id: string) => Promise<void>;

  @state() private _activeMainTab: 'strains' | 'seeds' = 'strains';
  @state() private _seedSubView: 'list' | 'add-batch' | 'log-pollination' | 'harvest' = 'list';
  @state() private _editingBatchId: string | null = null;
  @state() private _editingEventId: string | null = null;
  @state() private _confirmDeleteEventId: string | null = null;
  @state() private _submitError: string | null = null;
  @state() private _selectedEventId: string | null = null;
  @state() private _batchForm = {
    strain_name: '',
    breeder: '',
    quantity: 1,
    acquisition_date: '',
    generation: 'F1',
    parent_1_key: '',
    parent_2_key: '',
    notes: '',
  };
  @state() private _pollinationForm = {
    date: '', donor_plant_id: '', receiver_plant_id: '', notes: ''
  };
  @state() private _harvestForm = { quantity: 1, notes: '' };

  // Pagination State
  @state() private _currentPage = 1;
  private readonly ITEMS_PER_PAGE = 15;

  private get _flowerVegPlants(): Array<{ plant_id: string; label: string }> {
    const ELIGIBLE_STAGES = ['flower', 'veg'];
    return this.plants.flatMap((device) =>
      device.plants
        .filter((p) => ELIGIBLE_STAGES.includes(p.attributes.stage))
        .map((p) => {
          const stage = p.attributes.stage;
          const stageDays = p.attributes[`${stage}_days` as keyof typeof p.attributes] as number | null | undefined;
          const daysStr = stageDays != null ? ` · Day ${stageDays}` : '';
          const strain = p.attributes.strain ?? '';
          const phenotype = p.attributes.phenotype;
          const phenoStr = phenotype ? ` (${phenotype})` : '';
          const label = `${strain}${phenoStr} · ${stage}${daysStr} · ${device.name}`;
          return { plant_id: p.attributes.plant_id, label };
        })
    );
  }

  private _getPlantLabel(plant_id: string): string {
    for (const device of this.plants) {
      for (const p of device.plants) {
        if (p.attributes.plant_id === plant_id) {
          const strain = p.attributes.strain ?? '';
          const phenotype = p.attributes.phenotype;
          return phenotype ? `${strain} (${phenotype})` : (strain || plant_id);
        }
      }
    }
    return plant_id;
  }

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Auto-open editor if editingStrain is provided
    if (changedProps.has('editingStrain') && this.editingStrain) {
      this._startEdit(this.editingStrain);
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('initialTab')) {
      this._activeMainTab = this.initialTab;
    }
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        --accent-green: #4caf50;
        /* Using dialogStyles variables where possible */
      }

      ha-dialog {
        --mdc-dialog-min-width: 80vw;
        --mdc-dialog-max-width: 95vw;
        --dialog-surface-margin: 24px;
        --dialog-content-padding: 0;
        --dialog-scrollable-header-padding: 0;
      }

      /* Additional specific styles */

      /* Layout Overrides */
      .strain-dialog-container {
        @apply .glass-dialog-container;
      }

      .glass-dialog-container {
        width: 80vw;
        max-width: 95vw;
        height: 85vh;
      }

      @media (min-width: 601px) {
        .dialog-header {
          justify-content: space-between;
        }
        .dialog-header .dialog-title-group {
          flex: none;
        }
      }

      .sd-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .sd-footer {
        padding: 16px 24px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      /* GRID & CARDS */
      .sd-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }
      .strain-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        cursor: pointer;
      }
      .strain-card:hover {
        border-color: var(--accent-green);
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
      }
      .sc-thumb {
        height: 180px;
        background: var(--card-background-color, #222);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color, #444);
        position: relative;
      }
      .sc-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .sc-content {
        padding: 16px;
        flex: 1;
      }
      .sc-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--primary-text-color, #fff);
      }
      .sc-type-row {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--accent-green);
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .sc-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .sc-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .strain-card:hover .sc-actions {
        opacity: 1;
      }
      @media (hover: none) {
        .sc-actions {
          opacity: 1;
        }
      }
      .sc-action-btn {
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        cursor: pointer;
      }
      .sc-action-btn:hover {
        background: var(--accent-green);
      }

      /* SEARCH BAR */
      .search-bar-container {
        margin-bottom: 24px;
      }
      .search-input-wrapper {
        position: relative;
        margin-bottom: 12px;
      }
      .search-input-wrapper svg {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color);
        pointer-events: none;
      }
      .search-bar-input {
        width: 100%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        padding: 14px 14px 14px 48px;
        color: var(--primary-text-color, #fff);
        font-size: 1rem;
        outline: none;
        box-sizing: border-box;
        font-family: inherit;
      }
      .search-bar-input:focus {
        border-color: var(--accent-green);
        background: rgba(255, 255, 255, 0.08);
      }

      /* FORMS */
      .sd-form-group {
        margin-bottom: 20px;
      }
      .sd-label {
        display: block;
        color: var(--primary-text-color, --secondary-text-color);
        font-size: 0.85rem;
        margin-bottom: 8px;
        font-weight: 500;
      }
      .sd-input,
      .sd-textarea,
      .sd-select {
        width: 100%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--primary-text-color, #fff);
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .sd-input:focus,
      .sd-textarea:focus,
      .sd-select:focus {
        border-color: var(--accent-green);
      }
      .sd-textarea {
        resize: vertical;
        min-height: 100px;
      }

      /* EDITOR LAYOUT */
      .editor-layout {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 32px;
      }

      /* PHOTO UPLOAD */
      .photo-upload-area {
        border: 2px dashed var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.02));
        height: 240px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
      }
      .photo-upload-area:hover {
        border-color: var(--accent-green);
        background: rgba(76, 175, 80, 0.05);
      }
      .select-library-btn {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10;
        cursor: pointer;
      }
      .select-library-btn:hover {
        background: var(--accent-green);
        border-color: var(--accent-green);
      }

      /* Crop Overlay */
      .crop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .crop-viewport {
        width: 300px;
        height: 300px;
        border: 2px solid var(--accent-green);
        overflow: hidden;
        position: relative;
        cursor: move;
        box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.7);
      }
      .crop-controls {
        margin-top: 20px;
        width: 300px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .crop-slider {
        width: 100%;
        accent-color: var(--accent-green);
      }

      /* Type Selector */
      .type-selector-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .type-option {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        text-align: center;
      }
      .type-option:hover {
        border-color: #666;
      }
      .type-option.active {
        background: var(--secondary-background-color, rgba(76, 175, 80, 0.1));
        border-color: var(--accent-green);
        color: var(--primary-text-color, #fff);
      }
      .type-option svg {
        width: 28px;
        height: 28px;
        fill: var(--secondary-text-color);
      }
      .type-option.active svg {
        fill: var(--accent-green);
      }

      /* Hybrid Graph */
      .hg-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        margin-top: 8px;
        font-family: 'Roboto', sans-serif;
      }
      .hg-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--primary-text-color, #fff);
        margin-bottom: 2px;
      }
      .hg-bar-track {
        height: 18px;
        width: 100%;
        background: #333;
        border-radius: 2px;
        position: relative;
        overflow: hidden;
        display: flex;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        cursor: pointer;
      }
      .hg-bar-indica {
        background: #8b5cf6; /* Purple */
        height: 100%;
        transition: width 0.2s ease;
      }
      .hg-bar-sativa {
        background: #eab308; /* Yellow */
        height: 100%;
        flex: 1;
        transition: width 0.2s ease;
      }
      .hg-tick {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.4);
        pointer-events: none;
      }

      .hg-num-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--secondary-text-color);
        color: var(--primary-text-color, #fff);
        width: 36px;
        text-align: center;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0;
      }
      .hg-num-input:focus {
        outline: none;
        border-bottom-color: var(--accent-green);
      }

      /* Pagination */
      .pagination-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-top: 24px;
        padding-bottom: 8px;
      }
      .pagination-text {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        font-weight: 500;
      }
      .pagination-btn {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        color: var(--primary-text-color, #fff);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .pagination-btn:hover:not(:disabled) {
        border-color: var(--accent-green);
        color: var(--accent-green);
        background: rgba(255, 255, 255, 0.1);
      }
      .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: transparent;
      }

      /* Mobile Responsive */
      @media (max-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 95vw;
          --mdc-dialog-max-width: 95vw;
        }
        .glass-dialog-container {
          width: 95vw;
          height: 90vh;
          max-width: 95vw;
        }
        .sd-header {
          padding: 16px;
        }
        .sd-content {
          padding: 16px;
        }
        .sd-grid {
          grid-template-columns: 1fr;
        }
        .sd-footer {
          display: none;
        }
        .fab-btn {
          display: flex;
        }
        .editor-layout {
          grid-template-columns: 1fr;
        }
      }
      .fab-btn {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: var(--accent-green);
        color: #fff;
        border: none;
        box-shadow: 0 4px 8px 3px rgba(0, 0, 0, 0.15);
        display: none; /* Hidden on desktop */
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 20;
      }

      .sd-textarea {
        width: 100%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px;
        color: var(--primary-text-color, #fff);
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        font-size: 1rem;
      }
      .sd-textarea:focus {
        border-color: var(--accent-green);
        outline: none;
        background: rgba(255, 255, 255, 0.08);
      }

      /* Mobile menu */
      .mobile-menu {
        position: absolute;
        top: 60px;
        right: 16px;
        background: var(--card-background-color, #2d2d2d);
        border-radius: 4px;
        padding: 8px 0;
        min-width: 200px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        z-index: 30;
      }
      .mobile-menu-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--primary-text-color, #fff);
        cursor: pointer;
      }
      .mobile-menu-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .mobile-menu-item svg {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color);
      }
      .menu-overlay {
        position: absolute;
        inset: 0;
        z-index: 25;
      }

      /* Breeder Dialog */
      .breeder-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .breeder-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .breeder-card:hover {
        border-color: var(--accent-green);
        background: rgba(255, 255, 255, 0.08);
      }
      .breeder-logo-preview {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        object-fit: contain;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px;
        flex-shrink: 0;
      }
      .breeder-logo-placeholder {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        border: 1px dashed var(--divider-color);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }
      .breeder-info {
        flex: 1;
        min-width: 0;
      }
      .breeder-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color, #fff);
        margin: 0 0 4px 0;
      }
      .breeder-strain-count {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .breeder-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }

      /* Main tab bar */
      .main-tab-bar {
        display: flex;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        background: var(--secondary-background-color, rgba(0,0,0,0.2));
        flex-shrink: 0;
      }
      .tab-btn {
        flex: 1;
        padding: 14px 16px;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s;
        font-family: inherit;
      }
      .tab-btn.active {
        color: var(--accent-green, #4caf50);
        border-bottom-color: var(--accent-green, #4caf50);
      }
      .tab-btn:hover:not(.active) {
        color: var(--primary-text-color);
      }

      /* Seeds section */
      .seeds-section {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .seeds-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 16px 0 12px 0;
      }
      .seeds-header:first-child {
        margin-top: 0;
      }
      .seeds-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .seed-batch-card {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 10px;
      }
      .seed-batch-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }
      .seed-batch-name {
        font-weight: 700;
        font-size: 1rem;
        color: var(--primary-text-color);
      }
      .seed-batch-edit-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        padding: 0;
        transition: background 0.15s, color 0.15s;
      }
      .seed-batch-edit-btn:hover {
        background: var(--divider-color, rgba(255,255,255,0.1));
        color: var(--primary-text-color);
      }
      .seed-batch-edit-btn svg {
        fill: currentColor;
      }
      .seed-batch-meta {
        font-size: 0.82rem;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
      }
      .seed-batch-parents {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
      }
      .seed-batch-parent-chip {
        font-size: 0.78rem;
        color: var(--primary-text-color);
        background: var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 6px;
        padding: 2px 7px;
      }
      .seed-batch-parent-sep {
        font-size: 0.78rem;
        color: var(--secondary-text-color);
        font-weight: 600;
      }
      .seed-batch-lineage {
        font-size: 0.8rem;
        color: var(--accent-green, #4caf50);
        margin-bottom: 4px;
      }
      .seed-batch-notes {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-style: italic;
      }
      .pollination-card {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .pollination-date {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--primary-text-color);
      }
      .pollination-plants {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }
      .pollination-notes {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-style: italic;
      }
      .pollination-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pollination-card-actions {
        display: flex;
        gap: 4px;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--secondary-text-color);
        padding: 2px;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      .icon-btn:hover {
        color: var(--primary-text-color);
        background: var(--divider-color, rgba(255,255,255,0.08));
      }
      .icon-btn.danger:hover {
        color: var(--error-color, #f44336);
      }
      .delete-confirm-text {
        font-size: 0.75rem;
        color: var(--error-color, #f44336);
        align-self: center;
      }
      .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.78rem;
        font-weight: 600;
        margin-top: 4px;
      }
      .badge.success {
        background: rgba(76, 175, 80, 0.15);
        color: var(--accent-green, #4caf50);
      }
      .empty-state {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        margin: 8px 0 16px 0;
      }

      /* Form view */
      .form-view {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 4px;
      }
      .form-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .form-view label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .form-view input {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
        border-radius: 8px;
        padding: 10px 14px;
        color: var(--primary-text-color, #fff);
        font-size: 0.95rem;
        outline: none;
        font-family: inherit;
      }
      .form-view input:focus {
        border-color: var(--accent-green, #4caf50);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
      }
      .form-error {
        color: var(--error-color, #f44336);
        font-size: 0.85rem;
        margin: 4px 0 0;
      }
    `,
  ];

  private _startEdit(strain?: StrainEntry) {
    if (strain) {
      this._editorState = { ...strain };
    } else {
      this._editorState = {
        strain: '',
        phenotype: '',
        breeder: '',
        type: 'Hybrid',
        flowering_days_min: 60,
        flowering_days_max: 70,
        lineage: '',
        sex: 'Feminized',
        description: '',
        image: '',
        breeder_logo: '',
        sativa_percentage: 50,
        indica_percentage: 50,
      };
    }
    this._view = 'editor';
  }

  private _handleSave() {
    if (!this._editorState.strain) return;

    // Save to backend
    this.dispatchEvent(new CustomEvent('save-strain', { detail: this._editorState }));

    // If opened from a specific source, we might want to return there immediately
    if (this.source) {
      this.dispatchEvent(
        new CustomEvent('strain-created-at-source', {
          detail: {
            strain: this._editorState,
            source: this.source,
            returnPayload: this.returnPayload,
          },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this._view = 'browse';
    }
  }

  private _handleDelete(key: string) {
    this._pendingDeleteKey = key;
  }

  private _confirmDelete() {
    if (this._pendingDeleteKey) {
      this.dispatchEvent(
        new CustomEvent('delete-strain', { detail: { key: this._pendingDeleteKey } })
      );
      this._pendingDeleteKey = null;
    }
  }

  private _cancelDelete() {
    this._pendingDeleteKey = null;
  }

  private _handleEditorChange(field: string, value: string | number | CropMeta | undefined) {
    let newState = { ...this._editorState, [field]: value };

    // Auto-propagate breeder logo if breeder changes
    if (field === 'breeder' && typeof value === 'string' && value.trim()) {
      const existing = this.strains.find(
        (s) => s.breeder?.toLowerCase() === value.trim().toLowerCase() && !!s.breeder_logo
      );
      if (existing) {
        newState.breeder_logo = existing.breeder_logo;
      }
    }

    this._editorState = newState;
  }

  private _handlePrintLabel() {
    const s = this._editorState;
    if (!s.strain) return;

    this.dispatchEvent(
      new CustomEvent('open-print-label', {
        detail: {
          strainName: s.strain,
          phenotype: s.phenotype,
          lineage: s.lineage,
          breeder: s.breeder,
          breederLogo: s.breeder_logo,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleCropMode(active: boolean) {
    this._isCropping = active;
  }

  private _toggleImageSelector(isOpen: boolean) {
    this._isImageSelectorOpen = isOpen;
  }

  private _handleSelectLibraryImage(imageUrl: string) {
    this._editorState = { ...this._editorState, image: imageUrl };

    // Find existing crop meta
    const existing = this.strains.find((s) => s.image === imageUrl && !!s.image_crop_meta);
    if (existing && existing.image_crop_meta) {
      this._editorState.image_crop_meta = { ...existing.image_crop_meta };
    } else {
      delete this._editorState.image_crop_meta;
    }

    this._isImageSelectorOpen = false;
  }

  private _handleImportFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.dispatchEvent(
          new CustomEvent('import-library', {
            detail: { file, replace: this._importReplace },
          })
        );
        this._importDialogOpen = false;
      }
    };
    input.click();
  }

  private getCropStyle(image: string, meta?: CropMeta) {
    if (!meta) return `background-image: url('${image}')`;
    return `
      background-image: url('${image}');
      background-size: ${meta.scale * 100}%;
      background-position: ${meta.x}% ${meta.y}%;
    `;
  }

  private getImgStyle(meta?: CropMeta): string {
    if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
    return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
  }

  private _getUniqueBreeders(): Array<{ name: string; logo: string; strainCount: number }> {
    const breederMap = new Map<string, { logo: string; strainCount: number }>();
    this.strains.forEach((s) => {
      if (s.breeder && s.breeder.trim()) {
        const existing = breederMap.get(s.breeder);
        if (existing) {
          existing.strainCount++;
          if (!existing.logo && s.breeder_logo) {
            existing.logo = s.breeder_logo;
          }
        } else {
          breederMap.set(s.breeder, {
            logo: s.breeder_logo || '',
            strainCount: 1,
          });
        }
      }
    });
    return [...breederMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <ha-dialog
        open
        @closed=${() => this.dispatchEvent(new CustomEvent('close'))}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container">
          ${this._renderTabBar()}
          ${this._activeMainTab === 'seeds'
            ? this._renderSeedsTab()
            : (this._view === 'browse' ? this.renderBrowseView() : this.renderEditorView())
          }
        </div>

        ${this._isCropping ? this.renderCropOverlay() : nothing}
        ${this._isImageSelectorOpen ? this.renderImageSelector() : nothing}
        ${this._importDialogOpen ? this.renderImportDialog() : nothing}
        ${this._pendingDeleteKey ? this.renderDeleteConfirmation() : nothing}
        ${this._breederDialogOpen ? this.renderBreederDialog() : nothing}
        ${this._pendingDeleteBreeder ? this.renderBreederDeleteConfirmation() : nothing}
      </ha-dialog>
    `;
  }

  private renderBrowseView(): TemplateResult {
    const query = (this._searchQuery || '').toLowerCase();
    const terms = query.split(/\s+/).filter((t) => t.length > 0);
    const filteredStrains = this.strains
      .filter((s) => {
        if (terms.length === 0) return true;
        const searchText = `${s.strain} ${s.breeder || ''} ${s.phenotype || ''}`.toLowerCase();
        return terms.every((term) => searchText.includes(term));
      })
      .sort((a, b) => a.strain.localeCompare(b.strain));

    // Pagination Logic
    const totalPages = Math.ceil(filteredStrains.length / this.ITEMS_PER_PAGE);

    if (this._currentPage > totalPages && totalPages > 0) {
      this._currentPage = totalPages;
    }
    if (this._currentPage < 1) this._currentPage = 1;

    const startIndex = (this._currentPage - 1) * this.ITEMS_PER_PAGE;
    const paginatedStrains = filteredStrains.slice(startIndex, startIndex + this.ITEMS_PER_PAGE);

    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
          <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiLeaf}"></path>
          </svg>
        </div>
        <div class="dialog-title-group">
          <div style="display:flex;align-items:center;gap:6px;">
            <h2 class="dialog-title">Strain Library</h2>
            <gs-help-tooltip
              content="Browse and manage your strain database. Assign genetics to plants for tracking lineage and expected traits."
              placement="bottom"
              label="Strain Library"
            ></gs-help-tooltip>
          </div>
        </div>

        <div class="header-actions" style="display:flex; gap:8px;">
          <button
            class="md3-button text"
            @click=${() => (this._mobileMenuOpen = !this._mobileMenuOpen)}
            style="min-width:auto; padding:8px; margin-left: auto;"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDotsVertical}"></path>
            </svg>
          </button>
          <style>
            @media (max-width: 600px) {
              button[style*='mdiDotsVertical'] {
                display: flex !important;
              }
            }
          </style>

          <button
            class="md3-button text close"
            @click=${() => this.dispatchEvent(new CustomEvent('close'))}
            style="min-width:auto; padding:8px; margin-left: auto;"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiClose}"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="sd-content">
        <div class="search-bar-container">
          <div class="search-input-wrapper">
            <md3-text-input
              placeholder="Search Strains by Name, Breeder..."
              .value=${this._searchQuery}
              @change=${(e: CustomEvent) => {
        this._searchQuery = e.detail;
        this._currentPage = 1;
      }}
            ></md3-text-input>
          </div>
        </div>

        <div class="sd-grid">
          ${paginatedStrains.map((strain) => this.renderStrainCard(strain))}
        </div>

        ${filteredStrains.length === 0
        ? html`
              <div
                class="empty-state"
                style="text-align:center; padding: 40px; color: var(--secondary-text-color);"
              >
                <svg
                  style="width:48px;height:48px;fill:currentColor; opacity:0.5;"
                  viewBox="0 0 24 24"
                >
                  <path d="${mdiMagnify}"></path>
                </svg>
                <p>No strains found matching "${query}"</p>
              </div>
            `
        : nothing}
        ${totalPages > 1
        ? html`
              <div class="pagination-container">
                <button
                  class="pagination-btn"
                  ?disabled=${this._currentPage === 1}
                  @click=${() => this._currentPage--}
                >
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiChevronLeft}"></path>
                  </svg>
                </button>
                <span class="pagination-text">Page ${this._currentPage} of ${totalPages}</span>
                <button
                  class="pagination-btn"
                  ?disabled=${this._currentPage === totalPages}
                  @click=${() => this._currentPage++}
                >
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiChevronRight}"></path>
                  </svg>
                </button>
              </div>
            `
        : nothing}
      </div>

      <!-- Mobile Menu Dropdown -->
      ${this._mobileMenuOpen
        ? html`
            <div class="menu-overlay" @click=${() => (this._mobileMenuOpen = false)}></div>
            <div class="mobile-menu">
              <div
                class="mobile-menu-item"
                @click=${() => {
            this._startEdit();
            this._mobileMenuOpen = false;
          }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg> New Strain
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
            this.dispatchEvent(new CustomEvent('get-recommendation'));
            this._mobileMenuOpen = false;
          }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg> Get Recommendation
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
            this._importDialogOpen = true;
            this._mobileMenuOpen = false;
          }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg> Import Strains
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
            this.dispatchEvent(new CustomEvent('export-library'));
            this._mobileMenuOpen = false;
          }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiDownload}"></path></svg> Export Strains
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
            this._breederDialogOpen = true;
            this._mobileMenuOpen = false;
          }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiAccountGroup}"></path></svg> Manage Breeders
              </div>
            </div>
          `
        : nothing}

      <!-- Mobile FAB -->
      <button class="fab-btn" @click=${() => this._startEdit()}>
        <svg style="fill:currentColor; width: 24px; height: 24px;" viewBox="0 0 24 24">
          <path d="${mdiPlus}"></path>
        </svg>
      </button>

      <div class="sd-footer">
        <button
          class="md3-button tonal"
          @click=${() => this.dispatchEvent(new CustomEvent('get-recommendation'))}
        >
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiBrain}"></path>
          </svg>
          Get Recommendation
        </button>
        <button class="md3-button tonal" @click=${() => (this._breederDialogOpen = true)}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiAccountGroup}"></path>
          </svg>
          Manage Breeders
        </button>
        <button class="md3-button tonal" @click=${() => (this._importDialogOpen = true)}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiCloudUpload}"></path>
          </svg>
          Import Strains
        </button>
        <button
          class="md3-button tonal"
          @click=${() => this.dispatchEvent(new CustomEvent('export-library'))}
        >
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiDownload}"></path>
          </svg>
          Export Strains
        </button>
        <button class="md3-button primary" @click=${() => this._startEdit()}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiPlus}"></path>
          </svg>
          New Strain
        </button>
      </div>
    `;
  }

  private renderStrainCard(strain: StrainEntry): TemplateResult {
    let typeIcon = mdiLeaf;
    const typeLabel = strain.type || 'Unknown';
    const lowerType = (strain.type || '').toLowerCase();

    if (lowerType.includes('indica')) typeIcon = mdiWeatherNight;
    else if (lowerType.includes('sativa')) typeIcon = mdiWeatherSunny;
    else if (lowerType.includes('hybrid')) typeIcon = mdiTuneVariant;

    return html`
      <div class="strain-card" @click=${() => this._startEdit(strain)}>
        <div class="sc-thumb">
          ${strain.image
        ? html`<img
                src="${strain.image}"
                loading="lazy"
                alt="${strain.strain}"
                style="${this.getImgStyle(strain.image_crop_meta)}"
              />`
        : html`<svg
                style="width:48px;height:48px;opacity:0.2;fill:currentColor;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiLeaf}"></path>
              </svg>`}
          <div class="sc-actions">
            <button
              class="sc-action-btn"
              @click=${(e: Event) => {
        e.stopPropagation();
        this._handleDelete(strain.key);
      }}
            >
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiDelete}"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="sc-content">
          <h3 class="sc-title">
            ${strain.strain} ${strain.phenotype ? `(${strain.phenotype})` : ''}
          </h3>
          <div class="sc-type-row">
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${typeIcon}"></path>
            </svg>
            <span>${typeLabel}</span>
          </div>
          <div class="sc-meta">
            ${strain.flowering_days_min
        ? html`<span
                  >Flowering: ${strain.flowering_days_min}-${strain.flowering_days_max || '?'}
                  Days</span
                >`
        : nothing}
            ${strain.breeder
        ? html`
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${strain.breeder_logo
            ? html`<img
                          src="${strain.breeder_logo}"
                          style="width: 20px; height: 20px; object-fit: contain; border-radius: 2px; background: rgba(255,255,255,0.05); padding: 2px;"
                        />`
            : nothing}
                    <span>Breeder: ${strain.breeder}</span>
                  </div>
                `
        : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderEditorView(): TemplateResult {
    const s = this._editorState;
    const isEdit =
      !!s.strain &&
      this.strains.some((ex) => ex.strain === s.strain && ex.phenotype === s.phenotype);
    const uniqueStrains = [...new Set(this.strains.map((st) => st.strain).filter(Boolean))].sort();
    const uniqueBreeders = [
      ...new Set(this.strains.map((st) => st.breeder).filter(Boolean)),
    ].sort();

    const handleFileChange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then((base64) => this._handleEditorChange('image', base64))
          .catch((err) => console.error('Error compressing image:', err));
      }
    };

    return html`
      <datalist id="strain-suggestions">
        ${uniqueStrains.map((name) => html`<option value="${name}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
        ${uniqueBreeders.map((name) => html`<option value="${name}"></option>`)}
      </datalist>

      <div class="dialog-header">
        <div class="dialog-title-group" style="display:flex; align-items:center; gap:16px;">
          <button
            class="md3-button tonal"
            style="padding: 0 12px; height: 32px;"
            @click=${() => (this._view = 'browse')}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor; margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiArrowLeft}"></path>
            </svg>
            Back
          </button>
          <h2 class="dialog-title">${isEdit ? 'Edit Strain' : 'Add New Strain'}</h2>
        </div>
        <button
          class="md3-button text close"
          @click=${() => this.dispatchEvent(new CustomEvent('close'))}
          style="min-width:auto; padding:8px; margin-left: auto;"
        >
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiClose}"></path>
          </svg>
        </button>
      </div>

      <div class="sd-content">
        <div class="editor-layout">
          <!-- LEFT COL: IDENTITY -->
          <div class="editor-col">
            <div
              class="photo-upload-area"
              @click=${(e: Event) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest('.crop-btn') &&
          !target.closest('.select-library-btn') &&
          !target.closest('.md3-button')
        ) {
          (e.currentTarget as HTMLElement).querySelector('input')?.click();
        }
      }}
              @dragover=${(e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }}
              @drop=${(e: DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) {
          PlantUtils.compressImage(file)
            .then((base64) => this._handleEditorChange('image', base64))
            .catch((err) => console.error('Error compressing image:', err));
        }
      }}
            >
              <button
                class="select-library-btn"
                @click=${(e: Event) => {
        e.stopPropagation();
        this._toggleImageSelector(true);
      }}
              >
                <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiViewDashboard}"></path>
                </svg>
                Select from Library
              </button>

              ${s.image
        ? html`
                    ${s.image_crop_meta
            ? html`<div
                          style="width:100%; height:100%; border-radius:10px; ${this.getCropStyle(
              s.image,
              s.image_crop_meta
            )}; background-repeat: no-repeat;"
                        ></div>`
            : html`<img
                          src="${s.image}"
                          style="width:100%; height:100%; object-fit:cover; border-radius:10px;"
                        />`}

                    <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                      <button
                        class="crop-btn"
                        style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                        @click=${(e: Event) => {
            e.stopPropagation();
            this._toggleCropMode(true);
          }}
                        title="Crop Image"
                      >
                        <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiContentCopy}"></path>
                        </svg>
                      </button>
                      <div
                        style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;"
                      >
                        <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24">
                          <path d="${mdiPencil}"></path>
                        </svg>
                      </div>
                    </div>
                  `
        : html`
                    <div style="display: flex; gap: 16px; align-items: center;">
                      <div
                        style="display: flex; flex-direction: column; align-items: center; gap: 8px;"
                      >
                        <button
                          class="md3-button tonal"
                          @click=${(e: Event) =>
            (
              (e.currentTarget as HTMLElement)
                .nextElementSibling as HTMLInputElement
            ).click()}
                        >
                          <svg
                            style="width:24px;height:24px;fill:currentColor;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiCamera}"></path>
                          </svg>
                          Camera
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style="display:none"
                          @change=${handleFileChange}
                        />
                      </div>

                      <div
                        style="display: flex; flex-direction: column; align-items: center; gap: 8px;"
                      >
                        <button
                          class="md3-button tonal"
                          @click=${(e: Event) =>
            (
              (e.currentTarget as HTMLElement)
                .nextElementSibling as HTMLInputElement
            ).click()}
                        >
                          <svg
                            style="width:24px;height:24px;fill:currentColor;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiImage}"></path>
                          </svg>
                          Gallery
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          style="display:none"
                          @change=${handleFileChange}
                        />
                      </div>
                    </div>
                    <span style="font-size:0.8rem; margin-top:12px; opacity: 0.7;"
                      >(Or Drag & Drop)</span
                    >
                  `}
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Strain Name *</label>
              <input
                type="text"
                class="sd-input"
                list="strain-suggestions"
                .value=${s.strain || ''}
                @input=${(e: InputEvent) => this._handleEditorChange('strain', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Phenotype</label>
              <input
                type="text"
                class="sd-input"
                placeholder="e.g. #1 (Optional)"
                .value=${s.phenotype || ''}
                @input=${(e: InputEvent) => this._handleEditorChange('phenotype', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Breeder/Seedbank</label>
              <input
                type="text"
                class="sd-input"
                list="breeder-suggestions"
                .value=${s.breeder || ''}
                @input=${(e: InputEvent) =>
        this._handleEditorChange('breeder', (e.target as HTMLInputElement).value)}
              />

              <!-- Breeder Logo Upload -->
              <div
                class="breeder-logo-upload"
                style="margin-top: 12px; display: flex; align-items: center; gap: 12px;"
              >
                ${s.breeder_logo
        ? html`
                      <img
                        src="${s.breeder_logo}"
                        style="width: 48px; height: 48px; object-fit: contain; border-radius: 4px; background: rgba(255,255,255,0.05); padding: 4px;"
                      />
                    `
        : html`
                      <div
                        style="width: 48px; height: 48px; border: 1px dashed var(--divider-color); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color);"
                      >
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiImage}"></path>
                        </svg>
                      </div>
                    `}
                <button
                  class="md3-button tonal"
                  style="height: 32px; padding: 0 12px; font-size: 0.8rem;"
                  @click=${(e: Event) =>
        ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}
                >
                  <svg
                    style="width:16px;height:16px;fill:currentColor; margin-right:6px;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiCloudUpload}"></path>
                  </svg>
                  ${s.breeder_logo ? 'Change Logo' : 'Upload Logo'}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  style="display:none"
                  @change=${(e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          PlantUtils.compressImage(file)
            .then((base64) => this._handleEditorChange('breeder_logo', base64))
            .catch((err) => console.error('Error compressing logo:', err));
        }
      }}
                />
                ${s.breeder_logo
        ? html`
                      <button
                        class="md3-button text"
                        style="height: 32px; padding: 0 8px; color: var(--error-color, #ff5252);"
                        @click=${() => this._handleEditorChange('breeder_logo', '')}
                      >
                        <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiDelete}"></path>
                        </svg>
                      </button>
                    `
        : nothing}
              </div>
            </div>
          </div>

          <!-- RIGHT COL: GENETICS -->
          <div class="editor-col">
            <div class="sd-form-group">
              <label class="sd-label">Type *</label>
              <div class="type-selector-grid">
                ${['Indica', 'Sativa', 'Hybrid', 'Ruderalis'].map((t) => {
          let icon = mdiLeaf;
          if (t === 'Indica') icon = mdiWeatherNight;
          if (t === 'Sativa') icon = mdiWeatherSunny;
          if (t === 'Hybrid') icon = mdiTuneVariant;

          const isActive = (s.type || '').toLowerCase() === t.toLowerCase();
          return html`
                    <div
                      class="type-option ${isActive ? 'active' : ''}"
                      @click=${() => this._handleEditorChange('type', t)}
                    >
                      <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                      <span class="type-label" style="font-size:0.85rem; font-weight:500;"
                        >${t}</span
                      >
                    </div>
                  `;
        })}
              </div>
            </div>

            ${(s.type || '').toLowerCase() === 'hybrid'
        ? html`
                  <div style="margin-bottom: 20px;">
                    <label class="sd-label">Hybrid Composition (%)</label>
                    <div
                      class="hg-container"
                      style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;"
                    >
                      <div class="hg-labels">
                        <div
                          class="hg-input-label"
                          style="display:flex; align-items:center; gap:4px;"
                        >
                          <span>Indica:</span>
                          <input
                            class="hg-num-input"
                            type="number"
                            min="0"
                            max="100"
                            .value=${s.indica_percentage || 0}
                            @input=${(e: InputEvent) => {
            let val = Math.floor(parseFloat((e.target as HTMLInputElement).value)) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            this._handleEditorChange('indica_percentage', val);
            this._handleEditorChange('sativa_percentage', 100 - val);
          }}
                          />
                          <span>%</span>
                        </div>
                        <div
                          class="hg-input-label"
                          style="display:flex; align-items:center; gap:4px;"
                        >
                          <span>Sativa:</span>
                          <input
                            class="hg-num-input"
                            type="number"
                            min="0"
                            max="100"
                            .value=${s.sativa_percentage || 0}
                            @input=${(e: InputEvent) => {
            let val = Math.floor(parseFloat((e.target as HTMLInputElement).value)) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            this._handleEditorChange('sativa_percentage', val);
            this._handleEditorChange('indica_percentage', 100 - val);
          }}
                          />
                          <span>%</span>
                        </div>
                      </div>

                      <div
                        class="hg-bar-track"
                        @click=${(e: MouseEvent) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            let percent = Math.round((x / rect.width) * 100);
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            this._handleEditorChange('indica_percentage', percent);
            this._handleEditorChange('sativa_percentage', 100 - percent);
          }}
                      >
                        <div
                          class="hg-bar-indica"
                          style="width: ${s.indica_percentage || 0}%"
                        ></div>
                        <div class="hg-bar-sativa"></div>
                        <div class="hg-tick" style="left: 25%"></div>
                        <div class="hg-tick" style="left: 50%"></div>
                        <div class="hg-tick" style="left: 75%"></div>
                      </div>
                    </div>
                  </div>
                `
        : nothing}

            <div class="sd-form-group">
              <label class="sd-label">Flowering Time (Days)</label>
              <div style="display:flex; gap:16px;">
                <input
                  type="number"
                  class="sd-input"
                  placeholder="Min"
                  .value=${s.flowering_days_min || ''}
                  @input=${(e: InputEvent) =>
        this._handleEditorChange('flowering_days_min', (e.target as HTMLInputElement).value)}
                />
                <input
                  type="number"
                  class="sd-input"
                  placeholder="Max"
                  .value=${s.flowering_days_max || ''}
                  @input=${(e: InputEvent) =>
        this._handleEditorChange('flowering_days_max', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Lineage</label>
              <input
                type="text"
                class="sd-input"
                .value=${s.lineage || ''}
                @input=${(e: InputEvent) => this._handleEditorChange('lineage', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Sex</label>
              <div style="display:flex; gap:20px; padding: 8px 0;">
                ${['Feminized', 'Regular'].map(
          (sex) => html`
                    <label
                      style="display:flex; align-items:center; gap:8px; cursor:pointer; color:var(, white);"
                    >
                      <input
                        type="radio"
                        name="sex_radio"
                        .checked=${s.sex === sex}
                        @change=${() => this._handleEditorChange('sex', sex)}
                        style="accent-color: var(--accent-green); transform: scale(1.2);"
                      />
                      ${sex}
                    </label>
                  `
        )}
              </div>
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Description</label>
              <textarea
                class="sd-textarea"
                .value=${s.description || ''}
                @input=${(e: InputEvent) => this._handleEditorChange('description', (e.target as HTMLTextAreaElement).value)}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="sd-footer" style="justify-content: space-between;">
        ${s.key
        ? html`
              <button
                class="md3-button text"
                style="color: var(--error-color, #f44336);"
                @click=${() => this._handleDelete(s.key!)}
              >
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiDelete}"></path>
                </svg>
                Delete
              </button>
            `
        : html`<div></div>`}

        <div style="display:flex; gap:12px;">
          ${s.strain ? html`
            <button class="md3-button outlined" @click=${this._handlePrintLabel}>
              <svg style="width:18px;height:18px;fill:currentColor; margin-right:4px;" viewBox="0 0 24 24">
                <path d="${mdiDownload}"></path>
              </svg>
              Print Label
            </button>
          ` : nothing}
          <button class="md3-button tonal" @click=${() => (this._view = 'browse')}>Cancel</button>
          <button class="md3-button primary" @click=${() => this._handleSave()}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiCheck}"></path>
            </svg>
            Save Strain
          </button>
        </div>
      </div>
    `;
  }

  private renderCropOverlay(): TemplateResult | typeof nothing {
    const s = this._editorState;
    if (!s.image) return nothing;

    const meta = s.image_crop_meta || { x: 50, y: 50, scale: 1 };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newScale = Math.min(Math.max(meta.scale + delta, 1), 5);
      this._handleEditorChange('image_crop_meta', { ...meta, scale: newScale });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const startX = e.clientX;
      const startY = e.clientY;
      const startMetaX = meta.x;
      const startMetaY = meta.y;

      const onMouseMove = (ev: MouseEvent) => {
        const deltaX = (startX - ev.clientX) * (0.2 / meta.scale);
        const deltaY = (startY - ev.clientY) * (0.2 / meta.scale);
        const newX = Math.min(Math.max(startMetaX + deltaX, 0), 100);
        const newY = Math.min(Math.max(startMetaY + deltaY, 0), 100);
        this._handleEditorChange('image_crop_meta', { ...meta, x: newX, y: newY });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    return html`
      <div class="crop-overlay">
        <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
        <div
          class="crop-viewport"
          @wheel=${handleWheel}
          @mousedown=${handleMouseDown}
          @dragstart=${(e: DragEvent) => e.preventDefault()}
        >
          <div
            style="width: 100%; height: 100%;
              background-image: url('${s.image}');
              background-size: ${meta.scale * 100}%;
              background-position: ${meta.x}% ${meta.y}%;
              background-repeat: no-repeat;
              pointer-events: none;"
          ></div>
        </div>

        <div class="crop-controls">
          <div style="display:flex; justify-content:space-between; color:#ccc; font-size:0.8rem;">
            <span>Zoom: ${(meta.scale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            class="crop-slider"
            min="1"
            max="5"
            step="0.1"
            .value=${meta.scale.toString()}
            @input=${(e: Event) =>
        this._handleEditorChange('image_crop_meta', {
          ...meta,
          scale: parseFloat((e.target as HTMLInputElement).value),
        })}
          />

          <div style="display:flex; gap:12px; margin-top:12px;">
            <button
              class="md3-button tonal"
              style="flex:1"
              @click=${() => this._toggleCropMode(false)}
            >
              Done
            </button>
          </div>
          <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
            Drag to pan • Scroll to zoom
          </div>
        </div>
      </div>
    `;
  }

  private renderImageSelector(): TemplateResult {
    const imageMap = new Map<string, { strain: string; phenotype: string }[]>();
    this.strains.forEach((s) => {
      if (s.image) {
        if (!imageMap.has(s.image)) {
          imageMap.set(s.image, []);
        }
        imageMap.get(s.image)!.push({ strain: s.strain, phenotype: s.phenotype || '' });
      }
    });

    return html`
      <div class="crop-overlay">
        <div
          class="glass-dialog-container"
          style="width: 80%; max-width: 800px; height: 80%; max-height: 600px;"
        >
          <div class="dialog-header">
            <div class="dialog-title-group">
              <h2 class="dialog-title">Select from Library</h2>
            </div>
            <button
              class="md3-button text"
              @click=${() => this._toggleImageSelector(false)}
              style="min-width:auto; padding:8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>
          <div class="sd-content" style="overflow-y: auto;">
            <div
              style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;"
            >
              ${[...imageMap.entries()].map(
      ([img, infoList]) => html`
                  <div
                    style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                    @click=${() => this._handleSelectLibraryImage(img)}
                  >
                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                    <div
                      style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;"
                    >
                      ${infoList.map(
        (info, index) => html`
                          <div
                            style="${index < infoList.length - 1
            ? 'margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);'
            : ''}"
                          >
                            <div style="font-weight: 700;">Strain: ${info.strain}</div>
                            <div style="opacity: 0.9;">Pheno: ${info.phenotype || 'N/A'}</div>
                          </div>
                        `
      )}
                    </div>
                  </div>
                `
    )}
            </div>
            ${imageMap.size === 0
        ? html`<p
                  style="text-align: center; color: var(--secondary-text-color); margin-top: 40px;"
                >
                  No images found in library.
                </p>`
        : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderImportDialog(): TemplateResult {
    return html`
      <div class="crop-overlay">
        <div class="glass-dialog-container" style="width: 400px; max-width: 90vw; height: auto;">
          <div class="dialog-header">
            <div class="dialog-title-group">
              <h2 class="dialog-title">Import Strains</h2>
            </div>
            <button
              class="md3-button text"
              @click=${() => (this._importDialogOpen = false)}
              style="min-width:auto; padding:8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div style="padding: 24px;">
            <div
              style="font-size: 0.9rem; color: var(--secondary-text-color); line-height: 1.5; margin-bottom: 20px;"
            >
              Select a ZIP file containing your strain library export. You can either merge the new
              strains with your existing library or replace it entirely.
            </div>

            <div
              style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;"
            >
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <input
                  type="radio"
                  name="import_mode"
                  .checked=${!this._importReplace}
                  @change=${() => (this._importReplace = false)}
                  style="accent-color: var(--accent-green); transform: scale(1.2);"
                />
                <div>
                  <div style="font-weight: 600;">Merge</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text-color);">
                    Add new strains, keep existing ones.
                  </div>
                </div>
              </label>

              <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>

              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <input
                  type="radio"
                  name="import_mode"
                  .checked=${this._importReplace}
                  @change=${() => (this._importReplace = true)}
                  style="accent-color: var(--accent-green); transform: scale(1.2);"
                />
                <div>
                  <div style="font-weight: 600;">Replace</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text-color);">
                    Overwrite entire library with import.
                  </div>
                </div>
              </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
              <button class="md3-button tonal" @click=${() => (this._importDialogOpen = false)}>
                Cancel
              </button>
              <button class="md3-button primary" @click=${() => this._handleImportFile()}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiCloudUpload}"></path>
                </svg>
                Select File
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderDeleteConfirmation(): TemplateResult {
    return html`
      <div class="crop-overlay">
        <div
          class="glass-dialog-container"
          style="width: 400px; height: auto; padding: 24px; display: flex; flex-direction: column;"
        >
          <h2 class="dialog-title">Delete Strain?</h2>
          <p
            style="color: var(--secondary-text-color); margin: 16px 0; font-size: 1rem; line-height: 1.5;"
          >
            Are you sure you want to delete this strain? This action cannot be undone.
          </p>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
            <button class="md3-button tonal" @click=${this._cancelDelete}>Cancel</button>
            <button class="md3-button text" style="color: #f44336;" @click=${this._confirmDelete}>
              <svg
                style="width:18px;height:18px;fill:currentColor;margin-right:8px;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiDelete}"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBreederDialog(): TemplateResult {
    const breeders = this._getUniqueBreeders();

    return html`
      <div class="crop-overlay">
        <div class="glass-dialog-container" style="width: 600px; max-width: 90vw; height: 80vh; max-height: 80vh;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiAccountGroup}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Breeder Manager</h2>
            </div>
            <button
              class="md3-button text close"
              @click=${() => { this._breederDialogOpen = false; this._breederEditorState = null; }}
              style="min-width:auto; padding:8px; margin-left: auto;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="sd-content">
            ${this._breederEditorState
              ? this.renderBreederEditor()
              : this.renderBreederList(breeders)}
          </div>

          ${!this._breederEditorState ? html`
            <div class="sd-footer">
              <span style="font-size:0.8rem; color:var(--secondary-text-color); padding: 0 8px;">
                Breeders appear automatically when strains with breeder info are saved.
              </span>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private renderBreederList(breeders: Array<{ name: string; logo: string; strainCount: number }>): TemplateResult {
    if (breeders.length === 0) {
      return html`
        <div style="text-align:center; padding:40px; color:var(--secondary-text-color);">
          <svg style="width:48px;height:48px;fill:currentColor;opacity:0.5;" viewBox="0 0 24 24">
            <path d="${mdiAccountGroup}"></path>
          </svg>
          <p>No breeders found. Add strains with breeder info or create a new breeder.</p>
        </div>
      `;
    }

    return html`
      <div class="breeder-list">
        ${breeders.map((b) => html`
          <div class="breeder-card" @click=${() => this._startBreederEdit(b.name, b.logo)}>
            ${b.logo
              ? html`<img class="breeder-logo-preview" src="${b.logo}" alt="${b.name}" />`
              : html`<div class="breeder-logo-placeholder">
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiImage}"></path>
                  </svg>
                </div>`}
            <div class="breeder-info">
              <div class="breeder-name">${b.name}</div>
              <div class="breeder-strain-count">${b.strainCount} strain${b.strainCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="breeder-actions">
              <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); this._startBreederEdit(b.name, b.logo); }}>
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiPencil}"></path>
                </svg>
              </button>
              <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); this._handleDeleteBreeder(b.name); }} style="color:var(--error-color, #f44336);">
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiDelete}"></path>
                </svg>
              </button>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private renderBreederEditor(): TemplateResult {
    const state = this._breederEditorState!;
    const isEdit = !!state.originalName;
    const affectedStrains = isEdit
      ? this.strains.filter((s) => s.breeder === state.originalName)
      : [];

    const handleLogoUpload = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then((base64) => {
            this._breederEditorState = { ...this._breederEditorState!, logo: base64 };
          })
          .catch((err) => console.error('Error compressing logo:', err));
      }
    };

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <button class="md3-button tonal" style="padding:0 12px; height:32px;" @click=${() => (this._breederEditorState = null)}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
              <path d="${mdiArrowLeft}"></path>
            </svg>
            Back
          </button>
          <h3 style="margin:0; color:var(--primary-text-color);">${isEdit ? 'Edit Breeder' : 'New Breeder'}</h3>
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Name *</label>
          <input
            type="text"
            class="sd-input"
            placeholder="e.g. Royal Queen Seeds"
            .value=${state.name}
            @input=${(e: InputEvent) => {
              this._breederEditorState = { ...this._breederEditorState!, name: (e.target as HTMLInputElement).value };
            }}
          />
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Logo</label>
          <div style="display:flex; align-items:center; gap:16px;">
            ${state.logo
              ? html`<img src="${state.logo}" style="width:64px; height:64px; object-fit:contain; border-radius:8px; background:rgba(255,255,255,0.05); padding:4px;" />`
              : html`<div style="width:64px; height:64px; border:1px dashed var(--divider-color); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--secondary-text-color);">
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiImage}"></path></svg>
                </div>`}
            <div style="display:flex; gap:8px;">
              <button class="md3-button tonal" style="height:36px; padding:0 16px; font-size:0.85rem;" @click=${(e: Event) => ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}>
                <svg style="width:16px;height:16px;fill:currentColor;margin-right:6px;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
                ${state.logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input type="file" accept="image/*" style="display:none" @change=${handleLogoUpload} />
              ${state.logo ? html`
                <button class="md3-button text" style="height:36px; padding:0 12px; color:var(--error-color, #ff5252);" @click=${() => { this._breederEditorState = { ...this._breederEditorState!, logo: '' }; }}>
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                </button>
              ` : nothing}
            </div>
          </div>
        </div>

        ${isEdit && affectedStrains.length > 0 ? html`
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--divider-color); border-radius:8px; padding:16px;">
            <label class="sd-label" style="margin-bottom:8px;">Strains using this breeder (${affectedStrains.length})</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${affectedStrains.map((s) => html`
                <span style="background:rgba(76,175,80,0.15); color:var(--accent-green); padding:4px 10px; border-radius:16px; font-size:0.8rem; font-weight:500;">
                  ${s.strain}${s.phenotype ? ` (${s.phenotype})` : ''}
                </span>
              `)}
            </div>
          </div>
        ` : nothing}

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
          <button class="md3-button tonal" @click=${() => (this._breederEditorState = null)}>Cancel</button>
          <button class="md3-button primary" @click=${() => this._handleSaveBreeder()} ?disabled=${!state.name.trim()}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
            ${isEdit ? 'Save Changes' : 'Create Breeder'}
          </button>
        </div>
      </div>
    `;
  }

  private _startBreederEdit(name?: string, logo?: string) {
    this._breederEditorState = {
      name: name || '',
      logo: logo || '',
      originalName: name || '',
    };
  }

  private _handleSaveBreeder() {
    const state = this._breederEditorState;
    if (!state || !state.name.trim()) return;

    const newName = state.name.trim();
    const isEdit = !!state.originalName;

    if (isEdit) {
      // Dispatch update-breeder event
      this.dispatchEvent(
        new CustomEvent('update-breeder', {
          detail: {
            oldName: state.originalName,
            newName: newName,
            logo: state.logo,
          },
        })
      );
    } else {
      // Dispatch save-breeder event for new breeder
      this.dispatchEvent(
        new CustomEvent('save-breeder', {
          detail: { name: newName, logo: state.logo },
        })
      );
    }

    this._breederEditorState = null;
  }

  private _handleDeleteBreeder(breederName: string) {
    this._pendingDeleteBreeder = breederName;
  }

  private _confirmDeleteBreeder() {
    if (this._pendingDeleteBreeder) {
      this.dispatchEvent(
        new CustomEvent('delete-breeder', {
          detail: { name: this._pendingDeleteBreeder },
        })
      );
      this._pendingDeleteBreeder = null;
    }
  }

  private _cancelDeleteBreeder() {
    this._pendingDeleteBreeder = null;
  }

  // ── Seeds & Genetics tab ──────────────────────────────────────────────────

  private _renderTabBar(): TemplateResult {
    return html`
      <div class="main-tab-bar">
        <button
          class="tab-btn ${this._activeMainTab === 'strains' ? 'active' : ''}"
          @click=${() => { this._activeMainTab = 'strains'; }}
        >Strains</button>
        <button
          class="tab-btn ${this._activeMainTab === 'seeds' ? 'active' : ''}"
          @click=${() => { this._activeMainTab = 'seeds'; }}
        >Seeds &amp; Genetics</button>
      </div>
    `;
  }

  private _renderSeedsTab(): TemplateResult {
    if (this._seedSubView === 'add-batch') return this._renderAddBatchForm();
    if (this._seedSubView === 'log-pollination') return this._renderLogPollinationForm();
    if (this._seedSubView === 'harvest') return this._renderHarvestForm();
    return this._renderSeedList();
  }

  private _renderSeedList(): TemplateResult {
    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
          <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiLeaf}"></path>
          </svg>
        </div>
        <div class="dialog-title-group">
          <h2 class="dialog-title">Seeds &amp; Genetics</h2>
        </div>
        <div class="header-actions" style="display:flex; gap:8px;">
          <button
            class="md3-button text close"
            @click=${() => this.dispatchEvent(new CustomEvent('close'))}
            style="min-width:auto; padding:8px; margin-left: auto;"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiClose}"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="seeds-section">
        <div class="seeds-header">
          <h3>Seed inventory</h3>
          <button class="md3-button filled" @click=${() => {
            this._editingBatchId = null;
            this._batchForm = { strain_name: '', breeder: '', quantity: 1, acquisition_date: '', generation: 'F1', parent_1_key: '', parent_2_key: '', notes: '' };
            this._submitError = null;
            this._seedSubView = 'add-batch';
          }}>
            Add batch
          </button>
        </div>
        ${this.seedBatches.length === 0
          ? html`<p class="empty-state">No seed batches yet.</p>`
          : this.seedBatches.map(b => html`
              <div class="seed-batch-card">
                <div class="seed-batch-card-header">
                  <div class="seed-batch-name">${b.strain_name}</div>
                  <button class="seed-batch-edit-btn" title="Edit batch" @click=${() => {
                    const p1Key = b.parent_1_strain
                      ? `${b.parent_1_strain}||${b.parent_1_phenotype ?? ''}`
                      : '';
                    const p2Key = b.parent_2_strain
                      ? `${b.parent_2_strain}||${b.parent_2_phenotype ?? ''}`
                      : '';
                    this._batchForm = {
                      strain_name: b.strain_name,
                      breeder: b.breeder,
                      quantity: b.quantity,
                      acquisition_date: b.acquisition_date,
                      generation: b.generation,
                      parent_1_key: p1Key,
                      parent_2_key: p2Key,
                      notes: b.notes ?? '',
                    };
                    this._editingBatchId = b.batch_id;
                    this._submitError = null;
                    this._seedSubView = 'add-batch';
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="${mdiPencil}"></path>
                    </svg>
                  </button>
                </div>
                <div class="seed-batch-meta">${b.breeder} · ${b.generation} · ${b.quantity} seeds · ${b.acquisition_date}</div>
                ${(b.parent_1_strain || b.parent_2_strain) ? html`
                  <div class="seed-batch-parents">
                    ${b.parent_1_strain ? html`<span class="seed-batch-parent-chip">♀ ${b.parent_1_strain}${b.parent_1_phenotype ? ` (${b.parent_1_phenotype})` : ''}</span>` : nothing}
                    ${(b.parent_1_strain && b.parent_2_strain) ? html`<span class="seed-batch-parent-sep">×</span>` : nothing}
                    ${b.parent_2_strain ? html`<span class="seed-batch-parent-chip">♂ ${b.parent_2_strain}${b.parent_2_phenotype ? ` (${b.parent_2_phenotype})` : ''}</span>` : nothing}
                  </div>
                ` : nothing}
                ${b.lineage ? html`<div class="seed-batch-lineage">${b.lineage}</div>` : nothing}
                ${b.notes ? html`<div class="seed-batch-notes">${b.notes}</div>` : nothing}
              </div>
            `)
        }

        <div class="seeds-header">
          <h3>Pollination log</h3>
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'log-pollination'; }}>
            Log pollination
          </button>
        </div>
        ${this.pollinationEvents.length === 0
          ? html`<p class="empty-state">No pollination events yet.</p>`
          : this.pollinationEvents.map(e => html`
              <div class="pollination-card">
                <div class="pollination-card-header">
                  <div class="pollination-date">${e.date}</div>
                  <div class="pollination-card-actions">
                    <button class="icon-btn" title="Edit" @click=${() => {
                      this._editingEventId = e.event_id;
                      this._pollinationForm = {
                        date: e.date,
                        donor_plant_id: e.donor_plant_id,
                        receiver_plant_id: e.receiver_plant_id,
                        notes: e.notes ?? '',
                      };
                      this._seedSubView = 'log-pollination';
                    }}>
                      <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiPencil}"></path></svg>
                    </button>
                    ${this._confirmDeleteEventId === e.event_id
                      ? html`
                          <span class="delete-confirm-text">Delete?</span>
                          <button class="icon-btn danger" title="Confirm delete" @click=${async () => {
                            await this.onDeletePollination?.(e.event_id);
                            this._confirmDeleteEventId = null;
                            this.onSeedDataChanged?.();
                          }}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiCheck}"></path></svg>
                          </button>
                          <button class="icon-btn" title="Cancel" @click=${() => { this._confirmDeleteEventId = null; }}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiClose}"></path></svg>
                          </button>
                        `
                      : html`
                          <button class="icon-btn danger" title="Delete" @click=${() => { this._confirmDeleteEventId = e.event_id; }}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiDelete}"></path></svg>
                          </button>
                        `
                    }
                  </div>
                </div>
                <div class="pollination-plants">♂ ${this._getPlantLabel(e.donor_plant_id)} × ♀ ${this._getPlantLabel(e.receiver_plant_id)}</div>
                ${e.notes ? html`<div class="pollination-notes">${e.notes}</div>` : nothing}
                ${e.result_seed_batch_id
                  ? html`<span class="badge success">Seeds harvested</span>`
                  : html`
                      <button class="md3-button tonal" @click=${() => {
                        this._selectedEventId = e.event_id;
                        this._seedSubView = 'harvest';
                      }}>Harvest seeds</button>
                    `
                }
              </div>
            `)
        }
      </div>
    `;
  }

  private _renderAddBatchForm(): TemplateResult {
    const isEditing = this._editingBatchId !== null;
    const uniqueBreeders = [...new Set(this.strains.map((s) => s.breeder).filter(Boolean))].sort() as string[];

    const strainOptions = this.strains
      .slice()
      .sort((a, b) => `${a.strain} ${a.phenotype}`.localeCompare(`${b.strain} ${b.phenotype}`))
      .map((s) => ({
        key: `${s.strain}||${s.phenotype}`,
        label: s.phenotype ? `${s.strain} (${s.phenotype})` : s.strain,
      }));

    return html`
      <datalist id="batch-breeder-suggestions">
        ${uniqueBreeders.map((name) => html`<option value="${name}"></option>`)}
      </datalist>
      <div class="form-view">
        <div class="form-header">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._editingBatchId = null; }}>← Back</button>
          <h3>${isEditing ? 'Edit seed batch' : 'Add seed batch'}</h3>
        </div>
        <label>Strain name
          <input type="text" .value=${this._batchForm.strain_name}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, strain_name: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Breeder
          <input type="text" list="batch-breeder-suggestions" .value=${this._batchForm.breeder}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, breeder: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Quantity
          <input type="number" min="1" .value=${String(this._batchForm.quantity)}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, quantity: parseInt((e.target as HTMLInputElement).value) || 1 }; }} />
        </label>
        <label>Acquisition date
          <input type="date" .value=${this._batchForm.acquisition_date}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, acquisition_date: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Generation
          <input type="text" placeholder="F1, S1, BX1…" .value=${this._batchForm.generation}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, generation: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Parent 1
          <select @change=${(e: Event) => { this._batchForm = { ...this._batchForm, parent_1_key: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— none —</option>
            ${strainOptions.map((o) => html`<option value="${o.key}" ?selected=${this._batchForm.parent_1_key === o.key}>${o.label}</option>`)}
          </select>
        </label>
        <label>Parent 2
          <select @change=${(e: Event) => { this._batchForm = { ...this._batchForm, parent_2_key: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— none —</option>
            ${strainOptions.map((o) => html`<option value="${o.key}" ?selected=${this._batchForm.parent_2_key === o.key}>${o.label}</option>`)}
          </select>
        </label>
        <label>Notes
          <input type="text" .value=${this._batchForm.notes}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, notes: (e.target as HTMLInputElement).value }; }} />
        </label>
        ${this._submitError ? html`<p class="form-error">${this._submitError}</p>` : nothing}
        <div class="form-actions">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._editingBatchId = null; this._submitError = null; }}>Cancel</button>
          <button class="md3-button filled" @click=${this._submitAddBatch}>Save</button>
        </div>
      </div>
    `;
  }

  private _renderLogPollinationForm(): TemplateResult {
    const eligiblePlants = this._flowerVegPlants;

    return html`
      <div class="form-view">
        <div class="form-header">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._editingEventId = null; this._pollinationForm = { date: '', donor_plant_id: '', receiver_plant_id: '', notes: '' }; }}>← Back</button>
          <h3>${this._editingEventId ? 'Edit pollination' : 'Log pollination'}</h3>
        </div>
        <label>Date
          <input type="date" .value=${this._pollinationForm.date}
            @input=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, date: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Donor plant (male / pollen donor)
          <select @change=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, donor_plant_id: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— select plant —</option>
            ${eligiblePlants.map((p) => html`
              <option value="${p.plant_id}" ?selected=${this._pollinationForm.donor_plant_id === p.plant_id}>
                ${p.label}
              </option>
            `)}
          </select>
        </label>
        <label>Receiver plant (female / seed bearer)
          <select @change=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, receiver_plant_id: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— select plant —</option>
            ${eligiblePlants.map((p) => html`
              <option value="${p.plant_id}" ?selected=${this._pollinationForm.receiver_plant_id === p.plant_id}>
                ${p.label}
              </option>
            `)}
          </select>
        </label>
        <label>Notes
          <input type="text" .value=${this._pollinationForm.notes}
            @input=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, notes: (e.target as HTMLInputElement).value }; }} />
        </label>
        ${this._submitError ? html`<p class="form-error">${this._submitError}</p>` : nothing}
        <div class="form-actions">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._submitError = null; }}>Cancel</button>
          <button class="md3-button filled" @click=${this._submitLogPollination}>Save</button>
        </div>
      </div>
    `;
  }

  private _renderHarvestForm(): TemplateResult {
    return html`
      <div class="form-view">
        <div class="form-header">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._selectedEventId = null; }}>← Back</button>
          <h3>Harvest seeds</h3>
        </div>
        <label>Quantity
          <input type="number" min="1" .value=${String(this._harvestForm.quantity)}
            @input=${(e: Event) => { this._harvestForm = { ...this._harvestForm, quantity: parseInt((e.target as HTMLInputElement).value) || 1 }; }} />
        </label>
        <label>Notes
          <input type="text" .value=${this._harvestForm.notes}
            @input=${(e: Event) => { this._harvestForm = { ...this._harvestForm, notes: (e.target as HTMLInputElement).value }; }} />
        </label>
        ${this._submitError ? html`<p class="form-error">${this._submitError}</p>` : nothing}
        <div class="form-actions">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._selectedEventId = null; this._submitError = null; }}>Cancel</button>
          <button class="md3-button filled" @click=${this._submitHarvestSeeds}>Save</button>
        </div>
      </div>
    `;
  }

  private async _submitAddBatch(): Promise<void> {
    const f = this._batchForm;
    if (!f.strain_name || !f.breeder || !f.acquisition_date || !f.generation) {
      this._submitError = 'Please fill in all required fields.';
      return;
    }
    this._submitError = null;

    const resolveKey = (key: string): { strain: string | null; phenotype: string | null } => {
      if (!key) return { strain: null, phenotype: null };
      const [strain, phenotype] = key.split('||', 2);
      return { strain: strain || null, phenotype: phenotype || null };
    };
    const p1 = resolveKey(f.parent_1_key);
    const p2 = resolveKey(f.parent_2_key);

    try {
      if (this._editingBatchId) {
        await this.onUpdateSeedBatch?.({
          batch_id: this._editingBatchId,
          strain_name: f.strain_name,
          breeder: f.breeder,
          quantity: f.quantity,
          acquisition_date: f.acquisition_date,
          generation: f.generation,
          parent_1_strain: p1.strain,
          parent_1_phenotype: p1.phenotype,
          parent_2_strain: p2.strain,
          parent_2_phenotype: p2.phenotype,
          notes: f.notes,
        });
      } else {
        await this.onAddSeedBatch?.({
          strain_name: f.strain_name,
          breeder: f.breeder,
          quantity: f.quantity,
          acquisition_date: f.acquisition_date,
          generation: f.generation,
          parent_1_strain: p1.strain,
          parent_1_phenotype: p1.phenotype,
          parent_2_strain: p2.strain,
          parent_2_phenotype: p2.phenotype,
          notes: f.notes,
        });
      }
      this._seedSubView = 'list';
      this._editingBatchId = null;
      this._batchForm = { strain_name: '', breeder: '', quantity: 1, acquisition_date: '', generation: 'F1', parent_1_key: '', parent_2_key: '', notes: '' };
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to save seed batch', e);
      this._submitError = 'Failed to save. Please check your connection and try again.';
    }
  }

  private async _submitLogPollination(): Promise<void> {
    const f = this._pollinationForm;
    if (!f.donor_plant_id || !f.receiver_plant_id || !f.date) {
      this._submitError = 'Please fill in all required fields.';
      return;
    }
    this._submitError = null;
    try {
      if (this._editingEventId) {
        await this.onUpdatePollination?.({
          event_id: this._editingEventId,
          date: f.date,
          donor_plant_id: f.donor_plant_id,
          receiver_plant_id: f.receiver_plant_id,
          notes: f.notes,
        });
        this._editingEventId = null;
      } else {
        await this.onLogPollination?.({
          date: f.date,
          donor_plant_id: f.donor_plant_id,
          receiver_plant_id: f.receiver_plant_id,
          notes: f.notes,
        });
      }
      this._seedSubView = 'list';
      this._pollinationForm = { date: '', donor_plant_id: '', receiver_plant_id: '', notes: '' };
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to log pollination', e);
      this._submitError = 'Failed to save. Please check your connection and try again.';
    }
  }

  private async _submitHarvestSeeds(): Promise<void> {
    const f = this._harvestForm;
    if (!this._selectedEventId || !f.quantity) {
      this._submitError = 'Please fill in all required fields.';
      return;
    }
    this._submitError = null;
    try {
      await this.onHarvestSeeds?.({
        event_id: this._selectedEventId,
        quantity: f.quantity,
        notes: f.notes,
      });
      this._seedSubView = 'list';
      this._selectedEventId = null;
      this._harvestForm = { quantity: 1, notes: '' };
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to harvest seeds', e);
      this._submitError = 'Failed to save. Please check your connection and try again.';
    }
  }

  private renderBreederDeleteConfirmation(): TemplateResult {
    const breederName = this._pendingDeleteBreeder!;
    const affectedCount = this.strains.filter((s) => s.breeder === breederName).length;

    return html`
      <div class="crop-overlay" style="z-index:1001;">
        <div class="glass-dialog-container" style="width:400px; height:auto; padding:24px; display:flex; flex-direction:column;">
          <h2 class="dialog-title">Remove Breeder?</h2>
          <p style="color:var(--secondary-text-color); margin:16px 0; font-size:1rem; line-height:1.5;">
            This will remove <strong>"${breederName}"</strong> from ${affectedCount} strain${affectedCount !== 1 ? 's' : ''}. The strains themselves will not be deleted.
          </p>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
            <button class="md3-button tonal" @click=${this._cancelDeleteBreeder}>Cancel</button>
            <button class="md3-button text" style="color:#f44336;" @click=${this._confirmDeleteBreeder}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24">
                <path d="${mdiDelete}"></path>
              </svg>
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
