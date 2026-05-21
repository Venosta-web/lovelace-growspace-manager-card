import { ActionContext } from './action-context';

export async function withAction<T>(
  ctx: ActionContext,
  fn: () => Promise<T>,
  opts: {
    success?: string;
    errorPrefix: string;
    rethrow?: boolean;
  }
): Promise<T | undefined> {
  try {
    const result = await fn();
    if (opts.success) ctx.ui.showToast(opts.success, 'success');
    return result;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(opts.errorPrefix, e);
    ctx.ui.showToast(`${opts.errorPrefix}: ${message}`, 'error');
    if (opts.rethrow) throw e;
    return undefined;
  }
}
