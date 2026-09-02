import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';

import { hassContext, configContext, storeContext } from '../../../context';
import { GrowspaceDevice, GrowspaceManagerCardConfig } from '../../../types';
import { GrowspaceStore } from '../../../store/core/growspace-store';
import { HeaderDragController } from '../../../controllers/header-drag-controller';
import {
  computeHeaderMetrics,
  HeaderChip,
  DominantStageInfo,
} from '../../../slices/header-metrics';
import { filterChips } from '../../../utils/chip-filter';
import { envSnapshots$ } from '../../../slices/environment';
import { deviceSnapshots$ } from '../../../slices/device-state';
import { plants$ } from '../../../slices/plant';
import * as uiSlice from '../../../slices/ui';
import { irrigationConfigs$, irrigationStrategies$, tankLevels$ } from '../../../slices/irrigation';
import { getFlowerFlipInfo, FlowerFlipInfo } from '../../../utils/flower-flip';
import { PlantUtils } from '../../../utils/plant-utils';
import { ViewMode, ConfigTab } from '../../../constants';
import { DateTime } from 'luxon';
import { localizePlural, localizeWithParams } from '../../../localize/localize';

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
  private _irrigationStrategiesController!: StoreController<any>;
  private _tankLevelsController!: StoreController<any>;
  private _deviceSnapshotsController!: StoreController<any>;
  private _comparisonsController!: StoreController<any>;
  private _dragController = new HeaderDragController(this);
  private _comparisonUnsub?: () => void;
  private _startingCompare = false;
  private _eligibleMetricMap = new Map<string, HeaderChip>();

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
          this._historyCacheController = new StoreController(
            this,
            this.store.history.$historyCache
          );
        }
        this.store.history.loadHistoryOnDemand();
        this.store.history.startAutoRefresh();
      }
      if (!this._comparisonsController && this.store.comparisons) {
        this._comparisonsController = new StoreController(this, this.store.comparisons.$state);
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
    if (!this._irrigationStrategiesController) {
      this._irrigationStrategiesController = new StoreController(this, irrigationStrategies$);
    }
    if (!this._tankLevelsController) {
      this._tankLevelsController = new StoreController(this, tankLevels$);
    }
    if (!this._deviceSnapshotsController) {
      this._deviceSnapshotsController = new StoreController(this, deviceSnapshots$);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
    this._attachComparisonSync();
    void this._configureComparisons();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._comparisonUnsub?.();
  }

  private get _metrics() {
    if (!this.device || !this.hass) {
      return {
        heroChips: [],
        secondaryChips: [],
        deviceChips: [],
        dominant: undefined,
        irrigationStrategy: null,
        irrigationConfig: null,
        isFlower: false,
      };
    }

    const state = this._headerController?.value;
    const activeEnvGraphs = state?.history?.activeEnvGraphs || new Set();
    const linkedGraphGroups = state?.history?.linkedGraphGroups || [];

    const growspaceId = this.device.deviceId;
    const envSnapshot = envSnapshots$.get().get(growspaceId) ?? null;
    const growspacePlants = plants$.get().filter((p) => p.attributes.growspace_id === growspaceId);
    const irrigationConfig = irrigationConfigs$.get().get(growspaceId) ?? null;
    const irrigationStrategy = irrigationStrategies$.get().get(growspaceId) ?? null;
    const growspaceTanks = tankLevels$.get().get(growspaceId) ?? [];
    const deviceSnapshot = deviceSnapshots$.get().get(growspaceId) ?? null;

    const isFlower = PlantUtils.getDominantStage(growspacePlants)?.stage === 'flower';

    const {
      hero: heroChips,
      chips: secondaryChips,
      deviceChips,
      dominant,
    } = computeHeaderMetrics(
      envSnapshot,
      growspacePlants,
      irrigationConfig,
      growspaceTanks,
      'main',
      activeEnvGraphs,
      linkedGraphGroups,
      irrigationStrategy,
      deviceSnapshot,
      this.device.waterUsage?.litersToday ?? null
    );

    const hidden = this.config?.hidden_chips;
    const task = this.store?.ui?.$taskState?.get?.() ?? { kind: 'idle' };
    const decorate = (chips: HeaderChip[]) =>
      filterChips(chips, hidden).map((chip) =>
        task.kind === 'compare' ? { ...chip, active: task.draftMetrics.includes(chip.key) } : chip
      );
    return {
      heroChips: decorate(heroChips),
      secondaryChips: decorate(secondaryChips),
      deviceChips: decorate(deviceChips),
      dominant,
      irrigationStrategy,
      irrigationConfig,
      isFlower,
    };
  }

  willUpdate(changedProps: Map<PropertyKey, unknown>) {
    if (changedProps.has('store')) {
      this._initControllers();
      this._attachComparisonSync();
    }

    if ((changedProps.has('device') || changedProps.has('store')) && this.store?.history) {
      this.store.history.loadHistoryOnDemand();
    }
    if (changedProps.has('device') || changedProps.has('store') || changedProps.has('hass')) {
      void this._configureComparisons();
    }
  }

  private _attachComparisonSync(): void {
    if (!this.store?.comparisons || this._comparisonUnsub) return;
    this._comparisonUnsub = this.store.comparisons.$state.listen((state) => {
      const groups = state.comparisons.map((comparison) => comparison.metrics);
      if (JSON.stringify(groups) !== JSON.stringify(this.store.history.$linkedGraphGroups.get())) {
        this.store.history.$linkedGraphGroups.set(groups);
      }
    });
  }

  private async _configureComparisons(): Promise<void> {
    if (!this.store?.comparisons || !this.device?.deviceId || !this.hass) return;
    const userId = (this.hass as HomeAssistant & { user?: { id?: string } }).user?.id;
    const persistence = await this.store.comparisons.configure(
      userId,
      this.device.deviceId,
      this.store.history.$linkedGraphGroups.get()
    );
    if (persistence === 'session' && this.store.comparisons.takeSessionOnlyNotice()) {
      this.store.ui.announce(
        localizeWithParams('tasks.comparison_session_only', {}, this.store.ui.$language.get())
      );
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
    if (!metric) return;
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind === 'compare') {
      const chip = this._eligibleMetricMap.get(metric);
      this.store.ui.toggleComparisonMetric(
        metric,
        chip?.label ?? metric,
        Boolean(chip),
        this.store.comparisons?.groupFor(metric)?.id ?? null
      );
      return;
    }
    if (metric === 'crop_steering') {
      uiSlice.toggleEnvGraph(metric, this.store.history, this.store.ui, this.device.deviceId);
      return;
    }
    const comparison = this.store.comparisons?.groupFor(metric);
    const isNowActive = comparison
      ? this.store.history.toggleEnvGraphGroup(comparison.metrics)
      : this.store.history.toggleEnvGraph(metric);
    if (isNowActive && this.store.ui.$viewMode.get() === ViewMode.HEADER) {
      this.store.ui.setViewMode(ViewMode.STANDARD);
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
    uiSlice.openNutrientsDialog();
  }

  private async _handleActionTriggered(e: CustomEvent<{ action: string }>): Promise<void> {
    const { action } = e.detail;
    console.log(`[GrowspaceHeaderContainer] Action triggered: ${action}`);
    if (!this.store) return;

    switch (action) {
      case 'add_plant':
        uiSlice.openAddPlantDialog(this.device?.deviceId ?? this.store.grid.$selectedDevice.get());
        break;
      case 'config': {
        if (this.device) uiSlice.openConfigDialog(this.device);
        break;
      }
      case 'strains':
        uiSlice.openStrainLibraryDialog();
        break;
      case 'irrigation':
        if (this.device?.deviceId)
          uiSlice.openIrrigationDialog({ growspaceId: this.device.deviceId });
        break;
      case 'ai':
        uiSlice.openGrowMasterDialog(this.device?.deviceId || '');
        break;
      case 'logbook':
        uiSlice.openLogbookDialog(this.device?.deviceId);
        break;
      case 'snapshots':
        uiSlice.openSnapshotsDialog(this.device?.deviceId || undefined);
        break;
      case 'water': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        uiSlice.openWateringDialog({
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
          growspaceId: this.device?.deviceId || undefined,
          mode: selectedPlants.size > 0 ? 'plant' : 'growspace',
        });
        break;
      }
      case 'ipm': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        uiSlice.openIPMDialog({
          growspaceId: this.device?.deviceId || '',
          plantIds: selectedPlants.size > 0 ? Array.from(selectedPlants) : undefined,
        });
        break;
      }
      case 'training': {
        const selectedPlants = this.store.ui.$selectedPlants.get();
        uiSlice.openTrainingDialog(
          selectedPlants.size > 0 ? Array.from(selectedPlants) : [],
          this.device?.deviceId || undefined
        );
        break;
      }
      case 'irrigation-recipes':
        uiSlice.openIrrigationRecipesDialog();
        break;
      case 'nutrients':
        uiSlice.openNutrientsDialog();
        break;
      case 'arrange': {
        if (!this._canArrange) {
          this.store.ui.announce(
            localizeWithParams('tasks.arrange_unavailable', {}, this.store.ui.$language.get())
          );
          break;
        }
        this.store.ui.startArrange(this.device.plants, this.device.layoutRevision ?? 0);
        break;
      }
      case 'compare': {
        if (this._startingCompare) break;
        if (!this._canCompare) {
          this.store.ui.announce(
            localizeWithParams('tasks.compare_unavailable', {}, this.store.ui.$language.get())
          );
          break;
        }
        this._startingCompare = true;
        this.requestUpdate();
        try {
          const pruned = await this.store.comparisons.pruneUnavailableMetrics(
            Array.from(this._eligibleMetricMap.keys())
          );
          const started = this.store.ui.startCompare(
            this.store.comparisons.$state.get().recordRevision
          );
          if (started && pruned > 0) {
            this.store.ui.announce(
              localizePlural(
                'tasks.compare_entered_after_prune',
                pruned,
                {},
                this.store.ui.$language.get()
              )
            );
          }
        } catch {
          this.store.ui.announce(
            localizeWithParams('tasks.comparison_prune_failed', {}, this.store.ui.$language.get())
          );
        } finally {
          this._startingCompare = false;
          this.requestUpdate();
        }
        break;
      }
      case 'select_plants': {
        this.store.ui.startSelectPlants();
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

  private get _canArrange(): boolean {
    return Boolean(
      this.device?.capabilities?.atomicPlantLayout &&
      this.device.plants.length > 0 &&
      this.device.rows * this.device.plantsPerRow > 1
    );
  }

  private get _canCompare(): boolean {
    return !this._startingCompare && this._eligibleMetricMap.size >= 2;
  }

  private _handleFlowerFlipClick(e: CustomEvent) {
    const { growspaceId, flowerStart } = e.detail;
    this.store?.ui.dismissFlowerFlip(growspaceId, flowerStart);
    // Lights-on is edited on the Config → Growlights tab now (ADR-0026); the chip
    // fires at flower-flip to prompt setting it, so open that editable tab and pulse
    // the lights-on input into focus (#433).
    uiSlice.openConfigDialog(this.device, ConfigTab.GROWLIGHT, 'lightsOnTime');
  }

  render() {
    if (!this.device || !this.hass) return nothing;

    const {
      heroChips,
      secondaryChips,
      deviceChips,
      dominant,
      irrigationStrategy,
      irrigationConfig,
      isFlower,
    } = this._metrics;

    const ineligible = new Set(['crop_steering', 'water_usage', 'steering_phase']);
    const allChips = [...heroChips, ...secondaryChips, ...deviceChips];
    this._eligibleMetricMap = new Map(
      allChips
        .filter((chip) => (chip.entityIds?.length ?? 0) > 0 && !ineligible.has(chip.key))
        .map((chip) => [chip.key, chip])
    );
    this.store?.comparisons?.setMetricCatalog(
      Array.from(this._eligibleMetricMap.values(), (chip) => ({
        key: chip.key,
        label: chip.label ?? chip.key,
      }))
    );
    const taskState = this._actionsController?.value?.taskState ?? { kind: 'idle' };

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
        .activeTask=${taskState.kind}
        .canArrange=${this._canArrange}
        .canCompare=${this._canCompare}
        .problemPlants=${this._problemPlants}
        .flowerFlipInfo=${this._flowerFlipInfo}
        .irrigationStrategy=${irrigationStrategy}
        .irrigationConfig=${irrigationConfig}
        .isFlower=${isFlower}
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
