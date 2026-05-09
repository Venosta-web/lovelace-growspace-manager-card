import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';

import { hassContext, configContext, storeContext } from '../../../context';
import { GrowspaceDevice, GrowspaceManagerCardConfig } from '../../../types';
import { GrowspaceStore } from '../../../store/core/growspace-store';
import { HeaderDragController } from '../../../controllers/header-drag-controller';
import { MetricsUtils, HeaderChip, DominantStageInfo } from '../../../utils/metrics-utils';
import { ViewMode } from '../../../constants';

import '../components/growspace-header-ui';

@customElement('growspace-header')
export class GrowspaceHeaderContainer extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @consume({ context: configContext, subscribe: true })
  @property({ attribute: false })
  public config!: GrowspaceManagerCardConfig;

  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ type: Boolean }) public compact = false;

  private _headerController!: StoreController<any>;
  private _actionsController!: StoreController<any>;
  private _historyCacheController!: StoreController<any>;
  private _dragController = new HeaderDragController(this);

  get activeEnvGraphs() {
    return this._headerController?.value?.history?.activeEnvGraphs || new Set();
  }

  private _heroChips: HeaderChip[] = [];
  private _secondaryChips: HeaderChip[] = [];
  private _deviceChips: HeaderChip[] = [];
  private _dominant: DominantStageInfo | undefined;

  private _initControllers() {
    if (this.store) {
      if (!this._headerController) {
        this._headerController = new StoreController(this, this.store.$headerState);
      }
      if (!this._actionsController) {
        this._actionsController = new StoreController(this, this.store.$headerActionsState);
      }
      if (!this._historyCacheController) {
        this._historyCacheController = new StoreController(this, this.store.history.$historyCache);
      }
      this.store.history.loadHistoryOnDemand();
      this.store.history.startAutoRefresh();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  private get _metrics() {
    if (!this.device || !this.hass) {
      return { heroChips: [], secondaryChips: [], deviceChips: [], dominant: undefined };
    }

    const state = this._headerController?.value;
    const activeEnvGraphs = state?.history?.activeEnvGraphs || new Set();
    const linkedGraphGroups = state?.history?.linkedGraphGroups || [];

    const { mainChips, deviceChips, dominant } = MetricsUtils.computeHeaderMetrics(
      this.hass,
      this.device,
      activeEnvGraphs,
      linkedGraphGroups
    );

    // Split mainChips into Hero and Secondary
    const heroKeySet = new Set(['temperature', 'humidity', 'vpd', 'co2']);
    const heroChips: HeaderChip[] = [];
    const secondaryChips: HeaderChip[] = [];
    
    mainChips.forEach(chip => {
      if (heroKeySet.has(chip.key)) {
        heroChips.push(chip);
      } else {
        secondaryChips.push(chip);
      }
    });

    return { heroChips, secondaryChips, deviceChips, dominant };
  }

  willUpdate(changedProps: Map<PropertyKey, unknown>) {
    if (changedProps.has('store')) {
      this._initControllers();
    }

    if ((changedProps.has('device') || changedProps.has('store')) && this.store?.history) {
      this.store.history.loadHistoryOnDemand();
    }
  }

  private _handleDeviceChange(e: CustomEvent) {
    const value = e.detail.value;
    this.store?.handleDeviceChange(value);
    // Redispatch for compatibility with views that bubble it up to main card
    this.dispatchEvent(new CustomEvent('growspace-changed', {
      detail: value,
      bubbles: true,
      composed: true
    }));
  }

  private _handleToggleGraph(e: CustomEvent) {
    const metric = typeof e.detail === 'string' ? e.detail : e.detail.metric;
    if (metric) {
      this.store?.toggleEnvGraph(metric);
    }
  }

  private _handleChipDragStart(e: CustomEvent) {
    this._dragController.handleDragStart(e.detail.event, e.detail.metric);
  }

  private _handleChipDrop(e: CustomEvent) {
    this._dragController.handleDrop(e.detail.event, e.detail.targetMetric, (source, target) => {
      if (this.store?.history) {
        this.store.history.linkGraphs(source, target);
      }
    });
  }

  private _handleUnlinkGraphs(e: CustomEvent) {
    if (this.store?.history) {
      this.store.history.unlinkGraphGroup(e.detail.groupIndex);
    }
  }

  private _handleOpenNutrients() {
    this.store?.openNutrientsDialog();
  }

  private _handleActionTriggered(e: CustomEvent<{ action: string }>) {
    const { action } = e.detail;
    console.log(`[GrowspaceHeaderContainer] Action triggered: ${action}`);
    if (!this.store) return;
    
    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config': {
        if (this.device) this.store.openConfigDialog(this.device);
        break;
      }
      case 'strains':
        this.store.openStrainLibraryDialog();
        break;
      case 'irrigation':
        if (this.device?.deviceId) this.store.openIrrigationDialog();
        break;
      case 'ai':
        this.store.openGrowMasterDialog(this.device?.deviceId || '');
        break;
      case 'logbook':
        this.store.openLogbookDialog();
        break;
      case 'snapshots':
        this.store.openSnapshotsDialog(this.device?.deviceId || undefined);
        break;
      case 'water': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.openWateringDialog({
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
          growspaceId: this.device?.deviceId || undefined,
          mode: selectedPlants.size > 0 ? 'plant' : 'growspace',
        });
        break;
      }
      case 'ipm': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.openIPMDialog({
          growspaceId: this.device?.deviceId || '',
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
        });
        break;
      }
      case 'training': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.actions.ui.openTrainingDialog(
          selectedPlants.size > 0 ? Array.from(selectedPlants) : [],
          this.device?.deviceId || undefined
        );
        break;
      }
      case 'nutrients':
        this.store.openNutrientsDialog();
        break;
      case 'ec_ramp':
        this.store.openECRampDialog(this.device?.deviceId || undefined);
        break;
      case 'report':
        this.store.openGrowReportDialog(this.device?.deviceId || undefined);
        break;
      case 'edit': {
        const newEditMode = !this.store.ui.$isEditMode.get();
        this.store.ui.setEditMode(newEditMode);
        if (newEditMode && this.store.ui.$viewMode.get() === ViewMode.COMPACT) {
          this.store.ui.setViewMode(ViewMode.STANDARD);
        }
        break;
      }
      case 'heatmap': {
        const currentMode = this.store.ui.$viewMode.get();
        this.store.ui.setViewMode(currentMode === ViewMode.HEATMAP ? ViewMode.STANDARD : ViewMode.HEATMAP);
        break;
      }
      default:
        console.warn(`[GrowspaceHeaderContainer] Unknown action: ${action}`);
    }
  }

  private get _lightOn(): boolean | undefined {
    return this.device?.biologicalMetrics?.isDay;
  }

  private get _problemPlants(): string[] {
    return (this.device?.plants || [])
      .filter((p) => !!p.attributes?.problem)
      .map((p) => p.attributes?.strain || p.attributes?.friendly_name || 'Unknown');
  }

  render() {
    if (!this.device || !this.hass) return nothing;

    const { heroChips, secondaryChips, deviceChips, dominant } = this._metrics;

    return html`
      <growspace-header-ui
        .hass=${this.hass}
        .heroChips=${heroChips}
        .secondaryChips=${secondaryChips}
        .deviceChips=${deviceChips}
        .dominant=${dominant}
        .inventory=${this._headerController?.value?.nutrientInventory || null}
        .devices=${this._headerController?.value?.devices || []}
        .deviceId=${this.device.deviceId}
        .device=${this.device}
        .config=${this.config}
        .compact=${this.compact}
        .historyCache=${this._historyCacheController?.value || {}}
        .timeRange=${this.store.history.getRange()}
        .viewMode=${this._actionsController?.value?.viewMode || 'standard'}
        .isEditMode=${this._actionsController?.value?.isEditMode || false}
        .selectedPlants=${this._actionsController?.value?.selectedPlants || new Set()}
        .lightOn=${this._lightOn}
        .problemPlants=${this._problemPlants}
        @device-changed=${this._handleDeviceChange}
        @toggle-graph=${this._handleToggleGraph}
        @chip-drag-start=${this._handleChipDragStart}
        @chip-drop=${this._handleChipDrop}
        @unlink-graphs=${this._handleUnlinkGraphs}
        @open-nutrients=${this._handleOpenNutrients}
        @action-triggered=${this._handleActionTriggered}
      ></growspace-header-ui>
    `;
  }
}
