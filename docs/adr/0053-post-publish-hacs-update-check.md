# ADR 0053 — The HACS update check runs after publishing, and gates nothing

**Status:** Accepted (amends [ADR 0025](0025-ci-merge-gate-and-e2e-on-main-only.md))

## Context

HACS never cleans the directory it downloads a plugin into. A plugin release is
single-file content to it, so an update writes the new release's files
*alongside* every file the previous one left. This card is code-split — a thin
`growspace-manager-card.js` entry plus ~17 lazy `growspace-[name]-[hash].js`
chunks — so an update that rewrites the entry and leaves the previous chunk set
in place gives the browser an entry importing chunks that are not there. A live
install ended up serving the `v1.3.0-next.48` entry on the complete
`v1.3.0-next.10` chunk set, every lazy import 404ing, and the dashboard
rendering nothing.

Nothing in this repository could see it:

- **The build cannot.** `dist/` is correct; the entry and its chunks are written
  together.
- **E2E cannot.** The managed runtime bind-mounts the whole of `dist/`, so every
  chunk resolves regardless of what HACS would have done.
- **A fresh HACS install cannot.** A first download fetches the complete asset
  set of the tag it was asked for and passes. The *update* is the path that
  breaks.
- **A `main`-only gate would not have.** Every broken release in the incident
  was a `dev` prerelease.

The check also cannot exist before publishing: it needs two published releases,
and the second one is the release being made.

## Decision

Reproduce the update after every publish, on both channels, and let it gate
nothing.

`hacs-update-check.yaml` is called by the `Release` workflow from a job that
`needs` the publishing jobs. A job downstream of publishing cannot delay or
block it — by the time the check starts, the release is out. Nothing in the
workflow `needs` the check in turn, and the structural CI policy test asserts
both directions, so the dev prerelease path keeps the property ADR 0025 gave it:
no validation edges, publish immediately.

The publishing jobs report the tag they produced (`steps.publish.outputs.tag`,
written by the Publishing Interface's entry point from
`nextRelease.gitTag`). The check runs only when one of them names a tag. A run
that published nothing names none — including the extra `Release` run every
publish triggers when it pushes its bundle-cleanup commit — so the same pair is
never checked twice.

The reproducer itself is
`growspace_manager_workspace/scripts/card-release-update-check`, over
`scripts/card-hacs-update`. It lives in the workspace hub because it needs the
clean Home Assistant instance and the compose runtime, and because it must
install the **published release assets** the way a user's HACS fetches them
rather than anything this checkout built. The workflow checks the hub out and
runs it; no card source is checked out at all.

The predecessor is resolved per channel, matching what a user's HACS offers: a
stable release is checked against the previous stable, because `show_beta` is
off there and the prereleases in between are invisible to that install; a
prerelease is checked against the previous release of any kind, because
`show_beta` is what puts prereleases in reach and it does not hide stable ones.

## Consequences

A release whose update path is broken turns the `Release` workflow red after it
has shipped, naming the missing chunk and both tags in the run summary. It is
not prevented — that is the trade for not gating the prerelease path, and the
information did not exist earlier.

A publish now costs one extra job of roughly ten to twenty minutes on the
runner, wholly after the release has been made.

Running against HACS 2.0.5, `v1.3.0-next.57 → v1.3.0-next.58` resolves every
module. What it does show is 70 files in `www/community` where 36 belong, which
is the same accumulation from the other side: the day a download comes back
partial, the entry is already sitting on a directory full of the previous
release.
