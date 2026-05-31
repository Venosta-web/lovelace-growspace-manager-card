import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceAPI } from '../../../../src/services/api/growspace-api';
import { DOMAIN, SERVICES } from '../../../../src/constants';

vi.mock('../../../../src/schemas/api-schema', () => ({
  GrowspaceAPIResponseSchema: {
    safeParse: vi.fn(),
  },
  GrowspaceAPICollectionSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock('../../../../src/adapters/growspace-adapter', () => ({
  GrowspaceAdapter: {
    transformGrowspace: vi.fn(),
  },
}));

import { GrowspaceAPIResponseSchema, GrowspaceAPICollectionSchema } from '../../../../src/schemas/api-schema';
import { GrowspaceAdapter } from '../../../../src/adapters/growspace-adapter';

const mockResponseSchema = vi.mocked(GrowspaceAPIResponseSchema.safeParse);
const mockCollectionSchema = vi.mocked(GrowspaceAPICollectionSchema.safeParse);
const mockTransform = vi.mocked(GrowspaceAdapter.transformGrowspace);

let sendMessagePromiseMock: ReturnType<typeof vi.fn>;
let callServiceMock: ReturnType<typeof vi.fn>;
let mockHass: any;
let api: GrowspaceAPI;

beforeEach(() => {
  sendMessagePromiseMock = vi.fn();
  callServiceMock = vi.fn().mockResolvedValue(undefined);
  mockHass = {
    callService: callServiceMock,
    callWS: vi.fn(),
    connection: { sendMessagePromise: sendMessagePromiseMock },
  };
  api = new GrowspaceAPI(mockHass);
  vi.clearAllMocks();
});

describe('GrowspaceAPI — fetchGrowspaceData', () => {
  it('returns null when hass is not set', async () => {
    const apiWithoutHass = new GrowspaceAPI();
    const result = await apiWithoutHass.fetchGrowspaceData('gs-1');
    expect(result).toBeNull();
  });

  it('returns cached data when cache is valid (single)', async () => {
    const cachedData = { identity: { id: 'gs-1' } } as any;
    mockResponseSchema.mockReturnValue({ success: true, data: cachedData });
    sendMessagePromiseMock.mockResolvedValue(cachedData);

    await api.fetchGrowspaceData('gs-1');
    sendMessagePromiseMock.mockClear();

    const result = await api.fetchGrowspaceData('gs-1');
    expect(result).toEqual(cachedData);
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('returns cached data when cache is valid (collection)', async () => {
    const cachedData = { 'gs-1': { identity: { id: 'gs-1' } } } as any;
    mockCollectionSchema.mockReturnValue({ success: true, data: cachedData });
    sendMessagePromiseMock.mockResolvedValue(cachedData);

    await api.fetchGrowspaceData();
    sendMessagePromiseMock.mockClear();

    const result = await api.fetchGrowspaceData();
    expect(result).toEqual(cachedData);
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('returns parsed data for valid single growspace response', async () => {
    const wsResult = { identity: { id: 'gs-1' } };
    const parsed = { identity: { id: 'gs-1', name: 'parsed' } };
    sendMessagePromiseMock.mockResolvedValue(wsResult);
    mockResponseSchema.mockReturnValue({ success: true, data: parsed });

    const result = await api.fetchGrowspaceData('gs-1');
    expect(result).toEqual(parsed);
    expect(sendMessagePromiseMock).toHaveBeenCalledWith({
      type: 'growspace_manager/get_data',
      growspace_id: 'gs-1',
    });
  });

  it('returns raw result and caches it when single response fails validation', async () => {
    const rawResult = { bad: 'data' };
    const error = { format: () => ({ message: 'invalid' }) };
    sendMessagePromiseMock.mockResolvedValue(rawResult);
    mockResponseSchema.mockReturnValue({ success: false, error });

    const result = await api.fetchGrowspaceData('gs-1');

    expect(result).toEqual(rawResult);
    // Second call should hit cache (no extra WS call)
    sendMessagePromiseMock.mockClear();
    const cached = await api.fetchGrowspaceData('gs-1');
    expect(cached).toEqual(rawResult);
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('returns parsed data for valid collection response', async () => {
    const wsResult = { 'gs-1': { identity: { id: 'gs-1' } } };
    const parsed = { 'gs-1': { identity: { id: 'gs-1', name: 'parsed' } } };
    sendMessagePromiseMock.mockResolvedValue(wsResult);
    mockCollectionSchema.mockReturnValue({ success: true, data: parsed });

    const result = await api.fetchGrowspaceData();
    expect(result).toEqual(parsed);
  });

  it('returns raw collection and logs per-item errors when collection validation fails', async () => {
    const rawResult = {
      'gs-1': { identity: { id: 'gs-1' } },
      'gs-bad': { broken: true },
    };
    const collectionError = { format: () => ({ message: 'collection invalid' }) };
    const itemOkParsed = { success: true, data: rawResult['gs-1'] };
    const itemBadParsed = { success: false, error: { format: () => ({}) } };

    sendMessagePromiseMock.mockResolvedValue(rawResult);
    mockCollectionSchema.mockReturnValue({ success: false, error: collectionError });
    // First item parses ok, second fails
    mockResponseSchema
      .mockReturnValueOnce(itemOkParsed as any)
      .mockReturnValueOnce(itemBadParsed as any);

    const result = await api.fetchGrowspaceData();
    expect(result).toEqual(rawResult);
  });

  it('returns raw collection and caches it when collection validation fails', async () => {
    const rawResult = { 'gs-1': { identity: { id: 'gs-1' } } };
    const error = { format: () => ({}) };
    sendMessagePromiseMock.mockResolvedValue(rawResult);
    mockCollectionSchema.mockReturnValue({ success: false, error });
    mockResponseSchema.mockReturnValue({ success: true, data: rawResult['gs-1'] });

    await api.fetchGrowspaceData();
    sendMessagePromiseMock.mockClear();
    await api.fetchGrowspaceData();
    expect(sendMessagePromiseMock).not.toHaveBeenCalled();
  });

  it('returns null when sendMessagePromise throws', async () => {
    sendMessagePromiseMock.mockRejectedValue(new Error('network error'));
    const result = await api.fetchGrowspaceData('gs-1');
    expect(result).toBeNull();
  });
});

describe('GrowspaceAPI — invalidateCache', () => {
  it('invalidates only the specific growspace and the collection cache', async () => {
    const data = { identity: { id: 'gs-1' } } as any;
    sendMessagePromiseMock.mockResolvedValue(data);
    mockResponseSchema.mockReturnValue({ success: true, data });

    await api.fetchGrowspaceData('gs-1');
    api.invalidateCache('gs-1');

    sendMessagePromiseMock.mockClear();
    await api.fetchGrowspaceData('gs-1');
    expect(sendMessagePromiseMock).toHaveBeenCalledTimes(1);
  });

  it('clears all cache when called without argument', async () => {
    const data = { identity: { id: 'gs-1' } } as any;
    sendMessagePromiseMock.mockResolvedValue(data);
    mockResponseSchema.mockReturnValue({ success: true, data });
    mockCollectionSchema.mockReturnValue({ success: true, data: { 'gs-1': data } });

    await api.fetchGrowspaceData('gs-1');
    await api.fetchGrowspaceData();
    api.invalidateCache();

    sendMessagePromiseMock.mockClear();
    await api.fetchGrowspaceData('gs-1');
    await api.fetchGrowspaceData();
    expect(sendMessagePromiseMock).toHaveBeenCalledTimes(2);
  });
});

describe('GrowspaceAPI — getGrowspaceDevices', () => {
  it('returns empty array when wsDataMap is empty', () => {
    const result = api.getGrowspaceDevices({});
    expect(result).toEqual([]);
  });

  it('filters out null results from transformGrowspace', () => {
    const wsDataMap = {
      'gs-1': { identity: { id: 'gs-1' } } as any,
      'gs-null': { identity: { id: 'gs-null' } } as any,
    };
    const device = { id: 'gs-1', name: 'Space 1' } as any;
    mockTransform.mockReturnValueOnce(device).mockReturnValueOnce(null);

    const result = api.getGrowspaceDevices(wsDataMap);
    expect(result).toEqual([device]);
  });

  it('returns all devices when none are null', () => {
    const wsDataMap = {
      'gs-1': { identity: { id: 'gs-1' } } as any,
      'gs-2': { identity: { id: 'gs-2' } } as any,
    };
    const d1 = { id: 'gs-1' } as any;
    const d2 = { id: 'gs-2' } as any;
    mockTransform.mockReturnValueOnce(d1).mockReturnValueOnce(d2);

    const result = api.getGrowspaceDevices(wsDataMap);
    expect(result).toEqual([d1, d2]);
  });
});

describe('GrowspaceAPI — addGrowspace', () => {
  it('calls service with correct payload', async () => {
    await api.addGrowspace({
      name: 'Room A',
      rows: 3,
      plantsPerRow: 4,
      notificationService: 'notify.mobile',
    });
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.ADD_GROWSPACE, {
      name: 'Room A',
      rows: 3,
      plants_per_row: 4,
      notification_target: 'notify.mobile',
    });
  });

  it('re-throws when callService fails', async () => {
    const err = new Error('service unavailable');
    callServiceMock.mockRejectedValue(err);
    await expect(api.addGrowspace({ name: 'X', rows: 1, plantsPerRow: 1 })).rejects.toThrow(
      'service unavailable',
    );
  });
});

describe('GrowspaceAPI — updateGrowspace', () => {
  it('sends only growspace_id when no optional fields are provided', async () => {
    await api.updateGrowspace({ growspaceId: 'gs-1' });
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_GROWSPACE, {
      growspace_id: 'gs-1',
    });
  });

  it('includes optional fields when provided', async () => {
    await api.updateGrowspace({
      growspaceId: 'gs-1',
      name: 'Updated',
      rows: 5,
      plantsPerRow: 2,
      notificationService: 'notify.slack',
    });
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.UPDATE_GROWSPACE, {
      growspace_id: 'gs-1',
      name: 'Updated',
      rows: 5,
      plants_per_row: 2,
      notification_target: 'notify.slack',
    });
  });

  it('re-throws when callService fails', async () => {
    const err = new Error('update failed');
    callServiceMock.mockRejectedValue(err);
    await expect(api.updateGrowspace({ growspaceId: 'gs-1', name: 'X' })).rejects.toThrow(
      'update failed',
    );
  });
});

describe('GrowspaceAPI — removeGrowspace', () => {
  it('calls service with correct payload', async () => {
    await api.removeGrowspace('gs-1');
    expect(callServiceMock).toHaveBeenCalledWith(DOMAIN, SERVICES.REMOVE_GROWSPACE, {
      growspace_id: 'gs-1',
    });
  });

  it('re-throws when callService fails', async () => {
    const err = new Error('remove failed');
    callServiceMock.mockRejectedValue(err);
    await expect(api.removeGrowspace('gs-1')).rejects.toThrow('remove failed');
  });
});
