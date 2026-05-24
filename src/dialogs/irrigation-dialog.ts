import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiWater, mdiPlus, mdiAlert } from '@mdi/js';
import { IrrigationTime, IrrigationStrategy, GrowspaceDevice, DrainECReading, TankWaterEvent } from '../types';
import type { ECTargetRange } from '../services/types';
import { DataService } from '../services/data-service';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';
import {
  addIrrigationTime,
  removeIrrigationTime,
  addDrainTime,
  removeDrainTime,
  setIrrigationSettings,
  runIrrigationCycle,
} from '../store/growspace/irrigation-actions';
import '../features/shared/ui';
import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/md3-switch';
import '../features/shared/ui/gs-help-tooltip';

// MDI check icon path for time chips
const MDI_CHECK = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
const MDI_INFO  = 'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z';

type TabId = 'schedules' | 'steering' | 'config' | 'tanks' | 'water_analytics' | 'drain_ec' | 'ec_targets';

interface NavDef {
  id: TabId;
  label: string;
  group: string;
  badge?: number;
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

  @state() private _irrigationPumpEntity = '';
  @state() private _drainPumpEntity = '';
  @state() private _irrigationDuration = 60;
  @state() private _drainDuration = 60;

  @state() private _addingIrrigationTime: { time: string; duration: number } | undefined;
  @state() private _addingDrainTime: { time: string; duration: number } | undefined;

  @state() private _editingIrrigationTime: {
    originalTime: string;
    originalDuration: number;
    time: string;
    duration: number;
  } | undefined;

  @state() private _editingDrainTime: {
    originalTime: string;
    originalDuration: number;
    time: string;
    duration: number;
  } | undefined;

  @state() private _errorToast: string | undefined;
  @state() private _activeTab: TabId = 'schedules';
  @state() private _activePhase: 'p1' | 'p2' | 'p3' = 'p2';
  @state() private _phaseConfirmOpen = false;
  @state() private _pendingPhase: 'p1' | 'p2' | 'p3' | undefined = undefined;

  // Drain EC state
  @state() private _drainEcEnabled = false;
  @state() private _drainEcMaxDelta = 1.0;
  @state() private _drainEcTargetRunoffPercent = 20;
  @state() private _drainLogFeedEc = 2.0;
  @state() private _drainLogDrainEc = 2.0;
  @state() private _drainLogFeedVolume = 0;
  @state() private _drainLogDrainVolume = 0;
  @state() private _drainSaving = false;
  @state() private _drainLogging = false;

  @state() private _ecTargetRanges: ECTargetRange[] = [
    { stage: 'seedling',     minEc: 0, maxEc: 0 },
    { stage: 'veg',          minEc: 0, maxEc: 0 },
    { stage: 'flower_early', minEc: 0, maxEc: 0 },
    { stage: 'flower_mid',   minEc: 0, maxEc: 0 },
    { stage: 'flower_late',  minEc: 0, maxEc: 0 },
  ];

  @state() private _strategy: Partial<IrrigationStrategy> = {};

  // Cycle parameters & behaviour toggles
  @state() private _soilTriggerPercent: number | null = null;
  @state() private _dailyVolumeCapLiters: number | null = null;
  @state() private _maxCyclesPerDay: number | null = null;
  @state() private _skipDuringDark = false;
  @state() private _pauseOnLowTank = true;
  @state() private _logToLogbook = true;
  @state() private _autoAdvanceP1ToP2 = false;
  @state() private _autoAdvanceP2ToP3 = false;
  @state() private _haltOnRunoffEcThreshold: number | null = null;

  @state() private _runNowSaving = false;
  @state() private _stageAggregates: Record<string, number> | null = null;

  private _dataService?: DataService;

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
        border-right: 1px solid rgba(255,255,255,0.08);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 8px 0;
        background: rgba(0,0,0,0.12);
      }

      .v1-rail-caps {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.35);
        padding: 12px 16px 4px;
      }

      .v1-nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 16px;
        cursor: pointer;
        font-size: 13px;
        color: rgba(255,255,255,0.65);
        transition: background 0.15s, color 0.15s;
        position: relative;
        user-select: none;
      }

      .v1-nav-item:hover {
        background: rgba(255,255,255,0.05);
        color: rgba(255,255,255,0.9);
      }

      .v1-nav-item.active {
        background: rgba(33,150,243,0.12);
        color: #2196f3;
      }

      .v1-nav-item.active::before {
        content: '';
        position: absolute;
        left: 0; top: 4px; bottom: 4px;
        width: 3px;
        background: #2196f3;
        border-radius: 0 2px 2px 0;
      }

      .nav-badge {
        margin-left: auto;
        background: rgba(33,150,243,0.2);
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
        border-bottom: 1px solid rgba(255,255,255,0.07);
        flex-shrink: 0;
        background: rgba(0,0,0,0.06);
      }

      .growspace-crumb {
        font-size: 10px;
        color: rgba(255,255,255,0.35);
        text-transform: uppercase;
        letter-spacing: 0.07em;
      }

      .growspace-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
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
        border-top: 1px solid rgba(255,255,255,0.08);
        background: rgba(0,0,0,0.15);
        flex-shrink: 0;
        gap: 10px;
      }

      .dlg-footer-meta {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11.5px;
        color: rgba(255,255,255,0.4);
        font-variant-numeric: tabular-nums;
      }

      .dlg-footer-meta .sep { opacity: 0.4; }

      .dlg-footer-actions {
        display: flex;
        gap: 8px;
      }

      /* ── Timeline ── */
      .timeline-track {
        position: relative;
        height: 96px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        background: rgba(0,0,0,0.2);
        overflow: hidden;
        cursor: crosshair;
      }

      .grid-v {
        position: absolute;
        top: 0; bottom: 18px;
        width: 1px;
        background: rgba(255,255,255,0.04);
        pointer-events: none;
      }
      .grid-v.major { background: rgba(255,255,255,0.09); }

      .x-label {
        position: absolute;
        bottom: 4px;
        transform: translateX(-50%);
        font-size: 10px;
        color: rgba(255,255,255,0.35);
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

      .timeline-event:hover { transform: translateY(-2px); }

      .timeline-event.completed { opacity: 0.45; }

      .timeline-event.completed::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.18) 3px 5px);
        pointer-events: none;
      }

      .timeline-event .event-lbl {
        font-size: 9.5px;
        color: rgba(0,0,0,0.78);
        font-weight: 600;
        white-space: nowrap;
        position: relative;
        z-index: 1;
      }

      .now-line {
        position: absolute;
        top: 4px; bottom: 22px;
        width: 1px;
        background: #FF9800;
        box-shadow: 0 0 8px rgba(255,152,0,0.5);
        pointer-events: none;
        z-index: 8;
      }

      .now-line::before {
        content: '';
        position: absolute;
        left: -3px; top: -3px;
        width: 7px; height: 7px;
        border-radius: 50%;
        background: #FF9800;
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
        background: rgba(33,150,243,0.14);
        border: 1px solid rgba(33,150,243,0.3);
        color: rgba(255,255,255,0.9);
      }

      .time-chip.drain-chip {
        background: rgba(255,152,0,0.14);
        border: 1px solid rgba(255,152,0,0.3);
        color: rgba(255,255,255,0.9);
      }

      .time-chip.new-chip {
        background: transparent;
        border: 1px dashed rgba(255,255,255,0.2);
        color: rgba(255,255,255,0.4);
        cursor: pointer;
        padding: 0 12px;
        border-radius: 8px;
      }
      .time-chip.new-chip:hover {
        border-color: rgba(255,255,255,0.35);
        color: rgba(255,255,255,0.7);
      }

      .chip-dur {
        color: rgba(255,255,255,0.45);
        font-size: 11px;
      }

      .chip-remove {
        width: 20px; height: 20px;
        border-radius: 6px;
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.4);
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
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.85);
      }

      /* ── Phase cards ── */
      .phase-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .phase-card {
        padding: 12px 14px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        background: rgba(255,255,255,0.02);
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .phase-card:hover { background: rgba(255,255,255,0.035); }
      .phase-card.active {
        border-color: rgba(33,150,243,0.5);
        background: rgba(33,150,243,0.08);
      }
      .phase-card .phase-num {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.4);
      }
      .phase-card .phase-nm {
        font-size: 14px;
        font-weight: 500;
      }
      .phase-card .phase-desc {
        font-size: 11.5px;
        color: rgba(255,255,255,0.5);
        line-height: 1.4;
      }

      /* ── Info banner ── */
      .info-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(33,150,243,0.07);
        border: 1px solid rgba(33,150,243,0.2);
        border-radius: 8px;
        font-size: 12.5px;
        color: rgba(255,255,255,0.65);
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
        background: rgba(255,152,0,0.12);
        color: #FF9800;
        border: 1px solid rgba(255,152,0,0.3);
        margin-left: 8px;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 20px;
        border: 1px solid rgba(79,195,247,0.4);
        background: rgba(79,195,247,0.1);
        color: #4fc3f7;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .action-btn:hover:not([disabled]) { background: rgba(79,195,247,0.2); }
      .action-btn[disabled], .action-btn.saving { opacity: 0.5; cursor: default; }

      /* ── Tank row (bar-style) ── */
      .tank-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        background: rgba(255,255,255,0.02);
        transition: border-color 0.2s;
      }
      .tank-row.warning {
        border-color: rgba(244,67,54,0.4);
        background: rgba(244,67,54,0.04);
      }
      .tank-row-info { flex: 1; min-width: 0; }
      .tank-row-name { font-size: 13px; font-weight: 500; }
      .tank-bar-track {
        height: 5px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 5px;
      }
      .tank-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
      }
      .tank-row-stat {
        font-size: 12.5px;
        text-align: right;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      .tank-row-pct {
        font-weight: 600;
      }
      .tank-row-sub {
        font-size: 11px;
        opacity: 0.5;
        margin-top: 2px;
      }

      /* ── Overlay (unchanged) ── */
      .overlay-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
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
        background: rgba(50,50,50,0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        z-index: 10001;
        animation: toast-slide-up 0.3s ease-out;
      }
      .toast-notification.error {
        background: rgba(244,67,54,0.15);
        border-color: rgba(244,67,54,0.3);
      }
      @keyframes toast-slide-up {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .toast-message {
        color: rgba(255,255,255,0.9);
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
      .edit-dialog-buttons .spacer { flex: 1; }
      .edit-dialog-buttons .action-buttons {
        display: flex;
        gap: 8px;
      }
      .md3-button.delete-button {
        background: rgba(244,67,54,0.2) !important;
        color: #f44336 !important;
        border: 1px solid rgba(244,67,54,0.3);
      }
      .md3-button.delete-button:hover {
        background: rgba(244,67,54,0.3) !important;
      }

      /* ── Setup hints ── */
      .setup-hints {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.04);
        border: 1px dashed rgba(255,255,255,0.12);
        border-radius: 12px;
      }
      .setup-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.82rem;
        color: rgba(255,255,255,0.55);
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
        background: rgba(255,255,255,0.03);
        border-radius: 8px;
        opacity: 0.55;
      }
      .stub-row-label { font-size: 13px; }
      .stub-row-desc  { font-size: 11px; opacity: 0.6; margin-top: 2px; }

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
        background: linear-gradient(135deg, rgba(76,175,80,0.18), rgba(33,150,243,0.18));
        border: 1px solid rgba(76,175,80,0.4);
        color: #4CAF50;
        border-radius: 6px;
      }
      .auto-pill .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #4CAF50;
        box-shadow: 0 0 6px rgba(76,175,80,0.9);
        flex-shrink: 0;
      }
      .cs-timeline { display: flex; flex-direction: column; gap: 10px; }
      .cs-phase-strip {
        position: relative;
        height: 52px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        background: rgba(0,0,0,0.2);
        overflow: hidden;
      }
      .cs-phase-block {
        position: absolute;
        top: 0; bottom: 0;
        padding: 7px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        justify-content: center;
        overflow: hidden;
      }
      .cs-phase-block.dark {
        background: rgba(0,0,0,0.35);
        border-left: 1px solid rgba(255,255,255,0.06);
      }
      .cs-phase-num {
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .cs-phase-nm {
        font-size: 11px;
        font-weight: 500;
        text-transform: none;
        letter-spacing: 0;
        color: rgba(255,255,255,0.85);
      }
      .cs-phase-meta {
        font-size: 10px;
        color: rgba(255,255,255,0.4);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cs-track {
        position: relative;
        height: 108px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        background: rgba(0,0,0,0.2);
        overflow: hidden;
      }
      .cs-track .grid-v { top: 8px; bottom: 22px; }
      .cs-photoperiod {
        position: absolute;
        top: 0;
        height: 8px;
        background: linear-gradient(to bottom, rgba(255,235,59,0.22), rgba(255,235,59,0.04));
        border-bottom: 1px solid rgba(255,235,59,0.4);
      }
      .cs-phase-bg {
        position: absolute;
        top: 8px;
        bottom: 22px;
        overflow: hidden;
      }
      .cs-phase-bg-lbl {
        position: absolute;
        top: 5px;
        left: 7px;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.7;
        pointer-events: none;
      }
      .cs-event {
        position: absolute;
        top: 22px;
        height: 56px;
        border-radius: 3px;
        opacity: 0.9;
        cursor: default;
        transition: transform 0.15s;
      }
      .cs-event:hover { transform: translateY(-2px); }
      .cs-event.completed { opacity: 0.35; }
      .cs-event.completed::after {
        content: '';
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.18) 3px 5px);
        border-radius: inherit;
      }
      .cs-now-line {
        position: absolute;
        top: 12px;
        bottom: 22px;
        width: 1px;
        background: #FF9800;
        box-shadow: 0 0 8px rgba(255,152,0,0.5);
        pointer-events: none;
        z-index: 8;
      }
      .cs-now-line::before {
        content: '';
        position: absolute;
        left: -3px; top: -3px;
        width: 7px; height: 7px;
        border-radius: 50%;
        background: #FF9800;
      }
      .cs-vwc {
        position: relative;
        height: 64px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        background: rgba(0,0,0,0.2);
        padding: 4px 8px;
        overflow: hidden;
      }
      .cs-vwc-label {
        position: absolute;
        top: 4px; left: 10px;
        font-size: 9.5px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgba(255,255,255,0.35);
        pointer-events: none;
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
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        font-size: 11.5px;
        color: rgba(255,255,255,0.6);
        font-variant-numeric: tabular-nums;
      }
      .cs-leg-chip strong { color: rgba(255,255,255,0.9); font-weight: 500; }
      .cs-leg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .info-banner.banner-cs {
        background: linear-gradient(90deg, rgba(76,175,80,0.10), rgba(33,150,243,0.06));
        border: 1px solid rgba(76,175,80,0.3);
        border-left: 3px solid #4CAF50;
      }
      .info-banner.banner-cs svg { fill: #4CAF50; }

      @keyframes field-pulse-anim {
        0%   { box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33,150,243), 0.5); }
        50%  { box-shadow: 0 0 0 6px rgba(var(--primary-color-rgb, 33,150,243), 0.2); }
        100% { box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33,150,243), 0); }
      }
      .field-pulse {
        animation: field-pulse-anim 3s ease-out 1;
      }
    `,
  ];

  // ─── Visibility ───────────────────────────────────────────────────────────

  private get _visibleTabs(): TabId[] {
    const tabs: TabId[] = ['schedules'];
    const env = this.device?.environmentAttributes;

    const hasSoilMoisture = !!(env?.soilMoistureSensor)
      || (env?.soilMoistureSensors?.length ?? 0) > 0;
    const hasStrategy = !!this.device?.irrigationStrategy?.enabled;
    const hasPump = !!(this.device?.irrigationConfig?.irrigationPumpEntity || this.device?.irrigationConfig?.drainPumpEntity);

    if ((hasSoilMoisture || hasStrategy) && hasPump) {
      tabs.push('steering');
    }

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
      (env?.substrateEcSensors?.length ?? 0) > 0 ||
      (env?.phSensors?.length ?? 0) > 0;
    if (drainEnabled || hasDrainReadings || hasEcSensors) tabs.push('drain_ec');

    // EC Targets: always visible (stub — backend support coming)
    tabs.push('ec_targets');

    return tabs;
  }

  private get _setupHints(): Array<{ icon: string; text: string }> {
    const hints: Array<{ icon: string; text: string }> = [];
    const env = this.device?.environmentAttributes;
    const visible = this._visibleTabs;

    if (!visible.includes('steering')) {
      const hasPump = !!(this.device?.irrigationConfig?.irrigationPumpEntity || this.device?.irrigationConfig?.drainPumpEntity);
      if (!hasPump) {
        hints.push({ icon: '🚰', text: 'Configure an irrigation or drain pump in Irrigation Settings to enable Crop Steering features.' });
      } else {
        hints.push({ icon: '🌱', text: 'Configure a soil moisture sensor in Environment Settings to enable VWC Crop Steering.' });
      }
    }
    if (!visible.includes('tanks')) {
      hints.push({ icon: '🪣', text: 'Add irrigation tanks in Environment Settings to track tank levels and water consumption.' });
    }
    if (!visible.includes('drain_ec')) {
      hints.push({ icon: '🧪', text: 'Configure EC/pH sensors or enable drain monitoring to track nutrient runoff.' });
    }
    return hints;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  protected willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has('open') && this.open) {
      this._initializeState();
      this._fetchStageAnalytics();
      if (this.initialTab) {
        this._activeTab = this.initialTab;
      }
    }
    if (this.hass && (changedProps.has('hass') || !this._dataService)) {
      this._dataService = new DataService(this.hass);
    }
    if (!this._visibleTabs.includes(this._activeTab)) {
      this._activeTab = 'schedules';
    }
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has('open') && this.open && this.scrollToField) {
      const target = this.shadowRoot?.querySelector<HTMLElement>(
        `[data-scroll-target="${this.scrollToField}"]`
      );
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('field-pulse');
      target.addEventListener('animationend', () => target.classList.remove('field-pulse'), { once: true });
    }
  }

  private _initializeState() {
    if (!this.device) return;
    const config = this.device.irrigationConfig || {};
    this._irrigationPumpEntity = config.irrigationPumpEntity || '';
    this._drainPumpEntity = config.drainPumpEntity || '';
    this._irrigationDuration = config.irrigationDuration || 60;
    this._drainDuration = config.drainDuration || 60;
    this._soilTriggerPercent = config.soilTriggerPercent ?? null;
    this._dailyVolumeCapLiters = config.dailyVolumeCapLiters ?? null;
    this._maxCyclesPerDay = config.maxCyclesPerDay ?? null;
    this._skipDuringDark = config.skipDuringDark ?? false;
    this._pauseOnLowTank = config.pauseOnLowTank ?? true;
    this._logToLogbook = config.logToLogbook ?? true;
    this._autoAdvanceP1ToP2 = config.autoAdvanceP1ToP2 ?? false;
    this._autoAdvanceP2ToP3 = config.autoAdvanceP2ToP3 ?? false;
    this._haltOnRunoffEcThreshold = config.haltOnRunoffEcThreshold ?? null;
    this._activePhase = (config.activeSteeringPhase as 'p1' | 'p2' | 'p3') ?? 'p2';

    const strat = this.device.irrigationStrategy;
    this._strategy = {
      enabled: strat?.enabled || false,
      lightsOnTime: strat?.lightsOnTime || '06:00:00',
      p0DurationMinutes: strat?.p0DurationMinutes || 60,
      p2StopBeforeLightsOffMinutes: strat?.p2StopBeforeLightsOffMinutes || 120,
      targetVwcPercent: strat?.targetVwcPercent || 45.0,
      maintenanceDrybackPercent: strat?.maintenanceDrybackPercent || 3.0,
      shotDurationSeconds: strat?.shotDurationSeconds || 15,
      shotIntervalMinutes: strat?.shotIntervalMinutes || 15,
      autoLightTracking: strat?.autoLightTracking ?? false,
      detectedLightsOnTime: strat?.detectedLightsOnTime ?? null,
    };

    const dc = this.device.drainConfig;
    if (dc) {
      this._drainEcEnabled = dc.enabled;
      this._drainEcMaxDelta = dc.maxEcDelta;
      this._drainEcTargetRunoffPercent = dc.targetRunoffPercent;
    }

    const ranges = config.ecTargetRanges;
    if (ranges && ranges.length > 0) {
      this._ecTargetRanges = (['seedling', 'veg', 'flower_early', 'flower_mid', 'flower_late'] as const).map((stage) => {
        const found = ranges.find((r) => r.stage === stage);
        return found ?? { stage, minEc: 0, maxEc: 0 };
      });
    }
  }

  // ─── Save actions ─────────────────────────────────────────────────────────

  /** Single footer save — flushes all dirty state across tabs. */
  private async _saveAll() {
    await this._saveSettings();
    await this._saveStrategy();
    await this._saveDrainConfig();
    await this._saveEcTargetRanges();
  }

  private async _saveEcTargetRanges() {
    if (!this.device?.deviceId || !this._dataService) return;
    await this._dataService.setEcTargetRanges(this.device.deviceId, this._ecTargetRanges);
  }

  private async _saveSettings() {
    if (!this.device?.deviceId || !this.store) return;
    await setIrrigationSettings(this.store.context, {
      growspaceId: this.device.deviceId,
      irrigationPumpEntity: this._irrigationPumpEntity,
      drainPumpEntity: this._drainPumpEntity,
      irrigationDuration: this._irrigationDuration,
      drainDuration: this._drainDuration,
      soilTriggerPercent: this._soilTriggerPercent,
      dailyVolumeCapLiters: this._dailyVolumeCapLiters,
      maxCyclesPerDay: this._maxCyclesPerDay,
      skipDuringDark: this._skipDuringDark,
      pauseOnLowTank: this._pauseOnLowTank,
      logToLogbook: this._logToLogbook,
      autoAdvanceP1ToP2: this._autoAdvanceP1ToP2,
      autoAdvanceP2ToP3: this._autoAdvanceP2ToP3,
      haltOnRunoffEcThreshold: this._haltOnRunoffEcThreshold,
      activeSteeringPhase: this._activePhase,
    });
  }

  private async _fetchStageAnalytics() {
    if (!this.device?.deviceId || !this._dataService) return;
    const result = await this._dataService.getIrrigationAnalytics(this.device.deviceId);
    this._stageAggregates = result?.stage_aggregates ?? null;
  }

  private async _handleRunNow() {
    if (!this.device?.deviceId || !this.store) return;
    this._runNowSaving = true;
    try {
      await runIrrigationCycle(this.store.context, { growspaceId: this.device.deviceId });
    } finally {
      this._runNowSaving = false;
    }
  }

  private async _saveStrategy() {
    if (!this.device?.deviceId || !this._dataService) return;
    try {
      await this._dataService.setIrrigationStrategy(this.device.deviceId, this._strategy);
    } catch (e) {
      console.error('Failed to save strategy:', e);
    }
  }

  private async _saveDrainConfig() {
    if (!this.device?.deviceId || !this._dataService) return;
    this._drainSaving = true;
    try {
      await this._dataService.configureDrainMonitoring(this.device.deviceId, {
        enabled: this._drainEcEnabled,
        maxEcDelta: this._drainEcMaxDelta,
        targetRunoffPercent: this._drainEcTargetRunoffPercent,
      });
    } catch (e) {
      this._showErrorToast('Failed to save drain config');
    } finally {
      this._drainSaving = false;
    }
  }

  // ─── Schedule mutations ───────────────────────────────────────────────────

  private async _addIrrigationTime(time: string, duration?: number) {
    if (!this.device?.deviceId || !this.store) return;
    const formattedTime = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    this._addingIrrigationTime = undefined;
    await addIrrigationTime(this.store.context, {
      growspaceId: this.device.deviceId,
      time: formattedTime,
      duration: duration || this._irrigationDuration,
    });
  }

  private async _removeIrrigationTime(time: string) {
    if (!this.device?.deviceId || !this.store) return;
    await removeIrrigationTime(this.store.context, { growspaceId: this.device.deviceId, time });
  }

  private async _addDrainTime(time: string, duration?: number) {
    if (!this.device?.deviceId || !this.store) return;
    const formattedTime = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    this._addingDrainTime = undefined;
    try {
      await addDrainTime(this.store.context, {
        growspaceId: this.device.deviceId,
        time: formattedTime,
        duration: duration || this._drainDuration,
      });
    } catch (e) {
      this.store.ui.showToast('Failed to add drain time', 'error');
    }
  }

  private async _removeDrainTime(time: string) {
    if (!this.device?.deviceId || !this.store) return;
    try {
      await removeDrainTime(this.store.context, { growspaceId: this.device.deviceId, time });
    } catch (e) {
      this.store.ui.showToast('Failed to remove drain time', 'error');
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
    this._addingIrrigationTime = {
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      duration: this._irrigationDuration,
    };
  }

  private _startAddingDrainTime(x: number, width: number) {
    const pct = Math.max(0, Math.min(1, x / width));
    const totalMinutes = Math.round(pct * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    this._addingDrainTime = {
      time: `${h.toString().padStart(2, '00')}:${m.toString().padStart(2, '00')}`,
      duration: this._drainDuration,
    };
  }

  private _startEditingIrrigationTime(timeStr: string, duration: number) {
    this._editingIrrigationTime = {
      originalTime: timeStr,
      originalDuration: duration,
      time: timeStr.substring(0, 5),
      duration,
    };
  }

  private _startEditingDrainTime(timeStr: string, duration: number) {
    this._editingDrainTime = {
      originalTime: timeStr,
      originalDuration: duration,
      time: timeStr.substring(0, 5),
      duration,
    };
  }

  private async _saveEditedIrrigationTime() {
    if (!this._editingIrrigationTime || !this.device?.deviceId || !this.store) return;
    const { originalTime, time, duration } = this._editingIrrigationTime;
    const formatted = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    if (originalTime !== formatted) {
      const existing = this.device.irrigationConfig?.irrigationTimes || [];
      if (existing.some((t) => t.time === formatted)) {
        this.store.ui.showToast(`Irrigation time ${time} already exists`, 'error');
        return;
      }
    }
    this._editingIrrigationTime = undefined;
    await removeIrrigationTime(this.store.context, { growspaceId: this.device.deviceId, time: originalTime });
    await addIrrigationTime(this.store.context, { growspaceId: this.device.deviceId, time: formatted, duration });
  }

  private async _saveEditedDrainTime() {
    if (!this._editingDrainTime || !this.device?.deviceId || !this.store) return;
    const { originalTime, time, duration } = this._editingDrainTime;
    const formatted = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    if (originalTime !== formatted) {
      const existing = this.device.irrigationConfig?.drainTimes || [];
      if (existing.some((t) => t.time === formatted)) {
        this.store.ui.showToast(`Drain time ${time} already exists`, 'error');
        return;
      }
    }
    this._editingDrainTime = undefined;
    await removeDrainTime(this.store.context, { growspaceId: this.device.deviceId, time: originalTime });
    await addDrainTime(this.store.context, { growspaceId: this.device.deviceId, time: formatted, duration });
  }

  private async _deleteIrrigationTimeFromEdit() {
    if (!this._editingIrrigationTime || !this.device?.deviceId || !this.store) return;
    const { originalTime } = this._editingIrrigationTime;
    this._editingIrrigationTime = undefined;
    try {
      await removeIrrigationTime(this.store.context, { growspaceId: this.device.deviceId, time: originalTime });
    } catch (e) {
      this.store.ui.showToast('Failed to remove irrigation time', 'error');
    }
  }

  private async _deleteDrainTimeFromEdit() {
    if (!this._editingDrainTime || !this.device?.deviceId || !this.store) return;
    const { originalTime } = this._editingDrainTime;
    this._editingDrainTime = undefined;
    try {
      await removeDrainTime(this.store.context, { growspaceId: this.device.deviceId, time: originalTime });
    } catch (e) {
      this.store.ui.showToast('Failed to remove drain time', 'error');
    }
  }

  private _close() {
    this._editingIrrigationTime = undefined;
    this._editingDrainTime = undefined;
    this._errorToast = undefined;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _showErrorToast(message: string) {
    this._errorToast = message;
    setTimeout(() => { this._errorToast = undefined; }, 5000);
  }

  private _updateStrategyField(field: keyof IrrigationStrategy, value: string | number | boolean) {
    this._strategy = { ...this._strategy, [field]: value };
  }

  private async _handleResetWaterTracking() {
    if (!this.device?.deviceId || !this._dataService) return;
    const confirmed = window.confirm(
      'Are you sure you want to reset all water tracking data for this growspace? This includes today\'s usage counters and volume history.'
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
    if (this._drainLogFeedEc <= 0 || this._drainLogDrainEc <= 0) {
      this._showErrorToast('Feed EC and Drain EC must be > 0');
      return;
    }
    this._drainLogging = true;
    try {
      await this._dataService.logDrainReading(this.device.deviceId, {
        feedEc: this._drainLogFeedEc,
        drainEc: this._drainLogDrainEc,
        feedVolumeMl: this._drainLogFeedVolume || undefined,
        drainVolumeMl: this._drainLogDrainVolume || undefined,
      });
    } catch (e) {
      this._showErrorToast('Failed to log drain reading');
    } finally {
      this._drainLogging = false;
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
      .filter((s) => domains.includes(s.entity_id.split('.')[0]))
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id)
      );
  }

  private _renderEntitySelect(label: string, value: string, domains: string[], changeHandler: (e: Event) => void) {
    const entities = this._getEntities(domains);
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <select class="md3-input" .value=${value} @change=${changeHandler}>
          <option value="">None</option>
          ${entities.map((e) => html`
            <option value="${e.entity_id}" ?selected=${e.entity_id === value}>
              ${e.attributes.friendly_name || e.entity_id} (${e.entity_id})
            </option>
          `)}
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
      { id: 'schedules',       label: 'Schedules',       group: 'Daily Cycle' },
      { id: 'steering',        label: 'Crop Steering',   group: 'Daily Cycle' },
      { id: 'config',          label: 'Configuration',   group: 'Equipment'   },
      { id: 'tanks',           label: 'Tanks',            group: 'Equipment',   badge: tankCount || undefined },
      { id: 'water_analytics', label: 'Water Analytics', group: 'Telemetry'   },
      { id: 'drain_ec',        label: 'Drain EC',         group: 'Telemetry'   },
      { id: 'ec_targets',      label: 'EC Targets',       group: 'Telemetry'   },
    ];
    const visibleNav = NAV.filter((n) => visible.includes(n.id));
    const currentLabel = visibleNav.find((n) => n.id === this._activeTab)?.label ?? '';

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
            <div class="v1-rail">
              ${this._renderSidebarNav(visibleNav)}
            </div>

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
                ${this._setupHints.length > 0 ? html`
                  <div class="setup-hints">
                    ${this._setupHints.map((h) => html`
                      <div class="setup-hint">
                        <span class="hint-icon">${h.icon}</span>
                        <span>${h.text}</span>
                      </div>
                    `)}
                  </div>
                ` : nothing}
              </div>
            </div>
          </div>

          <!-- Persistent footer -->
          <div class="dlg-footer">
            <div class="dlg-footer-meta">
              <span>Last cycle ${this.device?.lastCycleTimestamp
                ? new Date(this.device.lastCycleTimestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                : '—'}</span>
              <span class="sep">·</span>
              <span>Next ${this.device?.nextScheduledCycle
                ? new Date(this.device.nextScheduledCycle).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                : '—'}</span>
            </div>
            <div class="dlg-footer-actions">
              <button class="md3-button text" @click=${this._close}>Close</button>
              <button
                class="md3-button tonal"
                ?disabled=${this._runNowSaving}
                @click=${this._handleRunNow}
              >${this._runNowSaving ? 'Starting…' : 'Run Now'}</button>
              <button
                class="md3-button primary btn-save-all"
                style="background: ${dialogColor};"
                @click=${this._saveAll}
              >Save Changes</button>
            </div>
          </div>

          ${this._errorToast ? html`
            <div class="toast-notification error">
              <span class="toast-message">${this._errorToast}</span>
            </div>
          ` : ''}
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
            class="v1-nav-item ${this._activeTab === item.id ? 'active' : ''}"
            data-tab="${item.id}"
            @click=${() => { this._activeTab = item.id; }}
          >
            <span style="flex:1;">${item.label}</span>
            ${item.badge != null ? html`<span class="nav-badge">${item.badge}</span>` : nothing}
          </div>
        `;
      })}
    `;
  }

  private _renderActiveTab(color: string) {
    switch (this._activeTab) {
      case 'schedules':       return this._renderSchedulesTab(color);
      case 'steering':        return this._renderSteeringTab(color);
      case 'config':          return this._renderConfigSection();
      case 'tanks':           return this._renderTanksTab();
      case 'water_analytics': return this._renderWaterAnalyticsTab();
      case 'drain_ec':        return this._renderDrainECTab();
      case 'ec_targets':      return this._renderEcTargetsTab();
      default:                return nothing;
    }
  }

  // ─── Schedules tab ────────────────────────────────────────────────────────

  private _computeCropSteeringCycle(): Array<{ time: string; duration: number }> {
    const s = this._strategy;
    if (!s.lightsOnTime || !s.shotIntervalMinutes || !s.shotDurationSeconds) return [];

    const isFlower = (this.device?.biologicalMetrics?.flowerWeek ?? 0) > 0;
    const lightHours = isFlower ? 12 : 18;

    const [hh, mm] = s.lightsOnTime.split(':').map(Number);
    const lightsOnMin = hh * 60 + (mm || 0);
    const lightsOffMin = lightsOnMin + lightHours * 60;
    const firstShotMin = lightsOnMin + (s.p0DurationMinutes ?? 0);
    const cutoffMin = lightsOffMin - (s.p2StopBeforeLightsOffMinutes ?? 0);

    const shots: Array<{ time: string; duration: number }> = [];
    for (let t = firstShotMin; t < cutoffMin; t += s.shotIntervalMinutes) {
      const h = Math.floor(t / 60) % 24;
      const m = t % 60;
      shots.push({
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        duration: s.shotDurationSeconds,
      });
    }
    return shots;
  }

  private _fmtMin(minutes: number): string {
    const h = Math.floor((minutes / 60) % 24);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private _computePhases() {
    const s = this._strategy;
    if (!s.lightsOnTime) return null;
    const isFlower = (this.device?.biologicalMetrics?.flowerWeek ?? 0) > 0;
    const lightHours = isFlower ? 12 : 18;
    const [hh, mm] = s.lightsOnTime.split(':').map(Number);
    const lightsOnMin = hh * 60 + (mm || 0);
    const lightsOffMin = lightsOnMin + lightHours * 60;
    const p1End = lightsOnMin + (s.p0DurationMinutes ?? 60);
    const p3Start = Math.max(p1End, lightsOffMin - (s.p2StopBeforeLightsOffMinutes ?? 120));
    return {
      lightsOnMin,
      lightsOffMin,
      lightHours,
      phases: [
        { id: 'p1', label: 'P1', name: 'Saturation',  start: lightsOnMin, end: p1End,        color: '#4CAF50', target: 'Reach FC' },
        { id: 'p2', label: 'P2', name: 'Maintenance', start: p1End,       end: p3Start,      color: '#2196F3', target: 'Runoff target' },
        { id: 'p3', label: 'P3', name: 'Dryback',     start: p3Start,     end: lightsOffMin, color: '#FF9800', target: `−${s.maintenanceDrybackPercent ?? 3}% VWC` },
      ],
    };
  }

  private _renderCropSteeringSchedule(color: string) {
    const shots = this._computeCropSteeringCycle();
    const phases = this._computePhases();
    const nowMinutes = this._getNowMinutes();
    const day = 1440;

    if (!phases) {
      return html`
        <div class="detail-card crop-steering-schedule">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
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

    // Axis anchored 2 hours before lights-on so the active cycle is always visible
    const viewStart = (lightsOnMin - 120 + 1440) % 1440;
    const pctAt = (m: number) => ((m % 1440 - viewStart + 1440) % 1440) / day * 100;

    // VWC sparkline — computed in view-offset space to avoid midnight wrap artifacts
    const target = this._strategy.targetVwcPercent ?? 45;
    const dryback = this._strategy.maintenanceDrybackPercent ?? 3;
    const fc = target + 7;
    const base = fc - dryback - 5;
    const lightsOnOffset = 120;
    const lightsOffOffset = lightsOnOffset + lightHours * 60;
    const p1EndOffset = lightsOnOffset + (this._strategy.p0DurationMinutes ?? 60);
    const p3StartOffset = Math.max(p1EndOffset, lightsOffOffset - (this._strategy.p2StopBeforeLightsOffMinutes ?? 120));

    const vwcPts: Array<{ offset: number; v: number }> = [];
    for (let offset = 0; offset <= day; offset += 8) {
      let v: number;
      if (offset < lightsOnOffset) {
        v = base + Math.sin(offset / 300) * 0.8;
      } else if (offset < p1EndOffset) {
        const pct = (offset - lightsOnOffset) / Math.max(1, p1EndOffset - lightsOnOffset);
        v = base + pct * (fc - base);
      } else if (offset < p3StartOffset) {
        const pct = (offset - p1EndOffset) / Math.max(1, p3StartOffset - p1EndOffset);
        v = fc - pct * (dryback * 0.25) + Math.sin((offset - p1EndOffset) * 0.25) * (dryback * 0.35);
      } else if (offset < lightsOffOffset) {
        const pct = (offset - p3StartOffset) / Math.max(1, lightsOffOffset - p3StartOffset);
        v = (fc - dryback * 0.25) - pct * (dryback * 0.9);
      } else {
        const pct = (offset - lightsOffOffset) / Math.max(1, day - lightsOffOffset);
        v = (fc - dryback) - pct * 3;
      }
      vwcPts.push({ offset, v: Math.max(0, Math.min(100, v)) });
    }

    const svgW = 1000;
    const svgH = 52;
    const padL = 6;
    const padR = 6;
    const padT = 8;
    const padB = 10;
    const iW = svgW - padL - padR;
    const iH = svgH - padT - padB;
    const vMin = target - 10;
    const vMax = target + 14;
    const xAt = (offset: number) => padL + (offset / day) * iW;
    const yAt = (v: number) => padT + iH - Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin))) * iH;
    const fcY = yAt(fc);
    const linePath = vwcPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.offset).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${xAt(day).toFixed(1)},${(padT + iH).toFixed(1)} L${xAt(0).toFixed(1)},${(padT + iH).toFixed(1)} Z`;
    const nowOffset = (nowMinutes - viewStart + 1440) % 1440;
    const nowX = xAt(nowOffset).toFixed(1);

    return html`
      <div class="detail-card crop-steering-schedule">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <h3 style="margin:0;">Crop Steering Schedule</h3>
            <gs-help-tooltip
              content="Auto-generated irrigation shots based on your VWC strategy settings. Read-only — edit timing in the Steering tab."
              placement="top"
              label="Crop Steering Schedule"
            ></gs-help-tooltip>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.75rem;opacity:0.55;">${p2ShotCount} shots · ${lightHours}h photoperiod</span>
            <span class="auto-pill"><span class="pulse-dot"></span>Auto</span>
          </div>
        </div>

        <div class="cs-timeline">

          <!-- Phase strip -->
          <div class="cs-phase-strip">
            <div class="cs-phase-block dark" style="left:0%;width:${pctAt(lightsOnMin)}%;">
              <div class="cs-phase-num">Dark</div>
              <div class="cs-phase-meta">${this._fmtMin(viewStart)}–${this._fmtMin(lightsOnMin)} · no irrigation</div>
            </div>
            ${phases.phases.map((p) => html`
              <div
                class="cs-phase-block"
                style="left:${pctAt(p.start)}%;width:${((p.end - p.start) / day) * 100}%;background:${p.color}22;border-left:1px solid ${p.color}88;"
              >
                <div class="cs-phase-num" style="color:${p.color};">
                  ${p.label} <span class="cs-phase-nm">· ${p.name}</span>
                </div>
                <div class="cs-phase-meta">${this._fmtMin(p.start)}–${this._fmtMin(p.end)} · ${p.target}</div>
              </div>
            `)}
            <div class="cs-phase-block dark" style="left:${pctAt(lightsOffMin)}%;width:${100 - pctAt(lightsOffMin)}%;">
              <div class="cs-phase-num">Dark</div>
              <div class="cs-phase-meta">${this._fmtMin(lightsOffMin)}–${this._fmtMin(viewStart)}</div>
            </div>
          </div>

          <!-- Main track: phase bands + shots + now line -->
          <div class="cs-track">
            <div class="cs-photoperiod" style="left:${pctAt(lightsOnMin)}%;width:${((lightsOffMin - lightsOnMin) / day) * 100}%;"></div>

            ${phases.phases.map((p) => html`
              <div
                class="cs-phase-bg"
                style="left:${pctAt(p.start)}%;width:${((p.end - p.start) / day) * 100}%;background:${p.color}1a;border-left:1px dashed ${p.color}55;"
              >
                <span class="cs-phase-bg-lbl" style="color:${p.color}cc;">${p.label}</span>
              </div>
            `)}

            ${Array.from({ length: 24 }, (_, h) => h).map((h) => html`
              <div class="grid-v ${h % 6 === 0 ? 'major' : ''}" style="left:${pctAt(h * 60)}%;"></div>
              ${h % 3 === 0 ? html`
                <span class="x-label" style="left:${pctAt(h * 60)}%;">${h.toString().padStart(2, '0')}:00</span>
              ` : nothing}
            `)}

            ${shots.map((shot) => {
              const [shh, smm] = shot.time.split(':').map(Number);
              const startMin = shh * 60 + smm;
              const leftPct = pctAt(startMin);
              const widthPct = (shot.duration / 86400) * 100;
              const isPast = startMin < nowMinutes;
              return html`
                <div
                  class="cs-event ${isPast ? 'completed' : ''}"
                  style="left:${leftPct}%;width:max(${widthPct}%,4px);background:${color};box-shadow:0 0 0 1px ${color}99,0 2px 4px ${color}55;"
                  title="${shot.time.substring(0, 5)} · ${shot.duration}s"
                ></div>
              `;
            })}

            <div class="cs-now-line" style="left:${pctAt(nowMinutes)}%;"></div>
          </div>

          <!-- VWC sparkline -->
          <div class="cs-vwc">
            <span class="cs-vwc-label">Substrate VWC · modeled</span>
            <svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
              <defs>
                <linearGradient id="vwcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(76,175,80,0.3)" />
                  <stop offset="100%" stop-color="rgba(76,175,80,0)" />
                </linearGradient>
              </defs>
              <line x1="${xAt(0)}" x2="${xAt(day)}" y1="${fcY}" y2="${fcY}" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3 3" />
              <text x="${(xAt(day) - 4).toFixed(0)}" y="${(fcY - 3).toFixed(0)}" text-anchor="end" font-size="8" fill="rgba(255,255,255,0.4)">FC ${fc.toFixed(0)}%</text>
              <path d="${areaPath}" fill="url(#vwcGrad)" />
              <path d="${linePath}" fill="none" stroke="#4CAF50" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="${nowX}" x2="${nowX}" y1="${padT}" y2="${padT + iH}" stroke="#FF9800" stroke-dasharray="2 2" />
            </svg>
          </div>

          <!-- Phase legend -->
          <div class="cs-legend">
            ${phases.phases.map((p) => html`
              <span class="cs-leg-chip">
                <span class="cs-leg-dot" style="background:${p.color};"></span>
                <strong>${p.label}</strong> ${p.name}${p.id === 'p2' ? html` · ${p2ShotCount} shots` : nothing} · ${p.target}
              </span>
            `)}
            <span class="cs-leg-chip">
              <span style="width:8px;height:8px;border-radius:50%;background:rgba(255,235,59,0.85);flex-shrink:0;"></span>
              ${this._fmtMin(lightsOnMin)}–${this._fmtMin(lightsOffMin)} · ${lightHours}h photoperiod
            </span>
          </div>

          ${shots.length === 0 ? html`
            <p style="font-size:0.8rem;opacity:0.6;text-align:center;margin-top:4px;">
              No shots computed — check lights-on time and interval in the Steering tab.
            </p>
          ` : nothing}

        </div>
      </div>
    `;
  }

  private _renderSchedulesTab(color: string) {
    const drainTimes = this.device?.irrigationConfig?.drainTimes || [];
    const isCropSteering = !!this._strategy.enabled;

    return html`
      ${isCropSteering ? html`
        <div class="info-banner banner-cs">
          <svg style="width:14px;height:14px;flex-shrink:0;" viewBox="0 0 24 24">
            <path d="${MDI_INFO}"></path>
          </svg>
          <div>
            <strong>Crop Steering is active</strong> — irrigation cycles are computed automatically from VWC targets.
            <a
              href="#"
              style="color:#4CAF50;margin-left:4px;"
              @click=${(e: Event) => { e.preventDefault(); this._activeTab = 'steering'; }}
            >Open Crop Steering →</a>
          </div>
        </div>
        ${this._renderCropSteeringSchedule(color)}
      ` : html`
        ${this._renderScheduleSection('Irrigation Schedule', this.device?.irrigationConfig?.irrigationTimes || [], this._irrigationDuration, 'irrigation', color)}
      `}

      ${this._renderScheduleSection('Drain Schedule', drainTimes, this._drainDuration, 'drain', '#FF9800')}

      ${!isCropSteering ? html`
        <div class="info-banner nudge-card">
          <svg style="width:14px;height:14px;flex-shrink:0;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${MDI_INFO}"></path>
          </svg>
          <div>
            Enable <strong>Crop Steering</strong> in the Steering tab to switch from a fixed daily plan to a phase-driven schedule that adapts to VWC targets.
            <a
              href="#"
              style="color:var(--stage-color,${color});margin-left:4px;"
              @click=${(e: Event) => { e.preventDefault(); this._activeTab = 'steering'; }}
            >Open Crop Steering →</a>
          </div>
        </div>
      ` : nothing}
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
    const addingTime = type === 'irrigation' ? this._addingIrrigationTime : this._addingDrainTime;
    const editingTime = type === 'irrigation' ? this._editingIrrigationTime : this._editingDrainTime;
    const chipClass = type === 'irrigation' ? 'irrig-chip' : 'drain-chip';

    const validTimes = times.filter((t) => t && (t.time || t.start_time));

    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
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
            if (type === 'irrigation') this._startAddingIrrigationTime(e.clientX - rect.left, rect.width);
            else this._startAddingDrainTime(e.clientX - rect.left, rect.width);
          }}
        >
          ${Array.from({ length: 25 }, (_, i) => i).map((h) => html`
            <div class="grid-v ${h % 6 === 0 ? 'major' : ''}" style="left:${(h / 24) * 100}%;"></div>
            ${h % 3 === 0 ? html`
              <span class="x-label" style="left:${(h / 24) * 100}%;">
                ${h.toString().padStart(2, '0')}:00
              </span>
            ` : nothing}
          `)}

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
                ${isPast ? html`
                  <svg style="width:12px;height:12px;fill:#4caf50;flex-shrink:0;" viewBox="0 0 24 24">
                    <path d="${MDI_CHECK}"></path>
                  </svg>
                ` : nothing}
                ${timeStr.substring(0, 5)}
                <span class="chip-dur">· ${Math.max(1, Math.round(dur / 60))}m</span>
                <button
                  class="chip-remove"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    if (type === 'irrigation') this._removeIrrigationTime(timeStr).catch(() => {});
                    else this._removeDrainTime(timeStr).catch(() => {});
                  }}
                  title="Remove"
                >×</button>
              </span>
            `;
          })}
          <button class="time-chip new-chip" @click=${() => this._openAddTimeDialog(type)}>
            + New
          </button>
        </div>

        <!-- Add overlay -->
        ${addingTime ? html`
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
                  if (type === 'irrigation' && this._addingIrrigationTime)
                    this._addingIrrigationTime = { ...this._addingIrrigationTime, time: val };
                  if (type === 'drain' && this._addingDrainTime)
                    this._addingDrainTime = { ...this._addingDrainTime, time: val };
                }}
              ></md3-text-input>
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
                <span>${type === 'irrigation' ? 'Shot Duration (seconds)' : 'Drain Duration (seconds)'}</span>
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
                    if (type === 'irrigation' && this._addingIrrigationTime)
                      this._addingIrrigationTime = { ...this._addingIrrigationTime, duration: val };
                    if (type === 'drain' && this._addingDrainTime)
                      this._addingDrainTime = { ...this._addingDrainTime, duration: val };
                  }
                }}
              ></md3-number-input>
              <div class="button-group">
                <button class="md3-button tonal" @click=${() => this._cancelAddTime(type)}>Cancel</button>
                <button
                  class="md3-button primary"
                  @click=${() => {
                    if (type === 'irrigation') this._addIrrigationTime(addingTime.time, addingTime.duration).catch(() => {});
                    else this._addDrainTime(addingTime.time, addingTime.duration).catch(() => {});
                  }}
                  style="background:${color};"
                >Add Schedule</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Edit overlay -->
        ${editingTime ? html`
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
                  if (type === 'irrigation' && this._editingIrrigationTime)
                    this._editingIrrigationTime = { ...this._editingIrrigationTime, time: val };
                  if (type === 'drain' && this._editingDrainTime)
                    this._editingDrainTime = { ...this._editingDrainTime, time: val };
                }}
              ></md3-text-input>
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);">
                <span>${type === 'irrigation' ? 'Shot Duration (seconds)' : 'Drain Duration (seconds)'}</span>
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
                    if (type === 'irrigation' && this._editingIrrigationTime)
                      this._editingIrrigationTime = { ...this._editingIrrigationTime, duration: val };
                    if (type === 'drain' && this._editingDrainTime)
                      this._editingDrainTime = { ...this._editingDrainTime, duration: val };
                  }
                }}
              ></md3-number-input>
              <div class="edit-dialog-buttons">
                <button
                  class="md3-button delete-button"
                  @click=${() => type === 'irrigation' ? this._deleteIrrigationTimeFromEdit() : this._deleteDrainTimeFromEdit()}
                >Delete</button>
                <div class="spacer"></div>
                <div class="action-buttons">
                  <button class="md3-button tonal" @click=${() => this._cancelEditTime(type)}>Cancel</button>
                  <button
                    class="md3-button primary"
                    @click=${() => type === 'irrigation' ? this._saveEditedIrrigationTime() : this._saveEditedDrainTime()}
                    style="background:${color};"
                  >Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private _openAddTimeDialog(type: 'irrigation' | 'drain') {
    if (type === 'irrigation') {
      this._addingIrrigationTime = { time: '12:00', duration: this._irrigationDuration };
    } else {
      this._addingDrainTime = { time: '12:00', duration: this._drainDuration };
    }
  }

  private _cancelAddTime(type: 'irrigation' | 'drain') {
    if (type === 'irrigation') this._addingIrrigationTime = undefined;
    else this._addingDrainTime = undefined;
  }

  private _cancelEditTime(type: 'irrigation' | 'drain') {
    if (type === 'irrigation') this._editingIrrigationTime = undefined;
    else this._editingDrainTime = undefined;
  }

  private _handlePhaseCardClick(phaseId: 'p1' | 'p2' | 'p3') {
    if (this._activePhase === phaseId) {
      return;
    }
    this._pendingPhase = phaseId;
    this._phaseConfirmOpen = true;
  }

  private _confirmPhaseChange() {
    if (this._pendingPhase) {
      this._activePhase = this._pendingPhase;
    }
    this._pendingPhase = undefined;
    this._phaseConfirmOpen = false;
    this._saveSettings();
  }

  private _cancelPhaseChange() {
    this._pendingPhase = undefined;
    this._phaseConfirmOpen = false;
  }

  // ─── Steering tab ─────────────────────────────────────────────────────────

  private _renderSteeringTab(_color: string) {
    return html`
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
          ${([
            { id: 'p1', label: 'P1', name: 'Saturation', desc: 'Bring substrate to field capacity through frequent short shots.' },
            { id: 'p2', label: 'P2', name: 'Maintenance', desc: 'Maintain EC and irrigate to plant uptake — runoff target.' },
            { id: 'p3', label: 'P3', name: 'Dryback', desc: 'Final stretch of the photoperiod — controlled substrate dry.' },
          ] as const).map((p) => html`
            <div
              class="phase-card ${this._activePhase === p.id ? 'active' : ''}"
              @click=${() => this._handlePhaseCardClick(p.id)}
            >
              <div class="phase-num">Phase · ${p.label}</div>
              <div class="phase-nm">${p.name}</div>
              <div class="phase-desc">${p.desc}</div>
            </div>
          `)}
        </div>
      </div>

      <!-- VWC strategy parameters -->
      <div class="detail-card">
        <h3 style="margin-top:0;">VWC Strategy Configuration</h3>
        <p style="font-size:0.8rem;opacity:0.7;margin-bottom:20px;">
          Enable logic-based irrigation based on volumetric water content (VWC) targets.
          Overrides basic schedules when active.
        </p>

        <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:12px;">
          <span>Enable VWC Steering</span>
          <md3-switch
            data-field="enabled"
            .checked=${this._strategy.enabled}
            @change=${(e: Event) => this._updateStrategyField('enabled', (e.target as HTMLInputElement).checked)}
          ></md3-switch>
        </div>

        ${(this.device?.environmentAttributes?.lightSensors?.length ?? 0) > 0 ? html`
          <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:12px;">
            <span>Auto Track from Light Sensor</span>
            <md3-switch
              data-field="autoLightTracking"
              .checked=${!!this._strategy.autoLightTracking}
              @change=${(e: Event) => this._updateStrategyField('autoLightTracking', (e.target as HTMLInputElement).checked)}
            ></md3-switch>
          </div>
        ` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="grid-column:span 2;border-bottom:1px solid rgba(255,255,255,0.1);margin:4px 0;"></div>
          <h4 style="grid-column:span 2;margin:4px 0;">Targets</h4>

          <md3-number-input
            label="Target VWC (%)"
            .value=${this._strategy.targetVwcPercent}
            @change=${(e: CustomEvent) => this._updateStrategyField('targetVwcPercent', parseFloat(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="Dryback (%)"
            .value=${this._strategy.maintenanceDrybackPercent}
            @change=${(e: CustomEvent) => this._updateStrategyField('maintenanceDrybackPercent', parseFloat(e.detail))}
          ></md3-number-input>

          <h4 style="grid-column:span 2;margin:4px 0;margin-top:12px;">Timing</h4>

          <div style="display:flex;align-items:center;gap:8px;">
            <md3-text-input
              label="Lights On Time"
              type="time"
              data-scroll-target="lightsOnTime"
              .value=${this._strategy.lightsOnTime}
              @change=${(e: CustomEvent) => this._updateStrategyField('lightsOnTime', (e.target as HTMLInputElement).value || e.detail)}
            ></md3-text-input>
            ${this._strategy.detectedLightsOnTime ? html`
              <span class="auto-lights-badge">auto: ${this._strategy.detectedLightsOnTime}</span>
            ` : ''}
          </div>
          <md3-number-input
            label="P0 Duration (min)"
            .value=${this._strategy.p0DurationMinutes}
            @change=${(e: CustomEvent) => this._updateStrategyField('p0DurationMinutes', parseInt(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="P2 Stop Buffer (min)"
            .value=${this._strategy.p2StopBeforeLightsOffMinutes}
            @change=${(e: CustomEvent) => this._updateStrategyField('p2StopBeforeLightsOffMinutes', parseInt(e.detail))}
          ></md3-number-input>

          <h4 style="grid-column:span 2;margin:4px 0;margin-top:12px;">Dosing</h4>

          <md3-number-input
            label="Shot Duration (sec)"
            .value=${this._strategy.shotDurationSeconds}
            @change=${(e: CustomEvent) => this._updateStrategyField('shotDurationSeconds', parseInt(e.detail))}
          ></md3-number-input>
          <md3-number-input
            label="Shot Interval (min)"
            .value=${this._strategy.shotIntervalMinutes}
            @change=${(e: CustomEvent) => this._updateStrategyField('shotIntervalMinutes', parseInt(e.detail))}
          ></md3-number-input>
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
              .checked=${this._autoAdvanceP1ToP2}
              @change=${(e: Event) => { this._autoAdvanceP1ToP2 = (e.target as any).checked; }}
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
              .checked=${this._autoAdvanceP2ToP3}
              @change=${(e: Event) => { this._autoAdvanceP2ToP3 = (e.target as any).checked; }}
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
              .checked=${this._haltOnRunoffEcThreshold !== null}
              @change=${(e: Event) => {
                this._haltOnRunoffEcThreshold = (e.target as any).checked ? 4.0 : null;
              }}
            ></md3-switch>
          </div>
          ${this._haltOnRunoffEcThreshold !== null ? html`
            <div style="margin-top:10px;">
              <md3-number-input
                data-field="haltOnRunoffEcValue"
                label="EC Threshold"
                min="0.1"
                step="0.1"
                .value=${String(this._haltOnRunoffEcThreshold)}
                @change=${(e: CustomEvent) => {
                  const v = parseFloat(e.detail ?? (e.target as any).value);
                  if (!isNaN(v)) this._haltOnRunoffEcThreshold = v;
                }}
              ></md3-number-input>
            </div>
          ` : nothing}
        </div>
      </div>

      <!-- Phase trigger confirmation dialog -->
      <gs-dialog
        .open=${this._phaseConfirmOpen}
        heading="Confirm Phase Transition"
        .iconPath=${mdiAlert}
        stageColor="var(--warning-color, #ff9800)"
        @close=${this._cancelPhaseChange}
      >
        <div style="padding: 20px;">
          <p style="margin: 0 0 12px 0;">
            Are you sure you want to transition from <strong>${this._activePhase.toUpperCase()}</strong> to <strong>${this._pendingPhase?.toUpperCase() || ''}</strong>?
          </p>
          <p style="margin: 0; font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">
            Manually shifting phases overrides the current schedule instantly. This is a severe change that will disrupt timing and dosing parameters.
          </p>
        </div>
        <div class="button-group" style="padding: 16px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
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
            this._irrigationPumpEntity,
            ['switch', 'input_boolean'],
            (e) => { this._irrigationPumpEntity = (e.target as HTMLSelectElement).value; }
          )}
          ${this._renderEntitySelect(
            'Drain Pump (Optional)',
            this._drainPumpEntity,
            ['switch', 'input_boolean'],
            (e) => { this._drainPumpEntity = (e.target as HTMLSelectElement).value; }
          )}
        </div>
      </div>

      <div class="detail-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h3 style="margin:0;">Cycle Parameters</h3>
          <gs-help-tooltip message="Optional safety limits. Leave blank to disable."></gs-help-tooltip>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
          <div class="md3-input-group">
            <label class="md3-label">Soil Trigger (%)</label>
            <input
              class="md3-input"
              type="number"
              min="0" max="100" step="1"
              .value=${this._soilTriggerPercent != null ? String(this._soilTriggerPercent) : ''}
              placeholder="Off"
              @change=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                this._soilTriggerPercent = v ? parseFloat(v) : null;
              }}
            />
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Daily Volume Cap (L)</label>
            <input
              class="md3-input"
              type="number"
              min="0" step="0.1"
              .value=${this._dailyVolumeCapLiters != null ? String(this._dailyVolumeCapLiters) : ''}
              placeholder="Off"
              @change=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                this._dailyVolumeCapLiters = v ? parseFloat(v) : null;
              }}
            />
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Max Cycles / Day</label>
            <input
              class="md3-input"
              type="number"
              min="0" step="1"
              .value=${this._maxCyclesPerDay != null ? String(this._maxCyclesPerDay) : ''}
              placeholder="Off"
              @change=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                this._maxCyclesPerDay = v ? parseInt(v, 10) : null;
              }}
            />
          </div>
        </div>
      </div>

      <div class="detail-card">
        <h3 style="margin:0 0 14px;">Behaviour</h3>
        ${([
          {
            label: 'Skip During Dark Period',
            desc: 'No cycles between lights-off and lights-on',
            get: () => this._skipDuringDark,
            set: (v: boolean) => { this._skipDuringDark = v; },
          },
          {
            label: 'Pause on Tank Low',
            desc: 'Halt cycles when any tank is below warning level',
            get: () => this._pauseOnLowTank,
            set: (v: boolean) => { this._pauseOnLowTank = v; },
          },
          {
            label: 'Log to Logbook',
            desc: 'Record start, duration, and moisture delta per cycle',
            get: () => this._logToLogbook,
            set: (v: boolean) => { this._logToLogbook = v; },
          },
        ]).map((row) => html`
          <div class="stub-row" style="margin-bottom:8px;">
            <div>
              <div class="stub-row-label">${row.label}</div>
              <div class="stub-row-desc">${row.desc}</div>
            </div>
            <md3-switch
              .checked=${row.get()}
              @change=${(e: CustomEvent) => { row.set((e.target as any).checked); }}
            ></md3-switch>
          </div>
        `)}
      </div>

      <div class="detail-card">
        <h3 style="margin:0 0 14px;">Manual Override</h3>
        <div style="display:flex;align-items:center;gap:12px;">
          <button
            class="action-btn${this._runNowSaving ? ' saving' : ''}"
            ?disabled=${this._runNowSaving}
            @click=${this._handleRunNow}
          >
            ${this._runNowSaving ? 'Starting…' : '▶ Run Now'}
          </button>
          <span style="font-size:12px;opacity:0.55;">
            Triggers one irrigation cycle immediately, bypassing the schedule.
          </span>
        </div>
      </div>
    `;
  }

  // ─── Tanks tab ────────────────────────────────────────────────────────────

  private _renderTanksTab() {
    const tanks = this.device?.environmentAttributes?.irrigationTanks || [];

    if (tanks.length === 0) {
      return html`
        <div class="detail-card" style="text-align:center;padding:40px;">
          <p style="opacity:0.7;">No irrigation tanks configured for this growspace.</p>
          <p style="font-size:0.9rem;opacity:0.5;">
            Configure tank sensors in the Environment Settings to monitor tank levels.
          </p>
        </div>
      `;
    }

    return html`
      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">Tank Levels</h3>
          <span style="font-size:11px;opacity:0.45;">Updates every 30 s</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${tanks.map((tank: any) => this._renderTankRow(tank))}
        </div>
      </div>
    `;
  }

  private _renderTankRow(tank: any) {
    const pct = tank.fillLevel ?? 0;
    const isWarning = tank.isWarning;
    const color = isWarning ? '#f44336'
      : (tank.hoursRemaining ?? 999) < 24 ? '#FF9800'
        : '#4caf50';
    const depletionLabel = tank.depletionStatus === 'depleting' ? '↓ Depleting'
      : tank.depletionStatus === 'refilling' ? '↑ Refilling'
        : tank.depletionStatus === 'static' ? '— Stable'
          : '';

    return html`
      <div class="tank-row ${isWarning ? 'warning' : ''}">
        <div class="tank-row-info">
          <div class="tank-row-name">${tank.name}</div>
          <div class="tank-bar-track">
            <div
              class="tank-bar-fill"
              style="width:${Math.max(0, Math.min(100, pct))}%;background:${color};"
            ></div>
          </div>
        </div>
        <div class="tank-row-stat">
          <div class="tank-row-pct" style="color:${color};">
            ${tank.fillLevel !== null && tank.fillLevel !== undefined ? `${pct.toFixed(0)}%` : 'N/A'}
            ${isWarning ? html`<span style="margin-left:4px;">⚠️</span>` : nothing}
          </div>
          ${(depletionLabel || tank.hoursRemaining != null) ? html`
            <div class="tank-row-sub">
              ${depletionLabel ? html`${depletionLabel}${tank.hoursRemaining != null ? ' · ' : ''}` : nothing}
              ${tank.hoursRemaining != null
                ? (tank.hoursRemaining >= 48 ? Math.floor(tank.hoursRemaining / 24) + 'd' : Math.round(tank.hoursRemaining) + 'h') + ' left'
                : nothing}
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  // ─── Water Analytics tab ──────────────────────────────────────────────────

  private _renderWaterAnalyticsTab() {
    const wu = this.device?.waterUsage;
    const tanks = this.device?.environmentAttributes?.irrigationTanks || [];
    const irrigTimes = this.device?.irrigationConfig?.irrigationTimes || [];
    const drainTimes = this.device?.irrigationConfig?.drainTimes || [];
    const readings = this.device?.drainConfig?.readings || [];
    const hasPump = !!(this.device?.irrigationConfig?.irrigationPumpEntity || this.device?.irrigationConfig?.drainPumpEntity);
    const hasTankSensors = tanks.some((t: any) => t.sensorEntity);

    const recentReadings = readings.slice(-30).reverse();
    const readingsWithVolumes = recentReadings.filter((r: any) => r.feedVolumeMl && r.drainVolumeMl);
    const totalFeedMl = readingsWithVolumes.reduce((s: number, r: any) => s + (r.feedVolumeMl || 0), 0);
    const totalDrainMl = readingsWithVolumes.reduce((s: number, r: any) => s + (r.drainVolumeMl || 0), 0);
    const avgRunoff = totalFeedMl > 0 ? (totalDrainMl / totalFeedMl) * 100 : null;

    const tanksWithData = tanks.filter((t: any) => t.fillLevel !== null && t.fillLevel !== undefined);
    const avgTankLevel = tanksWithData.length > 0
      ? tanksWithData.reduce((s: number, t: any) => s + (t.fillLevel ?? 0), 0) / tanksWithData.length
      : null;
    const warningTanks = tanks.filter((t: any) => t.isWarning);

    const totalIrrig = irrigTimes.length;
    const totalDrain = drainTimes.length;
    const irrigDuration = this.device?.irrigationConfig?.irrigationDuration ?? 0;
    const drainDuration = this.device?.irrigationConfig?.drainDuration ?? 0;

    const tanksWithHistory = tanks.filter((t: any) => t.volumeLiters != null && t.waterHistory?.events?.length);
    const allTankEvents: TankWaterEvent[] = tanksWithHistory.flatMap((t: any) => t.waterHistory!.events);
    const now = new Date();
    const allDaily7d = tanksWithHistory.flatMap((t: any) => t.waterHistory!.daily_7d ?? []);
    const todayKey = now.toISOString().slice(0, 10);
    const tankLitersToday = allDaily7d.filter((d: any) => d.date === todayKey).reduce((s: number, d: any) => s + d.consumed, 0);
    const tankLiters7d = allDaily7d.reduce((s: number, d: any) => s + d.consumed, 0);
    const daysWithData = new Set(allDaily7d.filter((d: any) => d.consumed > 0).map((d: any) => d.date)).size;
    const tankAvgPerDay = daysWithData > 0 ? tankLiters7d / daysWithData : 0;

    const bucket15Min = 15 * 60 * 1000;
    const bucketCount24h = 96;
    const chartEnd = Math.ceil(now.getTime() / bucket15Min) * bucket15Min;
    const chartStart = chartEnd - bucketCount24h * bucket15Min;
    const consumptionBuckets24h = Array.from({ length: bucketCount24h }, (_, i) => ({ start: chartStart + i * bucket15Min, liters: 0 }));
    for (const ev of allTankEvents) {
      if ((ev as any).event_type !== 'consumption') continue;
      const ts = new Date((ev as any).timestamp).getTime();
      if (ts < chartStart || ts >= chartEnd) continue;
      const idx = Math.floor((ts - chartStart) / bucket15Min);
      if (idx >= 0 && idx < bucketCount24h) consumptionBuckets24h[idx].liters += (ev as any).liters;
    }
    const maxBucketLiters = Math.max(...consumptionBuckets24h.map((b) => b.liters), 0.01);
    const recentRefills = allTankEvents.filter((e: any) => e.event_type === 'refill').slice(-10).reverse();

    const kpiCard = (label: string, value: string, unit: string, color = 'rgba(255,255,255,0.7)', sub?: string) => html`
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:0.78rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span style="font-size:1.6rem;font-weight:700;color:${color};">${value}</span>
          <span style="font-size:0.82rem;opacity:0.6;">${unit}</span>
        </div>
        ${sub ? html`<div style="font-size:0.75rem;opacity:0.5;">${sub}</div>` : nothing}
      </div>
    `;

    const lastCycle = this.device?.lastCycleTimestamp
      ? new Date(this.device.lastCycleTimestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      : null;
    const nextCycle = this.device?.nextScheduledCycle
      ? new Date(this.device.nextScheduledCycle).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      : null;
    const cyclesToday = this.device?.cyclesToday ?? 0;
    const volToday = this.device?.volumeDispensedToday ?? 0;

    return html`
      ${hasPump ? html`
        <div class="detail-card">
          <h3 style="margin-top:0;margin-bottom:16px;">Cycle Telemetry</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:0;">
            ${kpiCard('Cycles today', String(cyclesToday), '', '#4fc3f7')}
            ${kpiCard('Dispensed today', volToday > 0 ? volToday.toFixed(2) : '—', volToday > 0 ? 'L' : '', '#81c784')}
            ${lastCycle ? kpiCard('Last cycle', lastCycle, '', 'rgba(255,255,255,0.7)') : kpiCard('Last cycle', '—', '', 'rgba(255,255,255,0.4)')}
            ${nextCycle ? kpiCard('Next cycle', nextCycle, '', '#ce93d8') : kpiCard('Next cycle', '—', '', 'rgba(255,255,255,0.4)')}
          </div>
        </div>
      ` : nothing}

      ${hasPump ? html`
        <div class="detail-card">
          <h3 style="margin-top:0;margin-bottom:16px;">Today's Usage</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
            ${wu?.litersToday != null ? kpiCard('Liters today', wu.litersToday.toFixed(1), 'L', '#4fc3f7') : kpiCard('Liters today', '—', '', 'rgba(255,255,255,0.4)')}
            ${wu?.litersPerPlantPerDay != null ? kpiCard('Per plant / day', wu.litersPerPlantPerDay.toFixed(2), 'L', '#81c784') : kpiCard('Per plant / day', '—', '', 'rgba(255,255,255,0.4)')}
            ${wu?.waterEfficiency != null
              ? kpiCard('Water efficiency', (wu.waterEfficiency * 100).toFixed(0), '%',
                  wu.waterEfficiency >= 0.85 ? '#4caf50' : wu.waterEfficiency >= 0.65 ? '#FF9800' : '#f44336',
                  wu.waterEfficiency >= 0.85 ? 'Excellent' : wu.waterEfficiency >= 0.65 ? 'Good' : 'Review schedule')
              : kpiCard('Water efficiency', '—', '', 'rgba(255,255,255,0.4)')}
            ${avgRunoff !== null
              ? kpiCard('Avg runoff', avgRunoff.toFixed(1), '%', '#ce93d8', `from ${readingsWithVolumes.length} reading${readingsWithVolumes.length !== 1 ? 's' : ''}`)
              : kpiCard('Avg runoff', '—', '', 'rgba(255,255,255,0.4)', 'Log volumes in Drain EC tab')}
          </div>
        </div>
      ` : nothing}

      ${tanks.length > 0 ? html`
        <div class="detail-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;">Tank Levels</h3>
            ${warningTanks.length > 0 ? html`
              <span style="background:rgba(244,67,54,0.2);color:#f44336;border:1px solid rgba(244,67,54,0.4);border-radius:20px;padding:3px 10px;font-size:0.78rem;font-weight:600;">
                ⚠ ${warningTanks.length} tank${warningTanks.length > 1 ? 's' : ''} low
              </span>
            ` : avgTankLevel !== null ? html`
              <span style="font-size:0.82rem;opacity:0.5;">Avg ${avgTankLevel.toFixed(0)}%</span>
            ` : nothing}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${tanks.map((tank: any) => {
              const pct = tank.fillLevel ?? 0;
              const c = tank.isWarning ? '#f44336' : (tank.hoursRemaining ?? 999) < 24 ? '#FF9800' : '#4caf50';
              return html`
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">
                    <span style="font-weight:500;">${tank.name}</span>
                    <span style="color:${c};font-weight:600;">${tank.fillLevel !== null ? pct.toFixed(0) + '%' : '—'}</span>
                  </div>
                  <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${Math.max(0, Math.min(100, pct))}%;background:${c};border-radius:3px;transition:width 0.4s ease;"></div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      ` : nothing}

      ${hasTankSensors && tanksWithHistory.length > 0 ? html`
        <div class="detail-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;">Tank-Derived Water Usage</h3>
            <span style="font-size:0.78rem;opacity:0.5;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.25);border-radius:20px;padding:2px 10px;">inferred from tank level</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            ${kpiCard('Consumed today', tankLitersToday > 0 ? tankLitersToday.toFixed(1) : '—', tankLitersToday > 0 ? 'L' : '', '#4fc3f7')}
            ${kpiCard('Last 7 days', tankLiters7d > 0 ? tankLiters7d.toFixed(1) : '—', tankLiters7d > 0 ? 'L' : '', '#81c784')}
            ${kpiCard('Avg per day', tankAvgPerDay > 0 ? tankAvgPerDay.toFixed(1) : '—', tankAvgPerDay > 0 ? 'L/day' : '', '#ce93d8')}
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:0.78rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Consumption — last 24 hours (15 min buckets)</div>
            <div style="display:flex;align-items:flex-end;gap:1px;height:60px;background:rgba(255,255,255,0.03);border-radius:6px;padding:6px 4px 0;">
              ${consumptionBuckets24h.map((b) => {
                const hp = (b.liters / maxBucketLiters) * 100;
                const label = new Date(b.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
                return html`
                  <div
                    title="${label} — ${b.liters.toFixed(2)} L"
                    style="flex:1;height:${Math.max(2, hp)}%;background:${b.liters > 0 ? '#4fc3f7' : 'rgba(255,255,255,0.06)'};border-radius:2px 2px 0 0;min-width:0;"
                  ></div>
                `;
              })}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.68rem;opacity:0.45;margin-top:4px;padding:0 2px;">
              <span>24h ago</span><span>12h ago</span><span>now</span>
            </div>
          </div>
          ${recentRefills.length > 0 ? html`
            <div style="margin-top:16px;">
              <div style="font-size:0.78rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Recent refills</div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${recentRefills.map((ev: any) => html`
                  <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(129,199,132,0.08);border-radius:6px;padding:5px 10px;font-size:0.82rem;">
                    <span style="opacity:0.65;">${new Date(ev.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style="color:#81c784;font-weight:600;">+${ev.liters.toFixed(1)} L</span>
                  </div>
                `)}
              </div>
            </div>
          ` : nothing}
        </div>
      ` : nothing}

      ${(totalIrrig > 0 || totalDrain > 0) ? html`
        <div class="detail-card">
          <h3 style="margin-top:0;margin-bottom:16px;">Schedule Summary</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div>
              <div style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Irrigation</div>
              ${totalIrrig === 0 ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">No events scheduled</p>` : html`
                <div style="font-size:1.3rem;font-weight:700;color:#4fc3f7;">${totalIrrig} <span style="font-size:0.85rem;font-weight:400;opacity:0.7;">events/day</span></div>
                ${irrigDuration ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">${irrigDuration}s per event</div>` : nothing}
                <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                  ${irrigTimes.slice(0, 5).map((t: IrrigationTime) => {
                    const time = t.time ?? t.start_time ?? '';
                    const dur = t.duration ?? t.duration_seconds ?? irrigDuration;
                    return html`
                      <div style="display:flex;justify-content:space-between;background:rgba(79,195,247,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;">
                        <span style="font-weight:500;">${time.substring(0, 5)}</span>
                        <span style="opacity:0.5;">${dur}s</span>
                      </div>
                    `;
                  })}
                  ${totalIrrig > 5 ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">+${totalIrrig - 5} more</div>` : nothing}
                </div>
              `}
            </div>
            <div>
              <div style="font-size:0.8rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Drain</div>
              ${totalDrain === 0 ? html`<p style="opacity:0.5;font-size:0.85rem;margin:0;">No events scheduled</p>` : html`
                <div style="font-size:1.3rem;font-weight:700;color:#a5d6a7;">${totalDrain} <span style="font-size:0.85rem;font-weight:400;opacity:0.7;">events/day</span></div>
                ${drainDuration ? html`<div style="font-size:0.82rem;opacity:0.6;margin-top:2px;">${drainDuration}s per event</div>` : nothing}
                <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
                  ${drainTimes.slice(0, 5).map((t: IrrigationTime) => {
                    const time = t.time ?? t.start_time ?? '';
                    const dur = t.duration ?? t.duration_seconds ?? drainDuration;
                    return html`
                      <div style="display:flex;justify-content:space-between;background:rgba(165,214,167,0.08);border-radius:6px;padding:4px 10px;font-size:0.8rem;">
                        <span style="font-weight:500;">${time.substring(0, 5)}</span>
                        <span style="opacity:0.5;">${dur}s</span>
                      </div>
                    `;
                  })}
                  ${totalDrain > 5 ? html`<div style="font-size:0.75rem;opacity:0.4;text-align:center;">+${totalDrain - 5} more</div>` : nothing}
                </div>
              `}
            </div>
          </div>
        </div>
      ` : nothing}

      ${this._stageAggregates && Object.keys(this._stageAggregates).length > 0 ? html`
        <div class="detail-card">
          <h3 style="margin:0 0 14px;">Water Usage by Growth Stage</h3>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${Object.entries(this._stageAggregates)
              .sort(([, a], [, b]) => b - a)
              .map(([stage, liters]) => html`
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 14px;font-size:0.88rem;">
                  <span style="text-transform:capitalize;font-weight:500;">${stage}</span>
                  <span style="color:#4fc3f7;font-weight:600;">${liters.toFixed(1)} L</span>
                </div>
              `)}
          </div>
        </div>
      ` : nothing}

      ${this._drainPumpEntity ? html`
        <div class="detail-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;">Volume History</h3>
            <span style="font-size:0.8rem;opacity:0.5;">from drain EC readings</span>
          </div>
          ${readingsWithVolumes.length === 0 ? html`
            <p style="opacity:0.6;text-align:center;padding:20px 0;font-size:0.9rem;">
              No volume data logged yet.<br>
              <span style="font-size:0.8rem;opacity:0.7;">Log feed and drain volumes in the <strong>Drain EC</strong> tab.</span>
            </p>
          ` : html`
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 16px;font-size:0.88rem;">
              <div style="text-align:center;"><div style="opacity:0.5;font-size:0.75rem;">Total feed</div><div style="font-weight:700;color:#4fc3f7;">${(totalFeedMl / 1000).toFixed(1)} L</div></div>
              <div style="text-align:center;"><div style="opacity:0.5;font-size:0.75rem;">Total drain</div><div style="font-weight:700;color:#a5d6a7;">${(totalDrainMl / 1000).toFixed(1)} L</div></div>
              <div style="text-align:center;"><div style="opacity:0.5;font-size:0.75rem;">Avg runoff</div><div style="font-weight:700;color:${avgRunoff !== null && avgRunoff >= 15 && avgRunoff <= 35 ? '#4caf50' : '#FF9800'};">${avgRunoff !== null ? avgRunoff.toFixed(1) + '%' : '—'}</div></div>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.15);opacity:0.7;">
                    <th style="text-align:left;padding:5px 8px;font-weight:500;">Time</th>
                    <th style="text-align:right;padding:5px 8px;font-weight:500;">Feed (mL)</th>
                    <th style="text-align:right;padding:5px 8px;font-weight:500;">Drain (mL)</th>
                    <th style="text-align:right;padding:5px 8px;font-weight:500;">Runoff</th>
                    <th style="text-align:right;padding:5px 8px;font-weight:500;">Δ EC</th>
                  </tr>
                </thead>
                <tbody>
                  ${readingsWithVolumes.map((r: any) => {
                    const runoff = r.feedVolumeMl ? ((r.drainVolumeMl! / r.feedVolumeMl!) * 100) : null;
                    const delta = r.drainEc - r.feedEc;
                    const runoffOk = runoff !== null && runoff >= 10 && runoff <= 40;
                    return html`
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                        <td style="padding:5px 8px;opacity:0.65;">${new Date(r.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style="text-align:right;padding:5px 8px;">${r.feedVolumeMl}</td>
                        <td style="text-align:right;padding:5px 8px;">${r.drainVolumeMl}</td>
                        <td style="text-align:right;padding:5px 8px;font-weight:600;color:${runoffOk ? '#4caf50' : '#FF9800'};">${runoff !== null ? runoff.toFixed(1) + '%' : '—'}</td>
                        <td style="text-align:right;padding:5px 8px;opacity:0.7;">${delta >= 0 ? '+' : ''}${delta.toFixed(2)}</td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          `}
        </div>
      ` : nothing}

      <div class="detail-card" style="border:1px dashed rgba(244,67,54,0.3);background:rgba(244,67,54,0.05);margin-top:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div style="flex:1;">
            <h3 style="margin:0;color:#f44336;border:none;padding:0;font-size:1.1rem;">Maintenance</h3>
            <p style="margin:4px 0 0 0;font-size:0.85rem;opacity:0.7;line-height:1.4;">
              Reset irrigation counters, today's water usage, and recent volume history for this growspace.
            </p>
          </div>
          <button class="md3-button tonal error" @click=${this._handleResetWaterTracking} style="white-space:nowrap;">
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
    const lastDelta = lastReading ? (lastReading.drainEc - lastReading.feedEc) : null;
    const isOverThreshold = lastDelta !== null && this._drainEcEnabled && lastDelta > this._drainEcMaxDelta;

    const statusColor = !this._drainEcEnabled ? 'rgba(255,255,255,0.3)'
      : isOverThreshold ? '#f44336'
        : lastDelta !== null && lastDelta > this._drainEcMaxDelta * 0.7 ? '#FF9800'
          : '#4caf50';

    const statusText = !this._drainEcEnabled ? 'Monitoring disabled'
      : lastDelta === null ? 'No readings yet'
        : isOverThreshold ? `Salt buildup alert — Δ${lastDelta.toFixed(2)} mS/cm above threshold`
          : `EC OK — Δ${lastDelta.toFixed(2)} mS/cm`;

    return html`
      <div class="detail-card" style="border-left:4px solid ${statusColor};padding:16px 20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:14px;height:14px;border-radius:50%;background:${statusColor};box-shadow:0 0 8px ${statusColor};flex-shrink:0;"></div>
          <div>
            <div style="font-weight:600;font-size:1rem;">${statusText}</div>
            ${lastReading ? html`
              <div style="font-size:0.8rem;opacity:0.6;margin-top:2px;">
                Last reading: Feed ${lastReading.feedEc.toFixed(2)} → Drain ${lastReading.drainEc.toFixed(2)} mS/cm
                at ${new Date(lastReading.timestamp).toLocaleString()}
              </div>
            ` : nothing}
          </div>
        </div>
      </div>

      <div class="detail-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;">Monitoring Configuration</h3>
          ${this._drainSaving ? html`<span style="font-size:0.8rem;opacity:0.6;">Saving…</span>` : nothing}
        </div>
        <p style="font-size:0.82rem;opacity:0.7;margin-bottom:20px;">
          Alert when drain EC exceeds feed EC by more than the max delta.
        </p>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;margin-bottom:16px;">
          <span>Enable EC drain monitoring</span>
          <md3-switch
            .checked=${this._drainEcEnabled}
            @change=${(e: Event) => { this._drainEcEnabled = (e.target as HTMLInputElement).checked; }}
          ></md3-switch>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <md3-number-input
            label="Max EC Delta (mS/cm)"
            .value=${this._drainEcMaxDelta}
            step="0.1" min="0.1"
            ?disabled=${!this._drainEcEnabled}
            @change=${(e: CustomEvent) => { this._drainEcMaxDelta = parseFloat(e.detail) || 1.0; }}
          ></md3-number-input>
          <md3-number-input
            label="Target Runoff (%)"
            .value=${this._drainEcTargetRunoffPercent}
            min="5" max="50" step="5"
            ?disabled=${!this._drainEcEnabled}
            @change=${(e: CustomEvent) => { this._drainEcTargetRunoffPercent = parseInt(e.detail) || 20; }}
          ></md3-number-input>
        </div>
      </div>

      <div class="detail-card">
        <h3 style="margin-top:0;">Log Drain Reading</h3>
        <p style="font-size:0.82rem;opacity:0.7;margin-bottom:20px;">
          Manually log feed EC and drain EC values measured with a handheld meter. Volumes are optional.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <md3-number-input label="Feed EC (mS/cm)" .value=${this._drainLogFeedEc} step="0.1" min="0"
            @change=${(e: CustomEvent) => { this._drainLogFeedEc = parseFloat(e.detail) || 0; }}></md3-number-input>
          <md3-number-input label="Drain EC (mS/cm)" .value=${this._drainLogDrainEc} step="0.1" min="0"
            @change=${(e: CustomEvent) => { this._drainLogDrainEc = parseFloat(e.detail) || 0; }}></md3-number-input>
          <md3-number-input label="Feed Volume (mL) — optional" .value=${this._drainLogFeedVolume} step="100" min="0"
            @change=${(e: CustomEvent) => { this._drainLogFeedVolume = parseInt(e.detail) || 0; }}></md3-number-input>
          <md3-number-input label="Drain Volume (mL) — optional" .value=${this._drainLogDrainVolume} step="100" min="0"
            @change=${(e: CustomEvent) => { this._drainLogDrainVolume = parseInt(e.detail) || 0; }}></md3-number-input>
        </div>
        ${this._drainLogFeedEc > 0 && this._drainLogDrainEc > 0 ? html`
          <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:10px 16px;margin-bottom:16px;display:flex;gap:24px;align-items:center;font-size:0.9rem;">
            <span>EC Delta: <strong style="color:${(this._drainLogDrainEc - this._drainLogFeedEc) > this._drainEcMaxDelta ? '#f44336' : '#4caf50'}">
              Δ${(this._drainLogDrainEc - this._drainLogFeedEc).toFixed(2)} mS/cm
            </strong></span>
            ${this._drainLogFeedVolume > 0 && this._drainLogDrainVolume > 0 ? html`
              <span>Runoff: <strong>${((this._drainLogDrainVolume / this._drainLogFeedVolume) * 100).toFixed(1)}%</strong></span>
            ` : nothing}
          </div>
        ` : nothing}
        <button
          class="md3-button primary"
          style="background:#FF9800;"
          @click=${this._logDrainReadingNow}
          ?disabled=${this._drainLogging || this._drainLogFeedEc <= 0 || this._drainLogDrainEc <= 0}
        >${this._drainLogging ? 'Logging…' : 'Log Reading'}</button>
      </div>

      <div class="detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;">Recent Readings</h3>
          <span style="font-size:0.8rem;opacity:0.5;">${readings.length} total</span>
        </div>
        ${recent.length === 0 ? html`
          <p style="opacity:0.6;text-align:center;padding:20px 0;">No readings logged yet.</p>
        ` : html`
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
                  const overThreshold = this._drainEcEnabled && delta > this._drainEcMaxDelta;
                  const runoffPct = r.feedVolumeMl && r.drainVolumeMl
                    ? ((r.drainVolumeMl / r.feedVolumeMl) * 100).toFixed(1) + '%'
                    : '—';
                  return html`
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                      <td style="padding:6px 8px;opacity:0.7;">${new Date(r.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style="text-align:right;padding:6px 8px;">${r.feedEc.toFixed(2)}</td>
                      <td style="text-align:right;padding:6px 8px;">${r.drainEc.toFixed(2)}</td>
                      <td style="text-align:right;padding:6px 8px;color:${overThreshold ? '#f44336' : delta > this._drainEcMaxDelta * 0.7 ? '#FF9800' : '#4caf50'};font-weight:500;">
                        ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                      </td>
                      <td style="text-align:right;padding:6px 8px;opacity:0.6;">${runoffPct}</td>
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

  // ─── EC Targets tab (stub) ────────────────────────────────────────────────

  private _renderEcTargetsTab() {
    const stageLabels: Record<string, string> = {
      seedling:     'Seedling',
      veg:          'Veg',
      flower_early: 'Early Flower',
      flower_mid:   'Mid Flower',
      flower_late:  'Late Flower / Flush',
    };
    return html`
      <div class="detail-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;">
          <h3 style="margin:0;border:none;padding:0;">EC Targets per Stage</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--secondary-text-color);margin:0 0 16px;">
          Set feed EC target ranges (min / max) per growth stage. Save with the footer button.
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;font-size:0.8rem;color:var(--secondary-text-color);">Stage</th>
              <th style="text-align:left;padding:6px 8px;font-size:0.8rem;color:var(--secondary-text-color);">Min EC (mS/cm)</th>
              <th style="text-align:left;padding:6px 8px;font-size:0.8rem;color:var(--secondary-text-color);">Max EC (mS/cm)</th>
            </tr>
          </thead>
          <tbody>
            ${this._ecTargetRanges.map((range, idx) => html`
              <tr class="ec-target-row" style="border-top:1px solid var(--divider-color,rgba(255,255,255,0.07));">
                <td style="padding:8px;">
                  <span class="ec-stage-label" style="font-weight:500;">${stageLabels[range.stage] ?? range.stage}</span>
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
                      this._ecTargetRanges = this._ecTargetRanges.map((r, i) =>
                        i === idx ? { ...r, minEc: val } : r
                      );
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
                      this._ecTargetRanges = this._ecTargetRanges.map((r, i) =>
                        i === idx ? { ...r, maxEc: val } : r
                      );
                    }}
                  />
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}
