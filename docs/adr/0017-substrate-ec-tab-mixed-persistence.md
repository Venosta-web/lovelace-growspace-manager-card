# Substrate & EC tab: mixed persistence with server-authoritative capability gates

The Crop Steering Command Center's **Substrate & EC tab** (`substrate_ec`) writes
its controls two different ways, deliberately:

- **Immediate persist** (own partial `updateIrrigationStrategy` call, no tab dirty
  state) for **Shot Sizing Mode**, **Substrate Profile**, and the **EC Modulation**
  toggle. These are *capability-affecting* strategy fields. Sizing Mode relabels the
  Steering tab's shot fields, and Substrate Profile feeds the backend's
  `volume_mode_capable` flag — persisting them at once means the Steering tab reads
  the mode from the **live strategy** (not a cross-tab draft) and the Volume Mode
  unlock reacts in the same session, without the card re-deriving `volume_mode_capable`
  client-side. As a consequence `shotSizingMode` is removed from the Steering tab's
  draft, `isSteeringDirty`, and steering hydrate.
- **Buffered + validated** (in the tab draft, written via the dialog's existing
  unified `save-all`) for the **Pore EC Target Band** (min/max) and the pre-existing
  per-stage feed-EC ranges. The band's two values are interdependent (min ≤ max), so
  buffering lets us validate the pair on Save and never persist an invalid
  intermediate. The band is a strategy field, so it merges into the `save-all`
  strategy params from `tabs.substrate_ec`; `isSubstrateEcDirty` covers it.

**Capability gates stay server-authoritative.** Volume Mode is gated by the backend's
`volume_mode_capable` bool (configured profile *and* positive pump flow rate); EC
Modulation by the presence of pore-EC sensors. Only the *locked-hint text* is deduced
client-side ("Set liters per pot…" vs "Set a pump flow rate…", from
`volume_mode_capable` + `substrate_profile.liters_per_pot`) — no client copy of the
gate predicate, and no backend change to expose the flow rate.

## Considered alternatives

- **All controls buffered with the tab Save.** Rejected: the Volume Mode unlock would
  lag behind an unsaved profile, forcing either a two-step "set profile → Save → toggle"
  flow or an optimistic client-side re-derivation of `volume_mode_capable` (duplicating
  the backend predicate — see CLAUDE.md "component side lands first").
- **Sizing Mode kept in the Steering draft, written cross-tab** from the Substrate & EC
  toggle. Rejected: splits the dirty/save story across two tabs (toggle on one, dirty
  on another) and couples their drafts.
