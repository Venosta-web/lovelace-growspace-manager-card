/**
 * Unit tests for the Strain Editor View State Machine.
 * Pure transition functions — no DOM, no Lit component mounting.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  isEditorDirty,
} from './strain-editor-view-sm';
import type { StrainEntry } from '../features/plants/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aStrain(overrides: Partial<StrainEntry> = {}): Partial<StrainEntry> {
  return { strain: 'OG Kush', phenotype: 'A', key: 'og-kush-a', ...overrides };
}

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('creates SM with idle status', () => {
    const sm = createInitialSM();
    expect(sm.status.kind).toBe('idle');
  });

  it('creates SM with idle sub-state', () => {
    const sm = createInitialSM();
    expect(sm.sub.kind).toBe('idle');
  });

  it('creates SM with empty history', () => {
    const sm = createInitialSM();
    expect(sm.history).toEqual([]);
  });

  it('creates SM with no toast', () => {
    const sm = createInitialSM();
    expect(sm.toast).toBeUndefined();
  });

  it('seeds draft from provided strain', () => {
    const strain = aStrain({ strain: 'White Widow' });
    const sm = createInitialSM(strain);
    expect(sm.draft.strain).toBe('White Widow');
  });

  it('creates SM with empty draft when no strain provided', () => {
    const sm = createInitialSM();
    expect(sm.draft).toEqual({});
  });
});

// ─── DraftFieldChanged ────────────────────────────────────────────────────────

describe('DraftFieldChanged', () => {
  it('updates the changed field', () => {
    const sm = createInitialSM(aStrain());
    const next = transition(sm, { type: 'DraftFieldChanged', field: 'strain', value: 'Gelato' });
    expect(next.draft.strain).toBe('Gelato');
  });

  it('leaves other fields untouched', () => {
    const sm = createInitialSM(aStrain({ breeder: 'DNA Genetics' }));
    const next = transition(sm, { type: 'DraftFieldChanged', field: 'strain', value: 'Gelato' });
    expect(next.draft.breeder).toBe('DNA Genetics');
  });

  it('does not mutate the original SM', () => {
    const sm = createInitialSM(aStrain({ strain: 'Original' }));
    transition(sm, { type: 'DraftFieldChanged', field: 'strain', value: 'Changed' });
    expect(sm.draft.strain).toBe('Original');
  });
});

// ─── Save lifecycle ───────────────────────────────────────────────────────────

describe('SaveRequested', () => {
  it('transitions status to applying', () => {
    const sm = createInitialSM(aStrain());
    const next = transition(sm, { type: 'SaveRequested' });
    expect(next.status.kind).toBe('applying');
  });
});

describe('SaveResolved', () => {
  it('transitions status to done', () => {
    let sm = createInitialSM(aStrain());
    sm = transition(sm, { type: 'SaveRequested' });
    const next = transition(sm, { type: 'SaveResolved' });
    expect(next.status.kind).toBe('done');
  });
});

describe('SaveFailed', () => {
  it('transitions status to error with message', () => {
    let sm = createInitialSM(aStrain());
    sm = transition(sm, { type: 'SaveRequested' });
    const next = transition(sm, { type: 'SaveFailed', message: 'Network error' });
    expect(next.status.kind).toBe('error');
    if (next.status.kind === 'error') {
      expect(next.status.message).toBe('Network error');
    }
  });

  it('sets the error as toast', () => {
    let sm = createInitialSM(aStrain());
    sm = transition(sm, { type: 'SaveRequested' });
    const next = transition(sm, { type: 'SaveFailed', message: 'Network error' });
    expect(next.toast).toBe('Network error');
  });
});

// ─── Navigation / history ─────────────────────────────────────────────────────

describe('NavigateToRelated', () => {
  it('replaces draft with the related strain', () => {
    const sm = createInitialSM(aStrain({ strain: 'OG Kush' }));
    const related = aStrain({ strain: 'White Widow', key: 'white-widow-a' });
    const next = transition(sm, { type: 'NavigateToRelated', strain: related });
    expect(next.draft.strain).toBe('White Widow');
  });

  it('pushes the previous draft onto history', () => {
    const original = aStrain({ strain: 'OG Kush' });
    const sm = createInitialSM(original);
    const next = transition(sm, {
      type: 'NavigateToRelated',
      strain: aStrain({ strain: 'White Widow', key: 'white-widow-a' }),
    });
    expect(next.history).toHaveLength(1);
    expect(next.history[0].strain).toBe('OG Kush');
  });

  it('stacks history for multiple navigations', () => {
    let sm = createInitialSM(aStrain({ strain: 'A', key: 'a' }));
    sm = transition(sm, { type: 'NavigateToRelated', strain: aStrain({ strain: 'B', key: 'b' }) });
    sm = transition(sm, { type: 'NavigateToRelated', strain: aStrain({ strain: 'C', key: 'c' }) });
    expect(sm.history).toHaveLength(2);
    expect(sm.draft.strain).toBe('C');
  });
});

describe('NavigateBack', () => {
  it('restores the previous draft from history', () => {
    let sm = createInitialSM(aStrain({ strain: 'OG Kush' }));
    sm = transition(sm, {
      type: 'NavigateToRelated',
      strain: aStrain({ strain: 'White Widow', key: 'white-widow-a' }),
    });
    const next = transition(sm, { type: 'NavigateBack' });
    expect(next.draft.strain).toBe('OG Kush');
  });

  it('pops the entry from history', () => {
    let sm = createInitialSM(aStrain({ strain: 'OG Kush' }));
    sm = transition(sm, {
      type: 'NavigateToRelated',
      strain: aStrain({ strain: 'White Widow', key: 'white-widow-a' }),
    });
    const next = transition(sm, { type: 'NavigateBack' });
    expect(next.history).toHaveLength(0);
  });

  it('is a no-op when history is empty', () => {
    const sm = createInitialSM(aStrain({ strain: 'OG Kush' }));
    const next = transition(sm, { type: 'NavigateBack' });
    expect(next.draft.strain).toBe('OG Kush');
    expect(next.history).toHaveLength(0);
  });
});

// ─── Sub-state: crop overlay ──────────────────────────────────────────────────

describe('CropRequested', () => {
  it('enters cropping sub-state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'CropRequested' });
    expect(next.sub.kind).toBe('cropping');
  });
});

describe('CropExited', () => {
  it('returns to idle sub-state', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'CropRequested' });
    const next = transition(sm, { type: 'CropExited' });
    expect(next.sub.kind).toBe('idle');
  });
});

// ─── Sub-state: lineage editing ───────────────────────────────────────────────

describe('LineageEditRequested', () => {
  it('enters lineage-editing sub-state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'LineageEditRequested' });
    expect(next.sub.kind).toBe('lineage-editing');
  });
});

describe('LineageEditExited', () => {
  it('returns to idle sub-state', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'LineageEditRequested' });
    const next = transition(sm, { type: 'LineageEditExited' });
    expect(next.sub.kind).toBe('idle');
  });
});

// ─── Sub-state: import dialog ─────────────────────────────────────────────────

describe('ImportRequested', () => {
  it('enters importing sub-state with replace=false', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ImportRequested' });
    expect(next.sub.kind).toBe('importing');
    if (next.sub.kind === 'importing') {
      expect(next.sub.replace).toBe(false);
    }
  });
});

describe('ImportReplaceToggled', () => {
  it('flips replace flag from false to true', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'ImportRequested' });
    const next = transition(sm, { type: 'ImportReplaceToggled' });
    if (next.sub.kind === 'importing') {
      expect(next.sub.replace).toBe(true);
    }
  });

  it('flips replace flag from true to false', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'ImportRequested' });
    sm = transition(sm, { type: 'ImportReplaceToggled' });
    const next = transition(sm, { type: 'ImportReplaceToggled' });
    if (next.sub.kind === 'importing') {
      expect(next.sub.replace).toBe(false);
    }
  });

  it('is a no-op when not in importing state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'ImportReplaceToggled' });
    expect(next.sub.kind).toBe('idle');
  });
});

describe('ImportCompleted / ImportCancelled', () => {
  it('ImportCompleted returns to idle', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'ImportRequested' });
    expect(transition(sm, { type: 'ImportCompleted' }).sub.kind).toBe('idle');
  });

  it('ImportCancelled returns to idle', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'ImportRequested' });
    expect(transition(sm, { type: 'ImportCancelled' }).sub.kind).toBe('idle');
  });
});

// ─── Sub-state: seedfinder ────────────────────────────────────────────────────

describe('SeedfinderOpened / SeedfinderClosed', () => {
  it('enters seedfinder sub-state', () => {
    const sm = createInitialSM();
    expect(transition(sm, { type: 'SeedfinderOpened' }).sub.kind).toBe('seedfinder');
  });

  it('returns to idle on close', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'SeedfinderOpened' });
    expect(transition(sm, { type: 'SeedfinderClosed' }).sub.kind).toBe('idle');
  });
});

// ─── Sub-state: breeder flow ──────────────────────────────────────────────────

describe('BreederListOpened', () => {
  it('enters breeder-list sub-state', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BreederListOpened' });
    expect(next.sub.kind).toBe('breeder-list');
  });
});

describe('BreederEditRequested', () => {
  it('enters breeder-editing sub-state with provided draft', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederListOpened' });
    const next = transition(sm, {
      type: 'BreederEditRequested',
      name: 'DNA Genetics',
      logo: 'https://example.com/logo.png',
    });
    expect(next.sub.kind).toBe('breeder-editing');
    if (next.sub.kind === 'breeder-editing') {
      expect(next.sub.draft.name).toBe('DNA Genetics');
      expect(next.sub.draft.originalName).toBe('DNA Genetics');
    }
  });
});

describe('BreederAddRequested', () => {
  it('enters breeder-editing with empty draft', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BreederAddRequested' });
    expect(next.sub.kind).toBe('breeder-editing');
    if (next.sub.kind === 'breeder-editing') {
      expect(next.sub.draft.name).toBe('');
      expect(next.sub.draft.logo).toBe('');
      expect(next.sub.draft.originalName).toBe('');
    }
  });
});

describe('BreederEditFieldChanged', () => {
  it('updates name field in breeder draft', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederAddRequested' });
    const next = transition(sm, {
      type: 'BreederEditFieldChanged',
      field: 'name',
      value: 'Barney Farm',
    });
    if (next.sub.kind === 'breeder-editing') {
      expect(next.sub.draft.name).toBe('Barney Farm');
    }
  });

  it('is a no-op when not in breeder-editing', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BreederEditFieldChanged', field: 'name', value: 'X' });
    expect(next.sub.kind).toBe('idle');
  });
});

describe('BreederSaved', () => {
  it('returns to breeder-list after save', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederAddRequested' });
    expect(transition(sm, { type: 'BreederSaved' }).sub.kind).toBe('breeder-list');
  });
});

describe('BreederDeleteRequested', () => {
  it('enters breeder-confirm-delete with the breeder name', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederListOpened' });
    const next = transition(sm, { type: 'BreederDeleteRequested', name: 'DNA Genetics' });
    expect(next.sub.kind).toBe('breeder-confirm-delete');
    if (next.sub.kind === 'breeder-confirm-delete') {
      expect(next.sub.name).toBe('DNA Genetics');
    }
  });
});

describe('BreederDeleteConfirmed / BreederDeleteCancelled', () => {
  it('BreederDeleteConfirmed returns to breeder-list', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederListOpened' });
    sm = transition(sm, { type: 'BreederDeleteRequested', name: 'DNA Genetics' });
    expect(transition(sm, { type: 'BreederDeleteConfirmed' }).sub.kind).toBe('breeder-list');
  });

  it('BreederDeleteCancelled returns to breeder-list', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederListOpened' });
    sm = transition(sm, { type: 'BreederDeleteRequested', name: 'DNA Genetics' });
    expect(transition(sm, { type: 'BreederDeleteCancelled' }).sub.kind).toBe('breeder-list');
  });
});

describe('BreederDialogClosed', () => {
  it('returns to idle from any breeder sub-state', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'BreederListOpened' });
    expect(transition(sm, { type: 'BreederDialogClosed' }).sub.kind).toBe('idle');
  });
});

// ─── Sub-state: photo menu ────────────────────────────────────────────────────

describe('PhotoMenuToggled', () => {
  it('opens photo-menu from idle', () => {
    const sm = createInitialSM();
    expect(transition(sm, { type: 'PhotoMenuToggled' }).sub.kind).toBe('photo-menu');
  });

  it('closes photo-menu when already open', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'PhotoMenuToggled' });
    expect(transition(sm, { type: 'PhotoMenuToggled' }).sub.kind).toBe('idle');
  });
});

describe('PhotoMenuClosed', () => {
  it('returns to idle', () => {
    let sm = createInitialSM();
    sm = transition(sm, { type: 'PhotoMenuToggled' });
    expect(transition(sm, { type: 'PhotoMenuClosed' }).sub.kind).toBe('idle');
  });
});

// ─── ToastDismissed ───────────────────────────────────────────────────────────

describe('ToastDismissed', () => {
  it('clears the toast', () => {
    let sm = createInitialSM(aStrain());
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveFailed', message: 'Oops' });
    const next = transition(sm, { type: 'ToastDismissed' });
    expect(next.toast).toBeUndefined();
  });
});

// ─── isEditorDirty ────────────────────────────────────────────────────────────

describe('isEditorDirty', () => {
  it('returns false when draft matches original', () => {
    const original = aStrain({ strain: 'OG Kush', phenotype: 'A' });
    const sm = createInitialSM(original);
    expect(isEditorDirty(sm, original)).toBe(false);
  });

  it('returns true when a field has changed', () => {
    const original = aStrain({ strain: 'OG Kush' });
    let sm = createInitialSM(original);
    sm = transition(sm, { type: 'DraftFieldChanged', field: 'strain', value: 'Gelato' });
    expect(isEditorDirty(sm, original)).toBe(true);
  });

  it('returns true when no original provided and draft is non-empty', () => {
    const sm = createInitialSM(aStrain());
    expect(isEditorDirty(sm)).toBe(true);
  });

  it('returns false when no original and draft is empty', () => {
    const sm = createInitialSM();
    expect(isEditorDirty(sm)).toBe(false);
  });
});
