import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import {
  activeThreadId$,
  conversationThreads$,
  aiAlerts$,
  aiBriefing$,
  aiMode$,
  aiInsight$,
  isAiLoading$,
  aiError$,
} from '../slices/ai-insight';
import './chat-panel';
import { GmChatPanel } from './chat-panel';

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

import * as hassCallMod from '../services/hass-call';

// Stub HA custom elements
const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

// Collapse whitespace for text assertions
function normalize(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

beforeEach(() => {
  activeThreadId$.set(null);
  conversationThreads$.set(new Map());
  aiAlerts$.set([]);
  aiBriefing$.set(null);
  aiMode$.set('chat');
  aiInsight$.set(null);
  isAiLoading$.set(false);
  aiError$.set(null);
  vi.clearAllMocks();
  vi.mocked(hassCallMod.hassCall).mockResolvedValue({});
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Slice 1 — Welcome state
// ---------------------------------------------------------------------------

describe('GmChatPanel — welcome state', () => {
  it('renders .welcome when activeThreadId$ is null', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.welcome')).not.toBeNull();
  });

  it('renders .prompt-grid when activeThreadId$ is null', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.prompt-grid')).not.toBeNull();
  });

  it('hides .welcome when a thread is active', async () => {
    activeThreadId$.set('thread-1');
    conversationThreads$.set(new Map([['thread-1', {
      thread_id: 'thread-1',
      growspace_id: 'gs1',
      messages: [],
    }]]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.welcome')).toBeNull();
  });

  it('clicking a prompt card sets activeThreadId$ via startConversation', async () => {
    const returnedThread = { thread_id: 't1', growspace_id: 'gs1', messages: [] };
    vi.mocked(hassCallMod.hassCall).mockResolvedValue(returnedThread);

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const firstPromptCard = el.shadowRoot!.querySelector<HTMLElement>('.prompt-card');
    expect(firstPromptCard).not.toBeNull();
    firstPromptCard!.click();
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    expect(activeThreadId$.get()).toBe('t1');
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Thread list in rail
// ---------------------------------------------------------------------------

describe('GmChatPanel — thread list in rail', () => {
  it('renders a .thread-row for each thread in conversationThreads$', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'First question', timestamp: 1700000001 },
      ]}],
      ['t2', { thread_id: 't2', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'Second question', timestamp: 1700000002 },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const rows = el.shadowRoot!.querySelectorAll('.thread-row');
    expect(rows.length).toBe(2);
  });

  it('clicking a .thread-row sets activeThreadId$ to that thread id', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'Hello', timestamp: 1700000001 },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector<HTMLElement>('.thread-row');
    row!.click();
    await el.updateComplete;

    expect(activeThreadId$.get()).toBe('t1');
  });

  it('marks the active thread row with aria-pressed=true', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'Hello', timestamp: 1700000001 },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const row = el.shadowRoot!.querySelector('[aria-pressed="true"]');
    expect(row).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — Message rendering
// ---------------------------------------------------------------------------

describe('GmChatPanel — message rendering', () => {
  beforeEach(() => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'What is my VPD?', timestamp: 1700000001 },
        { role: 'ai' as const, text: 'Your VPD is 1.2 kPa.', timestamp: 1700000002, confidence: 0.9 },
      ]}],
    ]));
  });

  it('renders .msg.user for user messages', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.msg.user')).not.toBeNull();
  });

  it('renders .msg.ai for AI messages', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.msg.ai')).not.toBeNull();
  });

  it('renders confidence badge on AI message', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.conf')).not.toBeNull();
  });

  it('renders .data-snap grid when AI message has sensorSnapshot', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        {
          role: 'ai' as const,
          text: 'Readings look good.',
          timestamp: 1700000002,
          sensorSnapshot: [
            { label: 'VPD', value: '1.2', unit: 'kPa', delta: '+0.1' },
            { label: 'Temp', value: '24', unit: '°C' },
            { label: 'RH', value: '65', unit: '%' },
          ],
        },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.data-snap')).not.toBeNull();
  });

  it('renders .cite-row when AI message has citations', async () => {
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        {
          role: 'ai' as const,
          text: 'Based on sensor data.',
          timestamp: 1700000002,
          citations: [
            { label: 'VPD sensor', source: 'sensor' as const },
          ],
        },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.cite-row')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — Action card
// ---------------------------------------------------------------------------

describe('GmChatPanel — action card', () => {
  const msgWithAction = {
    role: 'ai' as const,
    text: 'I recommend turning on the grow light.',
    timestamp: 1700000002,
    suggestedAction: {
      service: 'light.turn_on',
      target_entity_id: 'light.grow_light',
      service_data: { brightness: 255 },
      description: 'Turn grow light to full brightness',
    },
  };

  beforeEach(() => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [msgWithAction] }],
    ]));
  });

  it('renders .act-card when AI message has a suggestedAction', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.act-card')).not.toBeNull();
  });

  it('Apply button calls callService with the suggested action payload', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const applyBtn = el.shadowRoot!.querySelector<HTMLElement>('.act-card .apply-btn');
    applyBtn!.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(hassCallMod.callService).toHaveBeenCalledWith(
      msgWithAction.suggestedAction.service,
      msgWithAction.suggestedAction.target_entity_id,
      msgWithAction.suggestedAction.service_data,
    );
  });

  it('Dismiss button hides the action card', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const dismissBtn = el.shadowRoot!.querySelector<HTMLElement>('.act-card .dismiss-btn');
    dismissBtn!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.act-card')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — Composer send routing
// ---------------------------------------------------------------------------

describe('GmChatPanel — composer', () => {
  it('calls hassCall with start_conversation when no thread is active', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    textarea!.value = 'What is my VPD?';
    textarea!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ growspace_id: 'gs1', message: 'What is my VPD?' }),
      expect.anything(),
    );
  });

  it('calls hassCall with send_message when a thread is active', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [] }],
    ]));
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    textarea!.value = 'Follow up question';
    textarea!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/send_message',
      expect.objectContaining({ conversation_id: 't1', growspace_id: 'gs1', message: 'Follow up question' }),
      expect.anything(),
    );
  });

  it('clears textarea after sending', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    textarea!.value = 'Some question';
    textarea!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea')!.value).toBe('');
  });

  it('clicking a suggestion chip pre-fills the composer textarea', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const chip = el.shadowRoot!.querySelector<HTMLElement>('.suggest-chip');
    expect(chip).not.toBeNull();
    chip!.click();
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    expect(textarea!.value).not.toBe('');
  });

  it('context chip × button removes that chip', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1" growspacename="Tent 1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const removeBtn = el.shadowRoot!.querySelector<HTMLElement>('.ctx-chip .remove-chip');
    expect(removeBtn).not.toBeNull();
    removeBtn!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelectorAll('.ctx-chip').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — Typing indicator
// ---------------------------------------------------------------------------

describe('GmChatPanel — typing indicator', () => {
  it('renders .typing when isAiLoading$ is true and a thread is active', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [] }],
    ]));
    isAiLoading$.set(true);

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.typing')).not.toBeNull();
  });

  it('hides .typing when isAiLoading$ is false', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [] }],
    ]));
    isAiLoading$.set(false);

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.typing')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 7 — Attach button renders in composer
// ---------------------------------------------------------------------------

describe('GmChatPanel — attach button', () => {
  it('renders .attach-btn in the composer', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.attach-btn')).not.toBeNull();
  });

  it('renders a hidden file input in the composer', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const fileInput = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    expect(fileInput!.accept).toContain('image/');
  });
});

// ---------------------------------------------------------------------------
// Slice 8 — Image attachment preview
// ---------------------------------------------------------------------------

describe('GmChatPanel — attachment preview', () => {
  it('shows .attachment-preview after a file is selected', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    // Simulate FileReader producing a data URL
    (el as unknown as { _pendingAttachment: string })._pendingAttachment =
      'data:image/png;base64,abc123';
    await el.requestUpdate();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.attachment-preview')).not.toBeNull();
  });

  it('shows an img tag with the data URL inside .attachment-preview', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const dataUrl = 'data:image/png;base64,abc123';
    (el as unknown as { _pendingAttachment: string })._pendingAttachment = dataUrl;
    await el.requestUpdate();
    await el.updateComplete;

    const img = el.shadowRoot!.querySelector<HTMLImageElement>('.attachment-preview img');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('abc123');
  });

  it('remove button in .attachment-preview clears the attachment', async () => {
    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    (el as unknown as { _pendingAttachment: string })._pendingAttachment =
      'data:image/png;base64,abc123';
    await el.requestUpdate();
    await el.updateComplete;

    const removeBtn = el.shadowRoot!.querySelector<HTMLElement>('.attachment-preview .remove-attachment');
    expect(removeBtn).not.toBeNull();
    removeBtn!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.attachment-preview')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 9 — imageEntityId wired through send
// ---------------------------------------------------------------------------

describe('GmChatPanel — imageEntityId wire-up', () => {
  it('passes image_entity_id in start_conversation when attachment is pending', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const dataUrl = 'data:image/png;base64,abc123';
    (el as unknown as { _pendingAttachment: string })._pendingAttachment = dataUrl;
    await el.requestUpdate();
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    textarea!.value = 'Check this image';
    textarea!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_conversation',
      expect.objectContaining({ image_entities: [dataUrl] }),
      expect.anything(),
    );
  });

  it('clears _pendingAttachment after sending', async () => {
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    (el as unknown as { _pendingAttachment: string })._pendingAttachment =
      'data:image/png;base64,abc123';
    await el.requestUpdate();
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    textarea!.value = 'With image';
    textarea!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    expect((el as unknown as { _pendingAttachment: string | null })._pendingAttachment).toBeNull();
  });

  it('passes image_entity_id in send_message when attachment is pending', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [] }],
    ]));
    vi.mocked(hassCallMod.hassCall).mockResolvedValue({
      thread_id: 't1', growspace_id: 'gs1', messages: [],
    });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const dataUrl = 'data:image/png;base64,abc123';
    (el as unknown as { _pendingAttachment: string })._pendingAttachment = dataUrl;
    await el.requestUpdate();
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    textarea!.value = 'Follow up with image';
    textarea!.dispatchEvent(new Event('input'));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>('.send')!.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(hassCallMod.hassCall).toHaveBeenCalledWith(
      'growspace_manager/send_message',
      expect.objectContaining({ image_entities: [dataUrl] }),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// Slice 10 — Backend error displayed beneath composer
// ---------------------------------------------------------------------------

describe('GmChatPanel — composer error display', () => {
  it('renders .composer-error when aiError$ is set', async () => {
    aiError$.set('camera.plant_cam is not a valid camera or image entity');

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const errorEl = el.shadowRoot!.querySelector('.composer-error');
    expect(errorEl).not.toBeNull();
    expect(normalize(errorEl!.textContent)).toContain('camera.plant_cam');
  });

  it('hides .composer-error when aiError$ is null', async () => {
    aiError$.set(null);

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.composer-error')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 11 — User message bubble renders image thumbnail
// ---------------------------------------------------------------------------

describe('GmChatPanel — image in user message bubble', () => {
  it('renders an img thumbnail inside .msg.user bubble when imageEntityId is set', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        {
          role: 'user' as const,
          text: 'Look at this',
          timestamp: 1700000001,
          imageEntityId: 'data:image/png;base64,abc123',
        },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const bubble = el.shadowRoot!.querySelector('.msg.user .msg-bubble');
    expect(bubble).not.toBeNull();
    const img = bubble!.querySelector<HTMLImageElement>('.msg-image');
    expect(img).not.toBeNull();
    expect(img!.src).toContain('abc123');
  });

  it('does not render .msg-image when message has no imageEntityId', async () => {
    activeThreadId$.set('t1');
    conversationThreads$.set(new Map([
      ['t1', { thread_id: 't1', growspace_id: 'gs1', messages: [
        { role: 'user' as const, text: 'Plain message', timestamp: 1700000001 },
      ]}],
    ]));

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.msg-image')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Slice 12 — AI unavailable banner and disabled composer
// ---------------------------------------------------------------------------

const BRIEFING_BASE = {
  generated_at: 1700000000,
  summary_text: 'Not optimal.',
  kpis: [],
  recommendations: [],
};

describe('GmChatPanel — AI unavailable banner', () => {
  it('shows .ai-unavailable-banner when aiBriefing ai_available is false', async () => {
    aiBriefing$.set({ ...BRIEFING_BASE, ai_available: false });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ai-unavailable-banner')).not.toBeNull();
  });

  it('does not show banner when aiBriefing ai_available is true', async () => {
    aiBriefing$.set({ ...BRIEFING_BASE, ai_available: true });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ai-unavailable-banner')).toBeNull();
  });

  it('does not show banner when aiBriefing is null', async () => {
    aiBriefing$.set(null);

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.ai-unavailable-banner')).toBeNull();
  });

  it('composer textarea is disabled when AI is unavailable', async () => {
    aiBriefing$.set({ ...BRIEFING_BASE, ai_available: false });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    expect(textarea?.disabled).toBe(true);
  });

  it('send button is disabled when AI is unavailable', async () => {
    aiBriefing$.set({ ...BRIEFING_BASE, ai_available: false });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const sendBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.send');
    expect(sendBtn?.disabled).toBe(true);
  });

  it('composer has composer--disabled class when AI is unavailable', async () => {
    aiBriefing$.set({ ...BRIEFING_BASE, ai_available: false });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.composer--disabled')).not.toBeNull();
  });

  it('composer is fully enabled when AI is available', async () => {
    aiBriefing$.set({ ...BRIEFING_BASE, ai_available: true });

    const el = await fixture<GmChatPanel>(html`
      <gm-chat-panel growspaceid="gs1"></gm-chat-panel>
    `);
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.composer-textarea');
    expect(textarea?.disabled).toBe(false);
    expect(el.shadowRoot!.querySelector('.composer--disabled')).toBeNull();
  });
});
