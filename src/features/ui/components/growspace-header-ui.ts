import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { GrowspaceDevice, GrowspaceManagerCardConfig, NutrientInventory } from '../../../types';
import { HeaderChip, DominantStageInfo } from '../../../utils/metrics-utils';
import { ResizeController } from '../../../controllers/resize-controller';

import { headerStyles } from '../../../styles/header.styles';
import '../../../components/growspace-header/header-actions';
import '../../../components/growspace-header/header-hero';
import '../../../components/growspace-header/header-stages';
import '../../../components/growspace-header/header-secondary';

@customElement('growspace-header-ui')
export class GrowspaceHeaderUI extends LitElement {
  @property({ attribute: false }) heroChips: HeaderChip[] = [];
  @property({ attribute: false }) secondaryChips: HeaderChip[] = [];
  @property({ attribute: false }) deviceChips: HeaderChip[] = [];
  @property({ attribute: false }) dominant: DominantStageInfo | undefined;
  @property({ attribute: false }) inventory: NutrientInventory | null = null;
  @property({ attribute: false }) devices: GrowspaceDevice[] = [];
  @property() deviceId = '';
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) config: GrowspaceManagerCardConfig | null = null;
  @property({ type: Boolean }) compact = false;

  @state() private _mobileLink = false;
  private _resizeController = new ResizeController(this, () => {});

  static styles = headerStyles;

  private _handleDeviceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.dispatchEvent(
      new CustomEvent('device-changed', {
        detail: { value: target.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', {
        detail: { metric },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChipDragStart(e: DragEvent | null, metric: string) {
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', {
        detail: { metric, event: e },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleChipDrop(e: DragEvent | null, targetMetric: string) {
    this.dispatchEvent(
      new CustomEvent('chip-drop', {
        detail: { targetMetric, event: e },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _unlinkGraphs(groupIndex: number) {
    this.dispatchEvent(
      new CustomEvent('unlink-graphs', {
        detail: { groupIndex },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleToggleMobileLink() {
    this._mobileLink = !this._mobileLink;
  }

  private _openNutrients() {
    this.dispatchEvent(
      new CustomEvent('open-nutrients', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.device) return html``;

    return html`
      <div class="gs-stats-container">
        <!-- TOP HEADER GRID -->
        <div class="gs-header-top">
          <!-- Row 1 Left: Title/Select -->
          <div class="header-title-area">
            ${!this.config?.default_growspace
              ? html` <div class="select-wrapper">
                  <div class="select-sizer">${this.device.name || 'Select Growspace'}</div>
                  <select
                    class="growspace-select-header"
                    .value=${this.deviceId}
                    @change=${this._handleDeviceChange}
                  >
                    ${this.devices.map((d) => html`<option value="${d.deviceId}">${d.name}</option>`)}
                  </select>
                </div>`
              : html`<h1 class="gs-title">${this.device.name}</h1>`}
          </div>

          <!-- Row 1 Right: Actions & Device Chips -->
          <growspace-header-actions
            class="header-actions"
            .deviceChips=${this.deviceChips}
            .isMobile=${this._resizeController.isMobile}
            .mobileLink=${this._mobileLink}
            @toggle-graph=${(e: CustomEvent) => this._toggleEnvGraph(e.detail.metric)}
            @chip-drag-start=${(e: CustomEvent) => this._handleChipDragStart(null, e.detail.metric)}
            @chip-drop=${(e: CustomEvent) => this._handleChipDrop(null, e.detail.targetMetric)}
            @toggle-mobile-link=${() => this._handleToggleMobileLink()}
          ></growspace-header-actions>

          <!-- Row 2 Left: Stages -->
          <div class="header-stage-area-wrapper">
            <growspace-header-stages .dominant=${this.dominant}></growspace-header-stages>
          </div>

          <!-- Row 2 Right: Secondary Chips & Inventory -->
          <div class="secondary-strip-container">
            <growspace-header-secondary
              .chips=${this.secondaryChips}
              .inventory=${this.inventory}
              .compact=${this.compact}
              .isMobile=${this._resizeController.isMobile}
              .mobileLink=${this._mobileLink}
              @open-nutrients=${() => this._openNutrients()}
              @toggle-graph=${(e: CustomEvent) => this._toggleEnvGraph(e.detail.metric)}
              @chip-drag-start=${(e: CustomEvent) =>
                this._handleChipDragStart(null, e.detail.metric)}
              @chip-drop=${(e: CustomEvent) => this._handleChipDrop(null, e.detail.targetMetric)}
              @unlink-graphs=${(e: CustomEvent) => this._unlinkGraphs(e.detail.groupIndex)}
            ></growspace-header-secondary>
          </div>
        </div>

        <!-- HERO GRID (Vital Stats) -->
        <growspace-header-hero
          .chips=${this.heroChips}
          .device=${this.device}
          .isMobile=${this._resizeController.isMobile}
          .mobileLink=${this._mobileLink}
          @toggle-graph=${(e: CustomEvent) => this._toggleEnvGraph(e.detail.metric)}
          @chip-drag-start=${(e: CustomEvent) => this._handleChipDragStart(null, e.detail.metric)}
          @chip-drop=${(e: CustomEvent) => this._handleChipDrop(null, e.detail.targetMetric)}
        ></growspace-header-hero>
      </div>
    `;
  }
}
