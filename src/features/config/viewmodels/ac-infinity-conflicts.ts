/**
 * Shared ViewModel helper: fold a tab's AC Infinity device lists into an
 * Automated Mode Conflict lookup keyed by `mode_entity`, ready for the editor.
 * Used by both the Climate and Humidity tab ViewModels so the four roles behave
 * identically. Empty/duplicate mode entities are skipped; the shell-supplied
 * resolver returns `null` for non-conflicted (Off/On/unavailable/unknown) ports.
 */

import type { AcInfinityConflict } from '../components/ac-infinity-conflict';
import type { AcInfinityDevice } from '../../../slices/growspace/schema';

export function buildAcInfinityConflicts(
  deviceLists: AcInfinityDevice[][],
  resolve: (modeEntity: string) => AcInfinityConflict | null
): Record<string, AcInfinityConflict> {
  const conflicts: Record<string, AcInfinityConflict> = {};
  for (const list of deviceLists) {
    for (const device of list) {
      const eid = device.mode_entity;
      if (!eid || conflicts[eid]) continue;
      const conflict = resolve(eid);
      if (conflict) conflicts[eid] = conflict;
    }
  }
  return conflicts;
}
