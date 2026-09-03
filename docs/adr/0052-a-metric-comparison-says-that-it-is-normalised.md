# A Metric Comparison admits that it is normalised

A [[Metric Comparison]] chart normalises each series to its own min and max,
renders no value axis, and gives no cue that vertical position is per-series — so
a temperature line crossing a humidity line means nothing, and the chart looks
like it means something. The fix we are shipping is **not** to change the
scaling: it is to label the axis region as normalised and put each series' real
min/max on its legend chip.

The defect is that the chart does not *admit* what it is doing. Admitting it
costs a label and a legend value.

## Why not the better chart now

The better chart is to normalise each series **to its own target band** — 0 at
the band floor, 1 at the ceiling — so that a crossing carries information ("both
are equally far above target") and the guide marks collapse into one shared band
drawn once. It composes with everything in ADR-0048 and ADR-0050, and it is the
intended destination.

It is not this change because it is undefined for any metric with no target, and
because it silently alters what an existing grower's durably-persisted Comparison
depicts. Both need answers, and they are their own decision rather than a rider
on this one.

Switching to a genuinely shared axis was rejected: °C and % on one scale is
unreadable more often than not. Restricting Comparison to unit-compatible metrics
was rejected outright — it would break saved Comparisons that already exist.

## Consequences

This is a deliberate deviation recorded so it is not "fixed". A reader who finds
independently-normalised series with no shared axis should not conclude it was an
oversight and unify the scales; that reading of the chart was considered and the
target-relative version is the planned replacement.
