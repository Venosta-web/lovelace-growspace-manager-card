import { describe, it, expect, vi } from 'vitest';
import { withAction } from '../../../../src/store/core/action-utils';
import { WSError } from '../../../../src/services/errors';
import type { ActionContext } from '../../../../src/store/core/action-context';

function makeCtx(): ActionContext {
  return {
    ui: { showToast: vi.fn() },
  } as unknown as ActionContext;
}

describe('withAction', () => {
  it('returns the result of fn on success', async () => {
    const ctx = makeCtx();
    const result = await withAction(ctx, async () => 42, { errorPrefix: 'Op' });
    expect(result).toBe(42);
  });

  it('shows a success toast when opts.success is provided', async () => {
    const ctx = makeCtx();
    await withAction(ctx, async () => 'ok', { success: 'Saved!', errorPrefix: 'Op' });
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Saved!', 'success');
  });

  it('does not show a success toast when opts.success is omitted', async () => {
    const ctx = makeCtx();
    await withAction(ctx, async () => 'ok', { errorPrefix: 'Op' });
    expect(ctx.ui.showToast).not.toHaveBeenCalled();
  });

  it('shows an error toast with the user-friendly WSError message', async () => {
    const ctx = makeCtx();
    await withAction(
      ctx,
      async () => { throw new WSError('coordinator_not_ready', 'raw message'); },
      { errorPrefix: 'Save plant' }
    );
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      'Save plant: Integration not loaded — try reloading the page',
      'error'
    );
  });

  it('falls back to the WSError message for an unknown code', async () => {
    const ctx = makeCtx();
    await withAction(
      ctx,
      async () => { throw new WSError('rate_limited' as any, 'slow down'); },
      { errorPrefix: 'Fetch' }
    );
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Fetch: slow down', 'error');
  });

  it('shows the Error.message for a plain Error', async () => {
    const ctx = makeCtx();
    await withAction(
      ctx,
      async () => { throw new Error('network down'); },
      { errorPrefix: 'Load' }
    );
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Load: network down', 'error');
  });

  it('shows "Unknown error" for a non-Error throw', async () => {
    const ctx = makeCtx();
    await withAction(
      ctx,
      async () => { throw 'oops'; },
      { errorPrefix: 'Do thing' }
    );
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Do thing: Unknown error', 'error');
  });

  it('returns undefined on failure by default', async () => {
    const ctx = makeCtx();
    const result = await withAction(
      ctx,
      async () => { throw new Error('boom'); },
      { errorPrefix: 'X' }
    );
    expect(result).toBeUndefined();
  });

  it('rethrows when opts.rethrow is true', async () => {
    const ctx = makeCtx();
    const err = new Error('fatal');
    await expect(
      withAction(ctx, async () => { throw err; }, { errorPrefix: 'X', rethrow: true })
    ).rejects.toThrow('fatal');
  });

  it('still shows the error toast before rethrowing', async () => {
    const ctx = makeCtx();
    try {
      await withAction(
        ctx,
        async () => { throw new Error('fatal'); },
        { errorPrefix: 'Op', rethrow: true }
      );
    } catch {
      // expected
    }
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Op: fatal', 'error');
  });

  describe('WSError code mapping', () => {
    const cases: [string, string][] = [
      ['coordinator_not_ready', 'Integration not loaded — try reloading the page'],
      ['entity_not_found', 'Item not found — it may have been removed'],
      ['validation_failed', 'Invalid input'],
      ['internal_error', 'Internal error'],
    ];

    it.each(cases)('maps code "%s" to "%s"', async (code, expected) => {
      const ctx = makeCtx();
      await withAction(
        ctx,
        async () => { throw new WSError(code as any, 'raw'); },
        { errorPrefix: 'X' }
      );
      expect(ctx.ui.showToast).toHaveBeenCalledWith(`X: ${expected}`, 'error');
    });
  });
});
