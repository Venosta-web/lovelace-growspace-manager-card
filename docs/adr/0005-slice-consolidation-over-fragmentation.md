# Absorb small domains into semantically related slices; don't create one slice per API file

During the migration of `tests/unit/services/api/*` to the slice architecture (issue #188 / #189), seven blocked test files each nominally mapped to a "required slice". Treating every legacy API class as a 1:1 slice candidate would have produced five new slices (Growspace, Genetics, Nutrient, Report, Vision, History) plus two extensions to existing ones.

We rejected that mechanical mapping and applied three consolidation rules instead:

1. **No atoms → no slice.** If a domain has no reactive state for cards to subscribe to, it does not need a slice — it needs co-located `hassCall` functions and a test file next to them. `history-api.spec.ts` tests pure transport (`getHistory`, `getBatchHistory`, `getHistoryStats`). Those functions live inside the existing `store/history/history-store` and are tested via `history-store.test.ts`; no `History` slice is created.

2. **Small domain → absorb into the most semantically related slice.** A domain with ≤3 mutators and no atoms of its own is not worth a standalone module. Specifically:
   - **Vision checkup** (`getVisionHistory`, `triggerVisionCheckup`, `updateVisionCheckupConfig`) → Camera slice. Vision is a camera-analysis pipeline, not a peer domain.
   - **Grow report** (`exportGrowReport`, `fetchGrowReport`) → Growspace slice. A report is a per-growspace document; the Growspace slice is the right owner.

3. **UI placement is not domain ownership.** EC Ramp Curves are shown in the Irrigation Dialog but are fundamentally about nutrient EC dosing targets. They belong in the Nutrient slice, not Irrigation.

## New slices created

- **Growspace** — CRUD (`addGrowspace`, `updateGrowspace`, `removeGrowspace`), `fetchGrowspaceData`, `getGrowspaceDevices`, and grow report operations. Replaces `DataService` cache layer — atoms are the cache.
- **Genetics** — Seed Batch and Pollination Event CRUD, `getLineageTree`, `sowSeedBatch`. Distinct from Strain (which owns the library catalog); Genetics owns breeding history records.
- **Nutrient** — Nutrient presets, IPM presets, nutrient inventory, and EC Ramp Curves. Keeps the Irrigation slice focused on scheduling and strategy.

## Considered alternatives

- **One slice per legacy API file** — mechanical but produces a fragmented module graph with many slices owning 1–2 mutators and no atoms.
- **Absorb everything into Irrigation** — rejected; adding 12+ nutrient/IPM mutators to an already large slice creates a god object.
- **Absorb Genetics into Strain** — rejected; Strain owns library curation (strains, phenotypes, breeders), Genetics owns breeding records (seed batches, pollination events). No shared atoms, no shared SM.
