import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiBottleTonicPlus } from '@mdi/js';
import { NutrientStock } from '../../types';
import '../growspace-chip';

@customElement('nutrient-stock-chip')
export class NutrientStockChip extends LitElement {
  @property({ attribute: false }) public stock!: NutrientStock;
  @property({ type: Boolean }) public compact = false;

  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  render(): TemplateResult {
    if (!this.stock) {
      return html``;
    }

    // eslint-disable-next-line camelcase
    // eslint-disable-next-line camelcase
    const { current_ml: currentMl, initial_ml: initialMl, name } = this.stock;
    const ratio = initialMl > 0 ? currentMl / initialMl : 0;

    let status: 'optimal' | 'warning' | 'danger' = 'optimal';
    if (ratio <= 0.2) {
      status = 'danger';
    } else if (ratio <= 0.5) {
      status = 'warning';
    }

    const percentage = Math.round(ratio * 100);
    const value = this.compact ? `${percentage}%` : `${Math.round(currentMl)}ml (${percentage}%)`;
    // If compact, maybe show name as tooltip or just rely on parent context?
    // Usually chip has label. Let's use name as label always, but maybe truncate?

    return html`
      <growspace-chip
        .icon=${mdiBottleTonicPlus}
        .label=${this.compact ? undefined : name}
        .value=${value}
        .status=${status}
        .tooltip=${`Capacity: ${initialMl}ml\nLast Updated: ${new Date(this.stock.last_updated).toLocaleDateString()}`}
      ></growspace-chip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nutrient-stock-chip': NutrientStockChip;
  }
}
