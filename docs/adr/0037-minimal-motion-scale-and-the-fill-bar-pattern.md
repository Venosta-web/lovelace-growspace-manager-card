# ADR 0037 — A Minimal Motion Scale, and Fill Bars That Animate Transform

**Status:** Accepted
**Relates to:** #575 (this decision), #564 (token foundation), #589 (orphaned Strain Library CSS), ADR 0035 (one typed token source)

## Context

`DESIGN.md` describes the card's motion character in prose — a `translateY(-4px)`
hover lift on plant tiles at `0.3s cubic-bezier(0.4, 0, 0.2, 1)`, a pulsing alert
dot, a global reduced-motion posture — but it has **no Motion section**. Sections
1–6 cover theme, colour, typography, components, layout and Stitch guidance;
easing appears exactly once, inline, in the plant-tile paragraph.

`src/styles/tokens.ts` matched that: **no motion tokens at all**. No duration, no
easing, no `cubic-bezier` anywhere in the authored source.

The consequence is the shape ADR 0035 and #564 already diagnosed for type and
radius. With no step to reach for, call sites invented their own. The card's
eight progress/fill bars carry five different timings between them:

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

Rewriting ten declarations from `width` to `transform` without a token would have
re-scattered the same five arbitrary literals into a new property. The token gap
is the cause; the transitions are the symptom.

## Decision

### 1. Three motion tokens, not twelve

`tokens.ts` gains a Motion group with exactly three entries:

```
--motion-duration-short:  200ms
--motion-duration-medium: 300ms
--motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1)
```

The 0.2s and 0.3s sites collapse to `short`, the 0.4s sites to `medium`. The
easing is the MD3 standard curve already used, unnamed, in the plant-tile hover.

**Rejected: the full MD3 motion system** (short1–4, medium1–4, long1–4, plus
emphasized / decelerate / accelerate easings). It would import twelve steps to
serve two. #564 made the same call for radius — off-scale values snapped to the
nearest existing step rather than minting intermediate ones, "keeping the scale
tight" — and the argument carries here unchanged.

The scale grows when a call site genuinely cannot reach what it needs. That
inability is the signal, and it is the same signal that produced #564: a
documented character with no runtime step to reach for.

### 2. Fill bars animate `transform: scaleX()` against a fixed track

The pattern: a track element owns the geometry — fixed height, `overflow: hidden`,
its own radius — and the fill inside it is `transform: scaleX(<fraction>)` with
`transform-origin: left`, transitioned at `--motion-duration-short` and
`--motion-easing-standard`. The fill does **not** carry its own `border-radius`;
the track already clips to shape, and `scaleX` would distort a corner radius
horizontally anyway.

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
  rise is the effect; the `1s` stays a deliberate literal rather than minting a
  `long` step for a single site.

- **`strain-editor-view` `.hg-bar-indica` keeps `transition: width`,** retimed to
  `--motion-duration-short`. Two adjacent segments splitting one track is not a
  fill-against-fixed-track: `.hg-bar-track` is `display: flex` and `.hg-bar-sativa`
  is `flex: 1`, so scaling indica would slide sativa's edge independently and tear
  the seam between them. The animation is driven by a discrete click on the track,
  not a sensor tick — one animation per user gesture on an 18px bar.

- **`.hg-bar-sativa`'s transition is deleted outright**, in both files. Being
  `flex: 1` inside a flex track, its width is flex-derived and never set, so
  `transition: width` on it has always been inert. The honest fix for a
  declaration that does nothing is to remove it.

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
- The scale is deliberately too small to cover motion the card does not yet have.
  Adding `long` or an emphasized easing is expected, not a failure of this
  decision — but it should be prompted by a call site, not by symmetry with MD3.
- **Not covered here:** `src/styles/dialog.styles.ts` declares no
  `prefers-reduced-motion` block, so the 57 files importing it — including seven
  of the eight touched by this work — do not honour the user's motion preference.
  `DESIGN.md` line 463 currently claims otherwise. That is a WCAG 2.3.3
  conformance gap with a far wider blast radius than these findings, and it is
  tracked as its own issue rather than folded in here.
