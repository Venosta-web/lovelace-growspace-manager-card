import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import { hassContext } from '../context';
import { mdiClose, mdiCheck, mdiContentCopy } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui'; // Ensure MD3 components are registered
import { PlantEntity } from '../types';
import { GrowspaceStore } from '../store/core/growspace-store';

@customElement('clone-dialog')
export class CloneDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public store!: GrowspaceStore;
  @property({ attribute: false }) public sourcePlant?: PlantEntity;
  @property({ type: Object }) public growspaceOptions: Record<string, string> = {};
  @property({ type: String }) public defaultGrowspace = '';

  @state() private _numClones = 1;
  @state() private _targetGrowspace = '';
  @state() private _submitting = false;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        --mdc-dialog-min-width: clamp(350px, 500px, 90vw);
      }
      .form-section {
        margin-bottom: 24px;
      }
      .form-section h3 {
        margin-top: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        opacity: 0.6;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .source-info {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .source-info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .source-info-row:last-child {
        margin-bottom: 0;
      }
      .source-info-label {
        opacity: 0.7;
      }
      .source-info-value {
        font-weight: 500;
        color: var(--primary-color, #4caf50);
      }
    `,
  ];

  willUpdate(changedProps: Map<string | number | symbol, unknown>) {
    if (changedProps.has('defaultGrowspace') && this.defaultGrowspace && !this._targetGrowspace) {
      this._targetGrowspace = this.defaultGrowspace;
    }
  }

  private _handleClose() {
    this.store.ui.closeDialog();
  }

  private async _save() {
    if (!this.sourcePlant || this._numClones < 1) return;

    this._submitting = true;
    try {
      const plantId =
        this.sourcePlant.attributes?.plant_id || this.sourcePlant.entity_id.replace('sensor.', '');

      this.dispatchEvent(
        new CustomEvent('take-clone-submit', {
          detail: {
            motherPlantId: plantId,
            numClones: Number(this._numClones) || 1,
            targetGrowspaceId: this._targetGrowspace || this.defaultGrowspace,
          },
          bubbles: true,
          composed: true,
        })
      );

      this._handleClose();
    } finally {
      this._submitting = false;
    }
  }

  render() {
    if (!this.open || !this.sourcePlant) return nothing;

    const attrs = this.sourcePlant.attributes;
    const strain = attrs?.strain || 'Unknown Strain';
    const phenotype = attrs?.phenotype || 'No Phenotype';
    const dialogColor = '#8bc34a'; // Light green for cloning
    const title = 'Take Clone';
    const subtitle = `Creating clones from ${strain}`;

    const growspaceEntries = Object.entries(this.growspaceOptions || {});

    return html`
      <ha-dialog
        .open=${this.open}
        @closed=${this._handleClose}
        hideActions
        .heading=${title}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiContentCopy}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">${title}</h2>
              <div class="dialog-subtitle">${subtitle}</div>
            </div>
            <button class="md3-button text" @click=${this._handleClose}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid">
            <div class="detail-card">
              <h3>Source Plant</h3>
              <div class="source-info">
                <div class="source-info-row">
                  <span class="source-info-label">Strain</span>
                  <span class="source-info-value">${strain}</span>
                </div>
                <div class="source-info-row">
                  <span class="source-info-label">Phenotype</span>
                  <span class="source-info-value">${phenotype}</span>
                </div>
              </div>

              <div class="form-section">
                <h3>Clone Settings</h3>
                <md3-number-input
                  label="Number of Clones"
                  .value=${this._numClones}
                  .min=${1}
                  .max=${20}
                  @change=${(e: CustomEvent) => (this._numClones = Number(e.detail) || 1)}
                ></md3-number-input>
              </div>

              <div class="form-section">
                <h3>Target Growspace</h3>
                <md3-select
                  label="Destination"
                  .value=${this._targetGrowspace || this.defaultGrowspace}
                  .options=${growspaceEntries.map(([id, name]) => ({ value: id, label: name }))}
                  @change=${(e: CustomEvent) => (this._targetGrowspace = e.detail)}
                ></md3-select>
              </div>
            </div>
          </div>

          <div class="button-group">
            <button class="md3-button text" @click=${this._handleClose}>Cancel</button>
            <button class="md3-button primary" @click=${this._save} ?disabled=${this._submitting}>
              <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
              ${this._submitting
                ? 'Creating...'
                : `Take ${this._numClones} Clone${this._numClones > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'clone-dialog': CloneDialog;
  }
}
