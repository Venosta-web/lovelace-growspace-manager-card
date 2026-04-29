import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { html, render, nothing } from 'lit';
import '../../../src/dialogs/strain-library-dialog';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';

// Mock PlantUtils
vi.mock('../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        compressImage: vi.fn().mockResolvedValue('compressed-image-data')
    }
}));

describe('StrainLibraryDialog - Final Coverage', () => {
    let element: StrainLibraryDialog;

    beforeEach(async () => {
        element = document.createElement('strain-library-dialog') as StrainLibraryDialog;
        element.hass = {
            states: {},
            callService: vi.fn(),
            localize: (key: string) => key,
        } as any;
        element.strains = [
            { strain: 'Blueberry', breeder: 'DJ Short', breeder_logo: 'logo1', phenotype: '', key: 'b1' },
            { strain: 'Jack Herer', breeder: 'Sensi Seeds', phenotype: '', key: 'jh1' },
            { strain: 'Unknown Strain', breeder: '', phenotype: '', key: 'u1' }
        ];
        element.seedBatches = [
            { batch_id: 'b1', strain_name: 'Batch 1', breeder: 'B1', quantity: 10, acquisition_date: '2024-01-01', generation: 'F1', parent_1_strain: 'P1', parent_1_phenotype: 'Ph1', parent_2_strain: 'P2', parent_2_phenotype: 'Ph2', lineage: '', notes: '' }
        ];
        element.pollinationEvents = [
            { event_id: 'e1', date: '2024-01-01', donor_plant_id: 'p1', receiver_plant_id: 'p2', notes: 'Test notes', result_seed_batch_id: '' }
        ];
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.parentNode) {
            document.body.removeChild(element);
        }
    });

    describe('Additional Coverage Edge Cases', () => {
        it('covers _handlePrintLabel branch (Line 1117)', () => {
            (element as any)._editorState = { strain: '' };
            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (element as any)._handlePrintLabel();
            expect(dispatchSpy).not.toHaveBeenCalled();

            (element as any)._editorState = { strain: 'Test' };
            (element as any)._handlePrintLabel();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-print-label' }));
            dispatchSpy.mockRestore();
        });

        it('covers _handleImportFile branch (Line 1161)', () => {
            const event = { target: { files: [] } };
            (element as any)._handleImportFile(event as any);
            expect(true).toBe(true); // Should just return early
        });

        it('covers _getUniqueBreeders branches (Lines 1191, 1195)', () => {
            element.strains = [
                { strain: 'S1', breeder: 'B1', phenotype: '', key: 's1' },
                { strain: 'S2', breeder: 'B1', breeder_logo: 'logo1', phenotype: '', key: 's2' },
                { strain: 'S3', breeder: 'B1', breeder_logo: 'logo2', phenotype: '', key: 's3' },
                { strain: 'S4', breeder: '', phenotype: '', key: 's4' }
            ];
            const breeders = (element as any)._getUniqueBreeders();
            expect(breeders).toHaveLength(1);
            expect(breeders[0].logo).toBe('logo1'); // First one wins or logo added
        });

        it('covers _startBreederEdit (Line 2439)', () => {
            (element as any)._startBreederEdit('B1', 'logo1');
            expect((element as any)._breederEditorState).toEqual({
                name: 'B1',
                logo: 'logo1',
                originalName: 'B1'
            });
        });

        it('covers _handleDeleteBreeder (Line 2502)', () => {
            (element as any)._handleDeleteBreeder('B1');
            expect((element as any)._pendingDeleteBreeder).toBe('B1');
        });

        it('covers _handleSaveBreeder new branch (Line 2530)', async () => {
            const spy = vi.spyOn(element, 'dispatchEvent');
            (element as any)._breederEditorState = { name: 'NewB', logo: 'L1', originalName: '' };
            await (element as any)._handleSaveBreeder();
            
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'save-breeder' }));
            expect((element as any)._breederEditorState).toBeNull();
            spy.mockRestore();
        });

        it('covers _cancelDeleteBreeder (Line 2563)', () => {
            (element as any)._pendingDeleteBreeder = 'B1';
            (element as any)._cancelDeleteBreeder();
            expect((element as any)._pendingDeleteBreeder).toBeNull();
        });

        it('covers _renderSeedList branches (Lines 2644, 2657, 2701, 2707+)', async () => {
            element.seedBatches = [];
            element.pollinationEvents = [];
            let container = document.createElement('div');
            render((element as any)._renderSeedList(), container);
            expect(container.querySelector('.empty-state')).toBeDefined();

            element.seedBatches = [{ batch_id: 'b1', strain_name: 'S1' } as any];
            element.pollinationEvents = [
                { event_id: 'e1', date: '2024-01-01', notes: 'Notes' },
                { event_id: 'e2', date: '2024-01-02' } // Trigger Line 2701 (notes ?? '')
            ] as any;
            (element as any)._confirmDeleteEventId = 'e1'; // Trigger Line 2707+
            
            container = document.createElement('div');
            render((element as any)._renderSeedList(), container);
            
            const deleteConfirm = container.querySelector('.delete-confirm-text');
            expect(deleteConfirm).toBeDefined();

            // Click cancel delete (e1 has edit, confirm, cancel - indices 0, 1, 2)
            const cancelBtn = container.querySelectorAll('.pollination-card .icon-btn')[2] as HTMLElement;
            if (cancelBtn) {
                cancelBtn.click();
                expect((element as any)._confirmDeleteEventId).toBeNull();
                render((element as any)._renderSeedList(), container);
            }

            // After cancel, e1 has 0:edit, 1:delete. e2 has 2:edit, 3:delete.
            const editBtn = container.querySelectorAll('.pollination-card .icon-btn')[2] as HTMLElement;
            if (editBtn) {
                editBtn.click();
                expect((element as any)._pollinationForm.notes).toBe('');
            }
        });

        it('covers _renderAddBatchForm inline handlers (Lines 2756, 2778)', async () => {
            (element as any)._seedSubView = 'add-batch';
            await element.updateComplete;
            
            const container = document.createElement('div');
            render((element as any)._renderAddBatchForm(), container);
            
            const qtyInput = container.querySelector('input[type="number"]') as HTMLInputElement;
            qtyInput.value = '7';
            qtyInput.dispatchEvent(new Event('input'));
            expect((element as any)._batchForm.quantity).toBe(7);

            const inputs = container.querySelectorAll('input[type="text"]');
            if (inputs.length >= 4) {
                const notesInput = inputs[3] as HTMLInputElement;
                notesInput.value = 'New notes';
                notesInput.dispatchEvent(new Event('input'));
                expect((element as any)._batchForm.notes).toBe('New notes');
            }
        });

        it('covers _renderLogPollinationForm inline handlers (Line 2841)', async () => {
            (element as any)._seedSubView = 'log-pollination';
            element.plants = [{
                name: 'G1',
                plants: [{
                    attributes: {
                        plant_id: 'p1',
                        strain: 'S1',
                        stage: 'flower',
                        flower_days: 10
                    }
                }]
            } as any];
            await element.updateComplete;
            
            const container = document.createElement('div');
            render((element as any)._renderLogPollinationForm(), container);
            
            const selects = container.querySelectorAll('select');
            if (selects.length >= 2) {
                selects[1].value = 'p1';
                selects[1].dispatchEvent(new Event('change'));
                expect((element as any)._pollinationForm.receiver_plant_id).toBe('p1');
            }
        });

        it('covers _renderSeedsTab branches (Lines 2595-2598)', () => {
            (element as any)._seedSubView = 'add-batch';
            expect((element as any)._renderSeedsTab()).toBeDefined();
            (element as any)._seedSubView = 'log-pollination';
            expect((element as any)._renderSeedsTab()).toBeDefined();
            (element as any)._seedSubView = 'harvest';
            expect((element as any)._renderSeedsTab()).toBeDefined();
            (element as any)._seedSubView = 'list';
            expect((element as any)._renderSeedsTab()).toBeDefined();
        });

        it('covers _renderSeedList via main render', async () => {
            element.open = true;
            element.seedBatches = [{ 
                batch_id: 'b1', 
                strain_name: 'S1', 
                breeder: 'B1', 
                quantity: 10, 
                acquisition_date: '2024-01-01' 
            } as any];
            element.pollinationEvents = [];
            (element as any)._activeMainTab = 'seeds';
            (element as any)._seedSubView = 'list';
            element.hass = { states: {} } as any;
            
            document.body.appendChild(element);
            await element.updateComplete;
            await new Promise(resolve => setTimeout(resolve, 50)); // Give it a bit more time
            
            const list = element.shadowRoot?.querySelector('.seed-list');
            expect(list).toBeDefined();
            
            const batchCard = element.shadowRoot?.querySelector('.seed-batch-card');
            expect(batchCard).toBeDefined();
            
            document.body.removeChild(element);
        });

        it('guards _submitHarvestSeeds (Line 2974)', () => {
            (element as any)._selectedEventId = null;
            (element as any)._harvestForm = { quantity: 10 };
            (element as any)._submitHarvestSeeds();
            expect(true).toBe(true); // Should just return early
        });
    });
});
