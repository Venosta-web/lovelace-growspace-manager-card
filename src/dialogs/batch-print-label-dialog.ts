import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiCheck, mdiChevronLeft, mdiChevronRight } from '@mdi/js';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/label-preview';
import '../features/shared/ui/printer-status-strip';
import type { BatchPrintLabelsDialogState, LabelSizeId, PrintDensity } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { showToast } from '../slices/ui';
import { printLabel } from '../slices/plant';
import { getPrinters } from '../features/shared/ui/printer-status-strip';
import {
  buildQrTargetUrl,
  DEFAULT_LABEL_FIELDS,
  deriveLabelFieldValues,
} from './print-label-logic';

const DEFAULT_QR_TARGET = 'web' as const;

interface BatchPrintJob {
  plantIds: string[];
  copies: number;
  deviceId: string | undefined;
  sizeId: LabelSizeId;
  density: PrintDensity;
  baseUrl: string;
}

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
  @state() private _previewIndex = 0;
  @state() private _activeJob: BatchPrintJob | null = null;

  static styles = [
    dialogStyles,
    css`
      .copies-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
      }
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 20px;
      }
      .preview-col {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .preview-stage {
        position: relative;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-md, 12px);
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 260px;
      }
      .preview-stage label-preview {
        width: 100%;
        max-width: 300px;
      }
      .preview-meta {
        font-size: 0.78rem;
        opacity: 0.55;
        text-align: center;
      }
      .preview-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .preview-nav button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        padding: 4px 10px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: var(--border-radius-sm, 8px);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.06));
        color: var(--primary-text-color, #fff);
        cursor: pointer;
      }
      .preview-nav button:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
      .preview-position {
        min-width: 4.5rem;
        text-align: center;
        font-size: var(--font-size-supporting);
        opacity: 0.7;
      }
      @media (max-width: 600px) {
        .two-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .preview-stage {
          min-height: 180px;
        }
      }
      .copies-row label {
        font-size: var(--font-size-sm);
        opacity: 0.7;
        white-space: nowrap;
      }
      .copies-input {
        width: 80px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: var(--border-radius-sm, 8px);
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
        border-radius: var(--border-radius-xs, 4px);
        height: 6px;
        margin-top: 16px;
        overflow: hidden;
      }
      .progress-bar {
        background: var(--primary-color, #4caf50);
        height: 100%;
        width: 100%;
        transform: scaleX(0);
        transform-origin: left;
        transition: transform var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard);
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
        border-radius: var(--border-radius-sm, 8px);
        padding: 4px 10px;
        cursor: pointer;
        font-size: var(--font-size-supporting);
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
        border-radius: var(--border-radius-sm, 8px);
        overflow: hidden;
        margin-top: 8px;
      }
      .density-seg button {
        background: transparent;
        border: none;
        color: var(--primary-text-color, #fff);
        padding: 4px 10px;
        cursor: pointer;
        font-size: var(--font-size-supporting);
        opacity: 0.6;
        transition:
          background 0.15s,
          opacity 0.15s;
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
    if (changedProps.has('dialogState') && !this._activeJob) {
      const plantCount = this.dialogState?.plantIds?.length ?? 0;
      this._previewIndex = Math.min(this._previewIndex, Math.max(plantCount - 1, 0));
    }
  }

  private _resetForm() {
    this._isSubmitting = false;
    this._progress = 0;
    this._copies = 1;
    this._sizeId = '50x30';
    this._density = 'normal';
    this._previewIndex = 0;
    this._activeJob = null;
    if (!this._selectedDeviceId) {
      const printers = getPrinters(this.hass);
      if (printers.length > 0) {
        this._selectedDeviceId = printers[0].id;
      }
    }
  }

  private async _submit() {
    if (!this.store || !this.dialogState) return;
    if (this.dialogState.plantIds.length === 0) return;

    const job: BatchPrintJob = {
      plantIds: [...this.dialogState.plantIds],
      copies: this._copies,
      deviceId: this._selectedDeviceId || undefined,
      sizeId: this._sizeId,
      density: this._density,
      baseUrl: window.location.origin + window.location.pathname,
    };

    this._activeJob = job;
    this._isSubmitting = true;
    this._progress = 0;
    this._previewIndex = 0;
    await this._waitForRender();

    // Warm up Niimbot before batch printing — the first service call initializes the
    // printer session; without it all labels come out blank.
    try {
      await printLabel({
        plantId: job.plantIds[0],
        deviceId: job.deviceId,
        preview: true,
        baseUrl: job.baseUrl,
      });
    } catch (_e) {
      // Warm-up failure is non-fatal; attempt batch anyway.
    }

    const total = job.plantIds.length * job.copies;
    let completed = 0;
    const errors: string[] = [];

    for (let copy = 0; copy < job.copies; copy++) {
      for (let plantIndex = 0; plantIndex < job.plantIds.length; plantIndex++) {
        const plantId = job.plantIds[plantIndex];
        this._previewIndex = plantIndex;
        await this._waitForRender();
        try {
          await printLabel({
            plantId,
            fields: DEFAULT_LABEL_FIELDS,
            deviceId: job.deviceId,
            sizeId: job.sizeId,
            density: job.density,
            qrTarget: DEFAULT_QR_TARGET,
            preview: false,
            baseUrl: job.baseUrl,
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
      showToast(`Printed ${total} label(s) successfully`, 'success');
    } else {
      showToast(`Printed with ${errors.length} error(s)`, 'error');
    }

    this._close();
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async _waitForRender() {
    if (this.isConnected) await this.updateComplete;
  }

  private _movePreview(offset: number, plantCount: number) {
    if (this._isSubmitting) return;
    this._previewIndex = Math.max(0, Math.min(this._previewIndex + offset, plantCount - 1));
  }

  protected render() {
    const plantIds = this._activeJob?.plantIds ?? this.dialogState?.plantIds ?? [];
    const deviceId = this._activeJob ? this._activeJob.deviceId : this._selectedDeviceId;
    const copies = this._activeJob?.copies ?? this._copies;
    const sizeId = this._activeJob?.sizeId ?? this._sizeId;
    const density = this._activeJob?.density ?? this._density;
    const previewIndex = Math.min(this._previewIndex, Math.max(plantIds.length - 1, 0));
    const previewPlantId = plantIds[previewIndex];
    const printers = getPrinters(this.hass);
    const values = deriveLabelFieldValues(previewPlantId);
    const qrValue = buildQrTargetUrl(previewPlantId, DEFAULT_QR_TARGET);
    const sizeLabel = LABEL_SIZES.find((size) => size.id === sizeId)?.label ?? sizeId;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Print Labels"
        .subtitle=${`${plantIds.length} plant(s) selected`}
        .iconPath=${mdiPrinter}
        stageColor="var(--gm-info-color)"
        .submitting=${this._isSubmitting}
        @close=${this._close}
      >
        <div class="dialog-content-grid two-col">
          <div class="preview-col">
            <div class="preview-stage">
              <label-preview
                .sizeId=${sizeId}
                .fields=${DEFAULT_LABEL_FIELDS}
                .values=${values}
                .qrValue=${qrValue}
                .density=${density}
              ></label-preview>
            </div>
            ${plantIds.length > 1
              ? html`
                  <nav class="preview-nav" aria-label="Label preview navigation">
                    <button
                      type="button"
                      aria-label="Previous plant"
                      ?disabled=${this._isSubmitting || previewIndex === 0}
                      @click=${() => this._movePreview(-1, plantIds.length)}
                    >
                      <ha-svg-icon .path=${mdiChevronLeft}></ha-svg-icon>
                    </button>
                    <span class="preview-position" aria-live="polite">
                      Plant ${previewIndex + 1} of ${plantIds.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next plant"
                      ?disabled=${this._isSubmitting || previewIndex === plantIds.length - 1}
                      @click=${() => this._movePreview(1, plantIds.length)}
                    >
                      <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
                    </button>
                  </nav>
                `
              : nothing}
            <div class="preview-meta">${sizeLabel} · Thermal 203 dpi</div>
          </div>
          <div class="form-section">
            <h3>Printer Settings</h3>
            <printer-status-strip
              .hass=${this.hass}
              .selectedDeviceId=${deviceId ?? ''}
            ></printer-status-strip>
            <md3-select
              label="Niimbot Printer"
              .value=${deviceId ?? ''}
              .disabled=${this._isSubmitting}
              .options=${[
                { label: 'Default / Auto', value: '' },
                ...printers.map((p) => ({ label: p.name, value: p.id })),
              ]}
              @change=${(e: CustomEvent) => {
                this._selectedDeviceId = e.detail;
              }}
            ></md3-select>

            <div class="size-chips">
              ${LABEL_SIZES.map(
                (s) => html`
                  <button
                    class="size-chip ${sizeId === s.id ? 'active' : ''}"
                    ?disabled=${this._isSubmitting}
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
                    class=${density === d ? 'active' : ''}
                    ?disabled=${this._isSubmitting}
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
                .value=${String(copies)}
                ?disabled=${this._isSubmitting}
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
                  <div
                    class="progress-bar"
                    style="transform: scaleX(${this._progress / 100})"
                  ></div>
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
            style="background-color: var(--gm-info-color); --mdc-theme-primary: var(--gm-info-color);"
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
