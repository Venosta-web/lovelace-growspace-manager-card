import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiCheck, mdiInformation, mdiRefresh, mdiAlertCircle } from '@mdi/js';
import '../features/shared/ui/gs-dialog';
import { PrintLabelDialogState } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { activeDevices$ } from '../slices/grid';
import { strainLibrary$ } from '../slices/strain';

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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

  async _fetchPreview() {
    if (!this.dialogState || !this._selectedDeviceId) return;
    if (!this.dialogState.plantId && !this.dialogState.strainName) return;

    this._previewLoading = true;
    this._previewError = null;

    try {
      // 1. Trigger the generation
      await this.store.actions.plant.printLabel({
        plantId: this.dialogState.plantId,
        strain: this.dialogState.strainName,
        phenotype: this.dialogState.phenotype,
        breeder: this.dialogState.breeder,
        lineage: this.dialogState.lineage,
        breederLogo: this.dialogState.breederLogo,
        deviceId: undefined,
        preview: true,
      });

      // 2. Wait for HA state propagation
      await new Promise((r) => setTimeout(r, 800));

      // 3. Grab the image URL from the entity state
      const stateObj = this.hass.states[this._selectedDeviceId]; // e.g., image.b1_...

      if (stateObj?.attributes.entity_picture) {
        // FIX: Append a timestamp to force a cache refresh
        const cacheBuster = `&v=${Date.now()}`;
        this._previewImage = `${stateObj.attributes.entity_picture}${cacheBuster}`;
      } else {
        this._previewError = 'Image entity updated, but no picture attribute found.';
      }
    } catch (e) {
      this._previewError = e instanceof Error ? e.message : 'Failed to fetch preview';
    } finally {
      this._previewLoading = false;
    }
  }

  private _getPrinters() {
    if (!this.hass) return [];

    return Object.keys(this.hass.states)
      .filter((eid) => {
        // Looking at your screenshot, Niimbot entities start with binary_sensor.b1_...
        // or image.b1_... (where b1 is the model).
        const stateObj = this.hass!.states[eid];

        // Filter: We want the main 'image' entity or the 'connection' binary sensor
        // because they represent the printer device.
        return eid.startsWith('image.') && eid.includes('_last_label_made');
      })
      .map((eid) => {
        // This will take "B1-H113120940 Last Label Made"
        // and clean it up to just the printer name if you prefer.
        const name = this.hass!.states[eid].attributes.friendly_name || eid;
        return {
          label: name.replace(' Last Label Made', ''),
          value: eid,
        };
      });
  }

  private async _submit() {
    if (!this.store || !this.dialogState) return;

    this._isSubmitting = true;

    try {
      await this.store.actions.plant.printLabel({
        plantId: this.dialogState.plantId,
        strain: this.dialogState.strainName,
        phenotype: this.dialogState.phenotype,
        breeder: this.dialogState.breeder,
        lineage: this.dialogState.lineage,
        breederLogo: this.dialogState.breederLogo,
        deviceId: this._selectedDeviceId || undefined,
        preview: false,
      });
      this.store.actions.ui.toast('Label printing command sent', 'success');
      this._close();
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      console.error('Failed to print label:', e);
      this.store?.actions.ui.toast(`Error: ${error}`, 'error');
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

    const strainName = plant?.attributes.strain || this.dialogState?.strainName || 'Unknown';
    const subtitle = plantId ? `${strainName} (${plantId})` : strainName;

    const printers = this._getPrinters();

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Print Label"
        .subtitle=${subtitle}
        .iconPath=${mdiPrinter}
        stageColor="#2196F3"
        .submitting=${this._isSubmitting}
        @close=${this._close}
      >
        <div class="dialog-content-grid" style="display: block;">
          <div class="form-section">
            <h3>
              Label Preview
              <button
                class="md3-button text icon refresh-btn"
                @click=${this._fetchPreview}
                ?disabled=${this._previewLoading}
              >
                <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
              </button>
            </h3>
            <div class="preview-container">
              ${this._previewLoading
                ? html`
                    <div class="preview-loading">
                      <ha-circular-progress active size="small"></ha-circular-progress>
                      <span>Generating preview...</span>
                    </div>
                  `
                : this._previewError
                  ? html`
                      <div class="preview-error">
                        <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
                        <span>${this._previewError}</span>
                        <button class="md3-button tonal small" @click=${this._fetchPreview}>
                          Try Again
                        </button>
                      </div>
                    `
                  : this._previewImage
                    ? html`
                        <img src=${this._previewImage} class="preview-image" alt="Label Preview" />
                      `
                    : html`
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
              .options=${[{ label: 'Default / Auto', value: '' }, ...printers]}
              @change=${(e: CustomEvent) => {
                this._selectedDeviceId = e.detail;
              }}
            ></md3-select>

            ${printers.length === 0
              ? html`
                  <div
                    style="margin-top: 12px; color: var(--warning-color); font-size: 0.85rem; display: flex; gap: 8px; align-items: center; opacity: 0.8;"
                  >
                    <ha-svg-icon
                      .path=${mdiInformation}
                      style="--mdc-icon-size: 16px;"
                    ></ha-svg-icon>
                    No Niimbot printers discovered. You can still try printing if you have a default
                    printer configured in the integration.
                  </div>
                `
              : nothing}
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
            ?disabled=${this._isSubmitting || this._previewLoading}
          >
            <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
            ${this._isSubmitting
              ? 'Printing...'
              : this._previewLoading
                ? 'Warming up...'
                : 'Print Now'}
          </button>
        </div>
      </gs-dialog>
    `;
  }

  private _getPlant(plantId?: string) {
    if (!plantId) return null;
    const devices = activeDevices$.get();
    for (const device of devices) {
      const plant = device.plants.find(
        (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId
      );
      if (plant) return plant;
    }
    return null;
  }

  private _getStrain(strainName?: string, phenotype?: string) {
    if (!strainName) return null;
    const library = strainLibrary$.get();
    const pheno = phenotype || 'default';
    return library.find((s) => s.strain === strainName && s.phenotype === pheno) || null;
  }

  private _formatDate(dateStr?: string) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  }
}
