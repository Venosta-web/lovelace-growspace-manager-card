import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { mdiInbox } from '@mdi/js';
import { StoreController } from '@nanostores/lit';
import { aiAlerts$, aiBriefing$, fetchAlerts, resolveAlert, applyAction } from '../slices/ai-insight';
import type { TriageAlert, SuggestedAction } from '../slices/ai-insight/schema';

type InboxFilter = 'all' | 'action' | 'watch';

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

@customElement('gm-inbox-panel')
export class GmInboxPanel extends LitElement {
  @property({ type: String }) growspaceid = '';
  @property({ type: String }) growspacename = '';

  @state() private _filter: InboxFilter = 'all';
  @state() private _selectedId: string | null = null;
  @state() private _readIds = new Set<string>();
  @state() private _showNoteInput = false;
  @state() private _noteText = '';

  private _alerts = new StoreController(this, aiAlerts$);
  private _briefing = new StoreController(this, aiBriefing$);

  connectedCallback() {
    super.connectedCallback();
    fetchAlerts(this.growspaceid || undefined);
  }

  private get _filtered(): TriageAlert[] {
    const all = this._alerts.value.filter((a) => !a.resolved);
    if (this._filter === 'action') return all.filter((a) => a.severity === 'danger');
    if (this._filter === 'watch') return all.filter((a) => a.severity === 'warning');
    return all;
  }

  private get _selected(): TriageAlert | undefined {
    return this._selectedId ? this._alerts.value.find((a) => a.id === this._selectedId) : undefined;
  }

  private _selectAlert(id: string) {
    this._selectedId = id;
    this._readIds = new Set([...this._readIds, id]);
    this._showNoteInput = false;
    this._noteText = '';
  }

  private _setFilter(f: InboxFilter) {
    this._filter = f;
    this._selectedId = null;
    this._showNoteInput = false;
  }

  private async _resolve(alert: TriageAlert, note?: string) {
    await resolveAlert(alert.id, note);
    this._selectedId = null;
    this._showNoteInput = false;
    this._noteText = '';
  }

  private async _applyAction(action: SuggestedAction) {
    await applyAction(action);
  }

  private _countFor(f: InboxFilter): number {
    const all = this._alerts.value.filter((a) => !a.resolved);
    if (f === 'action') return all.filter((a) => a.severity === 'danger').length;
    if (f === 'watch') return all.filter((a) => a.severity === 'warning').length;
    return all.length;
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    /* ── Layout ─────────────────────────────────────────────── */
    .inbox-shell {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    /* ── Rail ───────────────────────────────────────────────── */
    .inbox-rail {
      width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      overflow: hidden;
    }

    /* ── Filter strip ──────────────────────────────────────── */
    .inbox-filters {
      display: flex;
      gap: 6px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      flex-shrink: 0;
    }

    .inbox-filter-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: none;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      font-size: 0.78rem;
      cursor: pointer;
      font-family: inherit;
      transition: background 150ms, color 150ms;
    }

    .inbox-filter-pill[aria-pressed='true'] {
      background: rgba(255, 152, 0, 0.15);
      color: var(--ai-amber, #ff9800);
      border-color: var(--ai-amber, #ff9800);
    }

    .pill-count {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 0 5px;
      font-size: 0.7rem;
      min-width: 16px;
      text-align: center;
    }

    /* ── Alert list ─────────────────────────────────────────── */
    .inbox-list {
      flex: 1;
      overflow-y: auto;
    }

    .inbox-row {
      display: flex;
      align-items: stretch;
      gap: 0;
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      transition: background 150ms;
    }

    .inbox-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .inbox-row[aria-selected='true'] {
      background: rgba(255, 152, 0, 0.08);
    }

    .inbox-severity-bar {
      width: 3px;
      border-radius: 2px;
      margin-right: 10px;
      flex-shrink: 0;
      background: var(--secondary-text-color);
    }

    .inbox-severity-bar[data-severity='danger'] {
      background: var(--error-color, #f44336);
    }

    .inbox-severity-bar[data-severity='warning'] {
      background: var(--warning-color, #ff9800);
    }

    .inbox-severity-bar[data-severity='info'] {
      background: var(--success-color, #4caf50);
    }

    .inbox-row-body {
      flex: 1;
      min-width: 0;
    }

    .inbox-row-title {
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .inbox-unread-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ai-amber, #ff9800);
      flex-shrink: 0;
    }

    .inbox-row-desc {
      font-size: 0.78rem;
      color: var(--secondary-text-color);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .inbox-row-time {
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      margin-top: 4px;
      opacity: 0.7;
    }

    /* ── AI unavailable banner ──────────────────────────────── */
    .ai-unavailable-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 152, 0, 0.08);
      border-bottom: 1px solid rgba(255, 152, 0, 0.2);
      font-size: 0.78rem;
      color: var(--ai-amber, #ff9800);
      flex-shrink: 0;
    }

    /* ── Empty state ────────────────────────────────────────── */
    .inbox-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      color: var(--secondary-text-color);
      padding: 24px;
      text-align: center;
    }

    .inbox-empty svg {
      opacity: 0.3;
    }

    /* ── Detail pane ────────────────────────────────────────── */
    .inbox-detail {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 0;
    }

    .inbox-no-selection {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      opacity: 0.5;
    }

    /* ── Detail header ──────────────────────────────────────── */
    .inbox-detail-head {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .inbox-detail-head h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .inbox-detail-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .inbox-severity-pill {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .inbox-severity-pill[data-severity='danger'] {
      background: rgba(244, 67, 54, 0.15);
      color: #f44336;
    }

    .inbox-severity-pill[data-severity='warning'] {
      background: rgba(255, 152, 0, 0.15);
      color: #ff9800;
    }

    .inbox-severity-pill[data-severity='info'] {
      background: rgba(76, 175, 80, 0.15);
      color: #4caf50;
    }

    .inbox-detail-time {
      font-size: 0.78rem;
      color: var(--secondary-text-color);
    }

    /* ── Reasoning ──────────────────────────────────────────── */
    .reasoning {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 14px 16px;
    }

    .reasoning-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }

    .reasoning-text {
      font-size: 0.88rem;
      line-height: 1.6;
    }

    .reasoning-bayesian-item {
      font-size: 0.85rem;
      line-height: 1.5;
      padding: 2px 0;
    }

    .reasoning-bayesian-item::before {
      content: '• ';
    }

    /* ── Evidence photo ─────────────────────────────────────── */
    .photo-evid {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .photo-evid-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--secondary-text-color);
    }

    .photo-evid-placeholder {
      width: 100%;
      height: 100px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      font-size: 0.8rem;
    }

    /* ── KPI cards ──────────────────────────────────────────── */
    .kpi-row {
      display: flex;
      gap: 8px;
    }

    .kpi-card {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 10px 12px;
    }

    .kpi-card-label {
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      text-transform: uppercase;
    }

    .kpi-card-value {
      font-size: 1rem;
      font-weight: 600;
      margin-top: 4px;
    }

    /* ── Suggested actions ──────────────────────────────────── */
    .reco-section-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--secondary-text-color);
    }

    .reco-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
    }

    .reco-row-body {
      flex: 1;
      font-size: 0.85rem;
    }

    .apply-btn {
      background: rgba(76, 175, 80, 0.15);
      color: var(--success-color, #4caf50);
      border: none;
      border-radius: 8px;
      padding: 6px 14px;
      cursor: pointer;
      font-size: 0.82rem;
      font-family: inherit;
    }

    .apply-btn:hover {
      background: rgba(76, 175, 80, 0.25);
    }

    /* ── Action ribbon ──────────────────────────────────────── */
    .action-ribbon {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      flex-wrap: wrap;
    }

    .action-ribbon-hint {
      flex: 1;
      font-size: 0.8rem;
      color: var(--secondary-text-color);
      min-width: 160px;
    }

    .add-note-btn,
    .resolve-btn {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 6px 14px;
      cursor: pointer;
      font-size: 0.82rem;
      font-family: inherit;
      color: var(--primary-text-color, #fff);
    }

    .resolve-btn {
      background: rgba(76, 175, 80, 0.12);
      color: var(--success-color, #4caf50);
      border-color: var(--success-color, #4caf50);
    }

    .resolve-btn:hover {
      background: rgba(76, 175, 80, 0.22);
    }

    /* ── Note input ─────────────────────────────────────────── */
    .note-area {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .note-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-family: inherit;
      font-size: 0.88rem;
      resize: none;
    }

    .note-submit-btn {
      background: rgba(76, 175, 80, 0.15);
      color: var(--success-color, #4caf50);
      border: 1px solid var(--success-color, #4caf50);
      border-radius: 8px;
      padding: 6px 14px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.82rem;
    }
  `;

  private _renderFilterStrip() {
    const filters: { key: InboxFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'action', label: 'Action' },
      { key: 'watch', label: 'Watch' },
    ];

    return html`
      <div class="inbox-filters">
        ${filters.map(
          ({ key, label }) => html`
            <button
              class="inbox-filter-pill"
              aria-pressed=${this._filter === key ? 'true' : 'false'}
              @click=${() => this._setFilter(key)}
            >
              ${label}
              <span class="pill-count">${this._countFor(key)}</span>
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderAlertList() {
    const items = this._filtered;

    if (items.length === 0) {
      return html`
        <div class="inbox-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="${mdiInbox}"></path>
          </svg>
          <p>No alerts</p>
        </div>
      `;
    }

    return html`
      <div class="inbox-list">
        ${repeat(
          items,
          (a) => a.id,
          (a) => {
            const isRead = this._readIds.has(a.id);
            return html`
              <div
                class="inbox-row"
                aria-selected=${this._selectedId === a.id ? 'true' : 'false'}
                @click=${() => this._selectAlert(a.id)}
              >
                <div
                  class="inbox-severity-bar"
                  data-severity=${a.severity ?? 'info'}
                ></div>
                <div class="inbox-row-body">
                  <div class="inbox-row-title">
                    ${!isRead ? html`<span class="inbox-unread-dot"></span>` : nothing}
                    ${a.title ?? a.type}
                  </div>
                  ${a.description
                    ? html`<div class="inbox-row-desc">${a.description}</div>`
                    : nothing}
                  <div class="inbox-row-time">${formatRelative(a.timestamp)}</div>
                </div>
              </div>
            `;
          }
        )}
      </div>
    `;
  }

  private _renderDetailPane() {
    const alert = this._selected;

    if (!alert) {
      return html`<div class="inbox-no-selection">Select an alert to view details</div>`;
    }

    const hasAiReasoning = !!alert.ai_reasoning;

    return html`
      <div class="inbox-detail">
        <!-- Header -->
        <div class="inbox-detail-head">
          <h3>${alert.title ?? alert.type}</h3>
          <div class="inbox-detail-meta">
            <span class="inbox-severity-pill" data-severity=${alert.severity ?? 'info'}>
              ${alert.severity ?? 'info'}
            </span>
            <span class="inbox-detail-time">${formatRelative(alert.timestamp)}</span>
          </div>
        </div>

        <!-- Reasoning -->
        <div class="reasoning">
          <div class="reasoning-label">Why I flagged this</div>
          ${hasAiReasoning
            ? html`<div class="reasoning-text">${alert.ai_reasoning}</div>`
            : alert.bayesian_reasons.map(
                (r) => html`<div class="reasoning-bayesian-item">${r}</div>`
              )}
        </div>

        <!-- Evidence photo (only when AI reasoning is present) -->
        ${hasAiReasoning
          ? html`
              <div class="photo-evid">
                <div class="photo-evid-label">Evidence snapshot</div>
                <div class="photo-evid-placeholder">Camera snapshot unavailable</div>
              </div>
            `
          : nothing}

        <!-- KPI row -->
        ${alert.kpis && alert.kpis.length > 0
          ? html`
              <div class="kpi-row">
                ${alert.kpis.map(
                  (k) => html`
                    <div class="kpi-card">
                      <div class="kpi-card-label">${k.label}</div>
                      <div class="kpi-card-value">${k.value}${k.unit ? html` <small>${k.unit}</small>` : nothing}</div>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}

        <!-- Suggested actions -->
        ${alert.suggested_actions && alert.suggested_actions.length > 0
          ? html`
              <div class="reco-section-label">Suggested actions</div>
              ${alert.suggested_actions.map(
                (action) => html`
                  <div class="reco-row">
                    <div class="reco-row-body">${action.description}</div>
                    <button
                      class="apply-btn"
                      @click=${() => this._applyAction(action)}
                    >Apply</button>
                  </div>
                `
              )}
            `
          : nothing}

        <!-- Action ribbon -->
        <div class="action-ribbon">
          <span class="action-ribbon-hint">
            Resolved manually? Tell Grow Master what you did.
          </span>
          ${this._showNoteInput
            ? html`
                <div class="note-area">
                  <input
                    class="note-input"
                    type="text"
                    placeholder="Add a note…"
                    .value=${this._noteText}
                    @input=${(e: Event) => { this._noteText = (e.target as HTMLInputElement).value; }}
                  />
                  <button
                    class="note-submit-btn"
                    @click=${() => this._resolve(alert, this._noteText)}
                  >Submit</button>
                </div>
              `
            : html`
                <button
                  class="add-note-btn"
                  @click=${() => { this._showNoteInput = true; }}
                >Add note</button>
                <button
                  class="resolve-btn"
                  @click=${() => this._resolve(alert)}
                >Resolve</button>
              `}
        </div>
      </div>
    `;
  }

  private _renderAiUnavailableBanner() {
    return html`
      <div class="ai-unavailable-banner">
        AI reasoning unavailable — alerts shown without enrichment.
      </div>
    `;
  }

  render() {
    const aiAvailable = this._briefing.value?.ai_available;
    return html`
      <div class="inbox-shell">
        <div class="inbox-rail">
          ${aiAvailable === false ? this._renderAiUnavailableBanner() : nothing}
          ${this._renderFilterStrip()}
          ${this._renderAlertList()}
        </div>
        ${this._renderDetailPane()}
      </div>
    `;
  }
}
