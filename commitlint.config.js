/**
 * Conventional-commit rules for the commit-msg hook and any local
 * `npx commitlint` run.
 *
 * The type list is kept in sync with `.github/workflows/pr-title.yml`, which
 * applies the same rule to the PR title. semantic-release only cuts a version
 * for `feat`, `fix` and `BREAKING CHANGE`; the remaining types exist so that
 * ordinary non-releasing work is still spellable.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'ci',
        'chore',
        'docs',
        'refactor',
        'test',
        'perf',
        'build',
        'style',
        'revert',
      ],
    ],
    // semantic-release's own release commits carry the full release notes, and
    // merge commits are still an allowed merge method — neither should be
    // rejected for line length.
    'body-max-line-length': [0],
  },
};
