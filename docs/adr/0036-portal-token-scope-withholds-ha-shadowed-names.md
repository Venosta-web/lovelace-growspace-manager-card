# ADR 0036 — The Portal Gets Every Token Whose Name the Card Invented

**Status:** Accepted
**Relates to:** #579 (this decision), #591 (the regression that made it urgent), #576 (its `src/dialogs` slice unblocks), #608 (the shadowing is the same question, asked of values), ADR 0035 (the token source this extends)

## Context

`growspace-manager-card.ts:138-141` creates `growspace-dialog-host` with
`document.createElement` and appends it to `document.body`. In the flattened
tree it is therefore a **sibling** of the card, not a descendant, and inherits
nothing from the `:host` block in `src/styles/variables.ts` where every
`--stage-*`, `--gm-*`, `--font-size-*` and `--border-radius-*` is declared. The
host had no `static styles` at all, and no file under `src/dialogs/` imported
`variables`.

### This stopped being theoretical when #591 landed

PR #591 migrated the dialog font sizes onto the type ramp, correctly by the rules
in force at the time. Those references are bare, and in the portal a bare
`var(--font-size-sm)` resolves to nothing — the declaration is invalid at
computed-value time, so `font-size` falls back to the inherited value and the text
renders at whatever size it inherits from `body` rather than at its ramp step.

Sweeping `src/dialogs/` against the generated token list:

| | Count |
| --- | --- |
| Bare references that do not resolve in the portal today | **131** (all `--font-size-*`, across 25 files) |
| Bare references to an HA-shadowed name (resolve fine, from the theme) | 17 |
| `var(--token, fallback)` where the fallback matches the token | 249 |
| `var(--token, fallback)` where the fallback differs from the token | 91 |

`strain-library-dialog.ts` (21), `briefing-panel.ts` (12) and
`strain-editor-view.ts` (12) carry the most. So #579's own "Not blocking — this
is an improvement, not a prerequisite" is no longer true: dialog type is
mis-rendering in production now, and injecting the tokens fixes all 131 in place
without touching a call site.

### The framing question — "which subset is safe?" — has a measurable answer

#579 proposes splitting `variables.ts` into a design-token layer and a
component-styling layer, on the grounds that injecting it wholesale would
"silently restyle the entire dialog subtree" because tokens like
`--divider-color`, `--strain-input-bg` and `--growspace-card-bg` currently
resolve from Home Assistant's theme.

Only the first of those three is true, and the general rule is narrower than a
layer split. A token can only take something away from the portal if **Home
Assistant defines a custom property of the same name**. Of the 94 runtime tokens,
exactly **two** do:

- `--divider-color` — the card declares `rgba(255, 255, 255, 0.12)`, HA defines it too
- `--error-color` — the card declares `#f44336`, HA defines it too

Every other name is one the card invented (`--strain-input-bg`, `--gm-*`,
`--stage-*`, `--series-*`, `--font-size-*`, …). HA never sets those, so declaring
them on the portal cannot displace a themed value — it can only fill in what
resolves to nothing today. `--growspace-card-bg` is listed in the issue beside
`--divider-color`, but it is `var(--card-background-color, #1e1e1e)`: a
card-invented name whose *value* defers to the theme, so injecting it keeps
deferring.

The 91 differing fallbacks land the same way: 84 are `--divider-color`, 4 are
`--error-color`, and 3 are stragglers whose fallback drifted from the token.

## Decision

### 1. The portal receives every token except the names Home Assistant also defines

`--divider-color` and `--error-color` are marked `scope: 'card-only'` in
`tokens.ts` and withheld from the portal block. Inside the card they shadow the HA
theme, deliberately or not; on the portal the theme keeps winning, which is what
the dialogs do today and what #579's third acceptance criterion requires.

This is a **name** rule, not a taxonomy. "Design token vs component styling" is a
judgement call re-litigated per token; "does Home Assistant define this name" is a
fact, checkable in one grep, and it is the only property that decides whether
injection can take something away.

### 2. The exclusion list is generated, and shared tokens that reference it are resolved

`portalVariables` is emitted from the same `tokens.ts` source as `variables`, per
ADR 0035 — a hand-written second block is the parallel-palette failure that ADR
exists to prevent.

One shared token references a withheld one: `--gm-error-color` is
`var(--error-color, #f44336)`. Left alone it would resolve through the card's
declaration inside the card and through HA's theme in the portal — the exact
split #579 complains about for `--gm-warning-color`, reintroduced by the fix. The
generator therefore **inlines references to card-only tokens** in the portal
block, emitting `--gm-error-color: #f44336`. The rule is mechanical and applies to
any future card-only token.

`--gm-warning-color` needs no such treatment and is the AC's example for a
precise reason: it is `var(--warning-color, #ff9800)`, and the card does not
shadow `--warning-color`. Both subtrees read the same themed value, so it
resolves identically — because of what the card does *not* declare, not because
of the injection.

### 3. The guard is a computed-value comparison, derived from the token list

`src/styles/portal-token-scope.test.ts` mounts two probe elements — one adopting
`variables`, one `portalVariables` — and asserts, for every shared token, that
`getComputedStyle` agrees across them. The list comes from the generated module,
so a token added later is covered without touching the test, which is what #579's
fourth criterion asks for.

Two details the test has to get right, both found by running it:

- `tests/setup.ts` simulates an HA theme at `:root` **using the card's own values**
  for `--divider-color` and `--error-color`. A naive comparison passes under that
  fixture whether or not the inlining in decision 2 exists. The test therefore
  re-themes those two names to a distinctive value first — and with that in place,
  reverting the inlining fails the test, which is the check that it guards anything.
- Whether a withheld name is *declared* has to be asserted on the stylesheet text,
  not on computed style: in the portal those names still resolve, from the theme.

The host's own test asserts `GrowspaceDialogHost.styles === portalVariables`, so
the block cannot be silently detached from the element that carries it.

### 4. `src/dialogs/` may now use bare token references

The [[Token Fallback Form]] carve-out for `src/dialogs/` is retired for
card-invented names. Two exceptions remain, and they are the same two names: a
site that wants the user's divider or error colour keeps `var(--divider-color, …)`,
because that is a deliberate deferral rather than a workaround. This unblocks
#576's `src/dialogs` slice from having to write fallbacks.

### 5. The shadowing itself stays open

That the card declares two properties whose names belong to Home Assistant is the
root cause, and this ADR does not fix it — it contains the blast radius. Renaming
them (66 `var(--error-color, #f44336)` sites) is a migration of its own, and it
asks #608's question — which value is wrong — rather than this one. Recorded on
#608 rather than opened as a third issue about the same two names.

Rejected: **stop portalling the host**, listed as #579's third option. It removes
the class of bug outright, but the portal exists so dialogs escape the card's
stacking and overflow context, and unwinding that is a far larger change than the
one this bug justifies.

## Consequences

- 131 bare `var(--font-size-*)` in `src/dialogs/` start resolving. Dialog text
  that has been rendering at its inherited size since #591 renders at its ramp
  step — a deliberate, visible correction, and the reason this lands before the
  colour migrations rather than after.
- The 249 sites whose fallback already matches its token are unaffected; the 91
  whose fallback differs are unaffected too, because 88 of them name a withheld
  token and the fallback keeps applying.
- Anyone adding a token now decides whether it is card-only. The default is
  shared, and the wrong default is only reachable by inventing a name Home
  Assistant already uses — which the guard test surfaces as a cross-subtree
  mismatch.
- A second portalled component would need the same block. The card's editors were
  checked and reference no card tokens, so the host is the only site today.
