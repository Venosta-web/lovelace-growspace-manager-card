# Entity selection uses Home Assistant's picker as an add affordance, not as the field

Status: accepted

Every entity field in the config dialog is a plain text `<input>` backed by a `<datalist>` of raw
entity IDs: no friendly names, no icons, no area context, and a change handler that accepts any typed
string — so a typo saves cleanly and then silently matches nothing. Entity fields will use Home
Assistant's `ha-entity-picker` to *choose* an entity, while the chip list from #541 remains the
control that *holds* the chosen values. Both live behind `config-entity-multi-select`, which keeps its
current public API and owns forcing the picker's lazily-registered frontend chunk to load.

Nothing here is implemented yet. This ADR records the decision so #544's first acceptance criterion
is met and the implementation issue can be written against a settled design.

## This standardizes an existing precedent rather than introducing one

Issue #544 framed the choice as adopting "the first Home Assistant form primitive in this codebase."
That is true of the config interiors but false of the codebase: `ha-entity-picker` already ships in
`src/dialogs/chat-panel.ts` and `src/dialogs/briefing-panel.ts`, where it selects the conversation
agent. The decision on the table was therefore whether to standardize on what two dialogs already do,
or roll those two back — not whether to take the dependency at all.

The data-flow layering rule in `CLAUDE.md` is not implicated. It scopes to *growspace* data, and the
entity registry is not growspace data; `md3-entity-input` has always taken `hass` and read
`hass.states` directly.

## What decided the shape: only one of the two pickers can be registered

Home Assistant's pickers are not in the frontend's main bundle. They live in lazily-loaded chunks,
which produces the worst kind of failure: the element works during development, because a card editor
was opened at some point in the session and pulled the chunk in, and renders as an empty box on a
stranger's cold page load. `ha-dialog` and `ha-icon` working is not evidence either way — those are
main-bundle.

This was checked against the shipped bundle (`home_assistant_frontend-20260729.5`) rather than
assumed, and the findings decided the design:

- **`loadCardHelpers()` alone registers neither picker.** It resolves three small chunks, none of
  which defines either element. Any warming built on the bare call would be inert — and because the
  fallback below is silent, that inertness would never announce itself; the fallback would simply
  become the permanent path.
- **`ha-entity-picker` has a reachable registration path.** The entities card's `getConfigElement()`
  explicitly loads the one chunk in the bundle that defines it. So a round trip through
  `createCardElement({ type: 'entities', entities: [] })` → `getConfigElement()` registers it.
- **`ha-entities-picker` has none.** It is defined only in chunks that no card editor's
  `getConfigElement()` pulls. There is no equivalent round trip for the multi-value picker.

That asymmetry is why the chip list stays. A design where `ha-entities-picker` replaces the chip list
is not buildable on any mechanism that can be verified — it would register only when something else
in the session happened to render a `multiple: true` entity selector, which is exactly the
works-in-development, blank-on-cold-load failure this ADR exists to avoid. A design where
`ha-entity-picker` is the *adder* needs only the picker whose path is confirmed.

The stakes justified the check. In the chat and briefing panels the picker sits in an optional setup
banner; if it fails to register, the user configures the agent elsewhere. In the config dialog,
entity assignment is the only way to attach sensors to a growspace, so a registration failure would
brick configuration for exactly the fresh install this change is meant to serve. (On a hard reload
with no card editor opened first, the chat panel's picker did render — but with no warming code
anywhere in `src/`, that only shows the chunk *can* arrive on its own, not that it reliably will.)

## Decisions

- **The chip list is the field; the picker is the adder.** `config-entity-multi-select` keeps holding
  values as chips, and replaces its bare `<input list=...>` add affordance with `ha-entity-picker`.
  Single-value fields — currently inline `<input list=...>` markup duplicated per tab — use the
  picker directly.
- **The wrapper warms its own dependency**, via the entities-card editor round trip, in a
  `try`/`catch` whose rejection routes to the fallback. Warming at card bootstrap would tax
  dashboards that never open config; warming at dialog open would leak the concern into the dialog.
  The component that depends on the element is the component that loads it.
- **The fallback is the chip list without the picker adder** — the plain datalist input returns as
  the add affordance. This is a far smaller degradation than swapping a whole field, and it keeps
  #541's 44px touch targets, `aria-label`, `title`, and `:focus-visible` treatment on the primary
  path rather than only on the fallback.
- **The wrapper's public API does not change.** `.label`, `.values`, `.options`, and the
  `entity-values-changed` event stay exactly as they were. All eight consuming config tabs and their
  fourteen assertions are untouched, and the two add affordances cannot drift in what they emit
  because they are one component.
- **`entityOptions(domains, deviceClass)` remains the single filter source**, feeding the picker via
  `entityFilter` rather than being replaced by `includeDomains` / `includeDeviceClasses`. Two
  filtering mechanisms would eventually disagree about which entities are eligible, and the fallback
  affordance needs the `string[]` regardless.
- **`allow-custom-entity` is omitted.** That flag permits committing a free-typed string, which is
  precisely the silent-typo failure the change exists to remove. The two setup-banner call sites keep
  it; see the deviation below.
- **Unresolved entity references are never dropped.** A saved config may name an entity since
  renamed or removed. Home Assistant's picker derives its candidates from `hass.states`, where such
  an entity is absent entirely, so with `allow-custom-entity` omitted there is no prop that puts one
  on screen. Keeping the chip list makes this a non-problem rather than a mechanism to invent: an
  unresolvable value is simply a chip that renders its raw entity ID and a flag instead of a friendly
  name, removable like any other. Only the grower removes it. This is the same rule already recorded
  for [[AC Infinity Device]] pickers, which keep an already-saved entity in their option list even
  when the integration is unavailable, so existing configs never render blank.
- **Clearing emits an empty array.** Removing the last chip emits `[]`, never `undefined` and never
  an omitted key, normalized at the wrapper seam. Omitting emptied fields behind truthiness or length
  gates is a regression this codebase has already shipped once and fixed in #439.

## Scope

Both field kinds in the config dialog tabs are in scope. The single-entity fields are inline
`<input list=...>` markup duplicated per tab rather than a shared helper, so leaving them out would
have put a polished picker and a raw entity-ID datalist side by side in the same tab — more visibly
inconsistent than the uniformly poor state it replaced.

Out of scope, deferred to follow-up: the one-off dialogs (`ac-infinity-device-editor`,
`subarea-config-dialog`, `strain-editor-view`, `seeds-genetics-tab`, `irrigation-tanks-tab`), each of
which has its own option-source quirks. `md3-entities-input` has no consumers and is deleted.

## Consequences

- **The warming mechanism depends on a Home Assistant internal.** That the entities-card editor pulls
  the picker's chunk is an implementation detail of the frontend, not a promise, and it was verified
  against one frontend version. This is exactly why the fallback stays load-bearing: it is what
  survives Home Assistant reorganizing its chunks. Reviewers should treat "the fallback is dead code"
  as false.
- **Chip interaction coverage survives**, because the chip list survives — the add/remove/persistent-
  affordance tests from #541 keep testing real behavior. Only the picker itself is stubbed in vitest
  (no Home Assistant frontend in browser mode), so its keyboard and screen-reader behavior is
  inherited from Home Assistant and verified by hand. Tests assert the wrapper's contract: correct
  properties in, correctly normalized array out. Stating this plainly is preferable to leaving
  stubbed tests that resemble coverage.
- **The two setup-banner call sites are a known deviation.** `chat-panel.ts` and `briefing-panel.ts`
  keep `allow-custom-entity`. Changing agent-selection behavior inside an entity-picker refactor
  would be an unrelated behavioral change; it gets its own issue.
- **`ha-entities-picker` is rejected, not deferred.** If a future reader proposes it to remove the
  chip list, the blocker is registration, not preference — re-verify the chunk graph before
  reopening.
