# Entity fields are Home Assistant pickers

Status: accepted

Every entity field in the config dialog is a plain text `<input>` backed by a `<datalist>` of raw
entity IDs: no friendly names, no icons, no area context, and a change handler that accepts any typed
string — so a typo saves cleanly and then silently matches nothing. Entity fields become Home
Assistant's pickers outright: `ha-entity-picker` where one entity is chosen, `ha-entities-picker`
where several are. The chip list added in #541 is retired from the primary path and survives only as
the fallback. `config-entity-multi-select` remains as the seam, keeping its current public API and
owning the load of the picker's lazily-registered frontend chunk.

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

## What is verified about registration

Home Assistant's pickers are not in the frontend's main bundle. They live in lazily-loaded chunks,
which produces the worst kind of failure: the element works during development, because a card editor
was opened at some point in the session and pulled the chunk in, and renders as an empty box on a
stranger's cold page load. `ha-dialog` and `ha-icon` working is not evidence either way — those are
main-bundle.

This was checked against the shipped bundle (`home_assistant_frontend-20260729.5`) rather than
assumed, by enumerating every `getConfigElement()` call site in all 1104 chunks:

- **`loadCardHelpers()` alone registers neither picker.** It resolves three small chunks, none of
  which defines either element. Any warming built on the bare call would be inert — and because the
  fallback below is silent, that inertness would never announce itself; the fallback would simply
  become the permanent path.
- **`ha-entity-picker` is defined in exactly one chunk**, `576`, which ten `getConfigElement()` call
  sites load.
- **`ha-entities-picker` is defined in seven chunks**, three of them reachable the same way. The
  calendar card editor is the cheapest path in the bundle: it pulls `576` and `28377` together, so
  one round trip registers **both** pickers.

An earlier revision of this ADR claimed `ha-entities-picker` had no reachable registration path and
rested the whole single-vs-multi decision on that. The enumeration above disproved it. The decision
recorded here is a design preference, arrived at with the constraint removed.

The stakes justified the check. In the chat and briefing panels the picker sits in an optional setup
banner; if it fails to register, the user configures the agent elsewhere. In the config dialog,
entity assignment is the only way to attach sensors to a growspace, so a registration failure would
brick configuration for exactly the fresh install this change is meant to serve. (On a hard reload
with no card editor opened first, the chat panel's picker did render — but with no warming code
anywhere in `src/`, that only shows the chunk *can* arrive on its own, not that it reliably will.)

## What `ha-entities-picker` actually does

Read from chunk `28377` rather than assumed, because three of the decisions below turn on it:

- It renders **one `ha-entity-picker` row per value**, plus a trailing empty picker as the adder. It
  is already the list-plus-adder shape the chip list was hand-building.
- **Clearing a row removes that value.** `_entityChanged` filters out a row whose picker is cleared;
  there is no separate remove button.
- **It emits `value-changed` with a `string[]`**, and clearing the last row emits `[]` — never
  `undefined`, never an omitted key.
- It forwards `entityFilter`, `includeDomains`, `excludeEntities` and friends to every row, and
  excludes already-selected entities from the adder.
- It does **not** forward `allowCustomEntity` to its rows, so free-typed strings are not reachable
  through it at all.
- A row whose value names no live entity renders Home Assistant's own
  `ui.components.entity.entity-picker.unknown` — *"Unknown entity selected"* — rather than a blank
  box, and the value passes through every mutation untouched.

## Decisions

- **The field is the picker.** `config-entity-multi-select` becomes a thin wrapper over
  `ha-entities-picker`; single-value fields — currently inline `<input list=...>` markup duplicated
  per tab — use `ha-entity-picker` directly. One Home Assistant-native control per field, rather than
  a bespoke chip list stitched to a borrowed adder.
- **The wrapper's public API does not change.** `.label`, `.values`, `.options` and the
  `entity-values-changed` event stay exactly as they are; the wrapper translates `.values` → `.value`
  and Home Assistant's `value-changed` → `entity-values-changed`. All eight consuming config tabs and
  their fourteen assertions are untouched, which is the whole reason the wrapper survives rather than
  the tabs calling `ha-entities-picker` themselves.
- **The wrapper loads its own dependency**, via a card-editor `getConfigElement()` round trip in a
  `try`/`catch` whose rejection routes to the fallback. Loading at card bootstrap would tax
  dashboards that never open config; loading at dialog open would leak the concern into the dialog.
  The component that depends on the element is the component that loads it.
- **The fallback is the existing datalist chip control**, rendered whole when registration fails. A
  full-field swap is a larger degradation than the alternative design would have had — accepted
  deliberately, in exchange for the primary path being one native control.
- **`entityOptions(domains, deviceClass)` remains the single filter source**, passed as `entityFilter`
  rather than being replaced by `includeDomains` / `includeDeviceClasses`. Two filtering mechanisms
  would eventually disagree about which entities are eligible, and the fallback needs the `string[]`
  regardless.
- **`allow-custom-entity` is omitted** on single-value fields. That flag permits committing a
  free-typed string, which is precisely the silent-typo failure this change exists to remove. Multi-
  value fields cannot opt in even by accident. The two setup-banner call sites were deferred to #599
  and now lose the flag too (#642); see the resolution below.
- **`reorder` is left off.** No config field attaches meaning to the order of its entities, so drag
  handles would offer an interaction that changes nothing. Turning it on later is a one-property
  change if a field ever does care.
- **Unresolved entity references are never dropped.** A saved config may name an entity since renamed
  or removed. Home Assistant handles this natively — the row renders "Unknown entity selected" and
  the value survives every mutation — so the reference stays visible and only the grower removes it,
  by clearing its row. Silently discarding one on save would lose configuration the grower never
  touched. This is the same rule already recorded for [[AC Infinity Device]] pickers, which keep an
  already-saved entity in their option list even when the integration is unavailable.
- **Clearing emits an empty array.** `ha-entities-picker` already emits `[]` when the last row is
  cleared; the wrapper normalizes at its seam so this holds on the fallback path too. Omitting
  emptied fields behind truthiness or length gates is a regression this codebase has already shipped
  once and fixed in #439.

## Scope

Both field kinds in the config dialog tabs are in scope. The single-entity fields are inline
`<input list=...>` markup duplicated per tab rather than a shared helper, so leaving them out would
have put a polished picker and a raw entity-ID datalist side by side in the same tab — more visibly
inconsistent than the uniformly poor state it replaces.

Out of scope, deferred to follow-up: the one-off dialogs (`ac-infinity-device-editor`,
`subarea-config-dialog`, `strain-editor-view`, `seeds-genetics-tab`, `irrigation-tanks-tab`), each of
which has its own option-source quirks. `md3-entities-input` has no consumers and is to be deleted.

## Consequences

- **#541's chip work leaves the primary path.** The 44px touch targets, `chip-remove` control,
  `aria-label`/`title` treatment and `:focus-visible` styling now apply only to the fallback. This is
  a real cost of choosing the native control, and reviewers of #541 should know their work was not
  discarded but demoted. Accessibility on the primary path is inherited from Home Assistant.
- **Chip interaction coverage stops testing the shipped path.** The add/remove/persistent-affordance
  tests still pass, but against the fallback. The picker itself is stubbed in vitest (no Home
  Assistant frontend in browser mode), so its keyboard and screen-reader behavior is verified by hand,
  not in CI. Tests assert the wrapper's contract: correct properties in, correctly normalized array
  out. Stating this plainly is preferable to leaving stubbed tests that resemble coverage.
- **The registration mechanism depends on a Home Assistant internal.** That a card editor pulls the
  pickers' chunks is an implementation detail of the frontend, not a promise, and it was verified
  against one frontend version. This is exactly why the fallback stays load-bearing: it is what
  survives Home Assistant reorganizing its chunks. Reviewers should treat "the fallback is dead code"
  as false.
- **The two setup-banner call sites no longer deviate.** `chat-panel.ts` and `briefing-panel.ts` kept
  `allow-custom-entity` while this ADR was written, because changing agent-selection behavior inside
  an entity-picker refactor would have been an unrelated behavioral change. #599 resolved that
  question: growers select an existing conversation agent, so the flag is removed there too and the
  rule in Decisions holds without exception. Implementation is tracked in #642 — see the resolution
  below.

## Resolution of the setup-banner deviation (#599)

`allow-custom-entity` is removed from both agent pickers. A grower selects a conversation agent that
`hass.states` already has, and nothing else.

The counter-argument the issue raised was naming an agent from an integration not yet loaded. It does
not survive contact with the two call sites. Both banners render only when no agent is configured —
`_renderAgentSetup()` behind `aiUnavailable`, `_renderAiUnavailable()` behind `!briefing.ai_available`
— and both pickers are bound to an empty local draft (`agentDraft`, `_selectedAgent = ''`), never to
a saved entity ID. Removing the flag therefore cannot strand a configuration that already exists; it
only removes the ability to commit a string naming nothing. The integration-not-loaded case is served
by loading the integration and reopening the banner, which is one step, versus a typo that saves
cleanly and disables AI with no error text anywhere.

The low stakes noted in the issue — the picker sits in an optional banner, so a failure means
configuring the agent elsewhere — were the reason it was safe to defer the question, not a reason to
answer it differently. Low stakes do not make a silent failure a better failure, and two call sites
carrying an exception to a rule the rest of the codebase follows is a cost paid on every future read
of this ADR.

Verification is attribute absence in the rendered template rather than picker behavior, because the
picker is stubbed in vitest — see the coverage consequence above.
