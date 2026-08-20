/**
 * Conventional-commit rules, read by the `commit-msg` hook.
 *
 * commitlint itself is NOT a devDependency: the hook runs inside an environment
 * prek builds from `.pre-commit-config.yaml`, which is what lets it work in a
 * checkout that has never run `npm ci`. `@commitlint/config-conventional`
 * resolves from that environment, so `npx commitlint` outside the hook will not
 * find it — run `prek run commitlint --hook-stage commit-msg` instead.
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
