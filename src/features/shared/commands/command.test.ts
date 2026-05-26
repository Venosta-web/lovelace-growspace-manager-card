/**
 * Command Pattern Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeCommand,
  executeBatchCommand,
  createCommand,
  createUndoableCommand,
  createBatchCommand,
  isUndoableCommand,
  isBatchCommand,
  type Command,
} from './command';
import type { ActionContext } from '../types/action-context';

describe('Command Pattern', () => {
  let mockContext: ActionContext;

  beforeEach(() => {
    mockContext = {
      dataService: {} as any,
      hass: {} as any,
      syncService: {} as any,
      undoRedoManager: {} as any,
      optimisticManager: {} as any,
      data: {} as any,
      ui: {} as any,
      history: {} as any,
      grid: {} as any,
      showToast: vi.fn(),
      closeDialog: vi.fn(),
      refreshData: vi.fn(),
    };
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const executeFn = vi.fn().mockResolvedValue('result');
      const onSuccess = vi.fn();

      const command = createCommand({
        execute: executeFn,
        onSuccess,
      });

      const result = await executeCommand(command, mockContext);

      expect(executeFn).toHaveBeenCalledWith(mockContext);
      expect(onSuccess).toHaveBeenCalledWith(mockContext, 'result');
      expect(result).toBe('result');
    });

    it('should handle execution errors', async () => {
      const error = new Error('Execution failed');
      const executeFn = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      const command = createCommand({
        execute: executeFn,
        onError,
      });

      const result = await executeCommand(command, mockContext);

      expect(executeFn).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(mockContext, error);
      expect(result).toBeUndefined();
    });

    it('should call onSuccess even if it is async', async () => {
      const executeFn = vi.fn().mockResolvedValue('result');
      const onSuccess = vi.fn().mockResolvedValue(undefined);

      const command = createCommand({
        execute: executeFn,
        onSuccess,
      });

      await executeCommand(command, mockContext);

      expect(onSuccess).toHaveBeenCalledWith(mockContext, 'result');
    });

    it('should handle success without onSuccess', async () => {
      const executeFn = vi.fn().mockResolvedValue('result');
      const command = createCommand({ execute: executeFn });
      const result = await executeCommand(command, mockContext);
      expect(result).toBe('result');
    });

    it('should handle failure without onError', async () => {
      const executeFn = vi.fn().mockRejectedValue(new Error('Failed'));
      const command = createCommand({ execute: executeFn });
      const result = await executeCommand(command, mockContext);
      expect(result).toBeUndefined();
    });
  });

  describe('executeBatchCommand', () => {
    it('should execute batch command on all items', async () => {
      const executeOne = vi.fn().mockResolvedValue(undefined);
      const onProgress = vi.fn();
      const onSuccess = vi.fn();

      const command = createBatchCommand({
        items: ['item1', 'item2', 'item3'],
        executeOne,
        onProgress,
        onSuccess,
        execute: async () => undefined,
      });

      await executeBatchCommand(command, mockContext);

      expect(executeOne).toHaveBeenCalledTimes(3);
      expect(executeOne).toHaveBeenCalledWith(mockContext, 'item1');
      expect(executeOne).toHaveBeenCalledWith(mockContext, 'item2');
      expect(executeOne).toHaveBeenCalledWith(mockContext, 'item3');

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, mockContext, 1, 3);
      expect(onProgress).toHaveBeenNthCalledWith(2, mockContext, 2, 3);
      expect(onProgress).toHaveBeenNthCalledWith(3, mockContext, 3, 3);

      expect(onSuccess).toHaveBeenCalledWith(mockContext, undefined);
    });

    it('should handle partial failures', async () => {
      const executeOne = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined);

      const onPartialError = vi.fn();

      const command = createBatchCommand({
        items: ['item1', 'item2', 'item3'],
        executeOne,
        onPartialError,
        execute: async () => undefined,
      });

      await executeBatchCommand(command, mockContext);

      expect(executeOne).toHaveBeenCalledTimes(3);
      expect(onPartialError).toHaveBeenCalledWith(
        mockContext,
        expect.any(Error),
        ['item2'],
        ['item1', 'item3']
      );
    });

    it('should handle all failures', async () => {
      const executeOne = vi.fn().mockRejectedValue(new Error('Failed'));
      const onError = vi.fn();

      const command = createBatchCommand({
        items: ['item1', 'item2'],
        executeOne,
        onError,
        execute: async () => undefined,
      });

      await executeBatchCommand(command, mockContext);

      expect(executeOne).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledWith(mockContext, expect.any(Error));
    });

    it('should call onError on partial success if onPartialError is missing', async () => {
      const executeOne = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'));

      const onError = vi.fn();

      const command = createBatchCommand({
        items: ['item1', 'item2'],
        executeOne,
        onError,
        execute: async () => undefined,
      });

      await executeBatchCommand(command, mockContext);

      expect(onError).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({ message: 'Failed' })
      );
    });

    it('should handle non-Error exceptions in executeBatchCommand', async () => {
      const executeOne = vi.fn().mockRejectedValue('string error');
      const onError = vi.fn();

      const command = createBatchCommand({
        items: ['item1'],
        executeOne,
        onError,
        execute: async () => undefined,
      });

      await executeBatchCommand(command, mockContext);

      expect(onError).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({ message: 'Unknown error' })
      );
    });

    it('should handle all success without onSuccess', async () => {
      const executeOne = vi.fn().mockResolvedValue(undefined);
      const command = createBatchCommand({
        items: ['item1'],
        executeOne,
        execute: async () => undefined,
      });
      await executeBatchCommand(command, mockContext);
      expect(executeOne).toHaveBeenCalledTimes(1);
    });

    it('should handle all failure without onError', async () => {
      const executeOne = vi.fn().mockRejectedValue(new Error('Failed'));
      const command = createBatchCommand({
        items: ['item1'],
        executeOne,
        execute: async () => undefined,
      });
      await executeBatchCommand(command, mockContext);
      expect(executeOne).toHaveBeenCalledTimes(1);
    });

    it('should handle partial success without any error handlers', async () => {
      const executeOne = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'));

      const command = createBatchCommand({
        items: ['item1', 'item2'],
        executeOne,
        execute: async () => undefined,
      });

      await executeBatchCommand(command, mockContext);
      expect(executeOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeCommand non-Error handling', () => {
    it('should handle non-Error exceptions in executeCommand', async () => {
      const executeFn = vi.fn().mockRejectedValue('string error');
      const onError = vi.fn();

      const command = createCommand({
        execute: executeFn,
        onError,
      });

      await executeCommand(command, mockContext);

      expect(onError).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({ message: 'Unknown error' })
      );
    });
  });

  describe('createUndoableCommand', () => {
    it('should create undoable command', () => {
      const command = createUndoableCommand({
        execute: async () => 'result',
        undo: async () => {},
      });

      expect(command).toHaveProperty('execute');
      expect(command).toHaveProperty('undo');
      expect(isUndoableCommand(command)).toBe(true);
    });
  });

  describe('isUndoableCommand', () => {
    it('should identify undoable commands', () => {
      const undoable = createUndoableCommand({
        execute: async () => {},
        undo: async () => {},
      });

      const regular = createCommand({
        execute: async () => {},
      });

      expect(isUndoableCommand(undoable)).toBe(true);
      expect(isUndoableCommand(regular)).toBe(false);
    });
  });

  describe('isBatchCommand', () => {
    it('should identify batch commands', () => {
      const batch = createBatchCommand({
        items: ['a', 'b'],
        executeOne: async () => {},
        execute: async () => {},
      });

      const regular = createCommand({
        execute: async () => {},
      });

      expect(isBatchCommand(batch)).toBe(true);
      expect(isBatchCommand(regular)).toBe(false);
    });
  });
});
