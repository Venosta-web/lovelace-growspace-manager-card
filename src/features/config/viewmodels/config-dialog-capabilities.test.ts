import { describe, expect, it } from 'vitest';
import { deriveConfigDialogCapabilities } from './config-dialog-capabilities';

describe('deriveConfigDialogCapabilities', () => {
  it.each([
    {
      name: 'growspace is not selected',
      selectedGrowspaceId: '',
      temperatureSensors: ['sensor.temperature'],
      humiditySensors: ['sensor.humidity'],
      reason: 'growspace',
    },
    {
      name: 'both required sensor types are missing',
      selectedGrowspaceId: 'gs1',
      temperatureSensors: [],
      humiditySensors: [],
      reason: 'temperature-and-humidity',
    },
    {
      name: 'temperature sensor is missing',
      selectedGrowspaceId: 'gs1',
      temperatureSensors: [],
      humiditySensors: ['sensor.humidity'],
      reason: 'temperature',
    },
    {
      name: 'humidity sensor is missing',
      selectedGrowspaceId: 'gs1',
      temperatureSensors: ['sensor.temperature'],
      humiditySensors: [],
      reason: 'humidity',
    },
  ])('blocks saving when $name', (draft) => {
    expect(deriveConfigDialogCapabilities(draft)).toEqual({
      canSaveEnvironment: false,
      environmentSaveBlockReason: draft.reason,
    });
  });

  it('allows saving when a growspace and both sensor types are assigned', () => {
    expect(
      deriveConfigDialogCapabilities({
        selectedGrowspaceId: 'gs1',
        temperatureSensors: ['sensor.temperature'],
        humiditySensors: ['sensor.humidity'],
      })
    ).toEqual({ canSaveEnvironment: true, environmentSaveBlockReason: null });
  });
});
