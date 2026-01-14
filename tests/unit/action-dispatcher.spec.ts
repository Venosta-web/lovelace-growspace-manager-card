
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionDispatcher } from '../../src/store/action-dispatcher';
import * as plantActions from '../../src/store/plant-actions';
import * as strainActions from '../../src/store/strain-actions';
import { PlantEntity } from '../../src/types';

// Mock dependencies
vi.mock('../../src/store/plant-actions');
vi.mock('../../src/store/strain-actions');

describe('ActionDispatcher', () => {
    let mockStore: any;
    let dispatcher: ActionDispatcher;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // comprehensive mock of IGrowspaceStore
        mockStore = {
            updatePlant: vi.fn(),
            handleDeletePlant: vi.fn(),
            movePlantToGrowspace: vi.fn(),
            handleDrop: vi.fn(),
            handleMovePlantToNextStage: vi.fn(),
            handleTakeClone: vi.fn(),
            confirmAddPlants: vi.fn(),
            handleAddGrowspace: vi.fn(),
            handleUpdateGrowspace: vi.fn(),
            addStrain: vi.fn(),
            removeStrain: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn(),
            canUndo: true,
            canRedo: false,
            plantActionContext: { id: 'plant-ctx' },
            growspaceActionContext: { id: 'gs-ctx' }
        };

        dispatcher = new ActionDispatcher(mockStore);
    });

    describe('Plant Actions', () => {
        const mockPlant = { attributes: { plant_id: 'p1' } } as PlantEntity;

        it('should delegate update to store', () => {
            dispatcher.plant.update('p1', { strain: 'OG' });
            expect(mockStore.updatePlant).toHaveBeenCalledWith('p1', { strain: 'OG' });
        });

        it('should delegate delete to store', () => {
            dispatcher.plant.delete('p1');
            expect(mockStore.handleDeletePlant).toHaveBeenCalledWith('p1');
        });

        it('should delegate move to store', () => {
            dispatcher.plant.move(mockPlant, 'gs2');
            expect(mockStore.movePlantToGrowspace).toHaveBeenCalledWith(mockPlant, 'gs2');
        });

        it('should delegate drop to store', () => {
            dispatcher.plant.drop(1, 2, null, mockPlant);
            expect(mockStore.handleDrop).toHaveBeenCalledWith(1, 2, null, mockPlant);
        });

        it('should delegate nextStage to store', () => {
            dispatcher.plant.nextStage(mockPlant);
            expect(mockStore.handleMovePlantToNextStage).toHaveBeenCalledWith(mockPlant);
        });

        it('should delegate takeClone to store', () => {
            dispatcher.plant.takeClone(mockPlant, 5);
            expect(mockStore.handleTakeClone).toHaveBeenCalledWith(mockPlant, 5);
        });

        it('should delegate updateFromDialog to plantActions with context', () => {
            const state = { some: 'state' };
            dispatcher.plant.updateFromDialog(state);
            expect(plantActions.updatePlantsFromDialog).toHaveBeenCalledWith(
                mockStore.plantActionContext,
                state
            );
        });

        it('should delegate add to plantActions with context', () => {
            dispatcher.plant.add('gs1', 0, 0, 'strain', 'pheno');
            expect(plantActions.addPlant).toHaveBeenCalledWith(
                mockStore.plantActionContext,
                'gs1', 0, 0, 'strain', { phenotype: 'pheno' }
            );
        });

        it('should delegate addBatch to store', () => {
            const detail = { count: 5 };
            dispatcher.plant.addBatch(detail);
            expect(mockStore.confirmAddPlants).toHaveBeenCalledWith(detail);
        });
    });

    describe('Growspace Actions', () => {
        it('should delegate add to store', () => {
            const detail = { name: 'New Tent' };
            dispatcher.growspace.add(detail);
            expect(mockStore.handleAddGrowspace).toHaveBeenCalledWith(detail);
        });

        it('should delegate update to store', () => {
            const detail = { id: 'gs1', name: 'Updated' };
            dispatcher.growspace.update(detail);
            expect(mockStore.handleUpdateGrowspace).toHaveBeenCalledWith(detail);
        });

        it('should delegate remove to strainActions with context', () => {
            dispatcher.growspace.remove('gs1');
            expect(strainActions.removeGrowspace).toHaveBeenCalledWith(
                mockStore.growspaceActionContext,
                'gs1'
            );
        });
    });

    describe('Strain Actions', () => {
        it('should delegate add to store', () => {
            const data = { strain: 'New Strain' };
            dispatcher.strain.add(data);
            expect(mockStore.addStrain).toHaveBeenCalledWith(data);
        });

        it('should delegate remove to store', () => {
            dispatcher.strain.remove('strain-key');
            expect(mockStore.removeStrain).toHaveBeenCalledWith('strain-key');
        });
    });

    describe('History Actions', () => {
        it('should delegate undo to store', () => {
            dispatcher.history.undo();
            expect(mockStore.undo).toHaveBeenCalled();
        });

        it('should delegate redo to store', () => {
            dispatcher.history.redo();
            expect(mockStore.redo).toHaveBeenCalled();
        });

        it('should expose canUndo from store', () => {
            expect(dispatcher.history.canUndo()).toBe(true);
        });

        it('should expose canRedo from store', () => {
            expect(dispatcher.history.canRedo()).toBe(false);
        });
    });
});
