# ADR 0002 — Automated versioning with semantic-release

**Status:** Accepted  
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

## Alternatives considered

**`release-please`** — creates a release PR that a human must merge to cut the release. Rejected because we wanted zero manual steps and `semantic-release`'s prerelease channel support (`next` on `dev`) is more mature.

**Manual bumping** — status quo. Rejected because versions were inconsistently tagged and the changelog was never written.

## Consequences

- Conventional commit discipline (`feat:`, `fix:`, `chore:`, etc.) is now load-bearing. A non-conventional commit on `main` or `dev` will not block the pipeline but will be invisible to the changelog and version bump logic.
- `package.json` version on `dev` will carry `-next.N` suffixes between stable releases.
- The old `release.yml` trigger (`on: release: published`) is gone. GitHub Releases are now created by the pipeline, not by hand.
