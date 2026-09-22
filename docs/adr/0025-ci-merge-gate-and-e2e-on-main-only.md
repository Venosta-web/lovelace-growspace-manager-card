# ADR 0025 — CI Merge Gate + E2E-on-Main-Only

**Status:** Accepted (mirrors the integration's [growspace_manager ADR 0020] merge-gate policy)

## Context

The card's CI was advisory, with two structural gaps:

1. **No branch protection, and CI triggered on the wrong branch.** `test.yml`,
   `lint.yml`, and `e2e-frontend.yaml` fire only on `main`/`master`. Day-to-day work
   happens on `dev` and stacked feature branches, so in the normal workflow card CI
   **never ran**, and nothing blocked a red merge regardless.
2. **Local hooks did almost nothing.** `.pre-commit-config.yaml` ran a single
   `npm run test:unit` hook — no eslint, no prettier, no typecheck, no build.

The real baseline, measured on a clean `npm ci`, was nearly green: lint passes
(0 errors, 97 warnings), build passes, **6484 unit tests pass**, and the only failure
was **one `tsc` error** — a bad `as SensorGroup` cast in
`heatmap-tab.viewmodel.test.ts`. The stale "~240 lint errors" lore predated the
eslint 10 / TypeScript 6 upgrade and no longer held.

The e2e suite is the outlier: it spins up a Dockerized Home Assistant and drives it
with Playwright, taking minutes and carrying real flake risk. Gating every `dev`
merge on it would tax fast iteration with docker-HA flake retries.

## Decision

1. **Branch protection on `dev` and `main`, administrators included (hard gate)** —
   same solo-dev reasoning as the integration: a gate the owner can click past is no
   gate. Required checks block merge for everyone.

2. **Three tiers split by speed.** Commit → eslint + prettier (pre-commit). Push →
   `tsc --noEmit` + vitest (pre-push). PR → full suite + build, as the merge gate.
   Local hooks stay on the **pre-commit framework** (extending the existing config)
   rather than husky/lint-staged, to keep one hook system shared with the integration
   repo.

3. **Required checks are branch-specific.** PRs into `dev` require
   lint + typecheck + unit tests + build — the fast loop. PRs into `main` require all
   of those **plus e2e**. E2e is a *release* gate, not a per-feature gate.

4. **Fix the single `tsc` error first**, then enable typecheck as a required check so
   the gate is green from the start.

5. **CI triggers are widened to include `dev`**, since the gate is meaningless if the
   workflows don't run on the branch the gate protects.

## Consequences

- An e2e regression can land on `dev` and is caught only at the `dev → main` release
  PR. Accepted in exchange for keeping feature iteration off the slow/flaky path.
- Stacked branches that PR into other feature branches are gated only when they reach
  `dev` — the intended bite point.

[growspace_manager ADR 0020]: ../../../growspace_manager/docs/adr/0020-ci-merge-gate-and-ha-core-aligned-test-rules.md

## Amendment (2026-07-07) — enforcement mechanics, hook-tier cut, nightly e2e

A workflow review found the protection in decision 1 was never turned on. Closing
the gap came with three refinements:

1. **Rulesets, not classic branch protection.** `dev` and `main` require a PR with
   green checks (`test`, `lint`), with a bypass list containing **only the GitHub
   Actions app** so semantic-release can keep pushing `chore(release)` commits to
   `dev`. Zero required approvals — a solo author cannot approve their own PR, so a
   review requirement would be bypassed ritually; green checks are the merge
   condition.
2. **The three-tier hook ladder is cut to one tier.** Pre-commit (still on the
   pre-commit framework, per decision 2's one-hook-system rationale) runs fast
   checks only: eslint, prettier, `no-commit-to-branch dev/main`, and a worktree
   guard rejecting commits in the shared main checkout unless
   `ALLOW_MAIN_CHECKOUT=1`. The pre-push `tsc` + vitest tier is dropped — with the
   ruleset enforcing CI, slow pre-push hooks only invite `--no-verify`.
3. **E2E gains a nightly scheduled run against `dev`** (PR-gated e2e stays
   main-only). This bounds the "e2e regression lands on dev and hides until the
   next release" window from weeks to a day without putting docker-HA flake in the
   required-check path. The nightly suite includes a config-dialog full round-trip
   spec (populate → save → reopen → assert; clear → save → reopen → assert), the
   only automated net for the env-draft-seeder class of regression.

## Amendment (2026-08-26) — stable publishing owns its validation gate

The promotion that published 1.1.0 exposed a different gap: validation and Release
were independent workflows triggered by the same `main` push. Release finished first,
so successful publishing did not imply that validation had passed. The promotion PR
also had no recorded checks, making a pre-merge E2E requirement ineffective in that
release path.

Stable validation now runs after the promotion commit lands on `main`, inside the
Release workflow's explicit dependency graph. Its stable semantic-release job needs
lint/build (including the Node 22 release preflight), unit tests, contract-fixture
validation, and the real Home Assistant Playwright suite. A failed or cancelled need
therefore skips publishing. The E2E workflow is callable from that graph and manually
dispatchable, but has no `push` or `pull_request` trigger of its own.

The `dev` prerelease job remains separate and has no validation or E2E dependency.
This supersedes the unenforced nightly/PR mechanics described above: expensive E2E is
main-push-only, plus deliberate manual dispatch. `scripts/ci-release-policy.test.mjs`
locks down these branch and dependency conditions in the fast lint job.

The public demo is stable release output and follows the same dependency graph. Pull
requests into `main` build the assembled demo, exercise it in Chromium, and retain the
site artifact for review without publishing GitHub Pages. After the stable publishing
job succeeds, the Release workflow calls that reusable demo workflow and permits its
deploy job to update Pages. The demo workflow therefore has no independent `main` push
trigger that could race ahead of failed validation or stable publishing; manual dispatch
remains available for deliberate recovery deployments.

## Amendment (2026-08-28) — one E2E Runtime Harness across local and GitHub runs

Stable-main and deliberate manual E2E validation now invoke the same repository-owned
[[E2E Runtime Harness]] used by local managed runs. Managed mode owns the card build,
Home Assistant configuration assembly and disposable-container lifecycle, integration
bootstrap, growspace and dashboard seeding, served-bundle verification, Playwright run,
failure evidence capture, and teardown. Attached mode instead accepts an existing Home
Assistant runtime and owns only served-bundle verification plus the Playwright run; it
never starts or stops that runtime.

The GitHub workflow is an adapter at the forge boundary. It retains the three checkouts,
dependency and browser setup, npm caching, explicit validation and selection of checkout
roots, the single managed-harness invocation, and upload from the stable
`.artifacts/e2e-managed/` location. It does not encode Home Assistant lifecycle ordering
or capture logs itself. This keeps diagnostics ahead of teardown in every environment and
deletes the CI-only copy of runtime assembly and cleanup knowledge.

The trigger and publishing policy is unchanged: E2E remains callable by the stable
release dependency graph and available for deliberate manual dispatch, with no push or
pull-request trigger of its own. The stable publishing job keeps the default successful-
`needs` condition, so a failed or cancelled E2E dependency prevents publishing; the dev
prerelease path has no E2E dependency.

## Amendment (2026-08-28) — workflow policy stops defining publishing behavior

The deep Publishing Interface now owns install, build, artifact-plan validation,
semantic-release ordering, bundle cleanup, successful outcomes, stage failures,
and retry behavior for both channels. The GitHub workflow is only its forge
adapter: `main` maps to the explicit `stable` channel, `dev` maps to
`prerelease`, both consume the shared release-only Node runtime, and each invokes
the interface once. Copied preparation and cleanup shell sequences are not a
supported publishing interface.

Stable validation remains directly auditable in GitHub Actions. The stable job
has explicit `needs` edges to lint/build (including release preflight), unit
tests, Contract Fixture validation, and real Home Assistant E2E. Its only `if`
condition is the `main` branch route, so GitHub's default all-needs-succeeded
behavior skips publishing when any validation job fails or is cancelled. The
prerelease job has no such edges.

The structural CI policy test is intentionally limited to those GitHub adapter
facts: branch routing, stable validation edges, default successful-`needs`
behavior, shared runtime consumption, and one Publishing Interface invocation
per channel. Publishing behavior is tested through mock command,
semantic-release, and Git adapters at the module seam instead of by parsing job
names, copied commands, or cleanup shell text. Artifact ownership and the
failure/retry contract are recorded in ADR 0002.
