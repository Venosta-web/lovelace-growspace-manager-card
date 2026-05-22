import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared.styles';
import { GrowspaceStore } from '../store/core/growspace-store';
import { GrowReportDialogState } from '../lib/types/dialog';
import { GrowReportData } from '../services/api/report-api';
import { mdiClose, mdiFilePdfBox, mdiCodeJson } from '@mdi/js';
import '../features/shared/ui/gs-help-tooltip';

@customElement('grow-report-dialog')
export class GrowReportDialog extends LitElement {
  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) store!: GrowspaceStore;
  @property({ attribute: false }) state!: GrowReportDialogState;

  @state() private _loading = true;
  @state() private _error: string | null = null;
  @state() private _reportData: GrowReportData | null = null;
  @state() private _exporting = false;

  static styles = [
    sharedStyles,
    css`
      .content {
        display: flex;
        flex-direction: column;
        gap: 16px;
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
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      pre {
        background: var(--secondary-background-color);
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 0.9em;
      }
    `,
  ];

  protected willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    const opened = changedProperties.has('open') && this.open;
    const growspaceChanged = changedProperties.has('state') && this.state?.growspaceId && this.open;

    if (opened || growspaceChanged) {
      this._loadReport();
    }
  }

  private async _loadReport() {
    this._loading = true;
    this._error = null;
    try {
      this._reportData = await this.store.actions.report.fetch(this.state.growspaceId);
    } catch (err: any) {
      this._error = err?.message || 'Failed to load grow report';
      // Toast is shown inside the action
    } finally {
      this._loading = false;
    }
  }

  private async _exportReport(format: 'json' | 'pdf') {
    if (this._exporting) return;
    this._exporting = true;
    try {
      await this.store.actions.report.export(this.state.growspaceId, format);
    } catch {
      // Toast is shown inside the action
    } finally {
      this._exporting = false;
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="large"
      >
        <div class="dialog-header">
          <div style="display: flex; flex-direction: column;">
            <div style="display:flex;align-items:center;gap:6px;">
              <h2 class="dialog-title">Grow Report</h2>
              <gs-help-tooltip
                content="Generate a summary report of this grow cycle including environment averages, yield, and key events."
                placement="bottom"
                label="Grow Report"
              ></gs-help-tooltip>
            </div>
            <div class="dialog-subtitle">${this.state?.growspaceId ? this.store.data.$devices.get().find(d => d.deviceId === this.state.growspaceId)?.name : ''}</div>
          </div>
          <ha-icon-button
            .path=${mdiClose}
            @click=${this._close}
            title="Close"
          ></ha-icon-button>
        </div>
        <div class="content">

          ${this._loading
            ? html`<div class="loading-state">
                <ha-circular-progress active></ha-circular-progress>
                <span>Generating report data...</span>
              </div>`
            : this._renderReportContent()}
          
        </div>
        
        <div slot="primaryAction" class="actions">
          <mwc-button
            label="Close"
            @click=${this._close}
          ></mwc-button>
          ${this._reportData ? html`
            <mwc-button
              outlined
              label="Export JSON"
              icon="mdi:code-json"
              ?disabled=${this._exporting}
              @click=${() => this._exportReport('json')}
            ></mwc-button>
            <mwc-button
              raised
              label="Export PDF"
              icon="mdi:file-pdf-box"
              ?disabled=${this._exporting}
              @click=${() => this._exportReport('pdf')}
            ></mwc-button>
          ` : ''}
        </div>
      </ha-dialog>
    `;
  }

  private _renderReportContent() {
    if (this._error) {
      return html`
        <ha-alert alert-type="error">
          ${this._error}
        </ha-alert>
        <mwc-button label="Retry" @click=${() => this._loadReport()}></mwc-button>
      `;
    }

    if (!this._reportData) {
      return html`<p>No report data available.</p>`;
    }

    return html`
      ${this._renderSummarySection()}
      ${this._renderEnvironmentSection()}
      ${this._renderHarvestSection()}
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
        ${summary.strains?.length ? html`
          <div style="margin-top: 12px;">
            <span class="stat-label">Cultivated Strains:</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
              ${summary.strains.map((s: string) => html`<ha-chip>${s}</ha-chip>`)}
            </div>
          </div>
        ` : ''}
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
            <span class="stat-value">${env.temperature_avg ? `${env.temperature_avg.toFixed(1)}°C` : 'N/A'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Humidity</span>
            <span class="stat-value">${env.humidity_avg ? `${env.humidity_avg.toFixed(1)}%` : 'N/A'}</span>
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
            <span class="stat-value">${harvest.total_wet_weight ? `${harvest.total_wet_weight}g` : '0g'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Dry Weight</span>
            <span class="stat-value">${harvest.total_dry_weight ? `${harvest.total_dry_weight}g` : '0g'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Trim</span>
            <span class="stat-value">${harvest.total_trim_weight ? `${harvest.total_trim_weight}g` : '0g'}</span>
          </div>
        </div>
      </div>
    `;
  }
}
