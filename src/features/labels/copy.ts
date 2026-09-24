/**
 * Reviewed copy for the stable codes the integration sends.
 *
 * The integration localizes what it prints; the card localizes what it is
 * told. A refusal's `reason` and a diagnostic's `message` are English log
 * lines for a developer and never reach a user — every code resolves to a
 * key in this card's catalogue, and a code without one falls back to a
 * generic sentence rather than to the backend's prose.
 *
 * `tests/components/label-localization-contract.test.ts` holds these rules to
 * the catalogue the integration publishes, so a new code without copy fails
 * the card's suite instead of silently reading "That could not be done."
 */

import { localize } from '../../localize/localize';

/**
 * The key part of one refusal code.
 *
 * Most commands refuse with `label_template.<snake_case>`; the template
 * management command refuses a library error by its class name,
 * `label_template.<ErrorName>`. Both spellings of one refusal share its copy.
 */
export function refusalSuffix(code: string): string {
  return code
    .replace(/^label_template\./, '')
    .replace(/(?<!^)([A-Z])/g, '_$1')
    .toLowerCase();
}

/** The catalogue key one refusal code is described by. */
export function refusalKey(code: string): string {
  return `refusal_${refusalSuffix(code)}`;
}

/** Whether the labels catalogue holds `key` in `language` or English. */
function hasLabelCopy(key: string, language = 'en'): boolean {
  return localize(`labels.${key}`, '', '', language) !== `labels.${key}`;
}

/** The first of `keys` the catalogue holds, else `fallback`. */
export function labelCopy(keys: readonly string[], fallback: string, language = 'en'): string {
  const key = keys.find((candidate) => hasLabelCopy(candidate, language)) ?? fallback;
  return localize(`labels.${key}`, '', '', language);
}

/** One refusal, in the user's words. */
export function refusalCopy(
  code: string,
  language = 'en',
  prefixes: readonly string[] = []
): string {
  const suffix = refusalSuffix(code);
  return labelCopy(
    [...prefixes.map((prefix) => `${prefix}${suffix}`), `refusal_${suffix}`],
    'refusal_generic',
    language
  );
}

/**
 * Diagnostics deliberately described by their layer rather than their code.
 *
 * Each is a structural fault in a layout document — a missing field, a
 * malformed identity, an unknown token — that this card's editor cannot
 * produce: it writes whole, schema-valid documents. Reaching one means a
 * document written elsewhere (an import, a newer card) or a bug, and the
 * honest sentence is the layer's, "the layout itself is invalid here". A
 * code a user can cause from the inspector does not belong here; it gets copy
 * of its own.
 */
export const LAYER_COPY_DIAGNOSTICS: ReadonlySet<string> = new Set([
  'content.ambiguous_source',
  'content.asset_not_permitted',
  'content.binding_kind_mismatch',
  'content.invalid_asset',
  'content.invalid_parameter',
  'content.not_an_object',
  'content.parameters_not_an_object',
  'content.unknown_parameter',
  'document.elements_not_an_array',
  'document.not_an_object',
  'document.unknown_schema',
  'document.unsupported_version',
  'element.divider_has_content',
  'element.duplicate_id',
  'element.invalid_id',
  'element.not_an_object',
  'element.unknown_kind',
  'element.unsupported_rotation',
  'frame.not_an_object',
  'geometry.not_a_number',
  'geometry.not_finite',
  'schema.foreign_field',
  'schema.missing_field',
  'schema.unknown_field',
  'style.invalid_value',
  'style.non_positive_font_size',
  'style.not_an_object',
  'style.unknown_token',
]);

/** Refusals the card raises itself, which no integration code maps to. */
export const CARD_REFUSALS: ReadonlySet<string> = new Set([
  'generic',
  'preview_timeout',
  'transport_failed',
]);
