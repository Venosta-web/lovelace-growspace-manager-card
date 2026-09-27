/**
 * PROTOTYPE — growspace_manager#864. The "Zones" tab host: picks the variant
 * and scenario, and owns the floating switcher bar. Throwaway; never merge.
 */

import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import type { GrowspaceDevice } from '../../../services/types';
import {
  SCENARIOS,
  VARIANTS,
  proto864$,
  protoRevision$,
  scenarioFor,
  setProto,
  type VariantKey,
} from './state';
import { gridSize } from './shared';
import './variant-a';
import './variant-b';
import './variant-c';

@customElement('irrigation-zones-prototype')
export class IrrigationZonesPrototype extends LitElement {
  @property({ attribute: false }) device: GrowspaceDevice | undefined;

  private _sel = new StoreController(this, proto864$);
  private _rev = new StoreController(this, protoRevision$);

  static styles = css`
    :host {
      display: block;
      padding-bottom: 72px;
    }
    .bar {
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 999px;
      background: #fff;
      color: #111;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
      font:
        600 13px/1.2 system-ui,
        sans-serif;
      white-space: nowrap;
    }
    .bar button {
      border: none;
      background: #eee;
      color: #111;
      border-radius: 999px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 15px;
    }
    .bar .label {
      min-width: 170px;
      text-align: center;
    }
    .bar select {
      border: 1px solid #ccc;
      border-radius: 999px;
      padding: 4px 8px;
      font: inherit;
      background: #f6f6f6;
      color: #111;
    }
    .bar .tag {
      background: #ffe082;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this._onKey);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this._onKey);
    super.disconnectedCallback();
  }

  private _onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const path = e.composedPath() as HTMLElement[];
    if (
      path.some(
        (el) =>
          el instanceof HTMLElement &&
          (el.matches?.('input, textarea, select, [contenteditable]') ?? false)
      )
    ) {
      return;
    }
    this._cycle(e.key === 'ArrowRight' ? 1 : -1);
  };

  private _cycle(step: number) {
    const keys = VARIANTS.map((v) => v.key);
    const i = keys.indexOf(this._sel.value.variant);
    setProto({ variant: keys[(i + step + keys.length) % keys.length] as VariantKey });
  }

  render(): TemplateResult {
    void this._rev.value;
    const sel = this._sel.value;
    const { rows, cols } = gridSize(this.device);
    const s = scenarioFor(sel.scenario, rows, cols);
    const v = VARIANTS.find((x) => x.key === sel.variant)!;
    const body =
      sel.variant === 'A'
        ? html`<proto864-variant-a .device=${this.device} .s=${s}></proto864-variant-a>`
        : sel.variant === 'B'
          ? html`<proto864-variant-b .device=${this.device} .s=${s}></proto864-variant-b>`
          : html`<proto864-variant-c .device=${this.device} .s=${s}></proto864-variant-c>`;
    return html`
      ${body}
      <div class="bar" role="toolbar" aria-label="Prototype switcher">
        <span class="tag">PROTOTYPE #864</span>
        <button aria-label="Previous variant" @click=${() => this._cycle(-1)}>←</button>
        <span class="label">${v.key} (${v.name})</span>
        <button aria-label="Next variant" @click=${() => this._cycle(1)}>→</button>
        <select
          aria-label="Scenario"
          .value=${sel.scenario}
          @change=${(e: Event) =>
            setProto({ scenario: (e.target as HTMLSelectElement).value as typeof sel.scenario })}
        >
          ${SCENARIOS.map(
            (x) =>
              html`<option value=${x.key} ?selected=${x.key === sel.scenario}>${x.name}</option>`
          )}
        </select>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-zones-prototype': IrrigationZonesPrototype;
  }
}
