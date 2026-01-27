/**
 * Command Pattern Infrastructure
 *
 * Provides a unified interface for executing business logic with:
 * - Consistent error handling
 * - Undo/redo support
 * - Batch operations with progress tracking
 * - Type-safe return values
 */

import type { ActionContext } from '../types/action-context';

/**
 * Base command interface
 */
export interface Command<T> {
  /**
   * Execute the command
   */
  execute(ctx: ActionContext): Promise<T>;

  /**
   * Called after successful execution
   */
  onSuccess?(ctx: ActionContext, result: T): void | Promise<void>;

  /**
   * Called if execution fails
   */
  onError?(ctx: ActionContext, error: Error): void | Promise<void>;
}

/**
 * Undoable command - supports undo/redo
 */
export interface UndoableCommand<T> extends Command<T> {
  /**
   * Undo the command execution
   */
  undo(ctx: ActionContext, result: T): Promise<void>;

  /**
   * Optional: Called after successful undo
   */
  onUndoSuccess?(ctx: ActionContext): void | Promise<void>;
}

/**
 * Batch command - execute operation on multiple items
 */
export interface BatchCommand<T> extends Command<T> {
  /**
   * Items to process
   */
  items: string[];

  /**
   * Execute operation on single item
   */
  executeOne(ctx: ActionContext, item: string): Promise<void>;

  /**
   * Called after each item completes (for progress tracking)
   */
  onProgress?(ctx: ActionContext, completed: number, total: number): void;

  /**
   * Called if some items fail (overrides onError)
   */
  onPartialError?(
    ctx: ActionContext,
    error: Error,
    failedItems: string[],
    successfulItems: string[]
  ): void;
}

/**
 * Execute a command with error handling
 */
export async function executeCommand<T>(
  command: Command<T>,
  ctx: ActionContext
): Promise<T | undefined> {
  try {
    const result = await command.execute(ctx);

    if (command.onSuccess) {
      await command.onSuccess(ctx, result);
    }

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('[Command] Execution failed:', err);

    if (command.onError) {
      await command.onError(ctx, err);
    }

    return undefined;
  }
}

/**
 * Execute a batch command with progress tracking
 */
export async function executeBatchCommand<T>(
  command: BatchCommand<T>,
  ctx: ActionContext
): Promise<T | undefined> {
  const { items, executeOne, onProgress, onPartialError } = command;
  const failedItems: string[] = [];
  const successfulItems: string[] = [];
  let lastError: Error | undefined;

  for (let i = 0; i < items.length; i++) {
    try {
      await executeOne(ctx, items[i]);
      successfulItems.push(items[i]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[BatchCommand] Failed to process item ${items[i]}:`, err);
      failedItems.push(items[i]);
      lastError = err;
    }

    // Report progress
    if (onProgress) {
      onProgress(ctx, i + 1, items.length);
    }
  }

  // Handle results
  if (failedItems.length === 0) {
    // All succeeded
    if (command.onSuccess) {
      await command.onSuccess(ctx, undefined as T);
    }
    return undefined as T;
  } else if (successfulItems.length === 0) {
    // All failed
    if (command.onError) {
      await command.onError(ctx, lastError!);
    }
    return undefined;
  } else {
    // Partial success
    if (onPartialError) {
      await onPartialError(ctx, lastError!, failedItems, successfulItems);
    } else if (command.onError) {
      await command.onError(ctx, lastError!);
    }
    return undefined;
  }
}

/**
 * Helper to create a simple command
 */
export function createCommand<T>(config: Command<T>): Command<T> {
  return config;
}

/**
 * Helper to create an undoable command
 */
export function createUndoableCommand<T>(config: UndoableCommand<T>): UndoableCommand<T> {
  return config;
}

/**
 * Helper to create a batch command
 */
export function createBatchCommand<T>(config: BatchCommand<T>): BatchCommand<T> {
  return config;
}

/**
 * Check if a command is undoable
 */
export function isUndoableCommand<T>(command: Command<T>): command is UndoableCommand<T> {
  return 'undo' in command && typeof (command as UndoableCommand<T>).undo === 'function';
}

/**
 * Check if a command is a batch command
 */
export function isBatchCommand<T>(command: Command<T>): command is BatchCommand<T> {
  return (
    'items' in command &&
    'executeOne' in command &&
    typeof (command as BatchCommand<T>).executeOne === 'function'
  );
}
