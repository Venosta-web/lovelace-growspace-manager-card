
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
            undo: vi.fn(),
            redo: vi.fn(),
            canUndo: true,
            canRedo: false,
            context: { id: 'mock-ctx' }
        };

        dispatcher = new ActionDispatcher(mockStore);
    });

    describe('Plant Actions', () => {
        const mockPlant = { attributes: { plant_id: 'p1' } } as PlantEntity;

        it('should delegate update to plantActions', () => {
            dispatcher.plant.update('p1', { strain: 'OG' });
            expect(plantActions.updatePlant).toHaveBeenCalledWith(mockStore.context, 'p1', { strain: 'OG' });
        });

        it('should delegate delete to plantActions', () => {
            dispatcher.plant.delete('p1');
            expect(plantActions.handleDeletePlant).toHaveBeenCalledWith(mockStore.context, 'p1');
        });

        it('should delegate move to plantActions', () => {
            dispatcher.plant.move(mockPlant, 'gs2');
            expect(plantActions.movePlantToGrowspace).toHaveBeenCalledWith(mockStore.context, mockPlant, 'gs2');
        });

        it('should delegate drop to plantActions', () => {
            dispatcher.plant.drop(1, 2, null, mockPlant);
            expect(plantActions.handlePlantDrop).toHaveBeenCalledWith(mockStore.context, 1, 2, null, mockPlant);
        });

        it('should delegate nextStage to plantActions', () => {
            dispatcher.plant.nextStage(mockPlant);
            expect(plantActions.movePlantToNextStage).toHaveBeenCalledWith(mockStore.context, mockPlant);
        });

        it('should delegate takeClone to plantActions', () => {
            dispatcher.plant.takeClone(mockPlant, 5, 'gs2');
            expect(plantActions.takeClone).toHaveBeenCalledWith(mockStore.context, mockPlant, 5, 'gs2');
        });

        it('should delegate updateFromDialog to plantActions', () => {
            const state = { some: 'state' };
            dispatcher.plant.updateFromDialog(state);
            expect(plantActions.updatePlantFromDialog).toHaveBeenCalledWith(mockStore.context, state);
        });

        it('should delegate add to plantActions', () => {
            dispatcher.plant.add('gs1', 0, 0, 'strain', 'pheno');
            expect(plantActions.confirmAddPlant).toHaveBeenCalledWith(
                mockStore.context,
                { row: 0, col: 0, strain: 'strain', phenotype: 'pheno' }
            );
        });

        it('should delegate addBatch to plantActions', () => {
            const detail = { count: 5 };
            dispatcher.plant.addBatch(detail);
            expect(plantActions.confirmAddPlants).toHaveBeenCalledWith(mockStore.context, detail);
        });
    });

    describe('Growspace Actions', () => {
        it('should delegate add to strainActions', () => {
            const detail = { name: 'New Tent', rows: 4, plants_per_row: 2 };
            dispatcher.growspace.add(detail);
            expect(strainActions.addGrowspace).toHaveBeenCalledWith(mockStore.context, 'New Tent', 4, 2, undefined);
        });

        it('should delegate update to strainActions', () => {
            const detail = { growspace_id: 'gs1', name: 'Updated', rows: 4, plants_per_row: 2 };
            dispatcher.growspace.update(detail);
            expect(strainActions.updateGrowspace).toHaveBeenCalledWith(mockStore.context, 'gs1', 'Updated', 4, 2);
        });

        it('should delegate remove to strainActions', () => {
            dispatcher.growspace.remove('gs1');
            expect(strainActions.removeGrowspace).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });
    });

    describe('Strain Actions', () => {
        it('should delegate add to strainActions', () => {
            const data = { strain: 'New Strain' };
            dispatcher.strain.add(data);
            expect(strainActions.addStrain).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate remove to strainActions', () => {
            dispatcher.strain.remove('strain-key');
            expect(strainActions.removeStrain).toHaveBeenCalledWith(mockStore.context, 'strain-key');
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
