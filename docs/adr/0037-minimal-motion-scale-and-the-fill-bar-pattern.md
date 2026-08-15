# ADR 0037 — Fill Bars Animate Transform, Against the Motion Tokens We Already Have

**Status:** Accepted
**Relates to:** #575 (this decision), #564 (token foundation), #589 (orphaned Strain Library CSS), ADR 0035 (one typed token source)

## Context

`DESIGN.md` describes the card's motion character in prose — a `translateY(-4px)`
hover lift on plant tiles at `0.3s cubic-bezier(0.4, 0, 0.2, 1)`, a pulsing alert
dot, a global reduced-motion posture — but it has **no Motion section**. Sections
1–6 cover theme, colour, typography, components, layout and Stitch guidance;
easing appears exactly once, inline, in the plant-tile paragraph.

The runtime, however, does **not** match that. `src/styles/tokens.ts` has carried a
full MD3 motion set since #607 — `--md3-motion-easing-standard` and
`-emphasized`, four `short` durations, two `medium`, two `long`, plus three
`--transition*` composites built from them — and they are in live use, 22 call
sites between the standard easing, `short4` and `medium2`.

So this is **not** the shape #564 diagnosed for type and radius. There is no
missing runtime step. There are three separate problems:

1. The motion tokens are undocumented. Every one carries `doc: null`, so none
   reaches the `DESIGN.md` frontmatter, and there is no Motion section to explain
   them. A contributor reading the design system sees no motion scale and
   reasonably concludes there isn't one.
2. Consequently the fill bars never adopted it. The card's eight progress/fill
   bars carry five ad-hoc timings between them, none of them a token.
3. `DESIGN.md` line 391 documents the plant-tile easing as
   `cubic-bezier(0.4, 0, 0.2, 1)` — the MD2-legacy curve — while
   `--md3-motion-easing-standard` is `cubic-bezier(0.2, 0, 0, 1)`. The doc
   describes a curve the card does not render.

The eight bars:

| Site | Declaration |
|---|---|
| `strain-editor-view` `.hg-bar-indica` / `.hg-bar-sativa` | `transition: width 0.2s ease` |
| `strain-library-dialog` `.hg-bar-indica` / `.hg-bar-sativa` | `transition: width 0.2s ease` |
| `batch-clone-dialog` `.progress-bar` | `transition: width 0.3s ease` |
| `batch-print-label-dialog` `.progress-bar` | `transition: width 0.3s ease` |
| `growspace-nutrient-inventory-dialog-ui` `.fill-bar` | `transition: width 0.3s ease` |
| `irrigation-tanks-tab` `.tank-bar-fill` | `transition: width 0.4s ease` |
| `irrigation-water-analytics-tab` (inline `style=`) | `transition: width 0.4s ease` |
| `growspace-tank-card` `.liquid` | `transition: height 1s ease-out` |

Every one of them animates a layout property. The `impeccable` detector flags all
eight under `layout-transition`, plus two more in dead code, for ten findings.

Rewriting ten declarations from `width` to `transform` while leaving the literals
in place would have re-scattered five arbitrary timings into a new property.

## Decision

### 1. Document the existing scale; mint nothing

The motion tokens' `doc:` fields are populated so the scale generates into the
`DESIGN.md` frontmatter like every other token group, and `DESIGN.md` gains a
Motion section describing it. **No new motion tokens are created.**

An earlier draft of this decision proposed a minimal three-token scale —
`--motion-duration-short` / `-medium` / `--motion-easing-standard`. That was
written from a bad reading: a grep of `variables.ts`, which since #607 is only a
re-export shim, found no motion tokens and was mistaken for the authored source.
Standing those three up would have created a second motion scale beside one with
22 live call sites, which is precisely the drift ADR 0035 exists to prevent.

The fill bars map onto the existing steps with no new names:

| Was | Becomes |
|---|---|
| `0.2s ease` (hue-genetics bar) | `--md3-motion-duration-short4` (200ms) |
| `0.3s ease` (progress + fill bars) | `--md3-motion-duration-medium2` (300ms) |
| `0.4s ease` (tank bars) | `--md3-motion-duration-medium2` (300ms) |

Only the two 0.4s sites move at all, and only by 100ms. Every site takes
`--md3-motion-easing-standard`.

**`--md3-motion-easing-emphasized` holding the same value as `-standard` is
correct, not a copy-paste.** MD3's emphasized curve is a two-part spline that a
single CSS `cubic-bezier()` cannot express, so Material Web defines the
single-bezier token as `cubic-bezier(0.2, 0, 0, 1)` — identical to standard. The
Motion section says so, because the next person to notice will otherwise "fix" it.

### 1b. The documented easing is corrected to match the runtime

`DESIGN.md` line 391's `cubic-bezier(0.4, 0, 0.2, 1)` becomes
`cubic-bezier(0.2, 0, 0, 1)`.

**Rejected: changing the token to match the doc.** The token is what 12 call sites
actually render today, so the doc is describing a card that does not exist.
Correcting prose to match shipped behaviour is free; retiming the curve under 12
sites is a visual change nobody asked for. If the MD2 curve is genuinely preferred,
that is a deliberate motion-feel change deserving its own issue.

### 2. Fill bars animate `transform: scaleX()` against a fixed track

The pattern: a track element owns the geometry — fixed height, `overflow: hidden`,
its own radius — and the fill inside it is `transform: scaleX(<fraction>)` with
`transform-origin: left`. The fill does **not** carry its own `border-radius`;
the track already clips to shape, and `scaleX` would distort a corner radius
horizontally anyway. The transition runs at `--md3-motion-duration-medium2` and
`--md3-motion-easing-standard`.

This applies to five sites: both batch-dialog progress bars, the nutrient
inventory fill bar, the irrigation tanks bar, and the water-analytics tank bar.

The water-analytics bar is the one with a real cost today. Its width is
interpolated into an inline `style=` attribute inside a lit template, so every
re-render restarts a layout-animating transition on a tick-driven readout. The
other four animate once per user-initiated operation and are perf-innocent; they
adopt the pattern for **consistency**, so the card has one fill-bar idiom rather
than two. That is the honest argument for those four, and the PR says so rather
than claiming a performance win it cannot measure.

### 3. Three named exceptions, documented where they live

Not every layout transition should become a transform. Three do not, and each
carries its reason as an inline `impeccable-disable-line` comment at the call
site rather than in this document:

- **`growspace-tank-card` `.liquid` keeps `transition: height 1s ease-out`.**
  `scaleY` with `transform-origin: bottom` is the textbook fix and is wrong here:
  `.liquid` has two children pinned to its top edge — `.liquid-surface`, a blurred
  meniscus ellipse already carrying its own `transform: scaleX(1.5)`, and `.wave`,
  an SVG strip at `top: -10px`. Scaling the parent squashes both, and the meniscus
  would visibly flatten as the tank fills. Counter-scaling the children is a
  compounding-transform trick that breaks the moment the markup is touched. A tank
  level changes on a slow sensor cadence, on one element, on one card. The slow
  rise is the effect; the `1s` stays a deliberate literal — the scale tops out at
  `long2` (500ms), and adding a 1000ms step for one decorative water animation
  would stretch the scale to serve a single site.

- **`strain-editor-view` `.hg-bar-indica` keeps `transition: width`,** retimed to
  `--md3-motion-duration-short4`. Two adjacent segments splitting one track is not a
  fill-against-fixed-track: `.hg-bar-track` is `display: flex` and `.hg-bar-sativa`
  is `flex: 1`, so scaling indica would slide sativa's edge independently and tear
  the seam between them. The animation is driven by a discrete click on the track,
  not a sensor tick — one animation per user gesture on an 18px bar.

- **`.hg-bar-sativa`'s transition is deleted outright** in `strain-editor-view`.
  Being `flex: 1` inside a flex track, its width is flex-derived and never set, so
  `transition: width` on it has always been inert. The honest fix for a
  declaration that does nothing is to remove it. The `strain-library-dialog` copy
  is left alone — see below.

The two `strain-library-dialog` findings are not addressed here at all: that
file's entire `.hg-*` block is unreachable — eight `hg-` occurrences, all in the
stylesheet, none in the template — and belongs to **#589**, which deletes the 83
unreachable selectors that file carries.

### 4. Exceptions live at the call site, not in this ADR

Beyond the three above, the same mechanism carries every other deliberate
detector suppression in this pass: the typing-indicator keyframe, the genetics
canvas grid, the banner accent strips, and the Roboto font-family findings. Each
is an inline `impeccable-disable-line <rule> -- <reason>` comment.

Inline ignores are committed by construction, travel with the code, and put the
reason in front of the reviewer at the site it applies to. They replace the
uncommitted `.impeccable/config.json` route, which cannot reach other clones or
CI because `.impeccable/` is in this repo's local `.git/info/exclude`.

This ADR deliberately does **not** enumerate those suppressions. Each is a local
judgement, well served by a comment where it lives; a list here would go stale the
moment one of those files changes.

## Consequences

- Adding a motion value means adding it to `tokens.ts` and regenerating, like
  every other token since ADR 0035. `DESIGN.md` gains a Motion section as a
  generated-plus-prose artifact.
- The card has one fill-bar idiom. A `transition: width` on a fill is now a
  reviewable defect rather than a matter of taste, and the detector enforces it.
- Three sites deviate, and a reader who runs the detector will see them stay
  flagged-then-suppressed rather than silently disappearing.
- Documenting the scale is what makes it reachable. The lesson of this ADR is not
  about motion: a token that generates into the runtime but carries `doc: null` is
  invisible to anyone reading the design system, and invisible tokens get
  reinvented at the call site. Any future group added to `tokens.ts` should get a
  `doc` path unless there is a reason it must stay runtime-only.
- Half the scale still has no call sites — `short1`–`short3`, `medium1`, both
  `long` steps, the `--transition*` composites. That is fine; the scale is MD3's,
  not one we sized ourselves, and having steps in reserve is the point of adopting
  a standard scale rather than minting per-site names.
- **Not covered here:** `src/styles/dialog.styles.ts` declares no
  `prefers-reduced-motion` block, so the 57 files importing it — including seven
  of the eight touched by this work — do not honour the user's motion preference.
  `DESIGN.md` line 463 currently claims otherwise. That is a WCAG 2.3.3
  conformance gap with a far wider blast radius than these findings, tracked as
  **#611** rather than folded in here. This ADR's PR corrects the DESIGN.md claim
  to state the real coverage; #611 closes the gap itself.
