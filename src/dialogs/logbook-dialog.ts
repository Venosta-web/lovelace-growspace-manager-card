import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiFormatListBulleted,
  mdiChartTimelineVariant,
  mdiFileChart,
  mdiFilePdfBox,
  mdiCodeJson,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/growspace-logbook';
import '../features/shared/ui/growspace-timeline';
import '../features/shared/ui/gs-help-tooltip';
import '../features/shared/ui/quick-note-input';

import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { addGrowspaceNote } from '../slices/logbook';
import { GrowspaceStore } from '../store/core/growspace-store';
import { GrowReportData } from '../services/api/report-api';

type LogbookTab = 'list' | 'timeline' | 'report';

@customElement('logbook-dialog')
export class LogbookDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store?: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ type: String }) public growspaceId = '';

  @state() private _activeTab: LogbookTab = 'list';
  @state() private _loading = true;
  @state() private _error: string | null = null;
  @state() private _reportData: GrowReportData | null = null;
  @state() private _exporting = false;

  static styles = [
    dialogStyles,
    css`
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dialog-title-group {
        display: flex;
        flex-direction: column;
      }

      .dialog-subtitle {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }

      .content-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
        padding: 16px 24px;
      }

      .tab-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        padding-bottom: 2px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
      }

      .tab svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .tab:hover {
        color: var(--primary-text-color, #fff);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      .tab.active {
        color: var(--primary-color, #4caf50);
        border-bottom-color: var(--primary-color, #4caf50);
      }

      .list-view-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      growspace-logbook {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      quick-note-input {
        flex-shrink: 0;
        padding-top: 8px;
      }

      .timeline-placeholder {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--secondary-text-color);
      }

      .report-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        flex: 1;
        padding-right: 4px;
      }

      .summary-section {
        background: var(--card-background-color);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
      }

      .summary-section h3 {
        margin-top: 0;
        margin-bottom: 12px;
        color: var(--primary-text-color);
        font-size: 1.1em;
      }

      .grid-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stat-label {
        font-size: 0.85em;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 1.25em;
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .report-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--divider-color);
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px;
        color: var(--secondary-text-color);
        flex: 1;
      }
    `,
  ];

  protected willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    const tabChanged = changedProperties.has('_activeTab') && this._activeTab === 'report';
    const openedAndReport = changedProperties.has('open') && this.open && this._activeTab === 'report';
    const growspaceChanged = changedProperties.has('growspaceId') && this.growspaceId && this._activeTab === 'report';

    if (tabChanged || openedAndReport || growspaceChanged) {
      this._loadReport();
    }
  }

  private async _loadReport() {
    if (!this.store) return;
    this._loading = true;
    this._error = null;
    try {
      this._reportData = await this.store.actions.report.fetch(this.growspaceId);
    } catch (err: any) {
      this._error = err?.message || 'Failed to load grow report';
    } finally {
      this._loading = false;
    }
  }

  private async _exportReport(format: 'json' | 'pdf') {
    if (this._exporting || !this.store) return;
    this._exporting = true;
    try {
      await this.store.actions.report.export(this.growspaceId, format);
    } catch {
      // Toast is shown inside the action
    } finally {
      this._exporting = false;
    }
  }

  private _renderReportContent() {
    if (this._error) {
      return html`
        <ha-alert alert-type="error"> ${this._error} </ha-alert>
        <button class="md3-button primary" style="margin-top: 8px;" @click=${() => this._loadReport()}>Retry</button>
      `;
    }

    if (!this._reportData) {
      return html`<p>No report data available.</p>`;
    }

    return html`
      ${this._renderSummarySection()}
      ${this._renderEnvironmentSection()}
      ${this._renderHarvestSection()}
      <div class="report-actions">
        <button
          class="md3-button tonal"
          ?disabled=${this._exporting}
          @click=${() => this._exportReport('json')}
          style="display: flex; align-items: center; gap: 8px;"
        >
          <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
            <path d="${mdiCodeJson}"></path>
          </svg>
          Export JSON
        </button>
        <button
          class="md3-button primary"
          ?disabled=${this._exporting}
          @click=${() => this._exportReport('pdf')}
          style="display: flex; align-items: center; gap: 8px;"
        >
          <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;">
            <path d="${mdiFilePdfBox}"></path>
          </svg>
          Export PDF
        </button>
      </div>
    `;
  }

  private _renderSummarySection() {
    const summary = this._reportData?.summary;
    if (!summary) return '';

    return html`
      <div class="summary-section">
        <h3>Overview</h3>
        <div class="grid-stats">
          <div class="stat-item">
            <span class="stat-label">Total Plants</span>
            <span class="stat-value">${summary.plant_count || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Strains</span>
            <span class="stat-value">${summary.strains?.length || 0}</span>
          </div>
        </div>
        ${summary.strains?.length
          ? html`
              <div style="margin-top: 12px;">
                <span class="stat-label">Cultivated Strains:</span>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                  ${summary.strains.map((s: string) => html`<ha-chip>${s}</ha-chip>`)}
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private _renderEnvironmentSection() {
    const env = this._reportData?.environment;
    if (!env) return '';

    return html`
      <div class="summary-section">
        <h3>Environment Averages</h3>
        <div class="grid-stats">
          <div class="stat-item">
            <span class="stat-label">Temperature</span>
            <span class="stat-value"
              >${env.temperature_avg ? `${env.temperature_avg.toFixed(1)}°C` : 'N/A'}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Humidity</span>
            <span class="stat-value"
              >${env.humidity_avg ? `${env.humidity_avg.toFixed(1)}%` : 'N/A'}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">VPD</span>
            <span class="stat-value">${env.vpd_avg ? `${env.vpd_avg.toFixed(2)} kPa` : 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  }

  private _renderHarvestSection() {
    const harvest = this._reportData?.harvest;
    if (!harvest) return '';

    return html`
      <div class="summary-section">
        <h3>Harvest Metrics</h3>
        <div class="grid-stats">
          <div class="stat-item">
            <span class="stat-label">Total Wet Weight</span>
            <span class="stat-value"
              >${harvest.total_wet_weight ? `${harvest.total_wet_weight}g` : '0g'}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Dry Weight</span>
            <span class="stat-value"
              >${harvest.total_dry_weight ? `${harvest.total_dry_weight}g` : '0g'}</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Trim</span>
            <span class="stat-value"
              >${harvest.total_trim_weight ? `${harvest.total_trim_weight}g` : '0g'}</span
            >
          </div>
        </div>
      </div>
    `;
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async _handleNoteSubmit(e: CustomEvent) {
    const noteInput = this.shadowRoot?.querySelector('quick-note-input') as any;
    if (!noteInput) return;

    noteInput.setSaving(true);
    try {
      await addGrowspaceNote(this.growspaceId, {
        notes: e.detail.text,
        images: e.detail.images,
      });
      noteInput.clear();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));
    } catch (err) {
      console.error('Error adding growspace note:', err);
      noteInput.setSaving(false);
    }
  }

  render() {
    if (!this.open) return html``;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Events Logbook"
        subtitle="Recent events and history"
        .iconPath=${mdiFormatListBulleted}
        .containerStyle=${'height: 85vh'}
        @close=${this._close}
      >
        <gs-help-tooltip
          slot="header-extra"
          content="Free-form grow log — add notes, observations, or reminders tied to today's date."
          placement="bottom"
          label="Events Logbook"
        ></gs-help-tooltip>

        <div class="content-wrapper">
          <!-- Tab Switcher -->
          <div class="tab-bar">
            <button
              class="tab ${this._activeTab === 'list' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'list')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiFormatListBulleted}"></path></svg>
              <span>List View</span>
            </button>
            <button
              class="tab ${this._activeTab === 'timeline' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'timeline')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiChartTimelineVariant}"></path></svg>
              <span>Timeline</span>
            </button>
            <button
              class="tab ${this._activeTab === 'report' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'report')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiFileChart}"></path></svg>
              <span>Report</span>
            </button>
          </div>

          <!-- Content -->
          ${this._activeTab === 'list'
            ? html`
                <div class="list-view-container">
                  <growspace-logbook
                    .hass=${this.hass}
                    .growspaceId=${this.growspaceId}
                  ></growspace-logbook>
                  <quick-note-input
                    placeholder="Add a growspace note..."
                    @submit=${this._handleNoteSubmit}
                  ></quick-note-input>
                </div>
              `
            : this._activeTab === 'timeline'
              ? html`
                  <growspace-timeline
                    .hass=${this.hass}
                    .growspaceId=${this.growspaceId}
                  ></growspace-timeline>
                `
              : this._activeTab === 'report'
                ? this._loading
                  ? html`
                      <div class="loading-state">
                        <ha-circular-progress active></ha-circular-progress>
                        <span>Generating report data...</span>
                      </div>
                    `
                  : html`<div class="report-container">${this._renderReportContent()}</div>`
                : nothing}
        </div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'logbook-dialog': LogbookDialog;
  }
}
