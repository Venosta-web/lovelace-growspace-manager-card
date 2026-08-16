# ADR 0042 — The Colours With No Home in the Design System

- Status: accepted
- Date: 2026-08-16
- Issue: #631 (decision), the other half of the #630 escalation, both surfaced by the #576 sweep
- Related: ADR 0035 (binding-context sorting), ADR 0038 (stage palette canonical, "dialog accents use `--warning-color`"), ADR 0039 (the missing roles, §4 two warning oranges), ADR 0040 (accepted exceptions are allowlisted by role, not by file), #632/#633/#634 (the migrations that apply this), #636 (on-fill foregrounds)

## Context

#630 asked which roles the system was _missing_. This asks the opposite question: six
groups of colour that are already on screen and have no home in the system at all. Each
needed one of three answers — document it, fold it into something documented (naming the
visual change), or accept it as a permanent literal.

### Three corrections to the issue's premises

The sites were re-derived from source rather than taken from the issue. Three of its
groupings do not survive that, and since #632/#634 inherit this site list, the corrected
set is normative:

1. **`strain-import-dialog.ts:421` is not a day/night site.** It is `.award-tag` — the
   amber on a cannabis-cup trophy chip. It shares `#ffc107` with the day marker and
   nothing else. It is out of scope here and belongs to #632's ordinary CSS bucket.

2. **`growspace-card.styles.ts:349` `#90a4ae` is not an off-palette one-off.** It is
   `.ac-icon.off`, five lines below `.ac-icon.on { color: var(--primary-light-color) }`.
   It is the lights-**off** half of a pair whose lights-on half is already the documented
   Tertiary. It moves from §5 to §2.

3. **There is a fourth day/night encoding the issue does not list.**
   `config-humidity-tab.ts:402-403` passes `#ff9800` (day) and `#7986cb` (night) as
   function arguments. The sweep put them in the `js` bucket, which is why they never
   showed up next to the CSS ones — and the day value collides with both `--stage-flower`
   and the P3 phase band.

So the light cycle is rendered in **four different pairs across five sites**, not one pair
across four. AC #4's "all four call sites" is wrong on both ends.

### The finding that decides §1

`slices/irrigation/index.ts:126,135,144` holds `#4CAF50` / `#2196F3` / `#FF9800` as the
P1/P2/P3 phase colours. That family is why `#ff9800` appears twice in §1 for two unrelated
reasons:

- The hero's `.phase-badge--dryback` is **P3's colour**, not a warning and not a marker.
  Its being off-palette is a symptom of the phase family living in a slice as three
  literals.
- The `.now-line` in `crop-steering-day-chart.ts` paints the time cursor in **exactly the
  colour of the P3 band it lands in**, on the same chart. That is not a naming problem; it
  is a legibility defect, and it rules out every "fold into an orange" option for the
  cursor.

## Decision

### 1. The phase family is documented; the cursor leaves the data palette

`--phase-p1` (`#4caf50`), `--phase-p2` (`#2196f3`), `--phase-p3` (`#ff9800`) — values
unchanged, now one source for the chart bands, the phase chips and the hero badge alike.
The dryback badge is answered by _this_, not by a warning decision: it was never a
warning.

`--marker-now` (`#ffffff`) for the cursor, in both
`crop-steering-day-chart.ts` and `irrigation-schedules-tab.ts`. The two charts agree,
which is what the issue asked for, but they agree on neutral rather than on either
warning orange:

- A cursor is not data. It crosses every band, so any hue in the band palette reads as a
  band where it overlaps one — and today it _is_ the P3 hue.
- Both candidate folds were spoken for before this ADR. ADR 0039 §4 keeps `#ffa726` as
  status and `#ff9800` as the flowering stage, and ADR 0038 scopes "irrigation steering
  uses `--warning-color`" to _dialog accents_. Neither reaches a chart rule.
- White is the brightest thing available on the card's dark charts, which is the one
  property a cursor should have.

Named visual change: both now-lines, their dots and their glows go orange → white
(`box-shadow: … rgba(255,152,0,0.5)` becomes `rgba(255,255,255,0.5)`). Applied by #632;
the phase literals in the slice by #634.

### 2. One light-cycle pair, for all five sites

`--cycle-day` (`#ffeb3b`) and `--cycle-night` (`#7986cb`).

Day carries the **Tertiary value already documented as "Amber Light (light cycle
indicator)"**. That is the point of the choice: the card had a documented light-cycle
colour driving the controller icon, and a second, third and fourth yellow reporting the
same cycle elsewhere. One value now does both. It also removes the humidity tab's
`#ff9800`, which was a third claimant on the P3/flowering orange.

Night is **Indigo 300, not the Indigo 500 (`#3f51b5`) three sites had drifted to**.
Measured against `--surface` (`#1e1e1e`): 500 is **2.43:1**, under the 3:1 an icon or
1px rule needs; 300 is **4.83:1**. The pair is only useful if both halves are visible.

Named visual changes, applied by #632 (CSS/inline) and #634 (the js-held pairs):

| Site                               | Was                                 | Becomes                                                                             |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `plant-timeline.ts:244-253,630`    | `#ffc107` / `#3f51b5`               | day slightly lighter, night lighter and more legible                                |
| `growspace-logbook.ts:195-196`     | `#ffc107` / `#3f51b5`               | same                                                                                |
| `config-humidity-tab.ts:402-403`   | `#ff9800` / `#7986cb`               | day loses the flowering-orange collision; night unchanged                           |
| `growspace-card.styles.ts:344,349` | `--primary-light-color` / `#90a4ae` | off state goes blue-grey → indigo 300, and its `rgba(120,144,156,0.1)` tint follows |

`--primary-light-color` keeps its value and its job as the grow-light controller accent.
Two names for one value is tolerable here in a way `--gm-warning-color` was not (ADR 0039
§4): they agree, and they will keep agreeing because they are generated from one file.
Unrelated, and worth one sentence so the next reader does not assume otherwise:
`--primary-light-color-hover` and `-active` are white tints, not variants of this colour.

### 3. The tank shell is accepted; gradient tokens keep their direction

**Accepted as a permanent exception**: `#2c3e50`, `#4a6fa5`, `#34495e` and the rust
variants `#3e2723`, `#a54a4a`, `#4e342e`, across the cap and body gradients of
`growspace-tank-card.ts`. The tank is a skeuomorphic vessel — cap, ribs, body, liquid,
wave, window reflection — and these six values are the **shell's material**, slate plastic
and its rust warning variant. They carry no role: nothing else in the card can use them,
and a token nothing can reuse is not a token. The warning state is carried semantically by
the liquid, not by the shell. This is scene furniture in ADR 0040's sense, one step
outside three.js.

**Gradient tokens keep their direction, and stop tokens serve the rest.** The two
gradients at `:261` and `:271` carry the stops of `--secondary-gradient` and
`--danger-gradient` but run `to bottom`, and they are right to: a liquid column has a
physical up and down, where 135deg would read as a lighting artifact. The fix is not to
strip direction off the tokens — 135deg is the card's fill direction for buttons and
surfaces, and a directionless token is not a gradient — but to let a direction-bound
gradient compose the same stops:

- `--info-dark` (`#1976d2`) is added, mirroring the existing `--error-dark` (`#d32f2f`).
  Its absence was the only reason the liquid had to re-author the pair.
- The liquid becomes `linear-gradient(to bottom, var(--gm-info-color), var(--info-dark))`
  and its warning variant `linear-gradient(to bottom, var(--error-color), var(--error-dark))`.
  No visual change; the liquid is semantic (info = normal, danger = low), unlike the shell.
- This is #633's work, and it is the card-side half of #641's "the 3D tank's liquid and
  its label resolve to one colour".

### 4. The harvest green folds into `--primary-gradient`

`linear-gradient(135deg, #388e3c, #4caf50)` at `harvest-scoring-dialog.ts:571,597` and
`plant-harvest-tab.ts:251` folds into `--primary-gradient`
(`linear-gradient(135deg, #4caf50, #45a049)`). Harvest is the primary action on those
screens; it is not a fifth accent.

Named visual change: the fill's **light direction reverses**. Today it runs dark → light
along the diagonal; the token runs light → dark, and its dark stop is lighter, so the
button reads flatter and slightly brighter overall.

**The fold has a prerequisite, and it is the more interesting finding.**
`.md3-button.filled` has no shared rule: `ui.styles.ts` defines `.md3-button` and
`.md3-button.primary`, and the only `.filled` rule in the codebase is a local one in
`plant-actions-tab.ts:153`. Fifteen buttons carry `class="md3-button filled"`; twelve of
them get nothing from the class, and these three inline gradients are the _only_ reason
those three buttons are green at all. So #632 must define `.md3-button.filled` in
`ui.styles.ts` as `background: var(--primary-gradient)` **before** deleting the inline
styles, or the fold removes the fill instead of normalising it. That shared rule also
restyles the other twelve, which is a visual change worth its own review — and it is the
reason `--primary-gradient` currently has exactly one consumer outside `tokens.ts`.

The foreground on that fill is #636's question, not reopened here.

### 5. The genetics axis is documented, in Material

`--genetics-indica` (`#9575cd`, Deep Purple 300) and `--genetics-sativa` (`#fbc02d`,
Yellow 700), for the ratio bar at `strain-editor-view.ts:1989,1998`.

Indica/sativa ratio is strain data the user reads off a bar, not decoration, so it gets
documented for the same reason the light cycle does. The values come home to Material
because `#8b5cf6` / `#eab308` are Tailwind hues, which is what makes the bar read as
imported — but the substitutes were chosen on contrast, not on tidiness, and the violet
turned out to be a live failure. Against the `#333` track the old violet measures
**2.98:1**, just under the 3:1 a graphical object needs; the replacement measures 3.43:1.
The yellows both pass comfortably (6.59:1 → 7.63:1), and separation between the two
segments is unchanged at 2.2:1, so the bar reads the same. Deep Purple 500 (`#9c27b0`,
the `--stage-dry` value) was rejected — 300 is more legible on the track, and reusing the
stage value would invite the two to be confused.

The bar's `#333` track is not this decision: it is the surface ramp, ADR 0039 §3, applied
by #632.

### 6. The printed label and the letterbox are accepted, and the mechanism now exists

`label-preview.ts` (`#000` ×2, `#333` ×2) renders what a label **printer** puts on white
stock. It does not follow the card theme, and must not: a theme-following ink would print
invisible. `camera-capture.ts:97,130` is the letterbox behind a `<video>` element — black
is the absence of frame, not a surface colour.

Both are accepted permanently. So is the tank shell from §3.

**AC #3 could not be satisfied by prose, because the mechanism it names did not exist.**
DESIGN.md already asserted that accepted exceptions are "allowlisted in
`scripts/audit-design-tokens.mjs`", and ADR 0040 specified that they be allowlisted "by
file and line role, not by whole file" — but the script only had `EXEMPT_FILES`, a
whole-file list holding the token source and the shader. `camera-capture.ts`'s two `#000`
were being counted in the 148 while DESIGN.md described them as excluded.

This ADR implements it: `ACCEPTED_EXCEPTIONS`, keyed by **file plus the hexes that carry
the accepted role**, each with a reason, listed by `--exceptions`. A listed file is still
audited for every other value, so the next role-carrying literal added beside a letterbox
still counts. Hexes rather than line numbers because line numbers drift on any edit above
them and would silently start excluding the wrong site. An entry matching nothing prints a
warning, because a stale exception hides whatever replaced the literal.

While making the claim true, the sentence it came from turned out to be wrong in a second
way: of the four things DESIGN.md listed as allowlisted, the three.js `0x` literals and
`vpd-heatmap`'s `white`/`black` marker were never in the count in the first place — the
audit matches `#`-prefixed hex only. The sentence is corrected to distinguish _excluded by
the allowlist_ from _out of the matcher's reach_.

## Consequences

- Nine tokens added: `--phase-p1/-p2/-p3`, `--marker-now`, `--cycle-day`,
  `--cycle-night`, `--info-dark`, `--genetics-indica`, `--genetics-sativa`.
- The audit baseline ratchets **148 → 132**, all of it the exception allowlist (16
  literals across three files). No call site is migrated in this ADR's PR — #632/#633/#634
  own that, and this exists so they stop having to ask.
- Three visual changes are now _owed_ by the migrations, and each needs a look on a live
  card: the now-lines turn white, the day/night pairs converge, and the harvest buttons'
  gradient reverses direction. None is covered by a pixelmatch snapshot.
- `.md3-button.filled` being an undefined class is a defect this ADR found and did not
  fix. Twelve buttons render unstyled-by-class today. #632 fixes it as the prerequisite to
  §4, and it deserves its own before/after.
- Nothing added here shadows a Home Assistant variable, so `--divider-color` and
  `--error-color` remain the only `card-only` names (ADR 0036).
- With #630, #581, #608 and this, every decision the #576 sweep escalated is answered.
  The remaining colour work is migration, plus #636.
