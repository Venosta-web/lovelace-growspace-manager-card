# ADR 0040 — Canvas and Shader Resolve Tokens at Draw Time

- Status: accepted
- Date: 2026-08-16
- Issue: #581 (decision), #639/#640/#641 (the migrations that apply it)
- Related: ADR 0035 (binding-context sorting, §5 derivation rejected for the series palette), ADR 0036 (portal token scope), ADR 0039 (§2 the scene reads the generated `token` map, §4 `--gm-warning-color` deprecated), #576 (needs the accepted-exception list to define its zero), #577 (established that SVG attributes are *not* affected)

## Context

`ctx.fillStyle` and a GLSL `vec3` take a resolved colour. No `var()` reference
survives into either, so a painted surface cannot reference a [[Design Token]] the
way every other [[Binding Context]] can. #581 framed this as choosing between
resolving at draw time, accepting the exception, or single-sourcing the values in
TypeScript.

Three facts found in the tree change what those options cost.

### The pair is already split

#581 says `vpd-heatmap.ts:276` is an inline `style="background: #ff9800"`, and that
#577 excluded the canvas and its legend **as a pair** so they could not drift. That
is not the state of the file. On `dev` the four legend swatches read
`var(--gm-info-color)`, `var(--gm-warning-color)`, `var(--gm-primary-color)` and
`var(--gm-error-color)`, while `_getZoneColor()` still returns bare
`#2196f3` / `#ff9800` / `#4caf50` / `#f44336` into `ctx.fillStyle`.

The pairing did not hold. Under any Home Assistant theme that defines
`--warning-color`, the swatch labelled *Fair* and the pixels it labels **already
disagree today**. This is therefore a repair, not a prevention, and the question is
not "how do we avoid drift" but "which half of an already-drifted pair is right".

### `--gm-*` is theme-dependent, so a TypeScript constant cannot match it

`tokens.ts` defines these four in the [[Token Fallback Form]] —
`var(--info-color, #2196f3)` and friends. Their resolved value is whatever the user's
theme says at runtime.

That re-costs two of #581's three options. **Single-sourcing in TypeScript cannot
satisfy the stated invariant**: a constant is a fixed hex, the legend is a themed
token, and they agree only under the default theme. **Accepting the exception is not
"leave it alone" either** — it means reverting four live token references to
literals. Both cheap-looking options are paid for by giving up theme responsiveness
the legend already has.

There is a second, quieter trap in the same fact. ADR 0039 §2 established
`token['--accent-3d']` — the generated map — as how a three.js renderer reads a
token, and that works because `--accent-3d` is authored as a bare hex. It does **not**
generalise here: `token['--gm-info-color']` returns the *string*
`'var(--info-color, #2196f3)'`. Assigned to `ctx.fillStyle` that is an invalid value
and the canvas silently keeps its previous colour.

### The audit cannot see the surface it is auditing

`scripts/audit-design-tokens.mjs` matches `/#[0-9A-Fa-f]{3,8}\b/`. Every three.js
literal is `0xRRGGBB`, so the entire renderer stack is below the script's floor —
including `plant-renderer.ts:217` `0x4caf50` (primary), `:368` `0x81c784`
([[Series Slot]] 2) and `:235` `0x2e7d32` (a stage colour). Meanwhile
`vpd-cloud-renderer.ts` is in `EXEMPT_FILES` while `heatmap-3d.ts`, which draws its
legend, is counted.

That asymmetry — the unreachable half invisible, the reachable half flagged — is the
mechanism that produces the drift. A sweep that can only see one side of a pair will
migrate that side.

### There are three pairs, not one

| Painted surface | Its legend | State |
| --- | --- | --- |
| `vpd-heatmap.ts` `ctx.fillStyle` (canvas) | `vpd-heatmap.ts:272-284` swatches | Split: canvas hex, legend tokens |
| `vpd-cloud-renderer.ts` GLSL `vec3` | `heatmap-3d.ts:205` gradient | Agreed, by hand-maintained comment |
| `tank-renderer.ts:65` `0xff4422`/`0x00aaff` | `tank-renderer.ts:153` CSS2D label `#f44336`/`#2196f3` | **Disagreed**: not even the same colour |

The third was not in #581. Its mesh and its label are two representations of one
role that were never equal, and its label builds a translucent fill by string
concatenation — `background: ${hex}33` — which only works while the value is a
six-digit hex.

## Decision

### 1. The canvas follows the legend; tokens are resolved at draw time

Painted surfaces resolve their colours from the DOM immediately before painting.
The legend is the correct half of every split pair — a user who themes their
warning colour should see their orange in the pixels as well as the swatch — and
this is the only option that does not revert landed work.

### 2. Resolution goes through a probe element, not `getPropertyValue`

`getComputedStyle(host).getPropertyValue('--gm-info-color')` returns the substituted
token stream: usable, but whitespace-padded and in whatever syntax the theme author
wrote (`orange`, `#f80`, `rgb(...)`). A hidden probe element carrying
`color: var(--gm-info-color)`, read as `getComputedStyle(probe).color`, computes the
value rather than echoing the syntax it was written in.

**Corrected after measurement: `color` does not *always* normalise to `rgb()`.** It
does for the cases this section was written against — measured in this repo's Chromium
harness, `orange` computes to `rgb(255, 165, 0)`, `#f80` to `rgb(255, 136, 0)`, and a
plain `var()` reference to the theme's own `rgb()`. But a `color-mix()` keeps its
mixing space: `color-mix(in srgb, magenta 62%, black)` computes to
`color(srgb 0.62 0 0.62)`, and the `in oklab` form to `oklab(0.435 0.170 -0.105)`.
Assigning either to `fillStyle` and reading it back returns it unchanged, so read-back
is not a normaliser either. Stop 1 is derived (§6), so this is not hypothetical — it is
the one stop in the ramp that hits it.

The resolver therefore forces every stop through a module-scoped 1×1 canvas — paint,
`getImageData`, re-emit as `rgb(r, g, b)` — short-circuiting the four stops that
already arrive in that form. `normalizeColor` in `src/styles/environment-ramp.ts` is
that function. It is exported rather than private because §5's shader needs the same
guarantee on both halves of its pair.

Normalisation is not cosmetic. It is what makes decision 10's test possible at all:
`getImageData` returns bytes, and only a normalised form puts both halves of the
comparison in the same space.

Two mechanical requirements come with it:

- **Resolve once per draw, outside the pixel loop.** `_drawHeatmap` paints
  400×300 in 4px steps — 7,500 iterations. A `getComputedStyle` call per iteration
  is not viable.
- **`_getZoneColor` returns a role key, not a colour**, indexed into the resolved
  palette. The function's job was always classification; returning a hex was it doing
  two things.

  *As shipped in #639 it is `_getZoneRole`, returning §6's ordinal `RampRole` —
  `'farLow' | 'low' | 'optimal' | 'high' | 'farHigh'` — not the
  `'wet' | 'fair' | 'optimal' | 'dry'` this section first named. Those four were zone
  labels, and one scale keyed by position is what lets `vpd-heatmap` (stops 2–5) and
  the shader (all five) share a descriptor at all. The labels survive as presentation
  in `LEGEND`, where the non-obvious pairing is Fair → `high`.*

If a probe read comes back empty — no adopted stylesheet, a detached element — the
descriptor's terminal hex is used. That fallback is a literal in the descriptor, not
`token[...]`, for the reason recorded in the context above.

### 3. Redraw is driven by the resolved palette changing, not by `hass`

`updated()` re-resolves the palette on every update, including `hass` changes, and
repaints **only if the resolved strings differ** from the cached ones.

`.hass` is passed to `<vpd-heatmap>` (`plant-timeline.ts:655`) and Home Assistant
propagates a new `hass` object on a theme change, so the signal already arrives. What
must not happen is a repaint per `hass` tick: resolving is five `getComputedStyle`
reads, repainting is 7,500 `fillRect` calls.

A `MutationObserver` on `document.documentElement`'s `style` attribute was the
alternative. Rejected: it adds a lifecycle-managed listener — there is no theme
listener anywhere in `src/` today — for a signal the component already receives.
Resolving on draw without a redraw hook was also rejected outright: it leaves a stale
canvas after a theme switch until the next temperature update, which #581's
acceptance criteria explicitly refuse.

### 4. One descriptor holds token *names*, and every consumer reads it

The ramp is authored once, beside `tokens.ts`, as role descriptors — role, CSS custom
property, terminal fallback — and read by the canvas resolver, the legend template,
the shader uniform feed and the audit script's allowlist.

This is #581's option 3 (single source in TypeScript) rebuilt on top of option 1. The
shared constant holds **token names rather than hexes**, so it survives a theme change
instead of freezing the default one. Without it, "canvas and legend agree" is enforced
by three call sites independently naming the same four tokens, which is the convention
the acceptance criteria asked to replace with a guarantee.

### 5. The shader takes the ramp as a uniform

`getHealthColor()`'s five hardcoded `vec3` constants become `uniform vec3 u_ramp[5]`,
fed from the same resolved palette via `new THREE.Color().setStyle(rgbString)`.

`setStyle` is named explicitly because the failure mode is quiet: three.js renders in
linear space with sRGB output, and hand-dividing by 255 into a uniform is how these
five stops come out visibly wrong. `vpd-cloud-renderer` already updates uniforms per
frame (`u_thresholds`, `u_sensorValues`), so this is an existing path, not new
machinery.

Leaving GLSL hardcoded and tokenising only the `heatmap-3d` legend was rejected: it is
the same reachable-half-only asymmetry that caused the problem.

### 6. The ramp is one five-stop scale, and three of its stops move

| Stop | Role | Token |
| --- | --- | --- |
| 1 | far low | `--gm-info-deep` |
| 2 | low | `--gm-info-color` |
| 3 | optimal | `--gm-status-optimal` |
| 4 | high | `--gm-status-warning` |
| 5 | far high | `--gm-error-color` |

`vpd-heatmap` consumes stops 2–5; `heatmap-3d` and its shader consume all five. They
are one scale at two resolutions, not two scales. An ordinal `--heat-1…5` set was
rejected: unlike the [[Series Slot]]s, these stops carry per-stop meaning that the
call sites honour.

Stop 3 was `--gm-primary-color` when this ADR was written, and shipped that way in
slice 1 (#639). Corrected here after the rendered result: the brand accent follows
the HA theme's `--primary-color`, so on a blue or purple theme the "Optimal" zone —
and the swatch labelling it — stopped being green while its neighbours stayed a
warning orange and an error red. The scale read as three unrelated colours. Stop 4's
argument decides this one too: outside optimal means *something is drifting*, inside
it means *nothing is wrong*, and both are the status role, not the brand's.
`--gm-status-optimal` defers to `--success-color`, so "green" holds by theme
convention rather than by construction — the same footing as stops 4 and 5, which is
the point. It is declared beside `--gm-status-warning` in `status.styles.ts`, so it
inherits that stop's `statusTokens` prerequisite and adds no new plumbing.
Slices #640/#641 take stop 3 from this row, not from the shipped #639 value.

Three consequences of that table are visible colour changes, and all are deliberate:

- **Stop 4 is the status orange, not the stage orange.** ADR 0039 §4 deprecated
  `--gm-warning-color` as a conflation of the two, so the legend's current reference
  to it is itself a now-deprecated site that this work repairs. A VPD zone outside
  optimal means *something is drifting*, which is the status role — so `#ff9800`
  becomes `#ffa726` in the gradient and the shader.

  **This one carries a prerequisite.** `--gm-status-warning` is declared in
  `status.styles.ts:21`, not in `tokens.ts`, and neither `vpd-heatmap` (which
  composes `sharedStyles` only) nor `heatmap-3d` (a bare `css` tag) adopts that
  stylesheet — so today the name is out of scope in both components. Both migrations
  must compose `statusTokens` into `static styles`, and this must be checked against
  the composed `cssText` rather than the import list.

  The failure mode if it is skipped is exactly the one decision 10 cannot see: the
  probe read returns empty and takes the descriptor's fallback, the legend swatch
  resolves to nothing, and the test compares two identically-broken halves and
  passes. ADR 0039 §4 already flagged the status tokens living outside `tokens.ts`
  as a contradiction with ADR 0035 §2; consolidating them would dissolve this
  prerequisite, and is not attempted here.
- **Stop 1 is derived and does not reproduce `#0d47a1`.** `--gm-info-deep` is
  `color-mix(in srgb, var(--gm-info-color) 62%, black)`, which measures **`#145d97`**
  against the current literal's `#0d47a1` — about 25 units away, lighter and less
  saturated. `#0d47a1` is Material Blue 900, a distinct point, not a darkening of Blue
  500; no `color-mix` expression reaches it. ADR 0035 §5 rejected derivation for the
  series palette on exactly this pixel-identity ground, and this decision knowingly
  departs from that: a **ramp has an internal relationship a categorical palette does
  not**. A frozen navy welded beneath four stops that moved with the theme is no longer
  a ramp, and the stop is a 6px sliver of a gradient nobody reads as an exact colour.
  The value changes; that is the price and it is recorded here rather than papered over.

  **`in srgb`, not `in oklab` — and the original reason for that was wrong.** As
  written, this paragraph argued that a non-sRGB `color-mix` serialises as `oklab(…)`
  while `THREE.Color.setStyle` in the pinned three r184 parses only hex, named colours,
  `rgb`/`rgba` and `hsl`/`hsla` (`setStyle` at
  `node_modules/three/src/math/Color.js:286`, matching `/^(\w+)\(/` and switching on
  those four names). Both of those facts hold. **The inference from them does not:
  `in srgb` is no more parseable than `in oklab`** — it computes to
  `color(srgb 0.62 0 0.62)`, which `setStyle` rejects for exactly the same reason.
  Parseability never distinguished the two mixing spaces, so it cannot have chosen
  between them, and §2's `normalizeColor` now hands both the same `rgb()` guarantee.

  **The decision stands, on a different footing: `#145d97` has shipped.** Slice #639
  landed it, and oklab's ~3 units of extra accuracy do not pay for moving a live colour
  a second time. Changing a value because its rationale moved is a new decision rather
  than a correction, and it is not made here. Note that this leaves the mixing space
  invisible to §5 — whatever the resolver hands the shader is already `rgb()` — which is
  precisely why there is no longer anything to gain by switching it.

### 7. `tank-renderer`'s label wins, and its alpha suffix becomes `color-mix`

The mesh (`0xff4422` / `0x00aaff`) migrates to the resolved `--gm-error-color` /
`--gm-info-color`; the label already carries the documented values, so it is the
correct half, same shape as `vpd-heatmap`. `background: ${hex}33` becomes
`color-mix(in srgb, var(--gm-error-color) 20%, transparent)` — the pattern
`status.styles.ts` already uses, and pure CSS, so the card's insecure-context
constraint does not touch it.

The liquid shifts perceptibly, `0xff4422` → `#f44336`. The translucency does not:
`33` and `20%` are the same alpha.

### 8. The audit script grows a `gpu` bucket and a line-level allowlist

A `0x[0-9A-Fa-f]{6}` pattern is added, `src/utils/three/` is bucketed as `gpu`, and
exceptions are allowlisted **by file and line role, not by whole file**. Anything
outside the allowlist counts as a finding once the gate bites.

Whole-file exemption is precisely what let `vpd-cloud-renderer` go dark while its
legend was counted, so `heatmap-3d.ts` is *not* added to `EXEMPT_FILES` as #581's
comment suggested — that would also silence its unrelated greys. ADR 0035 §9 chose a
script over an ESLint rule because the exceptions are a classification; this is that
classification getting finer, not looser.

**The baseline goes up before it goes down.** Making a previously invisible population
visible is a larger number, not a regression, and the baseline is regenerated when
this lands.

### 9. What is exempt, and what is merely deferred

**Accepted exceptions** — permanent, allowlisted, excluded from #576's zero:

- three.js scene furniture: `frame-renderer` grid and floor greys,
  `equipment-renderer` housings, `plant-renderer` soil and pot browns. No DOM twin,
  no semantic role.
- `vpd-heatmap`'s current-point marker, `ctx.fillStyle = 'white'` /
  `strokeStyle = 'black'`. A contrast device against an arbitrary ramp colour, not a
  themed one.
- `plant-utils.ts` and `camera-capture.ts` canvases: image resizing and capture, they
  paint no colour of their own.

**Deferred, not exempt** — `plant-renderer.ts:217` `0x4caf50`, `:235` `0x2e7d32`,
`:368` `0x81c784`. These carry real roles (primary, a stage colour, series 2). They
fail the pair invariant only because they have no DOM twin, and calling them permanent
exceptions would license the next role-carrying `0x` literal. They are listed as known
and unmigrated so #576's zero stays honest without this issue's diff growing.

### 10. The invariant is a test, not a convention

- **Canvas pair:** a browser-mode test mounts `vpd-heatmap` under a host overriding
  `--info-color` to a distinctive value, then asserts `getImageData` at a known
  in-zone coordinate equals the computed colour of the corresponding legend swatch —
  and asserts the pixel *changes* when the override changes. It fails on `dev` today,
  which is the point.
- **Shader pair:** a descriptor-equality test asserting `u_ramp` matches the resolved
  palette. WebGL pixel readback in the browser harness is a different order of
  flakiness and buys little here.

Under #581's options 2 and 3 this criterion would have been trivially true; it has
teeth only because the colours are resolved.

**Agreement and freshness are two assertions, not one.** Overriding a custom property
on the host does not schedule a Lit update, so an agreement test has to call
`requestUpdate()` by hand — which proves the palette resolves and the halves match,
and proves nothing about the production trigger. #581's non-negotiable criterion is
the *other* one: no stale canvas after a theme switch. So the canvas test also sets a
**new `hass` object** with changed `themes` and asserts the pixel repaints with no
manual `requestUpdate` — the actual path from decision 3. Without that second
assertion, AC #3 rests on an untested assumption about `hass` propagation.

### 11. Landing order

```
this ADR + DESIGN.md                          (#638)
  └▶ #639  vpd-heatmap canvas                 (pixel-testable)
       │   — carries the descriptor, --gm-info-deep and the audit script's gpu bucket
       ├▶ #640  vpd-cloud-renderer + heatmap-3d legend
       │        (colour-space conversion, no pixel test)
       └▶ #641  tank-renderer pair
                (visible colour change + color-mix rewrite)
```

The foundation is not its own slice. The descriptor, the token and the audit bucket
land inside #639, because on their own they are a layer with nothing demonstrating
them — #639 is the thin path that proves the mechanism end to end, and #640 and #641
then reuse it.

Off fresh `dev`, not stacked. The three migrations carry genuinely different risk, and
reviewed together the visual regressions hide behind the plumbing.

## Consequences

- The heatmap becomes theme-responsive, which it has never been. A card under a custom
  Home Assistant theme repaints its VPD zones in that theme's colours.
- Three colour values change visibly: the ramp's warm stop (`#ff9800` → `#ffa726`),
  its deep stop (`#0d47a1` → `#145d97`), and the 3D tank liquid
  (`0xff4422` → `#f44336`). No pixelmatch snapshot covers any of them.
- Every painted surface now has a DOM dependency it did not have. A canvas rendered
  before its host's styles are adopted resolves nothing and falls back — which is why
  the descriptor carries terminal hexes.
- The audit's headline number rises when the `gpu` bucket lands.
- `--gm-warning-color` loses one more caller, and the deprecation from ADR 0039 §4
  reaches a component that ADR did not touch.
- The rule generalises past these three pairs: any future painted surface with a DOM
  legend inherits it. What it does not do is migrate the rest of the three.js scene,
  which stays literal by decision 9.
