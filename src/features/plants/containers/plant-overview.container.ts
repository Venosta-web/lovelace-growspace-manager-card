/**
 * Plant Overview Container - Smart Component
 *
 * Connects ViewModel to UI components and dispatches actions.
 * Handles store access, subscriptions, and event-to-action mapping.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { atom, type ReadableAtom, type WritableAtom } from 'nanostores';
import {
  mdiClose,
  mdiDna,
  mdiDelete,
  mdiCheck,
  mdiFlower,
  mdiCannabis,
  mdiArrowRight,
  mdiContentCopy,
} from '@mdi/js';
import { hassContext, storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity, PlantOverviewEditedAttributes, GrowspaceEvent, PlantTimelineEvent, StrainEntry } from '../../../types';
import { getTimelineService } from '../../../services/timeline-service';
import { dialogStyles } from '../../../styles/dialog.styles';
import {
  createPlantOverviewViewModel,
  createStablePlantOverviewViewModel,
  type PlantOverviewViewModel,
} from '../viewmodels/plant-overview.viewmodel';
import type { HomeAssistant } from 'custom-card-helpers';

// Import UI components
import '../components/plant-dashboard-tab';
import '../components/plant-actions-tab';
import '../components/plant-timeline-tab';
import '../../shared/ui/md3-select';
import '../../shared/ui/md3-number-input';
import '../../shared/ui/lineage-tree';

/**
 * Container component for plant overview dialog
 */
@customElement('plant-overview-container')
export class PlantOverviewContainer extends LitElement {
  // Context
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  // Input props
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) editedAttributes!: PlantOverviewEditedAttributes;
  @property({ type: Boolean, reflect: true }) open = false;

  // Local UI state
  @state() private _activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' | 'genetics' = 'dashboard';
  @state() private _isEditing = true;
  @state() private _showAllDates = false;
  @state() private _showDeleteConfirmation = false;
  @state() private _logbookEvents: GrowspaceEvent[] = [];

  // Stage-aware footer state
  @state() private _moveTargetGrowspaceId = '';

  // Harvest/scoring tab state
  @state() private _harvestMetricsEdit: Record<string, unknown> = {};
  @state() private _scoresEdit: Record<string, number | null> = {};
  @state() private _starPreview: Record<string, number | null> = {};
  @state() private _savingHarvest = false;

  // Score Phenotype in actions tab
  @state() private _showScoringForm = false;
  @state() private _savingScore = false;

  // Genetics tab state
  @state() private _lineageTree: import('../types').LineageNode | null = null;
  @state() private _lineageLoading = false;
  @state() private _sexSaving = false;
  @state() private _seedBatchSearchOpen = false;
  @state() private _seedBatchSearchQuery = '';

  // ViewModel state managed via atoms
  private _plantAtom = atom<PlantEntity | null>(null);
  private _editedAttributesAtom = atom<PlantOverviewEditedAttributes>({} as PlantOverviewEditedAttributes);
  private _uiStateAtom = atom<{
    activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' | 'genetics';
    isEditing: boolean;
    showAllDates: boolean;
    showDeleteConfirmation: boolean;
  }>({
    activeTab: 'dashboard',
    isEditing: true,
    showAllDates: false,
    showDeleteConfirmation: false,
  });
  private _logbookEventsAtom = atom<GrowspaceEvent[]>([]);

  private viewModel!: ReadableAtom<PlantOverviewViewModel>;
  private viewModelController!: StoreController<PlantOverviewViewModel>;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }

      .overview-grid {
        padding: 24px;
        overflow-y: auto;
        max-height: 60vh;
      }

      .tabs-container {
        display: flex;
        gap: 0;
        padding: 0 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }

      .tab-btn {
        background: transparent;
        border: none;
        color: var(--primary-text-color);
        cursor: pointer;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }

      .tab-btn:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      .tab-btn.active {
        border-bottom-color: var(--primary-color, #4caf50);
        color: var(--primary-color, #4caf50);
      }

      .tab-btn svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .delete-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }

      .delete-confirm-card {
        background: var(--card-background-color, #2c2c2c);
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        text-align: center;
      }

      .delete-confirm-card h3 {
        margin: 0 0 16px 0;
        color: var(--error-color, #f44336);
      }

      .delete-confirm-card p {
        margin: 0 0 24px 0;
        opacity: 0.8;
      }

      .delete-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
    `,
  ];

  private _getAttributesFromPlant(): PlantOverviewEditedAttributes {
    const attrs = this.plant?.attributes;
    if (!attrs) return {} as PlantOverviewEditedAttributes;
    return {
      strain: attrs.strain as string | undefined,
      phenotype: attrs.phenotype as string | undefined,
      row: attrs.row as number | undefined,
      col: attrs.col as number | undefined,
      seedling_start: attrs.seedling_start as string | null | undefined,
      mother_start: attrs.mother_start as string | null | undefined,
      clone_start: attrs.clone_start as string | null | undefined,
      veg_start: attrs.veg_start as string | null | undefined,
      flower_start: attrs.flower_start as string | null | undefined,
      dry_start: attrs.dry_start as string | null | undefined,
      cure_start: attrs.cure_start as string | null | undefined,
    };
  }

  connectedCallback(): void {
    super.connectedCallback();

    if (this.plant && this.store) {
      // Initialize atoms with current prop values
      this._plantAtom.set(this.plant);
      // Seed editedAttributes with current plant values so canSave works from the start
      const initialAttrs =
        this.editedAttributes && Object.keys(this.editedAttributes).length > 0
          ? this.editedAttributes
          : this._getAttributesFromPlant();
      this._editedAttributesAtom.set(initialAttrs);
      this._uiStateAtom.set({
        activeTab: this._activeTab,
        isEditing: this._isEditing,
        showAllDates: this._showAllDates,
        showDeleteConfirmation: this._showDeleteConfirmation,
      });

      this.viewModel = createStablePlantOverviewViewModel(
        this._plantAtom,
        this._editedAttributesAtom,
        this._uiStateAtom,
        this.store,
        this._logbookEventsAtom
      );
      this.viewModelController = new StoreController(this, this.viewModel);
      this._initHarvestState();
    }

    // Fetch logbook events asynchronously; the atom update will trigger a re-render
    this._fetchLogbookEvents();
  }

  private _initHarvestState(): void {
    const hm = this.plant?.attributes?.harvest_metrics || {};
    this._harvestMetricsEdit = { ...hm };
    const rawScores = this.plant?.attributes?.scores || {};
    this._scoresEdit = {
      vigor: rawScores.vigor ?? null,
      structure: rawScores.structure ?? null,
      aroma: rawScores.aroma ?? null,
      resin: rawScores.resin ?? null,
      pest_resistance: rawScores.pest_resistance ?? null,
    };
    this._starPreview = {};
  }

  private async _fetchLogbookEvents(): Promise<void> {
    const growspaceId = this.plant?.attributes?.growspace_id;
    if (!growspaceId || !this.hass) return;
    try {
      const service = getTimelineService(this.hass);
      const plantId = this.plant.attributes?.plant_id;
      // Fetch by plantId so events from previous growspaces are included
      const events = plantId
        ? await service.fetchPlantEvents(plantId, growspaceId)
        : await service.fetchGrowspaceEvents(growspaceId);
      
      this._logbookEvents = events;
      this._logbookEventsAtom.set(events);
    } catch (_e) {
      // Non-critical — timeline still shows plant attribute events
    }
  }

  willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('plant') && this.plant) {
      this._initHarvestState();
      this._plantAtom.set(this.plant);

      // Initialize viewModel on first plant arrival if not already done in connectedCallback
      if (!this.viewModelController && this.store) {
        const initialAttrs =
          this.editedAttributes && Object.keys(this.editedAttributes).length > 0
            ? this.editedAttributes
            : this._getAttributesFromPlant();
        this._editedAttributesAtom.set(initialAttrs);
        this._uiStateAtom.set({
          activeTab: this._activeTab,
          isEditing: this._isEditing,
          showAllDates: this._showAllDates,
          showDeleteConfirmation: this._showDeleteConfirmation,
        });
        this.viewModel = createStablePlantOverviewViewModel(
          this._plantAtom,
          this._editedAttributesAtom,
          this._uiStateAtom,
          this.store,
          this._logbookEventsAtom
        );
        this.viewModelController = new StoreController(this, this.viewModel);
      }
    }

    // Update UI state atom when local properties change
    if (
      changedProps.has('_activeTab') ||
      changedProps.has('_isEditing') ||
      changedProps.has('_showAllDates') ||
      changedProps.has('_showDeleteConfirmation')
    ) {
      this._uiStateAtom.set({
        activeTab: this._activeTab,
        isEditing: this._isEditing,
        showAllDates: this._showAllDates,
        showDeleteConfirmation: this._showDeleteConfirmation,
      });
    }
  }

  render(): TemplateResult {
    if (!this.viewModelController) {
      return html``;
    }

    const vm = this.viewModelController.value;

    return html`
      <ha-dialog
        open
        @closed=${this._handleClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${vm.stageColor}">
          ${this._showDeleteConfirmation ? this._renderDeleteOverlay(vm) : nothing}

          <!-- HEADER -->
          ${this._renderHeader(vm)}

          <!-- TABS -->
          ${this._renderTabs()}

          <!-- CONTENT -->
          <div class="overview-grid">
            ${this._activeTab === 'dashboard' ? this._renderDashboard(vm) : nothing}
            ${this._activeTab === 'actions' ? this._renderActions(vm) : nothing}
            ${this._activeTab === 'timeline' ? this._renderTimeline(vm) : nothing}
            ${this._activeTab === 'harvest' ? this._renderHarvestTab() : nothing}
            ${this._activeTab === 'genetics' ? this._renderGeneticsTab() : nothing}
          </div>

          <!-- ACTIONS -->
          ${this._renderFooter(vm)}
        </div>
      </ha-dialog>
    `;
  }

  private _renderHeader(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
          <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${vm.stageIcon}"></path>
          </svg>
        </div>
        <div class="dialog-title-group">
          <h2 class="dialog-title">${vm.displayName}</h2>
          <div class="dialog-subtitle">${vm.displaySubtitle}</div>
        </div>
        <button
          class="md3-button text"
          @click=${this._openStrainEditor}
          style="min-width: auto; padding: 8px;"
          title="Edit Strain Library Entry"
        >
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiDna}"></path>
          </svg>
        </button>
        <button
          class="md3-button text"
          @click=${this._handleClose}
          style="min-width: auto; padding: 8px;"
          aria-label="Close"
          title="Close"
        >
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiClose}"></path>
          </svg>
        </button>
      </div>
    `;
  }

  private _renderTabs(): TemplateResult {
    const stage = (this.plant?.state || '').toLowerCase();
    const showHarvestTab = ['dry', 'drying', 'cure', 'curing'].includes(stage);
    return html`
      <div class="tabs-container">
        <button
          class="tab-btn ${this._activeTab === 'dashboard' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'dashboard')}
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z"
            ></path>
          </svg>
          Overview
        </button>
        <button
          class="tab-btn ${this._activeTab === 'actions' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'actions')}
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M7,2V13H10V22L17,10H13L17,2H7Z"
            ></path>
          </svg>
          Actions
        </button>
        <button
          class="tab-btn ${this._activeTab === 'timeline' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'timeline')}
        >
          <svg viewBox="0 0 24 24">
            <path
              d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"
            ></path>
          </svg>
          Timeline
        </button>
        ${showHarvestTab ? html`
          <button
            class="tab-btn ${this._activeTab === 'harvest' ? 'active' : ''}"
            @click=${() => {
              this._activeTab = 'harvest';
              this._initHarvestState();
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="${mdiCannabis}"></path>
            </svg>
            Scoring & Harvest
          </button>
        ` : nothing}
        <button
          class="tab-btn ${this._activeTab === 'genetics' ? 'active' : ''}"
          @click=${() => {
            this._activeTab = 'genetics';
            this._loadLineageTree();
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="${mdiDna}"></path>
          </svg>
          Genetics
        </button>
      </div>
    `;
  }

  private _renderDashboard(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <plant-dashboard-tab
        .plant=${vm.plant}
        .editedAttributes=${vm.editedAttributes}
        .plantStats=${vm.plantStats}
        .isEditing=${vm.isEditing}
        .showAllDates=${this._showAllDates}
        @attribute-change=${this._handleAttributeChange}
        @toggle-dates=${this._handleToggleDates}
      ></plant-dashboard-tab>
    `;
  }

  private _renderActions(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <plant-actions-tab
        .availableActions=${vm.availableActions}
        @action-click=${this._handleActionClick}
      ></plant-actions-tab>
      ${this._renderScorePhenotypeSection()}
    `;
  }

  private _renderTimeline(_vm: PlantOverviewViewModel): TemplateResult {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    const events = this._buildTimelineEvents(plantId);
    return html`
      <plant-timeline-tab
        .hass=${this.hass}
        .plantId=${plantId}
        .events=${events}
        @timeline-refresh=${this._fetchLogbookEvents}
      ></plant-timeline-tab>
    `;
  }

  private _buildTimelineEvents(plantId: string): PlantTimelineEvent[] {
    const recordedEvents: PlantTimelineEvent[] = this.plant.attributes?.events || [];

    // Milestones from plant attribute dates
    const milestoneFields = [
      { key: 'planted_date', label: 'Planted' },
      { key: 'seedling_start', label: 'Seedling' },
      { key: 'mother_start', label: 'Mother' },
      { key: 'clone_start', label: 'Clone' },
      { key: 'veg_start', label: 'Vegetative' },
      { key: 'flower_start', label: 'Flowering' },
      { key: 'dry_start', label: 'Drying' },
      { key: 'cure_start', label: 'Curing' },
      { key: 'harvest_date', label: 'Harvested' },
    ];
    const milestones: PlantTimelineEvent[] = [];
    milestoneFields.forEach((field) => {
      const date = (this.plant.attributes as Record<string, unknown>)?.[field.key];
      if (date) {
        milestones.push({ type: 'milestone', date: String(date), label: field.label });
      }
    });

    // Logbook events — same filtering logic as plant-overview-dialog
    const normalize = (s?: string) => s?.toLowerCase().trim() || '';
    const trainingTechniques = ['topping', 'fim', 'lst', 'super_cropping', 'scrog', 'defoliating', 'lollipopping'];

    const logbookEvents: PlantTimelineEvent[] = this._logbookEvents
      .filter((e) => {
        const cat = normalize(e.category);
        const type = normalize(e.sensor_type);
        const reasons = e.reasons || [];

        const isWatering =
          cat === 'irrigation' ||
          (cat === 'environmental' && ['irrigation', 'drain'].includes(type)) ||
          ['irrigation', 'drain', 'water'].includes(type) ||
          type.includes('water');
        const isTraining = cat === 'training' || trainingTechniques.some((t) => type.includes(t));
        const isIPM = cat === 'ipm' || type.startsWith('ipm_');
        const isNote = cat === 'note';
        const isEnvReport = cat === 'environmental_report';

        if (!isWatering && !isTraining && !isIPM && !isNote && !isEnvReport) return false;

        if (isNote) {
          return e.plant_id === plantId;
        }
        if (cat === 'irrigation' && !reasons.some((r) => r.startsWith('plant_id:'))) {
          return true;
        }
        if (isEnvReport) return true;

        return reasons.some((r) => {
          const rLower = r.toLowerCase();
          return rLower.startsWith('plant_id:') && rLower.replace('plant_id:', '').trim() === plantId.toLowerCase();
        });
      })
      .map((e) => {
        const cat = normalize(e.category);
        if (cat === 'note') {
          return {
            type: 'note',
            date: (e as GrowspaceEvent & { timestamp?: string }).timestamp || e.start_time,
            text: (e as GrowspaceEvent & { notes?: string }).notes || '',
            images: (e as GrowspaceEvent & { images?: string[] }).images,
            tags: (e as GrowspaceEvent & { tags?: string[] }).tags,
            event_id: (e as GrowspaceEvent & { event_id?: string }).event_id,
          } as PlantTimelineEvent;
        }
        if (cat === 'environmental_report') {
          return {
            type: 'environmental_report',
            date: e.start_time,
            sensor_type: e.sensor_type,
            reasons: e.reasons,
            event_id: (e as GrowspaceEvent & { event_id?: string }).event_id,
          } as PlantTimelineEvent;
        }
        return {
          type: 'action',
          date: e.start_time,
          action:
            e.category === 'watering' || e.category === 'irrigation' ? 'water' : e.category || e.sensor_type,
          details: (e.reasons || [])
            .filter((r) => {
              const rLower = r.toLowerCase();
              return !rLower.startsWith('plant_id:') && !rLower.startsWith('plants:') && !rLower.startsWith('plant:');
            })
            .join(', '),
          event_id: (e as GrowspaceEvent & { event_id?: string }).event_id,
        } as PlantTimelineEvent;
      });

    return [...recordedEvents, ...milestones, ...logbookEvents];
  }

  private _renderFooter(vm: PlantOverviewViewModel): TemplateResult {
    const stage = (this.plant?.state || '').toLowerCase();
    const growspaceOptions = vm.growspaceOptions;
    const growspaceEntries = Object.entries(growspaceOptions).filter(
      ([id]) => id !== this.plant?.attributes?.growspace_id
    );

    return html`
      <div
        class="dialog-actions"
        style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 16px 24px; border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); flex-wrap: wrap;"
      >
        <div class="standard-actions" style="display:flex; gap:12px;">
          <button class="md3-button danger" @click=${() => this._handleDelete(vm.plantId)}>
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiDelete}"></path>
            </svg>
            Delete
          </button>
        </div>

        ${this._activeTab === 'dashboard' ? html`
          <div class="dynamic-actions" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <!-- Mother/Veg/Flower: Take Clone with count -->
            ${['mother', 'veg', 'flower'].includes(stage || '') ? html`
              <div style="display:flex; align-items:center; gap:8px;">
                <md3-number-input
                  id="clone-count-input"
                  .value=${1}
                  .min=${1}
                  .max=${10}
                  style="width: 80px;"
                ></md3-number-input>
                <button
                  class="md3-button primary"
                  @click=${(e: MouseEvent) => {
                    const container = (e.currentTarget as HTMLElement).closest('.dynamic-actions');
                    const input = container?.querySelector('#clone-count-input') as HTMLInputElement;
                    const val = input ? parseInt(input.value, 10) : 1;
                    this._handleTakeClone(isNaN(val) ? 1 : val);
                  }}
                >
                  <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                    <path d="${mdiContentCopy}"></path>
                  </svg>
                  Take Clone
                </button>
              </div>
            ` : nothing}

            <!-- Flower: Harvest -->
            ${stage === 'flower' || stage === 'flowering' ? html`
              <button class="md3-button primary" @click=${this._handleHarvest}>
                <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                  <path d="${mdiFlower}"></path>
                </svg>
                Harvest
              </button>
            ` : nothing}

            <!-- Dry: Finish Drying -->
            ${stage === 'dry' || stage === 'drying' ? html`
              <button class="md3-button primary" @click=${this._handleFinishDrying}>
                <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                  <path d="${mdiCannabis}"></path>
                </svg>
                Finish Drying
              </button>
            ` : nothing}

            <!-- Move to Growspace (all active plants) -->
            ${growspaceEntries.length > 0 ? html`
              <div style="display:flex; align-items:center; gap:8px;">
                <md3-select
                  label="Move to Growspace"
                  .value=${this._moveTargetGrowspaceId}
                  .options=${growspaceEntries.map(([id, name]) => ({ label: name, value: id }))}
                  style="width: 200px;"
                  @change=${(e: CustomEvent) => (this._moveTargetGrowspaceId = e.detail)}
                ></md3-select>
                <button
                  class="md3-button primary"
                  @click=${this._handleMovePlant}
                  style="margin-top: 24px;"
                  ?disabled=${!this._moveTargetGrowspaceId}
                >
                  <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                    <path d="${mdiArrowRight}"></path>
                  </svg>
                  Move
                </button>
              </div>
            ` : nothing}
          </div>
        ` : nothing}

        <div class="primary-actions" style="display:flex; gap:12px;">
          <button class="md3-button outlined" @click=${this._handleClose}>Cancel</button>
          <button
            class="md3-button filled"
            @click=${this._handleSave}
            ?disabled=${!vm.canSave}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiCheck}"></path>
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    `;
  }

  private _renderDeleteOverlay(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <div class="delete-overlay">
        <div class="delete-confirm-card">
          <h3>Delete Plant?</h3>
          <p>
            Are you sure you want to delete <strong>${vm.displayName}</strong>? This action cannot
            be undone.
          </p>
          <div class="delete-actions">
            <button class="md3-button outlined" @click=${this._cancelDelete}>Cancel</button>
            <button class="md3-button danger" @click=${this._confirmDelete}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // Event handlers

  private _handleClose(): void {
    // Guard: only close if this dialog is still the active one.
    // When an action (e.g. water, train) changes $activeDialog to a sub-dialog,
    // ha-dialog fires 'closed' on DOM removal — without this check that would
    // immediately close the just-opened sub-dialog.
    // If $activeDialog is unavailable (e.g. in tests), fall through and close.
    const activeType = this.store?.ui?.$activeDialog?.get()?.type;
    if (!activeType || activeType === 'PLANT_OVERVIEW') {
      this.store.ui.closeDialog();
    }
  }

  private _handleAttributeChange(e: CustomEvent): void {
    const { key, value } = e.detail;
    this._editedAttributesAtom.set({
      ...this._editedAttributesAtom.get(),
      [key]: value,
    });
  }

  private _handleToggleDates(): void {
    this._showAllDates = !this._showAllDates;
  }

  private _handleSave(): void {
    this.dispatchEvent(
      new CustomEvent('update-plant', {
        detail: this._editedAttributesAtom.get(),
        bubbles: true,
        composed: true,
      })
    );
    this._handleClose();
  }

  private _handleDelete(_plantId: string): void {
    this._showDeleteConfirmation = true;
  }

  private _confirmDelete(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.actions.plant.delete(plantId);
    this._handleClose();
  }

  private _cancelDelete(): void {
    this._showDeleteConfirmation = false;
  }

  private _handleActionClick(e: CustomEvent): void {
    const { actionId } = e.detail;

    // Open appropriate dialogs based on action
    switch (actionId) {
      case 'water':
        this._openWatering();
        break;
      case 'training':
        this._openTraining();
        break;
      case 'ipm':
        this._openIPM();
        break;
      case 'clone':
        this._openClone();
        break;
      case 'print_label':
        this._openPrintLabel();
        break;
      case 'pollinate':
        this._openLogPollination();
        break;
    }
  }

  private _handleHarvest(): void {
    this.store.actions.plant.harvest(this.plant);
  }

  private _handleFinishDrying(): void {
    this.store.actions.plant.finishDrying(this.plant);
  }

  private _handleMovePlant(): void {
    if (!this._moveTargetGrowspaceId) return;
    this.store.actions.plant.move(this.plant, this._moveTargetGrowspaceId);
    this._handleClose();
  }

  private _handleTakeClone(numClones: number): void {
    // Reuse the existing clone dialog, passing numClones via payload when supported
    this._openClone();
    void numClones; // clone dialog handles count internally
  }

  private _openLogPollination(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.dispatchEvent(
      new CustomEvent('open-log-pollination', {
        detail: { plantId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openPrintLabel(): void {
    const plantId =
      this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'PRINT_LABEL',
      payload: {
        plantId,
      },
    });
  }

  private _openWatering(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'WATERING',
      payload: {
        plantIds: [plantId],
        growspaceId: this.plant.attributes?.growspace_id,
        mode: 'plant',
      },
    });
  }

  private _openTraining(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'TRAINING',
      payload: {
        isOpen: true,
        plantIds: [plantId],
        growspaceId: this.plant.attributes?.growspace_id,
      },
    });
  }

  private _openIPM(): void {
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    this.store.ui.setActiveDialog({
      type: 'IPM',
      payload: {
        plantIds: [plantId],
        growspaceId: this.plant.attributes?.growspace_id,
      },
    });
  }

  private _openClone(): void {
    this.store.ui.setActiveDialog({
      type: 'TAKE_CLONE',
      payload: {
        sourcePlant: this.plant,
        defaultGrowspaceId: this.plant.attributes?.growspace_id || '',
      },
    });
  }

  private _openStrainEditor(): void {
    const strain = this.plant?.attributes?.strain ?? '';
    const phenotype = this.plant?.attributes?.phenotype ?? '';
    const strainLibrary = this.store.data.$strainLibrary.get();
    let strainEntry: StrainEntry | undefined = strainLibrary.find((s) => {
      const entryPhenotype = s.phenotype || '';
      return s.strain === strain && entryPhenotype === phenotype;
    });
    if (!strainEntry && strain) {
      const key = phenotype ? `${strain}_${phenotype}` : strain;
      strainEntry = {
        strain,
        phenotype,
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
      payload: { editingStrain: strainEntry },
    });
  }

  // ── Harvest / Scoring tab ──────────────────────────────────────────────────

  private _setScore(key: string, value: number): void {
    const current = this._scoresEdit[key];
    this._scoresEdit = { ...this._scoresEdit, [key]: current === value ? null : value };
  }

  private _renderScoreRow(dim: { key: string; label: string; description: string; emoji: string }): TemplateResult {
    const current = this._scoresEdit[dim.key] as number | null;
    const preview = this._starPreview[dim.key] as number | null;
    return html`
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="display:flex; align-items:center; gap:8px; font-weight:500; font-size:0.95rem;">
            <span style="font-size:1.2rem;">${dim.emoji}</span>
            ${dim.label}
          </span>
          <span style="font-size:0.95rem; opacity:0.7; min-width:30px; text-align:right;">
            ${current !== null && current !== undefined ? `${current} / 5` : '—'}
          </span>
        </div>
        <p style="font-size:0.8rem; opacity:0.5; margin:0;">${dim.description}</p>
        <div style="display:flex; gap:6px; margin-top:4px;">
          ${[1, 2, 3, 4, 5].map(star => html`
            <button
              style="background:none; border:none; padding:0; cursor:pointer; font-size:1.6rem; line-height:1; transition:transform 0.1s, filter 0.15s;
                filter: ${(current !== null && star <= current) || (preview !== null && star <= preview)
                  ? 'grayscale(0) opacity(1)'
                  : 'grayscale(0.6) opacity(0.5)'};"
              aria-label="Set ${dim.label} score to ${star}"
              @mouseenter=${() => { this._starPreview = { ...this._starPreview, [dim.key]: star }; }}
              @mouseleave=${() => { this._starPreview = { ...this._starPreview, [dim.key]: null }; }}
              @click=${() => this._setScore(dim.key, star)}
              ?disabled=${this._savingHarvest}
            >⭐</button>
          `)}
        </div>
      </div>
    `;
  }

  private async _loadLineageTree(): Promise<void> {
    const plantId = this.plant?.attributes?.plant_id;
    if (!plantId || !this.store) return;
    this._lineageLoading = true;
    this._lineageTree = null;
    try {
      const tree = await this.store.actions.genetics.getLineageTree(plantId);
      this._lineageTree = tree;
    } catch {
      this._lineageTree = null;
    } finally {
      this._lineageLoading = false;
    }
  }

  private _renderGeneticsTab(): TemplateResult {
    const plant = this.plant;
    const attrs = plant?.attributes ?? {};
    const sex = (attrs.sex as string) ?? 'unknown';
    const seedBatchId = attrs.seed_batch_id as string | null ?? null;
    const generation = (attrs.generation as string) ?? '';

    const sexOptions = [
      { value: 'unknown', label: 'Unknown' },
      { value: 'female', label: '♀ Female' },
      { value: 'male', label: '♂ Male' },
      { value: 'hermaphrodite', label: '⚥ Hermaphrodite' },
    ];

    return html`
      <div style="padding: 16px; display: flex; flex-direction: column; gap: 20px;">

        <!-- Identity -->
        <div>
          <h4 style="margin: 0 0 12px; font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px;">Sex</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${sexOptions.map(opt => html`
              <button
                class="md3-chip ${sex === opt.value ? 'selected' : ''}"
                style="
                  padding: 6px 14px;
                  border-radius: 20px;
                  border: 1px solid ${sex === opt.value ? 'var(--primary-color)' : 'var(--divider-color)'};
                  background: ${sex === opt.value ? 'var(--primary-color)' : 'transparent'};
                  color: ${sex === opt.value ? 'var(--text-primary-color, #fff)' : 'var(--primary-text-color)'};
                  font-size: 13px;
                  cursor: pointer;
                "
                ?disabled=${this._sexSaving}
                @click=${async () => {
                  if (sex === opt.value) return;
                  this._sexSaving = true;
                  try {
                    await this.store?.actions.genetics.setPlantSex(attrs.plant_id as string, opt.value);
                  } finally {
                    this._sexSaving = false;
                  }
                }}
              >${opt.label}</button>
            `)}
          </div>
        </div>

        <!-- Seed batch origin -->
        <div>
          <h4 style="margin: 0 0 12px; font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px;">Origin</h4>
          ${seedBatchId
            ? html`
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="
                    background: rgba(139,195,74,0.15);
                    border: 1px solid #8bc34a;
                    border-radius: 16px;
                    padding: 4px 12px;
                    font-size: 13px;
                  ">🌱 ${seedBatchId}${generation ? ` · ${generation}` : ''}</span>
                  <button
                    class="md3-button text"
                    style="font-size: 12px; color: var(--secondary-text-color);"
                    @click=${async () => {
                      await this.store?.actions.genetics.sowSeed(seedBatchId, attrs.plant_id as string);
                    }}
                  >Unlink</button>
                </div>
              `
            : html`
                <div>
                  <button
                    class="md3-button tonal"
                    style="font-size: 13px;"
                    @click=${() => { this._seedBatchSearchOpen = !this._seedBatchSearchOpen; }}
                  >🔗 Link to seed batch</button>
                  ${this._seedBatchSearchOpen ? html`
                    <div style="margin-top: 8px; padding: 12px; border: 1px solid var(--divider-color); border-radius: 8px;">
                      <p style="font-size: 12px; color: var(--secondary-text-color); margin: 0 0 8px;">
                        To link this plant to a seed batch, use the Seed Inventory panel in Strain Library → Seeds tab, then tap Sow.
                      </p>
                    </div>
                  ` : nothing}
                </div>
              `
          }
        </div>

        <!-- Lineage tree -->
        <div>
          <h4 style="margin: 0 0 12px; font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px;">Lineage</h4>
          <lineage-tree
            .node=${this._lineageTree}
            .loading=${this._lineageLoading}
          ></lineage-tree>
        </div>
      </div>
    `;
  }

  private _renderHarvestTab(): TemplateResult {
    const SCORE_DIMENSIONS = [
      { key: 'vigor', label: 'Vigor', description: 'Overall plant health, growth rate, and robustness', emoji: '💪' },
      { key: 'structure', label: 'Structure', description: 'Branch spacing, internodal distance, and bud site density', emoji: '🌿' },
      { key: 'aroma', label: 'Aroma', description: 'Terpene expression — potency and complexity of smell', emoji: '👃' },
      { key: 'resin', label: 'Resin', description: 'Trichome coverage and density', emoji: '💎' },
      { key: 'pest_resistance', label: 'Pest resistance', description: 'Resilience against pests and disease during the run', emoji: '🛡️' },
    ];
    const isSaving = this._savingHarvest;
    const hm = this._harvestMetricsEdit as Record<string, number | string | null>;
    const stage = (this.plant?.state || '').toLowerCase();
    const advanceLabel = (stage === 'dry' || stage === 'drying') ? '🌿 Skip & begin cure' : '📦 Skip & finish';

    return html`
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">

        <!-- Score Grid -->
        <div style="display:flex; flex-direction:column; gap:20px; padding:8px 0;">
          ${SCORE_DIMENSIONS.map(dim => this._renderScoreRow(dim))}
        </div>
        <p style="font-size:0.8rem; opacity:0.45; margin:8px 0 0; text-align:center;">
          All fields are optional — you can advance without scoring.
        </p>

        <hr style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;" />

        <!-- Yield Metrics -->
        <div>
          <p style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;">Yield metrics</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">Wet weight (g)</label>
              <input type="number" min="0" step="0.1" placeholder="e.g. 120"
                .value=${String(hm.wet_weight ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, wet_weight: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">Dry weight (g)</label>
              <input type="number" min="0" step="0.1" placeholder="e.g. 28"
                .value=${String(hm.dry_weight ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, dry_weight: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">Trim weight (g)</label>
              <input type="number" min="0" step="0.1" placeholder="e.g. 5"
                .value=${String(hm.trim_weight ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, trim_weight: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;" />

        <!-- Lab Results -->
        <div>
          <p style="font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; opacity:0.6; margin:0 0 12px;">Lab results</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">THC (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 24.5"
                .value=${String(hm.thc_percentage ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, thc_percentage: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <label style="font-size:0.75rem; opacity:0.7;">CBD (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 0.3"
                .value=${String(hm.cbd_percentage ?? '')}
                @input=${(e: InputEvent) => {
                  const v = (e.target as HTMLInputElement).value;
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, cbd_percentage: v === '' ? null : parseFloat(v) };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box;"
              />
            </div>
            <div style="display:flex; flex-direction:column; gap:4px; grid-column: 1 / -1;">
              <label style="font-size:0.75rem; opacity:0.7;">Terpene profile</label>
              <textarea rows="2" placeholder="e.g. myrcene, limonene, caryophyllene"
                .value=${String(hm.terpene_profile ?? '')}
                @input=${(e: InputEvent) => {
                  this._harvestMetricsEdit = { ...this._harvestMetricsEdit, terpene_profile: (e.target as HTMLTextAreaElement).value };
                }}
                ?disabled=${isSaving}
                style="background:var(--card-background-color, rgba(255,255,255,0.06)); border:1px solid var(--divider-color, rgba(255,255,255,0.15)); border-radius:8px; color:var(--primary-text-color); font-size:0.9rem; padding:6px 10px; width:100%; box-sizing:border-box; resize:vertical;"
              ></textarea>
            </div>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0;" />

        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <button
            class="md3-button outlined"
            @click=${() => this._skipAndAdvance()}
            ?disabled=${isSaving}
          >${advanceLabel}</button>
          <button
            class="md3-button filled"
            style="background: linear-gradient(135deg, #388e3c, #4caf50);"
            @click=${() => this._saveHarvestMetrics()}
            ?disabled=${isSaving}
          >${isSaving ? 'Saving…' : '🌾 Save scores & metrics'}</button>
        </div>
      </div>
    `;
  }

  private _skipAndAdvance(): void {
    if (this._savingHarvest) return;
    const stage = (this.plant?.state || '').toLowerCase();
    if (stage === 'dry' || stage === 'drying') {
      this._handleFinishDrying();
    } else {
      this._handleHarvest();
    }
  }

  private async _saveHarvestMetrics(): Promise<void> {
    if (!this.plant?.attributes?.plant_id) return;
    this._savingHarvest = true;
    try {
      const plantId = this.plant.attributes.plant_id;
      await this.store.actions.plant.saveHarvestMetrics(plantId, this._harvestMetricsEdit);
      await this.store.actions.plant.scorePhenotype(plantId, this._scoresEdit);
      this._activeTab = 'dashboard';
    } catch (e) {
      // Toast is handled inside the action; just catch to prevent unhandled rejection
      console.error('Failed to save harvest metrics', e);
    } finally {
      this._savingHarvest = false;
    }
  }

  // ── Score Phenotype (actions tab) ─────────────────────────────────────────

  private _renderScorePhenotypeSection(): TemplateResult {
    const SCORE_DIMENSIONS = [
      { key: 'vigor', label: 'Vigor', description: 'Overall plant health, growth rate, and robustness', emoji: '💪' },
      { key: 'structure', label: 'Structure', description: 'Branch spacing, internodal distance, and bud site density', emoji: '🌿' },
      { key: 'aroma', label: 'Aroma', description: 'Terpene expression — potency and complexity of smell', emoji: '👃' },
      { key: 'resin', label: 'Resin', description: 'Trichome coverage and density', emoji: '💎' },
      { key: 'pest_resistance', label: 'Pest resistance', description: 'Resilience against pests and disease during the run', emoji: '🛡️' },
    ];
    return html`
      <div style="background:var(--secondary-background-color, rgba(255,255,255,0.05)); border-radius:12px; padding:16px; grid-column: 1 / -1;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${this._showScoringForm ? '16px' : '0'};">
          <h3 style="margin:0;">Score Phenotype</h3>
          <button
            class="md3-button outlined"
            @click=${() => { this._showScoringForm = !this._showScoringForm; }}
          >${this._showScoringForm ? 'Cancel' : 'Score'}</button>
        </div>
        ${this._showScoringForm ? html`
          <div style="display:flex; flex-direction:column; gap:20px; padding:8px 0;">
            ${SCORE_DIMENSIONS.map(dim => this._renderScoreRow(dim))}
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top:16px;">
            <button
              class="md3-button filled"
              @click=${() => this._savePhenotypeScore()}
              ?disabled=${this._savingScore}
            >${this._savingScore ? 'Saving…' : 'Save scores'}</button>
          </div>
        ` : html`
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px; pointer-events:none; opacity:0.7;">
            ${SCORE_DIMENSIONS.map(dim => {
              const val = this._scoresEdit[dim.key];
              return html`
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:flex; align-items:center; gap:8px; font-size:0.95rem;">
                    <span>${dim.emoji}</span>${dim.label}
                  </span>
                  <span style="font-size:0.95rem; opacity:0.7;">${val !== null && val !== undefined ? `${val} / 5` : '—'}</span>
                </div>
              `;
            })}
          </div>
        `}
      </div>
    `;
  }

  private async _savePhenotypeScore(): Promise<void> {
    if (!this.plant?.attributes?.plant_id) return;
    this._savingScore = true;
    try {
      const plantId = this.plant.attributes.plant_id;
      await this.store.actions.plant.scorePhenotype(plantId, this._scoresEdit);
      this._showScoringForm = false;
    } catch (e) {
      // Toast is handled inside the action; just catch to prevent unhandled rejection
      console.error('Failed to save phenotype scores', e);
    } finally {
      this._savingScore = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-overview-container': PlantOverviewContainer;
  }
}
