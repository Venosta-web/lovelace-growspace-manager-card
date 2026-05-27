import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiBrain, mdiRefresh } from '@mdi/js';
import { StoreController } from '@nanostores/lit';
import {
  aiBriefing$,
  isAiLoading$,
  aiMode$,
  fetchBriefing,
  applyAction,
  startConversation,
} from '../slices/ai-insight';
import type { AIBriefing, Recommendation } from '../slices/ai-insight/schema';

@customElement('gm-briefing-panel')
export class GmBriefingPanel extends LitElement {
  @property({ type: String }) growspaceid = '';

  @state() private _followUp = '';

  private _briefing = new StoreController(this, aiBriefing$);
  private _loading = new StoreController(this, isAiLoading$);

  connectedCallback() {
    super.connectedCallback();
    if (!aiBriefing$.get()) {
      fetchBriefing();
    }
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    /* ── Rail ─────────────────────────────────────────────────── */
    .briefing-rail {
      width: 220px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      overflow-y: auto;
    }

    .rail-section-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
      padding: 0 4px;
      margin-top: 8px;
    }

    .v1-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--primary-text-color);
      font-size: 0.82rem;
      font-family: inherit;
      text-align: left;
      width: 100%;
      transition: background 150ms;
    }
    .v1-nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .v1-nav-item[aria-pressed='true'] {
      background: rgba(156, 39, 176, 0.14);
      color: var(--ai-violet, #9c27b0);
    }

    /* ── Content ──────────────────────────────────────────────── */
    .briefing-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .briefing-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      flex-shrink: 0;
    }
    .briefing-breadcrumb {
      flex: 1;
      font-size: 0.82rem;
      color: var(--secondary-text-color);
    }
    .briefing-regenerate {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      padding: 5px 12px;
      border-radius: 20px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
      background: none;
      cursor: pointer;
      color: var(--primary-text-color);
      font-family: inherit;
      transition: background 150ms;
    }
    .briefing-regenerate:hover {
      background: rgba(255, 255, 255, 0.07);
    }

    .v1-content-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Loading ──────────────────────────────────────────────── */
    .briefing-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 12px;
      color: var(--secondary-text-color);
      font-size: 0.9rem;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .briefing-spinner {
      animation: spin 1s linear infinite;
      width: 22px;
      height: 22px;
    }

    /* ── TL;DR (insight-head) ─────────────────────────────────── */
    .insight-head {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .insight-head-top {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .insight-head h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      flex: 1;
      line-height: 1.3;
    }
    .insight-head p {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.6;
      color: var(--secondary-text-color);
    }
    .insight-head p em {
      font-style: normal;
      color: var(--primary-text-color);
      font-weight: 500;
    }
    .conf-meter {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--secondary-text-color);
    }
    .conf-bar {
      height: 4px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      width: 60px;
      overflow: hidden;
    }
    .conf-fill {
      height: 100%;
      background: var(--ai-violet, #9c27b0);
      border-radius: 4px;
    }
    .drawn-from {
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      opacity: 0.7;
    }

    /* ── KPI row ──────────────────────────────────────────────── */
    .kpi-row {
      display: flex;
      gap: 10px;
    }
    .kpi-card {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-label {
      font-size: 0.72rem;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 1.3rem;
      font-weight: 700;
      line-height: 1;
    }
    .kpi-unit {
      font-size: 0.72rem;
      color: var(--secondary-text-color);
      font-weight: 400;
      margin-left: 2px;
    }
    .kpi-delta {
      font-size: 0.72rem;
      color: var(--ai-accent, #4caf50);
    }

    /* ── Evidence card ────────────────────────────────────────── */
    .evidence-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 14px;
      padding: 14px 16px;
    }
    .evidence-title {
      font-size: 0.78rem;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .evidence-chart {
      width: 100%;
      height: 80px;
    }
    .evidence-legend {
      display: flex;
      gap: 14px;
      margin-top: 8px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      color: var(--secondary-text-color);
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    /* ── Recommendations ──────────────────────────────────────── */
    .reco-section-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .reco-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
    }
    .reco-body { flex: 1; }
    .reco-title {
      font-size: 0.88rem;
      font-weight: 600;
      margin: 0 0 3px;
    }
    .reco-desc {
      font-size: 0.8rem;
      color: var(--secondary-text-color);
      margin: 0;
    }
    .reco-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .impact-badge {
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .impact-badge[data-impact='high'] {
      background: rgba(244, 67, 54, 0.2);
      color: var(--error-color, #f44336);
    }
    .impact-badge[data-impact='medium'] {
      background: rgba(255, 152, 0, 0.2);
      color: var(--ai-amber, #ff9800);
    }
    .impact-badge[data-impact='low'] {
      background: rgba(33, 150, 243, 0.2);
      color: var(--primary-color, #2196f3);
    }
    .reco-apply {
      font-size: 0.75rem;
      padding: 4px 12px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      background: var(--ai-violet, #9c27b0);
      color: #fff;
    }

    /* ── Follow-up ────────────────────────────────────────────── */
    .follow-up-wrap {
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      padding: 10px 16px 12px;
      flex-shrink: 0;
    }
    .follow-up {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 20px;
      padding: 9px 16px;
      color: var(--primary-text-color, #fff);
      font-family: inherit;
      font-size: 0.88rem;
      box-sizing: border-box;
    }
    .follow-up:focus {
      outline: none;
      border-color: rgba(156, 39, 176, 0.5);
    }
  `;

  private async _regenerate() {
    await fetchBriefing(true);
  }

  private async _submitFollowUp() {
    const text = this._followUp.trim();
    if (!text) return;
    this._followUp = '';
    await startConversation(this.growspaceid, text);
    aiMode$.set('chat');
  }

  private _renderLoading() {
    return html`
      <div class="briefing-loading">
        <svg class="briefing-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 10 10" stroke-linecap="round"/>
        </svg>
        Fetching briefing…
      </div>
    `;
  }

  private _renderRail() {
    const BRIEFING_ITEMS = [
      'Morning briefing',
      'Risk watch',
      "What's going well",
      '7-day forecast',
    ];
    return html`
      <aside class="briefing-rail">
        <div class="rail-section-label">Briefings</div>
        ${BRIEFING_ITEMS.map((label, i) => html`
          <button class="v1-nav-item" aria-pressed=${i === 0 ? 'true' : 'false'}>
            ${label}
          </button>
        `)}
      </aside>
    `;
  }

  private _renderChart() {
    return html`
      <div class="evidence-card">
        <div class="evidence-title">VPD + Canopy Temp · 24h</div>
        <svg class="evidence-chart" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
          <!-- target band -->
          <rect x="0" y="20" width="400" height="20" fill="rgba(76,175,80,0.08)" />
          <!-- VPD line (purple) -->
          <polyline
            points="0,40 50,35 100,30 150,28 200,25 250,30 300,22 350,18 400,20"
            fill="none" stroke="var(--ai-violet,#9c27b0)" stroke-width="2"
          />
          <!-- canopy temp line (amber) -->
          <polyline
            points="0,60 50,55 100,50 150,52 200,48 250,44 300,46 350,40 400,38"
            fill="none" stroke="var(--ai-amber,#ff9800)" stroke-width="2"
          />
          <!-- spike marker -->
          <circle cx="300" cy="22" r="4" fill="var(--error-color,#f44336)" />
        </svg>
        <div class="evidence-legend">
          <div class="legend-item">
            <div class="legend-dot" style="background:var(--ai-violet,#9c27b0)"></div>VPD
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background:var(--ai-amber,#ff9800)"></div>Canopy temp
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background:rgba(76,175,80,0.4)"></div>Target band
          </div>
        </div>
      </div>
    `;
  }

  private _renderReco(reco: Recommendation) {
    return html`
      <div class="reco-row">
        <div class="reco-body">
          <p class="reco-title">${reco.title}</p>
          <p class="reco-desc">${reco.description}</p>
          <div class="reco-footer">
            <span class="impact-badge" data-impact=${reco.impact}>${reco.impact}</span>
            ${reco.suggested_action
              ? html`<button class="reco-apply" @click=${() => applyAction(reco.suggested_action!)}>Apply</button>`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private _renderBriefing(briefing: AIBriefing) {
    const ts = new Date(briefing.generated_at * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return html`
      <header class="briefing-header">
        <span class="briefing-breadcrumb">Briefing · ${ts}</span>
        <button class="briefing-regenerate" @click=${this._regenerate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d=${mdiRefresh}></path>
          </svg>
          Regenerate
        </button>
      </header>
      <div class="v1-content-scroll">
        <!-- TL;DR card -->
        <div class="insight-head">
          <div class="insight-head-top">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color:var(--ai-violet,#9c27b0);flex-shrink:0">
              <path d=${mdiBrain}></path>
            </svg>
            <h3>${briefing.headline ?? 'Morning Briefing'}</h3>
          </div>
          ${briefing.confidence !== undefined ? html`
            <div class="conf-meter">
              <div class="conf-bar">
                <div class="conf-fill" style="width:${Math.round(briefing.confidence * 100)}%"></div>
              </div>
              ${Math.round(briefing.confidence * 100)}% confidence
            </div>
          ` : nothing}
          ${briefing.drawn_from ? html`<div class="drawn-from">Drawn from ${briefing.drawn_from}</div>` : nothing}
          <p>${briefing.summary_text}</p>
        </div>

        <!-- KPI row -->
        <div class="kpi-row">
          ${briefing.kpis.map((kpi) => html`
            <div class="kpi-card">
              <div class="kpi-label">${kpi.label}</div>
              <div class="kpi-value">
                ${kpi.value}<span class="kpi-unit">${kpi.unit ?? ''}</span>
              </div>
              ${kpi.delta ? html`<div class="kpi-delta">${kpi.delta}</div>` : nothing}
            </div>
          `)}
        </div>

        <!-- Evidence chart -->
        ${this._renderChart()}

        <!-- Recommendations -->
        <div class="reco-section-title">
          Recommendations · ${briefing.recommendations.length} actionable
        </div>
        ${briefing.recommendations.map((r) => this._renderReco(r))}
      </div>

      <!-- Follow-up input -->
      <div class="follow-up-wrap">
        <input
          class="follow-up"
          type="text"
          placeholder="Ask a follow-up question…"
          .value=${this._followUp}
          @input=${(e: Event) => { this._followUp = (e.target as HTMLInputElement).value; }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') this._submitFollowUp();
          }}
        />
      </div>
    `;
  }

  render() {
    const briefing = this._briefing.value;
    const loading = this._loading.value;

    return html`
      ${this._renderRail()}
      <div class="briefing-content">
        ${!briefing && loading ? this._renderLoading() : nothing}
        ${briefing ? this._renderBriefing(briefing) : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gm-briefing-panel': GmBriefingPanel;
  }
}
