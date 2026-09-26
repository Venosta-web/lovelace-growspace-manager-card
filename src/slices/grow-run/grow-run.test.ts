import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';

import { hassCall } from '../../services/hass-call';
import { deriveRunView, refusalText, resolveActiveRunSensor, startGrowRun } from './index';
import { ActiveRunSensorSchema, StartGrowRunResultSchema } from './schema';

vi.mock('../../services/hass-call', () => ({
  hassCall: vi.fn(),
}));

/** GSM's contract fixtures, `tests/fixtures/contract/*_v1.json` (GSM#668). */
const SENSOR_FIXTURE = {
  active: {
    attributes: {
      duration_days: 61,
      label: 'Autumn',
      participant_count: 2,
      run_id: 'run-1',
      run_revision: 4,
      started_at: '2026-07-24T20:30:00+00:00',
    },
    state: '4',
  },
  none: {
    attributes: {
      duration_days: null,
      label: null,
      participant_count: null,
      run_id: null,
      run_revision: 3,
      started_at: null,
    },
    state: 'none',
  },
};
const STARTED_FIXTURE = {
  active_run: {
    label: 'Autumn',
    participant_count: 2,
    run_id: 'run-1',
    run_revision: 4,
    sequence_number: 4,
    started_at: '2026-07-24T20:30:00+00:00',
    timezone: 'Europe/Berlin',
  },
  outcome: 'started',
  run_revision: 4,
};
const REFUSED_FIXTURE = {
  outcome: 'refused',
  refusal: {
    active_run: {
      label: 'Autumn',
      participant_count: 2,
      run_id: 'run-1',
      run_revision: 4,
      sequence_number: 4,
      started_at: '2026-07-24T20:30:00+00:00',
      timezone: 'Europe/Berlin',
    },
    code: 'grow_run.revision_conflict',
    current_revision: 4,
    message: 'The Run Revision is 4, not 3; reload and decide again',
  },
};

type SensorState = { state: string; attributes: Record<string, unknown> };

function hassWith(sensor: SensorState | undefined, extra: Record<string, unknown> = {}) {
  return {
    language: 'en',
    states: sensor
      ? {
          'sensor.flower_active_run': {
            ...sensor,
            attributes: { ...sensor.attributes, friendly_name: 'Flower Active Run' },
          },
        }
      : {},
    entities: {
      'sensor.flower_active_run': {
        platform: 'growspace_manager',
        device_id: 'dev-flower',
        translation_key: 'active_run',
      },
      'sensor.flower_reliability': {
        platform: 'growspace_manager',
        device_id: 'dev-flower',
        translation_key: 'reliability',
      },
    },
    devices: { 'dev-flower': { identifiers: [['growspace_manager', 'flower']] } },
    ...extra,
  } as unknown as HomeAssistant;
}

describe('the contract', () => {
  it('parses every GSM fixture', () => {
    expect(ActiveRunSensorSchema.safeParse(SENSOR_FIXTURE.active).success).toBe(true);
    expect(ActiveRunSensorSchema.safeParse(SENSOR_FIXTURE.none).success).toBe(true);
    expect(StartGrowRunResultSchema.safeParse(STARTED_FIXTURE).success).toBe(true);
    expect(StartGrowRunResultSchema.safeParse(REFUSED_FIXTURE).success).toBe(true);
  });

  it('refuses a state that is neither a sequence number nor none', () => {
    for (const state of ['0', '-1', '1.5', 'unknown', 'unavailable']) {
      expect(ActiveRunSensorSchema.safeParse({ ...SENSOR_FIXTURE.none, state }).success).toBe(
        false
      );
    }
  });
});

describe('resolveActiveRunSensor', () => {
  it('finds the sensor by translation key and growspace device', () => {
    expect(resolveActiveRunSensor('flower', hassWith(SENSOR_FIXTURE.none))).toBe(
      'sensor.flower_active_run'
    );
  });

  it('is null for another growspace, without registries, or without a growspace', () => {
    expect(resolveActiveRunSensor('veg', hassWith(SENSOR_FIXTURE.none))).toBeNull();
    expect(resolveActiveRunSensor('flower', { states: {} } as unknown as HomeAssistant)).toBeNull();
    expect(resolveActiveRunSensor('', hassWith(SENSOR_FIXTURE.none))).toBeNull();
  });

  it('answers a repeated question from the memo', () => {
    const hass = hassWith(SENSOR_FIXTURE.none);
    expect(resolveActiveRunSensor('veg', hass)).toBeNull();
    expect(resolveActiveRunSensor('veg', hass)).toBeNull();
    expect(resolveActiveRunSensor('flower', hass)).toBe('sensor.flower_active_run');
    expect(resolveActiveRunSensor('flower', hass)).toBe('sensor.flower_active_run');
  });
});

describe('deriveRunView', () => {
  it('summarises the Active Run compactly', () => {
    const view = deriveRunView('flower', hassWith(SENSOR_FIXTURE.active))!;
    expect(view.state).toBe('active');
    expect(view.sequenceNumber).toBe(4);
    expect(view.runRevision).toBe(4);
    expect(view.summary).toBe('Run #4 · Autumn · 61 days · 2 plants');
  });

  it('counts one day and one plant in the singular, and names an unlabelled run by number', () => {
    const one = {
      state: '2',
      attributes: {
        ...SENSOR_FIXTURE.active.attributes,
        label: null,
        duration_days: 1,
        participant_count: 1,
      },
    };
    expect(deriveRunView('flower', hassWith(one))!.summary).toBe('Run #2 · 1 day · 1 plant');
  });

  it('offers a start without an Active Run, carrying the revision it must name', () => {
    const view = deriveRunView('flower', hassWith(SENSOR_FIXTURE.none))!;
    expect(view.state).toBe('none');
    expect(view.runRevision).toBe(3);
    expect(view.summary).toBe('Start run');
  });

  it('never reads an unreadable sensor as "no run"', () => {
    const view = deriveRunView('flower', hassWith({ state: 'unavailable', attributes: {} }))!;
    expect(view.state).toBe('unavailable');
    expect(view.runRevision).toBeNull();
    expect(deriveRunView('flower', hassWith(undefined))!.state).toBe('unavailable');
  });

  it('is null when the backend has no Active Run Sensor', () => {
    expect(deriveRunView('veg', hassWith(SENSOR_FIXTURE.none))).toBeNull();
    expect(deriveRunView('flower', undefined)).toBeNull();
  });
});

describe('startGrowRun', () => {
  beforeEach(() => {
    vi.mocked(hassCall).mockReset();
  });

  it('names the revision it decided on and sends only what the grower wrote', async () => {
    vi.mocked(hassCall).mockResolvedValue(STARTED_FIXTURE);
    await expect(startGrowRun('flower', 3, { label: ' Autumn ', goals: '  ' })).resolves.toEqual(
      STARTED_FIXTURE
    );
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_grow_run',
      { growspace_id: 'flower', expected_run_revision: 3, label: 'Autumn' },
      StartGrowRunResultSchema
    );
  });

  it('refuses a name longer than the backend accepts before sending it', () => {
    expect(() => startGrowRun('flower', 0, { label: 'x'.repeat(81) })).toThrow();
    expect(hassCall).not.toHaveBeenCalled();
  });
});

describe('refusalText', () => {
  it('says each known refusal in words', () => {
    const refusal = REFUSED_FIXTURE.refusal;
    expect(refusalText(refusal)).toMatch(/changed while the dialog was open/);
    expect(refusalText({ ...refusal, code: 'grow_run.already_active' })).toBe(
      'Run #4 is already active in this growspace.'
    );
    expect(refusalText({ ...refusal, code: 'grow_run.not_authorized' })).toMatch(/permission/);
    expect(refusalText({ ...refusal, code: 'grow_run.store_unreadable' })).toMatch(
      /cannot be read/
    );
  });

  it("shows an unknown refusal in the backend's own words", () => {
    expect(
      refusalText({
        code: 'grow_run.something_new',
        message: 'Try later',
        current_revision: 1,
        active_run: null,
      })
    ).toBe('Refused: Try later');
  });
});
