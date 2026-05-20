import { LitElement, html, css, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiPlus,
  mdiClose,
  mdiMagnify,
  mdiDelete,
  mdiCheck,
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiTuneVariant,
  mdiLeaf,
  mdiArrowLeft,
  mdiCloudUpload,
  mdiPencil,
  mdiDownload,
  mdiBrain,
  mdiImage,
  mdiChevronLeft,
  mdiChevronRight,
  mdiDotsVertical,
  mdiAccountGroup,
  mdiFileUpload,
  mdiArrowExpand,
  mdiArrowCollapse,
} from '@mdi/js';
import './strain-import-dialog';
import './seeds-genetics-tab';
import './strain-editor-view';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, SeedBatch, PollinationEvent } from '../types';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/gs-help-tooltip';
import '../features/shared/ui/lineage-tree';
import '../features/shared/ui/genetics-tree-view';
import type { TreeNode } from '../features/shared/ui/genetics-tree-layout';

@customElement('strain-library-dialog')
export class StrainLibraryDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) store?: GrowspaceStore;
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ type: Object }) editingStrain?: StrainEntry;
  @property({ attribute: false }) activePlantCounts: Record<string, number> = {};
  @property({ type: Boolean }) focusLineage = false;
  @property({ type: String }) source?: string;
  @property({ type: Object }) returnPayload?: unknown;

  @state() private _view: 'browse' | 'editor' = 'browse';
  @state() private _searchQuery = '';
  @state() private _pendingDeleteKey: string | null = null;

  // Seeds & Genetics tab state
  @property({ type: Array }) seedBatches: SeedBatch[] = [];
  @property({ type: Array }) pollinationEvents: PollinationEvent[] = [];
  @property({ type: Array }) plants: GrowspaceDevice[] = [];
  @property({ type: String }) initialTab: 'strains' | 'seeds' | 'tree' = 'strains';
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
  @property({ attribute: false }) onDeleteSeedBatch?: (batch_id: string) => Promise<void>;
  @property({ attribute: false }) onSowSeeds?: (data: { growspace_id: string; strain: string; amount: number; seed_batch_id: string; generation?: string }) => Promise<void>;

  @state() private _activeMainTab: 'strains' | 'seeds' | 'tree' = 'strains';
  @state() private _libraryFilter: 'library' | 'active' | 'all' = 'library';
  @state() private _treeNodes: TreeNode[] = [];
  @state() private _treeMaximized = false;

  // Pagination State
  @state() private _currentPage = 1;
  private readonly ITEMS_PER_PAGE = 15;

  // Browse-view overlay state
  @state() private _mobileMenuOpen = false;
  @state() private _importDialogOpen = false;
  @state() private _importReplace = false;
  @state() private _breederDialogOpen = false;
  @state() private _breederEditorState: { name: string; logo: string; originalName: string } | null = null;
  @state() private _pendingDeleteBreeder: string | null = null;

  // Editor navigation state
  @state() private _editingStrain: StrainEntry | undefined = undefined;

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has('editingStrain') && this.editingStrain) {
      this._editingStrain = this.editingStrain;
      this._view = 'editor';
    }
    if (changedProps.has('strains') || changedProps.has('seedBatches') || changedProps.has('_libraryFilter')) {
      const filteredStrains = this._applyLibraryFilter(this.strains);
      this._treeNodes = this._buildTreeNodes(filteredStrains);
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('initialTab')) {
      this._activeMainTab = this.initialTab;
    }
    if (changedProperties.has('_treeMaximized')) {
      this.classList.toggle('tree-maximized', this._treeMaximized);
    }
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        --accent-green: #4caf50;
      }



      /* Additional specific styles */

      /* Layout Overrides */
      .glass-dialog-container {
        width: 100%;
        max-width: 100%;
        min-height: 500px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: transparent;
      }

      @media (min-width: 601px) {
        .glass-dialog-container {
          height: 85vh;
        }
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
          --ha-dialog-width-md: 100vw;
          --ha-dialog-max-width: 100vw;
          --ha-dialog-width-full: 100vw;
          --dialog-surface-width: 100vw;
          --dialog-surface-max-width: 100vw;
          --dialog-content-width: 100vw;
          --dialog-surface-margin: 0;
          --dialog-surface-margin-top: 0;
        }
        .glass-dialog-container {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          border-radius: 0;
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

      .tab-content-tree {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Main tab bar */
      .main-tab-bar {
        display: flex;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        background: var(--secondary-background-color, rgba(0,0,0,0.2));
        flex-shrink: 0;
        align-items: center;
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
      .tab-maximize-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        flex-shrink: 0;
        margin-right: 4px;
        border-radius: 4px;
      }
      .tab-maximize-btn:hover {
        color: var(--primary-text-color);
        background: rgba(255,255,255,0.06);
      }

      /* Maximized tree view — ha-dialog width="full" handles dialog sizing;
         just ensure the inner container fills the full surface */
      :host(.tree-maximized) ha-dialog {
        --ha-dialog-width-md: 100vw;
        --ha-dialog-max-width: 100vw;
        --ha-dialog-width-full: 100vw;
        --dialog-surface-width: 100vw;
        --dialog-surface-max-width: 100vw;
        --dialog-content-width: 100vw;
        --dialog-surface-margin: 0;
        --dialog-surface-margin-top: 0;
      }
      :host(.tree-maximized) .glass-dialog-container {
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
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
      .seed-batch-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .sow-form {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
        padding: 10px 12px;
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
        border-radius: 8px;
      }
      .sow-select {
        flex: 1;
        min-width: 120px;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 13px;
      }
      .sow-qty {
        width: 64px;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 13px;
        text-align: center;
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
      .library-filter-chips {
        display: flex;
        gap: 6px;
        padding: 4px 0 8px;
      }
      .filter-chip {
        padding: 4px 14px;
        border-radius: 16px;
        border: 1px solid var(--divider-color, #e0e0e0);
        background: transparent;
        color: var(--primary-text-color);
        font-size: 13px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .filter-chip.active {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        border-color: var(--primary-color);
      }
    `,
  ];

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
        width="${this._treeMaximized ? 'full' : 'large'}"
      >
        <div class="glass-dialog-container">
          ${this._renderTabBar()}
          ${this._activeMainTab === 'tree'
        ? this._renderTreeViewTab()
        : this._activeMainTab === 'seeds'
          ? html`
                  <seeds-genetics-tab
                    .strains=${this.strains}
                    .seedBatches=${this.seedBatches}
                    .pollinationEvents=${this.pollinationEvents}
                    .plants=${this.plants}
                    .onSeedDataChanged=${this.onSeedDataChanged}
                    .onAddSeedBatch=${this.onAddSeedBatch}
                    .onUpdateSeedBatch=${this.onUpdateSeedBatch}
                    .onLogPollination=${this.onLogPollination}
                    .onHarvestSeeds=${this.onHarvestSeeds}
                    .onUpdatePollination=${this.onUpdatePollination}
                    .onDeletePollination=${this.onDeletePollination}
                    .onDeleteSeedBatch=${this.onDeleteSeedBatch}
                    .onSowSeeds=${this.onSowSeeds}
                    @close=${() => this.dispatchEvent(new CustomEvent('close'))}
                  ></seeds-genetics-tab>
                `
          : (this._view === 'browse' ? this.renderBrowseView() : html`
              <strain-editor-view
                .editingStrain=${this._editingStrain}
                .strains=${this.strains}
                .store=${this.store}
                .hass=${this.hass}
                .source=${this.source}
                .returnPayload=${this.returnPayload}
                @editor-back=${() => { this._view = 'browse'; this._editingStrain = undefined; }}
                @save-strain=${() => { this._view = 'browse'; this._editingStrain = undefined; }}
                @delete-strain=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('delete-strain', { detail: e.detail }));
              this._view = 'browse';
              this._editingStrain = undefined;
            }}
                @strain-created-at-source=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('strain-created-at-source', { detail: e.detail, bubbles: true, composed: true }));
            }}
                @open-print-label=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('open-print-label', { detail: e.detail, bubbles: true, composed: true }));
            }}
                @import-library=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('import-library', { detail: e.detail }));
            }}
                @update-breeder=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('update-breeder', { detail: e.detail }));
            }}
                @save-breeder=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('save-breeder', { detail: e.detail }));
            }}
                @delete-breeder=${(e: CustomEvent) => {
              this.dispatchEvent(new CustomEvent('delete-breeder', { detail: e.detail }));
            }}
                @close=${() => this.dispatchEvent(new CustomEvent('close'))}
              ></strain-editor-view>
            `)
      }
        </div>
      </ha-dialog>

      ${this._pendingDeleteKey ? this.renderDeleteConfirmation() : nothing}
      ${this._importDialogOpen ? this.renderImportDialog() : nothing}
      ${this._breederDialogOpen ? this.renderBreederDialog() : nothing}
      ${this._pendingDeleteBreeder ? this.renderBreederDeleteConfirmation() : nothing}
    `;
  }

  private renderBrowseView(): TemplateResult {
    const query = (this._searchQuery || '').toLowerCase();
    const terms = query.split(/\s+/).filter((t) => t.length > 0);
    const filteredStrains = this._applyLibraryFilter(this.strains)
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
        ${this._renderFilterChips()}
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
            this._editingStrain = undefined;
            this._view = 'editor';
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
      <button class="fab-btn" @click=${() => { this._editingStrain = undefined; this._view = 'editor'; }}>
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
        <button class="md3-button primary" @click=${() => { this._editingStrain = undefined; this._view = 'editor'; }}>
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

    const activePlants = this.activePlantCounts[strain.strain] ?? 0;
    const analytics = strain.strain_analytics || strain.analytics;
    const totalHarvests = analytics?.total_harvests ?? 0;
    const avgFlowerDays = analytics?.avg_flower_days;

    return html`
      <div class="strain-card" @click=${() => { this._editingStrain = strain; this._view = 'editor'; }}>
        <div class="sc-thumb">
          ${strain.image
        ? html`<img
                src="${strain.image}"
                loading="lazy"
                alt="${strain.strain}"
                style="${strain.image_crop_meta
            ? `width: 100%; height: 100%; object-fit: cover; object-position: ${strain.image_crop_meta.x}% ${strain.image_crop_meta.y}%; transform: scale(${strain.image_crop_meta.scale}); transform-origin: ${strain.image_crop_meta.x}% ${strain.image_crop_meta.y}%;`
            : 'width: 100%; height: 100%; object-fit: cover;'}"
              />`
        : html`<svg
                style="width:48px;height:48px;opacity:0.2;fill:currentColor;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiLeaf}"></path>
              </svg>`}
          ${activePlants > 0 ? html`
            <div style="
              position: absolute; top: 8px; right: 8px;
              background: rgba(76,175,80,0.85); color: #fff;
              border-radius: 999px; padding: 2px 8px;
              font-size: 0.65rem; font-weight: 600;
              backdrop-filter: blur(4px);
            ">${activePlants} active</div>
          ` : nothing}
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
        ? html`<span>Flower: ${strain.flowering_days_min}–${strain.flowering_days_max || '?'} days</span>`
        : nothing}
            ${avgFlowerDays ? html`<span>Avg: ${Math.round(avgFlowerDays)}d</span>` : nothing}
            ${strain.breeder
        ? html`
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${strain.breeder_logo
            ? html`<img
                          src="${strain.breeder_logo}"
                          style="width: 20px; height: 20px; object-fit: contain; border-radius: 2px; background: rgba(255,255,255,0.05); padding: 2px;"
                        />`
            : nothing}
                    <span>${strain.breeder}</span>
                  </div>
                `
        : nothing}
            ${totalHarvests > 0 ? html`<span style="color: var(--secondary-text-color);">${totalHarvests} harvest${totalHarvests !== 1 ? 's' : ''}</span>` : nothing}
          </div>
        </div>
      </div>
    `;
  }


  private renderImportDialog(): TemplateResult {
    const close = () => { this._importDialogOpen = false; };
    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="width: 480px; max-width: 98vw; height: auto;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiFileUpload}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Import Strains</h2>
            </div>
            <button
              class="md3-button text close"
              @click=${close}
              style="min-width:auto; padding:8px; margin-left: auto;"
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
              <button class="md3-button tonal" @click=${close}>
                Cancel
              </button>
              <button class="md3-button primary" @click=${() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            this.dispatchEvent(new CustomEvent('import-library', { detail: { file, replace: this._importReplace } }));
            this._importDialogOpen = false;
          }
        };
        input.click();
      }}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiCloudUpload}"></path>
                </svg>
                Select File
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
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
    const close = () => { this._breederDialogOpen = false; this._breederEditorState = null; };

    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="width: 600px; max-width: 98vw; height: auto; max-height: 90vh;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiAccountGroup}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
                <div style="display:flex;align-items:center;gap:6px;">
                  <h2 class="dialog-title">Breeder Manager</h2>
                  <gs-help-tooltip
                    content="Manage your breeder database and logos. Breeders can be assigned to strains to track genetics."
                    placement="bottom"
                    label="Breeders"
                  ></gs-help-tooltip>
                </div>
            </div>
            <button
              class="md3-button text close"
              @click=${close}
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
      </ha-dialog>
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
        <button
          class="tab-btn ${this._activeMainTab === 'tree' ? 'active' : ''}"
          @click=${() => { this._activeMainTab = 'tree'; }}
        >Tree View</button>
        ${this._activeMainTab === 'tree'
        ? html`
              <button
                class="tab-maximize-btn"
                title="${this._treeMaximized ? 'Restore' : 'Maximize'}"
                @click=${() => { this._treeMaximized = !this._treeMaximized; }}
              >
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${this._treeMaximized ? mdiArrowCollapse : mdiArrowExpand}"></path>
                </svg>
              </button>
            `
        : nothing}
      </div>
    `;
  }

  private _applyLibraryFilter(strains: StrainEntry[]): StrainEntry[] {
    if (this._libraryFilter === 'active') {
      return strains.filter((s) => (this.activePlantCounts[s.strain] ?? 0) > 0);
    }
    if (this._libraryFilter === 'library') {
      return strains.filter((s) => !s.is_stub);
    }
    return strains;
  }

  private _renderFilterChips(): TemplateResult {
    const opts: Array<{ key: 'library' | 'active' | 'all'; label: string }> = [
      { key: 'library', label: 'Library' },
      { key: 'active', label: 'Active' },
      { key: 'all', label: 'All' },
    ];
    return html`
      <div class="library-filter-chips">
        ${opts.map(
      (o) => html`
            <button
              class="filter-chip ${this._libraryFilter === o.key ? 'active' : ''}"
              @click=${() => {
          this._libraryFilter = o.key;
          this._currentPage = 1;
        }}
            >
              ${o.label}
            </button>
          `
    )}
      </div>
    `;
  }

  private _buildTreeNodes(primaryStrains: StrainEntry[] = this.strains): TreeNode[] {
    const nodes: TreeNode[] = [];
    const nodeIds = new Set<string>();
    const strainNameToKey = new Map<string, string>();

    // Build name→key lookup from ALL strains so parent references always resolve,
    // even when the primary set is filtered to a subset.
    this.strains.forEach((s) => {
      const strainLc = s.strain.toLowerCase();
      strainNameToKey.set(strainLc, s.key);
      if (s.phenotype) {
        strainNameToKey.set(`${strainLc} ${s.phenotype.toLowerCase()}`, s.key);
        strainNameToKey.set(`${strainLc}${s.phenotype.toLowerCase()}`.replace(/\s+/g, ''), s.key);
      }
    });

    // Helper to resolve a strain name to its key, or return the name if not found
    const resolve = (name: string | undefined | null): string | null => {
      if (!name) return null;
      const clean = name.replace(/^["'\[\(]|["'\]\)]$/g, '').trim();
      const lower = clean.toLowerCase();
      return strainNameToKey.get(lower) || clean;
    };

    // Collect parent IDs referenced but with no library node, for stub creation
    const referencedParents = new Map<string, string>(); // id -> display name

    // 1. Add filtered primary strains. Referenced ancestors from the full library
    //    are added in steps below so lineage edges always resolve.
    primaryStrains.forEach((strain) => {
      let mother: string | null = null;
      let father: string | null = null;

      // Prefer structured parents (lineage_tree) over text parsing
      const structuredParents = Array.isArray(strain.parents) ? strain.parents as Array<{ name: string }> : null;
      if (structuredParents && structuredParents.length > 0) {
        mother = resolve(structuredParents[0]?.name);
        father = resolve(structuredParents[1]?.name) ?? null;
      } else {
        // Fall back to parsing legacy lineage text
        const lineage = strain.lineage?.trim();
        if (lineage) {
          const parts = lineage.split(/\s*[xX×*]\s*/);
          if (parts.length >= 2) {
            mother = resolve(parts[0]);
            father = resolve(parts[1]);
          }
        }
      }

      if (mother) referencedParents.set(mother, structuredParents?.[0]?.name ?? mother);
      if (father) referencedParents.set(father, structuredParents?.[1]?.name ?? father);

      nodes.push({
        id: strain.key,
        name: strain.strain,
        strain: strain.strain,
        breeder: strain.breeder || '',
        pheno: strain.phenotype || '',
        gen: 'P1',
        type: 'strain',
        parents: { mother, father },
      });
      nodeIds.add(strain.key);
    });

    // 2. Add seed batches
    this.seedBatches.forEach((batch) => {
      const mother = resolve(batch.parent_1_strain);
      const father = resolve(batch.parent_2_strain);
      if (mother) referencedParents.set(mother, batch.parent_1_strain ?? mother);
      if (father) referencedParents.set(father, batch.parent_2_strain ?? father);
      nodes.push({
        id: batch.batch_id,
        name: `${batch.strain_name} (${batch.batch_id})`,
        strain: batch.strain_name,
        breeder: batch.breeder || '',
        pheno: '',
        gen: batch.generation || 'F1',
        type: 'batch',
        parents: { mother, father },
      });
      nodeIds.add(batch.batch_id);
    });

    // 3. Add ancestor nodes for all referenced parents not yet in the node set.
    //    First pull from the full library (they may be stubs or filtered-out strains);
    //    fall back to a bare stub if genuinely unknown.
    const allStrainsByKey = new Map(this.strains.map((s) => [s.key, s]));
    const allStrainsByName = new Map(this.strains.map((s) => [s.strain.toLowerCase(), s]));

    const addAncestorById = (id: string, displayName: string) => {
      if (nodeIds.has(id)) return;
      nodeIds.add(id);

      // Find the full library entry (may be a stub or a filtered-out real strain)
      const entry = allStrainsByKey.get(id) ?? allStrainsByName.get(id.toLowerCase());
      if (entry) {
        let mother: string | null = null;
        let father: string | null = null;
        const sp = Array.isArray(entry.parents) ? entry.parents as Array<{ name: string }> : null;
        if (sp && sp.length > 0) {
          mother = resolve(sp[0]?.name);
          father = resolve(sp[1]?.name) ?? null;
        } else if (entry.lineage) {
          const parts = entry.lineage.trim().split(/\s*[xX×*]\s*/);
          if (parts.length >= 2) {
            mother = resolve(parts[0]);
            father = resolve(parts[1]);
          }
        }
        if (mother) referencedParents.set(mother, sp?.[0]?.name ?? mother);
        if (father) referencedParents.set(father, sp?.[1]?.name ?? father);
        nodes.push({
          id: entry.key,
          name: entry.strain,
          strain: entry.strain,
          breeder: entry.breeder || '',
          pheno: entry.phenotype || '',
          gen: 'P1',
          type: 'strain',
          parents: { mother, father },
        });
      } else {
        nodes.push({
          id,
          name: displayName,
          strain: displayName,
          breeder: '',
          pheno: '',
          gen: 'P1',
          type: 'strain',
          parents: { mother: null, father: null },
        });
      }
    };

    // Iteratively resolve all referenced parents (ancestors may themselves have parents)
    const pendingParents = new Map(referencedParents);
    while (pendingParents.size > 0) {
      const [[id, displayName]] = pendingParents;
      pendingParents.delete(id);
      const sizeBefore = referencedParents.size;
      addAncestorById(id, displayName);
      // Pick up any new parents added by addAncestorById
      for (const [newId, newName] of referencedParents) {
        if (!nodeIds.has(newId) && !pendingParents.has(newId)) {
          pendingParents.set(newId, newName);
        }
      }
      void sizeBefore;
    }

    return nodes;
  }

  private _renderTreeViewTab(): TemplateResult {
    return html`
      <div class="tab-content-tree">
        <div style="padding: 8px 16px 0;">
          ${this._renderFilterChips()}
        </div>
        <genetics-tree-view
          .nodes=${this._treeNodes}
          .focalId=${this.focusLineage && this.editingStrain ? this.editingStrain.key : null}
        ></genetics-tree-view>
      </div>
    `;
  }


  private renderBreederDeleteConfirmation(): TemplateResult {
    const breederName = this._pendingDeleteBreeder!;
    const affectedCount = this.strains.filter((s) => s.breeder === breederName).length;

    return html`
      <ha-dialog
        open
        @closed=${this._cancelDeleteBreeder}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="width: 480px; max-width: 98vw; height: auto; padding: 24px; display: flex; flex-direction: column;">
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
      </ha-dialog>
    `;
  }

}
