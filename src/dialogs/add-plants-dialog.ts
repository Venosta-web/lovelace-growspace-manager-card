import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { hassContext } from '../context';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiClose, mdiSprout, mdiInformationOutline, mdiDna } from '@mdi/js';
import { StrainEntry, GrowspaceDevice } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/md3-select';
import '../features/shared/ui/md3-date-input';
import '../features/shared/ui/md3-switch';

@customElement('add-plants-dialog')
export class AddPlantsDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  hass!: HomeAssistant;

  @property({ type: Array }) strainLibrary: StrainEntry[] = [];
  @property({ type: String }) growspaceName = '';
  @property({ attribute: false }) growspaceDevice?: GrowspaceDevice;
  @property({ type: Boolean, reflect: true }) open = false;

  @property({ type: String }) strain = '';
  @property({ type: String }) phenotype = '';
  @state() private addToLibrary = false;
  @property({ type: Number }) amount = 1;
  @property({ type: Number }) start_number = 1;

  // Date fields
  @property({ type: String }) veg_start = '';
  @property({ type: String }) flower_start = '';
  @property({ type: String }) seedling_start = '';
  @property({ type: String }) mother_start = '';
  @property({ type: String }) clone_start = '';
  @property({ type: String }) dry_start = '';
  @property({ type: String }) cure_start = '';

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
      .explanation-card {
        background: rgba(var(--md3-sys-color-primary-container-rgb, 103, 80, 164), 0.1);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: 0.9rem;
        color: var(--md3-sys-color-on-surface-variant);
        border: 1px solid rgba(var(--md3-sys-color-primary-rgb), 0.1);
      }
      .explanation-card svg {
        flex-shrink: 0;
        fill: var(--md3-sys-color-primary);
      }
      @media (max-width: 450px) {
        .overview-grid {
          flex: 1;
          min-height: 0;
          padding: 16px;
        }
      }
    `,
  ];

  public setInitialState(strain: string = '') {
    this.strain = strain;
    this.amount = 1;
    this.start_number = 1;
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
          source: 'add-plants',
          returnPayload: {
            strain: this.strain,
            phenotype: this.phenotype,
            amount: this.amount,
            start_number: this.start_number,
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
    if (this.growspaceDevice) {
      const totalSlots =
        (this.growspaceDevice.rows || 0) * (this.growspaceDevice.plantsPerRow || 0);
      const occupied = this.growspaceDevice.plants?.length || 0;
      const free = Math.max(0, totalSlots - occupied);

      if (this.amount > free) {
        this.dispatchEvent(
          new CustomEvent('show-toast', {
            bubbles: true,
            composed: true,
            detail: {
              message: `Not enough free Plant Slots in the growspace. ${free} Plant Spots free`,
              type: 'error',
            },
          })
        );
        return;
      }
    }

    const payload = {
      strain: this.strain,
      amount: this.amount,
      start_number: this.start_number,
      veg_start: this.veg_start,
      flower_start: this.flower_start,
      seedling_start: this.seedling_start,
      mother_start: this.mother_start,
      clone_start: this.clone_start,
      dry_start: this.dry_start,
      cure_start: this.cure_start,
      phenotype: this.phenotype,
      addToLibrary: this.addToLibrary,
    };

    this.dispatchEvent(
      new CustomEvent('add-plants-submit', {
        detail: payload,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.open) return html``;

    const uniqueStrains = [...new Set(this.strainLibrary.map((s) => s.strain))].sort();

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
                <h2 class="dialog-title">Batch Add Plants</h2>
                <gs-help-tooltip
                  content="Add multiple plants at once. This will automatically assign them to available positions in your growspace using a numbered naming pattern."
                  placement="bottom"
                  label="Batch Add"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">Add multiple plants to ${this.growspaceName}</div>
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

          <div class="overview-grid">
            <div class="explanation-card">
              <svg style="width:20px;height:20px;" viewBox="0 0 24 24">
                <path d="${mdiInformationOutline}"></path>
              </svg>
              <div>
                Batch adding will automatically find available positions in the growspace. Plants
                will be named using the phenotype pattern: <strong>Strain #StartNumber</strong>. For
                example, adding 3 "OG Kush" starting at #1 will create OG Kush #1, OG Kush #2, and
                OG Kush #3.
              </div>
            </div>

            <!-- IDENTITY CARD -->
            <div class="detail-card">
              <h3>Batch Configuration</h3>
              <div
                style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start;"
              >
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
                label="Phenotype (Optional)"
                .value=${this.phenotype}
                @change=${(e: CustomEvent) => (this.phenotype = e.detail)}
              ></md3-text-input>

              <div
                class="toggle-container"
                style="margin-top: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; padding: 0 4px;"
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
                  label="Amount"
                  .value=${this.amount}
                  min="1"
                  @change=${(e: CustomEvent) => (this.amount = parseInt(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  label="Start Number"
                  .value=${this.start_number}
                  min="1"
                  @change=${(e: CustomEvent) => (this.start_number = parseInt(e.detail))}
                ></md3-number-input>
              </div>
            </div>

            <!-- TIMELINE CARD -->
            <div class="detail-card">
              <h3>Timeline</h3>
              ${this.renderTimelineContent()}
            </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>
            <button class="md3-button primary" @click=${this._confirm}>
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiSprout}"></path>
              </svg>
              Add Plants
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
}
