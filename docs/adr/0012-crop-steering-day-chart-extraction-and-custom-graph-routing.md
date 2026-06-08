# Extract Crop Steering Day Chart into a standalone component; formalize Custom Graph Routing

When the Steering Phase Chip is promoted to the hero deck (only when [[Crop Steering (VWC)]] is active), clicking it must open the **Crop Steering Day Chart** ("Substrate model · live + projected") inline, in the same slot the standard Env Graph normally occupies. That chart (`.cs-model`) lived embedded inside `irrigation-dialog.ts`, with no path to render it from the header.

We chose to **extract it into a standalone component** (e.g. `<crop-steering-day-chart>`) shared by both the Irrigation Dialog's Schedules tab and the hero's inline graph slot, rather than duplicating a slimmed-down copy for the hero. Duplication would have created two places that must stay visually and behaviorally in sync — a maintenance trap for a chart this detailed (multi-trace, phase-band-aligned, polling). This mirrors the existing `<tank-water-chart>` extraction.

We also chose to **name the underlying mechanism** — "certain `MetricKey`s render a dedicated chart instead of the generic Env Graph when clicked" — as **Custom Graph Routing**, since `<tank-water-chart>` already does the same thing independently. Two occurrences of the same shape is a real pattern, not coincidence; naming it gives the next contributor a single concept to reach for instead of rediscovering the convention from scratch (or worse, inventing a third, incompatible mechanism).

See `CONTEXT.md` for the [[Custom Graph Routing]], [[Crop Steering Day Chart]], [[Tank Water Chart]], and [[Steering Phase Chip]] glossary entries.
