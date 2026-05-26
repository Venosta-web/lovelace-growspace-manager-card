import { ActionContext } from './action-context';
import { WSError } from '../../services/base-api';

const WS_ERROR_MESSAGES: Record<string, string> = {
  coordinator_not_ready: 'Integration not loaded — try reloading the page',
  entity_not_found: 'Item not found — it may have been removed',
  validation_failed: 'Invalid input',
  internal_error: 'Internal error',
};

function toUserMessage(e: unknown): string {
  if (e instanceof WSError) return WS_ERROR_MESSAGES[e.code] ?? e.message;
  if (e instanceof Error) return e.message;
  return 'Unknown error';
}

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
    const message = toUserMessage(e);
    console.error(opts.errorPrefix, e);
    ctx.ui.showToast(`${opts.errorPrefix}: ${message}`, 'error');
    if (opts.rethrow) throw e;
    return undefined;
  }
}
