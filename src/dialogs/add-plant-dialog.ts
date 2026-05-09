import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose, mdiSprout, mdiDna, mdiContentCopy, mdiCheck, mdiChevronRight } from '@mdi/js';
import { StrainEntry, PlantEntity } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/md3-select';
import '../features/shared/ui/md3-date-input';
import '../features/shared/ui/md3-switch';
import '../features/shared/ui/gs-help-tooltip';

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

  // Wizard state (add tab only)
  @state() private _wizardStep: 1 | 2 | 3 = 1;
  @state() private _strainQuery = '';
  @state() private _sourceType: 'seed' | 'clone' = 'seed';
  @state() private _siblingPlant: PlantEntity | null = null;

  // Plants available for transplant (filtered by stage)
  @property({ type: Array }) clonePlants: PlantEntity[] = [];
  @property({ type: Array }) seedlingPlants: PlantEntity[] = [];
  @property({ type: String }) targetGrowspaceId = '';
  // Plants in the same growspace that can be cloned from (for F-13)
  @property({ type: Array }) siblingPlants: PlantEntity[] = [];

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

      /* Wizard step indicator */
      .wizard-steps {
        display: flex;
        align-items: center;
        padding: 14px 24px;
        gap: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.1);
      }

      .wizard-step {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.4));
        white-space: nowrap;
      }

      .wizard-step.active {
        color: var(--primary-color, #4caf50);
      }

      .wizard-step.done {
        color: rgba(255, 255, 255, 0.55);
      }

      .wizard-step-num {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1.5px solid currentColor;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        flex-shrink: 0;
      }

      .wizard-step.active .wizard-step-num {
        background: var(--primary-color, #4caf50);
        border-color: var(--primary-color, #4caf50);
        color: #fff;
      }

      .wizard-step.done .wizard-step-num {
        background: rgba(76, 175, 80, 0.2);
        border-color: rgba(76, 175, 80, 0.4);
        color: #69f0ae;
      }

      .wizard-connector {
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 0 8px;
      }

      .wizard-connector.done {
        background: rgba(76, 175, 80, 0.3);
      }

      /* Strain typeahead */
      .strain-typeahead {
        position: relative;
      }

      .strain-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 100;
        background: var(--card-background-color, #2c2c2c);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        margin-top: 4px;
      }

      .strain-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.1s;
      }

      .strain-option:hover {
        background: rgba(76, 175, 80, 0.12);
        color: #69f0ae;
      }

      .strain-option-meta {
        font-size: 0.72rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.4));
      }

      /* Source type toggle */
      .source-toggle {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 16px;
      }

      .source-btn {
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        color: var(--secondary-text-color);
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        text-align: center;
        transition: all 0.15s;
      }

      .source-btn.active {
        border-color: var(--primary-color, #4caf50);
        background: rgba(76, 175, 80, 0.12);
        color: var(--primary-color, #4caf50);
      }

      /* Sibling plant picker */
      .sibling-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 10px;
      }

      .sibling-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.15s;
      }

      .sibling-item:hover {
        border-color: rgba(76, 175, 80, 0.4);
        background: rgba(76, 175, 80, 0.06);
      }

      .sibling-item.selected {
        border-color: var(--primary-color, #4caf50);
        background: rgba(76, 175, 80, 0.1);
        color: #69f0ae;
      }

      .sibling-meta {
        font-size: 0.72rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.4));
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
    // reset wizard
    this._wizardStep = 1;
    this._strainQuery = strain;
    this._sourceType = 'seed';
    this._siblingPlant = null;
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
      // For clone source, ensure clone_start is set if not already
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        row: this.row + 1,
        col: this.col + 1,
        strain: this.strain,
        phenotype: this.phenotype,
        veg_start: this.veg_start,
        flower_start: this.flower_start,
        seedling_start: this._sourceType === 'seed' ? (this.seedling_start || today) : '',
        mother_start: this.mother_start,
        clone_start: this._sourceType === 'clone' ? (this.clone_start || today) : '',
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
        ? `Slot ${this.row + 1}–${this.col + 1}`
        : 'Select a plant to transplant to this location';

    const isTransplant = this._activeTab !== 'add';
    const isButtonDisabled = isTransplant && !this._selectedTransplantPlant;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="full"
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
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">${dialogTitle}</h2>
                <gs-help-tooltip
                  content="Add a new plant to this growspace — enter strain, breeder, and start date."
                  placement="bottom"
                  label="Add Plant"
                ></gs-help-tooltip>
              </div>
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
              @click=${() => { this._activeTab = 'add'; this._selectedTransplantPlant = null; this._wizardStep = 1; }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              New Plant
            </button>
            <button
              class="tab ${this._activeTab === 'clone' ? 'active' : ''}"
              @click=${() => { this._activeTab = 'clone'; this._selectedTransplantPlant = null; }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
              Transplant Clone
            </button>
            <button
              class="tab ${this._activeTab === 'seedling' ? 'active' : ''}"
              @click=${() => { this._activeTab = 'seedling'; this._selectedTransplantPlant = null; }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              Transplant Seedling
            </button>
          </div>

          <!-- WIZARD STEP INDICATOR (add tab only) -->
          ${this._activeTab === 'add' ? this._renderWizardSteps() : nothing}

          <div class="overview-grid">
            ${this._activeTab === 'add'
              ? this._renderWizardStep(uniqueStrains, relevantPhenotypes)
              : this._renderTransplantForm(this._activeTab)}
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            ${this._activeTab === 'add'
              ? html`
                  <button
                    class="md3-button tonal"
                    @click=${this._wizardStep === 1 ? this._close : this._wizardBack}
                  >
                    ${this._wizardStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  ${this._wizardStep < 3
                    ? html`
                        <button
                          class="md3-button primary"
                          @click=${this._wizardNext}
                          ?disabled=${this._wizardStep === 1 && !this.strain}
                        >
                          Continue
                          <svg style="width:16px;height:16px;fill:currentColor;margin-left:4px;" viewBox="0 0 24 24">
                            <path d="${mdiChevronRight}"></path>
                          </svg>
                        </button>
                      `
                    : html`
                        <button class="md3-button primary" @click=${this._confirm}>
                          <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                            <path d="${mdiSprout}"></path>
                          </svg>
                          Add Plant
                        </button>
                      `}
                `
              : html`
                  <button class="md3-button tonal" @click=${this._close}>Cancel</button>
                  <button
                    class="md3-button primary"
                    @click=${this._confirm}
                    ?disabled=${isButtonDisabled}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${mdiSprout}"></path>
                    </svg>
                    Transplant
                  </button>
                `}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _wizardNext() {
    if (this._wizardStep < 3) this._wizardStep = (this._wizardStep + 1) as 1 | 2 | 3;
  }

  private _wizardBack() {
    if (this._wizardStep > 1) {
      this._wizardStep = (this._wizardStep - 1) as 1 | 2 | 3;
    } else {
      this._close();
    }
  }

  private _renderWizardSteps() {
    const steps = ['Identity', 'Source', 'Schedule'];
    return html`
      <div class="wizard-steps">
        ${steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === this._wizardStep;
          const isDone = stepNum < this._wizardStep;
          return html`
            ${i > 0 ? html`<div class="wizard-connector ${isDone ? 'done' : ''}"></div>` : nothing}
            <div class="wizard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}">
              <div class="wizard-step-num">
                ${isDone
                  ? html`<svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>`
                  : stepNum}
              </div>
              ${label}
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderWizardStep(uniqueStrains: string[], relevantPhenotypes: string[]) {
    if (this._wizardStep === 1) return this._renderStep1Identity(uniqueStrains, relevantPhenotypes);
    if (this._wizardStep === 2) return this._renderStep2Source();
    return this._renderStep3Schedule();
  }

  private _renderStep1Identity(uniqueStrains: string[], relevantPhenotypes: string[]) {
    const query = this._strainQuery.toLowerCase();
    const filtered = query
      ? uniqueStrains.filter((s) => s.toLowerCase().includes(query))
      : uniqueStrains.slice(0, 8);
    const showDropdown = filtered.length > 0 && this._strainQuery !== this.strain;

    const selectedEntry = this.strain
      ? this.strainLibrary.find((s) => s.strain === this.strain)
      : null;

    return html`
      <div class="detail-card">
        <h3>What are you growing?</h3>

        <!-- F-14: Strain typeahead -->
        <div class="strain-typeahead">
          <md3-text-input
            label="Strain *"
            .value=${this._strainQuery || this.strain}
            placeholder="Search strain library…"
            @change=${(e: CustomEvent) => {
              this._strainQuery = e.detail;
              if (e.detail !== this.strain) this.strain = '';
            }}
          ></md3-text-input>
          ${showDropdown ? html`
            <div class="strain-dropdown">
              ${filtered.map((s) => {
                const entry = this.strainLibrary.find((e) => e.strain === s);
                return html`
                  <div
                    class="strain-option"
                    @click=${() => {
                      this.strain = s;
                      this._strainQuery = s;
                    }}
                  >
                    <span>${s}</span>
                    ${entry?.breeder ? html`<span class="strain-option-meta">${entry.breeder}</span>` : nothing}
                  </div>
                `;
              })}
            </div>
          ` : nothing}
        </div>

        ${this.strain ? html`
          <md3-text-input
            label="Phenotype"
            .value=${this.phenotype}
            .suggestions=${relevantPhenotypes}
            @change=${(e: CustomEvent) => (this.phenotype = e.detail)}
          ></md3-text-input>
        ` : nothing}

        ${selectedEntry ? html`
          <div style="
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            background: rgba(76,175,80,0.06);
            border: 1px solid rgba(76,175,80,0.2);
            font-size: 0.8rem;
            color: rgba(255,255,255,0.7);
            display: flex; gap: 16px;
          ">
            ${selectedEntry.breeder ? html`<span><b style="color:#fff">${selectedEntry.breeder}</b></span>` : nothing}
            ${selectedEntry.type ? html`<span>${selectedEntry.type}</span>` : nothing}
            ${selectedEntry.flowering_days_min ? html`<span>~${selectedEntry.flowering_days_min}–${selectedEntry.flowering_days_max || '?'} days flower</span>` : nothing}
          </div>
        ` : nothing}

        <div
          class="toggle-container"
          style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between; padding: 0 4px;"
        >
          <span style="font-size: 0.9rem; color: var(--secondary-text-color);">Add to Strain Library</span>
          <md3-switch
            .checked=${this.addToLibrary}
            @change=${(e: Event) => (this.addToLibrary = (e.target as HTMLInputElement).checked)}
            ?disabled=${!this.strain}
          ></md3-switch>
        </div>
      </div>

      <div style="padding-top: 4px;">
        <button
          class="md3-button tonal"
          style="width: 100%;"
          @click=${this._openStrainCreator}
        >
          <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
            <path d="${mdiDna}"></path>
          </svg>
          Create New Strain
        </button>
      </div>
    `;
  }

  private _renderStep2Source() {
    // F-13: Clone-from-sibling — plants in same growspace that are mothers/veg/flower
    const clonable = this.siblingPlants.filter((p) =>
      ['mother', 'veg', 'flower', 'vegetative', 'flowering'].includes(
        (p.state || p.attributes?.stage || '').toLowerCase()
      )
    );

    return html`
      <div class="detail-card">
        <h3>Plant Source</h3>
        <div class="source-toggle">
          <button
            class="source-btn ${this._sourceType === 'seed' ? 'active' : ''}"
            @click=${() => { this._sourceType = 'seed'; this._siblingPlant = null; }}
          >
            🌱 Seed
          </button>
          <button
            class="source-btn ${this._sourceType === 'clone' ? 'active' : ''}"
            @click=${() => (this._sourceType = 'clone')}
            ?disabled=${clonable.length === 0}
          >
            ✂️ Clone
          </button>
        </div>

        ${this._sourceType === 'clone' && clonable.length > 0 ? html`
          <div style="font-size: 0.82rem; color: var(--secondary-text-color); margin-bottom: 8px;">
            Select mother plant to clone settings from:
          </div>
          <div class="sibling-list">
            ${clonable.map((p) => {
              const isSelected = this._siblingPlant?.attributes.plant_id === p.attributes.plant_id;
              const stage = p.state || p.attributes?.stage || 'unknown';
              const days = p.attributes?.days_in_stage;
              return html`
                <div
                  class="sibling-item ${isSelected ? 'selected' : ''}"
                  @click=${() => {
                    this._siblingPlant = isSelected ? null : p;
                    if (!isSelected) {
                      // Pre-fill identity from mother
                      this.strain = p.attributes.strain || this.strain;
                      this._strainQuery = this.strain;
                      this.phenotype = p.attributes.phenotype || this.phenotype;
                      // Set clone_start to today
                      this.clone_start = new Date().toISOString().split('T')[0];
                    }
                  }}
                >
                  <div>
                    <div style="font-weight: 500;">${p.attributes.strain || 'Unknown'}${p.attributes.phenotype ? ` · ${p.attributes.phenotype}` : ''}</div>
                    <div class="sibling-meta">${stage}${days !== undefined ? ` · D${days}` : ''}</div>
                  </div>
                  ${isSelected ? html`
                    <svg style="width:18px;height:18px;fill:#69f0ae;" viewBox="0 0 24 24">
                      <path d="${mdiCheck}"></path>
                    </svg>
                  ` : nothing}
                </div>
              `;
            })}
          </div>
        ` : nothing}

        ${this._sourceType === 'clone' && clonable.length === 0 ? html`
          <p style="font-size: 0.85rem; color: var(--secondary-text-color); font-style: italic;">
            No clonable plants found in this growspace.
          </p>
        ` : nothing}
      </div>

      <div class="detail-card">
        <h3>Location</h3>
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
    `;
  }

  private _renderStep3Schedule() {
    return html`
      <div class="detail-card">
        <h3>Schedule</h3>
        ${this.renderTimelineContent()}
      </div>
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
            @change=${(e: Event) => (this.addToLibrary = (e.target as HTMLInputElement).checked)}
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
      const growspace = (p as PlantEntity & { _growspaceName?: string })._growspaceName || 'Unknown';
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
