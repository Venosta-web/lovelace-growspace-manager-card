/**
 * Grid slice — atoms, computed state, and sibling setters for the Grid domain.
 *
 * Public API (atoms):
 *   devices$                  — read: all growspace devices (bootstrapped by SyncService)
 *   optimisticDeletedPlantIds$ — read: plant IDs optimistically removed from the grid
 *   activeDevices$            — read: devices with optimistically deleted plants filtered out
 *   growspaceOptions$         — read: device_id → device name map for selectors
 *
 * The active-growspace selection is per-card only: `makePerCardGridSlice()` mints
 * an isolated `$selectedDevice` atom per card. There is no module-global selection
 * (the old `selectedDeviceId$` / `gridSlice` facade were removed once every reader
 * moved to the per-card slice — see CONTEXT.md "Active growspace" and ADR-0027).
 *
 * Public API (bootstrap writes):
 *   setDevices()              — replace the devices array (called by SyncService)
 *
 * Public API (sibling setters — called by Plant/Irrigation/Growspace slice cross-slice mutations):
 *   addOptimisticDeletedPlantId()      — mark a plant as optimistically removed from the grid
 *   removeOptimisticDeletedPlantId()   — restore a plant after a failed mutation inverse
 *   clearOptimisticDeletedPlantIds()   — reset all optimistic deletes (called after a sync)
 *   patchDeviceIrrigationConfig()      — patch one device's irrigationConfig
 *   patchDeviceStrategy()              — patch one device's irrigationStrategy
 *   patchDeviceEnvironmentAttributes() — patch one device's environmentAttributes
 *
 * Action type, payload shapes, and zod schemas are private to this module.
 * Cross-slice side-effects from the Plant slice are accepted via the sibling setters above.
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { GrowspaceDevice, PlantEntity } from '../../types';
import type { EnvironmentAttributes, IrrigationConfig, IrrigationStrategy } from '../../services/types';
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

/** plantId → deviceId map for O(1) lookups. Derived from raw devices$ (not filtered). */
export const plantToDeviceMap$ = computed(devices$, (devices): Map<string, string> => {
  const map = new Map<string, string>();
  for (const device of devices) {
    for (const plant of device.plants) {
      const pid = plant.attributes.plant_id || plant.entity_id.replace('sensor.', '');
      map.set(pid, device.deviceId);
    }
  }
  return map;
});

/** device_id → device name map for growspace selector dropdowns. */
export const growspaceOptions$ = computed(
  activeDevices$,
  (devices): Record<string, string> => Object.fromEntries(devices.map((d) => [d.deviceId, d.name]))
);

// ---------------------------------------------------------------------------
// Bootstrap writes (public)
// ---------------------------------------------------------------------------

/** Replace the full device list. Called by SyncService after every data refresh. */
export function setDevices(devices: readonly GrowspaceDevice[]): void {
  devices$.set(devices as GrowspaceDevice[]);
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

/**
 * Patch a single device's irrigationConfig in place.
 * Called by irrigation action handlers that previously called GrowspaceDataStore.patchDeviceIrrigationConfig().
 */
export function patchDeviceIrrigationConfig(
  growspaceId: string,
  patch: Partial<IrrigationConfig>
): void {
  const current = devices$.get();
  const idx = current.findIndex((d) => d.deviceId === growspaceId);
  if (idx === -1) return;
  devices$.set(
    current.map((d, i) =>
      i === idx ? { ...d, irrigationConfig: { ...d.irrigationConfig, ...patch } } : d
    )
  );
}

/**
 * Patch a single device's irrigationStrategy in place, mirroring
 * patchDeviceIrrigationConfig. Lets immediate-persist strategy writes (Shot
 * Sizing Mode, Substrate Profile, EC Modulation — ADR-0017) reflect on the
 * device the dialog reads, so the Steering tab relabel and the toggles update
 * optimistically rather than waiting for a full device sync.
 */
export function patchDeviceStrategy(
  growspaceId: string,
  patch: Partial<IrrigationStrategy>
): void {
  const current = devices$.get();
  const idx = current.findIndex((d) => d.deviceId === growspaceId);
  if (idx === -1) return;
  devices$.set(
    current.map((d, i) =>
      i === idx
        ? {
            ...d,
            irrigationStrategy: { ...(d.irrigationStrategy ?? {}), ...patch } as IrrigationStrategy,
          }
        : d
    )
  );
}

/**
 * Patch a single device's environmentAttributes in place.
 * Lets immediate-persist environment controls (humidifier/dehumidifier control
 * enable) reflect on the device the config dialog reads optimistically, rather
 * than waiting for a full device sync to round-trip through hass.
 */
export function patchDeviceEnvironmentAttributes(
  growspaceId: string,
  patch: Partial<EnvironmentAttributes>
): void {
  const current = devices$.get();
  const idx = current.findIndex((d) => d.deviceId === growspaceId);
  if (idx === -1) return;
  devices$.set(
    current.map((d, i) =>
      i === idx ? { ...d, environmentAttributes: { ...d.environmentAttributes, ...patch } } : d
    )
  );
}

/**
 * Create a per-card GridSliceRef with an isolated $selectedDevice atom.
 *
 * Shared module atoms (devices$, optimisticDeletedPlantIds$) are the data
 * source, so all cards see the same device list. Only selectedDevice is
 * per-card, so carousel and standalone cards don't interfere with each other.
 */
export function makePerCardGridSlice(): GridSliceRef {
  const selectedDevice$ = atom<string | null>(null);

  const perCardActiveDevices$ = computed(
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

  const perCardGrowspaceOptions$ = computed(
    perCardActiveDevices$,
    (devices): Record<string, string> =>
      Object.fromEntries(devices.map((d) => [d.deviceId, d.name]))
  );

  const perCardGridLayout$ = computed(
    [perCardActiveDevices$, selectedDevice$],
    (devices, selectedId): GridLayout => {
      if (!selectedId) return { effectiveRows: 0, grid: [] };
      const device = devices.find((d) => d.deviceId === selectedId);
      if (!device) return { effectiveRows: 0, grid: [] };
      const effectiveRows = PlantUtils.calculateEffectiveRows(device);
      const { grid } = PlantUtils.createGridLayout(device.plants, effectiveRows, device.plantsPerRow);
      return { effectiveRows, grid };
    }
  );

  const perCardGridViewState$ = computed(
    [perCardActiveDevices$, selectedDevice$, perCardGridLayout$, perCardGrowspaceOptions$],
    (devices, selectedDevice, gridLayout, growspaceOptions): GridViewState => ({
      devices,
      selectedDevice,
      gridLayout,
      growspaceOptions,
    })
  );

  return {
    $selectedDevice: selectedDevice$,
    $growspaceOptions: perCardGrowspaceOptions$,
    $activeDevices: perCardActiveDevices$,
    $gridLayout: perCardGridLayout$,
    $gridViewState: perCardGridViewState$,
    setSelectedDevice: (id) => selectedDevice$.set(id),
  };
}
