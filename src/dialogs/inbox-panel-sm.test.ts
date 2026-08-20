/**
 * Unit tests for the Inbox Panel State Machine.
 *
 * Pure transition tests — no DOM, no Lit component mounting.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  type InboxSM,
} from './inbox-panel-sm';
import type { SuggestedAction } from '../slices/ai-insight/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION: SuggestedAction = {
  service: 'climate.set_temperature',
  target_entity_id: 'climate.tent_1',
  service_data: { temperature: 24 },
  description: 'Lower temp to 24°C',
};

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('starts with activeFilter all', () => {
    expect(createInitialSM().activeFilter).toBe('all');
  });

  it('starts with no selection', () => {
    expect(createInitialSM().selectedId).toBeNull();
  });

  it('starts with empty readIds', () => {
    expect(createInitialSM().readIds.size).toBe(0);
  });

  it('starts with idle status', () => {
    expect(createInitialSM().status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    expect(createInitialSM().toast).toBeUndefined();
  });
});

// ─── FilterSelected ───────────────────────────────────────────────────────────

describe('FilterSelected', () => {
  it('sets the active filter', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'FilterSelected', filter: 'action' });
    expect(next.activeFilter).toBe('action');
  });

  it('resets selectedId to null', () => {
    const sm: InboxSM = { ...createInitialSM(), selectedId: 'a1' };
    const next = transition(sm, { type: 'FilterSelected', filter: 'watch' });
    expect(next.selectedId).toBeNull();
  });

  it('resets status to idle', () => {
    const sm: InboxSM = { ...createInitialSM(), status: { kind: 'adding-note', text: 'note' } };
    const next = transition(sm, { type: 'FilterSelected', filter: 'all' });
    expect(next.status.kind).toBe('idle');
  });

  it('preserves readIds across filter switch', () => {
    const sm: InboxSM = { ...createInitialSM(), readIds: new Set(['a1']) };
    const next = transition(sm, { type: 'FilterSelected', filter: 'action' });
    expect(next.readIds.has('a1')).toBe(true);
  });
});

// ─── AlertSelected ────────────────────────────────────────────────────────────

describe('AlertSelected', () => {
  it('sets selectedId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'AlertSelected', id: 'a1' });
    expect(next.selectedId).toBe('a1');
  });

  it('adds the id to readIds', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'AlertSelected', id: 'a1' });
    expect(next.readIds.has('a1')).toBe(true);
  });

  it('preserves previously read ids', () => {
    const sm: InboxSM = { ...createInitialSM(), readIds: new Set(['a0']) };
    const next = transition(sm, { type: 'AlertSelected', id: 'a1' });
    expect(next.readIds.has('a0')).toBe(true);
    expect(next.readIds.has('a1')).toBe(true);
  });

  it('resets status to idle', () => {
    const sm: InboxSM = { ...createInitialSM(), status: { kind: 'error', message: 'oops' } };
    const next = transition(sm, { type: 'AlertSelected', id: 'a1' });
    expect(next.status.kind).toBe('idle');
  });

  it('does not mutate the input SM', () => {
    const sm = createInitialSM();
    transition(sm, { type: 'AlertSelected', id: 'a1' });
    expect(sm.selectedId).toBeNull();
    expect(sm.readIds.size).toBe(0);
  });
});

// ─── MarkAllRead ──────────────────────────────────────────────────────────────

describe('MarkAllRead', () => {
  it('adds all provided ids to readIds', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'MarkAllRead', ids: ['a1', 'a2'] });
    expect(next.readIds.has('a1')).toBe(true);
    expect(next.readIds.has('a2')).toBe(true);
  });

  it('preserves previously read ids', () => {
    const sm: InboxSM = { ...createInitialSM(), readIds: new Set(['a0']) };
    const next = transition(sm, { type: 'MarkAllRead', ids: ['a1', 'a2'] });
    expect(next.readIds.has('a0')).toBe(true);
  });

  it('is a no-op for an empty ids array', () => {
    const sm: InboxSM = { ...createInitialSM(), readIds: new Set(['a1']) };
    const next = transition(sm, { type: 'MarkAllRead', ids: [] });
    expect(next.readIds.size).toBe(1);
  });
});

// ─── AddNoteOpened ────────────────────────────────────────────────────────────

describe('AddNoteOpened', () => {
  it('transitions status to adding-note with empty text', () => {
    const sm: InboxSM = { ...createInitialSM(), selectedId: 'a1' };
    const next = transition(sm, { type: 'AddNoteOpened' });
    expect(next.status.kind).toBe('adding-note');
    if (next.status.kind === 'adding-note') {
      expect(next.status.text).toBe('');
    }
  });

  it('is a no-op when no alert is selected', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'AddNoteOpened' });
    expect(next.status.kind).toBe('idle');
  });
});

// ─── NoteChanged ─────────────────────────────────────────────────────────────

describe('NoteChanged', () => {
  it('updates the note text in adding-note status', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      selectedId: 'a1',
      status: { kind: 'adding-note', text: '' },
    };
    const next = transition(sm, { type: 'NoteChanged', text: 'Fixed manually' });
    expect(next.status.kind).toBe('adding-note');
    if (next.status.kind === 'adding-note') {
      expect(next.status.text).toBe('Fixed manually');
    }
  });

  it('is a no-op when status is not adding-note', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'NoteChanged', text: 'something' });
    expect(next.status.kind).toBe('idle');
  });
});

// ─── ResolveRequested ────────────────────────────────────────────────────────

describe('ResolveRequested', () => {
  it('transitions status to applying', () => {
    const sm: InboxSM = { ...createInitialSM(), selectedId: 'a1' };
    const next = transition(sm, { type: 'ResolveRequested' });
    expect(next.status.kind).toBe('applying');
  });

  it('transitions from adding-note to applying', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      selectedId: 'a1',
      status: { kind: 'adding-note', text: 'done' },
    };
    const next = transition(sm, { type: 'ResolveRequested' });
    expect(next.status.kind).toBe('applying');
  });

  it('is a no-op when no alert is selected', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ResolveRequested' });
    expect(next.status.kind).toBe('idle');
  });
});

// ─── ActionApplyRequested ────────────────────────────────────────────────────

describe('ActionApplyRequested', () => {
  it('transitions status to confirming with the action payload', () => {
    const sm: InboxSM = { ...createInitialSM(), selectedId: 'a1' };
    const next = transition(sm, { type: 'ActionApplyRequested', action: ACTION });
    expect(next.status.kind).toBe('confirming');
    if (next.status.kind === 'confirming') {
      expect(next.status.action).toBe(ACTION);
    }
  });
});

// ─── ActionApplyConfirmed ────────────────────────────────────────────────────

describe('ActionApplyConfirmed', () => {
  it('transitions from confirming to applying', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      status: { kind: 'confirming', action: ACTION },
    };
    const next = transition(sm, { type: 'ActionApplyConfirmed' });
    expect(next.status.kind).toBe('applying');
  });

  it('is a no-op when status is not confirming', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ActionApplyConfirmed' });
    expect(next.status.kind).toBe('idle');
  });
});

// ─── ActionApplyCancelled ────────────────────────────────────────────────────

describe('ActionApplyCancelled', () => {
  it('returns status to idle', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      status: { kind: 'confirming', action: ACTION },
    };
    const next = transition(sm, { type: 'ActionApplyCancelled' });
    expect(next.status.kind).toBe('idle');
  });
});

// ─── SaveResolved ─────────────────────────────────────────────────────────────

describe('SaveResolved', () => {
  it('clears selectedId', () => {
    const sm: InboxSM = { ...createInitialSM(), selectedId: 'a1', status: { kind: 'applying' } };
    const next = transition(sm, { type: 'SaveResolved' });
    expect(next.selectedId).toBeNull();
  });

  it('returns status to idle', () => {
    const sm: InboxSM = { ...createInitialSM(), selectedId: 'a1', status: { kind: 'applying' } };
    const next = transition(sm, { type: 'SaveResolved' });
    expect(next.status.kind).toBe('idle');
  });

  it('preserves readIds', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      selectedId: 'a1',
      readIds: new Set(['a1']),
      status: { kind: 'applying' },
    };
    const next = transition(sm, { type: 'SaveResolved' });
    expect(next.readIds.has('a1')).toBe(true);
  });
});

// ─── SaveFailed ───────────────────────────────────────────────────────────────

describe('SaveFailed', () => {
  it('transitions status to error with the message', () => {
    const sm: InboxSM = { ...createInitialSM(), status: { kind: 'applying' } };
    const next = transition(sm, { type: 'SaveFailed', message: 'Network error' });
    expect(next.status.kind).toBe('error');
    if (next.status.kind === 'error') {
      expect(next.status.message).toBe('Network error');
    }
  });

  it('preserves selectedId on failure', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      selectedId: 'a1',
      status: { kind: 'applying' },
    };
    const next = transition(sm, { type: 'SaveFailed', message: 'oops' });
    expect(next.selectedId).toBe('a1');
  });
});

// ─── ErrorDismissed ───────────────────────────────────────────────────────────

describe('ErrorDismissed', () => {
  it('returns status to idle', () => {
    const sm: InboxSM = {
      ...createInitialSM(),
      status: { kind: 'error', message: 'oops' },
    };
    const next = transition(sm, { type: 'ErrorDismissed' });
    expect(next.status.kind).toBe('idle');
  });
});

// ─── SET_TOAST ────────────────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets the toast message', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_TOAST', message: 'Alert resolved' });
    expect(next.toast).toBe('Alert resolved');
  });

  it('clears the toast when message is undefined', () => {
    const sm: InboxSM = { ...createInitialSM(), toast: 'something' };
    const next = transition(sm, { type: 'SET_TOAST', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});

// ─── Full flow: resolve with note ─────────────────────────────────────────────

describe('full flow: resolve with note', () => {
  it('idle → select → add note → type → resolve → resolved', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'AlertSelected', id: 'a1' });
    sm = transition(sm, { type: 'AddNoteOpened' });
    sm = transition(sm, { type: 'NoteChanged', text: 'Fixed manually' });

    expect(sm.status.kind).toBe('adding-note');
    if (sm.status.kind === 'adding-note') {
      expect(sm.status.text).toBe('Fixed manually');
    }

    sm = transition(sm, { type: 'ResolveRequested' });
    expect(sm.status.kind).toBe('applying');

    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.status.kind).toBe('idle');
    expect(sm.selectedId).toBeNull();
  });
});

// ─── Full flow: apply suggested action ───────────────────────────────────────

describe('full flow: apply suggested action', () => {
  it('idle → select → request apply → confirm → resolved', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'AlertSelected', id: 'a1' });
    sm = transition(sm, { type: 'ActionApplyRequested', action: ACTION });

    expect(sm.status.kind).toBe('confirming');

    sm = transition(sm, { type: 'ActionApplyConfirmed' });
    expect(sm.status.kind).toBe('applying');

    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.status.kind).toBe('idle');
    expect(sm.selectedId).toBeNull();
  });

  it('idle → select → request apply → cancel → back to idle', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'AlertSelected', id: 'a1' });
    sm = transition(sm, { type: 'ActionApplyRequested', action: ACTION });
    sm = transition(sm, { type: 'ActionApplyCancelled' });

    expect(sm.status.kind).toBe('idle');
    expect(sm.selectedId).toBe('a1');
  });
});

// ─── Full flow: error recovery ────────────────────────────────────────────────

describe('error recovery', () => {
  it('applying → failed → dismissed → idle', () => {
    let sm: InboxSM = { ...createInitialSM(), selectedId: 'a1', status: { kind: 'applying' } };
    sm = transition(sm, { type: 'SaveFailed', message: 'Server error' });
    expect(sm.status.kind).toBe('error');

    sm = transition(sm, { type: 'ErrorDismissed' });
    expect(sm.status.kind).toBe('idle');
    expect(sm.selectedId).toBe('a1');
  });
});
