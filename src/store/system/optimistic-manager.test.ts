import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptimisticManager } from './optimistic-manager';
import type { UndoRedoManager } from '../../services/undo-redo-manager';

function makeManager(): { manager: OptimisticManager; undoRedo: UndoRedoManager } {
  const undoRedo = { pushAction: vi.fn() } as unknown as UndoRedoManager;
  return { manager: new OptimisticManager(undoRedo), undoRedo };
}

describe('OptimisticManager.applyOptimisticUpdate', () => {
  it('returns an action id and stores the pending action', async () => {
    const { manager } = makeManager();

    const id = await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, vi.fn(), vi.fn());

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('calls the apply function with the payload', async () => {
    const { manager } = makeManager();
    const applyFn = vi.fn();

    await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, applyFn, vi.fn());

    expect(applyFn).toHaveBeenCalledWith({ plantId: 'p1' });
  });

  it('rolls back and rethrows when applyFn throws', async () => {
    const { manager } = makeManager();
    const revertFn = vi.fn();
    const error = new Error('apply failed');
    const applyFn = vi.fn().mockRejectedValue(error);

    await expect(
      manager.applyOptimisticUpdate('update', { plantId: 'p1' }, applyFn, revertFn)
    ).rejects.toThrow('apply failed');

    expect(revertFn).toHaveBeenCalled();
  });

  it('removes the pending action after rollback on applyFn failure', async () => {
    const { manager } = makeManager();
    const applyFn = vi.fn().mockRejectedValue(new Error('fail'));

    try {
      await manager.applyOptimisticUpdate('move', { plantId: 'p2' }, applyFn, vi.fn());
    } catch {
      // expected
    }

    expect(manager.isEntityPending('p2')).toBe(false);
  });
});

describe('OptimisticManager.confirmUpdate', () => {
  it('removes the pending action', async () => {
    const { manager } = makeManager();
    const id = await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, vi.fn(), vi.fn());

    manager.confirmUpdate(id);

    expect(manager.isEntityPending('p1')).toBe(false);
  });

  it('pushes to undo history when historyOptions provided', async () => {
    const { manager, undoRedo } = makeManager();
    const id = await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, vi.fn(), vi.fn());
    const redo = vi.fn();

    manager.confirmUpdate(id, { description: 'Move plant', redo });

    expect(undoRedo.pushAction).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Move plant', redo })
    );
  });

  it('does nothing when action id is unknown', () => {
    const { manager, undoRedo } = makeManager();

    manager.confirmUpdate('nonexistent-id');

    expect(undoRedo.pushAction).not.toHaveBeenCalled();
  });
});

describe('OptimisticManager.rollbackUpdate', () => {
  it('calls revert and removes the pending action', async () => {
    const { manager } = makeManager();
    const revertFn = vi.fn();
    const id = await manager.applyOptimisticUpdate('delete', { plantId: 'p1' }, vi.fn(), revertFn);

    await manager.rollbackUpdate(id);

    expect(revertFn).toHaveBeenCalled();
    expect(manager.isEntityPending('p1')).toBe(false);
  });

  it('still removes the pending action when revert throws', async () => {
    const { manager } = makeManager();
    const revertFn = vi.fn().mockRejectedValue(new Error('revert failed'));
    const id = await manager.applyOptimisticUpdate('delete', { plantId: 'p1' }, vi.fn(), revertFn);

    await manager.rollbackUpdate(id);

    expect(manager.isEntityPending('p1')).toBe(false);
  });

  it('does nothing when action id is unknown', async () => {
    const { manager } = makeManager();

    await expect(manager.rollbackUpdate('nonexistent-id')).resolves.toBeUndefined();
  });
});

describe('OptimisticManager.isEntityPending', () => {
  it('returns false when no pending actions exist', () => {
    const { manager } = makeManager();

    expect(manager.isEntityPending('p1')).toBe(false);
  });

  it('returns true when a pending action has a matching plantId', async () => {
    const { manager } = makeManager();
    await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, vi.fn(), vi.fn());

    expect(manager.isEntityPending('p1')).toBe(true);
  });

  it('returns true when a pending action has a matching plant_id', async () => {
    const { manager } = makeManager();
    await manager.applyOptimisticUpdate('update', { plant_id: 'p2' }, vi.fn(), vi.fn());

    expect(manager.isEntityPending('p2')).toBe(true);
  });

  it('returns true when a pending action has a matching entity_id', async () => {
    const { manager } = makeManager();
    await manager.applyOptimisticUpdate('update', { entity_id: 'sensor.temp' }, vi.fn(), vi.fn());

    expect(manager.isEntityPending('sensor.temp')).toBe(true);
  });

  it('returns true when entityId is in a plantIds array', async () => {
    const { manager } = makeManager();
    await manager.applyOptimisticUpdate(
      'delete',
      { plantIds: ['p1', 'p2', 'p3'] },
      vi.fn(),
      vi.fn()
    );

    expect(manager.isEntityPending('p2')).toBe(true);
  });

  it('returns false when entityId does not match any pending action', async () => {
    const { manager } = makeManager();
    await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, vi.fn(), vi.fn());

    expect(manager.isEntityPending('p99')).toBe(false);
  });

  it('returns false once the action is confirmed', async () => {
    const { manager } = makeManager();
    const id = await manager.applyOptimisticUpdate('update', { plantId: 'p1' }, vi.fn(), vi.fn());
    manager.confirmUpdate(id);

    expect(manager.isEntityPending('p1')).toBe(false);
  });
});
