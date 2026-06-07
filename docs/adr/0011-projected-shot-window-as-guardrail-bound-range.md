# Crop-steering "Next" is a guardrail-bound range in a new field, not a reused point estimate

The Irrigation Dialog footer's "Next" value (`next_scheduled_cycle`) was always `null` in Crop Steering (VWC) mode, because that field carries a precise, deterministic guarantee — a point-in-time read off a configured manual schedule — and Crop Steering has no fixed schedule to read; shots fire reactively based on VWC thresholds and phase logic.

We decided "Next" in Crop Steering mode should show a **range** (e.g. "Next 14:15–14:50") in a **new, separate field**, [[Projected Shot Window]] (`projected_shot_window`), rather than repurposing `next_scheduled_cycle` to sometimes hold a point and sometimes a range. Conflating the two under one name would mix a guarantee with an estimate — the same category error as labeling an estimate "scheduled."

## Considered options

- **Statistical confidence interval** (regression slope ± standard error on a VWC-depletion model): rejected as the *initial* implementation — it requires ~2-3 days of sensor history to be reliable (mirroring `tank_depletion_predictor.py`'s training window), would show nothing useful on day one, and the range width could fluctuate in ways that look erratic to users.
- **Guardrail-bound range** (chosen): bounds derived from operational constraints already known on day one — `shotIntervalMinutes` cooldown and phase-window timing (`p0DurationMinutes`, P2-stop time, lights-on/off). Produces a meaningful, deterministic range immediately, and is verifiable by the user against the existing Crop Steering Schedule chart (phase bands, shot markers). A future VWC-depletion model can narrow the range *within* these same bounds without changing the contract.
- **Frontend-derived from strategy params** (the dialog already computes equivalent phase-window math for the Phase Strip / chart): rejected in favor of backend computation, so the eventual depletion-rate refinement — which needs live sensor state the backend already polls — doesn't require a second migration of the contract or duplicating the model in TypeScript.

## Bound logic

Both ends of the range are anchored per the *current* phase, not a single uniform rule:
- **Earliest**: `now + shotIntervalMinutes` in P0/P1/P2 (or tomorrow's window start, whichever is later, near day's end); tomorrow's P0/P1 start when currently in P3
- **Latest**: P0 end while in P0; the shared P2-stop time while in P1 or P2 (P1 has no time-based ceiling of its own — VWC-threshold-driven — so it inherits P2's hard cutoff); tomorrow's P2-stop while in P3

When the current phase is P3 (Dry-back — no shots fire), the whole window rolls forward to anchor on tomorrow's P0/P1/P2 windows rather than collapsing to "now".

## Naming

Named "projected", not "scheduled" — deliberately echoing the "live + projected" hedging language the [[Crop Steering Day Chart]] already established (its dashed/faded forecast line, see CONTEXT.md's note on history vs. projection). "Projected" signals an estimate bounded by guardrails; "scheduled" implies a guarantee read off a configured plan. The footer can't lean on dashing the way the chart does, so the field/label name has to carry that distinction on its own.
