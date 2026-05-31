# Replace per-card GrowspaceGridStore with singleton Grid Slice; resolve per-card selection isolation via factory

During the Phase 2 GrowspaceDataStore atom migration (issue #206), `GrowspaceGridStore` — a per-card class that computed `$activeDevices`, `$growspaceOptions`, and `$gridLayout` by reading `GrowspaceDataStore.$devices` and `GrowspaceDataStore.$optimisticDeletedPlantIds` — was rendered dead. Its source atoms were moving to the Grid Slice module, and the Grid Slice already exported a `gridSlice` facade that implements the same `GridSliceRef` interface with identical derived atoms.

We chose to delete `GrowspaceGridStore` and wire `GrowspaceStore.grid` to `gridSlice` directly rather than update `GrowspaceGridStore` to read from the new module atoms.

The consequence: `selectedDeviceId$` is a module-level singleton. Multiple card instances on the same dashboard (e.g. a standalone Growspace Grid Card alongside the main Growspace Manager Card) share one selected device. A card changing its device selection changes it for all cards.

## Considered alternatives

- **Update `GrowspaceGridStore` to read from Grid Slice atoms instead of `GrowspaceDataStore`** — preserves per-card isolation but leaves two classes computing identical derived state from the same source atoms. The class exists solely to hold a per-card `$selectedDevice`; the rest of its body is a duplicate of the Grid Slice module. Not worth keeping.
- **Add per-card `selectedDeviceId$` to `gridSlice` via a factory** — would require `gridSlice` to return a new object per instantiation, breaking the module singleton pattern and requiring callers to manage slice lifetime. Premature for two-card dashboards that are not yet common.

## Resolution

The deferred isolation was implemented when a real regression was reported: a Carousel Card cycling through growspaces B and C was overwriting the main Growspace Manager Card's selection of A, because both shared the singleton `selectedDeviceId$`.

`makePerCardGridSlice()` was added to `slices/grid/index.ts`. It returns a `GridSliceRef` with a **fresh per-instance `atom<string | null>(null)`** for `$selectedDevice`, while still reading from the shared module-level `devices$` and `optimisticDeletedPlantIds$` atoms. Per-card computed atoms (`$activeDevices`, `$growspaceOptions`, `$gridLayout`, `$gridViewState`) are derived locally from those inputs. `GrowspaceStore` now calls `makePerCardGridSlice()` in its constructor instead of using `gridSlice`.

The `gridSlice` singleton is preserved for backward compatibility.
