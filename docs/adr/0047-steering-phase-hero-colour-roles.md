# ADR 0047 — Steering Phase Hero Colour Roles

- Status: accepted
- Date: 2026-08-29
- Issue: #828
- Related: ADR 0035 (binding-context sorting), ADR 0042 (phase palette), ADR 0045 (chrome roles versus metric data)

The Steering Phase Hero Card keeps teal as its feature-chrome identity through a new
`--crop-steering-accent` role (`#26c6da`), while its VWC data continues to use the Soil
Moisture metric palette. The role owns the card border, background tints, hover and active
states, inset ring, and icon; sharing today's value with `--stage-clone` and
`--metric-irrigation-flow` no longer couples those meanings, and the role is free to
diverge later. The binding is intentionally chrome rather than data, following ADR 0045's
split. This is a named visual non-change: the chrome remains teal.

The threshold is the **P2 trigger**: it is the VWC floor below which maintenance shots
fire during P2. P3 begins at its scheduled or auto-advanced time boundary, not at this VWC
threshold. The label therefore stays “P2 trigger” and both its line and label bind to
`--phase-p2`. **Named visual change:** the trigger guide moves from P3 orange to P2 blue,
agreeing with the Phase Strip directly below it.
