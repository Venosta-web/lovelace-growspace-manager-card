# ADR 0038 — Stage Palette: The Disagreeing Sites Are Permutations, Not Alternate Palettes

**Status:** Accepted
**Relates to:** #580 (this decision), #574/ADR 0035 (colour tokens sorted by binding context), #565/#577 (the agreeing-site migration), #551 (clone got its own identity), #608 (fallback contradicts its own token)

## Context

#577 migrated the plant-stage colour literals where intent and value agreed, and
tabulated ~10 sites it deliberately left alone: sites that *have* a token for
their intent, but whose literal equals a **different** stage token's value. No
substitution there is both intent-correct and pixel-identical, so each needs a
human call on which side is wrong.

#580 framed two of these as possibly-deliberate second palettes:
`plant-timeline._getStageColor` ("a wholly independent green-family ramp") and
the three clone dialogs ("three sites agree on `#8bc34a`, so maybe
`--stage-clone: #26c6da` is the wrong one"). Neither framing survives the
evidence.

### 1. The disagreements are permutations of the canonical palette

Lining up the three multi-row sites against `tokens.ts` shows the same shape
three times — not novel colour choices, but canonical stage values landing on the
wrong stage:

| Site | arm | literal | which token owns that value |
| --- | --- | --- | --- |
| `plant-utils` | `SEEDLING` | `#4CAF50` | `--stage-veg` |
| `plant-utils` | `VEG` | `#8BC34A` | `--stage-seedling` |
| `plant-timeline` | `flower` | `#e91e63` | `--stage-mother` |
| `plant-timeline` | `dry` | `#ff9800` | `--stage-flower` |
| `presets-editor` | `flower` | `#e91e63` | `--stage-mother` |
| `presets-editor` | `mother` | `#ff9800` | `--stage-flower` |
| `presets-editor` | `clone` | `#9c27b0` | `--stage-dry` |

`plant-utils` is a clean seedling↔veg **swap**. `plant-timeline` and
`presets-editor` both swap flower↔mother/flower↔dry. A designer choosing a second
palette on purpose does not land on exactly another stage token's value seven
times in a row. These are copy/paste transpositions of the canonical set.

### 2. `plant-timeline` is not a green ramp

The "independent green-family ramp" reading of `_getStageColor` breaks on its own
arms: `cure: #795548` is brown and `seedling: var(--stage-seedling, #8bc34a)` is
already the canonical lime token. A ramp with a brown arm and a canonical-token
arm is not a system; it is two transpositions (`flower`, `dry`) plus two
darker-green improvisations (`clone: #66bb6a`, `mother: #2e7d32`) around a token
reference someone already migrated. There is no second palette to preserve.

### 3. The clone conflict: git order settles it

`--stage-clone: #26c6da` is **newer** than the `#8bc34a` the dialogs use, and it
is deliberate:

- `b4eb23d3` (2026-05-19) first defined `--stage-clone: #8bc34a` — the same lime
  as seedling.
- `5ca59632` (2026-05-20) wrote the DESIGN.md prose line
  "**Seedling / Clone Lime** `#8bc34a`", describing a system where clone had **no
  identity of its own**.
- `4e696a7c` / PR #551 (2026-08-14, "unify stage colours and restore clone",
  closing #538) moved `--stage-clone` to `#26c6da` while centralising "the
  canonical nine-stage colour map" and taking `flower_late` off Alert Red.

So the three dialogs are not three votes for lime. They are one stale prose line
followed twice — `clone-dialog.ts:108` literally comments `// Light green for
cloning`, which is that line restated. The token is the later, considered
decision; the dialogs predate clone having an identity.

There is also no incumbent clone colour to defend on "what users see today"
grounds, because today they see three different ones: plant tiles render
`#FF5722` (deep orange, `plant-utils`), the clone dialogs render `#8bc34a`, and
fan-VPD / header metrics render `#26c6da`.

### 4. Dialog accents are an activity family wearing a stage-shaped name

`gs-dialog`'s attribute is called `stageColor`, but only two dialogs pass a
stage: the clone dialogs. The rest pass activity accents — IPM and irrigation
steering pass `var(--warning-color, #ff9800)`, print-label passes `#2196F3`,
training passes `#9c27b0`. Training has no stage, so "retarget to its intent
token" has no target; the family has to be named before that row can be decided.

## Decision

### 1. Every disagreeing stage site retargets to its canonical `--stage-*` token

The palette in `tokens.ts` wins in all seven permutation rows above. No site gets
a second stage palette, and no stage token is moved to match a call site.

### 2. `plant-timeline._getStageColor` is retargeted whole

All seven arms become canonical `--stage-*` references, including the two that
are not transpositions (`clone: #66bb6a`, `mother: #2e7d32`). Deciding it arm by
arm is what produced the current state. `--timeline-stage-*` tokens are
**rejected**: minting a parallel family to preserve two improvised greens and a
brown gives the timeline permanent licence to drift from every other stage
surface in the card, which is the failure this whole effort exists to end.

### 3. Clone is `#26c6da` everywhere; DESIGN.md line 270 is corrected here

All three clone dialogs retarget to `--stage-clone`. `plant-utils`'s `#FF5722`
goes the same way (see Decision 5). DESIGN.md's "**Seedling / Clone Lime**
`#8bc34a`" bullet becomes two bullets — Seedling Lime `#8bc34a`, Clone Cyan
`#26c6da` — because this decision is what makes that line stale, so this is where
it gets fixed. The prose section is hand-written; the YAML frontmatter is
generated from `tokens.ts` (ADR 0035 §2) and already carries the correct value.

### 4. Training gets `--activity-training`; the dialog-accent family is named

`#9c27b0` at `training-dialog.ts:104` is **not** drift toward `--stage-dry`. It
is a missing role in the sense of ADR 0035 §5a: a dialog accent for an activity
that is not a stage. It is promoted as `--activity-training: #9c27b0`, same
value, no visual change.

The family is documented as: **a dialog accent names the thing the dialog acts
on.** Stage dialogs pass the stage token; activity dialogs pass an activity or
semantic token. Under that rule the existing sites resolve as —

| Dialog | passes today | becomes |
| --- | --- | --- |
| IPM, irrigation steering | `var(--warning-color, #ff9800)` | unchanged, already correct |
| clone, batch-clone | `#8bc34a` | `--stage-clone` |
| training | `#9c27b0` | `--activity-training` (new, same value) |
| print-label, batch-print-label | `#2196F3` | `--gm-info-color` |

Print-label's `#2196F3` is the same class as the rest of #580 — it equals
`--stage-cure`'s value while meaning "informational action", not "cure" — so it
is decided here rather than left to be mistaken for an agreeing site later. Same
value, no visual change.

Renaming the `stageColor` attribute to `accentColor` is **out of scope**: it is a
component-API change across every dialog, and it does not block this migration.

### 5. Rows #580's table omits, decided here so the migration is complete

- **`plant-utils.ts:31` `SEEDLING: '#4CAF50'`** — the other half of the swap
  #580 lists at line 32. Fixing `VEG` alone leaves seedling and veg both lime.
- **`plant-utils.ts:30` `CLONE: '#FF5722'`** — untokenised, so #574's bucket by
  classification. Claimed here anyway: Decision 3 fixes clone in one direction
  across the card, and leaving the most-seen clone surface out of that would
  defeat it.
- **`plant-utils.ts:35` `CURE: '#2196f3'`** — a bare literal that *agrees* with
  `--stage-cure` (#577's class; it was missed). Folded in so nobody reads
  `plant-utils` as done after this.
- **`presets-editor:33` `veg: 'var(--primary-color, #4caf50)'`** — right value,
  wrong name; primary and `--stage-veg` merely coincide. → `--stage-veg`, no
  visual change.
- **`presets-editor:35` `seedling: '#00bcd4'`** — an untokenised near-miss on
  clone cyan; it is the clone colour from `9b1ee237` (2026-01-15), stranded on
  the wrong arm. → `--stage-seedling`.
- **`slices/header-metrics/index.ts:95` `clone: 'var(--stage-clone, #8bc34a)'`**
  — a fallback that contradicts its own token, which is #608's class. Fixed here
  because it is a *clone* instance and Decision 3 already settles the direction;
  #608 keeps the rest of that class. The fallback becomes `#26c6da`.

### 6. Binding form follows ADR 0035, per file

These are JS-data and inline-`style` sites (ADR 0035 §4's second bucket), not
`css` declarations. Each file keeps the form it already uses — `plant-utils` and
`plant-timeline` already emit `var(--stage-x, #hex)` strings that are interpolated
into the consuming component's shadow root, so they keep that form. Where the
fallback is kept it **must be the token's own value**; a fallback that names one
token and falls back to another's value is the #608 defect being re-created.

`src/dialogs/*` is the exception, and it goes the other way: ADR 0036 §4 retired
the fallback-form carve-out there for card-invented names, so the clone, training
and print-label accents become **bare** `var(--stage-clone)` /
`var(--activity-training)` / `var(--gm-info-color)`. All three are in
`portalVariables`, so they resolve at the portalled host.

Case is normalised to lowercase in the fallbacks (`#E91E63` → `#e91e63`) as a
side effect, not as a separate pass.

## Visual changes

None of these can be both intent-correct and pixel-identical. Per site, on screen:

| Site | surface | before → after |
| --- | --- | --- |
| `plant-utils` `SEEDLING` | plant tile accent bar, plant overview dialog, heatmap | green `#4caf50` → lime `#8bc34a` |
| `plant-utils` `VEG` | same | lime `#8bc34a` → green `#4caf50` |
| `plant-utils` `CLONE` | same | deep orange `#FF5722` → cyan `#26c6da` |
| `plant-timeline` `flower` | timeline stage markers | pink `#e91e63` → orange `#ff9800` |
| `plant-timeline` `dry` | same | orange `#ff9800` → purple `#9c27b0` |
| `plant-timeline` `clone` | same | mid-green `#66bb6a` → cyan `#26c6da` |
| `plant-timeline` `mother` | same | dark green `#2e7d32` → pink `#e91e63` |
| `plant-timeline` `cure` | same | brown `#795548` → blue `#2196f3` |
| `presets-editor` `flower` | nutrient preset stage chips | pink `#e91e63` → orange `#ff9800` |
| `presets-editor` `mother` | same | orange `#ff9800` → pink `#e91e63` |
| `presets-editor` `clone` | same | purple `#9c27b0` → cyan `#26c6da` |
| `presets-editor` `seedling` | same | cyan `#00bcd4` → lime `#8bc34a` |
| `clone-dialog`, `batch-clone-dialog` | dialog header accent + primary button | lime `#8bc34a` → cyan `#26c6da` |
| `header-metrics` `clone` | stage chip, only where `--stage-clone` is out of scope (the pre-#610 portal case) | lime `#8bc34a` → cyan `#26c6da` |

**No visual change at all** — `--stage-cure` and `--activity-training` are
card-owned flat values: `plant-utils` `CURE`, `training-dialog`.

**No visual change under the default theme, theme-dependent after** — both
targets defer to a Home Assistant variable, so a user running a custom theme sees
a change where they see none today:

| Site | today | after |
| --- | --- | --- |
| `presets-editor` `veg` | the HA theme's `--primary-color` | `--stage-veg`, a flat `#4caf50` |
| print-label, batch-print-label | a flat `#2196F3` | `--gm-info-color` = `var(--info-color, #2196f3)`, i.e. the HA theme's info colour |

These are the intended direction in both cases — the preset chip should track the
veg stage rather than the brand, and a print dialog should track the theme's
informational accent — but they are not pixel-identical for everyone.

The two loudest are the `plant-utils` seedling↔veg swap (it changes the colour of
the most-seen surface in the card, the plant tile, for two of seven stages) and
clone going deep-orange → cyan on those tiles. Both are the point of the exercise:
after this, one stage is one colour everywhere.

## Consequences

- The follow-up migration is mechanical: every row above states its target token
  and its rendered before/after. It lands as its own PR — this one is ADR +
  DESIGN.md prose only.
- Screenshot tests covering plant tiles, the plant timeline and the clone dialogs
  will need new baselines, and any unit assertion on a stage hex moves with them.
- `--activity-training` is a one-member family. That is deliberate — naming the
  rule (Decision 4) is what lets the next activity dialog pick an accent without
  reaching for a stage colour — but if no second member appears it is a candidate
  for folding into whatever activity palette does emerge.
- `STAGE_CONFIG` in `features/plants/constants.ts` carries a `colorVar` per stage
  naming `--state-seedling-color` / `--state-clone-color` / … . Nothing reads
  `colorVar`, and those `--state-*-color` names are defined nowhere in `src/`. It
  is dead, it is a third stage-colour naming scheme, and it will read as
  authoritative to the next person who greps. Deleting it is not part of this
  decision; it is noted so it is not mistaken for the canonical set.
- Clone now differs from seedling on every surface, which is what #551 intended.
  Users who learned "lime = clone" from the dialogs see a change; there is no
  migration path for that beyond the release note.
