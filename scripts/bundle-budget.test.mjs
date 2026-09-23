import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  EMPTY_BUDGET,
  assertBudgetShape,
  assertChangesAreLogged,
  evaluateBudget,
  loosenedRules,
  measureChunk,
  patternToRegExp,
  renderTable,
  ruleFor,
} from './bundle-budget.mjs';

const rules = [
  {
    id: 'entry',
    label: 'Entry',
    match: 'growspace-manager-card.js',
    maxGzipBytes: 250_000,
    stage2: { maxGzipBytes: 170_000, by: '#970' },
  },
  { id: 'three', label: 'three.js', match: 'growspace-heatmap-3d-*.js', maxGzipBytes: 165_000 },
  { id: 'lazy', label: 'Any other lazy chunk', match: 'growspace-*.js', maxGzipBytes: 200_000 },
];

const budget = (overrides = {}) => ({
  rules: structuredClone(rules),
  changelog: [{ date: '2026-09-23', rules: ['entry', 'three', 'lazy'], change: 'Stage 1' }],
  ...overrides,
});

const withRule = (id, change, base = budget()) => ({
  ...base,
  rules: base.rules.map((rule) => (rule.id === id ? { ...rule, ...change } : rule)),
});

const logged = (next, ...ids) => ({
  ...next,
  changelog: [...next.changelog, { date: '2026-10-01', rules: ids, change: 'Needed the room.' }],
});

test('the checked-in budget file is well formed', async () => {
  const checkedIn = JSON.parse(await readFile(new URL('./bundle-budget.json', import.meta.url)));
  assert.doesNotThrow(() => assertBudgetShape(checkedIn));
});

test('patterns match whole file names, and only `*` is a wildcard', () => {
  assert.ok(patternToRegExp('growspace-*.js').test('growspace-tc-OQ5cI8cq.js'));
  assert.ok(!patternToRegExp('growspace-*.js').test('growspace-tc-OQ5cI8cq.js.map'));
  assert.ok(!patternToRegExp('growspace-manager-card.js').test('growspace-manager-cardXjs'));
  assert.ok(!patternToRegExp('growspace-*.js').test('dist/growspace-tc.js'));
});

test('a chunk is judged by the first rule it matches', () => {
  assert.equal(ruleFor('growspace-manager-card.js', rules).id, 'entry');
  assert.equal(ruleFor('growspace-heatmap-3d-EXn5cRq8.js', rules).id, 'three');
  assert.equal(ruleFor('growspace-tc-OQ5cI8cq.js', rules).id, 'lazy');
  assert.equal(ruleFor('styles.js', rules), null);
});

test('a chunk is measured raw and at gzip level 9', () => {
  const bytes = Buffer.from('const a = 1;\n'.repeat(1000));
  assert.deepEqual(measureChunk('growspace-x.js', bytes), {
    fileName: 'growspace-x.js',
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
  });
});

test('a chunk within its budget passes, and rows lead with the largest', () => {
  const { rows, failures } = evaluateBudget({
    rules,
    chunks: [
      { fileName: 'growspace-tc-a.js', rawBytes: 66_000, gzipBytes: 14_000 },
      { fileName: 'growspace-manager-card.js', rawBytes: 887_000, gzipBytes: 250_000 },
    ],
  });
  assert.deepEqual(failures, []);
  assert.deepEqual(
    rows.map((row) => row.fileName),
    ['growspace-manager-card.js', 'growspace-tc-a.js']
  );
  assert.equal(rows[0].overStage2, true, 'a Stage 2 target is reported');
  assert.equal(rows[0].over, false, 'but not enforced');
});

test('a chunk over its budget fails and says by how much', () => {
  const { failures } = evaluateBudget({
    rules,
    chunks: [{ fileName: 'growspace-heatmap-3d-a.js', rawBytes: 700_000, gzipBytes: 170_500 }],
  });
  assert.deepEqual(failures, [
    'growspace-heatmap-3d-a.js is 170.5 KB gzip, over the 165.0 KB "three.js" budget by 5.5 KB',
  ]);
});

test('a chunk no rule matches fails instead of passing unmeasured', () => {
  const { rows, failures } = evaluateBudget({
    rules,
    chunks: [{ fileName: 'vendor-a.js', rawBytes: 10, gzipBytes: 10 }],
  });
  assert.equal(rows[0].over, true);
  assert.match(failures[0], /vendor-a\.js matches no budget rule/);
});

test('the table shows raw and gzip per chunk, the budget, the Stage 2 target and a total', () => {
  const { rows } = evaluateBudget({
    rules,
    chunks: [
      { fileName: 'growspace-manager-card.js', rawBytes: 887_201, gzipBytes: 243_072 },
      { fileName: 'growspace-editor-utils-a.js', rawBytes: 621, gzipBytes: 403 },
      { fileName: 'orphan.js', rawBytes: 20, gzipBytes: 30 },
    ],
  });
  const lines = renderTable(rows).split('\n');
  assert.equal(
    lines[2],
    '| `growspace-manager-card.js` | Entry | 887.2 KB | 243.1 KB | 250.0 KB | 97% | 170.0 KB ⚠ | ✅ |'
  );
  assert.equal(
    lines[3],
    '| `growspace-editor-utils-a.js` | Any other lazy chunk | 621 B | 403 B | 200.0 KB | 0% | — | ✅ |'
  );
  assert.equal(lines[4], '| `orphan.js` | **none** | 20 B | 30 B | — | — | — | ❌ |');
  assert.equal(lines.at(-1), '| **total** | | 887.8 KB | 243.5 KB | | | | |');
});

test('a malformed budget file is refused rather than read as permissive', () => {
  assert.throws(() => assertBudgetShape({ rules: [], changelog: [] }), /non-empty array/);
  assert.throws(
    () => assertBudgetShape(withRule('three', { maxGzipBytes: '165000' })),
    /three.*maxGzipBytes/
  );
  assert.throws(
    () => assertBudgetShape(budget({ rules: [...rules, rules[0]] })),
    /entry.*duplicate id/
  );
  assert.throws(
    () => assertBudgetShape(withRule('entry', { stage2: { by: '#970' } })),
    /stage2\.maxGzipBytes/
  );
  assert.throws(
    () => assertBudgetShape(budget({ changelog: [{ date: '2026-10-01', rules: ['entry'] }] })),
    /must say what changed/
  );
});

test('lowering a limit or a Stage 2 target loosens nothing', () => {
  const base = budget();
  let head = withRule('lazy', { maxGzipBytes: 60_000 }, base);
  head = withRule('entry', { stage2: { maxGzipBytes: 150_000, by: '#970' } }, head);
  assert.deepEqual(loosenedRules({ base, head }), []);
  assert.doesNotThrow(() => assertChangesAreLogged({ base, head }));
});

test('every way of making room loosens the rule it touches', () => {
  const base = budget();
  const cases = {
    'a raised limit': [withRule('three', { maxGzipBytes: 170_000 }), ['three']],
    'a raised Stage 2 target': [
      withRule('entry', { stage2: { maxGzipBytes: 180_000, by: '#970' } }),
      ['entry'],
    ],
    'a dropped Stage 2 target': [withRule('entry', { stage2: undefined }), ['entry']],
    'a rematched rule': [withRule('three', { match: 'growspace-heatmap-*.js' }), ['three']],
    'a new rule': [
      budget({
        rules: [
          ...rules.slice(0, 2),
          { id: 'irrigation', label: 'Irrigation', match: 'growspace-irr-*.js', maxGzipBytes: 1 },
          rules[2],
        ],
      }),
      ['irrigation'],
    ],
    'a removed rule': [budget({ rules: [rules[0], rules[2]] }), ['three']],
    'a catch-all moved up': [budget({ rules: [rules[0], rules[2], rules[1]] }), ['lazy', 'three']],
  };
  for (const [name, [head, expected]] of Object.entries(cases)) {
    assert.deepEqual(loosenedRules({ base, head }), expected, name);
  }
});

test('loosening a rule fails without a new changelog entry naming it', () => {
  const base = budget();
  const head = withRule('three', { maxGzipBytes: 170_000 }, base);
  assert.throws(
    () => assertChangesAreLogged({ base, head }),
    /loosened for "three" without a changelog entry/
  );
  assert.throws(
    () => assertChangesAreLogged({ base, head: logged(head, 'entry') }),
    /"three"/,
    'an entry naming another rule does not count'
  );
  assert.doesNotThrow(() => assertChangesAreLogged({ base, head: logged(head, 'three') }));
});

test('an entry the base already had cannot vouch for a new raise', () => {
  const base = logged(budget(), 'three');
  const head = withRule('three', { maxGzipBytes: 170_000 }, base);
  assert.throws(() => assertChangesAreLogged({ base, head }), /"three"/);
});

test('introducing the budget needs an entry naming every rule it starts with', () => {
  assert.doesNotThrow(() => assertChangesAreLogged({ base: EMPTY_BUDGET, head: budget() }));
  assert.throws(
    () =>
      assertChangesAreLogged({
        base: EMPTY_BUDGET,
        head: budget({ changelog: [{ date: '2026-09-23', rules: ['entry'], change: 'x' }] }),
      }),
    /"three", "lazy"/
  );
});
