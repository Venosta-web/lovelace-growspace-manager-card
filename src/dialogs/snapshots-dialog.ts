import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import {
  mdiAlertCircleOutline,
  mdiCamera,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClose,
  mdiCompare,
  mdiDownload,
  mdiEye,
  mdiFullscreen,
  mdiPause,
  mdiPlay,
  mdiRefresh,
  mdiWeatherNight,
} from '@mdi/js';
import { hassContext, storeContext } from '../context';
import { SnapshotsDialogState } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import {
  type Snapshot,
  type VisionCheckupResult,
  getSnapshots,
  captureSnapshot,
  getVisionHistory,
  triggerVisionCheckup,
} from '../slices/camera';
import { withToast } from '../slices/ui';
import '../features/shared/ui';
import type { GrowspaceStore } from '../store/core/growspace-store';
import type { GrowspaceDevice } from '../services/types';
import {
  createSnapshotsDialogViewModel,
  type FrameViewModel,
  type HeroViewModel,
  type SnapshotsDialogViewModel,
  type SnapshotsViewModelDeps,
} from '../features/camera/viewmodels/snapshots-dialog.viewmodel';
import { createInitialSM, transition, type SM, type SMEvent } from './snapshots-dialog-sm';

/** Inline placeholder for a snapshot the browser cannot load (pruned, still writing). */
const BROKEN_IMAGE_FALLBACK =
  "this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Cpath fill=\\'%23666\\' d=\\'M21,17H7V3H21M21,1H7A2,2 0 0,0 5,3V17A2,2 0 0,0 7,19H21A2,2 0 0,0 23,17V3A2,2 0 0,0 21,1M3,5H1V21A2,2 0 0,0 3,23H19V21H3V5M15.96,10.29L13.21,13.83L11.25,11.47L8.5,15H19.5L15.96,10.29Z\\'/%3E%3C/svg%3E'";

/** Timelapse step. Slow enough to read the frame, fast enough to see growth. */
const PLAYBACK_INTERVAL_MS = 700;

@customElement('snapshots-dialog')
export class SnapshotsDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: SnapshotsDialogState | undefined;
  @property({ type: String }) public growspaceName = '';
  /** Supplies the photoperiod that marks a capture as taken in the dark. */
  @property({ attribute: false }) public device: GrowspaceDevice | undefined;

  @state() private _snapshots: Snapshot[] = [];
  @state() private _visionHistory: VisionCheckupResult[] = [];
  @state() private _isLoading = false;
  @state() private _isCapturing = false;
  @state() private _isRunningCheckup = false;
  @state() private _loadError: string | null = null;
  @state() private _actionError: string | null = null;
  @state() private _sm: SM = createInitialSM();

  private _playbackTimer: ReturnType<typeof setInterval> | undefined;
  private _loadRequestId = 0;
  private _actionContextId = 0;
  private _captureRequestId = 0;
  private _checkupRequestId = 0;
  private _overlayReturnFocus: HTMLElement | null = null;

  static styles = [
    dialogStyles,
    css`
      /* ── Shell ─────────────────────────────────────────────────────────── */

      .snap-body {
        flex: 1;
        min-height: 0;
        display: flex;
      }

      /* ── Header actions ────────────────────────────────────────────────── */

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .header-actions .md3-button {
        min-height: 44px;
      }

      .mobile-actions {
        display: none;
      }

      .md3-button.outlined {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
        padding: 0 18px;
      }

      .md3-button ha-svg-icon {
        width: 18px;
        height: 18px;
      }

      .md3-button:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .icon-button {
        width: 44px;
        height: 44px;
        min-width: 44px;
        padding: 10px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--primary-text-color, #fff);
        border-radius: var(--border-radius-sm, 8px);
        display: flex;
        transition: background 0.15s;
      }

      .icon-button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
      }

      .icon-button:disabled {
        opacity: 0.4;
        cursor: default;
      }

      /* ── Vision timeline ───────────────────────────────────────────────── */

      .timeline {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 12px 24px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        background: rgba(0, 0, 0, 0.12);
        flex-shrink: 0;
      }

      .eyebrow {
        font-size: var(--font-size-xs, 0.6875rem);
        font-weight: 500;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
        flex-shrink: 0;
      }

      .timeline-days {
        display: flex;
        gap: 14px;
        flex: 1;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: thin;
      }

      .timeline-day {
        display: flex;
        flex-direction: column;
        gap: 5px;
        flex: 0 0 auto;
        min-width: 0;
      }

      .timeline-ticks {
        display: flex;
        gap: 3px;
      }

      .tick {
        flex: 0 0 44px;
        width: 44px;
        height: 44px;
        border: none;
        padding: 0;
        border-radius: var(--border-radius-full, 9999px);
        cursor: pointer;
        position: relative;
        background: transparent;
        transition: transform 0.15s;
      }

      .tick::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 19px;
        height: 6px;
        border-radius: inherit;
        background: var(--tick-color, rgba(255, 255, 255, 0.14));
      }

      .tick:hover,
      .tick:focus-visible {
        outline: none;
      }

      .tick:hover::before,
      .tick:focus-visible::before {
        transform: scaleY(2);
      }

      .tick.critical {
        --tick-color: var(--severity-critical, #b71c1c);
      }
      .tick.high {
        --tick-color: var(--error-color, #f44336);
      }
      .tick.medium {
        --tick-color: var(--warning-color, #ffa726);
      }
      .tick.low {
        --tick-color: var(--primary-color, #4caf50);
      }

      .tick.selected::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 12px;
        width: 2px;
        height: 20px;
        margin-left: -1px;
        background: var(--on-overlay-primary, #fff);
        border-radius: var(--border-radius-full, 9999px);
      }

      .timeline-daylabel {
        font-size: var(--font-size-xs, 0.6875rem);
        color: var(--text-disabled);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .legend {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-shrink: 0;
        font-size: var(--font-size-xs, 0.6875rem);
        color: var(--text-muted);
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .legend-dot {
        width: 7px;
        height: 7px;
        border-radius: var(--border-radius-full, 9999px);
      }

      .legend-dot.critical {
        background: var(--severity-critical, #b71c1c);
      }
      .legend-dot.high {
        background: var(--error-color, #f44336);
      }
      .legend-dot.medium {
        background: var(--warning-color, #ff9800);
      }
      .legend-dot.low {
        background: var(--primary-color, #4caf50);
      }

      /* ── Viewer ────────────────────────────────────────────────────────── */

      .viewer {
        flex: 1;
        min-width: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        padding: 20px 20px 20px 24px;
        gap: 12px;
        box-sizing: border-box;
        outline: none;
      }

      .viewer:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }

      .stage {
        position: relative;
        flex: 1;
        min-height: 300px;
        border-radius: var(--border-radius-lg, 16px);
        overflow: hidden;
        background: var(--surface-dim, var(--secondary-background-color));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      }

      .stage-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        animation: snapFade 0.25s var(--md3-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1));
      }

      .stage-scrim {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0) 42%),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0) 28%);
      }

      @keyframes snapFade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .stage-tl {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        max-width: calc(100% - 120px);
      }

      .stage-tr {
        position: absolute;
        top: 12px;
        right: 12px;
        display: flex;
        gap: 6px;
      }

      .chip {
        padding: 5px 11px;
        border-radius: var(--border-radius-full, 9999px);
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(12px);
        font-size: var(--font-size-supporting, 0.75rem);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: var(--on-overlay-primary, #fff);
        white-space: nowrap;
      }

      .chip.muted {
        font-weight: 400;
        color: var(--on-overlay-secondary, rgba(255, 255, 255, 0.7));
      }

      .chip.night {
        display: flex;
        align-items: center;
        gap: 5px;
        background: rgba(121, 134, 203, 0.22);
        border: 1px solid rgba(121, 134, 203, 0.45);
        color: var(--cycle-night, #7986cb);
      }

      .chip.night ha-svg-icon {
        width: 13px;
        height: 13px;
      }

      .glass-btn {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: var(--border-radius-full, 9999px);
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(12px);
        color: var(--on-overlay-primary, #fff);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s;
      }

      .glass-btn:hover {
        transform: scale(1.05);
      }

      .glass-btn:active {
        transform: scale(0.95);
      }

      .glass-btn ha-svg-icon {
        width: 19px;
        height: 19px;
      }

      .stage-nav {
        position: absolute;
        top: 50%;
        margin-top: -22px;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: var(--border-radius-full, 9999px);
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
        color: var(--on-overlay-primary, #fff);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s;
      }

      .stage-nav.prev {
        left: 12px;
      }
      .stage-nav.next {
        right: 12px;
      }

      .stage-nav:hover:not(:disabled) {
        transform: scale(1.05);
        background: rgba(0, 0, 0, 0.7);
      }

      .stage-nav:active:not(:disabled) {
        transform: scale(0.95);
      }

      .stage-nav:disabled {
        opacity: 0.3;
        cursor: default;
      }

      .stage-nav ha-svg-icon {
        width: 24px;
        height: 24px;
      }

      .stage-bottom {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .play-btn {
        min-height: 44px;
        padding: 0 14px;
        border: none;
        border-radius: var(--border-radius-full, 9999px);
        background: rgba(255, 255, 255, 0.92);
        color: var(--surface-dim, var(--primary-text-color));
        font-family: inherit;
        font-weight: 500;
        font-size: var(--font-size-sm, 0.875rem);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        transition: transform 0.15s;
      }

      .play-btn:hover:not(:disabled) {
        transform: scale(1.03);
      }

      .play-btn:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .play-btn ha-svg-icon {
        width: 17px;
        height: 17px;
      }

      .day-step {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border-radius: var(--border-radius-full, 9999px);
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(12px);
      }

      .day-step button {
        min-height: 44px;
        padding: 0 11px;
        border: none;
        border-radius: var(--border-radius-full, 9999px);
        background: transparent;
        color: var(--on-overlay-primary, #fff);
        font-family: inherit;
        font-size: var(--font-size-supporting, 0.75rem);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .day-step button:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
      }

      .day-step button:disabled {
        opacity: 0.35;
        cursor: default;
      }

      .day-step ha-svg-icon {
        width: 15px;
        height: 15px;
      }

      /* ── Findings strip ────────────────────────────────────────────────── */

      .findings {
        flex-shrink: 0;
        border-radius: var(--border-radius-md, 12px);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        overflow: hidden;
      }

      .findings-summary {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 14px;
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        color: var(--primary-text-color, #fff);
        min-height: 44px;
      }

      .findings-summary:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      .severity-chip {
        padding: 3px 9px;
        border-radius: var(--border-radius-md, 12px);
        font-size: var(--font-size-xs, 0.6875rem);
        font-weight: 600;
        letter-spacing: 0.3px;
        flex-shrink: 0;
      }

      .severity-chip.critical {
        background: var(--severity-critical, #b71c1c);
        color: var(--on-overlay-primary, #fff);
      }
      .severity-chip.high {
        background: var(--error-dark, #d32f2f);
        color: var(--on-overlay-primary, #fff);
      }
      .severity-chip.medium {
        background: var(--warning-color, #ffa726);
        color: var(--on-warning, #1e1e1e);
      }
      .severity-chip.low {
        background: var(--primary-color, #4caf50);
        color: var(--on-primary, #1e1e1e);
      }

      .findings-text {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .findings-hint {
        font-size: var(--font-size-xs, 0.6875rem);
        color: var(--text-muted);
        flex-shrink: 0;
      }

      .findings-detail {
        padding: 12px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
      }

      .analysis-text {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        line-height: 1.6;
        color: var(--text-secondary);
        text-wrap: pretty;
      }

      .findings-cols {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
      }

      .findings-col {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .findings-col.issues {
        flex: 0 0 auto;
      }

      .findings-col.recs {
        flex: 1 1 300px;
        min-width: 0;
      }

      .issue-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .issue-chip {
        background: var(--error-bg, rgba(244, 67, 54, 0.15));
        color: var(--error-color, #f44336);
        border-radius: var(--border-radius-md, 12px);
        padding: 3px 10px;
        font-size: var(--font-size-supporting, 0.75rem);
      }

      .findings-detail ol {
        margin: 0;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .recommendation-item {
        font-size: var(--font-size-supporting, 0.75rem);
        line-height: 1.5;
        color: var(--text-secondary);
      }

      /* ── Compare ───────────────────────────────────────────────────────── */

      .compare {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .compare-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .compare-label {
        font-size: var(--font-size-supporting, 0.75rem);
        color: var(--text-secondary);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .compare-exit {
        min-height: 44px;
        padding: 0 12px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
        background: transparent;
        color: var(--primary-text-color, #fff);
        font-family: inherit;
        font-size: var(--font-size-supporting, 0.75rem);
        cursor: pointer;
      }

      .compare-exit:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .cmp-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--on-overlay-primary, #fff);
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
        pointer-events: none;
      }

      .cmp-range {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: ew-resize;
        margin: 0;
      }

      .cmp-badge-a {
        position: absolute;
        top: 12px;
        left: 12px;
      }

      .cmp-badge-b {
        position: absolute;
        top: 12px;
        right: 12px;
      }

      /* ── Rail ──────────────────────────────────────────────────────────── */

      .rail {
        width: 344px;
        flex-shrink: 0;
        border-left: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        display: flex;
        flex-direction: column;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.14));
      }

      .rail-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        flex-shrink: 0;
      }

      .rail-head .eyebrow {
        flex: 1;
      }

      .dark-toggle {
        min-height: 44px;
        padding: 0 10px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.16));
        background: transparent;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: var(--font-size-xs, 0.6875rem);
        cursor: pointer;
      }

      .dark-toggle:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--primary-text-color, #fff);
      }

      .rail-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 0 12px 16px;
      }

      .rail-scroll::-webkit-scrollbar {
        width: 8px;
      }

      .rail-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.16);
        border-radius: var(--border-radius-full, 9999px);
      }

      .rail-day {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 14px;
      }

      .rail-day-head {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: baseline;
        gap: 8px;
        padding: 6px 4px;
        background: var(--secondary-background-color, #1a1a1a);
      }

      .rail-day-weekday {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--primary-text-color, #fff);
      }

      .rail-day-date {
        font-size: var(--font-size-xs, 0.6875rem);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .rail-day-rule {
        flex: 1;
        height: 1px;
        background: var(--divider-color, rgba(255, 255, 255, 0.08));
      }

      .rail-day-count {
        font-size: var(--font-size-xs, 0.6875rem);
        color: var(--text-disabled);
      }

      .rail-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .thumb {
        position: relative;
        padding: 0;
        border: none;
        border-radius: var(--border-radius-sm, 8px);
        overflow: hidden;
        aspect-ratio: 1 / 1;
        background: var(--surface-dim, var(--secondary-background-color));
        cursor: pointer;
      }

      .thumb img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .thumb-dim {
        position: absolute;
        inset: 0;
        background: rgba(10, 10, 14, 0.55);
      }

      .thumb-scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0) 55%);
      }

      .thumb-time {
        position: absolute;
        left: 6px;
        bottom: 5px;
        font-size: var(--font-size-xs, 0.6875rem);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: var(--on-overlay-primary, #fff);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
      }

      .thumb-night {
        position: absolute;
        right: 5px;
        bottom: 4px;
        width: 16px;
        height: 16px;
        border-radius: var(--border-radius-full, 9999px);
        background: rgba(121, 134, 203, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--cycle-night, #7986cb);
      }

      .thumb-night ha-svg-icon {
        width: 11px;
        height: 11px;
      }

      .thumb-tone {
        position: absolute;
        left: 5px;
        top: 5px;
        width: 10px;
        height: 10px;
        border-radius: var(--border-radius-full, 9999px);
        border: 1.5px solid rgba(0, 0, 0, 0.5);
      }

      .thumb-tone.critical,
      .thumb-tone.high {
        width: 18px;
        height: 18px;
        border-color: rgba(255, 255, 255, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--on-overlay-primary, #fff);
        font-size: var(--font-size-xs, 0.6875rem);
        font-weight: 700;
      }

      .thumb-tone.critical {
        background: var(--severity-critical, #b71c1c);
      }
      .thumb-tone.high {
        background: var(--error-dark, #d32f2f);
      }
      .thumb-tone.medium {
        background: var(--warning-color, #ff9800);
      }
      .thumb-tone.low {
        background: var(--primary-color, #4caf50);
      }

      .thumb-selected {
        position: absolute;
        inset: 0;
        border-radius: var(--border-radius-sm, 8px);
        border: 2px solid var(--primary-color, #4caf50);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color, 76, 175, 80), 0.25) inset;
        pointer-events: none;
      }

      .thumb-compare {
        position: absolute;
        right: 5px;
        top: 5px;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: var(--border-radius-sm, 8px);
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(12px);
        color: var(--on-overlay-primary, #fff);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
        transition: opacity 0.15s;
      }

      .thumb-compare ha-svg-icon {
        width: 15px;
        height: 15px;
      }

      @media (hover: hover) {
        .thumb-compare {
          opacity: 0;
        }

        .thumb:hover .thumb-compare,
        .thumb-compare:focus-visible {
          opacity: 1;
          background: rgba(var(--rgb-secondary-color, 33, 150, 243), 0.85);
        }
      }

      /* ── Picker overlay ────────────────────────────────────────────────── */

      .overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        box-sizing: border-box;
      }

      .picker {
        width: 620px;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: var(--border-radius-xl, 28px);
        overflow: hidden;
        background: var(--card-background-color, var(--surface-container, #1e1e1e));
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
      }

      .picker-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        background: rgba(0, 0, 0, 0.2);
      }

      .picker-title {
        font-size: var(--font-size-md, 1rem);
        font-weight: 500;
      }

      .picker-sub {
        font-size: var(--font-size-supporting, 0.75rem);
        color: var(--text-secondary);
        margin-top: 2px;
      }

      .picker-grid {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 16px 20px 20px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .picker-item {
        position: relative;
        padding: 0;
        border: none;
        border-radius: var(--border-radius-sm, 8px);
        overflow: hidden;
        aspect-ratio: 1 / 1;
        background: var(--surface-dim, var(--secondary-background-color));
        cursor: pointer;
        transition: transform 0.15s;
        min-width: 44px;
        min-height: 44px;
      }

      .picker-item:hover:not(:disabled) {
        transform: scale(1.04);
      }

      .picker-item img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .picker-item-label {
        position: absolute;
        left: 5px;
        right: 5px;
        bottom: 4px;
        font-size: var(--font-size-xs, 0.6875rem);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: var(--on-overlay-primary, #fff);
        text-align: left;
      }

      .picker-item-a {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--primary-color, #4caf50);
      }

      /* ── Lightbox ──────────────────────────────────────────────────────── */

      .lightbox-backdrop {
        position: absolute;
        inset: 0;
        z-index: 30;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        cursor: zoom-out;
      }

      .lightbox-image {
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: var(--border-radius-sm, 8px);
        cursor: default;
      }

      .lightbox-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(0, 0, 0, 0.5);
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--on-overlay-primary, #fff);
        cursor: pointer;
      }

      /* ── Empty / loading ───────────────────────────────────────────────── */

      .snap-centered {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 48px 24px;
        text-align: center;
      }

      .empty-state {
        opacity: 0.7;
      }

      .empty-state[role='alert'] {
        opacity: 1;
      }

      .empty-state h3 {
        margin: 0;
        font-size: var(--font-size-md, 1rem);
        font-weight: 500;
      }

      .empty-state p {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary);
      }

      .empty-icon {
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }

      .state-copy {
        max-width: 46ch;
        margin: 0;
        color: var(--text-secondary);
        font-size: var(--font-size-sm, 0.875rem);
        line-height: 1.5;
      }

      .retry-btn {
        min-height: 44px;
      }

      .inline-status {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 44px;
        padding: 8px 24px;
        box-sizing: border-box;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        color: var(--text-secondary);
        font-size: var(--font-size-sm, 0.875rem);
      }

      .inline-status.error {
        color: var(--error-color, #f44336);
        background: var(--error-bg, rgba(244, 67, 54, 0.1));
      }

      .inline-status ha-svg-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .inline-status .md3-button {
        min-height: 44px;
        margin-left: auto;
      }

      .icon-button:focus-visible,
      .glass-btn:focus-visible,
      .stage-nav:focus-visible,
      .play-btn:focus-visible,
      .day-step button:focus-visible,
      .findings-summary:focus-visible,
      .compare-exit:focus-visible,
      .dark-toggle:focus-visible,
      .thumb:focus-visible,
      .thumb-compare:focus-visible,
      .picker-item:focus-visible,
      .lightbox-close:focus-visible {
        outline: 2px solid var(--primary-color, #4caf50);
        outline-offset: 2px;
      }

      /* ── Responsive ────────────────────────────────────────────────────── */

      @media (max-width: 860px) {
        .snap-body {
          flex-direction: column;
          overflow-y: auto;
        }

        .viewer {
          padding: 16px;
          min-height: 0;
          flex: 0 0 auto;
        }

        .stage {
          flex: 0 0 auto;
          min-height: 180px;
          aspect-ratio: 16 / 9;
        }

        .rail {
          width: auto;
          border-left: none;
          border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
          max-height: none;
          flex: 0 0 auto;
        }

        .rail-scroll {
          overflow-y: visible;
        }

        .rail-grid {
          grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
        }

        .legend {
          display: none;
        }

        .picker-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 700px) {
        .header-actions {
          display: none;
        }

        .mobile-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
          background: var(--secondary-background-color, rgba(0, 0, 0, 0.12));
        }

        .mobile-actions .md3-button {
          flex: 1 1 0;
          min-width: 0;
          min-height: 44px;
          padding: 0 10px;
        }
      }

      @media (max-width: 600px) {
        .timeline {
          gap: 8px;
          padding: 8px 12px;
        }

        .timeline > .eyebrow {
          display: none;
        }

        .viewer {
          padding: 12px;
        }

        .findings-cols {
          gap: 16px;
        }

        .findings-col.issues,
        .findings-col.recs {
          flex: 1 1 100%;
        }

        .stage-tl {
          max-width: calc(100% - 112px);
        }

        .overlay {
          padding: 12px;
        }

        .picker-grid {
          grid-template-columns: repeat(2, 1fr);
          padding: 12px;
        }
      }
    `,
  ];

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  protected willUpdate(changedProperties: PropertyValues) {
    const previousState = changedProperties.get('dialogState') as SnapshotsDialogState | undefined;
    const opened = changedProperties.has('open') && this.open;
    const growspaceChanged =
      changedProperties.has('dialogState') &&
      previousState?.growspaceId !== this.dialogState?.growspaceId &&
      this.open;

    if (opened || growspaceChanged) {
      this._beginContext();
    }
    if (changedProperties.has('open') && !this.open) {
      this._loadRequestId += 1;
      this._actionContextId += 1;
      this._isCapturing = false;
      this._isRunningCheckup = false;
      this._stopPlayback();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopPlayback();
    window.removeEventListener('keydown', this._onOverlayKeydown, true);
  }

  // ─── Data ───────────────────────────────────────────────────────────────────

  private _beginContext(): void {
    this._loadRequestId += 1;
    this._actionContextId += 1;
    this._stopPlayback();
    this._snapshots = [];
    this._visionHistory = [];
    this._loadError = null;
    this._actionError = null;
    this._isCapturing = false;
    this._isRunningCheckup = false;
    this._sm = createInitialSM();
    this._syncOverlayKeyListener();
    void this._fetchAll();
  }

  private async _fetchAll(growspaceId = this.dialogState?.growspaceId) {
    if (!growspaceId || !this.open || this.dialogState?.growspaceId !== growspaceId) return;
    const requestId = ++this._loadRequestId;

    this._isLoading = true;
    this._loadError = null;
    const [snapshotsResult, visionResult] = await Promise.allSettled([
      getSnapshots(growspaceId),
      getVisionHistory(growspaceId),
    ]);

    if (
      requestId !== this._loadRequestId ||
      this.dialogState?.growspaceId !== growspaceId ||
      !this.open
    ) {
      return;
    }

    this._isLoading = false;

    if (snapshotsResult.status === 'fulfilled') {
      this._snapshots = snapshotsResult.value.snapshots;
      this._transition({
        type: 'FramesLoaded',
        paths: this._snapshots.map((s) => s.path),
      });
    } else {
      console.error('[SnapshotsDialog] Failed to fetch snapshots:', snapshotsResult.reason);
      this.store.ui.showToast('Failed to load snapshots', 'error');
    }

    if (visionResult.status === 'fulfilled') {
      this._visionHistory = visionResult.value.history ?? [];
    } else {
      console.error('[SnapshotsDialog] Failed to fetch vision history:', visionResult.reason);
      this.store.ui.showToast('Failed to load vision history', 'error');
    }

    if (snapshotsResult.status === 'rejected' && visionResult.status === 'rejected') {
      this._loadError = "Camera snapshots couldn't be loaded. Check the connection and try again.";
    } else if (snapshotsResult.status === 'rejected') {
      this._loadError = "Snapshots couldn't be refreshed. Try again when the connection recovers.";
    } else if (visionResult.status === 'rejected') {
      this._loadError =
        "Vision findings couldn't be refreshed. The available captures are still shown.";
    }
  }

  private async _captureSnapshot() {
    if (!this.dialogState?.growspaceId) return;
    const growspaceId = this.dialogState.growspaceId;
    const contextId = this._actionContextId;
    const requestId = ++this._captureRequestId;

    this._isCapturing = true;
    this._actionError = null;
    try {
      await captureSnapshot(growspaceId);
      if (
        contextId !== this._actionContextId ||
        requestId !== this._captureRequestId ||
        !this.open ||
        this.dialogState?.growspaceId !== growspaceId
      ) {
        return;
      }
      await this._fetchAll(growspaceId);
    } catch (err: unknown) {
      if (contextId !== this._actionContextId || requestId !== this._captureRequestId) return;
      console.error('[SnapshotsDialog] Failed to capture snapshot:', err);
      this._actionError =
        "The camera couldn't capture a snapshot. Check the camera connection and try again.";
      this.store.ui.showToast('Failed to capture snapshot', 'error');
    } finally {
      if (contextId === this._actionContextId && requestId === this._captureRequestId) {
        this._isCapturing = false;
      }
    }
  }

  private async _runVisionCheckup() {
    if (!this.dialogState?.growspaceId) return;
    const growspaceId = this.dialogState.growspaceId;
    const contextId = this._actionContextId;
    const requestId = ++this._checkupRequestId;
    this._isRunningCheckup = true;
    this._actionError = null;
    try {
      await withToast(
        async () => {
          await triggerVisionCheckup(growspaceId);
          await this.store.refreshData();
        },
        { success: 'Vision checkup triggered', errorPrefix: 'Failed to trigger checkup' }
      );
      if (
        contextId !== this._actionContextId ||
        requestId !== this._checkupRequestId ||
        !this.open ||
        this.dialogState?.growspaceId !== growspaceId
      ) {
        return;
      }
      await this._fetchAll(growspaceId);
    } catch (err: unknown) {
      if (contextId !== this._actionContextId || requestId !== this._checkupRequestId) return;
      console.error('[SnapshotsDialog] Failed to run vision checkup:', err);
      this._actionError = "The vision checkup couldn't run. Check the connection and try again.";
    } finally {
      if (contextId === this._actionContextId && requestId === this._checkupRequestId) {
        this._isRunningCheckup = false;
      }
    }
  }

  // ─── State machine ──────────────────────────────────────────────────────────

  private _transition(event: SMEvent): void {
    const next = transition(this._sm, event);
    if (next === this._sm) return;
    this._sm = next;
    if (!next.playing) this._stopPlayback();
    this._syncOverlayKeyListener();
  }

  private _select(path: string | null): void {
    if (!path) return;
    this._transition({ type: 'FrameSelected', path });
  }

  private _togglePlay(): void {
    this._transition({ type: 'PlayToggled' });
    if (!this._sm.playing) return;
    this._playbackTimer = setInterval(() => {
      // Re-derive rather than close over a list: the dark filter or a refresh may
      // have moved the hero since playback started.
      const next = this._viewModel().hero?.nextPath;
      if (!next) {
        this._transition({ type: 'PlaybackStopped' });
        return;
      }
      this._transition({ type: 'FrameSelected', path: next });
    }, PLAYBACK_INTERVAL_MS);
  }

  private _stopPlayback(): void {
    if (this._playbackTimer === undefined) return;
    clearInterval(this._playbackTimer);
    this._playbackTimer = undefined;
  }

  /**
   * Escape must reach the lightbox and the compare picker before ha-dialog's own
   * `escapeKeyAction` closes the whole dialog, so it is captured on window.
   */
  private _syncOverlayKeyListener(): void {
    const wantsEscape = this._sm.lightboxOpen || this._sm.compare.kind !== 'off';
    window.removeEventListener('keydown', this._onOverlayKeydown, true);
    if (wantsEscape) {
      window.addEventListener('keydown', this._onOverlayKeydown, true);
    }
  }

  private _onOverlayKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    void this._closeOverlay();
  };

  private async _openLightbox(event: Event): Promise<void> {
    this._overlayReturnFocus = event.currentTarget as HTMLElement;
    this._transition({ type: 'LightboxOpened' });
    await this.updateComplete;
    this.shadowRoot?.querySelector<HTMLElement>('.lightbox-close')?.focus();
  }

  private async _openComparePicker(event: Event, path: string): Promise<void> {
    this._overlayReturnFocus = event.currentTarget as HTMLElement;
    this._transition({ type: 'CompareRequested', path });
    await this.updateComplete;
    this.shadowRoot?.querySelector<HTMLElement>('.picker-cancel')?.focus();
  }

  private async _pickCompareFrame(path: string): Promise<void> {
    this._transition({ type: 'CompareBPicked', path });
    await this.updateComplete;
    this.shadowRoot?.querySelector<HTMLElement>('.cmp-range')?.focus();
    this._overlayReturnFocus = null;
  }

  private async _closeOverlay(): Promise<void> {
    if (this._sm.lightboxOpen) this._transition({ type: 'LightboxClosed' });
    else this._transition({ type: 'CompareClosed' });
    await this.updateComplete;
    this._overlayReturnFocus?.focus();
    this._overlayReturnFocus = null;
  }

  private _trapOverlayFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const overlay = event.currentTarget as HTMLElement;
    const focusable = Array.from(
      overlay.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('hidden'));
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = this.shadowRoot?.activeElement ?? null;
    if (event.shiftKey && (active === first || !overlay.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !overlay.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  private _onLightboxBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) void this._closeOverlay();
  }

  private _onViewerKeydown(e: KeyboardEvent, hero: HeroViewModel | null): void {
    if (!hero) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._select(hero.prevPath);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._select(hero.nextPath);
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  // ─── ViewModel ──────────────────────────────────────────────────────────────

  private _viewModelDeps(): SnapshotsViewModelDeps {
    return {
      cameraName: (entityId: string) => {
        const friendly = this.hass?.states?.[entityId]?.attributes?.friendly_name;
        if (typeof friendly === 'string' && friendly) return friendly;
        return entityId.split('.')[1]?.replace(/_/g, ' ') || entityId;
      },
      lightSchedule: this._lightSchedule(),
    };
  }

  private _lightSchedule(): SnapshotsViewModelDeps['lightSchedule'] {
    const lightsOnTime = this.device?.irrigationStrategy?.lightsOnTime;
    const dayHours = this.device?.irrigationConfig?.resolvedDayHours;
    if (!lightsOnTime || typeof dayHours !== 'number') return null;
    const [hh, mm] = lightsOnTime.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return { lightsOnMinutes: hh * 60 + mm, dayHours };
  }

  private _viewModel(): SnapshotsDialogViewModel {
    return createSnapshotsDialogViewModel(
      {
        snapshots: this._snapshots,
        visionHistory: this._visionHistory,
        growspaceName: this.growspaceName,
        sm: this._sm,
      },
      this._viewModelDeps()
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  render() {
    const vm = this._viewModel();
    return html`
      <gs-dialog
        .open=${this.open}
        heading="Camera Snapshots"
        .subtitle=${vm.subtitle}
        .iconPath=${mdiCamera}
        containerStyle="width: min(1032px, 100%); height: min(724px, 85vh)"
        @close=${this._close}
      >
        <div class="header-actions" slot="header-extra">${this._renderActionButtons(true)}</div>

        <div class="mobile-actions">${this._renderActionButtons(false, true)}</div>
        ${this._renderBody(vm)} ${this._renderPicker(vm)} ${this._renderLightbox(vm)}
      </gs-dialog>
    `;
  }

  private _renderActionButtons(includeHelp: boolean, compact = false): TemplateResult {
    return html`
      ${includeHelp
        ? html`<gs-help-tooltip
            content="Step through your growspace's camera captures, compare any two frames, and read the vision checkup finding attached to each one."
            placement="bottom"
            label="Camera Snapshots"
          ></gs-help-tooltip>`
        : nothing}
      <button
        class="icon-button refresh-btn"
        @click=${() => this._fetchAll()}
        ?disabled=${this._isLoading}
        aria-label=${this._isLoading ? 'Refreshing snapshots' : 'Refresh snapshots'}
        aria-busy=${this._isLoading ? 'true' : 'false'}
        title="Refresh"
      >
        <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
      </button>
      <button
        class="md3-button outlined run-checkup-btn"
        @click=${this._runVisionCheckup}
        ?disabled=${this._isRunningCheckup}
        aria-busy=${this._isRunningCheckup ? 'true' : 'false'}
      >
        <ha-svg-icon .path=${mdiEye}></ha-svg-icon>
        ${this._isRunningCheckup ? 'Running...' : compact ? 'Run check' : 'Run Checkup'}
      </button>
      <button
        class="md3-button primary capture-btn"
        @click=${this._captureSnapshot}
        ?disabled=${this._isCapturing}
        aria-busy=${this._isCapturing ? 'true' : 'false'}
      >
        <ha-svg-icon .path=${mdiCamera}></ha-svg-icon>
        ${this._isCapturing ? 'Capturing...' : compact ? 'Capture' : 'Capture Now'}
      </button>
    `;
  }

  private _renderBody(vm: SnapshotsDialogViewModel): TemplateResult {
    if (this._isLoading && !vm.hasFrames) {
      return html`<div class="snap-centered" role="status" aria-live="polite">
        <ha-circular-progress active></ha-circular-progress>
        <p class="state-copy">Loading camera snapshots…</p>
      </div>`;
    }
    if (this._loadError && !vm.hasFrames) {
      return html`<div class="snap-centered empty-state" role="alert">
        <ha-svg-icon class="empty-icon" .path=${mdiAlertCircleOutline}></ha-svg-icon>
        <h3>Camera snapshots unavailable</h3>
        <p>${this._loadError}</p>
        <button class="md3-button primary retry-btn" @click=${() => this._fetchAll()}>
          Try again
        </button>
      </div>`;
    }
    if (!vm.hasFrames) {
      return html`<div class="snap-centered empty-state">
        <ha-svg-icon class="empty-icon" .path=${mdiCamera}></ha-svg-icon>
        <h3>No Snapshots Found</h3>
        <p>Click "Capture Now" to take a picture using your configured cameras.</p>
      </div>`;
    }

    return html`
      ${this._renderInlineStatus()} ${this._renderTimeline(vm)}
      <div class="snap-body">
        <div
          class="viewer"
          tabindex="0"
          aria-label="Snapshot viewer — use left and right arrow keys to step frames"
          @keydown=${(e: KeyboardEvent) => this._onViewerKeydown(e, vm.hero)}
        >
          ${vm.compare ? this._renderCompare(vm) : this._renderHero(vm)}
          ${vm.hero?.finding ? this._renderFindings(vm, vm.hero) : nothing}
        </div>
        ${this._renderRail(vm)}
      </div>
    `;
  }

  private _renderInlineStatus(): TemplateResult | typeof nothing {
    if (this._isLoading) {
      return html`<div class="inline-status" role="status" aria-live="polite">
        <ha-circular-progress active></ha-circular-progress>
        <span>Refreshing camera snapshots…</span>
      </div>`;
    }
    const error = this._actionError ?? this._loadError;
    if (!error) return nothing;
    return html`<div class="inline-status error" role="alert">
      <ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>
      <span>${error}</span>
      ${this._loadError
        ? html`<button class="md3-button outlined retry-btn" @click=${() => this._fetchAll()}>
            Try again
          </button>`
        : nothing}
    </div>`;
  }

  // ─── Timeline ───────────────────────────────────────────────────────────────

  private _renderTimeline(vm: SnapshotsDialogViewModel): TemplateResult {
    return html`
      <div class="timeline">
        <div class="eyebrow">Vision timeline</div>
        <div class="timeline-days">
          ${vm.timeline.map(
            (day) => html`
              <div class="timeline-day">
                <div class="timeline-ticks">
                  ${day.ticks.map(
                    (tick) => html`
                      <button
                        class=${classMap({
                          tick: true,
                          selected: tick.selected,
                          ...(tick.tone ? { [tick.tone]: true } : {}),
                        })}
                        title=${tick.title}
                        aria-label=${tick.title}
                        @click=${() => this._select(tick.path)}
                      ></button>
                    `
                  )}
                </div>
                <div class="timeline-daylabel">${day.short}</div>
              </div>
            `
          )}
        </div>
        <div class="legend">
          ${vm.legend.map(
            (entry) => html`
              <span class="legend-item">
                <span class="legend-dot ${entry.tone}"></span>${entry.label}
              </span>
            `
          )}
        </div>
      </div>
    `;
  }

  // ─── Hero ───────────────────────────────────────────────────────────────────

  private _renderHero(vm: SnapshotsDialogViewModel): TemplateResult {
    const hero = vm.hero;
    if (!hero) {
      return html`<div class="snap-centered empty-state">
        <h3>Every capture is hidden</h3>
        <p>All loaded frames were taken with the lights off. Show them to browse again.</p>
      </div>`;
    }

    return html`
      <div class="stage">
        <img
          class="stage-img hero-image"
          src=${hero.path}
          alt="Snapshot from ${hero.cam} at ${hero.label}"
          onerror=${BROKEN_IMAGE_FALLBACK}
        />
        <div class="stage-scrim"></div>

        <div class="stage-tl">
          <div class="chip hero-label">${hero.label}</div>
          <div class="chip muted">${hero.cam}</div>
          ${hero.dark
            ? html`<div class="chip night">
                <ha-svg-icon .path=${mdiWeatherNight}></ha-svg-icon>Lights off
              </div>`
            : nothing}
        </div>

        <div class="stage-tr">
          <button
            class="glass-btn"
            title="Fullscreen"
            aria-label="Fullscreen"
            @click=${this._openLightbox}
          >
            <ha-svg-icon .path=${mdiFullscreen}></ha-svg-icon>
          </button>
          <a
            class="glass-btn"
            href=${hero.path}
            download
            title="Download frame"
            aria-label="Download frame"
          >
            <ha-svg-icon .path=${mdiDownload}></ha-svg-icon>
          </a>
        </div>

        <button
          class="stage-nav prev"
          title="Previous frame"
          aria-label="Previous frame"
          ?disabled=${!hero.prevPath}
          @click=${() => this._select(hero.prevPath)}
        >
          <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>
        </button>
        <button
          class="stage-nav next"
          title="Next frame"
          aria-label="Next frame"
          ?disabled=${!hero.nextPath}
          @click=${() => this._select(hero.nextPath)}
        >
          <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
        </button>

        <div class="stage-bottom">
          <button
            class="play-btn"
            ?disabled=${!hero.nextPath && !vm.playing}
            @click=${this._togglePlay}
          >
            <ha-svg-icon .path=${vm.playing ? mdiPause : mdiPlay}></ha-svg-icon>
            ${vm.playing ? 'Pause' : 'Play'}
          </button>
          <div style="flex:1"></div>
          <div class="day-step">
            <button
              title="Same time, previous day"
              ?disabled=${!hero.prevDayPath}
              @click=${() => this._select(hero.prevDayPath)}
            >
              <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>&minus;1 day
            </button>
            <button
              title="Same time, next day"
              ?disabled=${!hero.nextDayPath}
              @click=${() => this._select(hero.nextDayPath)}
            >
              +1 day<ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Findings ───────────────────────────────────────────────────────────────

  private _renderFindings(vm: SnapshotsDialogViewModel, hero: HeroViewModel): TemplateResult {
    const finding = hero.finding!;
    return html`
      <div class="findings">
        <button
          class="findings-summary"
          aria-expanded=${vm.panelOpen}
          @click=${() => this._transition({ type: 'PanelToggled' })}
        >
          <span class="severity-chip ${finding.tone}">${finding.badge}</span>
          <span class="findings-text">${finding.summary}</span>
          <span class="findings-hint">${vm.panelOpen ? 'Hide detail' : 'Show detail'}</span>
        </button>
        ${vm.panelOpen
          ? html`
              <div class="findings-detail">
                <p class="analysis-text">${finding.analysis}</p>
                <div class="findings-cols">
                  ${finding.issues.length > 0
                    ? html`
                        <div class="findings-col issues">
                          <div class="eyebrow">Issues detected</div>
                          <div class="issue-chips">
                            ${finding.issues.map(
                              (issue) => html`<span class="issue-chip">${issue}</span>`
                            )}
                          </div>
                        </div>
                      `
                    : nothing}
                  ${finding.recs.length > 0
                    ? html`
                        <div class="findings-col recs">
                          <div class="eyebrow">Recommendations</div>
                          <ol>
                            ${finding.recs.map(
                              (rec) => html`<li class="recommendation-item">${rec}</li>`
                            )}
                          </ol>
                        </div>
                      `
                    : nothing}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  // ─── Compare ────────────────────────────────────────────────────────────────

  private _renderCompare(vm: SnapshotsDialogViewModel): TemplateResult {
    const cmp = vm.compare!;
    return html`
      <div class="compare">
        <div class="compare-head">
          <div class="eyebrow">Compare</div>
          <div class="compare-label">${cmp.label}</div>
          <button class="compare-exit" @click=${() => this._transition({ type: 'CompareClosed' })}>
            Exit compare
          </button>
        </div>
        <div class="stage">
          <img class="stage-img cmp-b" src=${cmp.b.path} alt="Later frame, ${cmp.b.label}" />
          <img
            class="stage-img cmp-a"
            src=${cmp.a.path}
            alt="Earlier frame, ${cmp.a.label}"
            style=${styleMap({ clipPath: `inset(0 ${100 - cmp.pct}% 0 0)` })}
          />
          <div class="cmp-handle" style=${styleMap({ left: `${cmp.pct}%` })}></div>
          <div class="chip cmp-badge-a">A · ${cmp.a.label}</div>
          <div class="chip cmp-badge-b">B · ${cmp.b.label}</div>
          <input
            class="cmp-range"
            type="range"
            min="0"
            max="100"
            .value=${String(cmp.pct)}
            aria-label="Compare position"
            @input=${(e: Event) =>
              this._transition({
                type: 'ComparePctChanged',
                pct: Number((e.target as HTMLInputElement).value),
              })}
          />
        </div>
      </div>
    `;
  }

  // ─── Rail ───────────────────────────────────────────────────────────────────

  private _renderRail(vm: SnapshotsDialogViewModel): TemplateResult {
    return html`
      <div class="rail">
        <div class="rail-head">
          <div class="eyebrow">All captures</div>
          ${vm.hasDarkFrames
            ? html`<button
                class="dark-toggle"
                aria-pressed=${vm.hideDark}
                @click=${() => this._transition({ type: 'DarkFilterToggled' })}
              >
                ${vm.darkToggleLabel}
              </button>`
            : nothing}
        </div>
        <div class="rail-scroll">
          ${vm.days.map(
            (day) => html`
              <div class="rail-day">
                <div class="rail-day-head">
                  <span class="rail-day-weekday">${day.weekday}</span>
                  <span class="rail-day-date">${day.date}</span>
                  <span class="rail-day-rule"></span>
                  <span class="rail-day-count">${day.count}</span>
                </div>
                <div class="rail-grid">${day.items.map((item) => this._renderThumb(item))}</div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderThumb(item: FrameViewModel): TemplateResult {
    return html`
      <div
        class="thumb"
        role="button"
        tabindex="0"
        aria-current=${item.selected ? 'true' : 'false'}
        aria-label="${item.label} · ${item.cam}"
        @click=${() => this._select(item.path)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          this._select(item.path);
        }}
      >
        <img src=${item.path} alt="" loading="lazy" onerror=${BROKEN_IMAGE_FALLBACK} />
        ${item.dark ? html`<span class="thumb-dim"></span>` : nothing}
        <span class="thumb-scrim"></span>
        <span class="thumb-time">${item.time}</span>
        ${item.dark
          ? html`<span class="thumb-night" title="Lights off">
              <ha-svg-icon .path=${mdiWeatherNight}></ha-svg-icon>
            </span>`
          : nothing}
        ${item.tone
          ? html`<span class="thumb-tone ${item.tone}" title="${item.tone} finding"
              >${item.tone === 'critical' || item.tone === 'high' ? '!' : nothing}</span
            >`
          : nothing}
        ${item.selected ? html`<span class="thumb-selected"></span>` : nothing}
        <button
          class="thumb-compare"
          title="Compare this frame"
          aria-label="Compare ${item.label}"
          @click=${(e: Event) => {
            e.stopPropagation();
            void this._openComparePicker(e, item.path);
          }}
        >
          <ha-svg-icon .path=${mdiCompare}></ha-svg-icon>
        </button>
      </div>
    `;
  }

  // ─── Overlays ───────────────────────────────────────────────────────────────

  private _renderPicker(vm: SnapshotsDialogViewModel): TemplateResult | typeof nothing {
    if (!vm.picker) return nothing;
    const picker = vm.picker;
    return html`
      <div
        class="overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshot-picker-title"
        @keydown=${this._trapOverlayFocus}
      >
        <div class="picker">
          <div class="picker-head">
            <div style="flex:1;min-width:0">
              <div class="picker-title" id="snapshot-picker-title">Pick the second frame</div>
              <div class="picker-sub">Comparing against A · ${picker.aLabel}</div>
            </div>
            <button
              class="icon-button picker-cancel"
              aria-label="Cancel"
              @click=${() => this._closeOverlay()}
            >
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>
          <div class="picker-grid">
            ${picker.items.map(
              (item) => html`
                <button
                  class="picker-item"
                  ?disabled=${item.isA}
                  aria-label=${item.label}
                  @click=${() => this._pickCompareFrame(item.path)}
                >
                  <img src=${item.path} alt="" loading="lazy" onerror=${BROKEN_IMAGE_FALLBACK} />
                  <span class="thumb-scrim"></span>
                  <span class="picker-item-label">${item.short}</span>
                  ${item.isA ? html`<span class="picker-item-a">A</span>` : nothing}
                </button>
              `
            )}
          </div>
        </div>
      </div>
    `;
  }

  private _renderLightbox(vm: SnapshotsDialogViewModel): TemplateResult | typeof nothing {
    if (!vm.lightboxSrc) return nothing;
    return html`
      <div
        class="lightbox-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Enlarged camera snapshot"
        @keydown=${this._trapOverlayFocus}
        @click=${this._onLightboxBackdropClick}
      >
        <button
          class="lightbox-close"
          aria-label="Close enlarged snapshot"
          @click=${() => this._closeOverlay()}
        >
          <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
        </button>
        <img
          class="lightbox-image"
          src=${vm.lightboxSrc}
          alt="Enlarged snapshot from ${vm.hero?.cam ?? 'camera'} at ${vm.hero?.label ?? ''}"
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'snapshots-dialog': SnapshotsDialog;
  }
}
