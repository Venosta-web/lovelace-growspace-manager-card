# Lifecycle Timestamps are datetime, owned by one seam

A [[Lifecycle Timestamp]] (`seedling_start … cure_start`) is a timezone-aware ISO 8601
datetime string — date *and* time — on input, on the wire, and in storage. The card
owns this contract in one module, `lifecycle-timestamp.ts`:

- `fromBackend(value)` — backend ISO datetime → `datetime-local` input value
  (`YYYY-MM-DDTHH:MM`). Also tolerant of a legacy **date-only** value: it parses the
  date parts as *local* rather than `new Date('2026-01-15')` (which JS reads as UTC
  midnight and would display the previous day in negative-offset timezones).
- `toWire(inputValue)` — `datetime-local` value → **verbatim** wire string, or `null`
  when empty. No truncation.

`md3-date-input` displays through `fromBackend`; `mapDialogToApiPayload` serialises
through `toWire`.

## Why

The card encoded the lifecycle-date contract in three places that disagreed. It
rendered a `datetime-local` picker (datetime), `_handleSave` *validated that a time was
present* (datetime), and then `PlantUtils.formatDateForBackend` **truncated the time
away** before sending (date-only). The user picked a time, the dialog demanded a time,
and the time was discarded on the way out — and on re-edit the validator tripped a false
"Set both date and time for lifecycle dates before saving" toast on untouched fields
that the backend had stored date-only. The bug hid not in any one helper but in how the
three were *composed*: there was no single owner of the representation, so no locality.

## Decisions

- **One seam.** `lifecycle-timestamp.ts` owns parse-from-backend and format-for-wire.
  The input, the payload mapper, and (formerly) the validator all derive from it, so
  they cannot drift apart again. The interface is the test surface — one focused unit
  test (round-trip, legacy date-only, empty) replaces assertions spread across the
  picker, the save handler, and the payload mapper.
- **Send verbatim.** `toWire` sends the `datetime-local` string (`YYYY-MM-DDTHH:MM`,
  minute precision, no offset) as-is. The backend's `fromisoformat` parses it and
  stamps the local timezone — one source of timezone truth (the backend), no card-side
  offset logic to drift.
- **Delete the validator.** `datetime-local` is structurally incapable of emitting a
  partial value, so once truncation is gone the "set both date and time" guard protects
  against an impossible state. Removing it is the locality win: the seam guarantees the
  format, so no downstream re-check is needed.

## Consequences

- Old plants may return a date-only `*_start`; `fromBackend` renders it (defaulting the
  time to 00:00 in the picker) without the timezone off-by-one. No client migration.
- Drying-tab `type="date"` inputs (`WeightEntry`/`MoistureEntry`) are out of scope and
  stay date-only.
- Paired with the backend seam (growspace_manager ADR-0013), which stops truncating on
  create / transition and stores the datetime string.
