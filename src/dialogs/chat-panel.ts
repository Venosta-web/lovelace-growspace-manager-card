import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { mdiBrain, mdiSend, mdiClose, mdiPin, mdiPinOff, mdiMessageOutline, mdiPaperclip, mdiPlus } from '@mdi/js';
import { StoreController } from '@nanostores/lit';
import type { HomeAssistant } from 'custom-card-helpers';
import {
  activeThreadId$,
  conversationThreads$,
  isAiLoading$,
  aiError$,
  aiEnabled$,
  startConversation,
  sendMessage,
  togglePin,
  applyAction,
  saveAiAgent,
} from '../slices/ai-insight';
import type { ConversationThread, ConversationMessage, SuggestedAction } from '../slices/ai-insight/schema';

type ContextChip = { id: string; label: string; type: 'growspace' | 'time-range' | 'sensor' };

const SUGGESTION_PROMPTS = [
  'What is the current VPD?',
  'How can I optimize my environment?',
  'Are there any plant stress indicators?',
];

@customElement('gm-chat-panel')
export class GmChatPanel extends LitElement {
  @property({ type: String }) growspaceid = '';
  @property({ type: String }) growspacename = '';
  @property({ attribute: false }) hass: HomeAssistant | undefined;

  @state() private _inputText = '';
  @state() private _dismissedActions = new Set<number>();
  @state() private _contextChips: ContextChip[] = [];
  @state() private _pendingAttachment: string | null = null;
  @state() private _selectedAgent = '';
  @state() private _agentSaving = false;
  @state() private _agentSaveError: string | null = null;

  private _activeThread = new StoreController(this, activeThreadId$);
  private _threads = new StoreController(this, conversationThreads$);
  private _loading = new StoreController(this, isAiLoading$);
  private _error = new StoreController(this, aiError$);
  private _aiEnabled = new StoreController(this, aiEnabled$);

  connectedCallback() {
    super.connectedCallback();
    if (this.growspacename) {
      this._contextChips = [
        { id: 'growspace', label: this.growspacename, type: 'growspace' },
      ];
    }
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    /* ── Rail ─────────────────────────────────────────────────── */
    .chat-rail {
      width: 220px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      overflow-y: auto;
    }

    .ai-model-card {
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ai-model-card .model-info { flex: 1; }
    .ai-model-card .model-name { font-size: 0.85rem; font-weight: 500; }
    .ai-model-card .model-cap { font-size: 0.7rem; color: var(--secondary-text-color); }

    .new-chat-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 7px 10px;
      border-radius: 8px;
      background: none;
      border: 1px dashed var(--divider-color, rgba(255,255,255,0.18));
      cursor: pointer;
      color: var(--secondary-text-color);
      font-family: inherit;
      font-size: 0.8rem;
      transition: background 150ms, color 150ms, border-color 150ms;
    }
    .new-chat-btn:hover {
      background: rgba(76,175,80,0.08);
      color: var(--ai-accent, #4caf50);
      border-color: rgba(76,175,80,0.4);
    }

    .rail-section-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
      padding: 0 4px;
      margin-top: 8px;
    }

    .rail-recent { display: flex; flex-direction: column; gap: 2px; }

    .thread-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 7px 8px;
      border-radius: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--primary-text-color);
      font-family: inherit;
      text-align: left;
      width: 100%;
      transition: background 150ms;
    }
    .thread-row:hover { background: rgba(255,255,255,0.05); }
    .thread-row[aria-pressed='true'] {
      background: rgba(76,175,80,0.12);
      color: var(--ai-accent, #4caf50);
    }
    .thread-title {
      font-size: 0.78rem;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }
    .thread-time { font-size: 0.68rem; color: var(--secondary-text-color); margin-top: 2px; }

    /* ── Content area ─────────────────────────────────────────── */
    .chat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    /* ── Welcome ──────────────────────────────────────────────── */
    .welcome {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      gap: 12px;
      text-align: center;
    }
    .welcome-title { font-size: 1.3rem; font-weight: 500; margin: 0; }
    .welcome-lede { font-size: 0.9rem; color: var(--secondary-text-color); margin: 0; }

    .prompt-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      width: 100%;
      max-width: 480px;
      margin-top: 16px;
    }
    .prompt-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      border-radius: 12px;
      padding: 12px 14px;
      cursor: pointer;
      font-size: 0.82rem;
      line-height: 1.4;
      color: var(--primary-text-color);
      text-align: left;
      font-family: inherit;
      transition: background 150ms, border-color 150ms;
    }
    .prompt-card:hover {
      background: rgba(76,175,80,0.1);
      border-color: var(--ai-accent, #4caf50);
    }

    /* ── Thread header ────────────────────────────────────────── */
    .thread-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      flex-shrink: 0;
    }
    .thread-breadcrumb { flex: 1; font-size: 0.85rem; color: var(--secondary-text-color); }

    /* ── Chat area ────────────────────────────────────────────── */
    .chat-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .chat-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Messages ─────────────────────────────────────────────── */
    .msg {
      display: flex;
      gap: 10px;
      max-width: 85%;
    }
    .msg.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .msg.ai { align-self: flex-start; }

    .msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .msg.ai .msg-avatar { color: var(--ai-accent, #4caf50); }

    .msg-bubble {
      background: rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .msg.user .msg-bubble {
      background: rgba(76,175,80,0.18);
      border-radius: 12px 4px 12px 12px;
    }
    .msg.ai .msg-bubble { border-radius: 4px 12px 12px 12px; }

    .msg-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .msg-label { font-size: 0.75rem; font-weight: 600; }
    .conf {
      font-size: 0.68rem;
      padding: 1px 6px;
      border-radius: 20px;
      background: rgba(76,175,80,0.25);
      color: var(--ai-accent, #4caf50);
    }
    .conf.mid {
      background: rgba(255,152,0,0.25);
      color: var(--ai-amber, #ff9800);
    }

    /* ── Data snap ────────────────────────────────────────────── */
    .data-snap {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 10px;
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      padding: 8px;
    }
    .snap-cell { text-align: center; }
    .snap-value { font-size: 1rem; font-weight: 600; }
    .snap-unit { font-size: 0.7rem; color: var(--secondary-text-color); }
    .snap-delta { font-size: 0.68rem; color: var(--ai-accent, #4caf50); }

    /* ── Action card ──────────────────────────────────────────── */
    .act-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--divider-color, rgba(255,255,255,0.12));
      border-radius: 10px;
      padding: 10px 12px;
    }
    .act-title { font-size: 0.82rem; font-weight: 600; }
    .act-desc { font-size: 0.8rem; color: var(--secondary-text-color); }
    .act-buttons { display: flex; gap: 8px; margin-top: 4px; }
    .apply-btn, .dismiss-btn {
      font-size: 0.78rem;
      padding: 4px 12px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
      font-family: inherit;
    }
    .apply-btn {
      background: var(--ai-accent, #4caf50);
      color: #fff;
    }
    .dismiss-btn {
      background: rgba(255,255,255,0.08);
      color: var(--primary-text-color);
    }

    /* ── Citations ────────────────────────────────────────────── */
    .cite-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .cite-chip {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 20px;
      background: rgba(255,255,255,0.07);
      color: var(--secondary-text-color);
      border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    /* ── Typing indicator ─────────────────────────────────────── */
    .typing {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      color: var(--secondary-text-color);
    }
    .typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      animation: bounce 1.2s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* ── Composer ─────────────────────────────────────────────── */
    .composer {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 16px 12px;
      border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }
    .suggest-strip {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .suggest-chip {
      flex-shrink: 0;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid var(--divider-color, rgba(255,255,255,0.12));
      background: rgba(255,255,255,0.05);
      color: var(--primary-text-color);
      cursor: pointer;
      font-family: inherit;
      white-space: nowrap;
      transition: background 150ms;
    }
    .suggest-chip:hover { background: rgba(76,175,80,0.12); }

    .composer-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .ctx-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      padding: 3px 8px 3px 10px;
      border-radius: 20px;
      background: rgba(76,175,80,0.12);
      border: 1px solid rgba(76,175,80,0.3);
      color: var(--ai-accent, #4caf50);
    }
    .remove-chip {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      display: flex;
      align-items: center;
      padding: 0;
      opacity: 0.7;
      line-height: 1;
    }

    .composer-input {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .composer-textarea {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
      border-radius: 12px;
      padding: 10px 12px;
      color: var(--primary-text-color, #fff);
      font-family: inherit;
      font-size: 0.9rem;
      resize: none;
      min-height: 40px;
      max-height: 140px;
      line-height: 1.4;
      box-sizing: border-box;
    }
    .composer-textarea:focus {
      outline: none;
      border-color: rgba(76,175,80,0.5);
    }
    .send {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--ai-accent, #4caf50);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #fff;
      transition: opacity 150ms;
    }
    .send:disabled { opacity: 0.4; cursor: default; }

    /* ── Attach button ────────────────────────────────────────── */
    .attach-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: none;
      border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--secondary-text-color);
      transition: background 150ms, color 150ms;
    }
    .attach-btn:hover { background: rgba(255,255,255,0.07); color: var(--primary-text-color); }

    input[type='file'] { display: none; }

    /* ── Attachment preview ───────────────────────────────────── */
    .attachment-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
    }
    .attachment-preview img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255,255,255,0.12));
    }
    .remove-attachment {
      background: rgba(255,255,255,0.08);
      border: none;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
    }

    /* ── Agent setup banner ───────────────────────────────────── */
    .agent-setup-banner {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(255, 152, 0, 0.08);
      border-bottom: 1px solid rgba(255, 152, 0, 0.2);
      flex-shrink: 0;
    }
    .agent-setup-label {
      font-size: 0.78rem;
      color: var(--ai-amber, #ff9800);
    }
    .agent-setup-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .agent-setup-picker {
      flex: 1;
    }
    .agent-save-btn {
      flex-shrink: 0;
      font-size: 0.78rem;
      padding: 6px 14px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
      font-family: inherit;
      background: var(--ai-amber, #ff9800);
      color: #fff;
      transition: opacity 150ms;
    }
    .agent-save-btn:disabled { opacity: 0.4; cursor: default; }
    .agent-setup-error {
      font-size: 0.72rem;
      color: var(--error-color, #f44336);
    }

    .composer--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* ── Composer error ───────────────────────────────────────── */
    .composer-error {
      font-size: 0.78rem;
      color: var(--error-color, #f44336);
      padding: 4px 2px 0;
    }

    /* ── Pin button ──────────────────────────────────────────── */
    .pin-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color, rgba(255,255,255,0.4));
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 4px;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 150ms, color 150ms;
    }
    .thread-row:hover .pin-btn,
    .thread-header .pin-btn { opacity: 1; }
    .pin-btn.pinned { color: var(--ai-accent, #4caf50); opacity: 1; }
    .pin-btn:hover { color: var(--primary-text-color, #fff); }

    /* ── Message image thumbnail ──────────────────────────────── */
    .msg-image {
      display: block;
      max-width: 200px;
      border-radius: 8px;
      margin-top: 6px;
      border: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }
  `;

  private _getActiveThread(): ConversationThread | undefined {
    const activeMap = this._activeThread.value;
    if (!(activeMap instanceof Map)) return undefined;
    const threadId = activeMap.get(this.growspaceid) ?? null;
    if (!threadId) return undefined;
    return this._threads.value.get(threadId);
  }

  private _setActiveThread(threadId: string) {
    const map = new Map(activeThreadId$.get());
    map.set(this.growspaceid, threadId);
    activeThreadId$.set(map);
  }

  private _newConversation() {
    const map = new Map(activeThreadId$.get());
    map.set(this.growspaceid, null);
    activeThreadId$.set(map);
  }

  private _handleInput(e: Event) {
    this._inputText = (e.target as HTMLTextAreaElement).value;
  }

  private async _send() {
    const text = this._inputText.trim();
    if (!text) return;
    this._inputText = '';
    const attachment = this._pendingAttachment ?? undefined;
    this._pendingAttachment = null;
    const threadId = this._activeThread.value.get(this.growspaceid) ?? null;
    if (threadId) {
      await sendMessage(threadId, text, attachment);
    } else {
      await startConversation(this.growspaceid, text, attachment);
    }
  }

  private _openFilePicker() {
    this.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  }

  private _onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this._pendingAttachment = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private _removeAttachment() {
    this._pendingAttachment = null;
  }

  private async _clickPrompt(prompt: string) {
    await startConversation(this.growspaceid, prompt);
  }

  private _clickSuggest(prompt: string) {
    this._inputText = prompt;
  }

  private _removeCtxChip(id: string) {
    this._contextChips = this._contextChips.filter((c) => c.id !== id);
  }

  private _renderThreadRow(t: ConversationThread, activeId: string | null) {
    const firstMsg = t.messages[0];
    const isActive = t.thread_id === activeId;
    return html`
      <button
        class="thread-row"
        data-thread-id=${t.thread_id}
        aria-pressed=${isActive ? 'true' : 'false'}
        @click=${() => this._setActiveThread(t.thread_id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;margin-top:2px">
          <path d=${mdiMessageOutline}></path>
        </svg>
        <div style="flex:1;min-width:0;">
          <div class="thread-title">${firstMsg?.text ?? 'New conversation'}</div>
          <div class="thread-time">${this._relTime(firstMsg?.timestamp)}</div>
        </div>
        <button
          class="pin-btn ${t.pinned ? 'pinned' : ''}"
          aria-label=${t.pinned ? 'Unpin conversation' : 'Pin conversation'}
          @click=${(e: Event) => { e.stopPropagation(); togglePin(t.thread_id); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d=${t.pinned ? mdiPinOff : mdiPin}></path>
          </svg>
        </button>
      </button>
    `;
  }

  private _renderThreadRail() {
    const allThreads = [...this._threads.value.values()].filter(
      (t) => t.growspace_id === this.growspaceid
    );
    const pinned = allThreads.filter((t) => t.pinned).sort((a, b) => b.updated_at - a.updated_at);
    const recent = allThreads.filter((t) => !t.pinned).sort((a, b) => b.updated_at - a.updated_at);
    const activeMap = this._activeThread.value;
    const activeId = (activeMap instanceof Map ? activeMap.get(this.growspaceid) : null) ?? null;
    return html`
      <div class="chat-rail">
        <div class="ai-model-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color:var(--ai-accent,#4caf50)">
            <path d=${mdiBrain}></path>
          </svg>
          <div class="model-info">
            <div class="model-name">Grow Master</div>
            <div class="model-cap">AI cultivation assistant</div>
          </div>
        </div>

        <button class="new-chat-btn" @click=${this._newConversation}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d=${mdiPlus}></path>
          </svg>
          New conversation
        </button>

        ${pinned.length > 0 ? html`
          <div class="rail-section-label">Pinned</div>
          <div class="rail-recent">
            ${repeat(pinned, (t) => t.thread_id, (t) => this._renderThreadRow(t, activeId))}
          </div>
        ` : nothing}

        ${recent.length > 0 ? html`
          <div class="rail-section-label">Recent</div>
          <div class="rail-recent">
            ${repeat(recent, (t) => t.thread_id, (t) => this._renderThreadRow(t, activeId))}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _relTime(ts: number | undefined): string {
    if (!ts) return '';
    const diff = Date.now() / 1000 - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  private _renderWelcome(aiUnavailable: boolean) {
    return html`
      <div class="welcome">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="color:var(--ai-accent,#4caf50)">
          <path d=${mdiBrain}></path>
        </svg>
        <h3 class="welcome-title">Good morning, grower</h3>
        <p class="welcome-lede">Ask me anything about your grow — I'll analyze your data and suggest actions.</p>
        <div class="prompt-grid">
          ${SUGGESTION_PROMPTS.concat('What nutrients should I adjust?').map((p) => html`
            <button class="prompt-card" ?disabled=${aiUnavailable} @click=${() => this._clickPrompt(p)}>${p}</button>
          `)}
        </div>
      </div>
      ${this._renderComposer(aiUnavailable)}
    `;
  }

  private _confidenceLevel(conf: number | undefined): 'high' | 'mid' | 'low' {
    if (conf === undefined) return 'high';
    if (conf >= 0.8) return 'high';
    if (conf >= 0.5) return 'mid';
    return 'low';
  }

  private _renderMessage(msg: ConversationMessage, index: number) {
    const isUser = msg.role === 'user';
    const initials = 'U';
    const confLevel = this._confidenceLevel(msg.confidence);
    const dismissed = this._dismissedActions.has(index);

    return html`
      <div class="msg ${msg.role}">
        <div class="msg-avatar">
          ${isUser ? initials : html`
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d=${mdiBrain}></path>
            </svg>
          `}
        </div>
        <div class="msg-bubble">
          ${!isUser ? html`
            <div class="msg-meta">
              <span class="msg-label">Grow Master</span>
              ${msg.confidence !== undefined ? html`
                <span class="conf ${confLevel === 'mid' ? 'mid' : ''}">${Math.round(msg.confidence * 100)}%</span>
              ` : nothing}
            </div>
          ` : nothing}
          ${msg.imageEntityId ? html`
            <img class="msg-image" src=${msg.imageEntityId} alt="Attached image" />
          ` : nothing}
          ${msg.text}
          ${msg.sensorSnapshot && msg.sensorSnapshot.length > 0 ? html`
            <div class="data-snap">
              ${msg.sensorSnapshot.map((s) => html`
                <div class="snap-cell">
                  <div class="snap-value">${s.value}</div>
                  <div class="snap-unit">${s.unit}</div>
                  ${s.delta ? html`<div class="snap-delta">${s.delta}</div>` : nothing}
                </div>
              `)}
            </div>
          ` : nothing}
          ${msg.suggestedAction && !dismissed ? html`
            <div class="act-card">
              <div class="act-title">${msg.suggestedAction.description}</div>
              <div class="act-desc">${msg.suggestedAction.service}</div>
              <div class="act-buttons">
                <button class="apply-btn" @click=${() => applyAction(msg.suggestedAction as SuggestedAction)}>Apply</button>
                <button class="dismiss-btn" @click=${() => this._dismiss(index)}>Dismiss</button>
              </div>
            </div>
          ` : nothing}
          ${msg.citations && msg.citations.length > 0 ? html`
            <div class="cite-row">
              ${msg.citations.map((c) => html`
                <span class="cite-chip">${c.label}</span>
              `)}
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _dismiss(index: number) {
    this._dismissedActions = new Set([...this._dismissedActions, index]);
  }

  private _renderComposer(disabled = false) {
    const hasText = this._inputText.trim().length > 0;
    const error = this._error.value;
    return html`
      <div class="composer ${disabled ? 'composer--disabled' : ''}">
        <div class="suggest-strip">
          ${SUGGESTION_PROMPTS.map((p) => html`
            <button class="suggest-chip" @click=${() => this._clickSuggest(p)}>${p}</button>
          `)}
        </div>
        ${this._contextChips.length > 0 ? html`
          <div class="composer-chips">
            ${this._contextChips.map((chip) => html`
              <div class="ctx-chip" data-chip-id=${chip.id}>
                ${chip.label}
                <button class="remove-chip" aria-label="Remove ${chip.label}" @click=${() => this._removeCtxChip(chip.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d=${mdiClose}></path>
                  </svg>
                </button>
              </div>
            `)}
          </div>
        ` : nothing}
        ${this._pendingAttachment ? html`
          <div class="attachment-preview">
            <img src=${this._pendingAttachment} alt="Attachment preview" />
            <button class="remove-attachment" aria-label="Remove attachment" @click=${this._removeAttachment}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d=${mdiClose}></path>
              </svg>
            </button>
          </div>
        ` : nothing}
        <div class="composer-input">
          <input type="file" accept="image/*" @change=${this._onFileSelected} />
          <button class="attach-btn" aria-label="Attach image" ?disabled=${disabled} @click=${this._openFilePicker}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d=${mdiPaperclip}></path>
            </svg>
          </button>
          <textarea
            class="composer-textarea"
            placeholder="Ask anything about your grow..."
            rows="1"
            ?disabled=${disabled}
            .value=${this._inputText}
            @input=${this._handleInput}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._send();
              }
            }}
          ></textarea>
          <button class="send" ?disabled=${!hasText || disabled} @click=${this._send} aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d=${mdiSend}></path>
            </svg>
          </button>
        </div>
        ${error ? html`<div class="composer-error">${error}</div>` : nothing}
      </div>
    `;
  }

  private _renderThread(thread: ConversationThread, aiUnavailable: boolean) {
    const isLoading = this._loading.value;
    return html`
      <div class="chat-area">
        <div class="thread-header">
          <span class="thread-breadcrumb">Chat / ${thread.messages[0]?.text?.slice(0, 40) ?? 'Conversation'}</span>
          <button
            class="pin-btn ${thread.pinned ? 'pinned' : ''}"
            aria-label=${thread.pinned ? 'Unpin conversation' : 'Pin conversation'}
            title=${thread.pinned ? 'Unpin' : 'Pin this conversation'}
            @click=${() => togglePin(thread.thread_id)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d=${thread.pinned ? mdiPinOff : mdiPin}></path>
            </svg>
          </button>
        </div>
        <div class="chat-scroll">
          ${thread.messages.map((msg, i) => this._renderMessage(msg, i))}
          ${isLoading ? html`
            <div class="typing">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          ` : nothing}
        </div>
        ${this._renderComposer(aiUnavailable)}
      </div>
    `;
  }

  private async _saveAgent() {
    if (!this._selectedAgent) return;
    this._agentSaving = true;
    this._agentSaveError = null;
    try {
      await saveAiAgent(this._selectedAgent, this.growspaceid);
    } catch (err) {
      this._agentSaveError = err instanceof Error ? err.message : 'Failed to save agent';
    } finally {
      this._agentSaving = false;
    }
  }

  private _renderAgentSetup() {
    return html`
      <div class="agent-setup-banner">
        <span class="agent-setup-label">No AI agent configured — select one to enable chat:</span>
        <div class="agent-setup-row">
          <div class="agent-setup-picker">
            <ha-entity-picker
              .hass=${this.hass}
              .value=${this._selectedAgent}
              .includeDomains=${['conversation']}
              allow-custom-entity
              @value-changed=${(e: CustomEvent) => { this._selectedAgent = e.detail.value ?? ''; }}
            ></ha-entity-picker>
          </div>
          <button
            class="agent-save-btn"
            ?disabled=${!this._selectedAgent || this._agentSaving}
            @click=${this._saveAgent}
          >${this._agentSaving ? 'Saving…' : 'Enable AI'}</button>
        </div>
        ${this._agentSaveError ? html`<div class="agent-setup-error">${this._agentSaveError}</div>` : nothing}
      </div>
    `;
  }

  render() {
    const thread = this._getActiveThread();
    const aiUnavailable = this._aiEnabled.value === false;
    return html`
      ${this._renderThreadRail()}
      <div class="chat-content">
        ${aiUnavailable ? this._renderAgentSetup() : nothing}
        ${thread ? this._renderThread(thread, aiUnavailable) : this._renderWelcome(aiUnavailable)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gm-chat-panel': GmChatPanel;
  }
}
