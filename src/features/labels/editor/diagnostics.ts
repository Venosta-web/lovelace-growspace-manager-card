/**
 * What is wrong with a label, in the order it should be fixed, pointing at the
 * control that fixes it.
 *
 * Two sources feed the editor: the **publication check** that every autosave
 * returns (document and content layers, no printer needed) and the **render**
 * (profile compilation, raster, transport). Shown as two lists they read as
 * two opinions; merged, ordered by severity and deduplicated, they are one
 * list of work with the blockers at the top.
 *
 * Each row is resolved to a **destination** — the element and the exact
 * inspector control, profile selection, the calibration flow, a retry — from
 * the diagnostic's own `recovery`, because the backend already decided where
 * a correction lives and a card that re-derived it from the message would be
 * guessing.
 *
 * And no row carries the backend's `message`. Copy is looked up by code, then
 * by layer and severity, from reviewed local strings: the message is a log
 * line for a developer, and a user shown it would be reading an English
 * sentence about element ULIDs.
 *
 * Pure: no DOM, no Lit. Everything here is testable as data.
 */

import type { PublicationCheck } from '../../../slices/labels/draft-schema';
import type { LabelDiagnostic } from '../../../slices/labels/schema';

export type Severity = 'error' | 'warning' | 'info';

/** Where a user goes to clear one diagnostic. */
export type Destination =
  /** Select the element and focus the named control. */
  | 'element'
  /** Change what the element shows: its binding or its text. */
  | 'content'
  /** Choose a printer profile this layout can reach. */
  | 'profile'
  /** Measure this printer. */
  | 'calibration'
  /** Reload, restore or replace the template itself. */
  | 'template'
  /** Ask again: nothing about the layout has to change. */
  | 'retry'
  /** Nothing to correct. */
  | 'none';

export interface DiagnosticEntry {
  /** Stable across renders, so focus and announcements can follow a row. */
  key: string;
  code: string;
  severity: Severity;
  layer: string;
  elementId: string | null;
  /** The inspector `data-field` that edits the offending value, if one does. */
  control: string | null;
  destination: Destination;
  /** Named values, passed through for copy that interpolates them. */
  parameters: Record<string, unknown>;
}

type AnyDiagnostic = Pick<
  LabelDiagnostic,
  'code' | 'layer' | 'path' | 'element_id' | 'recovery' | 'parameters'
> & { severity: string };

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** The validation layers, in the order the backend runs them. */
const LAYER_RANK: Record<string, number> = {
  document: 0,
  content: 1,
  profile_compilation: 2,
  raster: 3,
  transport: 4,
};

const RECOVERY_DESTINATION: Record<string, Destination> = {
  edit_element: 'element',
  edit_content: 'content',
  select_profile: 'profile',
  calibrate: 'calibration',
  restore_template: 'template',
  retry: 'retry',
  none: 'none',
};

/**
 * Codes whose backend recovery the editor cannot perform.
 *
 * A font file missing beside the integration is reported by the raster layer,
 * whose default recovery is "retry" — but asking again renders without the
 * font again. It is an installation matter, so the row explains it and offers
 * no button that would do nothing.
 */
const CODE_DESTINATION: Record<string, Destination> = {
  'raster.text_unmeasured': 'none',
};

/**
 * The control a pathless diagnostic is about.
 *
 * Profile and raster diagnostics are judged against the compiled label rather
 * than a document field, so most arrive with an empty path; the code is then
 * the only thing that says which input would change the outcome.
 */
const CODE_CONTROL: Record<string, string> = {
  'profile.text_below_readable_floor': 'font_size_mm',
  'profile.text_below_comfort_threshold': 'font_size_mm',
  'raster.text_does_not_fit': 'font_size_mm',
  'raster.text_truncated': 'maximum_lines',
  'raster.missing_glyph': 'font',
  'profile.qr_quiet_zone_too_small': 'quiet_zone_modules',
  'raster.qr_quiet_zone_violated': 'quiet_zone_modules',
  'profile.qr_error_correction_unsupported': 'error_correction',
  'profile.qr_below_module_floor': 'width_mm',
  'raster.qr_does_not_fit': 'width_mm',
  'profile.qr_target_too_long': 'binding',
  'profile.image_below_effective_resolution': 'width_mm',
  'profile.divider_below_reproducible_thickness': 'height_mm',
  'profile.ink_outside_printable_area': 'x_mm',
  'profile.ink_outside_safe_area': 'x_mm',
  'profile.outside_printable_area': 'x_mm',
  'raster.ink_overlap': 'x_mm',
  'raster.required_content_occluded': 'x_mm',
};

/**
 * Read the inspector control out of a JSON pointer into the document.
 *
 * `/elements/3/frame/x_mm` edits `x_mm`, `/elements/3/style/font_size_mm`
 * edits `font_size_mm`, and anything under `/elements/3/content` is the
 * content source — whose control is the binding picker or the literal field,
 * which one being the element's own business.
 */
export function controlForPath(path: string): string | null {
  const parts = path.split('/').filter((part) => part !== '');
  if (parts[0] !== 'elements' || parts.length < 3) return null;
  const [, , group, field] = parts;
  if (group === 'frame' || group === 'style') return field ?? null;
  if (group === 'content') return field === 'literal' ? 'literal' : 'binding';
  return null;
}

function severityOf(value: string): Severity {
  return value === 'error' || value === 'warning' ? value : 'info';
}

function entryOf(item: AnyDiagnostic): DiagnosticEntry {
  const destination = CODE_DESTINATION[item.code] ?? RECOVERY_DESTINATION[item.recovery] ?? 'none';
  const control = controlForPath(item.path) ?? CODE_CONTROL[item.code] ?? null;
  // An element-level correction with no element to select is not a
  // destination: there is nothing to go to. Say what is wrong, offer nothing.
  const reachable =
    (destination === 'element' || destination === 'content') && item.element_id === null
      ? 'none'
      : destination;
  return {
    key: `${item.code}|${item.element_id ?? ''}|${item.path}`,
    code: item.code,
    severity: severityOf(item.severity),
    layer: item.layer,
    elementId: item.element_id,
    control: reachable === 'element' || reachable === 'content' ? control : null,
    destination: reachable,
    parameters: item.parameters,
  };
}

/**
 * One ordered list: errors first, then warnings, then notes; within a
 * severity in the order the layers run; within a layer as the backend listed
 * them. Duplicates — the same code on the same element and path, reported by
 * both the publication check and the render — appear once.
 */
export function collectDiagnostics(
  validation: PublicationCheck | null,
  render: { diagnostics: readonly AnyDiagnostic[] } | null
): DiagnosticEntry[] {
  const all = [...(validation?.diagnostics ?? []), ...(render?.diagnostics ?? [])];
  const seen = new Set<string>();
  const entries: { entry: DiagnosticEntry; index: number }[] = [];
  all.forEach((item, index) => {
    const entry = entryOf(item);
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    entries.push({ entry, index });
  });
  return entries
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.entry.severity] - SEVERITY_RANK[b.entry.severity] ||
        (LAYER_RANK[a.entry.layer] ?? 9) - (LAYER_RANK[b.entry.layer] ?? 9) ||
        a.index - b.index
    )
    .map(({ entry }) => entry);
}

/** How many of each, for the heading and for the live region. */
export function countBySeverity(entries: readonly DiagnosticEntry[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const entry of entries) counts[entry.severity] += 1;
  return counts;
}

/**
 * The localization keys to try for one row, most specific first.
 *
 * A code this card has reviewed copy for gets it; any other falls back to a
 * sentence about its layer and severity, and last to one about its severity
 * alone — never to the backend's message.
 */
export function copyKeys(entry: Pick<DiagnosticEntry, 'code' | 'layer' | 'severity'>): string[] {
  return [
    `diagnostic_${entry.code.replace(/\./g, '_')}`,
    `diagnostic_layer_${entry.layer}_${entry.severity}`,
    `diagnostic_severity_${entry.severity}`,
  ];
}
