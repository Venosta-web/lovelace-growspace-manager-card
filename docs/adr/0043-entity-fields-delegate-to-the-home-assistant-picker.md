# ADR 0043 — Entity Fields Delegate to the Home Assistant Picker

- Status: accepted
- Date: 2026-08-16
- Issue: #544 (decision + implementation), blocked on #541 (shared multi-select), part of the Config Dialog consistency map
- Related: ADR 0019 (tab decomposition — tabs take a view model, never `hass`), ADR 0036 (portal token scope)

## Context

Every entity field in the Config Dialog was a plain text `<input>` backed by a
`<datalist>` of raw entity ids. Three consequences, as #544 states them:

1. The user reads `sensor.flower_substrate_moisture` where the rest of their
   dashboard shows friendly names.
2. The change handler emitted whatever string was typed — a typo was accepted,
   saved, and silently matched nothing.
3. A stranger installing this card does not know their own entity ids.

### Two premises in the issue, one of which is wrong

The issue frames this as the codebase's **first** Home Assistant form primitive
and reserves the call for a human on that basis. That is only half true:

- **False as stated for the codebase.** `ha-entity-picker` already ships in
  `src/dialogs/chat-panel.ts` and `src/dialogs/briefing-panel.ts` (the
  conversation-agent pickers), and `ha-form` backs all eight card editors.
- **True for the config interiors.** None of those hits are under
  `src/features/config/`, which had 39 raw `<button>` and 27 raw `<input>`.

So this is extending a pattern that already ships live, not adopting one.

### The layering objection is empty, with evidence

CLAUDE.md's rule is that components never reach into `hass` for **growspace**
data. The entity registry is not growspace data, and the option lists were
already derived from `hass.states` — `ConfigDialog._getEntities`
(`src/dialogs/config-dialog.ts`) filters by domain, device class and integration
platform and injects the result into each tab's view model. Reading `hass` for
entity identity changes nothing about where growspace data flows.

## Decision

**Keep the card's chip field; delegate the picking to `ha-entity-picker`.**

- A shared `gm-entity-picker` (`src/features/shared/ui/gm-entity-picker.ts`)
  wraps `ha-entity-picker`. It is the single entity field: config tabs, the
  multi-select's add affordance, the tank sensor field, the AC Infinity port
  bundles, and `md3-entity-input` all render it.
- **`allow-custom-entity` is never set.** This is the mechanism for "cannot be
  committed silently" — the picker will not yield a value that is not an entity.
- **The caller's `options` list stays the authority** and is passed as
  `includeEntities`. `ha-entity-picker`'s own `includeDomains` /
  `includeDeviceClasses` cannot express the platform filter that Port Pre-fill
  (ADR 0028) depends on, so the existing filtering is preserved rather than
  re-expressed.
- Chips label with `friendly_name` and keep the entity id as secondary text
  (dropped when the entity is unknown, where the id is all we have).
- `hass` reaches the pickers through `hassContext`; `config-dialog` now provides
  it. Tabs keep the ADR 0019 contract — view model in, intents out, no `hass`.

### Rejected: `ha-entities-picker` (the plural, multi-value element)

It would discard the shared component #541 just built, along with its 44px chip
and remove targets, `aria-label`/`title`, and `:focus-visible` treatment; it
would change the visual language of the config tabs wholesale; it cannot express
the platform filter; and unlike `ha-entity-picker` it is not proven in this
card's bundle.

### Rejected: hardening the datalist

The issue's fallback (friendly name as chip label, reject values outside the
option list) fixes the labels and the typo, but leaves the keyboard and
screen-reader behaviour, the fuzzy search, and the icon/area context hand-rolled
and permanently behind the platform's.

## Consequences

- `ha-entity-picker` lives in a lazily loaded frontend chunk. `ensureEntityPicker`
  (`src/features/shared/ui/ha-entity-picker-loader.ts`) pulls it in through the
  supported `loadCardHelpers()` route, once, and the picker re-renders when it
  registers. Until then the field shows its label, never a free-text box — there
  is deliberately **no** datalist fallback, because a fallback that accepts typed
  text would reopen the defect this ADR closes.
- Without `hass` the picker renders nothing rather than degrading to free text.
- Tests drive the picker through `tests/harness/entity-picker.ts`: a stub
  `ha-entity-picker` with the same `value` / `value-changed` contract, a
  `test-hass-provider`, and `pickEntity` / `pickerOptions` helpers.
- Saved configurations round-trip unchanged: the stored value is still the entity
  id string; only its presentation and the way it is chosen changed.
- A saved id that no longer resolves is **not** silently dropped. Checked against
  the shipped frontend (`hass_frontend/frontend_latest`): `ha-entity-picker`'s
  `_valueRenderer` falls back to an alert icon plus the raw id when
  `states[value]` is missing, and `_valueChanged` only commits ids that pass
  `isValidEntityId`. `optionsWithCurrent()` in the AC Infinity editors is kept
  for the same reason — a filtered-out but saved value stays in the list.
