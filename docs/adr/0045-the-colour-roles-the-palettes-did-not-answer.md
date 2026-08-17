# ADR 0045 — The Colour Roles the Palettes Did Not Answer

- Status: accepted
- Date: 2026-08-17
- Issue: #660 (decision), the remainder of #634 after ADR 0044 answered its palette groups
- Related: ADR 0035 (§5a, "this needs a new role" is a valid outcome), ADR 0038 (stage palette canonical), ADR 0041 (a contradicting fallback is a re-authored token), ADR 0042 (§1 the alpha-suffix constraint, §6 accepted exceptions), ADR 0044 (the three categorical palettes)

## Context

ADR 0044 took #634's thirty undecided sites and answered the twenty that were palette-
shaped. The remaining ten are not a palette in any grouping: they are the irrigation and
drain accents, the two `?? fallback` arms of the stage lookups, and four one-offs. Each
needed one of three answers — document it, fold it into something documented (naming the
visual change), or accept it as a permanent literal.

Four of the ten turn out to be **answerable from the codebase rather than from taste**,
because the same thing is already coloured somewhere else and the two disagree. Those are
the interesting ones, and they are folds rather than new tokens.

### Three findings that decide seven of the ten sites

1. **The hero and the day chart plot the same VWC series in different colours.**
   `crop-steering-day-chart.ts:568,670` reads
   `METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color` for its VWC trace.
   `growspace-header-hero-ui.ts:1010` painted its VWC mini-chart in a local
   `const CS = '#26c6da' // crop-steering teal`. Same data, two charts, two colours —
   and the teal is `--stage-clone`'s and `--metric-irrigation-flow`'s value, so it also
   reads as two other things.

2. **Every other dialog names its accent with a role.** `print-label-dialog.ts:532` and
   `batch-print-label-dialog.ts:227` pass `stageColor="var(--gm-info-color)"`;
   `batch-clone-dialog.ts:156` passes `var(--stage-clone)`;
   `growspace-ipm-dialog-ui.ts:221` passes `var(--warning-color, #ff9800)`. Only
   `irrigation-dialog.container.ts:1318` holds a literal — and its value, `#2196F3`, is
   exactly `--gm-info-color`'s.

3. **The card already has a colour for a star that is on.** `plant-card-ui.ts:302` marks
   "nutrient preset recommended" with `mdiStar` at `color: var(--primary-color)`. The
   only other star in the card, the thumbnail toggle at `strain-editor-view.ts:1162`,
   was amber.

## Decision

### 1. Irrigation data takes the metric palette; irrigation chrome takes the info role

Four sites, split on what they are rather than on what colour they are:

| Site                                         | Was       | Becomes                                     |
| -------------------------------------------- | --------- | ------------------------------------------- |
| `schedules-tab.viewmodel.ts:193` drain       | `#FF9800` | `token['--metric-drain']` — value unchanged |
| `schedules-tab.viewmodel.ts:209` irrigation  | `#2196F3` | `token['--metric-irrigation']` (`#03a9f4`)  |
| `crop-steering-day-chart.ts:960` shot marker | `#2196F3` | `token['--metric-irrigation']` (`#03a9f4`)  |
| `irrigation-dialog.container.ts:1318` accent | `#2196F3` | `var(--gm-info-color)` — value unchanged    |

A schedule section is a timeline of irrigation or drain **events**, which is what
`MetricKey.IRRIGATION` and `MetricKey.DRAIN` already plot as step series; the shot marker
is an irrigation event on a chart. So they take the metric palette, on ADR 0044's own
argument — the legend names the metric, and the reader expects the mapping to hold
wherever it is plotted.

The dialog accent is not data. It is chrome — `stageColor`, `--stage-color`, and the save
button's fill — and finding 2 says what chrome does here.

**Named visual change:** irrigation's blue moves `#2196f3` → `#03a9f4` in the schedule
timeline and the shot markers, which is what the documented irrigation colour has been
all along. The schedule tab's own comment recorded the drift as it happened: "the dialog's
stage color is the fixed `#2196F3` the former render passed through". Drain does not move.

**The two binding forms here are not an inconsistency.**
`irrigation-schedules-tab.ts:545,580` and `crop-steering-day-chart.ts:960` concatenate
`40`, `99` and `55` onto the section colour, so those three sites must be a six-digit hex
reached through the `token` map — `var(--metric-irrigation)40` is not a colour, and the
band would lose its fill while its label kept rendering. Nothing concatenates onto
`dialogColor`, so it takes `var()` and stays theme-following. `phase-token-suffix.test.ts`
now covers `--metric-irrigation` and `--metric-drain` alongside the phase family; the
audit cannot see any of it, because the concatenating sites hold no literal of their own.

### 2. An unrecognised stage is grey, in both lookups

`--stage-unknown` (`#757575`, Grey 600), for the `?? fallback` arm of
`plant-utils.ts:59` and `slices/header-metrics/index.ts:550`.

Both tables were already migrated — every mapped stage is `var(--stage-*, #hex)` — and
only the fallbacks were left, disagreeing: grey in one file, the **veg green** in the
other. ADR 0038's table covers the mapped stages and says nothing about this position,
which is why #624 did not own it.

Grey, for the reason `--metric-unknown` is white and `--gen-unknown` is grey: an unmapped
member should be visibly not one of the named ones. **Named visual change:** the header's
dominant-stage chip stops rendering an unrecognised stage as though it were veg.

### 3. The hero's VWC trace reads the descriptor the day chart reads

`growspace-header-hero-ui.ts:1010` becomes
`METRIC_CONFIG[MetricKey.SOIL_MOISTURE].color`, not a fresh `token[…]` lookup — the point
is that the two charts cannot drift apart again, and finding 1 is that they already had.

**Named visual change:** the hero's crop-steering trace, its area gradient and its now-dot
move `#26c6da` → `#03a9f4`, matching the VWC trace on the day chart below it.

### 4. The thumbnail star is the Primary

`strain-editor-view.ts:1162` folds to `var(--primary-color, #4caf50)`.

The tempting move was a new Amber 500 beside `--award`, and it is wrong: `--award`'s own
note justifies its promotion by "every amber the system already documents means something
else", which stops being true the moment a second amber is added at the same value with an
adjacent meaning. Finding 3 gives the real answer — a star that is on is the Primary here,
and there is exactly one other star in the card to be consistent with.

**Named visual change:** the thumbnail star turns from amber to the Primary green.

### 5. `--severity-critical` is documented, and stays off `--error-dark`

`--severity-critical` (`#b71c1c`, Red 900) for `snapshots-dialog.ts:310`, the top tier of
the vision checkup's none/low/medium/high/critical ramp. Its four siblings already point
at status roles; only this one had nowhere to go.

Not folded into `--error-dark` (`#d32f2f`), whose note binds it to the danger gradient's
dark stop and the destructive-button pressed state. A severity tier and a pressed state
would then have to move together for no reason. Value unchanged.

### 6. `--on-current-stage-chip` is documented, and it is not a contrast rescue

`--on-current-stage-chip` (`#ffb74d`, Orange 300) for
`plant-overview.container.ts:647` — the label on the current-stage chip, over its own
`rgba(255,152,0,0.15)` ground.

It looks like `--on-primary-container-bright`, and the measurement says it is not the same
finding. That token exists because `#4caf50` over its container measures 4.26:1 and fails
AA. Here `--stage-flower` (`#ff9800`) over this ground measures **5.88:1** and already
passes; the Orange 300 measures **7.33:1**. So the brightening is stylistic, not required
— stated plainly rather than borrowed, because the chip is 0.7rem and the extra headroom
is the honest reason to keep the value rather than fold it to `--stage-flower`.

Named for "current" rather than for the flowering stage: the ground is that orange
whichever stage is current.

## Consequences

- **Three tokens added**: `--stage-unknown`, `--severity-critical`,
  `--on-current-stage-chip`. Four of the ten sites needed no token at all, because
  something in the codebase already answered them. None shadows a Home Assistant
  variable.
- The `js` bucket ratchets **15 → 5**, the whole audit **61 → 51**. What is left in the
  bucket is `environment-ramp.ts:29-33` — #639's own role→name→fallback table, which is a
  token declaration rather than a call site, and is that slice's to accept or move.
- **Four visual changes are owed a look on a live card**, and none is covered by a
  pixelmatch snapshot: the irrigation timeline and shot markers move to the documented
  irrigation blue, the hero's VWC trace matches the day chart, an unrecognised stage
  reads grey instead of veg green, and the thumbnail star turns green.
- `phase-token-suffix.test.ts` grows from three tokens to five and is no longer only about
  the phase family; its name is now the one thing in it that is out of date.
- With this, every colour decision the #576 sweep escalated is answered. #634's migration
  is complete apart from the sites #641 and the `gpu` bucket own.
