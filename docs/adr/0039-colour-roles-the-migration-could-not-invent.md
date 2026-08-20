# ADR 0039 — The Colour Roles the Migration Could Not Invent

- Status: accepted
- Date: 2026-08-16
- Issue: #630 (decision), surfaced by the #576 sweep
- Related: ADR 0035 (binding-context sorting, §5a "not every colour role belongs to a group"), ADR 0036 (portal token scope), #581 (canvas), #608 (contradicting fallbacks), #632/#633/#634 (the migrations that apply this)

## Context

The #576 sweep tried to migrate 163 bare colour literals and could migrate four. The
blocker was not judgment about hue — ADR 0035 already settled that — but that several
call sites want a role the design system does not express at runtime. ADR 0035 §5a
anticipated exactly this and told the migration issues to allow "this needs a new role"
as an outcome. This ADR is the first exercise of that clause.

Five roles, each blocking a concrete set of sites.

### The finding that reframes the grey question

ADR 0035 §6 says bare greys migrate to the text roles, and argues the win is
light-theme correctness: `--text-primary` and friends are
`var(--ha-token, <fallback>)`, so they follow the user's theme where a literal grey
cannot.

That is true, and it is only half a rule. **A theme-following foreground is correct only
over a theme-following background.** Verified in the chromium harness rather than
assumed: with `--primary-text-color: #212121` on the host, `var(--text-primary)`
resolves to `rgb(33, 33, 33)`.

The card paints a great deal of ground dark _regardless_ of theme — around thirty files
carry `rgba(0, 0, 0, x)` scrims, glass overlays and saturated status fills, and
`heatmap-3d` renders onto a WebGL canvas. Over those grounds a theme-deferring text role
inverts into near-black on near-black.

This is not hypothetical. Three sites already shipped it:

| Site                    | Ground                  | Foreground                                     |
| ----------------------- | ----------------------- | ---------------------------------------------- |
| `camera-capture.ts:177` | the camera view, `#000` | `.shutter { background: var(--text-primary) }` |
| `camera-capture.ts:144` | `rgba(0, 0, 0, 0.5)`    | `color: var(--text-primary)`                   |
| `ui.styles.ts:314`      | `#323232` toast pill    | `color: var(--text-primary)`                   |

And the toast's success and error variants put `var(--text-primary)` on a saturated
green or red _fill_, which is not a text-hierarchy question at all — it is the
`on-primary` / `on-error` role, documented as `#ffffff` and never implemented.

## Decision

### 1. Text on a fixed dark ground gets its own tier set

`--on-overlay-primary` (`#ffffff`), `--on-overlay-secondary`
(`rgba(255,255,255,0.7)`), `--on-overlay-muted` (`rgba(255,255,255,0.55)`).

Same hierarchy as the text roles, same documented alphas, **minus the Home Assistant
deferral** — the omission is the point, not an oversight. The rule at a call site is:

> Look at what the text sits on. If the background is a literal in the same stylesheet,
> the foreground must be a literal-valued token too. If the background follows the
> theme, the foreground must follow it as well.

The `on-*` fills that were documented but never implemented are implemented with them:
`--on-primary`, `--on-secondary`, `--on-tertiary`, `--on-error`. Same reasoning — a
saturated fill does not follow the theme, so its foreground must not either.

**But they are not applied to the toast fills, and that is deliberate.** Measuring
before substituting turned up a second defect underneath the first:

| Fill                | `#ffffff`  | `#1e1e1e` |
| ------------------- | ---------- | --------- |
| `primary` `#4caf50` | **2.78:1** | 6.00:1    |
| `error` `#f44336`   | **3.68:1** | 4.53:1    |

The documented `on-primary`/`on-error` value fails AA on the fills it is the foreground
_for_. Today's `var(--text-primary)` on those two variants resolves to white under the
default dark theme (failing) and `#212121` under a light one (passing) — so the shipped
behaviour is accidentally correct in exactly one theme, and pinning `#ffffff` would make
it wrong in both. The two sites keep `--text-primary` with a comment saying why, and the
role question is #636. This is the same shape ADR 0035 resolved for
`--on-primary-container-bright`, and the same lesson: substituting a documented `on-*`
value without measuring is how a contrast fix gets "corrected" back.

Rejected: making the overlays themselves theme-driven. That is the _right_ long answer
for a card that wants real light-theme support, but it rewrites roughly thirty files'
visual language, and DESIGN.md is explicit that this is a "Dark Operations Dashboard"
built around a near-black carbon shell. A dark ground here is a design decision, not
drift, and the tokens should be able to say so.

### 2. The 3D view's accent is promoted, and the scene reads the same value

`--accent-3d` (`#448aff`), `--accent-3d-hover` (`#64b5f6`), `--accent-3d-idle`
(`#607d8b`).

The literal was never only CSS: `interaction-manager.ts:166` and
`equipment-renderer.ts:854` pass `0x448aff` to `THREE.MeshBasicMaterial` and
`THREE.PointsMaterial`. The DOM chrome and the scene it controls were keeping the same
colour by coincidence.

`THREE.Color` takes a resolved value, so `var()` cannot reach it — but the generated
`token` map can, and both renderers now read `token['--accent-3d']`. That closes the
canvas/DOM pairing #581 warns about for the one case where a shared authored value is
enough; the VPD ramp still needs #581's answer, because there the scene half is GLSL.

The accent's tints follow the value too: `rgba(68, 138, 255, x)` becomes
`color-mix(in srgb, var(--accent-3d) x%, transparent)`, the pattern `status.styles.ts`
already uses.

Rejected: folding into Hydro Blue `#2196f3`. It would recolour every control in the 3D
view _and_ the in-scene selection highlight, for tidiness.

### 3. The surface ramp is implemented at runtime

`--surface`, `--surface-dim`, `--surface-bright`, `--surface-container-lowest`,
`--surface-container-low`, `--surface-container`, `--surface-container-high`,
`--surface-container-highest` — same values already documented, now reachable.

The tell that this was overdue: `genetics-tree-view.ts:1042-46` declares its own
`--bg-app` / `--bg-card` / `--bg-card-elev` / `--bg-input` / `--bg-input-border`, and
those five values _are_ `surface-container-lowest` through `-highest`. A call site
independently rediscovered the documented ramp because the runtime offered it nothing.
That local block is retired by #632.

`on-surface`, `on-surface-variant`, `inverse-surface` and the overlay-tint values stay
documented-only. The first two would create a second text hierarchy beside
`--text-*`, which is how this whole mess started.

### 4. Two warning oranges stand, and their call sites are separated

`#ffa726` is the **status** warning; `#ff9800` is the **flowering stage**. They are
different concepts that happen to be neighbouring oranges, and the answer is not to
collapse them but to stop call sites from conflating them.

What that means concretely, applied by #632/#634:

- Sites meaning "something is wrong" use the status warning
  (`--gm-status-warning`, `var(--warning-color, #ffa726)`).
- Sites meaning "this plant is flowering" use `--stage-flower`.
- **`--gm-warning-color` is the conflation itself** — it defers to HA's
  `--warning-color` but falls back to the stage orange, so the same HA variable is
  reached through two contradicting fallbacks depending on which alias a file imported.
  It is deprecated: every use resolves to one of the two above.
- `crop-steering-day-chart.ts:1051,1108,1152` reference `var(--warning, …)`, and
  **nothing declares `--warning`** — not the card, not the HA theme set. Those three
  can only ever render their fallback. They are a dead reference, not a token use.

Noted for a follow-up, not decided here: the status tokens are authored in
`status.styles.ts`, outside `tokens.ts`. That second authored source is why the two
oranges could diverge without either artifact looking wrong, and it contradicts
ADR 0035 §2.

### 5. The outline gets one step up

`--outline-hover` (`rgba(255,255,255,0.2)`).

The system documents `outline` (0.12) and `outline-variant` (0.05) — it only steps
_down_. Four call sites need an outline that brightens on hover and had drifted to three
different values (`rgba(255,255,255,0.2)` twice, `0.35`, and `#666`). The modal value
wins.

## Consequences

- Two shipped defects are fixed by the first use of these tokens: the camera shutter and
  overlay controls, and the global toast's dark pill. The toast's success and error
  fills are left alone pending #636.
- `heatmap-3d`'s eleven greys and eleven accent sites migrate, which is what #576's
  first pass had to revert. The greys snap to the documented alphas, so they brighten
  slightly (`#9e9e9e` → 0.7 white, `#757575` → 0.55, `#e0e0e0` → `#ffffff`). No
  pixelmatch snapshot covers the component.
- The audit baseline ratchets 170 → 148.
- A new question exists at every migration site — _what is this text sitting on?_ — that
  #632, #633 and #634 must answer per site. That is a real cost, and it is the cost of
  the card being dark-first while its tokens pretend to be theme-neutral.
- `--divider-color` and `--error-color` remain the only `card-only` names (ADR 0036);
  nothing added here shadows a Home Assistant variable.
