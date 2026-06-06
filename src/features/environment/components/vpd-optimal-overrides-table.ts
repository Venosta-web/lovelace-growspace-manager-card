import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  FAN_VPD_STAGE_KEYS,
  VPD_OPTIMAL_STAGE_DEFAULTS,
  FAN_VPD_STAGE_LABELS,
  type FanVpdStageKey,
} from '../constants';

export type VpdOptimalOverrides = Record<
  string,
  { day: { low: number; high: number }; night: { low: number; high: number } }
>;

@customElement('vpd-optimal-overrides-table')
export class VpdOptimalOverridesTable extends LitElement {
  @property({ attribute: false }) overrides: VpdOptimalOverrides = {};

  static styles = css`
    :host {
      display: block;
    }
    .header-group-row {
      display: grid;
      grid-template-columns: 1fr repeat(2, 90px) repeat(2, 90px);
      gap: 8px;
      padding: 0 4px 2px;
      font-size: 0.75rem;
      color: var(--secondary-text-color);
    }
    .header-group-row .group-label {
      grid-column: span 2;
      text-align: center;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      padding-bottom: 2px;
    }
    .header-sub-row {
      display: grid;
      grid-template-columns: 1fr repeat(2, 90px) repeat(2, 90px);
      gap: 8px;
      padding: 0 4px 4px;
      font-size: 0.75rem;
      color: var(--secondary-text-color);
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      margin-bottom: 4px;
    }
    .stage-row {
      display: grid;
      grid-template-columns: 1fr repeat(2, 90px) repeat(2, 90px);
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

  private _getDisplayValue(
    key: FanVpdStageKey,
    period: 'day' | 'night',
    slot: 'low' | 'high',
  ): number {
    return this.overrides[key]?.[period]?.[slot] ?? VPD_OPTIMAL_STAGE_DEFAULTS[key][period][slot];
  }

  private _handleChange(
    key: FanVpdStageKey,
    period: 'day' | 'night',
    slot: 'low' | 'high',
    raw: string,
  ) {
    const parsed = parseFloat(raw);
    const value = isNaN(parsed) ? VPD_OPTIMAL_STAGE_DEFAULTS[key][period][slot] : parsed;
    const existingPeriod = this.overrides[key]?.[period] ?? {
      ...VPD_OPTIMAL_STAGE_DEFAULTS[key][period],
    };
    const existingStage = this.overrides[key] ?? { ...VPD_OPTIMAL_STAGE_DEFAULTS[key] };
    const updated: VpdOptimalOverrides = {
      ...this.overrides,
      [key]: {
        ...existingStage,
        [period]: { ...existingPeriod, [slot]: value },
      },
    };
    this.dispatchEvent(new CustomEvent('overrides-change', { detail: updated, bubbles: true, composed: true }));
  }

  private _handleReset() {
    this.dispatchEvent(
      new CustomEvent('overrides-change', { detail: {}, bubbles: true, composed: true }),
    );
  }

  protected override render() {
    return html`
      <div class="header-group-row">
        <span></span>
        <span class="group-label">Day (kPa)</span>
        <span class="group-label">Night (kPa)</span>
      </div>
      <div class="header-sub-row">
        <span>Stage</span>
        <span>Low</span>
        <span>High</span>
        <span>Low</span>
        <span>High</span>
      </div>
      ${FAN_VPD_STAGE_KEYS.map(
        (key) => html`
          <div class="stage-row">
            <span class="stage-label">${FAN_VPD_STAGE_LABELS[key]}</span>
            ${(['day', 'night'] as const).map(
              (period) =>
                html`${(['low', 'high'] as const).map(
                  (slot) => html`
                    <input
                      type="number"
                      min="0.1"
                      max="3.0"
                      step="0.01"
                      .value=${String(this._getDisplayValue(key, period, slot))}
                      @change=${(e: Event) =>
                        this._handleChange(
                          key,
                          period,
                          slot,
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  `,
                )}`,
            )}
          </div>
        `,
      )}
      <button class="reset-button" @click=${this._handleReset}>Reset all to defaults</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vpd-optimal-overrides-table': VpdOptimalOverridesTable;
  }
}
