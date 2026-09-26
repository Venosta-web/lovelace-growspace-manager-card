/**
 * The two settings behind an Unknown Tank Level (GSM#790, ADR-0050), shared by
 * every control that edits them so they parse, default and read the same.
 *
 * - A tank's **staleness window**: how long its sensor may go without reporting
 *   before the level counts as unknown. `0` switches it off — the fix for a
 *   sensor that reports only on change, which on a steady tank would otherwise
 *   go quiet long enough to look offline.
 * - A growspace's **Tank Grace Period**: how long a level may stay unknown
 *   before irrigation pauses on it and the Tank Offline Alert goes out.
 */

/** The backend's default window. */
export const DEFAULT_TANK_STALE_AFTER_MINUTES = 120;

/** The backend's default grace, and the most `set_irrigation_settings` takes. */
const DEFAULT_TANK_UNKNOWN_GRACE_MINUTES = 10;
const MAX_TANK_UNKNOWN_GRACE_MINUTES = 120;

/** Hint under every staleness-window field. */
export const TANK_STALE_AFTER_HINT =
  'How long the sensor may stay silent before its level counts as unknown. 0 means never — for sensors that only report when the level changes.';

/** A staleness-window field: blank is the default, below zero is off. */
export function parseStaleAfterMinutes(raw: string): number {
  const minutes = parseInt(raw, 10);
  return Number.isNaN(minutes) ? DEFAULT_TANK_STALE_AFTER_MINUTES : Math.max(0, minutes);
}

/**
 * A Tank Grace Period field: blank is the default, and the rest is held to the
 * 0–120 the action accepts rather than sent to be refused.
 */
export function parseTankGraceMinutes(raw: string): number {
  const minutes = parseInt(raw, 10);
  return Number.isNaN(minutes)
    ? DEFAULT_TANK_UNKNOWN_GRACE_MINUTES
    : Math.min(MAX_TANK_UNKNOWN_GRACE_MINUTES, Math.max(0, minutes));
}

/** A tank row's note on its window, or null when it is the default or unknown. */
export function staleWindowLabel(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes === DEFAULT_TANK_STALE_AFTER_MINUTES) return null;
  return minutes === 0 ? 'Never stale' : `Stale after ${minutes} min`;
}
