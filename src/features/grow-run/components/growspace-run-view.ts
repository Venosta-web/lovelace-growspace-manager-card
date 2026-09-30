import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiSprout } from '@mdi/js';

import { localize, localizePlural, localizeWithParams } from '../../../localize/localize';
import { getHass } from '../../../services/hass-call';
import { listGrowRuns } from '../../../slices/grow-run';
import type {
  GetGrowRunResult,
  ParticipantIdentity,
  RunMetric,
  RunSnapshot,
} from '../../../slices/grow-run/details-schema';
import type { RunSummary } from '../../../slices/grow-run/schema';
import { refusalText } from '../../../slices/grow-run/start';
import {
  compareGrowRuns,
  exportGrowRun,
  downloadGrowRun,
  getGrowRun,
  type CompareGrowRunsResult,
  type MetricComparison,
  type RunComparison,
} from '../../../slices/grow-run/view';
import '../../shared/ui/gs-dialog';
import '../../shared/ui/gs-tab-strip';
import type { TabStripTab } from '../../shared/ui/gs-tab-strip';

export type RunViewTab = 'overview' | 'participants' | 'performance' | 'history' | 'compare';

const TABS: readonly RunViewTab[] = [
  'overview',
  'participants',
  'performance',
  'history',
  'compare',
];

const KNOWN_METRICS = new Set([
  'yield',
  'yield_per_harvest_source_plant',
  'water_applied',
  'water_productivity',
]);
const KNOWN_MOVEMENTS = new Set(['entry', 'removal', 'move', 're_entry', 'harvest', 'transplant']);
const KNOWN_AUDIT = new Set(['start', 'complete', 'finalize', 'edit_metadata', 'reopen']);

type FoundRun = Extract<GetGrowRunResult, { outcome: 'found' }>['run'];

/**
 * What the grower asks the chip to do about the Run on show. A discard names
 * the Run's number and the Run Revision it was read at (GSM#917); a reopen is
 * the finalization dialog's, opened on the Finalized Run.
 */
export interface RunViewAction {
  action: 'complete' | 'finalize' | 'discard' | 'reopen';
  runId: string;
  sequenceNumber?: number;
  runRevision?: number;
}

/**
 * The Grow Run View (GSM#675): the product surface for one Grow Run.
 *
 * Overview, Participants and Performance describe the selected Run; History
 * lists every Run the growspace's ledger holds and navigates between them;
 * Compare sets two Finalized Runs side by side. It replaces the unversioned
 * Grow Report, and is the only thing the run chip opens for reading a Run.
 *
 * Metrics are always labelled with what they are: **Live** while a Run is
 * Active, **Pending** once Completed, **Final** once Finalized. Only Final
 * metrics are compared, and a comparison row says why it has no direction
 * rather than showing one it cannot stand behind. Yield is neutral: it says
 * which way it moved, never that the move was better or worse.
 *
 * Completing, finalizing and correcting stay the chip's dialogs: the View asks
 * for them with a `run-view-action` event and closes. It offers discarding an
 * Active Run only while the Run shows nothing recorded, and reopening a
 * Finalized Run only to a Home Assistant administrator (GSM#917). It is a
 * lazy chunk.
 */
@customElement('growspace-run-view')
export class GrowspaceRunView extends LitElement {
  @property() growspaceId = '';
  @property() runId = '';
  @property() language = 'en';
  @property() tab: RunViewTab = 'overview';

  @state() private _details: GetGrowRunResult | null = null;
  @state() private _exporting = false;
  @state() private _exportError: string | null = null;
  @state() private _detailError: string | null = null;
  @state() private _runs: RunSummary[] | null = null;
  @state() private _runsError: string | null = null;
  @state() private _comparison: CompareGrowRunsResult | null = null;
  @state() private _compareError: string | null = null;
  @state() private _comparing = false;

  static styles = css`
    :host {
      display: contents;
      --run-view-gap: 16px;
    }

    .body {
      container-type: inline-size;
      display: flex;
      flex-direction: column;
      gap: var(--run-view-gap);
      padding: 16px 24px 24px;
      overflow-y: auto;
      min-height: 0;
      color: var(--primary-text-color);
    }

    [role='tabpanel'] {
      display: flex;
      flex-direction: column;
      gap: var(--run-view-gap);
    }

    [role='tabpanel']:focus-visible,
    button:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: 2px;
    }

    h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 500;
    }

    p {
      margin: 0;
    }

    ul {
      margin: 0;
      padding-left: 20px;
    }

    .muted {
      color: var(--secondary-text-color);
    }

    .refusal {
      color: var(--error-color, #f44336);
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 0 10px;
      border-radius: 12px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      font-size: 0.8125rem;
      font-weight: 500;
    }

    dl {
      display: grid;
      grid-template-columns: minmax(8rem, max-content) 1fr;
      gap: 6px 16px;
      margin: 0;
    }

    dt {
      color: var(--secondary-text-color);
    }

    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .actions button,
    .history button {
      min-height: 36px;
      padding: 6px 16px;
      border-radius: 18px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }

    .actions button.primary {
      border-color: transparent;
      background: var(--primary-color, #4caf50);
      color: var(--text-primary-color, #fff);
    }

    .history {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .history button {
      width: 100%;
      text-align: left;
      border-radius: 12px;
    }

    .history button[aria-current='true'] {
      border-color: var(--primary-color, #4caf50);
      font-weight: 500;
    }

    .pickers {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .pickers label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 12rem;
      font-size: 0.875rem;
      color: var(--secondary-text-color);
    }

    select {
      min-height: 40px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.24));
      background: var(--card-background-color, transparent);
      color: var(--primary-text-color);
      font: inherit;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 8px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    }

    thead th {
      color: var(--secondary-text-color);
      font-weight: 500;
    }

    tbody th {
      font-weight: 400;
      color: var(--secondary-text-color);
    }

    /* Narrow: each row stacks its label over the two Runs and the change. */
    @container (max-width: 560px) {
      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }

      tbody tr {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 12px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      tbody th {
        grid-column: 1 / -1;
        color: var(--primary-text-color);
        font-weight: 500;
      }

      tbody th,
      tbody td {
        padding: 0;
        border: 0;
      }

      tbody td::before {
        content: attr(data-label);
        display: block;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
      }

      tbody td.change {
        grid-column: 1 / -1;
      }

      /* A context row has no change to caption. */
      tbody td.change:empty {
        display: none;
      }
    }
  `;

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return Object.keys(params).length
      ? localizeWithParams(`grow_run.${key}`, params, this.language)
      : localize(`grow_run.${key}`, '', '', this.language);
  }

  private get _locale(): string {
    return this.language || 'en';
  }

  private _run(): FoundRun | null {
    return this._details?.outcome === 'found' ? this._details.run : null;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('runId') || changed.has('growspaceId')) void this._loadDetails();
    if (changed.has('tab') || changed.has('growspaceId')) this._loadTab();
  }

  private async _loadDetails(): Promise<void> {
    const { growspaceId, runId } = this;
    this._details = null;
    this._exportError = null;
    this._detailError = null;
    if (!growspaceId || !runId) return;
    try {
      const details = await getGrowRun(growspaceId, runId);
      if (this.runId === runId) this._details = details;
    } catch (error) {
      if (this.runId === runId) this._detailError = String(error);
    }
  }

  private _loadTab(): void {
    if (this.tab === 'history' && this._runs === null) void this._loadRuns();
    if (this.tab === 'compare' && this._comparison === null && !this._comparing) {
      void this._compare();
    }
  }

  private async _loadRuns(): Promise<void> {
    this._runsError = null;
    try {
      const result = await listGrowRuns(this.growspaceId);
      if (result.outcome === 'listed') this._runs = result.runs;
      else this._runsError = refusalText(result.refusal, this.language);
    } catch (error) {
      this._runsError = String(error);
    }
  }

  private async _compare(runIds?: readonly [string, string]): Promise<void> {
    this._comparing = true;
    this._compareError = null;
    try {
      this._comparison = await compareGrowRuns(this.growspaceId, runIds);
    } catch (error) {
      this._compareError = String(error);
    } finally {
      this._comparing = false;
    }
  }

  private _selectTab(tab: RunViewTab): void {
    this.tab = tab;
  }

  private _selectRun(runId: string): void {
    this.runId = runId;
    this.tab = 'overview';
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true }));
  }

  private _act(action: RunViewAction['action'], run?: FoundRun): void {
    this.dispatchEvent(
      new CustomEvent<RunViewAction>('run-view-action', {
        detail: {
          action,
          runId: this.runId,
          ...(run ? { sequenceNumber: run.sequence_number, runRevision: run.run_revision } : {}),
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  private _date(value: string | null | undefined, timeZone?: string): string {
    if (!value) return '—';
    const moment = new Date(value);
    try {
      return moment.toLocaleDateString(this._locale, { dateStyle: 'medium', timeZone });
    } catch {
      return moment.toLocaleDateString(this._locale, { dateStyle: 'medium' });
    }
  }

  private _number(value: number): string {
    return value.toLocaleString(this._locale, { maximumFractionDigits: 2 });
  }

  private _days(count: number): string {
    return localizePlural('grow_run.days', count, {}, this.language);
  }

  private _metricName(metric: string): string {
    return KNOWN_METRICS.has(metric) ? this._t(`metric_${metric}`) : metric.replaceAll('_', ' ');
  }

  private _metricValue(metric: RunMetric | null): string {
    if (!metric) return '—';
    if (metric.value === null) return this._t('metric_incomplete');
    return `${this._number(metric.value)} ${metric.unit}`;
  }

  private _status(status: RunSummary['status']): string {
    return status ? this._t(`status_${status}`) : this._t('status_active');
  }

  private _runName(run: Pick<RunSummary, 'sequence_number' | 'label'>): string {
    return run.label
      ? this._t('chip_active_label', { number: run.sequence_number, label: run.label })
      : this._t('chip_active', { number: run.sequence_number });
  }

  /** Whole days from start to end (or now), as the backend's sensor counts them. */
  private _duration(run: FoundRun): number {
    if (run.snapshot) return run.snapshot.duration_days;
    const end = run.completed_at ? new Date(run.completed_at) : new Date();
    return Math.max(0, Math.floor((end.getTime() - new Date(run.started_at).getTime()) / 864e5));
  }

  private _harvestWindow(snapshot: RunSnapshot): string {
    const window = snapshot.harvest_window;
    if (window) {
      return window.first === window.last ? window.first : `${window.first} – ${window.last}`;
    }
    return snapshot.counts.harvest_source_plants
      ? this._t('snapshot_harvest_unknown')
      : this._t('snapshot_harvest_none');
  }

  private _identities(run: FoundRun): Map<string, ParticipantIdentity> {
    const rows = run.snapshot?.participants ?? run.participant_identities;
    return new Map(rows.map((row) => [row.plant_id, row]));
  }

  private _plantName(plantId: string, identities: Map<string, ParticipantIdentity>): string {
    const identity = identities.get(plantId);
    return identity?.plant_name || (identity ? this._t('unnamed_plant') : plantId);
  }

  // -------------------------------------------------------------------------
  // Panels
  // -------------------------------------------------------------------------

  private _metricsState(run: FoundRun): TemplateResult {
    const state = run.metrics_state ?? 'live';
    const detail =
      state === 'live'
        ? this._t('metrics_live')
        : state === 'pending'
          ? this._t('metrics_pending_detail')
          : state === 'frozen'
            ? this._t('metrics_frozen_detail')
            : this._t('metrics_excluded');
    return html`<p>
      <span class="badge" data-testid="metrics-state" data-state=${state}
        >${this._t(`state_${state}`)}</span
      >
      <span class="muted">${detail}</span>
    </p>`;
  }

  private _renderOverview(run: FoundRun): TemplateResult {
    const snapshot = run.snapshot ?? null;
    return html`
      <div class="badges">
        <span class="badge" data-testid="run-status">${this._status(run.status)}</span>
      </div>
      <dl>
        <dt>${this._t('field_started')}</dt>
        <dd>${this._date(run.started_at, run.timezone)}</dd>
        ${run.completed_at
          ? html`<dt>${this._t('field_completed')}</dt>
              <dd>${this._date(run.completed_at, run.timezone)}</dd>`
          : nothing}
        ${snapshot
          ? html`<dt>${this._t('field_finalized')}</dt>
              <dd>${this._date(snapshot.finalized_at, run.timezone)}</dd>`
          : nothing}
        <dt>${this._t('field_duration')}</dt>
        <dd data-testid="run-duration">${this._days(this._duration(run))}</dd>
        <dt>${this._t('participants_heading')}</dt>
        <dd>${localizePlural('grow_run.plants', run.participant_count, {}, this.language)}</dd>
        ${snapshot
          ? html`<dt>${this._t('snapshot_harvest')}</dt>
              <dd>${this._harvestWindow(snapshot)}</dd>`
          : nothing}
        ${run.tags.length
          ? html`<dt>${this._t('field_tags')}</dt>
              <dd>${run.tags.join(', ')}</dd>`
          : nothing}
        ${run.goals
          ? html`<dt>${this._t('field_run_goals')}</dt>
              <dd>${run.goals}</dd>`
          : nothing}
        ${run.notes
          ? html`<dt>${this._t('field_notes')}</dt>
              <dd>${run.notes}</dd>`
          : nothing}
      </dl>
      ${run.audit.length
        ? html`<h3>${this._t('lifecycle_heading')}</h3>
            <ul data-testid="run-audit">
              ${run.audit.map(
                (entry) =>
                  html`<li>
                    ${this._date(entry.at, run.timezone)} ·
                    ${KNOWN_AUDIT.has(entry.command)
                      ? this._t(`audit_${entry.command}`)
                      : entry.command.replaceAll('_', ' ')}${entry.reason
                      ? html` · <q>${entry.reason}</q>`
                      : nothing}
                  </li>`
              )}
            </ul>`
        : nothing}
      ${this._renderActions(run)}
    `;
  }

  private async _exportRun(): Promise<void> {
    if (this._exporting) return;
    const runId = this.runId;
    this._exporting = true;
    this._exportError = null;
    try {
      const result = await exportGrowRun(this.growspaceId, runId);
      if (result.outcome === 'exported') {
        downloadGrowRun(result.document, runId);
      } else if (this.runId === runId) {
        this._exportError =
          result.refusal.code === 'grow_run.not_finalized'
            ? this._t('export_not_finalized')
            : refusalText(result.refusal, this.language);
      }
    } catch {
      if (this.runId === runId) this._exportError = this._t('export_failed');
    } finally {
      this._exporting = false;
    }
  }

  private _renderActions(run: FoundRun): TemplateResult | typeof nothing {
    const actions: TemplateResult[] = [];
    if (run.status === 'finalized') {
      actions.push(
        html`<button
          type="button"
          data-action="export-run"
          ?disabled=${this._exporting}
          @click=${() => void this._exportRun()}
        >
          ${this._t(this._exporting ? 'exporting' : 'export_json')}
        </button>`
      );
    }
    if (
      run.status === 'active' &&
      !run.movement_history.length &&
      !run.water_applications.length &&
      !run.harvest_outcomes.length
    ) {
      actions.push(
        html`<button
          type="button"
          data-action="discard-run"
          @click=${() => this._act('discard', run)}
        >
          ${this._t('discard_offer')}
        </button>`
      );
    }
    if (run.status === 'active') {
      actions.push(
        html`<button
          type="button"
          class="primary"
          data-action="complete-run"
          @click=${() => this._act('complete')}
        >
          ${this._t('complete_run')}
        </button>`
      );
    } else if (run.status === 'completed') {
      actions.push(
        html`<button
          type="button"
          class="primary"
          data-action="finalize-run"
          @click=${() => this._act('finalize')}
        >
          ${this._t('finalize')}
        </button>`
      );
    } else if (run.status === 'finalized' && getHass()?.user?.is_admin === true) {
      actions.push(
        html`<button type="button" data-action="reopen-run" @click=${() => this._act('reopen')}>
          ${this._t('reopen_offer')}
        </button>`
      );
    }
    return actions.length
      ? html`
          <div class="actions">${actions}</div>
          ${this._exportError
            ? html`<p class="refusal" role="alert">${this._exportError}</p>`
            : nothing}
        `
      : nothing;
  }

  private _renderParticipants(run: FoundRun): TemplateResult {
    const identities = this._identities(run);
    const plants = [...new Set(run.participations.map((row) => row.plant_id))];
    return html`
      <h3>${this._t('participants_heading')}</h3>
      ${plants.length
        ? html`<ul data-testid="run-participants">
            ${plants.map((plantId) => {
              const identity = identities.get(plantId);
              const genetics = [identity?.strain_name, identity?.phenotype_name]
                .filter(Boolean)
                .join(' · ');
              return html`<li>
                <span>${this._plantName(plantId, identities)}</span>
                ${genetics ? html`<span class="muted"> · ${genetics}</span>` : nothing}
                <ul>
                  ${run.participations
                    .filter((row) => row.plant_id === plantId)
                    .map(
                      (row) =>
                        html`<li class="muted">
                          ${this._date(row.opened_at, run.timezone)} –
                          ${row.closed_at
                            ? this._date(row.closed_at, run.timezone)
                            : this._t('present')}
                        </li>`
                    )}
                </ul>
              </li>`;
            })}
          </ul>`
        : html`<p>${this._t('none_yet')}</p>`}
      <h3>${this._t('movement_heading')}</h3>
      ${run.movement_history.length
        ? html`<ul data-testid="run-movements">
            ${run.movement_history.map(
              (row) =>
                html`<li>
                  ${this._date(row.at, run.timezone)} · ${this._plantName(row.plant_id, identities)}
                  ·
                  ${KNOWN_MOVEMENTS.has(row.kind)
                    ? this._t(`movement_${row.kind}`)
                    : row.kind.replaceAll('_', ' ')}
                </li>`
            )}
          </ul>`
        : html`<p>${this._t('none_yet')}</p>`}
    `;
  }

  private _outcomeText(outcome: FoundRun['harvest_outcomes'][number]): string {
    if (outcome.state === 'no_usable_yield') {
      return this._t('outcome_no_usable_yield', { reason: outcome.reason ?? '' });
    }
    if (outcome.state === 'incomplete') return this._t('outcome_incomplete');
    const weight = outcome.metrics.dry_weight;
    return weight == null
      ? this._t('outcome_pending')
      : this._t('outcome_recorded', { weight: this._number(weight) });
  }

  private _renderPerformance(run: FoundRun): TemplateResult {
    const identities = this._identities(run);
    const outcomes = run.harvest_outcomes;
    const counts = run.snapshot?.counts ?? {
      harvest_source_plants: outcomes.length,
      no_usable_yield: outcomes.filter((row) => row.state === 'no_usable_yield').length,
      missing_outcomes: outcomes.filter(
        (row) =>
          row.state === 'incomplete' || (row.state === 'pending' && row.metrics.dry_weight == null)
      ).length,
    };
    const coverage = run.snapshot?.coverage ?? run.coverage;
    const water = run.snapshot?.water_applications ?? run.water_applications;
    return html`
      ${this._metricsState(run)}
      ${run.metrics.length
        ? html`<dl data-testid="run-metrics">
            ${run.metrics.map(
              (metric) => html`
                <dt>${this._metricName(metric.metric)}</dt>
                <dd data-metric=${metric.metric}>
                  ${this._metricValue(metric)}
                  <span class="muted"
                    >${this._t('metric_version', { version: metric.definition_version })}</span
                  >
                </dd>
              `
            )}
          </dl>`
        : nothing}
      <dl data-testid="run-counts">
        <dt>${this._t('count_harvest_source_plants')}</dt>
        <dd>${counts.harvest_source_plants}</dd>
        <dt>${this._t('count_no_usable_yield')}</dt>
        <dd>${counts.no_usable_yield}</dd>
        <dt>${this._t('count_missing_outcomes')}</dt>
        <dd>${counts.missing_outcomes}</dd>
      </dl>
      <h3>${this._t('completion_coverage_heading')}</h3>
      ${coverage.length
        ? html`<ul>
            ${coverage.map(
              (row) =>
                html`<li>
                  ${this._metricName(row.metric)} · ${Math.round(row.coverage_percent)}%
                </li>`
            )}
          </ul>`
        : html`<p class="muted">${this._t('completion_coverage_none')}</p>`}
      <h3>${this._t('water_sources_heading')}</h3>
      ${water.length
        ? html`<ul data-testid="run-water-sources">
            ${water.map(
              (application) =>
                html`<li>
                  ${this._date(application.at, run.timezone)} ·
                  ${this._t(`water_source_${application.source}`)} ·
                  ${application.liters === null
                    ? this._t('metric_incomplete')
                    : `${this._number(application.liters)} L`}
                </li>`
            )}
          </ul>`
        : html`<p class="muted">${this._t('water_sources_none')}</p>`}
      <h3>${this._t('outcomes_heading')}</h3>
      ${outcomes.length
        ? html`<ul data-testid="run-harvest-outcomes">
            ${outcomes.map(
              (outcome) =>
                html`<li>
                  ${this._plantName(outcome.plant_id, identities)} · ${this._outcomeText(outcome)}
                </li>`
            )}
          </ul>`
        : html`<p>${this._t('none_yet')}</p>`}
    `;
  }

  private _renderHistory(): TemplateResult {
    if (this._runsError) return html`<p class="refusal" role="alert">${this._runsError}</p>`;
    if (this._runs === null) return html`<p class="muted">${this._t('history_loading')}</p>`;
    if (!this._runs.length) return html`<p>${this._t('none_yet')}</p>`;
    return html`
      <h3 id="run-history-heading">${this._t('history_heading')}</h3>
      <ul class="history" aria-labelledby="run-history-heading" data-testid="run-history">
        ${this._runs.map((run) => {
          const dates = run.completed_at
            ? `${this._date(run.started_at, run.timezone)} – ${this._date(run.completed_at, run.timezone)}`
            : this._date(run.started_at, run.timezone);
          const current = run.run_id === this.runId;
          return html`<li>
            <button
              type="button"
              data-run-id=${run.run_id}
              aria-current=${current ? 'true' : 'false'}
              @click=${() => this._selectRun(run.run_id)}
            >
              ${this._t('history_row', {
                number: run.label ? `${run.sequence_number} · ${run.label}` : run.sequence_number,
                status: this._status(run.status),
                dates,
              })}
            </button>
          </li>`;
        })}
      </ul>
    `;
  }

  private _change(row: MetricComparison): string {
    if (row.state === 'comparable' && row.direction) {
      const unit = row.later?.unit ?? '';
      const delta = `${this._number(Math.abs(row.delta ?? 0))} ${unit}`.trim();
      const moved =
        row.direction === 'equal'
          ? this._t('compare_equal')
          : this._t(`compare_${row.direction}`, { delta });
      return row.judgment === 'better' || row.judgment === 'worse'
        ? `${moved} (${this._t(`compare_${row.judgment}`)})`
        : moved;
    }
    if (row.state === 'incompatible') {
      return this._t('compare_incompatible', {
        earlier: row.earlier?.definition_version ?? '?',
        later: row.later?.definition_version ?? '?',
      });
    }
    if (row.state === 'missing') return this._t('compare_missing');
    return this._t('compare_unavailable');
  }

  private _strains(snapshot: RunSnapshot): string {
    return (
      snapshot.strains
        .map(
          (row) => `${row.strain_name || this._t('snapshot_strain_unknown')} (${row.participants})`
        )
        .join(', ') || '—'
    );
  }

  /** The context rows: facts beside the metrics, never given a direction. */
  private _contextRows(comparison: RunComparison): [string, string, string][] {
    const earlier = comparison.earlier.snapshot;
    const later = comparison.later.snapshot;
    const both = (read: (snapshot: RunSnapshot) => string): [string, string] => [
      read(earlier),
      read(later),
    ];
    const coverage = (snapshot: RunSnapshot) =>
      snapshot.coverage.length
        ? snapshot.coverage
            .map((row) => `${this._metricName(row.metric)} ${Math.round(row.coverage_percent)}%`)
            .join(', ')
        : '—';
    return [
      [this._t('participants_heading'), ...both((s) => String(s.counts.participants))],
      [
        this._t('count_harvest_source_plants'),
        ...both((s) => String(s.counts.harvest_source_plants)),
      ],
      [this._t('compare_strains'), ...both((s) => this._strains(s))],
      [this._t('field_duration'), ...both((s) => this._days(s.duration_days))],
      [this._t('snapshot_harvest'), ...both((s) => this._harvestWindow(s))],
      [this._t('completion_coverage_heading'), ...both(coverage)],
      [this._t('compare_no_usable_yield'), ...both((s) => String(s.counts.no_usable_yield))],
      [this._t('compare_missing_outcomes'), ...both((s) => String(s.counts.missing_outcomes))],
      [this._t('compare_gaps'), ...both((s) => String(s.uncovered_gaps.length))],
    ];
  }

  private _pick(side: 'earlier' | 'later', runId: string): void {
    const result = this._comparison;
    if (result?.outcome !== 'compared') return;
    const other =
      side === 'earlier'
        ? result.comparison.later.run.run_id
        : result.comparison.earlier.run.run_id;
    void this._compare(side === 'earlier' ? [other, runId] : [runId, other]);
  }

  private _renderPicker(
    side: 'earlier' | 'later',
    finalized: RunSummary[],
    selected: string
  ): TemplateResult {
    const id = `run-compare-${side}`;
    return html`<label for=${id}>
      ${this._t(side === 'later' ? 'compare_run' : 'compare_against')}
      <select
        id=${id}
        data-side=${side}
        ?disabled=${this._comparing}
        @change=${(event: Event) => this._pick(side, (event.target as HTMLSelectElement).value)}
      >
        ${finalized.map(
          (run) =>
            html`<option value=${run.run_id} ?selected=${run.run_id === selected}>
              ${this._runName(run)}
            </option>`
        )}
      </select>
    </label>`;
  }

  private _renderCompare(): TemplateResult {
    if (this._compareError) return html`<p class="refusal" role="alert">${this._compareError}</p>`;
    const result = this._comparison;
    if (!result) return html`<p class="muted">${this._t('compare_loading')}</p>`;
    if (result.outcome === 'refused') {
      return html`<p data-testid="compare-refusal" role="status">
        ${refusalText(result.refusal, this.language)}
      </p>`;
    }
    const { comparison, finalized } = result;
    const earlier = comparison.earlier.run;
    const later = comparison.later.run;
    const earlierName = this._runName(earlier);
    const laterName = this._runName(later);
    const change = this._t('compare_change');
    return html`
      <div class="pickers">
        ${this._renderPicker('later', finalized, later.run_id)}
        ${this._renderPicker('earlier', finalized, earlier.run_id)}
      </div>
      <table data-testid="run-comparison" aria-busy=${this._comparing ? 'true' : 'false'}>
        <thead>
          <tr>
            <td></td>
            <th scope="col">${earlierName}</th>
            <th scope="col">${laterName}</th>
            <th scope="col">${change}</th>
          </tr>
        </thead>
        <tbody>
          ${comparison.metrics.map(
            (row) =>
              html`<tr data-metric=${row.metric} data-state=${row.state}>
                <th scope="row">${this._metricName(row.metric)}</th>
                <td data-label=${earlierName}>${this._metricValue(row.earlier)}</td>
                <td data-label=${laterName}>${this._metricValue(row.later)}</td>
                <td class="change" data-label=${change} data-direction=${row.direction ?? ''}>
                  ${this._change(row)}
                </td>
              </tr>`
          )}
          ${this._contextRows(comparison).map(
            ([label, first, second]) =>
              html`<tr data-context>
                <th scope="row">${label}</th>
                <td data-label=${earlierName}>${first}</td>
                <td data-label=${laterName}>${second}</td>
                <td class="change" data-label=${change}></td>
              </tr>`
          )}
        </tbody>
      </table>
      ${comparison.metrics.some((row) => row.goal === 'neutral')
        ? html`<p class="muted">${this._t('compare_neutral')}</p>`
        : nothing}
    `;
  }

  private _renderPanel(run: FoundRun | null): TemplateResult {
    if (this.tab === 'history') return this._renderHistory();
    if (this.tab === 'compare') return this._renderCompare();
    if (this._detailError) return html`<p class="refusal" role="alert">${this._detailError}</p>`;
    if (this._details?.outcome === 'not_found') return html`<p>${this._t('details_missing')}</p>`;
    if (!run) return html`<p class="muted">${this._t('details_loading')}</p>`;
    if (this.tab === 'participants') return this._renderParticipants(run);
    if (this.tab === 'performance') return this._renderPerformance(run);
    return this._renderOverview(run);
  }

  render() {
    const run = this._run();
    const tabs: TabStripTab[] = TABS.map((value) => ({
      value,
      label: value === 'participants' ? this._t('participants_heading') : this._t(`tab_${value}`),
      id: `run-view-tab-${value}`,
      controls: `run-view-panel-${value}`,
    }));
    return html`<gs-dialog
      open
      width="full"
      .heading=${run ? this._runName(run) : this._t('history_heading')}
      .subtitle=${run
        ? `${this._status(run.status)} · ${this._t(`state_${run.metrics_state ?? 'live'}`)}`
        : ''}
      .iconPath=${mdiSprout}
      @close=${this._close}
    >
      <div class="body">
        <gs-tab-strip
          .tabs=${tabs}
          .selected=${this.tab}
          .label=${this._t('view_tabs')}
          @tab-selected=${(event: CustomEvent<{ value: RunViewTab }>) =>
            this._selectTab(event.detail.value)}
        ></gs-tab-strip>
        <div
          role="tabpanel"
          id="run-view-panel-${this.tab}"
          aria-labelledby="run-view-tab-${this.tab}"
          tabindex="0"
          data-tab=${this.tab}
        >
          ${this._renderPanel(run)}
        </div>
      </div>
    </gs-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-run-view': GrowspaceRunView;
  }
}
