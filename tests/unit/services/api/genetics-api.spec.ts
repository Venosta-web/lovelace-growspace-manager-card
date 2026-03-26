import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneticsAPI } from '../../../../src/services/api/genetics-api';

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

    // ── scorePlant ────────────────────────────────────────────────────────────

    describe('scorePlant', () => {
        it('filters out null values and calls service', async () => {
            api.updateHass(mockHass);
            await api.scorePlant({
                plant_id: 'plant-1',
                vigor: 8,
                structure: null,
                aroma: 7,
                resin: null,
                pest_resistance: 6,
            });

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'score_plant', {
                plant_id: 'plant-1',
                vigor: 8,
                aroma: 7,
                pest_resistance: 6,
            });
        });

        it('passes all values when none are null', async () => {
            api.updateHass(mockHass);
            await api.scorePlant({
                plant_id: 'plant-2',
                vigor: 9,
                structure: 8,
                aroma: 7,
                resin: 10,
                pest_resistance: 6,
            });

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'score_plant', {
                plant_id: 'plant-2',
                vigor: 9,
                structure: 8,
                aroma: 7,
                resin: 10,
                pest_resistance: 6,
            });
        });

        it('sends only plant_id when all scores are null', async () => {
            api.updateHass(mockHass);
            await api.scorePlant({
                plant_id: 'plant-3',
                vigor: null,
                structure: null,
            });

            expect(callService).toHaveBeenCalledWith('growspace_manager', 'score_plant', {
                plant_id: 'plant-3',
            });
        });
    });
});
