import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { hassCall, setHass, callService, callFetch, callServiceReturning } from '../../../src/services/hass-call';
import { WSError } from '../../../src/services/base-api';

function makeMockHass(callWSImpl: (msg: unknown) => unknown = () => ({})) {
  return { callWS: vi.fn().mockImplementation(callWSImpl) } as any;
}

describe('hassCall', () => {
  beforeEach(() => {
    // Reset to undefined so tests are isolated
    setHass(undefined as any);
  });

  it('returns zod-validated response on success', async () => {
    const schema = z.object({ plant_id: z.string() });
    const mockHass = makeMockHass(() => ({ plant_id: 'abc' }));
    setHass(mockHass);

    const result = await hassCall('growspace_manager/water_plant', { plant_id: 'abc', amount: 100 }, schema);

    expect(result).toEqual({ plant_id: 'abc' });
    expect(mockHass.callWS).toHaveBeenCalledWith({ type: 'growspace_manager/water_plant', plant_id: 'abc', amount: 100 });
  });

  it('throws WSError with typed code when backend returns error', async () => {
    const schema = z.object({ plant_id: z.string() });
    const mockHass = makeMockHass(() => {
      throw { code: 'entity_not_found', message: 'Plant not found' };
    });
    setHass(mockHass);

    await expect(hassCall('growspace_manager/water_plant', { plant_id: 'x' }, schema))
      .rejects.toMatchObject({ name: 'WSError', code: 'entity_not_found' });
  });

  it('maps unknown error code to internal_error', async () => {
    const schema = z.object({});
    const mockHass = makeMockHass(() => {
      throw { code: 'some_unknown_code', message: 'Unexpected backend error' };
    });
    setHass(mockHass);

    await expect(hassCall('growspace_manager/do_something', {}, schema))
      .rejects.toMatchObject({ name: 'WSError', code: 'internal_error' });
  });

  it('wraps plain Error as internal_error WSError', async () => {
    const schema = z.object({});
    const mockHass = makeMockHass(() => {
      throw new Error('network failure');
    });
    setHass(mockHass);

    await expect(hassCall('growspace_manager/do_something', {}, schema))
      .rejects.toMatchObject({ name: 'WSError', code: 'internal_error', message: 'network failure' });
  });

  it('wraps non-Error thrown value as internal_error WSError', async () => {
    const schema = z.object({});
    const mockHass = makeMockHass(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'a raw string error';
    });
    setHass(mockHass);

    await expect(hassCall('growspace_manager/do_something', {}, schema))
      .rejects.toMatchObject({ name: 'WSError', code: 'internal_error' });
  });

  it('throws WSError when response fails zod schema', async () => {
    const schema = z.object({ plant_id: z.string() });
    // Backend returns wrong shape
    const mockHass = makeMockHass(() => ({ wrong_field: 42 }));
    setHass(mockHass);

    await expect(hassCall('growspace_manager/water_plant', { plant_id: 'abc' }, schema))
      .rejects.toMatchObject({ name: 'WSError', code: 'internal_error' });
  });

  it('throws when hass is not set', async () => {
    const schema = z.object({});

    await expect(hassCall('any_command', {}, schema))
      .rejects.toThrow();
  });
});

describe('callService', () => {
  beforeEach(() => {
    setHass(undefined as any);
  });

  it('delegates to hass.callService with correct arguments', async () => {
    const mockHass = {
      callService: vi.fn().mockResolvedValue(undefined),
    } as any;
    setHass(mockHass);

    await callService('growspace_manager', 'water_plant', { plant_id: 'p1', amount: 250 });

    expect(mockHass.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'water_plant',
      { plant_id: 'p1', amount: 250 }
    );
  });

  it('uses empty object as default serviceData', async () => {
    const mockHass = {
      callService: vi.fn().mockResolvedValue(undefined),
    } as any;
    setHass(mockHass);

    await callService('growspace_manager', 'refresh');

    expect(mockHass.callService).toHaveBeenCalledWith('growspace_manager', 'refresh', {});
  });

  it('throws WSError when hass is not set', async () => {
    await expect(callService('growspace_manager', 'water_plant'))
      .rejects.toThrow(WSError);
  });
});

describe('callFetch', () => {
  beforeEach(() => {
    setHass(undefined as any);
  });

  it('delegates to hass.fetchWithAuth and returns the Response', async () => {
    const fakeResponse = new Response('ok', { status: 200 });
    const mockHass = {
      fetchWithAuth: vi.fn().mockResolvedValue(fakeResponse),
    } as any;
    setHass(mockHass);

    const result = await callFetch('/api/growspace_manager/import_strains', { method: 'POST' });

    expect(result).toBe(fakeResponse);
    expect(mockHass.fetchWithAuth).toHaveBeenCalledWith(
      '/api/growspace_manager/import_strains',
      { method: 'POST' }
    );
  });

  it('forwards path without init options', async () => {
    const fakeResponse = new Response('{}', { status: 200 });
    const mockHass = {
      fetchWithAuth: vi.fn().mockResolvedValue(fakeResponse),
    } as any;
    setHass(mockHass);

    await callFetch('/api/growspace_manager/status');

    expect(mockHass.fetchWithAuth).toHaveBeenCalledWith('/api/growspace_manager/status', undefined);
  });

  it('throws WSError when hass is not set', async () => {
    await expect(callFetch('/api/growspace_manager/status'))
      .rejects.toThrow(WSError);
  });
});

describe('callServiceReturning', () => {
  beforeEach(() => {
    setHass(undefined as any);
  });

  it('returns zod-validated payload on success', async () => {
    const schema = z.object({ advice: z.string() });
    const mockHass = {
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({ advice: 'water more' }),
      },
    } as any;
    setHass(mockHass);

    const result = await callServiceReturning(
      'growspace_manager',
      'ask_grow_advice',
      { growspace_id: 'gs1' },
      schema
    );

    expect(result).toEqual({ advice: 'water more' });
    expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'growspace_manager',
      service: 'ask_grow_advice',
      service_data: { growspace_id: 'gs1' },
      return_response: true,
    });
  });

  it('wraps sendMessagePromise rejection (Error) as WSError', async () => {
    const schema = z.object({ advice: z.string() });
    const mockHass = {
      connection: {
        sendMessagePromise: vi.fn().mockRejectedValue(new Error('timeout')),
      },
    } as any;
    setHass(mockHass);

    await expect(
      callServiceReturning('growspace_manager', 'ask_grow_advice', {}, schema)
    ).rejects.toMatchObject({ name: 'WSError', code: 'internal_error', message: 'timeout' });
  });

  it('wraps sendMessagePromise rejection (non-Error) as WSError', async () => {
    const schema = z.object({ advice: z.string() });
    const mockHass = {
      connection: {
        // eslint-disable-next-line prefer-promise-reject-errors
        sendMessagePromise: vi.fn().mockRejectedValue('raw rejection'),
      },
    } as any;
    setHass(mockHass);

    await expect(
      callServiceReturning('growspace_manager', 'ask_grow_advice', {}, schema)
    ).rejects.toMatchObject({ name: 'WSError', code: 'internal_error' });
  });

  it('throws WSError when response does not match schema', async () => {
    const schema = z.object({ advice: z.string() });
    const mockHass = {
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({ wrong: 42 }),
      },
    } as any;
    setHass(mockHass);

    await expect(
      callServiceReturning('growspace_manager', 'ask_grow_advice', {}, schema)
    ).rejects.toMatchObject({ name: 'WSError', code: 'internal_error' });
  });

  it('throws WSError when hass is not set', async () => {
    const schema = z.object({});
    await expect(
      callServiceReturning('growspace_manager', 'ask_grow_advice', {}, schema)
    ).rejects.toThrow(WSError);
  });
});
