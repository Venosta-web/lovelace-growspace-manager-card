import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { mdiChevronUp } from '@mdi/js';
import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../../types';
import { storeContext } from '../../context';
import type { GrowspaceStore } from '../../store/growspace-store';
import '../growspace-header';
import '../growspace-analytics';
import '../growspace-grid';
import '../manager/edit-mode-banner';
import '../transplant-source-panel';
import { growspaceCardStyles } from '../../styles/growspace-card.styles';
import { sharedStyles } from '../../styles/shared.styles';
import { uiStyles } from '../../styles/ui.styles';
import { variables } from '../../styles/variables';

@customElement('growspace-view-standard')
export class GrowspaceViewStandard extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  store!: GrowspaceStore;

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

  private _isTransplantModeController!: StoreController<boolean>;
  private _devicesController!: StoreController<GrowspaceDevice[]>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._isTransplantModeController = new StoreController(this, this.store.ui.$isTransplantMode);
      this._devicesController = new StoreController(this, this.store.data.$devices);
    }
  }

  private _getPlantsByStage(stage: string): (PlantEntity & { _growspaceName?: string })[] {
    const devices = this._devicesController?.value || [];
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

      this.store.ui.showToast('Plant transplanted successfully', 'success');

      // Refresh data after a small delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.store.refreshData();
    } catch (error) {
      console.error('[GrowspaceViewStandard] Transplant failed:', error);
      this.store.ui.showToast('Failed to transplant plant', 'error');
    }
  }

  public focusPlant(index: number) {
    const grid = this.shadowRoot?.querySelector('growspace-grid');
    if (grid) {
      (grid as any).focusPlant(index);
    }
  }

  static styles = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected render(): TemplateResult {
    if (!this.device) return html``;

    return html`
      <growspace-header
        .device=${this.device}
        .growspaceOptions=${this.growspaceOptions}
        @growspace-changed=${(e: CustomEvent) => this._redispatch(e, 'growspace-changed')}
      ></growspace-header>

      <growspace-analytics .device=${this.device}></growspace-analytics>

      ${this.isEditMode
        ? html`
            <growspace-edit-mode-banner
              .selectedCount=${this.selectedCount}
              @batch-add-plants=${(e: CustomEvent) => this._redispatch(e, 'batch-add-plants')}
            ></growspace-edit-mode-banner>
          `
        : ''}
      ${this._isTransplantModeController?.value
        ? html`
            <transplant-source-panel
              .clonePlants=${this._getPlantsByStage('clone')}
              .seedlingPlants=${this._getPlantsByStage('seedling')}
            ></transplant-source-panel>
          `
        : ''}

      <growspace-grid
        .plants=${this.grid}
        .rows=${this.rows}
        .cols=${this.cols}
        @transplant-drop=${(e: CustomEvent) => this._handleTransplantDrop(e)}
      ></growspace-grid>

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
}
