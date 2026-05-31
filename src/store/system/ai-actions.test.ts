import { describe, it, expect, vi, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import type { ActionContext } from '../core/action-context';
import { WSError } from '../../services/base-api';
import { analyzeGrowspace } from './ai-actions';

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const $activeDialog = atom<{ type: string; payload?: Record<string, unknown> }>({ type: 'NONE' });
  const $selectedDevice = atom<string | null>(null);
  const toastMessages: Array<{ message: string; type: string }> = [];

  return {
    dataService: {
      askGrowAdvice: vi.fn().mockResolvedValue({ response: 'ok' }),
      analyzeAllGrowspaces: vi.fn().mockResolvedValue({ response: 'ok' }),
    } as unknown as ActionContext['dataService'],
    ui: {
      $activeDialog,
      setActiveDialog: (d: { type: string; payload?: Record<string, unknown> }) => $activeDialog.set(d),
      showToast: (message: string, type: string) => toastMessages.push({ message, type }),
      _toastMessages: toastMessages,
    } as unknown as ActionContext['ui'],
    grid: {
      $selectedDevice,
    } as unknown as ActionContext['grid'],
    undoRedoManager: {} as ActionContext['undoRedoManager'],
    optimisticManager: {} as ActionContext['optimisticManager'],
    closeDialog: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies ActionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyzeGrowspace — rate limiting', () => {
  it('shows a toast and clears loading state when rate_limited — does not crash the dialog', async () => {
    const ctx = makeContext();
    ctx.ui.$activeDialog.set({ type: 'GROW_MASTER', payload: { growspaceId: 'gs1', isLoading: false, response: null, mode: 'single' as const } });
    vi.mocked(ctx.dataService.askGrowAdvice as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new WSError('rate_limited', 'Rate limit exceeded — try again later')
    );
    ctx.grid.$selectedDevice.set('device-1');

    await analyzeGrowspace(ctx, 'How is my VPD?', false);

    const dialog = ctx.ui.$activeDialog.get();
    expect(dialog.type).toBe('GROW_MASTER');
    expect((dialog as { payload?: { isLoading?: boolean } }).payload?.isLoading).toBe(false);

    const toasts = (ctx.ui as unknown as { _toastMessages: Array<{ message: string }> })._toastMessages;
    expect(toasts.length).toBeGreaterThan(0);
    expect(toasts[0].message).toContain('rate limit');
  });

  it('does not close the GROW_MASTER dialog on rate_limited', async () => {
    const ctx = makeContext();
    ctx.ui.$activeDialog.set({ type: 'GROW_MASTER', payload: { growspaceId: 'gs1', isLoading: false, response: null, mode: 'single' as const } });
    vi.mocked(ctx.dataService.askGrowAdvice as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new WSError('rate_limited', 'Rate limit exceeded — try again later')
    );
    ctx.grid.$selectedDevice.set('device-1');

    await analyzeGrowspace(ctx, 'How is my VPD?', false);

    expect(ctx.ui.$activeDialog.get().type).toBe('GROW_MASTER');
  });
});
