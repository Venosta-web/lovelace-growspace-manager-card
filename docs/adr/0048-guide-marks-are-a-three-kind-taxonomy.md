# Guide marks are a three-kind taxonomy, not one dashed line

An Env Graph can draw a horizontal reference line from any of five differently
shaped device-config values, and they are not one concept: a biological optimum
(`vpdThresholds.target*`), a danger boundary (`vpdThresholds.danger*`), a
controller setpoint (`temperature_target ± tolerance`), a controller hysteresis
pair (`humidifierThresholds {on, off}`), and a bare alarm threshold
(`warningLevel`, `moldThreshold`, `haltOnRunoffEcThreshold`). We render them as
three kinds of **guide mark** — **optimal band**, **setpoint**, **limit** — each
with its own mark, rather than as one undifferentiated "target" dash.

A hysteresis pair renders as **two setpoints**, never as an optimal band.
`{on, off}` describes what the controller does, not where the grower wants the
metric to sit; drawing it as a band would assert a preference the config does not
contain.

## Considered options

Rendering everything as one "target" dash was the obvious path and is what the
request originally asked for. It fails on VPD, which alone yields four marks —
optimal min/max plus danger min/max — that a single style renders as four
identical lines with no way to tell which two bound the good region.

`crop-steering-day-chart` had already discovered a taxonomy of two by hand: `6 4`
dashes in the metric colour for the Saturation Target, `2 3` in `STATUS_WARNING`
for the P2 trigger. Naming the kinds generalises what that chart found rather
than inventing a scheme.

## Consequences

**Axis domain follows the kind.** Optimal bands and setpoints are unioned into
the value axis so they cannot clip to the frame edge. Limits are **not** — a
`moldThreshold` far from the data would flatten the real trace into a hairline,
the failure `crop-steering-day-chart`'s EC block already warns about in reverse.
An off-scale limit renders as an edge chevron instead. This is why the taxonomy
has to exist before guide lines can be drawn at all: without it, the domain rule
needs a tuned constant that is right for temperature and wrong for EC.

**Only band edges carry inline labels.** Four labels on a 180px inline chart is a
density problem, not a collision problem to solve. Danger boundaries are read as
a region by colour; their exact values live in the scrub tooltip.

**Day/night-varying marks are step lines.** `vpdThresholds` and
`humidifierThresholds` are indexed by period, and `ChartUtils.getIsDay` already
resolves it per point. A flat line on a 24h or 7d range would sit at a value that
was wrong for half the window, so these marks step at lights-on and lights-off,
with the label anchored to the segment under the current time.

**`crop-steering-day-chart` is reconciled with this.** Its Saturation Target and
P2 trigger were both setpoints while only the target was drawn as one; the retrofit
gives them one mark — the looser `6 4` dash at one weight, unioned into the value
axis — so the reference implementation is the reference for this detail too.

The trigger keeps a hue of its own rather than taking the metric colour: ADR 0047
binds it to `--phase-p2`, which makes it agree with the Phase Strip directly below
it and keeps it distinguishable from the target line a few pixels above. One kind
does not mean one colour, and two identical lines with no way to tell which is
which is the failure this taxonomy exists to prevent.
