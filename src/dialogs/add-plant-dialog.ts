import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose, mdiSprout, mdiDna, mdiContentCopy } from '@mdi/js';
import { StrainEntry, PlantEntity } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';
import '../components/ui/md3-date-input';
import '../components/ui/md3-switch';

@customElement('add-plant-dialog')
export class AddPlantDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ type: Array }) strainLibrary: StrainEntry[] = [];
  @property({ type: String }) growspaceName = '';
  @property({ type: Boolean, reflect: true }) open = false;

  // Initialize with values passed via methods or defaults
  @property({ type: String }) strain = '';
  @property({ type: String }) phenotype = '';
  @state() private addToLibrary = false;
  @property({ type: Number }) row = 0;
  @property({ type: Number }) col = 0;

  // Date fields
  @property({ type: String }) veg_start = '';
  @property({ type: String }) flower_start = '';
  @property({ type: String }) seedling_start = '';
  @property({ type: String }) mother_start = '';
  @property({ type: String }) clone_start = '';
  @property({ type: String }) dry_start = '';
  @property({ type: String }) cure_start = '';

  // Tab state for transplant functionality
  @state() private _activeTab: 'add' | 'clone' | 'seedling' = 'add';
  @state() private _selectedTransplantPlant: PlantEntity | null = null;

  // Plants available for transplant (filtered by stage)
  @property({ type: Array }) clonePlants: PlantEntity[] = [];
  @property({ type: Array }) seedlingPlants: PlantEntity[] = [];
  @property({ type: String }) targetGrowspaceId = '';

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .overview-grid {
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      @media (max-width: 450px) {
        .overview-grid {
          flex: 1;
          min-height: 0;
          padding: 16px;
        }
      }

      /* Tab bar styles */
      .tab-bar {
        display: flex;
        gap: 4px;
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 8px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.85rem;
        font-family: inherit;
      }

      .tab:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .tab.active {
        background: rgba(var(--rgb-primary-color), 0.15);
        color: var(--primary-color);
      }

      .tab svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .plant-info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 8px 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        margin-top: 12px;
      }

      .info-label {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
      }

      .info-value {
        font-weight: 500;
      }
    `,
  ];

  // Provide a method to set initial data from parent if needed
  public setInitialState(row: number, col: number, strain: string = '', phenotype: string = '') {
    this.row = row;
    this.col = col;
    this.strain = strain;
    this.phenotype = phenotype;
    // resetting dates
    this.veg_start = '';
    this.flower_start = '';
    this.seedling_start = '';
    this.mother_start = '';
    this.clone_start = '';
    this.dry_start = '';
    this.cure_start = '';
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _openStrainCreator() {
    this.dispatchEvent(
      new CustomEvent('create-new-strain', {
        bubbles: true,
        composed: true,
        detail: {
          source: 'add-plant',
          returnPayload: {
            row: this.row,
            col: this.col,
            strain: this.strain,
            phenotype: this.phenotype,
            seedling_start: this.seedling_start,
            veg_start: this.veg_start,
            flower_start: this.flower_start,
            mother_start: this.mother_start,
            clone_start: this.clone_start,
            dry_start: this.dry_start,
            cure_start: this.cure_start,
          },
        },
      })
    );
  }

  private _confirm() {
    if (this._activeTab === 'add') {
      // Original add plant logic
      const payload = {
        row: this.row + 1,
        col: this.col + 1,
        strain: this.strain,
        phenotype: this.phenotype,
        veg_start: this.veg_start,
        flower_start: this.flower_start,
        seedling_start: this.seedling_start,
        mother_start: this.mother_start,
        clone_start: this.clone_start,
        dry_start: this.dry_start,
        cure_start: this.cure_start,
        addToLibrary: this.addToLibrary,
      };

      this.dispatchEvent(
        new CustomEvent('add-plant-submit', {
          detail: payload,
          bubbles: true,
          composed: true,
        })
      );
    } else {
      // Transplant mode
      if (!this._selectedTransplantPlant) return;

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      const payload = {
        plant_id: this._selectedTransplantPlant.attributes.plant_id,
        source_growspace_id: this._selectedTransplantPlant.attributes.growspace_id,
        target_growspace_id: this.targetGrowspaceId,
        new_row: this.row + 1,
        new_col: this.col + 1,
        veg_start: today, // Auto-set veg_start to today
      };

      this.dispatchEvent(
        new CustomEvent('transplant-plant-submit', {
          detail: payload,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    console.log(
      '[AddPlantDialog] render called, open:',
      this.open,
      'strains:',
      this.strainLibrary?.length
    );
    if (!this.open) return html``;

    const uniqueStrains = [...new Set(this.strainLibrary.map((s) => s.strain))].sort();

    // Filter phenotypes based on selected strain
    const relevantPhenotypes = this.strain
      ? [
          ...new Set(
            this.strainLibrary
              .filter((s) => s.strain === this.strain && s.phenotype)
              .map((s) => s.phenotype)
          ),
        ].sort()
      : [];

    const dialogTitle =
      this._activeTab === 'add'
        ? 'Add New Plant'
        : this._activeTab === 'clone'
          ? 'Transplant Clone'
          : 'Transplant Seedling';

    const dialogSubtitle =
      this._activeTab === 'add'
        ? 'Enter plant details below'
        : 'Select a plant to transplant to this location';

    const buttonText = this._activeTab === 'add' ? 'Add Plant' : 'Transplant';
    const isButtonDisabled = this._activeTab !== 'add' && !this._selectedTransplantPlant;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container">
          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiSprout}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">${dialogTitle}</h2>
              <div class="dialog-subtitle">${dialogSubtitle}</div>
            </div>
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width: auto; padding: 8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <!-- TAB BAR -->
          <div class="tab-bar">
            <button
              class="tab ${this._activeTab === 'add' ? 'active' : ''}"
              @click=${() => {
                this._activeTab = 'add';
                this._selectedTransplantPlant = null;
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              Add Plant
            </button>
            <button
              class="tab ${this._activeTab === 'clone' ? 'active' : ''}"
              @click=${() => {
                this._activeTab = 'clone';
                this._selectedTransplantPlant = null;
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
              Clone
            </button>
            <button
              class="tab ${this._activeTab === 'seedling' ? 'active' : ''}"
              @click=${() => {
                this._activeTab = 'seedling';
                this._selectedTransplantPlant = null;
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              Seedling
            </button>
          </div>

          <div class="overview-grid">
            ${this._activeTab === 'add'
              ? this._renderAddPlantForm(uniqueStrains, relevantPhenotypes)
              : this._renderTransplantForm(this._activeTab)}
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>
            <button
              class="md3-button primary"
              @click=${this._confirm}
              ?disabled=${isButtonDisabled}
            >
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiSprout}"></path>
              </svg>
              ${buttonText}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private renderTimelineContent() {
    const name = this.growspaceName.toLowerCase();

    if (name.includes('mother')) {
      return html`<md3-date-input
        label="Mother Start"
        .value=${this.mother_start}
        @change=${(e: CustomEvent) => (this.mother_start = e.detail)}
      ></md3-date-input>`;
    } else if (name.includes('clone')) {
      return html`<md3-date-input
        label="Clone Start"
        .value=${this.clone_start}
        @change=${(e: CustomEvent) => (this.clone_start = e.detail)}
      ></md3-date-input>`;
    } else if (name.includes('dry')) {
      return html`<md3-date-input
        label="Dry Start"
        .value=${this.dry_start}
        @change=${(e: CustomEvent) => (this.dry_start = e.detail)}
      ></md3-date-input>`;
    } else if (name.includes('cure')) {
      return html`<md3-date-input
        label="Cure Start"
        .value=${this.cure_start}
        @change=${(e: CustomEvent) => (this.cure_start = e.detail)}
      ></md3-date-input>`;
    } else {
      return html`
        <md3-date-input
          label="Seedling Start"
          .value=${this.seedling_start}
          @change=${(e: CustomEvent) => (this.seedling_start = e.detail)}
        ></md3-date-input>
        <md3-date-input
          label="Veg Start"
          .value=${this.veg_start}
          @change=${(e: CustomEvent) => (this.veg_start = e.detail)}
        ></md3-date-input>
        <md3-date-input
          label="Flower Start"
          .value=${this.flower_start}
          @change=${(e: CustomEvent) => (this.flower_start = e.detail)}
        ></md3-date-input>
      `;
    }
  }

  private _renderAddPlantForm(uniqueStrains: string[], relevantPhenotypes: string[]) {
    return html`
      <!-- IDENTITY CARD -->
      <div class="detail-card">
        <h3>Identity & Location</h3>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start;">
          <md3-select
            style="width: 100%;"
            label="Strain *"
            .value=${this.strain}
            .options=${uniqueStrains}
            @change=${(e: CustomEvent) => (this.strain = e.detail)}
          ></md3-select>
          <button
            class="md3-button tonal"
            style="height: 56px; width: 56px; padding: 0; display: flex; align-items: center; justify-content: center;"
            @click=${this._openStrainCreator}
            title="Add New Strain"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDna}"></path>
            </svg>
          </button>
        </div>
        <md3-text-input
          label="Phenotype"
          .value=${this.phenotype}
          .suggestions=${relevantPhenotypes}
          @change=${(e: CustomEvent) => (this.phenotype = e.detail)}
        ></md3-text-input>

        <div
          class="toggle-container"
          style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; padding: 0 4px;"
        >
          <span style="font-size: 0.95rem; color: var(--secondary-text-color);"
            >Add to Strain Library</span
          >
          <md3-switch
            .checked=${this.addToLibrary}
            @change=${(e: any) => (this.addToLibrary = e.target.checked)}
            ?disabled=${!this.strain}
          ></md3-switch>
        </div>
        <div class="row-col-grid">
          <md3-number-input
            label="Row"
            .value=${this.row + 1}
            @change=${(e: CustomEvent) => (this.row = parseInt(e.detail) - 1)}
          ></md3-number-input>
          <md3-number-input
            label="Col"
            .value=${this.col + 1}
            @change=${(e: CustomEvent) => (this.col = parseInt(e.detail) - 1)}
          ></md3-number-input>
        </div>
      </div>

      <!-- TIMELINE CARD -->
      <div class="detail-card">
        <h3>Timeline</h3>
        ${this.renderTimelineContent()}
      </div>
    `;
  }

  private _renderTransplantForm(stage: 'clone' | 'seedling') {
    const plants = stage === 'clone' ? this.clonePlants : this.seedlingPlants;
    const stageLabel = stage === 'clone' ? 'Clone' : 'Seedling';
    const daysField = stage === 'clone' ? 'clone_days' : 'seedling_days';

    // Build options for select with format: StrainName, Phenotype, Growspace, Col, Row, Days
    const options = plants.map((p) => {
      const strain = p.attributes.strain || 'Unknown';
      const pheno = p.attributes.phenotype || '-';
      const growspace = (p as any)._growspaceName || 'Unknown';
      const col = p.attributes.col;
      const row = p.attributes.row;
      const days = p.attributes[daysField] || 0;

      return {
        value: p.attributes.plant_id,
        label: `Strain: ${strain}, Phenotype: ${pheno}, Growspace: ${growspace}, Col: ${col}, Row: ${row}, Days: ${days}`,
      };
    });

    const selectedPlant = this._selectedTransplantPlant;

    return html`
      <!-- SELECT PLANT CARD -->
      <div class="detail-card">
        <h3>Select ${stageLabel} to Transplant</h3>
        ${plants.length === 0
          ? html`<p style="color: var(--secondary-text-color); font-style: italic;">
              No ${stageLabel.toLowerCase()}s available for transplant
            </p>`
          : html`
              <md3-select
                label="Select Plant"
                .value=${selectedPlant?.attributes.plant_id || ''}
                .options=${options}
                @change=${(e: CustomEvent) => {
                  const plantId = e.detail;
                  this._selectedTransplantPlant =
                    plants.find((p) => p.attributes.plant_id === plantId) || null;
                }}
              ></md3-select>
            `}
        ${selectedPlant
          ? html`
              <div class="plant-info-grid">
                <span class="info-label">Strain:</span>
                <span class="info-value">${selectedPlant.attributes.strain}</span>

                <span class="info-label">Phenotype:</span>
                <span class="info-value">${selectedPlant.attributes.phenotype || 'N/A'}</span>

                <span class="info-label">Current Position:</span>
                <span class="info-value"
                  >Row ${selectedPlant.attributes.row}, Col ${selectedPlant.attributes.col}</span
                >

                <span class="info-label">Days in Stage:</span>
                <span class="info-value">${selectedPlant.attributes[daysField] || 0} days</span>

                <span class="info-label">${stage === 'clone' ? 'Clone' : 'Seedling'} Start:</span>
                <span class="info-value"
                  >${selectedPlant.attributes[
                    stage === 'clone' ? 'clone_start' : 'seedling_start'
                  ] || 'N/A'}</span
                >
              </div>
            `
          : nothing}
      </div>

      <!-- NEW LOCATION CARD -->
      <div class="detail-card">
        <h3>New Location</h3>
        <div class="row-col-grid">
          <md3-number-input
            label="Row"
            .value=${this.row + 1}
            @change=${(e: CustomEvent) => (this.row = parseInt(e.detail) - 1)}
          ></md3-number-input>
          <md3-number-input
            label="Col"
            .value=${this.col + 1}
            @change=${(e: CustomEvent) => (this.col = parseInt(e.detail) - 1)}
          ></md3-number-input>
        </div>
        <p style="margin-top: 12px; font-size: 0.85rem; color: var(--secondary-text-color);">
          Veg start will be set to today's date upon transplant.
        </p>
      </div>
    `;
  }
}
