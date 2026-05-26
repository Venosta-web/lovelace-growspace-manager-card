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
import { computeHeaderMetrics } from '../../../slices/header-metrics';
import { envSnapshots$ } from '../../../slices/environment';
import { plants$ } from '../../../slices/plant';
import { irrigationConfigs$, tankLevels$ } from '../../../slices/irrigation';
import { getFlowerFlipInfo, FlowerFlipInfo } from '../../../utils/flower-flip';
import { ViewMode } from '../../../constants';
import { DateTime } from 'luxon';

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
  private _envSnapshotsController!: StoreController<any>;
  private _plantsController!: StoreController<any>;
  private _irrigationConfigsController!: StoreController<any>;
  private _tankLevelsController!: StoreController<any>;
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
      if (this.store.history) {
        if (!this._historyCacheController) {
          this._historyCacheController = new StoreController(this, this.store.history.$historyCache);
        }
        this.store.history.loadHistoryOnDemand();
        this.store.history.startAutoRefresh();
      }
    }
    if (!this._envSnapshotsController) {
      this._envSnapshotsController = new StoreController(this, envSnapshots$);
    }
    if (!this._plantsController) {
      this._plantsController = new StoreController(this, plants$);
    }
    if (!this._irrigationConfigsController) {
      this._irrigationConfigsController = new StoreController(this, irrigationConfigs$);
    }
    if (!this._tankLevelsController) {
      this._tankLevelsController = new StoreController(this, tankLevels$);
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

    const growspaceId = this.device.deviceId;
    const envSnapshot = envSnapshots$.get().get(growspaceId) ?? null;
    const growspacePlants = plants$.get().filter((p) => p.attributes.growspace_id === growspaceId);
    const irrigationConfig = irrigationConfigs$.get().get(growspaceId) ?? null;
    const growspaceTanks = tankLevels$.get().get(growspaceId) ?? [];

    const {
      hero: heroChips,
      chips: secondaryChips,
      dominant,
    } = computeHeaderMetrics(
      envSnapshot,
      growspacePlants,
      irrigationConfig,
      growspaceTanks,
      'main',
      activeEnvGraphs,
      linkedGraphGroups
    );

    // Device chips (exhaust, fan, humidifier, dehumidifier) still use the legacy
    // MetricsUtils until the DeviceState slice is implemented (issue #144).
    const { deviceChips } = MetricsUtils.computeHeaderMetrics(
      this.hass,
      this.device,
      activeEnvGraphs,
      linkedGraphGroups
    );

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
    this.dispatchEvent(
      new CustomEvent('growspace-changed', {
        detail: value,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleToggleGraph(e: CustomEvent) {
    const metric = typeof e.detail === 'string' ? e.detail : e.detail.metric;
    if (metric) {
      this.store?.actions.ui.toggleEnvGraph(metric);
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
    this.store?.actions.ui.openNutrientsDialog();
  }

  private _handleActionTriggered(e: CustomEvent<{ action: string }>) {
    const { action } = e.detail;
    console.log(`[GrowspaceHeaderContainer] Action triggered: ${action}`);
    if (!this.store) return;

    switch (action) {
      case 'add_plant':
        this.store.actions.ui.openAddPlantDialog();
        break;
      case 'config': {
        if (this.device) this.store.actions.ui.openConfigDialog(this.device);
        break;
      }
      case 'strains':
        this.store.actions.ui.openStrainLibraryDialog();
        break;
      case 'irrigation':
        if (this.device?.deviceId) this.store.actions.ui.openIrrigationDialog();
        break;
      case 'ai':
        this.store.actions.ui.openGrowMasterDialog(this.device?.deviceId || '');
        break;
      case 'logbook':
        this.store.actions.ui.openLogbookDialog();
        break;
      case 'snapshots':
        this.store.actions.ui.openSnapshotsDialog(this.device?.deviceId || undefined);
        break;
      case 'water': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.actions.ui.openWateringDialog({
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
          growspaceId: this.device?.deviceId || undefined,
          mode: selectedPlants.size > 0 ? 'plant' : 'growspace',
        });
        break;
      }
      case 'ipm': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        this.store.actions.ui.openIPMDialog({
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
        this.store.actions.ui.openNutrientsDialog();
        break;
      case 'ec_ramp':
        this.store.actions.ui.openECRampDialog(this.device?.deviceId || undefined);
        break;
      case 'report':
        this.store.actions.ui.openGrowReportDialog(this.device?.deviceId || undefined);
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
        this.store.ui.setViewMode(
          currentMode === ViewMode.HEATMAP ? ViewMode.STANDARD : ViewMode.HEATMAP
        );
        break;
      }
      default:
        console.warn(`[GrowspaceHeaderContainer] Unknown action: ${action}`);
    }
  }

  private get _problemPlants(): string[] {
    return (this.device?.plants || [])
      .filter((p) => !!p.attributes?.problem)
      .map((p) => p.attributes?.strain || p.attributes?.friendly_name || 'Unknown');
  }

  private get _flowerFlipInfo(): FlowerFlipInfo | null {
    if (!this.device || !this.store?.ui?.$flowerFlipDismissed) return null;
    const today = DateTime.now().toISODate();
    const dismissed = this.store.ui.$flowerFlipDismissed.get();
    return getFlowerFlipInfo(this.device, today, dismissed);
  }

  private _handleFlowerFlipClick(e: CustomEvent) {
    const { growspaceId, flowerStart } = e.detail;
    this.store?.ui.dismissFlowerFlip(growspaceId, flowerStart);
    this.store?.actions.ui.openIrrigationDialog({
      initialTab: 'steering',
      scrollToField: 'lightsOnTime',
    });
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
        .timeRange=${this.store?.history?.getRange() ?? '24h'}
        .viewMode=${this._actionsController?.value?.viewMode || 'standard'}
        .isEditMode=${this._actionsController?.value?.isEditMode || false}
        .selectedPlants=${this._actionsController?.value?.selectedPlants || new Set()}
        .problemPlants=${this._problemPlants}
        .flowerFlipInfo=${this._flowerFlipInfo}
        @device-changed=${this._handleDeviceChange}
        @toggle-graph=${this._handleToggleGraph}
        @chip-drag-start=${this._handleChipDragStart}
        @chip-drop=${this._handleChipDrop}
        @unlink-graphs=${this._handleUnlinkGraphs}
        @open-nutrients=${this._handleOpenNutrients}
        @action-triggered=${this._handleActionTriggered}
        @flower-flip-click=${this._handleFlowerFlipClick}
      ></growspace-header-ui>
    `;
  }
}
