import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  FAN_VPD_STAGE_KEYS,
  FAN_VPD_STAGE_DEFAULTS,
  FAN_VPD_STAGE_LABELS,
  type FanVpdStageKey,
} from '../constants';

export type StageVpdOverrides = Record<string, { day: number; night: number }>;

@customElement('stage-vpd-overrides-table')
export class StageVpdOverridesTable extends LitElement {
  @property({ attribute: false }) overrides: StageVpdOverrides = {};

  static styles = css`
    :host {
      display: block;
    }
    .header-row {
      display: grid;
      grid-template-columns: 1fr 90px 90px;
      gap: 8px;
      padding: 0 4px 4px;
      font-size: 0.75rem;
      color: var(--secondary-text-color);
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      margin-bottom: 4px;
    }
    .stage-row {
      display: grid;
      grid-template-columns: 1fr 90px 90px;
      gap: 8px;
      align-items: center;
      padding: 4px;
    }
    .stage-label {
      font-size: 0.875rem;
      color: var(--primary-text-color);
    }
    input[type='number'] {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.05);
      border: none;
      border-bottom: 1px solid var(--secondary-text-color, rgba(255, 255, 255, 0.4));
      color: var(--primary-text-color);
      font-size: 0.875rem;
      padding: 4px 6px;
      border-radius: 4px 4px 0 0;
      outline: none;
    }
    input[type='number']:focus {
      border-bottom: 2px solid var(--primary-color, #6200ee);
    }
    .reset-button {
      margin-top: 12px;
      background: transparent;
      border: 1px solid var(--secondary-text-color, rgba(255, 255, 255, 0.4));
      border-radius: 4px;
      color: var(--primary-text-color);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 4px 12px;
    }
    .reset-button:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  `;

  private _getDisplayValue(key: FanVpdStageKey, slot: 'day' | 'night'): number {
    return this.overrides[key]?.[slot] ?? FAN_VPD_STAGE_DEFAULTS[key][slot];
  }

  private _handleChange(key: FanVpdStageKey, slot: 'day' | 'night', raw: string) {
    const parsed = parseFloat(raw);
    const value = isNaN(parsed) ? FAN_VPD_STAGE_DEFAULTS[key][slot] : parsed;
    const existing = this.overrides[key] ?? { ...FAN_VPD_STAGE_DEFAULTS[key] };
    const updated = { ...this.overrides, [key]: { ...existing, [slot]: value } };
    this.dispatchEvent(new CustomEvent('overrides-change', { detail: updated, bubbles: true, composed: true }));
  }

  private _handleReset() {
    this.dispatchEvent(
      new CustomEvent('overrides-change', { detail: {}, bubbles: true, composed: true }),
    );
  }

  protected override render() {
    return html`
      <div class="header-row">
        <span>Stage</span>
        <span>Day (kPa)</span>
        <span>Night (kPa)</span>
      </div>
      ${FAN_VPD_STAGE_KEYS.map(
        (key) => html`
          <div class="stage-row">
            <span class="stage-label">${FAN_VPD_STAGE_LABELS[key]}</span>
            <input
              type="number"
              min="0.1"
              max="3.0"
              step="0.01"
              .value=${String(this._getDisplayValue(key, 'day'))}
              @change=${(e: Event) =>
                this._handleChange(key, 'day', (e.target as HTMLInputElement).value)}
            />
            <input
              type="number"
              min="0.1"
              max="3.0"
              step="0.01"
              .value=${String(this._getDisplayValue(key, 'night'))}
              @change=${(e: Event) =>
                this._handleChange(key, 'night', (e.target as HTMLInputElement).value)}
            />
          </div>
        `,
      )}
      <button class="reset-button" @click=${this._handleReset}>Reset all to defaults</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-vpd-overrides-table': StageVpdOverridesTable;
  }
}
