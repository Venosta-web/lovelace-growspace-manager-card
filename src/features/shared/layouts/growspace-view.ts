/**
 * <growspace-view> — unified layout component driven by LayoutSpec.
 *
 * Replaces the per-mode layout files (growspace-view-standard, -compact,
 * -header, -heatmap) with a single component that reads a ViewMode → LayoutSpec
 * configuration map and renders only the slots declared in the spec.
 *
 * Slot responsibilities:
 *   header — growspace-header (selector, title, phase info)
 *   chart  — growspace-analytics (standard) or heatmap-3d (heatmap mode)
 *   grid   — growspace-grid-container (plant placement grid)
 *
 * The active LayoutSpec is derived automatically from the global `viewMode$`
 * atom via the `layoutSpec$` computed atom — no manual wiring required.
 */

import { LitElement, html, TemplateResult, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { mdiChevronUp, mdiChevronDown, mdiFullscreenExit } from '@mdi/js';

import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../../../types';
import { ViewMode } from '../../../constants';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { layoutSpec$ } from '../../../slices/ui/layout-spec';
import { gridInteraction$ } from '../../../slices/grid-interaction';

// Side-effect imports register child custom elements
import '../../ui/containers/growspace-header.container';
import '../../ui/containers/growspace-analytics.container';
import '../../ui/components/growspace-edit-mode-banner-ui';
import '../../plants/components/transplant-source-panel';
import '../../plants/containers/growspace-grid.container';
import '../../environment/components/heatmap-3d';
import '../ui/error-boundary';

import { growspaceCardStyles } from '../../../styles/growspace-card.styles';
import { sharedStyles } from '../../../styles/shared.styles';
import { uiStyles } from '../../../styles/ui.styles';
import { variables } from '../../../styles/variables';

@customElement('growspace-view')
export class GrowspaceView extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  store!: GrowspaceStore;

  // ── Props forwarded from the switcher / card ──────────────────────────────

  @property({ type: String }) viewMode: string = ViewMode.STANDARD;
  @property({ attribute: false }) hass: unknown;
  @property({ attribute: false }) device: GrowspaceDevice | undefined;
  @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) grid: (PlantEntity | null)[][] = [];
  @property({ type: Number }) rows = 0;
  @property({ type: Number }) cols = 0;
  @property({ type: Boolean }) isLoading = false;
  @property({ type: Boolean }) isEditMode = false;
  @property({ type: Boolean }) isCompact = false;
  @property({ type: Number }) selectedCount = 0;
  @property({ attribute: false }) config: GrowspaceManagerCardConfig | undefined;
  @property({ type: Boolean }) editMode3DCords = false;

  // ── Internal store subscriptions ──────────────────────────────────────────

  private _specController = new StoreController(this, layoutSpec$);
  private _gridInteractionController!: StoreController<
    typeof gridInteraction$ extends import('nanostores').ReadableAtom<infer T> ? T : never
  >;

  private _viewStandardController!: StoreController<{ devices: GrowspaceDevice[] }>;

  private _initControllers() {
    if (this.store) {
      if (!this._viewStandardController) {
        this._viewStandardController = new StoreController(this, this.store.$viewStandardState);
      }
    }
    if (!this._gridInteractionController) {
      this._gridInteractionController = new StoreController(this, gridInteraction$);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._initControllers();
  }

  willUpdate(changedProps: PropertyValues) {
    if (changedProps.has('store')) {
      this._initControllers();
    }
  }

  // ── Public API (mirrors the individual view components) ───────────────────

  public focusPlant(index: number) {
    const grid = this.shadowRoot?.querySelector('growspace-grid-container');
    if (grid) {
      (grid as unknown as { focusPlant: (index: number) => void }).focusPlant(index);
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  static styles = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  // ── Render ────────────────────────────────────────────────────────────────

  protected render(): TemplateResult {
    const spec = this._specController.value;

    return html`
      ${spec?.slots.includes('header') ? this._renderHeader() : ''}
      ${spec?.slots.includes('chart') ? this._renderChart() : ''}
      ${spec?.slots.includes('grid') ? this._renderGrid() : ''}
    `;
  }

  // ── Slot renderers ────────────────────────────────────────────────────────

  private _renderHeader(): TemplateResult {
    const spec = this._specController.value;
    if (spec?.viewVariant === ViewMode.HEADER) {
      return html`
        <div class="view-mode-container header">
          <growspace-header
            .device=${this.device}
            @growspace-changed=${(e: CustomEvent) => this._redispatch(e, 'growspace-changed')}
          ></growspace-header>
          <button class="expand-handle" @click=${this._dispatchToggle}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiChevronDown}"></path>
            </svg>
          </button>
        </div>
      `;
    }

    return html`
      <growspace-header
        .device=${this.device}
        @growspace-changed=${(e: CustomEvent) => this._redispatch(e, 'growspace-changed')}
      ></growspace-header>
    `;
  }

  private _renderChart(): TemplateResult {
    const spec = this._specController.value;
    if (spec?.chartType === 'heatmap') {
      return html`
        <heatmap-3d
          .device=${this.device}
          .hass=${this.hass}
          .editMode3DCords=${this.editMode3DCords}
          .keyboardRotateEnabled=${this.growspaceOptions?.keyboard_rotate_enabled ?? false}
          .keyboardRotateSpeed=${this.growspaceOptions?.keyboard_rotate_speed ?? 1.0}
          @edit-mode-changed=${(e: CustomEvent) => {
            this.editMode3DCords = e.detail.enabled;
          }}
          @sensor-position-changed=${(e: CustomEvent) =>
            this._redispatch(e, 'sensor-position-changed')}
        ></heatmap-3d>
      `;
    }

    return html`<growspace-analytics .device=${this.device}></growspace-analytics>`;
  }

  private _renderGrid(): TemplateResult {
    if (this._specController.value?.viewVariant === ViewMode.COMPACT) {
      return html`
        <div class="compact-controls">
          <button
            class="compact-exit-fab"
            @click=${() => this._dispatchModeChange('standard')}
            title="Exit Compact Mode"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiFullscreenExit}"></path>
            </svg>
          </button>
        </div>
        <div class="view-mode-container compact">
          <growspace-grid-container
            .plants=${this.grid}
            .rows=${this.rows}
            .cols=${this.cols}
          ></growspace-grid-container>
        </div>
      `;
    }

    return html`
      ${this.isEditMode
        ? html`
            <growspace-edit-mode-banner
              .selectedCount=${this.selectedCount}
              @batch-add-plants=${(e: CustomEvent) => this._redispatch(e, 'batch-add-plants')}
            ></growspace-edit-mode-banner>
          `
        : ''}
      ${this._gridInteractionController?.value?.status === 'transplanting'
        ? html`
            <transplant-source-panel
              .clonePlants=${this._getPlantsByStage('clone')}
              .seedlingPlants=${this._getPlantsByStage('seedling')}
            ></transplant-source-panel>
          `
        : ''}
      <growspace-grid-container
        .plants=${this.grid}
        .rows=${this.rows}
        .cols=${this.cols}
        @transplant-drop=${(e: CustomEvent) => this._handleTransplantDrop(e)}
      ></growspace-grid-container>
      ${this.config?.initial_view_mode === 'header'
        ? html`
            <button
              class="collapse-handle"
              @click=${this._dispatchToggle}
              aria-label="Toggle view expansion"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiChevronUp}"></path>
              </svg>
            </button>
          `
        : ''}
    `;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _getPlantsByStage(stage: string): (PlantEntity & { _growspaceName?: string })[] {
    const devices = this._viewStandardController?.value?.devices || [];
    return devices
      .flatMap((d) =>
        (d.plants || []).map((p) => ({
          ...p,
          _growspaceName: d.name,
        }))
      )
      .filter((p) => p.attributes.stage === stage);
  }

  private async _handleTransplantDrop(e: CustomEvent) {
    const detail = e.detail;
    try {
      const today = new Date().toISOString().split('T')[0];
      const targetGrowspaceId = this.device?.deviceId;
      if (!targetGrowspaceId) return;
      await this.store.hass.callService('growspace_manager', 'update_plant', {
        plant_id: detail.plant_id,
        growspace_id: targetGrowspaceId,
        row: detail.target_row,
        col: detail.target_col,
        veg_start: today,
      });
      this.store.actions.ui.toast('Plant transplanted successfully', 'success');
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.store.refreshData();
    } catch (error) {
      console.error('[GrowspaceView] Transplant failed:', error);
      this.store.actions.ui.toast('Failed to transplant plant', 'error');
    }
  }

  private _redispatch(e: CustomEvent, type: string) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: e.detail || (e.target as HTMLSelectElement).value,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _dispatchToggle() {
    this.dispatchEvent(new CustomEvent('toggle-expansion', { bubbles: true, composed: true }));
  }

  private _dispatchModeChange(mode: string) {
    this.dispatchEvent(
      new CustomEvent('view-mode-changed', {
        detail: { mode },
        bubbles: true,
        composed: true,
      })
    );
  }
}
