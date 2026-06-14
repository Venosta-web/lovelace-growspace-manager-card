import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { PollingController } from '../../../features/shared/controllers/polling.controller';
import { hassContext, storeContext } from '../../../context';
import {
  mdiWater,
  mdiPlus,
  mdiAlert,
  mdiPencil,
  mdiDelete,
  mdiContentSave,
  mdiInformation,
  mdiArrowLeft,
  mdiCalendarClock,
  mdiLeaf,
  mdiCog,
  mdiChartBar,
  mdiArrowDownCircle,
  mdiBullseyeArrow,
  mdiTrendingUp,
  mdiCompassOutline,
  mdiLockOutline,
} from '@mdi/js';
import type { ECRampCurve, ECRampPoint, CropSteeringHistory } from '../../../schemas/api-schema';
import {
  IrrigationTime,
  IrrigationStrategy,
  GrowspaceDevice,
  DrainECReading,
  TankWaterEvent,
} from '../../../types';
import {
  fmtMinuteOfDay,
  computeCropSteeringCycle,
  computePhases,
  generateSubstrateProjection,
  type CropSteeringShot,
  type CropSteeringPhases,
  type SubstrateProjectionPoint,
} from '../../../features/environment/crop-steering-model';
import {
  createInitialSM,
  transition,
  requestTabSwitch,
  discardAndSwitch,
  type DialogSM,
  type TankDraft,
} from '../../../dialogs/irrigation-dialog-sm';
import { MutationRunController, type MutationRunEvent } from '../../../dialogs/mutation-run-controller';
import { DataService } from '../../../services/data-service';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { ecRampCurves$ } from '../../../slices/nutrient';
import {
  cropSteeringHistory$,
  irrigationConfigs$,
  tankLevels$,
  addIrrigationTime,
  removeIrrigationTime,
  addDrainTime,
  removeDrainTime,
  saveIrrigationSettings,
  updateIrrigationStrategy,
  runIrrigationCycle,
} from '../../../slices/irrigation';
import { configureEnvironment } from '../../../slices/growspace';
import type {
  IrrigationConfig,
  SteeringMode,
  SubstrateProfile,
  SubstrateMediaType,
  IrrigationTank,
} from '../../../services/types';
import '../../../features/shared/ui';
import '../../../features/shared/ui/md3-text-input';
import '../../../features/shared/ui/md3-number-input';
import '../../../features/shared/ui/md3-switch';
import '../../../features/shared/ui/gs-help-tooltip';
import '../../../features/environment/components/crop-steering-day-chart';
// Decomposed Overview tab (ADR-0019): Tab Component + its ViewModel + the shared
// Dialog Capabilities atom. Overview is the read-only reference adapter; every
// other tab still renders via the inline `_renderXTab()` methods below.
import { createDialogCapabilities, type DialogCapabilities } from '../viewmodels/dialog-capabilities';
import {
  createOverviewTabViewModel,
  type OverviewTabViewModel,
} from '../viewmodels/overview-tab.viewmodel';
import { createShellViewModel, type ShellViewModel } from '../viewmodels/shell.viewmodel';
// Decomposed Tanks tab (ADR-0019): the first *draft* tab adapter.
import {
  createTanksTabViewModel,
  mergeTankDraft,
  type TanksTabViewModel,
} from '../viewmodels/tanks-tab.viewmodel';
import { atom, type ReadableAtom } from 'nanostores';
import '../components/irrigation-overview-tab';
import '../components/irrigation-tanks-tab';

// MDI check icon path for time chips
const MDI_CHECK = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
const MDI_INFO =
  'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z';

type TabId =
  | 'overview'
  | 'schedules'
  | 'steering'
  | 'config'
  | 'tanks'
  | 'water_analytics'
  | 'drain_ec'
  | 'substrate_ec'
  | 'ec_ramp';

interface NavDef {
  id: TabId;
  label: string;
  group: string;
  icon: string;
  badge?: number;
}

// ─── MutationRunController effect params (ADR-0015) ──────────────────────────
// Built synchronously at dispatch time and carried in the `applying` status, so
// effects never read sub-state that a handler has already cleared.

interface SaveSettingsParams {
  irrigationPumpEntity: string;
  drainPumpEntity: string;
  irrigationDuration: number;
  drainDuration: number;
  soilTriggerPercent: number | null;
  dailyVolumeCapLiters: number | null;
  maxCyclesPerDay: number | null;
  skipDuringDark: boolean;
  pauseOnLowTank: boolean;
  logToLogbook: boolean;
  autoAdvanceP1ToP2: boolean;
  autoAdvanceP2ToP3: boolean;
  haltOnRunoffEcThreshold: number | null;
  activeSteeringPhase: 'p1' | 'p2' | 'p3';
}

interface SaveAllParams {
  settings: SaveSettingsParams;
  strategy: Partial<IrrigationStrategy>;
  drainConfig: { enabled: boolean; maxEcDelta: number; targetRunoffPercent: number };
  ecTargetRanges: import('../../../services/types').ECTargetRange[];
}

interface EditTimeParams {
  originalTime: string;
  formattedTime: string;
  duration: number;
}

interface SaveTankParams {
  growspaceId: string;
  irrigationTanks: IrrigationTank[];
}

@customElement('irrigation-dialog')
export class IrrigationDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Object }) public returnPayload?: unknown;
  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public device: GrowspaceDevice | undefined;

  @property({ type: String }) public growspaceName = '';
  @property({ type: String }) public initialTab: TabId | undefined = undefined;
  @property({ type: String }) public scrollToField: string | undefined = undefined;

  /** Single reactive state atom. All 35 former @state() flags live here. */
  @state() private _sm: DialogSM = createInitialSM();
  /**
   * Nanostores mirror of `_sm`, synced once in `willUpdate` (the ~70 in-place
   * `this._sm =` sites stay untouched). Lets per-tab ViewModels that depend on
   * interaction state — e.g. the Tanks tab's edit draft — derive reactively.
   */
  private _smAtom = atom<DialogSM>(this._sm);

  // ─── Tanks tab (ADR-0019: draft lives in the SM, not here) ──────────────
  // Sensor/input_number entity_ids for the tank editor datalist — a hass-derived
  // view input mirrored into an atom so the Tanks Tab ViewModel stays the single
  // source and the component takes only `.vm`.
  private _tankSensorOptions = atom<string[]>([]);

  // ─── EC Ramp tab state ──────────────────────────────────────────────────
  @state() private _ecRampView: 'LIST' | 'EDIT' = 'LIST';
  @state() private _ecRampEditingCurve: Partial<ECRampCurve> | null = null;
  @state() private _ecRampError: string | null = null;
  private _ecRampFetched = false;
  private _ecRampCurvesController?: StoreController<Record<string, ECRampCurve> | null>;

  // ─── Irrigation Configs (live, non-draft reads) ───────────────────────
  private _irrigationConfigsController = new StoreController(this, irrigationConfigs$);

  // ─── Dialog Shell wiring (ADR-0019) ───────────────────────────────────
  // The device arrives as a prop; mirror it into an atom so the shared
  // Dialog Capabilities atom and the Overview Tab ViewModel can derive from it.
  private _deviceAtom = atom<GrowspaceDevice | undefined>(undefined);
  /** Shared cross-tab capabilities — peer input to the shell VM and every tab VM. */
  private _caps: ReadableAtom<DialogCapabilities> = createDialogCapabilities(
    this._deviceAtom,
    irrigationConfigs$
  );
  /** Shell ViewModel — consumes `$caps` for the nav rail-group visibility gate. */
  private _shellVm: ReadableAtom<ShellViewModel> = createShellViewModel(this._caps);
  private _shellVmController = new StoreController(this, this._shellVm);
  /** Read-only Overview tab ViewModel (the reference per-tab adapter). */
  private _overviewVm: ReadableAtom<OverviewTabViewModel> = createOverviewTabViewModel(
    this._deviceAtom,
    this._caps
  );
  private _overviewVmController = new StoreController(this, this._overviewVm);
  /** Tanks tab ViewModel — the first *draft* tab adapter ($sm-first, no $caps). */
  private _tanksVm: ReadableAtom<TanksTabViewModel> = createTanksTabViewModel(
    this._smAtom,
    tankLevels$,
    this._tankSensorOptions,
    this._deviceAtom
  );
  private _tanksVmController = new StoreController(this, this._tanksVm);

  // ─── Crop Steering History (Schedules tab) ────────────────────────────
  private _cropSteeringHistoryFetched = false;
  private _cropSteeringPoller?: PollingController;
  private _cropSteeringHistoryController?: StoreController<Map<string, CropSteeringHistory>>;

  private _dataService?: DataService;

  /**
   * Owns the gesture->mutation seam (ADR-0015). Handlers stay synchronous and
   * only `dispatch({ type: 'SaveRequested', action, params })`; this controller
   * runs the matching effect post-render and handles success/failure.
   */
  private _mutationRunner = new MutationRunController(this);

  /** Apply a transition and trigger a re-render. Used by the controller + handlers. */
  public dispatch(event: MutationRunEvent | Parameters<typeof transition>[1]): void {
    this._sm = transition(this._sm, event as Parameters<typeof transition>[1]);
  }

  /** SM accessor for the controller (reads `status` to detect `applying`). */
  public get sm(): DialogSM {
    return this._sm;
  }

  /**
   * Effects keyed by action. Run post-render by the MutationRunController with
   * params carried in the `applying` status — they MUST read only `params`
   * (+ stable `this.device.deviceId`), never `this._sm.tabs.*.sub`.
   */
  public readonly effects: Record<string, (params: unknown) => Promise<void>> = {
    'save-all': (params) => this._effectSaveAll(params as SaveAllParams),
    'save-settings': (params) => this._effectSaveSettings(params as SaveSettingsParams),
    'run-now': () => this._effectRunNow(),
    'edit-irrigation-time': (params) => this._effectEditIrrigationTime(params as EditTimeParams),
    'edit-drain-time': (params) => this._effectEditDrainTime(params as EditTimeParams),
    'save-tank': (params) => this._effectSaveTank(params as SaveTankParams),
  };

  static styles = [
    dialogStyles,
    css`
      /* ── Crop Steering Overview tab ── */
      .cs-metric-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 16px;
      }
      .cs-metric-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .cs-metric-value {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-text-color);
        margin: 8px 0;
      }
      .cs-metric-label {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .cs-metric-sub {
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        margin-bottom: 6px;
        font-variant-numeric: tabular-nums;
      }
      .cs-metric-locked {
        opacity: 0.55;
        border-style: dashed;
      }
      .cs-shot-composition {
        margin-top: 16px;
      }
      .cs-phase-pill {
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
        color: var(--secondary-text-color);
      }
      .cs-shot-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        padding: 4px 0;
        font-variant-numeric: tabular-nums;
      }
      .cs-shot-total {
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin-top: 4px;
        padding-top: 8px;
        font-weight: 600;
      }
      .cs-mode-badge {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: bold;
        text-transform: capitalize;
        margin-top: 8px;
        display: inline-block;
      }
      .cs-mode-vegetative {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }
      .cs-mode-generative {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
      .cs-mode-balanced {
        background: rgba(33, 150, 243, 0.2);
        color: #2196f3;
      }
      .cs-intent {
        margin-top: 12px;
        font-size: 0.85rem;
        text-transform: capitalize;
      }
      .cs-intent-ontarget {
        color: var(--success-color, #4caf50);
      }
      .cs-intent-deviation {
        color: var(--warning-color, #ff9800);
        font-weight: 500;
      }

      /* ── Body layout ── */
      .glass-dialog-container {
        max-height: 90vh;
      }

      .dlg-body {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      /* ── Sidebar rail ── */
      .v1-rail {
        width: 176px;
        flex-shrink: 0;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 8px 0;
        background: rgba(0, 0, 0, 0.12);
      }

      .v1-rail-caps {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.35);
        padding: 12px 16px 4px;
      }

      .v1-nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 16px;
        cursor: pointer;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.65);
        transition:
          background 0.15s,
          color 0.15s;
        position: relative;
        user-select: none;
      }

      .v1-nav-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.9);
      }

      .v1-nav-item.active {
        background: rgba(33, 150, 243, 0.12);
        color: #2196f3;
      }

      .v1-nav-item.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 4px;
        bottom: 4px;
        width: 3px;
        background: #2196f3;
        border-radius: 0 2px 2px 0;
      }

      .nav-badge {
        margin-left: auto;
        background: rgba(33, 150, 243, 0.2);
        color: #2196f3;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }

      /* ── Content area ── */
      .v1-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .v1-content-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        flex-shrink: 0;
        background: rgba(0, 0, 0, 0.06);
      }

      .growspace-crumb {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.35);
        text-transform: uppercase;
        letter-spacing: 0.07em;
      }

      .growspace-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }

      .content-section-title {
        margin-left: auto;
        font-size: 0.95rem;
        font-weight: 500;
        opacity: 0.8;
      }

      .v1-content-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* ── Persistent footer ── */
      .dlg-footer {
        display: flex;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.15);
        flex-shrink: 0;
        gap: 10px;
      }

      .dlg-footer-meta {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.4);
        font-variant-numeric: tabular-nums;
      }

      .dlg-footer-meta .sep {
        opacity: 0.4;
      }

      .dlg-footer-actions {
        display: flex;
        gap: 8px;
      }

      /* ── Timeline ── */
      .timeline-track {
        position: relative;
        height: 96px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.2);
        overflow: hidden;
        cursor: crosshair;
      }

      .grid-v {
        position: absolute;
        top: 0;
        bottom: 18px;
        width: 1px;
        background: rgba(255, 255, 255, 0.04);
        pointer-events: none;
      }
      .grid-v.major {
        background: rgba(255, 255, 255, 0.09);
      }

      .x-label {
        position: absolute;
        bottom: 4px;
        transform: translateX(-50%);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.35);
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }

      .timeline-event {
        position: absolute;
        top: 10px;
        height: 52px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: flex-end;
        padding: 4px 5px;
        overflow: hidden;
        transition: transform 0.15s;
        z-index: 5;
      }

      .timeline-event:hover {
        transform: translateY(-2px);
      }

      .timeline-event.completed {
        opacity: 0.45;
      }

      .timeline-event.completed::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          45deg,
          transparent 0 3px,
          rgba(0, 0, 0, 0.18) 3px 5px
        );
        pointer-events: none;
      }

      .timeline-event .event-lbl {
        font-size: 9.5px;
        color: rgba(0, 0, 0, 0.78);
        font-weight: 600;
        white-space: nowrap;
        position: relative;
        z-index: 1;
      }

      .now-line {
        position: absolute;
        top: 4px;
        bottom: 22px;
        width: 1px;
        background: #ff9800;
        box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);
        pointer-events: none;
        z-index: 8;
      }

      .now-line::before {
        content: '';
        position: absolute;
        left: -3px;
        top: -3px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ff9800;
      }

      /* ── Time chips ── */
      .time-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .time-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 4px 0 10px;
        border-radius: 8px;
        font-size: 12.5px;
        font-variant-numeric: tabular-nums;
      }

      .time-chip.irrig-chip {
        background: rgba(33, 150, 243, 0.14);
        border: 1px solid rgba(33, 150, 243, 0.3);
        color: rgba(255, 255, 255, 0.9);
      }

      .time-chip.drain-chip {
        background: rgba(255, 152, 0, 0.14);
        border: 1px solid rgba(255, 152, 0, 0.3);
        color: rgba(255, 255, 255, 0.9);
      }

      .time-chip.new-chip {
        background: transparent;
        border: 1px dashed rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        padding: 0 12px;
        border-radius: 8px;
      }
      .time-chip.new-chip:hover {
        border-color: rgba(255, 255, 255, 0.35);
        color: rgba(255, 255, 255, 0.7);
      }

      .chip-dur {
        color: rgba(255, 255, 255, 0.45);
        font-size: 11px;
      }

      .chip-remove {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        margin-left: 2px;
        flex-shrink: 0;
      }
      .chip-remove:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.85);
      }

      /* ── Phase cards ── */
      .phase-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .phase-card {
        padding: 12px 14px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: pointer;
        transition:
          background 0.15s,
          border-color 0.15s;
      }
      .phase-card:hover {
        background: rgba(255, 255, 255, 0.035);
      }
      .phase-card.active {
        border-color: rgba(33, 150, 243, 0.5);
        background: rgba(33, 150, 243, 0.08);
      }
      .seg-btn {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        color: var(--primary-text-color);
        font-size: 0.85rem;
        cursor: pointer;
      }
      .seg-btn.active {
        border-color: rgba(33, 150, 243, 0.5);
        background: rgba(33, 150, 243, 0.12);
        font-weight: 600;
      }
      .seg-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .phase-card .phase-num {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.4);
      }
      .phase-card .phase-nm {
        font-size: 14px;
        font-weight: 500;
      }
      .phase-card .phase-desc {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.5);
        line-height: 1.4;
      }

      /* ── Info banner ── */
      .info-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(33, 150, 243, 0.07);
        border: 1px solid rgba(33, 150, 243, 0.2);
        border-radius: 8px;
        font-size: 12.5px;
        color: rgba(255, 255, 255, 0.65);
        line-height: 1.5;
      }

      /* ── Stub badge ── */
      .stub-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 10px;
        background: rgba(255, 152, 0, 0.12);
        color: #ff9800;
        border: 1px solid rgba(255, 152, 0, 0.3);
        margin-left: 8px;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 20px;
        border: 1px solid rgba(79, 195, 247, 0.4);
        background: rgba(79, 195, 247, 0.1);
        color: #4fc3f7;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .action-btn:hover:not([disabled]) {
        background: rgba(79, 195, 247, 0.2);
      }
      .action-btn[disabled],
      .action-btn.saving {
        opacity: 0.5;
        cursor: default;
      }

      /* ── Overlay (unchanged) ── */
      .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      /* ── Toast ── */
      .toast-notification {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(50, 50, 50, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 10001;
        animation: toast-slide-up 0.3s ease-out;
      }
      .toast-notification.error {
        background: rgba(244, 67, 54, 0.15);
        border-color: rgba(244, 67, 54, 0.3);
      }
      @keyframes toast-slide-up {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      .toast-message {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.9rem;
      }

      /* ── Edit dialog buttons ── */
      .edit-dialog-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      .edit-dialog-buttons .delete-button {
        flex: 0 0 auto;
      }
      .edit-dialog-buttons .spacer {
        flex: 1;
      }
      .edit-dialog-buttons .action-buttons {
        display: flex;
        gap: 8px;
      }
      .md3-button.delete-button {
        background: rgba(244, 67, 54, 0.2) !important;
        color: #f44336 !important;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }
      .md3-button.delete-button:hover {
        background: rgba(244, 67, 54, 0.3) !important;
      }

      /* ── Setup hints ── */
      .setup-hints {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: 12px;
      }
      .setup-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.55);
        line-height: 1.4;
      }
      .setup-hint .hint-icon {
        flex-shrink: 0;
        font-size: 1rem;
      }

      /* ── Disable stub controls ── */
      .stub-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        opacity: 0.55;
      }
      .stub-row-label {
        font-size: 13px;
      }
      .stub-row-desc {
        font-size: 11px;
        opacity: 0.6;
        margin-top: 2px;
      }

      /* ── Crop Steering Schedule ── */
      .auto-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 22px;
        padding: 0 8px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.18), rgba(33, 150, 243, 0.18));
        border: 1px solid rgba(76, 175, 80, 0.4);
        color: #4caf50;
        border-radius: 6px;
      }
      .auto-pill .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #4caf50;
        box-shadow: 0 0 6px rgba(76, 175, 80, 0.9);
        flex-shrink: 0;
      }
      .cs-timeline {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cs-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 2px;
      }
      .cs-leg-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 24px;
        padding: 0 10px;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.6);
        font-variant-numeric: tabular-nums;
      }
      .cs-leg-chip strong {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }
      .cs-leg-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .info-banner.banner-cs {
        background: linear-gradient(90deg, rgba(76, 175, 80, 0.1), rgba(33, 150, 243, 0.06));
        border: 1px solid rgba(76, 175, 80, 0.3);
        border-left: 3px solid #4caf50;
      }
      .info-banner.banner-cs svg {
        fill: #4caf50;
      }

      @keyframes field-pulse-anim {
        0% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33, 150, 243), 0.5);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(var(--primary-color-rgb, 33, 150, 243), 0.2);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33, 150, 243), 0);
        }
      }
      .field-pulse {
        animation: field-pulse-anim 3s ease-out 1;
      }

      @media (max-width: 500px) {
        .glass-dialog-container {
          width: 100vw;
          max-width: 100%;
          height: 100vh;
          border-radius: 0;
        }
        .v1-rail {
          width: 44px;
          flex: 0 0 44px;
        }
        .v1-nav-item span {
          display: none;
        }
        .v1-rail-caps {
          display: none;
        }
        .nav-badge {
          display: none;
        }
        .v1-nav-item {
          padding: 9px 0;
          justify-content: center;
        }
      }
    `,
  ];

  // ─── Visibility ───────────────────────────────────────────────────────────

  private get _hasPump(): boolean {
    const cfg = this._liveConfig ?? this.device?.irrigationConfig;
    return !!(cfg?.irrigationPumpEntity || cfg?.drainPumpEntity);
  }

  private get _visibleTabs(): TabId[] {
    // `_visibleTabs` is read outside the render cycle (unit tests construct the
    // element and read it without triggering `willUpdate`), so the device atom
    // the shell VM derives from may not be synced yet. Reconcile it first. On the
    // real render path `willUpdate` already synced it, so this is a no-op there.
    if (this._deviceAtom.get() !== this.device) {
      this._deviceAtom.set(this.device);
    }

    const tabs: TabId[] = [];
    const env = this.device?.environmentAttributes;

    const hasPump = this._hasPump;

    // Crop Steering Command Center: Overview + Steering share one gate. The gate
    // is owned by the shared Dialog Capabilities atom (ADR-0019), not re-derived
    // here. The other 7 tabs still gate inline until they are decomposed.
    if (this._shellVm.get().cropSteeringGroupVisible) {
      tabs.push('overview');
      tabs.push('steering');
    }

    if (hasPump) tabs.push('schedules');

    tabs.push('config');

    const hasTanks = (env?.irrigationTanks?.length ?? 0) > 0;
    if (hasTanks) tabs.push('tanks');

    const hasWaterUsage = (this.device?.waterUsage?.litersToday ?? 0) > 0;
    const hasDrainReadings = (this.device?.drainConfig?.readings?.length ?? 0) > 0;
    if (hasTanks || hasWaterUsage || hasDrainReadings) tabs.push('water_analytics');

    const drainEnabled = !!this.device?.drainConfig?.enabled;
    const hasEcSensors =
      (env?.feedEcSensors?.length ?? 0) > 0 ||
      (env?.runoffEcSensors?.length ?? 0) > 0 ||
      (env?.bulkEcSensors?.length ?? 0) > 0 ||
      (env?.poreEcSensors?.length ?? 0) > 0 ||
      (env?.phSensors?.length ?? 0) > 0;
    if (drainEnabled || hasDrainReadings || hasEcSensors) tabs.push('drain_ec');

    if (hasEcSensors) tabs.push('substrate_ec');

    // EC Ramp: visible when pump + at least one schedule + at least one EC sensor
    const hasEcSensorsForRamp =
      (env?.feedEcSensors?.length ?? 0) > 0 ||
      (env?.runoffEcSensors?.length ?? 0) > 0 ||
      (env?.bulkEcSensors?.length ?? 0) > 0 ||
      (env?.poreEcSensors?.length ?? 0) > 0;
    const hasSchedules = ((this._liveConfig ?? this.device?.irrigationConfig)?.irrigationTimes?.length ?? 0) > 0;
    if (hasPump && hasSchedules && hasEcSensorsForRamp) tabs.push('ec_ramp');

    return tabs;
  }

  private get _setupHints(): Array<{ icon: string; text: string }> {
    const hints: Array<{ icon: string; text: string }> = [];
    const visible = this._visibleTabs;

    if (!visible.includes('schedules')) {
      hints.push({
        icon: '🚰',
        text: 'Configure an irrigation or drain pump in Irrigation Settings to enable Schedules, manual run controls, and behaviour settings.',
      });
    }
    if (!visible.includes('steering')) {
      const hasPump = this._hasPump;
      if (!hasPump) {
        hints.push({
          icon: '🚰',
          text: 'Configure an irrigation or drain pump in Irrigation Settings to enable Crop Steering features.',
        });
      } else {
        hints.push({
          icon: '🌱',
          text: 'Configure a soil moisture sensor in Environment Settings to enable VWC Crop Steering.',
        });
      }
    }
    if (!visible.includes('tanks')) {
      hints.push({
        icon: '🪣',
        text: 'Add irrigation tanks in Environment Settings to track tank levels and water consumption.',
      });
    }
    if (!visible.includes('drain_ec')) {
      hints.push({
        icon: '🧪',
        text: 'Configure EC/pH sensors or enable drain monitoring to track nutrient runoff.',
      });
    }
    if (!visible.includes('substrate_ec')) {
      hints.push({
        icon: '🎯',
        text: 'Configure an EC sensor in Environment Settings to set EC targets per growth stage.',
      });
    }
    return hints;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  private get _liveConfig(): IrrigationConfig | undefined {
    const id = this.device?.deviceId;
    return id ? this._irrigationConfigsController.value?.get(id) : undefined;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    // Keep the device atom in sync with the prop so the Dialog Capabilities atom
    // and the Overview Tab ViewModel re-derive when the payload changes.
    if (changedProps.has('device')) {
      this._deviceAtom.set(this.device);
    }
    // Mirror the hass-derived sensor/input_number entity list into its atom so the
    // Tanks Tab ViewModel's edit datalist stays current without the component
    // reading hass.
    if (this.hass && (changedProps.has('hass') || changedProps.has('device'))) {
      this._tankSensorOptions.set(
        this._getEntities(['sensor', 'input_number']).map((s) => s.entity_id)
      );
    }
    if (changedProps.has('open') && this.open) {
      this._initializeState();
      this._fetchStageAnalytics();
      this._ecRampFetched = false;
      this._cropSteeringHistoryFetched = false;
      if (this.initialTab) {
        this._sm = transition(this._sm, { type: 'SWITCH_TAB', tab: this.initialTab });
      }
    }
    if (this.hass && (changedProps.has('hass') || !this._dataService)) {
      this._dataService = new DataService(this.hass);
    }
    if (!this._visibleTabs.includes(this._sm.activeTab)) {
      this._sm = transition(this._sm, { type: 'SWITCH_TAB', tab: 'config' });
    }

    // EC Ramp: reset view when navigating to the tab; lazy-fetch on first visit.
    if (changedProps.has('_sm')) {
      const prev = changedProps.get('_sm') as DialogSM | undefined;
      const prevTab = prev?.activeTab;
      const nextTab = this._sm.activeTab;
      if (nextTab === 'ec_ramp' && prevTab !== 'ec_ramp') {
        this._ecRampView = 'LIST';
        this._ecRampEditingCurve = null;
        this._ecRampError = null;
        if (!this._ecRampFetched && this.store) {
          this._ecRampFetched = true;
          if (!this._ecRampCurvesController) {
            this._ecRampCurvesController = new StoreController(this, ecRampCurves$);
          }
          this.store.actions.library.fetchECRampCurves().catch(() => undefined);
        }
      }

      // Crop Steering History: lazy fetch + polling when Schedules tab is active.
      if (nextTab === 'schedules' && prevTab !== 'schedules') {
        if (!this._cropSteeringHistoryFetched && this.store?.actions?.irrigation && this.device?.deviceId) {
          this._cropSteeringHistoryFetched = true;
          if (!this._cropSteeringHistoryController) {
            this._cropSteeringHistoryController = new StoreController(this, cropSteeringHistory$);
          }
          this.store.actions.irrigation
            .fetchCropSteeringHistory(this.device.deviceId)
            .catch(() => undefined);
        }
        if (!this._cropSteeringPoller && this.store?.actions?.irrigation && this.device?.deviceId) {
          this._cropSteeringPoller = new PollingController(
            this,
            () => {
              const deviceId = this.device?.deviceId;
              return deviceId
                ? this.store!.actions.irrigation.fetchCropSteeringHistory(deviceId).catch(() => undefined)
                : Promise.resolve(undefined);
            },
            { interval: 5 * 60 * 1000, autoStart: false }
          );
        }
        this._cropSteeringPoller?.start();
      } else if (prevTab === 'schedules' && nextTab !== 'schedules') {
        this._cropSteeringPoller?.stop();
      }
    }

    // Mirror `_sm` into its atom (after any in-willUpdate transitions above) so
    // per-tab ViewModels deriving from `_smAtom` see the latest interaction state
    // in this same render. No-op when the reference is unchanged.
    this._smAtom.set(this._sm);
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has('open') && this.open && this.scrollToField) {
      const target = this.shadowRoot?.querySelector<HTMLElement>(
        `[data-scroll-target="${this.scrollToField}"]`
      );
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('field-pulse');
      target.addEventListener('animationend', () => target.classList.remove('field-pulse'), {
        once: true,
      });
    }
  }

  private _initializeState() {
    if (!this.device) return;
    this._sm = transition(this._sm, { type: 'RESET_FROM_DEVICE', device: this.device });
  }

  // ─── Save actions ─────────────────────────────────────────────────────────

  /** Build the settings payload from current SM state. */
  private _buildSettingsParams(): SaveSettingsParams {
    const s = this._sm.tabs.schedules.draft;
    const cfg = this._sm.tabs.config.draft;
    return {
      irrigationPumpEntity: s.irrigationPumpEntity,
      drainPumpEntity: s.drainPumpEntity,
      irrigationDuration: s.irrigationDuration,
      drainDuration: s.drainDuration,
      soilTriggerPercent: cfg.soilTriggerPercent,
      dailyVolumeCapLiters: cfg.dailyVolumeCapLiters,
      maxCyclesPerDay: cfg.maxCyclesPerDay,
      skipDuringDark: cfg.skipDuringDark,
      pauseOnLowTank: cfg.pauseOnLowTank,
      logToLogbook: cfg.logToLogbook,
      autoAdvanceP1ToP2: cfg.autoAdvanceP1ToP2,
      autoAdvanceP2ToP3: cfg.autoAdvanceP2ToP3,
      haltOnRunoffEcThreshold: cfg.haltOnRunoffEcThreshold,
      activeSteeringPhase: this._sm.tabs.steering.phase,
    };
  }

  /**
   * Single footer save — flushes all dirty state across tabs.
   * Synchronous: runs the P2 validation guard, then dispatches the intent.
   * The controller runs the `save-all` effect post-render.
   */
  private _saveAll() {
    const soilTrigger = this._sm.tabs.config.draft.soilTriggerPercent;
    const targetVwc = this._sm.tabs.steering.draft.targetVwcPercent;
    if (soilTrigger != null && targetVwc != null && soilTrigger > targetVwc) {
      this._showErrorToast(
        `P2 Direct Trigger (${soilTrigger}%) must not exceed Saturation Target (${targetVwc}%). ` +
        `A trigger above the target causes irrigation to fire continuously in P2.`
      );
      return;
    }

    const d = this._sm.tabs.drain_ec.draft;
    const substrateEc = this._sm.tabs.substrate_ec.draft;
    // Pore EC Target Band is buffered so an invalid pair never persists (ADR-0017):
    // refuse the unified save when both edges are set and min ≥ max.
    if (
      substrateEc.poreEcMin != null &&
      substrateEc.poreEcMax != null &&
      substrateEc.poreEcMin >= substrateEc.poreEcMax
    ) {
      this._showErrorToast(
        `Min pore EC (${substrateEc.poreEcMin}) must be below max pore EC (${substrateEc.poreEcMax}).`
      );
      return;
    }

    const params: SaveAllParams = {
      settings: this._buildSettingsParams(),
      // The pore-EC band is a strategy field buffered on the Substrate & EC tab
      // (ADR-0017); merge it into the strategy save alongside the steering draft.
      strategy: {
        ...this._sm.tabs.steering.draft,
        poreEcTargetMin: substrateEc.poreEcMin,
        poreEcTargetMax: substrateEc.poreEcMax,
      },
      drainConfig: {
        enabled: d.enabled,
        maxEcDelta: d.maxEcDelta,
        targetRunoffPercent: d.targetRunoffPercent,
      },
      ecTargetRanges: substrateEc.ecTargetRanges,
    };
    this.dispatch({ type: 'SaveRequested', action: 'save-all', params });
  }

  /** Effect: runs the four sub-saves sequentially. */
  private async _effectSaveAll(params: SaveAllParams) {
    const id = this.device?.deviceId;
    if (!id) return;
    await saveIrrigationSettings(id, params.settings);
    // Strategy writes go through the Irrigation slice mutator (ADR-0001 / CONTEXT
    // data-flow layering); drain + EC ranges still use the legacy DataService path.
    await updateIrrigationStrategy(id, params.strategy);
    if (this._dataService) {
      await this._dataService.configureDrainMonitoring(id, params.drainConfig);
      await this._dataService.setEcTargetRanges(id, params.ecTargetRanges);
    }
  }

  /** Save just the settings (used by phase-change confirm). Synchronous dispatcher. */
  private _saveSettings() {
    if (!this.device?.deviceId) return;
    this.dispatch({
      type: 'SaveRequested',
      action: 'save-settings',
      params: this._buildSettingsParams(),
    });
  }

  private async _effectSaveSettings(params: SaveSettingsParams) {
    if (!this.device?.deviceId) return;
    await saveIrrigationSettings(this.device.deviceId, params);
  }

  private async _fetchStageAnalytics() {
    if (!this.device?.deviceId || !this._dataService) return;
    const result = await this._dataService.getIrrigationAnalytics(this.device.deviceId);
    this._sm = transition(this._sm, {
      type: 'SET_STAGE_AGGREGATES',
      data: result?.stage_aggregates ?? null,
    });
  }

  /** Run an irrigation cycle now. Synchronous dispatcher. */
  private _handleRunNow() {
    if (!this.device?.deviceId) return;
    this.dispatch({ type: 'SaveRequested', action: 'run-now', params: null });
  }

  private async _effectRunNow() {
    if (!this.device?.deviceId) return;
    await runIrrigationCycle(this.device.deviceId);
  }

  /** True while a run-now request is in flight (disables the Run Now button). */
  private get _isRunningNow(): boolean {
    return this._sm.status.kind === 'applying' && this._sm.status.action === 'run-now';
  }

  // ─── Schedule mutations ───────────────────────────────────────────────────

  private async _addIrrigationTime(time: string, duration?: number) {
    if (!this.device?.deviceId) return;
    const formattedTime = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
    await addIrrigationTime(
      this.device.deviceId,
      formattedTime,
      duration || this._sm.tabs.schedules.draft.irrigationDuration
    );
  }

  private async _removeIrrigationTime(time: string) {
    if (!this.device?.deviceId) return;
    await removeIrrigationTime(this.device.deviceId, time);
  }

  private async _addDrainTime(time: string, duration?: number) {
    if (!this.device?.deviceId) return;
    const formattedTime = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
    try {
      await addDrainTime(
        this.device.deviceId,
        formattedTime,
        duration || this._sm.tabs.schedules.draft.drainDuration
      );
    } catch (_e) {
      this._showErrorToast('Failed to add drain time');
    }
  }

  private async _removeDrainTime(time: string) {
    if (!this.device?.deviceId) return;
    try {
      await removeDrainTime(this.device.deviceId, time);
    } catch (_e) {
      this._showErrorToast('Failed to remove drain time');
    }
  }

  private _notifyDataChanged() {
    this.dispatchEvent(new CustomEvent('data-changed', { bubbles: true, composed: true }));
  }

  private _startAddingIrrigationTime(x: number, width: number) {
    const pct = Math.max(0, Math.min(1, x / width));
    const totalMinutes = Math.round(pct * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    this._sm = transition(this._sm, {
      type: 'BEGIN_ADD_IRRIGATION',
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      duration: this._sm.tabs.schedules.draft.irrigationDuration,
    });
  }

  private _startAddingDrainTime(x: number, width: number) {
    const pct = Math.max(0, Math.min(1, x / width));
    const totalMinutes = Math.round(pct * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    this._sm = transition(this._sm, {
      type: 'BEGIN_ADD_DRAIN',
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      duration: this._sm.tabs.schedules.draft.drainDuration,
    });
  }

  private _startEditingIrrigationTime(timeStr: string, duration: number) {
    this._sm = transition(this._sm, {
      type: 'BEGIN_EDIT_IRRIGATION',
      originalTime: timeStr,
      originalDuration: duration,
      time: timeStr.substring(0, 5),
      duration,
    });
  }

  private _startEditingDrainTime(timeStr: string, duration: number) {
    this._sm = transition(this._sm, {
      type: 'BEGIN_EDIT_DRAIN',
      originalTime: timeStr,
      originalDuration: duration,
      time: timeStr.substring(0, 5),
      duration,
    });
  }

  /**
   * Save an edited irrigation time. Synchronous: runs the duplicate-time guard,
   * builds params from the inline sub-state, then dispatches. The effect reads
   * only `params` — the inline sub-state is cleared by SaveRequested.
   */
  private _saveEditedIrrigationTime() {
    const sub = this._sm.tabs.schedules.sub;
    if (sub.kind !== 'editing-irrigation' || !this.device?.deviceId) return;
    const { originalTime, time, duration } = sub;
    const formatted = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    if (originalTime !== formatted) {
      const existing = (this._liveConfig ?? this.device.irrigationConfig)?.irrigationTimes || [];
      if (existing.some((t) => t.time === formatted)) {
        this._showErrorToast(`Irrigation time ${time} already exists`);
        return;
      }
    }
    const params: EditTimeParams = { originalTime, formattedTime: formatted, duration };
    this.dispatch({ type: 'SaveRequested', action: 'edit-irrigation-time', params });
  }

  private async _effectEditIrrigationTime(params: EditTimeParams) {
    if (!this.device?.deviceId) return;
    await removeIrrigationTime(this.device.deviceId, params.originalTime);
    await addIrrigationTime(this.device.deviceId, params.formattedTime, params.duration);
  }

  private _saveEditedDrainTime() {
    const sub = this._sm.tabs.schedules.sub;
    if (sub.kind !== 'editing-drain' || !this.device?.deviceId) return;
    const { originalTime, time, duration } = sub;
    const formatted = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    if (originalTime !== formatted) {
      const existing = (this._liveConfig ?? this.device.irrigationConfig)?.drainTimes || [];
      if (existing.some((t) => t.time === formatted)) {
        this._showErrorToast(`Drain time ${time} already exists`);
        return;
      }
    }
    const params: EditTimeParams = { originalTime, formattedTime: formatted, duration };
    this.dispatch({ type: 'SaveRequested', action: 'edit-drain-time', params });
  }

  private async _effectEditDrainTime(params: EditTimeParams) {
    if (!this.device?.deviceId) return;
    await removeDrainTime(this.device.deviceId, params.originalTime);
    await addDrainTime(this.device.deviceId, params.formattedTime, params.duration);
  }

  private async _deleteIrrigationTimeFromEdit() {
    const sub = this._sm.tabs.schedules.sub;
    if (sub.kind !== 'editing-irrigation' || !this.device?.deviceId) return;
    const { originalTime } = sub;
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
    try {
      await removeIrrigationTime(this.device.deviceId, originalTime);
    } catch (_e) {
      this._showErrorToast('Failed to remove irrigation time');
    }
  }

  private async _deleteDrainTimeFromEdit() {
    const sub = this._sm.tabs.schedules.sub;
    if (sub.kind !== 'editing-drain' || !this.device?.deviceId) return;
    const { originalTime } = sub;
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
    try {
      await removeDrainTime(this.device.deviceId, originalTime);
    } catch (_e) {
      this._showErrorToast('Failed to remove drain time');
    }
  }

  /** Format an ISO datetime as it appears in the dialog footer ("Jun 7, 09:45"). */
  private _formatFooterTimestamp(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Render the footer's "Next" value. Manual mode shows a single scheduled
   * point in time; Crop Steering has no fixed schedule, so it shows a
   * projected range bounded by guardrails (cooldown + phase windows) instead —
   * see ADR-0011 / [[Projected Shot Window]] in CONTEXT.md.
   */
  private _renderFooterNext() {
    if (this.device?.irrigationStrategy?.enabled) {
      const window = this.device?.projectedShotWindow;
      if (!window) return '—';
      return `${this._formatFooterTimestamp(window.start)}–${this._formatFooterTimestamp(window.end)}`;
    }

    const next = this.device?.nextScheduledCycle;
    return next ? this._formatFooterTimestamp(next) : '—';
  }

  private _close() {
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
    this._sm = transition(this._sm, { type: 'SET_TOAST', message: undefined });
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _showErrorToast(message: string) {
    this._sm = transition(this._sm, { type: 'SET_TOAST', message });
    setTimeout(() => {
      this._sm = transition(this._sm, { type: 'SET_TOAST', message: undefined });
    }, 5000);
  }

  private _updateStrategyField(field: keyof IrrigationStrategy, value: string | number | boolean) {
    this._sm = transition(this._sm, { type: 'UPDATE_STEERING_DRAFT', partial: { [field]: value } });
  }

  /**
   * Immediately persist a capability-affecting strategy field edited on the
   * Substrate & EC tab (Shot Sizing Mode, Substrate Profile, EC Modulation).
   * These are NOT buffered in the tab draft (ADR-0017) — the unified footer Save
   * does not own them.
   */
  private _persistStrategyNow(updates: Partial<IrrigationStrategy>) {
    const id = this.device?.deviceId;
    if (!id) return;
    void updateIrrigationStrategy(id, updates);
  }

  /** Merge a partial Substrate Profile change onto the live profile and persist. */
  private _persistProfile(change: Partial<SubstrateProfile>) {
    const current: SubstrateProfile = this.device?.irrigationStrategy?.substrateProfile ?? {
      mediaType: 'coco',
      litersPerPot: 0,
    };
    this._persistStrategyNow({ substrateProfile: { ...current, ...change } });
  }

  private async _handleResetWaterTracking() {
    if (!this.device?.deviceId || !this._dataService) return;
    const confirmed = window.confirm(
      "Are you sure you want to reset all water tracking data for this growspace? This includes today's usage counters and volume history."
    );
    if (!confirmed) return;
    try {
      await this._dataService.resetWaterTracking(this.device.deviceId);
      this._showErrorToast('Water tracking data reset successfully');
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to reset water tracking:', e);
      this._showErrorToast('Failed to reset water tracking data');
    }
  }

  private async _logDrainReadingNow() {
    if (!this.device?.deviceId || !this._dataService) return;
    const d = this._sm.tabs.drain_ec.draft;
    if (d.logFeedEc <= 0 || d.logDrainEc <= 0) {
      this._showErrorToast('Feed EC and Drain EC must be > 0');
      return;
    }
    this._sm = transition(this._sm, { type: 'SET_DRAIN_LOGGING', logging: true });
    try {
      await this._dataService.logDrainReading(this.device.deviceId, {
        feedEc: d.logFeedEc,
        drainEc: d.logDrainEc,
        feedVolumeMl: d.logFeedVolume || undefined,
        drainVolumeMl: d.logDrainVolume || undefined,
      });
    } catch (_e) {
      this._showErrorToast('Failed to log drain reading');
    } finally {
      this._sm = transition(this._sm, { type: 'SET_DRAIN_LOGGING', logging: false });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _getNowMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  private _getEntities(domains: string[]) {
    if (!this.hass?.states) return [];
    return Object.values(this.hass.states)
      .filter((s) => s.entity_id && domains.includes(s.entity_id.split('.')[0]))
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  private _renderEntitySelect(
    label: string,
    value: string,
    domains: string[],
    changeHandler: (e: Event) => void
  ) {
    const entities = this._getEntities(domains);
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <select class="md3-input" .value=${value} @change=${changeHandler}>
          <option value="">None</option>
          ${entities.map(
      (e) => html`
              <option value="${e.entity_id}" ?selected=${e.entity_id === value}>
                ${e.attributes.friendly_name || e.entity_id} (${e.entity_id})
              </option>
            `
    )}
        </select>
      </div>
    `;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  protected render() {
    if (!this.open) return nothing;

    const dialogColor = '#2196F3';
    const visible = this._visibleTabs;
    const tankCount = this.device?.environmentAttributes?.irrigationTanks?.length ?? 0;

    const NAV: NavDef[] = [
      { id: 'overview', label: 'Overview', group: 'Crop Steering', icon: mdiCompassOutline },
      { id: 'steering', label: 'Steering', group: 'Crop Steering', icon: mdiLeaf },
      { id: 'substrate_ec', label: 'Substrate & EC', group: 'Crop Steering', icon: mdiBullseyeArrow },
      { id: 'schedules', label: 'Schedules', group: 'Daily Cycle', icon: mdiCalendarClock },
      { id: 'config', label: 'Configuration', group: 'Equipment', icon: mdiCog },
      { id: 'tanks', label: 'Tanks', group: 'Equipment', icon: mdiWater, badge: tankCount || undefined },
      { id: 'water_analytics', label: 'Water Analytics', group: 'Telemetry', icon: mdiChartBar },
      { id: 'drain_ec', label: 'Drain EC', group: 'Telemetry', icon: mdiArrowDownCircle },
      { id: 'ec_ramp', label: 'EC Ramp', group: 'Telemetry', icon: mdiTrendingUp },
    ];
    const visibleNav = NAV.filter((n) => visible.includes(n.id));
    const currentLabel = visibleNav.find((n) => n.id === this._sm.activeTab)?.label ?? '';

    return html`
      <gs-dialog
        .open=${true}
        .heading=${'Irrigation Management'}
        .subtitle=${this.growspaceName}
        .iconPath=${mdiWater}
        stageColor="${dialogColor}"
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <!-- Body: sidebar rail + content -->
          <div class="dlg-body">
            <!-- Sidebar nav -->
            <div class="v1-rail">${this._renderSidebarNav(visibleNav)}</div>

            <!-- Content -->
            <div class="v1-content">
              <div class="v1-content-header">
                <div class="growspace-crumb">Growspace</div>
                <div class="growspace-pill">${this.growspaceName}</div>
                <div style="flex:1;"></div>
                <div class="content-section-title">${currentLabel}</div>
              </div>
              <div class="v1-content-scroll">
                ${this._renderActiveTab(dialogColor)}
                ${this._setupHints.length > 0
        ? html`
                      <div class="setup-hints">
                        ${this._setupHints.map(
          (h) => html`
                            <div class="setup-hint">
                              <span class="hint-icon">${h.icon}</span>
                              <span>${h.text}</span>
                            </div>
                          `
        )}
                      </div>
                    `
        : nothing}
              </div>
            </div>
          </div>

          <!-- Persistent footer -->
          <div class="dlg-footer">
            ${this._hasPump
        ? html`
                  <div class="dlg-footer-meta">
                    <span
                      >Last cycle
                      ${this.device?.lastCycleTimestamp
            ? new Date(this.device.lastCycleTimestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
            : '—'}</span
                    >
                    <span class="sep">·</span>
                    <span>Next ${this._renderFooterNext()}</span>
                  </div>
                `
        : nothing}
            <div class="dlg-footer-actions">
              <button class="md3-button text" @click=${this._close}>Close</button>
              ${this._hasPump
        ? html`
                    <button
                      class="md3-button tonal"
                      ?disabled=${this._sm.status.kind === 'applying'}
                      @click=${this._handleRunNow}
                    >
                      ${this._isRunningNow ? 'Starting…' : 'Run Now'}
                    </button>
                  `
        : nothing}
              <button
                class="md3-button primary btn-save-all"
                style="background: ${dialogColor};"
                ?disabled=${this._sm.status.kind === 'applying'}
                @click=${this._saveAll}
              >
                Save Changes
              </button>
            </div>
          </div>

          ${this._sm.toast
        ? html`
                <div class="toast-notification error">
                  <span class="toast-message">${this._sm.toast}</span>
                </div>
              `
        : ''}

          <!-- Discard-changes confirmation -->
          ${this._sm.status.kind === 'confirm-discard'
        ? html`
                <gs-dialog
                  .open=${true}
                  heading="Discard Changes?"
                  .iconPath=${mdiAlert}
                  stageColor="var(--warning-color, #ff9800)"
                  @close=${() => {
            this._sm = transition(this._sm, { type: 'CANCEL_TAB_SWITCH' });
          }}
                >
                  <div style="padding:20px;">
                    <p style="margin:0 0 12px 0;">
                      You have unsaved changes on this tab. Switch anyway and lose them?
                    </p>
                  </div>
                  <div
                    class="button-group"
                    style="padding:16px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,0.1);"
                  >
                    <button
                      class="md3-button tonal"
                      @click=${() => {
            this._sm = transition(this._sm, { type: 'CANCEL_TAB_SWITCH' });
          }}
                    >
                      Stay
                    </button>
                    <button
                      class="md3-button primary"
                      @click=${() => {
            this._sm = discardAndSwitch(this._sm, this.device!);
          }}
                    >
                      Discard &amp; Switch
                    </button>
                  </div>
                </gs-dialog>
              `
        : nothing}
        </div>
      </gs-dialog>
    `;
  }

  private _renderSidebarNav(nav: NavDef[]) {
    let lastGroup = '';
    return html`
      ${nav.map((item) => {
      const showCap = item.group !== lastGroup;
      lastGroup = item.group;
      return html`
          ${showCap ? html`<div class="v1-rail-caps">${item.group}</div>` : nothing}
          <div
            class="v1-nav-item ${this._sm.activeTab === item.id ? 'active' : ''}"
            data-tab="${item.id}"
            @click=${() => {
          this._sm = requestTabSwitch(this._sm, item.id as TabId, this.device!);
        }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0;">
              <path d="${item.icon}" />
            </svg>
            <span style="flex:1;">${item.label}</span>
            ${item.badge != null ? html`<span class="nav-badge">${item.badge}</span>` : nothing}
          </div>
        `;
    })}
    `;
  }

  private _renderActiveTab(color: string) {
    switch (this._sm.activeTab) {
      case 'overview':
        // Decomposed via the per-tab ViewModel adapter (ADR-0019). All other
        // tabs below still render through their inline `_renderXTab()` methods.
        return html`<irrigation-overview-tab
          .vm=${this._overviewVmController.value}
        ></irrigation-overview-tab>`;
      case 'schedules':
        return this._renderSchedulesTab(color);
      case 'steering':
        return this._renderSteeringTab(color);
      case 'config':
        return this._renderConfigSection();
      case 'tanks':
        return html`<irrigation-tanks-tab
          .vm=${this._tanksVmController.value}
          @edit-tank-requested=${this._onEditTankRequested}
          @tank-draft-changed=${this._onTankDraftChanged}
          @cancel-tank-edit=${this._onCancelTankEdit}
          @save-tank-requested=${this._onSaveTankRequested}
        ></irrigation-tanks-tab>`;
      case 'water_analytics':
        return this._renderWaterAnalyticsTab();
      case 'drain_ec':
        return this._renderDrainECTab();
      case 'substrate_ec':
        return this._renderSubstrateEcTab();
      case 'ec_ramp':
        return this._renderEcRampTab();
      default:
        return nothing;
    }
  }

  // ─── Schedules tab ────────────────────────────────────────────────────────

  private _computeCropSteeringCycle(): CropSteeringShot[] {
    const isFlower = (this.device?.biologicalMetrics?.flowerWeek ?? 0) > 0;
    return computeCropSteeringCycle(this._sm.tabs.steering.draft as IrrigationStrategy, isFlower);
  }

  private _fmtMin(minutes: number): string {
    return fmtMinuteOfDay(minutes);
  }

  private _computePhases(): CropSteeringPhases | null {
    const isFlower = (this.device?.biologicalMetrics?.flowerWeek ?? 0) > 0;
    return computePhases(
      this._sm.tabs.steering.draft as IrrigationStrategy,
      isFlower,
      this.device?.irrigationConfig
    );
  }

  private _generateSubstrateProjection(
    nowOffset: number,
    shots: CropSteeringShot[],
    phases: Pick<CropSteeringPhases, 'lightsOnMin' | 'lightsOffMin' | 'phases'>,
    seedVwc: number,
    seedPoreEc: number,
    viewStart: number,
  ): SubstrateProjectionPoint[] {
    const target = this._sm.tabs.steering.draft.targetVwcPercent ?? 45;
    return generateSubstrateProjection(nowOffset, shots, phases, seedVwc, seedPoreEc, viewStart, target);
  }

  private _renderCropSteeringSchedule() {
    const shots = this._computeCropSteeringCycle();
    const phases = this._computePhases();

    if (!phases) {
      return html`
        <div class="detail-card crop-steering-schedule">
          <div
            style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
          >
            <h3 style="margin:0;">Crop Steering Schedule</h3>
          </div>
          <p style="font-size:0.8rem;opacity:0.6;text-align:center;margin-top:12px;">
            No strategy configured — set Lights On Time in the Steering tab.
          </p>
        </div>
      `;
    }

    const { lightsOnMin, lightsOffMin, lightHours } = phases;
    const p2ShotCount = shots.length;

    // The legend below flags missing sensors based on what the fetched history
    // reports — the chart component does its own fetching, but the dialog keeps a
    // read-only view of the same shared atom for this presence check.
    const growspaceId = this.device?.deviceId ?? '';
    const history = this._cropSteeringHistoryController?.value?.get(growspaceId);
    const hasPoreEc = history?.pore_ec !== undefined;
    const hasBulkEc = history?.bulk_ec !== undefined;

    return html`
      <div class="detail-card crop-steering-schedule">
        <!-- Header -->
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <h3 style="margin:0;">Crop Steering Schedule</h3>
            <gs-help-tooltip
              content="Auto-generated irrigation shots based on your VWC strategy settings. Read-only — edit timing in the Steering tab."
              placement="top"
              label="Crop Steering Schedule"
            ></gs-help-tooltip>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.75rem;opacity:0.55;"
              >${p2ShotCount} shots · ${lightHours}h photoperiod</span
            >
            <span class="auto-pill"><span class="pulse-dot"></span>Auto</span>
          </div>
        </div>

        <div class="cs-timeline">
          <!-- Phase strip + shot track + substrate model: all owned by the shared chart -->
          <crop-steering-day-chart .device=${this.device}></crop-steering-day-chart>

          <!-- Legend: flags missing sensors only — the readout above already
               supplies the color-to-trace mapping for configured metrics -->
          <div class="cs-legend">
            ${!hasPoreEc
              ? html`
                  <span class="cs-leg-chip" style="opacity:0.4;">
                    Pore EC not configured — add it in Environment Settings
                  </span>
                `
              : ''}
            ${!hasBulkEc
              ? html`
                  <span class="cs-leg-chip" style="opacity:0.4;">
                    Bulk EC not configured — add it in Environment Settings
                  </span>
                `
              : ''}
          </div>
          <div class="cs-legend">
            ${phases.phases.map(
        (p) => html`
                <span class="cs-leg-chip">
                  <span class="cs-leg-dot" style="background:${p.color};"></span>
                  <strong>${p.label}</strong> ${p.name}${p.id === 'p2'
            ? html` · ${p2ShotCount} shots`
            : nothing}
                  · ${p.target}
                </span>
              `
      )}
            <span class="cs-leg-chip">
              <span
                style="width:8px;height:8px;border-radius:50%;background:rgba(255,235,59,0.85);flex-shrink:0;"
              ></span>
              ${this._fmtMin(lightsOnMin)}–${this._fmtMin(lightsOffMin)} · ${lightHours}h
              photoperiod
            </span>
          </div>

          ${shots.length === 0
        ? html`
                <p style="font-size:0.8rem;opacity:0.6;text-align:center;margin-top:4px;">
                  No shots computed — check lights-on time and interval in the Steering tab.
                </p>
              `
        : nothing}
        </div>
      </div>
    `;
  }

  private _renderSchedulesTab(color: string) {
    const drainTimes = this.device?.irrigationConfig?.drainTimes || [];
    const schedulesDraft = this._sm.tabs.schedules.draft;
    const isCropSteering = !!this._sm.tabs.steering.draft.enabled;

    return html`
      ${isCropSteering
        ? html`
            <div class="info-banner banner-cs">
              <svg style="width:14px;height:14px;flex-shrink:0;" viewBox="0 0 24 24">
                <path d="${MDI_INFO}"></path>
              </svg>
              <div>
                <strong>Crop Steering is active</strong> — irrigation cycles are computed
                automatically from VWC targets.
                <a
                  href="#"
                  style="color:#4CAF50;margin-left:4px;"
                  @click=${(e: Event) => {
            e.preventDefault();
            this._sm = requestTabSwitch(this._sm, 'steering', this.device!);
          }}
                  >Open Crop Steering →</a
                >
              </div>
            </div>
            ${this._renderCropSteeringSchedule()}
          `
        : html`
            ${this._renderScheduleSection(
          'Irrigation Schedule',
          this.device?.irrigationConfig?.irrigationTimes || [],
          schedulesDraft.irrigationDuration,
          'irrigation',
          color
        )}
          `}
      ${schedulesDraft.drainPumpEntity
        ? this._renderScheduleSection(
            'Drain Schedule',
            drainTimes,
            schedulesDraft.drainDuration,
            'drain',
            '#FF9800'
          )
        : nothing}
      ${!isCropSteering
        ? html`
            <div class="info-banner nudge-card">
              <svg
                style="width:14px;height:14px;flex-shrink:0;fill:currentColor;"
                viewBox="0 0 24 24"
              >
                <path d="${MDI_INFO}"></path>
              </svg>
              <div>
                Enable <strong>Crop Steering</strong> in the Steering tab to switch from a fixed
                daily plan to a phase-driven schedule that adapts to VWC targets.
                <a
                  href="#"
                  style="color:var(--stage-color,${color});margin-left:4px;"
                  @click=${(e: Event) => {
            e.preventDefault();
            this._sm = requestTabSwitch(this._sm, 'steering', this.device!);
          }}
                  >Open Crop Steering →</a
                >
              </div>
            </div>
          `
        : nothing}
    `;
  }

  private _renderScheduleSection(
    title: string,
    times: IrrigationTime[],
    defaultDuration: number,
    type: 'irrigation' | 'drain',
    color: string
  ) {
    const nowMinutes = this._getNowMinutes();
    const schedulesSub = this._sm.tabs.schedules.sub;
    const addingTime =
      type === 'irrigation' && schedulesSub.kind === 'adding-irrigation'
        ? schedulesSub
        : type === 'drain' && schedulesSub.kind === 'adding-drain'
          ? schedulesSub
          : undefined;
    const editingTime =
      type === 'irrigation' && schedulesSub.kind === 'editing-irrigation'
        ? schedulesSub
        : type === 'drain' && schedulesSub.kind === 'editing-drain'
          ? schedulesSub
          : undefined;
    const chipClass = type === 'irrigation' ? 'irrig-chip' : 'drain-chip';

    const validTimes = times.filter((t) => t && (t.time || t.start_time));

    return html`
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <h3 style="margin:0;">${title}</h3>
            <gs-help-tooltip
              content=${type === 'irrigation'
        ? 'Each block is a scheduled irrigation event. Click a block to edit it, or click anywhere on the track to add a new one.'
        : 'Each block is a scheduled drain event. Run drain after irrigation to remove excess runoff.'}
              placement="top"
              label=${title}
            ></gs-help-tooltip>
          </div>
          <button
            class="md3-button primary btn-add-time"
            style="background:${color};"
            @click=${() => this._openAddTimeDialog(type)}
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            ADD TIME
          </button>
        </div>

        <!-- Timeline track -->
        <div
          class="${type}-time-bar timeline-track"
          style="border-color:${color}40;"
          @click=${(e: MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (type === 'irrigation')
          this._startAddingIrrigationTime(e.clientX - rect.left, rect.width);
        else this._startAddingDrainTime(e.clientX - rect.left, rect.width);
      }}
        >
          ${Array.from({ length: 25 }, (_, i) => i).map(
        (h) => html`
              <div
                class="grid-v ${h % 6 === 0 ? 'major' : ''}"
                style="left:${(h / 24) * 100}%;"
              ></div>
              ${h % 3 === 0
            ? html`
                    <span class="x-label" style="left:${(h / 24) * 100}%;">
                      ${h.toString().padStart(2, '0')}:00
                    </span>
                  `
            : nothing}
            `
      )}

          <!-- Event blocks -->
          ${validTimes.map((t) => {
        const timeStr = (t.time || t.start_time)!;
        const [hh, mm] = timeStr.split(':').map(Number);
        const startMin = hh * 60 + (mm || 0);
        const dur = t.duration || t.duration_seconds || defaultDuration;
        const leftPct = (startMin / 1440) * 100;
        const widthPct = (dur / 86400) * 100;
        const isPast = startMin < nowMinutes;
        return html`
              <div
                class="timeline-event ${isPast ? 'completed' : ''}"
                style="
                  left: ${leftPct}%;
                  width: max(${widthPct}%, 18px);
                  background: ${color};
                  box-shadow: 0 0 0 1px ${color}99, 0 2px 6px ${color}55;
                "
                @click=${(e: Event) => {
            e.stopPropagation();
            if (type === 'irrigation') this._startEditingIrrigationTime(timeStr, dur);
            else this._startEditingDrainTime(timeStr, dur);
          }}
                title="${timeStr.substring(0, 5)} · ${dur}s"
              >
                <span class="event-lbl">${timeStr.substring(0, 5)}</span>
              </div>
            `;
      })}

          <!-- Now line -->
          <div class="now-line" style="left:${(nowMinutes / 1440) * 100}%;"></div>
        </div>

        <!-- Time chips -->
        <div class="time-chips">
          ${validTimes.map((t) => {
        const timeStr = (t.time || t.start_time)!;
        const [hh, mm] = timeStr.split(':').map(Number);
        const startMin = hh * 60 + (mm || 0);
        const dur = t.duration || t.duration_seconds || defaultDuration;
        const isPast = startMin < nowMinutes;
        return html`
              <span class="time-chip ${chipClass}">
                ${isPast
            ? html`
                      <svg
                        style="width:12px;height:12px;fill:#4caf50;flex-shrink:0;"
                        viewBox="0 0 24 24"
                      >
                        <path d="${MDI_CHECK}"></path>
                      </svg>
                    `
            : nothing}
                ${timeStr.substring(0, 5)}
                <span class="chip-dur">· ${Math.max(1, Math.round(dur / 60))}m</span>
                <button
                  class="chip-remove"
                  @click=${(e: Event) => {
            e.stopPropagation();
            if (type === 'irrigation')
              this._removeIrrigationTime(timeStr).catch(() => this._showErrorToast('Failed to remove irrigation time'));
            else this._removeDrainTime(timeStr).catch(() => {});
          }}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            `;
      })}
          <button class="time-chip new-chip" @click=${() => this._openAddTimeDialog(type)}>
            + New
          </button>
        </div>

        <!-- Add overlay -->
        ${addingTime
        ? html`
              <div class="overlay-backdrop" @click=${() => this._cancelAddTime(type)}>
                <div
                  class="detail-card"
                  style="max-width:400px;margin:0;background:#2d2d2d;width:90%;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <h3>Add ${title} Time</h3>
                  <md3-text-input
                    label="Time"
                    type="time"
                    .value=${addingTime.time}
                    @change=${(e: CustomEvent) => {
            const val = (e.target as HTMLInputElement).value || e.detail;
            if (type === 'irrigation')
              this._sm = transition(this._sm, {
                type: 'UPDATE_ADD_IRRIGATION',
                time: val,
              });
            else this._sm = transition(this._sm, { type: 'UPDATE_ADD_DRAIN', time: val });
          }}
                  ></md3-text-input>
                  <div
                    style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);"
                  >
                    <span
                      >${type === 'irrigation'
            ? 'Shot Duration (seconds)'
            : 'Drain Duration (seconds)'}</span
                    >
                    <gs-help-tooltip
                      content=${type === 'irrigation'
            ? 'How long the irrigation pump runs per shot. Typical: 15–120 seconds.'
            : 'How long the drain pump runs. Too short = waterlogging.'}
                      placement="right"
                      label=${type === 'irrigation' ? 'Shot Duration' : 'Drain Duration'}
                    ></gs-help-tooltip>
                  </div>
                  <md3-number-input
                    label="Duration (seconds)"
                    .value=${addingTime.duration}
                    .min=${1}
                    @change=${(e: CustomEvent) => {
            const val = parseInt(e.detail);
            if (!isNaN(val)) {
              if (type === 'irrigation')
                this._sm = transition(this._sm, {
                  type: 'UPDATE_ADD_IRRIGATION',
                  duration: val,
                });
              else
                this._sm = transition(this._sm, {
                  type: 'UPDATE_ADD_DRAIN',
                  duration: val,
                });
            }
          }}
                  ></md3-number-input>
                  <div class="button-group">
                    <button class="md3-button tonal" @click=${() => this._cancelAddTime(type)}>
                      Cancel
                    </button>
                    <button
                      class="md3-button primary"
                      @click=${() => {
            if (type === 'irrigation')
              this._addIrrigationTime(addingTime.time, addingTime.duration).catch(
                () => this._showErrorToast('Failed to add irrigation time')
              );
            else
              this._addDrainTime(addingTime.time, addingTime.duration).catch(() => {});
          }}
                      style="background:${color};"
                    >
                      Add Schedule
                    </button>
                  </div>
                </div>
              </div>
            `
        : ''}

        <!-- Edit overlay -->
        ${editingTime
        ? html`
              <div class="overlay-backdrop" @click=${() => this._cancelEditTime(type)}>
                <div
                  class="detail-card"
                  style="max-width:400px;margin:0;background:#2d2d2d;width:90%;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <h3>Edit ${title} Time</h3>
                  <md3-text-input
                    label="Time"
                    type="time"
                    .value=${editingTime.time}
                    @change=${(e: CustomEvent) => {
            const val = (e.target as HTMLInputElement).value || e.detail;
            if (type === 'irrigation')
              this._sm = transition(this._sm, {
                type: 'UPDATE_EDIT_IRRIGATION',
                time: val,
              });
            else
              this._sm = transition(this._sm, { type: 'UPDATE_EDIT_DRAIN', time: val });
          }}
                  ></md3-text-input>
                  <div
                    style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);"
                  >
                    <span
                      >${type === 'irrigation'
            ? 'Shot Duration (seconds)'
            : 'Drain Duration (seconds)'}</span
                    >
                    <gs-help-tooltip
                      content=${type === 'irrigation'
            ? 'How long the irrigation pump runs per shot.'
            : 'How long the drain pump runs.'}
                      placement="right"
                      label=${type === 'irrigation' ? 'Shot Duration' : 'Drain Duration'}
                    ></gs-help-tooltip>
                  </div>
                  <md3-number-input
                    label="Duration (seconds)"
                    .value=${editingTime.duration}
                    .min=${1}
                    @change=${(e: CustomEvent) => {
            const val = parseInt(e.detail);
            if (!isNaN(val)) {
              if (type === 'irrigation')
                this._sm = transition(this._sm, {
                  type: 'UPDATE_EDIT_IRRIGATION',
                  duration: val,
                });
              else
                this._sm = transition(this._sm, {
                  type: 'UPDATE_EDIT_DRAIN',
                  duration: val,
                });
            }
          }}
                  ></md3-number-input>
                  <div class="edit-dialog-buttons">
                    <button
                      class="md3-button delete-button"
                      @click=${() =>
            type === 'irrigation'
              ? this._deleteIrrigationTimeFromEdit()
              : this._deleteDrainTimeFromEdit()}
                    >
                      Delete
                    </button>
                    <div class="spacer"></div>
                    <div class="action-buttons">
                      <button class="md3-button tonal" @click=${() => this._cancelEditTime(type)}>
                        Cancel
                      </button>
                      <button
                        class="md3-button primary"
                        @click=${() =>
            type === 'irrigation'
              ? this._saveEditedIrrigationTime()
              : this._saveEditedDrainTime()}
                        style="background:${color};"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `
        : ''}
      </div>
    `;
  }

  private _openAddTimeDialog(type: 'irrigation' | 'drain') {
    if (type === 'irrigation') {
      this._sm = transition(this._sm, {
        type: 'BEGIN_ADD_IRRIGATION',
        time: '12:00',
        duration: this._sm.tabs.schedules.draft.irrigationDuration,
      });
    } else {
      this._sm = transition(this._sm, {
        type: 'BEGIN_ADD_DRAIN',
        time: '12:00',
        duration: this._sm.tabs.schedules.draft.drainDuration,
      });
    }
  }

  private _cancelAddTime(_type: 'irrigation' | 'drain') {
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
  }

  private _cancelEditTime(_type: 'irrigation' | 'drain') {
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
  }

  private _handlePhaseCardClick(phaseId: 'p1' | 'p2' | 'p3') {
    if (this._sm.tabs.steering.phase === phaseId) return;
    this._sm = transition(this._sm, { type: 'REQUEST_PHASE_CHANGE', phase: phaseId });
  }

  private _confirmPhaseChange() {
    this._sm = transition(this._sm, { type: 'CONFIRM_PHASE_CHANGE' });
    this._saveSettings();
  }

  private _cancelPhaseChange() {
    this._sm = transition(this._sm, { type: 'CANCEL_PHASE_CHANGE' });
  }

  private _handleSteeringModeClick(mode: SteeringMode) {
    this._sm = transition(this._sm, { type: 'REQUEST_STEERING_MODE', mode });
  }

  private _cancelSteeringMode() {
    this._sm = transition(this._sm, { type: 'CANCEL_STEERING_MODE' });
  }

  private async _confirmSteeringMode() {
    const sub = this._sm.tabs.steering.sub;
    if (sub.kind !== 'confirm-mode') return;
    const id = this.device?.deviceId;
    this._sm = transition(this._sm, { type: 'CANCEL_STEERING_MODE' });
    if (!id) return;
    // The slice mutator (via the store action) is the canonical write path; the
    // server stamps the preset and the new field values arrive via device sync.
    await this.store?.actions.irrigation.applySteeringMode(id, sub.pending);
  }

  // ─── Steering tab ─────────────────────────────────────────────────────────

  /**
   * Adaptive Shot Control (ADR-0014): master toggle plus the shared feedback
   * tunables that govern how the loop reacts to the substrate's response —
   * shrinking the shot and lengthening the interval on overshoot, recovering
   * toward nominal on undershoot. Tunables are hidden while disabled.
   */
  private _renderAdaptiveShotControl() {
    const draft = this._sm.tabs.steering.draft;
    const enabled = draft.dynamicShotEnabled ?? true;
    return html`
      <div style="grid-column:span 2;margin-top:12px;">
        <div
          style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
        >
          <div style="display:flex;align-items:center;gap:6px;">
            <span>Adaptive Shot Control</span>
            <gs-help-tooltip
              content="When on, each shot's effect on VWC tunes the next one: overshoot shrinks the shot and lengthens the interval; undershoot recovers both toward nominal. Off freezes shots at the configured size and interval."
            ></gs-help-tooltip>
          </div>
          <md3-switch
            data-field="dynamicShotEnabled"
            .checked=${enabled}
            @change=${(e: Event) =>
        this._updateStrategyField(
          'dynamicShotEnabled',
          (e.target as HTMLInputElement).checked
        )}
          ></md3-switch>
        </div>
        ${enabled
        ? html`
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <md3-number-input
                  data-field="dynamicAggressiveness"
                  label="Aggressiveness"
                  step="0.1"
                  .value=${String(draft.dynamicAggressiveness ?? 1.0)}
                  @change=${(e: CustomEvent) =>
            this._updateStrategyField('dynamicAggressiveness', parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  data-field="dynamicRecovery"
                  label="Recovery"
                  step="0.05"
                  .value=${String(draft.dynamicRecovery ?? 0.1)}
                  @change=${(e: CustomEvent) =>
            this._updateStrategyField('dynamicRecovery', parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  data-field="dynamicShotSizeFloor"
                  label="Shot Size Floor (×)"
                  step="0.05"
                  .value=${String(draft.dynamicShotSizeFloor ?? 0.5)}
                  @change=${(e: CustomEvent) =>
            this._updateStrategyField('dynamicShotSizeFloor', parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  data-field="dynamicIntervalCeiling"
                  label="Interval Ceiling (×)"
                  step="0.1"
                  .value=${String(draft.dynamicIntervalCeiling ?? 1.5)}
                  @change=${(e: CustomEvent) =>
            this._updateStrategyField('dynamicIntervalCeiling', parseFloat(e.detail))}
                ></md3-number-input>
              </div>
            `
        : nothing}
      </div>
    `;
  }

  /**
   * Per-phase P1/P2 shot parameters. The edited field and its unit label follow
   * the active Shot Sizing Mode (seconds vs. percent of substrate volume); the
   * shot interval is always expressed in minutes.
   */
  private _renderPhaseShotParams() {
    const draft = this._sm.tabs.steering.draft;
    // Sizing mode persists immediately on the Substrate & EC tab (ADR-0017), so
    // the relabel reads the live strategy rather than a buffered draft field.
    const isVolume = (this.device?.irrigationStrategy?.shotSizingMode ?? 'seconds') === 'volume';
    const phases: Array<{ id: 'p1' | 'p2'; label: string }> = [
      { id: 'p1', label: 'P1' },
      { id: 'p2', label: 'P2' },
    ];
    return phases.map((p) => {
      const sizeField = isVolume
        ? (`${p.id}ShotVolumePercent` as const)
        : (`${p.id}ShotDurationSeconds` as const);
      const sizeLabel = isVolume
        ? `${p.label} Shot Size (%)`
        : `${p.label} Shot Duration (sec)`;
      const intervalField = `${p.id}ShotIntervalMinutes` as const;
      return html`
        <md3-number-input
          data-field=${sizeField}
          label=${sizeLabel}
          .value=${String(draft[sizeField] ?? '')}
          @change=${(e: CustomEvent) =>
        this._updateStrategyField(sizeField, isVolume ? parseFloat(e.detail) : parseInt(e.detail))}
        ></md3-number-input>
        <md3-number-input
          data-field=${intervalField}
          label="${p.label} Shot Interval (min)"
          .value=${String(draft[intervalField] ?? '')}
          @change=${(e: CustomEvent) =>
        this._updateStrategyField(intervalField, parseInt(e.detail))}
        ></md3-number-input>
      `;
    });
  }

  /**
   * Steering Mode selector (ADR-0012). Selecting a mode opens a confirm step;
   * confirming stamps the server-owned preset into the editable fields. The
   * declared mode renders as the active option.
   */
  private _renderSteeringModeSelector() {
    const declared = this._sm.tabs.steering.draft.declaredSteeringMode ?? null;
    const modes: Array<{ id: SteeringMode; name: string; desc: string }> = [
      { id: 'vegetative', name: 'Vegetative', desc: 'Frequent shots, small dryback — vegetative push.' },
      { id: 'balanced', name: 'Balanced', desc: 'Middle ground between vegetative and generative.' },
      { id: 'generative', name: 'Generative', desc: 'Fewer, larger shots and deeper dryback — generative push.' },
    ];
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <h3 style="margin:0;">Steering Mode</h3>
          <gs-help-tooltip
            content="Selecting a mode stamps recommended setpoints (dryback, P2-stop offset, pore-EC band, shot sizes) into the editable fields below. You can fine-tune afterwards."
          ></gs-help-tooltip>
        </div>
        <p style="font-size:0.8rem;opacity:0.7;margin:0 0 12px;">
          ${declared
        ? html`Declared intent: <strong>${declared}</strong>`
        : 'No mode declared yet.'}
        </p>
        <div class="phase-grid">
          ${modes.map(
          (m) => html`
              <div
                class="phase-card ${declared === m.id ? 'active' : ''}"
                data-steering-mode=${m.id}
                @click=${() => this._handleSteeringModeClick(m.id)}
              >
                <div class="phase-nm">${m.name}</div>
                <div class="phase-desc">${m.desc}</div>
              </div>
            `
        )}
        </div>
      </div>
    `;
  }

  private _renderSteeringModeConfirm() {
    const sub = this._sm.tabs.steering.sub;
    const pending = sub.kind === 'confirm-mode' ? sub.pending : '';
    return html`
      <gs-dialog
        .open=${sub.kind === 'confirm-mode'}
        heading="Apply Steering Mode"
        .iconPath=${mdiAlert}
        stageColor="var(--warning-color, #ff9800)"
        @close=${this._cancelSteeringMode}
      >
        <div style="padding: 20px;">
          <p style="margin: 0 0 12px 0;">
            Apply the <strong>${pending}</strong> preset? This overwrites these fields with
            recommended values:
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem; opacity: 0.85; line-height: 1.5;">
            <li>Maintenance Dryback</li>
            <li>P2 Stop Buffer</li>
            <li>Pore EC Target Band</li>
            <li>Per-phase shot sizes</li>
          </ul>
        </div>
        <div
          class="button-group"
          style="padding: 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1);"
        >
          <button class="md3-button tonal" @click=${this._cancelSteeringMode}>Cancel</button>
          <button
            class="md3-button primary"
            data-action="confirm-steering-mode"
            @click=${this._confirmSteeringMode}
          >
            Apply
          </button>
        </div>
      </gs-dialog>
    `;
  }

  private _renderSteeringTab(_color: string) {
    return html`
      ${this._renderSteeringModeSelector()}

      <!-- Phase cards -->
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <h3 style="margin:0;">Crop Steering Phases</h3>
          <gs-help-tooltip
            content="Crop steering shapes the feeding pattern across three daily phases. P1 = saturation, P2 = maintenance, P3 = dryback."
            placement="top"
            label="Crop Steering Phases"
          ></gs-help-tooltip>
        </div>
        <div class="phase-grid">
          ${(
        [
          {
            id: 'p1',
            label: 'P1',
            name: 'Saturation',
            desc: 'Bring substrate to field capacity through frequent short shots.',
          },
          {
            id: 'p2',
            label: 'P2',
            name: 'Maintenance',
            desc: 'Maintain EC and irrigate to plant uptake — runoff target.',
          },
          {
            id: 'p3',
            label: 'P3',
            name: 'Dryback',
            desc: 'Final stretch of the photoperiod — controlled substrate dry.',
          },
        ] as const
      ).map(
        (p) => html`
              <div
                class="phase-card ${this._sm.tabs.steering.phase === p.id ? 'active' : ''}"
                @click=${() => this._handlePhaseCardClick(p.id)}
              >
                <div class="phase-num">Phase · ${p.label}</div>
                <div class="phase-nm">${p.name}</div>
                <div class="phase-desc">${p.desc}</div>
              </div>
            `
      )}
        </div>
      </div>

      <!-- VWC strategy parameters -->
      <div class="detail-card">
        <h3 style="margin-top:0;">VWC Strategy Configuration</h3>
        <p style="font-size:0.8rem;opacity:0.7;margin-bottom:20px;">
          Enable logic-based irrigation based on volumetric water content (VWC) targets. Overrides
          basic schedules when active.
        </p>

        <div
          style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:12px;"
        >
          <span>Enable VWC Steering</span>
          <md3-switch
            data-field="enabled"
            .checked=${this._sm.tabs.steering.draft.enabled}
            @change=${(e: Event) =>
        this._updateStrategyField('enabled', (e.target as HTMLInputElement).checked)}
          ></md3-switch>
        </div>

        ${(this.device?.environmentAttributes?.lightSensors?.length ?? 0) > 0
        ? html`
              <div
                style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:12px;"
              >
                <span>Auto Track from Light Sensor</span>
                <md3-switch
                  data-field="autoLightTracking"
                  .checked=${!!this._sm.tabs.steering.draft.autoLightTracking}
                  @change=${(e: Event) =>
            this._updateStrategyField(
              'autoLightTracking',
              (e.target as HTMLInputElement).checked
            )}
                ></md3-switch>
              </div>
            `
        : ''}

        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="vwc-targets-group">
            <div class="vwc-targets-group-title" style="display:flex;align-items:center;gap:6px;">
              P1 Thresholds
              <gs-help-tooltip
                content="Saturation Target: P1 ramps up until substrate VWC reaches this value, then switches to P2 maintenance."
              ></gs-help-tooltip>
            </div>
            <md3-number-input
              label="Saturation Target (%)"
              .value=${this._sm.tabs.steering.draft.targetVwcPercent}
              @change=${(e: CustomEvent) =>
        this._updateStrategyField('targetVwcPercent', parseFloat(e.detail))}
            ></md3-number-input>
          </div>

          <div class="vwc-targets-group">
            <div class="vwc-targets-group-title" style="display:flex;align-items:center;gap:6px;">
              P2 Thresholds
              <gs-help-tooltip
                content="Maintenance Dryback: shots fire in P2 when VWC drops this many % below the saturation target. P2 Direct Trigger: optional — if set, bypasses the calculated threshold and fires directly when VWC drops below this value."
              ></gs-help-tooltip>
            </div>
            <md3-number-input
              label="Maintenance Dryback (%)"
              .value=${this._sm.tabs.steering.draft.maintenanceDrybackPercent}
              @change=${(e: CustomEvent) =>
        this._updateStrategyField('maintenanceDrybackPercent', parseFloat(e.detail))}
            ></md3-number-input>
            <md3-number-input
              label="P2 Direct Trigger (%)"
              placeholder="Off"
              .value=${this._sm.tabs.config.draft.soilTriggerPercent != null
        ? String(this._sm.tabs.config.draft.soilTriggerPercent)
        : ''}
              @change=${(e: CustomEvent) => {
        const v = e.detail;
        this._sm = transition(this._sm, {
          type: 'UPDATE_CONFIG_DRAFT',
          partial: { soilTriggerPercent: v !== '' && v != null ? parseFloat(String(v)) : null },
        });
      }}
            ></md3-number-input>
          </div>
        </div>

          <h4 style="margin:4px 0;margin-top:12px;">Timing</h4>

          <div style="display:flex;align-items:center;gap:8px;">
            <md3-text-input
              label="Lights On Time"
              type="time"
              data-scroll-target="lightsOnTime"
              .value=${this._sm.tabs.steering.draft.lightsOnTime}
              @change=${(e: CustomEvent) =>
        this._updateStrategyField(
          'lightsOnTime',
          (e.target as HTMLInputElement).value || e.detail
        )}
            ></md3-text-input>
            ${this._sm.tabs.steering.draft.detectedLightsOnTime
        ? html`
                  <span class="auto-lights-badge"
                    >auto: ${this._sm.tabs.steering.draft.detectedLightsOnTime}</span
                  >
                `
        : ''}
          </div>
          <md3-number-input
            label="P0 Duration (min)"
            .value=${this._sm.tabs.steering.draft.p0DurationMinutes}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('p0DurationMinutes', parseInt(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="P2 Stop Buffer (min)"
            .value=${this._sm.tabs.steering.draft.p2StopBeforeLightsOffMinutes}
            @change=${(e: CustomEvent) =>
        this._updateStrategyField('p2StopBeforeLightsOffMinutes', parseInt(e.detail))}
          ></md3-number-input>

          <h4 style="grid-column:span 2;margin:4px 0;margin-top:12px;">Dosing</h4>

          ${this._renderPhaseShotParams()}
          ${this._renderAdaptiveShotControl()}
        </div>
      </div>

      <!-- Phase Triggers -->
      <div class="detail-card">
        <div style="margin-bottom:14px;">
          <h3 style="margin:0;">Phase Triggers</h3>
        </div>
        <div style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div class="stub-row-label">Auto-advance P1 → P2</div>
              <div class="stub-row-desc">When substrate moisture reaches field capacity</div>
            </div>
            <md3-switch
              data-field="autoAdvanceP1ToP2"
              .checked=${this._sm.tabs.config.draft.autoAdvanceP1ToP2}
              @change=${(e: Event) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_CONFIG_DRAFT',
          partial: { autoAdvanceP1ToP2: (e.target as any).checked },
        });
      }}
            ></md3-switch>
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div class="stub-row-label">Auto-advance P2 → P3</div>
              <div class="stub-row-desc">N hours before lights-off (per stage)</div>
            </div>
            <md3-switch
              data-field="autoAdvanceP2ToP3"
              .checked=${this._sm.tabs.config.draft.autoAdvanceP2ToP3}
              @change=${(e: Event) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_CONFIG_DRAFT',
          partial: { autoAdvanceP2ToP3: (e.target as any).checked },
        });
      }}
            ></md3-switch>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div class="stub-row-label">Halt on Runoff EC</div>
              <div class="stub-row-desc">Suspend cycles and alert until manual resume</div>
            </div>
            <md3-switch
              data-field="haltOnRunoffEc"
              .checked=${this._sm.tabs.config.draft.haltOnRunoffEcThreshold !== null}
              @change=${(e: Event) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_CONFIG_DRAFT',
          partial: { haltOnRunoffEcThreshold: (e.target as any).checked ? 4.0 : null },
        });
      }}
            ></md3-switch>
          </div>
          ${this._sm.tabs.config.draft.haltOnRunoffEcThreshold !== null
        ? html`
                <div style="margin-top:10px;">
                  <md3-number-input
                    data-field="haltOnRunoffEcValue"
                    label="EC Threshold"
                    min="0.1"
                    step="0.1"
                    .value=${String(this._sm.tabs.config.draft.haltOnRunoffEcThreshold)}
                    @change=${(e: CustomEvent) => {
            const v = parseFloat(e.detail ?? (e.target as any).value);
            if (!isNaN(v))
              this._sm = transition(this._sm, {
                type: 'UPDATE_CONFIG_DRAFT',
                partial: { haltOnRunoffEcThreshold: v },
              });
          }}
                  ></md3-number-input>
                </div>
              `
        : nothing}
        </div>
      </div>

      ${this._renderSteeringModeConfirm()}

      <!-- Phase trigger confirmation dialog -->
      <gs-dialog
        .open=${this._sm.tabs.steering.sub.kind === 'confirm-phase'}
        heading="Confirm Phase Transition"
        .iconPath=${mdiAlert}
        stageColor="var(--warning-color, #ff9800)"
        @close=${this._cancelPhaseChange}
      >
        <div style="padding: 20px;">
          <p style="margin: 0 0 12px 0;">
            Are you sure you want to transition from
            <strong>${this._sm.tabs.steering.phase.toUpperCase()}</strong> to
            <strong
              >${this._sm.tabs.steering.sub.kind === 'confirm-phase'
        ? (this._sm.tabs.steering.sub as { pending: string }).pending.toUpperCase()
        : ''}</strong
            >?
          </p>
          <p style="margin: 0; font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">
            Manually shifting phases overrides the current schedule instantly. This is a severe
            change that will disrupt timing and dosing parameters.
          </p>
        </div>
        <div
          class="button-group"
          style="padding: 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1);"
        >
          <button class="md3-button tonal" @click=${this._cancelPhaseChange}>Cancel</button>
          <button class="md3-button primary" @click=${this._confirmPhaseChange}>Confirm</button>
        </div>
      </gs-dialog>
    `;
  }

  // ─── Configuration tab ───────────────────────────────────────────────────

  private _renderConfigSection() {
    return html`
      <div class="detail-card">
        <div class="section-header"><h3>Pump Configuration</h3></div>
        <div class="section-content">
          ${this._renderEntitySelect(
      'Irrigation Pump',
      this._sm.tabs.schedules.draft.irrigationPumpEntity,
      ['switch', 'input_boolean'],
      (e) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_SCHEDULES_DRAFT',
          partial: { irrigationPumpEntity: (e.target as HTMLSelectElement).value },
        });
      }
    )}
          ${this._renderEntitySelect(
      'Drain Pump (Optional)',
      this._sm.tabs.schedules.draft.drainPumpEntity,
      ['switch', 'input_boolean'],
      (e) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_SCHEDULES_DRAFT',
          partial: { drainPumpEntity: (e.target as HTMLSelectElement).value },
        });
      }
    )}
        </div>
      </div>

      ${this._sm.tabs.steering.draft.enabled ? html`
      <div class="detail-card">
        <div
          style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"
        >
          <h3 style="margin:0;">Safety Caps</h3>
          <gs-help-tooltip
            content="Optional hard limits on top of the steering logic. Leave blank to disable."
          ></gs-help-tooltip>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="md3-input-group">
            <label class="md3-label">Daily Volume Cap (L)</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              step="0.1"
              .value=${this._sm.tabs.config.draft.dailyVolumeCapLiters != null
          ? String(this._sm.tabs.config.draft.dailyVolumeCapLiters)
          : ''}
              placeholder="Off"
              @change=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          this._sm = transition(this._sm, {
            type: 'UPDATE_CONFIG_DRAFT',
            partial: { dailyVolumeCapLiters: v ? parseFloat(v) : null },
          });
        }}
            />
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Max Cycles / Day</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              step="1"
              .value=${this._sm.tabs.config.draft.maxCyclesPerDay != null
          ? String(this._sm.tabs.config.draft.maxCyclesPerDay)
          : ''}
              placeholder="Off"
              @change=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          this._sm = transition(this._sm, {
            type: 'UPDATE_CONFIG_DRAFT',
            partial: { maxCyclesPerDay: v ? parseInt(v, 10) : null },
          });
        }}
            />
          </div>
        </div>
      </div>
      ` : nothing}

      ${this._hasPump ? html`
      <div class="detail-card">
        <h3 style="margin:0 0 14px;">Behaviour</h3>
        ${!this._sm.tabs.steering.draft.enabled ? html`
            <div class="stub-row" style="margin-bottom:8px;">
              <div>
                <div class="stub-row-label">Skip During Dark Period</div>
                <div class="stub-row-desc">No cycles between lights-off and lights-on</div>
              </div>
              <md3-switch
                .checked=${this._sm.tabs.config.draft.skipDuringDark}
                @change=${(e: CustomEvent) => {
          this._sm = transition(this._sm, {
            type: 'UPDATE_CONFIG_DRAFT',
            partial: { skipDuringDark: (e.target as any).checked },
          });
        }}
              ></md3-switch>
            </div>
        ` : nothing}
        ${[
        {
          label: 'Pause on Tank Low',
          desc: 'Halt cycles when any tank is below warning level',
          get: () => this._sm.tabs.config.draft.pauseOnLowTank,
          set: (v: boolean) => {
            this._sm = transition(this._sm, {
              type: 'UPDATE_CONFIG_DRAFT',
              partial: { pauseOnLowTank: v },
            });
          },
        },
        {
          label: 'Log to Logbook',
          desc: 'Record start, duration, and moisture delta per cycle',
          get: () => this._sm.tabs.config.draft.logToLogbook,
          set: (v: boolean) => {
            this._sm = transition(this._sm, {
              type: 'UPDATE_CONFIG_DRAFT',
              partial: { logToLogbook: v },
            });
          },
        },
      ].map(
        (row) => html`
            <div class="stub-row" style="margin-bottom:8px;">
              <div>
                <div class="stub-row-label">${row.label}</div>
                <div class="stub-row-desc">${row.desc}</div>
              </div>
              <md3-switch
                .checked=${row.get()}
                @change=${(e: CustomEvent) => {
            row.set((e.target as any).checked);
          }}
              ></md3-switch>
            </div>
          `
      )}
      </div>

      <div class="detail-card">
        <h3 style="margin:0 0 14px;">Manual Override</h3>
        <div style="display:flex;align-items:center;gap:12px;">
          <button
            class="action-btn${this._isRunningNow ? ' saving' : ''}"
            ?disabled=${this._sm.status.kind === 'applying'}
            @click=${this._handleRunNow}
          >
            ${this._isRunningNow ? 'Starting…' : '▶ Run Now'}
          </button>
          <span style="font-size:12px;opacity:0.55;">
            Triggers one irrigation cycle immediately, bypassing the schedule.
          </span>
        </div>
      </div>
      ` : nothing}
    `;
  }

  // ─── Water Analytics tab ──────────────────────────────────────────────────

  private _renderWaterAnalyticsTab() {
    const wu = this.device?.waterUsage;
    const tanks = this.device?.environmentAttributes?.irrigationTanks || [];
    const irrigTimes = this.device?.irrigationConfig?.irrigationTimes || [];
    const drainTimes = this.device?.irrigationConfig?.drainTimes || [];
    const readings = this.device?.drainConfig?.readings || [];
    const isCropSteering = !!this._sm.tabs.steering.draft.enabled;
    const csShots = isCropSteering ? this._computeCropSteeringCycle() : [];
    const hasPump = !!(
      this.device?.irrigationConfig?.irrigationPumpEntity ||
      this.device?.irrigationConfig?.drainPumpEntity
    );
    const hasTankSensors = tanks.some((t: any) => t.sensorEntity);

    const recentReadings = readings.slice(-30).reverse();
    const readingsWithVolumes = recentReadings.filter(
      (r: any) => r.feedVolumeMl && r.drainVolumeMl
    );
    const totalFeedMl = readingsWithVolumes.reduce(
      (s: number, r: any) => s + (r.feedVolumeMl || 0),
      0
    );
    const totalDrainMl = readingsWithVolumes.reduce(
      (s: number, r: any) => s + (r.drainVolumeMl || 0),
      0
    );
    const avgRunoff = totalFeedMl > 0 ? (totalDrainMl / totalFeedMl) * 100 : null;

    const tanksWithData = tanks.filter(
      (t: any) => t.fillLevel !== null && t.fillLevel !== undefined
    );
    const avgTankLevel =
      tanksWithData.length > 0
        ? tanksWithData.reduce((s: number, t: any) => s + (t.fillLevel ?? 0), 0) /
        tanksWithData.length
        : null;
    const warningTanks = tanks.filter((t: any) => t.isWarning);

    const totalIrrig = irrigTimes.length;
    const totalDrain = drainTimes.length;
    const irrigDuration = this.device?.irrigationConfig?.irrigationDuration ?? 0;
    const drainDuration = this.device?.irrigationConfig?.drainDuration ?? 0;

    const tanksWithHistory = tanks.filter(
      (t: any) => t.volumeLiters != null && t.waterHistory?.events?.length
    );
    const allTankEvents: TankWaterEvent[] = tanksWithHistory.flatMap(
      (t: any) => t.waterHistory!.events
    );
    const now = new Date();
    const allDaily7d = tanksWithHistory.flatMap((t: any) => t.waterHistory!.daily_7d ?? []);
    const todayKey = now.toISOString().slice(0, 10);
    const tankLitersToday = allDaily7d
      .filter((d: any) => d.date === todayKey)
      .reduce((s: number, d: any) => s + d.consumed, 0);
    const tankLiters7d = allDaily7d.reduce((s: number, d: any) => s + d.consumed, 0);
    const daysWithData = new Set(
      allDaily7d.filter((d: any) => d.consumed > 0).map((d: any) => d.date)
    ).size;
    const tankAvgPerDay = daysWithData > 0 ? tankLiters7d / daysWithData : 0;

    const bucket15Min = 15 * 60 * 1000;
    const bucketCount24h = 96;
    const chartEnd = Math.ceil(now.getTime() / bucket15Min) * bucket15Min;
    const chartStart = chartEnd - bucketCount24h * bucket15Min;
    const consumptionBuckets24h = Array.from({ length: bucketCount24h }, (_, i) => ({
      start: chartStart + i * bucket15Min,
      liters: 0,
    }));
    for (const ev of allTankEvents) {
      if ((ev as any).event_type !== 'consumption') continue;
      const ts = new Date((ev as any).timestamp).getTime();
      if (ts < chartStart || ts >= chartEnd) continue;
      const idx = Math.floor((ts - chartStart) / bucket15Min);
      if (idx >= 0 && idx < bucketCount24h) consumptionBuckets24h[idx].liters += (ev as any).liters;
    }
    const maxBucketLiters = Math.max(...consumptionBuckets24h.map((b) => b.liters), 0.01);
    const recentRefills = allTankEvents
      .filter((e: any) => e.event_type === 'refill')
      .slice(-10)
      .reverse();

    const kpiCard = (
      label: string,
      value: string,
      unit: string,
      color = 'rgba(255,255,255,0.7)',
      sub?: string
    ) => html`
      <div
        style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:4px;"
      >
        <div style="font-size:0.78rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;">
          ${label}
        </div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span style="font-size:1.6rem;font-weight:700;color:${color};">${value}</span>
          <span style="font-size:0.82rem;opacity:0.6;">${unit}</span>
        </div>
        ${sub ? html`<div style="font-size:0.75rem;opacity:0.5;">${sub}</div>` : nothing}
      </div>
    `;

    const lastCycle = this.device?.lastCycleTimestamp
      ? new Date(this.device.lastCycleTimestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      : null;
    const nextCycle = this.device?.nextScheduledCycle
      ? new Date(this.device.nextScheduledCycle).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      : null;
    const cyclesToday = this.device?.cyclesToday ?? 0;
    const volToday = this.device?.volumeDispensedToday ?? 0;

    return html`
      ${hasPump
        ? html`
            <div class="detail-card">
              <h3 style="margin-top:0;margin-bottom:16px;">Cycle Telemetry</h3>
              <div
                style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:0;"
              >
                ${kpiCard('Cycles today', String(cyclesToday), '', '#4fc3f7')}
                ${kpiCard(
          'Dispensed today',
          volToday > 0 ? volToday.toFixed(2) : '—',
          volToday > 0 ? 'L' : '',
          '#81c784'
        )}
                ${lastCycle
            ? kpiCard('Last cycle', lastCycle, '', 'rgba(255,255,255,0.7)')
            : kpiCard('Last cycle', '—', '', 'rgba(255,255,255,0.4)')}
                ${nextCycle
            ? kpiCard('Next cycle', nextCycle, '', '#ce93d8')
            : kpiCard('Next cycle', '—', '', 'rgba(255,255,255,0.4)')}
              </div>
            </div>
          `
        : nothing}
      ${hasPump
        ? html`
            <div class="detail-card">
              <h3 style="margin-top:0;margin-bottom:16px;">Today's Usage</h3>
              <div
                style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;"
              >
                ${wu?.litersToday != null
            ? kpiCard('Liters today', wu.litersToday.toFixed(1), 'L', '#4fc3f7')
            : kpiCard('Liters today', '—', '', 'rgba(255,255,255,0.4)')}
                ${wu?.litersPerPlantPerDay != null
            ? kpiCard('Per plant / day', wu.litersPerPlantPerDay.toFixed(2), 'L', '#81c784')
            : kpiCard('Per plant / day', '—', '', 'rgba(255,255,255,0.4)')}
                ${wu?.waterEfficiency != null
            ? kpiCard(
              'Water efficiency',
              (wu.waterEfficiency * 100).toFixed(0),
              '%',
              wu.waterEfficiency >= 0.85
                ? '#4caf50'
                : wu.waterEfficiency >= 0.65
                  ? '#FF9800'
                  : '#f44336',
              wu.waterEfficiency >= 0.85
                ? 'Excellent'
                : wu.waterEfficiency >= 0.65
                  ? 'Good'
                  : 'Review schedule'
            )
            : kpiCard('Water efficiency', '—', '', 'rgba(255,255,255,0.4)')}
                ${avgRunoff !== null
            ? kpiCard(
              'Avg runoff',
              avgRunoff.toFixed(1),
              '%',
              '#ce93d8',
              `from ${readingsWithVolumes.length} reading${readingsWithVolumes.length !== 1 ? 's' : ''}`
            )
            : kpiCard(
              'Avg runoff',
              '—',
              '',
              'rgba(255,255,255,0.4)',
              'Log volumes in Drain EC tab'
            )}
              </div>
            </div>
          `
        : nothing}
      ${tanks.length > 0
        ? html`
            <div class="detail-card">
              <div
                style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"
              >
                <h3 style="margin:0;">Tank Levels</h3>
                ${warningTanks.length > 0
            ? html`
                      <span
                        style="background:rgba(244,67,54,0.2);color:#f44336;border:1px solid rgba(244,67,54,0.4);border-radius:20px;padding:3px 10px;font-size:0.78rem;font-weight:600;"
                      >
                        ⚠ ${warningTanks.length} tank${warningTanks.length > 1 ? 's' : ''} low
                      </span>
                    `
            : avgTankLevel !== null
              ? html`
                        <span style="font-size:0.82rem;opacity:0.5;"
                          >Avg ${avgTankLevel.toFixed(0)}%</span
                        >
                      `
              : nothing}
              </div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${tanks.map((tank: any) => {
                const pct = tank.fillLevel ?? 0;
                const c = tank.isWarning
                  ? '#f44336'
                  : (tank.hoursRemaining ?? 999) < 24
                    ? '#FF9800'
                    : '#4caf50';
                return html`
                    <div>
                      <div
                        style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;"
                      >
                        <span style="font-weight:500;">${tank.name}</span>
                        <span style="color:${c};font-weight:600;"
                          >${tank.fillLevel !== null ? pct.toFixed(0) + '%' : '—'}</span
                        >
                      </div>
                      <div
                        style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;"
                      >
                        <div
                          style="height:100%;width:${Math.max(
                  0,
                  Math.min(100, pct)
                )}%;background:${c};border-radius:3px;transition:width 0.4s ease;"
                        ></div>
                      </div>
                    </div>
                  `;
              })}
              </div>
            </div>
          `
        : nothing}
      ${hasTankSensors && tanksWithHistory.length > 0
        ? html`
            <div class="detail-card">
              <div
                style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"
              >
                <h3 style="margin:0;">Tank-Derived Water Usage</h3>
                <span
                  style="font-size:0.78rem;opacity:0.5;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.25);border-radius:20px;padding:2px 10px;"
                  >inferred from tank level</span
                >
              </div>
              <div
                style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;"
              >
                ${kpiCard(
          'Consumed today',
          tankLitersToday > 0 ? tankLitersToday.toFixed(1) : '—',
          tankLitersToday > 0 ? 'L' : '',
          '#4fc3f7'
        )}
                ${kpiCard(
          'Last 7 days',
          tankLiters7d > 0 ? tankLiters7d.toFixed(1) : '—',
          tankLiters7d > 0 ? 'L' : '',
          '#81c784'
        )}
                ${kpiCard(
          'Avg per day',
          tankAvgPerDay > 0 ? tankAvgPerDay.toFixed(1) : '—',
          tankAvgPerDay > 0 ? 'L/day' : '',
          '#ce93d8'
        )}
              </div>
              <div style="margin-bottom:6px;">
                <div
                  style="font-size:0.78rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;"
                >
                  Consumption — last 24 hours (15 min buckets)
                </div>
                <div
                  style="display:flex;align-items:flex-end;gap:1px;height:60px;background:rgba(255,255,255,0.03);border-radius:6px;padding:6px 4px 0;"
                >
                  ${consumptionBuckets24h.map((b) => {
          const hp = (b.liters / maxBucketLiters) * 100;
          const label = new Date(b.start).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          return html`
                      <div
                        title="${label} — ${b.liters.toFixed(2)} L"
                        style="flex:1;height:${Math.max(2, hp)}%;background:${b.liters > 0
              ? '#4fc3f7'
              : 'rgba(255,255,255,0.06)'};border-radius:2px 2px 0 0;min-width:0;"
                      ></div>
                    `;
        })}
                </div>
                <div
                  style="display:flex;justify-content:space-between;font-size:0.68rem;opacity:0.45;margin-top:4px;padding:0 2px;"
                >
                  <span>24h ago</span><span>12h ago</span><span>now</span>
                </div>
              </div>
              ${recentRefills.length > 0
            ? html`
                    <div style="margin-top:16px;">
                      <div
                        style="font-size:0.78rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
                      >
                        Recent refills
                      </div>
                      <div style="display:flex;flex-direction:column;gap:4px;">
                        ${recentRefills.map(
              (ev: any) => html`
                            <div
                              style="display:flex;justify-content:space-between;align-items:center;background:rgba(129,199,132,0.08);border-radius:6px;padding:5px 10px;font-size:0.82rem;"
                            >
                              <span style="opacity:0.65;"
                                >${new Date(ev.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</span
                              >
                              <span style="color:#81c784;font-weight:600;"
                                >+${ev.liters.toFixed(1)} L</span
                              >
                            </div>
                          `
            )}
                      </div>
                    </div>
                  `
            : nothing}
            </div>
          `
        : nothing}
      ${isCropSteering
        ? html`
            <div class="detail-card">
              <h3 style="margin-top:0;margin-bottom:16px;">Schedule Summary</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <div
                    style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
                  >
                    Irrigation
                  </div>
                  ${csShots.length === 0
            ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">
                        No strategy configured
                      </p>`
            : html`
                        <div style="font-size:1.3rem;font-weight:700;color:#4fc3f7;">
                          ${csShots.length}
                          <span style="font-size:0.85rem;font-weight:400;opacity:0.7;"
                            >shots/day</span
                          >
                        </div>
                        <div style="font-size:0.75rem;opacity:0.5;margin-top:2px;">
                          Managed automatically ·
                          <a
                            href="#"
                            style="color:#4CAF50;"
                            @click=${(e: Event) => {
                e.preventDefault();
                this._sm = requestTabSwitch(this._sm, 'steering', this.device!);
              }}
                            >edit in Steering →</a
                          >
                        </div>
                        <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                          ${csShots.slice(0, 5).map((s) => html`
                            <div
                              style="display:flex;justify-content:space-between;background:rgba(79,195,247,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;"
                            >
                              <span style="font-weight:500;">${s.time.substring(0, 5)}</span>
                              <span style="opacity:0.5;">${s.duration}s</span>
                            </div>
                          `)}
                          ${csShots.length > 5
                ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                                +${csShots.length - 5} more
                              </div>`
                : nothing}
                        </div>
                      `}
                </div>
                <div>
                  <div
                    style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
                  >
                    Drain
                  </div>
                  ${totalDrain === 0
            ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">
                        No events scheduled
                      </p>`
            : html`
                        <div style="font-size:1.3rem;font-weight:700;color:#a5d6a7;">
                          ${totalDrain}
                          <span style="font-size:0.85rem;font-weight:400;opacity:0.7;"
                            >events/day</span
                          >
                        </div>
                        ${drainDuration
                ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">
                              ${drainDuration}s per event
                            </div>`
                : nothing}
                        <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                          ${drainTimes.slice(0, 5).map((t: IrrigationTime) => {
                  const time = t.time ?? t.start_time ?? '';
                  const dur = t.duration ?? t.duration_seconds ?? drainDuration;
                  return html`
                              <div
                                style="display:flex;justify-content:space-between;background:rgba(165,214,167,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;"
                              >
                                <span style="font-weight:500;">${time.substring(0, 5)}</span>
                                <span style="opacity:0.5;">${dur}s</span>
                              </div>
                            `;
                })}
                          ${totalDrain > 5
                ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                                +${totalDrain - 5} more
                              </div>`
                : nothing}
                        </div>
                      `}
                </div>
              </div>
            </div>
          `
        : totalIrrig > 0 || totalDrain > 0
          ? html`
              <div class="detail-card">
                <h3 style="margin-top:0;margin-bottom:16px;">Schedule Summary</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                  <div>
                    <div
                      style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
                    >
                      Irrigation
                    </div>
                    ${totalIrrig === 0
              ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">
                          No events scheduled
                        </p>`
              : html`
                          <div style="font-size:1.3rem;font-weight:700;color:#4fc3f7;">
                            ${totalIrrig}
                            <span style="font-size:0.85rem;font-weight:400;opacity:0.7;"
                              >events/day</span
                            >
                          </div>
                          ${irrigDuration
                  ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">
                                ${irrigDuration}s per event
                              </div>`
                  : nothing}
                          <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                            ${irrigTimes.slice(0, 5).map((t: IrrigationTime) => {
                    const time = t.time ?? t.start_time ?? '';
                    const dur = t.duration ?? t.duration_seconds ?? irrigDuration;
                    return html`
                                <div
                                  style="display:flex;justify-content:space-between;background:rgba(79,195,247,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;"
                                >
                                  <span style="font-weight:500;">${time.substring(0, 5)}</span>
                                  <span style="opacity:0.5;">${dur}s</span>
                                </div>
                              `;
                  })}
                            ${totalIrrig > 5
                  ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                                  +${totalIrrig - 5} more
                                </div>`
                  : nothing}
                          </div>
                        `}
                  </div>
                  <div>
                    <div
                      style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"
                    >
                      Drain
                    </div>
                    ${totalDrain === 0
              ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">
                          No events scheduled
                        </p>`
              : html`
                          <div style="font-size:1.3rem;font-weight:700;color:#a5d6a7;">
                            ${totalDrain}
                            <span style="font-size:0.85rem;font-weight:400;opacity:0.7;"
                              >events/day</span
                            >
                          </div>
                          ${drainDuration
                  ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">
                                ${drainDuration}s per event
                              </div>`
                  : nothing}
                          <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                            ${drainTimes.slice(0, 5).map((t: IrrigationTime) => {
                    const time = t.time ?? t.start_time ?? '';
                    const dur = t.duration ?? t.duration_seconds ?? drainDuration;
                    return html`
                                <div
                                  style="display:flex;justify-content:space-between;background:rgba(165,214,167,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;"
                                >
                                  <span style="font-weight:500;">${time.substring(0, 5)}</span>
                                  <span style="opacity:0.5;">${dur}s</span>
                                </div>
                              `;
                  })}
                            ${totalDrain > 5
                  ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">
                                  +${totalDrain - 5} more
                                </div>`
                  : nothing}
                          </div>
                        `}
                  </div>
                </div>
              </div>
            `
          : nothing}
      ${this._sm.tabs.water_analytics.stageAggregates &&
        Object.keys(this._sm.tabs.water_analytics.stageAggregates).length > 0
        ? html`
            <div class="detail-card">
              <h3 style="margin:0 0 14px;">Water Usage by Growth Stage</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${Object.entries(this._sm.tabs.water_analytics.stageAggregates)
            .sort(([, a], [, b]) => b - a)
            .map(
              ([stage, liters]) => html`
                      <div
                        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 14px;font-size:0.88rem;"
                      >
                        <span style="text-transform:capitalize;font-weight:500;">${stage}</span>
                        <span style="color:#4fc3f7;font-weight:600;">${liters.toFixed(1)} L</span>
                      </div>
                    `
            )}
              </div>
            </div>
          `
        : nothing}
      ${this._sm.tabs.schedules.draft.drainPumpEntity
        ? html`
            <div class="detail-card">
              <div
                style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"
              >
                <h3 style="margin:0;">Volume History</h3>
                <span style="font-size:0.8rem;opacity:0.5;">from drain EC readings</span>
              </div>
              ${readingsWithVolumes.length === 0
            ? html`
                    <p style="opacity:0.6;text-align:center;padding:20px 0;font-size:0.9rem;">
                      No volume data logged yet.<br />
                      <span style="font-size:0.8rem;opacity:0.7;"
                        >Log feed and drain volumes in the <strong>Drain EC</strong> tab.</span
                      >
                    </p>
                  `
            : html`
                    <div
                      style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 16px;font-size:0.88rem;"
                    >
                      <div style="text-align:center;">
                        <div style="opacity:0.5;font-size:0.75rem;">Total feed</div>
                        <div style="font-weight:700;color:#4fc3f7;">
                          ${(totalFeedMl / 1000).toFixed(1)} L
                        </div>
                      </div>
                      <div style="text-align:center;">
                        <div style="opacity:0.5;font-size:0.75rem;">Total drain</div>
                        <div style="font-weight:700;color:#a5d6a7;">
                          ${(totalDrainMl / 1000).toFixed(1)} L
                        </div>
                      </div>
                      <div style="text-align:center;">
                        <div style="opacity:0.5;font-size:0.75rem;">Avg runoff</div>
                        <div
                          style="font-weight:700;color:${avgRunoff !== null &&
                avgRunoff >= 15 &&
                avgRunoff <= 35
                ? '#4caf50'
                : '#FF9800'};"
                        >
                          ${avgRunoff !== null ? avgRunoff.toFixed(1) + '%' : '—'}
                        </div>
                      </div>
                    </div>
                    <div style="overflow-x:auto;">
                      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead>
                          <tr style="border-bottom:1px solid rgba(255,255,255,0.15);opacity:0.7;">
                            <th style="text-align:left;padding:5px 8px;font-weight:500;">Time</th>
                            <th style="text-align:right;padding:5px 8px;font-weight:500;">
                              Feed (mL)
                            </th>
                            <th style="text-align:right;padding:5px 8px;font-weight:500;">
                              Drain (mL)
                            </th>
                            <th style="text-align:right;padding:5px 8px;font-weight:500;">
                              Runoff
                            </th>
                            <th style="text-align:right;padding:5px 8px;font-weight:500;">Δ EC</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${readingsWithVolumes.map((r: any) => {
                  const runoff = r.feedVolumeMl
                    ? (r.drainVolumeMl! / r.feedVolumeMl!) * 100
                    : null;
                  const delta = r.drainEc - r.feedEc;
                  const runoffOk = runoff !== null && runoff >= 10 && runoff <= 40;
                  return html`
                              <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                                <td style="padding:5px 8px;opacity:0.65;">
                                  ${new Date(r.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                                </td>
                                <td style="text-align:right;padding:5px 8px;">${r.feedVolumeMl}</td>
                                <td style="text-align:right;padding:5px 8px;">
                                  ${r.drainVolumeMl}
                                </td>
                                <td
                                  style="text-align:right;padding:5px 8px;font-weight:600;color:${runoffOk
                      ? '#4caf50'
                      : '#FF9800'};"
                                >
                                  ${runoff !== null ? runoff.toFixed(1) + '%' : '—'}
                                </td>
                                <td style="text-align:right;padding:5px 8px;opacity:0.7;">
                                  ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                                </td>
                              </tr>
                            `;
                })}
                        </tbody>
                      </table>
                    </div>
                  `}
            </div>
          `
        : nothing}

      <div
        class="detail-card"
        style="border:1px dashed rgba(244,67,54,0.3);background:rgba(244,67,54,0.05);margin-top:20px;"
      >
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="flex:1;">
            <h3 style="margin:0;color:#f44336;border:none;padding:0;font-size:1.1rem;">
              Maintenance
            </h3>
            <p style="margin:4px 0 0 0;font-size:0.85rem;opacity:0.7;line-height:1.4;">
              Reset irrigation counters, today's water usage, and recent volume history for this
              growspace.
            </p>
          </div>
          <button
            class="md3-button tonal error"
            @click=${this._handleResetWaterTracking}
            style="white-space:nowrap;"
          >
            Reset All Data
          </button>
        </div>
      </div>
    `;
  }

  // ─── Drain EC tab ─────────────────────────────────────────────────────────

  private _renderDrainECTab() {
    const dc = this.device?.drainConfig;
    const readings: DrainECReading[] = dc?.readings || [];
    const recent = readings.slice(-20).reverse();
    const lastReading = recent[0];
    const lastDelta = lastReading ? lastReading.drainEc - lastReading.feedEc : null;
    const drainDraft = this._sm.tabs.drain_ec.draft;
    const isOverThreshold =
      lastDelta !== null && drainDraft.enabled && lastDelta > drainDraft.maxEcDelta;

    const statusColor = !drainDraft.enabled
      ? 'rgba(255,255,255,0.3)'
      : isOverThreshold
        ? '#f44336'
        : lastDelta !== null && lastDelta > drainDraft.maxEcDelta * 0.7
          ? '#FF9800'
          : '#4caf50';

    const statusText = !drainDraft.enabled
      ? 'Monitoring disabled'
      : lastDelta === null
        ? 'No readings yet'
        : isOverThreshold
          ? `Salt buildup alert — Δ${lastDelta.toFixed(2)} mS/cm above threshold`
          : `EC OK — Δ${lastDelta.toFixed(2)} mS/cm`;

    return html`
      <div class="detail-card" style="border-left:4px solid ${statusColor};padding:16px 20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div
            style="width:14px;height:14px;border-radius:50%;background:${statusColor};box-shadow:0 0 8px ${statusColor};flex-shrink:0;"
          ></div>
          <div>
            <div style="font-weight:600;font-size:1rem;">${statusText}</div>
            ${lastReading
        ? html`
                  <div style="font-size:0.8rem;opacity:0.6;margin-top:2px;">
                    Last reading: Feed ${lastReading.feedEc.toFixed(2)} → Drain
                    ${lastReading.drainEc.toFixed(2)} mS/cm at
                    ${new Date(lastReading.timestamp).toLocaleString()}
                  </div>
                `
        : nothing}
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div
          style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"
        >
          <h3 style="margin:0;">Monitoring Configuration</h3>
          ${this._sm.tabs.drain_ec.sub.kind === 'saving'
        ? html`<span style="font-size:0.8rem;opacity:0.6;">Saving…</span>`
        : nothing}
        </div>
        <p style="font-size:0.82rem;opacity:0.7;margin-bottom:20px;">
          Alert when drain EC exceeds feed EC by more than the max delta.
        </p>
        <div
          style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:16px;"
        >
          <span>Enable EC drain monitoring</span>
          <md3-switch
            .checked=${drainDraft.enabled}
            @change=${(e: Event) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { enabled: (e.target as HTMLInputElement).checked },
        });
      }}
          ></md3-switch>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <md3-number-input
            label="Max EC Delta (mS/cm)"
            .value=${drainDraft.maxEcDelta}
            step="0.1"
            min="0.1"
            ?disabled=${!drainDraft.enabled}
            @change=${(e: CustomEvent) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { maxEcDelta: parseFloat(e.detail) || 1.0 },
        });
      }}
          ></md3-number-input>
          <md3-number-input
            label="Target Runoff (%)"
            .value=${drainDraft.targetRunoffPercent}
            min="5"
            max="50"
            step="5"
            ?disabled=${!drainDraft.enabled}
            @change=${(e: CustomEvent) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { targetRunoffPercent: parseInt(e.detail) || 20 },
        });
      }}
          ></md3-number-input>
        </div>
      </div>

      <div class="detail-card">
        <h3 style="margin-top:0;">Log Drain Reading</h3>
        <p style="font-size:0.82rem;opacity:0.7;margin-bottom:20px;">
          Manually log feed EC and drain EC values measured with a handheld meter. Volumes are
          optional.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <md3-number-input
            label="Feed EC (mS/cm)"
            .value=${drainDraft.logFeedEc}
            step="0.1"
            min="0"
            @change=${(e: CustomEvent) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { logFeedEc: parseFloat(e.detail) || 0 },
        });
      }}
          ></md3-number-input>
          <md3-number-input
            label="Drain EC (mS/cm)"
            .value=${drainDraft.logDrainEc}
            step="0.1"
            min="0"
            @change=${(e: CustomEvent) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { logDrainEc: parseFloat(e.detail) || 0 },
        });
      }}
          ></md3-number-input>
          <md3-number-input
            label="Feed Volume (mL) — optional"
            .value=${drainDraft.logFeedVolume}
            step="100"
            min="0"
            @change=${(e: CustomEvent) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { logFeedVolume: parseInt(e.detail) || 0 },
        });
      }}
          ></md3-number-input>
          <md3-number-input
            label="Drain Volume (mL) — optional"
            .value=${drainDraft.logDrainVolume}
            step="100"
            min="0"
            @change=${(e: CustomEvent) => {
        this._sm = transition(this._sm, {
          type: 'UPDATE_DRAIN_EC_DRAFT',
          partial: { logDrainVolume: parseInt(e.detail) || 0 },
        });
      }}
          ></md3-number-input>
        </div>
        ${drainDraft.logFeedEc > 0 && drainDraft.logDrainEc > 0
        ? html`
              <div
                style="background:rgba(255,255,255,0.05);border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;gap:24px;align-items:center;font-size:0.9rem;"
              >
                <span
                  >EC Delta:
                  <strong
                    style="color:${drainDraft.logDrainEc - drainDraft.logFeedEc >
            drainDraft.maxEcDelta
            ? '#f44336'
            : '#4caf50'}"
                  >
                    Δ${(drainDraft.logDrainEc - drainDraft.logFeedEc).toFixed(2)} mS/cm
                  </strong></span
                >
                ${drainDraft.logFeedVolume > 0 && drainDraft.logDrainVolume > 0
            ? html`
                      <span
                        >Runoff:
                        <strong
                          >${((drainDraft.logDrainVolume / drainDraft.logFeedVolume) * 100).toFixed(
              1
            )}%</strong
                        ></span
                      >
                    `
            : nothing}
              </div>
            `
        : nothing}
        <button
          class="md3-button primary"
          style="background:#FF9800;"
          @click=${this._logDrainReadingNow}
          ?disabled=${this._sm.tabs.drain_ec.sub.kind === 'logging' ||
      drainDraft.logFeedEc <= 0 ||
      drainDraft.logDrainEc <= 0}
        >
          ${this._sm.tabs.drain_ec.sub.kind === 'logging' ? 'Logging…' : 'Log Reading'}
        </button>
      </div>

      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"
        >
          <h3 style="margin:0;">Recent Readings</h3>
          <span style="font-size:0.8rem;opacity:0.5;">${readings.length} total</span>
        </div>
        ${recent.length === 0
        ? html`
              <p style="opacity:0.6;text-align:center;padding:20px 0;">No readings logged yet.</p>
            `
        : html`
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                  <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.15);opacity:0.7;">
                      <th style="text-align:left;padding:6px 8px;font-weight:500;">Time</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Feed EC</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Drain EC</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Δ EC</th>
                      <th style="text-align:right;padding:6px 8px;font-weight:500;">Runoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recent.map((r: DrainECReading) => {
          const delta = r.drainEc - r.feedEc;
          const overThreshold = drainDraft.enabled && delta > drainDraft.maxEcDelta;
          const runoffPct =
            r.feedVolumeMl && r.drainVolumeMl
              ? ((r.drainVolumeMl / r.feedVolumeMl) * 100).toFixed(1) + '%'
              : '—';
          return html`
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                          <td style="padding:6px 8px;opacity:0.7;">
                            ${new Date(r.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
                          </td>
                          <td style="text-align:right;padding:6px 8px;">${r.feedEc.toFixed(2)}</td>
                          <td style="text-align:right;padding:6px 8px;">${r.drainEc.toFixed(2)}</td>
                          <td
                            style="text-align:right;padding:6px 8px;color:${overThreshold
              ? '#f44336'
              : delta > drainDraft.maxEcDelta * 0.7
                ? '#FF9800'
                : '#4caf50'};font-weight:500;"
                          >
                            ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                          </td>
                          <td style="text-align:right;padding:6px 8px;opacity:0.6;">
                            ${runoffPct}
                          </td>
                        </tr>
                      `;
        })}
                  </tbody>
                </table>
              </div>
            `}
      </div>
    `;
  }

  // ─── Overview tab (crop-steering diagnostics, read-only) ──────────────────
  //
  // Decomposed (ADR-0019): the Overview tab renders through
  // `<irrigation-overview-tab .vm=…>` driven by `createOverviewTabViewModel`.
  // All values still come from the growspace payload (device.steeringMetrics),
  // never hass.states. The former inline `_renderOverview*` helpers moved into
  // the Tab Component / Tab ViewModel.

  // ─── EC Targets tab (stub) ────────────────────────────────────────────────

  /** Capability Unlock Hint: a one-line locked-prerequisite note (never hidden). */
  private _renderUnlockHint(text: string) {
    return html`
      <div
        class="capability-unlock-hint"
        style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--secondary-text-color);margin-top:6px;"
      >
        <ha-svg-icon .path=${mdiLockOutline} style="width:16px;height:16px;"></ha-svg-icon>
        <span>${text}</span>
      </div>
    `;
  }

  /** Substrate & EC tab: profile, sizing mode, pore-EC band, modulation, feed-EC ranges. */
  private _renderSubstrateEcTab() {
    const strat = this.device?.irrigationStrategy;
    const draft = this._sm.tabs.substrate_ec.draft;
    const profile: SubstrateProfile = strat?.substrateProfile ?? {
      mediaType: 'coco',
      litersPerPot: 0,
    };
    const sizingMode = strat?.shotSizingMode ?? 'seconds';
    const volumeCapable = this.device?.volumeModeCapable ?? false;
    const hasPoreEcSensors = (this.device?.environmentAttributes?.poreEcSensors?.length ?? 0) > 0;

    // Deduced Volume Mode lock hint (ADR-0017): the server bool is the gate; we
    // only branch the hint text on liters-per-pot to name the missing prereq.
    const volumeLockHint =
      (profile.litersPerPot ?? 0) > 0
        ? 'Set a pump flow rate to enable Volume Mode'
        : 'Set liters per pot to enable Volume Mode';

    const mediaOptions: Array<{ id: SubstrateMediaType; label: string }> = [
      { id: 'coco', label: 'Coco' },
      { id: 'rockwool', label: 'Rockwool' },
      { id: 'soil', label: 'Soil' },
    ];

    return html`
      <!-- Substrate Profile -->
      <div class="detail-card">
        <h3 style="margin:0 0 12px;">Substrate Profile</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:0.85rem;">
            <span style="color:var(--secondary-text-color);">Media type</span>
            <select
              class="md3-input"
              data-field="substrate_media_type"
              .value=${profile.mediaType}
              @change=${(e: Event) =>
        this._persistProfile({
          mediaType: (e.target as HTMLSelectElement).value as SubstrateMediaType,
        })}
            >
              ${mediaOptions.map(
          (o) => html`<option value=${o.id} ?selected=${profile.mediaType === o.id}>
                  ${o.label}
                </option>`
        )}
            </select>
          </label>
          <md3-number-input
            data-field="substrate_liters_per_pot"
            label="Liters per pot"
            .value=${profile.litersPerPot ? String(profile.litersPerPot) : ''}
            @change=${(e: CustomEvent) =>
        this._persistProfile({ litersPerPot: parseFloat(e.detail) || 0 })}
          ></md3-number-input>
        </div>
      </div>

      <!-- Shot Sizing Mode -->
      <div class="detail-card">
        <h3 style="margin:0 0 8px;">Shot Sizing Mode</h3>
        <p style="font-size:0.8rem;opacity:0.7;margin:0 0 12px;">
          How P1/P2 shot sizes are expressed. Volume Mode sizes shots as a percent of
          substrate volume.
        </p>
        <div style="display:flex;gap:8px;">
          <button
            class="seg-btn ${sizingMode === 'seconds' ? 'active' : ''}"
            data-sizing-mode="seconds"
            @click=${() => sizingMode !== 'seconds' && this._persistStrategyNow({ shotSizingMode: 'seconds' })}
          >
            Seconds
          </button>
          <button
            class="seg-btn ${sizingMode === 'volume' ? 'active' : ''}"
            data-sizing-mode="volume"
            ?disabled=${!volumeCapable}
            @click=${() =>
        volumeCapable &&
        sizingMode !== 'volume' &&
        this._persistStrategyNow({ shotSizingMode: 'volume' })}
          >
            Volume
          </button>
        </div>
        ${!volumeCapable ? this._renderUnlockHint(volumeLockHint) : nothing}
      </div>

      <!-- Pore EC Target Band -->
      <div class="detail-card">
        <h3 style="margin:0 0 8px;">Pore EC Target Band</h3>
        <p style="font-size:0.8rem;opacity:0.7;margin:0 0 12px;">
          The substrate (pore) EC range EC Modulation steers toward — distinct from the
          per-stage feed-EC ranges below. Save with the footer button.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <md3-number-input
            data-field="pore_ec_target_min"
            label="Min pore EC (mS/cm)"
            .value=${draft.poreEcMin != null ? String(draft.poreEcMin) : ''}
            @change=${(e: CustomEvent) =>
        (this._sm = transition(this._sm, {
          type: 'UPDATE_PORE_EC_BAND',
          min: e.detail === '' ? null : parseFloat(e.detail),
          max: draft.poreEcMax,
        }))}
          ></md3-number-input>
          <md3-number-input
            data-field="pore_ec_target_max"
            label="Max pore EC (mS/cm)"
            .value=${draft.poreEcMax != null ? String(draft.poreEcMax) : ''}
            @change=${(e: CustomEvent) =>
        (this._sm = transition(this._sm, {
          type: 'UPDATE_PORE_EC_BAND',
          min: draft.poreEcMin,
          max: e.detail === '' ? null : parseFloat(e.detail),
        }))}
          ></md3-number-input>
        </div>
        ${draft.poreEcMin != null && draft.poreEcMax != null && draft.poreEcMin >= draft.poreEcMax
        ? html`<div
              style="font-size:0.78rem;color:var(--error-color,#ef5350);margin-top:6px;"
            >
              Min must be below max.
            </div>`
        : nothing}
      </div>

      <!-- EC Modulation -->
      <div class="detail-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h3 style="margin:0 0 4px;">EC Modulation</h3>
            <p style="font-size:0.8rem;opacity:0.7;margin:0;">
              Nudge feed EC toward the pore-EC band above.
            </p>
          </div>
          <md3-switch
            data-field="ec_modulation_enabled"
            .checked=${!!strat?.ecModulationEnabled}
            ?disabled=${!hasPoreEcSensors}
            @change=${(e: Event) =>
        hasPoreEcSensors &&
        this._persistStrategyNow({
          ecModulationEnabled: (e.target as HTMLInputElement).checked,
        })}
          ></md3-switch>
        </div>
        ${!hasPoreEcSensors
        ? this._renderUnlockHint('Add a pore EC sensor to enable EC Modulation')
        : nothing}
      </div>

      ${this._renderFeedEcRanges()}
    `;
  }

  /** Per-stage feed-EC target ranges, kept visually separated from the pore-EC band. */
  private _renderFeedEcRanges() {
    const stageLabels: Record<string, string> = {
      seedling: 'Seedling',
      veg: 'Veg',
      flower_early: 'Early Flower',
      flower_mid: 'Mid Flower',
      flower_late: 'Late Flower / Flush',
    };
    return html`
      <div class="detail-card" style="border-top:2px solid var(--divider-color,rgba(255,255,255,0.12));">
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <h3 style="margin:0;border:none;padding:0;">Feed EC Targets per Stage</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--secondary-text-color);margin:0 0 16px;">
          Set feed EC target ranges (min / max) per growth stage. Save with the footer button.
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th
                style="text-align:left;padding:6px 8px;font-size:0.8rem;color:var(--secondary-text-color);"
              >
                Stage
              </th>
              <th
                style="text-align:left;padding:6px 8px;font-size:0.8rem;color:var(--secondary-text-color);"
              >
                Min EC (mS/cm)
              </th>
              <th
                style="text-align:left;padding:6px 8px;font-size:0.8rem;color:var(--secondary-text-color);"
              >
                Max EC (mS/cm)
              </th>
            </tr>
          </thead>
          <tbody>
            ${this._sm.tabs.substrate_ec.draft.ecTargetRanges.map(
      (range, idx) => html`
                <tr
                  class="ec-target-row"
                  style="border-top:1px solid var(--divider-color,rgba(255,255,255,0.07));"
                >
                  <td style="padding:8px;">
                    <span class="ec-stage-label" style="font-weight:500;"
                      >${stageLabels[range.stage] ?? range.stage}</span
                    >
                  </td>
                  <td style="padding:8px;">
                    <input
                      class="md3-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      style="width:90px;"
                      .value=${String(range.minEc)}
                      @input=${(e: Event) => {
          const val = parseFloat((e.target as HTMLInputElement).value) || 0;
          this._sm = transition(this._sm, {
            type: 'UPDATE_EC_TARGETS_DRAFT',
            ranges: this._sm.tabs.substrate_ec.draft.ecTargetRanges.map((r, i) =>
              i === idx ? { ...r, minEc: val } : r
            ),
          });
        }}
                    />
                  </td>
                  <td style="padding:8px;">
                    <input
                      class="md3-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      style="width:90px;"
                      .value=${String(range.maxEc)}
                      @input=${(e: Event) => {
          const val = parseFloat((e.target as HTMLInputElement).value) || 0;
          this._sm = transition(this._sm, {
            type: 'UPDATE_EC_TARGETS_DRAFT',
            ranges: this._sm.tabs.substrate_ec.draft.ecTargetRanges.map((r, i) =>
              i === idx ? { ...r, maxEc: val } : r
            ),
          });
        }}
                    />
                  </td>
                </tr>
              `
    )}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── Tanks tab: Tab Intent → SM-event translation (ADR-0019) ───────────────
  // The Shell owns the translation; `<irrigation-tanks-tab>` only emits intents.

  /** `edit-tank-requested` → seed the draft from the live tank and open the editor. */
  private _onEditTankRequested(e: CustomEvent<{ index: number }>) {
    const index = e.detail.index;
    const tank = this._currentTanks()[index];
    if (!tank) return;
    const draft: TankDraft = {
      sensorEntity: tank.sensorEntity,
      name: tank.name,
      volumeLiters: tank.volumeLiters ?? null,
      warningLevel: tank.warningLevel,
    };
    this.dispatch({ type: 'EDIT_TANK', index, draft });
  }

  /** `tank-draft-changed` → merge the field change into the open draft. */
  private _onTankDraftChanged(e: CustomEvent<{ partial: Partial<TankDraft> }>) {
    this.dispatch({ type: 'UPDATE_TANK_DRAFT', partial: e.detail.partial });
  }

  /** `cancel-tank-edit` → close the editor. */
  private _onCancelTankEdit() {
    this.dispatch({ type: 'CANCEL_TANK_EDIT' });
  }

  /**
   * `save-tank-requested` → compose the full tank array (current tanks with the
   * draft merged at `index`, preserving live levels) and dispatch SaveRequested.
   * The payload is snapshotted into `applying.params` here so the effect never
   * reads the (possibly-cleared) sub-state (ADR-0015).
   */
  private _onSaveTankRequested() {
    const sub = this._sm.tabs.tanks.sub;
    if (sub.kind !== 'editing' || !this.device?.deviceId) return;
    const params: SaveTankParams = {
      growspaceId: this.device.deviceId,
      irrigationTanks: mergeTankDraft(this._currentTanks(), sub.index, sub.draft),
    };
    // Close the editor now; the payload is already snapshotted into `params` and
    // travels in `applying.status`, so the effect never reads the cleared
    // sub-state (ADR-0015). A failure surfaces as a toast with the editor closed.
    this.dispatch({ type: 'CANCEL_TANK_EDIT' });
    this.dispatch({ type: 'SaveRequested', action: 'save-tank', params });
  }

  /** Live tank list — the authoritative read source is the Irrigation slice. */
  private _currentTanks(): IrrigationTank[] {
    const id = this.device?.deviceId;
    return (id ? tankLevels$.get().get(id) : undefined) ?? [];
  }

  /** Effect: persist tank config through the Growspace slice. Reads only params. */
  private async _effectSaveTank(params: SaveTankParams) {
    await configureEnvironment({
      growspaceId: params.growspaceId,
      irrigationTanks: params.irrigationTanks,
    });
  }

  // ─── EC Ramp tab ──────────────────────────────────────────────────────────

  private _renderEcRampTab() {
    return html`
      <div class="tab-section">
        ${this._ecRampError
        ? html`<div class="error-bar">${this._ecRampError}</div>`
        : nothing}
        ${this._ecRampView === 'LIST'
        ? this._renderEcRampList()
        : this._renderEcRampEdit()}
      </div>
    `;
  }

  private _renderEcRampList() {
    const curves = this._ecRampCurvesController?.value ?? {};
    const curveList = Object.values(curves) as ECRampCurve[];

    if (curveList.length === 0) {
      return html`
        <div class="empty-state">
          <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
          <p>No EC ramp curves defined yet.</p>
          <p style="font-size: 0.9rem;">
            Create curves to schedule EC targets across your grow cycle.
          </p>
        </div>
        <div class="button-group" style="margin-top: 16px;">
          <button class="md3-button primary" @click=${this._ecRampStartNew}>
            <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
            New Curve
          </button>
        </div>
      `;
    }

    return html`
      <div class="curves-list">
        ${curveList.map(
      (curve) => html`
            <div class="curve-item" @click=${() => this._ecRampEditCurve(curve)}>
              <div class="curve-info">
                <div class="curve-name">${curve.name}</div>
                <div class="curve-details">
                  ${curve.points.length} point${curve.points.length !== 1 ? 's' : ''} • Day
                  ${Math.min(...curve.points.map((p) => p.day))}–${Math.max(
        ...curve.points.map((p) => p.day)
      )}
                </div>
              </div>
              <div class="curve-actions">
                <button
                  class="md3-button icon"
                  @click=${(e: Event) => {
          e.stopPropagation();
          this._ecRampEditCurve(curve);
        }}
                  title="Edit"
                >
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </button>
                <button
                  class="md3-button icon"
                  @click=${(e: Event) => {
          e.stopPropagation();
          this._ecRampDeleteCurve(curve.id).catch(() => undefined);
        }}
                  title="Delete"
                  style="color: var(--error-color);"
                >
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </button>
              </div>
            </div>
          `
    )}
      </div>
      <div class="button-group" style="margin-top: 16px;">
        <button class="md3-button primary" @click=${this._ecRampStartNew}>
          <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
          New Curve
        </button>
      </div>
    `;
  }

  private _renderEcRampEdit() {
    const curve = this._ecRampEditingCurve;
    if (!curve) return nothing;
    const points = curve.points ?? [];

    return html`
      <div class="preset-form">
        <div class="form-section">
          <h3>Curve Info</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <md3-text-input
              label="Curve Name"
              .value=${curve.name ?? ''}
              @change=${(e: CustomEvent) =>
        (this._ecRampEditingCurve = { ...curve, name: e.detail })}
              placeholder="e.g. Veg Ramp, Bloom Progression"
            ></md3-text-input>
            <md3-select
              label="Growth Stage"
              .value=${curve.stage ?? 'flower'}
              .options=${[
        { label: 'Seedling', value: 'seedling' },
        { label: 'Mother', value: 'mother' },
        { label: 'Vegetative', value: 'veg' },
        { label: 'Flower', value: 'flower' },
        { label: 'Cure', value: 'cure' },
      ]}
              @change=${(e: CustomEvent) =>
        (this._ecRampEditingCurve = { ...curve, stage: e.detail })}
            ></md3-select>
          </div>
        </div>

        <div class="form-section">
          <div class="points-header">
            <h3>Ramp Points</h3>
            <button class="md3-button text" @click=${this._ecRampAddPoint}>
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              Add Point
            </button>
          </div>
          <div class="points-list">
            ${points.map(
          (point: ECRampPoint, index: number) => html`
                <div class="point-row">
                  <md3-number-input
                    label="Day"
                    .value=${point.day}
                    @change=${(e: CustomEvent) =>
              this._ecRampUpdatePoint(index, { day: parseInt(e.detail) || 0 })}
                    min="0"
                  ></md3-number-input>
                  <md3-number-input
                    label="Target EC (mS/cm)"
                    .value=${point.target_ec}
                    @change=${(e: CustomEvent) =>
              this._ecRampUpdatePoint(index, {
                target_ec: parseFloat(e.detail) || 0,
              })}
                    min="0"
                    step="0.1"
                  ></md3-number-input>
                  <button
                    class="md3-button icon"
                    @click=${() => this._ecRampRemovePoint(index)}
                    style="color: var(--error-color);"
                    ?disabled=${points.length <= 1}
                  >
                    <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                  </button>
                </div>
              `
        )}
          </div>
        </div>
      </div>

      <div class="button-group" style="margin-top: 16px;">
        <button
          class="md3-button tonal"
          @click=${() => {
        this._ecRampView = 'LIST';
        this._ecRampEditingCurve = null;
        this._ecRampError = null;
      }}
        >
          <ha-svg-icon .path=${mdiArrowLeft} style="margin-right: 8px;"></ha-svg-icon>
          Back
        </button>
        <button class="md3-button primary" @click=${this._ecRampSaveCurve}>
          <ha-svg-icon .path=${mdiContentSave} style="margin-right: 8px;"></ha-svg-icon>
          Save Curve
        </button>
      </div>
    `;
  }

  private _ecRampStartNew() {
    this._ecRampEditingCurve = {
      name: '',
      stage: 'flower',
      points: [{ day: 1, target_ec: 1.0 }],
    };
    this._ecRampView = 'EDIT';
    this._ecRampError = null;
  }

  private _ecRampEditCurve(curve: ECRampCurve) {
    this._ecRampEditingCurve = JSON.parse(JSON.stringify(curve));
    this._ecRampView = 'EDIT';
    this._ecRampError = null;
  }

  private async _ecRampDeleteCurve(curveId: string) {
    if (!confirm('Are you sure you want to delete this EC ramp curve?')) return;
    try {
      await this.store.actions.library.removeECRampCurve(curveId);
    } catch (err: unknown) {
      this._ecRampError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  private _ecRampAddPoint() {
    const curve = this._ecRampEditingCurve;
    if (!curve) return;
    const points = [...(curve.points ?? [])];
    const lastDay = points.length > 0 ? points[points.length - 1].day : 0;
    const lastEc = points.length > 0 ? points[points.length - 1].target_ec : 1.0;
    this._ecRampEditingCurve = {
      ...curve,
      points: [...points, { day: lastDay + 7, target_ec: lastEc + 0.2 }],
    };
  }

  private _ecRampRemovePoint(index: number) {
    const curve = this._ecRampEditingCurve;
    if (!curve) return;
    const points = [...(curve.points ?? [])];
    points.splice(index, 1);
    this._ecRampEditingCurve = { ...curve, points };
  }

  private _ecRampUpdatePoint(index: number, updates: Partial<ECRampPoint>) {
    const curve = this._ecRampEditingCurve;
    if (!curve) return;
    const points = [...(curve.points ?? [])];
    points[index] = { ...points[index], ...updates };
    this._ecRampEditingCurve = { ...curve, points };
  }

  private async _ecRampSaveCurve() {
    const curve = this._ecRampEditingCurve;
    if (!curve?.name?.trim()) {
      this._ecRampError = 'Curve name is required';
      return;
    }
    const points = (curve.points ?? []).filter((p) => p.day >= 0 && p.target_ec > 0);
    if (points.length === 0) {
      this._ecRampError = 'At least one valid EC point is required';
      return;
    }
    try {
      await this.store.actions.library.saveECRampCurve({
        curve_id: curve.id,
        name: curve.name.trim(),
        stage: curve.stage ?? 'flower',
        points: [...points].sort((a, b) => a.day - b.day),
      });
      this._ecRampView = 'LIST';
      this._ecRampEditingCurve = null;
      this._ecRampError = null;
    } catch (err: unknown) {
      this._ecRampError = err instanceof Error ? err.message : 'Unknown error';
    }
  }
}
