import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiClose } from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/growspace-logbook';

@customElement('logbook-dialog')
export class LogbookDialog extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ type: Boolean }) public open = false;
    @property({ type: String }) public growspaceId = '';

    static styles = [
        dialogStyles,
        css`
      ha-dialog {
        --mdc-dialog-min-width: 90vw;
        --mdc-dialog-max-width: 90vw;
        --mdc-dialog-min-height: 80vh;
        --mdc-dialog-max-height: 90vh;
      }
      
      @media (min-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 600px;
          --mdc-dialog-max-width: 800px;
        }
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      
      .content-wrapper {
        height: 70vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      growspace-logbook {
        flex: 1;
        overflow: hidden;
        margin-top: 16px;
      }
    `
    ];

    private _close() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    render() {
        if (!this.open) return html``;

        return html`
      <ha-dialog
        .open=${this.open}
        @closed=${this._close}
        hideActions
        .heading=${true}
      >
        <div slot="heading" class="dialog-header">
           <h2 class="dialog-title">Events Logbook</h2>
           <button class="md3-button text" @click=${this._close} style="min-width:auto; padding:8px;">
             <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
           </button>
        </div>
        
        <div class="content-wrapper">
          <growspace-logbook
            .hass=${this.hass}
            .growspaceId=${this.growspaceId}
          ></growspace-logbook>
        </div>
      </ha-dialog>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'logbook-dialog': LogbookDialog;
    }
}
