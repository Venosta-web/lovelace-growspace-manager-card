import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { SnapshotsDialogState } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import { mdiCamera, mdiRefresh, mdiClose } from '@mdi/js';
import {
  type Snapshot,
  getSnapshots,
  captureSnapshot,
  getVisionHistory,
  triggerVisionCheckup,
} from '../slices/camera';
import { withToast } from '../slices/ui';
import '../features/shared/ui';
import type { GrowspaceStore } from '../store/core/growspace-store';
import type { VisionCheckupResult } from '../lib/types/dialog';

@customElement('snapshots-dialog')
export class SnapshotsDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: SnapshotsDialogState | undefined;
  @property({ type: String }) public growspaceName = '';

  @state() private _snapshots: Snapshot[] = [];
  @state() private _isLoading = false;
  @state() private _isCapturing = false;
  @state() private _activeTab: 'snapshots' | 'vision' = 'snapshots';
  @state() private _visionHistory: VisionCheckupResult[] = [];
  @state() private _selectedResult: VisionCheckupResult | null = null;
  @state() private _isLoadingVision = false;
  @state() private _isRunningCheckup = false;
  @state() private _lightboxSrc: string | null = null;

  static styles = [
    dialogStyles,
    css`
      .snapshots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }
      .snapshot-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: var(--border-radius-md, 12px);
        overflow: hidden;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
      }
      .snapshot-image {
        width: 100%;
        height: 150px;
        object-fit: cover;
        background: rgba(0, 0, 0, 0.2);
      }
      .vision-snapshot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 8px;
      }
      .vision-snapshot-grid .snapshot-image {
        border-radius: var(--border-radius-sm, 8px);
      }
      .snapshot-info {
        padding: 12px;
        font-size: 0.85rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .empty-state {
        text-align: center;
        padding: 48px 24px;
        opacity: 0.6;
        background: rgba(255, 255, 255, 0.02);
        border-radius: var(--border-radius-md, 12px);
        margin-top: 16px;
      }
      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .tab-bar {
        display: flex;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        margin-bottom: 16px;
      }
      .tab-btn {
        flex: 1;
        padding: 10px 16px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        font-size: var(--font-size-sm);
        font-weight: 500;
        transition: all 0.2s;
      }
      .tab-btn.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }
      .lightbox-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
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
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-primary);
        cursor: pointer;
      }
    `,
  ];

  protected willUpdate(changedProperties: PropertyValues) {
    const opened = changedProperties.has('open') && this.open;
    const growspaceChanged =
      changedProperties.has('dialogState') && this.dialogState?.growspaceId && this.open;

    if (opened || growspaceChanged) {
      this._fetchSnapshots();
    }
  }

  private async _fetchSnapshots() {
    if (!this.dialogState?.growspaceId) return;

    this._isLoading = true;
    try {
      const response = await getSnapshots(this.dialogState.growspaceId);
      this._snapshots = response.snapshots;
    } catch (err) {
      console.error('[SnapshotsDialog] Failed to fetch snapshots:', err);
      this.store.ui.showToast('Failed to load snapshots', 'error');
    } finally {
      this._isLoading = false;
    }
  }

  private async _captureSnapshot() {
    if (!this.dialogState?.growspaceId) return;

    this._isCapturing = true;
    try {
      await captureSnapshot(this.dialogState.growspaceId);
      await this._fetchSnapshots();
    } catch (err: unknown) {
      console.error('[SnapshotsDialog] Failed to capture snapshot:', err);
      this.store.ui.showToast('Failed to capture snapshot', 'error');
    } finally {
      this._isCapturing = false;
    }
  }

  private async _fetchVisionHistory() {
    if (!this.dialogState?.growspaceId) return;
    this._isLoadingVision = true;
    try {
      const response = await getVisionHistory(this.dialogState.growspaceId);
      this._visionHistory = response.history || [];
      this._selectedResult = this._visionHistory[0] ?? null;
    } catch (err) {
      console.error('[SnapshotsDialog] Failed to fetch vision history:', err);
      this.store.ui.showToast('Failed to load vision history', 'error');
    } finally {
      this._isLoadingVision = false;
    }
  }

  private async _runVisionCheckup() {
    if (!this.dialogState?.growspaceId) return;
    const growspaceId = this.dialogState.growspaceId;
    this._isRunningCheckup = true;
    await withToast(
      async () => {
        await triggerVisionCheckup(growspaceId);
        await this.store.refreshData();
      },
      { success: 'Vision checkup triggered', errorPrefix: 'Failed to trigger checkup' }
    );
    this._isRunningCheckup = false;
    await this._fetchVisionHistory();
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _openLightbox(src: string) {
    this._lightboxSrc = src;
    // Capture-phase so Escape is intercepted before ha-dialog's escapeKeyAction
    // fires, keeping dismissal scoped to the lightbox.
    window.addEventListener('keydown', this._onLightboxKeydown, true);
  }

  private _closeLightbox() {
    this._lightboxSrc = null;
    window.removeEventListener('keydown', this._onLightboxKeydown, true);
  }

  private _onLightboxKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    this._closeLightbox();
  };

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._onLightboxKeydown, true);
  }

  private _renderLightbox() {
    if (!this._lightboxSrc) return '';
    return html`
      <div class="lightbox-backdrop" @click=${this._closeLightbox}>
        <button class="lightbox-close" @click=${this._closeLightbox} aria-label="Close">
          <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
        </button>
        <img
          class="lightbox-image"
          src="${this._lightboxSrc}"
          alt="Vision checkup snapshot enlarged"
          @click=${(e: Event) => e.stopPropagation()}
        />
      </div>
    `;
  }

  private _formatDate(timestampStr: string) {
    // Expected format from backend: YYYYMMDD_HHmmss
    if (timestampStr.length >= 15) {
      const year = timestampStr.substring(0, 4);
      const month = timestampStr.substring(4, 6);
      const day = timestampStr.substring(6, 8);
      const hh = timestampStr.substring(9, 11);
      const mm = timestampStr.substring(11, 13);
      return `${year}-${month}-${day} ${hh}:${mm}`;
    }
    return timestampStr;
  }

  private _renderTabBar() {
    return html`
      <div class="tab-bar">
        <button
          class="tab-btn ${this._activeTab === 'snapshots' ? 'active' : ''}"
          @click=${() => {
            this._activeTab = 'snapshots';
          }}
        >
          Snapshots
        </button>
        <button
          class="tab-btn ${this._activeTab === 'vision' ? 'active' : ''}"
          @click=${() => {
            this._activeTab = 'vision';
            this._fetchVisionHistory();
          }}
        >
          Vision Checkup
        </button>
      </div>
    `;
  }

  private _renderVisionTab() {
    const SEVERITY_COLORS: Record<string, string> = {
      none: 'var(--secondary-text-color)',
      low: 'var(--success-color, #4caf50)',
      medium: 'var(--warning-color, #ff9800)',
      high: 'var(--error-color, #f44336)',
      critical: 'var(--severity-critical, #b71c1c)',
    };
    const r = this._selectedResult;
    return html`
      <div class="vision-tab">
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <md3-button
            class="run-checkup-btn"
            @click=${this._runVisionCheckup}
            ?disabled=${this._isRunningCheckup}
          >
            ${this._isRunningCheckup ? 'Running...' : 'Run Checkup Now'}
          </md3-button>
        </div>
        ${this._isLoadingVision
          ? html`<div style="text-align:center;padding:32px;">
              <ha-circular-progress active></ha-circular-progress>
            </div>`
          : !r
            ? html`<div class="vision-empty-state">
                <p>No vision checkups yet. Click "Run Checkup Now" to start.</p>
              </div>`
            : html`
                <div class="latest-result">
                  <div
                    class="result-header"
                    style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"
                  >
                    <span
                      class="severity-chip"
                      style="background:${SEVERITY_COLORS[r.severity] ??
                      'gray'};color:var(--text-primary);padding:4px 10px;border-radius: var(--border-radius-md, 12px);font-size:var(--font-size-supporting);font-weight:600;"
                      >${r.severity}</span
                    >
                    <span style="text-transform:capitalize;opacity:0.7;"
                      >${r.check_type} check</span
                    >
                    <span style="opacity:0.5;font-size:var(--font-size-supporting);"
                      >${this._formatDate(r.timestamp)}</span
                    >
                  </div>
                  <p class="analysis-text" style="margin:0 0 12px;line-height:1.6;">
                    ${r.analysis}
                  </p>
                  ${r.issues_detected.length > 0
                    ? html`
                        <div style="margin-bottom:12px;">
                          <strong style="font-size:0.85rem;">Issues detected</strong>
                          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                            ${r.issues_detected.map(
                              (i: string) =>
                                html`<span
                                  class="issue-chip"
                                  style="background:rgba(244,67,54,0.15);color:var(--error-color,#f44336);border-radius: var(--border-radius-md, 12px);padding:2px 10px;font-size:var(--font-size-supporting);"
                                  >${i}</span
                                >`
                            )}
                          </div>
                        </div>
                      `
                    : ''}
                  ${r.recommendations.length > 0
                    ? html`
                        <div>
                          <strong style="font-size:0.85rem;">Recommendations</strong>
                          <ol style="margin:8px 0 0 16px;padding:0;">
                            ${r.recommendations.map(
                              (rec: string) =>
                                html`<li
                                  class="recommendation-item"
                                  style="margin-bottom:4px;font-size:var(--font-size-sm);"
                                >
                                  ${rec}
                                </li>`
                            )}
                          </ol>
                        </div>
                      `
                    : ''}
                  ${this._renderVisionSnapshots(r)}
                </div>
                ${this._visionHistory.length > 1
                  ? html`
                      <div
                        style="margin-top:24px;border-top:1px solid var(--divider-color);padding-top:12px;"
                      >
                        <strong style="font-size:0.85rem;opacity:0.7;">History</strong>
                        ${this._visionHistory.map(
                          (entry) => html`
                            <div
                              class="history-row"
                              style="display:flex;align-items:center;gap:12px;padding:8px 4px;cursor:pointer;border-radius: var(--border-radius-sm, 8px);background:${this
                                ._selectedResult === entry
                                ? 'rgba(255,255,255,0.05)'
                                : 'transparent'};"
                              @click=${() => {
                                this._selectedResult = entry;
                              }}
                            >
                              <span style="font-size:var(--font-size-supporting);opacity:0.6;"
                                >${this._formatDate(entry.timestamp)}</span
                              >
                              <span style="text-transform:capitalize;font-size:var(--font-size-supporting);opacity:0.7;"
                                >${entry.check_type}</span
                              >
                              <span
                                style="background:${SEVERITY_COLORS[
                                  entry.severity
                                ]};color:var(--text-primary);padding:2px 8px;border-radius: var(--border-radius-md, 12px);font-size:0.75rem;"
                                >${entry.severity}</span
                              >
                            </div>
                          `
                        )}
                      </div>
                    `
                  : ''}
              `}
      </div>
    `;
  }

  private _renderVisionSnapshots(r: VisionCheckupResult) {
    // Only render locally-served images; skip raw media-source:// fallbacks so
    // no broken image is shown.
    const paths = (r.snapshot_paths ?? []).filter((p) => p.startsWith('/local/'));
    if (paths.length === 0) return '';
    return html`
      <div class="vision-snapshot-grid" style="margin-top:12px;">
        ${paths.map(
          (path) => html`
            <img
              src="${path}"
              class="snapshot-image"
              alt="Vision checkup snapshot"
              loading="lazy"
              style="cursor:zoom-in;"
              @click=${() => this._openLightbox(path)}
              onerror="this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Cpath fill=\\'%23666\\' d=\\'M21,17H7V3H21M21,1H7A2,2 0 0,0 5,3V17A2,2 0 0,0 7,19H21A2,2 0 0,0 23,17V3A2,2 0 0,0 21,1M3,5H1V21A2,2 0 0,0 3,23H19V21H3V5M15.96,10.29L13.21,13.83L11.25,11.47L8.5,15H19.5L15.96,10.29Z\\'/%3E%3C/svg%3E'"
            />
          `
        )}
      </div>
    `;
  }

  render() {
    return html`
      <gs-dialog
        .open=${this.open}
        heading="Camera Snapshots"
        .subtitle=${this.growspaceName}
        .iconPath=${mdiCamera}
        @close=${this._close}
      >
        <div slot="header-extra" style="display:flex; gap:8px; align-items:center;">
          <gs-help-tooltip
            content="View and compare time-lapse camera snapshots from your grow space."
            placement="bottom"
            label="Camera Snapshots"
          ></gs-help-tooltip>
          <button
            class="md3-button text"
            @click=${this._fetchSnapshots}
            ?disabled=${this._isLoading}
            title="Refresh"
          >
            <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
          </button>
        </div>

        <div class="dialog-content">
          ${this._renderTabBar()}
          ${this._activeTab === 'snapshots'
            ? html`
                <div>
                  <div
                    style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"
                  >
                    <p style="opacity: 0.7; margin: 0;">
                      View recent camera captures from your growspace.
                    </p>
                    <md3-button
                      @click=${this._captureSnapshot}
                      ?disabled=${this._isCapturing}
                      style="--md-sys-color-primary: var(--primary-color);"
                    >
                      <ha-svg-icon .path=${mdiCamera} slot="icon"></ha-svg-icon>
                      ${this._isCapturing ? 'Capturing...' : 'Capture Now'}
                    </md3-button>
                  </div>

                  ${this._isLoading && this._snapshots.length === 0
                    ? html`<div style="text-align: center; padding: 40px;">
                        <ha-circular-progress active></ha-circular-progress>
                      </div>`
                    : this._snapshots.length > 0
                      ? html`
                          <div class="snapshots-grid">
                            ${this._snapshots.map(
                              (snapshot) => html`
                                <div class="snapshot-card">
                                  <img
                                    src="${snapshot.path}"
                                    class="snapshot-image"
                                    alt="Camera Snapshot"
                                    loading="lazy"
                                    onerror="this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Cpath fill=\\'%23666\\' d=\\'M21,17H7V3H21M21,1H7A2,2 0 0,0 5,3V17A2,2 0 0,0 7,19H21A2,2 0 0,0 23,17V3A2,2 0 0,0 21,1M3,5H1V21A2,2 0 0,0 3,23H19V21H3V5M15.96,10.29L13.21,13.83L11.25,11.47L8.5,15H19.5L15.96,10.29Z\\'/%3E%3C/svg%3E'"
                                  />
                                  <div class="snapshot-info">
                                    <span>${this._formatDate(snapshot.timestamp)}</span>
                                  </div>
                                </div>
                              `
                            )}
                          </div>
                        `
                      : html`
                          <div class="empty-state">
                            <ha-svg-icon
                              .path=${mdiCamera}
                              style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"
                            ></ha-svg-icon>
                            <h3>No Snapshots Found</h3>
                            <p>
                              Click "Capture Now" to take a picture using your configured cameras.
                            </p>
                          </div>
                        `}
                </div>
              `
            : this._renderVisionTab()}
        </div>
        ${this._renderLightbox()}
      </gs-dialog>
    `;
  }
}
