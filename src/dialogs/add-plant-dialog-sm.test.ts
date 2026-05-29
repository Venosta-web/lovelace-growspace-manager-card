/**
 * Unit tests for the Add Plant Dialog State Machine.
 *
 * Pure transition tests — no DOM, no Lit component mounting.
 * Co-located with the SM module per the Co-location Convention.
 */

import { describe, it, expect } from 'vitest';
import { createInitialSM, transition } from './add-plant-dialog-sm';

// ─── createInitialSM ──────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('defaults to the add tab', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    expect(sm.activeTab).toBe('add');
  });

  it('starts with idle status', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    expect(sm.status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    expect(sm.toast).toBeUndefined();
  });

  it('seeds row and col into add draft', () => {
    const sm = createInitialSM({ row: 2, col: 3 });
    expect(sm.tabs.add.draft.row).toBe(2);
    expect(sm.tabs.add.draft.col).toBe(3);
  });

  it('starts add tab on step-identity', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    expect(sm.tabs.add.sub.kind).toBe('step-identity');
  });

  it('starts clone and seedling tabs with idle sub', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    expect(sm.tabs.clone.sub.kind).toBe('idle');
    expect(sm.tabs.seedling.sub.kind).toBe('idle');
  });

  it('starts clone and seedling with no selected plant', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    expect(sm.tabs.clone.draft.selectedPlantId).toBeNull();
    expect(sm.tabs.seedling.draft.selectedPlantId).toBeNull();
  });
});

// ─── Tab switching ────────────────────────────────────────────────────────────

describe('TabSelected', () => {
  it('switches from add to clone', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'TabSelected', tab: 'clone' });
    expect(next.activeTab).toBe('clone');
  });

  it('switches from add to seedling', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'TabSelected', tab: 'seedling' });
    expect(next.activeTab).toBe('seedling');
  });

  it('switching back to add resets wizard to step-identity', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'OG Kush' });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strainQuery', value: 'OG Kush' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    expect(sm.tabs.add.sub.kind).toBe('step-source');

    sm = transition(sm, { type: 'TabSelected', tab: 'clone' });
    sm = transition(sm, { type: 'TabSelected', tab: 'add' });
    expect(sm.tabs.add.sub.kind).toBe('step-identity');
  });
});

// ─── Wizard navigation ────────────────────────────────────────────────────────

describe('WizardAdvanced', () => {
  it('advances from step-identity to step-source when strain is set', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'OG Kush' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    expect(sm.tabs.add.sub.kind).toBe('step-source');
  });

  it('is a no-op from step-identity when strain is empty', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'WizardAdvanced' });
    expect(next.tabs.add.sub.kind).toBe('step-identity');
  });

  it('advances from step-source to step-schedule', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'OG Kush' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    expect(sm.tabs.add.sub.kind).toBe('step-schedule');
  });

  it('is a no-op from step-schedule (last step)', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'OG Kush' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    const next = transition(sm, { type: 'WizardAdvanced' });
    expect(next.tabs.add.sub.kind).toBe('step-schedule');
  });
});

describe('WizardBacked', () => {
  it('goes from step-source back to step-identity', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'OG Kush' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    sm = transition(sm, { type: 'WizardBacked' });
    expect(sm.tabs.add.sub.kind).toBe('step-identity');
  });

  it('goes from step-schedule back to step-source', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'OG Kush' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    sm = transition(sm, { type: 'WizardAdvanced' });
    sm = transition(sm, { type: 'WizardBacked' });
    expect(sm.tabs.add.sub.kind).toBe('step-source');
  });

  it('is a no-op from step-identity', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'WizardBacked' });
    expect(next.tabs.add.sub.kind).toBe('step-identity');
  });
});

// ─── Draft mutations ──────────────────────────────────────────────────────────

describe('DraftFieldChanged — add tab', () => {
  it('updates strain', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'White Widow' });
    expect(next.tabs.add.draft.strain).toBe('White Widow');
  });

  it('updates strainQuery', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strainQuery', value: 'White' });
    expect(next.tabs.add.draft.strainQuery).toBe('White');
  });

  it('updates phenotype', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'phenotype', value: '#3' });
    expect(next.tabs.add.draft.phenotype).toBe('#3');
  });

  it('updates addToLibrary', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'addToLibrary', value: true });
    expect(next.tabs.add.draft.addToLibrary).toBe(true);
  });

  it('updates sourceType', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'sourceType', value: 'clone' });
    expect(next.tabs.add.draft.sourceType).toBe('clone');
  });

  it('updates a date field (vegStart)', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'vegStart', value: '2026-05-01' });
    expect(next.tabs.add.draft.vegStart).toBe('2026-05-01');
  });

  it('does not mutate the original SM', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    transition(sm, { type: 'DraftFieldChanged', tab: 'add', field: 'strain', value: 'Mutant' });
    expect(sm.tabs.add.draft.strain).toBe('');
  });
});

describe('DraftFieldChanged — clone tab', () => {
  it('updates selectedPlantId', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'TabSelected', tab: 'clone' });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'clone', field: 'selectedPlantId', value: 'plant-42' });
    expect(next.tabs.clone.draft.selectedPlantId).toBe('plant-42');
  });
});

describe('DraftFieldChanged — seedling tab', () => {
  it('updates selectedPlantId', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'TabSelected', tab: 'seedling' });
    const next = transition(sm, { type: 'DraftFieldChanged', tab: 'seedling', field: 'selectedPlantId', value: 'plant-99' });
    expect(next.tabs.seedling.draft.selectedPlantId).toBe('plant-99');
  });
});

// ─── SiblingPlantSelected ─────────────────────────────────────────────────────

describe('SiblingPlantSelected', () => {
  it('pre-fills strain, strainQuery, and phenotype from sibling', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, {
      type: 'SiblingPlantSelected',
      strain: 'Northern Lights',
      phenotype: '#5',
      cloneStart: '2026-05-15',
    });
    expect(next.tabs.add.draft.strain).toBe('Northern Lights');
    expect(next.tabs.add.draft.strainQuery).toBe('Northern Lights');
    expect(next.tabs.add.draft.phenotype).toBe('#5');
  });

  it('sets cloneStart on the add draft', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, {
      type: 'SiblingPlantSelected',
      strain: 'Northern Lights',
      phenotype: '',
      cloneStart: '2026-05-15',
    });
    expect(next.tabs.add.draft.cloneStart).toBe('2026-05-15');
  });

  it('de-selects sibling when same strain is passed (toggle off)', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, {
      type: 'SiblingPlantSelected',
      strain: 'Northern Lights',
      phenotype: '#5',
      cloneStart: '2026-05-15',
    });
    const next = transition(sm, {
      type: 'SiblingPlantSelected',
      strain: 'Northern Lights',
      phenotype: '#5',
      cloneStart: '2026-05-15',
    });
    expect(next.tabs.add.draft.siblingPlantId).toBeNull();
  });
});

// ─── Status transitions ───────────────────────────────────────────────────────

describe('SaveRequested', () => {
  it('moves status to applying', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'SaveRequested' });
    expect(next.status.kind).toBe('applying');
  });
});

describe('SaveResolved', () => {
  it('moves status from applying to done', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'SaveRequested' });
    const next = transition(sm, { type: 'SaveResolved' });
    expect(next.status.kind).toBe('done');
  });
});

describe('SaveFailed', () => {
  it('moves status to error with message', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'SaveRequested' });
    const next = transition(sm, { type: 'SaveFailed', message: 'Backend error' });
    expect(next.status.kind).toBe('error');
    if (next.status.kind === 'error') {
      expect(next.status.message).toBe('Backend error');
    }
  });

  it('sets toast on error', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'SaveRequested' });
    const next = transition(sm, { type: 'SaveFailed', message: 'Backend error' });
    expect(next.toast).toBe('Backend error');
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────

describe('SetToast', () => {
  it('sets toast message', () => {
    const sm = createInitialSM({ row: 0, col: 0 });
    const next = transition(sm, { type: 'SetToast', message: 'Saved!' });
    expect(next.toast).toBe('Saved!');
  });

  it('clears toast when message is undefined', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'SetToast', message: 'Saved!' });
    const next = transition(sm, { type: 'SetToast', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});

// ─── Error recovery ───────────────────────────────────────────────────────────

describe('error recovery', () => {
  it('resets status to idle from error', () => {
    let sm = createInitialSM({ row: 0, col: 0 });
    sm = transition(sm, { type: 'SaveRequested' });
    sm = transition(sm, { type: 'SaveFailed', message: 'oops' });
    const next = transition(sm, { type: 'StatusReset' });
    expect(next.status.kind).toBe('idle');
  });
});
