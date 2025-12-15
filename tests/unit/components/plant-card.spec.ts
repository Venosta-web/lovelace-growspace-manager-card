
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspacePlantCard } from '../../../src/components/plant-card';
import { PlantEntity, PlantStage } from '../../../src/types';

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
    let container: HTMLElement;

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        element = new GrowspacePlantCard();
        container.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.clearAllMocks();
    });

    it('should result in defined element', () => {
        expect(element).toBeInstanceOf(GrowspacePlantCard);
    });

    describe('Rendering & Display Logic', () => {
        it('should resolve correct image from strain library (exact pheno match)', async () => {
            element.plant = {
                attributes: { strain: 'OG Kush', phenotype: '1', plant_id: 'p1' },
                state: 'veg'
            } as any;
            element.strainLibrary = [
                { strain: 'OG Kush', phenotype: '1', key: 'og_1', image: 'og_1.jpg' },
                { strain: 'OG Kush', phenotype: 'default', key: 'og_def', image: 'og_def.jpg' }
            ] as any;

            await element.updateComplete;
            const img = element.shadowRoot?.querySelector('img');
            expect(img?.src).toContain('og_1.jpg');
        });

        it('should fallback to default pheno image', async () => {
            element.plant = {
                attributes: { strain: 'OG Kush', phenotype: '2', plant_id: 'p1' },
                state: 'veg'
            } as any;
            element.strainLibrary = [
                { strain: 'OG Kush', phenotype: 'default', key: 'og_def', image: 'og_def.jpg' }
            ] as any;

            await element.updateComplete;
            const img = element.shadowRoot?.querySelector('img');
            expect(img?.src).toContain('og_def.jpg');
        });

        it('should fallback to any strain image if no default', async () => {
            element.plant = {
                attributes: { strain: 'Amnesia', plant_id: 'p1' },
                state: 'veg'
            } as any;
            element.strainLibrary = [
                { strain: 'Amnesia', phenotype: 'X', key: 'am_x', image: 'am_x.jpg' }
            ] as any;

            await element.updateComplete;
            const img = element.shadowRoot?.querySelector('img');
            expect(img?.src).toContain('am_x.jpg');
        });

        it('should filter stages for Dry/Cure views', async () => {
            element.plant = {
                attributes: {
                    plant_id: 'p1',
                    stage: 'dry',
                    veg_days: 30,
                    dry_days: 5
                },
                state: 'dry'
            } as any;

            await element.updateComplete;

            // Should only show Dry stage
            const stageItems = element.shadowRoot?.querySelectorAll('.pc-stat-item');
            expect(stageItems?.length).toBe(1);
            expect(stageItems?.[0].textContent).toContain('5d');
            expect(stageItems?.[0].querySelector('path')?.getAttribute('d')).toBeTruthy(); // Check icon exists
        });
    });

    describe('Edit Mode & Selection', () => {
        beforeEach(async () => {
            element.plant = { attributes: { plant_id: 'p1' } } as any;
            await element.updateComplete;
        });

        it('should show checkbox in edit mode', async () => {
            element.isEditMode = true;
            await element.updateComplete;
            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox');
            expect(checkbox).toBeTruthy();
        });

        it('should emit selection toggle event', async () => {
            element.isEditMode = true;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('plant-toggle-selection', listener);

            const checkbox = element.shadowRoot?.querySelector('.plant-card-checkbox') as HTMLElement;
            checkbox.click();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.plant).toBe(element.plant);
        });

        it('should prevent drag in edit mode', async () => {
            element.isEditMode = true;
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
            await element.updateComplete;
        });

        it('should handle drag start', async () => {
            const listener = vi.fn();
            element.addEventListener('plant-drag-start', listener);

            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            // Mock dataTransfer
            const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
            const evt = new DragEvent('dragstart', { bubbles: true, cancelable: true });
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
            const evt = new DragEvent('drop', { bubbles: true, cancelable: true });
            card.dispatchEvent(evt);

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toEqual(expect.objectContaining({
                row: 1, col: 2, plant: element.plant
            }));
        });

        it('should remove dragging class on drag end', async () => {
            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
            card.classList.add('dragging');

            const evt = new DragEvent('dragend');
            card.dispatchEvent(evt);

            expect(card.classList.contains('dragging')).toBe(false);
        });
    });

    describe('Mobile Gestures (Touch)', () => {
        beforeEach(async () => {
            element.plant = { attributes: { plant_id: 'p1' }, entity_id: 'sensor.p1' } as any;
            vi.useFakeTimers();
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
            const evt = new TouchEvent('touchstart', { touches: [touch] });
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
            card.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 } as Touch] }));

            // Move significantly (delta > 10)
            card.dispatchEvent(new TouchEvent('touchmove', { touches: [{ clientX: 50, clientY: 50 } as Touch] }));

            vi.advanceTimersByTime(600);

            expect(listener).not.toHaveBeenCalled();
        });

        it('should emit mobile-drop on touch end when dragging', async () => {
            const listener = vi.fn();
            element.addEventListener('mobile-drop', listener);
            const card = element.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;

            // Start & Drag
            card.dispatchEvent(new TouchEvent('touchstart', { touches: [{ clientX: 10, clientY: 10 } as Touch] }));
            vi.advanceTimersByTime(600); // Trigger start

            // End
            card.dispatchEvent(new TouchEvent('touchend', {
                changedTouches: [{ clientX: 100, clientY: 100 } as Touch]
            } as any));

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail).toEqual(expect.objectContaining({
                x: 100, y: 100, plant: element.plant
            }));
            expect(card.classList.contains('dragging-mobile')).toBe(false);
        });
    });
});
