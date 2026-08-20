# ADR 0041 — A Contradicting Fallback Is a Re-Authored Token

- Status: accepted
- Date: 2026-08-16
- Issue: #608 (decision), split off from #574 per ADR 0035 §8
- Related: ADR 0035 (binding-context sorting, §6 greys, §7 reds, §8 what splits off), ADR 0036 (portal token scope), ADR 0038 (#580, the literal equals a _different_ token's value), ADR 0039 (the roles the migration could not invent)

## Context

`var(--ha-name, <literal>)` is the load-bearing form in this card: it defers to the
Home Assistant theme and renders the literal only when the theme is silent about
that name. #580 dealt with literals that equal a _different_ token's value. This is
the inverse — **the fallback contradicts the token it backs** — and it is a live
rendering defect on any theme that omits the name, not tidiness.

Re-running the sweep at `47c93ad6` reproduces the issue's numbers:

| Family | Contradicting sites | Shape |
| --- | --- | --- |
| `var(--primary-color, <blue>)` | 26 | 13 × `#2196f3`, 12 × `#03a9f4`, 1 × `#22c55e`, against a documented `#4caf50` |
| `var(--error-color, …)` | 9 | `#ff5252` ×5, `#e53935`, `#d32f2f`, `#ef5350`, `#F44336`, against `#f44336` |
| `var(--divider-color, <opaque grey>)` | 10 | `#e0e0e0` ×3, `#ccc` ×3, `#333` ×3, `#eee`, against `rgba(255,255,255,0.12)` |
| `var(--secondary-text-color, <opaque grey>)` | 13 | `#aaa` ×4, `#666` ×4, `#444` ×2, `#9e9e9e` ×2, `#ccc` |
| Wrong token, not wrong value | 3 | an accent name backing an outline, a container tint and a severity badge |

The blues are not arbitrary. `#03a9f4` is Home Assistant's own default
`--primary-color` and `#2196f3` is Material Blue — these fallbacks were copied
from the platform's defaults, at a time before the card had a design system that
said primary is Vitality Green. That is why the class survived: it is internally
consistent with HA and inconsistent with `DESIGN.md`.

### The finding that decides the shape of the fix

**Every one of these names already has a canonical wrapper in the token layer.**

```
--gm-primary-color: var(--primary-color, #4caf50);
--text-secondary:   var(--secondary-text-color, rgba(255, 255, 255, 0.7));
--text-muted:       var(--secondary-text-color, rgba(255, 255, 255, 0.55));
```

A call site spelling `var(--primary-color, #2196f3)` is therefore not choosing a
fallback — it is **re-authoring a token that already exists**, and then getting it
wrong. Correcting the 26 hexes to `#4caf50` leaves 26 independent copies of one
decision, which is the condition that produced the drift in the first place.

`--divider-color` and `--error-color` differ: the card _declares_ them itself
(`card-only` in ADR 0036, withheld from the portal so the user's theme keeps
winning there). Inside the card their fallback is dead code; inside a portalled
dialog it is what renders.

## Decision

### 1. The fix is to reference the wrapper, not to correct the hex

For the names the card does **not** declare — `--primary-color`,
`--secondary-text-color` — every contradicting site becomes a bare reference to
the wrapper token:

| Was | Becomes |
| --- | --- |
| `var(--primary-color, #2196f3 \| #03a9f4 \| #22c55e)` | `var(--gm-primary-color)` |
| `var(--secondary-text-color, <opaque grey>)` | `var(--text-secondary)` or `var(--text-muted)` |

This satisfies the issue's first acceptance criterion by construction: there is no
per-site hex left to be right or wrong about. It is also pixel-identical under any
theme that defines the name, which every stock HA theme does — the change is
visible only in exactly the case the defect was about.

Bare is safe here because `--gm-primary-color` and the text roles are in **both**
`variables` and `portalVariables`, so they resolve in the card subtree and in the
portalled dialog host. Verified per file: all 14 touched components render under a
registered card or under `growspace-dialog-host`, both of which adopt one of those
blocks.

### 2. For `--divider-color` and `--error-color` the fallback _form_ stays; only the value is corrected

`var(--divider-color, rgba(255, 255, 255, 0.12))`, `var(--error-color, #f44336)`.

Going bare was considered and rejected. Directory is not a proxy for render tree:
`irrigation-ec-ramp-tab.ts` lives under `features/` and renders inside the
portalled irrigation dialog, where the card's declaration does not reach and the
theme may be silent. A bare reference there resolves to *nothing* — an invalid
declaration, strictly worse than a wrong colour. ADR 0035 §6 already says keep the
form; this ADR does not reopen it.

### 3. Which text tier a grey becomes is decided by role, not by luminance

`#666` and `#aaa` are near-invisible and near-bright respectively on the card's
dark ground, so a site rendering one today is certainly rendering the *theme's*
value; the literal only ever described the silent case. Matching its luminance
would preserve an accident. Chart titles, entry dates and detail text take
`--text-secondary`; axis chrome, placeholders and empty states take `--text-muted`.

### 4. `#ff5252` folds into `#f44336` here, not into `#ef5350`

ADR 0035 §7 folds the **bare** literal `#ff5252` into `--danger-chip` (`#ef5350`).
That is not this. In fallback position the literal is answering "what does
`--error-color` mean when the theme is silent", and the answer is `--error-color`'s
own value. All nine error fallbacks become `#f44336`; `error-boundary.ts`'s
`#d32f2f` reads as `--error-dark` intent, but it is spelled as a fallback for
`--error-color`, so it normalises with the rest rather than changing token.

### 5. Three sites are the wrong _token_, and one of them vindicates the issue's second branch

- `briefing-panel.ts` `.impact-badge[data-impact='low']` sits on a hardcoded
  `rgba(33, 150, 243, 0.2)` and is the low rung of a red/amber/blue severity set
  whose siblings already read `--error-color` and `--ai-amber`. It genuinely wants
  the info accent: **`var(--gm-info-color)`**. Recolouring it green would have put
  green text on a blue container. This is the only one of the 26; the issue's
  "some sites may want `--info-color`" branch is real but narrow.
- `plant-card.styles.ts` `.plant-card-rich:hover` backed `--primary-color` with
  `rgba(255, 255, 255, 0.2)` — an accent name holding an outline value. That value
  _is_ `--outline-hover`, so it becomes `var(--outline-hover)`.
- `plant-actions-tab.ts` `.action-card:hover` backed `--primary-color` with
  `rgba(76, 175, 80, 0.1)` — the documented `primary-container` role, which
  `DESIGN.md` carries but the runtime never implemented. It keeps the literal that
  thirteen other sites already spell; implementing `--primary-container` is
  follow-up work, not a colour decision.

**All three move rendered colour on every theme, and that is the point.**
`--primary-color` is part of the stock HA theme set, so at these sites the token
resolved and the _token_ was wrong, not the fallback: the plant card's hover
border painted a solid accent where the value it carried says a 20% white
outline, and the action card's hover painted a solid accent fill where the value
says a 10% green tint. The badge goes from green to blue. Correcting a wrong
token is a visible change by construction — unlike the wrong-_fallback_ class,
which is invisible until the theme goes silent.

`growspace-card.styles.ts` `.gs-icon-box` looks like a fourth and is not.
It backs `--divider-color` with an amber tint, so its fallback normalises with the
rest of the family. The amber intent behind it — the box wants a tertiary
container and outline, not a neutral divider — is a missing-role question in the
shape of ADR 0039 §5a and is left for that work rather than resolved by
recolouring here; its `var(--secondary-background-color, …)` sibling is a fifth HA
name outside this issue's families and is untouched.

### 6. Alpha imprecision is not contradiction, and stays out

~150 `--divider-color` and ~100 `--secondary-text-color` sites carry
`rgba(255,255,255,x)` fallbacks at a dozen different alphas. Those do not
contradict their token — they are imprecise about it, and ADR 0035 §6 already
decided they normalise. Sweeping them here would move rendered colour at ~40 sites
under a silent theme for a decision that is already made. **In scope for #608: the
opaque hexes only.** The alpha normalisation is filed separately.

### 7. The audit script gates the class rather than a comment asking nicely

`scripts/audit-design-tokens.mjs` gains a fallback contract: the four HA names it
knows about, each with the value its fallback is allowed to take —
`exact` for `--primary-color`/`--error-color`, and the
`rgba(255, 255, 255, x)` *family* for the two grey names, which is precisely the
line §6 above draws. `--fallbacks` lists violations, `--check` fails on any
increase, and the baseline records **0**. The class is closed rather than merely
cleared.

An ESLint rule was rejected for the same reason ADR 0035 §9 rejected it: the audit
script already has to encode the classification to produce the inventory.

## Consequences

- Under a theme that omits `--primary-color`, 26 sites change from Home Assistant
  blue to Vitality Green — the defect being fixed. The wrong-*fallback* work moves
  nothing under a stock theme. The wrong-*token* work moves three declarations on
  every theme: `plant-card`'s hover border, `plant-actions-tab`'s hover fill and
  the briefing panel's low-impact badge.
- `--gm-primary-color` goes from 24 to 50 uses and becomes the accent's single
  spelling. `--growspace-card-accent`, declared with the same definition and used
  nowhere, is now visibly a dead alias; deleting it is out of scope here.
- The remaining ~86 `var(--primary-color, #4caf50)` sites are *correct* and
  therefore untouched, so the wrapper rule is not yet uniform in the tree. Migrating
  them is mechanical and zero-risk, but it is a diff about consistency, not defects.
- `portal-token-scope.test.ts` now asserts the silent-theme case directly — the
  accent, both text tiers and the two withheld names — so the acceptance criterion
  "checked with a theme that omits `--primary-color`" is a test rather than a claim.
  Its probes adopt the token blocks explicitly, so what it proves is that the token
  layer resolves, not that a given call site sits where that layer reaches. The
  latter was checked by hand: every component touched here renders under a
  registered card or under `growspace-dialog-host`, and none is reachable from
  `src/cards/editors/`, which renders inside Home Assistant's own dialog and
  adopts neither block.
- The bare-literal count is unchanged at 148: this work moved fallbacks, and the
  audit only ever counted bare literals.
