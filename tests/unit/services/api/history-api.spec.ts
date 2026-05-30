import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryAPI } from '../../../../src/services/api/history-api';
import { WS_TYPE_GET_HISTORY_STATS } from '../../../../src/lib/constants';

const START = new Date('2025-01-01T00:00:00Z');
const END = new Date('2025-01-02T00:00:00Z');

let callApiMock: ReturnType<typeof vi.fn>;
let callWSMock: ReturnType<typeof vi.fn>;
let mockHass: any;
let api: HistoryAPI;

beforeEach(() => {
  callApiMock = vi.fn().mockResolvedValue([]);
  callWSMock = vi.fn().mockResolvedValue({});
  mockHass = { callApi: callApiMock, callWS: callWSMock };
  api = new HistoryAPI(mockHass);
});

describe('HistoryAPI — getHistory', () => {
  it('returns [] when hass is not set', async () => {
    const noHassApi = new HistoryAPI();
    expect(await noHassApi.getHistory('sensor.x', START)).toEqual([]);
  });

  it('includes end_time in URL when endTime provided', async () => {
    await api.getHistory('sensor.x', START, END);
    const url: string = callApiMock.mock.calls[0][1];
    expect(url).toContain(`&end_time=${END.toISOString()}`);
  });

  it('does not include end_time in URL when endTime is omitted', async () => {
    await api.getHistory('sensor.x', START);
    const url: string = callApiMock.mock.calls[0][1];
    expect(url).not.toContain('end_time');
  });

  it('returns res[0] when API returns data', async () => {
    const states = [{ entity_id: 'sensor.x', state: '10' } as any];
    callApiMock.mockResolvedValue([states]);
    const result = await api.getHistory('sensor.x', START);
    expect(result).toEqual(states);
  });

  it('returns [] when API returns empty array', async () => {
    callApiMock.mockResolvedValue([]);
    expect(await api.getHistory('sensor.x', START)).toEqual([]);
  });

  it('returns [] and logs when API throws', async () => {
    callApiMock.mockRejectedValue(new Error('api error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await api.getHistory('sensor.x', START)).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('HistoryAPI — getBatchHistory', () => {
  it('includes end_time in URL when endTime provided', async () => {
    await api.getBatchHistory(['sensor.x'], START, END);
    const url: string = callApiMock.mock.calls[0][1];
    expect(url).toContain(`&end_time=${END.toISOString()}`);
  });

  it('does not include end_time when endTime is omitted', async () => {
    await api.getBatchHistory(['sensor.x'], START);
    const url: string = callApiMock.mock.calls[0][1];
    expect(url).not.toContain('end_time');
  });

  it('builds resultMap keyed by entity_id', async () => {
    const states = [
      { entity_id: 'sensor.x', state: '10' } as any,
      { entity_id: 'sensor.x', state: '11' } as any,
    ];
    callApiMock.mockResolvedValue([states]);
    const result = await api.getBatchHistory(['sensor.x'], START);
    expect(result).toEqual({ 'sensor.x': states });
  });

  it('skips empty entity history arrays', async () => {
    callApiMock.mockResolvedValue([[], [{ entity_id: 'sensor.y', state: '5' } as any]]);
    const result = await api.getBatchHistory(['sensor.x', 'sensor.y'], START);
    expect(result).not.toHaveProperty('sensor.x');
    expect(result).toHaveProperty('sensor.y');
  });

  it('returns {} and logs when API throws', async () => {
    callApiMock.mockRejectedValue(new Error('batch error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await api.getBatchHistory(['sensor.x'], START)).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('HistoryAPI — getHistoryStats', () => {
  const validWSResponse = {
    'sensor.x': [{ s: '10', lu: '2025-01-01T00:00:00Z', a: { unit: 'C' } }],
  };

  it('maps compact WS response to HistorySensorState format', async () => {
    callWSMock.mockResolvedValue(validWSResponse);
    const result = await api.getHistoryStats(['sensor.x'], START);
    expect(result['sensor.x'][0]).toMatchObject({
      entity_id: 'sensor.x',
      state: '10',
      attributes: { unit: 'C' },
    });
  });

  it('warns and falls back to getBatchHistory when schema validation fails', async () => {
    callWSMock.mockResolvedValue({ 'sensor.x': 'not-an-array' });
    callApiMock.mockResolvedValue([[{ entity_id: 'sensor.x', state: '10' } as any]]);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await api.getHistoryStats(['sensor.x'], START);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Validation Failed'),
      expect.anything(),
    );
    expect(result).toHaveProperty('sensor.x');
    consoleSpy.mockRestore();
  });

  it('falls back to getBatchHistory when WS throws', async () => {
    callWSMock.mockRejectedValue(new Error('ws down'));
    callApiMock.mockResolvedValue([[{ entity_id: 'sensor.x', state: '9' } as any]]);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await api.getHistoryStats(['sensor.x'], START);
    expect(result).toHaveProperty('sensor.x');
    consoleSpy.mockRestore();
  });

  it('sends WS message with correct params', async () => {
    callWSMock.mockResolvedValue(validWSResponse);
    await api.getHistoryStats(['sensor.x', 'sensor.y'], START, END, 30, false);
    expect(callWSMock).toHaveBeenCalledWith({
      type: WS_TYPE_GET_HISTORY_STATS,
      entity_ids: ['sensor.x', 'sensor.y'],
      start_time: START.toISOString(),
      end_time: END.toISOString(),
      interval_minutes: 30,
      significant_changes_only: false,
    });
  });
});
