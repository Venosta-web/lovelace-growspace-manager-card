import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import qrcode from 'qrcode-generator';
import type { LabelSizeId, PrintDensity, LabelFieldVisibility, LabelFieldValues } from '../../../lib/types/dialog';

type LayoutMode = 'std' | 'tall' | 'wide';

const LAYOUT_MAP: Record<LabelSizeId, LayoutMode> = {
  '50x30': 'std',
  '40x30': 'std',
  '50x50': 'tall',
  '50x80': 'tall',
  '50x15': 'wide',
};

const ASPECT_MAP: Record<LabelSizeId, string> = {
  '50x30': '5 / 3',
  '40x30': '4 / 3',
  '50x50': '1 / 1',
  '50x80': '5 / 8',
  '50x15': '10 / 3',
};

function buildQrSvg(data: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(data);
  qr.make();
  const count = qr.getModuleCount();
  const cellSize = 4;
  const size = count * cellSize;
  const cells: string[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        cells.push(`<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="currentColor"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${cells.join('')}</svg>`;
}

@customElement('label-preview')
export class LabelPreview extends LitElement {
  @property({ type: String }) public sizeId: LabelSizeId = '50x30';

  @property({ attribute: false }) public fields: LabelFieldVisibility = {
    name: true, phenotype: true, breeder: true, lineage: true,
    startDate: true, stageAge: true, plantId: true, logo: true, qr: true,
  };

  @property({ attribute: false }) public values: LabelFieldValues = {
    name: '', phenotype: '', breeder: '', lineage: '',
    startDate: '', stageAge: '', plantId: '', logo: '',
  };

  @property({ type: String }) public qrValue: string = '';

  @property({ type: String }) public density: PrintDensity = 'normal';

  static styles = css`
    :host {
      display: block;
      position: relative;
      box-sizing: border-box;
      border: 1px solid #333;
      background: #fff;
      color: #000;
      font-family: sans-serif;
      overflow: hidden;
    }
    :host([data-density='low']) { opacity: 0.6; filter: contrast(0.7); }
    :host([data-density='normal']) { opacity: 1; filter: contrast(1); }
    :host([data-density='high']) { opacity: 1; filter: contrast(1.3); }

    .label-inner {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 4px;
      box-sizing: border-box;
    }

    /* --- std layout (50x30, 40x30) --- */
    :host([data-layout='std']) .label-inner { flex-direction: column; }
    :host([data-layout='std']) .field-name { font-size: 1em; font-weight: bold; width: 100%; }
    :host([data-layout='std']) .lower-row { display: flex; flex: 1; gap: 4px; }
    :host([data-layout='std']) .text-cols { display: flex; flex-direction: column; flex: 1; gap: 2px; font-size: 0.7em; }
    :host([data-layout='std']) .field-qr { width: 40%; display: flex; align-items: center; justify-content: center; }
    :host([data-layout='std']) .field-qr svg { width: 100%; height: auto; }

    /* --- tall layout (50x50, 50x80) --- */
    :host([data-layout='tall']) .label-inner { flex-direction: column; align-items: center; }
    :host([data-layout='tall']) .field-name { font-size: 1em; font-weight: bold; width: 100%; }
    :host([data-layout='tall']) .lower-row { display: flex; flex-direction: column; width: 100%; gap: 2px; }
    :host([data-layout='tall']) .text-cols { display: flex; flex-direction: column; gap: 2px; font-size: 0.7em; }
    :host([data-layout='tall']) .field-qr { display: flex; justify-content: center; margin-top: 4px; }
    :host([data-layout='tall']) .field-qr svg { width: 60%; height: auto; }

    /* --- wide layout (50x15) --- */
    :host([data-layout='wide']) .label-inner { flex-direction: row; align-items: center; gap: 4px; }
    :host([data-layout='wide']) .field-name { font-size: 0.8em; font-weight: bold; white-space: nowrap; }
    :host([data-layout='wide']) .lower-row { display: flex; flex: 1; gap: 4px; align-items: center; }
    :host([data-layout='wide']) .text-cols { display: flex; flex-wrap: wrap; gap: 2px; font-size: 0.6em; }
    :host([data-layout='wide']) .field-qr { display: flex; align-items: center; }
    :host([data-layout='wide']) .field-qr svg { width: 32px; height: 32px; }

    /* Corner markers */
    .corner-marker {
      position: absolute;
      width: 6px;
      height: 6px;
      border-color: #333;
      border-style: solid;
    }
    .corner-marker.tl { top: 1px; left: 1px; border-width: 2px 0 0 2px; }
    .corner-marker.tr { top: 1px; right: 1px; border-width: 2px 2px 0 0; }
    .corner-marker.bl { bottom: 1px; left: 1px; border-width: 0 0 2px 2px; }
    .corner-marker.br { bottom: 1px; right: 1px; border-width: 0 2px 2px 0; }

    .field-logo img { max-height: 20px; max-width: 40px; object-fit: contain; }
  `;

  private get _layout(): LayoutMode {
    return LAYOUT_MAP[this.sizeId] ?? 'std';
  }

  override update(changed: Map<string, unknown>) {
    super.update(changed);
    this.setAttribute('data-layout', this._layout);
    this.setAttribute('data-density', this.density);
    const aspect = ASPECT_MAP[this.sizeId] ?? '5 / 3';
    this.style.aspectRatio = aspect;
  }

  private _renderQr() {
    if (!this.fields.qr) return nothing;
    const svg = buildQrSvg(this.qrValue || 'https://growspace.app');
    return html`<div class="field-qr">${unsafeHTML(svg)}</div>`;
  }

  private _renderTextCols() {
    return html`
      <div class="text-cols">
        ${this.fields.phenotype ? html`<span class="field-phenotype">${this.values.phenotype}</span>` : nothing}
        ${this.fields.breeder ? html`<span class="field-breeder">${this.values.breeder}</span>` : nothing}
        ${this.fields.lineage ? html`<span class="field-lineage">${this.values.lineage}</span>` : nothing}
        ${this.fields.startDate ? html`<span class="field-startDate">${this.values.startDate}</span>` : nothing}
        ${this.fields.stageAge ? html`<span class="field-stageAge">${this.values.stageAge}</span>` : nothing}
        ${this.fields.plantId ? html`<span class="field-plantId">${this.values.plantId}</span>` : nothing}
        ${this.fields.logo ? html`<div class="field-logo"><img src="${this.values.logo}" alt="logo" /></div>` : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="corner-marker tl"></div>
      <div class="corner-marker tr"></div>
      <div class="corner-marker bl"></div>
      <div class="corner-marker br"></div>
      <div class="label-inner">
        ${this.fields.name ? html`<div class="field-name">${this.values.name}</div>` : nothing}
        <div class="lower-row">
          ${this._renderTextCols()}
          ${this._renderQr()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'label-preview': LabelPreview;
  }
}
