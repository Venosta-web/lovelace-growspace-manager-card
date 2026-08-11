# ADR 0002 — Automated versioning with semantic-release

**Status:** Accepted (amended 2026-08-11)

**Date:** 2026-05-26

## Context

The card had no automated versioning. `package.json` was bumped by hand and GitHub releases were created manually. The release workflow only built the artifact on a human-published release — it did not compute the next version, write a changelog, or gate on commit content.

We wanted:

- `main` → stable semver releases (`1.x.y`)
- `dev` → prerelease builds users can opt into (`1.x.y-next.N`)
- `CHANGELOG.md` and `package.json` committed back automatically
- No manual steps after merging a PR

## Decision

Use **`semantic-release`** with two channels configured in `.releaserc.json`:

```json
{ "branches": ["main", { "name": "dev", "prerelease": "next" }] }
```

Every push to `main` or `dev` triggers the release pipeline via `.github/workflows/release.yml`. The tool reads conventional commits since the last tag, computes the next semver, bumps `package.json`, writes `CHANGELOG.md`, commits both back (tagged `[skip ci]` to avoid loops), creates a GitHub Release, and attaches `dist/growspace-manager-card.js` as the HACS-consumable asset.

The release commit also force-adds `dist/growspace-manager-card.js`, even though the bundle is ignored during normal development. HACS can therefore install from either the GitHub release asset or the tagged repository tree. After semantic-release creates the tag, the workflow removes the bundle from branch tracking in a follow-up `[skip ci]` commit. Release tags remain self-contained without making ordinary source builds dirty the worktree.

## Alternatives considered

**`release-please`** — creates a release PR that a human must merge to cut the release. Rejected because we wanted zero manual steps and `semantic-release`'s prerelease channel support (`next` on `dev`) is more mature.

**Manual bumping** — status quo. Rejected because versions were inconsistently tagged and the changelog was never written.

## Consequences

- Conventional commit discipline (`feat:`, `fix:`, `chore:`, etc.) is now load-bearing. A non-conventional commit on `main` or `dev` will not block the pipeline but will be invisible to the changelog and version bump logic.
- `package.json` version on `dev` will carry `-next.N` suffixes between stable releases.
- The old `release.yml` trigger (`on: release: published`) is gone. GitHub Releases are now created by the pipeline, not by hand.
- Each release produces a second cleanup commit that removes the built bundle from branch tracking. The release tag points to the preceding commit and retains the bundle.
