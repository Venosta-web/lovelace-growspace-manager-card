export const BROWSER_TEST_INCLUDE = [
  'tests/unit/**/*.{test,spec}.ts',
  'tests/cards/**/*.{test,spec}.ts',
  'tests/components/**/*.{test,spec}.ts',
  'tests/fixtures/**/*.{test,spec}.ts',
  'src/**/*.{test,spec}.ts',
];

const focusedBatches = [
  { id: 'source', label: 'co-located source tests', roots: ['src'] },
  { id: 'features', label: 'legacy feature tests', roots: ['tests/unit/features'] },
  { id: 'dialogs', label: 'legacy dialog tests', roots: ['tests/unit/dialogs'] },
  { id: 'components', label: 'legacy component tests', roots: ['tests/unit/components'] },
];

const includeForRoots = (roots) => roots.map((root) => `${root}/**/*.{test,spec}.ts`);

const focusedPatterns = focusedBatches.flatMap(({ roots }) => includeForRoots(roots));

export const BROWSER_TEST_BATCHES = [
  ...focusedBatches.map(({ id, label, roots }) => ({
    id,
    label,
    include: includeForRoots(roots),
    exclude: [],
  })),
  {
    id: 'core',
    label: 'card, fixture, and remaining core tests',
    include: BROWSER_TEST_INCLUDE,
    exclude: focusedPatterns,
  },
];

export const browserTestBatch = (id) => BROWSER_TEST_BATCHES.find((batch) => batch.id === id);
