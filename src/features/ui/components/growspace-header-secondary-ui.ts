import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HeaderChip } from '../../../utils/metrics-utils';
import { NutrientInventory } from '../../../types';
import '../../shared/ui/scroll-container';
import '../../shared/ui/growspace-chip';
import '../../../components/ui/nutrient-stock-chip';

@customElement('growspace-header-secondary-ui')
export class GrowspaceHeaderSecondaryUI extends LitElement {
  @property({ attribute: false }) public chips: HeaderChip[] = [];
  @property({ attribute: false }) public inventory: NutrientInventory | null = null;
  @property({ type: Boolean }) public compact = false;
  @property({ type: Boolean }) public isMobile = false;
  @property({ type: Boolean }) public mobileLink = false;

  private get _chipDraggable(): string {
    if (this.isMobile) {
      return this.mobileLink.toString();
    }
    return 'true';
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    this.dispatchEvent(
      new CustomEvent('chip-drag-start', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    this.dispatchEvent(
      new CustomEvent('chip-drop', { detail: { targetMetric }, bubbles: true, composed: true })
    );
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(
      new CustomEvent('toggle-graph', { detail: { metric }, bubbles: true, composed: true })
    );
  }

  private _unlinkGraphs(groupIndex: number) {
    this.dispatchEvent(
      new CustomEvent('unlink-graphs', { detail: { groupIndex }, bubbles: true, composed: true })
    );
  }

  private _openNutrientsDialog() {
    this.dispatchEvent(new CustomEvent('open-nutrients', { bubbles: true, composed: true }));
  }

  static styles = css`
    :host {
      display: block;
      min-width: 0;
      width: 100%;
      height: 60px; /* consistent height */
    }

    .secondary-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 4px;
    }

    .secondary-strip > growspace-chip:first-child {
      margin-left: auto;
    }
  `;

  render() {
    return html`
      <scroll-container .scrollAmount=${150}>
        <div class="secondary-strip">
          ${this.chips.map(
            (chip) => html`
              <growspace-chip
                .icon=${chip.icon}
                .label=${chip.label}
                .value=${chip.value}
                .status=${chip.status}
                .active=${chip.active}
                .linked=${chip.linked}
                .tooltip=${chip.tooltip}
                draggable="${this._chipDraggable}"
                @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, chip.key)}
                @dragover=${(e: DragEvent) => e.preventDefault()}
                @drop=${(e: DragEvent) => this._handleChipDrop(e, chip.key)}
                @click=${() => this._toggleEnvGraph(chip.key)}
                @unlink=${() => this._unlinkGraphs(chip.groupIndex)}
              ></growspace-chip>
            `
          )}
          ${this.inventory?.stocks
            ? Object.values(this.inventory.stocks).map(
                (stock) => html`
                  <nutrient-stock-chip
                    .stock=${stock}
                    .compact=${this.compact}
                    @click=${() => this._openNutrientsDialog()}
                    style="cursor: pointer;"
                  ></nutrient-stock-chip>
                `
              )
            : ''}
        </div>
      </scroll-container>
    `;
  }
}
