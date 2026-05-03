import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Mock the child component import to prevent real registration
vi.mock('../../../src/features/plants/containers/plant-card.container', () => {
    return {};
});

// Define our mock component
@customElement('plant-card-container')
class MockPlantCard extends LitElement {
    plant: any;
    row: any;
    col: any;
    forceDraggable: any;

    static get properties() {
        return {
            plant: { type: Object },
            row: { type: Number },
            col: { type: Number },
            forceDraggable: { type: Boolean }
        };
    }
}

import '../../../src/features/plants/components/transplant-source-panel';
import { TransplantSourcePanel } from '../../../src/features/plants/components/transplant-source-panel';

describe('TransplantSourcePanel', () => {
    let element: TransplantSourcePanel;
    const mockPlants = [
        {
            entity_id: 'sensor.plant1',
            attributes: {
                plant_id: 'p1',
                strain: 'Strain A',
                phenotype: 'Pheno 1',
                stage: 'clone',
                growspace_id: 'gs1',
                row: 1,
                col: 1,
                clone_days: 10
            }
        },
        {
            entity_id: 'sensor.plant2',
            attributes: {
                plant_id: 'p2',
                strain: 'Strain B',
                phenotype: 'Pheno 2',
                stage: 'seedling',
                growspace_id: 'gs2',
                row: 2,
                col: 2,
                seedling_days: 5
            }
        }
    ] as any[];

    beforeEach(async () => {
        element = document.createElement('transplant-source-panel') as TransplantSourcePanel;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.restoreAllMocks();
    });

    it('should render empty states initially', async () => {
        element.clonePlants = [];
        element.seedlingPlants = [];
        await element.updateComplete;

        const emptyStates = element.shadowRoot?.querySelectorAll('.empty-state');
        expect(emptyStates?.length).toBe(2);
        expect(emptyStates?.[0].textContent).toBe('No clones available');
        expect(emptyStates?.[1].textContent).toBe('No seedlings available');

        const badges = element.shadowRoot?.querySelectorAll('.count-badge');
        expect(badges?.[0].textContent).toBe('0');
        expect(badges?.[1].textContent).toBe('0');
    });

    it('should render clones and seedlings', async () => {
        element.clonePlants = [mockPlants[0]];
        element.seedlingPlants = [mockPlants[1]];
        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('plant-card-container');
        expect(cards?.length).toBe(2);

        const badges = element.shadowRoot?.querySelectorAll('.count-badge');
        expect(badges?.[0].textContent).toBe('1');
        expect(badges?.[1].textContent).toBe('1');
    });

    it('should handle drag start correctly', async () => {
        element.clonePlants = [mockPlants[0]];
        await element.updateComplete;

        const card = element.shadowRoot?.querySelector('plant-card-container') as HTMLElement;
        const setDataSpy = vi.fn();

        const mockEvent = {
            dataTransfer: {
                setData: setDataSpy,
                effectAllowed: ''
            },
            currentTarget: card
        };

        // Trigger dragstart
        card.dispatchEvent(new CustomEvent('dragstart', {
            detail: {},
            bubbles: true,
            composed: true
        } as any));

        // We need to access the handler directly or simulate the event more accurately?
        // Since it's attached via @dragstart inside the render map, we can trigger it via the element itself
        // But the event needs to be a DragEvent.

        const dragEvent = new Event('dragstart', { bubbles: true, composed: true });
        Object.defineProperty(dragEvent, 'dataTransfer', {
            value: {
                setData: setDataSpy,
                effectAllowed: ''
            }
        });
        Object.defineProperty(dragEvent, 'currentTarget', { value: card });

        card.dispatchEvent(dragEvent);

        expect(setDataSpy).toHaveBeenCalledWith('application/json', JSON.stringify({
            type: 'transplant',
            plant_id: 'p1',
            source_growspace_id: 'gs1',
            strain: 'Strain A',
            phenotype: 'Pheno 1',
            stage: 'clone'
        }));
        expect((dragEvent as any).dataTransfer.effectAllowed).toBe('move');
        expect(card.hasAttribute('dragging')).toBe(true);
    });

    it('should remove dragging attribute on dragend', async () => {
        element.clonePlants = [mockPlants[0]];
        await element.updateComplete;

        const card = element.shadowRoot?.querySelector('plant-card-container') as HTMLElement;

        // Mock dragstart to set attribute
        const dragEvent = new Event('dragstart', { bubbles: true, composed: true });
        Object.defineProperty(dragEvent, 'dataTransfer', {
            value: { setData: vi.fn(), effectAllowed: '' }
        });
        card.dispatchEvent(dragEvent);

        expect(card.hasAttribute('dragging')).toBe(true);

        // Trigger dragend
        card.dispatchEvent(new Event('dragend'));
        expect(card.hasAttribute('dragging')).toBe(false);
    });

    it('should ignore drag start if no dataTransfer', async () => {
        element.clonePlants = [mockPlants[0]];
        await element.updateComplete;

        const card = element.shadowRoot?.querySelector('plant-card-container') as HTMLElement;

        const dragEvent = new Event('dragstart', { bubbles: true, composed: true });
        // No dataTransfer defined
        card.dispatchEvent(dragEvent);

        expect(card.hasAttribute('dragging')).toBe(false);
    });
});
