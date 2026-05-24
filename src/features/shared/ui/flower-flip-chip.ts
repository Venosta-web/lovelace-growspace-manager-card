import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiFlower } from '@mdi/js';
import type { FlowerFlipInfo } from '../../../utils/flower-flip';
import './growspace-chip';

@customElement('flower-flip-chip')
export class FlowerFlipChip extends LitElement {
  @property({ attribute: false }) public info!: FlowerFlipInfo;
  @property({ type: String }) public growspaceId!: string;

  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  private _buildTooltip(): string {
    const { plantNames, flowerStart, vegDayHours, flowerDayHours, autoLightTracking } = this.info;
    const names = plantNames.join(', ');
    let tip = `Flower flip today (${flowerStart}): ${names}\nPhotoperiod: ${vegDayHours}h → ${flowerDayHours}h`;
    if (autoLightTracking) {
      tip += '\nAuto-light tracking is active — the schedule adapts automatically, but set your hardware timer to 12h.';
    }
    return tip;
  }

  private _handleClick() {
    this.dispatchEvent(
      new CustomEvent('flower-flip-click', {
        detail: { growspaceId: this.growspaceId, flowerStart: this.info.flowerStart },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.info) return html``;
    return html`
      <growspace-chip
        .icon=${mdiFlower}
        .status=${'warning'}
        .tooltip=${this._buildTooltip()}
        .value=${'Flower Flip'}
        @click=${this._handleClick}
      ></growspace-chip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'flower-flip-chip': FlowerFlipChip;
  }
}
