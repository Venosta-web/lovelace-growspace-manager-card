import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiCheck } from '@mdi/js';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/printer-status-strip';
import type { BatchPrintLabelsDialogState, LabelSizeId, PrintDensity } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';

const LABEL_SIZES: { id: LabelSizeId; label: string }[] = [
  { id: '50x30', label: '50×30' },
  { id: '40x30', label: '40×30' },
  { id: '50x50', label: '50×50' },
  { id: '50x80', label: '50×80' },
  { id: '50x15', label: '50×15' },
];

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
  @state() private _sizeId: LabelSizeId = '50x30';
  @state() private _density: PrintDensity = 'normal';

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
      .size-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .size-chip {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 0.82rem;
        color: var(--primary-text-color, #fff);
        transition: background 0.15s;
      }
      .size-chip.active {
        background: var(--primary-color, #4caf50);
        border-color: transparent;
      }
      .density-seg {
        display: flex;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        overflow: hidden;
        margin-top: 8px;
      }
      .density-seg button {
        background: transparent;
        border: none;
        color: var(--primary-text-color, #fff);
        padding: 4px 10px;
        cursor: pointer;
        font-size: 0.82rem;
        opacity: 0.6;
        transition: background 0.15s, opacity 0.15s;
      }
      .density-seg button.active {
        background: rgba(255, 255, 255, 0.12);
        opacity: 1;
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
    this._sizeId = '50x30';
    this._density = 'normal';
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
      await this.store.actions.plant.printLabel({
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
          await this.store.actions.plant.printLabel({
            plantId,
            deviceId: this._selectedDeviceId || undefined,
            sizeId: this._sizeId,
            density: this._density,
            preview: false,
          });
        } catch (_e) {
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
    const plantIds = this.dialogState?.plantIds ?? [];
    const printers = this._getPrinters();

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Print Labels"
        .subtitle=${`${plantIds.length} plant(s) selected`}
        .iconPath=${mdiPrinter}
        stageColor="#2196F3"
        .submitting=${this._isSubmitting}
        @close=${this._close}
      >
        <div class="dialog-content-grid" style="display: block;">
          <div class="form-section">
            <h3>Printer Settings</h3>
            <printer-status-strip
              .hass=${this.hass}
              .selectedDeviceId=${this._selectedDeviceId}
            ></printer-status-strip>
            <md3-select
              label="Niimbot Printer"
              .value=${this._selectedDeviceId || ''}
              .options=${[{ label: 'Default / Auto', value: '' }, ...printers]}
              @change=${(e: CustomEvent) => {
                this._selectedDeviceId = e.detail;
              }}
            ></md3-select>

            <div class="size-chips">
              ${LABEL_SIZES.map(
                (s) => html`
                  <button
                    class="size-chip ${this._sizeId === s.id ? 'active' : ''}"
                    @click=${() => {
                      this._sizeId = s.id;
                    }}
                  >
                    ${s.label}
                  </button>
                `
              )}
            </div>

            <div class="density-seg">
              ${(['low', 'normal', 'high'] as PrintDensity[]).map(
                (d) => html`
                  <button
                    class=${this._density === d ? 'active' : ''}
                    @click=${() => {
                      this._density = d;
                    }}
                  >
                    ${d === 'low' ? 'Light' : d === 'normal' ? 'Normal' : 'Dark'}
                  </button>
                `
              )}
            </div>

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

          ${this._isSubmitting
            ? html`
                <div class="progress-bar-wrap">
                  <div class="progress-bar" style="width: ${this._progress}%"></div>
                </div>
              `
            : nothing}
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
            ${this._isSubmitting
              ? `Printing... ${this._progress}%`
              : `Print ${plantIds.length * this._copies} Label(s)`}
          </button>
        </div>
      </gs-dialog>
    `;
  }
}
