import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';

import { GrowspaceDevice, GrowspaceManagerCardConfig, NutrientInventory } from '../../../types';
import { HeaderChip, DominantStageInfo } from '../../../utils/metrics-utils';
import { ResizeController } from '../../../controllers/resize-controller';
import { headerStyles } from '../../../styles/header.styles';

import './growspace-header-actions-ui';
import './growspace-header-hero-ui';
import './growspace-header-stages-ui';
import './growspace-header-secondary-ui';

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
  @property({ attribute: false }) historyCache: any = {};
  @property() timeRange = '24h';
  @property() viewMode = '';
  @property({ type: Boolean }) isEditMode = false;
  @property({ attribute: false }) selectedPlants = new Set<string>();
  @property({ attribute: false }) hass!: HomeAssistant;

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
          <growspace-header-actions-ui
            class="header-actions"
            .device=${this.device}
            .deviceChips=${this.deviceChips}
            .isMobile=${this._resizeController.isMobile}
            .mobileLink=${this._mobileLink}
            .viewMode=${this.viewMode}
            .isEditMode=${this.isEditMode}
            .selectedPlants=${this.selectedPlants}
            .selectedDevice=${this.deviceId}
            @toggle-graph=${(e: any) => { e.stopPropagation(); this._toggleEnvGraph(e.detail.metric); }}
            @chip-drag-start=${(e: any) => this._handleChipDragStart(null, e.detail.metric)}
            @chip-drop=${(e: any) => this._handleChipDrop(null, e.detail.targetMetric)}
            @toggle-mobile-link=${() => this._handleToggleMobileLink()}
            @action-triggered=${(e: any) => { e.stopPropagation(); this.dispatchEvent(new CustomEvent('action-triggered', { detail: e.detail, bubbles: true, composed: true })); }}
          ></growspace-header-actions-ui>

          <!-- Row 2 Left: Stages -->
          <div class="header-stage-area-wrapper">
            <growspace-header-stages-ui
              .dominant=${this.dominant}
            ></growspace-header-stages-ui>
          </div>

          <!-- Row 2 Right: Secondary Chips & Inventory -->
          <div class="secondary-strip-container">
            <growspace-header-secondary-ui
              .isMobile=${this._resizeController.isMobile}
              .mobileLink=${this._mobileLink}
              .compact=${this.compact}
              .chips=${this.secondaryChips}
              .inventory=${this.inventory}
              @open-nutrients=${() => this._openNutrients()}
              @toggle-graph=${(e: any) => { e.stopPropagation(); this._toggleEnvGraph(e.detail.metric); }}
              @chip-drag-start=${(e: any) =>
                this._handleChipDragStart(e.detail.event, e.detail.metric)}
              @chip-drop=${(e: any) =>
                this._handleChipDrop(e.detail.event, e.detail.targetMetric)}
              @unlink-graphs=${(e: any) => this._unlinkGraphs(e.detail.groupIndex)}
            ></growspace-header-secondary-ui>
          </div>
        </div>

        <!-- HERO GRID (Vital Stats) -->
        <growspace-header-hero-ui
          .hass=${this.hass}
          .chips=${this.heroChips}
          .device=${this.device}
          .isMobile=${this._resizeController.isMobile}
          .mobileLink=${this._mobileLink}
          .historyCache=${this.historyCache}
          .timeRange=${this.timeRange}
          @toggle-graph=${(e: any) => { e.stopPropagation(); this._toggleEnvGraph(e.detail.metric); }}
          @chip-drag-start=${(e: any) => this._handleChipDragStart(null, e.detail.metric)}
          @chip-drop=${(e: any) => this._handleChipDrop(null, e.detail.targetMetric)}
        ></growspace-header-hero-ui>
      </div>
    `;
  }
}
