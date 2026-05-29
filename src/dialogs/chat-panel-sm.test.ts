/**
 * Unit tests for the Chat Panel State Machine.
 *
 * Pure transition tests — no DOM, no Lit, no hassCall.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  type ChatSM,
} from './chat-panel-sm';

// ─── createInitialSM ──────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('creates SM with activeThreadId null', () => {
    expect(createInitialSM().activeThreadId).toBeNull();
  });

  it('creates SM with empty composerDraft', () => {
    expect(createInitialSM().composerDraft).toBe('');
  });

  it('creates SM with null pendingAttachment', () => {
    expect(createInitialSM().pendingAttachment).toBeNull();
  });

  it('creates SM with empty contextChips when no growspaceName given', () => {
    expect(createInitialSM().contextChips).toEqual([]);
  });

  it('seeds a growspace chip when growspaceName is provided', () => {
    const sm = createInitialSM('Tent Alpha');
    expect(sm.contextChips).toEqual([
      { id: 'growspace', label: 'Tent Alpha', type: 'growspace' },
    ]);
  });

  it('creates SM with empty dismissedActionIndices', () => {
    expect(createInitialSM().dismissedActionIndices).toEqual([]);
  });

  it('creates SM with empty agentDraft', () => {
    expect(createInitialSM().agentDraft).toBe('');
  });

  it('creates SM with idle agentStatus', () => {
    expect(createInitialSM().agentStatus.kind).toBe('idle');
  });

  it('creates SM with idle status', () => {
    expect(createInitialSM().status.kind).toBe('idle');
  });

  it('creates SM with undefined toast', () => {
    expect(createInitialSM().toast).toBeUndefined();
  });
});

// ─── Thread selection (tab switching) ────────────────────────────────────────

describe('THREAD_SELECTED', () => {
  it('sets activeThreadId to the given threadId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'THREAD_SELECTED', threadId: 'thread-1' });
    expect(next.activeThreadId).toBe('thread-1');
  });

  it('clears activeThreadId when threadId is null (new conversation)', () => {
    const sm: ChatSM = { ...createInitialSM(), activeThreadId: 'thread-1' };
    const next = transition(sm, { type: 'THREAD_SELECTED', threadId: null });
    expect(next.activeThreadId).toBeNull();
  });

  it('resets dismissedActionIndices when thread changes', () => {
    const sm: ChatSM = {
      ...createInitialSM(),
      activeThreadId: 'thread-1',
      dismissedActionIndices: [0, 2],
    };
    const next = transition(sm, { type: 'THREAD_SELECTED', threadId: 'thread-2' });
    expect(next.dismissedActionIndices).toEqual([]);
  });

  it('does not reset composerDraft when thread changes', () => {
    const sm: ChatSM = { ...createInitialSM(), composerDraft: 'mid-draft text' };
    const next = transition(sm, { type: 'THREAD_SELECTED', threadId: 'thread-2' });
    expect(next.composerDraft).toBe('mid-draft text');
  });

  it('does not reset pendingAttachment when thread changes', () => {
    const sm: ChatSM = { ...createInitialSM(), pendingAttachment: 'data:image/png;base64,abc' };
    const next = transition(sm, { type: 'THREAD_SELECTED', threadId: 'thread-2' });
    expect(next.pendingAttachment).toBe('data:image/png;base64,abc');
  });

  it('does not reset contextChips when thread changes', () => {
    const sm = createInitialSM('Tent Alpha');
    const next = transition(sm, { type: 'THREAD_SELECTED', threadId: 'thread-2' });
    expect(next.contextChips).toHaveLength(1);
    expect(next.contextChips[0].label).toBe('Tent Alpha');
  });

  it('does not mutate the input SM', () => {
    const sm = createInitialSM();
    transition(sm, { type: 'THREAD_SELECTED', threadId: 'thread-1' });
    expect(sm.activeThreadId).toBeNull();
  });
});

// ─── Composer draft ───────────────────────────────────────────────────────────

describe('COMPOSER_DRAFT_CHANGED', () => {
  it('updates composerDraft', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'COMPOSER_DRAFT_CHANGED', text: 'Hello' });
    expect(next.composerDraft).toBe('Hello');
  });

  it('can set draft to empty string', () => {
    const sm: ChatSM = { ...createInitialSM(), composerDraft: 'Some text' };
    const next = transition(sm, { type: 'COMPOSER_DRAFT_CHANGED', text: '' });
    expect(next.composerDraft).toBe('');
  });
});

// ─── Attachment ───────────────────────────────────────────────────────────────

describe('ATTACHMENT_SELECTED', () => {
  it('sets pendingAttachment to the data URL', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ATTACHMENT_SELECTED', dataUrl: 'data:image/png;base64,abc' });
    expect(next.pendingAttachment).toBe('data:image/png;base64,abc');
  });
});

describe('ATTACHMENT_REMOVED', () => {
  it('clears pendingAttachment', () => {
    const sm: ChatSM = { ...createInitialSM(), pendingAttachment: 'data:image/png;base64,abc' };
    const next = transition(sm, { type: 'ATTACHMENT_REMOVED' });
    expect(next.pendingAttachment).toBeNull();
  });
});

// ─── Context chips ────────────────────────────────────────────────────────────

describe('CONTEXT_CHIP_REMOVED', () => {
  it('removes the chip with the matching id', () => {
    const sm = createInitialSM('Tent Alpha');
    const next = transition(sm, { type: 'CONTEXT_CHIP_REMOVED', id: 'growspace' });
    expect(next.contextChips).toEqual([]);
  });

  it('is a no-op when the id does not match any chip', () => {
    const sm = createInitialSM('Tent Alpha');
    const next = transition(sm, { type: 'CONTEXT_CHIP_REMOVED', id: 'nonexistent' });
    expect(next.contextChips).toHaveLength(1);
  });

  it('only removes the chip with the matching id when multiple chips exist', () => {
    const sm: ChatSM = {
      ...createInitialSM(),
      contextChips: [
        { id: 'growspace', label: 'Tent Alpha', type: 'growspace' },
        { id: 'sensor-1', label: 'Temp sensor', type: 'sensor' },
      ],
    };
    const next = transition(sm, { type: 'CONTEXT_CHIP_REMOVED', id: 'sensor-1' });
    expect(next.contextChips).toEqual([
      { id: 'growspace', label: 'Tent Alpha', type: 'growspace' },
    ]);
  });
});

// ─── Send flow (validation + status transitions) ──────────────────────────────

describe('SEND_REQUESTED', () => {
  it('is a no-op when composerDraft is empty', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SEND_REQUESTED' });
    expect(next).toBe(sm);
  });

  it('is a no-op when composerDraft is whitespace only', () => {
    const sm: ChatSM = { ...createInitialSM(), composerDraft: '   ' };
    const next = transition(sm, { type: 'SEND_REQUESTED' });
    expect(next).toBe(sm);
  });

  it('transitions to sending when composerDraft has text', () => {
    const sm: ChatSM = { ...createInitialSM(), composerDraft: 'Hello?' };
    const next = transition(sm, { type: 'SEND_REQUESTED' });
    expect(next.status.kind).toBe('sending');
  });

  it('clears composerDraft immediately on send (optimistic clear)', () => {
    const sm: ChatSM = { ...createInitialSM(), composerDraft: 'Hello?' };
    const next = transition(sm, { type: 'SEND_REQUESTED' });
    expect(next.composerDraft).toBe('');
  });

  it('clears pendingAttachment immediately on send', () => {
    const sm: ChatSM = {
      ...createInitialSM(),
      composerDraft: 'Hello?',
      pendingAttachment: 'data:image/png;base64,abc',
    };
    const next = transition(sm, { type: 'SEND_REQUESTED' });
    expect(next.pendingAttachment).toBeNull();
  });

  it('can transition from error state back to sending', () => {
    const sm: ChatSM = {
      ...createInitialSM(),
      composerDraft: 'Retry message',
      status: { kind: 'error', message: 'Timeout' },
    };
    const next = transition(sm, { type: 'SEND_REQUESTED' });
    expect(next.status.kind).toBe('sending');
  });
});

describe('SEND_RESOLVED', () => {
  it('transitions status to idle', () => {
    const sm: ChatSM = { ...createInitialSM(), status: { kind: 'sending' } };
    const next = transition(sm, { type: 'SEND_RESOLVED' });
    expect(next.status.kind).toBe('idle');
  });
});

describe('SEND_FAILED', () => {
  it('transitions status to error with the given message', () => {
    const sm: ChatSM = { ...createInitialSM(), status: { kind: 'sending' } };
    const next = transition(sm, { type: 'SEND_FAILED', message: 'Network timeout' });
    expect(next.status).toEqual({ kind: 'error', message: 'Network timeout' });
  });

  it('preserves composerDraft on failure (draft was already cleared by SEND_REQUESTED)', () => {
    const sm: ChatSM = { ...createInitialSM(), status: { kind: 'sending' } };
    const next = transition(sm, { type: 'SEND_FAILED', message: 'Error' });
    expect(next.composerDraft).toBe('');
  });
});

// ─── Agent setup flow ─────────────────────────────────────────────────────────

describe('AGENT_DRAFT_CHANGED', () => {
  it('updates agentDraft', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'AGENT_DRAFT_CHANGED', entityId: 'conversation.claude' });
    expect(next.agentDraft).toBe('conversation.claude');
  });
});

describe('AGENT_SAVE_REQUESTED', () => {
  it('transitions agentStatus to saving', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'AGENT_SAVE_REQUESTED' });
    expect(next.agentStatus.kind).toBe('saving');
  });

  it('can retry from error state', () => {
    const sm: ChatSM = {
      ...createInitialSM(),
      agentStatus: { kind: 'error', message: 'Not found' },
    };
    const next = transition(sm, { type: 'AGENT_SAVE_REQUESTED' });
    expect(next.agentStatus.kind).toBe('saving');
  });
});

describe('AGENT_SAVE_RESOLVED', () => {
  it('transitions agentStatus to idle', () => {
    const sm: ChatSM = { ...createInitialSM(), agentStatus: { kind: 'saving' } };
    const next = transition(sm, { type: 'AGENT_SAVE_RESOLVED' });
    expect(next.agentStatus.kind).toBe('idle');
  });
});

describe('AGENT_SAVE_FAILED', () => {
  it('transitions agentStatus to error with the given message', () => {
    const sm: ChatSM = { ...createInitialSM(), agentStatus: { kind: 'saving' } };
    const next = transition(sm, { type: 'AGENT_SAVE_FAILED', message: 'Agent not found' });
    expect(next.agentStatus).toEqual({ kind: 'error', message: 'Agent not found' });
  });
});

// ─── Action dismissal ─────────────────────────────────────────────────────────

describe('ACTION_DISMISSED', () => {
  it('adds the index to dismissedActionIndices', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ACTION_DISMISSED', index: 2 });
    expect(next.dismissedActionIndices).toContain(2);
  });

  it('accumulates dismissed indices across multiple dismissals', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'ACTION_DISMISSED', index: 0 });
    sm = transition(sm, { type: 'ACTION_DISMISSED', index: 3 });
    expect(sm.dismissedActionIndices).toEqual([0, 3]);
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets the toast message', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_TOAST', message: 'Something went wrong' });
    expect(next.toast).toBe('Something went wrong');
  });

  it('clears the toast when message is undefined', () => {
    const sm: ChatSM = { ...createInitialSM(), toast: 'old message' };
    const next = transition(sm, { type: 'SET_TOAST', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe('immutability', () => {
  it('every transition returns a new object reference', () => {
    const sm: ChatSM = { ...createInitialSM(), composerDraft: 'hi' };
    const events = [
      { type: 'THREAD_SELECTED' as const, threadId: 'thread-1' },
      { type: 'COMPOSER_DRAFT_CHANGED' as const, text: 'hello' },
      { type: 'ATTACHMENT_SELECTED' as const, dataUrl: 'data:,' },
      { type: 'ATTACHMENT_REMOVED' as const },
      { type: 'SEND_REQUESTED' as const },
      { type: 'ACTION_DISMISSED' as const, index: 0 },
      { type: 'SET_TOAST' as const, message: 'test' },
    ];
    for (const event of events) {
      const next = transition(sm, event);
      expect(next).not.toBe(sm);
    }
  });

  it('SEND_REQUESTED is the same reference when draft is empty (no-op)', () => {
    const sm = createInitialSM();
    expect(transition(sm, { type: 'SEND_REQUESTED' })).toBe(sm);
  });
});

// ─── Default case ─────────────────────────────────────────────────────────────

describe('default transition case', () => {
  it('returns sm unmodified for unknown event types', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'UNKNOWN_EVENT' } as any);
    expect(next).toBe(sm);
  });
});
