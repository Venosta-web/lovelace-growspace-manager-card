# Decompose large dialogs into per-tab ViewModel adapters behind one `{vm-in, intents-out}` seam

The Irrigation Dialog (`irrigation-dialog.ts`, ~5171 lines, 66 `_render*` methods, 9 tabs) and Config Dialog (~3559 lines) interleave four responsibilities in one file: view-model derivation, rendering, [[DialogStateMachine]] wiring, and effects. Understanding "the Steering tab" means reading the whole dialog. Each tab is *already* a self-contained unit — ADR-0016 deliberately made the tabs the consolidation home — but the tab as a **module** has no **interface**: its derivation, render, SM reads, and effects are smeared across a 5000-line file with its eight siblings. There is a real, implicit seam (*ViewModel in, intents out*) that nine tabs are nine adapters of, but it is never named, so nothing can be tested or changed through it.

The card already proved the deeper shape in `features/plants`: a container builds a ViewModel atom from slices via a pure factory (`createStablePlantOverviewViewModel`), a [[StoreController]] subscribes, and presentational components render it. The large dialogs are the un-migrated remainder.

This is **internal implementation decomposition of one dialog**, not re-fragmentation into multiple user-facing dialogs. ADR-0007 (combined Feed & Water dialog) and ADR-0016 (crop steering consolidated into the Irrigation Dialog) keep these as single dialogs; that stays. The tabs are internal custom elements composed inside one host.

## Decision

Decompose a large dialog into:

- **[[Tab ViewModel]]** — one pure factory per tab, `createXTabViewModel($sm, $caps, …slice atoms) → ReadableAtom<XTabViewModel>`, each subscribing only to the atoms its tab needs. These are the deep modules; the leverage and test surface of the decomposition live here, not in the render component.
- **[[Tab Component]]** — a dumb presentational element, `@property .vm` in and [[Tab Intent]]s out, **with no `@state()` of its own**. All draft/interaction state stays in the [[DialogStateMachine]] (option b1). A Tab Component owns nothing, so the host may lazily render only the active tab and unmounting on tab-switch loses no draft.
- **[[Tab Intent]]** — a semantic UI-intent `CustomEvent` (`edit-tank-requested`, not an SM event). The host owns the Tab Intent → SM-event translation table, keeping the SM vocabulary out of the nine components.
- **[[Dialog Shell]]** — the host container (`features/irrigation/containers/irrigation-dialog.container.ts`), reduced to wiring: it owns the SM atom, the [[MutationRunController]] (ADR-0015), the [[Dialog Capabilities atom]], the shell ViewModel (nav rail / rail-group visibility / footer / active tab / toast), translates intents, and renders the active Tab Component with its Tab ViewModel.
- **[[Dialog Capabilities atom]]** — a single shared `computed` for the dialog's cross-tab derived state (visibility gates per ADR-0016, `volume_mode_capable` per ADR-0017, the Sizing-Mode label that relabels the Steering tab). A peer input to both the shell VM and every Tab ViewModel, **never re-derived per tab**. This is the seam that lets per-tab ViewModels exist without re-fragmenting the coupling ADR-0016/0017 consolidated.

Home: `features/irrigation/{viewmodels, components, containers}`, consistent with `features/plants` and the `2026-05-02-directory-migration` north star (everything consolidates into `features/`). The Irrigation Dialog is the reference decomposition.

Migration is strictly tab-by-tab: the [[Dialog Shell]] renders extracted `<irrigation-x-tab .vm=…>` alongside still-inline `_renderXTab()` methods, so each step leaves the dialog working. First slice = two reference adapters (one adapter is a hypothetical seam; two make it real):

1. **`overview`** — read-only (ADR-0016's trivial-SM tab). Proves the *derivation* half: shell VM + `$caps` atom + one VM factory, no intents/effects/drafts.
2. **`tanks`** — first draft tab. Forces the leaked `_tankDraft` / `_editingTankIndex` `@state()` *into* `DialogSM` (satisfying b1) and exercises the full intent → SM → effect → MutationRunController loop.

`steering` is migrated late, not first: its cross-tab Sizing-Mode coupling (ADR-0017) and confirm flow are the hardest case; prove the shape on overview + tanks first.

## Considered alternatives

- **One mega-ViewModel per dialog** (the literal `features/plants` shape) — rejected for a 9-tab dialog 5× the size: the interface becomes huge and the `computed` rebuilds the whole VM on any atom change (a Steering edit re-derives the Tanks VM). Per-tab factories give nine narrow seams that localize change and match how the tabs already gate independently.
- **Tabs hold their own local `@state()`** (option b2, as `features/plants` presentational components do) — rejected for dialogs: it surrenders the "runnable/testable from state alone" property the dialog SM and ADR-0015 are built on, and re-opens the inline-edit-read-after-CANCEL class of bug. The `features/plants` local-state pattern is deliberately not propagated into decomposed dialogs.
- **Tabs dispatch SM events directly** via a passed-down `dispatch` fn (intent-vocab ii) — rejected: it leaks the `DialogStateMachine` event union into all nine components, so a tab's test drags in the SM. Semantic Tab Intents keep each tab's contract a small, SM-ignorant event set.
- **Capability derivation duplicated in each tab VM** — rejected: re-fragments the cross-tab state ADR-0016/0017 consolidated. The shared [[Dialog Capabilities atom]] is the explicit counter to this.
- **Leave the dialogs as monoliths** — rejected: the implicit per-tab seam is real (ninefold), so the dialog's size is a depth problem, not just a length problem; the test surface stays the whole 5000-line component.

## Consequences

- New `features/irrigation/{viewmodels, components}` modules; `irrigation-dialog.ts` moves to `containers/irrigation-dialog.container.ts` and shrinks to wiring as tabs extract.
- The test surface splits three ways: the existing pure `irrigation-dialog-sm.test.ts` keeps testing transitions (now also holding tank/ec-ramp drafts); each Tab Component gets a mount-and-assert-intent test with a hand-built VM (no SM, no slices); each Tab ViewModel factory gets a pure input-atoms → VM-output test. The monolith stops being the only place to test a tab.
- `overview` is one adapter (hypothetical seam) until `tanks` lands; the tanks migration validates the `{vm-in, intents-out}` + `$caps` shape, and folds in the leaked-sub-state fix (candidate 3 of the architecture review).
- Config Dialog and the other large dialogs adopt the same shape incrementally afterward, reusing the Tab ViewModel / Tab Component / Tab Intent / Dialog Shell / Dialog Capabilities vocabulary.
