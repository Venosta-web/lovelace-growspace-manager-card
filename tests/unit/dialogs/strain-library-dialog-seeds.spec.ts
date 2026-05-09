import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { SeedBatch, PollinationEvent } from '../../../src/types';

vi.mock('../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        compressImage: vi.fn().mockResolvedValue('base64string'),
    },
}));

const mockSeedBatches: SeedBatch[] = [
    {
        batch_id: 'b1',
        strain_name: 'Blue Dream',
        breeder: 'HSO',
        quantity: 10,
        acquisition_date: '2026-01-01',
        generation: 'F1',
        lineage: 'Blueberry x Haze',
        notes: 'Great batch',
    },
    {
        batch_id: 'b2',
        strain_name: 'OG Kush',
        breeder: 'Dinafem',
        quantity: 5,
        acquisition_date: '2026-02-01',
        generation: 'S1',
        lineage: '',
        notes: '',
    },
];

const mockPollinationEvents: PollinationEvent[] = [
    {
        event_id: 'evt-1',
        date: '2026-03-01',
        donor_plant_id: 'plant-1',
        receiver_plant_id: 'plant-2',
        notes: 'First cross',
        result_seed_batch_id: null,
    },
    {
        event_id: 'evt-2',
        date: '2026-03-10',
        donor_plant_id: 'plant-3',
        receiver_plant_id: 'plant-4',
        notes: '',
        result_seed_batch_id: 'b1',
    },
];

describe('StrainLibraryDialog - Seeds & Genetics Tab', () => {
    let element: StrainLibraryDialog;

    beforeEach(async () => {
        element = new StrainLibraryDialog();
        element.open = true;
        element.strains = [];
        element.seedBatches = [...mockSeedBatches];
        element.pollinationEvents = [...mockPollinationEvents];
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    describe('Tab bar', () => {
        it('renders both tab buttons', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
            expect(tabs?.length).toBe(3);
            expect(tabs?.[0].textContent).toContain('Strains');
            expect(tabs?.[1].textContent).toContain('Seeds');
            expect(tabs?.[2].textContent).toContain('Tree');
        });

        it('defaults to strains tab', async () => {
            expect((element as any)._activeMainTab).toBe('strains');
            const activeTab = element.shadowRoot?.querySelector('.tab-btn.active');
            expect(activeTab?.textContent).toContain('Strains');
        });

        it('switches to seeds tab on click', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
            (tabs?.[1] as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._activeMainTab).toBe('seeds');
            const activeTab = element.shadowRoot?.querySelector('.tab-btn.active');
            expect(activeTab?.textContent).toContain('Seeds');
        });

        it('switches back to strains tab on click', async () => {
            (element as any)._activeMainTab = 'seeds';
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
            (tabs?.[0] as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._activeMainTab).toBe('strains');
        });

        it('respects initialTab property', async () => {
            const el2 = new StrainLibraryDialog();
            el2.open = true;
            el2.strains = [];
            el2.initialTab = 'seeds';
            document.body.appendChild(el2);
            await el2.updateComplete;

            expect((el2 as any)._activeMainTab).toBe('seeds');
            document.body.removeChild(el2);
        });
    });

    describe('Seeds list view', () => {
        beforeEach(async () => {
            (element as any)._activeMainTab = 'seeds';
            await element.updateComplete;
        });

        it('renders dialog header with close button', () => {
            const header = element.shadowRoot?.querySelector('.dialog-header');
            expect(header).toBeTruthy();
            const closeBtn = header?.querySelector('button.close');
            expect(closeBtn).toBeTruthy();
        });

        it('dispatches close event when close button is clicked', async () => {
            const closeHandler = vi.fn();
            element.addEventListener('close', closeHandler);

            const header = element.shadowRoot?.querySelector('.dialog-header');
            const closeBtn = header?.querySelector('button.close') as HTMLElement;
            closeBtn?.click();

            expect(closeHandler).toHaveBeenCalled();
            element.removeEventListener('close', closeHandler);
        });

        it('renders seed batches', () => {
            const cards = element.shadowRoot?.querySelectorAll('.seed-batch-card');
            expect(cards?.length).toBe(2);
            expect(cards?.[0].textContent).toContain('Blue Dream');
            expect(cards?.[1].textContent).toContain('OG Kush');
        });

        it('renders seed batch with lineage and notes', () => {
            const card = element.shadowRoot?.querySelector('.seed-batch-card');
            expect(card?.textContent).toContain('Blueberry x Haze');
            expect(card?.textContent).toContain('Great batch');
        });

        it('renders pollination events', () => {
            const cards = element.shadowRoot?.querySelectorAll('.pollination-card');
            expect(cards?.length).toBe(2);
        });

        it('shows Harvest seeds button for unharvested event', () => {
            const cards = element.shadowRoot?.querySelectorAll('.pollination-card');
            const firstCard = cards?.[0];
            const harvestBtn = Array.from(firstCard?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Harvest seeds'));
            expect(harvestBtn).toBeTruthy();
        });

        it('shows "Seeds harvested" badge for already-harvested event', () => {
            const cards = element.shadowRoot?.querySelectorAll('.pollination-card');
            const secondCard = cards?.[1];
            expect(secondCard?.textContent).toContain('Seeds harvested');
            const harvestBtn = Array.from(secondCard?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Harvest seeds'));
            expect(harvestBtn).toBeUndefined();
        });

        it('shows empty state when no seed batches', async () => {
            element.seedBatches = [];
            await element.updateComplete;
            const emptyState = Array.from(element.shadowRoot?.querySelectorAll('.empty-state') || [])
                .find(el => el.textContent?.includes('No seed batches yet'));
            expect(emptyState).toBeTruthy();
        });

        it('shows empty state when no pollination events', async () => {
            element.pollinationEvents = [];
            await element.updateComplete;
            const emptyState = Array.from(element.shadowRoot?.querySelectorAll('.empty-state') || [])
                .find(el => el.textContent?.includes('No pollination events yet'));
            expect(emptyState).toBeTruthy();
        });

        it('navigates to add-batch sub-view', async () => {
            const addBtn = Array.from(element.shadowRoot?.querySelectorAll('.seeds-header button') || [])
                .find(b => b.textContent?.includes('Add batch')) as HTMLElement;
            addBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('add-batch');
        });

        it('navigates to log-pollination sub-view', async () => {
            const logBtn = Array.from(element.shadowRoot?.querySelectorAll('.seeds-header button') || [])
                .find(b => b.textContent?.includes('Log pollination')) as HTMLElement;
            logBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('log-pollination');
        });

        it('navigates to harvest sub-view on harvest button click', async () => {
            const cards = element.shadowRoot?.querySelectorAll('.pollination-card');
            const harvestBtn = Array.from(cards?.[0]?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Harvest seeds')) as HTMLElement;
            harvestBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('harvest');
            expect((element as any)._selectedEventId).toBe('evt-1');
        });
    });

    describe('Add batch form', () => {
        beforeEach(async () => {
            (element as any)._activeMainTab = 'seeds';
            (element as any)._seedSubView = 'add-batch';
            await element.updateComplete;
        });

        it('renders add batch form fields', () => {
            const form = element.shadowRoot?.querySelector('.form-view');
            expect(form).toBeTruthy();
            expect(form?.textContent).toContain('Add seed batch');
            const inputs = form?.querySelectorAll('input');
            expect(inputs?.length).toBeGreaterThanOrEqual(6);
        });

        it('navigates back to list via Back button', async () => {
            const backBtn = element.shadowRoot?.querySelector('.form-header .md3-button') as HTMLElement;
            backBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('list');
        });

        it('navigates back to list via Cancel button', async () => {
            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('list');
            expect((element as any)._submitError).toBeNull();
        });

        it('shows validation error when required fields are missing', async () => {
            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await element.updateComplete;

            expect((element as any)._submitError).toBeTruthy();
            const errorEl = element.shadowRoot?.querySelector('.form-error');
            expect(errorEl).toBeTruthy();
        });

        it('calls onAddSeedBatch and resets form on success', async () => {
            const onAddSeedBatch = vi.fn().mockResolvedValue(undefined);
            element.onAddSeedBatch = onAddSeedBatch;
            (element as any)._batchForm = {
                strain_name: 'Test Strain',
                breeder: 'Test Breeder',
                quantity: 5,
                acquisition_date: '2026-01-01',
                generation: 'F1',
                parent_1_key: 'Parent A||Pheno1',
                parent_2_key: 'Parent B||',
                notes: 'test',
            };
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await element.updateComplete;
            await new Promise(r => setTimeout(r, 0));

            expect(onAddSeedBatch).toHaveBeenCalledWith({
                strain_name: 'Test Strain',
                breeder: 'Test Breeder',
                quantity: 5,
                acquisition_date: '2026-01-01',
                generation: 'F1',
                parent_1_strain: 'Parent A',
                parent_1_phenotype: 'Pheno1',
                parent_2_strain: 'Parent B',
                parent_2_phenotype: null,
                notes: 'test',
            });
            expect((element as any)._seedSubView).toBe('list');
        });

        it('shows error message when onAddSeedBatch throws', async () => {
            element.onAddSeedBatch = vi.fn().mockRejectedValue(new Error('Network error'));
            (element as any)._batchForm = {
                strain_name: 'Test',
                breeder: 'Breeder',
                quantity: 1,
                acquisition_date: '2026-01-01',
                generation: 'F1',
                parent_1_key: '',
                parent_2_key: '',
                notes: '',
            };
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect((element as any)._submitError).toContain('Failed to save');
        });

        it('calls onSeedDataChanged after successful submit', async () => {
            const onSeedDataChanged = vi.fn();
            const onAddSeedBatch = vi.fn().mockResolvedValue(undefined);
            element.onSeedDataChanged = onSeedDataChanged;
            element.onAddSeedBatch = onAddSeedBatch;
            (element as any)._batchForm = {
                strain_name: 'S', breeder: 'B', quantity: 1,
                acquisition_date: '2026-01-01', generation: 'F1', lineage: 'X x Y', notes: '',
            };

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(r => setTimeout(r, 0));

            expect(onSeedDataChanged).toHaveBeenCalled();
        });
    });

    describe('Log pollination form', () => {
        beforeEach(async () => {
            (element as any)._activeMainTab = 'seeds';
            (element as any)._seedSubView = 'log-pollination';
            await element.updateComplete;
        });

        it('renders log pollination form', () => {
            const form = element.shadowRoot?.querySelector('.form-view');
            expect(form?.textContent).toContain('Log pollination');
        });

        it('navigates back to list', async () => {
            const backBtn = element.shadowRoot?.querySelector('.form-header .md3-button') as HTMLElement;
            backBtn?.click();
            await element.updateComplete;
            expect((element as any)._seedSubView).toBe('list');
        });

        it('shows validation error when required fields are missing', async () => {
            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await element.updateComplete;
            expect((element as any)._submitError).toBeTruthy();
        });

        it('calls onLogPollination and resets form on success', async () => {
            const onLogPollination = vi.fn().mockResolvedValue(undefined);
            element.onLogPollination = onLogPollination;
            (element as any)._pollinationForm = {
                date: '2026-03-20',
                donor_plant_id: 'plant-1',
                receiver_plant_id: 'plant-2',
                notes: '',
            };
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect(onLogPollination).toHaveBeenCalledWith({
                date: '2026-03-20',
                donor_plant_id: 'plant-1',
                receiver_plant_id: 'plant-2',
                notes: '',
            });
            expect((element as any)._seedSubView).toBe('list');
        });

        it('shows error when onLogPollination throws', async () => {
            element.onLogPollination = vi.fn().mockRejectedValue(new Error('fail'));
            (element as any)._pollinationForm = {
                date: '2026-03-20',
                donor_plant_id: 'p1',
                receiver_plant_id: 'p2',
                notes: '',
            };
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect((element as any)._submitError).toContain('Failed to save');
        });
    });

    describe('Harvest form', () => {
        beforeEach(async () => {
            (element as any)._activeMainTab = 'seeds';
            (element as any)._seedSubView = 'harvest';
            (element as any)._selectedEventId = 'evt-1';
            await element.updateComplete;
        });

        it('renders harvest form', () => {
            const form = element.shadowRoot?.querySelector('.form-view');
            expect(form?.textContent).toContain('Harvest seeds');
        });

        it('navigates back to list and clears selectedEventId', async () => {
            const backBtn = element.shadowRoot?.querySelector('.form-header .md3-button') as HTMLElement;
            backBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('list');
            expect((element as any)._selectedEventId).toBeNull();
        });

        it('shows validation error when selectedEventId is missing', async () => {
            (element as any)._selectedEventId = null;
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await element.updateComplete;

            expect((element as any)._submitError).toBeTruthy();
        });

        it('calls onHarvestSeeds and resets form on success', async () => {
            const onHarvestSeeds = vi.fn().mockResolvedValue(undefined);
            element.onHarvestSeeds = onHarvestSeeds;
            (element as any)._harvestForm = { quantity: 15, notes: 'good yield' };
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect(onHarvestSeeds).toHaveBeenCalledWith({
                event_id: 'evt-1',
                quantity: 15,
                notes: 'good yield',
            });
            expect((element as any)._seedSubView).toBe('list');
            expect((element as any)._selectedEventId).toBeNull();
        });

        it('shows error when onHarvestSeeds throws', async () => {
            element.onHarvestSeeds = vi.fn().mockRejectedValue(new Error('fail'));
            (element as any)._harvestForm = { quantity: 5, notes: '' };
            await element.updateComplete;

            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect((element as any)._submitError).toContain('Failed to save');
        });

        it('cancel button clears selectedEventId and submitError', async () => {
            (element as any)._submitError = 'some error';
            await element.updateComplete;

            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn?.click();
            await element.updateComplete;

            expect((element as any)._seedSubView).toBe('list');
            expect((element as any)._selectedEventId).toBeNull();
            expect((element as any)._submitError).toBeNull();
        });
    });
});
