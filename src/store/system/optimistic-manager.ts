import { GrowspaceDataStore } from '../core/data-store';
import { UndoRedoManager } from '../../services/undo-redo-manager';

export interface OptimisticAction<T> {
  id: string;
  type: 'move' | 'delete' | 'update' | 'swap';
  payload: T;
  revert: () => Promise<void> | void;
  timestamp: number;
}

export class OptimisticManager {
  private _pendingActions = new Map<string, OptimisticAction<unknown>>();

  constructor(
    private data: GrowspaceDataStore,
    private undoRedoManager: UndoRedoManager
  ) { }

  /**
   * Apply an optimistic update immediately.
   * Returns the action ID to be used for confirmation or rollback.
   */
  public async applyOptimisticUpdate<T>(
    type: OptimisticAction<T>['type'],
    payload: T,
    applyFn: (payload: T) => void | Promise<void>,
    revertFn: () => void | Promise<void>
  ): Promise<string> {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

    // 1. Store the action for potential rollback
    this._pendingActions.set(id, {
      id,
      type,
      payload,
      revert: revertFn,
      timestamp: Date.now(),
    });

    // 2. Execute the optimistic change immediately
    try {
      await applyFn(payload);
    } catch (e) {
      console.error('Failed to apply optimistic update', e); // Assuming _LOGGER is console.error
      this.rollbackUpdate(id);
      throw e; // Rethrow so caller knows it failed
    }

    return id;
  }

  /**
   * Mark an optimistic action as successfully committed to the backend.
   * If `addToHistory` is true, we push a "reverse" action to the UndoRedoManager.
   */
  public confirmUpdate(
    actionId: string,
    historyOptions?: {
      description: string;
      redo: () => Promise<void>;
    }
  ) {
    const action = this._pendingActions.get(actionId);
    if (!action) return; // Already cleared or handled

    if (historyOptions) {
      // Transform the Revert function into an Undo action
      this.undoRedoManager.pushAction({
        type: action.type,
        description: historyOptions.description,
        reverse: async () => {
          // When user clicks Undo, we execute the revert logic
          // Note: Revert logic usually re-applies the old state to API
          await action.revert();
        },
        redo: historyOptions.redo,
      });
    }

    this._pendingActions.delete(actionId);
  }

  /**
   * Rollback an optimistic action because the backend call failed.
   */
  public async rollbackUpdate(actionId: string) {
    const action = this._pendingActions.get(actionId);
    if (!action) return;

    console.warn(`Rolling back optimistic action: ${action.type}`, action.payload);

    try {
      await action.revert();
    } catch (e) {
      console.error('Critical: Failed to rollback optimistic update', e);
      // Force a full refresh as a fallback if rollback fails
      // this.dataStore.requestRefetch(); // detailed implementation depends on store
    } finally {
      this._pendingActions.delete(actionId);
    }
  }

  /**
   * Check if there are pending actions for a specific entity ID (if payload has IDs)
   * Helpful for UI loading states or disabling interactions
   */
  public isEntityPending(entityId: string): boolean {
    for (const action of this._pendingActions.values()) {
      const p = action.payload as Record<string, unknown>;
      // Naive check for common ID fields
      if (p?.plantId === entityId || p?.plant_id === entityId || p?.entity_id === entityId) {
        return true;
      }
      if (Array.isArray(p?.plantIds) && p.plantIds.includes(entityId)) {
        return true;
      }
    }
    return false;
  }
}
