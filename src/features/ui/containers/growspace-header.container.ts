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

  private _lastUpdateArgs: unknown[] = [];

  private _shouldUpdateMetrics(): boolean {
    const activeEnvGraphs = this._headerController?.value?.history?.activeEnvGraphs || new Set();
    const linkedGraphGroups = this._headerController?.value?.history?.linkedGraphGroups || [];
    
    const args = [
      this.device?.deviceId,
      Array.from(activeEnvGraphs).sort().join(','),
      JSON.stringify(linkedGraphGroups),
    ];
    
    const changed = !this._lastUpdateArgs.length || args.some((arg, i) => arg !== this._lastUpdateArgs[i]);
    if (changed) {
      this._lastUpdateArgs = args;
    }
    return changed;
  }

  private _updateMetrics() {
    if (!this.device || !this.hass) {
      this._heroChips = [];
      this._secondaryChips = [];
      this._deviceChips = [];
      this._dominant = undefined;
      return;
    }

    const activeEnvGraphs = this._headerController?.value?.history?.activeEnvGraphs || new Set();
    const linkedGraphGroups = this._headerController?.value?.history?.linkedGraphGroups || [];

    const { mainChips, deviceChips, dominant } = MetricsUtils.computeHeaderMetrics(
      this.hass,
      this.device,
      activeEnvGraphs,
      linkedGraphGroups
    );

    // Split mainChips into Hero and Secondary
    const heroKeySet = new Set(['temperature', 'humidity', 'vpd', 'co2']);
    this._heroChips = [];
    this._secondaryChips = [];
    
    mainChips.forEach(chip => {
      if (heroKeySet.has(chip.key)) {
        this._heroChips.push(chip);
      } else {
        this._secondaryChips.push(chip);
      }
    });

    this._deviceChips = deviceChips;
    this._dominant = dominant;
  }

  willUpdate(changedProps: Map<PropertyKey, unknown>) {
    if (changedProps.has('store')) {
      this._initControllers();
    }

    if (changedProps.has('device') || this._shouldUpdateMetrics()) {
      this._updateMetrics();
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
    this.store?.toggleEnvGraph(e.detail.metric);
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

  private _handleActionTriggered(e: CustomEvent) {
    const { action } = e.detail;
    switch (action) {
      case 'add_plant':
        this.store.openAddPlantDialog();
        break;
      case 'config': {
        if (this.device) this.store.openConfigDialog(this.device);
        break;
      }
      case 'edit':
        this.store.ui.setEditMode(!this._actionsController.value.isEditMode);
        break;
      case 'compact': {
        const currentMode = this._actionsController.value.viewMode;
        this.store.ui.setViewMode(
          currentMode === ViewMode.COMPACT ? ViewMode.STANDARD : ViewMode.COMPACT
        );
        break;
      }
      case 'heatmap': {
        const currentMode = this._actionsController.value.viewMode;
        this.store.ui.setViewMode(
          currentMode === ViewMode.HEATMAP ? ViewMode.STANDARD : ViewMode.HEATMAP
        );
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
        this.store.openTrainingDialog(
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
    }
  }

  render() {
    if (!this.device || !this.hass) return nothing;

    return html`
      <growspace-header-ui
        .hass=${this.hass}
        .heroChips=${this._heroChips}
        .secondaryChips=${this._secondaryChips}
        .deviceChips=${this._deviceChips}
        .dominant=${this._dominant}
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
