/**
 * Unit tests for the Seeds & Genetics Tab State Machine.
 *
 * Pure transition tests — no DOM, no Lit component mounting.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  validateBatchDraft,
  validatePollinationDraft,
  validateHarvestDraft,
  type SeedsSM,
  type BatchDraft,
  type PollinationDraft,
} from './seeds-genetics-tab-sm';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function aBatchDraft(overrides: Partial<BatchDraft> = {}): BatchDraft {
  return {
    strainName: 'Blue Dream',
    breeder: 'Humboldt',
    quantity: 10,
    acquisitionDate: '2026-01-01',
    generation: 'F1',
    parent1Key: '',
    parent2Key: '',
    notes: '',
    ...overrides,
  };
}

function aPollinationDraft(overrides: Partial<PollinationDraft> = {}): PollinationDraft {
  return {
    date: '2026-01-15',
    donorPlantId: 'plant-1',
    receiverPlantId: 'plant-2',
    notes: '',
    donorActivePlantsOnly: true,
    ...overrides,
  };
}

// ─── createInitialSM ──────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('starts in list view', () => {
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

  it('starts with all views in idle sub-state', () => {
    const sm = createInitialSM();
    expect(sm.views.list.sub.kind).toBe('idle');
    expect(sm.views['add-batch'].sub.kind).toBe('idle');
    expect(sm.views['log-pollination'].sub.kind).toBe('idle');
    expect(sm.views.harvest.sub.kind).toBe('idle');
  });

  it('starts add-batch with null editingBatchId', () => {
    const sm = createInitialSM();
    expect(sm.views['add-batch'].editingBatchId).toBeNull();
  });

  it('starts log-pollination with null editingEventId', () => {
    const sm = createInitialSM();
    expect(sm.views['log-pollination'].editingEventId).toBeNull();
  });

  it('starts log-pollination with donorActivePlantsOnly true', () => {
    const sm = createInitialSM();
    expect(sm.views['log-pollination'].draft.donorActivePlantsOnly).toBe(true);
  });

  it('opens directly to log-pollination when seed specifies it', () => {
    const sm = createInitialSM({ initialView: 'log-pollination' });
    expect(sm.activeView).toBe('log-pollination');
  });

  it('pre-fills receiverPlantId from seed', () => {
    const sm = createInitialSM({ initialView: 'log-pollination', prefilledReceiverId: 'plant-99' });
    expect(sm.views['log-pollination'].draft.receiverPlantId).toBe('plant-99');
  });

  it('leaves receiverPlantId empty when no prefilledReceiverId given', () => {
    const sm = createInitialSM({ initialView: 'log-pollination' });
    expect(sm.views['log-pollination'].draft.receiverPlantId).toBe('');
  });
});

// ─── BEGIN_ADD_BATCH ──────────────────────────────────────────────────────────

describe('BEGIN_ADD_BATCH', () => {
  it('navigates to add-batch view', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_ADD_BATCH' });
    expect(next.activeView).toBe('add-batch');
  });

  it('sets editingBatchId to null', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_ADD_BATCH' });
    expect(next.views['add-batch'].editingBatchId).toBeNull();
  });

  it('resets draft to empty defaults', () => {
    const sm = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_BATCH',
      batchId: 'b1',
      draft: aBatchDraft({ strainName: 'OG Kush' }),
    });
    const next = transition(sm, { type: 'BEGIN_ADD_BATCH' });
    expect(next.views['add-batch'].draft.strainName).toBe('');
  });

  it('does not mutate the input SM', () => {
    const sm = createInitialSM();
    transition(sm, { type: 'BEGIN_ADD_BATCH' });
    expect(sm.activeView).toBe('list');
  });
});

// ─── BEGIN_EDIT_BATCH ─────────────────────────────────────────────────────────

describe('BEGIN_EDIT_BATCH', () => {
  it('navigates to add-batch view', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_EDIT_BATCH', batchId: 'b1', draft: aBatchDraft() });
    expect(next.activeView).toBe('add-batch');
  });

  it('sets editingBatchId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_EDIT_BATCH', batchId: 'b42', draft: aBatchDraft() });
    expect(next.views['add-batch'].editingBatchId).toBe('b42');
  });

  it('seeds the draft from the provided draft', () => {
    const sm = createInitialSM();
    const draft = aBatchDraft({ strainName: 'Gorilla Glue', breeder: 'GG Strains' });
    const next = transition(sm, { type: 'BEGIN_EDIT_BATCH', batchId: 'b1', draft });
    expect(next.views['add-batch'].draft.strainName).toBe('Gorilla Glue');
    expect(next.views['add-batch'].draft.breeder).toBe('GG Strains');
  });

  it('resets sub to idle', () => {
    const sm: SeedsSM = {
      ...createInitialSM(),
      views: {
        ...createInitialSM().views,
        'add-batch': {
          ...createInitialSM().views['add-batch'],
          sub: { kind: 'error', message: 'oops' },
        },
      },
    };
    const next = transition(sm, { type: 'BEGIN_EDIT_BATCH', batchId: 'b1', draft: aBatchDraft() });
    expect(next.views['add-batch'].sub.kind).toBe('idle');
  });
});

// ─── BEGIN_LOG_POLLINATION ────────────────────────────────────────────────────

describe('BEGIN_LOG_POLLINATION', () => {
  it('navigates to log-pollination view', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_LOG_POLLINATION' });
    expect(next.activeView).toBe('log-pollination');
  });

  it('sets editingEventId to null', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_LOG_POLLINATION' });
    expect(next.views['log-pollination'].editingEventId).toBeNull();
  });

  it('resets draft to empty defaults with donorActivePlantsOnly true', () => {
    const prev = transition(createInitialSM(), {
      type: 'BEGIN_EDIT_POLLINATION',
      eventId: 'e1',
      draft: aPollinationDraft({ donorActivePlantsOnly: false, donorPlantId: 'plant-x' }),
    });
    const next = transition(prev, { type: 'BEGIN_LOG_POLLINATION' });
    expect(next.views['log-pollination'].draft.donorPlantId).toBe('');
    expect(next.views['log-pollination'].draft.donorActivePlantsOnly).toBe(true);
  });
});

// ─── BEGIN_EDIT_POLLINATION ───────────────────────────────────────────────────

describe('BEGIN_EDIT_POLLINATION', () => {
  it('navigates to log-pollination view', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'BEGIN_EDIT_POLLINATION',
      eventId: 'e1',
      draft: aPollinationDraft(),
    });
    expect(next.activeView).toBe('log-pollination');
  });

  it('sets editingEventId', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'BEGIN_EDIT_POLLINATION',
      eventId: 'e77',
      draft: aPollinationDraft(),
    });
    expect(next.views['log-pollination'].editingEventId).toBe('e77');
  });

  it('seeds the draft from the provided draft', () => {
    const sm = createInitialSM();
    const draft = aPollinationDraft({ donorPlantId: 'p-male', donorActivePlantsOnly: false });
    const next = transition(sm, { type: 'BEGIN_EDIT_POLLINATION', eventId: 'e1', draft });
    expect(next.views['log-pollination'].draft.donorPlantId).toBe('p-male');
    expect(next.views['log-pollination'].draft.donorActivePlantsOnly).toBe(false);
  });
});

// ─── BEGIN_HARVEST ────────────────────────────────────────────────────────────

describe('BEGIN_HARVEST', () => {
  it('navigates to harvest view', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_HARVEST', eventId: 'e1' });
    expect(next.activeView).toBe('harvest');
  });

  it('stores the eventId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_HARVEST', eventId: 'e99' });
    expect(next.views.harvest.eventId).toBe('e99');
  });

  it('resets harvest draft to defaults', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'BEGIN_HARVEST', eventId: 'e1' });
    expect(next.views.harvest.draft.quantity).toBe(1);
    expect(next.views.harvest.draft.notes).toBe('');
  });
});

// ─── NAVIGATE_BACK ────────────────────────────────────────────────────────────

describe('NAVIGATE_BACK', () => {
  it('returns to list view from add-batch', () => {
    const sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    const next = transition(sm, { type: 'NAVIGATE_BACK' });
    expect(next.activeView).toBe('list');
  });

  it('returns to list view from log-pollination', () => {
    const sm = transition(createInitialSM(), { type: 'BEGIN_LOG_POLLINATION' });
    const next = transition(sm, { type: 'NAVIGATE_BACK' });
    expect(next.activeView).toBe('list');
  });

  it('returns to list view from harvest', () => {
    const sm = transition(createInitialSM(), { type: 'BEGIN_HARVEST', eventId: 'e1' });
    const next = transition(sm, { type: 'NAVIGATE_BACK' });
    expect(next.activeView).toBe('list');
  });

  it('resets add-batch draft on back', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'UPDATE_BATCH_DRAFT', partial: { strainName: 'Amnesia' } });
    const next = transition(sm, { type: 'NAVIGATE_BACK' });
    expect(next.views['add-batch'].draft.strainName).toBe('');
  });

  it('resets log-pollination draft on back and restores donorActivePlantsOnly to true', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_LOG_POLLINATION' });
    sm = transition(sm, {
      type: 'UPDATE_POLLINATION_DRAFT',
      partial: { donorPlantId: 'p-1', donorActivePlantsOnly: false },
    });
    const next = transition(sm, { type: 'NAVIGATE_BACK' });
    expect(next.views['log-pollination'].draft.donorPlantId).toBe('');
    expect(next.views['log-pollination'].draft.donorActivePlantsOnly).toBe(true);
  });
});

// ─── UPDATE_BATCH_DRAFT ───────────────────────────────────────────────────────

describe('UPDATE_BATCH_DRAFT', () => {
  it('merges partial into batch draft', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'UPDATE_BATCH_DRAFT', partial: { strainName: 'Blueberry' } });
    expect(sm.views['add-batch'].draft.strainName).toBe('Blueberry');
  });

  it('preserves other draft fields', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, {
      type: 'UPDATE_BATCH_DRAFT',
      partial: { strainName: 'Blueberry', generation: 'S1' },
    });
    sm = transition(sm, { type: 'UPDATE_BATCH_DRAFT', partial: { breeder: 'DJ Short' } });
    expect(sm.views['add-batch'].draft.strainName).toBe('Blueberry');
    expect(sm.views['add-batch'].draft.generation).toBe('S1');
    expect(sm.views['add-batch'].draft.breeder).toBe('DJ Short');
  });
});

// ─── UPDATE_POLLINATION_DRAFT ─────────────────────────────────────────────────

describe('UPDATE_POLLINATION_DRAFT', () => {
  it('merges partial into pollination draft', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_LOG_POLLINATION' });
    sm = transition(sm, {
      type: 'UPDATE_POLLINATION_DRAFT',
      partial: { donorPlantId: 'p-m1' },
    });
    expect(sm.views['log-pollination'].draft.donorPlantId).toBe('p-m1');
  });

  it('can toggle donorActivePlantsOnly', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_LOG_POLLINATION' });
    sm = transition(sm, {
      type: 'UPDATE_POLLINATION_DRAFT',
      partial: { donorActivePlantsOnly: false },
    });
    expect(sm.views['log-pollination'].draft.donorActivePlantsOnly).toBe(false);
  });
});

// ─── UPDATE_HARVEST_DRAFT ─────────────────────────────────────────────────────

describe('UPDATE_HARVEST_DRAFT', () => {
  it('merges partial into harvest draft', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_HARVEST', eventId: 'e1' });
    sm = transition(sm, { type: 'UPDATE_HARVEST_DRAFT', partial: { quantity: 42 } });
    expect(sm.views.harvest.draft.quantity).toBe(42);
  });
});

// ─── SAVE lifecycle ───────────────────────────────────────────────────────────

describe('SAVE_REQUESTED', () => {
  it('moves add-batch sub to applying', () => {
    const sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    const next = transition(sm, { type: 'SAVE_REQUESTED' });
    expect(next.views['add-batch'].sub.kind).toBe('applying');
  });

  it('moves log-pollination sub to applying', () => {
    const sm = transition(createInitialSM(), { type: 'BEGIN_LOG_POLLINATION' });
    const next = transition(sm, { type: 'SAVE_REQUESTED' });
    expect(next.views['log-pollination'].sub.kind).toBe('applying');
  });

  it('moves harvest sub to applying', () => {
    const sm = transition(createInitialSM(), { type: 'BEGIN_HARVEST', eventId: 'e1' });
    const next = transition(sm, { type: 'SAVE_REQUESTED' });
    expect(next.views.harvest.sub.kind).toBe('applying');
  });

  it('is a no-op when on list view', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SAVE_REQUESTED' });
    expect(next).toEqual(sm);
  });
});

describe('SAVE_RESOLVED', () => {
  it('navigates back to list after add-batch save', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'SAVE_REQUESTED' });
    const next = transition(sm, { type: 'SAVE_RESOLVED' });
    expect(next.activeView).toBe('list');
  });

  it('navigates back to list after log-pollination save', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_LOG_POLLINATION' });
    sm = transition(sm, { type: 'SAVE_REQUESTED' });
    const next = transition(sm, { type: 'SAVE_RESOLVED' });
    expect(next.activeView).toBe('list');
  });

  it('resets batch draft after save', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'UPDATE_BATCH_DRAFT', partial: { strainName: 'Wedding Cake' } });
    sm = transition(sm, { type: 'SAVE_REQUESTED' });
    const next = transition(sm, { type: 'SAVE_RESOLVED' });
    expect(next.views['add-batch'].draft.strainName).toBe('');
  });
});

describe('SAVE_FAILED', () => {
  it('moves add-batch sub to error with message', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'SAVE_REQUESTED' });
    const next = transition(sm, { type: 'SAVE_FAILED', message: 'Network error' });
    expect(next.views['add-batch'].sub.kind).toBe('error');
    if (next.views['add-batch'].sub.kind === 'error') {
      expect(next.views['add-batch'].sub.message).toBe('Network error');
    }
  });

  it('does not change the active view', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'SAVE_REQUESTED' });
    const next = transition(sm, { type: 'SAVE_FAILED', message: 'oops' });
    expect(next.activeView).toBe('add-batch');
  });

  it('allows recovery: SAVE_REQUESTED after SAVE_FAILED resets to applying', () => {
    let sm = transition(createInitialSM(), { type: 'BEGIN_ADD_BATCH' });
    sm = transition(sm, { type: 'SAVE_REQUESTED' });
    sm = transition(sm, { type: 'SAVE_FAILED', message: 'Network error' });
    const next = transition(sm, { type: 'SAVE_REQUESTED' });
    expect(next.views['add-batch'].sub.kind).toBe('applying');
  });
});

// ─── Delete confirmations ─────────────────────────────────────────────────────

describe('DELETE_BATCH_REQUESTED', () => {
  it('sets list sub to confirm-delete-batch with batchId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'DELETE_BATCH_REQUESTED', batchId: 'b7' });
    expect(next.views.list.sub.kind).toBe('confirm-delete-batch');
    if (next.views.list.sub.kind === 'confirm-delete-batch') {
      expect(next.views.list.sub.batchId).toBe('b7');
    }
  });
});

describe('DELETE_POLLINATION_REQUESTED', () => {
  it('sets list sub to confirm-delete-pollination with eventId', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'DELETE_POLLINATION_REQUESTED', eventId: 'e3' });
    expect(next.views.list.sub.kind).toBe('confirm-delete-pollination');
    if (next.views.list.sub.kind === 'confirm-delete-pollination') {
      expect(next.views.list.sub.eventId).toBe('e3');
    }
  });
});

describe('DELETE_CONFIRMED', () => {
  it('resets list sub to idle', () => {
    const sm = transition(createInitialSM(), { type: 'DELETE_BATCH_REQUESTED', batchId: 'b1' });
    const next = transition(sm, { type: 'DELETE_CONFIRMED' });
    expect(next.views.list.sub.kind).toBe('idle');
  });
});

describe('DELETE_CANCELLED', () => {
  it('resets list sub to idle', () => {
    const sm = transition(createInitialSM(), {
      type: 'DELETE_POLLINATION_REQUESTED',
      eventId: 'e1',
    });
    const next = transition(sm, { type: 'DELETE_CANCELLED' });
    expect(next.views.list.sub.kind).toBe('idle');
  });
});

// ─── Sow form ─────────────────────────────────────────────────────────────────

describe('SOW_OPENED', () => {
  it('sets list sub to sow with batchId and growspaceId', () => {
    const sm = createInitialSM();
    const next = transition(sm, {
      type: 'SOW_OPENED',
      batchId: 'b1',
      defaultGrowspaceId: 'gs-main',
    });
    expect(next.views.list.sub.kind).toBe('sow');
    if (next.views.list.sub.kind === 'sow') {
      expect(next.views.list.sub.batchId).toBe('b1');
      expect(next.views.list.sub.growspaceId).toBe('gs-main');
      expect(next.views.list.sub.quantity).toBe(1);
    }
  });
});

describe('SOW_CANCELLED', () => {
  it('resets list sub to idle', () => {
    const sm = transition(createInitialSM(), {
      type: 'SOW_OPENED',
      batchId: 'b1',
      defaultGrowspaceId: 'gs-main',
    });
    const next = transition(sm, { type: 'SOW_CANCELLED' });
    expect(next.views.list.sub.kind).toBe('idle');
  });
});

describe('SOW_APPLY_REQUESTED', () => {
  it('sets sow sub to applying', () => {
    let sm = transition(createInitialSM(), {
      type: 'SOW_OPENED',
      batchId: 'b1',
      defaultGrowspaceId: 'gs-main',
    });
    sm = transition(sm, { type: 'SOW_APPLY_REQUESTED' });
    if (sm.views.list.sub.kind === 'sow') {
      expect(sm.views.list.sub.sub.kind).toBe('applying');
    }
  });

  it('is a no-op when list sub is not sow', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SOW_APPLY_REQUESTED' });
    expect(next.views.list.sub.kind).toBe('idle');
  });
});

describe('SOW_APPLY_FAILED', () => {
  it('resets sow sub back to idle without closing the form', () => {
    let sm = transition(createInitialSM(), {
      type: 'SOW_OPENED',
      batchId: 'b1',
      defaultGrowspaceId: 'gs-main',
    });
    sm = transition(sm, { type: 'SOW_APPLY_REQUESTED' });
    const next = transition(sm, { type: 'SOW_APPLY_FAILED' });
    expect(next.views.list.sub.kind).toBe('sow');
    if (next.views.list.sub.kind === 'sow') {
      expect(next.views.list.sub.sub.kind).toBe('idle');
      expect(next.views.list.sub.batchId).toBe('b1');
    }
  });
});

describe('SOW_FIELD_CHANGED', () => {
  it('updates growspaceId in sow state', () => {
    let sm = transition(createInitialSM(), {
      type: 'SOW_OPENED',
      batchId: 'b1',
      defaultGrowspaceId: 'gs-main',
    });
    sm = transition(sm, { type: 'SOW_FIELD_CHANGED', partial: { growspaceId: 'gs-tent-2' } });
    if (sm.views.list.sub.kind === 'sow') {
      expect(sm.views.list.sub.growspaceId).toBe('gs-tent-2');
    }
  });

  it('updates quantity in sow state', () => {
    let sm = transition(createInitialSM(), {
      type: 'SOW_OPENED',
      batchId: 'b1',
      defaultGrowspaceId: 'gs-main',
    });
    sm = transition(sm, { type: 'SOW_FIELD_CHANGED', partial: { quantity: 5 } });
    if (sm.views.list.sub.kind === 'sow') {
      expect(sm.views.list.sub.quantity).toBe(5);
    }
  });

  it('is a no-op when list sub is not sow', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SOW_FIELD_CHANGED', partial: { quantity: 5 } });
    expect(next.views.list.sub.kind).toBe('idle');
  });
});

// ─── SET_TOAST ────────────────────────────────────────────────────────────────

describe('SET_TOAST', () => {
  it('sets the toast message', () => {
    const sm = createInitialSM();
    const next = transition(sm, { type: 'SET_TOAST', message: 'Saved!' });
    expect(next.toast).toBe('Saved!');
  });

  it('clears the toast when message is undefined', () => {
    const sm = transition(createInitialSM(), { type: 'SET_TOAST', message: 'Saved!' });
    const next = transition(sm, { type: 'SET_TOAST', message: undefined });
    expect(next.toast).toBeUndefined();
  });
});

// ─── Validation helpers ───────────────────────────────────────────────────────

describe('validateBatchDraft', () => {
  it('returns undefined for a complete draft', () => {
    expect(validateBatchDraft(aBatchDraft())).toBeUndefined();
  });

  it('returns an error when strainName is empty', () => {
    expect(validateBatchDraft(aBatchDraft({ strainName: '' }))).toBeTruthy();
  });

  it('returns an error when breeder is empty', () => {
    expect(validateBatchDraft(aBatchDraft({ breeder: '' }))).toBeTruthy();
  });

  it('returns an error when acquisitionDate is empty', () => {
    expect(validateBatchDraft(aBatchDraft({ acquisitionDate: '' }))).toBeTruthy();
  });

  it('returns an error when generation is empty', () => {
    expect(validateBatchDraft(aBatchDraft({ generation: '' }))).toBeTruthy();
  });
});

describe('validatePollinationDraft', () => {
  it('returns undefined for a complete draft', () => {
    expect(validatePollinationDraft(aPollinationDraft())).toBeUndefined();
  });

  it('returns an error when date is empty', () => {
    expect(validatePollinationDraft(aPollinationDraft({ date: '' }))).toBeTruthy();
  });

  it('returns an error when donorPlantId is empty', () => {
    expect(validatePollinationDraft(aPollinationDraft({ donorPlantId: '' }))).toBeTruthy();
  });

  it('returns an error when receiverPlantId is empty', () => {
    expect(validatePollinationDraft(aPollinationDraft({ receiverPlantId: '' }))).toBeTruthy();
  });
});

describe('validateHarvestDraft', () => {
  it('returns undefined when quantity > 0 and eventId is set', () => {
    expect(validateHarvestDraft({ quantity: 5, notes: '' }, 'e1')).toBeUndefined();
  });

  it('returns an error when eventId is empty', () => {
    expect(validateHarvestDraft({ quantity: 5, notes: '' }, '')).toBeTruthy();
  });

  it('returns an error when quantity is 0', () => {
    expect(validateHarvestDraft({ quantity: 0, notes: '' }, 'e1')).toBeTruthy();
  });
});

// ─── Immutability ─────────────────────────────────────────────────────────────

describe('immutability', () => {
  it('transition never mutates the input SM', () => {
    const sm = createInitialSM();
    const frozen = JSON.stringify(sm);
    transition(sm, { type: 'BEGIN_ADD_BATCH' });
    transition(sm, { type: 'DELETE_BATCH_REQUESTED', batchId: 'b1' });
    transition(sm, { type: 'SOW_OPENED', batchId: 'b1', defaultGrowspaceId: 'gs' });
    expect(JSON.stringify(sm)).toBe(frozen);
  });
});
