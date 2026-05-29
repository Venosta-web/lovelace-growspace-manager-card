/**
 * GridInteraction slice — store-driven interaction state machine for Plant Grid Cells.
 *
 * Public API (atom):
 *   gridInteraction$   — read: current interaction state (discriminated union)
 *
 * Public API (transitions):
 *   select(plantId)        — idle → selected; selected(same) → idle; selected(other) → selected(other);
 *                            confirming-water → selected; no-op while transplanting
 *   confirmWater()         — selected → confirming-water; no-op otherwise
 *   cancel()               — any → idle
 *   startTransplant()      — selected | idle → transplanting; no-op otherwise
 *   completeTransplant()   — transplanting → idle; no-op otherwise
 *
 * The type system (discriminated union) prevents callers from accessing fields
 * that don't exist on a given status — e.g. `plantId` is absent on `idle`.
 * Runtime guards make illegal transitions no-ops so callers never need to
 * pre-check the current status.
 *
 * This slice owns no backend calls — all state is local UI-only.
 * Cross-slice side-effects (Plant mutations, Grid optimistic updates) are
 * triggered by action modules that call transition functions here then call
 * the relevant Plant / Grid slice mutators.
 */

import { atom } from 'nanostores';

// ---------------------------------------------------------------------------
// Types (public)
// ---------------------------------------------------------------------------

export type GridInteractionState =
  | { status: 'idle' }
  | { status: 'selected'; plantId: string }
  | { status: 'confirming-water'; plantId: string }
  | { status: 'transplanting'; sourcePlantId: string | null };

// ---------------------------------------------------------------------------
// Atom (public)
// ---------------------------------------------------------------------------

/** Current interaction state for the Plant Grid. */
export const gridInteraction$ = atom<GridInteractionState>({ status: 'idle' });

// ---------------------------------------------------------------------------
// Transitions (public)
// ---------------------------------------------------------------------------

/**
 * Select a plant cell.
 *
 * - idle            → selected { plantId }
 * - selected(same)  → idle  (toggle: deselects the cell)
 * - selected(other) → selected { plantId }  (switch selection)
 * - confirming-water → selected { plantId }  (aborts confirmation)
 * - transplanting   → no-op  (source plant is locked during transplant)
 */
export function select(plantId: string): void {
  const state = gridInteraction$.get();
  if (state.status === 'transplanting') return;
  if (state.status === 'selected' && state.plantId === plantId) {
    gridInteraction$.set({ status: 'idle' });
    return;
  }
  gridInteraction$.set({ status: 'selected', plantId });
}

/**
 * Open the watering confirmation for the currently selected plant.
 *
 * - selected → confirming-water { plantId }
 * - all other states → no-op
 */
export function confirmWater(): void {
  const state = gridInteraction$.get();
  if (state.status !== 'selected') return;
  gridInteraction$.set({ status: 'confirming-water', plantId: state.plantId });
}

/**
 * Cancel the current interaction and return to idle.
 * Safe to call from any state.
 */
export function cancel(): void {
  gridInteraction$.set({ status: 'idle' });
}

/**
 * Begin transplant mode.
 *
 * - selected → transplanting { sourcePlantId: plantId }
 * - idle     → transplanting { sourcePlantId: null }  (batch edit bar entry point)
 * - all other states → no-op
 */
export function startTransplant(): void {
  const state = gridInteraction$.get();
  if (state.status === 'selected') {
    gridInteraction$.set({ status: 'transplanting', sourcePlantId: state.plantId });
  } else if (state.status === 'idle') {
    gridInteraction$.set({ status: 'transplanting', sourcePlantId: null });
  }
}

/**
 * Finish a transplant and return to idle.
 *
 * - transplanting → idle
 * - all other states → no-op
 */
export function completeTransplant(): void {
  const state = gridInteraction$.get();
  if (state.status !== 'transplanting') return;
  gridInteraction$.set({ status: 'idle' });
}
