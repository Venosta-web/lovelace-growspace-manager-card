import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hassCall } from '../../services/hass-call';
import { fetchPairings, savePairing, deletePairing, pairings$, resetTcPresence } from './index';
import { PairingsResponseSchema, PairingMutationSchema, PairingDeletionSchema } from './schema';
import fixture from '../../../tests/fixtures/contract/tc_pairings_response.json';

vi.mock('../../services/hass-call', () => ({ hassCall: vi.fn() }));
const call = vi.mocked(hassCall);
const rows = PairingsResponseSchema.parse(fixture).pairings;
const draft = {
  phenotype_id: rows[0].phenotype.id,
  phenotype_name: rows[0].phenotype.name_snapshot,
  medium_id: rows[0].medium_id,
  notes: 'Updated',
};
beforeEach(() => {
  vi.clearAllMocks();
  resetTcPresence();
});

describe('the backend pairing contract', () => {
  it('parses the recorded fixture without dropping or inventing fields', () => {
    expect(PairingsResponseSchema.parse(fixture)).toEqual(fixture);
    expect(rows.every((row) => !('medium_version' in row))).toBe(true);
  });
  it('lists, creates, updates and removes from the same atom', async () => {
    call.mockResolvedValueOnce({ pairings: rows });
    await fetchPairings();
    expect(call).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/list',
      {},
      PairingsResponseSchema
    );
    const created = { ...rows[0], id: 'new' };
    call.mockResolvedValueOnce({ pairing: created });
    await savePairing(draft);
    expect(call).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/create',
      draft,
      PairingMutationSchema
    );
    const updated = { ...created, notes: 'Updated' };
    call.mockResolvedValueOnce({ pairing: updated });
    await savePairing(draft, created.id);
    expect(call).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/update',
      { ...draft, pairing_id: 'new' },
      PairingMutationSchema
    );
    expect(pairings$.get()).toEqual([...rows, updated]);
    call.mockResolvedValueOnce({ pairing_id: 'new' });
    await deletePairing('new');
    expect(call).toHaveBeenLastCalledWith(
      'growspace_manager_tc/pairings/delete',
      { pairing_id: 'new' },
      PairingDeletionSchema
    );
    expect(pairings$.get()).toEqual(rows);
  });
  it('retains data on rejected requests', async () => {
    pairings$.set(rows);
    call.mockRejectedValue(new Error('Conflict'));
    await expect(savePairing(draft)).rejects.toThrow('Conflict');
    await expect(deletePairing(rows[0].id)).rejects.toThrow('Conflict');
    await expect(fetchPairings()).rejects.toThrow('Conflict');
    expect(pairings$.get()).toEqual(rows);
  });
});
