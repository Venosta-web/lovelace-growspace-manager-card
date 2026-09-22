/**
 * EC Ramp Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's EC Ramp tab. EC Ramp Curves
 * belong to the **Nutrient slice** (ADR-0005), so the list rows are read from the
 * slice's `ecRampCurves$` atom, while the LIST/EDIT view, the open curve draft,
 * and the synchronous validation error come from the SM (`$sm`-first — the one
 * mandatory input, mirroring tanks). No `$caps`: the EC Ramp tab has no cross-tab
 * capability gating.
 *
 * The list-row summary (`N points • Day a–b`) and the edit-form projection are
 * transcribed verbatim from the dialog's former inline `_renderEcRampList` /
 * `_renderEcRampEdit` so the rendered output stays byte-identical.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { ECRampCurve, ECRampPoint, ECRampCurvesResponse } from '../../../slices/nutrient';
import type { DialogSM, EcRampCurveDraft } from '../../../dialogs/irrigation-dialog-sm';

/** One saved-curve row in the list view (summary line precomputed for display). */
export interface EcRampCurveRowVM {
  id: string;
  name: string;
  /** "2 points • Day 1–14" (singular "point" for exactly one). */
  summary: string;
}

/** Projected inline-edit state: the open curve draft and its points. */
export interface EcRampEditVM {
  /** Whole curve draft (name/stage/points). */
  draft: EcRampCurveDraft;
  /** The draft's points, defaulted to [] for rendering. */
  points: ECRampPoint[];
}

/** Complete render input for `<irrigation-ec-ramp-tab>`. */
export interface EcRampTabViewModel {
  /** Saved curves; empty array → the "no curves yet" empty state (LIST view). */
  curves: EcRampCurveRowVM[];
  /** The open editor, or null when in the list view. */
  editing: EcRampEditVM | null;
  /** Synchronous validation error for the open editor, or null. */
  error: string | null;
}

/** Curve summary line, transcribed verbatim from the former inline list markup. */
function curveSummary(curve: ECRampCurve): string {
  const n = curve.points.length;
  const days = curve.points.map((p) => p.day);
  const lo = Math.min(...days);
  const hi = Math.max(...days);
  return `${n} point${n !== 1 ? 's' : ''} • Day ${lo}–${hi}`;
}

function deriveRow(curve: ECRampCurve): EcRampCurveRowVM {
  return { id: curve.id, name: curve.name, summary: curveSummary(curve) };
}

/**
 * Pure helper composing the save payload from the open draft. Returns the
 * service-shaped params (filtering to valid points and sorting by day) or one of
 * two validation errors. Owned here (not in the effect) so the Dialog Shell can
 * snapshot the payload into `applying.params` at dispatch time (ADR-0015).
 */
export interface EcRampSavePayload {
  /** The growspace that owns the curve (ADR-0046) — required by the service. */
  growspace_id: string;
  curve_id?: string;
  name: string;
  stage: string;
  points: ECRampPoint[];
}

export function composeEcRampSave(
  draft: EcRampCurveDraft,
  growspaceId: string
): { ok: true; payload: EcRampSavePayload } | { ok: false; error: string } {
  if (!draft.name?.trim()) {
    return { ok: false, error: 'Curve name is required' };
  }
  const points = (draft.points ?? []).filter((p) => p.day >= 0 && p.target_ec > 0);
  if (points.length === 0) {
    return { ok: false, error: 'At least one valid EC point is required' };
  }
  return {
    ok: true,
    payload: {
      growspace_id: growspaceId,
      curve_id: draft.id,
      name: draft.name.trim(),
      stage: draft.stage ?? 'flower',
      points: [...points].sort((a, b) => a.day - b.day),
    },
  };
}

/**
 * Pure factory: SM atom + the Nutrient slice's `ecRampCurves$` → one EC Ramp VM
 * atom. `$sm`-first (it carries the view + draft + error); the curve data comes
 * from the slice (ADR-0005), not a fresh source. No `$caps`. Testable with no DOM.
 *
 * The slice holds every growspace's curves, but a curve belongs to exactly one
 * growspace (ADR-0046), so the device atom scopes the list to this dialog's own.
 * Curves with no owner — stored before the binding existed — belong to no
 * growspace and are listed nowhere; Home Assistant raises a repair for them.
 */
export function createEcRampTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $ecRampCurves: ReadableAtom<ECRampCurvesResponse | null>,
  $device: ReadableAtom<{ deviceId: string } | undefined>
): ReadableAtom<EcRampTabViewModel> {
  return computed([$sm, $ecRampCurves, $device], (sm, curves, device) => {
    const tab = sm.tabs.ec_ramp;
    const rows = Object.values(curves ?? {})
      .filter((curve) => !!device && curve.growspace_id === device.deviceId)
      .map(deriveRow);
    const sub = tab.sub;
    return {
      curves: rows,
      editing: sub.kind === 'editing' ? { draft: sub.draft, points: sub.draft.points ?? [] } : null,
      error: tab.error,
    };
  });
}
