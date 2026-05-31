import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { mdiPrinter, mdiCheck } from '@mdi/js';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/label-preview';
import '../features/shared/ui/printer-status-strip';
import type { PrintLabelDialogState, LabelFieldVisibility, LabelSizeId, PrintDensity, QrTarget } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { activeDevices$ } from '../slices/grid';
import { getPrinters } from '../features/shared/ui/printer-status-strip';

const DEFAULT_FIELDS: LabelFieldVisibility = {
  name: true,
  phenotype: true,
  breeder: true,
  lineage: true,
  startDate: true,
  stageAge: true,
  plantId: true,
  logo: true,
  qr: true,
};

const LABEL_SIZES: { id: LabelSizeId; label: string }[] = [
  { id: '50x30', label: '50×30' },
  { id: '40x30', label: '40×30' },
  { id: '50x50', label: '50×50' },
  { id: '50x80', label: '50×80' },
  { id: '50x15', label: '50×15' },
];

type PrintState = 'idle' | 'printing' | 'done' | 'error';

@customElement('print-label-dialog')
export class PrintLabelDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: PrintLabelDialogState | undefined;

  @state() private _selectedDeviceId = '';
  @state() private _fields: LabelFieldVisibility = { ...DEFAULT_FIELDS };
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
        border-radius: 10px;
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
          border-radius: 12px;
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
          font-size: 0.88rem;
          font-weight: 500;
        }
        .mobile-pill-toggle.open {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pill-chevron {
          font-size: 1.1rem;
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
        border-radius: 6px;
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
        font-size: 0.88rem;
      }
      .toggle-dot {
        width: 28px;
        height: 16px;
        border-radius: 8px;
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
        border-radius: 8px;
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
        border-radius: 6px;
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
        font-size: 0.95rem;
      }
      .density-seg {
        display: flex;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        overflow: hidden;
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

      /* Size chips */
      .size-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
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
        font-size: 0.82rem;
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
        background: #2196f3;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 18px;
        cursor: pointer;
        font-size: 0.9rem;
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
    this._fields = { ...DEFAULT_FIELDS, ...(ds?.defaultFields ?? {}) };

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

    try {
      for (let i = 0; i < this._copies; i++) {
        await this.store.actions.plant.printLabel({
          plantId: this.dialogState.plantId,
          fields: this._fields,
          sizeId: this._sizeId,
          density: this._density,
          qrTarget: this._qrTarget,
          deviceId: this._selectedDeviceId || undefined,
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

  private _getFieldValues() {
    const ds = this.dialogState;
    const plant = this._getPlant(ds?.plantId);
    const attrs = plant?.attributes;

    const startDate = attrs?.veg_start
      ? this._formatDate(attrs.veg_start)
      : attrs?.flower_start
        ? this._formatDate(attrs.flower_start)
        : '';

    const stageAge = attrs?.days_in_stage != null ? `Day ${attrs.days_in_stage}` : '';

    return {
      name: attrs?.strain ?? ds?.strainName ?? '',
      phenotype: attrs?.phenotype ?? ds?.phenotype ?? '',
      breeder: attrs?.breeder ?? ds?.breeder ?? '',
      lineage: attrs?.lineage ?? ds?.lineage ?? '',
      startDate,
      stageAge,
      plantId: ds?.plantId ?? '',
      logo: attrs?.breeder_logo ?? ds?.breederLogo ?? '',
    };
  }

  private _formatDate(dateStr?: string | null) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });
    } catch (_e) {
      return dateStr;
    }
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

    const ds = this.dialogState;
    const values = this._getFieldValues();
    const printers = this.hass ? getPrinters(this.hass) : [];
    const isPrinting = this._printState === 'printing';
    const sizeLabel = LABEL_SIZES.find((s) => s.id === this._sizeId)?.label ?? this._sizeId;

    const qrValue =
      this._qrTarget === 'deeplink'
        ? `growspace://plant/${ds?.plantId ?? ''}`
        : `https://growspace.app/plant/${ds?.plantId ?? ''}`;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Print Label"
        .subtitle=${values.name || 'Label'}
        .iconPath=${mdiPrinter}
        stageColor="#2196F3"
        @close=${this._close}
      >
        <div class="two-col">
          <!-- Settings (first in DOM so mobile stacks it above preview) -->
          <div class="settings-wrapper">
            <button
              class="mobile-pill-toggle ${this._settingsOpen ? 'open' : ''}"
              @click=${() => { this._settingsOpen = !this._settingsOpen; }}
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
              ${this._renderFieldRow('logo', 'Logo')}
              ${this._renderFieldRow('qr', 'QR code')}
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
                  >−</button>
                  <span class="copies-value">${this._copies}</span>
                  <button
                    @click=${() => {
        if (this._copies < 50) this._copies++;
      }}
                  >+</button>
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
            <div class="preview-meta">${sizeLabel} · Thermal 203 dpi</div>
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
            <button
              class="btn-print"
              @click=${this._submit}
              ?disabled=${isPrinting}
            >
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
