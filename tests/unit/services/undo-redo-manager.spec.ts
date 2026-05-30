import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UndoRedoManager, UndoableAction } from '../../../src/services/undo-redo-manager';

describe('UndoRedoManager', () => {
  let showToastMock: ReturnType<typeof vi.fn>;
  let manager: UndoRedoManager;

  beforeEach(() => {
    showToastMock = vi.fn();
    manager = new UndoRedoManager(showToastMock);
  });

  it('should initialize with empty stacks and correct initial flags', () => {
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it('should push action and call showToast with Undo callback', async () => {
    const reverseMock = vi.fn().mockResolvedValue(undefined);
    const redoMock = vi.fn().mockResolvedValue(undefined);
    const action: UndoableAction = {
      type: 'update',
      description: 'Updated test value',
      reverse: reverseMock,
      redo: redoMock,
    };

    manager.pushAction(action);

    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
    expect(showToastMock).toHaveBeenCalledWith('Updated test value', 'success', expect.objectContaining({
      label: 'Undo',
      callback: expect.any(Function),
    }));

    // Trigger the callback explicitly to test line 31
    const toastCallArgs = showToastMock.mock.calls[0];
    const callback = toastCallArgs[2]?.callback;
    expect(callback).toBeDefined();

    if (callback) {
      await callback();
      expect(reverseMock).toHaveBeenCalledOnce();
      expect(manager.canUndo).toBe(false);
      expect(manager.canRedo).toBe(true);
    }
  });

  it('should cap the undo stack to MAX_UNDO_ACTIONS (3)', async () => {
    const reverse1 = vi.fn();
    const reverse2 = vi.fn();
    const reverse3 = vi.fn();
    const reverse4 = vi.fn();

    const action1: UndoableAction = { type: 'move', description: 'Action 1', reverse: reverse1, redo: vi.fn() };
    const action2: UndoableAction = { type: 'move', description: 'Action 2', reverse: reverse2, redo: vi.fn() };
    const action3: UndoableAction = { type: 'move', description: 'Action 3', reverse: reverse3, redo: vi.fn() };
    const action4: UndoableAction = { type: 'move', description: 'Action 4', reverse: reverse4, redo: vi.fn() };

    manager.pushAction(action1);
    manager.pushAction(action2);
    manager.pushAction(action3);
    
    // Undo stack is now [action1, action2, action3]
    manager.pushAction(action4);
    // Undo stack should be [action2, action3, action4] since action1 gets shifted out (capacity 3)

    // Undo action 4
    await manager.undo();
    expect(reverse4).toHaveBeenCalledOnce();

    // Undo action 3
    await manager.undo();
    expect(reverse3).toHaveBeenCalledOnce();

    // Undo action 2
    await manager.undo();
    expect(reverse2).toHaveBeenCalledOnce();

    // Undo stack should now be empty, so undoing again should not trigger reverse1
    await manager.undo();
    expect(reverse1).not.toHaveBeenCalled();
    expect(manager.canUndo).toBe(false);
  });

  it('should handle undo successfully and show info toast', async () => {
    const reverseMock = vi.fn().mockResolvedValue(undefined);
    const action: UndoableAction = {
      type: 'delete',
      description: 'Deleted plant',
      reverse: reverseMock,
      redo: vi.fn(),
    };

    manager.pushAction(action);
    showToastMock.mockClear();

    await manager.undo();

    expect(reverseMock).toHaveBeenCalledOnce();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(true);
    expect(showToastMock).toHaveBeenCalledWith('Undone: Deleted plant', 'info');
  });

  it('should handle undo failures gracefully, log the error, and show error toast', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Undo failed exception');
    const reverseMock = vi.fn().mockRejectedValue(error);
    const action: UndoableAction = {
      type: 'swap',
      description: 'Swapped plants',
      reverse: reverseMock,
      redo: vi.fn(),
    };

    manager.pushAction(action);
    showToastMock.mockClear();

    await manager.undo();

    expect(reverseMock).toHaveBeenCalledOnce();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Undo failed]', error);
    expect(showToastMock).toHaveBeenCalledWith('Undo failed', 'error');

    consoleErrorSpy.mockRestore();
  });

  it('should do nothing when undo is called with empty stack', async () => {
    await manager.undo();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('should handle redo successfully and show info toast', async () => {
    const redoMock = vi.fn().mockResolvedValue(undefined);
    const action: UndoableAction = {
      type: 'move',
      description: 'Moved plant',
      reverse: vi.fn().mockResolvedValue(undefined),
      redo: redoMock,
    };

    manager.pushAction(action);
    await manager.undo();
    showToastMock.mockClear();

    expect(manager.canRedo).toBe(true);
    await manager.redo();

    expect(redoMock).toHaveBeenCalledOnce();
    expect(manager.canUndo).toBe(true);
    expect(manager.canRedo).toBe(false);
    expect(showToastMock).toHaveBeenCalledWith('Redone: Moved plant', 'info');
  });

  it('should handle redo failures gracefully, log the error, and show error toast', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Redo failed exception');
    const redoMock = vi.fn().mockRejectedValue(error);
    const action: UndoableAction = {
      type: 'move',
      description: 'Moved plant',
      reverse: vi.fn().mockResolvedValue(undefined),
      redo: redoMock,
    };

    manager.pushAction(action);
    await manager.undo();
    showToastMock.mockClear();

    await manager.redo();

    expect(redoMock).toHaveBeenCalledOnce();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Redo failed]', error);
    expect(showToastMock).toHaveBeenCalledWith('Redo failed', 'error');

    consoleErrorSpy.mockRestore();
  });

  it('should do nothing when redo is called with empty stack', async () => {
    await manager.redo();
    expect(showToastMock).not.toHaveBeenCalled();
  });
});
