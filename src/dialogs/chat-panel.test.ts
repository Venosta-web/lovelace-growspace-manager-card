import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import {
  activeThreadId$,
  conversationThreads$,
  isAiLoading$,
  aiError$,
  aiEnabled$,
} from '../slices/ai-insight';
/* eslint-disable import/no-duplicates */
import './chat-panel';
import { GmChatPanel } from './chat-panel';
/* eslint-enable import/no-duplicates */

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

import * as hassCallMod from '../services/hass-call';

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon', 'ha-entity-picker'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GS_ID = 'gs1';
const THREAD_ID = 'thread-1';
const NOW_S = Math.floor(Date.now() / 1000);

const USER_MSG = {
  role: 'user' as const,
  text: 'What is the current VPD?',
  timestamp: NOW_S - 300,
};

const AI_MSG = {
  role: 'ai' as const,
  text: 'VPD looks optimal at 1.2 kPa.',
  timestamp: NOW_S - 290,
  confidence: 0.9,
};

const THREAD = {
  thread_id: THREAD_ID,
  growspace_id: GS_ID,
  messages: [USER_MSG, AI_MSG],
  pinned: false,
  updated_at: NOW_S,
};

function setActiveThread(overrides?: Partial<typeof THREAD>): void {
  const t = { ...THREAD, ...overrides };
  conversationThreads$.set(new Map([[t.thread_id, t]]));
  activeThreadId$.set(new Map([[GS_ID, t.thread_id]]));
}

function stubFileReader(dataUrl: string): void {
  vi.stubGlobal(
    'FileReader',
    class {
      onload: (() => void) | null = null;
      result: string = dataUrl;
      readAsDataURL(_file: File) {
        Promise.resolve().then(() => this.onload?.());
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  conversationThreads$.set(new Map());
  activeThreadId$.set(new Map());
  isAiLoading$.set(false);
  aiError$.set(null);
  aiEnabled$.set(null);
  vi.clearAllMocks();
  vi.mocked(hassCallMod.hassCall).mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Slice 1 — Welcome state
// ---------------------------------------------------------------------------

describe('GmChatPanel — welcome state', () => {
  it('renders .welcome when no active thread exists', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.welcome')).not.toBeNull();
  });

  it('renders 4 .prompt-card buttons in the welcome grid', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.prompt-card').length).toBe(4);
  });

  it('clicking a prompt card calls hassCall with start_conversation', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't-new',
      growspace_id: GS_ID,
      messages: [],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.prompt-card')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ growspace_id: GS_ID }),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Composer send flow
// ---------------------------------------------------------------------------

describe('GmChatPanel — composer', () => {
  it('send button is disabled when textarea is empty', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.send')!.disabled).toBe(true);
  });

  it('send button is enabled when textarea has text', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = 'Test';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.send')!.disabled).toBe(false);
  });

  it('calls hassCall with start_conversation when no thread is active', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = 'How is my grow?';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ growspace_id: GS_ID, message: 'How is my grow?' }),
      expect.anything(),
    );
  });

  it('calls hassCall with send_message when a thread is active', async () => {
    setActiveThread();

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = 'Follow-up question';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/send_message',
      expect.objectContaining({ conversation_id: THREAD_ID, message: 'Follow-up question' }),
      expect.anything(),
    );
  });

  it('clears textarea immediately after clicking send', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = 'Some message';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!.value).toBe('');
  });

  it('Enter key in textarea triggers send', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = 'VPD question';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ message: 'VPD question' }),
      expect.anything(),
    );
  });

  it('Shift+Enter does not trigger send', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = 'Draft text';
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — Composer error display
// ---------------------------------------------------------------------------

describe('GmChatPanel — composer error display', () => {
  it('renders .composer-error when aiError$ is set', async () => {
    aiError$.set('Connection timeout');

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const errEl = el.shadowRoot!.querySelector('.composer-error');
    expect(errEl).not.toBeNull();
    expect(errEl!.textContent).toContain('Connection timeout');
  });

  it('does not render .composer-error when aiError$ is null', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.composer-error')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — Suggestion chips
// ---------------------------------------------------------------------------

describe('GmChatPanel — suggestion chips', () => {
  it('renders .suggest-chip buttons in the composer', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.suggest-chip').length).toBeGreaterThan(0);
  });

  it('clicking a suggest chip populates the textarea', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector<HTMLElement>('.suggest-chip')!;
    const chipText = chip.textContent!.trim();
    chip.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!.value).toBe(chipText);
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — Attach button
// ---------------------------------------------------------------------------

describe('GmChatPanel — attach button', () => {
  it('renders .attach-btn in the composer', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.attach-btn')).not.toBeNull();
  });

  it('renders a hidden file input in the composer', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — Attachment preview
// ---------------------------------------------------------------------------

describe('GmChatPanel — attachment preview', () => {
  const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

  async function selectFile(el: GmChatPanel, dataUrl = DATA_URL): Promise<void> {
    stubFileReader(dataUrl);
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!;
    const fakeFile = new File(['img'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [fakeFile], configurable: true });
    input.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;
  }

  it('shows .attachment-preview after a file is selected', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    await selectFile(el);

    expect(el.shadowRoot!.querySelector('.attachment-preview')).not.toBeNull();
  });

  it('shows an img tag with the data URL inside .attachment-preview', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    await selectFile(el);

    const img = el.shadowRoot!.querySelector<HTMLImageElement>('.attachment-preview img');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('base64');
  });

  it('remove button in .attachment-preview clears the attachment', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    await selectFile(el);
    expect(el.shadowRoot!.querySelector('.attachment-preview')).not.toBeNull();

    el.shadowRoot!.querySelector<HTMLElement>('.remove-attachment')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.attachment-preview')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 7 — imageEntityId wire-up
// ---------------------------------------------------------------------------

describe('GmChatPanel — imageEntityId wire-up', () => {
  const DATA_URL = 'data:image/png;base64,abc';

  async function attachAndType(el: GmChatPanel, text: string): Promise<void> {
    stubFileReader(DATA_URL);
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      value: [new File(['img'], 'photo.png', { type: 'image/png' })],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    await el.updateComplete;
  }

  it('passes image entity id in start_conversation when attachment is pending', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't-new',
      growspace_id: GS_ID,
      messages: [],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    await attachAndType(el, 'Check this image');
    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ image_entities: [DATA_URL] }),
      expect.anything(),
    );
  });

  it('passes image entity id in send_message when attachment is pending', async () => {
    setActiveThread();
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: THREAD_ID,
      growspace_id: GS_ID,
      messages: [],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    await attachAndType(el, 'See this');
    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/send_message',
      expect.objectContaining({ image_entities: [DATA_URL] }),
      expect.anything(),
    );
  });

  it('clears pendingAttachment after sending', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't-new',
      growspace_id: GS_ID,
      messages: [],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    await attachAndType(el, 'Message with attachment');
    expect(el.shadowRoot!.querySelector('.attachment-preview')).not.toBeNull();

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.attachment-preview')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 8 — Thread rail
// ---------------------------------------------------------------------------

describe('GmChatPanel — thread rail', () => {
  it('renders .chat-rail', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.chat-rail')).not.toBeNull();
  });

  it('renders a .thread-row for each thread in the growspace', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [USER_MSG], pinned: false, updated_at: NOW_S }],
      ['t2', { thread_id: 't2', growspace_id: GS_ID, messages: [{ ...USER_MSG, text: 'Second' }], pinned: false, updated_at: NOW_S - 10 }],
    ]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.thread-row').length).toBe(2);
  });

  it('does not render threads from other growspaces', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'other-gs', messages: [USER_MSG], pinned: false, updated_at: NOW_S }],
    ]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-row')).toBeNull();
  });

  it('active thread row has aria-pressed="true"', async () => {
    setActiveThread();

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-row[aria-pressed="true"]')).not.toBeNull();
  });

  it('clicking an inactive thread row switches to that thread', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [USER_MSG], pinned: false, updated_at: NOW_S }],
      ['t2', { thread_id: 't2', growspace_id: GS_ID, messages: [{ ...USER_MSG, text: 'Second' }], pinned: false, updated_at: NOW_S - 10 }],
    ]));
    activeThreadId$.set(new Map([[GS_ID, 't1']]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.thread-row[data-thread-id="t2"]')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.chat-area')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.welcome')).toBeNull();
  });

  it('renders a Pinned section when pinned threads exist', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [USER_MSG], pinned: true, updated_at: NOW_S }],
    ]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const labels = [...el.shadowRoot!.querySelectorAll('.rail-section-label')];
    expect(labels.some((l) => l.textContent!.toLowerCase().includes('pinned'))).toBe(true);
  });

  it('renders a Recent section when unpinned threads exist', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [USER_MSG], pinned: false, updated_at: NOW_S }],
    ]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const labels = [...el.shadowRoot!.querySelectorAll('.rail-section-label')];
    expect(labels.some((l) => l.textContent!.toLowerCase().includes('recent'))).toBe(true);
  });

  it('New conversation button clears the active thread', async () => {
    setActiveThread();

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.chat-area')).not.toBeNull();

    el.shadowRoot!.querySelector<HTMLElement>('.new-chat-btn')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.welcome')).not.toBeNull();
  });

  it('pin button in thread row calls hassCall with save_conversation_threads', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({});
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [USER_MSG], pinned: false, updated_at: NOW_S }],
    ]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    // Nested <button> inside <button> is ejected by the browser parser — find via rail container
    const railPinBtn = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.pin-btn')]
      .find((b) => !b.closest('.thread-header'))!;
    railPinBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_conversation_threads',
      expect.objectContaining({ growspace_id: GS_ID }),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 9 — Thread view
// ---------------------------------------------------------------------------

describe('GmChatPanel — thread view', () => {
  beforeEach(() => {
    setActiveThread();
  });

  it('renders .chat-area when a thread is active', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.chat-area')).not.toBeNull();
  });

  it('renders a .msg for each message in the thread', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.msg').length).toBe(2);
  });

  it('user messages have class .user', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.msg.user')).not.toBeNull();
  });

  it('AI messages have class .ai', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.msg.ai')).not.toBeNull();
  });

  it('shows .typing indicator when isAiLoading$ is true', async () => {
    isAiLoading$.set(true);

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.typing')).not.toBeNull();
  });

  it('hides .typing indicator when isAiLoading$ is false', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.typing')).toBeNull();
  });

  it('renders .thread-breadcrumb in .thread-header', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const bc = el.shadowRoot!.querySelector('.thread-breadcrumb');
    expect(bc).not.toBeNull();
    expect(bc!.textContent).toContain('Chat');
  });

  it('pin button in thread header calls hassCall with save_conversation_threads', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({});

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.thread-header .pin-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_conversation_threads',
      expect.objectContaining({ growspace_id: GS_ID }),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 10 — Message rendering — confidence
// ---------------------------------------------------------------------------

describe('GmChatPanel — message confidence display', () => {
  it('renders a confidence badge for AI messages with confidence >= 0.8', async () => {
    setActiveThread({ messages: [{ ...AI_MSG, confidence: 0.9 }] });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const badge = el.shadowRoot!.querySelector('.conf');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('90%');
  });

  it('confidence badge has class .mid for confidence 0.5–0.79', async () => {
    setActiveThread({ messages: [{ ...AI_MSG, confidence: 0.65 }] });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.conf.mid')).not.toBeNull();
  });

  it('does not render a confidence badge when confidence is undefined', async () => {
    const { confidence: _c, ...noConf } = AI_MSG;
    setActiveThread({ messages: [noConf] });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.conf')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 11 — Message rendering — sensor snapshot
// ---------------------------------------------------------------------------

describe('GmChatPanel — sensor snapshot in message', () => {
  it('renders .data-snap with one .snap-cell per sensor', async () => {
    setActiveThread({
      messages: [{
        ...AI_MSG,
        sensorSnapshot: [
          { label: 'VPD', value: '1.2', unit: 'kPa', delta: '+0.1' },
          { label: 'Temp', value: '24', unit: '°C' },
          { label: 'RH', value: '65', unit: '%' },
        ],
      }],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.data-snap')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.snap-cell').length).toBe(3);
  });

  it('does not render .data-snap when sensorSnapshot is empty', async () => {
    setActiveThread({ messages: [{ ...AI_MSG, sensorSnapshot: [] }] });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.data-snap')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 12 — Message rendering — citations
// ---------------------------------------------------------------------------

describe('GmChatPanel — citations in message', () => {
  it('renders one .cite-chip per citation', async () => {
    setActiveThread({
      messages: [{
        ...AI_MSG,
        citations: [
          { label: 'Temp sensor', source: 'sensor' as const },
          { label: 'Day 12 log', source: 'logbook' as const },
        ],
      }],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const chips = el.shadowRoot!.querySelectorAll('.cite-chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Temp sensor');
  });
});

// ---------------------------------------------------------------------------
// Slice 13 — Message rendering — image thumbnail
// ---------------------------------------------------------------------------

describe('GmChatPanel — image in user message bubble', () => {
  it('renders an img thumbnail inside .msg bubble when imageEntityId is set', async () => {
    setActiveThread({
      messages: [{
        role: 'user' as const,
        text: 'Look at this',
        timestamp: NOW_S,
        imageEntityId: 'data:image/png;base64,abc123',
      }],
    });

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    const img = el.shadowRoot!.querySelector<HTMLImageElement>('.msg-image');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('base64');
  });
});

// ---------------------------------------------------------------------------
// Slice 14 — Action card
// ---------------------------------------------------------------------------

describe('GmChatPanel — action card', () => {
  const ACTION = {
    service: 'climate.set_temperature',
    target_entity_id: 'climate.tent_1',
    service_data: { temperature: 24 },
    description: 'Set temp to 24°C',
  };

  beforeEach(() => {
    setActiveThread({ messages: [{ ...AI_MSG, suggestedAction: ACTION }] });
  });

  it('renders .act-card when message has suggestedAction', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.act-card')).not.toBeNull();
  });

  it('Apply button calls callService with the suggested action', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.apply-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.callService).toHaveBeenCalledWith(
      ACTION.service,
      ACTION.target_entity_id,
      ACTION.service_data,
    );
  });

  it('Dismiss button hides the action card', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.act-card')).not.toBeNull();

    el.shadowRoot!.querySelector<HTMLElement>('.dismiss-btn')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.act-card')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 15 — Context chips
// ---------------------------------------------------------------------------

describe('GmChatPanel — context chips', () => {
  it('seeds a growspace chip from growspacename on connect', async () => {
    const el = await fixture<GmChatPanel>(
      html`<gm-chat-panel growspaceid=${GS_ID} growspacename="Tent Alpha"></gm-chat-panel>`,
    );
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector('.ctx-chip');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Tent Alpha');
  });

  it('does not render .ctx-chip when growspacename is empty', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ctx-chip')).toBeNull();
  });

  it('remove button on ctx-chip removes the chip', async () => {
    const el = await fixture<GmChatPanel>(
      html`<gm-chat-panel growspaceid=${GS_ID} growspacename="Tent Alpha"></gm-chat-panel>`,
    );
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.remove-chip')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ctx-chip')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 16 — AI unavailable banner
// ---------------------------------------------------------------------------

describe('GmChatPanel — AI unavailable banner', () => {
  it('shows .agent-setup-banner when aiEnabled$ is false', async () => {
    aiEnabled$.set(false);

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.agent-setup-banner')).not.toBeNull();
  });

  it('does not show .agent-setup-banner when aiEnabled$ is true', async () => {
    aiEnabled$.set(true);

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.agent-setup-banner')).toBeNull();
  });

  it('does not show .agent-setup-banner when aiEnabled$ is null', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.agent-setup-banner')).toBeNull();
  });

  it('composer has .composer--disabled when AI is unavailable', async () => {
    aiEnabled$.set(false);

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.composer--disabled')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 17 — Agent setup form
// ---------------------------------------------------------------------------

describe('GmChatPanel — agent setup', () => {
  beforeEach(() => {
    aiEnabled$.set(false);
  });

  it('agent-save-btn is disabled when no agent is selected', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.agent-save-btn')!.disabled).toBe(true);
  });

  it('agent-save-btn is enabled after selecting an agent via value-changed', async () => {
    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector('ha-entity-picker')!.dispatchEvent(
      new CustomEvent('value-changed', { detail: { value: 'conversation.my_agent' }, bubbles: true }),
    );
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('.agent-save-btn')!.disabled).toBe(false);
  });

  it('clicking Enable AI calls hassCall with save_ai_agent', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({});

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector('ha-entity-picker')!.dispatchEvent(
      new CustomEvent('value-changed', { detail: { value: 'conversation.my_agent' }, bubbles: true }),
    );
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.agent-save-btn')!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/save_ai_agent',
      { agent_id: 'conversation.my_agent' },
      expect.anything(),
    );
  });

  it('shows .agent-setup-error when saveAiAgent throws', async () => {
    vi.mocked(hassCallMod.hassCall).mockRejectedValue(new Error('Agent not found'));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    el.shadowRoot!.querySelector('ha-entity-picker')!.dispatchEvent(
      new CustomEvent('value-changed', { detail: { value: 'conversation.bad_agent' }, bubbles: true }),
    );
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.agent-save-btn')!.click();
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const errEl = el.shadowRoot!.querySelector('.agent-setup-error');
    expect(errEl).not.toBeNull();
    expect(errEl!.textContent).toContain('Agent not found');
  });
});

// ---------------------------------------------------------------------------
// Slice 18 — _relTime relative timestamps
// ---------------------------------------------------------------------------

describe('GmChatPanel — relative timestamps in thread rail', () => {
  function threadWithTs(ts: number) {
    return new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [{ ...USER_MSG, timestamp: ts }], pinned: false, updated_at: ts }],
    ]);
  }

  it('shows "just now" for timestamps < 60 seconds ago', async () => {
    conversationThreads$.set(threadWithTs(NOW_S - 30));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-time')!.textContent).toContain('just now');
  });

  it('shows "Xm ago" for timestamps 1–59 minutes ago', async () => {
    conversationThreads$.set(threadWithTs(NOW_S - 120));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-time')!.textContent).toContain('m ago');
  });

  it('shows "Xh ago" for timestamps 1–23 hours ago', async () => {
    conversationThreads$.set(threadWithTs(NOW_S - 7200));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-time')!.textContent).toContain('h ago');
  });

  it('shows "Xd ago" for timestamps 1+ days ago', async () => {
    conversationThreads$.set(threadWithTs(NOW_S - 172800));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-time')!.textContent).toContain('d ago');
  });

  it('shows empty string when thread has no messages', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: GS_ID, messages: [], pinned: false, updated_at: NOW_S }],
    ]));

    const el = await fixture<GmChatPanel>(html`<gm-chat-panel growspaceid=${GS_ID}></gm-chat-panel>`);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.thread-time')!.textContent).toBe('');
  });
});
