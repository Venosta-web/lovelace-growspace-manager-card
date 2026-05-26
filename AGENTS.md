# E2E Testing

Playwright tests in `tests/e2e/` run against a **real Home Assistant instance** — not a
local dev server. Tests call the HA REST API via `callHAService` and assert on entity
states. No page navigation is required for pure-API specs.

## Quick reference

```bash
npm run test:ha          # run e2e specs against HA (fastest loop)
npm run test:ha:headed   # same, with visible browser
npm run test:ha:debug    # same, with Playwright Inspector
npm run test:e2e         # build first, then test:ha (full pipeline)
```

Run `test:ha` directly when iterating on specs — the build step in `test:e2e` is only
needed when `src/` changed since the last build.

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
