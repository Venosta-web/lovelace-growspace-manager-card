import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext } from '../context';
import { mdiContentCopy, mdiCheck } from '@mdi/js';
import '../features/shared/ui/gs-dialog';
import type { BatchCloneDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import type { GrowspaceStore } from '../store/core/growspace-store';

@customElement('batch-clone-dialog')
export class BatchCloneDialog extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: BatchCloneDialogState | undefined;
  @property({ type: Object }) public growspaceOptions: Record<string, string> = {};

  @state() private _numClones = 1;
  @state() private _targetGrowspaceId = '';
  @state() private _isSubmitting = false;
  @state() private _progress = 0;

  static styles = [
    dialogStyles,
    css`
      .clones-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
      }
      .clones-row label {
        font-size: 0.9rem;
        opacity: 0.7;
        white-space: nowrap;
      }
      .clones-input {
        width: 80px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: var(--primary-text-color, #fff);
        font-size: 1rem;
        padding: 8px 12px;
        text-align: center;
      }
      .clones-input:focus {
        outline: none;
        border-color: var(--primary-color, #4caf50);
      }
      .progress-bar-wrap {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        height: 6px;
        margin-top: 16px;
        overflow: hidden;
      }
      .progress-bar {
        background: var(--primary-color, #4caf50);
        height: 100%;
        transition: width 0.3s ease;
      }
    `,
  ];

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('open') && this.open) {
      this._resetForm();
    }
    if (changedProps.has('growspaceOptions') && !this._targetGrowspaceId) {
      const firstId = Object.keys(this.growspaceOptions)[0];
      if (firstId) this._targetGrowspaceId = firstId;
    }
  }

  private _resetForm() {
    this._isSubmitting = false;
    this._progress = 0;
    this._numClones = 1;
    const firstId = Object.keys(this.growspaceOptions)[0];
    this._targetGrowspaceId = firstId ?? '';
  }

  private async _submit() {
    if (!this.store || !this.dialogState) return;
    const { plantIds } = this.dialogState;
    if (plantIds.length === 0 || !this._targetGrowspaceId) return;

    this._isSubmitting = true;
    this._progress = 0;

    const errors: string[] = [];
    let completed = 0;

    for (const plantId of plantIds) {
      const devices = this.store.data.$devices.get();
      let motherPlant;
      for (const device of devices) {
        motherPlant = device.plants?.find(
          (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId
        );
        if (motherPlant) break;
      }

      if (!motherPlant) {
        errors.push(plantId);
        completed++;
        this._progress = Math.round((completed / plantIds.length) * 100);
        continue;
      }

      try {
        await this.store.actions.plant.takeClone(motherPlant, this._numClones, this._targetGrowspaceId);
      } catch (_e) {
        errors.push(plantId);
      }
      completed++;
      this._progress = Math.round((completed / plantIds.length) * 100);
    }

    this._isSubmitting = false;

    const totalClones = plantIds.length * this._numClones;
    if (errors.length === 0) {
      this.store.actions.ui.toast(`Created ${totalClones} clone(s) successfully`, 'success');
    } else {
      this.store.actions.ui.toast(`Completed with ${errors.length} error(s)`, 'error');
    }

    this._close();
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  protected render() {
    const plantIds = this.dialogState?.plantIds ?? [];
    const growspaceEntries = Object.entries(this.growspaceOptions);
    const totalClones = plantIds.length * this._numClones;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Clone Selected Plants"
        .subtitle=${`${plantIds.length} plant(s) selected`}
        .iconPath=${mdiContentCopy}
        stageColor="#8bc34a"
        .submitting=${this._isSubmitting}
        @close=${this._close}
      >
        <div class="dialog-content-grid" style="display: block;">
          <div class="form-section">
            <h3>Target Growspace</h3>
            <md3-select
              label="Destination"
              .value=${this._targetGrowspaceId}
              .options=${growspaceEntries.map(([id, name]) => ({ value: id, label: name }))}
              @change=${(e: CustomEvent) => { this._targetGrowspaceId = e.detail; }}
            ></md3-select>

            <div class="clones-row">
              <label>Clones per plant</label>
              <input
                class="clones-input"
                type="number"
                min="1"
                max="20"
                .value=${String(this._numClones)}
                @input=${(e: InputEvent) => {
                  const v = parseInt((e.target as HTMLInputElement).value, 10);
                  if (!isNaN(v) && v >= 1 && v <= 20) this._numClones = v;
                }}
              />
            </div>
          </div>

          ${this._isSubmitting ? html`
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width: ${this._progress}%"></div>
            </div>
          ` : nothing}
        </div>

        <div class="button-group">
          <button class="md3-button tonal" @click=${this._close} ?disabled=${this._isSubmitting}>
            Cancel
          </button>
          <button
            class="md3-button primary"
            style="background-color: #8bc34a; --mdc-theme-primary: #8bc34a;"
            @click=${this._submit}
            ?disabled=${this._isSubmitting || !this._targetGrowspaceId}
          >
            <ha-svg-icon .path=${mdiCheck} style="margin-right: 8px;"></ha-svg-icon>
            ${this._isSubmitting
              ? `Cloning... ${this._progress}%`
              : `Create ${totalClones} Clone${totalClones !== 1 ? 's' : ''}`}
          </button>
        </div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'batch-clone-dialog': BatchCloneDialog;
  }
}
