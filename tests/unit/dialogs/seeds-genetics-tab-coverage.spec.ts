import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SeedsGeneticsTab } from '../../../src/dialogs/seeds-genetics-tab';
import { SeedBatch, PollinationEvent, StrainEntry, GrowspaceDevice } from '../../../src/types';

const mockStrains: StrainEntry[] = [
    { strain: 'Zkittlez', phenotype: 'P1', breeder: 'Terp Hogz', key: 'zkittlez-p1' },
    { strain: 'Gelato 41', phenotype: '', breeder: 'Sherbinskis', key: 'gelato-41' },
];

const mockSeedBatches: SeedBatch[] = [
    {
        batch_id: 'b1',
        strain_name: 'Blue Dream',
        breeder: 'HSO',
        quantity: 10,
        acquisition_date: '2026-01-01',
        generation: 'F1',
        lineage: 'Blueberry x Haze',
        parent_1_strain: 'Haze',
        parent_1_phenotype: 'Silver',
        parent_2_strain: 'Blueberry',
        parent_2_phenotype: null,
        notes: 'Great batch',
    },
];

const mockPollinationEvents: PollinationEvent[] = [
    {
        event_id: 'evt-1',
        date: '2026-03-01',
        donor_plant_id: 'p1',
        receiver_plant_id: 'p2',
        notes: 'Test cross',
        result_seed_batch_id: null,
    },
];

const mockPlants: GrowspaceDevice[] = [
    {
        deviceId: 'gs-1',
        name: 'Tent 1',
        plants: [
            {
                attributes: {
                    plant_id: 'p1',
                    strain: 'Male Strain',
                    stage: 'flower',
                    flower_days: 10,
                },
            } as any,
            {
                attributes: {
                    plant_id: 'p2',
                    strain: 'Female Strain',
                    phenotype: 'Sweet',
                    stage: 'veg',
                    veg_days: 20,
                },
            } as any,
        ],
    } as any,
];

describe('SeedsGeneticsTab Coverage', () => {
    let element: SeedsGeneticsTab;

    beforeEach(async () => {
        element = new SeedsGeneticsTab();
        element.strains = [...mockStrains];
        element.seedBatches = [...mockSeedBatches];
        element.pollinationEvents = [...mockPollinationEvents];
        element.plants = [...mockPlants];
        
        element.onUpdateSeedBatch = vi.fn().mockResolvedValue(undefined);
        element.onDeleteSeedBatch = vi.fn().mockResolvedValue(undefined);
        element.onSowSeeds = vi.fn().mockResolvedValue(undefined);
        element.onUpdatePollination = vi.fn().mockResolvedValue(undefined);
        element.onDeletePollination = vi.fn().mockResolvedValue(undefined);
        element.onSeedDataChanged = vi.fn();

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    describe('Seed Batch Actions', () => {
        it('handles editing a seed batch', async () => {
            const editBtn = element.shadowRoot?.querySelector('.seed-batch-edit-btn') as HTMLElement;
            editBtn.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('add-batch');
            expect((element as any)._editingBatchId).toBe('b1');
            expect((element as any)._batchForm.strain_name).toBe('Blue Dream');

            // Simulate saving the edit
            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn.click();
            await new Promise(r => setTimeout(r, 0));

            expect(element.onUpdateSeedBatch).toHaveBeenCalled();
        });

        it('handles batch deletion confirmation', async () => {
            // Initial delete click shows confirmation
            const deleteBtn = element.shadowRoot?.querySelector('.icon-btn.danger') as HTMLElement;
            deleteBtn.click();
            await element.updateComplete;

            expect((element as any)._confirmDeleteBatchId).toBe('b1');
            
            // Confirm delete
            const confirmBtn = element.shadowRoot?.querySelector('.icon-btn.danger[title="Confirm delete"]') as HTMLElement;
            confirmBtn.click();
            await new Promise(r => setTimeout(r, 0));

            expect(element.onDeleteSeedBatch).toHaveBeenCalledWith('b1');
            expect(element.onSeedDataChanged).toHaveBeenCalled();
        });

        it('handles canceling batch deletion', async () => {
            const deleteBtn = element.shadowRoot?.querySelector('.icon-btn.danger') as HTMLElement;
            deleteBtn.click();
            await element.updateComplete;

            const cancelBtn = element.shadowRoot?.querySelector('.icon-btn[title="Cancel"]') as HTMLElement;
            cancelBtn.click();
            await element.updateComplete;

            expect((element as any)._confirmDeleteBatchId).toBeNull();
        });

        it('handles sowing seeds', async () => {
            const sowBtn = Array.from(element.shadowRoot?.querySelectorAll('.seed-batch-actions button') || [])
                .find(b => b.textContent?.includes('Sow seeds')) as HTMLElement;
            sowBtn.click();
            await element.updateComplete;

            expect((element as any)._sowBatchId).toBe('b1');

            // Find form elements
            const select = element.shadowRoot?.querySelector('.sow-select') as HTMLSelectElement;
            const qtyInput = element.shadowRoot?.querySelector('.sow-qty') as HTMLInputElement;
            const plantBtn = Array.from(element.shadowRoot?.querySelectorAll('.sow-form button') || [])
                .find(b => b.textContent?.includes('Plant')) as HTMLElement;

            // Change values
            select.value = 'gs-1';
            select.dispatchEvent(new Event('change'));
            qtyInput.value = '2';
            qtyInput.dispatchEvent(new Event('input'));
            await element.updateComplete;

            expect((element as any)._sowGrowspaceId).toBe('gs-1');
            expect((element as any)._sowQuantity).toBe(2);

            // Submit
            plantBtn.click();
            await new Promise(r => setTimeout(r, 0));

            expect(element.onSowSeeds).toHaveBeenCalledWith({
                growspace_id: 'gs-1',
                strain: 'Blue Dream',
                amount: 2,
                seed_batch_id: 'b1',
                generation: 'F1',
            });
            expect((element as any)._sowBatchId).toBeNull();
        });

        it('toggles sow form off if clicked again', async () => {
            const sowBtn = Array.from(element.shadowRoot?.querySelectorAll('.seed-batch-actions button') || [])
                .find(b => b.textContent?.includes('Sow seeds')) as HTMLElement;
            sowBtn.click();
            await element.updateComplete;
            expect((element as any)._sowBatchId).toBe('b1');

            sowBtn.click();
            await element.updateComplete;
            expect((element as any)._sowBatchId).toBeNull();
        });

        it('handles canceling sow form', async () => {
            const sowBtn = Array.from(element.shadowRoot?.querySelectorAll('.seed-batch-actions button') || [])
                .find(b => b.textContent?.includes('Sow seeds')) as HTMLElement;
            sowBtn.click();
            await element.updateComplete;

            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.sow-form button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn.click();
            await element.updateComplete;

            expect((element as any)._sowBatchId).toBeNull();
        });
    });

    describe('Pollination Actions', () => {
        it('handles editing a pollination event', async () => {
            const editBtn = element.shadowRoot?.querySelector('.pollination-card .icon-btn') as HTMLElement;
            editBtn.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('log-pollination');
            expect((element as any)._editingEventId).toBe('evt-1');

            // Save edit
            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn.click();
            await new Promise(r => setTimeout(r, 0));

            expect(element.onUpdatePollination).toHaveBeenCalled();
        });

        it('handles pollination deletion confirmation', async () => {
            const deleteBtn = element.shadowRoot?.querySelector('.pollination-card-actions .icon-btn.danger') as HTMLElement;
            deleteBtn.click();
            await element.updateComplete;

            expect((element as any)._confirmDeleteEventId).toBe('evt-1');

            const confirmBtn = element.shadowRoot?.querySelector('.icon-btn.danger[title="Confirm delete"]') as HTMLElement;
            confirmBtn.click();
            await new Promise(r => setTimeout(r, 0));

            expect(element.onDeletePollination).toHaveBeenCalledWith('evt-1');
            expect(element.onSeedDataChanged).toHaveBeenCalled();
        });

        it('handles canceling pollination deletion', async () => {
            const deleteBtn = element.shadowRoot?.querySelector('.pollination-card-actions .icon-btn.danger') as HTMLElement;
            deleteBtn.click();
            await element.updateComplete;

            const cancelBtn = element.shadowRoot?.querySelector('.icon-btn[title="Cancel"]') as HTMLElement;
            cancelBtn.click();
            await element.updateComplete;

            expect((element as any)._confirmDeleteEventId).toBeNull();
        });
    });

    describe('Form Input Handlers', () => {
        it('exercises all add-batch form handlers', async () => {
            (element as any)._seedSubView = 'add-batch';
            await element.updateComplete;

            const inputs = element.shadowRoot?.querySelectorAll('.form-view input');
            const select = element.shadowRoot?.querySelector('.form-view select') as HTMLSelectElement;

            const strainInput = inputs?.[0] as HTMLInputElement;
            strainInput.value = 'New Strain';
            strainInput.dispatchEvent(new Event('input'));

            const breederInput = inputs?.[1] as HTMLInputElement;
            breederInput.value = 'New Breeder';
            breederInput.dispatchEvent(new Event('input'));

            const qtyInput = inputs?.[2] as HTMLInputElement;
            qtyInput.value = '10';
            qtyInput.dispatchEvent(new Event('input'));

            const dateInput = inputs?.[3] as HTMLInputElement;
            dateInput.value = '2026-05-01';
            dateInput.dispatchEvent(new Event('input'));

            const genInput = inputs?.[4] as HTMLInputElement;
            genInput.value = 'F2';
            genInput.dispatchEvent(new Event('input'));

            select.value = 'Zkittlez||P1';
            select.dispatchEvent(new Event('change'));

            const notesInput = inputs?.[5] as HTMLInputElement;
            notesInput.value = 'some notes';
            notesInput.dispatchEvent(new Event('input'));

            await element.updateComplete;
            const form = (element as any)._batchForm;
            expect(form.strain_name).toBe('New Strain');
            expect(form.breeder).toBe('New Breeder');
            expect(form.quantity).toBe(10);
            expect(form.acquisition_date).toBe('2026-05-01');
            expect(form.generation).toBe('F2');
            expect(form.parent_1_key).toBe('Zkittlez||P1');
            expect(form.notes).toBe('some notes');

            const parent2Select = element.shadowRoot?.querySelectorAll('.form-view select')[1] as HTMLSelectElement;
            parent2Select.value = 'Gelato 41||';
            parent2Select.dispatchEvent(new Event('change'));
            await element.updateComplete;
            expect((element as any)._batchForm.parent_2_key).toBe('Gelato 41||');
        });

        it('handles canceling add batch form via footer button', async () => {
            (element as any)._seedSubView = 'add-batch';
            await element.updateComplete;

            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('list');
        });

        it('exercises all log-pollination form handlers', async () => {
            (element as any)._seedSubView = 'log-pollination';
            await element.updateComplete;

            const inputs = element.shadowRoot?.querySelectorAll('.form-view input');
            const selects = element.shadowRoot?.querySelectorAll('.form-view select');

            const dateInput = inputs?.[0] as HTMLInputElement;
            dateInput.value = '2026-06-01';
            dateInput.dispatchEvent(new Event('input'));

            const donorSelect = selects?.[0] as HTMLSelectElement;
            donorSelect.value = 'p1';
            donorSelect.dispatchEvent(new Event('change'));

            const receiverSelect = selects?.[1] as HTMLSelectElement;
            receiverSelect.value = 'p2';
            receiverSelect.dispatchEvent(new Event('change'));

            const notesInput = inputs?.[1] as HTMLInputElement;
            notesInput.value = 'pollination notes';
            notesInput.dispatchEvent(new Event('input'));

            await element.updateComplete;
            const form = (element as any)._pollinationForm;
            expect(form.date).toBe('2026-06-01');
            expect(form.donor_plant_id).toBe('p1');
            expect(form.receiver_plant_id).toBe('p2');
            expect(form.notes).toBe('pollination notes');

            // Test cancel button in log pollination
            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn.click();
            await element.updateComplete;
            expect((element as any)._seedSubView).toBe('list');
        });

        it('exercises harvest form input handlers', async () => {
            (element as any)._seedSubView = 'harvest';
            await element.updateComplete;

            const inputs = element.shadowRoot?.querySelectorAll('.form-view input');
            
            const qtyInput = inputs?.[0] as HTMLInputElement;
            qtyInput.value = '50';
            qtyInput.dispatchEvent(new Event('input'));

            const notesInput = inputs?.[1] as HTMLInputElement;
            notesInput.value = 'harvest notes';
            notesInput.dispatchEvent(new Event('input'));

            await element.updateComplete;
            const form = (element as any)._harvestForm;
            expect(form.quantity).toBe(50);
            expect(form.notes).toBe('harvest notes');
        });
    });

    describe('Sorting and Labels', () => {
        it('exercises strain sorting and breeder suggestions', async () => {
            (element as any)._seedSubView = 'add-batch';
            await element.updateComplete;
            
            // This just triggers the getter/render logic for sorting
            const options = element.shadowRoot?.querySelectorAll('datalist option');
            expect(options?.length).toBeGreaterThan(0);
        });

        it('exercises _getPlantLabel fallback', () => {
            const label = (element as any)._getPlantLabel('unknown-id');
            expect(label).toBe('unknown-id');
        });
    });
});
