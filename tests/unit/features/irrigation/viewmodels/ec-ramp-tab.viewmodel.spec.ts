/**
 * EC Ramp Tab ViewModel — pure factory + compose-helper tests (ADR-0019).
 *
 * Feeds input atoms and asserts the derived VM output, plus the pure
 * `composeEcRampSave` payload/validation helper. No DOM: the derivation half of
 * the EC Ramp tab adapter, tested in isolation from the component.
 */
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import type { ECRampCurve, ECRampCurvesResponse } from '../../../../../src/slices/nutrient';
import {
  createInitialSM,
  transition,
  type DialogSM,
  type EcRampCurveDraft,
} from '../../../../../src/dialogs/irrigation-dialog-sm';
import {
  createEcRampTabViewModel,
  composeEcRampSave,
} from '../../../../../src/features/irrigation/viewmodels/ec-ramp-tab.viewmodel';

function curve(overrides: Partial<ECRampCurve> = {}): ECRampCurve {
  return {
    id: 'c1',
    name: 'Veg Ramp',
    stage: 'veg',
    points: [
      { day: 1, target_ec: 1.0 },
      { day: 14, target_ec: 1.8 },
    ],
    ...overrides,
  } as ECRampCurve;
}

function build(sm: DialogSM, curves: ECRampCurvesResponse | null) {
  const $sm = atom<DialogSM>(sm);
  const $curves = atom<ECRampCurvesResponse | null>(curves);
  return createEcRampTabViewModel($sm, $curves).get();
}

describe('createEcRampTabViewModel', () => {
  it('maps saved curves to list rows with a precomputed summary', () => {
    const vm = build(createInitialSM(), { c1: curve() });
    expect(vm.curves).toEqual([{ id: 'c1', name: 'Veg Ramp', summary: '2 points • Day 1–14' }]);
    expect(vm.editing).toBeNull();
    expect(vm.error).toBeNull();
  });

  it('uses the singular "point" for a one-point curve', () => {
    const vm = build(createInitialSM(), { c1: curve({ points: [{ day: 3, target_ec: 1.2 }] }) });
    expect(vm.curves[0].summary).toBe('1 point • Day 3–3');
  });

  it('is empty when there are no curves', () => {
    expect(build(createInitialSM(), null).curves).toEqual([]);
    expect(build(createInitialSM(), {}).curves).toEqual([]);
  });

  it('projects the SM editing draft (and its points) into the VM', () => {
    const draft: EcRampCurveDraft = { name: 'Bloom', stage: 'flower', points: [{ day: 1, target_ec: 1.0 }] };
    const sm = transition(createInitialSM(), { type: 'EC_RAMP_EDIT_CURVE', draft });
    const vm = build(sm, { c1: curve() });
    expect(vm.editing).toEqual({ draft, points: draft.points });
  });

  it('passes the SM validation error through', () => {
    let sm = transition(createInitialSM(), { type: 'EC_RAMP_START_NEW' });
    sm = transition(sm, { type: 'SET_EC_RAMP_ERROR', error: 'Curve name is required' });
    expect(build(sm, null).error).toBe('Curve name is required');
  });
});

describe('composeEcRampSave', () => {
  it('rejects an empty name', () => {
    expect(composeEcRampSave({ name: '  ', points: [{ day: 1, target_ec: 1 }] })).toEqual({
      ok: false,
      error: 'Curve name is required',
    });
  });

  it('rejects when no valid points remain', () => {
    expect(composeEcRampSave({ name: 'X', points: [{ day: 1, target_ec: 0 }] })).toEqual({
      ok: false,
      error: 'At least one valid EC point is required',
    });
  });

  it('composes a sorted, trimmed payload and passes through curve_id', () => {
    const result = composeEcRampSave({
      id: 'c9',
      name: '  Bloom  ',
      stage: 'flower',
      points: [
        { day: 14, target_ec: 1.8 },
        { day: 1, target_ec: 1.0 },
        { day: 7, target_ec: -1 }, // filtered (target_ec <= 0)
      ],
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        curve_id: 'c9',
        name: 'Bloom',
        stage: 'flower',
        points: [
          { day: 1, target_ec: 1.0 },
          { day: 14, target_ec: 1.8 },
        ],
      },
    });
  });

  it('defaults stage to flower and omits curve_id for a new curve', () => {
    const result = composeEcRampSave({ name: 'New', points: [{ day: 1, target_ec: 1.0 }] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.stage).toBe('flower');
      expect(result.payload.curve_id).toBeUndefined();
    }
  });
});
