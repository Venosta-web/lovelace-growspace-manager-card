# Add a rolling-window mode to Crop Steering Day Chart instead of forking it

The [[Crop Steering Day Chart]] is photoperiod-anchored by design (ADR-0010): its axis runs `lightsOnMin − 120` → `lightsOnMin − 120` the next day, sourced from the calendar-day-bucketed `get_crop_steering_history` WS command, with a "live + projected" trace that extrapolates from now to the end of the photoperiod day. That's the right shape for the Irrigation Dialog's Schedules tab, where the question is "how is today's cycle going?"

In the analytics view, though, the chart should answer a different question — "what has substrate VWC/EC looked like over the selected window?" — and behave like every other [[Env Graph]] there: rolling now-minus-range → now, driven by the [[Time Range Selector]] (1h/6h/24h/7d), sourced from the same `sensorHistory`/`combinedHistory` the generic graphs use.

We chose to **add a `rollingWindow` boolean property** to the existing component rather than fork a second chart. The two views share most of their rendering machinery — the trace area's multi-axis SVG plotting, the VWC/Pore EC/Bulk EC color conventions, the substrate-model tooltip — and forking would recreate the same dual-maintenance trap ADR-0012 extracted the component to avoid. `rollingWindow` toggles:

- **Data source**: `sensorHistory` (bucketed client-side into fixed intervals and averaged per category, to preserve the single-line-per-metric look rather than `growspace-env-chart`'s per-sensor breakout) instead of `cropSteeringHistory$`.
- **Axis**: rolling now-minus-range → now instead of the photoperiod-day axis; now-line dropped (it would always sit at the right edge); axis labels follow `growspace-env-chart`'s `-${range}` convention instead of clock-time gridlines.
- **Phase Strip**: shown only for the `24h` range (the closest analogue to a single photoperiod day), re-anchored to the rolling axis — rendering whatever portion of one or two cycles falls inside the window, including partial blocks at the edges. Hidden for `1h`/`6h`/`7d`, where a phase strip wouldn't correspond to a meaningful unit. Live phase adjustment (`activeSteeringPhase`/`phaseChangedAt`) applies only to the cycle containing "now"; the prior partial cycle uses the scheduled template.
- **Shot Track**: unaffected — still gated by the existing `hideShotTrack` (already `true` in the analytics context).
- **Projection**: `generateSubstrateProjection` is left wired up as-is rather than special-cased out. Since a rolling window always ends at "now", the projected segment naturally clips to nothing — accepted as a small inert code path in exchange for not forking the trace-rendering logic.

`get_crop_steering_history` and its calendar-day contract (ADR-0010) are untouched — they remain the dialog's data source.

See `CONTEXT.md` for the updated [[Crop Steering Day Chart]] entry.
