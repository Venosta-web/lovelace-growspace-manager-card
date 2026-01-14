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

    const { current_ml, initial_ml, name } = this.stock;
    const ratio = initial_ml > 0 ? current_ml / initial_ml : 0;

    let status: 'optimal' | 'warning' | 'danger' = 'optimal';
    if (ratio <= 0.2) {
      status = 'danger';
    } else if (ratio <= 0.5) {
      status = 'warning';
    }

    const percentage = Math.round(ratio * 100);
    const value = this.compact
      ? `${percentage}%`
      : `${current_ml}ml (${percentage}%)`;

    const label = this.compact ? '' : name;
    // If compact, maybe show name as tooltip or just rely on parent context? 
    // Usually chip has label. Let's use name as label always, but maybe truncate?

    return html`
      <growspace-chip
        .icon=${mdiBottleTonicPlus}
        .label=${this.compact ? undefined : name}
        .value=${value}
        .status=${status}
        .tooltip=${`Capacity: ${initial_ml}ml\nLast Updated: ${new Date(this.stock.last_updated).toLocaleDateString()}`}
      ></growspace-chip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nutrient-stock-chip': NutrientStockChip;
  }
}
