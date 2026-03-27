/**
 * Plant Card UI - Pure Presentational Component
 *
 * Receives all data via props, emits events for user interactions.
 * No store access, no business logic, no subscriptions.
 */

import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  mdiCheckboxMarked,
  mdiCheckboxBlankOutline,
  mdiWater,
  mdiContentCut,
  mdiAlertCircle,
  mdiStar,
  mdiTrendingUp,
  mdiTrendingDown,
  mdiBug,
} from '@mdi/js';
import type { PlantDisplayData, PlantEntity } from '../../../types';
import type { PlantStatusIndicators } from '../viewmodels/plant-card.viewmodel';
import { PlantUtils } from '../../../utils/plant-utils';
import { plantCardStyles } from '../../../styles/plant-card.styles';
import { sharedStyles } from '../../../styles/shared.styles';
import '../../../components/plant/plant-stats';

/**
 * Pure presentational plant card component
 */
@customElement('plant-card-ui')
export class PlantCardUI extends LitElement {
  // Data props
  @property({ attribute: false }) plant!: PlantEntity;
  @property({ attribute: false }) displayData!: PlantDisplayData;
  @property({ attribute: false }) statusIndicators!: PlantStatusIndicators;

  // State props
  @property({ type: Boolean }) isSelected = false;
  @property({ type: Boolean }) isEditMode = false;
  @property({ type: Boolean }) isDraggable = false;
  @property({ type: Number }) growthDeviation = 0;

  // Accessibility props
  @property() ariaLabel = '';
  @property() checkboxAriaLabel = '';

  static styles = [sharedStyles, plantCardStyles];

  /**
   * Focus the card element
   */
  public focus(options?: FocusOptions): void {
    const card = this.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    if (card) {
      card.focus(options);
    } else {
      super.focus(options);
    }
  }

  render(): TemplateResult {
    if (!this.plant || !this.displayData) {
      return html``;
    }

    const { stageColor, strainName, pheno, imageUrl, imageCropMeta, stages } = this.displayData;

    // Construct srcset for responsive images
    let srcset = '';
    if (imageUrl && imageUrl.endsWith('.webp')) {
      const smallUrl = imageUrl.replace('.webp', '_small.webp');
      srcset = `${smallUrl} 320w, ${imageUrl} 1024w`;
    }

    return html`
      <div
        class="plant-card-rich"
        style=${styleMap({ '--stage-color': stageColor })}
        draggable="${this.isDraggable}"
        tabindex="0"
        role="button"
        aria-label="${this.ariaLabel}"
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}
      >
        ${this._renderBackground(imageUrl, srcset, strainName, imageCropMeta)}
        ${this._renderCheckbox()}
        ${this._renderStatusIcons()}
        ${this._renderContent(strainName, pheno, stages)}
      </div>
    `;
  }

  private _renderBackground(
    imageUrl: string | undefined,
    srcset: string,
    strainName: string,
    imageCropMeta: any
  ): TemplateResult | typeof nothing {
    if (!imageUrl) {
      return nothing;
    }

    return html`
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
    `;
  }

  private _renderCheckbox(): TemplateResult | typeof nothing {
    if (!this.isEditMode) {
      return nothing;
    }

    return html`
      <div
        class=${classMap({ 'plant-card-checkbox': true, selected: this.isSelected })}
        role="checkbox"
        aria-checked=${this.isSelected ? 'true' : 'false'}
        tabindex="0"
        aria-label="${this.checkboxAriaLabel}"
        @click=${this._handleToggleSelection}
        @keydown=${this._handleCheckboxKeyDown}
      >
        <svg
          viewBox="0 0 24 24"
          style=${styleMap({
            width: '24px',
            height: '24px',
            fill: this.isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.7)',
          })}
        >
          <path d="${this.isSelected ? mdiCheckboxMarked : mdiCheckboxBlankOutline}"></path>
        </svg>
      </div>
    `;
  }

  private _renderStatusIcons(): TemplateResult {
    return html`
      <div class="status-icons">
        ${this._renderTrainingIcon()}
        ${this._renderIPMIcon()}
        ${this._renderWateringIcon()}
        ${this._renderProblemIcon()}
        ${this._renderGrowthDeviationIcon()}
      </div>
    `;
  }

  private _renderTrainingIcon(): TemplateResult | typeof nothing {
    if (!this.statusIndicators.hasTraining) {
      return nothing;
    }

    return html`
      <div
        class="status-icon training"
        role="img"
        aria-label="Last trained with: ${this.plant.attributes.last_training_technique}"
        title="Last trained with: ${this.plant.attributes.last_training_technique}"
      >
        <ha-svg-icon .path=${mdiContentCut}></ha-svg-icon>
      </div>
    `;
  }

  private _renderIPMIcon(): TemplateResult | typeof nothing {
    if (!this.statusIndicators.hasIPM) {
      return nothing;
    }

    return html`
      <div
        class="status-icon ipm"
        role="img"
        aria-label="Last IPM: ${this.plant.attributes.last_ipm_type || 'Unknown'}"
        title="Last IPM: ${this.plant.attributes.last_ipm_type || 'Unknown'}"
      >
        <ha-svg-icon .path=${mdiBug}></ha-svg-icon>
      </div>
    `;
  }

  private _renderWateringIcon(): TemplateResult | typeof nothing {
    if (!this.statusIndicators.isRecentlyWatered) {
      return nothing;
    }

    return html`
      <div class="status-icon watering" role="img" aria-label="Recently watered" title="Recently watered">
        <ha-svg-icon .path=${mdiWater}></ha-svg-icon>
      </div>
    `;
  }

  private _renderProblemIcon(): TemplateResult | typeof nothing {
    if (!this.statusIndicators.hasProblem) {
      return nothing;
    }

    return html`
      <div
        class="status-icon problem"
        role="img"
        aria-label="Problem detected: ${this.plant.attributes.problem}"
        title="Problem detected: ${this.plant.attributes.problem}"
      >
        <ha-svg-icon .path=${mdiAlertCircle}></ha-svg-icon>
      </div>
    `;
  }

  private _renderGrowthDeviationIcon(): TemplateResult | typeof nothing {
    if (!this.statusIndicators.hasGrowthDeviation) {
      return nothing;
    }

    const isAhead = this.growthDeviation > 0;
    const color = isAhead ? '#4caf50' : '#f44336';
    const bgColor = isAhead ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';

    return html`
      <div
        class="status-icon deviation ${isAhead ? 'ahead' : 'behind'}"
        role="img"
        aria-label="Growth Deviation: ${Math.round(this.growthDeviation)}%"
        title="Growth Deviation: ${Math.round(this.growthDeviation)}%"
        style="background: ${bgColor}; border: 1px solid ${color};"
      >
        <ha-svg-icon
          .path=${isAhead ? mdiTrendingUp : mdiTrendingDown}
          style="color: ${color}"
        ></ha-svg-icon>
      </div>
    `;
  }

  private _renderContent(
    strainName: string,
    pheno: string | undefined,
    stages: any
  ): TemplateResult {
    return html`
      <div class="plant-card-content">
        <div class="pc-info">
          <div class="pc-strain-name" title="${strainName}">${strainName}</div>
          ${pheno ? html`<div class="pc-pheno">${pheno}</div>` : nothing}
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="pc-stage">${this.plant.state || 'Unknown'}</div>
            ${this.statusIndicators.hasRecommendedPreset
              ? html`
                  <ha-svg-icon
                    .path=${mdiStar}
                    style="--mdc-icon-size: 14px; color: var(--primary-color);"
                    title="Nutrient Preset Recommended"
                  ></ha-svg-icon>
                `
              : nothing}
          </div>
        </div>

        <growspace-plant-stats .stages=${stages}></growspace-plant-stats>
      </div>
    `;
  }

  // Event handlers - just emit custom events

  private _handleClick(): void {
    this.dispatchEvent(
      new CustomEvent('plant-click', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );

    // Trigger haptic feedback
    this.dispatchEvent(
      new CustomEvent('haptic', {
        detail: 'light',
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleToggleSelection(e: Event): void {
    e.stopPropagation();

    this.dispatchEvent(
      new CustomEvent('plant-toggle-selection', {
        detail: { plant: this.plant },
        bubbles: true,
        composed: true,
      })
    );

    // Trigger haptic feedback
    this.dispatchEvent(
      new CustomEvent('haptic', {
        detail: 'selection',
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleClick();
    }
  }

  private _handleCheckboxKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleToggleSelection(e);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-card-ui': PlantCardUI;
  }
}
