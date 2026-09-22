# Metric Targets normalise into the Metric Descriptor

The values an Env Graph draws guide marks from live in five shapes across five
places on `GrowspaceDevice`: `vpdThresholds` (band + danger band, day/night
split), `target + tolerance` on the fan configs, `{min, max}` on
`soilMoistureBand` and `ecTargetRanges`, `{on, off}` per stage and period on the
humidifier thresholds, and bare scalars (`warningLevel`, `moldThreshold`,
`targetRunoffPercent`, `dli_target_*`, `critical_temp_*`). They normalise into a
`targets: MetricTarget[]` field on the **Metric Descriptor**, and the existing
raw `vpdThresholds` field is absorbed into it rather than kept alongside.

## Why the descriptor

ADR-0030 already made the descriptor the single owner of the per-`MetricKey`
facts a Chip and an Env Graph must agree on, and it already takes the `device`
and already carries `vpdThresholds` — which is precisely one of these five shapes
sitting there in raw wire form. Targets are the same category of fact, resolved
once so a chip and its own graph cannot disagree about where the good region is.
A sibling `computeMetricTargets` module would have kept the seam narrower, at the
cost of a second thing every consumer must remember to read.

Absorbing `vpdThresholds` is the load-bearing half. Leaving it as a raw field
beside a normalised `targets` array guarantees that VPD gets drawn from one and
every other metric from the other, which is the drift the descriptor exists to
prevent.

## Consequences

The descriptor now reads `biologicalMetrics.granularStage`, because
`ecTargetRanges` is per-stage and a target that ignores the stage is the wrong
number rather than a coarse one. It comes off the `device` the function already
receives, so this adds a field read, not a parameter.

`env-series` consumes targets the same way it consumes `vpdThresholds` today, so
VPD band classification and the guide lines drawn over it resolve from one
source. The two could previously have disagreed only in theory; with four more
metrics carrying bands, they would have disagreed in practice.

The normalised shape is typed by ADR-0048's three kinds. Normalising five shapes
into an untyped record would have moved the problem rather than solved it — the
taxonomy is what makes "normalise" mean something.
