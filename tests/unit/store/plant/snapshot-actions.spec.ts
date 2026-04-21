import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSnapshots,
  captureSnapshot,
  getVisionHistory,
  triggerVisionCheckup,
  updateVisionCheckupConfig,
} from '../../../../src/store/plant/snapshot-actions';
import { makeFakeCtx } from '../../helpers/fake-ctx';

describe('getSnapshots (read-only)', () => {
  it('returns dataService result without toasting', async () => {
    const ctx = makeFakeCtx();
    const fakeData = [{ id: 'snap1' }];
    ctx.dataService.getSnapshots.mockResolvedValue(fakeData);

    const result = await getSnapshots(ctx, 'gs-1');

    expect(ctx.dataService.getSnapshots).toHaveBeenCalledWith('gs-1');
    expect(result).toEqual(fakeData);
    expect(ctx.showToast).not.toHaveBeenCalled();
  });

  it('propagates errors without toasting', async () => {
    const ctx = makeFakeCtx();
    ctx.dataService.getSnapshots.mockRejectedValue(new Error('net-err'));

    await expect(getSnapshots(ctx, 'gs-1')).rejects.toThrow('net-err');
    expect(ctx.showToast).not.toHaveBeenCalled();
  });
});

describe('captureSnapshot', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService and shows success toast', async () => {
    await captureSnapshot(ctx, 'gs-1');

    expect(ctx.dataService.captureSnapshot).toHaveBeenCalledWith('gs-1');
    expect(ctx.showToast).toHaveBeenCalledWith('Snapshot captured', 'success');
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.captureSnapshot.mockRejectedValue(new Error('camera-err'));

    await expect(captureSnapshot(ctx, 'gs-1')).rejects.toThrow('camera-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('camera-err'), 'error');
  });
});

describe('getVisionHistory (read-only)', () => {
  it('returns dataService result without toasting', async () => {
    const ctx = makeFakeCtx();
    const history = [{ event: 'check' }];
    ctx.dataService.getVisionHistory.mockResolvedValue(history);

    const result = await getVisionHistory(ctx, 'gs-1');

    expect(result).toEqual(history);
    expect(ctx.showToast).not.toHaveBeenCalled();
  });
});

describe('triggerVisionCheckup', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await triggerVisionCheckup(ctx, 'gs-1');

    expect(ctx.dataService.triggerVisionCheckup).toHaveBeenCalledWith('gs-1');
    expect(ctx.showToast).toHaveBeenCalledWith('Vision checkup triggered', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.triggerVisionCheckup.mockRejectedValue(new Error('vision-err'));

    await expect(triggerVisionCheckup(ctx, 'gs-1')).rejects.toThrow('vision-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('vision-err'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

describe('updateVisionCheckupConfig', () => {
  let ctx: ReturnType<typeof makeFakeCtx>;

  beforeEach(() => {
    ctx = makeFakeCtx();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    const config = { enabled: true, interval_minutes: 60 } as any;
    await updateVisionCheckupConfig(ctx, 'gs-1', config);

    expect(ctx.dataService.updateVisionCheckupConfig).toHaveBeenCalledWith('gs-1', config);
    expect(ctx.showToast).toHaveBeenCalledWith('Vision config saved', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    ctx.dataService.updateVisionCheckupConfig.mockRejectedValue(new Error('config-err'));
    const config = { enabled: false } as any;

    await expect(updateVisionCheckupConfig(ctx, 'gs-1', config)).rejects.toThrow('config-err');
    expect(ctx.showToast).toHaveBeenCalledWith(expect.stringContaining('config-err'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});
