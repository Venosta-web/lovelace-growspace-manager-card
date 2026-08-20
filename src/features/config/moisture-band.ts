/**
 * Acceptable Moisture Band — pure draft logic for the Sensors tab.
 *
 * The band is an atomic pair of optional percentage bounds. `null`/`null` means
 * the growspace inherits the default band: the form still *shows* 20–60%, but
 * nothing is stored, which is exactly what makes "Reset to defaults" survive
 * only if the user then Saves.
 *
 * The backend (`growspace_manager`) rejects a lone bound and fails the whole
 * `configure_environment` call, so the rules here are deliberately strict about
 * never producing a half pair on the wire. It also mirrors the backend's own
 * defaults so the card degrades gracefully against a release that predates the
 * band — an absent `soil_moisture_band` reads as the inherited 20–60%.
 */

export const DEFAULT_MOISTURE_MIN = 20;
export const DEFAULT_MOISTURE_MAX = 60;

/** Inclusive-band classification of a live reading. */
export type MoistureClassification = 'too_dry' | 'in_band' | 'too_wet';

/** The band a draft currently describes, and whether it overrides the default. */
export interface EffectiveBand {
  min: number;
  max: number;
  isCustom: boolean;
}

/** A draft pair: both null (inherited) or partially/fully filled while editing. */
export interface BandDraft {
  min: number | null;
  max: number | null;
}

/**
 * The band to display for a draft. An incomplete draft still renders the value
 * the user is typing; only a fully-empty pair falls back to the defaults.
 */
export function effectiveBand(draft: BandDraft): EffectiveBand {
  if (draft.min === null && draft.max === null) {
    return { min: DEFAULT_MOISTURE_MIN, max: DEFAULT_MOISTURE_MAX, isCustom: false };
  }
  return {
    min: draft.min ?? DEFAULT_MOISTURE_MIN,
    max: draft.max ?? DEFAULT_MOISTURE_MAX,
    isCustom: true,
  };
}

/** Whether a pair is complete and satisfies 0 ≤ min < max ≤ 100. */
export function isCompleteValidBand(draft: BandDraft): boolean {
  const { min, max } = draft;
  if (min === null || max === null) return false;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  return min >= 0 && min < max && max <= 100;
}

/** Whether the pair is the deliberate "inherit the default" clear. */
export function isCleared(draft: BandDraft): boolean {
  return draft.min === null && draft.max === null;
}

/**
 * A user-presentable problem with the current draft, or null when it is either
 * a valid custom pair or a clean clear.
 */
export function bandValidationError(draft: BandDraft): string | null {
  if (isCleared(draft) || isCompleteValidBand(draft)) return null;
  if (draft.min === null || draft.max === null) {
    return 'Set both a healthy minimum and a healthy maximum, or clear both to use the defaults.';
  }
  if (!Number.isFinite(draft.min) || !Number.isFinite(draft.max)) {
    return 'Healthy minimum and maximum must be numbers.';
  }
  if (draft.min >= draft.max) {
    return 'Healthy minimum must be lower than healthy maximum.';
  }
  return 'Healthy minimum and maximum must be between 0% and 100%.';
}

/**
 * Apply an edit to one bound.
 *
 * Editing a single bound while the band is inherited materialises *both* — the
 * other takes the default it was already displaying. Without this, typing one
 * value would produce a half pair the backend rejects outright.
 */
export function editBound(draft: BandDraft, bound: 'min' | 'max', value: number | null): BandDraft {
  // A fully inherited band materialises on its first edit: the untouched bound
  // takes the default it was already displaying, so a lone bound — which the
  // backend rejects outright — can never be produced.
  if (isCleared(draft)) {
    if (value === null) return { min: null, max: null };
    return bound === 'min'
      ? { min: value, max: DEFAULT_MOISTURE_MAX }
      : { min: DEFAULT_MOISTURE_MIN, max: value };
  }

  // Already custom, possibly mid-edit. Touch only the edited bound: a bound the
  // user deliberately cleared must stay cleared (showing a validation error)
  // rather than being silently refilled with the default it merely displays.
  return bound === 'min' ? { ...draft, min: value } : { ...draft, max: value };
}

/** Reset to defaults: drop the override. The form keeps showing 20–60%. */
export function resetBand(): BandDraft {
  return { min: null, max: null };
}

/**
 * The pair to put on the wire, or null when the draft is mid-edit and
 * incomplete.
 *
 * Returning null means "send neither key", which the backend reads as
 * "unchanged" — so an unfinished band never destroys a stored one, and never
 * fails the surrounding save.
 */
export function bandSavePayload(draft: BandDraft): BandDraft | null {
  if (isCleared(draft)) return { min: null, max: null };
  if (isCompleteValidBand(draft)) return { min: draft.min, max: draft.max };
  return null;
}

/** Parse a live reading, which arrives as a string (or "unavailable"/absent). */
export function parseReading(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === 'number' ? raw : Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

/** Classify a reading against a band. Boundaries are inclusive. */
export function classifyReading(reading: number, band: EffectiveBand): MoistureClassification {
  if (reading < band.min) return 'too_dry';
  if (reading > band.max) return 'too_wet';
  return 'in_band';
}

/** Display label for a classification. */
export const CLASSIFICATION_LABELS: Record<MoistureClassification, string> = {
  too_dry: 'Too dry',
  in_band: 'Within healthy band',
  too_wet: 'Too wet',
};
