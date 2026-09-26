/**
 * Tanks Tab ViewModel (ADR-0019)
 *
 * The pure derivation behind the Irrigation Dialog's Tanks tab — the first
 * *draft* tab adapter (the reference for the gesture→intent→effect loop the
 * read-only Overview tab did not exercise). It `computed`s the tab's entire
 * render input — the tank-level rows (config + live levels formatted for
 * display) and the projected inline-edit sub-state — from the SM atom, the
 * Irrigation slice's `tankLevels$`, and the sensor-entity options.
 *
 * Per the sharpened ADR-0019 seam, `$sm` is the one mandatory input (it carries
 * the edit draft); the remaining deps are opt-in — the Tanks tab reads
 * `tankLevels$` and the sensor options, and no `$caps` (it has no cross-tab
 * capability gating). See CONTEXT.md "Tank Config vs Tank Levels": the rows read
 * from `tankLevels$` (authoritative), while the Save effect writes through the
 * Environment Change interface with eventual (sync-driven)
 * consistency — there is no optimistic Tank-Config bridge.
 *
 * The row formatting is transcribed verbatim from the dialog's former inline
 * `_renderTankRow` so the rendered output stays byte-identical.
 */

import { atom, computed, type ReadableAtom } from 'nanostores';
import type { GrowspaceDevice, IrrigationTank } from '../../../services/types';
import type { DialogSM, TankDraft } from '../../../dialogs/irrigation-dialog-sm';
import { localize, localizeWithParams } from '../../../localize/localize';
import { formatSince, tankLevelHolds, type SafetyView } from '../../../slices/safety';
import { token } from '../../../styles/variables';

/** One tank-level row (config identity + live telemetry, formatted for display). */
export interface TankRowVM {
  /** Array index — the identity the inline editor is keyed by. */
  index: number;
  name: string;
  isWarning: boolean;
  /** Fill/health colour for the bar and percentage. */
  color: string;
  /** Bar width, clamped to 0–100. */
  barWidthPct: number;
  /** "73%" or "N/A" when no fill level is reporting. */
  fillLabel: string;
  /** Depletion + hours-remaining context line, or null when neither is present. */
  subLine: string | null;
}

/** Projected inline-edit state: which tank is open, its draft, and entity options. */
export interface TankEditVM {
  index: number;
  draft: TankDraft;
  /** Sensor/input_number entity_ids for the form's datalist. */
  entityOptions: string[];
}

/**
 * Why the irrigation controller is holding on a tank, in the viewer's language
 * — so the grower sees the pause where they would fix it, without opening Home
 * Assistant notifications.
 */
export interface TankHoldVM {
  /** The backend reason code, `tank_unknown` or `tank_low`. */
  code: string;
  /** "Irrigation held · Tank level unknown". */
  heading: string;
  /** The backend's own sentence, which names the tank and the cause. */
  detail: string;
  /** "since 12 minutes ago", or null when the instant does not parse. */
  since: string | null;
}

/** Complete render input for `<irrigation-tanks-tab>`. */
export interface TanksTabViewModel {
  /** Tank rows; empty array → the "no tanks configured" empty state. */
  tanks: TankRowVM[];
  /** The controller's tank reasons while it is inhibited; empty otherwise. */
  holds: TankHoldVM[];
  /** The open editor, or null when idle. */
  editing: TankEditVM | null;
}

/**
 * Project a growspace's safety view onto the Tanks tab's hold notes.
 *
 * Only the `tank_*` reasons (`tankLevelHolds`). `now` is a parameter so the
 * relative time is testable.
 */
export function deriveTankHolds(
  view: SafetyView | null,
  now: number,
  language = 'en'
): TankHoldVM[] {
  const held = localize('safety.tank_irrigation_held', '', '', language);
  return tankLevelHolds(view).map((reason) => {
    const since = formatSince(reason.since, now, language);
    return {
      code: reason.code,
      heading: `${held} · ${reason.label}`,
      detail: reason.detail,
      since: since ? localizeWithParams('safety.since', { time: since }, language) : null,
    };
  });
}

function deriveRow(tank: IrrigationTank, index: number): TankRowVM {
  const pct = tank.fillLevel ?? 0;
  const isWarning = tank.isWarning;
  const color = isWarning
    ? token['--gm-error-color']
    : (tank.hoursRemaining ?? 999) < 24
      ? token['--gm-warning-color']
      : token['--gm-primary-color'];

  const depletionLabel =
    tank.depletionStatus === 'depleting'
      ? '↓ Depleting'
      : tank.depletionStatus === 'refilling'
        ? '↑ Refilling'
        : tank.depletionStatus === 'static'
          ? '— Stable'
          : '';

  const hoursLabel =
    tank.hoursRemaining != null
      ? (tank.hoursRemaining >= 48
          ? Math.floor(tank.hoursRemaining / 24) + 'd'
          : Math.round(tank.hoursRemaining) + 'h') + ' left'
      : '';

  const subParts = [depletionLabel, hoursLabel].filter((p) => p !== '');

  return {
    index,
    name: tank.name,
    isWarning,
    color,
    barWidthPct: Math.max(0, Math.min(100, pct)),
    fillLabel:
      tank.fillLevel !== null && tank.fillLevel !== undefined ? `${pct.toFixed(0)}%` : 'N/A',
    subLine: subParts.length > 0 ? subParts.join(' · ') : null,
  };
}

/**
 * Pure helper that composes the Save payload: the full tank array with `draft`
 * merged over the tank at `index`. The spread overwrites the Tank Config
 * fields and PRESERVES the live Tank Levels fields (fillLevel, isWarning, …) so
 * an optimistic read never blanks live telemetry. Out-of-range indices are a
 * no-op. Owned here (not in the effect) so the Dialog Shell can snapshot the
 * payload into `applying.params` at dispatch time (ADR-0015).
 */
export function mergeTankDraft(
  tanks: IrrigationTank[],
  index: number,
  draft: TankDraft
): IrrigationTank[] {
  if (index < 0 || index >= tanks.length) return [...tanks];
  const next = [...tanks];
  next[index] = { ...next[index], ...draft };
  return next;
}

/**
 * Pure factory: SM atom + the Irrigation slice's `tankLevels$` + sensor-entity
 * options + the device atom (for the growspace id key) + the hold notes → one
 * Tanks VM atom. No `$caps` (the Tanks tab has no cross-tab capability gating).
 * The device atom is taken only to key `tankLevels$` by `deviceId` — the tank
 * *data* comes from the slice, not the device read-model. The holds are
 * hass-derived (`deriveTankHolds`), so the shell mirrors them into an atom the
 * way it does the entity options. Testable with no DOM.
 */
export function createTanksTabViewModel(
  $sm: ReadableAtom<DialogSM>,
  $tankLevels: ReadableAtom<Map<string, IrrigationTank[]>>,
  $entityOptions: ReadableAtom<string[]>,
  $device: ReadableAtom<GrowspaceDevice | undefined>,
  $holds: ReadableAtom<TankHoldVM[]> = atom([])
): ReadableAtom<TanksTabViewModel> {
  return computed(
    [$sm, $tankLevels, $entityOptions, $device, $holds],
    (sm, tankLevels, entityOptions, device, holds) => {
      const tanks = tankLevels.get(device?.deviceId ?? '') ?? [];
      const sub = sm.tabs.tanks.sub;
      return {
        tanks: tanks.map(deriveRow),
        holds,
        editing:
          sub.kind === 'editing' ? { index: sub.index, draft: sub.draft, entityOptions } : null,
      };
    }
  );
}
