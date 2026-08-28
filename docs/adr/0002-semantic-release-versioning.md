# ADR 0002 — Automated versioning with semantic-release

**Status:** Accepted (amended 2026-08-28)

**Date:** 2026-05-26

## Context

The card had no automated versioning. `package.json` was bumped by hand and GitHub releases were created manually. The release workflow only built the artifact on a human-published release — it did not compute the next version, write a changelog, or gate on commit content.

We wanted:

- `main` → stable semver releases (`1.x.y`)
- `dev` → prerelease builds users can opt into (`1.x.y-next.N`)
- `CHANGELOG.md` and `package.json` committed back automatically
- No manual steps after merging a PR

## Decision

Use **`semantic-release`** with two channels configured in `release.config.js`:

```js
branches: ['main', { name: 'dev', prerelease: 'next' }]
```

Every push to `main` or `dev` triggers the release pipeline via
`.github/workflows/release.yml`. The tool reads conventional commits since the
last tag and computes the next semver. Stable releases bump `package.json` and
write `CHANGELOG.md`; prereleases leave both files unchanged. Both channels
create a GitHub Release and attach every `dist/*.js` bundle required by HACS.

The semantic-release commit also force-adds every `dist/*.js` bundle, even
though bundles are ignored during normal development. HACS can therefore
install from either the GitHub Release or the tagged repository tree. After
semantic-release creates the tag, the Publishing Interface removes those
bundles from branch tracking in a follow-up commit. Release tags remain
self-contained without making ordinary source builds dirty the worktree.

## Alternatives considered

**`release-please`** — creates a release PR that a human must merge to cut the release. Rejected because we wanted zero manual steps and `semantic-release`'s prerelease channel support (`next` on `dev`) is more mature.

**Manual bumping** — status quo. Rejected because versions were inconsistently tagged and the changelog was never written.

## Consequences

- Conventional commit discipline (`feat:`, `fix:`, `chore:`, etc.) is now load-bearing. A non-conventional commit on `main` or `dev` will not block the pipeline but will be invisible to the changelog and version bump logic.
- `package.json` on `dev` is no longer updated by a release (see the 2026-08-24 amendment); it carries whatever the last stable release wrote. semantic-release computes versions from tags, not from this field.
- The old `release.yml` trigger (`on: release: published`) is gone. GitHub Releases are now created by the pipeline, not by hand.
- Each release produces a second cleanup commit that removes the built bundles
  from branch tracking. The release tag points to the preceding commit and
  retains the bundles. The cleanup commit deliberately does not skip CI; its
  resulting invocation proves the transaction is an idempotent `no-release`.

## Amendment, 2026-08-24 — the prerelease channel stops rewriting the changelog

The original decision had both channels commit `package.json` and `CHANGELOG.md`
back to their branch. That made those two files conflict on **every** `dev` →
`main` promotion: each prerelease put a `chore(release): x.y.z-next.N` commit on
`dev` touching exactly the files `main` was rewriting with stable versions, so
the two histories always disagreed there regardless of how recently they had
been reconciled. The v1.1.10 promotion hit it, and #711 hit it before that.

The stable channel still commits both. The prerelease channel now commits
neither, which removes the conflict rather than making it easier to resolve.
Prerelease notes are unaffected — `@semantic-release/github` still publishes
them on the GitHub release; they simply stop accumulating in the in-repo
changelog, which is what `main`'s `CHANGELOG.md` is for.

Both channels still commit `dist/*.js`, so every tag stays independently
installable by HACS, and the follow-up cleanup commit still untracks the bundle.
The net tree change on `dev` is therefore nothing at all.

A static JSON config cannot vary plugin options by branch, so `.releaserc.json`
became `release.config.js`. Anything that is not the prerelease branch — an
undefined `GITHUB_REF_NAME` from a local dry run included — gets the stable
config, so the complete behaviour is the default rather than the special case.

## Amendment, 2026-08-28 — preflight and publishing share one interface

Release preflight and actual publishing now enter the same Publishing Interface.
It owns the locked dependency install, bundle build, HACS layout validation, and
channel-specific artifact-plan validation. Verification prepares once, evaluates
both stable and prerelease plans, reports `verified`, and stops before
semantic-release; publishing traverses that same path for its selected channel
before allowing semantic-release to mutate release history.

GitHub Actions remains an adapter: it owns checkout, credentials, caching, and one
release-only Node 22 source shared by preflight and both publishing jobs. Node 24
remains the default for the rest of CI. This replaces three workflow copies of the
preparation sequence and two independent Node pins, which could drift while still
looking locally correct.

The Publishing Interface is the behavior and test surface. For a publication it
owns this order: locked install, build, HACS artifact verification, channel-plan
verification, semantic-release, cleanup commit, then cleanup push. `verified`,
`published`, and `no-release` are its successful outcomes. Preparation,
artifact-verification, publishing, cleanup-commit, and cleanup-push failures are
reported with their stage and preserve the originating adapter diagnostic.

The responsibilities at its internal seams are deliberate:

- The **GitHub adapter** selects `main` as `stable` and `dev` as `prerelease`,
  provides the checkout, credentials, npm cache, and shared release runtime,
  keeps stable validation in an explicit successful-`needs` graph, and invokes
  the Publishing Interface once. It does not implement publishing behavior.
- The **semantic-release adapter** analyzes commits, computes the version,
  creates the release commit and tag, and creates the GitHub Release. Its Git
  plugin records all `dist/*.js` bundles in both channel tags and additionally
  records `package.json` and `CHANGELOG.md` for stable. Its GitHub plugin uploads
  all `dist/*.js` bundles as release assets.
- The **Git adapter** checks whether bundles remain tracked, untracks them in a
  follow-up commit, and pushes that commit to the selected branch. It returns a
  completed-cleanup result when there is nothing left to commit.

Cleanup runs even when semantic-release reports no new release, because a prior
attempt may have created and tagged the release but failed before cleanup was
pushed. A retry therefore finishes any pending cleanup. The cleanup commit
triggers one more workflow run; semantic-release then reports no release, the
Git adapter finds no tracked bundle, and the interface exits successfully as
`no-release` without another commit. A failure at any stage stops later stages,
so ordinary workflow retry is safe and resumes from repository state rather
than from workflow shell assumptions.
