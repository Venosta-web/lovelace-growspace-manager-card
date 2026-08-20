import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { composeEnvironmentConfig } from './environment-save';
import { environmentPatchToServiceData } from './environment-service-mapping';
import { expandAtomicGroups, type EnvironmentDraftKey } from './environment-persistence';
import { createInitialSM } from '../../dialogs/config-dialog-sm';

vi.mock('../../services/hass-call', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, callService: vi.fn().mockResolvedValue(undefined) };
});

import { callService } from '../../services/hass-call';
import { configureEnvironment } from '../../slices/growspace';

function dirty(...keys: EnvironmentDraftKey[]): ReadonlySet<EnvironmentDraftKey> {
  return expandAtomicGroups(keys);
}

/** The wire payload for a draft where only `keys` were edited. */
async function wirePayload(
  mutate: (draft: ReturnType<typeof createInitialSM>['environmentDraft']) => void,
  ...keys: EnvironmentDraftKey[]
): Promise<Record<string, unknown>> {
  const d = createInitialSM().environmentDraft;
  d.selectedGrowspaceId = 'growspace_1';
  mutate(d);
  await configureEnvironment(
    environmentPatchToServiceData(composeEnvironmentConfig(d, dirty(...keys)))
  );
  const calls = vi.mocked(callService).mock.calls;
  return calls[calls.length - 1][2] as Record<string, unknown>;
}

describe('card → configure_environment mapping', () => {
  beforeEach(() => vi.mocked(callService).mockClear());
  afterEach(() => vi.clearAllMocks());

  it('sends one edited field and omits every untouched one', async () => {
    const payload = await wirePayload((d) => {
      d.temperatureSensors = ['sensor.temp'];
      // Seeded from the device but untouched — must not reach the wire, or the
      // backend would treat it as a deliberate re-set.
      d.feedEcSensors = ['sensor.feed_ec'];
      d.growlightEntities = ['switch.grow'];
    }, 'temperatureSensors');

    expect(payload).toEqual({
      growspace_id: 'growspace_1',
      temperature_sensors: ['sensor.temp'],
    });
  });

  it('preserves an unrelated stored field across an edit of another field', async () => {
    const payload = await wirePayload((d) => {
      d.phSensors = ['sensor.ph'];
      d.irrigationTanks = [
        { sensorEntity: 'sensor.tank', name: 'T', volumeLiters: 50, warningLevel: 20 },
      ];
    }, 'phSensors');

    expect('irrigation_tanks' in payload).toBe(false);
    expect(payload.ph_sensors).toEqual(['sensor.ph']);
  });

  it('carries a deliberate clear of a list field', async () => {
    const payload = await wirePayload((d) => {
      d.phSensors = [];
    }, 'phSensors');

    expect(payload.ph_sensors).toEqual([]);
  });

  it('maps a cleared entity picker to an explicit null', async () => {
    const payload = await wirePayload((d) => {
      d.co2Sensor = '';
    }, 'co2Sensor');

    expect(payload.co2_sensor).toBeNull();
  });

  it('never sends the immediate-persist control flags', async () => {
    const payload = await wirePayload((d) => {
      d.humidifierControlEnabled = true;
      d.temperatureSensors = ['sensor.temp'];
    }, 'humidifierControlEnabled', 'temperatureSensors');

    expect('control_humidifier' in payload).toBe(false);
    expect('control_dehumidifier' in payload).toBe(false);
  });

  it('sends both moisture bounds when one was edited', async () => {
    const payload = await wirePayload((d) => {
      d.soilMoistureMin = 0;
      d.soilMoistureMax = 45;
    }, 'soilMoistureMin');

    expect(payload.soil_moisture_min).toBe(0);
    expect(payload.soil_moisture_max).toBe(45);
  });

  it('keeps a zero threshold that the old truthiness gate dropped', async () => {
    const payload = await wirePayload((d) => {
      d.stressThreshold = 0;
    }, 'stressThreshold');

    expect(payload.stress_threshold).toBe(0);
  });
});
