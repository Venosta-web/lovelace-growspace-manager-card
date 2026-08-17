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
  // Console branding is not rendered as card CSS.
  'src/index.ts',
];

/**
 * Literals that are permanently correct as literals, excluded from the count so
 * the migration's zero is reachable. Keyed by file and by the HEXES that carry
 * the accepted role, never by whole file — a blanket file pass would license the
 * next role-carrying literal added beside them (ADR 0040), and line numbers drift
 * on every edit above them. A file listed here is still audited for every other
 * value. Each entry needs a reason; `--exceptions` prints them.
 */
const ACCEPTED_EXCEPTIONS = [
  {
    file: 'src/utils/three/renderers/frame-renderer.ts',
    hexes: ['0x222222', '0x111111', '0x333333', '0xf0f0f0'],
    reason:
      'Grid helper lines and the floor slab of the 3D growspace. Scene furniture: no DOM twin and no semantic role, so there is nothing for a token to keep it in step with. ADR 0040 §9.',
  },
  {
    file: 'src/utils/three/renderers/equipment-renderer.ts',
    hexes: ['0x222222', '0x111111', '0x1a1a1a', '0x050505', '0x000000', '0xeeeeee', '0xaec4c7'],
    reason:
      'Equipment housings — the neutral casings, bezels and fan-blade grey the meshes are made of. Material, not role: the state these units report is carried by their indicators, which are NOT listed here. ADR 0040 §9.',
  },
  {
    file: 'src/utils/three/renderers/plant-renderer.ts',
    hexes: ['0x212121', '0x3d2b1f'],
    reason:
      'Pot plastic and soil. Scene furniture in the same sense as the frame. The foliage colours in this file carry real roles (primary, a stage colour, series 2) and are deliberately left counted — deferred, not exempt. ADR 0040 §9.',
  },
  {
    file: 'src/features/shared/ui/label-preview.ts',
    hexes: ['#000', '#333'],
    reason:
      'Ink and rule on a PRINTED label. The preview mirrors what a label printer puts on white stock, so it does not follow the card theme — a token here would be actively wrong. ADR 0042 §6.',
  },
  {
    file: 'src/features/shared/ui/camera-capture.ts',
    hexes: ['#000'],
    reason:
      'Letterbox behind a <video> element. Black is what the absence of frame is, not a surface colour. ADR 0042 §6.',
  },
  {
    file: 'src/cards/growspace-tank-card.ts',
    hexes: ['#2c3e50', '#4a6fa5', '#34495e', '#3e2723', '#a54a4a', '#4e342e'],
    reason:
      "The tank illustration's shell material — slate plastic and its rust warning variant, across the cap and body gradients. Material, not role: nothing else in the card can use these hues, and the warning state is carried semantically by the liquid. Scene furniture in the sense of ADR 0040. ADR 0042 §3.",
  },
];

const isAccepted = (file, hex) =>
  ACCEPTED_EXCEPTIONS.some((e) => e.file === file && e.hexes.includes(hex));

const HEX = /#[0-9A-Fa-f]{3,8}\b/g;
/** three.js takes a resolved number, so every literal in the scene is `0xRRGGBB`. */
const HEX_NUMERIC = /\b0x[0-9A-Fa-f]{6}\b/g;
/** `var(--token, #hex)` — the fallback form, which is correct, not drift. */
const FALLBACK = /var\(\s*--[A-Za-z0-9-]+\s*,\s*#[0-9A-Fa-f]{3,8}\s*\)/g;

/** Everything under here paints through the GPU, whatever the literal's syntax. */
const GPU_DIR = 'src/utils/three/';

const BUCKETS = {
  css: 'CSS declarations in `css` templates',
  inline: 'Inline `style=` attributes',
  gradient: 'Gradient stops',
  js: 'JS data strings (viewmodels, constants, models) — `var()` is inert here',
  gpu: 'three.js materials and uniforms — `var()` cannot reach a GPU colour at all',
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
  const excluded = [];
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
      const gpu = rel.startsWith(GPU_DIR);
      for (const match of [...bare.matchAll(HEX), ...bare.matchAll(HEX_NUMERIC)]) {
        const hex = match[0].toLowerCase();
        const site = {
          file: rel,
          line: i + 1,
          hex,
          bucket: gpu ? 'gpu' : classify(bare.slice(0, match.index)),
          text: trimmed.slice(0, 100),
        };
        if (isAccepted(rel, hex)) excluded.push(site);
        else findings.push(site);
      }
    });
  }
  return { findings, conflicts, excluded };
}

const { findings, conflicts, excluded } = await collect();
const counts = Object.fromEntries(
  Object.keys(BUCKETS).map((b) => [b, findings.filter((f) => f.bucket === b).length])
);
const summary = {
  total: findings.length,
  files: new Set(findings.map((f) => f.file)).size,
  ...counts,
  fallbackConflicts: conflicts.length,
};

if (process.argv.includes('--exceptions')) {
  for (const e of ACCEPTED_EXCEPTIONS) {
    const sites = excluded.filter((x) => x.file === e.file);
    console.log(`${e.file}  ${e.hexes.join(' ')}  (${sites.length} site(s))`);
    console.log(`  ${e.reason}\n`);
    // A stale entry is worse than none: it hides whatever replaced the literal.
    if (!sites.length) console.log('  WARNING: matches nothing — the literal is gone, drop it.\n');
  }
  console.log(`${excluded.length} literal(s) excluded from the count`);
  process.exit(0);
}

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
console.log(
  `  ${String(excluded.length).padStart(4)}  excluded  accepted exceptions, not part of the zero (--exceptions)`
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
