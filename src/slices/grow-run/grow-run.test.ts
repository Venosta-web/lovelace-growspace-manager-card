import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';

import { hassCall } from '../../services/hass-call';
import { deriveRunView, getGrowRun, listGrowRuns, resolveActiveRunSensor } from './index';
import { finalizeGrowRun, previewGrowRunFinalization } from './finalization';
import {
  FinalizeGrowRunResultSchema,
  PreviewFinalizationResultSchema,
} from './finalization-schema';
import { ActiveRunSensorSchema, GetGrowRunResultSchema, ListGrowRunsResultSchema } from './schema';
import { conflictText, localToday, previewGrowRunStart, refusalText, startGrowRun } from './start';
import { PreviewGrowRunStartResultSchema, StartGrowRunResultSchema } from './start-schema';

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

/**
 * `grow_run_start_preview_v1` and `grow_run_beyond_retention_v1` (GSM#670),
 * with the day lists shortened: a start that may claim, and one in conflict.
 */
const PREVIEW_FIXTURE = {
  outcome: 'preview',
  preview: {
    claimed_days: [
      {
        date: '2026-08-01',
        entries: 0,
        exits: 0,
        plant_ids: ['p1'],
      },
      {
        date: '2026-08-02',
        entries: 0,
        exits: 0,
        plant_ids: ['p1'],
      },
    ],
    claimed_facts: [
      {
        at: '2026-08-03T06:00:00+00:00',
        fact_id: 'f-entry',
        kind: 'entry',
        plant_id: 'p2',
        projected: true,
        source_growspace_id: null,
        source_run_id: null,
        target_growspace_id: 'tent',
        target_run_id: null,
      },
      {
        at: '2026-08-04T06:00:00+00:00',
        fact_id: 'f-out',
        kind: 'transplant',
        plant_id: 'p1',
        projected: true,
        source_growspace_id: 'tent',
        source_run_id: null,
        target_growspace_id: 'veg',
        target_run_id: null,
      },
      {
        at: '2026-08-06T06:00:00+00:00',
        fact_id: 'f-back',
        kind: 'transplant',
        plant_id: 'p1',
        projected: true,
        source_growspace_id: 'veg',
        source_run_id: null,
        target_growspace_id: 'tent',
        target_run_id: null,
      },
      {
        at: '2026-08-07T06:00:00+00:00',
        fact_id: 'f-move',
        kind: 'move',
        plant_id: 'p2',
        projected: true,
        source_growspace_id: 'tent',
        source_run_id: null,
        target_growspace_id: 'tent',
        target_run_id: null,
      },
    ],
    conflict: null,
    covered_from: '2026-08-01T07:00:00+00:00',
    covered_since: '2026-08-01T07:00:00+00:00',
    gaps: [
      {
        end: '2026-08-01T07:00:00+00:00',
        reason: 'before_recording',
        start: '2026-07-30T22:00:00+00:00',
      },
    ],
    participant_count: 2,
    participations: [
      {
        closed_at: '2026-08-04T06:00:00+00:00',
        name: 'OG Kush',
        opened_at: '2026-08-01T07:00:00+00:00',
        plant_id: 'p1',
      },
      {
        closed_at: null,
        name: 'Gelato',
        opened_at: '2026-08-03T06:00:00+00:00',
        plant_id: 'p2',
      },
      {
        closed_at: null,
        name: 'OG Kush',
        opened_at: '2026-08-06T06:00:00+00:00',
        plant_id: 'p1',
      },
    ],
    retention_days: 365,
    retention_horizon: '2025-08-10T10:00:00+00:00',
    run_revision: 2,
    started_at: '2026-07-30T22:00:00+00:00',
    started_on: '2026-07-31',
    timezone: 'Europe/Berlin',
  },
};
const PREVIEW_CONFLICT_FIXTURE = {
  outcome: 'preview',
  preview: {
    claimed_days: [
      {
        date: '2026-08-03',
        entries: 1,
        exits: 0,
        plant_ids: ['p1', 'p2'],
      },
    ],
    claimed_facts: [
      {
        at: '2026-08-03T06:00:00+00:00',
        fact_id: 'f-entry',
        kind: 'entry',
        plant_id: 'p2',
        projected: true,
        source_growspace_id: null,
        source_run_id: null,
        target_growspace_id: 'tent',
        target_run_id: null,
      },
    ],
    conflict: {
      boundary: '2026-08-03T10:00:00+00:00',
      code: 'grow_run.beyond_retention',
      message:
        'Activity that old is no longer kept, so nothing can be claimed for it; record that history as an Imported Run instead',
    },
    covered_from: '2026-08-02T22:00:00+00:00',
    covered_since: '2026-08-01T07:00:00+00:00',
    gaps: [],
    participant_count: 2,
    participations: [
      {
        closed_at: '2026-08-04T06:00:00+00:00',
        name: 'OG Kush',
        opened_at: '2026-08-02T22:00:00+00:00',
        plant_id: 'p1',
      },
      {
        closed_at: null,
        name: 'Gelato',
        opened_at: '2026-08-03T06:00:00+00:00',
        plant_id: 'p2',
      },
      {
        closed_at: null,
        name: 'OG Kush',
        opened_at: '2026-08-06T06:00:00+00:00',
        plant_id: 'p1',
      },
    ],
    retention_days: 7,
    retention_horizon: '2026-08-03T10:00:00+00:00',
    run_revision: 2,
    started_at: '2026-08-02T22:00:00+00:00',
    started_on: '2026-08-03',
    timezone: 'Europe/Berlin',
  },
};
const BEYOND_RETENTION_FIXTURE = {
  outcome: 'refused',
  refusal: {
    active_run: null,
    code: 'grow_run.beyond_retention',
    current_revision: 2,
    message:
      'Activity that old is no longer kept, so nothing can be claimed for it; record that history as an Imported Run instead',
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
    expect(StartGrowRunResultSchema.safeParse(BEYOND_RETENTION_FIXTURE).success).toBe(true);
    expect(PreviewGrowRunStartResultSchema.safeParse(PREVIEW_FIXTURE).success).toBe(true);
    expect(PreviewGrowRunStartResultSchema.safeParse(PREVIEW_CONFLICT_FIXTURE).success).toBe(true);
  });

  it('refuses a preview day that is not an ISO date', () => {
    const preview = { ...PREVIEW_FIXTURE.preview, started_on: '31/07/2026' };
    expect(PreviewGrowRunStartResultSchema.safeParse({ outcome: 'preview', preview }).success).toBe(
      false
    );
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

describe('getGrowRun', () => {
  it('reads a selected Run and parses Participants and movements', async () => {
    const response = {
      outcome: 'found' as const,
      run: {
        ...STARTED_FIXTURE.active_run,
        participations: [
          { plant_id: 'p1', opened_at: '2026-07-24T20:30:00+00:00', closed_at: null },
        ],
        movement_history: [
          {
            fact_id: 'fact-1',
            plant_id: 'p1',
            at: '2026-07-25T20:30:00+00:00',
            kind: 'entry',
            source_growspace_id: null,
            target_growspace_id: 'flower',
            source_run_id: null,
            target_run_id: 'run-1',
            projected: true,
          },
        ],
        harvest_outcomes: [
          {
            plant_id: 'p1',
            strain: 'OG Kush',
            phenotype: 'A',
            source_growspace_id: 'flower',
            state: 'pending',
            reason: null,
            metrics: { dry_weight: null },
            quality_score: null,
            entered_dry_at: '2026-09-25T20:30:00+00:00',
          },
        ],
        tags: ['organic'],
        goals: null,
        audit: [
          {
            at: '2026-07-24T20:30:00+00:00',
            command: 'start',
            command_id: 'cmd-1',
            actor_user_id: 'user-1',
            prior_revision: 0,
            resulting_revision: 1,
            changed_fields: [],
            reason: null,
          },
        ],
        snapshot: null,
        superseded_snapshots: [],
      },
    };
    expect(GetGrowRunResultSchema.parse(response)).toEqual(response);
    vi.mocked(hassCall).mockResolvedValue(response);
    await expect(getGrowRun('flower', 'run-1')).resolves.toEqual(response);
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_grow_run',
      { growspace_id: 'flower', run_id: 'run-1' },
      GetGrowRunResultSchema
    );
  });
});

describe('finalizing (GSM#673)', () => {
  it("lists a growspace's Runs", async () => {
    vi.mocked(hassCall).mockResolvedValue({ outcome: 'listed', run_revision: 0, runs: [] });
    await listGrowRuns('flower');
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/list_grow_runs',
      { growspace_id: 'flower' },
      ListGrowRunsResultSchema
    );
  });

  it('previews, then sends only the warnings the backend knows', async () => {
    vi.mocked(hassCall).mockResolvedValue({ outcome: 'refused' });
    await previewGrowRunFinalization('flower', 'run-3');
    expect(hassCall).toHaveBeenLastCalledWith(
      'growspace_manager/preview_grow_run_finalization',
      { growspace_id: 'flower', run_id: 'run-3' },
      PreviewFinalizationResultSchema
    );
    await finalizeGrowRun('flower', 'run-3', 7, ['incomplete_snapshot', 'energy_gap']);
    expect(hassCall).toHaveBeenLastCalledWith(
      'growspace_manager/finalize_grow_run',
      {
        growspace_id: 'flower',
        run_id: 'run-3',
        expected_run_revision: 7,
        acknowledged_warnings: ['incomplete_snapshot'],
      },
      FinalizeGrowRunResultSchema
    );
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

describe('starting on an earlier day', () => {
  beforeEach(() => {
    vi.mocked(hassCall).mockReset();
  });

  it('previews the day and nothing else', async () => {
    vi.mocked(hassCall).mockResolvedValue(PREVIEW_FIXTURE);
    await expect(previewGrowRunStart('flower', '2026-07-31')).resolves.toEqual(PREVIEW_FIXTURE);
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/preview_grow_run_start',
      { growspace_id: 'flower', started_on: '2026-07-31' },
      PreviewGrowRunStartResultSchema
    );
  });

  it('refuses a malformed day before sending it', () => {
    expect(() => previewGrowRunStart('flower', 'yesterday')).toThrow();
    expect(() => startGrowRun('flower', 0, { startedOn: '2026-7-31' })).toThrow();
    expect(hassCall).not.toHaveBeenCalled();
  });

  it('sends the day with the start', async () => {
    vi.mocked(hassCall).mockResolvedValue(STARTED_FIXTURE);
    await startGrowRun('flower', 3, { startedOn: '2026-07-31' });
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/start_grow_run',
      { growspace_id: 'flower', expected_run_revision: 3, started_on: '2026-07-31' },
      StartGrowRunResultSchema
    );
  });

  it("reads today where the Run Timezone is, and falls back to the browser's", () => {
    const moment = new Date('2026-08-01T02:30:00Z');
    expect(localToday('Europe/Berlin', moment)).toBe('2026-08-01');
    expect(localToday('America/Los_Angeles', moment)).toBe('2026-07-31');
    expect(localToday('Mars/Olympus', moment)).toBe(localToday(undefined, moment));
  });

  it('says a conflicting boundary the way the confirmation would be refused', () => {
    const conflict = PREVIEW_CONFLICT_FIXTURE.preview.conflict!;
    expect(conflictText(conflict)).toMatch(/imported run/);
    expect(refusalText(BEYOND_RETENTION_FIXTURE.refusal)).toBe(conflictText(conflict));
    expect(conflictText({ ...conflict, code: 'grow_run.boundary_conflict' })).toMatch(
      /in the future, or before another run/
    );
    // Without the Run's number, an active run is described in the backend's words.
    expect(
      conflictText({ code: 'grow_run.already_active', message: 'Run #2 is active', boundary: null })
    ).toBe('Refused: Run #2 is active');
  });
});
