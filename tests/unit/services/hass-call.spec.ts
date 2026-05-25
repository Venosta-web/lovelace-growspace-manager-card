import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { hassCall, setHass } from '../../../src/services/hass-call';
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
