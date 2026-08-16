#!/usr/bin/env node
/**
 * Inventories colour literals in `src/`, classified by BINDING CONTEXT — where
 * the literal sits, which decides whether a design token can reach it at all.
 * That is the axis the remaining colour work is sliced by (ADR 0035).
 *
 * This replaces the frozen "203 literals across 53 files" figure from #574,
 * which came from an ad-hoc pass nothing could re-run.
 *
 * Usage:
 *   node scripts/audit-design-tokens.mjs                # summary
 *   node scripts/audit-design-tokens.mjs --bucket=js    # list one bucket's sites
 *   node scripts/audit-design-tokens.mjs --fallbacks    # list contradicting fallbacks
 *   node scripts/audit-design-tokens.mjs --check        # fail if worse than the baseline
 *
 * `--check` is ADVISORY until the migration issues are cleared: it fails only on
 * a REGRESSION against `scripts/design-token-baseline.json`, never on the
 * existing backlog. Regenerate the baseline with --write-baseline after a
 * migration lands, so the number only ever ratchets down.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');
const BASELINE = path.join(root, 'scripts/design-token-baseline.json');

/** Files that legitimately hold literals: the token source and its generated output. */
const EXEMPT_FILES = [
  'src/styles/tokens.ts',
  'src/styles/variables.generated.ts',
  'src/styles/variables.ts',
  // Console branding and shader source are not rendered as card CSS.
  'src/index.ts',
  'src/utils/three/renderers/vpd-cloud-renderer.ts',
];

const HEX = /#[0-9A-Fa-f]{3,8}\b/g;
/** `var(--token, #hex)` — the fallback form, which is correct, not drift. */
const FALLBACK = /var\(\s*--[A-Za-z0-9-]+\s*,\s*#[0-9A-Fa-f]{3,8}\s*\)/g;

const BUCKETS = {
  css: 'CSS declarations in `css` templates',
  inline: 'Inline `style=` attributes',
  gradient: 'Gradient stops',
  js: 'JS data strings (viewmodels, constants, models) — `var()` is inert here',
};

/**
 * The Home Assistant names the card reads through `var(--name, <fallback>)`, and
 * what the fallback is allowed to be. A fallback that renders a DIFFERENT colour
 * than the token it backs is a live defect on any theme that omits the name
 * (ADR 0041) — distinct from a fallback that is merely imprecise about the alpha.
 *
 * `exact` names must match one literal. `family` names take any
 * `rgba(255, 255, 255, x)`: normalising those alphas is ADR 0035 §6 work, not this.
 */
const FALLBACK_CONTRACT = {
  '--primary-color': { exact: ['#4caf50'] },
  '--error-color': { exact: ['#f44336'] },
  '--divider-color': { family: /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/i },
  '--secondary-text-color': { family: /^rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/i },
};
/** Extracts `var(--name, <fallback>)` pairs, balancing the parens of `rgba(...)`. */
function* varFallbacks(line) {
  const opener = /var\(\s*(--[A-Za-z0-9-]+)\s*,\s*/g;
  let match;
  while ((match = opener.exec(line))) {
    let depth = 1;
    let i = opener.lastIndex;
    for (; i < line.length && depth > 0; i++) {
      if (line[i] === '(') depth++;
      else if (line[i] === ')') depth--;
    }
    if (depth !== 0) continue;
    yield { name: match[1], fallback: line.slice(opener.lastIndex, i - 1).trim() };
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith('.ts')) yield full;
  }
}

/**
 * Classifies by what encloses the literal, checked most-specific first:
 * an unclosed `gradient(`, an unclosed `style="` attribute, an opening quote
 * immediately before the hex (a JS string whose whole value is the colour),
 * otherwise a bare CSS declaration.
 */
function classify(before) {
  if (/gradient\([^)]*$/.test(before)) return 'gradient';
  if (/style\s*=\s*(["'])(?:(?!\1).)*$/.test(before)) return 'inline';
  let singleOpen = false;
  let doubleOpen = false;
  let escaped = false;
  for (const char of before) {
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === "'") {
      singleOpen = !singleOpen;
    } else if (char === '"') {
      doubleOpen = !doubleOpen;
    }
  }
  if (singleOpen || doubleOpen) return 'js';
  return 'css';
}

async function collect() {
  const findings = [];
  const conflicts = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(root, file);
    if (EXEMPT_FILES.includes(rel) || /\.(test|spec)\.ts$/.test(rel)) continue;
    const text = await readFile(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      // Issue references (`#473`) only ever appear in comments, which are already
      // skipped above. An all-digit hex on a code line is a grey — #333, #666 and
      // friends are exactly the group ADR 0035 §6 migrates.
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      for (const { name, fallback } of varFallbacks(line)) {
        const contract = FALLBACK_CONTRACT[name];
        if (!contract) continue;
        const ok = contract.exact
          ? contract.exact.includes(fallback.toLowerCase())
          : contract.family.test(fallback);
        if (!ok) conflicts.push({ file: rel, line: i + 1, name, fallback });
      }
      const bare = line.replace(FALLBACK, (m) => ' '.repeat(m.length));
      for (const match of bare.matchAll(HEX)) {
        findings.push({
          file: rel,
          line: i + 1,
          hex: match[0].toLowerCase(),
          bucket: classify(bare.slice(0, match.index)),
          text: trimmed.slice(0, 100),
        });
      }
    });
  }
  return { findings, conflicts };
}

const { findings, conflicts } = await collect();
const counts = Object.fromEntries(
  Object.keys(BUCKETS).map((b) => [b, findings.filter((f) => f.bucket === b).length])
);
const summary = {
  total: findings.length,
  files: new Set(findings.map((f) => f.file)).size,
  ...counts,
  fallbackConflicts: conflicts.length,
};

if (process.argv.includes('--fallbacks')) {
  for (const c of conflicts) {
    console.log(`${c.file}:${c.line}  var(${c.name}, ${c.fallback})`);
  }
  console.log(`\n${conflicts.length} fallback(s) contradicting the token they back`);
  process.exit(0);
}

const bucketArg = process.argv.find((a) => a.startsWith('--bucket='))?.split('=')[1];
if (bucketArg) {
  for (const f of findings.filter((x) => x.bucket === bucketArg)) {
    console.log(`${f.file}:${f.line}  ${f.hex}  ${f.text}`);
  }
  process.exit(0);
}

if (process.argv.includes('--write-baseline')) {
  await writeFile(BASELINE, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Baseline written: ${JSON.stringify(summary)}`);
  process.exit(0);
}

console.log(`Bare colour literals in src/ — ${summary.total} across ${summary.files} files\n`);
for (const [key, label] of Object.entries(BUCKETS)) {
  console.log(`  ${String(counts[key]).padStart(4)}  ${key.padEnd(9)} ${label}`);
}
console.log(
  `\n  ${String(conflicts.length).padStart(4)}  fallback  \`var(--token, x)\` where x contradicts the token (--fallbacks)`
);

if (process.argv.includes('--check')) {
  const baseline = JSON.parse(await readFile(BASELINE, 'utf8').catch(() => 'null'));
  if (!baseline) {
    console.error('\nNo baseline. Run with --write-baseline first.');
    process.exit(1);
  }
  if (conflicts.length > (baseline.fallbackConflicts ?? 0)) {
    console.error(
      `\nA \`var(--token, x)\` fallback contradicts the token it backs — it renders on any ` +
        `theme that omits the name. See ADR 0041.\n` +
        conflicts.map((c) => `  ${c.file}:${c.line}  var(${c.name}, ${c.fallback})`).join('\n')
    );
    process.exit(1);
  }
  const worse = Object.keys(BUCKETS).filter((b) => counts[b] > baseline[b]);
  if (worse.length) {
    console.error(
      `\nNew bare colour literals were added. Use a token from src/styles/tokens.ts.\n` +
        worse.map((b) => `  ${b}: ${baseline[b]} -> ${counts[b]}`).join('\n')
    );
    process.exit(1);
  }
  const better = Object.keys(BUCKETS).filter((b) => counts[b] < baseline[b]);
  if (better.length) {
    console.log(`\nBelow baseline — run --write-baseline to ratchet: ${better.join(', ')}`);
  }
}
