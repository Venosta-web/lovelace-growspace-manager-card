import { LitElement, html, css, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose,
  mdiCloudUpload,
  mdiFileUpload,
  mdiArrowExpand,
  mdiArrowCollapse,
  mdiArrowLeft,
} from '@mdi/js';
import './gs-breeder-manager';
import './gs-filter-chips';
import './strain-browse-view';
import './strain-import-dialog';
import './seeds-genetics-tab';
import './strain-editor-view';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, SeedBatch, PollinationEvent } from '../types';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { dialogStyles } from '../styles/dialog.styles';
import { buildStrainTreeNodes } from '../utils/strain-tree-utils';
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

  // Seeds & Genetics tab state
  @property({ type: Array }) seedBatches: SeedBatch[] = [];
  @property({ type: Array }) pollinationEvents: PollinationEvent[] = [];
  @property({ type: Array }) plants: GrowspaceDevice[] = [];
  @property({ type: String }) initialTab: 'strains' | 'seeds' | 'tree' = 'strains';
  /** When set, the seeds tab opens directly on this sub-view instead of the list. */
  @property({ type: String }) initialSubView?: 'list' | 'log-pollination';
  /** Pre-fills the receiver plant field in the log-pollination form. */
  @property({ type: String }) prefilledReceiverId?: string;
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
    date: string;
    donor_plant_id: string;
    receiver_plant_id: string;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onHarvestSeeds?: (data: {
    event_id: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onUpdatePollination?: (data: {
    event_id: string;
    date?: string;
    donor_plant_id?: string;
    receiver_plant_id?: string;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onDeletePollination?: (event_id: string) => Promise<void>;
  @property({ attribute: false }) onDeleteSeedBatch?: (batch_id: string) => Promise<void>;
  @property({ attribute: false }) onSowSeeds?: (data: {
    growspace_id: string;
    strain: string;
    amount: number;
    seed_batch_id: string;
    generation?: string;
  }) => Promise<void>;

  @state() private _activeMainTab: 'strains' | 'seeds' | 'tree' = 'strains';
  @state() private _libraryFilter: 'library' | 'active' | 'all' = 'library';
  @state() private _treeNodes: TreeNode[] = [];
  @state() private _treeMaximized = false;

  @state() private _importDialogOpen = false;
  @state() private _importReplace = false;
  @state() private _breederDialogOpen = false;

  // Editor navigation state
  @state() private _editingStrain: StrainEntry | undefined = undefined;
  @state() private _cameFromEditor = false;

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has('editingStrain') && this.editingStrain) {
      this._editingStrain = this.editingStrain;
      this._view = 'editor';
    }
    if (
      changedProps.has('strains') ||
      changedProps.has('seedBatches') ||
      changedProps.has('_libraryFilter')
    ) {
      const filteredStrains = this._applyLibraryFilter(this.strains);
      this._treeNodes = buildStrainTreeNodes(this.strains, this.seedBatches, filteredStrains);
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

      .btn-close-tree {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        background: rgba(255, 255, 255, 0.05);
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        padding: 0;
        outline: none;
      }
      .btn-close-tree:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--accent-green, #4caf50);
        color: var(--accent-green, #4caf50);
      }
      .btn-close-tree:focus-visible {
        border-color: var(--accent-green, #4caf50);
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
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
        overflow: hidden;
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
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
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
        transition:
          color 0.2s,
          border-color 0.2s;
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
        background: rgba(255, 255, 255, 0.06);
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
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
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
        transition:
          background 0.15s,
          color 0.15s;
      }
      .seed-batch-edit-btn:hover {
        background: var(--divider-color, rgba(255, 255, 255, 0.1));
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
        background: var(--divider-color, rgba(255, 255, 255, 0.08));
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
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
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
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
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
        background: var(--divider-color, rgba(255, 255, 255, 0.08));
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
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
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
        transition:
          background 0.15s,
          color 0.15s;
      }
      .filter-chip.active {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        border-color: var(--primary-color);
      }
    `,
  ];

  render() {
    if (!this.open) return nothing;

    return html`
      <ha-dialog
        open
        @closed=${() => this.dispatchEvent(new CustomEvent('close'))}
        hideActions
        without-header
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
                    .initialSubView=${this.initialSubView}
                    .prefilledReceiverId=${this.prefilledReceiverId}
                    @close=${() => this.dispatchEvent(new CustomEvent('close'))}
                  ></seeds-genetics-tab>
                `
              : this._view === 'browse'
                ? html`
                    <strain-browse-view
                      .hass=${this.hass}
                      .strains=${this.strains}
                      .activePlantCounts=${this.activePlantCounts}
                      .libraryFilter=${this._libraryFilter}
                      @strain-selected=${(e: CustomEvent) => {
                        this._editingStrain = e.detail.strain;
                        this._view = 'editor';
                      }}
                      @new-strain=${() => {
                        this._editingStrain = undefined;
                        this._view = 'editor';
                      }}
                      @filter-changed=${(e: CustomEvent) => {
                        this._libraryFilter = e.detail.filter;
                      }}
                      @manage-breeders-requested=${() => {
                        this._breederDialogOpen = true;
                      }}
                      @import-requested=${() => {
                        this._importDialogOpen = true;
                      }}
                      @get-recommendation=${() =>
                        this.dispatchEvent(new CustomEvent('get-recommendation'))}
                      @export-library=${() => this.dispatchEvent(new CustomEvent('export-library'))}
                      @strain-delete-confirmed=${(e: CustomEvent) =>
                        this.dispatchEvent(new CustomEvent('delete-strain', { detail: e.detail }))}
                      @close=${() => this.dispatchEvent(new CustomEvent('close'))}
                    ></strain-browse-view>
                  `
                : html`
                    <strain-editor-view
                      .editingStrain=${this._editingStrain}
                      .strains=${this.strains}
                      .store=${this.store}
                      .hass=${this.hass}
                      .source=${this.source}
                      .returnPayload=${this.returnPayload}
                      .onSave=${async (strain: import('../types').StrainEntry) => {
                        await this.store?.actions.strain.update(strain);
                        this._view = 'browse';
                        this._editingStrain = undefined;
                        this.dispatchEvent(new CustomEvent('data-changed'));
                      }}
                      @view-lineage=${(e: CustomEvent) => {
                        this.focusLineage = true;
                        this._cameFromEditor = true;
                        this._activeMainTab = 'tree';
                      }}
                      @editing-strain-changed=${(e: CustomEvent) => {
                        this._editingStrain = e.detail.strain;
                      }}
                      @editor-back=${() => {
                        this._view = 'browse';
                        this._editingStrain = undefined;
                      }}
                      @delete-strain=${(e: CustomEvent) => {
                        this.dispatchEvent(new CustomEvent('delete-strain', { detail: e.detail }));
                        this._view = 'browse';
                        this._editingStrain = undefined;
                      }}
                      @strain-created-at-source=${(e: CustomEvent) => {
                        this.dispatchEvent(
                          new CustomEvent('strain-created-at-source', {
                            detail: e.detail,
                            bubbles: true,
                            composed: true,
                          })
                        );
                      }}
                      @open-print-label=${(e: CustomEvent) => {
                        this.dispatchEvent(
                          new CustomEvent('open-print-label', {
                            detail: e.detail,
                            bubbles: true,
                            composed: true,
                          })
                        );
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
                  `}
        </div>
      </ha-dialog>

      ${this._importDialogOpen ? this.renderImportDialog() : nothing}
      <gs-breeder-manager
        .strains=${this.strains}
        .open=${this._breederDialogOpen}
        @save-breeder=${(e: CustomEvent) =>
          this.dispatchEvent(new CustomEvent('save-breeder', { detail: e.detail }))}
        @update-breeder=${(e: CustomEvent) =>
          this.dispatchEvent(new CustomEvent('update-breeder', { detail: e.detail }))}
        @delete-breeder=${(e: CustomEvent) =>
          this.dispatchEvent(new CustomEvent('delete-breeder', { detail: e.detail }))}
        @close=${() => {
          this._breederDialogOpen = false;
        }}
      ></gs-breeder-manager>
    `;
  }

  private renderImportDialog(): TemplateResult {
    const close = () => {
      this._importDialogOpen = false;
    };
    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="height: auto;">
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
              <button class="md3-button tonal" @click=${close}>Cancel</button>
              <button
                class="md3-button primary"
                @click=${() => {
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
                }}
              >
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

  private _renderTabBar(): TemplateResult {
    return html`
      <div class="main-tab-bar">
        <button
          class="tab-btn ${this._activeMainTab === 'strains' ? 'active' : ''}"
          @click=${() => {
            this._activeMainTab = 'strains';
            this.focusLineage = false;
            this._cameFromEditor = false;
          }}
        >
          Strains
        </button>
        <button
          class="tab-btn ${this._activeMainTab === 'seeds' ? 'active' : ''}"
          @click=${() => {
            this._activeMainTab = 'seeds';
            this.focusLineage = false;
            this._cameFromEditor = false;
          }}
        >
          Seeds &amp; Genetics
        </button>
        <button
          class="tab-btn ${this._activeMainTab === 'tree' ? 'active' : ''}"
          @click=${() => {
            this._activeMainTab = 'tree';
            this.focusLineage = false;
            this._cameFromEditor = false;
          }}
        >
          Tree View
        </button>
        ${this._activeMainTab === 'tree'
          ? html`
              <button
                class="tab-maximize-btn"
                title="${this._treeMaximized ? 'Restore' : 'Maximize'}"
                @click=${() => {
                  this._treeMaximized = !this._treeMaximized;
                }}
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

  private _renderTreeViewTab(): TemplateResult {
    return html`
      <div class="tab-content-tree">
        <div
          style="padding: 8px 16px 0; display: flex; justify-content: space-between; align-items: center;"
        >
          <gs-filter-chips
            .filter=${this._libraryFilter}
            @filter-changed=${(e: CustomEvent) => {
              this._libraryFilter = e.detail.filter;
            }}
          ></gs-filter-chips>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${this._cameFromEditor
              ? html`
                  <button
                    class="btn-back-editor"
                    @click=${() => {
                      this.focusLineage = false;
                      this._cameFromEditor = false;
                      this._activeMainTab = 'strains';
                    }}
                    style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid var(--accent-green, #4caf50); border-radius: 20px; color: var(--accent-green, #4caf50); font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.2s ease-in-out; outline: none; margin-right: 0;"
                    onmouseover="this.style.background='rgba(76, 175, 80, 0.25)'"
                    onmouseout="this.style.background='rgba(76, 175, 80, 0.15)'"
                  >
                    <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiArrowLeft}"></path>
                    </svg>
                    <span>Back to Editor</span>
                  </button>
                `
              : nothing}
            <button
              class="btn-close-tree"
              @click=${() => {
                this.dispatchEvent(new CustomEvent('close'));
              }}
            >
              <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>
        </div>
        <genetics-tree-view
          .nodes=${this._treeNodes}
          .focalId=${this.focusLineage && (this._editingStrain || this.editingStrain)
            ? this._editingStrain?.key || this.editingStrain?.key
            : null}
          .libraryKeys=${new Set(this.strains.map((s) => s.key))}
          @open-strain-editor=${(e: CustomEvent<{ id: string }>) => {
            const strain = this.strains.find((s) => s.key === e.detail.id);
            if (strain) {
              this._editingStrain = strain;
              this._view = 'editor';
              this._activeMainTab = 'strains';
            }
          }}
        ></genetics-tree-view>
      </div>
    `;
  }
}
