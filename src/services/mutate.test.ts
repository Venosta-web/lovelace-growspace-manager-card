/**
 * mutate primitive — unit tests.
 *
 * Tests cover:
 *   - canUndo: false before any action, true after success, false after undo
 *   - mutate: calls optimistic, then apply, then pushes to undo stack
 *   - mutate failure: calls inverse (rollback), does NOT push to undo stack
 *   - undo: calls inverse on the most recent entry and pops it
 *   - undo: no-op when stack is empty
 *   - undo stack is growspace-scoped
 *   - undo stack is capped at MAX_UNDO (10) entries
 *   - setMutateListener: listener is fired after each successful commit
 *   - setMutateListener: listener receives action type, label, and growspaceId
 *   - setMutateListener: listener is NOT called when apply() fails
 *   - setMutateListener: cleared when set to null
 *
 * Isolation: each describe block uses a unique growspace ID prefix so that
 * the module-level undo stack does not bleed between test groups.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mutate, canUndo, undo, setMutateListener } from './mutate';
import type { Action } from './mutate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
/** Return a unique growspace ID so tests don't share undo-stack state. */
function uniqueGsId(): string {
  return `gs-test-${++_idCounter}`;
}

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    type: 'testAction',
    optimistic: vi.fn(),
    inverse: vi.fn(),
    apply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Clean up any listener after each test
// ---------------------------------------------------------------------------

afterEach(() => {
  setMutateListener(null);
});

// ---------------------------------------------------------------------------
// canUndo
// ---------------------------------------------------------------------------

describe('canUndo', () => {
  it('returns false when no action has been taken for a growspace', () => {
    expect(canUndo(uniqueGsId())).toBe(false);
  });

  it('returns true after a successful mutate', async () => {
    const gsId = uniqueGsId();
    await mutate(makeAction(), gsId);
    expect(canUndo(gsId)).toBe(true);
  });

  it('returns false after the single entry has been undone', async () => {
    const gsId = uniqueGsId();
    await mutate(makeAction(), gsId);
    await undo(gsId);
    expect(canUndo(gsId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mutate — happy path
// ---------------------------------------------------------------------------

describe('mutate', () => {
  it('calls optimistic() before apply()', async () => {
    const gsId = uniqueGsId();
    const callOrder: string[] = [];
    const action = makeAction({
      optimistic: vi.fn(() => { callOrder.push('optimistic'); }),
      apply: vi.fn(async () => { callOrder.push('apply'); }),
    });

    await mutate(action, gsId);

    expect(callOrder).toEqual(['optimistic', 'apply']);
  });

  it('pushes an entry onto the undo stack after successful apply', async () => {
    const gsId = uniqueGsId();
    await mutate(makeAction(), gsId);
    expect(canUndo(gsId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mutate — failure / rollback
// ---------------------------------------------------------------------------

describe('mutate failure', () => {
  it('calls inverse() when apply() throws', async () => {
    const gsId = uniqueGsId();
    const action = makeAction({
      apply: vi.fn().mockRejectedValue(new Error('network error')),
    });

    await expect(mutate(action, gsId)).rejects.toThrow('network error');
    expect(action.inverse).toHaveBeenCalledOnce();
  });

  it('does NOT push to the undo stack when apply() throws', async () => {
    const gsId = uniqueGsId();
    const action = makeAction({
      apply: vi.fn().mockRejectedValue(new Error('fail')),
    });

    await expect(mutate(action, gsId)).rejects.toThrow();
    expect(canUndo(gsId)).toBe(false);
  });

  it('re-throws the original error from apply()', async () => {
    const gsId = uniqueGsId();
    const action = makeAction({
      apply: vi.fn().mockRejectedValue(new Error('original')),
    });

    await expect(mutate(action, gsId)).rejects.toThrow('original');
  });
});

// ---------------------------------------------------------------------------
// undo
// ---------------------------------------------------------------------------

describe('undo', () => {
  it('calls inverse() on the most recent action', async () => {
    const gsId = uniqueGsId();
    const action = makeAction();
    await mutate(action, gsId);

    await undo(gsId);

    expect(action.inverse).toHaveBeenCalledOnce();
  });

  it('pops the entry from the stack so canUndo returns false afterwards', async () => {
    const gsId = uniqueGsId();
    await mutate(makeAction(), gsId);
    await undo(gsId);
    expect(canUndo(gsId)).toBe(false);
  });

  it('is a no-op when the stack is empty', async () => {
    const gsId = uniqueGsId();
    // Should not throw
    await expect(undo(gsId)).resolves.toBeUndefined();
  });

  it('undoes in LIFO order (last in, first undone)', async () => {
    const gsId = uniqueGsId();
    const firstInverse = vi.fn();
    const secondInverse = vi.fn();

    await mutate(makeAction({ type: 'first', inverse: firstInverse }), gsId);
    await mutate(makeAction({ type: 'second', inverse: secondInverse }), gsId);

    await undo(gsId);

    expect(secondInverse).toHaveBeenCalledOnce();
    expect(firstInverse).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Growspace scoping
// ---------------------------------------------------------------------------

describe('growspace scoping', () => {
  it('undo stack is independent per growspace', async () => {
    const gsA = uniqueGsId();
    const gsB = uniqueGsId();
    await mutate(makeAction(), gsA);

    expect(canUndo(gsA)).toBe(true);
    expect(canUndo(gsB)).toBe(false);
  });

  it('undoing gsA does not affect gsB stack', async () => {
    const gsA = uniqueGsId();
    const gsB = uniqueGsId();
    await mutate(makeAction(), gsA);
    await mutate(makeAction(), gsB);

    await undo(gsA);

    expect(canUndo(gsB)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stack cap (MAX_UNDO = 10)
// ---------------------------------------------------------------------------

describe('stack cap', () => {
  it('keeps at most 10 entries (oldest is evicted)', async () => {
    const gsId = uniqueGsId();
    const firstInverse = vi.fn();

    // Push 11 actions: first should be evicted
    await mutate(makeAction({ type: 'oldest', inverse: firstInverse }), gsId);
    for (let i = 0; i < 10; i++) {
      await mutate(makeAction({ type: `action-${i}` }), gsId);
    }

    // Undo all 10 remaining — firstInverse should never be called
    for (let i = 0; i < 10; i++) {
      await undo(gsId);
    }

    expect(firstInverse).not.toHaveBeenCalled();
    expect(canUndo(gsId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setMutateListener
// ---------------------------------------------------------------------------

describe('setMutateListener', () => {
  it('listener is called after a successful mutate', async () => {
    const gsId = uniqueGsId();
    const listener = vi.fn();
    setMutateListener(listener);

    await mutate(makeAction(), gsId);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('listener receives the action type, optional label, and growspaceId', async () => {
    const gsId = uniqueGsId();
    const listener = vi.fn();
    setMutateListener(listener);

    await mutate(makeAction({ type: 'waterPlant', label: 'Watered plant' }), gsId);

    expect(listener).toHaveBeenCalledWith(
      { type: 'waterPlant', label: 'Watered plant' },
      gsId
    );
  });

  it('listener receives undefined label when Action has no label', async () => {
    const gsId = uniqueGsId();
    const listener = vi.fn();
    setMutateListener(listener);

    await mutate(makeAction({ type: 'swapPlants' }), gsId);

    expect(listener).toHaveBeenCalledWith({ type: 'swapPlants', label: undefined }, gsId);
  });

  it('listener is NOT called when apply() fails', async () => {
    const gsId = uniqueGsId();
    const listener = vi.fn();
    setMutateListener(listener);

    await expect(
      mutate(makeAction({ apply: vi.fn().mockRejectedValue(new Error('fail')) }), gsId)
    ).rejects.toThrow();

    expect(listener).not.toHaveBeenCalled();
  });

  it('listener is cleared when setMutateListener(null) is called', async () => {
    const gsId = uniqueGsId();
    const listener = vi.fn();
    setMutateListener(listener);
    setMutateListener(null);

    await mutate(makeAction(), gsId);

    expect(listener).not.toHaveBeenCalled();
  });

  it('replacing listener replaces the previous one', async () => {
    const gsId = uniqueGsId();
    const first = vi.fn();
    const second = vi.fn();
    setMutateListener(first);
    setMutateListener(second);

    await mutate(makeAction(), gsId);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
