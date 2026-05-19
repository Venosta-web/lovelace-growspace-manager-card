import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { SnapshotsDialogState } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import { mdiCamera, mdiClose, mdiRefresh } from '@mdi/js';
import { Snapshot } from '../services/api/camera-api';
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
        border-radius: 12px;
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
        border-radius: 12px;
        margin-top: 16px;
      }
      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .tab-bar {
        display: flex;
        border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
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
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s;
      }
      .tab-btn.active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }
    `,
    ];

    protected willUpdate(changedProperties: PropertyValues) {
        const opened = changedProperties.has('open') && this.open;
        const growspaceChanged = changedProperties.has('dialogState') && this.dialogState?.growspaceId && this.open;

        if (opened || growspaceChanged) {
            this._fetchSnapshots();
        }
    }

    private async _fetchSnapshots() {
        if (!this.dialogState?.growspaceId || !this.store?.actions.snapshots) return;

        this._isLoading = true;
        try {
            const response = await this.store.actions.snapshots.list(this.dialogState.growspaceId);
            if (response) {
                this._snapshots = response.snapshots || [];
            }
        } catch (err) {
            console.error('[SnapshotsDialog] Failed to fetch snapshots:', err);
            this.store.ui.showToast('Failed to load snapshots', 'error');
        } finally {
            this._isLoading = false;
        }
    }

    private async _captureSnapshot() {
        if (!this.dialogState?.growspaceId || !this.store?.actions.snapshots) return;

        this._isCapturing = true;
        try {
            await this.store.actions.snapshots.capture(this.dialogState.growspaceId);
            // Refresh the list immediately
            await this._fetchSnapshots();
        } catch (err: any) {
            console.error('[SnapshotsDialog] Failed to capture snapshot:', err);
            // Action handles toast
        } finally {
            this._isCapturing = false;
        }
    }

    private async _fetchVisionHistory() {
        if (!this.dialogState?.growspaceId || !this.store?.actions.snapshots) return;
        this._isLoadingVision = true;
        try {
            const response = await this.store.actions.snapshots.visionHistory(this.dialogState.growspaceId);
            if (response) {
                this._visionHistory = response.history || [];
                this._selectedResult = this._visionHistory[0] ?? null;
            }
        } catch (err) {
            console.error('[SnapshotsDialog] Failed to fetch vision history:', err);
            this.store.ui.showToast('Failed to load vision history', 'error');
        } finally {
            this._isLoadingVision = false;
        }
    }

    private async _runVisionCheckup() {
        if (!this.dialogState?.growspaceId || !this.store?.actions.snapshots) return;
        this._isRunningCheckup = true;
        try {
            await this.store.actions.snapshots.triggerCheckup(this.dialogState.growspaceId);
            await this._fetchVisionHistory();
        } catch (err) {
            console.error('[SnapshotsDialog] Failed to run vision checkup:', err);
            // Action handles error toast
        } finally {
            this._isRunningCheckup = false;
        }
    }

    private _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
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
                <button class="tab-btn ${this._activeTab === 'snapshots' ? 'active' : ''}"
                    @click=${() => { this._activeTab = 'snapshots'; }}>Snapshots</button>
                <button class="tab-btn ${this._activeTab === 'vision' ? 'active' : ''}"
                    @click=${() => { this._activeTab = 'vision'; this._fetchVisionHistory(); }}>Vision Checkup</button>
            </div>
        `;
    }

    private _renderVisionTab() {
        const SEVERITY_COLORS: Record<string, string> = {
            none: 'var(--secondary-text-color)',
            low: 'var(--success-color, #4caf50)',
            medium: 'var(--warning-color, #ff9800)',
            high: 'var(--error-color, #f44336)',
            critical: '#b71c1c',
        };
        const r = this._selectedResult;
        return html`
            <div class="vision-tab">
                <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
                    <md3-button class="run-checkup-btn"
                        @click=${this._runVisionCheckup}
                        ?disabled=${this._isRunningCheckup}>
                        ${this._isRunningCheckup ? 'Running...' : 'Run Checkup Now'}
                    </md3-button>
                </div>
                ${this._isLoadingVision
                    ? html`<div style="text-align:center;padding:32px;"><ha-circular-progress active></ha-circular-progress></div>`
                    : !r
                        ? html`<div class="vision-empty-state"><p>No vision checkups yet. Click "Run Checkup Now" to start.</p></div>`
                        : html`
                            <div class="latest-result">
                                <div class="result-header" style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                    <span class="severity-chip" style="background:${SEVERITY_COLORS[r.severity] ?? 'gray'};color:#fff;padding:4px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;">${r.severity}</span>
                                    <span style="text-transform:capitalize;opacity:0.7;">${r.check_type} check</span>
                                    <span style="opacity:0.5;font-size:0.8rem;">${this._formatDate(r.timestamp)}</span>
                                </div>
                                <p class="analysis-text" style="margin:0 0 12px;line-height:1.6;">${r.analysis}</p>
                                ${r.issues_detected.length > 0 ? html`
                                    <div style="margin-bottom:12px;">
                                        <strong style="font-size:0.85rem;">Issues detected</strong>
                                        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                                            ${r.issues_detected.map(i => html`<span class="issue-chip" style="background:rgba(244,67,54,0.15);color:var(--error-color,#f44336);border-radius:10px;padding:2px 10px;font-size:0.8rem;">${i}</span>`)}
                                        </div>
                                    </div>
                                ` : ''}
                                ${r.recommendations.length > 0 ? html`
                                    <div>
                                        <strong style="font-size:0.85rem;">Recommendations</strong>
                                        <ol style="margin:8px 0 0 16px;padding:0;">
                                            ${r.recommendations.map(rec => html`<li class="recommendation-item" style="margin-bottom:4px;font-size:0.9rem;">${rec}</li>`)}
                                        </ol>
                                    </div>
                                ` : ''}
                            </div>
                            ${this._visionHistory.length > 1 ? html`
                                <div style="margin-top:24px;border-top:1px solid var(--divider-color);padding-top:12px;">
                                    <strong style="font-size:0.85rem;opacity:0.7;">History</strong>
                                    ${this._visionHistory.map(entry => html`
                                        <div class="history-row"
                                            style="display:flex;align-items:center;gap:12px;padding:8px 4px;cursor:pointer;border-radius:8px;background:${this._selectedResult === entry ? 'rgba(255,255,255,0.05)' : 'transparent'};"
                                            @click=${() => { this._selectedResult = entry; }}>
                                            <span style="font-size:0.8rem;opacity:0.6;">${this._formatDate(entry.timestamp)}</span>
                                            <span style="text-transform:capitalize;font-size:0.8rem;opacity:0.7;">${entry.check_type}</span>
                                            <span style="background:${SEVERITY_COLORS[entry.severity]};color:#fff;padding:2px 8px;border-radius:10px;font-size:0.75rem;">${entry.severity}</span>
                                        </div>
                                    `)}
                                </div>
                            ` : ''}
                        `
                }
            </div>
        `;
    }

    render() {
        return html`
            <ha-dialog
                .open=${this.open}
                @closed=${this._close}
                heading="Camera Snapshots"
                hideActions
                width="large"
                .scrimClickAction=${''}
                .escapeKeyAction=${'close'}
            >
        <div class="glass-dialog-container">
            <!-- HEADER -->
            <div class="dialog-header">
                <div class="dialog-icon">
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${mdiCamera}"></path>
                    </svg>
                </div>
                <div class="dialog-title-group">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <h2 class="dialog-title">Camera Snapshots</h2>
                        <gs-help-tooltip
                            content="View and compare time-lapse camera snapshots from your grow space."
                            placement="bottom"
                            label="Camera Snapshots"
                        ></gs-help-tooltip>
                    </div>
                    <div class="dialog-subtitle">${this.growspaceName}</div>
                </div>
                <div class="header-actions" style="display:flex; gap:8px; margin-left: auto;">
                    <button class="md3-button text" @click=${this._fetchSnapshots} ?disabled=${this._isLoading} title="Refresh">
                        <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
                    </button>
                    <button class="md3-button text" @click=${this._close} title="Close">
                        <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                    </button>
                </div>
            </div>

            <div class="dialog-content">
                    ${this._renderTabBar()}

                    ${this._activeTab === 'snapshots' ? html`
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <p style="opacity: 0.7; margin: 0;">View recent camera captures from your growspace.</p>
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
                                        <p>Click "Capture Now" to take a picture using your configured cameras.</p>
                                    </div>
                                `
                    }
                        </div>
                    ` : this._renderVisionTab()}
                </div>
            </ha-dialog>
        `;
    }
}
