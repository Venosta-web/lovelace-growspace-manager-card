# Breeding UI — Phase 3 Design

**Date:** 2026-05-06  
**Scope:** Frontend breeding/genetics UI on top of the Phase 1–2 backend and type layer

---

## Overview

Four discrete features. Each has a clear home in the existing UI — no new top-level dialogs needed.

---

## 1. Sex Badge on Plant Cards

**Where:** Status icon row in `plant-card-ui.ts` (alongside training/IPM/watering dots)

**Behaviour:** Only renders when `sex !== 'unknown'`. Keeps cards clean for unsexed plants.

| Sex | Symbol | Color |
|-----|--------|-------|
| female | ♀ | `#4caf50` |
| male | ♂ | `#2196f3` |
| hermaphrodite | ⚥ | `#ff9800` |

**Implementation:** `_renderSexBadge(plant)` method on `PlantCardUI`. Returns a styled `<span>` inserted into the existing `status-icons` div. No new component. Setting sex is done from the Genetics tab (Section 4) — badge is read-only on the card.

---

## 2. Seed Inventory Panel

**Where:** Existing `list` sub-view of the Seeds tab in the Strain Library dialog.

**Batch card shows:** Strain name, breeder, generation, quantity remaining, lineage, parent cross (e.g. "OG Kush × Durban Poison") if set.

**Actions per card:**
- **Edit** — switches to `add-batch` sub-view pre-filled with batch data
- **Delete** — confirmation prompt, calls `deleteSeedBatch`
- **Sow** — opens inline batch-plant-creation form (see below)

**Sow flow** reuses existing batch-add-plants logic:
- Growspace selector
- Starting position picker
- Quantity input (capped at batch `quantity`)
- Strain pre-filled from batch, locked
- Phenotype auto-increments: "Pheno #1", "Pheno #2" … up to chosen quantity
- `seed_batch_id` and `generation` stamped on each created plant

On confirm: calls existing `addPlants` (batch) action, then `sowSeed` for each plant, decrementing batch quantity.

---

## 3. Pollination Event Log

**Where:** `log-pollination` sub-view of the Seeds tab. Splits into **event list** (new default) and **form** (existing, accessed via "Add Pollination" button in header).

**Event card shows:**
- Date
- Donor plant name + phenotype × Receiver plant name + phenotype (resolved from plant list)
- "Seeds harvested ✓" badge if `result_seed_batch_id` set; otherwise a "Harvest Seeds" button
- Notes (collapsed, expand on tap)

**Actions per event:**
- **Edit** — form pre-filled with event data, calls `updatePollination`
- **Harvest Seeds** — inline harvest form (quantity + notes), calls `harvestSeeds` — only when no result batch yet
- **Delete** — confirmation prompt, calls `deletePollination`

No new sub-view states. Existing `log-pollination` and `harvest` sub-views handle forms; event list is the new default render.

---

## 4. Genetics Tab (Plant Overview) + Lineage Panel (Strain Library)

### Genetics tab in Plant Overview

**Where:** 5th tab added to `plant-overview.container.ts` alongside Dashboard/Actions/Timeline/Harvest. Always visible (not stage-gated).

**Identity block (top):**
- Sex selector dropdown → calls `setPlantSex` on change
- Seed batch origin — chip showing batch strain + generation if linked; "Link to batch" button (opens searchable batch picker, calls `sowSeed`) if not
- Generation — read-only, derived from linked batch

**Lineage tree (below):**
- Fetches via `getLineageTree` WebSocket on tab open
- Plain CSS flex tree, current plant at top, parents and grandparents below, max 5 levels
- Each node: label, generation badge, sex icon if known
- Loading skeleton while fetching; "No lineage data" empty state

### Lineage panel in Strain Library Seeds tab

**Where:** Batch detail view (clicking a batch card expands it). A "Lineage" section below batch info shows the same tree component rooted at `parent_1 × parent_2` as a static two-node tree.

### Shared component

One `lineage-tree.ts` component used in both Plant Overview and Strain Library contexts.

---

## Implementation Order

1. `lineage-tree.ts` shared component (no dependencies)
2. Sex badge in `plant-card-ui.ts` (quick win, isolated)
3. Seed Inventory Panel — extend existing Seeds list sub-view
4. Pollination Event Log — extend existing log-pollination sub-view
5. Genetics tab in Plant Overview — wire sex selector + lineage tree
6. Lineage panel in Strain Library — reuse lineage tree in batch detail
