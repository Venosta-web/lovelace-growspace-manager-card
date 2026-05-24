import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneticsAPI } from '../../../../src/services/api/genetics-api';
import { WSError } from '../../../../src/services/base-api';

describe('GeneticsAPI', () => {
    let api: GeneticsAPI;
    let callWS: ReturnType<typeof vi.fn>;
    let callService: ReturnType<typeof vi.fn>;
    let mockHass: any;

    beforeEach(() => {
        api = new GeneticsAPI();
        callWS = vi.fn();
        callService = vi.fn().mockResolvedValue(undefined);
        mockHass = {
            callWS,
            callService,
        };
    });

    // ── fetchGeneticsData ─────────────────────────────────────────────────────

    describe('fetchGeneticsData', () => {
        it('returns default empty object when hass is not set', async () => {
            const result = await api.fetchGeneticsData();
            expect(result).toEqual({ seed_batches: {}, pollination_events: {} });
        });

        it('returns data from websocket', async () => {
            const mockData = {
                seed_batches: { 'b1': { batch_id: 'b1', strain_name: 'OG Kush' } },
                pollination_events: {},
            };
            callWS.mockResolvedValue(mockData);
            api.updateHass(mockHass);

            const result = await api.fetchGeneticsData();

            expect(callWS).toHaveBeenCalledWith({ type: 'growspace_manager/get_genetics_data' });
            expect(result).toEqual(mockData);
        });

        it('returns default empty object when websocket returns null', async () => {
            callWS.mockRejectedValue(new Error('WS fail'));
            api.updateHass(mockHass);

            const result = await api.fetchGeneticsData();
            expect(result).toEqual({ seed_batches: {}, pollination_events: {} });
        });
    });

    // ── addSeedBatch ──────────────────────────────────────────────────────────

    describe('addSeedBatch', () => {
        it('calls service with correct payload', async () => {
            api.updateHass(mockHass);
            const payload = {
                strain_name: 'Blue Dream',
                breeder: 'HSO',
                quantity: 10,
                acquisition_date: '2026-01-01',
                generation: 'F1',
                lineage: 'Blueberry x Haze',
                notes: 'Great batch',
            };

            await api.addSeedBatch(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'add_seed_batch', payload);
        });

        it('calls service without optional notes', async () => {
            api.updateHass(mockHass);
            const payload = {
                strain_name: 'White Widow',
                breeder: 'Dutch Passion',
                quantity: 5,
                acquisition_date: '2026-02-01',
                generation: 'S1',
                lineage: 'South Indian x South American',
            };

            await api.addSeedBatch(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'add_seed_batch', payload);
        });
    });

    // ── logPollination ────────────────────────────────────────────────────────

    describe('logPollination', () => {
        it('calls service with correct payload', async () => {
            api.updateHass(mockHass);
            const payload = {
                date: '2026-03-01',
                donor_plant_id: 'plant-1',
                receiver_plant_id: 'plant-2',
                notes: 'First crossing attempt',
            };

            await api.logPollination(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'log_pollination', payload);
        });

        it('calls service without optional notes', async () => {
            api.updateHass(mockHass);
            const payload = {
                date: '2026-03-15',
                donor_plant_id: 'plant-3',
                receiver_plant_id: 'plant-4',
            };

            await api.logPollination(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'log_pollination', payload);
        });
    });

    // ── updateSeedBatch ───────────────────────────────────────────────────────

    describe('updateSeedBatch', () => {
        it('calls service with correct payload', async () => {
            api.updateHass(mockHass);
            const payload = {
                batch_id: 'batch-1',
                strain_name: 'Super Lemon Haze',
                quantity: 15,
            };

            await api.updateSeedBatch(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'update_seed_batch', payload);
        });
    });

    // ── harvestSeeds ──────────────────────────────────────────────────────────

    describe('harvestSeeds', () => {
        it('calls service with correct payload including notes', async () => {
            api.updateHass(mockHass);
            const payload = { event_id: 'evt-1', quantity: 20, notes: 'Good yield' };

            await api.harvestSeeds(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'harvest_seeds', payload);
        });

        it('calls service without optional notes', async () => {
            api.updateHass(mockHass);
            const payload = { event_id: 'evt-2', quantity: 5 };

            await api.harvestSeeds(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'harvest_seeds', payload);
        });
    });

    // ── updatePollination ─────────────────────────────────────────────────────

    describe('updatePollination', () => {
        it('calls service with correct payload', async () => {
            api.updateHass(mockHass);
            const payload = {
                event_id: 'evt-1',
                notes: 'Updated notes',
            };

            await api.updatePollination(payload);

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'update_pollination', payload);
        });
    });

    // ── deletePollination ─────────────────────────────────────────────────────
    describe('deletePollination', () => {
        it('calls service with correct event_id', async () => {
            api.updateHass(mockHass);
            await api.deletePollination('evt-1');
            expect(callService).toHaveBeenCalledWith('growspace_manager', 'delete_pollination', { event_id: 'evt-1' });
        });
    });

    // ── deleteSeedBatch ──────────────────────────────────────────────────────
    describe('deleteSeedBatch', () => {
        it('calls service with correct batch_id', async () => {
            api.updateHass(mockHass);
            const batch_id = 'batch-123';
            await api.deleteSeedBatch(batch_id);
            expect(callService).toHaveBeenCalledWith('growspace_manager', 'delete_seed_batch', { batch_id });
        });
    });

    // ── setPlantSex ──────────────────────────────────────────────────────────
    describe('setPlantSex', () => {
        it('calls service with correct payload', async () => {
            api.updateHass(mockHass);
            await api.setPlantSex('p1', 'female');
            expect(callService).toHaveBeenCalledWith('growspace_manager', 'set_plant_sex', { plant_id: 'p1', sex: 'female' });
        });
    });

    // ── sowSeed ──────────────────────────────────────────────────────────────
    describe('sowSeed', () => {
        it('calls service with correct payload', async () => {
            api.updateHass(mockHass);
            await api.sowSeed('b1', 'p1');
            expect(callService).toHaveBeenCalledWith('growspace_manager', 'sow_seed', { batch_id: 'b1', plant_id: 'p1' });
        });
    });

    // ── getLineageTree ────────────────────────────────────────────────────────
    describe('getLineageTree', () => {
        it('calls websocket and returns result', async () => {
            api.updateHass(mockHass);
            const mockNode = { id: 'p1', parents: [] };
            callWS.mockResolvedValue(mockNode);

            const result = await api.getLineageTree('p1');

            expect(callWS).toHaveBeenCalledWith({ type: 'growspace_manager/get_lineage_tree', plant_id: 'p1' });
            expect(result).toEqual(mockNode);
        });

        it('returns null if websocket fails', async () => {
            api.updateHass(mockHass);
            callWS.mockRejectedValue(new Error('WS fail'));
            const result = await api.getLineageTree('p1');
            expect(result).toBeNull();
        });
    });

    // ── getStrainLineageTree ──────────────────────────────────────────────────
    describe('getStrainLineageTree', () => {
        it('calls websocket with correct params', async () => {
            api.updateHass(mockHass);
            const mockTree = { name: 'Strain Root' } as any;
            callWS.mockResolvedValueOnce(mockTree);

            const result = await api.getStrainLineageTree('Strain A');

            expect(result).toEqual(mockTree);
            expect(callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_strain_lineage_tree',
                strain_name: 'Strain A',
            });
        });

        it('returns null if websocket fails or returns null', async () => {
            api.updateHass(mockHass);
            callWS.mockResolvedValueOnce(null);
            const result = await api.getStrainLineageTree('Strain A');
            expect(result).toBeNull();
        });
    });

    // ── updateStrainLineageTree ───────────────────────────────────────────────
    describe('updateStrainLineageTree', () => {
        it('calls websocket and returns lineage string', async () => {
            api.updateHass(mockHass);
            const parents = [{ name: 'P1', source: 'library' as const }];
            callWS.mockResolvedValue({ lineage: 'P1' });

            const result = await api.updateStrainLineageTree('OG Kush', parents);

            expect(callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/update_strain_lineage_tree',
                strain_name: 'OG Kush',
                parents
            });
            expect(result).toEqual({ lineage: 'P1' });
        });

        it('throws WSError if websocket fails', async () => {
            api.updateHass(mockHass);
            callWS.mockRejectedValue(new Error('WS fail'));
            await expect(api.updateStrainLineageTree('OG Kush', [])).rejects.toBeInstanceOf(WSError);
        });
    });

    // ── importStrainLineageTree ───────────────────────────────────────────────
    describe('importStrainLineageTree', () => {
        it('calls websocket with tree data', async () => {
            api.updateHass(mockHass);
            const tree = { name: 'OG' };
            await api.importStrainLineageTree('OG Kush', tree);
            expect(callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/import_strain_lineage_tree',
                strain_name: 'OG Kush',
                tree
            });
        });
    });
});
