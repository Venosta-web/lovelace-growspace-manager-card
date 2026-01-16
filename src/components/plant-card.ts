import { LitElement, html, css, TemplateResult, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { StoreController } from '@nanostores/lit';
import { strainLibraryContext, storeContext } from '../context';
import { calculateGrowthDeviation } from '../utils/analytics-utils';
import {
  mdiCheckboxMarked,
  mdiCheckboxBlankOutline,
  mdiBottleTonicPlus,
  mdiWater,
  mdiContentCut,
  mdiAlertCircle,
  mdiStar,
  mdiTrendingUp,
  mdiTrendingDown,
  mdiMinus,
  mdiBug,
} from '@mdi/js';
import { PlantEntity, StrainEntry, PlantDisplayData, StageDisplay } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { DragDropController, DragDropHost } from '../controllers/drag-drop-controller';
// Global imports removed
import type { GrowspaceStore } from '../store/growspace-store';
import './plant/plant-stats';
import { plantCardStyles } from '../styles/plant-card.styles';
import { sharedStyles } from '../styles/shared.styles';

@customElement('growspace-plant-card')
export class GrowspacePlantCard extends LitElement implements DragDropHost {
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ type: Number }) row!: number;
  @property({ type: Number }) col!: number;
  @property({ type: Boolean }) forceDraggable = false; // Allow drag even in edit mode

  @consume({ context: strainLibraryContext, subscribe: true })
  strainLibrary: StrainEntry[] = [];

  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  // UI state via StoreController - direct subscription to atoms
  private _isEditModeController!: StoreController<boolean>;
  private _selectedPlantsController!: StoreController<Set<string>>;

  connectedCallback() {
    super.connectedCallback();
    if (!this._isEditModeController && this.store) {
      this._isEditModeController = new StoreController(this, this.store.ui.$isEditMode);
      this._selectedPlantsController = new StoreController(this, this.store.ui.$selectedPlants);
    }
  }

  // Getters to satisfy DragDropHost interface
  get isEditMode(): boolean {
    return this._isEditModeController?.value ?? false;
  }

  get selected(): boolean {
    const plantId = this.plant?.attributes?.plant_id;
    return (plantId && this._selectedPlantsController?.value?.has(plantId)) || false;
  }

  // Instantiate controller
  private dragController = new DragDropController(this);

  get growthDeviation(): number {
    const strain = this.strainLibrary.find((s) => s.strain === this.plant.attributes.strain);
    return calculateGrowthDeviation(this.plant, strain);
  }

  // Computed display data
  get displayData(): PlantDisplayData | null {
    if (!this.plant) return null;
    return PlantUtils.getPlantDisplayData(this.plant, this.strainLibrary);
  }

  get _hasRecommendedPreset(): boolean {
    if (!this.plant || !this.store) return false;
    const growspaceId = this.plant.attributes.growspace_id;
    const device = this.store.data.$devices.get().find(d => d.device_id === growspaceId);
    if (!device) return false;

    const nutrientPresets = this.store.data.$nutrientPresets.get();
    const currentStage = this.plant.attributes.stage;
    const daysInStage = (this.plant.attributes as any).days_in_stage || 0;

    return Object.values(nutrientPresets).some(p =>
      p.stage === currentStage && (!p.min_days_in_stage || daysInStage >= p.min_days_in_stage)
    );
  }

  // Placeholder for watering status, assuming it will be implemented elsewhere
  get _isRecentlyWatered(): boolean {
    // Example logic: check if last watered within the last 24 hours
    const lastWatered = this.plant.attributes.last_watered;
    if (!lastWatered) return false;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return new Date(lastWatered) > twentyFourHoursAgo;
  }


  static styles = [
    sharedStyles,
    plantCardStyles
  ];

  // --- Click Handlers ---

  public focus(options?: FocusOptions) {
    const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    if (card) {
      card.focus(options);
    } else {
      super.focus(options);
    }
  }

  private _handleClick() {
    this.dispatchEvent(
      new CustomEvent('plant-click', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** Trigger HA haptic feedback for tactile mobile interactions */
  private _triggerHaptic(type: 'success' | 'warning' | 'failure' | 'light' | 'medium' | 'heavy' | 'selection' = 'light') {
    this.dispatchEvent(
      new CustomEvent('haptic', {
        detail: type,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleSelection(e: Event) {
    e.stopPropagation();
    this._triggerHaptic('selection');
    this.dispatchEvent(
      new CustomEvent('plant-toggle-selection', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      this._handleClick();
    }
  }

  render() {
    const data = this.displayData;
    if (!this.plant || !data) return html``;

    const { stageColor, strainName, pheno, imageUrl, imageCropMeta, stages } = data;

    // Construct srcset for responsive images
    // If we have a WebP image, we assume a _small variant exists (generated by backend)
    let srcset = '';
    if (imageUrl && imageUrl.endsWith('.webp')) {
      const smallUrl = imageUrl.replace('.webp', '_small.webp');
      // Tell browser: use smallUrl if width <= 320px, otherwise imageUrl
      srcset = `${smallUrl} 320w, ${imageUrl} 1024w`;
    }

    return html`
      <div
        class="plant-card-rich"
        style=${styleMap({ '--stage-color': stageColor })}
        draggable="true"
        tabindex="0"
        role="button"
        aria-label="${strainName} in ${this.plant.state || 'unknown'} stage"
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}
      >
      ${imageUrl
        ? html`
              <img
                class="plant-card-bg"
                src="${imageUrl}"
                srcset="${srcset}"
                sizes="(max-width: 600px) 320px, 1024px"
                loading="lazy"
                decoding="async"
                alt="${strainName}"
                style="${PlantUtils.getImgStyle(imageCropMeta)}"
              />
              <div class="plant-card-overlay"></div>
            `
        : nothing
      }
        ${this.isEditMode
        ? html`
              <div
                class=${classMap({ 'plant-card-checkbox': true, 'selected': this.selected })}
                role="checkbox"
                aria-checked=${this.selected ? 'true' : 'false'}
                tabindex="0"
                aria-label="Select ${strainName}"
                @click=${this._toggleSelection}
                @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              this._toggleSelection(e);
            }
          }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style=${styleMap({
            width: '24px',
            height: '24px',
            fill: this.selected ? 'var(--primary-color)' : 'rgba(255,255,255,0.7)'
          })}
                >
                  <path d="${this.selected ? mdiCheckboxMarked : mdiCheckboxBlankOutline}"></path>
                </svg>
              </div>
            `
        : nothing
      }
    <div class="status-icons" >
      ${this.plant.attributes.last_training_technique ? html`
              <div class="status-icon training" role="img" aria-label="Last trained with: ${this.plant.attributes.last_training_technique}" title="Last trained with: ${this.plant.attributes.last_training_technique}">
                <ha-svg-icon .path=${mdiContentCut}></ha-svg-icon>
              </div>
            ` : nothing
      }

            ${this.plant.attributes.last_ipm ? html`
              <div class="status-icon ipm" role="img" aria-label="Last IPM: ${this.plant.attributes.last_ipm_type || 'Unknown'}" title="Last IPM: ${this.plant.attributes.last_ipm_type || 'Unknown'}">
                <ha-svg-icon .path=${mdiBug}></ha-svg-icon>
              </div>
            ` : nothing
      }

            ${this._isRecentlyWatered ? html`
              <div class="status-icon watering" role="img" aria-label="Recently watered" title="Recently watered">
                <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
              </div>
            ` : nothing
      }

            ${this.plant.attributes.problem ? html`
              <div class="status-icon problem" role="img" aria-label="Problem detected: ${this.plant.attributes.problem}" title="Problem detected: ${this.plant.attributes.problem}">
                <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
              </div>
            ` : nothing
      }

            ${this.growthDeviation !== 0 ? html`
                <div
                    class="status-icon deviation ${this.growthDeviation > 0 ? 'ahead' : 'behind'}"
                    role="img"
                    aria-label="Growth Deviation: ${Math.round(this.growthDeviation)}%"
                    title="Growth Deviation: ${Math.round(this.growthDeviation)}%"
                    style="background: ${this.growthDeviation > 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}; border: 1px solid ${this.growthDeviation > 0 ? '#4caf50' : '#f44336'};"
                >
                    <ha-svg-icon .path=${this.growthDeviation > 0 ? mdiTrendingUp : mdiTrendingDown} style="color: ${this.growthDeviation > 0 ? '#4caf50' : '#f44336'}"></ha-svg-icon>
                </div>
            ` : nothing
      }
    </div>
      <div class="plant-card-content">
        <div class="pc-info">
          <div class="pc-strain-name" title="${strainName}">${strainName}</div>
            ${pheno ? html`<div class="pc-pheno">${pheno}</div>` : nothing}
            <div style="display: flex; align-items: center; gap: 8px;">
               <div class="pc-stage">${this.plant.state || 'Unknown'}</div>
               ${this._hasRecommendedPreset ? html`
                 <ha-svg-icon
                    .path=${mdiStar}
                    style="--mdc-icon-size: 14px; color: var(--primary-color);" 
                    title="Nutrient Preset Recommended"
                 ></ha-svg-icon>
               ` : nothing}
            </div>
          </div>

          <growspace-plant-stats .stages=${stages}></growspace-plant-stats>
        </div>
      </div>
    `;
  }
}
