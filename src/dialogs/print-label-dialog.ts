import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiCheck } from '@mdi/js';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/label-preview';
import '../features/shared/ui/printer-status-strip';
import type {
  PrintLabelDialogState,
  LabelFieldVisibility,
  LabelSizeId,
  PrintDensity,
  QrTarget,
} from '../lib/types/dialog';
import { printLabel } from '../slices/plant';
import { localize } from '../localize/localize';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { getPrinters } from '../features/shared/ui/printer-status-strip';
import {
  buildQrTargetUrl,
  DEFAULT_LABEL_FIELDS,
  deriveLabelFieldValues,
  describePlant,
} from './print-label-logic';
import { LAZY_CHUNKS, loadLazyChunk } from '../lib/lazy-chunk';
import type { LabelTemplateSupport } from '../slices/labels';
import '../features/shared/ui/lazy-chunk-error';

const LABEL_SIZES: { id: LabelSizeId; label: string }[] = [
  { id: '50x30', label: '50×30' },
  { id: '40x30', label: '40×30' },
  { id: '50x50', label: '50×50' },
  { id: '50x80', label: '50×80' },
  { id: '50x15', label: '50×15' },
];

type PrintState = 'idle' | 'printing' | 'done' | 'error';
type ChunkState = 'idle' | 'loading' | 'ready' | 'missing';

/** A value worth sending to the Classic service: `str` there, never empty or null. */
function text(value: string | null | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

@customElement('print-label-dialog')
export class PrintLabelDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: PrintLabelDialogState | undefined;
  /**
   * Page-global Label Template capability, read from `labelTemplateSupport$`
   * by the host. A strain-library or plant request prints through a Label
   * Template when it is `available`, and never through the Classic service
   * then; without it this is the Classic dialog, marked as the compatibility
   * workflow.
   */
  @property({ attribute: false }) public support?: LabelTemplateSupport;

  @state() private _templateChunk: ChunkState = 'idle';

  @state() private _selectedDeviceId = '';
  @state() private _fields: LabelFieldVisibility = { ...DEFAULT_LABEL_FIELDS };
  @state() private _sizeId: LabelSizeId = '50x30';
  @state() private _density: PrintDensity = 'normal';
  @state() private _qrTarget: QrTarget = 'web';
  @state() private _copies = 1;
  @state() private _printState: PrintState = 'idle';
  @state() private _printProgress = 0;
  @state() private _settingsOpen = false;

  static styles = [
    dialogStyles,
    css`
      .template-path {
        max-height: 70vh;
        overflow-y: auto;
        padding: 0 4px;
      }
      .compatibility-notice {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0 0 12px;
        padding: 10px 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: var(--border-radius-sm, 8px);
        font-size: var(--font-size-sm);
        line-height: 1.45;
      }
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 20px;
        min-height: 600px;
      }

      /* Left — preview stage (explicit column placement so DOM order can be settings-first) */
      .preview-col {
        grid-column: 1;
        grid-row: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      /* Settings wrapper occupies right column on desktop */
      .settings-wrapper {
        grid-column: 2;
        grid-row: 1;
      }

      /* Pill toggle button — desktop: hidden, mobile: shown */
      .mobile-pill-toggle {
        display: none;
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
        flex: 1;
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

      /* Right — settings panel */
      .settings-col {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 525px;
        padding-right: 4px;
        padding-top: 12px;
      }

      /* Mobile: single column, pill collapsed above preview */
      @media (max-width: 600px) {
        .two-col {
          display: flex;
          flex-direction: column;
          min-height: unset;
          gap: 12px;
        }

        .preview-col {
          grid-column: unset;
          grid-row: unset;
        }

        .settings-wrapper {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--border-radius-md, 12px);
          overflow: hidden;
          grid-row: unset;
          grid-column: unset;
        }

        .mobile-pill-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          color: var(--primary-text-color, #fff);
          cursor: pointer;
          font-size: var(--font-size-sm);
          font-weight: 500;
        }
        .mobile-pill-toggle.open {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pill-chevron {
          font-size: var(--font-size-md);
          opacity: 0.5;
          display: inline-block;
          transform: rotate(90deg);
          transition: transform 0.2s;
        }
        .pill-chevron.open {
          transform: rotate(270deg);
        }

        .settings-col {
          display: none;
          max-height: none;
          overflow-y: visible;
          padding: 12px 16px;
        }
        .settings-col.mobile-open {
          display: flex;
        }
      }

      .settings-section {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .settings-section-title {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.5;
        margin-bottom: 4px;
      }

      /* Field toggle rows */
      .field-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: var(--border-radius-sm, 8px);
        cursor: pointer;
        transition: background 0.15s;
      }
      .field-toggle-row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .field-toggle-row.locked {
        cursor: default;
        opacity: 0.5;
      }
      .field-toggle-label {
        font-size: var(--font-size-sm);
      }
      .toggle-dot {
        width: 28px;
        height: 16px;
        border-radius: var(--border-radius-sm, 8px);
        background: rgba(255, 255, 255, 0.15);
        position: relative;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .toggle-dot.on {
        background: var(--primary-color, #4caf50);
      }
      .toggle-dot::after {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: white;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
      }
      .toggle-dot.on::after {
        transform: translateX(12px);
      }

      /* QR target card */
      .qr-target-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--border-radius-sm, 8px);
        padding: 10px 12px;
      }
      .qr-url-hint {
        font-size: 0.72rem;
        opacity: 0.4;
        margin-top: 4px;
        word-break: break-all;
      }

      /* Copies + density */
      .copies-density-row {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .copies-stepper {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .copies-stepper button {
        background: rgba(255, 255, 255, 0.08);
        border: none;
        border-radius: var(--border-radius-sm, 8px);
        color: var(--primary-text-color, #fff);
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .copies-value {
        min-width: 28px;
        text-align: center;
        font-size: var(--font-size-md);
      }
      .density-seg {
        display: flex;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: var(--border-radius-sm, 8px);
        overflow: hidden;
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

      /* Size chips */
      .size-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
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

      /* Footer */
      .dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .footer-meta {
        font-size: var(--font-size-supporting);
        opacity: 0.6;
        flex: 1;
      }
      .footer-meta.error {
        color: var(--error-color, #f44336);
        opacity: 1;
      }
      .footer-actions {
        display: flex;
        gap: 8px;
      }
      .btn-print {
        background: var(--gm-info-color);
        color: white;
        border: none;
        border-radius: var(--border-radius-sm, 8px);
        padding: 8px 18px;
        cursor: pointer;
        font-size: var(--font-size-sm);
        display: flex;
        align-items: center;
        gap: 6px;
        transition: opacity 0.15s;
      }
      .btn-print:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ];

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('open') && this.open) {
      this._resetForm();
    }
    if (changedProps.has('support') || changedProps.has('open')) {
      void this._loadTemplateChunk();
    }
  }

  /** Whether this request is the strain library's, which templates can print. */
  private get _fromStrainLibrary(): boolean {
    return this.dialogState?.source === 'strain_library';
  }

  /**
   * The plant this label is for, when it is one plant's label.
   *
   * It prints through a Label Template as a one-plant batch: the batch
   * preflight and print routes already capture a plant, so nothing new is
   * asked of the backend.
   */
  private get _plantId(): string | undefined {
    return this._fromStrainLibrary ? undefined : this.dialogState?.plantId || undefined;
  }

  /** Whether a Label Template can print this request at all. */
  private get _templatePrintable(): boolean {
    return this._fromStrainLibrary || this._plantId !== undefined;
  }

  /** Fetch the template path only once the capability says it exists. */
  private async _loadTemplateChunk(): Promise<void> {
    if (!this.open || !this._templatePrintable) return;
    if (this.support?.status !== 'available' || this._templateChunk !== 'idle') return;
    this._templateChunk = 'loading';
    const view = await loadLazyChunk(
      LAZY_CHUNKS.labelTemplates,
      () => import('../features/labels/label-templates')
    );
    this._templateChunk = view ? 'ready' : 'missing';
  }

  private get _language(): string {
    return this.hass?.language ?? 'en';
  }

  /**
   * A strain-library or plant request, while the capability is still being
   * asked for or once it says templates exist. Never the Classic form: a
   * request pressed before the answer arrived must not print the old way on
   * an integration that serves the new one.
   */
  private _renderTemplatePath(): TemplateResult {
    const ds = this.dialogState;
    const support = this.support;
    const language = this._language;
    const plantId = this._plantId;
    const subtitle = plantId
      ? describePlant(plantId)
      : ds?.phenotype && ds.phenotype !== 'default'
        ? `${ds.strainName ?? ''} · ${ds.phenotype}`
        : (ds?.strainName ?? '');
    return html`
      <gs-dialog
        .open=${this.open}
        heading="Print Label"
        .subtitle=${subtitle}
        .iconPath=${mdiPrinter}
        stageColor="var(--gm-info-color)"
        @close=${this._close}
      >
        <div class="template-path" data-path="template">
          ${support?.status !== 'available' || this._templateChunk === 'loading'
            ? html`<p role="status">${localize('labels.view_loading', '', '', language)}</p>`
            : this._templateChunk === 'missing'
              ? html`<growspace-lazy-chunk-error
                  .chunk=${LAZY_CHUNKS.labelTemplates}
                ></growspace-lazy-chunk-error>`
              : this._templateChunk === 'ready' && plantId
                ? html`<growspace-label-batch
                    single
                    .capability=${support.capability}
                    .plantIds=${[plantId]}
                    .describePlant=${describePlant}
                    .language=${language}
                  ></growspace-label-batch>`
                : this._templateChunk === 'ready'
                  ? html`<growspace-label-record-print
                      .capability=${support.capability}
                      .strain=${ds?.strainName ?? ''}
                      .phenotype=${ds?.phenotype ?? null}
                      .language=${language}
                    ></growspace-label-record-print>`
                  : html`<p role="status">${localize('labels.view_loading', '', '', language)}</p>`}
        </div>
        <div class="button-group">
          <button class="md3-button tonal" @click=${this._close}>
            ${localize('labels.batch_close', '', '', language)}
          </button>
        </div>
      </gs-dialog>
    `;
  }

  /** The Classic dialog, when a request templates could print reaches it: say why. */
  private _renderCompatibilityNotice(): TemplateResult | typeof nothing {
    if (!this._templatePrintable) return nothing;
    const subject = this._plantId ? 'plant' : 'record';
    const key =
      this.support?.status === 'incompatible'
        ? `labels.${subject}_compatibility_incompatible`
        : `labels.${subject}_compatibility_classic`;
    return html`
      <div class="compatibility-notice" data-role="compatibility" role="note">
        <strong>${localize('labels.record_compatibility_title', '', '', this._language)}</strong>
        <span>${localize(key, '', '', this._language)}</span>
      </div>
    `;
  }

  private _resetForm() {
    const ds = this.dialogState;
    this._printState = 'idle';
    this._printProgress = 0;
    this._settingsOpen = false;
    this._copies = 1;
    this._sizeId = ds?.defaultSizeId ?? '50x30';
    this._density = ds?.defaultDensity ?? 'normal';
    this._qrTarget = ds?.defaultQrTarget ?? 'web';
    this._fields = { ...DEFAULT_LABEL_FIELDS, ...(ds?.defaultFields ?? {}) };

    if (!this._selectedDeviceId && this.hass) {
      const printers = getPrinters(this.hass);
      if (printers.length > 0) {
        this._selectedDeviceId = printers[0].id;
      }
    }
  }

  private _toggleField(field: keyof LabelFieldVisibility) {
    if (field === 'name') return;
    this._fields = { ...this._fields, [field]: !this._fields[field] };
  }

  private async _submit() {
    if (!this.store || !this.dialogState) return;

    this._printState = 'printing';
    this._printProgress = 0;

    const ds = this.dialogState;
    // A strain-library label has no plant to read: the strain travels itself.
    const strain = ds.plantId
      ? {}
      : {
          strain: text(ds.strainName),
          phenotype: text(ds.phenotype),
          breeder: text(ds.breeder),
          lineage: text(ds.lineage),
          breederLogo: text(ds.breederLogo),
        };

    try {
      for (let i = 0; i < this._copies; i++) {
        await printLabel({
          plantId: ds.plantId,
          ...strain,
          fields: this._fields,
          sizeId: this._sizeId,
          density: this._density,
          qrTarget: this._qrTarget,
          deviceId: this._selectedDeviceId || undefined,
          baseUrl: window.location.origin + window.location.pathname,
        });
        this._printProgress = Math.round(((i + 1) / this._copies) * 100);
      }
      this._printState = 'done';
    } catch (_e) {
      this._printState = 'error';
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _renderFooterMeta() {
    const { _printState, _copies, _printProgress } = this;
    if (_printState === 'printing') {
      return html`<span class="footer-meta">Sending to printer… (${_printProgress}%)</span>`;
    }
    if (_printState === 'done') {
      return html`<span class="footer-meta">Printed ${_copies} label(s) ✓</span>`;
    }
    if (_printState === 'error') {
      return html`<span class="footer-meta error">Printer offline — check Bluetooth</span>`;
    }
    const sizeLabel = LABEL_SIZES.find((s) => s.id === this._sizeId)?.label ?? this._sizeId;
    return html`<span class="footer-meta">${_copies} × ${sizeLabel} · Thermal 203 dpi</span>`;
  }

  private _renderFieldRow(field: keyof LabelFieldVisibility, label: string) {
    const locked = field === 'name';
    const on = this._fields[field];
    return html`
      <div
        class="field-toggle-row ${locked ? 'locked' : ''}"
        @click=${locked ? nothing : () => this._toggleField(field)}
      >
        <span class="field-toggle-label">${label}</span>
        <div class="toggle-dot ${on ? 'on' : ''}"></div>
      </div>
    `;
  }

  protected render() {
    if (!this.open) return nothing;
    if (
      this._templatePrintable &&
      (this.support?.status === 'unknown' || this.support?.status === 'available')
    ) {
      return this._renderTemplatePath();
    }

    const ds = this.dialogState;
    const values = deriveLabelFieldValues(ds?.plantId, ds);
    const printers = this.hass ? getPrinters(this.hass) : [];
    const isPrinting = this._printState === 'printing';
    const sizeLabel = LABEL_SIZES.find((s) => s.id === this._sizeId)?.label ?? this._sizeId;

    const qrValue = buildQrTargetUrl(ds?.plantId, this._qrTarget);

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Print Label"
        .subtitle=${values.name || 'Label'}
        .iconPath=${mdiPrinter}
        stageColor="var(--gm-info-color)"
        @close=${this._close}
      >
        ${this._renderCompatibilityNotice()}
        <div class="two-col">
          <!-- Settings (first in DOM so mobile stacks it above preview) -->
          <div class="settings-wrapper">
            <button
              class="mobile-pill-toggle ${this._settingsOpen ? 'open' : ''}"
              @click=${() => {
                this._settingsOpen = !this._settingsOpen;
              }}
            >
              <span>Print settings</span>
              <span class="pill-chevron ${this._settingsOpen ? 'open' : ''}">›</span>
            </button>
            <div class="settings-col ${this._settingsOpen ? 'mobile-open' : ''}">
              <!-- Label content -->
              <div class="settings-section">
                <div class="settings-section-title">Label content</div>
                ${this._renderFieldRow('name', 'Strain name')}
                ${this._renderFieldRow('phenotype', 'Phenotype')}
                ${this._renderFieldRow('breeder', 'Breeder')}
                ${this._renderFieldRow('lineage', 'Lineage')}
                ${this._renderFieldRow('startDate', 'Start date')}
                ${this._renderFieldRow('stageAge', 'Stage & age')}
                ${this._renderFieldRow('plantId', 'Plant ID')}
                ${this._renderFieldRow('logo', 'Logo')} ${this._renderFieldRow('qr', 'QR code')}
              </div>

              <!-- QR target (only when qr is on) -->
              ${this._fields.qr
                ? html`
                    <div class="qr-target-card">
                      <div class="settings-section-title">QR code links to</div>
                      <md3-select
                        .value=${this._qrTarget}
                        .options=${[
                          { label: 'Web (default)', value: 'web' },
                          { label: 'Deep link', value: 'deeplink' },
                        ]}
                        @change=${(e: CustomEvent) => {
                          this._qrTarget = e.detail as QrTarget;
                        }}
                      ></md3-select>
                      <div class="qr-url-hint">${qrValue}</div>
                    </div>
                  `
                : nothing}

              <!-- Copies + density -->
              <div class="settings-section">
                <div class="settings-section-title">Copies &amp; density</div>
                <div class="copies-density-row">
                  <div class="copies-stepper">
                    <button
                      @click=${() => {
                        if (this._copies > 1) this._copies--;
                      }}
                    >
                      −
                    </button>
                    <span class="copies-value">${this._copies}</span>
                    <button
                      @click=${() => {
                        if (this._copies < 50) this._copies++;
                      }}
                    >
                      +
                    </button>
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
                </div>
              </div>

              <!-- Size chips -->
              <div class="settings-section">
                <div class="settings-section-title">Print settings</div>
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
              </div>

              <!-- Printer -->
              <div class="settings-section">
                <div class="settings-section-title">Printer</div>
                <md3-select
                  label="Niimbot Printer"
                  .value=${this._selectedDeviceId || ''}
                  .options=${[
                    { label: 'Default / Auto', value: '' },
                    ...printers.map((p) => ({ label: p.name, value: p.id })),
                  ]}
                  @change=${(e: CustomEvent) => {
                    this._selectedDeviceId = e.detail;
                  }}
                ></md3-select>
              </div>
            </div>
          </div>

          <!-- Preview (second in DOM; CSS grid places it in col 1 on desktop) -->
          <div class="preview-col">
            <div class="preview-stage">
              <label-preview
                .sizeId=${this._sizeId}
                .fields=${this._fields}
                .values=${values}
                .qrValue=${qrValue}
                .density=${this._density}
              ></label-preview>
            </div>
            <div class="preview-meta">
              ${sizeLabel} ·
              ${localize('labels.classic_preview_meta', '', '', this.hass?.language ?? 'en')}
            </div>
            <printer-status-strip
              .hass=${this.hass}
              .selectedDeviceId=${this._selectedDeviceId}
            ></printer-status-strip>
          </div>
        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          ${this._renderFooterMeta()}
          <div class="footer-actions">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${isPrinting}>
              Cancel
            </button>
            <button class="btn-print" @click=${this._submit} ?disabled=${isPrinting}>
              <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
              ${isPrinting ? `Printing… ${this._printProgress}%` : 'Print Now'}
            </button>
          </div>
        </div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'print-label-dialog': PrintLabelDialog;
  }
}
