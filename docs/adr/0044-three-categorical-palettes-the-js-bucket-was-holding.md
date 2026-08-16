# ADR 0044 — The Three Categorical Palettes the JS Bucket Was Holding

- Status: accepted
- Date: 2026-08-16
- Issue: #634 (the js-bucket migration, second slice), surfaced by the #576 sweep
- Related: ADR 0035 (binding-context sorting, §5a "this needs a new role"), ADR 0038 (stage palette canonical), ADR 0041 (a contradicting fallback is a re-authored token), ADR 0042 (§5, why strain data gets documented), PR #656 (the first slice, which documented the metric palette)

## Context

PR #656 took the `js` bucket from 86 literals to 38 and stopped, because what was left is
not more of the same work. Eight sites belong to other slices (#639's heatmap ramp,
#641's tank, and `sensor-renderer.ts:51`, which no open slice names). The other thirty
were classified on #634 as six groups, each needing a decision rather than a fold.

This ADR answers three of the six. They are the ones that share a shape: **a fixed
categorical set with one hue per member, where the legend names the member.** That is the
shape PR #656 already documented for the metric palette, with the argument ADR 0035 §5
supplies — `--series-1..4` is _ordinal_, meaning is positional, and a palette whose
reader learns "F2 is this green" is the opposite of that.

The remaining three groups — the irrigation/drain accents, the two stage-lookup fallbacks
and four one-offs — are role questions rather than palettes, and are escalated as their
own decision issue in the #630/#631 shape.

### The finding that changes one of the three

`growspace-nutrient-inventory-dialog-ui.ts:464` painted the list item's type chip with
`style="background:${color}22;color:${color}"` — an alpha suffix concatenated onto the
map's value. That is the shape #634's first comment told this migration to look for
before touching anything, and here it was already broken **before** the migration:
`base` has pointed at `var(--primary-color, #4caf50)` since before this work, and
`var(--primary-color, #4caf50)22` is not a colour. The declaration is dropped, so the
base chip renders with no tint while its icon, painted by the second declaration, keeps
its colour. The failure reads as a chip that was never styled.

Measured rather than argued, against the rendered component in
`growspace-nutrient-inventory-dialog-ui.tint.test.ts`: on a real chip the suffix form
computes to `rgba(0, 0, 0, 0)` for that value, and after the change all six chips paint a
distinct non-transparent tint.

## Decision

### 1. The genetics generation palette is documented

`--gen-p1` (`#9e9e9e`), `--gen-f1` (`#4caf50`), `--gen-f2` (`#8bc34a`), `--gen-bx1`
(`#ff9800`), `--gen-bx2` (`#f57c00`), `--gen-s1` (`#2196f3`), `--gen-cl` (`#e91e63`),
plus `--gen-unknown` (`#555555`) for a generation label the card does not recognise.
Values unchanged; `#555` is written out to six digits.

A breeding generation is strain data the reader looks up on a node, which is the argument
ADR 0042 §5 used to document the indica/sativa axis. Five of the seven values coincide
with a stage-palette colour while meaning generation — F1 is `--stage-veg`'s green, CL is
`--stage-mother`'s pink — which is exactly why #577 excluded them on intent and why they
are named rather than folded. Folding on the hex is the "match the literal, not the
intent" mistake #576 warns about in its own body.

`--gen-unknown` is grey rather than a hue for the same reason `--metric-unknown` is
white: an unmapped node should be visibly not one of the named generations.

### 2. The lineage relation is a triple, not two theme colours and an orange

The genetics minimap paints three relations to the focal node at once — focal `#4caf50`,
ancestor `#ff9800`, descendant `#2196f3` — so they become `--lineage-focal`,
`--lineage-ancestor`, `--lineage-descendant`. Values unchanged.

The tempting fold is `--gv-primary` and `--gv-secondary`, which the file already declares
and which carry those two values today. It is rejected because both are theme-derived:
`--gv-primary` is `var(--primary-color, #4caf50)` and `--gv-secondary` is
`var(--info-color, #2196f3)`. Under a theme that sets `--primary-color` to an orange, the
focal and ancestor arms collapse onto one hue and the minimap stops distinguishing the
two relations it exists to show. That is the same argument ADR 0042 §1 made for taking
the now-line out of the band palette: a set that must stay mutually distinguishable
cannot have half its members follow something that moves.

The minimap's **viewport rectangle** is not one of the three. It marks where the reader
is looking, not a relation to a node, and it takes `--gv-primary` — the file's own name
for the element in focus, and what `.tree-node.focal` already uses.

### 3. The nutrient product types are documented, and their chip stops concatenating

`--nutrient-bloom` (`#e91e63`), `--nutrient-calmag` (`#ff9800`), `--nutrient-root`
(`#795548`), `--nutrient-additive` (`#9c27b0`), `--nutrient-microbe` (`#00bcd4`).
Structurally identical to the metric palette: a fixed set, one hue each, named in the
legend beside the icon.

There is deliberately **no `--nutrient-base`**. Base feed follows the Primary, which is
where the map already pointed it, and a sixth token would re-author a value the theme
owns (ADR 0041).

That decision only holds if the chip stops concatenating, which is the fix in Context.
The tint moves into the stylesheet as
`color-mix(in srgb, var(--stock-c) 13%, transparent)` — the same fill pattern
`status.styles.ts` uses — and the template passes the colour as a custom property. The
mix resolves whatever the value is, so a `var()` reference and a hex behave alike, and
the hazard is removed rather than routed around by keeping every value a hex.

The rule fires on any `.type-icon`, where the inline declarations it replaces only
existed on chips the template had already coloured, so `--stock-c` carries
`var(--primary-color, #4caf50)` as its own fallback — the same default `stockColor()`
returns for a type the map does not know.

**Named visual change:** the base chip _gains_ the 13% tint it has been missing. The
other five are pixel-identical.

### 4. Plant sex is documented

`--sex-female` (`#4caf50`), `--sex-male` (`#2196f3`), `--sex-hermaphrodite` (`#ff9800`).
Values unchanged.

Sex is recorded data the badge reports, not a status, so it does not fold into the status
roles. Hermaphrodite's orange is a **fourth** claimant on the flowering/P3 hue, and it is
named for the same reason BX1's is: the claimants mean different things and should be
able to diverge without a rename.

### 5. Binding form follows the constraint, as before

Per ADR 0041 and PR #656's table: a site that **emits** the value into a shadow root
takes `var(--token, #hex)` with the token's own value as the fallback; a site that
**transforms** it takes the generated `token` map.

All twenty sites here emit — into inline styles, into SVG presentation attributes, or
into a custom property a rule then reads — so all twenty take the `var()` form. The one
site that transformed its value is the nutrient chip, and §3 removes the transformation
instead of moving the binding, because the transformation was broken.

## Consequences

- **Nineteen tokens added**: eight `--gen-*`, three `--lineage-*`, five `--nutrient-*`,
  three `--sex-*`. None shadows a Home Assistant variable, so `--divider-color` and
  `--error-color` remain the only `card-only` names (ADR 0036).
- The `js` bucket ratchets **38 → 18**, the whole audit **43 → 23**.
- One visual change is owed a look on a live card: the base nutrient chip's tint.
  Everything else is value-identical, and all 20 pixelmatch snapshots are unchanged.
- `growspace-nutrient-inventory-dialog-ui.tint.test.ts` keeps the alpha-suffix defect from
  coming back, in the shape `phase-token-suffix.test.ts` established.
- Three groups remain undecided and are escalated rather than improvised: the irrigation
  and drain accents (which carry the phase family's alpha-suffix constraint), the two
  stage-lookup `?? fallback` arms that #624's table does not cover, and four one-offs
  (`hero-ui.ts:1010`, `strain-editor-view.ts:1162`, `plant-overview.container.ts:647`,
  `snapshots-dialog.ts:310`).
