/**
 * Inbox Panel State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for the
 * Inbox panel lives here. The component calls `transition(sm, event)` and
 * replaces its single `@state() _sm`.
 *
 * Does NOT satisfy DialogStateMachine — the inbox has no navigation tabs with
 * per-tab draft state. Shape is flat.
 */

import type { SuggestedAction } from '../slices/ai-insight/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InboxFilter = 'all' | 'action' | 'watch';

export type InboxStatus =
  | { kind: 'idle' }
  | { kind: 'adding-note'; text: string }
  | { kind: 'confirming'; action: SuggestedAction }
  | { kind: 'applying' }
  | { kind: 'error'; message: string };

export interface InboxSM {
  activeFilter: InboxFilter;
  selectedId: string | null;
  readIds: ReadonlySet<string>;
  status: InboxStatus;
  toast: string | undefined;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type InboxEvent =
  | { type: 'FilterSelected'; filter: InboxFilter }
  | { type: 'AlertSelected'; id: string }
  | { type: 'MarkAllRead'; ids: string[] }
  | { type: 'AddNoteOpened' }
  | { type: 'NoteChanged'; text: string }
  | { type: 'ResolveRequested' }
  | { type: 'ActionApplyRequested'; action: SuggestedAction }
  | { type: 'ActionApplyConfirmed' }
  | { type: 'ActionApplyCancelled' }
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; message: string }
  | { type: 'SET_TOAST'; message: string | undefined }
  | { type: 'ErrorDismissed' };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): InboxSM {
  return {
    activeFilter: 'all',
    selectedId: null,
    readIds: new Set(),
    status: { kind: 'idle' },
    toast: undefined,
  };
}

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: InboxSM, event: InboxEvent): InboxSM {
  switch (event.type) {
    case 'FilterSelected':
      return {
        ...sm,
        activeFilter: event.filter,
        selectedId: null,
        status: { kind: 'idle' },
      };

    case 'AlertSelected':
      return {
        ...sm,
        selectedId: event.id,
        readIds: new Set([...sm.readIds, event.id]),
        status: { kind: 'idle' },
      };

    case 'MarkAllRead':
      return {
        ...sm,
        readIds: new Set([...sm.readIds, ...event.ids]),
      };

    case 'AddNoteOpened':
      if (sm.selectedId === null) return sm;
      return {
        ...sm,
        status: { kind: 'adding-note', text: '' },
      };

    case 'NoteChanged': {
      if (sm.status.kind !== 'adding-note') return sm;
      return {
        ...sm,
        status: { kind: 'adding-note', text: event.text },
      };
    }

    case 'ResolveRequested':
      if (sm.selectedId === null) return sm;
      return {
        ...sm,
        status: { kind: 'applying' },
      };

    case 'ActionApplyRequested':
      return {
        ...sm,
        status: { kind: 'confirming', action: event.action },
      };

    case 'ActionApplyConfirmed':
      if (sm.status.kind !== 'confirming') return sm;
      return {
        ...sm,
        status: { kind: 'applying' },
      };

    case 'ActionApplyCancelled':
      return {
        ...sm,
        status: { kind: 'idle' },
      };

    case 'SaveResolved':
      return {
        ...sm,
        selectedId: null,
        status: { kind: 'idle' },
      };

    case 'SaveFailed':
      return {
        ...sm,
        status: { kind: 'error', message: event.message },
      };

    case 'SET_TOAST':
      return {
        ...sm,
        toast: event.message,
      };

    case 'ErrorDismissed':
      return {
        ...sm,
        status: { kind: 'idle' },
      };

    default:
      return sm;
  }
}
