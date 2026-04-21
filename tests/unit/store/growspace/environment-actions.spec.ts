import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureEnvironment,
  removeEnvironment,
  resetWaterTracking,
} from '../../../../src/store/growspace/environment-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

const baseConfig = {
  growspaceId: 'gs-1',
  temperatureSensor: 'sensor.temp',
  humiditySensor: 'sensor.humid',
} as any;

describe('configureEnvironment', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await configureEnvironment(ctx, baseConfig);

    expect(ctx.dataService.configureEnvironment).toHaveBeenCalledWith(baseConfig);
    expect(ctx.showToast).toHaveBeenCalledWith('Environment configured successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.configureEnvironment.mockRejectedValue(new Error('env-err'));

    await expect(configureEnvironment(ctx, baseConfig)).rejects.toThrow('env-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('env-err'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('removeEnvironment', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await removeEnvironment(ctx, 'gs-1');

    expect(ctx.dataService.removeEnvironment).toHaveBeenCalledWith('gs-1');
    expect(ctx.showToast).toHaveBeenCalledWith('Environment configuration removed', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.removeEnvironment.mockRejectedValue(new Error('remove-err'));

    await expect(removeEnvironment(ctx, 'gs-1')).rejects.toThrow('remove-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('remove-err'), 'error');
  });
});

describe('resetWaterTracking', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await resetWaterTracking(ctx, 'gs-1');

    expect(ctx.dataService.resetWaterTracking).toHaveBeenCalledWith('gs-1');
    expect(ctx.showToast).toHaveBeenCalledWith('Water tracking reset', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.resetWaterTracking.mockRejectedValue(new Error('reset-err'));

    await expect(resetWaterTracking(ctx, 'gs-1')).rejects.toThrow('reset-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('reset-err'), 'error');
  });
});
