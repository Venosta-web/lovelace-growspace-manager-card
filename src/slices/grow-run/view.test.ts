import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hassCall } from '../../services/hass-call';
import comparisonFixture from '../../../tests/fixtures/contract/grow_run_comparison_v1.json';
import comparisonRefusedFixture from '../../../tests/fixtures/contract/grow_run_comparison_refused_v1.json';
import activeDetailsFixture from '../../../tests/fixtures/contract/grow_run_details_v1.json';
import completedDetailsFixture from '../../../tests/fixtures/contract/grow_run_completed_details_v1.json';
import finalizedDetailsFixture from '../../../tests/fixtures/contract/grow_run_finalized_details_v1.json';
import { GetGrowRunResultSchema } from './details-schema';
import { compareGrowRuns, getGrowRun } from './view';
import { CompareGrowRunsResultSchema } from './view-schema';

vi.mock('../../services/hass-call', () => ({
  hassCall: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(hassCall).mockReset();
});

describe('getGrowRun (GSM#675)', () => {
  it.each([
    ['active', activeDetailsFixture, 'live'],
    ['completed', completedDetailsFixture, 'pending'],
    ['finalized', finalizedDetailsFixture, 'frozen'],
  ])('parses a %s Run with the metrics its status gives it', (_, fixture, state) => {
    const parsed = GetGrowRunResultSchema.parse(fixture);
    if (parsed.outcome !== 'found') throw new Error('fixture is a found Run');
    expect(parsed.run.metrics_state).toBe(state);
    expect(parsed.run.metrics.map((row) => row.metric)).toEqual([
      'yield',
      'yield_per_harvest_source_plant',
      'water_applied',
      'water_productivity',
    ]);
  });

  it('reads the selected Run', async () => {
    vi.mocked(hassCall).mockResolvedValue(finalizedDetailsFixture);
    await getGrowRun('flower', 'run-1');
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_grow_run',
      { growspace_id: 'flower', run_id: 'run-1' },
      GetGrowRunResultSchema
    );
  });

  it('reads a Run from a backend before GSM#675 without metrics or identities', () => {
    const { metrics: _m, participant_identities: _p, ...older } = finalizedDetailsFixture.run;
    const parsed = GetGrowRunResultSchema.parse({ outcome: 'found', run: older });
    if (parsed.outcome !== 'found') throw new Error('fixture is a found Run');
    expect(parsed.run.metrics).toEqual([]);
    expect(parsed.run.participant_identities).toEqual([]);
  });
});

describe('compareGrowRuns (GSM#675)', () => {
  it('parses both outcomes of the comparison', () => {
    const compared = CompareGrowRunsResultSchema.parse(comparisonFixture);
    if (compared.outcome !== 'compared') throw new Error('fixture is a comparison');
    expect(compared.finalized.map((run) => run.sequence_number)).toEqual([6, 5, 4]);
    expect(compared.comparison.metrics[0]).toMatchObject({
      metric: 'yield',
      state: 'comparable',
      direction: 'increase',
      judgment: null,
    });
    expect(compared.comparison.metrics.find((row) => row.metric === 'water_applied')).toMatchObject(
      {
        goal: 'neutral',
        direction: 'decrease',
        judgment: null,
      }
    );
    expect(
      compared.comparison.metrics.find((row) => row.metric === 'water_productivity')
    ).toMatchObject({
      goal: 'higher',
      direction: 'increase',
      judgment: 'better',
    });
    const refused = CompareGrowRunsResultSchema.parse(comparisonRefusedFixture);
    expect(refused.outcome === 'refused' && refused.refusal.code).toBe(
      'grow_run.insufficient_history'
    );
  });

  it('asks for the default pair by naming none', async () => {
    vi.mocked(hassCall).mockResolvedValue(comparisonFixture);
    await compareGrowRuns('flower');
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/compare_grow_runs',
      { growspace_id: 'flower' },
      CompareGrowRunsResultSchema
    );
  });

  it('names exactly the two Runs picked', async () => {
    vi.mocked(hassCall).mockResolvedValue(comparisonFixture);
    await compareGrowRuns('flower', ['run-6', 'run-4']);
    expect(hassCall).toHaveBeenCalledWith(
      'growspace_manager/compare_grow_runs',
      { growspace_id: 'flower', run_ids: ['run-6', 'run-4'] },
      CompareGrowRunsResultSchema
    );
  });

  it('refuses an empty Run id before sending it', () => {
    expect(() => compareGrowRuns('flower', ['run-6', ''])).toThrow();
    expect(hassCall).not.toHaveBeenCalled();
  });
});
