# Irrigation Commands compile strictly and reverse completely

**Status:** Accepted

An [[Irrigation Command]] is one deep card module behind the Irrigation slice's existing named mutators. Its implementation owns Irrigation Field Ownership, omission and clearing semantics, domain-to-wire compilation, runtime outbound validation, the optimistic projection onto both models, transport, and inverse restoration. `saveIrrigationSettings`, `updateIrrigationStrategy`, `toggleIrrigationMode`, `setProgramAutoAdvance`, `setSteeringPhase` and `applySteeringMode` remain the interface UI callers hold; the command union is not exported from the slice, so a component asks for the change it means rather than assembling one. The backend counterpart is growspace_manager ADR-0046, whose Irrigation Change seam draws the same boundary from the other side.

Three writers had each grown their own copy of the same rules. `updateIrrigationStrategy` carried a thirty-branch `if (x !== undefined)` ladder; `saveIrrigationSettings` carried its own; `toggleIrrigationMode` and `applySteeringMode` hand-wrote a payload each. The duplication was not the cost — the cost was that each copy answered the questions differently. Only one projected onto the growspace-device projection the dialogs read, so a refused mode toggle left the grid and the dialog disagreeing. None validated anything before touching state, so a malformed value reached Home Assistant and came back as a voluptuous error naming a wire key no control is labelled with. And the strategy writer projected the fields it did *not* send, so saving the Steering tab blanked a stamped Steering Mode locally until the next device sync.

## Omission is not clearing

`undefined` omits a field and leaves the growspace's stored value alone; this is a sparse change, not a form snapshot. `null` clears — but only where the action defines a clear: the three optional caps and the runoff-EC halt on settings, both edges of the Pore EC Target Band on strategy. Everywhere else a `null` is a caller bug and is refused by name, because the backend seam refuses a field it does not own by name and a card that forwarded the null would turn that into a service trace somebody has to read backwards.

The pump entities are the one asymmetry. A growspace with no pump is `null` in the domain and the empty string on the wire, which is what the action has always read as "no pump". Compiling that in one place is the difference between a wire convention and a thing every caller has to remember.

## Ownership is total, and the compiler is the only reader of it

One table per model, `satisfies Record<keyof …>`, so a new strategy field without a row is a compile error rather than a value silently dropped. Fields another operation owns — the detected lights-on time the backend measures, the declared Steering Mode, the [[Recipe Stamp]], the [[Irrigation Program]] binding — carry a non-writing owner and are **dropped, not refused**: the Steering tab's draft is seeded from the whole strategy, so a legitimate save arrives carrying them. Dropping them is also what stops the projection from writing them.

## Both models forward, both models back

A valid command projects onto the irrigation read-model atom *and* the growspace-device projection, and a transport failure restores both — the read model from its own snapshot, the device from the inverse of exactly the keys that were applied, so a field the projection added is restored to absent rather than left behind. The dialogs read one and the grid reads the other; a half-restored pair shows one growspace in two states.

## What stays outside

Schedule collections, per-stage EC target ranges, Drain Monitoring, drain readings, manual cycles, irrigation analytics, the recipe and program stamps, and read-model hydration. Each is a collection, a runtime action or a bootstrap write rather than a sparse edit of the two configuration models, and folding them in would buy a shared name for operations that share no rule. This is the same line growspace_manager ADR-0046 draws, which is what makes "refused by name" one rule rather than two guesses.

## Considered Options

- Export a generic `applyIrrigationChange(command)` to components, mirroring [[Environment Change]]'s caller-facing interface. Rejected because the irrigation callers are not one dialog composing one draft: they are a whole-form save, four immediate-persist controls, a mode toggle, a phase override and a consent switch, each of which reads better as the gesture it is. The named mutators also keep the undo stack's action types stable.
- Validate on the way in, against the caller's domain object. Rejected because the payload is what the backend refuses, and a schema over the domain type would have to be kept in step with the wire schema by hand — the drift the single compiler exists to remove.
- Leave the schemas as documentation and keep validating nothing at runtime. Rejected: that is what they were. Four outbound payload schemas existed, were exercised only by tests that parsed an object shaped like themselves, and never saw a payload the card actually sent.
