import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { SeedsGeneticsTab } from '../../../src/dialogs/seeds-genetics-tab';
import { transition } from '../../../src/dialogs/seeds-genetics-tab-sm';
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

function sm(el: SeedsGeneticsTab) {
    return (el as any)._sm;
}

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
});

describe('SeedsGeneticsTab', () => {
    let seedsTab: SeedsGeneticsTab;

    beforeEach(async () => {
        seedsTab = new SeedsGeneticsTab();
        seedsTab.strains = [];
        seedsTab.seedBatches = [...mockSeedBatches];
        seedsTab.pollinationEvents = [...mockPollinationEvents];
        seedsTab.plants = [];
        seedsTab.onAddSeedBatch = vi.fn().mockResolvedValue(undefined);
        seedsTab.onLogPollination = vi.fn().mockResolvedValue(undefined);
        seedsTab.onHarvestSeeds = vi.fn().mockResolvedValue(undefined);
        seedsTab.onSeedDataChanged = vi.fn();
        document.body.appendChild(seedsTab);
        await seedsTab.updateComplete;
    });

    afterEach(() => {
        if (seedsTab.isConnected) {
            document.body.removeChild(seedsTab);
        }
        vi.restoreAllMocks();
    });

    describe('Seeds list view', () => {
        it('renders dialog header with close button', () => {
            const header = seedsTab.shadowRoot?.querySelector('.dialog-header');
            expect(header).toBeTruthy();
            const closeBtn = header?.querySelector('button.close');
            expect(closeBtn).toBeTruthy();
        });

        it('dispatches close event when close button is clicked', async () => {
            const closeHandler = vi.fn();
            seedsTab.addEventListener('close', closeHandler);

            const header = seedsTab.shadowRoot?.querySelector('.dialog-header');
            const closeBtn = header?.querySelector('button.close') as HTMLElement;
            closeBtn?.click();

            expect(closeHandler).toHaveBeenCalled();
            seedsTab.removeEventListener('close', closeHandler);
        });

        it('renders seed batches', () => {
            const cards = seedsTab.shadowRoot?.querySelectorAll('.seed-batch-card');
            expect(cards?.length).toBe(2);
            expect(cards?.[0].textContent).toContain('Blue Dream');
            expect(cards?.[1].textContent).toContain('OG Kush');
        });

        it('renders seed batch with lineage and notes', () => {
            const card = seedsTab.shadowRoot?.querySelector('.seed-batch-card');
            expect(card?.textContent).toContain('Blueberry x Haze');
            expect(card?.textContent).toContain('Great batch');
        });

        it('renders pollination events', () => {
            const cards = seedsTab.shadowRoot?.querySelectorAll('.pollination-card');
            expect(cards?.length).toBe(2);
        });

        it('shows Harvest seeds button for unharvested event', () => {
            const cards = seedsTab.shadowRoot?.querySelectorAll('.pollination-card');
            const firstCard = cards?.[0];
            const harvestBtn = Array.from(firstCard?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Harvest seeds'));
            expect(harvestBtn).toBeTruthy();
        });

        it('shows "Seeds harvested" badge for already-harvested event', () => {
            const cards = seedsTab.shadowRoot?.querySelectorAll('.pollination-card');
            const secondCard = cards?.[1];
            expect(secondCard?.textContent).toContain('Seeds harvested');
            const harvestBtn = Array.from(secondCard?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Harvest seeds'));
            expect(harvestBtn).toBeUndefined();
        });

        it('shows empty state when no seed batches', async () => {
            seedsTab.seedBatches = [];
            await seedsTab.updateComplete;
            const emptyState = Array.from(seedsTab.shadowRoot?.querySelectorAll('.empty-state') || [])
                .find(el => el.textContent?.includes('No seed batches yet'));
            expect(emptyState).toBeTruthy();
        });

        it('shows empty state when no pollination events', async () => {
            seedsTab.pollinationEvents = [];
            await seedsTab.updateComplete;
            const emptyState = Array.from(seedsTab.shadowRoot?.querySelectorAll('.empty-state') || [])
                .find(el => el.textContent?.includes('No pollination events yet'));
            expect(emptyState).toBeTruthy();
        });

        it('navigates to add-batch sub-view', async () => {
            const addBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.seeds-header button') || [])
                .find(b => b.textContent?.includes('Add batch')) as HTMLElement;
            addBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('add-batch');
        });

        it('navigates to log-pollination sub-view', async () => {
            const logBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.seeds-header button') || [])
                .find(b => b.textContent?.includes('Log pollination')) as HTMLElement;
            logBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('log-pollination');
        });

        it('navigates to harvest sub-view on harvest button click', async () => {
            const cards = seedsTab.shadowRoot?.querySelectorAll('.pollination-card');
            const harvestBtn = Array.from(cards?.[0]?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Harvest seeds')) as HTMLElement;
            harvestBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('harvest');
            expect(sm(seedsTab).views.harvest.eventId).toBe('evt-1');
        });
    });

    describe('Add batch form', () => {
        beforeEach(async () => {
            (seedsTab as any)._sm = transition(sm(seedsTab), { type: 'BEGIN_ADD_BATCH' });
            await seedsTab.updateComplete;
        });

        it('renders add batch form fields', () => {
            const form = seedsTab.shadowRoot?.querySelector('.form-view');
            expect(form).toBeTruthy();
            expect(form?.textContent).toContain('Add seed batch');
            const inputs = form?.querySelectorAll('input');
            expect(inputs?.length).toBeGreaterThanOrEqual(6);
        });

        it('navigates back to list via Back button', async () => {
            const backBtn = seedsTab.shadowRoot?.querySelector('.form-header .md3-button') as HTMLElement;
            backBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('list');
        });

        it('navigates back to list via Cancel button', async () => {
            const cancelBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('list');
            expect(sm(seedsTab).views['add-batch'].sub.kind).toBe('idle');
        });

        it('shows validation error when required fields are missing', async () => {
            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).views['add-batch'].sub.kind).toBe('error');
            const errorEl = seedsTab.shadowRoot?.querySelector('.form-error');
            expect(errorEl).toBeTruthy();
        });

        it('calls onAddSeedBatch and resets form on success', async () => {
            const onAddSeedBatch = vi.fn().mockResolvedValue(undefined);
            seedsTab.onAddSeedBatch = onAddSeedBatch;
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_BATCH_DRAFT',
                partial: {
                    strainName: 'Test Strain',
                    breeder: 'Test Breeder',
                    quantity: 5,
                    acquisitionDate: '2026-01-01',
                    generation: 'F1',
                    parent1Key: 'Parent A||Pheno1',
                    parent2Key: 'Parent B||',
                    notes: 'test',
                },
            });
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await seedsTab.updateComplete;
            await new Promise(resolve => setTimeout(resolve, 0));

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
            expect(sm(seedsTab).activeView).toBe('list');
        });

        it('shows error message when onAddSeedBatch throws', async () => {
            seedsTab.onAddSeedBatch = vi.fn().mockRejectedValue(new Error('Network error'));
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_BATCH_DRAFT',
                partial: {
                    strainName: 'Test',
                    breeder: 'Breeder',
                    quantity: 1,
                    acquisitionDate: '2026-01-01',
                    generation: 'F1',
                },
            });
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            await seedsTab.updateComplete;

            expect(sm(seedsTab).views['add-batch'].sub.kind).toBe('error');
            const sub = sm(seedsTab).views['add-batch'].sub;
            if (sub.kind === 'error') {
                expect(sub.message).toContain('Failed to save');
            }
        });

        it('calls onSeedDataChanged after successful submit', async () => {
            const onSeedDataChanged = vi.fn();
            const onAddSeedBatch = vi.fn().mockResolvedValue(undefined);
            seedsTab.onSeedDataChanged = onSeedDataChanged;
            seedsTab.onAddSeedBatch = onAddSeedBatch;
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_BATCH_DRAFT',
                partial: {
                    strainName: 'S',
                    breeder: 'B',
                    quantity: 1,
                    acquisitionDate: '2026-01-01',
                    generation: 'F1',
                    notes: '',
                },
            });

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(onSeedDataChanged).toHaveBeenCalled();
        });
    });

    describe('Log pollination form', () => {
        beforeEach(async () => {
            (seedsTab as any)._sm = transition(sm(seedsTab), { type: 'BEGIN_LOG_POLLINATION' });
            await seedsTab.updateComplete;
        });

        it('renders log pollination form', () => {
            const form = seedsTab.shadowRoot?.querySelector('.form-view');
            expect(form?.textContent).toContain('Log pollination');
        });

        it('navigates back to list', async () => {
            const backBtn = seedsTab.shadowRoot?.querySelector('.form-header .md3-button') as HTMLElement;
            backBtn?.click();
            await seedsTab.updateComplete;
            expect(sm(seedsTab).activeView).toBe('list');
        });

        it('shows validation error when required fields are missing', async () => {
            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await seedsTab.updateComplete;
            expect(sm(seedsTab).views['log-pollination'].sub.kind).toBe('error');
        });

        it('calls onLogPollination and resets form on success', async () => {
            const onLogPollination = vi.fn().mockResolvedValue(undefined);
            seedsTab.onLogPollination = onLogPollination;
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: {
                    date: '2026-03-20',
                    donorPlantId: 'plant-1',
                    receiverPlantId: 'plant-2',
                    notes: '',
                },
            });
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            await seedsTab.updateComplete;

            expect(onLogPollination).toHaveBeenCalledWith({
                date: '2026-03-20',
                donor_plant_id: 'plant-1',
                receiver_plant_id: 'plant-2',
                notes: '',
            });
            expect(sm(seedsTab).activeView).toBe('list');
        });

        it('shows error when onLogPollination throws', async () => {
            seedsTab.onLogPollination = vi.fn().mockRejectedValue(new Error('fail'));
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: { date: '2026-03-20', donorPlantId: 'p1', receiverPlantId: 'p2' },
            });
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            await seedsTab.updateComplete;

            const sub = sm(seedsTab).views['log-pollination'].sub;
            expect(sub.kind).toBe('error');
            if (sub.kind === 'error') expect(sub.message).toContain('Failed to save');
        });
    });

    describe('Harvest form', () => {
        beforeEach(async () => {
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'BEGIN_HARVEST',
                eventId: 'evt-1',
            });
            await seedsTab.updateComplete;
        });

        it('renders harvest form', () => {
            const form = seedsTab.shadowRoot?.querySelector('.form-view');
            expect(form?.textContent).toContain('Harvest seeds');
        });

        it('navigates back to list and clears eventId', async () => {
            const backBtn = seedsTab.shadowRoot?.querySelector('.form-header .md3-button') as HTMLElement;
            backBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('list');
            expect(sm(seedsTab).views.harvest.eventId).toBe('');
        });

        it('shows validation error when eventId is missing', async () => {
            (seedsTab as any)._sm = {
                ...sm(seedsTab),
                views: { ...sm(seedsTab).views, harvest: { ...sm(seedsTab).views.harvest, eventId: '' } },
            };
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).views.harvest.sub.kind).toBe('error');
        });

        it('calls onHarvestSeeds and resets form on success', async () => {
            const onHarvestSeeds = vi.fn().mockResolvedValue(undefined);
            seedsTab.onHarvestSeeds = onHarvestSeeds;
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_HARVEST_DRAFT',
                partial: { quantity: 15, notes: 'good yield' },
            });
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            await seedsTab.updateComplete;

            expect(onHarvestSeeds).toHaveBeenCalledWith({
                event_id: 'evt-1',
                quantity: 15,
                notes: 'good yield',
            });
            expect(sm(seedsTab).activeView).toBe('list');
            expect(sm(seedsTab).views.harvest.eventId).toBe('');
        });

        it('shows error when onHarvestSeeds throws', async () => {
            seedsTab.onHarvestSeeds = vi.fn().mockRejectedValue(new Error('fail'));
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'UPDATE_HARVEST_DRAFT',
                partial: { quantity: 5, notes: '' },
            });
            await seedsTab.updateComplete;

            const saveBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Save')) as HTMLElement;
            saveBtn?.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            await seedsTab.updateComplete;

            const sub = sm(seedsTab).views.harvest.sub;
            expect(sub.kind).toBe('error');
            if (sub.kind === 'error') expect(sub.message).toContain('Failed to save');
        });

        it('cancel button navigates back to list', async () => {
            (seedsTab as any)._sm = transition(sm(seedsTab), {
                type: 'SAVE_FAILED',
                message: 'some error',
            });
            await seedsTab.updateComplete;

            const cancelBtn = Array.from(seedsTab.shadowRoot?.querySelectorAll('.form-actions button') || [])
                .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
            cancelBtn?.click();
            await seedsTab.updateComplete;

            expect(sm(seedsTab).activeView).toBe('list');
            expect(sm(seedsTab).views.harvest.eventId).toBe('');
        });
    });
});
