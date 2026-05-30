/**
 * Unit tests for the Harvest Scoring Dialog State Machine.
 *
 * Pure transition tests — no DOM, no Lit. Covers tab switching, draft
 * mutation, validation helpers, status lifecycle, toast, and error recovery.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialSM,
  transition,
  isScoringEmpty,
  parseMetrics,
  type SM,
  type TabId,
  type ScoringDraft,
  type MetricsDraft,
} from './harvest-scoring-dialog-sm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idleSM(): SM {
  return createInitialSM();
}

function inConfirmingSave(): SM {
  return transition(idleSM(), { type: 'SaveRequested' });
}

function inApplyingSave(): SM {
  return transition(inConfirmingSave(), { type: 'HarvestConfirmed' });
}

// ─── createInitialSM ─────────────────────────────────────────────────────────

describe('createInitialSM', () => {
  it('starts on scoring tab', () => {
    expect(idleSM().activeTab).toBe('scoring');
  });

  it('starts with idle status', () => {
    expect(idleSM().status.kind).toBe('idle');
  });

  it('starts with no toast', () => {
    expect(idleSM().toast).toBeUndefined();
  });

  it('starts with all scores null', () => {
    const { draft } = idleSM().tabs.scoring;
    expect(draft.vigor).toBeNull();
    expect(draft.internodal_spacing).toBeNull();
    expect(draft.terpene_intensity).toBeNull();
    expect(draft.resin).toBeNull();
    expect(draft.mold_resistance).toBeNull();
  });

  it('starts with empty metrics draft', () => {
    const { draft } = idleSM().tabs.metrics;
    expect(draft.wetWeight).toBe('');
    expect(draft.dryWeight).toBe('');
    expect(draft.trimWeight).toBe('');
    expect(draft.thcPercentage).toBe('');
    expect(draft.cbdPercentage).toBe('');
    expect(draft.terpeneProfile).toBe('');
  });

  it('seeds scoring draft from provided state', () => {
    const sm = createInitialSM({
      plant: { entity_id: 'sensor.p1', state: 'flower', attributes: {} as any, last_changed: '', last_updated: '', context: { id: '', user_id: null, parent_id: null } },
      vigor: 4,
      internodal_spacing: 3,
      terpene_intensity: null,
      resin: 5,
      mold_resistance: undefined,
    });
    expect(sm.tabs.scoring.draft.vigor).toBe(4);
    expect(sm.tabs.scoring.draft.internodal_spacing).toBe(3);
    expect(sm.tabs.scoring.draft.terpene_intensity).toBeNull();
    expect(sm.tabs.scoring.draft.resin).toBe(5);
    expect(sm.tabs.scoring.draft.mold_resistance).toBeNull();
  });
});

// ─── TabSelected ──────────────────────────────────────────────────────────────

describe('TabSelected', () => {
  it('switches from scoring to metrics', () => {
    const sm = transition(idleSM(), { type: 'TabSelected', tab: 'metrics' });
    expect(sm.activeTab).toBe('metrics');
  });

  it('switches from metrics back to scoring', () => {
    let sm = transition(idleSM(), { type: 'TabSelected', tab: 'metrics' });
    sm = transition(sm, { type: 'TabSelected', tab: 'scoring' });
    expect(sm.activeTab).toBe('scoring');
  });

  it('is a no-op when not idle', () => {
    const sm = inConfirmingSave();
    const after = transition(sm, { type: 'TabSelected', tab: 'metrics' });
    expect(after.activeTab).toBe('scoring');
  });

  it('does not mutate other fields', () => {
    const before = idleSM();
    const after = transition(before, { type: 'TabSelected', tab: 'metrics' });
    expect(after.tabs).toBe(before.tabs);
    expect(after.status).toBe(before.status);
  });
});

// ─── DraftFieldChanged (scoring tab) ─────────────────────────────────────────

describe('DraftFieldChanged — scoring', () => {
  it('sets vigor', () => {
    const sm = transition(idleSM(), { type: 'DraftFieldChanged', tab: 'scoring', field: 'vigor', value: 3 });
    expect(sm.tabs.scoring.draft.vigor).toBe(3);
  });

  it('clears vigor (toggle off)', () => {
    let sm = transition(idleSM(), { type: 'DraftFieldChanged', tab: 'scoring', field: 'vigor', value: 3 });
    sm = transition(sm, { type: 'DraftFieldChanged', tab: 'scoring', field: 'vigor', value: null });
    expect(sm.tabs.scoring.draft.vigor).toBeNull();
  });

  it('sets all score fields independently', () => {
    const fields: (keyof ScoringDraft)[] = [
      'vigor',
      'internodal_spacing',
      'terpene_intensity',
      'resin',
      'mold_resistance',
    ];
    let sm = idleSM();
    fields.forEach((f, i) => {
      sm = transition(sm, { type: 'DraftFieldChanged', tab: 'scoring', field: f, value: i + 1 });
    });
    expect(sm.tabs.scoring.draft.vigor).toBe(1);
    expect(sm.tabs.scoring.draft.internodal_spacing).toBe(2);
    expect(sm.tabs.scoring.draft.terpene_intensity).toBe(3);
    expect(sm.tabs.scoring.draft.resin).toBe(4);
    expect(sm.tabs.scoring.draft.mold_resistance).toBe(5);
  });

  it('does not affect metrics draft', () => {
    const before = idleSM();
    const after = transition(before, { type: 'DraftFieldChanged', tab: 'scoring', field: 'vigor', value: 5 });
    expect(after.tabs.metrics).toBe(before.tabs.metrics);
  });
});

// ─── DraftFieldChanged (metrics tab) ─────────────────────────────────────────

describe('DraftFieldChanged — metrics', () => {
  it('sets wetWeight', () => {
    const sm = transition(idleSM(), { type: 'DraftFieldChanged', tab: 'metrics', field: 'wetWeight', value: '120' });
    expect(sm.tabs.metrics.draft.wetWeight).toBe('120');
  });

  it('sets all metric fields independently', () => {
    const fields: (keyof MetricsDraft)[] = [
      'wetWeight',
      'dryWeight',
      'trimWeight',
      'thcPercentage',
      'cbdPercentage',
      'terpeneProfile',
    ];
    let sm = idleSM();
    fields.forEach((f, i) => {
      sm = transition(sm, { type: 'DraftFieldChanged', tab: 'metrics', field: f, value: `val${i}` });
    });
    expect(sm.tabs.metrics.draft.wetWeight).toBe('val0');
    expect(sm.tabs.metrics.draft.dryWeight).toBe('val1');
    expect(sm.tabs.metrics.draft.trimWeight).toBe('val2');
    expect(sm.tabs.metrics.draft.thcPercentage).toBe('val3');
    expect(sm.tabs.metrics.draft.cbdPercentage).toBe('val4');
    expect(sm.tabs.metrics.draft.terpeneProfile).toBe('val5');
  });

  it('does not affect scoring draft', () => {
    const before = idleSM();
    const after = transition(before, { type: 'DraftFieldChanged', tab: 'metrics', field: 'wetWeight', value: '50' });
    expect(after.tabs.scoring).toBe(before.tabs.scoring);
  });
});

// ─── SaveRequested / SkipRequested ───────────────────────────────────────────

describe('SaveRequested', () => {
  it('moves to confirming with mode save', () => {
    const sm = transition(idleSM(), { type: 'SaveRequested' });
    expect(sm.status).toEqual({ kind: 'confirming', mode: 'save' });
  });

  it('is a no-op when already confirming', () => {
    const sm = inConfirmingSave();
    const after = transition(sm, { type: 'SaveRequested' });
    expect(after).toBe(sm);
  });

  it('is a no-op when applying', () => {
    const sm = inApplyingSave();
    const after = transition(sm, { type: 'SaveRequested' });
    expect(after).toBe(sm);
  });
});

describe('SkipRequested', () => {
  it('moves to confirming with mode skip', () => {
    const sm = transition(idleSM(), { type: 'SkipRequested' });
    expect(sm.status).toEqual({ kind: 'confirming', mode: 'skip' });
  });

  it('is a no-op when not idle', () => {
    const sm = inConfirmingSave();
    const after = transition(sm, { type: 'SkipRequested' });
    expect(after).toBe(sm);
  });
});

// ─── HarvestConfirmed / HarvestCancelled ──────────────────────────────────────

describe('HarvestConfirmed', () => {
  it('moves from confirming(save) to applying(save)', () => {
    const sm = transition(inConfirmingSave(), { type: 'HarvestConfirmed' });
    expect(sm.status).toEqual({ kind: 'applying', mode: 'save' });
  });

  it('moves from confirming(skip) to applying(skip)', () => {
    const confirming = transition(idleSM(), { type: 'SkipRequested' });
    const sm = transition(confirming, { type: 'HarvestConfirmed' });
    expect(sm.status).toEqual({ kind: 'applying', mode: 'skip' });
  });

  it('is a no-op when not confirming', () => {
    const sm = idleSM();
    const after = transition(sm, { type: 'HarvestConfirmed' });
    expect(after).toBe(sm);
  });
});

describe('HarvestCancelled', () => {
  it('moves from confirming back to idle', () => {
    const sm = transition(inConfirmingSave(), { type: 'HarvestCancelled' });
    expect(sm.status.kind).toBe('idle');
  });

  it('is a no-op when not confirming', () => {
    const sm = idleSM();
    const after = transition(sm, { type: 'HarvestCancelled' });
    expect(after).toBe(sm);
  });
});

// ─── SaveResolved / SaveFailed ────────────────────────────────────────────────

describe('SaveResolved', () => {
  it('moves from applying to done', () => {
    const sm = transition(inApplyingSave(), { type: 'SaveResolved' });
    expect(sm.status.kind).toBe('done');
  });

  it('is a no-op when not applying', () => {
    const sm = idleSM();
    const after = transition(sm, { type: 'SaveResolved' });
    expect(after).toBe(sm);
  });
});

describe('SaveFailed', () => {
  it('moves from applying to error with message', () => {
    const sm = transition(inApplyingSave(), { type: 'SaveFailed', message: 'Network error' });
    expect(sm.status).toEqual({ kind: 'error', message: 'Network error' });
  });

  it('is a no-op when not applying', () => {
    const sm = idleSM();
    const after = transition(sm, { type: 'SaveFailed', message: 'oops' });
    expect(after).toBe(sm);
  });
});

// ─── Error recovery ───────────────────────────────────────────────────────────

describe('StatusReset', () => {
  it('resets from error to idle', () => {
    const errored = transition(inApplyingSave(), { type: 'SaveFailed', message: 'err' });
    const sm = transition(errored, { type: 'StatusReset' });
    expect(sm.status.kind).toBe('idle');
    expect(sm.toast).toBeUndefined();
  });

  it('also clears toast when resetting', () => {
    let sm = transition(idleSM(), { type: 'SetToast', message: 'Something failed' });
    sm = transition(sm, { type: 'StatusReset' });
    expect(sm.toast).toBeUndefined();
  });
});

// ─── Toast ────────────────────────────────────────────────────────────────────

describe('SetToast', () => {
  it('sets a toast message', () => {
    const sm = transition(idleSM(), { type: 'SetToast', message: 'Saved!' });
    expect(sm.toast).toBe('Saved!');
  });

  it('clears a toast message', () => {
    let sm = transition(idleSM(), { type: 'SetToast', message: 'Saved!' });
    sm = transition(sm, { type: 'SetToast', message: undefined });
    expect(sm.toast).toBeUndefined();
  });
});

// ─── isScoringEmpty ───────────────────────────────────────────────────────────

describe('isScoringEmpty', () => {
  it('returns true when all scores are null', () => {
    expect(isScoringEmpty(idleSM())).toBe(true);
  });

  it('returns false when any score is set', () => {
    const sm = transition(idleSM(), { type: 'DraftFieldChanged', tab: 'scoring', field: 'vigor', value: 3 });
    expect(isScoringEmpty(sm)).toBe(false);
  });

  it('returns false when only one score is set', () => {
    const sm = transition(idleSM(), { type: 'DraftFieldChanged', tab: 'scoring', field: 'resin', value: 5 });
    expect(isScoringEmpty(sm)).toBe(false);
  });
});

// ─── parseMetrics ─────────────────────────────────────────────────────────────

describe('parseMetrics', () => {
  it('returns empty object for empty draft', () => {
    const result = parseMetrics(idleSM().tabs.metrics.draft);
    expect(result).toEqual({});
  });

  it('parses valid number strings', () => {
    const draft: MetricsDraft = {
      wetWeight: '120',
      dryWeight: '28.5',
      trimWeight: '5',
      thcPercentage: '24.5',
      cbdPercentage: '0.3',
      terpeneProfile: '',
    };
    const result = parseMetrics(draft);
    expect(result.wet_weight).toBe(120);
    expect(result.dry_weight).toBe(28.5);
    expect(result.trim_weight).toBe(5);
    expect(result.thc_percentage).toBe(24.5);
    expect(result.cbd_percentage).toBe(0.3);
    expect(result.terpene_profile).toBeUndefined();
  });

  it('includes terpene_profile when non-empty', () => {
    const draft: MetricsDraft = {
      wetWeight: '',
      dryWeight: '',
      trimWeight: '',
      thcPercentage: '',
      cbdPercentage: '',
      terpeneProfile: '  myrcene, limonene  ',
    };
    expect(parseMetrics(draft).terpene_profile).toBe('myrcene, limonene');
  });

  it('omits fields that are empty strings', () => {
    const draft: MetricsDraft = {
      wetWeight: '100',
      dryWeight: '',
      trimWeight: '',
      thcPercentage: '',
      cbdPercentage: '',
      terpeneProfile: '',
    };
    const result = parseMetrics(draft);
    expect(result).toEqual({ wet_weight: 100 });
  });

  it('omits fields that are non-numeric strings', () => {
    const draft: MetricsDraft = {
      wetWeight: 'abc',
      dryWeight: '',
      trimWeight: '',
      thcPercentage: '',
      cbdPercentage: '',
      terpeneProfile: '',
    };
    const result = parseMetrics(draft);
    expect(result.wet_weight).toBeUndefined();
  });

  it('trims whitespace before parsing', () => {
    const draft: MetricsDraft = {
      wetWeight: '  50  ',
      dryWeight: '',
      trimWeight: '',
      thcPercentage: '',
      cbdPercentage: '',
      terpeneProfile: '',
    };
    expect(parseMetrics(draft).wet_weight).toBe(50);
  });
});

// ─── Full status lifecycle ────────────────────────────────────────────────────

describe('full status lifecycle', () => {
  it('idle → confirming(save) → applying(save) → done', () => {
    let sm = idleSM();
    expect(sm.status.kind).toBe('idle');

    sm = transition(sm, { type: 'SaveRequested' });
    expect(sm.status).toEqual({ kind: 'confirming', mode: 'save' });

    sm = transition(sm, { type: 'HarvestConfirmed' });
    expect(sm.status).toEqual({ kind: 'applying', mode: 'save' });

    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.status.kind).toBe('done');
  });

  it('idle → confirming(skip) → applying(skip) → done', () => {
    let sm = idleSM();
    sm = transition(sm, { type: 'SkipRequested' });
    sm = transition(sm, { type: 'HarvestConfirmed' });
    sm = transition(sm, { type: 'SaveResolved' });
    expect(sm.status.kind).toBe('done');
  });

  it('applying → error → reset → idle', () => {
    let sm = inApplyingSave();
    sm = transition(sm, { type: 'SaveFailed', message: 'Timeout' });
    expect(sm.status.kind).toBe('error');

    sm = transition(sm, { type: 'StatusReset' });
    expect(sm.status.kind).toBe('idle');
  });

  it('confirming → cancelled → idle → can save again', () => {
    let sm = inConfirmingSave();
    sm = transition(sm, { type: 'HarvestCancelled' });
    expect(sm.status.kind).toBe('idle');

    sm = transition(sm, { type: 'SaveRequested' });
    expect(sm.status.kind).toBe('confirming');
  });
});
