
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { LitElement } from 'lit';
import { GrowspacePlantCard } from '../../../src/components/plant-card';
import { PlantEntity, PlantStage } from '../../../src/types';
import * as uiStore from '../../../src/store/ui-store';

// Mock ui-store
vi.mock('../../../src/store/ui-store', () => ({
    $activeDialog: { get: vi.fn(() => ({ type: 'NONE' })), set: vi.fn(), subscribe: vi.fn() },
    $focusedPlantIndex: { get: vi.fn(() => -1), set: vi.fn(), subscribe: vi.fn() },
    $selectedPlants: { get: vi.fn(() => new Set()), set: vi.fn(), subscribe: vi.fn() },
    $isEditMode: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $viewMode: { get: vi.fn(() => 'standard'), set: vi.fn(), subscribe: vi.fn() },
    $isCompactView: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $isLoading: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    $defaultApplied: { get: vi.fn(() => false), set: vi.fn(), subscribe: vi.fn() },
    setEditMode: vi.fn(),
    setViewMode: vi.fn(),
    setIsLoading: vi.fn(),
    closeDialog: vi.fn(),
    setDefaultApplied: vi.fn(),
    setFocusedPlantIndex: vi.fn(),
    togglePlantSelection: vi.fn(),
    selectAllPlants: vi.fn(),
    clearPlantSelection: vi.fn(),
    setMenuOpen: vi.fn(),
    showToast: vi.fn(),
    $notification: { set: vi.fn() }
}));

// Mock shared styles
vi.mock('../../../src/styles/shared.styles', () => ({
    sharedStyles: { cssText: '' }
}));
vi.mock('../../../src/styles/variables', () => ({
    variables: { cssText: '' }
}));

// Polyfill DragEvent
if (!globalThis.DragEvent) {
    Object.defineProperty(globalThis, 'DragEvent', {
        value: class DragEvent extends Event {
            public dataTransfer: any;
            constructor(type: string, eventInitDict: any = {}) {
                super(type, eventInitDict);
                this.dataTransfer = eventInitDict.dataTransfer || {
                    setData: vi.fn(),
                    getData: vi.fn(),
                    effectAllowed: 'none',
                    dropEffect: 'none'
                };
            }
        }
    });
}

describe('PlantCard', () => {
    let element: GrowspacePlantCard;

    beforeEach(async () => {
        // Reset mocks to default values
        (uiStore.$isEditMode.get as any).mockReturnValue(false);
        (uiStore.$selectedPlants.get as any).mockReturnValue(new Set());

        element = await fixture(html`<growspace-plant-card></growspace-plant-card>`);
    });

    afterEach(() => {
        vi.clearAllMocks();
        // fixture handles DOM cleanup automatically
    });

    it('should result in defined element', () => {
        expect(element).toBeInstanceOf(GrowspacePlantCard);
    });

    describe('Rendering & Display Logic', () => {
        it('should resolve correct image from strain library (exact pheno match)', async () => {
            const plant = {
                attributes: { strain: 'OG Kush', phenotype: '1', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'OG Kush', phenotype: '1', key: 'og_1', image: 'og_1.jpg' },
                { strain: 'OG Kush', phenotype: 'default', key: 'og_def', image: 'og_def.jpg' }
            ] as any;

            element = await fixture(html`
                <growspace-plant-card 
                    .plant=${plant} 
                    .strainLibrary=${strainLibrary}
                ></growspace-plant-card>
            `);

            const img = element.shadowRoot?.querySelector('img');
            expect(img?.src).toContain('og_1.jpg');
        });

        it('should fallback to default pheno image', async () => {
            const plant = {
                attributes: { strain: 'OG Kush', phenotype: '2', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'OG Kush', phenotype: 'default', key: 'og_def', image: 'og_def.jpg' }
            ] as any;

            element = await fixture(html`
                <growspace-plant-card 
                    .plant=${plant} 
                    .strainLibrary=${strainLibrary}
                ></growspace-plant-card>
            `);

            const img = element.shadowRoot?.querySelector('img');
            expect(img?.src).toContain('og_def.jpg');
        });

        it('should fallback to any strain image if no default', async () => {
            const plant = {
                attributes: { strain: 'Amnesia', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'Amnesia', phenotype: 'X', key: 'am_x', image: 'am_x.jpg' }
            ] as any;

            element = await fixture(html`
                <growspace-plant-card 
                    .plant=${plant} 
                    .strainLibrary=${strainLibrary}
                    ></growspace-plant-card>
            `);

            const img = element.shadowRoot?.querySelector('img');
            expect(img?.src).toContain('am_x.jpg');
        });

        it('should filter stages for Dry/Cure views', async () => {
            const plant = {
                attributes: {
                    plant_id: 'p1',
                    stage: 'dry',
                    veg_days: 30,
                    dry_days: 5
                },
                state: 'dry'
            } as any;

            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);

            // Should only show Dry stage
            const stats = element.shadowRoot?.querySelector('growspace-plant-stats');
            expect(stats).toBeTruthy();
            await (stats as any).updateComplete;

            const stageItems = stats?.shadowRoot?.querySelectorAll('.pc-stat-item');
            expect(stageItems?.length).toBe(1);
            expect(stageItems?.[0].textContent).toContain('5d');
            expect(stageItems?.[0].querySelector('path')?.getAttribute('d')).toBeTruthy(); // Check icon exists
        });
    });

    describe('Edit Mode & Selection', () => {
        beforeEach(async () => {
            element = await fixture(html`
                <growspace-plant-card .plant=${{ attributes: { plant_id: 'p1' } } as any}></growspace-plant-card>
            `);
        });

        it('should show checkbox in edit mode', async () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            await element.requestUpdate();
            await element.updateComplete;
            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox');
            expect(checkbox).toBeTruthy();
        });

        it('should emit selection toggle event', async () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            await element.requestUpdate();
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('plant-toggle-selection', listener);

            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox') as HTMLElement;
            checkbox.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.plant).toBe(element.plant);
        });

        it('should prevent drag in edit mode', async () => {
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            await element.requestUpdate();
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('plant-drag-start', listener);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            const evt = new DragEvent('dragstart');
            card.dispatchEvent(evt);

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('Drag & Drop (Desktop)', () => {
        const plant = { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' } as any;

        beforeEach(async () => {
            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);
        });

        it('should handle drag start', async () => {
            const listener = vi.fn();
            element.addEventListener('plant-drag-start', listener);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            // Mock dataTransfer
            const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
            const evt = new DragEvent('dragstart', { bubbles: true, cancelable: true, composed: true });
            Object.defineProperty(evt, 'dataTransfer', { value: dataTransfer });

            card.dispatchEvent(evt);

            expect(listener).toHaveBeenCalled();
            expect(card.classList.contains('dragging')).toBe(true);
            expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', JSON.stringify({ id: 'sensor.p1' }));
        });

        it('should handle drop', async () => {
            const listener = vi.fn();
            element.addEventListener('plant-drop', listener);
            element.row = 1; element.col = 2;

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            const evt = new DragEvent('drop', { bubbles: true, cancelable: true, composed: true });
            card.dispatchEvent(evt);

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toEqual(expect.objectContaining({
                row: 1, col: 2, plant: element.plant
            }));
        });

        it('should remove dragging class on drag end', async () => {
            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            card.classList.add('dragging');

            const evt = new DragEvent('dragend', { bubbles: true, composed: true });
            card.dispatchEvent(evt);

            expect(card.classList.contains('dragging')).toBe(false);
        });
    });

    describe('Mobile Gestures (Touch)', () => {
        const plant = { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' } as any;

        beforeEach(async () => {
            vi.useFakeTimers();
            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should trigger mobile drag start after long press', async () => {
            const listener = vi.fn();
            element.addEventListener('mobile-drag-start', listener);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;

            // Touch Start
            const touch = { clientX: 10, clientY: 10 } as Touch;
            const evt = new TouchEvent('touchstart', { touches: [touch], bubbles: true, composed: true });
            card.dispatchEvent(evt);

            // Wait for timer
            vi.advanceTimersByTime(600);

            expect(listener).toHaveBeenCalled();
            expect(card.classList.contains('dragging-mobile')).toBe(true);
        });

        it('should cancel long press on significant movement', async () => {
            const listener = vi.fn();
            element.addEventListener('mobile-drag-start', listener);
            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;

            // Start
            card.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 } as Touch], bubbles: true, composed: true }));

            // Move significantly (delta > 10)
            card.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 50, clientY: 50 } as Touch], bubbles: true, composed: true }));

            vi.advanceTimersByTime(600);

            expect(listener).not.toHaveBeenCalled();
        });

        it('should emit mobile-drop on touch end when dragging', async () => {
            const listener = vi.fn();
            element.addEventListener('mobile-drop', listener);
            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;

            // Start & Drag
            card.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 } as Touch], bubbles: true, composed: true }));
            vi.advanceTimersByTime(600); // Trigger start

            // End
            card.dispatchEvent(new TouchEvent('touchend', {
                changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
                bubbles: true,
                composed: true
            } as any));

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toEqual(expect.objectContaining({
                x: 100, y: 100, plant: element.plant
            }));
            expect(card.classList.contains('dragging-mobile')).toBe(false);
        });
    });

    describe('Additional Coverage Tests', () => {
        it('should focus on the card element', async () => {
            const plant = { attributes: { plant_id: 'p1' }, state: 'veg' } as any;
            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            const focusSpy = vi.spyOn(card, 'focus');

            element.focus();

            expect(focusSpy).toHaveBeenCalled();
        });

        it('should fallback to super.focus if no card element', async () => {
            element = await fixture(html`<growspace-plant-card></growspace-plant-card>`);
            // No plant, so no card rendered
            const superFocusSpy = vi.spyOn(LitElement.prototype, 'focus');

            element.focus();

            expect(superFocusSpy).toHaveBeenCalled();
        });

        it('should emit plant-click event on card click', async () => {
            const plant = { attributes: { plant_id: 'p1' }, state: 'veg' } as any;
            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);

            const listener = vi.fn();
            element.addEventListener('plant-click', listener);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            card.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.plant).toBe(plant);
        });

        it('should generate srcset for WebP images', async () => {
            const plant = {
                attributes: { strain: 'WebP Test', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'WebP Test', phenotype: 'default', key: 'webp_test', image: '/images/test.webp' }
            ] as any;

            element = await fixture(html`
                <growspace-plant-card 
                    .plant=${plant} 
                    .strainLibrary=${strainLibrary}
                ></growspace-plant-card>
            `);

            const img = element.shadowRoot?.querySelector('img');
            expect(img?.srcset).toContain('_small.webp');
            expect(img?.srcset).toContain('320w');
            expect(img?.srcset).toContain('1024w');
        });

        it('should not generate srcset for non-WebP images', async () => {
            const plant = {
                attributes: { strain: 'JPG Test', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'JPG Test', phenotype: 'default', key: 'jpg_test', image: '/images/test.jpg' }
            ] as any;

            element = await fixture(html`
                <growspace-plant-card 
                    .plant=${plant} 
                    .strainLibrary=${strainLibrary}
                ></growspace-plant-card>
            `);

            const img = element.shadowRoot?.querySelector('img');
            expect(img?.srcset).toBe('');
        });

        it('should render pheno when present', async () => {
            const plant = {
                attributes: { strain: 'Pheno Test', phenotype: 'Purple', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'Pheno Test', phenotype: 'Purple', key: 'pt_p', image: 'pt.jpg' }
            ] as any;

            element = await fixture(html`
                <growspace-plant-card 
                    .plant=${plant} 
                    .strainLibrary=${strainLibrary}
                ></growspace-plant-card>
            `);

            const phenoElement = element.shadowRoot?.querySelector('.pc-pheno');
            expect(phenoElement?.textContent).toBe('Purple');
        });

        it('should show selected checkbox in edit mode when selected', async () => {
            const plant = { attributes: { plant_id: 'selected_plant' }, state: 'veg' } as any;
            (uiStore.$isEditMode.get as any).mockReturnValue(true);
            (uiStore.$selectedPlants.get as any).mockReturnValue(new Set(['selected_plant']));

            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);

            await element.requestUpdate();
            await element.updateComplete;

            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox.selected');
            expect(checkbox).toBeTruthy();
        });

        it('should return null displayData when plant is missing', async () => {
            element = await fixture(html`<growspace-plant-card></growspace-plant-card>`);
            expect(element.displayData).toBeNull();
        });

        it('should render unknown state when plant.state is missing', async () => {
            const plant = {
                attributes: { strain: 'Unknown', plant_id: 'p1' }
            } as any; // No state

            element = await fixture(html`
                <growspace-plant-card .plant=${plant}></growspace-plant-card>
            `);

            const stageEl = element.shadowRoot?.querySelector('.pc-stage');
            expect(stageEl?.textContent).toBe('Unknown');
        });
    });
});
