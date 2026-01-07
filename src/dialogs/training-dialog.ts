import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { HomeAssistant } from 'custom-card-helpers';
import { hassContext } from '../context';
import { sharedStyles } from '../styles/shared.styles';
// import '../components/ui/md3-button'; // Removed
import '../components/ui/md3-select';
// import '../components/ui/md3-text-input'; // It is imported in watering-dialog, so kept if needed.
import '../components/ui/md3-text-input';
import { TrainingTechnique, TrainingDialogState } from '../types';
import { GrowspaceStore } from '../store/growspace-store';

@customElement('training-dialog')
export class TrainingDialog extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    public accessor hass!: HomeAssistant;

    @property({ attribute: false }) public accessor store!: GrowspaceStore;

    @state() private accessor _technique: string = '';
    @state() private accessor _notes: string = '';
    @state() private accessor _submitting = false;



    static styles = [
        sharedStyles,
        css`
      :host {
        display: block;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        margin-top: 16px;
      }
    `
    ];

    private get _techniques() {
        return Object.values(TrainingTechnique).map(t => ({
            value: t,
            label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        }));
    }

    private _handleClose() {
        this.store.ui.closeDialog();
    }

    private async _save() {
        if (!this._technique) return;

        this._submitting = true;
        try {
            const activeDialog = this.store.ui.$activeDialog.get();
            if (activeDialog.type !== 'TRAINING') return;

            const { plantIds, growspaceId } = activeDialog.payload;

            await this.hass.callService(
                'growspace_manager',
                'log_training_event',
                {
                    technique: this._technique,
                    notes: this._notes || undefined,
                    growspace_id: growspaceId,
                    plant_id: plantIds && plantIds.length > 0 ? plantIds : undefined,
                }
            );

            this.store.ui.showToast('Training logged successfully', 'success');
            this._handleClose();
        } catch (e) {
            console.error('Failed to log training:', e);
            this.store.ui.showToast('Failed to log training', 'error');
        } finally {
            this._submitting = false;
        }
    }

    render() {
        const activeDialog = this.store.ui.$activeDialog.get();
        if (activeDialog.type !== 'TRAINING') return nothing;

        const { plantIds } = activeDialog.payload;
        const count = plantIds ? plantIds.length : 0;
        const title = count > 0
            ? `Log Training (${count} plant${count !== 1 ? 's' : ''})`
            : 'Log Training';

        return html`
            <ha-dialog
                open
                .heading=${title}
            >
                <div class="content">
                    <p>Select the technique used and add any optional notes.</p>
                    
                    <ha-combo-box
                        .label=${'Technique'}
                        .items=${this._techniques}
                        .value=${this._technique}
                        @value-changed=${(e: CustomEvent) => this._technique = e.detail.value}
                        required
                        validationMessage="Please select a technique"
                    ></ha-combo-box>

                    <ha-textarea
                        .label=${'Notes (Optional)'}
                        .value=${this._notes}
                        @input=${(e: Event) => this._notes = (e.target as HTMLTextAreaElement).value}
                        autogrow
                    ></ha-textarea>
                </div>
                <div slot="primaryAction" class="actions">
                    <mwc-button 
                        raised 
                        @click=${this._save}
                        ?disabled=${!this._technique || this._submitting}
                    >Log</mwc-button>
                </div>
            </ha-dialog>
        `;
    }
}
