#!/usr/bin/env node
/**
 * Generates the two artifacts derived from `src/styles/tokens.ts`:
 *
 *   1. `src/styles/variables.generated.ts` — the lit `css` custom-property block
 *      and a typed `token` map for call sites that are not CSS.
 *   2. the YAML frontmatter block in `DESIGN.md` — the documented palette.
 *
 * Generation runs one way, TypeScript -> CSS and TypeScript -> YAML, so the doc
 * cannot drift from the runtime. See ADR 0035.
 *
 * Usage:
 *   node scripts/generate-design-tokens.mjs           # write
 *   node scripts/generate-design-tokens.mjs --check   # exit 1 if anything would change
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join(root, 'src/styles/tokens.ts');
const VARIABLES = path.join(root, 'src/styles/variables.generated.ts');
const DESIGN = path.join(root, 'DESIGN.md');

const BANNER = `// AUTO-GENERATED — DO NOT EDIT.
// Source: src/styles/tokens.ts.  Regenerate: npm run tokens:generate
// CI fails if this file differs from what the generator produces.`;

/** Loads tokens.ts without a build step: transpile in memory, import as a data URL. */
async function loadTokens() {
  const source = await readFile(TOKENS, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return (await import(url)).groups;
}

/**
 * A backtick or `${` in a note would terminate the lit `css` template and emit a
 * syntactically broken file, so both are escaped on the way in.
 */
const escapeTemplate = (text) =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const indentComment = (text, pad) => {
  const words = escapeTemplate(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > 92 - pad.length) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length === 1
    ? [`${pad}/* ${lines[0]} */`]
    : [`${pad}/* ${lines[0]}`, ...lines.slice(1).map((l) => `${pad}   ${l}`), `${pad}*/`];
};

function renderVariables(groups) {
  const out = [
    BANNER,
    '',
    "import { css, CSSResult } from 'lit';",
    '',
    'export const variables: CSSResult = css`',
    '  :host {',
  ];
  let first = true;
  for (const group of groups) {
    const cssTokens = group.tokens.filter((t) => t.css);
    if (!cssTokens.length) continue;
    if (!first) out.push('');
    first = false;
    out.push(`    /* ${escapeTemplate(group.title)} */`);
    if (group.note) out.push(...indentComment(group.note, '    '));
    for (const t of cssTokens) {
      if (t.note) out.push(...indentComment(t.note, '    '));
      out.push(`    ${t.css}: ${escapeTemplate(t.value)};`);
    }
  }
  out.push('  }', '`;', '');

  out.push(
    '/**',
    ' * Every CSS custom property as a plain value, for the call sites where `var()`',
    ' * is inert — viewmodels, constants files and models. Importing from here is how',
    ' * the JS layer participates in the token system at all (ADR 0035, decision 4).',
    ' */',
    'export const token = {'
  );
  for (const group of groups) {
    for (const t of group.tokens.filter((x) => x.css)) {
      out.push(`  '${t.css}': '${t.value.replace(/'/g, "\\'")}',`);
    }
  }
  out.push('} as const;', '', 'export type TokenName = keyof typeof token;', '');
  return out.join('\n');
}

/** Order the frontmatter sections are emitted in, whatever order the groups declare them. */
const SECTION_ORDER = ['colors', 'typography', 'rounded', 'elevation', 'spacing'];

/**
 * Quote only where bare YAML would change the value's type or meaning: numbers
 * that must stay strings, `#` (a YAML comment), and anything with a comma or
 * colon. `4px`, `0.25rem`, `-0.01em` and `none` stay bare.
 */
const quote = (value) =>
  /^-?\d+(\.\d+)?$/.test(value) || /^[#&*!|>%@`'"]/.test(value) || /[,:]/.test(value)
    ? `'${value}'`
    : value;

function renderFrontmatter(groups) {
  /** section -> ordered [key, value, note][] */
  const sections = new Map();
  for (const group of groups) {
    for (const t of group.tokens) {
      if (!t.doc) continue;
      const [section, ...rest] = t.doc.split('.');
      const key = rest.join('.');
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section).push([key, t.docValue ?? t.value, t.note, group.title, group.note]);
    }
  }

  const unknown = [...sections.keys()].filter((s) => !SECTION_ORDER.includes(s));
  if (unknown.length) {
    throw new Error(
      `Unknown frontmatter section(s): ${unknown.join(', ')}. Add them to SECTION_ORDER.`
    );
  }

  const lines = ['---', 'name: Growspace Manager Card'];
  for (const section of SECTION_ORDER) {
    const entries = sections.get(section);
    if (!entries) continue;
    lines.push(`${section}:`);
    let lastGroup = null;
    for (const [key, value, note, groupTitle, groupNote] of entries) {
      if (groupTitle !== lastGroup) {
        lastGroup = groupTitle;
        const heading = groupNote ? `${groupTitle} — ${groupNote}` : groupTitle;
        for (const l of wrapYamlComment(heading)) lines.push(`  ${l}`);
      }
      if (note) for (const l of wrapYamlComment(note)) lines.push(`  ${l}`);
      if (typeof value === 'object') {
        lines.push(`  ${key}:`);
        for (const [k, v] of Object.entries(value)) lines.push(`    ${k}: ${quote(v)}`);
      } else {
        lines.push(`  ${key}: ${quote(value)}`);
      }
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function wrapYamlComment(text) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > 86) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.map((l) => `# ${l}`);
}

function assertNoDuplicates(groups) {
  const seen = new Map();
  for (const group of groups) {
    for (const t of group.tokens) {
      for (const [kind, key] of [
        ['css', t.css],
        ['doc', t.doc],
      ]) {
        if (!key) continue;
        const id = `${kind}:${key}`;
        if (seen.has(id)) {
          throw new Error(
            `Duplicate ${kind} key "${key}" in groups "${seen.get(id)}" and "${group.title}"`
          );
        }
        seen.set(id, group.title);
      }
      if (t.css && t.value === undefined) {
        throw new Error(`Token "${t.css}" declares a CSS name but no value`);
      }
      if (!t.css && !t.doc) {
        throw new Error('Token declares neither a CSS name nor a doc path');
      }
    }
  }
}

const groups = await loadTokens();
assertNoDuplicates(groups);

/**
 * Formatted so `npm run format` is a no-op on the output — otherwise prettier would
 * rewrite the generated file and make `--check` permanently red. Run as a subprocess:
 * prettier bundles its own TypeScript, which crashes when the `typescript` package is
 * already loaded in the same process for `loadTokens`.
 */
function format(source, filepath) {
  return execFileSync(
    process.execPath,
    [path.join(root, 'node_modules/prettier/bin/prettier.cjs'), '--stdin-filepath', filepath],
    { input: source, encoding: 'utf8', cwd: root }
  );
}

const variables = format(renderVariables(groups), VARIABLES);
const design = await readFile(DESIGN, 'utf8');
const body = design.replace(/^---\n[\s\S]*?\n---\n/, '');
const nextDesign = `${renderFrontmatter(groups)}\n${body}`;

const check = process.argv.includes('--check');
const changed = [];
for (const [file, next] of [
  [VARIABLES, variables],
  [DESIGN, nextDesign],
]) {
  const current = await readFile(file, 'utf8').catch(() => null);
  if (current === next) continue;
  changed.push(path.relative(root, file));
  if (!check) await writeFile(file, next);
}

if (check && changed.length) {
  console.error(
    `Design tokens are stale. Run \`npm run tokens:generate\` and commit:\n  ${changed.join('\n  ')}`
  );
  process.exit(1);
}
console.log(
  check
    ? 'Design tokens are up to date.'
    : changed.length
      ? `Wrote ${changed.join(', ')}`
      : 'No changes.'
);
