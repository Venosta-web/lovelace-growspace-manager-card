/**
 * Grid slice — atoms, computed state, and sibling setters for the Grid domain.
 *
 * Public API (atoms):
 *   devices$                  — read: all growspace devices (bootstrapped by SyncService)
 *   selectedDeviceId$         — read/write: the currently selected device ID
 *   optimisticDeletedPlantIds$ — read: plant IDs optimistically removed from the grid
 *   activeDevices$            — read: devices with optimistically deleted plants filtered out
 *   growspaceOptions$         — read: device_id → device name map for selectors
 *   gridLayout$               — read: computed grid layout for the selected device
 *
 * Public API (bootstrap writes):
 *   setDevices()              — replace the devices array (called by SyncService)
 *   setSelectedDeviceId()     — set the active device (called by cards / handleDeviceChange)
 *
 * Public API (sibling setters — called by Plant slice cross-slice mutations):
 *   addOptimisticDeletedPlantId()    — mark a plant as optimistically removed from the grid
 *   removeOptimisticDeletedPlantId() — restore a plant after a failed mutation inverse
 *   clearOptimisticDeletedPlantIds() — reset all optimistic deletes (called after a sync)
 *
 * GridSliceRef / gridSlice:
 *   A stable facade object compatible with the legacy ActionContext.grid interface.
 *   Cards and action modules may use `ctx.grid.$selectedDevice` / `ctx.grid.setSelectedDevice()`
 *   through this facade without knowing about the underlying atoms.
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 * Cross-slice side-effects from the Plant slice are accepted via the sibling setters above.
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { GrowspaceDevice, PlantEntity } from '../../types';
import { PlantUtils } from '../../utils/plant-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridLayout {
  effectiveRows: number;
  grid: (PlantEntity | null)[][];
}

export interface GridViewState {
  devices: GrowspaceDevice[];
  selectedDevice: string | null;
  gridLayout: GridLayout;
  growspaceOptions: Record<string, string>;
}

/** Facade interface used by ActionContext.grid and SyncService. */
export interface GridSliceRef {
  readonly $selectedDevice: WritableAtom<string | null>;
  readonly $growspaceOptions: ReadableAtom<Record<string, string>>;
  readonly $activeDevices: ReadableAtom<GrowspaceDevice[]>;
  readonly $gridLayout: ReadableAtom<GridLayout>;
  readonly $gridViewState: ReadableAtom<GridViewState>;
  setSelectedDevice(id: string | null): void;
}

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

/** All growspace devices — bootstrapped by SyncService on every data refresh. */
export const devices$ = atom<GrowspaceDevice[]>([]);

/**
 * The currently selected growspace device ID.
 *
 * NOTE: this is a module-level singleton.  Multiple card instances on the same
 * dashboard share this state.  Per-card selection isolation is deferred to a
 * later refactor step.
 */
export const selectedDeviceId$ = atom<string | null>(null);

/**
 * Plant IDs that have been optimistically removed from the grid by the Plant
 * slice before the backend confirms the mutation.  The Grid slice filters these
 * out of `activeDevices$` so the UI reflects the change immediately.
 */
export const optimisticDeletedPlantIds$ = atom<Set<string>>(new Set());

// ---------------------------------------------------------------------------
// Computed atoms (public)
// ---------------------------------------------------------------------------

/** Devices with optimistically deleted plants stripped out. */
export const activeDevices$ = computed(
  [devices$, optimisticDeletedPlantIds$],
  (devices, deletedIds): GrowspaceDevice[] =>
    devices.map((d) => ({
      ...d,
      plants: d.plants.filter((p) => {
        const pid = p.attributes.plant_id || p.entity_id.replace('sensor.', '');
        return !deletedIds.has(pid);
      }),
    }))
);

/** device_id → device name map for growspace selector dropdowns. */
export const growspaceOptions$ = computed(
  activeDevices$,
  (devices): Record<string, string> =>
    Object.fromEntries(devices.map((d) => [d.deviceId, d.name]))
);

/** Grid layout for the currently selected device. */
export const gridLayout$ = computed(
  [activeDevices$, selectedDeviceId$],
  (devices, selectedId): GridLayout => {
    if (!selectedId) return { effectiveRows: 0, grid: [] };
    const device = devices.find((d) => d.deviceId === selectedId);
    if (!device) return { effectiveRows: 0, grid: [] };
    const effectiveRows = PlantUtils.calculateEffectiveRows(device);
    const { grid } = PlantUtils.createGridLayout(device.plants, effectiveRows, device.plantsPerRow);
    return { effectiveRows, grid };
  }
);

/** Combined view-state atom (one subscription covers grid + selector + device list). */
export const gridViewState$ = computed(
  [activeDevices$, selectedDeviceId$, gridLayout$, growspaceOptions$],
  (devices, selectedDevice, gridLayout, growspaceOptions): GridViewState => ({
    devices,
    selectedDevice,
    gridLayout,
    growspaceOptions,
  })
);

// ---------------------------------------------------------------------------
// Bootstrap writes (public)
// ---------------------------------------------------------------------------

/** Replace the full device list. Called by SyncService after every data refresh. */
export function setDevices(devices: readonly GrowspaceDevice[]): void {
  devices$.set(devices as GrowspaceDevice[]);
}

/** Set the active growspace device. Called by cards via handleDeviceChange. */
export function setSelectedDeviceId(id: string | null): void {
  selectedDeviceId$.set(id);
}

// ---------------------------------------------------------------------------
// Sibling setters — called by Plant slice during cross-slice mutations
// ---------------------------------------------------------------------------

/**
 * Optimistically hide a plant from the grid.
 * Call this from Plant slice mutators (deletePlant, movePlantToGrowspace) before
 * the backend confirms the change so the cell clears immediately.
 */
export function addOptimisticDeletedPlantId(plantId: string): void {
  const ids = new Set(optimisticDeletedPlantIds$.get());
  ids.add(plantId);
  optimisticDeletedPlantIds$.set(ids);
}

/**
 * Restore a plant to the grid (called from the mutation's `inverse` on failure).
 */
export function removeOptimisticDeletedPlantId(plantId: string): void {
  const ids = new Set(optimisticDeletedPlantIds$.get());
  ids.delete(plantId);
  optimisticDeletedPlantIds$.set(ids);
}

/**
 * Clear all optimistic deletes.  Called by GrowspaceStore._pruneOptimisticDeletions
 * after SyncService confirms the backend state.
 */
export function clearOptimisticDeletedPlantIds(): void {
  optimisticDeletedPlantIds$.set(new Set());
}

// ---------------------------------------------------------------------------
// GridSliceRef facade — backward-compatible ActionContext.grid interface
// ---------------------------------------------------------------------------

/**
 * Stable facade that satisfies the `ActionContext.grid` contract used by action
 * modules (ctx.grid.$selectedDevice, ctx.grid.setSelectedDevice, etc.).
 * Pass `gridSlice` wherever `GrowspaceGridStore` was previously expected.
 */
export const gridSlice: GridSliceRef = {
  $selectedDevice: selectedDeviceId$,
  $growspaceOptions: growspaceOptions$,
  $activeDevices: activeDevices$,
  $gridLayout: gridLayout$,
  $gridViewState: gridViewState$,
  setSelectedDevice: setSelectedDeviceId,
};
