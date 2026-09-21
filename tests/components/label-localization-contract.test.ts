/**
 * Every code the integration can send has reviewed English copy (hub #230).
 *
 * The integration publishes its complete set of diagnostic codes — with the
 * parameters each one sends — refusal codes and eligibility blockers as
 * `label_localization_catalogue_v1`. This suite holds the card's catalogue to
 * it in both directions: a new code without copy fails here rather than
 * reading "That could not be done." in production, copy for a code nobody
 * sends is stale, and copy that interpolates a parameter the producer does not
 * send would render a hole.
 *
 * It also refuses the one shortcut that would make all of that moot: putting
 * the backend's own English `reason` or `message` in front of a user.
 */

import { describe, expect, test } from 'vitest';

import catalogue from '../fixtures/contract/label_localization_catalogue_v1.json';
import en from '../../src/localize/languages/en.json';
import {
  CARD_REFUSALS,
  LAYER_COPY_DIAGNOSTICS,
  refusalCopy,
  refusalKey,
  refusalSuffix,
} from '../../src/features/labels/copy';
import { copyKeys } from '../../src/features/labels/editor/diagnostics';

const LABELS = en.labels as Record<string, string>;
const DIAGNOSTICS = catalogue.diagnostics as Record<
  string,
  { layer: string; severities: string[]; parameters: string[] }
>;
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);

describe('diagnostics', () => {
  test('every code has its own copy or is a reviewed structural fault', () => {
    const missing = Object.keys(DIAGNOSTICS).filter(
      (code) => !(copyKeys({ code, layer: '', severity: 'error' })[0] in LABELS)
    );
    expect(missing.filter((code) => !LAYER_COPY_DIAGNOSTICS.has(code))).toEqual([]);
  });

  test('a structural fault still lands on copy for its layer and every severity', () => {
    for (const code of LAYER_COPY_DIAGNOSTICS) {
      const spec = DIAGNOSTICS[code];
      expect(spec, `${code} is no longer sent`).toBeDefined();
      for (const severity of spec.severities) {
        expect(LABELS[`diagnostic_layer_${spec.layer}_${severity}`]).toBeTruthy();
      }
    }
  });

  test('no structural fault has copy of its own that is being ignored', () => {
    for (const code of LAYER_COPY_DIAGNOSTICS) {
      expect(`diagnostic_${code.replace(/\./g, '_')}` in LABELS).toBe(false);
    }
  });

  test('no copy describes a code the integration no longer sends', () => {
    const sent = new Set(Object.keys(DIAGNOSTICS).map((code) => code.replace(/\./g, '_')));
    const stale = Object.keys(LABELS)
      .filter((key) => /^diagnostic_/.test(key) && !/^diagnostic_(layer|severity)_/.test(key))
      .filter((key) => !sent.has(key.slice('diagnostic_'.length)));
    expect(stale).toEqual([]);
  });

  test('copy interpolates only parameters the producer sends', () => {
    for (const [code, spec] of Object.entries(DIAGNOSTICS)) {
      const copy = LABELS[`diagnostic_${code.replace(/\./g, '_')}`];
      if (!copy) continue;
      expect(
        placeholders(copy).filter((name) => !spec.parameters.includes(name)),
        code
      ).toEqual([]);
    }
  });

  test('layer copy interpolates nothing, since it serves codes with other parameters', () => {
    for (const [key, copy] of Object.entries(LABELS)) {
      if (/^diagnostic_(layer|severity)_/.test(key)) expect(placeholders(copy), key).toEqual([]);
    }
  });
});

describe('refusals', () => {
  test('both spellings of one refusal share one key', () => {
    expect(refusalSuffix('label_template.DraftVersionConflict')).toBe('draft_version_conflict');
    expect(refusalSuffix('label_template.draft_version_conflict')).toBe('draft_version_conflict');
    expect(refusalKey('label_template.TemplateNotFound')).toBe('refusal_template_not_found');
  });

  test('every refusal code has copy', () => {
    const missing = catalogue.refusals.filter((code) => !(refusalKey(code) in LABELS));
    expect(missing).toEqual([]);
  });

  test('an unknown code falls back to the generic sentence, never to the code', () => {
    expect(refusalCopy('label_template.something_new')).toBe(LABELS.refusal_generic);
  });

  test('no refusal copy describes a code nobody sends', () => {
    const sent = new Set(catalogue.refusals.map(refusalSuffix));
    const stale = Object.keys(LABELS)
      .filter((key) => key.startsWith('refusal_'))
      .map((key) => key.slice('refusal_'.length))
      .filter((suffix) => !sent.has(suffix) && !CARD_REFUSALS.has(suffix));
    expect(stale).toEqual([]);
  });

  test('refusal copy interpolates nothing the wire does not carry', () => {
    for (const [key, copy] of Object.entries(LABELS)) {
      if (key.startsWith('refusal_') || key.startsWith('batch_refusal_')) {
        expect(placeholders(copy), key).toEqual([]);
      }
    }
  });
});

describe('eligibility blockers', () => {
  test('every blocker has copy on the surface that can show it', () => {
    const missing = catalogue.blockers.filter(
      (blocker) => !(`print_blocker_${blocker}` in LABELS || `batch_blocker_${blocker}` in LABELS)
    );
    expect(missing).toEqual([]);
  });
});

describe('the backend never speaks to the user directly', () => {
  const sources = import.meta.glob(
    ['../../src/features/labels/**/*.ts', '../../src/dialogs/*label*.ts', '!**/*.test.ts'],
    { query: '?raw', import: 'default', eager: true }
  ) as Record<string, string>;

  test('finds the label sources it is guarding', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
  });

  test.each(Object.entries(sources))(
    '%s shows no refusal reason or diagnostic message',
    (_, text) => {
      expect(text).not.toMatch(/refusal\.reason/);
      expect(text).not.toMatch(/(item|diagnostic|entry)\.message\b/);
    }
  );
});
