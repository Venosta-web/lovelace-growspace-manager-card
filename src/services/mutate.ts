/**
 * mutate primitive — owns optimistic updates, undo stack, and sync trigger.
 *
 * Replaces undo-redo-manager.ts + sync-service.ts for migrated mutators.
 * Each slice builds its domain mutators on top of this primitive.
 *
 * The undo stack is scoped per growspace so that undoing on Tent B cannot
 * silently roll back an action taken on Tent A.
 *
 * After each successful commit the module fires an optional listener registered
 * via `setMutateListener`.  The root card component wires this up once at boot
 * to surface undo affordances (toast notification with Undo button, Ctrl+Z).
 */

export interface Action {
  /** Machine-readable identifier used for debugging and undo-stack entries. */
  type: string;
  /**
   * Optional human-readable description shown in the undo toast
   * (e.g. 'Watered Amnesia Haze').  Falls back to `type` when omitted.
   */
  label?: string;
  /** Apply the optimistic update to local atoms immediately. */
  optimistic: () => void;
  /** Reverse the optimistic update — called on failure or undo. */
  inverse: () => void;
  /** Persist the change to Home Assistant via hassCall. */
  apply: () => Promise<void>;
}

/** Payload passed to the commit listener after each successful mutate. */
export type CommitInfo = { type: string; label: string | undefined };

/** Callback invoked after each successful commit. */
export type MutateListener = (info: CommitInfo, growspaceId: string) => void;

type UndoEntry = { type: string; inverse: () => void };

const _undoStack = new Map<string, UndoEntry[]>();
const MAX_UNDO = 10;

let _listener: MutateListener | null = null;

/**
 * Register a callback that fires after every successful `mutate()` commit.
 * Pass `null` to remove the listener.  Only one listener is supported at a
 * time; calling this again replaces the previous registration.
 *
 * The root card component uses this to show undo toast notifications without
 * coupling the service layer to UI atoms.
 */
export function setMutateListener(fn: MutateListener | null): void {
  _listener = fn;
}

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
  const entry: UndoEntry = { type: action.type, inverse: action.inverse };
  const stack = _stackFor(growspaceId);
  stack.push(entry);
  if (stack.length > MAX_UNDO) {
    stack.shift();
  }
  _listener?.({ type: action.type, label: action.label }, growspaceId);
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
