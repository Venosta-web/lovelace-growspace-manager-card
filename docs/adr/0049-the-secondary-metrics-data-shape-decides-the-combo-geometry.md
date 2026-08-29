# The secondary metric's data shape decides a combo's geometry

A chart showing two metrics can stack them in two panes over a shared X axis, or
overlay them in one plot box on two value axes. The card had one example of each
— `tank-water-chart` splits tank level from water usage, `crop-steering-day-chart`
overlays VWC and EC — and no rule saying which applies when.

The rule is the **secondary metric's data shape**, not taste and not the metric
pair. An **interval metric** — one whose value is an aggregate over a time bucket
(fan duty, litres drawn, kWh, irrigation shots) — goes in its own pane, drawn as
bars. An **instantaneous metric** — one with a meaningful value at a point in
time (temperature, humidity, EC) — may overlay the primary on a second axis.
Two panes is the primitive; overlay is the exception that must earn itself.

## Why the shape and not the pair

A bar has no value at an instant, so overlaying an interval metric on a line's
value axis is a category error, not a legibility trade-off. That is why the two
existing charts disagree: usage is a flow over a bucket and VWC/EC are
simultaneous states of the same substrate. Stated as a rule about data shape,
both existing charts are explained without special-casing either, and the choice
for a new combo is checkable rather than argued.

Of the combos this rule was derived against, six of eight have a rate-or-duty
secondary and take two panes; VPD + temperature + humidity is the clear overlay
case, and it overlays for a reason rather than a preference.

## Consequences

`crop-steering-day-chart` already conforms — its shot track is an interval pane
and its EC overlay is instantaneous — which is evidence the rule describes
something real rather than being reverse-engineered to justify a choice. It is
**not** refactored onto the primitive now: it would be the third implementation,
and extracting a shared core from one example bakes that example's accidents into
the abstraction.

Two panes over one X axis means one scrub owner: hovering either pane shows a
single tooltip carrying rows from both, with the interval row labelled as an
interval ("14:00–15:00 · 2.4 L") beside the instant row ("14:23 · 23.1 °C"). The
native `<title>` tooltips on `tank-water-chart`'s bars go — a delayed OS tooltip
is unreachable on touch.

A secondary pane gets a peak cap rather than a value axis, following
`tank-water-chart`'s reasoning that the cap is the scale. It does not inherit
that chart's range total: litres accumulate into a quantity a grower acts on,
where summed fan duty does not.
