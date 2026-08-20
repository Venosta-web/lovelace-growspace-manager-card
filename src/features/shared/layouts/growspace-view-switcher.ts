import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../../../types';
import { ViewMode } from '../../../constants';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { CardTaskState } from '../../tasks/task-state';

// Register the unified view component
import './growspace-view';
import '../ui/error-boundary';

/**
 * Thin adapter that bridges the card's property API to the declarative
 * <growspace-view> component.  It:
 *   • keeps the same @property surface so parent cards need no changes
 *   • forwards the active viewMode to this card's own store so <growspace-view>
 *     can derive its LayoutSpec reactively (per-instance, not page-global)
 *   • proxies focusPlant() calls down to the active grid
 */
@customElement('growspace-view-switcher')
export class GrowspaceViewSwitcher extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  store!: GrowspaceStore;

  @property({ type: String }) viewMode: string = ViewMode.STANDARD;
  @property({ attribute: false }) hass: unknown;
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) grid: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows = 0;

  // View specific props
  @property({ type: Boolean }) isLoading = false;
  @property({ type: Boolean }) isEditMode = false;
  @property({ type: Boolean }) isCompact = false;
  @property({ type: Number }) selectedCount = 0;
  @property({ attribute: false }) taskState: CardTaskState = { kind: 'idle' };
  @property({ attribute: false }) config: GrowspaceManagerCardConfig | undefined;

  @property({ type: Number }) focusedPlantIndex = -1;

  protected updated(changedProps: Map<string | number | symbol, unknown>): void {
    super.updated(changedProps);

    // Keep this card's own view-mode atom in sync when the property changes.
    if (changedProps.has('viewMode')) {
      this.store?.ui.setViewMode(this.viewMode as import('../../../types').GrowspaceViewMode);
    }

    if (changedProps.has('focusedPlantIndex') && this.focusedPlantIndex >= 0) {
      this.focusPlant(this.focusedPlantIndex);
    }
  }

  public focusPlant(index: number) {
    const activeView = this.shadowRoot?.querySelector('growspace-view');
    if (activeView && 'focusPlant' in activeView) {
      (activeView as { focusPlant: (index: number) => void }).focusPlant(index);
    }
  }

  protected render(): TemplateResult {
    if (!this.device) return html``;

    return html`
      <error-boundary heading="View Error">
        <growspace-view
          .viewMode=${this.viewMode}
          .hass=${this.hass}
          .device=${this.device}
          .growspaceOptions=${this.growspaceOptions}
          .grid=${this.grid}
          .rows=${this.rows}
          .cols=${this.device.plantsPerRow}
          .isLoading=${this.isLoading}
          .isEditMode=${this.isEditMode}
          .isCompact=${this.isCompact}
          .selectedCount=${this.selectedCount}
          .taskState=${this.taskState}
          .config=${this.config}
          @batch-add-plants=${(e: CustomEvent) =>
            this.dispatchEvent(
              new CustomEvent('batch-add-plants', {
                detail: e.detail,
                bubbles: true,
                composed: true,
              })
            )}
        ></growspace-view>
      </error-boundary>
    `;
  }
}
