import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mutate, undo, canUndo } from '../../../src/services/mutate';

describe('mutate', () => {
  beforeEach(() => {
    // Clear undo stack between tests
    while (canUndo()) undo();
  });

  it('runs optimistic update before apply', async () => {
    const order: string[] = [];
    await mutate({
      type: 'test',
      optimistic: () => { order.push('optimistic'); },
      apply: async () => { order.push('apply'); },
      inverse: () => { order.push('inverse'); },
    });

    expect(order).toEqual(['optimistic', 'apply']);
  });

  it('runs inverse when apply fails (rollback)', async () => {
    const optimistic = vi.fn();
    const inverse = vi.fn();

    await expect(mutate({
      type: 'test',
      optimistic,
      apply: async () => { throw new Error('backend failure'); },
      inverse,
    })).rejects.toThrow('backend failure');

    expect(optimistic).toHaveBeenCalledOnce();
    expect(inverse).toHaveBeenCalledOnce();
  });

  it('does NOT push inverse to undo stack when apply fails', async () => {
    await expect(mutate({
      type: 'test',
      optimistic: vi.fn(),
      apply: async () => { throw new Error('fail'); },
      inverse: vi.fn(),
    })).rejects.toThrow();

    expect(canUndo()).toBe(false);
  });

  it('pushes inverse to undo stack on success', async () => {
    await mutate({
      type: 'test',
      optimistic: vi.fn(),
      apply: async () => {},
      inverse: vi.fn(),
    });

    expect(canUndo()).toBe(true);
  });

  it('undo calls the stored inverse', async () => {
    const inverse = vi.fn();
    await mutate({
      type: 'test',
      optimistic: vi.fn(),
      apply: async () => {},
      inverse,
    });

    await undo();

    expect(inverse).toHaveBeenCalledOnce();
  });

  it('canUndo is false after undo is consumed', async () => {
    await mutate({
      type: 'test',
      optimistic: vi.fn(),
      apply: async () => {},
      inverse: vi.fn(),
    });

    await undo();

    expect(canUndo()).toBe(false);
  });
});
