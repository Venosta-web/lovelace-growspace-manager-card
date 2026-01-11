import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../types';
import { ViewMode } from '../constants';

// Import Views
import './views/growspace-view-compact';
import './views/growspace-view-header';
import './views/growspace-view-standard';

@customElement('growspace-view-switcher')
export class GrowspaceViewSwitcher extends LitElement {
    @property({ type: String }) accessor viewMode: string = ViewMode.STANDARD;
    @property({ attribute: false }) accessor device: GrowspaceDevice | undefined;
    @property({ attribute: false }) accessor growspaceOptions: Record<string, string> = {};
    @property({ attribute: false }) accessor grid: (PlantEntity | null)[][] = [];
    @property({ type: Number }) accessor rows = 0;

    // View specific props
    @property({ type: Boolean }) accessor isLoading = false;
    @property({ type: Boolean }) accessor isEditMode = false;
    @property({ type: Boolean }) accessor isCompact = false;
    @property({ type: Number }) accessor selectedCount = 0;
    @property({ attribute: false }) accessor config: GrowspaceManagerCardConfig | undefined;

    @property({ type: Number }) accessor focusedPlantIndex = -1;

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
            (activeView as any).focusPlant(index);
        }
    }

    protected render(): TemplateResult {
        if (!this.device) return html``;

        if (this.viewMode === ViewMode.COMPACT) {
            return html`
        <growspace-view-compact
            .grid=${this.grid}
            .rows=${this.rows}
            .cols=${this.device.plants_per_row}
            .isLoading=${this.isLoading}
        ></growspace-view-compact>
      `;
        }

        if (this.viewMode === ViewMode.HEADER) {
            return html`
        <growspace-view-header
            .device=${this.device}
            .growspaceOptions=${this.growspaceOptions}
        ></growspace-view-header>
      `;
        }

        // Standard Mode
        return html`
      <growspace-view-standard
        .device=${this.device}
        .growspaceOptions=${this.growspaceOptions}
        .grid=${this.grid}
        .rows=${this.rows}
        .cols=${this.device.plants_per_row}
        .isEditMode=${this.isEditMode}
        .isCompact=${this.isCompact}
        .selectedCount=${this.selectedCount}
        .config=${this.config}
        .isLoading=${this.isLoading}
        @batch-add-plants=${(e: CustomEvent) => this.dispatchEvent(new CustomEvent('batch-add-plants', { detail: e.detail, bubbles: true, composed: true }))}
      ></growspace-view-standard>
    `;
    }
}
