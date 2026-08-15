# ADR 0035 — Colour Tokens: Sort by Binding Context, Generate from One Typed Source

**Status:** Accepted
**Relates to:** #574 (this decision), #564 (token foundation), #565/#577 (stage migration), #579 (dialog token scope), #580 (literal equals a different token's value)

## Context

`DESIGN.md` and `src/styles/variables.ts` drifted: the doc specified a
`supporting-sm` type step and a `rounded.full` radius that the runtime never
implemented, so call sites invented their own values. #564 closed that
particular hole and proved a migration on one file. #565/#577 then migrated the
plant-stage colours where intent and literal agreed.

What remains is colour, and #574 framed it as three groups sorted by **hue** —
neutral greys, chart tints, alternate reds — each needing a human call on where
it maps. Sweeping the tree against that framing does not hold up. Four facts
contradict it.

**1. The count does not reproduce.** #574's "203 literals across 53 files" is
arithmetic off #564's audit (259 colour findings − 56 stage sites), and that
audit was an ad-hoc pass — nothing in `scripts/` can re-run it. Sweeping
`src/**/*.ts` today under one consistent exclusion set — no `variables.ts`, no
test files, no comment lines, no issue-reference false positives such as `#473` —
finds **870 hex occurrences across 110 files**, of which **529 sit in
`var(--token, #hex)` fallback position** and **341 across 64 files are bare**.
Even after #577, 24 bare `#ff9800` and 52 bare `#4caf50` remain,
because #577 deliberately migrated only sites where intent and value agreed.
Acceptance criteria written against an unreproducible number are unfalsifiable.

**2. Most "untokenised" greys are tokenised.** As above, 529 of the 870 hex
occurrences sit in *fallback* position: `var(--secondary-text-color, #666)`,
`var(--divider-color, #ccc)`. #574's stated correctness argument — that a literal
grey does not adapt to a light Home Assistant theme — does not apply to these.
They defer to the HA theme and adapt correctly; the fallback only renders when
HA is silent. The genuinely bare greys are concentrated in `heatmap-3d.ts`,
`label-preview.ts`, `genetics-tree-view.ts` and `growspace-card.styles.ts`.

**3. Hue does not predict the answer; binding context does.** A bare
`color: #9e9e9e` in `heatmap-3d.ts`, a `var(--secondary-text-color, #666)` in
`tank-water-chart.ts`, a `'#ff5252'` string in `features/environment/constants.ts`
and an inline `style="color:#81c784"` need four different answers, and three of
them are "group 1 or 2" by hue. The distribution of the ~341:

| Binding context | Occurrences | Can a CSS token reach it? |
| --- | --- | --- |
| CSS declarations in `css` templates | 185 | Yes |
| JS data strings (viewmodels, constants, models) | 95 | No — `var()` is inert here |
| Inline `style=` attributes in templates | 34 | Yes, within the component's shadow root |
| Gradient stops | 27 | Yes |

These counts are `scripts/audit-design-tokens.mjs`'s output, which is authoritative — re-run it rather than quoting this table.

**4. No file in `src/dialogs/` imports `styles/variables`.** Verified across the
whole directory. That is the actual cause of #579 — portalled dialogs inherit
nothing from the `:host` block — and it means the `var(--token, #hex)` fallback
form is currently load-bearing there. It is a missing import, not a law.

One class fits neither #574 nor #580 and is called out here so it is not lost:
**the fallback contradicts the token it backs.** `var(--primary-color, #03a9f4)`
appears 17 times, but primary is `#4caf50` — an HA theme that does not define
`--primary-color` renders light blue where the design system says green. Same
shape as `var(--divider-color, #333)` against a documented
`rgba(255,255,255,0.12)`. #580 is "the literal equals a *different* token's
value"; this is "the fallback contradicts *its own* token".

## Decision

### 1. Colour work is sorted by binding context, not by hue

Hue answers *which* token a site should use. Binding context answers *whether a
token can reach the site at all*, and that is what decides whether the follow-up
migration is mechanical. The four buckets in the table above are the unit of
work; hue is a secondary question resolved inside each bucket.

### 2. `src/styles/tokens.ts` is the single typed source; both the runtime and the doc are generated from it

```
tokens.ts  ──generate──▶  variables.generated.ts   (the lit `css` block)
     └─────generate──▶  DESIGN.md frontmatter    (the YAML palette block)
```

`DESIGN.md` already carries a machine-readable frontmatter block (lines 1–159:
`colors`, `typography`, `rounded`, `elevation`, `spacing`). Hand-authoring
`tokens.ts` next to it would create a *second* structured palette and reintroduce
the exact drift this effort exists to end. Generating the frontmatter instead
makes the doc a derived artifact that cannot drift by construction.

The direction is TypeScript → YAML, not the reverse, because TypeScript is the
authoring surface that is typed, autocompleted and refactorable; YAML embedded in
a markdown file never will be. A CI *check* that the two agree was the weaker
alternative: it tells you they diverged, whereas generation means they cannot.

**The frontmatter is incomplete and completing it is part of this work.** It
carries no stage colours at all — `--stage-veg` … `--stage-mother` live only in
`variables.ts` and in DESIGN.md's *prose* §"Plant Stage Colors". They move into
`tokens.ts` with everything else.

### 3. Generation emits a committed `.generated.ts`, guarded by a no-op check

`variables.generated.ts` is committed — reviewable diffs, no runtime cost —
carries a do-not-edit banner, and CI asserts that regenerating it produces no
change. The banner deters the accidental hand-edit; the check catches it when the
banner does not.

The alternative, `unsafeCSS(tokens.surface)` interpolation in a hand-written
`variables.ts`, needs no codegen and cannot fall out of sync, but `unsafeCSS` is
used nowhere in this repo today and it puts every token value behind a call.
Rejected as a new pattern bought for a problem the no-op check already closes.

### 4. There is a JS-side seam, because 95 literals are not CSS

`features/environment/constants.ts`, `overview-tab.viewmodel.ts`,
`schedules-tab.viewmodel.ts`, `crop-steering-model.ts` and
`genetics-tree-view.ts`'s generation map hold colours as plain data. `var()` is
inert in most of these. Importing named constants from `tokens.ts` is what makes
this bucket migratable at all, and it makes the viewmodels testable against names
instead of hexes.

This has a test cost: `env-series.test.ts:60` asserts on the literal `'#ff5252'`.

### 5. The series palette is ordinal, not semantic, and not derived

`_kpiCard(label, value, unit, accent)` in `irrigation-water-analytics-tab.ts`
receives `#4fc3f7` for the first tile, `#81c784` for the second, `#ce93d8` for
the third. It is a rotating accent set, not a per-metric meaning. It becomes four
ordinal slots — `--series-1` … `--series-4` (`#4fc3f7`, `#81c784`, `#ce93d8`,
`#a5d6a7`) — documented as *categorical, use in order*, which is the contract the
code actually honours.

Semantic names (`--series-water`, `--series-yield`) were rejected as encoding a
fiction the call sites do not respect. `color-mix` derivation from the primaries —
the trick the status tokens use — was rejected on two grounds: it is only
*approximately* the current values, so ~30 sites lose pixel-identity for no system
gain, and it permanently forecloses a series colour that is not a tint of an
existing primary. `#81c784` and `#a5d6a7` are two distinct tints of one hue that a
single derivation would collapse.

The empty-state accent already passes `rgba(255,255,255,0.4)`, which is the
documented Disabled Text role and needs no new token.

**`#69f0ae` is not a series colour**, despite #574 listing it under group 2. All
four uses are in `add-plant-dialog.ts` as foreground text on translucent-green
containers (`.wizard-step.done`, `.strain-option:hover`, `.sibling-item.selected`,
each over `rgba(76,175,80,0.06–0.2)`). That is the *on-primary-container* role,
which DESIGN.md documents as `#4caf50` — and `#4caf50` composited over
`rgba(76,175,80,0.2)` on `#1e1e1e` yields **4.26:1**, below AA for normal text,
where `#69f0ae` yields **8.36:1**. The literal is an accessibility fix, not
drift. It is promoted as `--on-primary-container-bright` rather than folded into
the documented value, and DESIGN.md records the contrast reason so the next
migration does not "correct" it back.

### 5a. Not every colour role belongs to a group

The `#69f0ae` case generalises: a literal can be neither a grey, nor a series
colour, nor a variant of a documented hue, but a **missing role**. The audit
script's inventory is what surfaces these, and the migration issues must allow
"this needs a new role in DESIGN.md" as an outcome rather than forcing every
literal into one of #574's three buckets.

### 6. Greys: migrate the bare ones, normalise the fallback *values*, keep the fallback *form*

Three sub-populations, three answers:

- **Bare greys** (`heatmap-3d.ts`, `label-preview.ts`, `genetics-tree-view.ts`,
  `growspace-card.styles.ts`) — migrate to tokens.
- **Fallback greys with a defensible value** — keep `var(--ha-token, …)`.
  Deferring to the HA theme first is correct and stays. What does not stay is five
  different opinions about what "secondary text" looks like when HA is silent, so
  the fallback *values* are normalised to the documented
  `rgba(255,255,255,x)` roles.
- **Fallback greys whose fallback contradicts the token** — out of scope here,
  see Decision 8.

### 7. Reds: `#ff5252` folds into `#ef5350`; `#d32f2f` is promoted

`#f44336` (Alert Red) and `#ef5350` (documented lighter chip-context danger) both
stand. `#ff5252` (11 uses, undocumented) folds into `#ef5350` — nothing in
DESIGN.md justifies two lighter reds and the sites choose between them
arbitrarily. `#d32f2f` is promoted to `--error-dark`: two call sites
(`confirm-delete-dialog.ts:92`, `quick-note-input.ts:157`) already reach for
`var(--error-color-dark, …)`, which is not part of the documented HA theme
variable set the card otherwise relies on — so it is very likely rendering the
fallback in practice. **Confirm against a live HA instance before migrating**;
if HA does define it, the promotion still stands but those two sites keep the
[[Token Fallback Form]] rather than becoming bare references.

Case variants (`#FF9800`, `#2196F3`, `#4CAF50` in the irrigation viewmodels,
`crop-steering-model.ts` and `irrigation-drain-ec-tab.ts`) mostly disappear with
the migration rather than being normalised as a separate pass.

### 8. What splits off

- **The wrong-fallback class** (`var(--primary-color, #03a9f4)` and friends) gets
  its own issue, on the precedent #580 already set: the question is "which value
  is wrong", not "which token maps here", and one of its instances is a live
  rendering defect rather than tidiness.
- **#579 (dialog token scope)** stays its own issue. Adding `variables` to each
  dialog's `static styles` dissolves the fallback-form carve-out and makes the
  migration rule uniform, but it is a ~40-file change with real visual-regression
  surface; bundled into a colour decision it makes both harder to review. If it is
  rejected or deferred, the carve-out is permanent and the audit script encodes it.

### 9. `scripts/audit-design-tokens.mjs` replaces the unreproducible count

It emits the inventory classified by binding context, and every remaining issue is
anchored on its output rather than on #564's frozen numbers. It lands **advisory
only** with a baseline, and becomes the CI gate on new bare hex once the backlog
is cleared.

It is the gate rather than an ESLint rule because the legitimate exceptions —
fallback form inside `src/dialogs/`, gradient stops, `tokens.ts` itself — are a
classification an ESLint selector cannot express, and the script has to encode
that classification anyway to produce the inventory.

### 10. Landing order

```
#574 (this ADR + DESIGN.md + tokens.ts + codegen + audit script)
  └▶ #579 (dialog token scope)
       └▶ four migration issues, sliced by binding context
```

#580 and the new wrong-fallback issue are independent and land whenever.

#574 goes first despite #579 being described as the prerequisite: #579's fix *is*
importing `variables`, so that file wants to be in its final generated form before
~40 files start depending on it. The audit script lands with #574 so every
subsequent PR can quote a before/after count.

Migrations are sliced by **binding context**, sub-sliced by feature area only
where a bucket is too large to review — realistically only the CSS-declaration
one. The buckets have different mechanics and different risk: a JS-data migration
is a typed refactor with test fallout, a gradient-stop migration is pure CSS with
visual risk. `irrigation-water-analytics-tab.ts` will appear in three separate
issues; each should say so, or someone will think it is already done.

## Consequences

- `variables.ts` stops being hand-edited. Anyone adding a token edits
  `tokens.ts`; forgetting to regenerate fails CI rather than shipping drift.
- DESIGN.md's YAML block becomes a generated region inside a hand-written
  document. Its prose sections stay hand-written, which means prose can still
  drift from the palette — generation fixes the structured half only.
- Folding `#ff5252` into `#ef5350` is a visible colour change at 11 sites and
  breaks `env-series.test.ts:60`.
- The 95 JS-layer literals become imports, so a colour change in `tokens.ts` now
  reaches viewmodel logic and can move snapshot and unit assertions that currently
  hardcode hexes.
- Until #579 lands, `src/dialogs/*` keeps the `var(--token, #hex)` form and the
  audit script must not flag it. If #579 is abandoned, that carve-out is permanent
  and the migration has two rules instead of one.
- The audit script is advisory for the whole migration window. During that window
  nothing prevents a new bare hex from landing; the gate only bites at the end.
