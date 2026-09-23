# ADR 0059 — Prereleases are pruned so a stable stays in the HACS release window

**Status:** Accepted

## Context

A new user who adds the card to HACS with default settings could not install it
at all (#975).

HACS 2.x reads a repository's releases once, as a single `GET /releases` page
at GitHub's default size of 30, and takes the first stable release on that page
as the version to install. `show_beta` is off by default, so prereleases are
filtered away. When all 30 are prereleases there is nothing left: HACS falls
back to the default branch, finds no `growspace-manager-card.js` in a tree
whose `dist/` is not tracked, and refuses the repository without logging
anything. When #975 was filed, the last stable, `v1.3.1`, was release 89 in
that listing.

`dev` publishes a prerelease on every releasable merge, several a day. The last
stable therefore leaves the window within about a week of every promotion,
whatever the promotion cadence is.

A prune already existed. `cleanup.yml` kept the newest 10 prereleases, but it
was triggered by the `release: published` event. semantic-release publishes
with `GITHUB_TOKEN`, and GitHub starts no workflow for events raised by that
token, so the prune stopped running, silently, on 2026-06-29.

## Options

1. **Promote `dev` to `main` often enough.** Promotion is a product decision
   gated by the full main-only validation (ADR 0025). Making it a scheduling
   obligation would still leave the card uninstallable whenever a week passes
   without one.
2. **Prune superseded prereleases.** This is automatic, and it bounds the
   position of the stable whatever the cadence.
3. **Commit a built entry on `main`** so the fallback HACS reads finds one. This
   reverses "don't commit build output", and it would install whatever `main`
   happens to hold rather than a release. It is listed for completeness only.

## Decision

Option 2, running after every publish on both channels.

`release.yml` calls `release-window.yml` from a job that `needs` both publishing
jobs and runs only when one of them produced a tag, which is the same shape as
the HACS update check (ADR 0053). Nothing needs it in turn. The prune cannot
delay or block a publish, and it no longer depends on an event that never
fires. A structural test refuses any workflow that triggers on `release`
events.

`scripts/release-window.mjs` walks the releases in the order GitHub lists them,
which is the order HACS reads them in. It keeps the newest **20** prereleases,
every stable release and every draft, and deletes the rest. It then checks that
the newest stable lands inside the 30 HACS reads, and fails the job naming the
tag and its position if it does not. Drafts count toward that position, because
a token with push access lists them.

Twenty rather than the 29 that would fit leaves room for a prune to fail
through several publishes in a row before the stable leaves the window.

Only the GitHub **release** is deleted, never the tag. Deleting the tag would
change what semantic-release reads when it computes the next version. It would
also take away the commit that carries that version's committed bundle. With
the tag kept, every old prerelease can still be checked out and reproduced; it
is only no longer offered in HACS's version picker. The retired `cleanup.yml`
deleted tags as well, and this does not.

A manual `workflow_dispatch` of `Release Window` defaults to a dry run. The same
dry run is available locally:

```bash
GITHUB_TOKEN=$(gh auth token) node scripts/run-release-window.mjs --dry-run
```

## Consequences

- A new user with `show_beta` off is always offered the newest stable.
- A `show_beta` user is offered at most the 20 newest prereleases.
- The notes of a pruned prerelease are gone from GitHub. The stable release
  that follows them carries the same commits in its own notes.
- The post-publish HACS update check (ADR 0053) is unaffected. Its prerelease
  predecessor is the release just before the new one, which is always kept, and
  its stable predecessor is a stable, which is never pruned.
- The first run after this lands deletes the backlog: 201 releases when the
  change was written, leaving `v1.3.1` as release 21.
