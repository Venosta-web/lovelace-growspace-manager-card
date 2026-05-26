/**
 * mutate primitive — owns optimistic updates, undo stack, and sync trigger.
 *
 * Replaces undo-redo-manager.ts + sync-service.ts for migrated mutators.
 * Each slice builds its domain mutators on top of this primitive.
 *
 * The undo stack is scoped per growspace so that undoing on Tent B cannot
 * silently roll back an action taken on Tent A.
 */

export interface Action {
  /** Human-readable identifier for debugging (e.g. 'waterPlant'). */
  type: string;
  /** Apply the optimistic update to local atoms immediately. */
  optimistic: () => void;
  /** Reverse the optimistic update — called on failure or undo. */
  inverse: () => void;
  /** Persist the change to Home Assistant via hassCall. */
  apply: () => Promise<void>;
}

type UndoEntry = { type: string; inverse: () => void };

const _undoStack = new Map<string, UndoEntry[]>();
const MAX_UNDO = 10;

function _stackFor(growspaceId: string): UndoEntry[] {
  let stack = _undoStack.get(growspaceId);
  if (!stack) {
    stack = [];
    _undoStack.set(growspaceId, stack);
  }
  return stack;
}

/**
 * Execute an action: optimistic → apply → record undo.
 * On apply failure: run inverse (rollback) and re-throw.
 *
 * @param growspaceId  The growspace this action belongs to. Undo entries
 *                     never cross growspace boundaries.
 */
export async function mutate(action: Action, growspaceId: string): Promise<void> {
  action.optimistic();
  try {
    await action.apply();
  } catch (err) {
    action.inverse();
    throw err;
  }
  const stack = _stackFor(growspaceId);
  stack.push({ type: action.type, inverse: action.inverse });
  if (stack.length > MAX_UNDO) {
    stack.shift();
  }
}

/** Whether there is an action on the undo stack for the given growspace. */
export function canUndo(growspaceId: string): boolean {
  return (_undoStack.get(growspaceId)?.length ?? 0) > 0;
}

/** Undo the most recent successful action for the given growspace. */
export async function undo(growspaceId: string): Promise<void> {
  const entry = _undoStack.get(growspaceId)?.pop();
  if (!entry) return;
  entry.inverse();
}
