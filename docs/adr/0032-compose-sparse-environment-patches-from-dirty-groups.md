# Compose Sparse Environment Patches from Dirty Groups

**Status:** Accepted

The Config Dialog currently seeds a complete [[Shared Environment Draft]] and the
[[Environment Save Composer]] sends almost all of it on every Save. That was a necessary
defence while `configure_environment` replaced the stored configuration, but GSM ADR-0026
changed the backend seam to patch semantics: omission preserves the stored value and presence,
including `null`, an empty list, or an empty object, deliberately sets or clears it. Keeping the
full composer after that change turns any future device-to-draft seeding gap into data loss. The
single seeder and key-parity test added in #505 reduce that risk but do not remove it.

## Decision

Proceed with dirty tracking, but track a **dirty write set** alongside the complete draft rather
than making draft fields optional. The complete draft remains the read model for tab ViewModels,
validation, discard comparison, and reset-from-device. `UPDATE_ENV_DRAFT` records the top-level
keys carried by each edit; the save composer emits only dirty persisted keys plus the growspace ID
needed to route the command. After a successful save and refresh, re-seeding clears the write set.
A failed save leaves it intact so retrying sends the same patch.

The unit of dirtiness is normally one top-level `EnvironmentDraft` key. Nested editors that emit a
whole replacement object, such as `circulationFanConfig`, threshold tables, sensor groups, and
coordinates, therefore dirty that whole object. This matches the backend's current top-level
patch granularity; leaf-path tracking would add a second patch algebra that the backend does not
support.

`soilMoistureMin` and `soilMoistureMax` are one **atomic dirty group**. Editing or clearing either
marks both dirty, and the composer either emits both or neither. Two `null` values are a deliberate
clear; a complete valid numeric pair is a deliberate set; a half-complete or invalid pair blocks
Save rather than being silently omitted. No environment Save may send one bound without the
other.

Dirtiness is about user intent, not truthiness or difference from the seeded value. A dirty key
whose value is `null`, `''`, `[]`, or `{}` remains present in the patch and therefore expresses a
clear. A key absent from the dirty write set is untouched, even if the complete draft contains a
default for display. Editing a value back to its seeded value may remove it from the write set as
an optimisation, but correctness must not depend on doing so.

Every `EnvironmentDraft` key receives one total, compile-time-checked persistence classification:

- routing metadata (`selectedGrowspaceId`), always present in the event but not a patch field;
- buffered `configure_environment` fields, emitted only when their key or atomic group is dirty;
- dedicated-service fields (`exhaustFanConfig` and the vision-checkup fields), whose service is
  called only when that field/group is dirty;
- immediate-persist control fields (`humidifierControlEnabled` and
  `dehumidifierControlEnabled`), which remain in the complete draft for display but are not
  re-sent by the buffered environment Save.

The immediate humidity-control commands remain their own persistence path. Their transitions must
not add the flags to the buffered dirty write set; an implementation may update optimistically and
revert on failure, but the environment composer no longer derives or copies those flags. Likewise,
the host calls `configure_exhaust_fan` only when `exhaustFanConfig` is dirty instead of on every
environment Save.

This is a card-side use of the existing GSM patch contract, not a new backend API. However, the
current Home Assistant service schema still supplies defaults for four omitted fields
(`control_humidifier`, `control_dehumidifier`, `stress_threshold`, and `mold_threshold`) before the
GSM patch builder sees the call. Those defaults violate GSM ADR-0026's existing omission-preserves
contract and must be removed, with a service-boundary regression test, before the sparse card
composer can ship. That backend correction is compatibility work, not a contract change.

The #505 composer/seeder key-parity test is retired. Sparse output cannot have key parity by
design. It is replaced by three structural properties: the persistence-classification table is
total over `keyof EnvironmentDraft`; every dirty scalar key is emitted even for clear values; and
every atomic group is emitted completely or not at all. Integration coverage must also prove that
editing one field preserves an unrelated stored field through the real card-to-service mapping.

## Considered Options

- **Keep the complete composer plus the single seeder and parity test.** Rejected because it makes
  correctness depend forever on two hand-maintained field lists remaining aligned. It detects the
  next drift in tests but does not make the unsafe payload unrepresentable.
- **Diff the final draft against a fresh device snapshot at Save time.** Rejected because a refresh
  can race with the open dialog, deep equality is not user intent, and a deliberate clear must be
  distinguishable from a field that was never touched.
- **Track dirty leaf paths.** Rejected because the backend merges at top-level fields. It adds
  complexity without allowing a narrower valid service payload.

## Consequences

The state machine, composer, event detail, host validation, and dedicated-service gates must all
accept sparse patches. Adding an environment field now requires an explicit persistence
classification, which turns an unseeded field into a harmless omission and makes an unclassified
field a compile-time/test failure. The complete seeder remains valuable for accurate display and
discard UX, but it is no longer a write-safety boundary.

This decision supersedes ADR-0019's Config Dialog save note that describes
`configure_environment` as a full replace and requires whole-draft composition; the rest of
ADR-0019 is unchanged.

## Implementation

- Backend prerequisite: [growspace_manager#586](https://github.com/Venosta-web/growspace_manager/issues/586)
- Card implementation: [#519](https://github.com/Venosta-web/lovelace-growspace-manager-card/issues/519)
