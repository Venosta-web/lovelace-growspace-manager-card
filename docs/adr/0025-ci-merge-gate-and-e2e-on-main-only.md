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
