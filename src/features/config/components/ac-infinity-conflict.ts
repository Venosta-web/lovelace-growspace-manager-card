/**
 * AC Infinity "Automated Mode Conflict" detection (see CONTEXT.md).
 *
 * A bound AC Infinity port whose mode `select` sits in one of the controller's
 * self-running modes (`Auto`/`VPD`/`Timer`/`Cycle`/`Schedule` — anything other
 * than `Off`/`On`) is re-asserted by the AC Infinity controller/cloud, so GSM's
 * `On`/`Off` writes don't reliably stick. This module holds the pure predicate;
 * the shell (config-dialog) supplies the hass-reading resolver that turns a mode
 * entity into a {@link AcInfinityConflict}, and the tab ViewModels fold the
 * per-device results into a lookup the editor renders as a passive warning.
 */

/** The advice payload rendered beside a conflicted port's mode picker. */
export interface AcInfinityConflict {
  /** Device-registry name (friendly-name fallback) the user recognizes. */
  deviceName: string;
  /** The current mode-select state verbatim, e.g. `Auto` or `VPD`. */
  mode: string;
}

/**
 * States that mean the port is *not* in a self-running mode: `off`/`on` are the
 * two GSM-controllable states; `unavailable`/`unknown` are non-assertions (GSM
 * can't claim a conflict), mirroring the backend `ACInfinityDriver.is_on()` rule.
 */
const NON_AUTOMATED_STATES = new Set(['off', 'on', 'unavailable', 'unknown']);

/**
 * True when a mode-select state string represents an AC Infinity self-running
 * ("automated") mode. Empty/missing states are not automated (no warning).
 */
export function isAutomatedMode(state: string | null | undefined): boolean {
  if (!state) return false;
  return !NON_AUTOMATED_STATES.has(state.toLowerCase());
}
