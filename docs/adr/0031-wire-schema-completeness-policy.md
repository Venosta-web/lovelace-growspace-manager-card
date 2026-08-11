# ADR 0031 — Wire Schema Completeness: Declare Everything, Strip Inbound, Reject Outbound

**Status:** Accepted
**Amends:** ADR 0029 (Decision #1 — the fixture check mechanism)

## Context

The card described each backend wire shape twice: once as a hand-written
`Serialized*` interface in `services/types.ts`, once as a zod schema in the
owning slice, joined only by a cast. Because zod strips unknown keys, a field
present in the hand-written type but absent from the schema was silently deleted
at runtime while TypeScript reported it as present. #484/#490 traced this on the
water-usage object: `liters_today` was stripped at the [[hassCall seam]], so the
Today's Usage KPI read zero. #486 and #487 are the same defect on other shapes —
#487 alone silently reverts 17 Irrigation Strategy settings on hydration.

The invariant governing this was unstated. The tree was split by accident: nine
objects carried `.passthrough()`, everything else stripped. Before the remaining
shapes are swept (#488), "complete the schema" needs a definition.

Three facts constrain the choice, and two of them contradict the framing the
work started from:

1. **zod has three modes, not two** — strict (error on unknown key), strip
   (silently drop, the plain `z.object` default), loose/passthrough (retain).
   The current split is strip-vs-passthrough. Strict is used nowhere.

2. **On zod 4, passthrough does not hide extras from `z.infer`.** The argument
   originally made against `.passthrough()` — that extras are invisible to the
   inferred type and need a hand-written twin to read — was true on zod 3. This
   repo is on zod 4.4.3, where `.passthrough()` is deprecated in favour of
   `z.looseObject()` and both infer an index signature. Compiled against this
   repo's tsconfig, reading an undeclared key off a passthrough type is *legal*
   and yields `unknown`; only the strip type raises TS2339. The real cost of
   passthrough is therefore the opposite of the one assumed: it does not force a
   hand-written twin, it **suppresses the compiler error that detects a missing
   declaration** — the exact signal this work exists to restore.

3. **Inbound parse failure is a card-wide outage.** `hassCall` (`hass-call.ts`)
   runs `schema.safeParse(raw)` and throws `WSError` on failure for the entire
   call. A strict inbound schema means the first GSM release carrying a new
   field blanks the card for every user who has not yet upgraded.

## Decision

**The rule.** *Every GSM wire shape is described exactly once, as a zod schema
in its owning slice that declares every field the backend emits; the schema
strips unknown keys inbound and rejects them outbound, and its TypeScript type
is derived with `z.infer`.*

Unpacked:

1. **One description per shape.** The zod schema is authoritative;
   `export type X = z.infer<typeof XSchema>`. A hand-written wire interface is a
   defect, not a style choice. The schema lives in the owning [[Slice]] (which
   already owns its schemas per `CONTEXT.md`), not in `services/types.ts` —
   naming the location matters, or the sweep derives the types and leaves them
   in the wrong file with no authoritative home.

2. **Complete means every field the backend *emits*, not every field the card
   *reads*.** Unread fields are declared with a comment saying so — the
   `max_daily_readings` precedent from #490. Anything less makes the fixture
   key-set diff unrunnable, because it cannot distinguish drift from a
   deliberate omission.

3. **Inbound: strip** (plain `z.object`). Combined with (2), a field the card
   reads but never declared is a **compile** error at the read site. Fields are
   `.optional()` so the card stays [[Backward-Safe Card Change|backward-safe]] against older
   GSM releases that omit them.

4. **Outbound: strict** (`z.strictObject`). Request payloads are authored by the
   card, so an unknown key is a card-side bug — a typo'd field name, a stale
   mutator — never version skew, and there is no outage risk because the input
   is ours. Stripping a request payload silently deletes a field the card meant
   to send, and neither a round-trip test nor the [[Contract Fixture]] can see
   it: the fixture is a payload GSM *emits*.

   **Scope of the effect, stated honestly:** `*PayloadSchema`s are today
   `.parse()`d **only in slice tests** (`irrigation.slice.test.ts` and friends);
   mutators use them purely as `z.infer` type sources and send the object
   unparsed. So `z.strictObject` changes nothing on the live wire *right now*.
   It earns its place in two narrower ways: it makes the existing
   `expect(Schema.parse(payload)).toEqual(payload)` test assertions actually
   discriminating — a stray or misspelled key in a payload the test builds now
   fails instead of being quietly dropped before the comparison — and it means
   any future mutator that does parse before sending gets the loud failure for
   free. Do not justify the inversion by claiming a runtime guard that does not
   exist. `UpdatePlantPayloadSchema`'s `.passthrough()` inverts.

5. **`.passthrough()` and `z.looseObject()` are banned.** No permanent
   exceptions; the nine existing sites are removed as #488 sweeps each shape
   (each removal is behaviour-changing — it re-enables TS2339 at read sites — so
   it belongs with that shape's completion, not a big-bang commit). Migrating a
   site to `z.looseObject()` is not a fix; it launders a deprecated call into a
   sanctioned one.

### Exemptions

Two classes are exempt, both declared as an [[Opaque Region]] rather than left
as residual `.passthrough()`:

- **Opaque-by-arity** — an open-ended collection whose element count is
  user-driven: `daily_readings`, `irrigation_tanks`, `sensor_groups`,
  `active_events`. The test is **blast radius**, not ownership: a stricter
  element type makes one malformed row fail the whole `get_data` parse, trading
  a missing field for a blank card. #490 set this precedent explicitly.
- **Non-GSM wire shapes** — `HistoryPointSchema` parses Home Assistant's REST
  history API. "Declare every field the backend emits" is a promise you can
  neither keep nor test against a backend you do not own and a fixture that
  cannot reach it.

Ownership alone is **not** sufficient grounds. A singular object the card never
reads has no arity amplification, so it gets declared — that is what
`max_daily_readings` is.

### Interaction with the Contract Fixture (amends ADR 0029)

ADR 0029 Decision #1 specifies one strict parse of the fixture, "unknown *and*
missing keys both fail", run against both refs. Decision (3) above makes strict
production schemas impossible, and the two refs do not mean the same thing, so
that clause is replaced by a **recursive key-set diff, asymmetric per ref**:

| Ref | Check | Fails when |
| --- | --- | --- |
| GSM `prerelease` | **Completeness** — fixture keys ⊆ schema keys | GSM added a field the card has not declared |
| Latest GSM **release** | **Backward-safety** — the schema's **input-required** keys ⊆ fixture keys | The card requires a field the released backend does not send |

A key in the release fixture but not in the schema is *expected*, not drift —
GSM shipping ahead of the card is the normal state. Left unstated, whoever
builds the check writes one symmetric comparison and it is permanently red on
one ref or the other.

**"Input-required" is load-bearing and must be read off `z.input`, not
`z.output`.** In zod 4, `.optional().default(x)` is optional on *input* and
required on *output* — verified against this repo's tsconfig. Nearly every field
in `growspace/schema.ts` is written that way, so an implementer reading
requiredness off `z.infer` (which is `z.output`) would mark almost every key
required and paint the release-ref diff permanently red. The set that matters is
the genuinely bare fields — no `.optional()`, no `.default()`/`.prefault()` —
because a field with a default *cannot* be missed when the backend omits it; the
default is the tolerance. That set is small but not empty (~67 bare declarations
in `growspace/schema.ts` today: `IrrigationConfigSchema.enabled`,
`SubstrateMetricsSchema.peak_vwc`, and similar), which is exactly what makes the
check meaningful rather than vacuous.

**Walking the tree.** The diff must unwrap the same modifier chain a strict
mirror would (`.optional()`, `.default()`, `.prefault()`, `.nullable()`,
`z.lazy` in the genetics slice) — that machinery is not avoided by choosing the
diff. It is chosen anyway because it needs no surgery on the production schemas
and because it reports *which* keys drifted in *which* object instead of a zod
error dump. One case a strict parse would have handled implicitly and the diff
must handle explicitly: **`z.record` has no fixed key set**
(`notification_settings`, `active_events`, `GrowspaceAPICollectionSchema`). The
walker must not diff record keys as though they were schema keys — it recurses
into the *value* schema and ignores the data's own keys.

Everything else in ADR 0029 stands — two refs, one test, joined to the required
contexts, and the release-ref result remains the mechanical definition of a
[[Backward-Safe Card Change]] and the sanctioned exception to the GSM-first
landing order. GSM's ADR 0030 needs no change: the fixture's *content* is
unaffected, only how the consumer checks it.

### Enforcement

`.passthrough()` and `z.looseObject(` are syntactically detectable. An ESLint
`no-restricted-syntax` rule banning both lands in **#488, after** the sweep
clears the nine violations — a ban shipped with nine disable comments teaches
the wrong lesson. Once clean, each [[Opaque Region]] carries an inline
`eslint-disable-next-line` with its reason written at the call site, which
outlives any list kept in this file.

## Consequences

- A field GSM adds is dropped at runtime until the card declares it. This is the
  accepted cost of not blanking the card on every backend release; the fixture
  diff is what converts it from a silent runtime loss into a CI failure.
- **The Contract Fixture does not exist yet.** It appears only in `CONTEXT.md`
  and ADR 0029 — there is nothing in `.github/workflows/` or `tests/`. Until it
  lands, "complete" is verified per shape by a round-trip test plus manual
  confirmation at both GSM refs, exactly as #484/#486/#487 each specify. That
  human diligence is this rule's weakest link and the reason the ESLint ban is
  worth having before the fixture arrives. The sweep does **not** block on the
  fixture: #487 is a live bug reverting 17 settings.
- `services/types.ts` shrinks toward deletion as its 12 remaining `Serialized*`
  interfaces are replaced by `z.infer` re-exports (#488, #489).
- Outbound strictness will surface latent bugs as loud failures on first
  contact — a mutator sending a field the schema does not declare now throws
  where it previously saved a silently truncated payload. That is the intent,
  but it makes the outbound inversion a behaviour change to land deliberately,
  not a cleanup to slip into an unrelated PR.
- `plant.schema.test.ts:126` asserts passthrough behaviour and is deleted with
  its schema's exemption.
