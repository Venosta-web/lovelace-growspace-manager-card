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
import {
  createInitialSM,
  transition,
  type SM,
  type AddSubState,
} from './add-plant-dialog-sm';

@customElement('add-plant-dialog')
export class AddPlantDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ type: Array }) strainLibrary: StrainEntry[] = [];
  @property({ type: String }) growspaceName = '';
  @property({ type: Boolean, reflect: true }) open = false;

  // Render-time args — not draft state
  @property({ type: Array }) clonePlants: PlantEntity[] = [];
  @property({ type: Array }) seedlingPlants: PlantEntity[] = [];
  @property({ type: String }) targetGrowspaceId = '';
  @property({ type: Array }) siblingPlants: PlantEntity[] = [];

  @state() private _sm: SM = createInitialSM({ row: 0, col: 0 });

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

  public setInitialState(row: number, col: number, strain = '', phenotype = '') {
    this._sm = createInitialSM({ row, col });
    if (strain) {
      this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: strain });
      this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strainQuery', value: strain });
    }
    if (phenotype) {
      this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'phenotype', value: phenotype });
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _openStrainCreator() {
    const { draft } = this._sm.tabs.add;
    this.dispatchEvent(
      new CustomEvent('create-new-strain', {
        bubbles: true,
        composed: true,
        detail: {
          source: 'add-plant',
          returnPayload: {
            row: draft.row,
            col: draft.col,
            strain: draft.strain,
            phenotype: draft.phenotype,
            seedling_start: draft.seedlingStart,
            veg_start: draft.vegStart,
            flower_start: draft.flowerStart,
            mother_start: draft.motherStart,
            clone_start: draft.cloneStart,
            dry_start: draft.dryStart,
            cure_start: draft.cureStart,
          },
        },
      })
    );
  }

  private _confirm() {
    const { activeTab, tabs } = this._sm;
    if (activeTab === 'add') {
      const today = new Date().toISOString().split('T')[0];
      const d = tabs.add.draft;
      const payload = {
        row: d.row + 1,
        col: d.col + 1,
        strain: d.strain,
        phenotype: d.phenotype,
        veg_start: d.vegStart,
        flower_start: d.flowerStart,
        seedling_start: d.sourceType === 'seed' ? d.seedlingStart || today : '',
        mother_start: d.motherStart,
        clone_start: d.sourceType === 'clone' ? d.cloneStart || today : '',
        dry_start: d.dryStart,
        cure_start: d.cureStart,
        addToLibrary: d.addToLibrary,
      };
      this._sm = transition(this._sm, { type: 'SaveRequested' });
      this.dispatchEvent(
        new CustomEvent('add-plant-submit', { detail: payload, bubbles: true, composed: true })
      );
    } else {
      const tabDraft = activeTab === 'clone' ? tabs.clone.draft : tabs.seedling.draft;
      if (!tabDraft.selectedPlantId) return;

      const plants = activeTab === 'clone' ? this.clonePlants : this.seedlingPlants;
      const plant = plants.find((p) => p.attributes.plant_id === tabDraft.selectedPlantId);
      if (!plant) return;

      const today = new Date().toISOString().split('T')[0];
      const payload = {
        plant_id: plant.attributes.plant_id,
        source_growspace_id: plant.attributes.growspace_id,
        target_growspace_id: this.targetGrowspaceId,
        new_row: tabDraft.row + 1,
        new_col: tabDraft.col + 1,
        veg_start: today,
      };
      this._sm = transition(this._sm, { type: 'SaveRequested' });
      this.dispatchEvent(
        new CustomEvent('transplant-plant-submit', { detail: payload, bubbles: true, composed: true })
      );
    }
  }

  render() {
    if (!this.open) return html``;

    const { activeTab, tabs } = this._sm;
    const addDraft = tabs.add.draft;
    const addSub = tabs.add.sub;

    const uniqueStrains = [...new Set(this.strainLibrary.map((s) => s.strain))].sort();

    const relevantPhenotypes = addDraft.strain
      ? [
          ...new Set(
            this.strainLibrary
              .filter((s) => s.strain === addDraft.strain && s.phenotype)
              .map((s) => s.phenotype)
          ),
        ].sort()
      : [];

    const dialogTitle =
      activeTab === 'add'
        ? 'Add New Plant'
        : activeTab === 'clone'
          ? 'Transplant Clone'
          : 'Transplant Seedling';

    const dialogSubtitle =
      activeTab === 'add'
        ? `Slot ${addDraft.row + 1}–${addDraft.col + 1}`
        : 'Select a plant to transplant to this location';

    const isTransplant = activeTab !== 'add';
    const transplantDraft = activeTab === 'clone' ? tabs.clone.draft : tabs.seedling.draft;
    const isButtonDisabled = isTransplant && !transplantDraft.selectedPlantId;
    const isOnLastStep = addSub.kind === 'step-schedule';

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="large"
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
              class="tab ${activeTab === 'add' ? 'active' : ''}"
              @click=${() => {
                this._sm = transition(this._sm, { type: 'TabSelected', tab: 'add' });
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              New Plant
            </button>
            <button
              class="tab ${activeTab === 'clone' ? 'active' : ''}"
              @click=${() => {
                this._sm = transition(this._sm, { type: 'TabSelected', tab: 'clone' });
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
              Transplant Clone
            </button>
            <button
              class="tab ${activeTab === 'seedling' ? 'active' : ''}"
              @click=${() => {
                this._sm = transition(this._sm, { type: 'TabSelected', tab: 'seedling' });
              }}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              Transplant Seedling
            </button>
          </div>

          <!-- WIZARD STEP INDICATOR (add tab only) -->
          ${activeTab === 'add' ? this._renderWizardSteps(addSub) : nothing}

          <div class="overview-grid">
            ${activeTab === 'add'
              ? this._renderWizardStep(addSub, uniqueStrains, relevantPhenotypes)
              : this._renderTransplantForm(activeTab as 'clone' | 'seedling')}
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            ${activeTab === 'add'
              ? html`
                  <button
                    class="md3-button tonal"
                    @click=${addSub.kind === 'step-identity' ? this._close : () => {
                      this._sm = transition(this._sm, { type: 'WizardBacked' });
                    }}
                  >
                    ${addSub.kind === 'step-identity' ? 'Cancel' : 'Back'}
                  </button>
                  ${!isOnLastStep
                    ? html`
                        <button
                          class="md3-button primary"
                          @click=${() => {
                            this._sm = transition(this._sm, { type: 'WizardAdvanced' });
                          }}
                          ?disabled=${addSub.kind === 'step-identity' && !addDraft.strain}
                        >
                          Continue
                          <svg
                            style="width:16px;height:16px;fill:currentColor;margin-left:4px;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiChevronRight}"></path>
                          </svg>
                        </button>
                      `
                    : html`
                        <button class="md3-button primary" @click=${this._confirm}>
                          <svg
                            style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                            viewBox="0 0 24 24"
                          >
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
                    <svg
                      style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
                      viewBox="0 0 24 24"
                    >
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

  private _renderWizardSteps(sub: AddSubState) {
    const steps = ['Identity', 'Source', 'Schedule'];
    const currentIndex = sub.kind === 'step-identity' ? 0 : sub.kind === 'step-source' ? 1 : 2;
    return html`
      <div class="wizard-steps">
        ${steps.map((label, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          return html`
            ${i > 0 ? html`<div class="wizard-connector ${isDone ? 'done' : ''}"></div>` : nothing}
            <div class="wizard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}">
              <div class="wizard-step-num">
                ${isDone
                  ? html`<svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiCheck}"></path>
                    </svg>`
                  : i + 1}
              </div>
              ${label}
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderWizardStep(sub: AddSubState, uniqueStrains: string[], relevantPhenotypes: string[]) {
    if (sub.kind === 'step-identity') return this._renderStep1Identity(uniqueStrains, relevantPhenotypes);
    if (sub.kind === 'step-source') return this._renderStep2Source();
    return this._renderStep3Schedule();
  }

  private _renderStep1Identity(uniqueStrains: string[], relevantPhenotypes: string[]) {
    const { draft } = this._sm.tabs.add;
    const query = draft.strainQuery.toLowerCase();
    const filtered = query
      ? uniqueStrains.filter((s) => s.toLowerCase().includes(query))
      : uniqueStrains.slice(0, 8);
    const showDropdown = filtered.length > 0 && draft.strainQuery !== draft.strain;

    const selectedEntry = draft.strain
      ? this.strainLibrary.find((s) => s.strain === draft.strain)
      : null;

    return html`
      <div class="detail-card">
        <h3>What are you growing?</h3>

        <div class="strain-typeahead">
          <md3-text-input
            label="Strain *"
            .value=${draft.strainQuery || draft.strain}
            placeholder="Search strain library…"
            @change=${(e: CustomEvent) => {
              this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strainQuery', value: e.detail });
              if (e.detail !== draft.strain) {
                this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: '' });
              }
            }}
          ></md3-text-input>
          ${showDropdown
            ? html`
                <div class="strain-dropdown">
                  ${filtered.map((s) => {
                    const entry = this.strainLibrary.find((e) => e.strain === s);
                    return html`
                      <div
                        class="strain-option"
                        @click=${() => {
                          this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: s });
                          this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strainQuery', value: s });
                        }}
                      >
                        <span>${s}</span>
                        ${entry?.breeder
                          ? html`<span class="strain-option-meta">${entry.breeder}</span>`
                          : nothing}
                      </div>
                    `;
                  })}
                </div>
              `
            : nothing}
        </div>

        ${draft.strain
          ? html`
              <md3-text-input
                label="Phenotype"
                .value=${draft.phenotype}
                .suggestions=${relevantPhenotypes}
                @change=${(e: CustomEvent) =>
                  (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'phenotype', value: e.detail }))}
              ></md3-text-input>
            `
          : nothing}
        ${selectedEntry
          ? html`
              <div
                style="
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            background: rgba(76,175,80,0.06);
            border: 1px solid rgba(76,175,80,0.2);
            font-size: 0.8rem;
            color: rgba(255,255,255,0.7);
            display: flex; gap: 16px;
          "
              >
                ${selectedEntry.breeder
                  ? html`<span><b style="color:#fff">${selectedEntry.breeder}</b></span>`
                  : nothing}
                ${selectedEntry.type ? html`<span>${selectedEntry.type}</span>` : nothing}
                ${selectedEntry.flowering_days_min
                  ? html`<span
                      >~${selectedEntry.flowering_days_min}–${selectedEntry.flowering_days_max ||
                      '?'}
                      days flower</span
                    >`
                  : nothing}
              </div>
            `
          : nothing}

        <div
          class="toggle-container"
          style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between; padding: 0 4px;"
        >
          <span style="font-size: 0.9rem; color: var(--secondary-text-color);"
            >Add to Strain Library</span
          >
          <md3-switch
            .checked=${draft.addToLibrary}
            @change=${(e: Event) =>
              (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'addToLibrary', value: (e.target as HTMLInputElement).checked }))}
            ?disabled=${!draft.strain}
          ></md3-switch>
        </div>
      </div>

      <div style="padding-top: 4px;">
        <button class="md3-button tonal" style="width: 100%;" @click=${this._openStrainCreator}>
          <svg
            style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
            viewBox="0 0 24 24"
          >
            <path d="${mdiDna}"></path>
          </svg>
          Create New Strain
        </button>
      </div>
    `;
  }

  private _renderStep2Source() {
    const { draft } = this._sm.tabs.add;
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
            class="source-btn ${draft.sourceType === 'seed' ? 'active' : ''}"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'sourceType', value: 'seed' });
              this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'siblingPlantId', value: null });
            }}
          >
            🌱 Seed
          </button>
          <button
            class="source-btn ${draft.sourceType === 'clone' ? 'active' : ''}"
            @click=${() =>
              (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'sourceType', value: 'clone' }))}
            ?disabled=${clonable.length === 0}
          >
            ✂️ Clone
          </button>
        </div>

        ${draft.sourceType === 'clone' && clonable.length > 0
          ? html`
              <div
                style="font-size: 0.82rem; color: var(--secondary-text-color); margin-bottom: 8px;"
              >
                Select mother plant to clone settings from:
              </div>
              <div class="sibling-list">
                ${clonable.map((p) => {
                  const isSelected = draft.siblingPlantId === p.attributes.plant_id;
                  const stage = p.state || p.attributes?.stage || 'unknown';
                  const days = p.attributes?.days_in_stage;
                  return html`
                    <div
                      class="sibling-item ${isSelected ? 'selected' : ''}"
                      @click=${() => {
                        const today = new Date().toISOString().split('T')[0];
                        this._sm = transition(this._sm, {
                          type: 'SiblingPlantSelected',
                          strain: p.attributes.strain || draft.strain,
                          phenotype: p.attributes.phenotype || draft.phenotype,
                          cloneStart: today,
                        });
                      }}
                    >
                      <div>
                        <div style="font-weight: 500;">
                          ${p.attributes.strain || 'Unknown'}${p.attributes.phenotype
                            ? ` · ${p.attributes.phenotype}`
                            : ''}
                        </div>
                        <div class="sibling-meta">
                          ${stage}${days !== undefined ? ` · D${days}` : ''}
                        </div>
                      </div>
                      ${isSelected
                        ? html`
                            <svg style="width:18px;height:18px;fill:#69f0ae;" viewBox="0 0 24 24">
                              <path d="${mdiCheck}"></path>
                            </svg>
                          `
                        : nothing}
                    </div>
                  `;
                })}
              </div>
            `
          : nothing}
        ${draft.sourceType === 'clone' && clonable.length === 0
          ? html`
              <p
                style="font-size: 0.85rem; color: var(--secondary-text-color); font-style: italic;"
              >
                No clonable plants found in this growspace.
              </p>
            `
          : nothing}
      </div>

      <div class="detail-card">
        <h3>Location</h3>
        <div class="row-col-grid">
          <md3-number-input
            label="Row"
            .value=${draft.row + 1}
            @change=${(e: CustomEvent) =>
              (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'row', value: parseInt(e.detail) - 1 }))}
          ></md3-number-input>
          <md3-number-input
            label="Col"
            .value=${draft.col + 1}
            @change=${(e: CustomEvent) =>
              (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'col', value: parseInt(e.detail) - 1 }))}
          ></md3-number-input>
        </div>
      </div>
    `;
  }

  private _renderStep3Schedule() {
    const { draft } = this._sm.tabs.add;
    return html`
      <div class="detail-card">
        <h3>Schedule</h3>
        ${this._renderTimelineContent(draft)}
      </div>
    `;
  }

  private _renderTimelineContent(draft: typeof this._sm.tabs.add.draft) {
    const name = this.growspaceName.toLowerCase();

    if (name.includes('mother')) {
      return html`<md3-date-input
        label="Mother Start"
        .value=${draft.motherStart}
        @change=${(e: CustomEvent) =>
          (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'motherStart', value: e.detail }))}
      ></md3-date-input>`;
    } else if (name.includes('clone')) {
      return html`<md3-date-input
        label="Clone Start"
        .value=${draft.cloneStart}
        @change=${(e: CustomEvent) =>
          (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'cloneStart', value: e.detail }))}
      ></md3-date-input>`;
    } else if (name.includes('dry')) {
      return html`<md3-date-input
        label="Dry Start"
        .value=${draft.dryStart}
        @change=${(e: CustomEvent) =>
          (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'dryStart', value: e.detail }))}
      ></md3-date-input>`;
    } else if (name.includes('cure')) {
      return html`<md3-date-input
        label="Cure Start"
        .value=${draft.cureStart}
        @change=${(e: CustomEvent) =>
          (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'cureStart', value: e.detail }))}
      ></md3-date-input>`;
    } else {
      return html`
        <md3-date-input
          label="Seedling Start"
          .value=${draft.seedlingStart}
          @change=${(e: CustomEvent) =>
            (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'seedlingStart', value: e.detail }))}
        ></md3-date-input>
        <md3-date-input
          label="Veg Start"
          .value=${draft.vegStart}
          @change=${(e: CustomEvent) =>
            (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'vegStart', value: e.detail }))}
        ></md3-date-input>
        <md3-date-input
          label="Flower Start"
          .value=${draft.flowerStart}
          @change=${(e: CustomEvent) =>
            (this._sm = transition(this._sm, { type: 'DraftFieldChanged', tab: 'add', field: 'flowerStart', value: e.detail }))}
        ></md3-date-input>
      `;
    }
  }

  private _renderTransplantForm(stage: 'clone' | 'seedling') {
    const plants = stage === 'clone' ? this.clonePlants : this.seedlingPlants;
    const stageLabel = stage === 'clone' ? 'Clone' : 'Seedling';
    const daysField = stage === 'clone' ? 'clone_days' : 'seedling_days';
    const tabDraft = stage === 'clone' ? this._sm.tabs.clone.draft : this._sm.tabs.seedling.draft;

    const options = plants.map((p) => {
      const strain = p.attributes.strain || 'Unknown';
      const pheno = p.attributes.phenotype || '-';
      const growspace =
        (p as PlantEntity & { _growspaceName?: string })._growspaceName || 'Unknown';
      const col = p.attributes.col;
      const row = p.attributes.row;
      const days = p.attributes[daysField] || 0;

      return {
        value: p.attributes.plant_id,
        label: `Strain: ${strain}, Phenotype: ${pheno}, Growspace: ${growspace}, Col: ${col}, Row: ${row}, Days: ${days}`,
      };
    });

    const selectedPlant = tabDraft.selectedPlantId
      ? plants.find((p) => p.attributes.plant_id === tabDraft.selectedPlantId) || null
      : null;

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
                .value=${tabDraft.selectedPlantId || ''}
                .options=${options}
                @change=${(e: CustomEvent) => {
                  this._sm = transition(this._sm, {
                    type: 'DraftFieldChanged',
                    tab: stage,
                    field: 'selectedPlantId',
                    value: plants.find((p) => p.attributes.plant_id === e.detail)
                      ? e.detail
                      : null,
                  });
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
            .value=${tabDraft.row + 1}
            @change=${(e: CustomEvent) =>
              (this._sm = transition(this._sm, {
                type: 'DraftFieldChanged',
                tab: stage,
                field: 'row',
                value: parseInt(e.detail) - 1,
              }))}
          ></md3-number-input>
          <md3-number-input
            label="Col"
            .value=${tabDraft.col + 1}
            @change=${(e: CustomEvent) =>
              (this._sm = transition(this._sm, {
                type: 'DraftFieldChanged',
                tab: stage,
                field: 'col',
                value: parseInt(e.detail) - 1,
              }))}
          ></md3-number-input>
        </div>
        <p style="margin-top: 12px; font-size: 0.85rem; color: var(--secondary-text-color);">
          Veg start will be set to today's date upon transplant.
        </p>
      </div>
    `;
  }
}
