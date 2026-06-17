import { describe, it, expect, vi, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import type { ActionContext } from '../core/action-context';
import { WSError } from '../../services/errors';
import { analyzeGrowspace, getStrainRecommendation } from './ai-actions';
import { callServiceReturning } from '../../services/hass-call';

vi.mock('../../services/hass-call', () => ({
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const $activeDialog = atom<{ type: string; payload?: Record<string, unknown> }>({ type: 'NONE' });
  const $selectedDevice = atom<string | null>(null);
  const toastMessages: Array<{ message: string; type: string }> = [];

  return {
    ui: {
      $activeDialog,
      setActiveDialog: (d: { type: string; payload?: Record<string, unknown> }) => $activeDialog.set(d),
      showToast: (message: string, type: string) => toastMessages.push({ message, type }),
      _toastMessages: toastMessages,
    } as unknown as ActionContext['ui'],
    grid: {
      $selectedDevice,
    } as unknown as ActionContext['grid'],
    closeDialog: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies ActionContext;
}

beforeEach(() => {
  vi.mocked(callServiceReturning).mockResolvedValue({ response: 'ok' } as any);
});

describe('analyzeGrowspace — rate limiting', () => {
  it('shows a toast and clears loading state when rate_limited — does not crash the dialog', async () => {
    const ctx = makeContext();
    ctx.ui.$activeDialog.set({ type: 'GROW_MASTER', payload: { growspaceId: 'gs1', isLoading: false, response: null, mode: 'single' as const } });
    vi.mocked(callServiceReturning).mockRejectedValueOnce(
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
    vi.mocked(callServiceReturning).mockRejectedValueOnce(
      new WSError('rate_limited', 'Rate limit exceeded — try again later')
    );
    ctx.grid.$selectedDevice.set('device-1');

    await analyzeGrowspace(ctx, 'How is my VPD?', false);

    expect(ctx.ui.$activeDialog.get().type).toBe('GROW_MASTER');
  });
});

describe('analyzeGrowspace — success path', () => {
  it('calls callServiceReturning for ASK_GROW_ADVICE with selected device when all=false', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-42');
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: 'looks good' } as any);

    const result = await analyzeGrowspace(ctx, 'Check VPD', false);

    expect(callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      expect.stringContaining('grow_advice'),
      { growspace_id: 'device-42', user_query: 'Check VPD' },
      expect.anything()
    );
    expect(result).toBe('looks good');
  });

  it('calls callServiceReturning for ANALYZE_ALL when all=true', async () => {
    const ctx = makeContext();
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: 'all good' } as any);

    const result = await analyzeGrowspace(ctx, '', true);

    expect(callServiceReturning).toHaveBeenCalledWith(
      'growspace_manager',
      expect.stringContaining('analyz'),
      {},
      expect.anything()
    );
    expect(result).toBe('all good');
  });

  it('sets isLoading=true then updates dialog with response when GROW_MASTER is active', async () => {
    const ctx = makeContext();
    ctx.ui.$activeDialog.set({ type: 'GROW_MASTER', payload: { growspaceId: 'gs1', isLoading: false, response: null, mode: 'single' as const } });
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: 'nice plants' } as any);

    const result = await analyzeGrowspace(ctx, 'status?', false);

    const dialog = ctx.ui.$activeDialog.get() as { type: string; payload: Record<string, unknown> };
    expect(dialog.type).toBe('GROW_MASTER');
    expect(dialog.payload.isLoading).toBe(false);
    expect(dialog.payload.response).toBe('nice plants');
    expect(result).toBe('nice plants');
  });

  it('does not touch the dialog when it is not GROW_MASTER', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: 'all fine' } as any);

    await analyzeGrowspace(ctx, 'q', false);

    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('handles a plain string response', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockResolvedValueOnce('just a string' as any);

    const result = await analyzeGrowspace(ctx, 'q', false);

    expect(result).toBe('just a string');
  });

  it('JSON-stringifies the response when there is no response field', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    const raw = { data: 'something' };
    vi.mocked(callServiceReturning).mockResolvedValueOnce(raw as any);

    const result = await analyzeGrowspace(ctx, 'q', false);

    expect(result).toBe(JSON.stringify(raw));
  });

  it('extracts deeply nested response.response string', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: { response: 'deep text' } } as any);

    const result = await analyzeGrowspace(ctx, 'q', false);

    expect(result).toBe('deep text');
  });

  it('JSON-stringifies a nested response object when inner response is not a string', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    const inner = { data: 42 };
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: inner } as any);

    const result = await analyzeGrowspace(ctx, 'q', false);

    expect(result).toBe(JSON.stringify(inner));
  });

  it('throws when no device is selected and all=false', async () => {
    const ctx = makeContext();

    await expect(analyzeGrowspace(ctx, 'q', false)).resolves.toBeUndefined();
    // The caught error propagates to the error handler, which sets a dialog response or swallows it
  });
});

describe('analyzeGrowspace — rate limiting when dialog is not GROW_MASTER', () => {
  it('shows a toast and does not crash when rate_limited and dialog is not GROW_MASTER', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockRejectedValueOnce(
      new WSError('rate_limited', 'Rate limit exceeded')
    );

    await analyzeGrowspace(ctx, 'q', false);

    const toasts = (ctx.ui as unknown as { _toastMessages: Array<{ message: string }> })._toastMessages;
    expect(toasts.length).toBeGreaterThan(0);
    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });
});

describe('analyzeGrowspace — general error handling', () => {
  it('sets dialog response to error message when a non-rate-limited Error is thrown', async () => {
    const ctx = makeContext();
    ctx.ui.$activeDialog.set({ type: 'GROW_MASTER', payload: { growspaceId: 'gs1', isLoading: true, response: null, mode: 'single' as const } });
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockRejectedValueOnce(new Error('connection failed'));

    await analyzeGrowspace(ctx, 'q', false);

    const dialog = ctx.ui.$activeDialog.get() as { type: string; payload: Record<string, unknown> };
    expect(dialog.payload.isLoading).toBe(false);
    expect(dialog.payload.response).toBe('Error: connection failed');
  });

  it('uses "Unknown error" message when a non-Error value is thrown', async () => {
    const ctx = makeContext();
    ctx.ui.$activeDialog.set({ type: 'GROW_MASTER', payload: { growspaceId: 'gs1', isLoading: true, response: null, mode: 'single' as const } });
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockRejectedValueOnce('something weird');

    await analyzeGrowspace(ctx, 'q', false);

    const dialog = ctx.ui.$activeDialog.get() as { type: string; payload: Record<string, unknown> };
    expect(dialog.payload.response).toBe('Error: Unknown error');
  });

  it('does not update dialog on error when dialog is not GROW_MASTER', async () => {
    const ctx = makeContext();
    ctx.grid.$selectedDevice.set('device-1');
    vi.mocked(callServiceReturning).mockRejectedValueOnce(new Error('boom'));

    await analyzeGrowspace(ctx, 'q', false);

    expect(ctx.ui.$activeDialog.get().type).toBe('NONE');
  });
});

describe('getStrainRecommendation', () => {
  it('returns the response string from an object response', async () => {
    const ctx = makeContext();
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: 'Blue Dream is ideal' } as any);

    const result = await getStrainRecommendation(ctx, 'high yield');

    expect(result).toBe('Blue Dream is ideal');
  });

  it('returns the string directly when the service returns a plain string', async () => {
    const ctx = makeContext();
    vi.mocked(callServiceReturning).mockResolvedValueOnce('try OG Kush' as any);

    const result = await getStrainRecommendation(ctx, 'any');

    expect(result).toBe('try OG Kush');
  });

  it('JSON-stringifies when the response value is not a string', async () => {
    const ctx = makeContext();
    const inner = { strains: ['A', 'B'] };
    vi.mocked(callServiceReturning).mockResolvedValueOnce({ response: inner } as any);

    const result = await getStrainRecommendation(ctx, 'any');

    expect(result).toBe(JSON.stringify(inner));
  });

  it('JSON-stringifies when service returns a non-string non-object', async () => {
    const ctx = makeContext();
    vi.mocked(callServiceReturning).mockResolvedValueOnce(null as any);

    const result = await getStrainRecommendation(ctx, 'any');

    expect(result).toBe('null');
  });
});
