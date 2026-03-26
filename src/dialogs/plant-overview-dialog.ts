import { LitElement, html, css, nothing, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
  mdiClose,
  mdiDna,
  mdiFlower,
  mdiContentCopy,
  mdiCheck,
  mdiDelete,
  mdiCannabis,
  mdiArrowRight,
  mdiCalendarClock,
  mdiViewDashboard,
  mdiWater,
  mdiDumbbell,
  mdiBug,
  mdiPencil,
  mdiFlash,
  mdiPrinter,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import {
  PlantEntity,
  PlantOverviewEditedAttributes,
  PlantOverviewDialogState,
  PlantStage,
  GrowspaceEvent,
  PlantTimelineEvent,
  PlantAttributeValue,
} from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';

import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';
import '../components/ui/md3-date-input';
import '../components/plant/plant-timeline';

import { consume } from '@lit/context';
import { hassContext, storeContext } from '../lib/context';
import type { GrowspaceStore } from '../store/core/growspace-store';
import {
  UpdatePlantEvent,
  DeletePlantEvent,
  HarvestPlantEvent,
  FinishDryingEvent,
  TakeCloneEvent,
  MoveCloneEvent,
  PrintLabelEvent,
} from '../events';
import { getTimelineService } from '../services/timeline-service';

/** Score dimension descriptor — mirrors harvest-scoring-dialog */
interface ScoreDimension {
  key: string;
  label: string;
  description: string;
  emoji: string;
}

const SCORE_DIMENSIONS: ScoreDimension[] = [
  { key: 'vigor', label: 'Vigor', description: 'Overall plant health, growth rate, and robustness', emoji: '💪' },
  { key: 'structure', label: 'Structure', description: 'Branch spacing, internodal distance, and bud site density', emoji: '🌿' },
  { key: 'aroma', label: 'Aroma', description: 'Terpene expression — potency and complexity of smell', emoji: '👃' },
  { key: 'resin', label: 'Resin', description: 'Trichome coverage and density', emoji: '💎' },
  { key: 'pest_resistance', label: 'Pest resistance', description: 'Resilience against pests and disease during the run', emoji: '🛡️' },
];

@customElement('plant-overview-dialog')
export class PlantOverviewDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  store!: GrowspaceStore;

  private _unsubEvents?: Promise<() => Promise<void>>;

  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) dialog: PlantOverviewDialogState | undefined;
  @property({ type: Object }) plant: PlantEntity | undefined;
  @property({ type: Object }) growspaceOptions: Record<string, string> = {};

  @property({ attribute: false }) editedAttributes: PlantOverviewEditedAttributes | undefined;
  @state() private isEditing = true;
  @state() private showAllDates = false;
  @state() private cloneTargetId = '';
  @state() private _showDeleteConfirmation = false;
  @state() private _activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' = 'dashboard';
  @state() private _logbookEvents: GrowspaceEvent[] = [];

  @state() private _harvestMetricsEdit: Record<string, unknown> = {};
  // Star scores: key → 1-5 or null
  @state() private _scoresEdit: Record<string, number | null> = {};
  @state() private _starPreview: Record<string, number | null> = {};
  @state() private _savingHarvest = false;
  @state() private _showScoringForm = false;
  @state() private _savingScore = false;

  connectedCallback() {
    super.connectedCallback();
    this._subscribeToEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) {
      this._unsubEvents.then((unsub) => unsub && unsub());
      this._unsubEvents = undefined;
    }
  }

  private async _subscribeToEvents() {
    if (!this.hass) return;
    // Subscribe if not already subscribed
    if (!this._unsubEvents) {
      this._unsubEvents = this.hass.connection.subscribeEvents(
        (event) => this._handleGrowspaceEvent(event as Record<string, unknown>),
        'growspace_manager_log_entry'
      );
    }
  }

  private _handleGrowspaceEvent(event: Record<string, unknown>) {
    const data = (event.data || event) as GrowspaceEvent;
    const plantId =
      this.plant?.attributes?.plant_id || this.plant?.entity_id.replace('sensor.', '');
    const growspaceId = this.plant?.attributes?.growspace_id;

    // Check if relevant to this plant (direct match)
    const isForThisPlant = data.plant_id === plantId;

    // Check if relevant to this growspace (e.g. irrigation)
    const isForThisGrowspace = data.growspace_id === growspaceId;
    const isSharedEvent = data.category === 'irrigation' && !data.plant_id;

    if (isForThisPlant || (isForThisGrowspace && isSharedEvent)) {
      // Prepend to list for instant update
      // We cast to any because the event bus payload might differ slightly from GrowspaceEvent (e.g. timestamp vs start_time)
      // but _renderTimeline mapping logic handles both.
      this._logbookEvents = [data, ...this._logbookEvents];
    }
  }

  willUpdate(changedProps: PropertyValues) {
    // Retry subscription if hass becomes available later
    if (changedProps.has('hass') && this.hass && !this._unsubEvents) {
      this._subscribeToEvents();
    }

    // Handle dialog state object if passed (legacy/alternative usage)
    if (changedProps.has('dialog') && this.dialog) {
      this.plant = this.dialog.plant;
      this.editedAttributes = this.dialog.editedAttributes || this._getAttributesFromPlant();
      this.cloneTargetId = '';
      if (
        this.dialog.activeTab &&
        (this.dialog.activeTab === 'dashboard' ||
          this.dialog.activeTab === 'actions' ||
          this.dialog.activeTab === 'timeline')
      ) {
        this._activeTab = this.dialog.activeTab;
      }
      // Fetch logbook when dialog is set
      this._fetchLogbook();
    }

    // Handle direct prop injection (DialogHost usage)
    // If editedAttributes is undefined/null (e.g. passed as null from parent), init it
    if (!this.editedAttributes || (changedProps.has('plant') && !this.editedAttributes.strain)) {
      this.editedAttributes = this._getAttributesFromPlant();
    }

    // Fetch logbook when plant changes (direct prop usage)
    if (changedProps.has('plant') && this.plant) {
      this._fetchLogbook();
      const hm = this.plant.attributes?.harvest_metrics || {};
      this._harvestMetricsEdit = { ...hm };
      // Map scores dict: backend uses pest_resistance key
      const rawScores = this.plant.attributes?.scores || {};
      this._scoresEdit = {
        vigor: rawScores.vigor ?? null,
        structure: rawScores.structure ?? null,
        aroma: rawScores.aroma ?? null,
        resin: rawScores.resin ?? null,
        pest_resistance: rawScores.pest_resistance ?? null,
      };
      this._starPreview = {};
    }
  }

  private async _fetchLogbook() {
    if (!this.plant?.attributes?.growspace_id || !this.hass) return;

    try {
      const service = getTimelineService(this.hass);
      const plantId = this.plant.attributes.plant_id;
      const growspaceId = this.plant.attributes.growspace_id;
      // Fetch by plant_id so history from previous growspaces is included after stage moves
      const fetchedEvents = plantId
        ? await service.fetchPlantEvents(plantId, growspaceId)
        : await service.fetchGrowspaceEvents(growspaceId);

      // Identify optimistic events (no event_id, recent timestamp) to preserve
      // This prevents "instant" notes from disappearing if the DB fetch is faster than the recorder commit
      const now = new Date().getTime();
      const optimisticEvents = this._logbookEvents.filter((e) => {
        const evt = e as GrowspaceEvent & { event_id?: string; timestamp?: string };
        if (evt.event_id) return false; // Already from DB

        // Check if recent (< 60 seconds)
        const ts = evt.timestamp || evt.start_time;
        if (!ts) return false;
        const time = new Date(ts).getTime();
        return now - time < 60000;
      });

      // Merge: Put optimistic events first, then fetched events
      this._logbookEvents = [...optimisticEvents, ...fetchedEvents];
    } catch (e) {
      console.error('Error fetching logbook for dialog:', e);
      // We don't necessarily show an error in the dialog, just log it and potentially keep old events
    }
  }

  private _getAttributesFromPlant(): PlantOverviewEditedAttributes {
    if (!this.plant) return {};
    return {
      strain: this.plant?.attributes?.strain,
      phenotype: this.plant?.attributes?.phenotype,
      row: this.plant?.attributes?.row,
      col: this.plant?.attributes?.col,
      stage: this.plant?.state,
      veg_start: this.plant?.attributes?.veg_start,
      flower_start: this.plant?.attributes?.flower_start,
      seedling_start: this.plant?.attributes?.seedling_start,
      mother_start: this.plant?.attributes?.mother_start,
      clone_start: this.plant?.attributes?.clone_start,
      dry_start: this.plant?.attributes?.dry_start,
      cure_start: this.plant?.attributes?.cure_start,
    };
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }

      .overview-grid {
        padding: 24px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
      }

      /* Timeline Styles */
      .timeline {
        position: relative;
        padding-left: 24px;
        border-left: 2px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin-top: 16px;
      }
      .timeline-event {
        margin-bottom: 24px;
        position: relative;
      }
      .timeline-event::before {
        content: '';
        position: absolute;
        left: -31px;
        top: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--event-color, #4caf50);
        border: 2px solid var(--card-background-color, #2c2c2c);
      }
      .timeline-date {
        font-size: 0.8rem;
        opacity: 0.6;
        margin-bottom: 4px;
      }
      .timeline-content {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px;
        padding: 12px;
      }

      /* Stat Grid */
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 12px;
      }
      .stat-item {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .stat-value {
        font-size: 1.1rem;
        font-weight: 500;
      }
      .stat-label {
        font-size: 0.75rem;
        opacity: 0.7;
      }

      /* Image Gallery */
      .image-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .plant-image {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .plant-image:hover {
        transform: scale(1.05);
      }

      .md3-input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        margin-bottom: 12px;
      }

      /* Action Grid */
      .action-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
        padding: 8px;
      }
      .action-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        padding: 24px 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .action-card:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-color: var(--primary-color, #4caf50);
        transform: translateY(-2px);
      }
      .action-card svg {
        width: 32px;
        height: 32px;
        fill: var(--primary-color, #4caf50);
      }
      .action-card span {
        font-weight: 500;
        font-size: 1rem;
      }

      @media (max-width: 600px) {
        .overview-grid {
          grid-template-columns: 1fr;
          padding: 16px;
        }
      }
      @media (max-width: 450px) {
        .glass-dialog-container {
          border-radius: 0;
          width: 100vw;
          height: 100vh;
          max-width: 100%;
        }
        .overview-grid {
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        .dialog-header {
          padding: 12px 16px;
        }
      }

      .tabs-container {
        display: flex;
        padding: 0 24px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .tab-btn {
        background: none;
        border: none;
        padding: 12px 16px;
        color: var(--secondary-text-color, #aaa);
        font-family: inherit;
        font-size: 0.95rem;
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: color 0.2s;
      }
      .tab-btn:hover {
        color: var(--primary-text-color, #fff);
      }
      .tab-btn.active {
        color: var(--primary-color, #4caf50);
        font-weight: 500;
      }
      .tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--primary-color, #4caf50);
      }
      .tab-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      /* Scrollable Actions */
      .event-actions-wrapper {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1;
        position: relative;
      }

      .event-actions {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        scroll-behavior: smooth;
        padding: 4px 0;
        width: 100%;
        justify-content: flex-end;
      }

      .event-actions::-webkit-scrollbar {
        display: none;
      }

      .event-actions button {
        flex-shrink: 0;
      }

      .scroll-arrow {
        min-width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 4px;
        z-index: 1;
        flex-shrink: 0;
      }

      .scroll-arrow:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .scroll-arrow.hidden {
        opacity: 0;
        pointer-events: none;
        width: 0;
        min-width: 0;
        margin: 0;
        visibility: hidden;
      }

      .scroll-arrow svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      @media (max-width: 600px) {
        .event-actions {
          justify-content: flex-start;
        }
      }

      /* ── Star Scoring (mirrors harvest-scoring-dialog) ── */
      .score-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 8px 0;
      }
      .score-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .score-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .score-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        font-size: 0.95rem;
      }
      .score-emoji {
        font-size: 1.2rem;
      }
      .score-value {
        font-size: 0.95rem;
        opacity: 0.7;
        min-width: 30px;
        text-align: right;
      }
      .score-description {
        font-size: 0.8rem;
        opacity: 0.5;
        margin: 0;
      }
      .star-row {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }
      .star-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 1.6rem;
        line-height: 1;
        transition: transform 0.1s, filter 0.15s;
        filter: grayscale(0.6) opacity(0.5);
      }
      .star-btn.active {
        filter: grayscale(0) opacity(1);
      }
      .star-btn:hover,
      .star-btn.preview {
        transform: scale(1.2);
        filter: grayscale(0) opacity(1);
      }
      .skip-hint {
        font-size: 0.8rem;
        opacity: 0.45;
        margin-top: 8px;
        text-align: center;
      }
      .metrics-section {
        padding: 0;
      }
      .metrics-section-title {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.6;
        margin: 0 0 12px;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
      }
      .metric-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .metric-field label {
        font-size: 0.75rem;
        opacity: 0.7;
      }
      .metric-field input,
      .metric-field textarea {
        background: var(--card-background-color, rgba(255,255,255,0.06));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
        border-radius: 8px;
        color: var(--primary-text-color);
        font-size: 0.9rem;
        padding: 6px 10px;
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .metric-field input:focus,
      .metric-field textarea:focus {
        outline: none;
        border-color: var(--primary-color, #4caf50);
      }
      .terpene-field {
        grid-column: 1 / -1;
      }
      .terpene-field textarea {
        resize: vertical;
        min-height: 48px;
      }
      .harvest-divider {
        border: none;
        border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        margin: 0;
      }
    `,
  ];

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _update() {
    if (!this.editedAttributes) return;
    this.dispatchEvent(new UpdatePlantEvent(this.editedAttributes));

    const stage = (this.plant?.state || '').toLowerCase();
    if (this._activeTab === 'harvest' && (stage === 'dry' || stage === 'cure')) {
      this._saveHarvestMetrics();
    }
  }

  private _delete(_plantId: string) {
    this._showDeleteConfirmation = true;
  }

  private _confirmDelete() {
    if (this.plant) {
      const plantId =
        this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
      this.dispatchEvent(new DeletePlantEvent(plantId));
      this._showDeleteConfirmation = false;
      this._close();
    }
  }

  private _cancelDelete() {
    this._showDeleteConfirmation = false;
  }

  private _harvest(plant: PlantEntity) {
    this.dispatchEvent(new HarvestPlantEvent(plant));
  }

  private _finishDrying(plant: PlantEntity) {
    this.dispatchEvent(new FinishDryingEvent(plant));
  }

  private _takeClone(plant: PlantEntity, numClones: number) {
    this.dispatchEvent(new TakeCloneEvent(plant, numClones));
  }

  private _movePlant(plant: PlantEntity) {
    if (!this.cloneTargetId) {
      // alert is not ideal but keeping for now as per previous logic
      alert('Select a growspace');
      return;
    }
    this.dispatchEvent(new MoveCloneEvent(plant, this.cloneTargetId));
  }

  private _attributeChange(key: string, value: PlantAttributeValue) {
    this.editedAttributes = { ...this.editedAttributes, [key]: value };
    this.requestUpdate();
  }

  private _toggleShowAllDates() {
    this.showAllDates = !this.showAllDates;
  }

  private _openWatering() {
    if (!this.plant) return;
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    const growspaceId = this.plant.attributes?.growspace_id;

    this.dispatchEvent(
      new CustomEvent('open-watering', {
        detail: {
          mode: 'plant',
          plantIds: [plantId],
          growspaceId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openTraining() {
    if (!this.plant) return;
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    const growspaceId = this.plant.attributes?.growspace_id;

    this.dispatchEvent(
      new CustomEvent('open-training', {
        detail: {
          isOpen: true,
          plantIds: [plantId],
          growspaceId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openIPM() {
    if (!this.plant) return;
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    const growspaceId = this.plant.attributes?.growspace_id;

    this.dispatchEvent(
      new CustomEvent('open-ipm', {
        detail: {
          growspaceId,
          plantIds: [plantId],
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openClone() {
    if (!this.plant) return;
    const growspaceId = this.plant.attributes?.growspace_id || '';

    this.dispatchEvent(
      new CustomEvent('open-clone', {
        detail: {
          sourcePlant: this.plant,
          defaultGrowspaceId: growspaceId,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _openLabelPrinter() {
    if (!this.plant) return;
    this.dispatchEvent(new PrintLabelEvent(this.plant));
  }

  private _openStrainEditor() {
    if (!this.plant) return;
    const strain = this.plant.attributes?.strain;
    const phenotype = this.plant.attributes?.phenotype;

    this.dispatchEvent(
      new CustomEvent('open-strain-editor', {
        detail: { strain, phenotype },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderStatItem(label: string, value: string | number | undefined, unit: string = '') {
    if (value === undefined || value === null || value === '') return nothing;
    return html`
      <div class="stat-item">
        <span class="stat-value">${value} ${unit}</span>
        <span class="stat-label">${label}</span>
      </div>
    `;
  }

  private _renderPlantStats(plant: PlantEntity) {
    if (!plant.attributes) return nothing;

    const currentStage = (plant.state || '').toLowerCase();
    const normalize = (s: string) => {
      if (s === 'veg' || s === 'vegetative') return PlantStage.VEG;
      if (s === 'mom') return PlantStage.MOTHER;
      return s;
    };
    const normCurrent = normalize(currentStage);

    const stats = [
      {
        label: 'Vegetative Stage',
        value: plant.attributes.veg_days,
        unit: 'days',
        stage: PlantStage.VEG,
      },
      {
        label: 'Flowering Stage',
        value: plant.attributes.flower_days,
        unit: 'days',
        stage: PlantStage.FLOWER,
      },
      {
        label: 'Mother Stage',
        value: plant.attributes.mom_days,
        unit: 'days',
        stage: PlantStage.MOTHER,
      },
      {
        label: 'Clone Stage',
        value: plant.attributes.clone_days,
        unit: 'days',
        stage: PlantStage.CLONE,
      },
      {
        label: 'Drying Stage',
        value: plant.attributes.dry_days,
        unit: 'days',
        stage: PlantStage.DRY,
      },
      {
        label: 'Curing Stage',
        value: plant.attributes.cure_days,
        unit: 'days',
        stage: PlantStage.CURE,
      },
    ].filter((s) => {
      if (s.value === undefined || s.value === null) return false;
      const val = Number(s.value);
      if (val > 0) return true;
      // Show if 0 but it's the current stage
      return s.stage === normCurrent;
    });

    if (stats.length === 0) return nothing;

    return html`
      <div class="detail-card">
        <h3>Days in Stage</h3>
        <div class="stat-grid">
          ${stats.map((s) => this._renderStatItem(s.label, s.value, s.unit))}
        </div>
      </div>
    `;
  }

  private _renderDeleteOverlay(): TemplateResult {
    return html`
      <div
        class="dialog-overlay"
        style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:100; display:flex; align-items:center; justify-content:center;"
      >
        <div class="glass-dialog-container" style="width: 350px; height: auto; padding: 24px;">
          <h2 class="dialog-title" style="margin-bottom:12px">Confirm Deletion</h2>
          <p
            style="color:var(--secondary-text-color, rgba(255,255,255,0.7)); margin-bottom:24px; font-size: 1rem; line-height: 1.5;"
          >
            Are you sure you want to delete this plant? This action cannot be undone.
          </p>
          <div style="display:flex; justify-content:flex-end; gap:12px">
            <button class="md3-button tonal" @click=${this._cancelDelete}>Cancel</button>
            <button class="md3-button danger" @click=${() => this._confirmDelete()}>
              <svg
                style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
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

  render() {
    if (!this.plant || !this.editedAttributes) return html``;

    const attributes = this.editedAttributes;
    const plantId = this.plant.attributes?.plant_id || this.plant.entity_id.replace('sensor.', '');
    const stageColor = PlantUtils.getPlantStageColor(this.plant.state);
    const stageIcon = PlantUtils.getPlantStageIcon(this.plant.state);

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${stageColor}">
          ${this._showDeleteConfirmation ? this._renderDeleteOverlay() : nothing}

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${stageIcon}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">${attributes.strain || 'Unknown Strain'}</h2>
              <div class="dialog-subtitle">
                ${this.plant.state} Stage • ${attributes.phenotype || 'No Phenotype'}
              </div>
            </div>
            <button
              class="md3-button text"
              @click=${() => this._openStrainEditor()}
              style="min-width: auto; padding: 8px;"
              title="Edit Strain Library Entry"
            >
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiDna}"></path>
              </svg>
            </button>
            <button
              class="md3-button text"
              @click=${() => this._close()}
              style="min-width: auto; padding: 8px;"
              aria-label="Close"
              title="Close"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <!-- TABS -->
          <div class="tabs-container">
            <button
              class="tab-btn ${this._activeTab === 'dashboard' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'dashboard')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
              Overview
            </button>
            <button
              class="tab-btn ${this._activeTab === 'actions' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'actions')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiFlash}"></path></svg>
              Actions
            </button>
            <button
              class="tab-btn ${this._activeTab === 'timeline' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'timeline')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiCalendarClock}"></path></svg>
              Timeline
            </button>
            ${['drying', 'curing', 'dry', 'cure'].includes((this.plant?.state || '').toLowerCase()) ? html`
              <button
                class="tab-btn ${this._activeTab === 'harvest' ? 'active' : ''}"
                @click=${() => {
          this._activeTab = 'harvest';
          this._harvestMetricsEdit = { ...(this.plant?.attributes?.harvest_metrics || {}) };
          this._scoresEdit = { ...(this.plant?.attributes?.scores || {}) };
        }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>
                Scoring & Harvest
              </button>
            ` : nothing}
          </div>

          <div class="overview-grid">
            ${this._activeTab === 'dashboard'
        ? this._renderDashboard(attributes)
        : this._activeTab === 'actions'
          ? this._renderActions()
          : this._activeTab === 'harvest'
            ? this._renderHarvestTab()
            : this._renderTimeline()}
          </div>

          <!-- ACTIONS -->
          <div
            class="dialog-actions"
            style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 16px 24px; border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); flex-wrap: wrap;"
          >
            <div class="standard-actions" style="display:flex; gap:12px;">
              <button class="md3-button danger" @click=${() => this._delete(plantId)}>
                <svg
                  style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                  viewBox="0 0 24 24"
                >
                  <path d="${mdiDelete}"></path>
                </svg>
                Delete
              </button>
            </div>

            <div class="dynamic-actions" style="display:flex; gap:12px; align-items:center;">
              <!-- DYNAMIC ACTIONS BASED ON STAGE -->
              ${this._activeTab === 'dashboard'
        ? html`
                    ${(this.plant.state || '').toLowerCase() === 'mother'
            ? html`
                          <div
                            class="take-clone-container"
                            style="display:flex; align-items:center; gap:8px;"
                          >
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
                  '.take-clone-container'
                );
                const input = container?.querySelector('#clone-count-input') as HTMLInputElement;
                const val = input ? parseInt(input.value, 10) : 1;
                const numClones = isNaN(val) ? 1 : val;
                this._takeClone(this.plant!, numClones);
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
                    ${(this.plant.state || '').toLowerCase() === 'flower'
            ? html`
                          <button
                            class="md3-button primary"
                            @click=${() => this._harvest(this.plant!)}
                          >
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
                    ${(this.plant.state || '').toLowerCase() === 'dry'
            ? html`
                          <button
                            class="md3-button primary"
                            @click=${() => this._finishDrying(this.plant!)}
                          >
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
                    ${(this.plant.state || '').toLowerCase() !== ''
            ? html`
                          <div style="display:flex; align-items:center; gap:8px;">
                            <md3-select
                              label="Move to Growspace"
                              .value=${this.cloneTargetId}
                              .options=${Object.entries(this.growspaceOptions).map(
              ([id, name]) => ({ label: name, value: id })
            )}
                              style="width: 200px;"
                              @change=${(e: CustomEvent) => (this.cloneTargetId = e.detail)}
                            ></md3-select>
                            <button
                              class="md3-button primary"
                              @click=${() => this._movePlant(this.plant!)}
                              style="margin-top: 24px;"
                            >
                              <svg
                                style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                                viewBox="0 0 24 24"
                              >
                                <path d="${mdiArrowRight}"></path>
                              </svg>
                              Move
                            </button>
                          </div>
                        `
            : nothing}
                  `
        : nothing}

              <button class="md3-button tonal" @click=${() => this._update()}>
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
        </div>
      </ha-dialog>
    `;
  }

  private _renderDashboard(attributes: PlantOverviewEditedAttributes): TemplateResult {
    return html`
      <!-- IDENTITY & LOCATION CARD -->
      <div class="detail-card">
        <h3>Identity & Location</h3>
        ${this.isEditing
        ? html`
              <md3-text-input
                label="Strain Name"
                .value=${attributes.strain || ''}
                @change=${(e: CustomEvent) => this._attributeChange('strain', e.detail)}
              ></md3-text-input>
              <md3-text-input
                label="Phenotype"
                .value=${attributes.phenotype || ''}
                @change=${(e: CustomEvent) => this._attributeChange('phenotype', e.detail)}
              ></md3-text-input>

              <div style="display:flex; gap:16px;">
                <md3-number-input
                  label="Row"
                  .value=${attributes.row ?? ''}
                  @change=${(e: CustomEvent) => this._attributeChange('row', e.detail)}
                ></md3-number-input>
                <md3-number-input
                  label="Column"
                  .value=${attributes.col ?? ''}
                  @change=${(e: CustomEvent) => this._attributeChange('col', e.detail)}
                ></md3-number-input>
              </div>
            `
        : html`
              <div class="stat-grid">
                <div class="stat-item">
                  <span class="stat-value">${this.plant!.attributes?.strain}</span>
                  <span class="stat-label">Strain</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">${this.plant!.attributes?.phenotype || 'N/A'}</span>
                  <span class="stat-label">Phenotype</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">${this.plant!.attributes?.row ?? '-'}</span>
                  <span class="stat-label">Row</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">${this.plant!.attributes?.col ?? '-'}</span>
                  <span class="stat-label">Col</span>
                </div>
              </div>
            `}
      </div>
      <!-- STATS CARD -->
      ${this._renderPlantStats(this.plant!)}

      <!-- TIMELINE CARD (RENAMED TO LIFECYCLE DATES) -->
      <div class="detail-card">
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"
        >
          <h3 style="margin: 0;">Lifecycle Dates</h3>
          <button
            class="md3-button text"
            style="min-width: auto; padding: 4px;"
            @click=${this._toggleShowAllDates}
            aria-label="Toggle Dates"
            title="Toggle Dates"
          >
            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
        </div>

        ${this.showAllDates
        ? html`
              <md3-date-input
                label="Seedling Start"
                .value=${attributes.seedling_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('seedling_start', e.detail)}
              ></md3-date-input>
              <md3-date-input
                label="Mother Start"
                .value=${attributes.mother_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('mother_start', e.detail)}
              ></md3-date-input>
              <md3-date-input
                label="Clone Start"
                .value=${attributes.clone_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('clone_start', e.detail)}
              ></md3-date-input>
              <md3-date-input
                label="Vegetative Start"
                .value=${attributes.veg_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('veg_start', e.detail)}
              ></md3-date-input>
              <md3-date-input
                label="Flower Start"
                .value=${attributes.flower_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('flower_start', e.detail)}
              ></md3-date-input>
              <md3-date-input
                label="Dry Start"
                .value=${attributes.dry_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('dry_start', e.detail)}
              ></md3-date-input>
              <md3-date-input
                label="Cure Start"
                .value=${attributes.cure_start ?? ''}
                ?time=${true}
                @change=${(e: CustomEvent) => this._attributeChange('cure_start', e.detail)}
              ></md3-date-input>
            `
        : html`
              ${attributes.stage === PlantStage.MOTHER
            ? html`
                    <md3-date-input
                      label="Mother Start"
                      .value=${attributes.mother_start ?? ''}
                      ?time=${true}
                      @change=${(e: CustomEvent) => this._attributeChange('mother_start', e.detail)}
                    ></md3-date-input>
                  `
            : nothing}
              ${attributes.stage === PlantStage.CLONE
            ? html`
                    <md3-date-input
                      label="Clone Start"
                      .value=${attributes.clone_start ?? ''}
                      ?time=${true}
                      @change=${(e: CustomEvent) => this._attributeChange('clone_start', e.detail)}
                    ></md3-date-input>
                  `
            : nothing}
              ${attributes.stage === PlantStage.VEG || attributes.stage === PlantStage.FLOWER
            ? html`
                    <md3-date-input
                      label="Vegetative Start"
                      .value=${attributes.veg_start ?? ''}
                      ?time=${true}
                      @change=${(e: CustomEvent) => this._attributeChange('veg_start', e.detail)}
                    ></md3-date-input>
                  `
            : nothing}
              ${attributes.stage === PlantStage.FLOWER
            ? html`
                    <md3-date-input
                      label="Flower Start"
                      .value=${attributes.flower_start ?? ''}
                      ?time=${true}
                      @change=${(e: CustomEvent) => this._attributeChange('flower_start', e.detail)}
                    ></md3-date-input>
                  `
            : nothing}
              ${attributes.stage === PlantStage.DRY || attributes.stage === PlantStage.CURE
            ? html`
                    <md3-date-input
                      label="Dry Start"
                      .value=${attributes.dry_start ?? ''}
                      ?time=${true}
                      @change=${(e: CustomEvent) => this._attributeChange('dry_start', e.detail)}
                    ></md3-date-input>
                  `
            : nothing}
              ${attributes.stage === PlantStage.CURE
            ? html`
                    <md3-date-input
                      label="Cure Start"
                      .value=${attributes.cure_start ?? ''}
                      ?time=${true}
                      @change=${(e: CustomEvent) => this._attributeChange('cure_start', e.detail)}
                    ></md3-date-input>
                  `
            : nothing}
            `}
      </div>
    `;
  }

  private _renderActions(): TemplateResult {
    const stage = (this.plant?.state || '').toLowerCase();
    const isFlower = stage === PlantStage.FLOWER || stage === 'flowering';
    return html`
      <div class="detail-card" style="grid-column: 1 / -1;">
        <h3>Quick Actions</h3>
        <div class="action-grid">
          <div class="action-card" @click=${() => this._openWatering()}>
            <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
            <span>Water Plant</span>
          </div>
          <div class="action-card" @click=${() => this._openTraining()}>
            <svg viewBox="0 0 24 24"><path d="${mdiDumbbell}"></path></svg>
            <span>Log Training</span>
          </div>
          <div class="action-card" @click=${() => this._openIPM()}>
            <svg viewBox="0 0 24 24"><path d="${mdiBug}"></path></svg>
            <span>Log IPM</span>
          </div>
          <div class="action-card" @click=${() => this._openClone()}>
            <svg viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
            <span>Take Clone</span>
          </div>
          <div class="action-card" @click=${() => this._openLabelPrinter()}>
            <svg viewBox="0 0 24 24"><path d="${mdiPrinter}"></path></svg>
            <span>Print Label</span>
          </div>
          ${isFlower ? html`
          <div class="action-card" @click=${() => this._openLogPollination()}>
            <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
            <span>Log Pollination</span>
          </div>
          ` : nothing}
        </div>
      </div>

      <!-- Score Phenotype section -->
      <div class="detail-card" style="grid-column: 1 / -1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">Score Phenotype</h3>
          <button
            class="md3-button outlined"
            @click=${() => { this._showScoringForm = !this._showScoringForm; }}
          >${this._showScoringForm ? 'Cancel' : 'Score'}</button>
        </div>
        ${this._showScoringForm ? html`
          <div style="margin-top: 16px;">
            <div class="score-grid">
              ${SCORE_DIMENSIONS.map(dim => this._renderScoreRow(dim))}
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
              <button
                class="md3-button filled"
                @click=${() => this._savePhenotypeScore()}
                ?disabled=${this._savingScore}
              >${this._savingScore ? 'Saving…' : 'Save scores'}</button>
            </div>
          </div>
        ` : nothing}
        ${!this._showScoringForm ? html`
          <div class="score-grid" style="margin-top: 12px; pointer-events: none; opacity: 0.7;">
            ${SCORE_DIMENSIONS.map(dim => {
              const val = this._scoresEdit[dim.key];
              return html`
                <div class="score-row">
                  <div class="score-header">
                    <span class="score-label">
                      <span class="score-emoji">${dim.emoji}</span>
                      ${dim.label}
                    </span>
                    <span class="score-value">${val !== null && val !== undefined ? `${val} / 5` : '—'}</span>
                  </div>
                </div>
              `;
            })}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private async _savePhenotypeScore(): Promise<void> {
    if (!this.plant?.attributes?.plant_id) return;
    this._savingScore = true;
    try {
      const plantId = this.plant.attributes.plant_id;
      await this.store.dataService.scorePlant({
        plant_id: plantId,
        ...this._scoresEdit,
      });
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.store.refreshData();
      this._showScoringForm = false;
    } catch (e) {
      console.error('Failed to save phenotype scores', e);
      this.store.ui.showToast('Failed to save scores. Check your connection and try again.', 'error');
    } finally {
      this._savingScore = false;
    }
  }

  private _openLogPollination(): void {
    this.dispatchEvent(
      new CustomEvent('open-log-pollination', {
        detail: { plantId: this.plant?.attributes?.plant_id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderTimeline(): TemplateResult | typeof nothing {
    if (!this.plant) return nothing;

    const recordedEvents = this.plant.attributes?.events || [];

    // 1. Extract Milestones
    const milestones: PlantTimelineEvent[] = [];
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

    milestoneFields.forEach((field) => {
      const date = (this.plant?.attributes as Record<string, unknown>)?.[field.key];
      if (date) {
        milestones.push({
          type: 'milestone',
          date: String(date),
          label: field.label,
        });
      }
    });

    // 2. Add Logbook Events (Watering, Training)
    const normalize = (s?: string) => s?.toLowerCase().trim() || '';
    const plantId =
      (this.plant?.attributes as Record<string, unknown>)?.plant_id as string || this.plant.entity_id?.split('.')[1] || '';
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

        // 1. Check if it's a watering/irrigation event
        const isWatering =
          cat === 'irrigation' ||
          (cat === 'environmental' && ['irrigation', 'drain'].includes(type)) ||
          ['irrigation', 'drain', 'water'].includes(type) ||
          type.includes('water');

        // 2. Check if it's a training event
        const isTraining = cat === 'training' || trainingTechniques.some((t) => type.includes(t));

        // 3. Check if it's an IPM event
        const isIPM = cat === 'ipm' || type.startsWith('ipm_');

        // 4. Check if it's a note event
        const isNote = cat === 'note';

        // 5. Check if it's an environmental report
        const isEnvReport = cat === 'environmental_report';

        if (!isWatering && !isTraining && !isIPM && !isNote && !isEnvReport) return false;

        // 5. Filter by plant_id

        // For notes, check the direct plant_id field
        if (isNote) {
          const eventPlantId = e.plant_id;
          return eventPlantId && eventPlantId === plantId;
        }

        // For others, check growspace-wide or reasons
        // Include if it's an automated irrigation event (growspace-wide)
        if (cat === 'irrigation' && !reasons.some((r) => r.startsWith('plant_id:'))) {
          return true;
        }

        // Include environmental reports (always growspace-wide)
        if (isEnvReport) return true;

        // Backend format: "plant_id:uuid-here"
        const mentionsThisPlant = reasons.some((r) => {
          const rLower = r.toLowerCase();
          if (rLower.startsWith('plant_id:')) {
            const eventPlantId = rLower.replace('plant_id:', '').trim();
            return eventPlantId === plantId.toLowerCase();
          }
          return false;
        });

        return mentionsThisPlant;
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
            metadata: (e as GrowspaceEvent & { metadata?: Record<string, unknown> }).metadata,
            event_id: (e as GrowspaceEvent & { event_id?: string }).event_id,
          } as PlantTimelineEvent;
        }

        if (cat === 'environmental_report') {
          return {
            type: 'environmental_report',
            date: e.start_time,
            sensor_type: e.sensor_type,
            reasons: e.reasons,
            metadata: (e as GrowspaceEvent & { metadata?: Record<string, unknown> }).metadata,
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
          // Filter out plant_id: entries (internal) and Plants: list (shows all trained plants, not relevant for single plant view)
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

    // Combine all
    const allEvents = [...recordedEvents, ...milestones, ...logbookEvents];

    return html`
      <div style="grid-column: 1 / -1;">
        <plant-timeline
          .hass=${this.hass}
          .plant_id=${plantId}
          .events=${allEvents}
          @growspace-refresh=${() => this._fetchLogbook()}
        ></plant-timeline>
      </div>
    `;
  }

  private _setScore(key: string, value: number): void {
    const current = this._scoresEdit[key];
    this._scoresEdit = { ...this._scoresEdit, [key]: current === value ? null : value };
  }

  /** Skip scoring and immediately advance the plant to the next stage */
  private _skipAndAdvance(): void {
    if (!this.plant || this._savingHarvest) return;
    const stage = (this.plant.state || '').toLowerCase();
    if (stage === 'dry' || stage === 'drying') {
      this._finishDrying(this.plant);
    } else {
      // cure → whatever comes next (treated as a harvest/advance)
      this._harvest(this.plant);
    }
  }

  private _renderScoreRow(dim: ScoreDimension) {
    const current = this._scoresEdit[dim.key] as number | null;
    const preview = this._starPreview[dim.key] as number | null;
    return html`
      <div class="score-row">
        <div class="score-header">
          <span class="score-label">
            <span class="score-emoji">${dim.emoji}</span>
            ${dim.label}
          </span>
          <span class="score-value">
            ${current !== null ? `${current} / 5` : '—'}
          </span>
        </div>
        <p class="score-description">${dim.description}</p>
        <div class="star-row">
          ${[1, 2, 3, 4, 5].map(star => html`
            <button
              class="star-btn
                ${current !== null && star <= current ? 'active' : ''}
                ${preview !== null && star <= preview ? 'preview' : ''}"
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

  private _renderHarvestTab(): TemplateResult {
    const isSaving = this._savingHarvest;
    const hm = this._harvestMetricsEdit as Record<string, number | string | null>;
    const stage = (this.plant?.state || '').toLowerCase();
    const advanceLabel = (stage === 'dry' || stage === 'drying') ? '🌿 Skip & begin cure' : '📦 Skip & finish';

    return html`
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">

        <!-- Score Grid -->
        <div class="score-grid">
          ${SCORE_DIMENSIONS.map(dim => this._renderScoreRow(dim))}
        </div>
        <p class="skip-hint">All fields are optional — you can advance without scoring.</p>

        <hr class="harvest-divider" />

        <!-- Yield Metrics -->
        <div class="metrics-section">
          <p class="metrics-section-title">Yield metrics</p>
          <div class="metrics-grid">
            <div class="metric-field">
              <label for="hm-wet">Wet weight (g)</label>
              <input id="hm-wet" type="number" min="0" step="0.1" placeholder="e.g. 120"
                .value=${String(hm.wet_weight ?? '')}
                @input=${(e: InputEvent) => {
        const v = (e.target as HTMLInputElement).value;
        this._harvestMetricsEdit = { ...this._harvestMetricsEdit, wet_weight: v === '' ? null : parseFloat(v) };
      }}
                ?disabled=${isSaving}
              />
            </div>
            <div class="metric-field">
              <label for="hm-dry">Dry weight (g)</label>
              <input id="hm-dry" type="number" min="0" step="0.1" placeholder="e.g. 28"
                .value=${String(hm.dry_weight ?? '')}
                @input=${(e: InputEvent) => {
        const v = (e.target as HTMLInputElement).value;
        this._harvestMetricsEdit = { ...this._harvestMetricsEdit, dry_weight: v === '' ? null : parseFloat(v) };
      }}
                ?disabled=${isSaving}
              />
            </div>
            <div class="metric-field">
              <label for="hm-trim">Trim weight (g)</label>
              <input id="hm-trim" type="number" min="0" step="0.1" placeholder="e.g. 5"
                .value=${String(hm.trim_weight ?? '')}
                @input=${(e: InputEvent) => {
        const v = (e.target as HTMLInputElement).value;
        this._harvestMetricsEdit = { ...this._harvestMetricsEdit, trim_weight: v === '' ? null : parseFloat(v) };
      }}
                ?disabled=${isSaving}
              />
            </div>
          </div>
        </div>

        <hr class="harvest-divider" />

        <!-- Lab Results -->
        <div class="metrics-section">
          <p class="metrics-section-title">Lab results</p>
          <div class="metrics-grid">
            <div class="metric-field">
              <label for="hm-thc">THC (%)</label>
              <input id="hm-thc" type="number" min="0" max="100" step="0.1" placeholder="e.g. 24.5"
                .value=${String(hm.thc_percentage ?? '')}
                @input=${(e: InputEvent) => {
        const v = (e.target as HTMLInputElement).value;
        this._harvestMetricsEdit = { ...this._harvestMetricsEdit, thc_percentage: v === '' ? null : parseFloat(v) };
      }}
                ?disabled=${isSaving}
              />
            </div>
            <div class="metric-field">
              <label for="hm-cbd">CBD (%)</label>
              <input id="hm-cbd" type="number" min="0" max="100" step="0.1" placeholder="e.g. 0.3"
                .value=${String(hm.cbd_percentage ?? '')}
                @input=${(e: InputEvent) => {
        const v = (e.target as HTMLInputElement).value;
        this._harvestMetricsEdit = { ...this._harvestMetricsEdit, cbd_percentage: v === '' ? null : parseFloat(v) };
      }}
                ?disabled=${isSaving}
              />
            </div>
            <div class="metric-field terpene-field">
              <label for="hm-terp">Terpene profile</label>
              <textarea id="hm-terp" rows="2" placeholder="e.g. myrcene, limonene, caryophyllene"
                .value=${String(hm.terpene_profile ?? '')}
                @input=${(e: InputEvent) => {
        this._harvestMetricsEdit = { ...this._harvestMetricsEdit, terpene_profile: (e.target as HTMLTextAreaElement).value };
      }}
                ?disabled=${isSaving}
              ></textarea>
            </div>
          </div>
        </div>

        <hr class="harvest-divider" />

        <!-- Action Buttons (hidden in dry/cure stage — Save Changes handles saving) -->
        ${(stage !== 'dry' && stage !== 'cure') ? html`
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
        ` : nothing}
      </div>
    `;
  }

  private async _saveHarvestMetrics() {
    if (!this.plant?.attributes?.plant_id) return;

    this._savingHarvest = true;
    try {
      const plantId = this.plant.attributes.plant_id;

      const m = this._harvestMetricsEdit;
      if (Object.keys(m).length > 0) {
        await this.store.dataService.updateHarvestMetrics({
          plant_id: plantId,
          ...m
        });
      }

      const s = this._scoresEdit;
      if (Object.keys(s).length > 0) {
        await this.store.dataService.scorePlant({
          plant_id: plantId,
          ...s
        });
      }

      // Small delay to allow backend to process before refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.store.refreshData();

      this._activeTab = 'dashboard';
    } catch (e) {
      console.error('Failed to save harvest metrics', e);
      alert('Failed to save harvest metrics. Check controls/network.');
    } finally {
      this._savingHarvest = false;
    }
  }
}

