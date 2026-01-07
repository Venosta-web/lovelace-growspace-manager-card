
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { GrowspacePlantCard } from '../../../src/components/plant-card';
import { PlantEntity } from '../../../src/types';
import { atom } from 'nanostores';

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
    let mockStore: any;

    // Local atoms
    const $isEditMode = atom<boolean>(false);
    const $selectedPlants = atom<Set<string>>(new Set());

    beforeEach(async () => {
        vi.clearAllMocks();

        // Define mock store
        const $devices = atom<any[]>([]);
        mockStore = {
            ui: {
                $isEditMode,
                $selectedPlants
            },
            data: {
                $devices
            }
        };

        // Reset atoms
        $isEditMode.set(false);
        $selectedPlants.set(new Set());

        if (!customElements.get('growspace-plant-card')) {
            customElements.define('growspace-plant-card', GrowspacePlantCard);
        }

        element = document.createElement('growspace-plant-card') as GrowspacePlantCard;
        (element as any).store = mockStore;
        // set default plant to avoid errors
        element.plant = { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' } as any;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
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

            element.plant = plant;
            element.strainLibrary = strainLibrary;
            document.body.appendChild(element);
            await element.updateComplete;

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

            element.plant = plant;
            element.strainLibrary = strainLibrary;
            document.body.appendChild(element);
            await element.updateComplete;

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

            element.plant = plant;
            element.strainLibrary = strainLibrary;
            document.body.appendChild(element);
            await element.updateComplete;

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

            element.plant = plant;
            document.body.appendChild(element);
            await element.updateComplete;

            // Should only show Dry stage
            const stats = element.shadowRoot?.querySelector('growspace-plant-stats');
            expect(stats).toBeTruthy();
            await (stats as any).updateComplete;

            const stageItems = stats?.shadowRoot?.querySelectorAll('.pc-stat-item');
            expect(stageItems?.length).toBe(1);
            expect(stageItems?.[0].textContent).toContain('5d');
        });
    });

    describe('Edit Mode & Selection', () => {
        beforeEach(() => {
            element.plant = { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' } as any;
            document.body.appendChild(element);
        });

        it('should show checkbox in edit mode', async () => {
            $isEditMode.set(true);
            await element.requestUpdate();
            await element.updateComplete;
            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox');
            expect(checkbox).toBeTruthy();
        });

        it('should emit selection toggle event', async () => {
            $isEditMode.set(true);
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
            $isEditMode.set(true);
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
        beforeEach(async () => {
            element.plant = { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' } as any;
            document.body.appendChild(element);
            await element.updateComplete;
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
            element.plant = plant;
            document.body.appendChild(element);
            await element.updateComplete;
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
        beforeEach(async () => {
            element.plant = { attributes: { plant_id: 'p1' }, state: 'veg' } as any;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should focus on the card element', async () => {
            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            const focusSpy = vi.spyOn(card, 'focus');

            element.focus();

            expect(focusSpy).toHaveBeenCalled();
        });

        it('should emit plant-click event on card click', async () => {
            const listener = vi.fn();
            element.addEventListener('plant-click', listener);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            card.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.plant).toBe(element.plant);
        });

        it('should show selected checkbox in edit mode when selected', async () => {
            const plant = { attributes: { plant_id: 'selected_plant' }, state: 'veg' } as any;
            element.plant = plant;
            $isEditMode.set(true);
            $selectedPlants.set(new Set(['selected_plant']));

            await element.requestUpdate();
            await element.updateComplete;

            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox.selected');
            expect(checkbox).toBeTruthy();
        });

        it('should return null displayData when plant is missing', async () => {
            // Create new element without plant
            const emptyEl = document.createElement('growspace-plant-card') as GrowspacePlantCard;
            (emptyEl as any).store = mockStore;
            document.body.appendChild(emptyEl);
            await emptyEl.updateComplete;

            expect(emptyEl.displayData).toBeNull();
            document.body.removeChild(emptyEl);
        });

        it('should fallback to host focus if card content is missing', async () => {
            // Create element with no plant -> renders empty (no .plant-card-rich)
            const emptyEl = document.createElement('growspace-plant-card') as GrowspacePlantCard;
            (emptyEl as any).store = mockStore;
            document.body.appendChild(emptyEl);
            await emptyEl.updateComplete;

            const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
            emptyEl.focus();

            // Should call super.focus() which is HTMLElement.prototype.focus
            expect(focusSpy).toHaveBeenCalled();
            document.body.removeChild(emptyEl);
            focusSpy.mockRestore();
        });
    });

    describe('Image Handling', () => {
        it('should generate srcset for WebP images', async () => {
            const plant = {
                attributes: { strain: 'WebP Strain', plant_id: 'p1' },
                state: 'veg'
            } as any;
            const strainLibrary = [
                { strain: 'WebP Strain', image: 'test_image.webp' }
            ] as any;

            element.plant = plant;
            element.strainLibrary = strainLibrary;
            document.body.appendChild(element);
            await element.updateComplete;

            const img = element.shadowRoot?.querySelector('img');
            expect(img).toBeTruthy();
            expect(img?.src).toContain('test_image.webp');
            expect(img?.getAttribute('srcset')).toContain('test_image_small.webp 320w');
            expect(img?.getAttribute('srcset')).toContain('test_image.webp 1024w');
        });

        it('should not render image if no match found', async () => {
            const plant = {
                attributes: { strain: 'Unknown Strain', plant_id: 'p1' },
                state: 'veg'
            } as any;

            element.plant = plant;
            // No matching library entry
            element.strainLibrary = [];

            document.body.appendChild(element);
            await element.updateComplete;

            const img = element.shadowRoot?.querySelector('img');
            expect(img).toBeNull();
        });
    });

    describe('_hasRecommendedPreset getter', () => {
        it('should return false if plant is null', async () => {
            element.plant = null as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if store is null', async () => {
            element.plant = { attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg' } } as any;
            (element as any).store = null;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if device has no nutrient presets', async () => {
            const $devices = atom<any[]>([{ device_id: 'gs1', name: 'Test', nutrient_presets: null }]);
            mockStore.data.$devices = $devices;

            element.plant = { attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg' } } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if no preset matches current stage', async () => {
            const $devices = atom<any[]>([{
                device_id: 'gs1',
                name: 'Test',
                nutrient_presets: {
                    'flower1': { id: 'flower1', stage: 'flower', nutrients: [] }
                }
            }]);
            mockStore.data.$devices = $devices;

            element.plant = { attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg' } } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return false if stage matches but min_days_in_stage not met', async () => {
            const $devices = atom<any[]>([{
                device_id: 'gs1',
                name: 'Test',
                nutrient_presets: {
                    'veg_late': { id: 'veg_late', stage: 'veg', min_days_in_stage: 20, nutrients: [] }
                }
            }]);
            mockStore.data.$devices = $devices;

            element.plant = {
                attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg', days_in_stage: 10 }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(false);
        });

        it('should return true if preset matches stage with no min_days requirement', async () => {
            const $devices = atom<any[]>([{
                device_id: 'gs1',
                name: 'Test',
                nutrient_presets: {
                    'veg_basic': { id: 'veg_basic', stage: 'veg', nutrients: [] }
                }
            }]);
            mockStore.data.$devices = $devices;

            element.plant = {
                attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg', days_in_stage: 5 }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(true);
        });

        it('should return true if preset matches stage and min_days_in_stage is met', async () => {
            const $devices = atom<any[]>([{
                device_id: 'gs1',
                name: 'Test',
                nutrient_presets: {
                    'veg_late': { id: 'veg_late', stage: 'veg', min_days_in_stage: 10, nutrients: [] }
                }
            }]);
            mockStore.data.$devices = $devices;

            element.plant = {
                attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg', days_in_stage: 15 }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(true);
        });

        it('should handle missing days_in_stage attribute (defaults to 0)', async () => {
            const $devices = atom<any[]>([{
                device_id: 'gs1',
                name: 'Test',
                nutrient_presets: {
                    'veg_late': { id: 'veg_late', stage: 'veg', min_days_in_stage: 1, nutrients: [] }
                }
            }]);
            mockStore.data.$devices = $devices;

            element.plant = {
                attributes: { plant_id: 'p1', growspace_id: 'gs1', stage: 'veg' }  // no days_in_stage
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            expect(element._hasRecommendedPreset).toBe(false);  // 0 < 1
        });
    });
});
