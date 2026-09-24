/**
 * The header's health verdict — one sentence about the growspace, derived from
 * the same sources the tiles beneath it are drawn from.
 *
 * Two dimensions feed it and it names them separately:
 *   - **Plants** — the problem-plant triage list (`problemPlants`).
 *   - **Environment** — the `status` every header tile already carries
 *     (`HeaderChip.status`, the value the tile's own badge renders).
 *
 * The verdict used to read plants alone, so a tent could be "All 17 plants on
 * track" in the header beside a VPD tile marked CRITICAL. Deriving both halves
 * here, from the tiles themselves, is what makes that state unrepresentable:
 * "on track" is only ever produced when no displayed tile is warning or danger.
 */

import type { HeaderChip } from './index';
import { StatusLevel, toStatusLevel } from '../../features/environment/constants';

/** One named dimension of the verdict. */
interface VerdictLine {
  scope: 'plants' | 'environment';
  level: StatusLevel;
  summary: string;
  detail: string;
}

export interface HeaderVerdict {
  /**
   * `unavailable` — plant data has not loaded, so no claim about plants is made.
   * `empty` — no plants are assigned.
   * `assessed` — plants are present and the triage has spoken.
   */
  kind: 'unavailable' | 'empty' | 'assessed';
  /** The worst level across `lines`; tints the summary as a whole. */
  level: StatusLevel;
  /**
   * Worst first, so the first line is the headline. The environment line is
   * present only when a displayed tile is flagged — then both are named.
   */
  lines: VerdictLine[];
}

export interface HeaderVerdictInput {
  /** The growspace's plants, or anything other than an array while they are loading. */
  plants: unknown;
  /** Display names of plants the triage flagged. */
  problemPlants: readonly string[];
  /** Every tile the header displays — hero, secondary and device chips. */
  tiles: readonly HeaderChip[];
}

const SEVERITY: Record<StatusLevel, number> = {
  [StatusLevel.OPTIMAL]: 0,
  [StatusLevel.WARNING]: 1,
  [StatusLevel.DANGER]: 2,
};

/** Names shown before the rest collapse into "+N more". */
const VISIBLE_NAMES = 2;

function _worst(levels: StatusLevel[]): StatusLevel {
  return levels.reduce(
    (worst, level) => (SEVERITY[level] > SEVERITY[worst] ? level : worst),
    StatusLevel.OPTIMAL
  );
}

function _names(names: readonly string[]): string {
  const visible = names.slice(0, VISIBLE_NAMES).join(', ');
  const remaining = names.length - Math.min(names.length, VISIBLE_NAMES);
  return remaining > 0 ? `${visible} +${remaining} more` : visible;
}

/**
 * The environment line, or null when no displayed tile is flagged.
 *
 * Only warning and danger count; a tile without a status (a device chip, a
 * reading with no target band) says nothing about health either way.
 */
function _environmentLine(tiles: readonly HeaderChip[]): VerdictLine | null {
  const flagged = new Map<string, { label: string; level: StatusLevel }>();
  for (const tile of tiles) {
    const level = toStatusLevel(tile.status);
    if (level === null || level === StatusLevel.OPTIMAL) continue;
    const seen = flagged.get(tile.key);
    if (!seen || SEVERITY[level] > SEVERITY[seen.level]) {
      flagged.set(tile.key, { label: tile.label || tile.key, level });
    }
  }
  if (flagged.size === 0) return null;

  const entries = Array.from(flagged.values()).sort(
    (a, b) => SEVERITY[b.level] - SEVERITY[a.level]
  );
  const level = _worst(entries.map((entry) => entry.level));
  return {
    scope: 'environment',
    level,
    summary: level === StatusLevel.DANGER ? 'Environment critical' : 'Environment needs attention',
    detail: _names(entries.map((entry) => entry.label)),
  };
}

function _plantLine(
  plantCount: number,
  problemPlants: readonly string[],
  environmentFlagged: boolean
): VerdictLine {
  const alertCount = problemPlants.length;
  if (alertCount > 0) {
    return {
      scope: 'plants',
      level: StatusLevel.WARNING,
      summary: `${alertCount} plant${alertCount === 1 ? '' : 's'} ${
        alertCount === 1 ? 'needs' : 'need'
      } attention`,
      detail: _names(problemPlants),
    };
  }

  const plural = plantCount === 1 ? '' : 's';
  // "On track" is a claim about the whole growspace, so it is only made when
  // the environment agrees. Beside a flagged tile the plant line says only
  // what the triage knows: nothing was reported against a plant.
  return environmentFlagged
    ? {
        scope: 'plants',
        level: StatusLevel.OPTIMAL,
        summary: `${plantCount} plant${plural}, none flagged`,
        detail: 'No plant issues reported.',
      }
    : {
        scope: 'plants',
        level: StatusLevel.OPTIMAL,
        summary: `All ${plantCount} plant${plural} on track`,
        detail: 'No plant issues reported.',
      };
}

/** Worst first; plants lead on a tie, so a plant alert keeps its place. */
function _order(lines: VerdictLine[]): VerdictLine[] {
  return [...lines].sort((a, b) => {
    const bySeverity = SEVERITY[b.level] - SEVERITY[a.level];
    if (bySeverity !== 0) return bySeverity;
    return a.scope === b.scope ? 0 : a.scope === 'plants' ? -1 : 1;
  });
}

export function deriveHeaderVerdict({
  plants,
  problemPlants,
  tiles,
}: HeaderVerdictInput): HeaderVerdict {
  const environment = _environmentLine(tiles);

  if (!Array.isArray(plants)) {
    const lines: VerdictLine[] = [
      {
        scope: 'plants',
        level: StatusLevel.WARNING,
        summary: 'Plant status unavailable',
        detail: 'Status data has not loaded yet.',
      },
      ...(environment ? [environment] : []),
    ];
    return { kind: 'unavailable', level: _worst(lines.map((l) => l.level)), lines: _order(lines) };
  }

  if (plants.length === 0) {
    const lines: VerdictLine[] = [
      {
        scope: 'plants',
        level: StatusLevel.OPTIMAL,
        summary: 'Ready for plants',
        detail: 'No plants are assigned to this growspace.',
      },
      ...(environment ? [environment] : []),
    ];
    return { kind: 'empty', level: _worst(lines.map((l) => l.level)), lines: _order(lines) };
  }

  const lines = [
    _plantLine(plants.length, problemPlants, environment !== null),
    ...(environment ? [environment] : []),
  ];
  return { kind: 'assessed', level: _worst(lines.map((l) => l.level)), lines: _order(lines) };
}
