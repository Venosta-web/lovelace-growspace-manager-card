import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../types';
import { ViewMode } from '../constants';

// Import Views
import './views/growspace-view-compact';
import './views/growspace-view-header';
import './views/growspace-view-standard';
import './views/growspace-view-heatmap';
import './error-boundary';

@customElement('growspace-view-switcher')
export class GrowspaceViewSwitcher extends LitElement {
  @property({ type: String }) viewMode: string = ViewMode.STANDARD;
  @property({ attribute: false }) hass: any;
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) grid: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows = 0;

  // View specific props
  @property({ type: Boolean }) isLoading = false;
  @property({ type: Boolean }) isEditMode = false;
  @property({ type: Boolean }) isCompact = false;
  @property({ type: Number }) selectedCount = 0;
  @property({ attribute: false }) config: GrowspaceManagerCardConfig | undefined;

  @property({ type: Number }) focusedPlantIndex = -1;

  protected updated(changedProps: Map<string | number | symbol, unknown>): void {
    super.updated(changedProps);
    if (changedProps.has('focusedPlantIndex') && this.focusedPlantIndex >= 0) {
      this.focusPlant(this.focusedPlantIndex);
    }
  }

  public focusPlant(index: number) {
    const activeView = this.shadowRoot?.querySelector(
      'growspace-view-standard, growspace-view-compact'
    );

    if (activeView && 'focusPlant' in activeView) {
      (activeView as { focusPlant: (index: number) => void }).focusPlant(index);
    }
  }

  protected render(): TemplateResult {
    if (!this.device) return html``;

    if (this.viewMode === ViewMode.COMPACT) {
      return html`
        <error-boundary heading="Detailed View Error">
          <growspace-view-compact
            .grid=${this.grid}
            .rows=${this.rows}
            .cols=${this.device.plantsPerRow}
            .isLoading=${this.isLoading}
          ></growspace-view-compact>
        </error-boundary>
      `;
    }

    if (this.viewMode === ViewMode.HEADER) {
      return html`
        <error-boundary heading="Header View Error">
          <growspace-view-header
            .device=${this.device}
            .growspaceOptions=${this.growspaceOptions}
          ></growspace-view-header>
        </error-boundary>
      `;
    }

    if (this.viewMode === ViewMode.HEATMAP) {
      return html`
        <error-boundary heading="Heatmap View Error">
          <growspace-view-heatmap
            .device=${this.device}
            .hass=${this.hass}
            .growspaceOptions=${this.growspaceOptions}
          ></growspace-view-heatmap>
        </error-boundary>
      `;
    }

    // Standard Mode
    return html`
      <error-boundary heading="Dashboard View Error">
        <growspace-view-standard
          .device=${this.device}
          .growspaceOptions=${this.growspaceOptions}
          .grid=${this.grid}
          .rows=${this.rows}
          .cols=${this.device.plantsPerRow}
          .isEditMode=${this.isEditMode}
          .isCompact=${this.isCompact}
          .selectedCount=${this.selectedCount}
          .config=${this.config}
          .isLoading=${this.isLoading}
          @batch-add-plants=${(e: CustomEvent) =>
        this.dispatchEvent(
          new CustomEvent('batch-add-plants', {
            detail: e.detail,
            bubbles: true,
            composed: true,
          })
        )}
        ></growspace-view-standard>
      </error-boundary>
    `;
  }
}
