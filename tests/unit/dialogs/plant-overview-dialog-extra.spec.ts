
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlantOverviewDialog } from '../../../src/dialogs/plant-overview-dialog';
import { PlantStage } from '../../../src/features/plants/types';
import { html } from 'lit';

describe('PlantOverviewDialog Extra Coverage', () => {
    let element: PlantOverviewDialog;
    const mockPlant = {
        entity_id: 'plant.blue_dream',
        state: 'Flower',
        attributes: {
            plant_id: 'p1',
            strain: 'Blue Dream',
            phenotype: 'Original',
            stage: PlantStage.FLOWER,
            row: 1,
            col: 1,
            harvest_metrics: {},
            scores: {},
            events: []
        }
    };

    const mockStore = {
        dataService: {
            updateHarvestMetrics: vi.fn().mockResolvedValue({}),
            scorePlant: vi.fn().mockResolvedValue({}),
            takeClone: vi.fn().mockResolvedValue({}),
            advancePlantStage: vi.fn().mockResolvedValue({})
        },
        refreshData: vi.fn().mockResolvedValue({}),
        data: {
            $devices: { get: () => [] }
        }
    };

    beforeEach(async () => {
        element = new PlantOverviewDialog();
        (element as any).store = mockStore;
        element.plant = { ...mockPlant } as any;
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    describe('Harvest Tab', () => {
        beforeEach(async () => {
            element.plant = { ...mockPlant, state: 'Drying' } as any;
            (element as any).editedAttributes = { ...mockPlant.attributes };
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
            const harvestTab = Array.from(tabs || []).find(t => t.textContent?.includes('Scoring'));
            (harvestTab as HTMLElement)?.click();
            await element.updateComplete;
        });

        it('should handle all harvest metric inputs', async () => {
            const fieldIds = [
                { id: '#hm-wet', key: 'wet_weight' },
                { id: '#hm-dry', key: 'dry_weight' },
                { id: '#hm-trim', key: 'trim_weight' },
                { id: '#hm-thc', key: 'thc_percentage' },
                { id: '#hm-cbd', key: 'cbd_percentage' }
            ];

            for (const field of fieldIds) {
                const input = element.shadowRoot?.querySelector(field.id) as HTMLInputElement;
                expect(input).toBeTruthy();
                input.value = '12.5';
                input.dispatchEvent(new Event('input'));
                await element.updateComplete;
                expect((element as any)._harvestMetricsEdit[field.key]).toBe(12.5);

                input.value = '';
                input.dispatchEvent(new Event('input'));
                await element.updateComplete;
                expect((element as any)._harvestMetricsEdit[field.key]).toBeNull();
            }

            // Test textarea
            const terpInput = element.shadowRoot?.querySelector('#hm-terp') as HTMLTextAreaElement;
            expect(terpInput).toBeTruthy();
            terpInput.value = 'Limonene, Myrcene';
            terpInput.dispatchEvent(new Event('input'));
            await element.updateComplete;
            expect((element as any)._harvestMetricsEdit.terpene_profile).toBe('Limonene, Myrcene');
        });

        it('should toggle score stars and allow unselecting', async () => {
            const dimKey = 'vigor';
            const starBtns = element.shadowRoot?.querySelectorAll('.star-btn') || [];
            expect(starBtns.length).toBeGreaterThan(0);

            const thirdStar = starBtns[2] as HTMLElement;

            thirdStar.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            await element.updateComplete;
            expect((element as any)._scoresEdit[dimKey]).toBe(3);

            thirdStar.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            await element.updateComplete;
            expect((element as any)._scoresEdit[dimKey]).toBeNull();
        });

        it('should handle star hover', async () => {
            const starBtns = element.shadowRoot?.querySelectorAll('.star-btn');
            expect(starBtns?.length).toBeGreaterThan(0);

            const thirdStar = starBtns?.[2] as HTMLElement;
            thirdStar.dispatchEvent(new MouseEvent('mouseenter'));
            await element.updateComplete;
            expect((element as any)._starPreview).toBeTruthy();

            thirdStar.dispatchEvent(new MouseEvent('mouseleave'));
            await element.updateComplete;
        });

        it('should save harvest metrics and scores', async () => {
            (element as any)._harvestMetricsEdit = { wet_weight: 100 };
            (element as any)._scoresEdit = { vigor: 5 };
            await element.updateComplete;

            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const saveBtn = buttons.find(b => b.textContent?.includes('Save scores & metrics'));
            expect(saveBtn).toBeTruthy();

            (saveBtn as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            await element.updateComplete;

            let attempts = 0;
            while ((element as any)._savingHarvest && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }

            expect(mockStore.dataService.updateHarvestMetrics).toHaveBeenCalled();
            expect(mockStore.dataService.scorePlant).toHaveBeenCalled();
        });

        it('should handle save error gracefully', async () => {
            (element as any)._harvestMetricsEdit = { wet_weight: 100 };
            mockStore.dataService.updateHarvestMetrics.mockRejectedValueOnce(new Error('Save failed'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const saveBtn = buttons.find(b => b.textContent?.includes('Save scores & metrics'));
            expect(saveBtn).toBeTruthy();

            (saveBtn as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

            let attempts = 0;
            while (attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                if (consoleSpy.mock.calls.length > 0) break;
                attempts++;
            }

            expect(consoleSpy).toHaveBeenCalled();
            expect(alertSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
            alertSpy.mockRestore();
        });

        it('should skip and advance stage', async () => {
            const skipBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Skip'));

            expect(skipBtn).toBeTruthy();

            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (skipBtn as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            await element.updateComplete;

            const found = (dispatchSpy as any).mock.calls.some((call: any) =>
                (call[0] as any).type === 'finish-drying' || (call[0] as any).type === 'harvest-plant'
            );
            expect(found).toBe(true);
        });
    });

    describe('Timeline & Logbook', () => {
        beforeEach(async () => {
            (element as any)._activeTab = 'timeline';
            (element as any).editedAttributes = { ...mockPlant.attributes };
            await element.updateComplete;
        });

        it('should render timeline and fetch logbook', async () => {
            const timeline = element.shadowRoot?.querySelector('plant-timeline');
            expect(timeline).toBeTruthy();

            const fetchSpy = vi.spyOn(element as any, '_fetchLogbook').mockResolvedValue(undefined);
            timeline?.dispatchEvent(new CustomEvent('growspace-refresh'));
            expect(fetchSpy).toHaveBeenCalled();
        });

        it('should filter logbook events correctly including environmental reports', async () => {
            (element as any)._logbookEvents = [
                { category: 'note', plant_id: 'p1', notes: 'Top plant', start_time: '2024-01-01' },
                { category: 'environmental_report', reasons: ['plant_id:p1'], start_time: '2024-01-01' }
            ];
            await element.updateComplete;
            const timeline = element.shadowRoot?.querySelector('plant-timeline') as any;
            expect(timeline).toBeTruthy();
            expect(timeline.events.length).toBeGreaterThan(0);
        });
    });

    describe('Dynamic Actions', () => {
        it('should handle take clone for mother plant', async () => {
            element.plant = { ...mockPlant, state: 'mother', attributes: { ...mockPlant.attributes, stage: PlantStage.MOTHER } } as any;
            (element as any).editedAttributes = { ...element.plant!.attributes };
            (element as any)._activeTab = 'dashboard';
            await element.updateComplete;

            const cloneBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Take Clone') && b.classList.contains('primary'));

            expect(cloneBtn).toBeTruthy();

            const input = element.shadowRoot?.querySelector('#clone-count-input') as any;
            if (input) {
                input.value = '5';
                input.dispatchEvent(new Event('change'));
            }

            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (cloneBtn as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            await element.updateComplete;

            const found = (dispatchSpy as any).mock.calls.some((call: any) => (call[0] as any).type === 'take-clone');
            expect(found).toBe(true);
        });

        it('should handle move clone for clone stage', async () => {
            element.plant = { ...mockPlant, state: 'clone', attributes: { ...mockPlant.attributes, stage: PlantStage.CLONE } } as any;
            (element as any).editedAttributes = { ...element.plant!.attributes };
            (element as any).growspaceOptions = { 'gs1': 'Grow Tent' };
            (element as any).cloneTargetId = 'gs1';
            (element as any)._activeTab = 'dashboard';
            await element.updateComplete;

            const moveBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Move') && b.classList.contains('primary'));

            expect(moveBtn).toBeTruthy();

            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (moveBtn as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            await element.updateComplete;

            const found = (dispatchSpy as any).mock.calls.some((call: any) => (call[0] as any).type === 'move-clone');
            expect(found).toBe(true);
        });

        it('should toggle show all dates', async () => {
            const toggleBtn = element.shadowRoot?.querySelector('button[aria-label="Toggle Dates"]');
            (toggleBtn as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any).showAllDates).toBe(true);
        });

        it('should open label printer', async () => {
            const printBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Print Label') || b.ariaLabel?.includes('Print Label'));

            if (printBtn) {
                const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
                (printBtn as HTMLElement).click();
                expect(dispatchSpy).toHaveBeenCalled();
            }
        });
    });

    describe('Curing State', () => {
        beforeEach(async () => {
            element.plant = { ...mockPlant, state: 'Curing' } as any;
            (element as any).editedAttributes = { ...mockPlant.attributes };
            await element.updateComplete;
        });

        it('should handle skip and advance from curing', async () => {
            // Switch to harvest tab first so we see the skip button
            const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
            const harvestTab = Array.from(tabs || []).find(t => t.textContent?.includes('Scoring'));
            (harvestTab as HTMLElement)?.click();
            await element.updateComplete;

            const skipBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Skip'));

            expect(skipBtn).toBeTruthy();

            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (skipBtn as HTMLElement).click();
            await element.updateComplete;

            const found = (dispatchSpy as any).mock.calls.some((call: any) => (call[0] as any).type === 'harvest-plant');
            expect(found).toBe(true);
        });
    });
});
