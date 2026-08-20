/**
 * GridInteraction slice — unit tests.
 *
 * Covers: discriminated-union atom default, all legal state transitions,
 * and no-op behaviour for illegal transitions.
 * No Lit components, no store, no mocks needed — atoms are pure nanostores.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  gridInteraction$,
  select,
  confirmWater,
  cancel,
  startTransplant,
  completeTransplant,
  type GridInteractionState,
} from './index';

// ---------------------------------------------------------------------------
// State reset before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  gridInteraction$.set({ status: 'idle' });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('gridInteraction$', () => {
  it('starts in the idle state', () => {
    const state = gridInteraction$.get();
    expect(state.status).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// select()
// ---------------------------------------------------------------------------

describe('select()', () => {
  it('transitions from idle to selected with the given plant ID', () => {
    select('plant-1');
    const state = gridInteraction$.get() as Extract<GridInteractionState, { status: 'selected' }>;
    expect(state.status).toBe('selected');
    expect(state.plantId).toBe('plant-1');
  });

  it('toggles back to idle when the same plant is selected again', () => {
    select('plant-1');
    select('plant-1');
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('switches to a different plant when a new ID is selected while already selected', () => {
    select('plant-1');
    select('plant-2');
    const state = gridInteraction$.get() as Extract<GridInteractionState, { status: 'selected' }>;
    expect(state.status).toBe('selected');
    expect(state.plantId).toBe('plant-2');
  });

  it('transitions from confirming-water to selected when a plant is selected', () => {
    select('plant-1');
    confirmWater();
    select('plant-2');
    const state = gridInteraction$.get() as Extract<GridInteractionState, { status: 'selected' }>;
    expect(state.status).toBe('selected');
    expect(state.plantId).toBe('plant-2');
  });

  it('is a no-op during transplanting (source plant is locked)', () => {
    select('plant-1');
    startTransplant();
    select('plant-2');
    const state = gridInteraction$.get() as Extract<
      GridInteractionState,
      { status: 'transplanting' }
    >;
    expect(state.status).toBe('transplanting');
    expect(state.sourcePlantId).toBe('plant-1');
  });
});

// ---------------------------------------------------------------------------
// confirmWater()
// ---------------------------------------------------------------------------

describe('confirmWater()', () => {
  it('transitions from selected to confirming-water, carrying the plant ID', () => {
    select('plant-1');
    confirmWater();
    const state = gridInteraction$.get() as Extract<
      GridInteractionState,
      { status: 'confirming-water' }
    >;
    expect(state.status).toBe('confirming-water');
    expect(state.plantId).toBe('plant-1');
  });

  it('is a no-op when idle', () => {
    confirmWater();
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('is a no-op when already confirming-water', () => {
    select('plant-1');
    confirmWater();
    confirmWater();
    const state = gridInteraction$.get() as Extract<
      GridInteractionState,
      { status: 'confirming-water' }
    >;
    expect(state.status).toBe('confirming-water');
    expect(state.plantId).toBe('plant-1');
  });

  it('is a no-op when transplanting', () => {
    select('plant-1');
    startTransplant();
    confirmWater();
    expect(gridInteraction$.get().status).toBe('transplanting');
  });
});

// ---------------------------------------------------------------------------
// cancel()
// ---------------------------------------------------------------------------

describe('cancel()', () => {
  it('resets to idle from selected', () => {
    select('plant-1');
    cancel();
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('resets to idle from confirming-water', () => {
    select('plant-1');
    confirmWater();
    cancel();
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('resets to idle from transplanting', () => {
    select('plant-1');
    startTransplant();
    cancel();
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('is a no-op when already idle', () => {
    cancel();
    expect(gridInteraction$.get().status).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// startTransplant()
// ---------------------------------------------------------------------------

describe('startTransplant()', () => {
  it('transitions from selected to transplanting, recording the source plant', () => {
    select('plant-1');
    startTransplant();
    const state = gridInteraction$.get() as Extract<
      GridInteractionState,
      { status: 'transplanting' }
    >;
    expect(state.status).toBe('transplanting');
    expect(state.sourcePlantId).toBe('plant-1');
  });

  it('transitions from idle to transplanting with null sourcePlantId (batch edit bar entry)', () => {
    startTransplant();
    const state = gridInteraction$.get() as Extract<
      GridInteractionState,
      { status: 'transplanting' }
    >;
    expect(state.status).toBe('transplanting');
    expect(state.sourcePlantId).toBeNull();
  });

  it('is a no-op when confirming-water', () => {
    select('plant-1');
    confirmWater();
    startTransplant();
    expect(gridInteraction$.get().status).toBe('confirming-water');
  });

  it('is a no-op when already transplanting', () => {
    select('plant-1');
    startTransplant();
    startTransplant();
    const state = gridInteraction$.get() as Extract<
      GridInteractionState,
      { status: 'transplanting' }
    >;
    expect(state.status).toBe('transplanting');
    expect(state.sourcePlantId).toBe('plant-1');
  });
});

// ---------------------------------------------------------------------------
// completeTransplant()
// ---------------------------------------------------------------------------

describe('completeTransplant()', () => {
  it('transitions from transplanting to idle', () => {
    select('plant-1');
    startTransplant();
    completeTransplant();
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('is a no-op when idle', () => {
    completeTransplant();
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('is a no-op when selected', () => {
    select('plant-1');
    completeTransplant();
    const state = gridInteraction$.get() as Extract<GridInteractionState, { status: 'selected' }>;
    expect(state.status).toBe('selected');
    expect(state.plantId).toBe('plant-1');
  });

  it('is a no-op when confirming-water', () => {
    select('plant-1');
    confirmWater();
    completeTransplant();
    expect(gridInteraction$.get().status).toBe('confirming-water');
  });
});

// ---------------------------------------------------------------------------
// Type-level: discriminated union narrows correctly
// ---------------------------------------------------------------------------

describe('GridInteractionState discriminated union', () => {
  it('idle carries no plant ID', () => {
    const state = gridInteraction$.get();
    expect(state.status).toBe('idle');
    // TypeScript narrowing: 'plantId' does not exist on idle state
    expect('plantId' in state).toBe(false);
  });

  it('selected exposes plantId', () => {
    select('plant-ts');
    const state = gridInteraction$.get();
    if (state.status === 'selected') {
      expect(state.plantId).toBe('plant-ts');
    }
  });

  it('confirming-water exposes plantId', () => {
    select('plant-ts');
    confirmWater();
    const state = gridInteraction$.get();
    if (state.status === 'confirming-water') {
      expect(state.plantId).toBe('plant-ts');
    }
  });

  it('transplanting exposes sourcePlantId', () => {
    select('plant-ts');
    startTransplant();
    const state = gridInteraction$.get();
    if (state.status === 'transplanting') {
      expect(state.sourcePlantId).toBe('plant-ts');
    }
  });
});
