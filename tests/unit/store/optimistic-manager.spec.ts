import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptimisticManager } from '../../../src/store/system/optimistic-manager';
import { GrowspaceDataStore } from '../../../src/store/core/data-store';
import { UndoRedoManager } from '../../../src/services/undo-redo-manager';

describe('OptimisticManager', () => {
    let manager: OptimisticManager;
    let mockDataStore: GrowspaceDataStore;
    let mockUndoRedoManager: UndoRedoManager;

    beforeEach(() => {
        mockDataStore = {
            requestRefetch: vi.fn(),
        } as any;

        mockUndoRedoManager = {
            pushAction: vi.fn(),
        } as any;

        manager = new OptimisticManager(mockDataStore, mockUndoRedoManager);
    });

    it('should apply optimistic update immediately', async () => {
        const payload = { id: '123' };
        const applyFn = vi.fn();
        const revertFn = vi.fn();

        const id = await manager.applyOptimisticUpdate(
            'update',
            payload,
            applyFn,
            revertFn
        );

        expect(id).toBeDefined();
        expect(applyFn).toHaveBeenCalledWith(payload);
        expect(manager.isEntityPending('123')).toBe(false); // Default logic checks exact match or common fields, payload {id} might not match defaults
    });

    it('should confirm update and push to undo/redo manager', async () => {
        const payload = { id: '123' };
        const revertFn = vi.fn();
        const redoFn = vi.fn();

        const id = await manager.applyOptimisticUpdate(
            'update',
            payload,
            vi.fn(),
            revertFn
        );

        manager.confirmUpdate(id, {
            description: 'Test Action',
            redo: redoFn
        });

        expect(mockUndoRedoManager.pushAction).toHaveBeenCalledWith(expect.objectContaining({
            type: 'update',
            description: 'Test Action',
            redo: redoFn
        }));

        // Verify that calling reverse on the pushed action calls our revertFn
        const call = vi.mocked(mockUndoRedoManager.pushAction).mock.calls[0][0];
        await call.reverse();
        expect(revertFn).toHaveBeenCalled();
    });

    it('should rollback update if confirmed failed (manual rollback)', async () => {
        const revertFn = vi.fn();

        const id = await manager.applyOptimisticUpdate(
            'delete',
            { plantId: 'p1' },
            vi.fn(),
            revertFn
        );

        await manager.rollbackUpdate(id);
        expect(revertFn).toHaveBeenCalled();
        expect(manager.isEntityPending('p1')).toBe(false);
    });

    it('should identify pending entities', async () => {
        await manager.applyOptimisticUpdate(
            'delete',
            { plantId: 'p1' },
            vi.fn(),
            vi.fn()
        );

        expect(manager.isEntityPending('p1')).toBe(true);
        expect(manager.isEntityPending('p2')).toBe(false);
    });

    it('should handle array of plantIds in isEntityPending', async () => {
        await manager.applyOptimisticUpdate(
            'update',
            { plantIds: ['p1', 'p2'] },
            vi.fn(),
            vi.fn()
        );

        expect(manager.isEntityPending('p1')).toBe(true);
        expect(manager.isEntityPending('p2')).toBe(true);
        expect(manager.isEntityPending('p3')).toBe(false);
    });

    it('should rollback and throw if applyFn fails', async () => {
        const revertFn = vi.fn();
        const error = new Error('Apply Failed');
        const applyFn = vi.fn().mockRejectedValue(error);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await expect(manager.applyOptimisticUpdate(
            'update',
            { plantId: 'p1' },
            applyFn,
            revertFn
        )).rejects.toThrow('Apply Failed');

        expect(revertFn).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith("Failed to apply optimistic update", error);
        errorSpy.mockRestore();
    });

    it('should log error if revertFn fails during rollback', async () => {
        const error = new Error('Revert Failed');
        const revertFn = vi.fn().mockRejectedValue(error);
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const id = await manager.applyOptimisticUpdate(
            'delete',
            { plantId: 'p1' },
            vi.fn(),
            revertFn
        );

        await manager.rollbackUpdate(id);

        expect(errorSpy).toHaveBeenCalledWith('Critical: Failed to rollback optimistic update', error);
        errorSpy.mockRestore();
    });

    it('should return early in confirmUpdate/rollbackUpdate if action not found', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        manager.confirmUpdate('non-existent');
        expect(mockUndoRedoManager.pushAction).not.toHaveBeenCalled();

        await manager.rollbackUpdate('non-existent');
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('should confirm update without adding to history if historyOptions not provided', async () => {
        const id = await manager.applyOptimisticUpdate(
            'update',
            { plantId: 'p1' },
            vi.fn(),
            vi.fn()
        );

        manager.confirmUpdate(id); // No historyOptions
        expect(mockUndoRedoManager.pushAction).not.toHaveBeenCalled();
    });

    it('should fallback to Math.random if crypto.randomUUID is not available', async () => {
        vi.stubGlobal('crypto', undefined);

        const id = await manager.applyOptimisticUpdate(
            'update',
            { plantId: 'p1' },
            vi.fn(),
            vi.fn()
        );

        expect(id).toBeDefined();
        expect(typeof id).toBe('string');

        vi.unstubAllGlobals();
    });
});
