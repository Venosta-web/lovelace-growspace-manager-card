import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiFormatListBulleted, mdiChartTimelineVariant } from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/growspace-logbook';
import '../features/shared/ui/growspace-timeline';
import '../features/shared/ui/gs-help-tooltip';
import '../features/shared/ui/quick-note-input';

import { consume } from '@lit/context';
import { hassContext } from '../context';
import { addGrowspaceNote } from '../slices/logbook';

type LogbookTab = 'list' | 'timeline';

@customElement('logbook-dialog')
export class LogbookDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @property({ type: Boolean }) public open = false;
  @property({ type: String }) public growspaceId = '';

  @state() private _activeTab: LogbookTab = 'list';

  static styles = [
    dialogStyles,
    css`
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dialog-title-group {
        display: flex;
        flex-direction: column;
      }

      .dialog-subtitle {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }

      .content-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
        padding: 16px 24px;
      }

      .tab-bar {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        padding-bottom: 2px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.9rem;
      }

      .tab svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .tab:hover {
        color: var(--primary-text-color, #fff);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }

      .tab.active {
        color: var(--primary-color, #4caf50);
        border-bottom-color: var(--primary-color, #4caf50);
      }

      .list-view-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      growspace-logbook {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      quick-note-input {
        flex-shrink: 0;
        padding-top: 8px;
      }

      .timeline-placeholder {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--secondary-text-color);
      }
    `,
  ];

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private async _handleNoteSubmit(e: CustomEvent) {
    const noteInput = this.shadowRoot?.querySelector('quick-note-input') as any;
    if (!noteInput) return;

    noteInput.setSaving(true);
    try {
      await addGrowspaceNote(this.growspaceId, {
        notes: e.detail.text,
        images: e.detail.images,
      });
      noteInput.clear();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));
    } catch (err) {
      console.error('Error adding growspace note:', err);
      noteInput.setSaving(false);
    }
  }

  render() {
    if (!this.open) return html``;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Events Logbook"
        subtitle="Recent events and history"
        .iconPath=${mdiFormatListBulleted}
        .containerStyle=${'height: 85vh'}
        @close=${this._close}
      >
        <gs-help-tooltip
          slot="header-extra"
          content="Free-form grow log — add notes, observations, or reminders tied to today's date."
          placement="bottom"
          label="Events Logbook"
        ></gs-help-tooltip>

        <div class="content-wrapper">
          <!-- Tab Switcher -->
          <div class="tab-bar">
            <button
              class="tab ${this._activeTab === 'list' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'list')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiFormatListBulleted}"></path></svg>
              <span>List View</span>
            </button>
            <button
              class="tab ${this._activeTab === 'timeline' ? 'active' : ''}"
              @click=${() => (this._activeTab = 'timeline')}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiChartTimelineVariant}"></path></svg>
              <span>Timeline</span>
            </button>
          </div>

          <!-- Content -->
          ${this._activeTab === 'list'
            ? html`
                <div class="list-view-container">
                  <growspace-logbook
                    .hass=${this.hass}
                    .growspaceId=${this.growspaceId}
                  ></growspace-logbook>
                  <quick-note-input
                    placeholder="Add a growspace note..."
                    @submit=${this._handleNoteSubmit}
                  ></quick-note-input>
                </div>
              `
            : this._activeTab === 'timeline'
              ? html`
                  <growspace-timeline
                    .hass=${this.hass}
                    .growspaceId=${this.growspaceId}
                  ></growspace-timeline>
                `
              : nothing}
        </div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'logbook-dialog': LogbookDialog;
  }
}
