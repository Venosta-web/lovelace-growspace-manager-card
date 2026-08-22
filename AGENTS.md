# Unit / Component Test Placement

New tests go in one of two places depending on whether they touch the DOM:

- **Pure module tests** (no `fixture()`, no Lit rendering) — co-locate next to the source
  file: `src/foo/foo.test.ts`
- **Component tests** (mount Lit elements via `fixture()`) — `tests/` in the matching
  subfolder (`tests/components/`, `tests/dialogs/`, `tests/cards/`, etc.)

`tests/unit/` holds legacy tests that predate this convention — don't add new tests there.

The vitest config already picks up both patterns (`src/**/*.{test,spec}.ts` and
`tests/{unit,cards,components}/**/*.{test,spec}.ts`).

---

# E2E Testing

Playwright tests in `tests/e2e/` run against a **real Home Assistant instance** — not a
local dev server. Tests call the HA REST API via `callHAService` and assert on entity
states. No page navigation is required for pure-API specs.

## Quick reference

```bash
npm run test:ha          # verify the served bundle, then run e2e specs
npm run test:ha:headed   # same, with visible browser
npm run test:ha:debug    # same, with Playwright Inspector
npm run test:e2e         # build, remount/restart HA, verify, then run e2e
```

Run `test:ha` directly when iterating on specs. Every e2e entry point compares a hash of
the runtime source and build configuration with `dist/`, then compares the exact local
build ID with the bundle served by HA. A stale/missing bundle or a Docker bind mount that
still points at a replaced `dist/` fails before Playwright starts. Use `test:e2e` after
source changes; it rebuilds and recreates the HA dev container with this checkout's
`dist/` mounted. The Playwright config also enforces the preflight for commands run
directly from `tests/e2e/`.

## First-time setup

Before the first Playwright run you must populate `.env.test` with growspace IDs and
configure the HA access token:

```bash
cd tests/e2e
cp .env.test.example .env.test   # fill in HA_ACCESS_TOKEN and HA_BASE_URL
```

Then run the setup script to create growspaces, link sensors, and write IDs back to
`.env.test`:

```bash
cd /path/to/repo
HA_ACCESS_TOKEN=<token> HA_BASE_URL=http://localhost:8123 \
  npx ts-node tests/e2e/fixtures/e2e-setup.ts
```

Finally set `TEST_*_DASHBOARD_PATH` in `.env.test` to match your HA dashboard URLs.

## When to re-run the setup script

Re-run `e2e-setup.ts` whenever it is modified — which happens when:

- a new growspace slug is added
- a new entity ID or sensor is introduced
- the VWC strategy parameters change

The script is idempotent: existing growspaces and plants are skipped; `.env.test` IDs are
updated in place.

## Config

| Setting | Value |
|---|---|
| Specs dir | `tests/e2e/specs/` |
| Fixtures | `tests/e2e/fixtures/ha-setup.ts` |
| Page objects | `tests/e2e/pages/` |
| Config file | `tests/e2e/playwright.config.ts` |
| Workers | 1 (sequential — tests share HA state) |
| Retries | 2 |
| Default timeout | 15 s (slow coordinator tests override with `test.setTimeout(300_000)`) |
| Env file | `tests/e2e/.env.test` (gitignored) |

## Writing specs

- Use `haTest` from `fixtures/ha-setup.ts` (extends Playwright `test` with `testContext`).
- Call `callHAService(page, domain, service, data)` for all HA interactions.
- Mirror the style of `tests/e2e/specs/vwc-strategy.spec.ts` for pure-API specs.
- Tests run sequentially and share HA state — always reset entity state in `beforeEach`.

---

# Session Isolation & Merge Gates

## Work in a worktree

This checkout is shared by concurrent agent sessions; editing it directly has wiped
in-flight work before. For anything beyond a trivial single-turn change:

```bash
git fetch origin
git worktree add .worktrees/<branch-name> -b <branch-name> origin/dev
cd .worktrees/<branch-name>
npm ci   # node_modules is not shared across worktrees — see CLAUDE.md
```

- The pre-commit worktree guard rejects commits made in the main checkout; override
  deliberately with `ALLOW_MAIN_CHECKOUT=1` for quick fixes only.
- If the working tree looks wrong or edits seem to have vanished, trust `origin`,
  not the checkout — another session may have moved HEAD.
- Base on **fresh `dev`** (every merge auto-releases, so a day-old `dev` is stale),
  unless the feature is explicitly stacked on another unmerged branch.

## Merge gates & landing order

`dev` and `main` are ruleset-protected: PR + green checks, zero required approvals,
bypass only for the GitHub Actions app (semantic-release). Cross-repo features land
**GSM-first** — the integration releases before the card PR merges — unless the
change is a Backward-Safe Card Change (release-ref contract fixture parse passes;
see `docs/adr/0029` and CONTEXT.md).

Before opening or updating a PR, inspect `.github/workflows/pr-title.yml` and format the
title as a Conventional Commit (`type(optional-scope): description`) using an allowed type.
