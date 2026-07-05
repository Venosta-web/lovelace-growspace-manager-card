# ADR 0026 — Lights-On Edited on the Growlights Tab (Steering Tab Read-Only)

**Status:** Accepted (reverses the read-only-on-growlights arrangement first shipped on branch `feat/428-growlight-tab`)

## Context

`lightsOnTime` is the crop-steering photoperiod anchor. It is a field on the
crop-steering **strategy** (`IrrigationStrategy.lightsOnTime`), not on
`GrowLightConfig`. Historically it was **edited on the Irrigation Dialog's Steering
tab** and the growlights work (#428) initially followed suit — the new Config Dialog
Growlights tab showed lights-on **read-only** with a note pointing back to the
Steering tab.

That arrangement is backwards for the user's mental model: lights-on *is* the light
schedule, so the Growlights tab is where a user expects to set it. But moving the
edit surface there is not free — the Growlights tab lives in the **Config Dialog**,
which has no strategy-save path at all. Everything else on that tab buffers into the
[[Shared Environment Draft]] and persists on the dialog's Save via
`configure_environment`; the strategy persists through a different dialog entirely
(the Irrigation Dialog's footer `save-all` → `updateIrrigationStrategy`).

Two further constraints shape the decision:

- The Growlights tab **greys out its whole form** (`pointer-events:none`) when the
  grow-light controller is disabled — but crop steering does not require a controller
  at all. A crop-steering-only user must still be able to set the anchor.
- Auto Light Tracking (`autoLightTracking` / `detectedLightsOnTime`) and the
  FlowerFlipChip deep-link are both wired to the Steering tab as lights-on's current
  home (CONTEXT.md "Light Cycle Tracking", "FlowerFlipChip").

## Decision

1. **Flip ownership of the edit surface.** The Growlights tab **edits** lights-on;
   the Steering tab shows it **read-only** with a hint ("Set in Config → Growlights").
   `lightsOnTime` stays a strategy field — this is a UI move, not a data-model
   relocation, so no backend/migration change.

2. **Immediate-persist, not batch-into-Save.** Editing lights-on causes
   `updateIrrigationStrategy(id, { lightsOnTime })` to fire on change, rather than
   teaching the Config Dialog's Save to also persist a strategy field. Because the
   Growlights tab is a dumb, hass-free presentational element, it does **not** call
   the slice directly — it **emits an event** that the **Config Dialog host**
   (`growspace-dialog-host.container.ts`, which has the selected `growspaceId`)
   handles by making the call. This mirrors the irrigation container's
   `_persistStrategyNow` pattern, but is a *new* handler on a *different* host — a
   pattern to replicate, not code to reuse. `updateIrrigationStrategy` is a
   field-by-field partial merge, so sending only `lightsOnTime` never clobbers other
   strategy fields. This avoids giving the Config Dialog a second Save-time save path
   and sidesteps the env-draft three-seeder re-seeding bug class. For the display
   value to reflect the just-persisted change (and not go stale), the tab's lights-on
   **read value must come from the live strategy atom**, not a seeded-once draft.
   Costs, both accepted: (a) mixed-UX tab — lights-on saves instantly while the rest
   waits for Save (precedented by ADR-0017); (b) **lights-on bypasses the dialog's
   `confirm-discard` model** — closing the dialog without Save discards every other
   env-draft edit but the lights-on write survives, and it sits outside the
   `undo-redo-manager`. See Open Question 1.

3. **Place the input outside the enable-gate.** Lights-on renders outside the block
   that greys out when the controller is disabled, so a crop-steering-only user with
   no controller can still edit the anchor.

4. **Auto-tracking stays on Steering.** The `autoLightTracking` toggle and the
   `detectedLightsOnTime` read-out remain on the Steering tab (they are separate
   strategy fields and read-side display), shown alongside the now-read-only lights-on
   value.

5. **Immediate-persist bypassing `confirm-discard` is accepted as-is.** The Config
   Dialog has a real `confirm-discard` model — every other env-draft edit is
   discardable by closing without Save, and immediate-persist deliberately opts
   lights-on out of that (and out of undo). Accepted: setting a light schedule is a
   deliberate act a user rarely wants to "cancel," and the alternative (batch-into-Save)
   reintroduces the second save path and the seeder-bug risk this design avoids.

6. **Minimal chip re-point ships in core; only the pulse is deferred.** The
   FlowerFlipChip fires *at flower-flip* to prompt the user to **set** lights-on
   (18h→12h photoperiod change); landing them on a read-only field would be a guided
   dead-end. So core includes a minimal re-point —
   `openConfigDialog({ initialTab: 'growlights' })` (extend the payload + seed
   `activeTab` from it) so the chip opens the **editable** Growlights tab. The
   scroll-to-field + pulse polish (`scrollToField` threading + a pulse on the
   Growlights lights-on input) is the only piece split into a **follow-up issue**.

## Consequences

- The Config Dialog's Growlights tab now writes a crop-steering strategy field
  directly — a deliberate cross-domain write, justified by the user's mental model of
  lights-on as part of the light schedule.
- Two persistence styles coexist on one tab (immediate for lights-on, buffered-Save
  for the rest). Reviewers should not "fix" this into a single path.
