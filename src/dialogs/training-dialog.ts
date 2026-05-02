import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import { hassContext } from '../context';
import { mdiClose, mdiCheck, mdiDumbbell } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui'; // Ensure MD3 components are registered
import { TrainingTechnique } from '../types';
import { GrowspaceStore } from '../store/core/growspace-store';

@customElement('training-dialog')
export class TrainingDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public store!: GrowspaceStore;

  @state() private _technique: string = '';
  @state() private _notes: string = '';
  @state() private _submitting = false;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
        --ha-dialog-width-md: 95vw;
        --ha-dialog-max-width: 98vw;
        --ha-dialog-width-full: 98vw;
        --dialog-content-padding: 0;
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
      .apply-summary {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .apply-target {
        font-weight: 500;
        color: var(--primary-color, #4caf50);
      }
    `,
  ];

  private get _techniques() {
    return Object.values(TrainingTechnique).map((t) => ({
      value: t,
      label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  private _handleClose() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private async _save() {
    if (!this._technique) return;

    this._submitting = true;
    try {
      const activeDialog = this.store.ui.$activeDialog.get();
      if (activeDialog.type !== 'TRAINING') return;

      const { plantIds, growspaceId } = activeDialog.payload;

      await this.hass.callService('growspace_manager', 'log_training_event', {
        technique: this._technique,
        notes: this._notes || undefined,
        growspace_id: growspaceId,
        plant_id: plantIds && plantIds.length > 0 ? plantIds : undefined,
      });

      this.store.ui.showToast('Training logged successfully', 'success');
      this.dispatchEvent(new CustomEvent('data-changed'));
      this._handleClose();
    } catch (e) {
      console.error('Failed to log training:', e);
      this.store.ui.showToast('Failed to log training', 'error');
    } finally {
      this._submitting = false;
    }
  }

  render() {
    if (!this.open) return nothing;

    const activeDialog = this.store.ui.$activeDialog.get();
    if (activeDialog.type !== 'TRAINING') return nothing;

    const { plantIds } = activeDialog.payload;
    const count = plantIds ? plantIds.length : 0;

    // Match standard dialog layout
    const dialogColor = '#9c27b0'; // Purple for learning/training
    const title = 'Log Training';
    const subtitle =
      count > 0
        ? `Recording training for ${count} plant${count !== 1 ? 's' : ''}`
        : 'Record training activity';

    const targetText = count > 0 ? `${count} Selected Plant${count !== 1 ? 's' : ''}` : 'Growspace';

    return html`
      <ha-dialog
        .open=${this.open}
        @closed=${this._handleClose}
        hideActions
        .heading=${title}
        width="full"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="--stage-color: ${dialogColor};">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiDumbbell}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">${title}</h2>
                <gs-help-tooltip
                  content="Record plant training events such as LST, topping, defoliation, or SCROG weaving."
                  placement="bottom"
                  label="Plant Training"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">${subtitle}</div>
            </div>
            <button class="md3-button text" @click=${this._handleClose}>
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

          <div class="dialog-content-grid">
            <div class="form-section">
              <h3>Training Details</h3>
              <md3-select
                .label=${'Technique'}
                .options=${this._techniques}
                .value=${this._technique}
                @change=${(e: CustomEvent) => (this._technique = e.detail)}
                style="margin-bottom: 12px;"
              ></md3-select>

              <div class="apply-summary">
                Targeting: <span class="apply-target">${targetText}</span>
              </div>
            </div>

            <div class="form-section">
              <h3>Notes</h3>
              <ha-textarea
                .label=${'Notes (Optional)'}
                .value=${this._notes}
                @input=${(e: Event) => (this._notes = (e.target as HTMLTextAreaElement).value)}
                autogrow
                style="width: 100%;"
              ></ha-textarea>
            </div>
          </div>

          <div class="button-group">
            <button
              class="md3-button tonal"
              @click=${this._handleClose}
              ?disabled=${this._submitting}
            >
              Cancel
            </button>
            <button
              class="md3-button primary"
              style="background-color: ${dialogColor}; --mdc-theme-primary: ${dialogColor};"
              @click=${() => this._save()}
              ?disabled=${!this._technique || this._submitting}
            >
              <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
              ${this._submitting ? 'Logging...' : 'Log Training'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}
