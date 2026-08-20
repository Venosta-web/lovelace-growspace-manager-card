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

/** Stable env-draft field name → the display label the Duplicate Port Warning names. */
export const AC_INFINITY_ROLE_LABELS: Record<string, string> = {
  exhaustFanAcInfinityDevices: 'Exhaust Fan',
  circulationFanAcInfinityDevices: 'Circulation Fan',
  humidifierAcInfinityDevices: 'Humidifier',
  dehumidifierAcInfinityDevices: 'Dehumidifier',
  growlightAcInfinityDevices: 'Grow Light',
};

/** One role bundle's per-port mode entities, tagged by its stable field name. */
export interface DuplicatePortRoleList {
  field: string;
  /** Per-port `mode_entity`, parallel to the bundle's device array (may be ''). */
  modeEntities: string[];
}

/** The five role bundles a draft holds, keyed by their mode entities, in canonical order. */
export function acInfinityRoleLists(d: {
  exhaustFanAcInfinityDevices: { mode_entity: string }[];
  circulationFanAcInfinityDevices: { mode_entity: string }[];
  humidifierAcInfinityDevices: { mode_entity: string }[];
  dehumidifierAcInfinityDevices: { mode_entity: string }[];
  growlightAcInfinityDevices: { mode_entity: string }[];
}): DuplicatePortRoleList[] {
  return Object.keys(AC_INFINITY_ROLE_LABELS).map((field) => ({
    field,
    modeEntities: (d[field as keyof typeof d] ?? []).map((dev) => dev.mode_entity),
  }));
}

function joinRoles(labels: string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * Duplicate Port Warning fold (ADR-0028): a mode entity assigned to more than
 * one role bundle in the same growspace draft means two GSM controllers would
 * fight over one port. Returns, per field, a per-port message parallel to that
 * bundle's devices — '' when the port's mode entity is unique to its role, else
 * a passive warning naming the *other* role(s) holding it. Blank mode entities
 * never match each other; a repeat within a single field is not a cross-role
 * duplicate (`another role bundle`), so it is not flagged.
 */
export function buildDuplicatePortWarnings(
  lists: DuplicatePortRoleList[]
): Record<string, string[]> {
  const fieldsByEntity = new Map<string, Set<string>>();
  for (const { field, modeEntities } of lists) {
    for (const eid of modeEntities) {
      if (!eid) continue;
      const set = fieldsByEntity.get(eid) ?? new Set<string>();
      set.add(field);
      fieldsByEntity.set(eid, set);
    }
  }
  const result: Record<string, string[]> = {};
  for (const { field, modeEntities } of lists) {
    result[field] = modeEntities.map((eid) => {
      const fields = eid ? fieldsByEntity.get(eid) : undefined;
      if (!fields) return '';
      const others = [...fields].filter((f) => f !== field);
      if (others.length === 0) return '';
      const labels = others.map((f) => AC_INFINITY_ROLE_LABELS[f] ?? f);
      return `This port is also configured as ${joinRoles(labels)} — two controllers would fight over it.`;
    });
  }
  return result;
}
