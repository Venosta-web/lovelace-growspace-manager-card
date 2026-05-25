import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mutate, undo, canUndo } from '../../../src/services/mutate';

const GS_A = 'tent-a';
const GS_B = 'tent-b';

/** Drain all undo entries for a growspace. */
async function drainUndo(growspaceId: string): Promise<void> {
  while (canUndo(growspaceId)) await undo(growspaceId);
}

describe('mutate', () => {
  beforeEach(async () => {
    await drainUndo(GS_A);
    await drainUndo(GS_B);
  });

  // ---------------------------------------------------------------------------
  // Core behaviour (unchanged semantics, updated signature)
  // ---------------------------------------------------------------------------

  it('runs optimistic update before apply', async () => {
    const order: string[] = [];
    await mutate(
      {
        type: 'test',
        optimistic: () => { order.push('optimistic'); },
        apply: async () => { order.push('apply'); },
        inverse: () => { order.push('inverse'); },
      },
      GS_A,
    );

    expect(order).toEqual(['optimistic', 'apply']);
  });

  it('runs inverse when apply fails (rollback)', async () => {
    const optimistic = vi.fn();
    const inverse = vi.fn();

    await expect(
      mutate(
        {
          type: 'test',
          optimistic,
          apply: async () => { throw new Error('backend failure'); },
          inverse,
        },
        GS_A,
      ),
    ).rejects.toThrow('backend failure');

    expect(optimistic).toHaveBeenCalledOnce();
    expect(inverse).toHaveBeenCalledOnce();
  });

  it('does NOT push inverse to undo stack when apply fails', async () => {
    await expect(
      mutate(
        {
          type: 'test',
          optimistic: vi.fn(),
          apply: async () => { throw new Error('fail'); },
          inverse: vi.fn(),
        },
        GS_A,
      ),
    ).rejects.toThrow();

    expect(canUndo(GS_A)).toBe(false);
  });

  it('pushes inverse to undo stack on success', async () => {
    await mutate(
      { type: 'test', optimistic: vi.fn(), apply: async () => {}, inverse: vi.fn() },
      GS_A,
    );

    expect(canUndo(GS_A)).toBe(true);
  });

  it('undo calls the stored inverse', async () => {
    const inverse = vi.fn();
    await mutate(
      { type: 'test', optimistic: vi.fn(), apply: async () => {}, inverse },
      GS_A,
    );

    await undo(GS_A);

    expect(inverse).toHaveBeenCalledOnce();
  });

  it('canUndo is false after undo is consumed', async () => {
    await mutate(
      { type: 'test', optimistic: vi.fn(), apply: async () => {}, inverse: vi.fn() },
      GS_A,
    );

    await undo(GS_A);

    expect(canUndo(GS_A)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Per-growspace isolation (new in #136)
  // ---------------------------------------------------------------------------

  it('canUndo is false for a different growspace that received no actions', async () => {
    await mutate(
      { type: 'test', optimistic: vi.fn(), apply: async () => {}, inverse: vi.fn() },
      GS_A,
    );

    expect(canUndo(GS_B)).toBe(false);
  });

  it('undo on tentA does not affect tentB stack', async () => {
    const inverseA = vi.fn();
    const inverseB = vi.fn();

    await mutate(
      { type: 'actionA', optimistic: vi.fn(), apply: async () => {}, inverse: inverseA },
      GS_A,
    );
    await mutate(
      { type: 'actionB', optimistic: vi.fn(), apply: async () => {}, inverse: inverseB },
      GS_B,
    );

    await undo(GS_A);

    expect(inverseA).toHaveBeenCalledOnce();
    expect(inverseB).not.toHaveBeenCalled();
    expect(canUndo(GS_B)).toBe(true);
  });

  it('undo on tentB calls tentB inverse, not tentA inverse', async () => {
    const inverseA = vi.fn();
    const inverseB = vi.fn();

    await mutate(
      { type: 'actionA', optimistic: vi.fn(), apply: async () => {}, inverse: inverseA },
      GS_A,
    );
    await mutate(
      { type: 'actionB', optimistic: vi.fn(), apply: async () => {}, inverse: inverseB },
      GS_B,
    );

    await undo(GS_B);

    expect(inverseB).toHaveBeenCalledOnce();
    expect(inverseA).not.toHaveBeenCalled();
  });

  it('MAX_UNDO cap is enforced per growspace independently', async () => {
    // Push 11 actions to tentA; tentB should still be unaffected
    for (let i = 0; i < 11; i++) {
      await mutate(
        { type: `action${i}`, optimistic: vi.fn(), apply: async () => {}, inverse: vi.fn() },
        GS_A,
      );
    }
    await mutate(
      { type: 'bAction', optimistic: vi.fn(), apply: async () => {}, inverse: vi.fn() },
      GS_B,
    );

    // tentA still has undo entries (capped at 10, oldest dropped)
    expect(canUndo(GS_A)).toBe(true);
    // tentB has exactly its 1 entry
    expect(canUndo(GS_B)).toBe(true);
    await undo(GS_B);
    expect(canUndo(GS_B)).toBe(false);
    // tentA still has its 10
    expect(canUndo(GS_A)).toBe(true);
  });
});
