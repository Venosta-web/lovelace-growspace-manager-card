import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addGrowspace, updateGrowspace, removeGrowspace } from './growspace-actions';
import type { ActionContext } from '../core/action-context';
import { devices$, setDevices } from '../../slices/grid';
import { callService } from '../../services/hass-call';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue(undefined),
  setHass: vi.fn(),
  getHass: vi.fn(),
  callApi: vi.fn().mockResolvedValue(undefined),
  callFetch: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeContext(initialDevices: any[] = []) {
  setDevices(initialDevices);
  const showToast = vi.fn();
  return {
    ui: { showToast } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    grid: {} as any,
  } satisfies ActionContext;
}

afterEach(() => {
  setDevices([]);
});

// ---------------------------------------------------------------------------
// addGrowspace
// ---------------------------------------------------------------------------

describe('addGrowspace', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls callService with correct params and returns true on success', async () => {
    const result = await addGrowspace(ctx, 'Tent A', 4, 4, 'mobile_app');

    expect(callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_growspace',
      { name: 'Tent A', rows: 4, plants_per_row: 4, notification_target: 'mobile_app' }
    );
    expect(result).toBe(true);
  });

  it('refreshes data and closes dialog on success', async () => {
    await addGrowspace(ctx, 'Tent A');

    expect(ctx.refreshData).toHaveBeenCalled();
    expect(ctx.closeDialog).toHaveBeenCalled();
  });

  it('shows success toast on success', async () => {
    await addGrowspace(ctx, 'Tent A');

    expect(ctx.ui.showToast).toHaveBeenCalledWith('Growspace added successfully!', 'success');
  });

  it('returns false and shows error toast when name is empty', async () => {
    const result = await addGrowspace(ctx, '');

    expect(result).toBe(false);
    expect(ctx.ui.showToast).toHaveBeenCalledWith('Name is required', 'error');
  });

  it('does not call callService when name is empty', async () => {
    await addGrowspace(ctx, '');

    expect(callService).not.toHaveBeenCalled();
  });

  it('returns false and shows error toast when service throws', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('network error'));

    const result = await addGrowspace(ctx, 'Tent A');

    expect(result).toBe(false);
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('network error'),
      'error'
    );
  });

  it('does not close dialog when service throws', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('fail'));

    await addGrowspace(ctx, 'Tent A');

    expect(ctx.closeDialog).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateGrowspace
// ---------------------------------------------------------------------------

describe('updateGrowspace', () => {
  const existingDevice = { deviceId: 'gs-1', name: 'Old Name', rows: 2, plantsPerRow: 2 };
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext([existingDevice]);
  });

  it('calls callService with correct params and returns true on success', async () => {
    const result = await updateGrowspace(ctx, 'gs-1', 'New Name', 4, 8);

    expect(callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_growspace',
      expect.objectContaining({ growspace_id: 'gs-1', name: 'New Name', rows: 4, plants_per_row: 8 })
    );
    expect(result).toBe(true);
  });

  it('refreshes data and closes dialog on success', async () => {
    await updateGrowspace(ctx, 'gs-1', 'New Name', 4, 8);

    expect(ctx.refreshData).toHaveBeenCalled();
    expect(ctx.closeDialog).toHaveBeenCalled();
  });

  it('shows success toast on success', async () => {
    await updateGrowspace(ctx, 'gs-1', 'New Name', 4, 8);

    expect(ctx.ui.showToast).toHaveBeenCalledWith('Growspace updated successfully', 'success');
  });

  it('patches $devices optimistically before calling the service', async () => {
    let devicesAtCallTime: any[] | undefined;
    vi.mocked(callService).mockImplementationOnce(async () => {
      devicesAtCallTime = devices$.get();
    });

    await updateGrowspace(ctx, 'gs-1', 'New Name', 4, 8);

    expect(devicesAtCallTime).toBeDefined();
    const patched = devicesAtCallTime!.find((d: any) => d.deviceId === 'gs-1');
    expect(patched).toMatchObject({ name: 'New Name', rows: 4, plantsPerRow: 8 });
  });

  it('does not crash when growspaceId is not found in $devices', async () => {
    const result = await updateGrowspace(ctx, 'unknown-id', 'Name', 2, 2);

    expect(callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_growspace',
      expect.objectContaining({ growspace_id: 'unknown-id' })
    );
    expect(result).toBe(true);
  });

  it('returns false and shows error toast when service throws', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('update failed'));

    const result = await updateGrowspace(ctx, 'gs-1', 'New Name', 4, 8);

    expect(result).toBe(false);
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('update failed'),
      'error'
    );
  });
});

// ---------------------------------------------------------------------------
// removeGrowspace
// ---------------------------------------------------------------------------

describe('removeGrowspace', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls callService with correct growspaceId and returns true on success', async () => {
    const result = await removeGrowspace(ctx, 'gs-1');

    expect(callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_growspace',
      { growspace_id: 'gs-1' }
    );
    expect(result).toBe(true);
  });

  it('refreshes data and closes dialog on success', async () => {
    await removeGrowspace(ctx, 'gs-1');

    expect(ctx.refreshData).toHaveBeenCalled();
    expect(ctx.closeDialog).toHaveBeenCalled();
  });

  it('shows success toast on success', async () => {
    await removeGrowspace(ctx, 'gs-1');

    expect(ctx.ui.showToast).toHaveBeenCalledWith('Growspace removed successfully', 'success');
  });

  it('returns false and shows error toast when service throws', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('remove failed'));

    const result = await removeGrowspace(ctx, 'gs-1');

    expect(result).toBe(false);
    expect(ctx.ui.showToast).toHaveBeenCalledWith(
      expect.stringContaining('remove failed'),
      'error'
    );
  });

  it('does not close dialog when service throws', async () => {
    vi.mocked(callService).mockRejectedValueOnce(new Error('fail'));

    await removeGrowspace(ctx, 'gs-1');

    expect(ctx.closeDialog).not.toHaveBeenCalled();
  });
});
