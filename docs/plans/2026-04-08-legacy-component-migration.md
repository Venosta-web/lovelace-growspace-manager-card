# Legacy Component Migration to Container/UI Pattern

**Date:** 2026-04-08  
**Goal:** Empty `src/components/` of all fat components by migrating each to the v2 Container/UI pattern.

---

## Background

The v2 pattern splits every component into two pieces:

- **UI component** (`features/<domain>/components/<name>-ui.ts`) — receives all data via `@property()`, emits pure DOM events, holds no store references, no `@lit/context`, no HA API imports.
- **Container component** (`features/<domain>/containers/<name>.container.ts`) — subscribes to the store, computes ViewModels, feeds the UI component its props, and translates DOM events into store actions.

`plant-card` and `growspace-grid` already follow this pattern and serve as the reference implementation.

---

## Current State

| Legacy file | Lines | v2 status |
|---|---|---|
| `components/plant-card.ts` | 349 | Done — `USE_NEW_PLANT_CARD` flipped to `true` |
| `components/growspace-grid.ts` | 663 | Done — `USE_NEW_GROWSPACE_GRID` flipped to `true` |
| `components/growspace-toast.ts` | 170 | Not started |
| `components/growspace-analytics.ts` | 299 | Not started |
| `components/growspace-header.ts` | 262 | Not started |
| `components/heatmap-3d.ts` | 1206 | Not started |

---

## Migration Plan

### Step 1 — Delete dead code

Both feature flags are permanently `true`. Remove:

- `src/components/plant-card.ts`
- `src/components/growspace-grid.ts`
- The `else` branches in `growspace-view-standard.ts` and `growspace-view-compact.ts` that reference the legacy grid
- The `FEATURE_FLAGS.USE_NEW_PLANT_CARD` and `FEATURE_FLAGS.USE_NEW_GROWSPACE_GRID` entries from `feature-flags.ts`
- All dead `import` statements pointing to the deleted files

### Step 2 — `growspace-toast` → `features/ui/`

**Container** (`features/ui/containers/growspace-toast.container.ts`):
- Consumes `storeContext`
- Subscribes to `store.ui.$notification`
- Runs auto-dismiss timer in `updated()` and calls `store.ui.clearToast()`
- Cleans up timer in `disconnectedCallback()`
- Passes `notification` prop to UI; listens for `toast-action-clicked`

**UI** (`features/ui/components/growspace-toast-ui.ts`):
- Receives `notification: ToastNotification | null`
- Emits `toast-action-clicked` when the action button is pressed

### Step 3 — `growspace-analytics` → `features/ui/`

**Container** (`features/ui/containers/growspace-analytics.container.ts`):
- Consumes `hassContext` and `storeContext`
- Subscribes to `store.history.$analyticsViewState`
- Calls `startAutoRefresh()` / `stopAutoRefresh()` in `connectedCallback` / `disconnectedCallback`
- Calls `loadHistoryOnDemand()` in `firstUpdated` and when state is stale
- Computes `itemsToRender` from store state and passes it to the UI
- Handles `toggle-graph`, `unlink-graphs`, `unlink-graph` events from the UI

**UI** (`features/ui/components/growspace-analytics-ui.ts`):
- Receives `items`, `isLoading`, `range`, `hass`, `device`
- Emits `toggle-graph`, `unlink-graphs`, `unlink-graph`
- Renders env charts and the time-range selector

### Step 4 — `growspace-header` → `features/ui/`

**Container** (`features/ui/containers/growspace-header.container.ts`):
- Consumes `hassContext`, `storeContext`, `configContext`
- Subscribes to `store.$headerState`
- Calls `loadHistoryOnDemand()` + `startAutoRefresh()` on connect; reloads when device changes
- Calls `MetricsUtils.computeHeaderMetrics(...)` to produce `heroChips`, `secondaryChips`, `deviceChips`, `dominant`
- Holds `HeaderDragController`; handles `chip-drag-start` and `chip-drop` events; calls `store.history.linkGraphs`
- Handles `toggle-graph`, `handle-device-change`, `unlink-graphs`, `open-nutrients`

**UI** (`features/ui/components/growspace-header-ui.ts`):
- Receives all computed data as props
- Holds `ResizeController` (DOM-only, no store) for `isMobile`
- Holds `@state() _mobileLink` (pure display toggle)
- Renders existing sub-components: `header-hero`, `header-stages`, `header-secondary`, `header-actions`
- Emits all interaction events upward

### Step 5 — `heatmap-3d` → `features/ui/`

Plan deferred until Steps 1–4 are complete. The component is 1206 lines; read it in full before designing the split.

---

## File Locations

All new files land in `src/features/ui/`:

```
src/features/ui/
  components/
    growspace-toast-ui.ts
    growspace-analytics-ui.ts
    growspace-header-ui.ts
  containers/
    growspace-toast.container.ts
    growspace-analytics.container.ts
    growspace-header.container.ts
```

---

## Rules for Every Migration

1. UI components: no `@lit/context`, no Nanostores, no HA API imports.
2. Containers: minimal CSS/HTML — only enough to host the UI element.
3. Update every import site after moving a component.
4. Delete the legacy file as soon as its replacement is wired up.
