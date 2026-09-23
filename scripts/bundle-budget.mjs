/**
 * The bundle-size budget, judged on the production build.
 *
 * Nothing noticed the entry grow to 2.0 MB (#968) or every dialog collapse into
 * one 1.3 MB chunk (#969), because nothing measured either. The limits live in
 * `scripts/bundle-budget.json`, the one file a pull request has to touch to
 * make room, and this module holds the rules for reading it.
 *
 * Sizes are gzip level 9 of the emitted bytes: it is what a dashboard downloads
 * over any server that compresses, and unlike the raw size it does not reward
 * or punish a change of minifier setting that only moves whitespace.
 *
 * Each chunk is judged by the first rule whose pattern matches its file name,
 * so the catch-all goes last. A chunk that no rule matches fails the check
 * instead of passing unmeasured.
 *
 * Lowering a limit is free. Any other change to a rule — a raised limit or
 * Stage 2 target, or a rule that is new, removed, matches differently or moved
 * relative to the others — is only accepted alongside a new changelog entry in
 * the budget file naming that rule. A budget anyone can raise in the same diff
 * that needed it is not a budget; this makes raising one a sentence a reviewer
 * reads rather than a number they skim past.
 *
 * Each rule may carry a `stage2` target that the table reports but does not
 * enforce. #969 and #970 activate Stage 2 by moving their targets into
 * `maxGzipBytes`, and #970 adds the per-card rule (standalone card code at
 * most 25 KB each) once standalone cards are chunks of their own.
 */

import { gzipSync } from 'node:zlib';

export const GZIP_LEVEL = 9;

/** `*` is any run of characters within a file name; everything else is literal. */
export function patternToRegExp(pattern) {
  const escaped = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${escaped.join('[^/]*')}$`);
}

export function ruleFor(fileName, rules) {
  return rules.find((rule) => patternToRegExp(rule.match).test(fileName)) ?? null;
}

export function measureChunk(fileName, bytes) {
  return {
    fileName,
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: GZIP_LEVEL }).length,
  };
}

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/** Refuses a budget file this module would otherwise read as permissive. */
export function assertBudgetShape(budget) {
  const problems = [];
  if (!Array.isArray(budget?.rules) || budget.rules.length === 0) {
    problems.push('`rules` must be a non-empty array');
  }
  const ids = new Set();
  for (const [index, rule] of (budget?.rules ?? []).entries()) {
    const where = `rules[${index}]${rule?.id ? ` (${rule.id})` : ''}`;
    if (typeof rule?.id !== 'string' || rule.id === '')
      problems.push(`${where}: \`id\` is required`);
    else if (ids.has(rule.id)) problems.push(`${where}: duplicate id`);
    else ids.add(rule.id);
    if (typeof rule?.label !== 'string' || rule.label === '')
      problems.push(`${where}: \`label\` is required`);
    if (typeof rule?.match !== 'string' || rule.match === '')
      problems.push(`${where}: \`match\` is required`);
    if (!isPositiveInteger(rule?.maxGzipBytes))
      problems.push(`${where}: \`maxGzipBytes\` must be a positive integer`);
    if (rule?.stage2 !== undefined && !isPositiveInteger(rule.stage2?.maxGzipBytes))
      problems.push(`${where}: \`stage2.maxGzipBytes\` must be a positive integer`);
  }
  if (!Array.isArray(budget?.changelog)) problems.push('`changelog` must be an array');
  for (const [index, entry] of (budget?.changelog ?? []).entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.date ?? ''))
      problems.push(`changelog[${index}]: \`date\` must be YYYY-MM-DD`);
    if (!Array.isArray(entry?.rules) || entry.rules.length === 0)
      problems.push(`changelog[${index}]: \`rules\` must name at least one rule`);
    if (typeof entry?.change !== 'string' || entry.change.trim() === '')
      problems.push(`changelog[${index}]: \`change\` must say what changed and why`);
  }
  if (problems.length > 0) {
    throw new Error(`The bundle budget file is malformed:\n  ${problems.join('\n  ')}`);
  }
}

/**
 * Judges every emitted chunk. Rows come back largest first, so the table leads
 * with what is closest to mattering.
 */
export function evaluateBudget({ rules, chunks }) {
  const rows = chunks
    .map((chunk) => {
      const rule = ruleFor(chunk.fileName, rules);
      return {
        ...chunk,
        rule,
        over: rule === null || chunk.gzipBytes > rule.maxGzipBytes,
        overStage2: rule?.stage2 !== undefined && chunk.gzipBytes > rule.stage2.maxGzipBytes,
      };
    })
    .sort((a, b) => b.gzipBytes - a.gzipBytes || a.fileName.localeCompare(b.fileName));

  const failures = rows
    .filter((row) => row.over)
    .map((row) =>
      row.rule === null
        ? `${row.fileName} matches no budget rule; add one to scripts/bundle-budget.json`
        : `${row.fileName} is ${formatBytes(row.gzipBytes)} gzip, over the ` +
          `${formatBytes(row.rule.maxGzipBytes)} "${row.rule.label}" budget by ` +
          formatBytes(row.gzipBytes - row.rule.maxGzipBytes)
    );
  return { rows, failures };
}

export function formatBytes(bytes) {
  return bytes >= 1000 ? `${(bytes / 1000).toFixed(1)} KB` : `${bytes} B`;
}

/** The per-chunk table, as GitHub-flavoured Markdown for the job summary. */
export function renderTable(rows) {
  const lines = [
    '| chunk | rule | raw | gzip | budget | used | Stage 2 | |',
    '|---|---|--:|--:|--:|--:|--:|---|',
  ];
  for (const row of rows) {
    const budget = row.rule ? formatBytes(row.rule.maxGzipBytes) : '—';
    const used = row.rule ? `${Math.round((row.gzipBytes / row.rule.maxGzipBytes) * 100)}%` : '—';
    const stage2 = row.rule?.stage2
      ? `${formatBytes(row.rule.stage2.maxGzipBytes)}${row.overStage2 ? ' ⚠' : ''}`
      : '—';
    lines.push(
      `| \`${row.fileName}\` | ${row.rule?.label ?? '**none**'} | ${formatBytes(row.rawBytes)} | ` +
        `${formatBytes(row.gzipBytes)} | ${budget} | ${used} | ${stage2} | ${row.over ? '❌' : '✅'} |`
    );
  }
  const raw = rows.reduce((sum, row) => sum + row.rawBytes, 0);
  const gzip = rows.reduce((sum, row) => sum + row.gzipBytes, 0);
  lines.push(`| **total** | | ${formatBytes(raw)} | ${formatBytes(gzip)} | | | | |`);
  return lines.join('\n');
}

const commonOrder = (rules, common) => rules.map((rule) => rule.id).filter((id) => common.has(id));

/**
 * The rule ids whose change against `base` loosens the budget, or could.
 *
 * Only a lowered `maxGzipBytes` or Stage 2 target is free. Moving a rule
 * relative to the rules both files share counts, because matching is
 * first-rule-wins and a catch-all moved up silently rebudgets every chunk
 * below it; inserting a new rule does not move the others.
 */
export function loosenedRules({ base, head }) {
  const baseById = new Map(base.rules.map((rule) => [rule.id, rule]));
  const headById = new Map(head.rules.map((rule) => [rule.id, rule]));
  const common = new Set([...headById.keys()].filter((id) => baseById.has(id)));
  const baseOrder = commonOrder(base.rules, common);
  const headOrder = commonOrder(head.rules, common);

  const loosened = [];
  for (const rule of head.rules) {
    const before = baseById.get(rule.id);
    if (
      before === undefined ||
      before.match !== rule.match ||
      rule.maxGzipBytes > before.maxGzipBytes ||
      (rule.stage2?.maxGzipBytes ?? Infinity) > (before.stage2?.maxGzipBytes ?? Infinity) ||
      baseOrder.indexOf(rule.id) !== headOrder.indexOf(rule.id)
    ) {
      loosened.push(rule.id);
    }
  }
  for (const id of baseById.keys()) {
    if (!headById.has(id)) loosened.push(id);
  }
  return loosened;
}

/**
 * Fails unless every loosened rule is named by a changelog entry that `base`
 * does not already have. An old entry cannot vouch for a new raise.
 */
export function assertChangesAreLogged({ base, head }) {
  const known = new Set(base.changelog.map((entry) => JSON.stringify(entry)));
  const logged = new Set(
    head.changelog
      .filter((entry) => !known.has(JSON.stringify(entry)))
      .flatMap((entry) => entry.rules)
  );
  const unlogged = loosenedRules({ base, head }).filter((id) => !logged.has(id));
  if (unlogged.length > 0) {
    throw new Error(
      `The bundle budget was loosened for ${unlogged.map((id) => `"${id}"`).join(', ')} ` +
        'without a changelog entry. Add one to `changelog` in scripts/bundle-budget.json ' +
        'naming each of those rules and saying why the room is needed.'
    );
  }
}

/** The budget as a branch that has never had one: every rule in `head` is new. */
export const EMPTY_BUDGET = Object.freeze({ rules: [], changelog: [] });
