/**
 * When a label may go to paper from the editor, and in which words it may not.
 *
 * Each gate answers with the **first** reason, as a stable key the panel
 * localizes and puts beside the disabled control — never a bare disabled
 * button. The order is the order a user fixes things in: who they are, which
 * printer, whether the picture is current, whether the picture may print.
 *
 * Warnings are deliberately absent from every gate. A warning is shown, and
 * stays inspectable, and never has to be acknowledged before one label is
 * printed: a click-through exists to be clicked through, and teaches exactly
 * that. Blockers and stale identities are what disable printing.
 */

import type {
  MeasurementBounds,
  PlacementMeasurement,
} from '../../../slices/labels/printing-schema';
import { testPrintApproval, type SessionState } from './draft-session';

export type TestPrintBlocker =
  | 'not_admin'
  | 'no_printer'
  | 'rendering'
  | 'stale_preview'
  | 'no_preview'
  | 'not_held'
  | 'blocked';

/** Why the draft on screen cannot be test printed now, or nothing. */
export function testPrintBlockedBy(
  state: SessionState,
  context: { admin: boolean; deviceId: string | null }
): TestPrintBlocker | null {
  if (!context.admin) return 'not_admin';
  if (!context.deviceId) return 'no_printer';
  if (state.rendering || state.dirty || state.saving) return 'rendering';
  if (state.rasterStanding === 'stale') return 'stale_preview';
  if (state.rasterStanding === 'absent' || state.render === null) return 'no_preview';
  if (testPrintApproval(state) === null) return 'not_held';
  if (state.render.eligibility.test_print?.allowed === false) return 'blocked';
  return null;
}

/** The five numbers a calibration form collects, in the order a sheet reads. */
export const MEASUREMENT_FIELDS = [
  'top_mm',
  'right_mm',
  'bottom_mm',
  'left_mm',
  'feed_mm',
] as const;
export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

export interface MeasurementProblem {
  field: MeasurementField;
  /** `required`, `not_a_number`, `negative`, `too_large` or `not_on_quantum`. */
  reason: string;
}

/**
 * Check what was typed, the way the backend will, before sending it.
 *
 * The backend remains the authority and its refusal still names the field;
 * this only saves a round trip for the three mistakes that are certain —
 * a missing value, a negative edge, a digit in the wrong box — and for a
 * precision the document model does not have.
 */
export function measurementProblems(
  values: Partial<Record<MeasurementField, string>>,
  bounds: MeasurementBounds
): { measurement: PlacementMeasurement | null; problems: MeasurementProblem[] } {
  const problems: MeasurementProblem[] = [];
  const parsed: Partial<PlacementMeasurement> = {};
  const feedExtent =
    bounds.feed_axis === 'y' ? bounds.printable_height_mm : bounds.printable_width_mm;
  const extent: Record<MeasurementField, number> = {
    top_mm: bounds.printable_height_mm,
    bottom_mm: bounds.printable_height_mm,
    left_mm: bounds.printable_width_mm,
    right_mm: bounds.printable_width_mm,
    feed_mm: feedExtent,
  };
  for (const field of MEASUREMENT_FIELDS) {
    const raw = (values[field] ?? '').trim().replace(',', '.');
    if (raw === '') {
      problems.push({ field, reason: 'required' });
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      problems.push({ field, reason: 'not_a_number' });
      continue;
    }
    if (field !== 'feed_mm' && value < 0) {
      problems.push({ field, reason: 'negative' });
      continue;
    }
    if (Math.abs(value) > extent[field]) {
      problems.push({ field, reason: 'too_large' });
      continue;
    }
    const steps = value / bounds.quantum_mm;
    if (Math.abs(steps - Math.round(steps)) > 1e-6) {
      problems.push({ field, reason: 'not_on_quantum' });
      continue;
    }
    parsed[field] = value;
  }
  return {
    measurement: problems.length === 0 ? (parsed as PlacementMeasurement) : null,
    problems,
  };
}
