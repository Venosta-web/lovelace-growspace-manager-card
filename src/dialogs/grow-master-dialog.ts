import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiClose, mdiBrain, mdiMicrophone, mdiNewspaper, mdiInbox } from '@mdi/js';
import { StoreController } from '@nanostores/lit';
import type { HomeAssistant } from 'custom-card-helpers';
import { dialogStyles } from '../styles/dialog.styles';
import { aiMode$, aiBriefing$, fetchBriefing } from '../slices/ai-insight';
import './chat-panel';
import './briefing-panel';
import './inbox-panel';

type AiMode = 'chat' | 'briefing' | 'inbox';

const MODE_META: Record<AiMode, { label: string; icon: string; token: string }> = {
  chat: { label: 'Chat', icon: mdiBrain, token: 'var(--ai-accent, #4caf50)' },
  briefing: { label: 'Briefing', icon: mdiNewspaper, token: 'var(--ai-violet, #9c27b0)' },
  inbox: { label: 'Inbox', icon: mdiInbox, token: 'var(--ai-amber, #ff9800)' },
};

@customElement('grow-master-dialog')
export class GrowMasterDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean }) isStressed = false;
  @property({ type: String }) personality: string | undefined;
  @property({ type: String }) growspaceId: string | undefined;
  @property({ type: String }) growspaceName: string | undefined;
  @property({ attribute: false }) hass: HomeAssistant | undefined;

  private get _growspaceId() { return this.growspaceId ?? ''; }
  private get _growspaceName() { return this.growspaceName ?? ''; }

  private _aiMode = new StoreController(this, aiMode$);

  static styles = [
    dialogStyles,
    css`
      /* ── Shell layout ────────────────────────────────────────── */
      .gm-shell {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 90vh;
        max-height: 90vh;
        overflow: hidden;
      }

      /* ── Header ──────────────────────────────────────────────── */
      .gm-header {
        display: flex;
        align-items: center;
        padding: 16px 24px;
        gap: 12px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        flex-shrink: 0;
      }
      .gm-header-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .gm-header-icon[data-mode='chat'] {
        color: var(--ai-accent, #4caf50);
      }
      .gm-header-icon[data-mode='briefing'] {
        color: var(--ai-violet, #9c27b0);
      }
      .gm-header-icon[data-mode='inbox'] {
        color: var(--ai-amber, #ff9800);
      }
      .gm-header-title-group {
        flex: 1;
      }
      .gm-header-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
      }
      .gm-header-subtitle {
        font-size: 0.85rem;
        opacity: 0.7;
        margin-top: 2px;
        color: var(--secondary-text-color);
      }
      .gm-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--primary-text-color, #fff);
        padding: 8px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gm-close-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      /* ── Body (rail + content) ───────────────────────────────── */
      .gm-body {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      /* ── Nav rail ────────────────────────────────────────────── */
      .gm-nav-rail {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px 8px;
        border-right: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.1));
        width: 72px;
        align-items: center;
        flex-shrink: 0;
      }
      .gm-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 6px;
        border-radius: 12px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        font-size: 0.6875rem;
        font-family: inherit;
        width: 56px;
        transition: background var(--md3-motion-duration-short4, 200ms),
          color var(--md3-motion-duration-short4, 200ms);
      }
      .gm-nav-item:hover {
        background: rgba(255, 255, 255, 0.06);
      }
      .gm-nav-item[aria-pressed='true'][data-mode='chat'] {
        color: var(--ai-accent, #4caf50);
        background: rgba(76, 175, 80, 0.12);
      }
      .gm-nav-item[aria-pressed='true'][data-mode='briefing'] {
        color: var(--ai-violet, #9c27b0);
        background: rgba(156, 39, 176, 0.12);
      }
      .gm-nav-item[aria-pressed='true'][data-mode='inbox'] {
        color: var(--ai-amber, #ff9800);
        background: rgba(255, 152, 0, 0.12);
      }

      /* ── Content area ────────────────────────────────────────── */
      .gm-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .gm-content.no-pad {
        padding: 0;
        overflow: hidden;
      }

      /* ── Panels ──────────────────────────────────────────────── */
      .gm-panel-chat,
      .gm-panel-briefing,
      .gm-panel-inbox {
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex: 1;
      }

      /* ── Legacy chat widgets (preserved) ─────────────────────── */
      .gm-response-box {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 20px;
        line-height: 1.6;
        font-size: 0.95rem;
        white-space: pre-wrap;
        position: relative;
        margin-top: 20px;
      }
      .gm-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: rgba(255, 255, 255, 0.7);
        gap: 12px;
      }
      @keyframes spin {
        100% {
          transform: rotate(360deg);
        }
      }
      .spinner {
        animation: spin 1s linear infinite;
        width: 24px;
        height: 24px;
      }
      .sd-textarea {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        color: #fff;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
        font-size: 1rem;
      }
      .sd-textarea:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.08);
      }

      /* ── Footer ──────────────────────────────────────────────── */
      .gm-footer {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        flex-shrink: 0;
      }
      .gm-disclaimer {
        flex: 1;
        font-size: 0.75rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.45));
        line-height: 1.3;
      }
      .gm-footer-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .gm-mic-btn {
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: not-allowed;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.3));
        opacity: 0.45;
      }
    `,
  ];

  override updated(changedProperties: Map<string | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('open') && this.open && !aiBriefing$.get()) {
      fetchBriefing();
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _setMode(mode: AiMode) {
    aiMode$.set(mode);
    if (mode === 'briefing' && !aiBriefing$.get()) {
      fetchBriefing();
    }
  }

  private _renderNavRail(mode: AiMode) {
    return html`
      <nav class="gm-nav-rail" aria-label="AI mode navigation">
        ${(['chat', 'briefing', 'inbox'] as AiMode[]).map((m) => {
      const meta = MODE_META[m];
      return html`
            <button
              class="gm-nav-item"
              data-mode=${m}
              aria-pressed=${mode === m ? 'true' : 'false'}
              @click=${() => this._setMode(m)}
              title=${meta.label}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d=${meta.icon}></path>
              </svg>
              ${meta.label}
            </button>
          `;
    })}
      </nav>
    `;
  }

  private _renderChatPanel() {
    return html`
      <gm-chat-panel
        style="flex:1;min-height:0;overflow:hidden;"
        growspaceid=${this._growspaceId ?? ''}
        growspacename=${this._growspaceName ?? ''}
        .hass=${this.hass}
      ></gm-chat-panel>
    `;
  }

  private _renderBriefingPanel() {
    return html`
      <gm-briefing-panel
        style="flex:1;min-height:0;overflow:hidden;"
        growspaceid=${this._growspaceId}
        growspacename=${this._growspaceName}
        .hass=${this.hass}
      ></gm-briefing-panel>
    `;
  }

  private _renderInboxPanel() {
    return html`
      <gm-inbox-panel
        style="flex:1;min-height:0;overflow:hidden;"
        growspaceid=${this._growspaceId}
        growspacename=${this._growspaceName}
      ></gm-inbox-panel>
    `;
  }

  private _renderFooter(mode: AiMode) {
    return html`
      <footer class="gm-footer">
        <p class="gm-disclaimer">
          AI-generated advice. Always verify with expert guidance before applying.
        </p>
        <div class="gm-footer-actions">
          ${mode === 'chat' ? nothing : nothing}
          ${mode === 'briefing'
        ? html`<button class="md3-button tonal">Refresh Briefing</button>`
        : nothing}
          ${mode === 'inbox'
        ? html`<button class="md3-button tonal">Mark All Read</button>`
        : nothing}
          <button class="gm-mic-btn" disabled aria-label="Voice input (unavailable)" title="Voice input coming soon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="${mdiMicrophone}"></path>
            </svg>
          </button>
        </div>
      </footer>
    `;
  }

  render() {
    if (!this.open) return html``;

    const mode = this._aiMode.value;
    const meta = MODE_META[mode];
    const title = this.personality ? `Ask the ${this.personality}` : 'Ask the Grow Master';
    const subtitle = this.isStressed ? 'Warning: Plant Stress Detected' : 'All systems normal';

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="full"
      >
        <div class="glass-dialog-container gm-shell">
          <!-- Header -->
          <header class="gm-header dialog-header">
            <div class="gm-header-icon dialog-icon" data-mode=${mode}>
              <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24">
                <path d=${meta.icon}></path>
              </svg>
            </div>
            <div class="gm-header-title-group dialog-title-group">
              <h2 class="gm-header-title dialog-title">${title}</h2>
              <div class="gm-header-subtitle dialog-subtitle">${subtitle}</div>
            </div>
            <button class="gm-close-btn md3-button text" @click=${this._close} aria-label="Close">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </header>

          <!-- Body: rail + content -->
          <div class="gm-body">
            ${this._renderNavRail(mode)}
            <main class="gm-content ${mode === 'chat' ? 'no-pad' : ''}">
              ${mode === 'chat' ? this._renderChatPanel() : nothing}
              ${mode === 'briefing' ? this._renderBriefingPanel() : nothing}
              ${mode === 'inbox' ? this._renderInboxPanel() : nothing}
            </main>
          </div>

          <!-- Footer -->
          ${this._renderFooter(mode)}
        </div>
      </ha-dialog>
    `;
  }
}
