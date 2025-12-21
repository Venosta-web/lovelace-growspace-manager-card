import { describe, it, expect, beforeAll } from 'vitest';
import {
    PlantClickEvent,
    AddPlantClickEvent,
    PlantDropEvent,
    SelectionChangedEvent,
    UpdatePlantEvent,
    DeletePlantEvent,
    HarvestPlantEvent,
    FinishDryingEvent,
    TakeCloneEvent,
    MoveCloneEvent,
    LibraryExportReadyEvent
} from '../../src/events';
import { PlantEntity } from '../../src/types';

// Mock DragEvent for jsdom
beforeAll(() => {
    if (!(globalThis as any).DragEvent) {
        (globalThis as any).DragEvent = class extends Event {
            dataTransfer: DataTransfer | null = null;
            constructor(type: string, init?: any) {
                super(type, init);
                if (init?.dataTransfer) {
                    this.dataTransfer = init.dataTransfer;
                }
            }
        } as any;
    }
});

describe('Events', () => {
    const mockPlant: PlantEntity = {
        entity_id: 'sensor.plant_test',
        context: { id: '', parent_id: null, user_id: null },
        attributes: {},
        state: 'Vegetative',
        last_changed: '',
        last_updated: ''
    } as any;

    describe('PlantClickEvent', () => {
        it('should create event with correct type and detail', () => {
            const event = new PlantClickEvent(mockPlant);

            expect(event.type).toBe('plant-click');
            expect(event.detail.plant).toEqual(mockPlant);
            expect(event.bubbles).toBe(true);
            expect(event.composed).toBe(true);
        });
    });

    describe('AddPlantClickEvent', () => {
        it('should create event with row and col', () => {
            const event = new AddPlantClickEvent(2, 3);

            expect(event.type).toBe('add-plant-click');
            expect(event.detail.row).toBe(2);
            expect(event.detail.col).toBe(3);
            expect(event.bubbles).toBe(true);
            expect(event.composed).toBe(true);
        });
    });

    describe('PlantDropEvent', () => {
        it('should create event with all drop details', () => {
            const dragEvent = new DragEvent('dragstart');
            const targetPlant = { ...mockPlant, entity_id: 'sensor.target' };
            const sourcePlant = { ...mockPlant, entity_id: 'sensor.source' };

            const event = new PlantDropEvent(dragEvent, 1, 2, targetPlant, sourcePlant);

            expect(event.type).toBe('plant-drop');
            expect(event.detail.originalEvent).toBe(dragEvent);
            expect(event.detail.targetRow).toBe(1);
            expect(event.detail.targetCol).toBe(2);
            expect(event.detail.targetPlant).toEqual(targetPlant);
            expect(event.detail.sourcePlant).toEqual(sourcePlant);
        });

        it('should handle null values', () => {
            const event = new PlantDropEvent(null, 0, 0, null, null);

            expect(event.detail.originalEvent).toBeNull();
            expect(event.detail.targetPlant).toBeNull();
            expect(event.detail.sourcePlant).toBeNull();
        });
    });

    describe('SelectionChangedEvent', () => {
        it('should create event with selection set', () => {
            const selection = new Set(['plant1', 'plant2']);
            const event = new SelectionChangedEvent(selection);

            expect(event.type).toBe('selection-changed');
            expect(event.detail.selectedPlants).toBe(selection);
        });
    });

    describe('UpdatePlantEvent', () => {
        it('should create event with update attributes', () => {
            const updates = {
                entity_id: 'sensor.plant_test',
                name: 'Updated Plant',
                strain_id: 'strain123'
            };
            const event = new UpdatePlantEvent(updates);

            expect(event.type).toBe('update-plant');
            expect(event.detail).toEqual(updates);
        });
    });

    describe('DeletePlantEvent', () => {
        it('should create event with plant ID', () => {
            const event = new DeletePlantEvent('plant123');

            expect(event.type).toBe('delete-plant');
            expect(event.detail.plantId).toBe('plant123');
        });
    });

    describe('HarvestPlantEvent', () => {
        it('should create event with plant', () => {
            const event = new HarvestPlantEvent(mockPlant);

            expect(event.type).toBe('harvest-plant');
            expect(event.detail.plant).toEqual(mockPlant);
        });
    });

    describe('FinishDryingEvent', () => {
        it('should create event with plant', () => {
            const event = new FinishDryingEvent(mockPlant);

            expect(event.type).toBe('finish-drying');
            expect(event.detail.plant).toEqual(mockPlant);
        });
    });

    describe('TakeCloneEvent', () => {
        it('should create event with plant and clone count', () => {
            const event = new TakeCloneEvent(mockPlant, 5);

            expect(event.type).toBe('take-clone');
            expect(event.detail.plant).toEqual(mockPlant);
            expect(event.detail.numClones).toBe(5);
        });
    });

    describe('MoveCloneEvent', () => {
        it('should create event with plant and target growspace', () => {
            const event = new MoveCloneEvent(mockPlant, 'growspace_veg');

            expect(event.type).toBe('move-clone');
            expect(event.detail.plant).toEqual(mockPlant);
            expect(event.detail.targetGrowspace).toBe('growspace_veg');
        });
    });

    describe('LibraryExportReadyEvent', () => {
        it('should create event with export URL', () => {
            const url = 'blob:http://localhost:8080/export.json';
            const event = new LibraryExportReadyEvent(url);

            expect(event.type).toBe('library-export-ready');
            expect(event.detail.url).toBe(url);
        });
    });
});
