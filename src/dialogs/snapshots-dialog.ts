import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { SnapshotsDialogState } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import { mdiCamera, mdiClose, mdiRefresh } from '@mdi/js';
import { Snapshot } from '../services/api/camera-api';
import '../components/ui';
import type { GrowspaceStore } from '../store/core/growspace-store';

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

    static styles = [
        dialogStyles,
        css`
      :host {
        --mdc-dialog-min-width: clamp(350px, 800px, 90vw);
      }
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
        if (!this.dialogState?.growspaceId || !this.store?.dataService) return;

        this._isLoading = true;
        try {
            const response = await this.store.dataService.getSnapshots(this.dialogState.growspaceId);
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
        if (!this.dialogState?.growspaceId || !this.store?.dataService) return;

        this._isCapturing = true;
        try {
            await this.store.dataService.captureSnapshot(this.dialogState.growspaceId);
            this.store.ui.showToast('Snapshot captured successfully', 'success');
            // Refresh the list immediately
            await this._fetchSnapshots();
        } catch (err: any) {
            console.error('[SnapshotsDialog] Failed to capture snapshot:', err);
            // Backend might return "no_cameras" error
            if (err?.code === 'no_cameras') {
                this.store.ui.showToast('No cameras configured for this growspace.', 'error');
            } else {
                this.store.ui.showToast('Failed to capture snapshot', 'error');
            }
        } finally {
            this._isCapturing = false;
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

    render() {
        return html`
            <ha-dialog
                .open=${this.open}
                @closed=${this._close}
                heading="Camera Snapshots"
                hideActions
            >
                <!-- Custom Header -->
                <div slot="heading" class="dialog-header">
                    <div style="display: flex; flex-direction: column;">
                        <h2 class="dialog-title">Camera Snapshots</h2>
                        <div class="dialog-subtitle">${this.growspaceName}</div>
                    </div>
                    <div class="header-actions">
                        <ha-icon-button
                            .path=${mdiRefresh}
                            @click=${this._fetchSnapshots}
                            ?disabled=${this._isLoading}
                            title="Refresh"
                        ></ha-icon-button>
                        <ha-icon-button
                            .path=${mdiClose}
                            @click=${this._close}
                            title="Close"
                        ></ha-icon-button>
                    </div>
                </div>

                <div class="dialog-content">
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
            </ha-dialog>
        `;
    }
}
