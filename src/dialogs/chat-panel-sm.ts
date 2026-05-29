/**
 * Chat Panel State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. Owns all local interaction state
 * for the Growmaster chat panel: composer draft, send status, thread selection,
 * dismissed action cards, and the agent-setup path.
 *
 * The Lit component holds a single @state() _sm and renders over it;
 * user interactions become transition(sm, event) calls.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A tag attached to a composed message providing contextual scope for the Conversation Agent. */
export interface ContextChip {
  id: string;
  label: string;
  type: 'growspace' | 'time-range' | 'sensor';
}

export type ChatStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'error'; message: string };

export type AgentStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

export interface ChatSM {
  activeThreadId: string | null;
  composerDraft: string;
  pendingAttachment: string | null;
  contextChips: ContextChip[];
  dismissedActionIndices: number[];
  agentDraft: string;
  agentStatus: AgentStatus;
  status: ChatStatus;
  toast: string | undefined;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type ChatEvent =
  | { type: 'THREAD_SELECTED'; threadId: string | null }
  | { type: 'COMPOSER_DRAFT_CHANGED'; text: string }
  | { type: 'ATTACHMENT_SELECTED'; dataUrl: string }
  | { type: 'ATTACHMENT_REMOVED' }
  | { type: 'CONTEXT_CHIP_REMOVED'; id: string }
  | { type: 'SEND_REQUESTED' }
  | { type: 'SEND_RESOLVED' }
  | { type: 'SEND_FAILED'; message: string }
  | { type: 'ACTION_DISMISSED'; index: number }
  | { type: 'AGENT_DRAFT_CHANGED'; entityId: string }
  | { type: 'AGENT_SAVE_REQUESTED' }
  | { type: 'AGENT_SAVE_RESOLVED' }
  | { type: 'AGENT_SAVE_FAILED'; message: string }
  | { type: 'SET_TOAST'; message: string | undefined };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(growspaceName?: string): ChatSM {
  return {
    activeThreadId: null,
    composerDraft: '',
    pendingAttachment: null,
    contextChips: growspaceName
      ? [{ id: 'growspace', label: growspaceName, type: 'growspace' }]
      : [],
    dismissedActionIndices: [],
    agentDraft: '',
    agentStatus: { kind: 'idle' },
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

/** Pure state machine transition. Returns a new SM without mutating the input. */
export function transition(sm: ChatSM, event: ChatEvent): ChatSM {
  switch (event.type) {
    case 'THREAD_SELECTED':
      return {
        ...sm,
        activeThreadId: event.threadId,
        dismissedActionIndices: [],
      };

    case 'COMPOSER_DRAFT_CHANGED':
      return { ...sm, composerDraft: event.text };

    case 'ATTACHMENT_SELECTED':
      return { ...sm, pendingAttachment: event.dataUrl };

    case 'ATTACHMENT_REMOVED':
      return { ...sm, pendingAttachment: null };

    case 'CONTEXT_CHIP_REMOVED':
      return {
        ...sm,
        contextChips: sm.contextChips.filter((c) => c.id !== event.id),
      };

    case 'SEND_REQUESTED': {
      if (!sm.composerDraft.trim()) return sm;
      return {
        ...sm,
        status: { kind: 'sending' },
        composerDraft: '',
        pendingAttachment: null,
      };
    }

    case 'SEND_RESOLVED':
      return { ...sm, status: { kind: 'idle' } };

    case 'SEND_FAILED':
      return { ...sm, status: { kind: 'error', message: event.message } };

    case 'ACTION_DISMISSED':
      return {
        ...sm,
        dismissedActionIndices: [...sm.dismissedActionIndices, event.index],
      };

    case 'AGENT_DRAFT_CHANGED':
      return { ...sm, agentDraft: event.entityId };

    case 'AGENT_SAVE_REQUESTED':
      return { ...sm, agentStatus: { kind: 'saving' } };

    case 'AGENT_SAVE_RESOLVED':
      return { ...sm, agentStatus: { kind: 'idle' } };

    case 'AGENT_SAVE_FAILED':
      return { ...sm, agentStatus: { kind: 'error', message: event.message } };

    case 'SET_TOAST':
      return { ...sm, toast: event.message };

    default:
      return sm;
  }
}
