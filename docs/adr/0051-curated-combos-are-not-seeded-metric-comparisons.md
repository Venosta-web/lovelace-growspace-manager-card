# Curated Combos are not seeded Metric Comparisons

A Curated Combo pairs a metric with a second one the card asserts belongs beside
it — temperature with exhaust duty, soil moisture with irrigation shots. A
[[Metric Comparison]] is a group of two to four metrics the *grower* chose. Both
render several metrics in one chart, and the plumbing for Comparison already
exists, so shipping combos as pre-seeded Comparisons is the obvious move. We do
not: a Curated Combo is a distinct `AnalyticsItem` type with its own renderer.

## Why not reuse Comparison

Comparison's contract is that the grower owns the grouping — they compose it in
Compare, it persists per-user per-growspace, and they can unlink it. A combo
makes an editorial claim Comparison deliberately does not make: *these two belong
together, and this one is the primary while that one is context*. Seeding a combo
into Comparison would hand the grower an unlink chip that dismantles Temperature
+ Exhaust into two charts, one of which — exhaust duty alone on an auto axis — is
close to meaningless on its own.

The asymmetry is the point and it has a rendering consequence: a combo hard-codes
its secondary as bars in a subordinate pane per ADR-0049, which an arbitrary-N
overlay can never do. Comparison must handle two to four metrics of any kind;
a combo is a fixed recipe with a known shape.

Branching one `AnalyticsItem type: 'group'` renderer on whether its metrics
happen to match a known recipe was the third option, and it makes one type mean
two renderings depending on content.

## Consequences

The recipe set — which pairs exist, which side is primary — is a hard-coded table
beside `METRIC_CONFIG`, where the pairing sits next to the colour, unit and icon
facts it depends on. It is deliberately **not** card YAML config yet: the
editorial claim is the whole value, and a `combos:` key would have growers
curating before there is an established sense of what a good combo is. The
`hidden_graphs` surface is the precedent if that changes.

Deriving the table automatically from the descriptor's config relationships was
rejected. Temperature↔exhaust is a real control relationship, but CO₂↔exhaust is
an *anti*correlation and DLI↔pace is a derived series, so derivation collapses
into a hand-written table with indirection in front of it.
