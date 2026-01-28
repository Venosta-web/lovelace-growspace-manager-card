import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiClose, mdiCheck, mdiInformation, mdiRefresh, mdiAlertCircle } from '@mdi/js';
import { PrintLabelDialogState } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';

@customElement('print-label-dialog')
export class PrintLabelDialog extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    public hass!: HomeAssistant;

    @consume({ context: storeContext, subscribe: true })
    public store!: GrowspaceStore;

    @property({ type: Boolean }) public open = false;
    @property({ attribute: false }) public dialogState: PrintLabelDialogState | undefined;

    @state() private _selectedDeviceId = '';
    @state() private _isSubmitting = false;
    @state() private _previewImage: string | null = null;
    @state() private _previewLoading = false;
    @state() private _previewError: string | null = null;

    static styles = [
        dialogStyles,
        css`
      .preview-container {
        background: rgba(var(--card-background-color, 255, 255, 255), 0.05);
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        min-height: 200px;
        position: relative;
      }
      .preview-image {
        max-width: 100%;
        max-height: 200px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        background: white;
      }
      .preview-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        opacity: 0.6;
      }
      .preview-error {
        color: var(--error-color);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
        font-size: 0.9rem;
      }
      .refresh-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        --mdc-icon-size: 18px;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      .refresh-btn:hover {
        opacity: 1;
      }
      .form-section h3 {
        margin-top: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        opacity: 0.6;
        letter-spacing: 1px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `,
    ];

    protected willUpdate(changedProps: Map<string, unknown>): void {
        if (changedProps.has('open') && this.open) {
            this._resetForm();
            this._fetchPreview();
        }
    }

    private _resetForm() {
        this._selectedDeviceId = this.dialogState?.deviceId || '';
        this._isSubmitting = false;
        this._previewImage = null;
        this._previewError = null;

        // Auto-select first available niimbot if none selected
        if (!this._selectedDeviceId) {
            const printers = this._getPrinters();
            if (printers.length > 0) {
                this._selectedDeviceId = printers[0].value;
            }
        }
    }

    private async _fetchPreview() {
        if (!this.dialogState?.plantId) return;

        this._previewLoading = true;
        this._previewError = null;

        try {
            const response = await this.store.printLabel(this.dialogState.plantId, undefined, true);
            // The niimbot integration returns a dict, handle potential response structures
            this._previewImage = response?.image || response?.data || response?.preview_url || null;

            if (!this._previewImage) {
                this._previewError = 'No preview image received from Niimbot integration';
            }
        } catch (e: unknown) {
            this._previewError = e instanceof Error ? e.message : 'Failed to fetch preview';
        } finally {
            this._previewLoading = false;
        }
    }

    private _getPrinters() {
        if (!this.hass) return [];

        return Object.keys(this.hass.states)
            .filter(eid => {
                const stateObj = this.hass!.states[eid];
                const entityId = eid.toLowerCase();

                // 1. Look for 'print_label' in the entity ID
                // 2. Ensure it belongs to the button domain
                // 3. (Optional) Check for niimbot in the name to avoid other label printers
                const isNiimbotPrintButton =
                    entityId.startsWith('button.') &&
                    entityId.includes('print_label');

                return isNiimbotPrintButton;
            })
            .map(eid => ({
                // Friendly name will usually be "Niimbot D11 Print Label"
                label: this.hass!.states[eid].attributes.friendly_name || eid,
                value: eid
            }));
    }

    private async _submit() {
        if (!this.store || !this.dialogState) return;

        this._isSubmitting = true;

        try {
            await this.store.printLabel(this.dialogState.plantId, this._selectedDeviceId || undefined);
            this.store.showToast('Label printing command sent', 'success');
            this._close();
        } catch (e: unknown) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            console.error('Failed to print label:', e);
            this.store?.showToast(`Error: ${error}`, 'error');
        } finally {
            this._isSubmitting = false;
        }
    }

    private _close() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    protected render() {
        if (!this.open) return nothing;

        const plantId = this.dialogState?.plantId;
        const plant = this._getPlant(plantId);
        const strainEntry = this._getStrain(plant?.attributes.strain, plant?.attributes.phenotype);

        const printers = this._getPrinters();

        return html`
      <ha-dialog open @closed=${this._close} hideActions .heading=${'Print Label'}>
        <div class="glass-dialog-container" style="--stage-color: #2196F3;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiPrinter}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Print Label</h2>
              <div class="dialog-subtitle">${plant?.attributes.strain || 'Unknown Plant'} (${plantId})</div>
            </div>
            <button class="md3-button text" @click=${this._close}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid" style="display: block;">
            <div class="form-section">
               <h3>
                 Label Preview
                 <button class="md3-button text icon refresh-btn" @click=${this._fetchPreview} ?disabled=${this._previewLoading}>
                   <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
                 </button>
               </h3>
               <div class="preview-container">
                 ${this._previewLoading ? html`
                   <div class="preview-loading">
                     <ha-circular-progress active size="small"></ha-circular-progress>
                     <span>Generating preview...</span>
                   </div>
                 ` : this._previewError ? html`
                   <div class="preview-error">
                     <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
                     <span>${this._previewError}</span>
                     <button class="md3-button tonal small" @click=${this._fetchPreview}>Try Again</button>
                   </div>
                 ` : this._previewImage ? html`
                   <img src=${this._previewImage} class="preview-image" alt="Label Preview" />
                 ` : html`
                   <div class="preview-loading">
                     <span>No preview available</span>
                   </div>
                 `}
               </div>
            </div>

            <div class="form-section">
              <h3>Printer Settings</h3>
              <md3-select
                label="Niimbot Printer"
                .value=${this._selectedDeviceId || ''}
                .options=${[
                { label: 'Default / Auto', value: '' },
                ...printers
            ]}
                @change=${(e: CustomEvent) => {
                this._selectedDeviceId = e.detail;
            }}
              ></md3-select>
              
              ${printers.length === 0 ? html`
                <div style="margin-top: 12px; color: var(--warning-color); font-size: 0.85rem; display: flex; gap: 8px; align-items: center; opacity: 0.8;">
                  <ha-svg-icon .path=${mdiInformation} style="--mdc-icon-size: 16px;"></ha-svg-icon>
                  No Niimbot printers discovered. You can still try printing if you have a default printer configured in the integration.
                </div>
              ` : nothing}
            </div>
          </div>

          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${this._isSubmitting}>
              Cancel
            </button>
            <button
              class="md3-button primary"
              style="background-color: #2196F3; --mdc-theme-primary: #2196F3;"
              @click=${this._submit}
              ?disabled=${this._isSubmitting}
            >
              <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
              ${this._isSubmitting ? 'Printing...' : 'Print Now'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
    }

    private _getPlant(plantId?: string) {
        if (!plantId || !this.store || !this.store.data) return null;
        const devices = this.store.data.$devices.get();
        for (const device of devices) {
            const plant = device.plants.find(p => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId);
            if (plant) return plant;
        }
        return null;
    }

    private _getStrain(strainName?: string, phenotype?: string) {
        if (!strainName || !this.store || !this.store.data) return null;
        const library = this.store.data.$strainLibrary.get();
        const pheno = phenotype || 'default';
        return library.find(s => s.strain === strainName && (s.phenotype === pheno)) || null;
    }

    private _formatDate(dateStr?: string) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
        } catch (e) {
            return dateStr;
        }
    }
}
