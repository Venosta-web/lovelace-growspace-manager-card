# ADR 0027 — Dialogs Carry Their Target Growspace in the Payload

**Status:** Accepted

## Context

The add-plant flow broke with **"No growspace selected"** on every save (empty grid
cell → Add Plant), and the growspace header's Add Plant button opened no dialog at
all. Root cause: a regression from the [[ActionDispatcher]] retirement (#342–344).

Two `$selectedDevice` atoms coexist (see CONTEXT.md **[[Active growspace]]**):

- the page-global `selectedDeviceId$` (`slices/grid/index.ts`, via the `gridSlice`
  facade) — the pre-slice shared atom, now **never written by any live code**; and
- a per-card isolated atom from `makePerCardGridSlice()`, owned by every
  [[GrowspaceDataStore]] (`store.grid.$selectedDevice`) and the **only** one written —
  by `handleDeviceChange` and every [[Bootstrap controller]]. Per-card isolation is
  deliberate so carousel and standalone cards don't clobber each other's selection
  (same motivation as the page-global-UI-state fixes, #406/#407/#408).

Pre-retirement, add-plant dispatched `store.actions.plant.confirmAdd`, whose handler
read `ctx.grid.$selectedDevice` (per-card) — correct. The retirement inlined those
handlers into the dialog host but repointed them at the **global** atom, which always
reads `null`. The dialog's `render()` kept reading the per-card atom, so it *displayed*
the right growspace while the confirm silently resolved to nothing — which is exactly
why the bug looked like "it knows the growspace but won't save."

The underlying flaw is not a typo — it is **re-deriving the target growspace from
ambient page state at confirm time** instead of binding it when the dialog is opened.
Ambient re-derivation is fragile: it depends on a single "current selection" being
correct and global, an assumption the per-card architecture deliberately broke. The
irrigation and IPM dialogs already sidestep this by carrying an explicit `growspaceId`
in their open payload.

## Decision

**A dialog that acts on a growspace captures that growspace's id in its open payload;
handlers read the payload, never ambient selection.**

Concretely for add-plant:

1. `AddPlantDialogState` / `AddPlantsDialogState` gain a `growspaceId` field
   (`lib/types/dialog.ts`).
2. The dialog openers supply it from a **per-card** source at open time:
   grid container → `store.grid.$selectedDevice.get()`; header and heatmap-3d →
   `this.device.deviceId`. The no-arg `openAddPlantDialog()` first-empty-cell path
   resolves against the passed growspace, not the global atom.
3. `_confirmAddPlant` / `_confirmAddPlants` read
   `active.payload.growspaceId ?? this.store.grid.$selectedDevice.get()` — the
   per-card store is the only fallback. **The global `selectedDeviceId$` is never
   read.**

This aligns add-plant with the irrigation/IPM dialogs and generalizes to any future
growspace-scoped dialog.

## Considered Options

- **Minimal repoint (rejected).** Point the two confirm handlers at
  `this.store.grid.$selectedDevice` and leave the open path alone. Rejected because
  the no-arg header opener is a global *free function* with no store access, so fixing
  it forces a signature change regardless — the "minimal" edge disappears — and it
  leaves the ambient-selection fragility in place for the next dialog to trip over.

## Consequences

- The dead global `selectedDeviceId$` / `gridSlice` facade is **not** removed here
  (it has glossary and test references); it is left for a separate cleanup so this
  change stays a scoped bug fix.
- Any new growspace-scoped dialog must thread its `growspaceId` through the payload;
  reading ambient selection at confirm time is now an explicit anti-pattern.
