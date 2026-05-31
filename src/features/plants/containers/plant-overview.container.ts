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
import { atom, type ReadableAtom } from 'nanostores';
import {
  mdiClose,
  mdiDna,
  mdiDelete,
  mdiCheck,
  mdiFlower,
  mdiCannabis,
  mdiContentCopy,
  mdiWater,
  mdiFlask,
  mdiDumbbell,
  mdiCamera,
  mdiNoteOutline,
} from '@mdi/js';
import { hassContext, storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import {
  PlantStage,
  type PlantEntity,
  type PlantOverviewEditedAttributes,
  type GrowspaceEvent,
  type PlantTimelineEvent,
  type StrainEntry,
} from '../../../types';
import { fetchPlantEvents, fetchGrowspaceEvents } from '../../../slices/logbook';
import { strainLibrary$ } from '../../../slices/strain';
import { dialogStyles } from '../../../styles/dialog.styles';
import {
  createStablePlantOverviewViewModel,
  type PlantOverviewViewModel,
} from '../viewmodels/plant-overview.viewmodel';
import type { HomeAssistant } from 'custom-card-helpers';

// Import UI components
import '../components/plant-dashboard-tab';
import '../components/plant-actions-tab';
import '../components/plant-timeline-tab';
import '../components/plant-harvest-tab';
import '../components/plant-drying-tab';
import '../../shared/ui/md3-select';
import '../../shared/ui/md3-number-input';

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
  @state() private _activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' = 'dashboard';
  @state() private _isEditing = true;
  @state() private _showAllDates = false;
  @state() private _showDeleteConfirmation = false;
  @state() private _logbookEvents: GrowspaceEvent[] = [];

  // ViewModel state managed via atoms
  private _plantAtom = atom<PlantEntity | null>(null);
  private _editedAttributesAtom = atom<PlantOverviewEditedAttributes>(
    {} as PlantOverviewEditedAttributes
  );
  private _uiStateAtom = atom<{
    activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest';
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
        max-height: 70vh;
      }

      .tabs-container {
        display: flex;
        gap: 0;
        padding: 0 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .tabs-container::-webkit-scrollbar {
        display: none;
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

      .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        font-size: 0.65rem;
        font-weight: 600;
        background: var(--primary-color, #4caf50);
        color: #fff;
        line-height: 1;
        margin-left: 2px;
      }

      .tab-btn svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .quickbar {
        display: flex;
        gap: 6px;
        padding: 10px 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        background: rgba(0, 0, 0, 0.15);
        overflow-x: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      .quickbar::-webkit-scrollbar {
        display: none;
      }

      .quickbar-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: var(--primary-text-color);
        font-size: 0.78rem;
        font-weight: 500;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .quickbar-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .quickbar-btn svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
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
    }

    // Fetch logbook events asynchronously; the atom update will trigger a re-render
    this._fetchLogbookEvents();
  }

  private async _fetchLogbookEvents(): Promise<void> {
    const growspaceId = this.plant?.attributes?.growspace_id;
    if (!growspaceId || !this.hass) return;
    try {
      const plantId = this.plant.attributes?.plant_id;
      // Fetch by plantId so events from previous growspaces are included
      const events = plantId
        ? await fetchPlantEvents(plantId, growspaceId)
        : await fetchGrowspaceEvents(growspaceId);

      this._logbookEvents = events;
      this._logbookEventsAtom.set(events);
    } catch (_e) {
      // Non-critical — timeline still shows plant attribute events
    }
  }

  willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('plant') && this.plant) {
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
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${vm.stageColor}">
          ${this._showDeleteConfirmation ? this._renderDeleteOverlay(vm) : nothing}

          <!-- HEADER -->
          ${this._renderHeader(vm)}

          <!-- QUICKBAR -->
          ${this._renderQuickbar()}

          <!-- TABS -->
          ${this._renderTabs(vm)}

          <!-- CONTENT -->
          <div class="overview-grid">
            ${this._activeTab === 'dashboard' ? this._renderDashboard(vm) : nothing}
            ${this._activeTab === 'actions' ? this._renderActions(vm) : nothing}
            ${this._activeTab === 'timeline' ? this._renderTimeline(vm) : nothing}
            ${this._activeTab === 'harvest' ? this._renderHarvestTab() : nothing}
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
          class="md3-button text header-action-btn"
          @click=${this._openStrainEditor}
          style="min-width: auto; padding: 8px;"
          title="Edit Strain Library Entry"
        >
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
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

  private _renderQuickbar(): TemplateResult | typeof nothing {
    const stage = (this.plant?.state || '').toLowerCase();
    const liveStages = ['seedling', 'clone', 'veg', 'vegetative', 'mother', 'flower', 'flowering'];
    if (!liveStages.includes(stage)) return nothing;

    const canWater = true;
    const canFeed = true;
    const canTrain = ['veg', 'vegetative', 'mother', 'flower', 'flowering'].includes(stage);
    const canPhoto = true;
    const canNote = true;

    return html`
      <div class="quickbar">
        ${canWater
          ? html`
              <button class="quickbar-btn" @click=${this._openWatering} title="Log watering">
                <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
                Water
              </button>
            `
          : nothing}
        ${canFeed
          ? html`
              <button class="quickbar-btn" @click=${this._openNutrients} title="Log feeding">
                <svg viewBox="0 0 24 24"><path d="${mdiFlask}"></path></svg>
                Feed
              </button>
            `
          : nothing}
        ${canTrain
          ? html`
              <button class="quickbar-btn" @click=${this._openTraining} title="Log training">
                <svg viewBox="0 0 24 24"><path d="${mdiDumbbell}"></path></svg>
                Train
              </button>
            `
          : nothing}
        ${canPhoto
          ? html`
              <button
                class="quickbar-btn"
                @click=${this._openSnapshots}
                title="Take or view snapshots"
              >
                <svg viewBox="0 0 24 24"><path d="${mdiCamera}"></path></svg>
                Photo
              </button>
            `
          : nothing}
        ${canNote
          ? html`
              <button class="quickbar-btn" @click=${this._openLogbook} title="Add a note">
                <svg viewBox="0 0 24 24"><path d="${mdiNoteOutline}"></path></svg>
                Note
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderTabs(vm: PlantOverviewViewModel): TemplateResult {
    const stage = (this.plant?.state || '').toLowerCase();
    const showHarvestTab = ['dry', 'drying', 'cure', 'curing'].includes(stage);
    const enabledActionCount = vm.availableActions.filter((a) => a.enabled).length;
    return html`
      <div class="tabs-container">
        <button
          class="tab-btn ${this._activeTab === 'dashboard' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'dashboard')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z"></path>
          </svg>
          Overview
        </button>
        <button
          class="tab-btn ${this._activeTab === 'actions' ? 'active' : ''}"
          @click=${() => (this._activeTab = 'actions')}
        >
          <svg viewBox="0 0 24 24">
            <path d="M7,2V13H10V22L17,10H13L17,2H7Z"></path>
          </svg>
          Actions
          ${enabledActionCount > 0
            ? html`<span class="tab-badge">${enabledActionCount}</span>`
            : nothing}
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
        ${showHarvestTab
          ? html`
              <button
                class="tab-btn ${this._activeTab === 'harvest' ? 'active' : ''}"
                @click=${() => {
                  this._activeTab = 'harvest';
                }}
              >
                <svg viewBox="0 0 24 24">
                  <path d="${mdiCannabis}"></path>
                </svg>
                Harvest
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderDashboard(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      ${this._renderLifecycleTrack(vm)}
      <plant-dashboard-tab
        .plant=${vm.plant}
        .editedAttributes=${vm.editedAttributes}
        .plantStats=${vm.plantStats}
        .growspaceOptions=${vm.growspaceOptions}
        .isEditing=${vm.isEditing}
        .showAllDates=${this._showAllDates}
        @attribute-change=${this._handleAttributeChange}
        @toggle-dates=${this._handleToggleDates}
        @open-strain-editor=${this._openStrainEditor}
        @move-plant=${this._handleMovePlantEvent}
      ></plant-dashboard-tab>
    `;
  }

  private _renderLifecycleTrack(vm: PlantOverviewViewModel): TemplateResult | typeof nothing {
    const attrs = vm.plant?.attributes;
    if (!attrs) return nothing;
    const currentStage = (vm.plant.state || '').toLowerCase();

    const stages: Array<{ key: string; label: string; daysAttr: string }> = [
      { key: 'seedling', label: 'Seed', daysAttr: 'seedling_days' },
      { key: 'clone', label: 'Clone', daysAttr: 'clone_days' },
      { key: 'veg', label: 'Veg', daysAttr: 'veg_days' },
      { key: 'mother', label: 'Mother', daysAttr: 'mother_days' },
      { key: 'flower', label: 'Flower', daysAttr: 'flower_days' },
      { key: 'dry', label: 'Dry', daysAttr: 'dry_days' },
      { key: 'cure', label: 'Cure', daysAttr: 'cure_days' },
    ];

    // Only show stages that have been entered or are next
    const stageOrder = stages.map((s) => s.key);
    const currentIdx = stageOrder.indexOf(currentStage);
    const visible = stages.filter((s, i) => {
      const days = (attrs as any)[s.daysAttr];
      return (days !== undefined && days !== null) || i === currentIdx || i === currentIdx + 1;
    });

    if (visible.length < 2) return nothing;

    return html`
      <div
        style="
        display: flex; align-items: stretch; gap: 0;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 4px;
        margin-bottom: 16px;
        overflow: hidden;
      "
      >
        ${visible.map((s) => {
          const days = (attrs as any)[s.daysAttr];
          const isCurrentStage =
            s.key === currentStage ||
            (currentStage === 'vegetative' && s.key === 'veg') ||
            (currentStage === 'flowering' && s.key === 'flower') ||
            (currentStage === 'drying' && s.key === 'dry') ||
            (currentStage === 'curing' && s.key === 'cure');
          const isDone = days !== undefined && days !== null && !isCurrentStage;

          return html`
            <div
              style="
              flex: 1; text-align: center; padding: 6px 4px; border-radius: 7px;
              font-size: 0.7rem; line-height: 1.3;
              background: ${isCurrentStage ? 'rgba(255,152,0,0.15)' : 'transparent'};
              color: ${isCurrentStage
                ? '#ffb74d'
                : isDone
                  ? 'rgba(255,255,255,0.6)'
                  : 'rgba(255,255,255,0.25)'};
              font-weight: ${isCurrentStage ? '600' : '400'};
            "
            >
              <div>${s.label}</div>
              <div style="font-variant-numeric: tabular-nums; font-size: 0.85rem; margin-top: 1px;">
                ${days !== undefined && days !== null ? `D${days}` : '—'}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderActions(vm: PlantOverviewViewModel): TemplateResult {
    return html`
      <plant-actions-tab
        .availableActions=${vm.availableActions}
        .plant=${this.plant}
        @action-click=${this._handleActionClick}
      ></plant-actions-tab>
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
    const trainingTechniques = [
      'topping',
      'fim',
      'lst',
      'super_cropping',
      'scrog',
      'defoliating',
      'lollipopping',
    ];

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
          return (
            rLower.startsWith('plant_id:') &&
            rLower.replace('plant_id:', '').trim() === plantId.toLowerCase()
          );
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
            e.category === 'watering' || e.category === 'irrigation'
              ? 'water'
              : e.category || e.sensor_type,
          details: (e.reasons || [])
            .filter((r) => {
              const rLower = r.toLowerCase();
              return (
                !rLower.startsWith('plant_id:') &&
                !rLower.startsWith('plants:') &&
                !rLower.startsWith('plant:')
              );
            })
            .join(', '),
          event_id: (e as GrowspaceEvent & { event_id?: string }).event_id,
        } as PlantTimelineEvent;
      });

    return [...recordedEvents, ...milestones, ...logbookEvents];
  }

  private _renderHarvestTab(): TemplateResult {
    const stage = (this.plant?.state || '').toLowerCase();
    const isDrying = stage === 'dry' || stage === 'drying';
    return html`
      ${isDrying
        ? html`
            <plant-drying-tab .plant=${this.plant}></plant-drying-tab>
            <hr
              style="border:none; border-top:1px solid var(--divider-color, rgba(255,255,255,0.1)); margin:0 24px;"
            />
          `
        : nothing}
      <plant-harvest-tab
        .plant=${this.plant}
        @harvest-saved=${() => {
          this._activeTab = 'dashboard';
        }}
        @harvest-advance=${this._handleHarvestAdvance}
      ></plant-harvest-tab>
    `;
  }

  private _renderFooter(vm: PlantOverviewViewModel): TemplateResult {
    const stage = (this.plant?.state || '').toLowerCase();

    return html`
      <div
        class="dialog-actions"
        style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 16px 24px; border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); flex-wrap: wrap;"
      >
        <!-- LEFT: Danger Zone -->
        <div class="danger-zone">
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

        <!-- CENTER: Dynamic Actions -->
        ${this._activeTab === 'dashboard'
          ? html`
              <div
                class="dynamic-actions"
                style="display:flex; gap:12px; align-items:center; justify-content:center; flex:1;"
              >
                <!-- Mother/Veg/Flower: Take Clone with count -->
                ${['mother', 'veg', 'flower'].includes(stage || '')
                  ? html`
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
                            const container = (e.currentTarget as HTMLElement).closest(
                              '.dynamic-actions'
                            );
                            const input = container?.querySelector(
                              '#clone-count-input'
                            ) as HTMLInputElement;
                            const val = input ? parseInt(input.value, 10) : 1;
                            this._handleTakeClone(isNaN(val) ? 1 : val);
                          }}
                        >
                          <svg
                            style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiContentCopy}"></path>
                          </svg>
                          Take Clone
                        </button>
                      </div>
                    `
                  : nothing}

                <!-- Flower: Harvest -->
                ${stage === 'flower' || stage === 'flowering'
                  ? html`
                      <button class="md3-button primary" @click=${this._handleHarvest}>
                        <svg
                          style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                          viewBox="0 0 24 24"
                        >
                          <path d="${mdiFlower}"></path>
                        </svg>
                        Harvest
                      </button>
                    `
                  : nothing}

                <!-- Dry: Finish Drying -->
                ${stage === 'dry' || stage === 'drying'
                  ? html`
                      <button class="md3-button primary" @click=${this._handleFinishDrying}>
                        <svg
                          style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                          viewBox="0 0 24 24"
                        >
                          <path d="${mdiCannabis}"></path>
                        </svg>
                        Finish Drying
                      </button>
                    `
                  : nothing}
              </div>
            `
          : html`<div style="flex:1;"></div>`}

        <!-- RIGHT: Primary Actions -->
        <div class="primary-actions" style="display:flex; gap:12px;">
          <button class="md3-button outlined" @click=${this._handleClose}>Cancel</button>
          <button class="md3-button filled" @click=${this._handleSave} ?disabled=${!vm.canSave}>
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
    const stage = (this.plant.state || this.plant.attributes?.stage || '').toLowerCase();
    if (stage === PlantStage.FLOWER || stage === 'flowering') {
      this.store.actions.ui.setActiveDialog({
        type: 'HARVEST_SCORING',
        payload: { plant: this.plant },
      });
      // Close the overview when opening the scoring dialog to keep flow clean
      this._handleClose();
    } else {
      this.store.actions.plant.harvest(this.plant);
    }
  }

  private _handleFinishDrying(): void {
    this.store.actions.plant.finishDrying(this.plant);
  }

  private _handleHarvestAdvance(e: CustomEvent): void {
    if (e.detail.action === 'finish-drying') {
      this._handleFinishDrying();
    } else {
      this._handleHarvest();
    }
  }

  private _handleMovePlantEvent(e: CustomEvent): void {
    const { targetId } = e.detail;
    if (!targetId) return;
    this.store.actions.plant.move(this.plant, targetId);
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
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
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

  private _openNutrients(): void {
    this.store.ui.setActiveDialog({ type: 'NUTRIENTS', payload: {} });
  }

  private _openSnapshots(): void {
    const growspaceId = this.plant.attributes?.growspace_id || '';
    this.store.ui.setActiveDialog({
      type: 'SNAPSHOTS',
      payload: { growspaceId },
    });
  }

  private _openLogbook(): void {
    const growspaceId = this.plant.attributes?.growspace_id || '';
    this.store.ui.setActiveDialog({
      type: 'LOGBOOK',
      payload: { growspaceId },
    });
  }

  private _openStrainEditor(): void {
    const strain = this.plant?.attributes?.strain ?? '';
    const phenotype = this.plant?.attributes?.phenotype ?? '';
    const strainLibrary = strainLibrary$.get();
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
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-overview-container': PlantOverviewContainer;
  }
}
