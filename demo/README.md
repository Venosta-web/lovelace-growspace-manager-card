# Live demo

The page published at
<https://Venosta-web.github.io/lovelace-growspace-manager-card/demo/>.

It is the **real card bundle** — the same `dist/` that ships to HACS — driven by
a frozen recording of a real Home Assistant growspace. There is no backend and
no network access beyond the page's own files.

## Why a recording rather than hand-written mock data

Every backend read in the card funnels through `hassCall()` in
[`src/services/hass-call.ts`](../src/services/hass-call.ts), which validates each
response against a zod schema in `src/schemas/api-schema.ts`. Hand-written mock
payloads drift out of that contract almost immediately and fail validation.
Recording the real responses means the demo is exercising the same shapes the
integration actually emits, and a schema change shows up as a demo that needs
re-recording rather than a demo that quietly lies.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: builds a mock `hass`, mounts the card. |
| `ha-shims.js` | Minimal stand-ins for `ha-dialog`, `ha-svg-icon`, … — Home Assistant normally provides these, and without them every dialog opens into nothing. |
| `demo-data.json` | The recording: entity states, 24h of history, and one response per read-only WebSocket command. |
| `stages/*.webp` | Downscaled copies of the integration's default per-stage plant artwork. |

## How the mock works

- **Growspace data** is read by the card from the overview sensor's
  *attributes*, not from a WebSocket fetch — so `hass.states` carries most of it.
- **`hass.callWS`** dispatches on message `type` and returns the recorded
  response. Unrecorded commands (writes such as watering or moving a plant)
  resolve to `{}`, so the card's optimistic update completes and the UI responds;
  nothing persists across a reload.
- **Timestamps are re-based on load.** Every ISO-8601 instant in the snapshot is
  shifted by `now - capturedAt`, so "46 days in flower" and the 24-hour graph
  window stay true however long the page goes without redeployment.
- **Stage artwork** is requested by the card at the root-absolute path
  `/growspace_manager/static/stages/<stage>.png`, which resolves off-site on a
  project Pages URL. `index.html` rewrites those to the local WebP copies as the
  `src` attribute is set.

## Re-recording the data

Needed when the backend payload shape changes, or to refresh the demo garden.
Against a Home Assistant instance that has the demo growspace set up:

```bash
GROWSPACE_ID=<growspace id> node scripts/capture-demo-data.mjs
```

`HA_BASE_URL` and `HA_ACCESS_TOKEN` are read from `tests/e2e/.env.test` when it
exists, or can be passed as environment variables. The script scrubs the local
user id, HA context blocks, and the e2e fixture naming used by the shared dev
instance.

## Running it locally

The published layout matches the repository layout, so a static server at the
repo root serves the demo exactly as it deploys:

```bash
npm run build
python3 -m http.server 8777    # then open http://localhost:8777/demo/
```

## Deployment

[`.github/workflows/demo.yaml`](../.github/workflows/demo.yaml) builds the card,
assembles `_site/`, and publishes it on every push to `main`.

The site is assembled into a separate directory on purpose. Publishing the
repository root copies `.gitignore` into the gh-pages worktree, where
`/dist/*.js` is ignored — the bundle ships as a release asset, not in the tree —
so the built card was silently dropped from every deploy and the demo 404'd on
its own bundle. The workflow now asserts the entry point and its lazy chunks are
present before publishing.
