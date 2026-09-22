import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hassCall } from '../../services/hass-call';
import {
  cultureLines$,
  discardCulture,
  draftReplate,
  fetchMaintenanceHistory,
  graduateCulture,
  locationOptions,
  moveCultureToRooting,
  noteOnCulture,
  recordMaintenance,
  replateCulture,
  resetTcPresence,
  worklistEntries,
  WS_TC_DISCARD,
  WS_TC_GRADUATE,
  WS_TC_MAINTENANCE_HISTORY,
  WS_TC_MOVE_TO_ROOTING,
  WS_TC_NOTE,
  WS_TC_REPLATE,
  type Culture,
  type CultureLine,
  type MaintenanceAction,
} from './index';
import {
  CultureLineSchema,
  CultureSchema,
  MaintenanceActionSchema,
  MaintenanceHistoryResponseSchema,
} from './schema';
import maintenanceFixture from '../../../tests/fixtures/contract/tc_maintenance_response.json';

vi.mock('../../services/hass-call', () => ({
  hassCall: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const aCulture = (overrides: Record<string, unknown> = {}): Culture =>
  CultureSchema.parse({
    id: 'culture-1',
    line_id: 'line-1',
    stage: 'multiplication',
    status: 'active',
    started_at: '2026-01-04T09:12:00+00:00',
    last_replated_at: '2026-01-04T09:12:00+00:00',
    plantlet_count: 6,
    location: 'Shelf A',
    replate_due_at: '2026-02-03T09:12:00+00:00',
    ...overrides,
  });

const aLine = (overrides: Record<string, unknown> = {}): CultureLine =>
  CultureLineSchema.parse({
    id: 'line-1',
    phenotype: {
      id: 'Blue Dream|Pheno 2',
      name_snapshot: 'Blue Dream — Pheno 2',
      snapshot_at: '2026-01-04T09:12:00+00:00',
    },
    replate_interval_days: { multiplication: 30, rooting: 21 },
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-01-04T09:12:00+00:00',
    archived_at: null,
    cultures: [aCulture()],
    ...overrides,
  });

const anAction = (overrides: Record<string, unknown> = {}): MaintenanceAction =>
  MaintenanceActionSchema.parse({
    id: 'action-1',
    culture_id: 'culture-1',
    line_id: 'line-1',
    action: 'note',
    recorded_at: '2026-02-03T09:20:00+00:00',
    note: 'Looking good.',
    medium_id: null,
    medium_version: null,
    vessels: [],
    reason: null,
    stage: null,
    ...overrides,
  });

/** A local instant on the given day, so day arithmetic is not timezone bait. */
const onDay = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day, 12, 0, 0);

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
});

describe('the five acts', () => {
  it('sends a replate with its medium pin and its vessels', async () => {
    const replated = aLine({ cultures: [aCulture({ plantlet_count: 5 })] });
    hassCallMock.mockResolvedValue({ line: replated, action: anAction({ action: 'replate' }) });

    const action = await replateCulture('culture-1', {
      medium_id: 'medium-1',
      medium_version: 2,
      vessels: [{ plantlet_count: 5, location: 'Shelf A' }],
      note: 'Divided.',
    });

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_REPLATE,
      {
        culture_id: 'culture-1',
        medium_id: 'medium-1',
        medium_version: 2,
        vessels: [{ plantlet_count: 5, location: 'Shelf A' }],
        note: 'Divided.',
      },
      expect.anything()
    );
    expect(action.action).toBe('replate');
  });

  it('updates the board from the reply rather than re-listing', async () => {
    cultureLines$.set([aLine()]);
    const divided = aLine({
      cultures: [aCulture(), aCulture({ id: 'culture-2', location: 'Shelf B' })],
    });
    hassCallMock.mockResolvedValue({ line: divided, action: anAction({ action: 'replate' }) });

    await replateCulture('culture-1', {
      medium_id: 'medium-1',
      medium_version: 1,
      vessels: [{ plantlet_count: null, location: '' }],
      note: '',
    });

    expect(hassCallMock).toHaveBeenCalledTimes(1);
    expect(cultureLines$.get()[0].cultures).toHaveLength(2);
  });

  it.each([
    ['discard', WS_TC_DISCARD, () => discardCulture('culture-1', 'contamination', 'Haze.')],
    ['note', WS_TC_NOTE, () => noteOnCulture('culture-1', 'Looking good.')],
    ['move_to_rooting', WS_TC_MOVE_TO_ROOTING, () => moveCultureToRooting('culture-1')],
    ['graduate', WS_TC_GRADUATE, () => graduateCulture('culture-1', 'Dome.')],
  ])('sends %s to its own command', async (_name, command, call) => {
    hassCallMock.mockResolvedValue({ line: aLine(), action: anAction() });

    await call();

    expect(hassCallMock).toHaveBeenCalledWith(
      command,
      expect.objectContaining({ culture_id: 'culture-1' }),
      expect.anything()
    );
  });

  it('sends a discard with the reason the grower chose', async () => {
    hassCallMock.mockResolvedValue({ line: aLine(), action: anAction({ action: 'discard' }) });

    await discardCulture('culture-1', 'spent');

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_DISCARD,
      { culture_id: 'culture-1', reason: 'spent', note: '' },
      expect.anything()
    );
  });

  it('routes a request union to the command that act belongs to', async () => {
    hassCallMock.mockResolvedValue({ line: aLine(), action: anAction() });

    await recordMaintenance({ action: 'graduate', cultureId: 'culture-1', note: '' });

    expect(hassCallMock).toHaveBeenCalledWith(WS_TC_GRADUATE, expect.anything(), expect.anything());
  });

  it('leaves the board alone when an act fails', async () => {
    cultureLines$.set([aLine()]);
    hassCallMock.mockRejectedValue(new Error('That culture has already been discarded.'));

    await expect(graduateCulture('culture-1')).rejects.toThrow('already been discarded');
    expect(cultureLines$.get()[0].cultures).toHaveLength(1);
  });
});

describe('fetchMaintenanceHistory', () => {
  it('asks for one vessel, one lineage, or everything', async () => {
    hassCallMock.mockResolvedValue({ actions: [anAction()] });

    await fetchMaintenanceHistory({ cultureId: 'culture-1' });
    await fetchMaintenanceHistory({ lineId: 'line-1' });
    await fetchMaintenanceHistory();

    expect(hassCallMock.mock.calls.map((call) => call[1])).toEqual([
      { culture_id: 'culture-1' },
      { line_id: 'line-1' },
      {},
    ]);
    expect(hassCallMock.mock.calls[0][0]).toBe(WS_TC_MAINTENANCE_HISTORY);
  });

  it('does not publish the history to an atom', async () => {
    cultureLines$.set([aLine()]);
    hassCallMock.mockResolvedValue({ actions: [anAction()] });

    const actions = await fetchMaintenanceHistory();

    expect(actions).toHaveLength(1);
    expect(cultureLines$.get()).toEqual([aLine()]);
  });
});

describe('worklistEntries', () => {
  const dueOn = (iso: string, overrides: Record<string, unknown> = {}) =>
    aLine({ cultures: [aCulture({ replate_due_at: iso, ...overrides })] });

  it('calls a vessel overdue only once its due day has gone', () => {
    const line = dueOn('2026-02-03T09:12:00');

    expect(worklistEntries([line], onDay(2026, 2, 2))[0].urgency).toBe('scheduled');
    expect(worklistEntries([line], onDay(2026, 2, 3))[0].urgency).toBe('due');
    expect(worklistEntries([line], onDay(2026, 2, 4))[0].urgency).toBe('overdue');
  });

  it('is due at 08:00 on the morning it is due at 09:00', () => {
    const line = dueOn('2026-02-03T09:12:00');

    const [entry] = worklistEntries([line], new Date(2026, 1, 3, 8, 0, 0));

    expect(entry.urgency).toBe('due');
    expect(entry.daysUntilDue).toBe(0);
  });

  it('counts whole days, negative when overdue', () => {
    const line = dueOn('2026-02-03T09:12:00');

    expect(worklistEntries([line], onDay(2026, 2, 13))[0].daysUntilDue).toBe(-10);
    expect(worklistEntries([line], onDay(2026, 1, 27))[0].daysUntilDue).toBe(7);
  });

  it('puts the longest-overdue vessel first', () => {
    const late = dueOn('2026-01-04T09:12:00');
    const soon = aLine({
      id: 'line-2',
      cultures: [aCulture({ id: 'culture-2', replate_due_at: '2026-03-04T09:12:00' })],
    });

    const entries = worklistEntries([soon, late], onDay(2026, 2, 3));

    expect(entries.map((entry) => entry.culture.id)).toEqual(['culture-1', 'culture-2']);
  });

  it('leaves out archived lines and vessels with no due date', () => {
    const archived = dueOn('2026-01-04T09:12:00', {});
    const ended = aLine({
      id: 'line-2',
      cultures: [aCulture({ id: 'culture-2', status: 'discarded', replate_due_at: null })],
    });

    const entries = worklistEntries(
      [{ ...archived, archived_at: '2026-02-01T00:00:00+00:00' }, ended],
      onDay(2026, 2, 3)
    );

    expect(entries).toEqual([]);
  });

  it('leaves out a due date it cannot read rather than guessing one', () => {
    expect(worklistEntries([dueOn('whenever')], onDay(2026, 2, 3))).toEqual([]);
  });
});

describe('locationOptions', () => {
  it('offers the shelves the grower has actually typed, once each', () => {
    const line = aLine({
      cultures: [
        aCulture({ location: 'Shelf B' }),
        aCulture({ id: 'c2', location: 'shelf b' }),
        aCulture({ id: 'c3', location: 'Shelf A' }),
        aCulture({ id: 'c4', location: '  ' }),
      ],
    });

    expect(locationOptions([line])).toEqual(['Shelf A', 'Shelf B']);
  });
});

describe('draftReplate', () => {
  it('starts from this vessel, where it is, on the first medium offered', () => {
    const medium = { id: 'medium-1', current_version: 3 } as never;

    expect(draftReplate(aCulture(), medium)).toEqual({
      medium_id: 'medium-1',
      medium_version: 3,
      vessels: [{ plantlet_count: 6, location: 'Shelf A' }],
      note: '',
    });
  });

  it('has no medium to pin when the library is empty', () => {
    expect(draftReplate(aCulture()).medium_id).toBe('');
  });
});

describe('graduation bridge', () => {
  it('passes the opt-in plant to TC and retains the returned link', async () => {
    const plant = {
      growspace_id: 'tent',
      strain: 'Blue Dream',
      phenotype: 'Pheno 2',
      row: 1,
      col: 2,
    };
    hassCallMock.mockResolvedValue({
      line: aLine(),
      action: anAction({ action: 'graduate', plant_id: 'plant-1' }),
    });
    const action = await recordMaintenance({
      action: 'graduate',
      cultureId: 'culture-1',
      note: '',
      plant,
    });
    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_GRADUATE,
      { culture_id: 'culture-1', note: '', plant },
      expect.anything()
    );
    expect(action.plant_id).toBe('plant-1');
  });
  it('accepts older records without a plant field', () => {
    const legacy = { ...anAction() };
    Reflect.deleteProperty(legacy, 'plant_id');
    expect(MaintenanceActionSchema.parse(legacy).plant_id).toBeNull();
  });
  it('publishes the completed culture when plant creation fails', async () => {
    cultureLines$.set([aLine()]);
    const ended = aLine({ cultures: [aCulture({ status: 'graduated' })] });
    hassCallMock.mockResolvedValue({ line: ended, action: anAction({ action: 'graduate' }) });
    const action = await graduateCulture('culture-1', '', {
      growspace_id: 'tent',
      strain: 'Blue Dream',
      phenotype: '',
      row: 1,
      col: 1,
    });
    expect(action.plant_id).toBeNull();
    expect(cultureLines$.get()[0].cultures[0].status).toBe('graduated');
  });
});

it('parses the TC producer fixture with its linked graduation', () => {
  const { actions } = MaintenanceHistoryResponseSchema.parse(maintenanceFixture);
  expect(actions.find((action) => action.action === 'graduate')?.plant_id).toBe('gm-plant-1');
});
