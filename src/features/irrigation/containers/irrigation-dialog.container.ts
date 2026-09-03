import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { PollingController } from '../../../features/shared/controllers/polling.controller';
import { hassContext, storeContext } from '../../../context';
import {
  mdiWater,
  mdiAlert,
  mdiCalendarClock,
  mdiLeaf,
  mdiCog,
  mdiChartBar,
  mdiArrowDownCircle,
  mdiBullseyeArrow,
  mdiTrendingUp,
  mdiCompassOutline,
  mdiBookmarkMultipleOutline,
} from '@mdi/js';
import type { ECRampCurve, ECRampPoint, CropSteeringHistory } from '../../../schemas/api-schema';
import { IrrigationStrategy, GrowspaceDevice } from '../../../types';
import {
  createInitialSM,
  transition,
  requestTabSwitch,
  discardAndSwitch,
  type DialogSM,
  type TankDraft,
  type EcRampCurveDraft,
  type DrainEcDraft,
  type ConfigDraft,
  type Phase,
} from '../../../dialogs/irrigation-dialog-sm';
import {
  MutationRunController,
  type MutationRunEvent,
} from '../../../dialogs/mutation-run-controller';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import {
  ecRampCurves$,
  fetchECRampCurves,
  saveECRampCurve as sliceSaveECRampCurve,
  removeECRampCurve as sliceRemoveECRampCurve,
} from '../../../slices/nutrient';
import {
  cropSteeringHistory$,
  irrigationConfigs$,
  tankLevels$,
  addIrrigationTime,
  removeIrrigationTime,
  addDrainTime,
  removeDrainTime,
  saveIrrigationSettings,
  setSteeringPhase,
  updateIrrigationStrategy,
  runIrrigationCycle,
  configureDrainMonitoring,
  setEcTargetRanges,
  getIrrigationAnalytics,
  logDrainReading,
  applySteeringMode,
  fetchCropSteeringHistory,
  applyIrrigationRecipe,
  saveIrrigationRecipe,
  irrigationRecipes$,
  assignIrrigationProgram,
  setProgramAutoAdvance,
  irrigationPrograms$,
} from '../../../slices/irrigation';
import { configureEnvironment, resetWaterTracking } from '../../../slices/growspace';
import type {
  IrrigationConfig,
  SteeringMode,
  SubstrateProfile,
  ShotSizingMode,
  ECTargetRange,
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
import {
  createDialogCapabilities,
  type DialogCapabilities,
} from '../viewmodels/dialog-capabilities';
import {
  createOverviewTabViewModel,
  deriveShotSuppression,
  type OverviewTabViewModel,
} from '../viewmodels/overview-tab.viewmodel';
import { createShellViewModel, type ShellViewModel } from '../viewmodels/shell.viewmodel';
// Decomposed Tanks tab (ADR-0019): the first *draft* tab adapter.
import {
  createTanksTabViewModel,
  mergeTankDraft,
  type TanksTabViewModel,
} from '../viewmodels/tanks-tab.viewmodel';
// Decomposed EC Ramp tab (ADR-0019): curves owned by the Nutrient slice (ADR-0005).
import {
  createEcRampTabViewModel,
  composeEcRampSave,
  type EcRampTabViewModel,
} from '../viewmodels/ec-ramp-tab.viewmodel';
// Decomposed Schedules tab (ADR-0019): the largest tab adapter ($sm-first, no $caps).
import {
  createSchedulesTabViewModel,
  type SchedulesTabViewModel,
} from '../viewmodels/schedules-tab.viewmodel';
// Decomposed Drain EC tab (ADR-0019): $sm-first, mixed source (readings from
// `device.drainConfig`). Config persists via the global `save-all`; logging stays
// an imperative host method routed through a Tab Intent.
import {
  createDrainEcTabViewModel,
  type DrainEcTabViewModel,
} from '../viewmodels/drain-ec-tab.viewmodel';
// Decomposed Config tab (ADR-0019): $sm-first, mixed source (pump-entity options
// + `hasPump` mirrored from the host). Persists via the global `save-all`.
import {
  createConfigTabViewModel,
  type ConfigTabViewModel,
  type PumpEntityOptionVM,
} from '../viewmodels/config-tab.viewmodel';
// Decomposed Water Analytics tab (ADR-0019): read-mostly, $sm-first. The crop-
// steering shot summary derives from the PURE crop-steering-model helper (not the
// host method); `stageAggregates` is fetched by the host and passed through the VM.
import {
  createWaterAnalyticsTabViewModel,
  type WaterAnalyticsTabViewModel,
} from '../viewmodels/water-analytics-tab.viewmodel';
// Decomposed Substrate & EC tab (ADR-0019 + ADR-0017): the canonical `$caps`
// consumer, with MIXED PERSISTENCE — capability-affecting fields (sizing mode,
// profile, EC modulation) persist immediately via _persistStrategyNow/_persistProfile;
// the pore-EC band + per-stage ranges buffer in the SM draft and save via save-all.
import {
  createSubstrateEcTabViewModel,
  type SubstrateEcTabViewModel,
} from '../viewmodels/substrate-ec-tab.viewmodel';
// Decomposed Steering tab (ADR-0019 + ADR-0012 + ADR-0014 + ADR-0017): the hardest
// fan-out slice — `$caps` consumer (cross-tab sizing-mode read), two confirm flows,
// and the only tab writing BOTH the steering draft and the config draft.
import {
  createSteeringTabViewModel,
  type SteeringTabViewModel,
} from '../viewmodels/steering-tab.viewmodel';
// Decomposed Recipe tab (ADR-0019 + ADR-0045): reads the GLOBAL Irrigation Recipe
// library from the slice atom rather than the device, so an optimistic save shows
// up before the next sync. No `$caps` — its only capability question is which half
// the growspace runs, which is the strategy's own `enabled` flag.
import {
  createRecipesTabViewModel,
  type RecipesTabViewModel,
} from '../viewmodels/recipes-tab.viewmodel';
import type { IrrigationRecipeKind } from '../../../slices/irrigation/schema';
// Decomposed Program tab (ADR-0019 + ADR-0045): reads both global libraries from
// the slice atoms plus the device, because the payload's `program` block answers
// about *now* while "what does the plan hold next" is a question only the
// library can answer.
import {
  createProgramTabViewModel,
  type ProgramTabViewModel,
} from '../viewmodels/program-tab.viewmodel';
import { atom, computed, type ReadableAtom } from 'nanostores';
import '../components/irrigation-overview-tab';
import '../components/irrigation-tanks-tab';
import '../components/irrigation-ec-ramp-tab';
import '../components/irrigation-schedules-tab';
import '../components/irrigation-drain-ec-tab';
import '../components/irrigation-config-tab';
import '../components/irrigation-water-analytics-tab';
import '../components/irrigation-substrate-ec-tab';
import '../components/irrigation-steering-tab';
import '../components/irrigation-recipes-tab';
import '../components/irrigation-program-tab';

type TabId =
  | 'overview'
  | 'schedules'
  | 'steering'
  | 'config'
  | 'tanks'
  | 'water_analytics'
  | 'drain_ec'
  | 'substrate_ec'
  | 'ec_ramp'
  | 'recipes'
  | 'program';

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
  pumpFlowRateMlPerSec?: number;
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

/** Recipe save payload — the name typed on the tab plus the half being captured. */
interface SaveRecipeParams {
  name: string;
  kind: IrrigationRecipeKind;
}

/** Program assign payload. `null` unbinds; binding writes no setpoint. */
interface AssignProgramParams {
  programId: string | null;
}

/** EC Ramp save payload — composed by `composeEcRampSave`, carried in `applying.status`. */
interface EcRampSaveParams {
  curve_id?: string;
  name: string;
  stage: string;
  points: ECRampPoint[];
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

  // ─── EC Ramp tab (ADR-0019: view/draft/error live in the SM, not here) ───
  // Curves are owned by the Nutrient slice (ADR-0005); the VM reads `ecRampCurves$`
  // and the tab's StoreController re-renders on fetch. Only the lazy-fetch latch
  // remains here.
  private _ecRampFetched = false;

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
  /** EC Ramp tab ViewModel — reads the Nutrient slice's `ecRampCurves$` (ADR-0005). */
  private _ecRampVm: ReadableAtom<EcRampTabViewModel> = createEcRampTabViewModel(
    this._smAtom,
    ecRampCurves$
  );
  private _ecRampVmController = new StoreController(this, this._ecRampVm);
  /**
   * Schedules tab ViewModel — the largest adapter. `$sm`-first (it carries both
   * `tabs.schedules` and the cross-tab `tabs.steering.draft`); the device atom
   * supplies the schedule rows + chart + phase config, and `cropSteeringHistory$`
   * the legend's sensor-presence flags. No `$caps`.
   */
  private _schedulesVm: ReadableAtom<SchedulesTabViewModel> = createSchedulesTabViewModel(
    this._smAtom,
    this._deviceAtom,
    cropSteeringHistory$
  );
  private _schedulesVmController = new StoreController(this, this._schedulesVm);
  /**
   * Drain EC tab ViewModel — `$sm`-first (it carries `tabs.drain_ec`); the device
   * atom supplies the logged `drainConfig.readings`. No `$caps`. Config persists
   * via the global `save-all`; logging routes through the `_logDrainReadingNow`
   * host method (ADR-0015 effects are the drain *config* path, not logging).
   */
  private _drainEcVm: ReadableAtom<DrainEcTabViewModel> = createDrainEcTabViewModel(
    this._smAtom,
    this._deviceAtom
  );
  private _drainEcVmController = new StoreController(this, this._drainEcVm);
  /**
   * Water Analytics tab ViewModel — read-mostly, `$sm`-first (it carries the
   * cross-tab `tabs.steering.draft` for the crop-steering shot summary and
   * `tabs.water_analytics.stageAggregates`); the device atom supplies water
   * usage, tanks, schedule rows, and drain readings. No `$caps`. The two
   * interactions (open-steering link, reset-all) route through Tab Intents.
   */
  private _waterAnalyticsVm: ReadableAtom<WaterAnalyticsTabViewModel> =
    createWaterAnalyticsTabViewModel(this._smAtom, this._deviceAtom);
  private _waterAnalyticsVmController = new StoreController(this, this._waterAnalyticsVm);

  // ─── Config tab (ADR-0019: draft lives in the SM, not here) ──────────────
  // switch/input_boolean entity options for the two pump selects — a hass-derived
  // view input mirrored into an atom (the `_tankSensorOptions` pattern) so the
  // Config Tab ViewModel stays the single source and the component takes only `.vm`.
  private _pumpEntityOptions = atom<PumpEntityOptionVM[]>([]);
  // `hasPump` mirrored from the host's `_hasPump` getter (reads the live
  // `irrigationConfigs$` slice) so the in-tab panel gate stays byte-identical.
  private _hasPumpAtom = atom<boolean>(false);
  /** Config tab ViewModel — `$sm`-first, mixed source (pump options + hasPump). No `$caps`. */
  // Derived from the shared caps atom (single source) so the Config tab can
  // relabel the Pump Configuration section in tank-based mode without re-deriving.
  private _irrigationMethod = computed([this._caps], (caps) => caps.irrigationMethod);
  private _configVm: ReadableAtom<ConfigTabViewModel> = createConfigTabViewModel(
    this._smAtom,
    this._hasPumpAtom,
    this._pumpEntityOptions,
    this._irrigationMethod
  );
  private _configVmController = new StoreController(this, this._configVm);
  /** Substrate & EC tab ViewModel — `$sm`-first, consumes `$caps` (ADR-0017/0019). */
  private _substrateEcVm: ReadableAtom<SubstrateEcTabViewModel> = createSubstrateEcTabViewModel(
    this._smAtom,
    this._caps,
    this._deviceAtom
  );
  private _substrateEcVmController = new StoreController(this, this._substrateEcVm);
  /** Steering tab ViewModel — `$sm`-first, consumes `$caps` (cross-tab sizing mode, ADR-0019). */
  private _steeringVm: ReadableAtom<SteeringTabViewModel> = createSteeringTabViewModel(
    this._smAtom,
    this._caps,
    this._deviceAtom
  );
  private _steeringVmController = new StoreController(this, this._steeringVm);
  /** Recipe tab ViewModel — `$sm`-first, plus the global recipe library and the device. */
  private _recipesVm: ReadableAtom<RecipesTabViewModel> = createRecipesTabViewModel(
    this._smAtom,
    irrigationRecipes$,
    this._deviceAtom
  );
  private _recipesVmController = new StoreController(this, this._recipesVm);
  /** Program tab ViewModel — `$sm`-first, both global libraries, and the device. */
  private _programVm: ReadableAtom<ProgramTabViewModel> = createProgramTabViewModel(
    this._smAtom,
    irrigationPrograms$,
    irrigationRecipes$,
    this._deviceAtom
  );
  private _programVmController = new StoreController(this, this._programVm);

  // ─── Crop Steering History (Schedules tab) ────────────────────────────
  private _cropSteeringHistoryFetched = false;
  private _cropSteeringPoller?: PollingController;
  private _cropSteeringHistoryController?: StoreController<Map<string, CropSteeringHistory>>;

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
    'set-steering-phase': (params) => this._effectSetSteeringPhase(params as { phase: Phase }),
    'run-now': () => this._effectRunNow(),
    'edit-irrigation-time': (params) => this._effectEditIrrigationTime(params as EditTimeParams),
    'edit-drain-time': (params) => this._effectEditDrainTime(params as EditTimeParams),
    'save-tank': (params) => this._effectSaveTank(params as SaveTankParams),
    'save-ec-ramp-curve': (params) => this._effectSaveEcRampCurve(params as EcRampSaveParams),
    'remove-ec-ramp-curve': (params) =>
      this._effectRemoveEcRampCurve(params as { curveId: string }),
    'save-recipe': (params) => this._effectSaveRecipe(params as SaveRecipeParams),
    'apply-recipe': (params) => this._effectApplyRecipe(params as { recipeId: string }),
    'assign-program': (params) => this._effectAssignProgram(params as AssignProgramParams),
    'set-program-auto-advance': (params) =>
      this._effectSetProgramAutoAdvance(params as { enabled: boolean }),
  };

  static styles = [
    dialogStyles,
    css`
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
        font-size: var(--font-size-xs);
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
        font-size: var(--font-size-sm);
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
        color: var(--gm-info-color);
      }

      .v1-nav-item.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 4px;
        bottom: 4px;
        width: 3px;
        background: var(--gm-info-color);
        border-radius: 0 2px 2px 0;
      }

      .nav-badge {
        margin-left: auto;
        background: rgba(33, 150, 243, 0.2);
        color: var(--gm-info-color);
        font-size: var(--font-size-supporting);
        font-weight: 700;
        padding: 1px 6px;
        border-radius: var(--border-radius-md, 12px);
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
        font-size: var(--font-size-xs);
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
        border-radius: var(--border-radius-full, 9999px);
        font-size: 12px;
        font-weight: 500;
      }

      .content-section-title {
        margin-left: auto;
        font-size: var(--font-size-sm);
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

      /* ── Toast ── */
      .toast-notification {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(50, 50, 50, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-sm, 8px);
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

      /* ── Setup hints ── */
      .setup-hints {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: var(--border-radius-md, 12px);
      }
      .setup-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--font-size-supporting);
        color: rgba(255, 255, 255, 0.55);
        line-height: 1.4;
      }
      .setup-hint .hint-icon {
        flex-shrink: 0;
        font-size: 1rem;
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
    const hasSchedules =
      ((this._liveConfig ?? this.device?.irrigationConfig)?.irrigationTimes?.length ?? 0) > 0;
    if (hasPump && hasSchedules && hasEcSensorsForRamp) tabs.push('ec_ramp');

    // Recipes: pump-gated, and nothing narrower. Both halves a recipe can carry
    // are pump-driven — shot sizes and schedule times alike — so without one
    // there is nothing to capture and nothing an apply could write.
    if (hasPump) tabs.push('recipes');

    // Program: pump-gated for the same reason. A plan can only ever hand the
    // growspace a recipe, and a recipe without a pump has nothing to write to.
    if (hasPump) tabs.push('program');

    return tabs;
  }

  private get _setupHints(): Array<{ icon: string; text: string }> {
    const hints: Array<{ icon: string; text: string }> = [];
    const visible = this._visibleTabs;
    const method = this._caps.get().irrigationMethod;

    // Tank-based (gravity/manual, no pump) is a valid mode, not a half-configured
    // pump setup. Acknowledge it positively and skip the "configure a pump" nags —
    // a pump is optional here (it only adds automated actuation). Crop steering
    // still needs an actuator, so its tab stays pump-gated (ADR-0016) and we frame
    // the pump as the path to *enabling* it rather than as a missing requirement.
    if (method === 'tank') {
      hints.push({
        icon: '🪣',
        text: 'Tank-based irrigation detected (gravity or manual). Tank levels and water usage are tracked here; add an irrigation pump entity in Irrigation Settings to also enable automated schedules and Crop Steering.',
      });
    }

    if (method !== 'tank' && !visible.includes('schedules')) {
      hints.push({
        icon: '🚰',
        text: 'Configure an irrigation or drain pump in Irrigation Settings to enable Schedules, manual run controls, and behaviour settings.',
      });
    }
    if (!visible.includes('steering')) {
      const hasPump = this._hasPump;
      if (!hasPump) {
        if (method !== 'tank') {
          hints.push({
            icon: '🚰',
            text: 'Configure an irrigation or drain pump in Irrigation Settings to enable Crop Steering features.',
          });
        }
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
    // Tanks Tab ViewModel's edit picker stays current without the component
    // reading hass.
    if (this.hass && (changedProps.has('hass') || changedProps.has('device'))) {
      this._tankSensorOptions.set(
        this._getEntities(['sensor', 'input_number']).map((s) => s.entity_id)
      );
    }
    // Mirror the switch/input_boolean pump-entity options into their atom so the
    // Config Tab ViewModel stays the single source and the component never reads
    // hass. `hass` is a plain (non-reactive) field, so it never appears in
    // `changedProps`; recompute every update and set only when the option list
    // actually changed (by signature), so clearing `hass` clears the options —
    // matching the former inline `_renderEntitySelect`, which re-read hass each
    // render and showed only "None" when hass was absent.
    const pumpOpts = this._getEntities(['switch', 'input_boolean']).map((s) => ({
      value: s.entity_id,
      label: `${s.attributes.friendly_name || s.entity_id} (${s.entity_id})`,
    }));
    const prevPumpOpts = this._pumpEntityOptions.get();
    const pumpSig = pumpOpts.map((o) => o.value).join(' ');
    const prevPumpSig = prevPumpOpts.map((o) => o.value).join(' ');
    if (pumpSig !== prevPumpSig) {
      this._pumpEntityOptions.set(pumpOpts);
    }
    // `_hasPump` reads the live config slice; mirror it every update so the Config
    // tab's panel gate (Behaviour / Manual Override) tracks post-save changes.
    if (this._hasPumpAtom.get() !== this._hasPump) {
      this._hasPumpAtom.set(this._hasPump);
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
    if (!this._visibleTabs.includes(this._sm.activeTab)) {
      this._sm = transition(this._sm, { type: 'SWITCH_TAB', tab: 'config' });
    }

    // EC Ramp: lazy-fetch the curves on first visit. The view/draft reset on tab
    // change is owned by the SM's SWITCH_TAB transition (ADR-0019); the VM reads
    // `ecRampCurves$` directly so no StoreController is needed here.
    if (changedProps.has('_sm')) {
      const prev = changedProps.get('_sm') as DialogSM | undefined;
      const prevTab = prev?.activeTab;
      const nextTab = this._sm.activeTab;
      if (nextTab === 'ec_ramp' && prevTab !== 'ec_ramp') {
        if (!this._ecRampFetched && this.store) {
          this._ecRampFetched = true;
          fetchECRampCurves({ cache: true }).catch(() => undefined);
        }
      }

      // Crop Steering History: lazy fetch + polling when Schedules tab is active.
      if (nextTab === 'schedules' && prevTab !== 'schedules') {
        if (!this._cropSteeringHistoryFetched && this.device?.deviceId) {
          this._cropSteeringHistoryFetched = true;
          if (!this._cropSteeringHistoryController) {
            this._cropSteeringHistoryController = new StoreController(this, cropSteeringHistory$);
          }
          fetchCropSteeringHistory(this.device.deviceId).catch(() => undefined);
        }
        if (!this._cropSteeringPoller && this.device?.deviceId) {
          this._cropSteeringPoller = new PollingController(
            this,
            () => {
              const deviceId = this.device?.deviceId;
              return deviceId
                ? fetchCropSteeringHistory(deviceId).catch(() => undefined)
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
    const params: SaveSettingsParams = {
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
    };

    // Older integration releases expose this value in the growspace payload but
    // reject it in set_irrigation_settings. Only send the newer service field
    // when the user actually changes it, so unrelated saves remain compatible.
    const persistedPumpFlowRate = this.device?.irrigationConfig?.pumpFlowRateMlPerSec ?? 0;
    if (cfg.pumpFlowRateMlPerSec !== persistedPumpFlowRate) {
      params.pumpFlowRateMlPerSec = cfg.pumpFlowRateMlPerSec;
    }

    return params;
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
    // Strategy writes, drain monitoring + EC ranges all go through the Irrigation
    // slice mutators (ADR-0001 / CONTEXT data-flow layering).
    await updateIrrigationStrategy(id, params.strategy);
    await configureDrainMonitoring(id, params.drainConfig);
    await setEcTargetRanges(id, params.ecTargetRanges);
  }

  private async _effectSaveSettings(params: SaveSettingsParams) {
    if (!this.device?.deviceId) return;
    await saveIrrigationSettings(this.device.deviceId, params);
  }

  private async _effectSetSteeringPhase(params: { phase: Phase }) {
    if (!this.device?.deviceId) return;
    await setSteeringPhase(this.device.deviceId, params.phase);
  }

  private async _fetchStageAnalytics() {
    if (!this.device?.deviceId) return;
    const result = await getIrrigationAnalytics(this.device.deviceId);
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
   *
   * While a shot is held for a reason other than the cooldown the window's
   * bounds are still cooldown-derived and no shot will fire at them, so the
   * range is replaced by the hold reason rather than rendered as a countdown
   * (growspace_manager ADR-0031).
   */
  private _renderFooterNext() {
    if (this.device?.irrigationStrategy?.enabled) {
      const suppression = deriveShotSuppression(this.device?.steeringMetrics?.shotComposition);
      if (suppression?.held) return 'Held';

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

  // ─── Substrate & EC tab: Tab Intent → write-path routing (ADR-0019 + ADR-0017)
  // The Shell owns the split: capability-affecting fields persist IMMEDIATELY via
  // _persistProfile/_persistStrategyNow (not buffered, not save-all); the pore-EC
  // band + per-stage ranges buffer into the SM draft and save via the footer.

  /** Immediate-persist: substrate profile (media type / liters per pot). */
  private _onSubstrateProfileChanged(e: CustomEvent<{ partial: Partial<SubstrateProfile> }>) {
    this._persistProfile(e.detail.partial);
  }

  /** Immediate-persist: shot sizing mode. */
  private _onSubstrateSizingModeChanged(e: CustomEvent<{ mode: ShotSizingMode }>) {
    this._persistStrategyNow({ shotSizingMode: e.detail.mode });
  }

  /** Immediate-persist: EC modulation toggle. */
  private _onSubstrateModulationToggled(e: CustomEvent<{ enabled: boolean }>) {
    this._persistStrategyNow({ ecModulationEnabled: e.detail.enabled });
  }

  /** Buffered: pore-EC target band → SM draft, saved via the footer save-all. */
  private _onSubstratePoreBandChanged(e: CustomEvent<{ min: number | null; max: number | null }>) {
    this.dispatch({ type: 'UPDATE_PORE_EC_BAND', min: e.detail.min, max: e.detail.max });
  }

  /** Buffered: per-stage feed-EC ranges → SM draft, saved via the footer save-all. */
  private _onSubstrateTargetsChanged(e: CustomEvent<{ ranges: ECTargetRange[] }>) {
    this.dispatch({ type: 'UPDATE_EC_TARGETS_DRAFT', ranges: e.detail.ranges });
  }

  private async _handleResetWaterTracking() {
    if (!this.device?.deviceId) return;
    const confirmed = window.confirm(
      "Are you sure you want to reset all water tracking data for this growspace? This includes today's usage counters and volume history."
    );
    if (!confirmed) return;
    try {
      await resetWaterTracking(this.device.deviceId);
      this._showErrorToast('Water tracking data reset successfully');
      this._notifyDataChanged();
    } catch (e) {
      console.error('Failed to reset water tracking:', e);
      this._showErrorToast('Failed to reset water tracking data');
    }
  }

  private async _logDrainReadingNow() {
    if (!this.device?.deviceId) return;
    const d = this._sm.tabs.drain_ec.draft;
    if (d.logFeedEc <= 0 || d.logDrainEc <= 0) {
      this._showErrorToast('Feed EC and Drain EC must be > 0');
      return;
    }
    this._sm = transition(this._sm, { type: 'SET_DRAIN_LOGGING', logging: true });
    try {
      await logDrainReading(this.device.deviceId, {
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

  // ─── Render ───────────────────────────────────────────────────────────────

  protected render() {
    if (!this.open) return nothing;

    // Dialog chrome, not data: the same role print-label and batch-print pass as
    // their stageColor. No consumer concatenates onto it, so var() is safe here
    // where the schedule sections need the token map (ADR 0045 §1). The fallback is
    // load-bearing — the dialog is also mounted bare, outside the portal host that
    // declares the token, and a bare var() drops the save button's fill there.
    const dialogColor = 'var(--gm-info-color, #2196f3)';
    const visible = this._visibleTabs;
    const tankCount = this.device?.environmentAttributes?.irrigationTanks?.length ?? 0;

    const NAV: NavDef[] = [
      { id: 'overview', label: 'Overview', group: 'Crop Steering', icon: mdiCompassOutline },
      { id: 'steering', label: 'Steering', group: 'Crop Steering', icon: mdiLeaf },
      {
        id: 'substrate_ec',
        label: 'Substrate & EC',
        group: 'Crop Steering',
        icon: mdiBullseyeArrow,
      },
      { id: 'schedules', label: 'Schedules', group: 'Daily Cycle', icon: mdiCalendarClock },
      { id: 'config', label: 'Configuration', group: 'Equipment', icon: mdiCog },
      {
        id: 'tanks',
        label: 'Tanks',
        group: 'Equipment',
        icon: mdiWater,
        badge: tankCount || undefined,
      },
      { id: 'recipes', label: 'Recipes', group: 'Library', icon: mdiBookmarkMultipleOutline },
      { id: 'program', label: 'Program', group: 'Library', icon: mdiCalendarClock },
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
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
              style="flex-shrink:0;"
            >
              <path d="${item.icon}" />
            </svg>
            <span style="flex:1;">${item.label}</span>
            ${item.badge != null ? html`<span class="nav-badge">${item.badge}</span>` : nothing}
          </div>
        `;
      })}
    `;
  }

  private _renderActiveTab(_color: string) {
    switch (this._sm.activeTab) {
      case 'overview':
        // Decomposed via the per-tab ViewModel adapter (ADR-0019). All other
        // tabs below still render through their inline `_renderXTab()` methods.
        return html`<irrigation-overview-tab
          .vm=${this._overviewVmController.value}
        ></irrigation-overview-tab>`;
      case 'schedules':
        return html`<irrigation-schedules-tab
          .vm=${this._schedulesVmController.value}
          @schedules-begin-add=${this._onSchedulesBeginAdd}
          @schedules-begin-edit=${this._onSchedulesBeginEdit}
          @schedules-update-add=${this._onSchedulesUpdateAdd}
          @schedules-update-edit=${this._onSchedulesUpdateEdit}
          @schedules-cancel-inline=${this._onSchedulesCancelInline}
          @schedules-save-add=${this._onSchedulesSaveAdd}
          @schedules-save-edit=${this._onSchedulesSaveEdit}
          @schedules-delete-from-edit=${this._onSchedulesDeleteFromEdit}
          @schedules-remove-time=${this._onSchedulesRemoveTime}
          @schedules-open-steering=${this._onSchedulesOpenSteering}
        ></irrigation-schedules-tab>`;
      case 'steering':
        return html`<irrigation-steering-tab
          .vm=${this._steeringVmController.value}
          @steering-draft-changed=${this._onSteeringDraftChanged}
          @steering-config-changed=${this._onSteeringConfigChanged}
          @steering-mode-requested=${this._onSteeringModeRequested}
          @steering-mode-confirmed=${this._onSteeringModeConfirmed}
          @steering-mode-cancelled=${this._onSteeringModeCancelled}
          @phase-change-requested=${this._onPhaseChangeRequested}
          @phase-change-confirmed=${this._onPhaseChangeConfirmed}
          @phase-change-cancelled=${this._onPhaseChangeCancelled}
        ></irrigation-steering-tab>`;
      case 'config':
        return html`<irrigation-config-tab
          .vm=${this._configVmController.value}
          @config-pump-changed=${this._onConfigPumpChanged}
          @config-draft-changed=${this._onConfigDraftChanged}
          @config-run-now=${this._onConfigRunNow}
        ></irrigation-config-tab>`;
      case 'tanks':
        return html`<irrigation-tanks-tab
          .vm=${this._tanksVmController.value}
          @edit-tank-requested=${this._onEditTankRequested}
          @tank-draft-changed=${this._onTankDraftChanged}
          @cancel-tank-edit=${this._onCancelTankEdit}
          @save-tank-requested=${this._onSaveTankRequested}
        ></irrigation-tanks-tab>`;
      case 'water_analytics':
        return html`<irrigation-water-analytics-tab
          .vm=${this._waterAnalyticsVmController.value}
          @water-analytics-open-steering=${this._onWaterAnalyticsOpenSteering}
          @water-analytics-reset-tracking=${this._handleResetWaterTracking}
        ></irrigation-water-analytics-tab>`;
      case 'drain_ec':
        return html`<irrigation-drain-ec-tab
          .vm=${this._drainEcVmController.value}
          @drain-ec-draft-changed=${this._onDrainEcDraftChanged}
          @drain-ec-log-reading=${this._onDrainEcLogReading}
        ></irrigation-drain-ec-tab>`;
      case 'substrate_ec':
        return html`<irrigation-substrate-ec-tab
          .vm=${this._substrateEcVmController.value}
          @substrate-ec-profile-changed=${this._onSubstrateProfileChanged}
          @substrate-ec-sizing-mode-changed=${this._onSubstrateSizingModeChanged}
          @substrate-ec-modulation-toggled=${this._onSubstrateModulationToggled}
          @substrate-ec-pore-band-changed=${this._onSubstratePoreBandChanged}
          @substrate-ec-targets-changed=${this._onSubstrateTargetsChanged}
        ></irrigation-substrate-ec-tab>`;
      case 'recipes':
        return html`<irrigation-recipes-tab
          .vm=${this._recipesVmController.value}
          @recipe-name-changed=${this._onRecipeNameChanged}
          @recipe-selected=${this._onRecipeSelected}
          @recipe-save-requested=${this._onRecipeSaveRequested}
          @recipe-apply-requested=${this._onRecipeApplyRequested}
        ></irrigation-recipes-tab>`;
      case 'program':
        return html`<irrigation-program-tab
          .vm=${this._programVmController.value}
          @program-selected=${this._onProgramSelected}
          @program-assign-requested=${this._onProgramAssignRequested}
          @program-recipe-apply-requested=${this._onProgramRecipeApplyRequested}
          @program-auto-advance-changed=${this._onProgramAutoAdvanceChanged}
          @program-confirm-accepted=${this._onProgramConfirmAccepted}
          @program-confirm-cancelled=${this._onProgramConfirmCancelled}
        ></irrigation-program-tab>`;
      case 'ec_ramp':
        return html`<irrigation-ec-ramp-tab
          .vm=${this._ecRampVmController.value}
          @ec-ramp-new-curve=${this._onEcRampNewCurve}
          @ec-ramp-edit-curve=${this._onEcRampEditCurve}
          @ec-ramp-delete-curve=${this._onEcRampDeleteCurve}
          @ec-ramp-cancel-edit=${this._onEcRampCancelEdit}
          @ec-ramp-curve-changed=${this._onEcRampCurveChanged}
          @ec-ramp-add-point=${this._onEcRampAddPoint}
          @ec-ramp-remove-point=${this._onEcRampRemovePoint}
          @ec-ramp-update-point=${this._onEcRampUpdatePoint}
          @ec-ramp-save-curve=${this._onEcRampSaveCurve}
        ></irrigation-ec-ramp-tab>`;
      default:
        return nothing;
    }
  }

  // ─── Steering tab: Tab Intent → SM-event / side-effect routing (ADR-0019) ───
  // The Shell owns the translation. The steering UI writes TWO drafts, so the
  // steering tab emits two distinct draft intents (steering vs config). The two
  // confirm-CONFIRMED intents keep their preserved side-effects here (ADR-0012):
  // the `applySteeringMode` and `setSteeringPhase` store actions.

  /** Steering draft field → UPDATE_STEERING_DRAFT. */
  private _onSteeringDraftChanged(e: CustomEvent<{ partial: Partial<IrrigationStrategy> }>) {
    this._sm = transition(this._sm, { type: 'UPDATE_STEERING_DRAFT', partial: e.detail.partial });
  }

  /** Config draft field surfaced in the steering UI → UPDATE_CONFIG_DRAFT. */
  private _onSteeringConfigChanged(e: CustomEvent<{ partial: Partial<ConfigDraft> }>) {
    this._sm = transition(this._sm, { type: 'UPDATE_CONFIG_DRAFT', partial: e.detail.partial });
  }

  /** Open the Steering Mode confirm overlay (ADR-0012). */
  private _onSteeringModeRequested(e: CustomEvent<{ mode: SteeringMode }>) {
    this._sm = transition(this._sm, { type: 'REQUEST_STEERING_MODE', mode: e.detail.mode });
  }

  /** Cancel/close the Steering Mode confirm overlay. */
  private _onSteeringModeCancelled() {
    this._sm = transition(this._sm, { type: 'CANCEL_STEERING_MODE' });
  }

  /**
   * Confirm the Steering Mode (ADR-0012): close the overlay, then apply the preset
   * through the store action — the canonical write path; the server stamps the
   * preset and the new field values arrive via device sync.
   */
  private async _onSteeringModeConfirmed() {
    const sub = this._sm.tabs.steering.sub;
    if (sub.kind !== 'confirm-mode') return;
    const id = this.device?.deviceId;
    this._sm = transition(this._sm, { type: 'CANCEL_STEERING_MODE' });
    if (!id) return;
    await applySteeringMode(id, sub.pending);
  }

  /** Open the phase-change confirm overlay (ADR-0012). */
  private _onPhaseChangeRequested(e: CustomEvent<{ phase: Phase }>) {
    if (this._sm.tabs.steering.phase === e.detail.phase) return;
    this._sm = transition(this._sm, { type: 'REQUEST_PHASE_CHANGE', phase: e.detail.phase });
  }

  /** Confirm the phase change (ADR-0012): commit the transition, then persist.
   *
   * Persisted by its own action, not by a settings save: the phase belongs to
   * the backend steering machine, so writing it is this one gesture and never
   * a passenger on the buffered form.
   */
  private _onPhaseChangeConfirmed() {
    const phase = this._sm.tabs.steering.sub;
    if (phase.kind !== 'confirm-phase') return;
    const pending = phase.pending;
    this._sm = transition(this._sm, { type: 'CONFIRM_PHASE_CHANGE' });
    this.dispatch({
      type: 'SaveRequested',
      action: 'set-steering-phase',
      params: { phase: pending },
    });
  }

  /** Cancel/close the phase-change confirm overlay. */
  private _onPhaseChangeCancelled() {
    this._sm = transition(this._sm, { type: 'CANCEL_PHASE_CHANGE' });
  }

  // ─── Overview tab (crop-steering diagnostics, read-only) ──────────────────
  //
  // Decomposed (ADR-0019): the Overview tab renders through
  // `<irrigation-overview-tab .vm=…>` driven by `createOverviewTabViewModel`.
  // All values still come from the growspace payload (device.steeringMetrics),
  // never hass.states. The former inline `_renderOverview*` helpers moved into
  // the Tab Component / Tab ViewModel.

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
      selectedGrowspaceId: params.growspaceId,
      irrigationTanks: params.irrigationTanks.map((tank) => ({
        ...tank,
        volumeLiters: tank.volumeLiters ?? null,
      })),
    });
  }

  // ─── EC Ramp tab: Tab Intent → SM-event translation (ADR-0019) ─────────────
  // The Shell owns the translation; `<irrigation-ec-ramp-tab>` only emits intents.
  // Curves are owned by the Nutrient slice (ADR-0005); the editor draft lives in
  // the SM.

  private _onEcRampNewCurve() {
    this.dispatch({ type: 'EC_RAMP_START_NEW' });
  }

  /** `ec-ramp-edit-curve` → deep-copy the saved curve into the SM editor draft. */
  private _onEcRampEditCurve(e: CustomEvent<{ id: string }>) {
    const curve = (ecRampCurves$.get() ?? {})[e.detail.id];
    if (!curve) return;
    const draft: EcRampCurveDraft = JSON.parse(JSON.stringify(curve));
    this.dispatch({ type: 'EC_RAMP_EDIT_CURVE', draft });
  }

  private _onEcRampCancelEdit() {
    this.dispatch({ type: 'EC_RAMP_CANCEL_EDIT' });
  }

  private _onEcRampCurveChanged(e: CustomEvent<{ partial: Partial<ECRampCurve> }>) {
    this.dispatch({ type: 'UPDATE_EC_RAMP_CURVE', partial: e.detail.partial });
  }

  private _onEcRampAddPoint() {
    this.dispatch({ type: 'EC_RAMP_ADD_POINT' });
  }

  private _onEcRampRemovePoint(e: CustomEvent<{ index: number }>) {
    this.dispatch({ type: 'EC_RAMP_REMOVE_POINT', index: e.detail.index });
  }

  private _onEcRampUpdatePoint(e: CustomEvent<{ index: number; partial: Partial<ECRampPoint> }>) {
    this.dispatch({
      type: 'EC_RAMP_UPDATE_POINT',
      index: e.detail.index,
      partial: e.detail.partial,
    });
  }

  /**
   * `ec-ramp-delete-curve` → confirm (the Shell owns this guard so the component
   * stays dumb), then run the remove effect (no editor draft involved).
   */
  private _onEcRampDeleteCurve(e: CustomEvent<{ id: string }>) {
    if (!window.confirm('Are you sure you want to delete this EC ramp curve?')) return;
    this.dispatch({
      type: 'SaveRequested',
      action: 'remove-ec-ramp-curve',
      params: { curveId: e.detail.id },
    });
  }

  /**
   * `ec-ramp-save-curve` → validate + compose the payload from the open draft. A
   * synchronous validation failure sets the SM error and stops; a valid payload
   * closes the editor and dispatches SaveRequested with the payload snapshotted
   * into `applying.status` (ADR-0015), so the effect never reads cleared state.
   */
  private _onEcRampSaveCurve() {
    const sub = this._sm.tabs.ec_ramp.sub;
    if (sub.kind !== 'editing') return;
    const result = composeEcRampSave(sub.draft);
    if (!result.ok) {
      this.dispatch({ type: 'SET_EC_RAMP_ERROR', error: result.error });
      return;
    }
    this.dispatch({ type: 'EC_RAMP_CANCEL_EDIT' });
    this.dispatch({ type: 'SaveRequested', action: 'save-ec-ramp-curve', params: result.payload });
  }

  /**
   * Effects read only `params`. They save via the Nutrient slice mutator and
   * then refetch `ecRampCurves$` — the atom the VM reads — so the list reflects
   * the change. Errors propagate to the MutationRunController, which surfaces the
   * per-action SM toast (`actionErrorMessage`) on `SaveFailed`.
   */
  private async _effectSaveEcRampCurve(params: EcRampSaveParams) {
    await sliceSaveECRampCurve(params);
    await fetchECRampCurves({ cache: true, force: true });
  }

  private async _effectRemoveEcRampCurve(params: { curveId: string }) {
    await sliceRemoveECRampCurve(params.curveId);
    await fetchECRampCurves({ cache: true, force: true });
  }

  // ─── Recipe tab intents (ADR-0019 + ADR-0045) ──────────────────────────────
  // Both gestures are one-way writes with no local half to buffer: saving
  // snapshots what is already persisted, applying is a server-side stamp. So the
  // handlers stay synchronous and dispatch straight through the mutation seam
  // (ADR-0015), with the payload snapshotted into `applying.params`.

  private _onRecipeNameChanged(e: CustomEvent<{ name: string }>) {
    this.dispatch({ type: 'UPDATE_RECIPE_NAME', name: e.detail.name });
  }

  private _onRecipeSelected(e: CustomEvent<{ recipeId: string }>) {
    this.dispatch({ type: 'SELECT_RECIPE', recipeId: e.detail.recipeId });
  }

  private _onRecipeSaveRequested() {
    const vm = this._recipesVmController.value;
    const name = vm.nameDraft.trim();
    if (!name || !this.device?.deviceId) return;
    const params: SaveRecipeParams = { name, kind: vm.runningKind };
    this.dispatch({ type: 'SaveRequested', action: 'save-recipe', params });
  }

  private _onRecipeApplyRequested(e: CustomEvent<{ recipeId: string | null }>) {
    const recipeId = e.detail.recipeId;
    if (!recipeId || !this.device?.deviceId) return;
    // Clear the previous apply's notice up front, so a second apply that returns
    // nothing cannot leave the first one's warning standing beside it.
    this.dispatch({ type: 'SET_RECIPE_APPLY_WARNING', warning: null });
    this.dispatch({ type: 'SaveRequested', action: 'apply-recipe', params: { recipeId } });
  }

  /**
   * Effects read only `params`. A rejection propagates to the
   * MutationRunController, which surfaces it through `actionErrorMessage` —
   * which, for these two actions, keeps the backend's own wording because it
   * names the missing prerequisite the grower has to fix.
   */
  private async _effectSaveRecipe(params: SaveRecipeParams) {
    if (!this.device?.deviceId) return;
    await saveIrrigationRecipe({
      growspaceId: this.device.deviceId,
      name: params.name,
      kind: params.kind,
    });
    // The name has done its job; clearing it keeps the form from looking like it
    // is still holding an unsaved recipe.
    this.dispatch({ type: 'UPDATE_RECIPE_NAME', name: '' });
  }

  private async _effectApplyRecipe(params: { recipeId: string }) {
    if (!this.device?.deviceId) return;
    const result = await applyIrrigationRecipe(this.device.deviceId, params.recipeId);
    // A cross-media apply succeeds and warns. Carry the backend's own sentence
    // into the tab rather than a paraphrase — it names both media.
    this.dispatch({ type: 'SET_RECIPE_APPLY_WARNING', warning: result.warning });
  }

  // ─── Program tab intents (ADR-0019 + ADR-0045) ─────────────────────────────
  // Assigning writes one id, applying is a server-side stamp, and the
  // auto-advance flag is a one-field write. None of them buffers anything, so
  // the handlers stay synchronous and dispatch straight through the mutation
  // seam (ADR-0015) with the payload snapshotted into `applying.params`.

  private _onProgramSelected(e: CustomEvent<{ programId: string | null }>) {
    this.dispatch({ type: 'SELECT_PROGRAM', programId: e.detail.programId });
  }

  private _onProgramAssignRequested(e: CustomEvent<{ programId: string | null }>) {
    if (!this.device?.deviceId) return;
    const params: AssignProgramParams = { programId: e.detail.programId };
    this.dispatch({ type: 'SaveRequested', action: 'assign-program', params });
  }

  /**
   * Applying the week's recipe from the Program tab.
   *
   * The same stamp the Recipe tab's picker performs, reached from the sentence
   * that recommended it, so the grower never has to translate "flower week 3
   * calls for X" into finding X in another tab's list.
   */
  private _onProgramRecipeApplyRequested(e: CustomEvent<{ recipeId: string }>) {
    if (!this.device?.deviceId || !e.detail.recipeId) return;
    this.dispatch({ type: 'SET_RECIPE_APPLY_WARNING', warning: null });
    this.dispatch({
      type: 'SaveRequested',
      action: 'apply-recipe',
      params: { recipeId: e.detail.recipeId },
    });
  }

  /**
   * Turning auto-advance **on** is not a preference that takes effect later:
   * the growspace is already in a week of its plan, so it makes that week's
   * recipe due and the next evaluation stamps it. That consequence is put to
   * the grower before anything is written. Turning it **off** takes something
   * away and needs no confirmation.
   */
  private _onProgramAutoAdvanceChanged(e: CustomEvent<{ enabled: boolean }>) {
    if (!this.device?.deviceId) return;
    const vm = this._programVmController.value;
    if (e.detail.enabled && vm.assignedProgramId !== null) {
      this.dispatch({ type: 'SET_PROGRAM_CONFIRM', confirm: { kind: 'enable-auto-advance' } });
      return;
    }
    this.dispatch({
      type: 'SaveRequested',
      action: 'set-program-auto-advance',
      params: { enabled: e.detail.enabled },
    });
  }

  private _onProgramConfirmAccepted() {
    this.dispatch({ type: 'SET_PROGRAM_CONFIRM', confirm: null });
    this.dispatch({
      type: 'SaveRequested',
      action: 'set-program-auto-advance',
      params: { enabled: true },
    });
  }

  /**
   * Cancelling re-renders the tab from the VM, whose `autoAdvance` still reads
   * the persisted value — so the checkbox the grower ticked snaps back on its
   * own, because nothing was ever written.
   */
  private _onProgramConfirmCancelled() {
    this.dispatch({ type: 'SET_PROGRAM_CONFIRM', confirm: null });
  }

  private async _effectAssignProgram(params: AssignProgramParams) {
    if (!this.device?.deviceId) return;
    await assignIrrigationProgram(this.device.deviceId, params.programId);
  }

  private async _effectSetProgramAutoAdvance(params: { enabled: boolean }) {
    if (!this.device?.deviceId) return;
    await setProgramAutoAdvance(this.device.deviceId, params.enabled);
  }

  // ─── Drain EC tab intents (ADR-0019) ───────────────────────────────────────
  // The monitoring/log draft lives in the SM; config persists via the global
  // `save-all` effect. The `_logDrainReadingNow` flow is preserved exactly — an
  // imperative host method (its `feedEc/drainEc > 0` guard lives here, not in the
  // SM or VM), surfaced to the dumb component via the `drain-ec-log-reading` intent.

  /** `drain-ec-draft-changed` → merge the field change into the SM draft. */
  private _onDrainEcDraftChanged(e: CustomEvent<{ partial: Partial<DrainEcDraft> }>) {
    this._sm = transition(this._sm, {
      type: 'UPDATE_DRAIN_EC_DRAFT',
      partial: e.detail.partial,
    });
  }

  /** `drain-ec-log-reading` → run the existing imperative log flow unchanged. */
  private _onDrainEcLogReading() {
    this._logDrainReadingNow().catch(() => {});
  }

  // ─── Config tab intents (ADR-0019) ─────────────────────────────────────────
  // The config draft + pump-entity drafts live in the SM; both persist through the
  // global `save-all` footer path. Run Now reuses the existing `_handleRunNow`.

  /** `config-pump-changed` → write the pump select into the SHARED schedules draft. */
  private _onConfigPumpChanged(e: CustomEvent<{ which: 'irrigation' | 'drain'; value: string }>) {
    const { which, value } = e.detail;
    this._sm = transition(this._sm, {
      type: 'UPDATE_SCHEDULES_DRAFT',
      partial:
        which === 'irrigation' ? { irrigationPumpEntity: value } : { drainPumpEntity: value },
    });
  }

  /** `config-draft-changed` → merge the field change into the SM config draft. */
  private _onConfigDraftChanged(e: CustomEvent<{ partial: Partial<ConfigDraft> }>) {
    this._sm = transition(this._sm, {
      type: 'UPDATE_CONFIG_DRAFT',
      partial: e.detail.partial,
    });
  }

  /** `config-run-now` → run the existing manual-override flow unchanged. */
  private _onConfigRunNow() {
    this._handleRunNow();
  }

  // ─── Schedules tab intents (ADR-0019) ──────────────────────────────────────
  // Most map 1:1 to existing SM events / private handlers; the save/effect routing
  // through the MutationRunController is preserved exactly.

  private _onSchedulesBeginAdd(
    e: CustomEvent<{ type: 'irrigation' | 'drain'; time: string; duration: number }>
  ) {
    const { type, time, duration } = e.detail;
    this._sm = transition(this._sm, {
      type: type === 'irrigation' ? 'BEGIN_ADD_IRRIGATION' : 'BEGIN_ADD_DRAIN',
      time,
      duration,
    });
  }

  private _onSchedulesBeginEdit(
    e: CustomEvent<{ type: 'irrigation' | 'drain'; timeStr: string; duration: number }>
  ) {
    const { type, timeStr, duration } = e.detail;
    this._sm = transition(this._sm, {
      type: type === 'irrigation' ? 'BEGIN_EDIT_IRRIGATION' : 'BEGIN_EDIT_DRAIN',
      originalTime: timeStr,
      originalDuration: duration,
      time: timeStr.substring(0, 5),
      duration,
    });
  }

  private _onSchedulesUpdateAdd(
    e: CustomEvent<{ type: 'irrigation' | 'drain'; time?: string; duration?: number }>
  ) {
    const { type, time, duration } = e.detail;
    this._sm = transition(this._sm, {
      type: type === 'irrigation' ? 'UPDATE_ADD_IRRIGATION' : 'UPDATE_ADD_DRAIN',
      ...(time !== undefined && { time }),
      ...(duration !== undefined && { duration }),
    });
  }

  private _onSchedulesUpdateEdit(
    e: CustomEvent<{ type: 'irrigation' | 'drain'; time?: string; duration?: number }>
  ) {
    const { type, time, duration } = e.detail;
    this._sm = transition(this._sm, {
      type: type === 'irrigation' ? 'UPDATE_EDIT_IRRIGATION' : 'UPDATE_EDIT_DRAIN',
      ...(time !== undefined && { time }),
      ...(duration !== undefined && { duration }),
    });
  }

  private _onSchedulesCancelInline() {
    this._sm = transition(this._sm, { type: 'CANCEL_INLINE' });
  }

  private _onSchedulesSaveAdd(
    e: CustomEvent<{ type: 'irrigation' | 'drain'; time: string; duration: number }>
  ) {
    const { type, time, duration } = e.detail;
    if (type === 'irrigation') {
      this._addIrrigationTime(time, duration).catch(() =>
        this._showErrorToast('Failed to add irrigation time')
      );
    } else {
      this._addDrainTime(time, duration).catch(() => {});
    }
  }

  private _onSchedulesSaveEdit(e: CustomEvent<{ type: 'irrigation' | 'drain' }>) {
    if (e.detail.type === 'irrigation') this._saveEditedIrrigationTime();
    else this._saveEditedDrainTime();
  }

  private _onSchedulesDeleteFromEdit(e: CustomEvent<{ type: 'irrigation' | 'drain' }>) {
    if (e.detail.type === 'irrigation') this._deleteIrrigationTimeFromEdit();
    else this._deleteDrainTimeFromEdit();
  }

  private _onSchedulesRemoveTime(
    e: CustomEvent<{ type: 'irrigation' | 'drain'; timeStr: string }>
  ) {
    if (e.detail.type === 'irrigation') {
      this._removeIrrigationTime(e.detail.timeStr).catch(() =>
        this._showErrorToast('Failed to remove irrigation time')
      );
    } else {
      this._removeDrainTime(e.detail.timeStr).catch(() => {});
    }
  }

  private _onSchedulesOpenSteering() {
    if (!this.device) return;
    this._sm = requestTabSwitch(this._sm, 'steering', this.device);
  }

  // ─── Water Analytics tab intents (ADR-0019) ───────────────────────────────
  // The decomposed `<irrigation-water-analytics-tab>` is read-mostly with two
  // interactions: the "edit in Steering →" link (→ tab switch) and the
  // Maintenance "Reset All Data" button (→ the existing `_handleResetWaterTracking`,
  // bound directly in the render case). The crop-steering shot summary derives in
  // the VM via the pure `crop-steering-model` helper, and `stageAggregates` is
  // still fetched by `_fetchStageAnalytics` and passed through the VM.
  private _onWaterAnalyticsOpenSteering() {
    if (!this.device) return;
    this._sm = requestTabSwitch(this._sm, 'steering', this.device);
  }
}
