/**
 * semantic-release configuration.
 *
 * This replaces `.releaserc.json` because the two release channels need
 * different `@semantic-release/git` assets, and a static JSON config cannot
 * express that.
 *
 * The stable channel (main) commits `package.json` and `CHANGELOG.md` back to
 * the branch. The prerelease channel (dev) deliberately does not. When both
 * channels wrote those two files, every prerelease put a
 * `chore(release): x.y.z-next.N` commit on dev touching exactly the files main
 * was also rewriting with stable versions — so CHANGELOG.md and package.json
 * conflicted on *every* dev -> main promotion, forever, no matter how recently
 * the branches had been reconciled. v1.1.10 hit it, #711 hit it before that.
 *
 * Prerelease notes are not lost: `@semantic-release/github` still publishes
 * them on the GitHub release. They simply stop accumulating in the in-repo
 * changelog, which is what main's CHANGELOG.md is for.
 *
 * Both channels still commit `dist/*.js`, so every tag — prerelease included —
 * stays independently installable by HACS. The publishing path untracks the
 * bundle again afterwards, so the net tree change on dev is nothing at all.
 */

const STABLE_BRANCH = 'main';
const PRERELEASE_BRANCH = 'dev';

/** Committed to the release tag so HACS can install the entry and its chunks. */
const BUNDLE_ASSETS = ['dist/*.js'];

/** Rewritten by the release itself; only the stable channel records them. */
const VERSIONED_ASSETS = ['package.json', 'CHANGELOG.md'];

/**
 * @param {string | undefined} branch the branch being released. In CI this is
 *   `GITHUB_REF_NAME`. Anything that is not the prerelease branch — including
 *   `undefined`, which is what a local dry run gives — gets the stable config,
 *   so the safe, complete behaviour is the default.
 */
export function createReleaseConfig(branch) {
  const isPrerelease = branch === PRERELEASE_BRANCH;

  return {
    branches: [STABLE_BRANCH, { name: PRERELEASE_BRANCH, prerelease: 'next' }],
    plugins: [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      ...(isPrerelease ? [] : [['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }]]),
      ['@semantic-release/npm', { npmPublish: false }],
      [
        '@semantic-release/git',
        {
          assets: isPrerelease ? BUNDLE_ASSETS : [...VERSIONED_ASSETS, ...BUNDLE_ASSETS],
          message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
        },
      ],
      [
        '@semantic-release/github',
        {
          assets: [{ path: 'dist/*.js' }],
          successComment: false,
          failComment: false,
        },
      ],
    ],
  };
}

export default createReleaseConfig(process.env.GITHUB_REF_NAME);
