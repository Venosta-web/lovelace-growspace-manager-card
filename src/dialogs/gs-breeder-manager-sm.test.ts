/**
 * Unit tests for the Breeder Manager State Machine.
 *
 * Pure transition functions — no DOM, no Lit component mounting.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  type BreederManagerSM,
} from './gs-breeder-manager-sm';

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('starts on the list view', () => {
    const sm = createInitialSM();
    expect(sm.activeView).toBe('list');
  });

  it('starts with idle status', () => {
    const sm = createInitialSM();
    expect(sm.status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    const sm = createInitialSM();
    expect(sm.toast).toBeUndefined();
  });

  it('starts with list sub idle', () => {
    const sm = createInitialSM();
    expect(sm.views.list.sub.kind).toBe('idle');
  });

  it('starts with empty editor draft', () => {
    const sm = createInitialSM();
    expect(sm.views.editor.draft.name).toBe('');
    expect(sm.views.editor.draft.logo).toBe('');
    expect(sm.views.editor.draft.originalName).toBeNull();
  });

  it('starts with editor sub idle', () => {
    const sm = createInitialSM();
    expect(sm.views.editor.sub.kind).toBe('idle');
  });
});

// ─── EDIT_REQUESTED ───────────────────────────────────────────────────────────

describe('EDIT_REQUESTED', () => {
  it('switches to editor view', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'EDIT_REQUESTED', name: 'Royal Queen Seeds', logo: 'data:img' });
    expect(next.activeView).toBe('editor');
  });

  it('seeds draft with provided name and logo', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'EDIT_REQUESTED', name: 'Royal Queen Seeds', logo: 'data:img' });
    expect(next.views.editor.draft.name).toBe('Royal Queen Seeds');
    expect(next.views.editor.draft.logo).toBe('data:img');
  });

  it('sets originalName to the provided name (edit mode)', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'EDIT_REQUESTED', name: 'Royal Queen Seeds', logo: '' });
    expect(next.views.editor.draft.originalName).toBe('Royal Queen Seeds');
  });

  it('sets originalName to null when no name provided (new breeder)', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'EDIT_REQUESTED' });
    expect(next.views.editor.draft.originalName).toBeNull();
  });

  it('resets editor sub to idle', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'EDIT_REQUESTED', name: 'Barneys' });
    expect(next.views.editor.sub.kind).toBe('idle');
  });
});

// ─── BACK_TO_LIST ─────────────────────────────────────────────────────────────

describe('BACK_TO_LIST', () => {
  it('switches to list view', () => {
    const sm: BreederManagerSM = { ...createInitialSM(), activeView: 'editor' };
    const next = transition(sm, { type: 'BACK_TO_LIST' });
    expect(next.activeView).toBe('list');
  });
});

// ─── FIELD_CHANGED ────────────────────────────────────────────────────────────

describe('FIELD_CHANGED', () => {
  it('updates the name field in the editor draft', () => {
    const sm = transition(createInitialSM(), { type: 'EDIT_REQUESTED' });
    const next = transition(sm, { type: 'FIELD_CHANGED', field: 'name', value: 'Barneys Farm' });
    expect(next.views.editor.draft.name).toBe('Barneys Farm');
  });

  it('updates the logo field in the editor draft', () => {
    const sm = transition(createInitialSM(), { type: 'EDIT_REQUESTED' });
    const next = transition(sm, { type: 'FIELD_CHANGED', field: 'logo', value: 'data:newlogo' });
    expect(next.views.editor.draft.logo).toBe('data:newlogo');
  });

  it('does not change originalName', () => {
    const sm = transition(createInitialSM(), { type: 'EDIT_REQUESTED', name: 'Old Name' });
    const next = transition(sm, { type: 'FIELD_CHANGED', field: 'name', value: 'New Name' });
    expect(next.views.editor.draft.originalName).toBe('Old Name');
  });
});

// ─── LOGO_UPLOAD_STARTED / LOGO_UPLOAD_RESOLVED ───────────────────────────────

describe('LOGO_UPLOAD_STARTED', () => {
  it('sets editor sub to uploading', () => {
    const sm = transition(createInitialSM(), { type: 'EDIT_REQUESTED' });
    const next = transition(sm, { type: 'LOGO_UPLOAD_STARTED' });
    expect(next.views.editor.sub.kind).toBe('uploading');
  });
});

describe('LOGO_UPLOAD_RESOLVED', () => {
  it('sets logo in draft from base64', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'EDIT_REQUESTED' }),
      { type: 'LOGO_UPLOAD_STARTED' },
    );
    const next = transition(sm, { type: 'LOGO_UPLOAD_RESOLVED', base64: 'data:compressed' });
    expect(next.views.editor.draft.logo).toBe('data:compressed');
  });

  it('returns editor sub to idle', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'EDIT_REQUESTED' }),
      { type: 'LOGO_UPLOAD_STARTED' },
    );
    const next = transition(sm, { type: 'LOGO_UPLOAD_RESOLVED', base64: 'data:compressed' });
    expect(next.views.editor.sub.kind).toBe('idle');
  });
});

// ─── DELETE_REQUESTED / CANCEL_DELETE ─────────────────────────────────────────

describe('DELETE_REQUESTED', () => {
  it('sets list sub to confirm-delete with the breeder name', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'DELETE_REQUESTED', name: 'Barney Farm' });
    expect(next.views.list.sub).toEqual({ kind: 'confirm-delete', name: 'Barney Farm' });
  });
});

describe('CANCEL_DELETE', () => {
  it('returns list sub to idle', () => {
    const sm = transition(createInitialSM(), { type: 'DELETE_REQUESTED', name: 'Barney Farm' });
    const next = transition(sm, { type: 'CANCEL_DELETE' });
    expect(next.views.list.sub.kind).toBe('idle');
  });
});

// ─── DELETE_CONFIRMED / DELETE_RESOLVED / DELETE_FAILED ───────────────────────

describe('DELETE_CONFIRMED', () => {
  it('sets status to applying', () => {
    const sm = transition(createInitialSM(), { type: 'DELETE_REQUESTED', name: 'Barney Farm' });
    const next = transition(sm, { type: 'DELETE_CONFIRMED' });
    expect(next.status.kind).toBe('applying');
  });
});

describe('DELETE_RESOLVED', () => {
  it('returns status to idle', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'DELETE_REQUESTED', name: 'Barney Farm' }),
      { type: 'DELETE_CONFIRMED' },
    );
    const next = transition(sm, { type: 'DELETE_RESOLVED' });
    expect(next.status.kind).toBe('idle');
  });

  it('resets list sub to idle', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'DELETE_REQUESTED', name: 'Barney Farm' }),
      { type: 'DELETE_CONFIRMED' },
    );
    const next = transition(sm, { type: 'DELETE_RESOLVED' });
    expect(next.views.list.sub.kind).toBe('idle');
  });

  it('sets a toast message', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'DELETE_REQUESTED', name: 'Barney Farm' }),
      { type: 'DELETE_CONFIRMED' },
    );
    const next = transition(sm, { type: 'DELETE_RESOLVED' });
    expect(next.toast).toBeDefined();
  });
});

describe('DELETE_FAILED', () => {
  it('sets status to error with message', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'DELETE_REQUESTED', name: 'Barney Farm' }),
      { type: 'DELETE_CONFIRMED' },
    );
    const next = transition(sm, { type: 'DELETE_FAILED', message: 'Server error' });
    expect(next.status).toEqual({ kind: 'error', message: 'Server error' });
  });
});

// ─── SAVE_REQUESTED / SAVE_RESOLVED / SAVE_FAILED ────────────────────────────

describe('SAVE_REQUESTED', () => {
  it('sets status to applying', () => {
    const sm = transition(createInitialSM(), { type: 'EDIT_REQUESTED', name: 'RQS' });
    const next = transition(sm, { type: 'SAVE_REQUESTED' });
    expect(next.status.kind).toBe('applying');
  });
});

describe('SAVE_RESOLVED', () => {
  it('returns status to idle', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'EDIT_REQUESTED', name: 'RQS' }),
      { type: 'SAVE_REQUESTED' },
    );
    const next = transition(sm, { type: 'SAVE_RESOLVED' });
    expect(next.status.kind).toBe('idle');
  });

  it('switches back to list view', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'EDIT_REQUESTED', name: 'RQS' }),
      { type: 'SAVE_REQUESTED' },
    );
    const next = transition(sm, { type: 'SAVE_RESOLVED' });
    expect(next.activeView).toBe('list');
  });

  it('sets a toast message', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'EDIT_REQUESTED', name: 'RQS' }),
      { type: 'SAVE_REQUESTED' },
    );
    const next = transition(sm, { type: 'SAVE_RESOLVED' });
    expect(next.toast).toBeDefined();
  });
});

describe('SAVE_FAILED', () => {
  it('sets status to error with message', () => {
    const sm = transition(
      transition(createInitialSM(), { type: 'EDIT_REQUESTED', name: 'RQS' }),
      { type: 'SAVE_REQUESTED' },
    );
    const next = transition(sm, { type: 'SAVE_FAILED', message: 'Network error' });
    expect(next.status).toEqual({ kind: 'error', message: 'Network error' });
  });
});

// ─── SET_TOAST ────────────────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets the toast message', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_TOAST', message: 'Hello' });
    expect(next.toast).toBe('Hello');
  });

  it('clears the toast when message is undefined', () => {
    const sm = { ...createInitialSM(), toast: 'old message' };
    const next = transition(sm, { type: 'SET_TOAST', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});
