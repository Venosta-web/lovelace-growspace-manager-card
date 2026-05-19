import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiClose, mdiCheck, mdiInformation } from '@mdi/js';
import type { BatchPrintLabelsDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';

@customElement('batch-print-label-dialog')
export class BatchPrintLabelDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: BatchPrintLabelsDialogState | undefined;

  @state() private _selectedDeviceId = '';
  @state() private _copies = 1;
  @state() private _isSubmitting = false;
  @state() private _progress = 0;

  static styles = [
    dialogStyles,
    css`
      .copies-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
      }
      .copies-row label {
        font-size: 0.9rem;
        opacity: 0.7;
        white-space: nowrap;
      }
      .copies-input {
        width: 80px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: var(--primary-text-color, #fff);
        font-size: 1rem;
        padding: 8px 12px;
        text-align: center;
      }
      .copies-input:focus {
        outline: none;
        border-color: var(--primary-color, #4caf50);
      }
      .progress-bar-wrap {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        height: 6px;
        margin-top: 16px;
        overflow: hidden;
      }
      .progress-bar {
        background: var(--primary-color, #4caf50);
        height: 100%;
        transition: width 0.3s ease;
      }
    `,
  ];

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('open') && this.open) {
      this._resetForm();
    }
  }

  private _resetForm() {
    this._isSubmitting = false;
    this._progress = 0;
    this._copies = 1;
    if (!this._selectedDeviceId) {
      const printers = this._getPrinters();
      if (printers.length > 0) {
        this._selectedDeviceId = printers[0].value;
      }
    }
  }

  private _getPrinters() {
    if (!this.hass) return [];
    return Object.keys(this.hass.states)
      .filter((eid) => eid.startsWith('image.') && eid.includes('_last_label_made'))
      .map((eid) => {
        const name = this.hass!.states[eid].attributes.friendly_name || eid;
        return { label: name.replace(' Last Label Made', ''), value: eid };
      });
  }

  private async _submit() {
    if (!this.store || !this.dialogState) return;
    const { plantIds } = this.dialogState;
    if (plantIds.length === 0) return;

    this._isSubmitting = true;
    this._progress = 0;

    // Warm up Niimbot before batch printing — the first service call initializes the
    // printer session; without it all labels come out blank.
    try {
      await this.store.printLabel({
        plantId: plantIds[0],
        deviceId: this._selectedDeviceId || undefined,
        preview: true,
      });
    } catch (_e) {
      // Warm-up failure is non-fatal; attempt batch anyway.
    }

    const total = plantIds.length * this._copies;
    let completed = 0;
    const errors: string[] = [];

    for (let copy = 0; copy < this._copies; copy++) {
      for (const plantId of plantIds) {
        try {
          await this.store.printLabel({
            plantId,
            deviceId: this._selectedDeviceId || undefined,
            preview: false,
          });
        } catch (e) {
          errors.push(plantId);
        }
        completed++;
        this._progress = Math.round((completed / total) * 100);
      }
    }

    this._isSubmitting = false;

    if (errors.length === 0) {
      this.store.actions.ui.toast(`Printed ${total} label(s) successfully`, 'success');
    } else {
      this.store.actions.ui.toast(`Printed with ${errors.length} error(s)`, 'error');
    }

    this._close();
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  protected render() {
    if (!this.open) return nothing;

    const plantIds = this.dialogState?.plantIds ?? [];
    const printers = this._getPrinters();

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .heading=${'Print Labels'}
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: #2196F3;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiPrinter}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Print Labels</h2>
              <div class="dialog-subtitle">${plantIds.length} plant(s) selected</div>
            </div>
            <button class="md3-button text" @click=${this._close}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid" style="display: block;">
            <div class="form-section">
              <h3>Printer Settings</h3>
              <md3-select
                label="Niimbot Printer"
                .value=${this._selectedDeviceId || ''}
                .options=${[{ label: 'Default / Auto', value: '' }, ...printers]}
                @change=${(e: CustomEvent) => { this._selectedDeviceId = e.detail; }}
              ></md3-select>

              ${printers.length === 0 ? html`
                <div style="margin-top: 12px; color: var(--warning-color); font-size: 0.85rem; display: flex; gap: 8px; align-items: center; opacity: 0.8;">
                  <ha-svg-icon .path=${mdiInformation} style="--mdc-icon-size: 16px;"></ha-svg-icon>
                  No Niimbot printers discovered. You can still try printing if you have a default printer configured.
                </div>
              ` : nothing}

              <div class="copies-row">
                <label>Copies per plant</label>
                <input
                  class="copies-input"
                  type="number"
                  min="1"
                  max="99"
                  .value=${String(this._copies)}
                  @input=${(e: InputEvent) => {
                    const v = parseInt((e.target as HTMLInputElement).value, 10);
                    if (!isNaN(v) && v >= 1) this._copies = v;
                  }}
                />
              </div>
            </div>

            ${this._isSubmitting ? html`
              <div class="progress-bar-wrap">
                <div class="progress-bar" style="width: ${this._progress}%"></div>
              </div>
            ` : nothing}
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
              ${this._isSubmitting ? `Printing... ${this._progress}%` : `Print ${plantIds.length * this._copies} Label(s)`}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
