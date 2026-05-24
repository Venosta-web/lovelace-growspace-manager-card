/**
 * mutate primitive — owns optimistic updates, undo stack, and sync trigger.
 *
 * Replaces undo-redo-manager.ts + sync-service.ts for migrated mutators.
 * Each slice builds its domain mutators on top of this primitive.
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

const _undoStack: UndoEntry[] = [];
const MAX_UNDO = 10;

/**
 * Execute an action: optimistic → apply → record undo.
 * On apply failure: run inverse (rollback) and re-throw.
 */
export async function mutate(action: Action): Promise<void> {
  action.optimistic();
  try {
    await action.apply();
  } catch (err) {
    action.inverse();
    throw err;
  }
  _undoStack.push({ type: action.type, inverse: action.inverse });
  if (_undoStack.length > MAX_UNDO) {
    _undoStack.shift();
  }
}

/** Whether there is an action on the undo stack. */
export function canUndo(): boolean {
  return _undoStack.length > 0;
}

/** Undo the most recent successful action. */
export async function undo(): Promise<void> {
  const entry = _undoStack.pop();
  if (!entry) return;
  entry.inverse();
}
