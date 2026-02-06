
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionDispatcher } from '../../src/store/core/action-dispatcher';
import * as plantActions from '../../src/store/plant/plant-actions';
import * as strainActions from '../../src/store/plant/strain-actions';
import * as uiActions from '../../src/store/ui/ui-actions';
import { PlantEntity } from '../../src/types';

// Mock dependencies with explicit factories
vi.mock('../../src/store/plant/plant-actions', () => ({
    updatePlant: vi.fn(),
    handleDeletePlant: vi.fn(),
    movePlantToGrowspace: vi.fn(),
    handlePlantDrop: vi.fn(),
    movePlantToNextStage: vi.fn(),
    takeClone: vi.fn(),
    updatePlantFromDialog: vi.fn(),
    confirmAddPlant: vi.fn(),
    confirmAddPlants: vi.fn()
}));

vi.mock('../../src/store/plant/strain-actions', () => ({
    addGrowspace: vi.fn(),
    updateGrowspace: vi.fn(),
    removeGrowspace: vi.fn(),
    addStrain: vi.fn(),
    removeStrain: vi.fn()
}));

vi.mock('../../src/store/ui/ui-actions', () => ({
    togglePlantSelection: vi.fn(),
    handlePlantClick: vi.fn(),
    openAddPlantDialog: vi.fn(),
    selectAllPlants: vi.fn()
}));

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
            const state = { some: 'state' } as any;
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
            const detail = { count: 5 } as any;
            dispatcher.plant.addBatch(detail);
            expect(plantActions.confirmAddPlants).toHaveBeenCalledWith(mockStore.context, detail);
        });
    });

    describe('Growspace Actions', () => {
        it('should delegate add to strainActions', () => {
            const detail = { name: 'New Tent', rows: 4, plantsPerRow: 2, notificationService: 'gs' };
            dispatcher.growspace.add(detail);
            expect(strainActions.addGrowspace).toHaveBeenCalledWith(mockStore.context, 'New Tent', 4, 2, 'gs');
        });

        it('should delegate update to strainActions', () => {
            const detail = { growspaceId: 'gs1', name: 'Updated', rows: 4, plantsPerRow: 2 };
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

    describe('UI Actions', () => {
        const mockPlant = { attributes: { plant_id: 'p1' } } as PlantEntity;

        it('should delegate togglePlantSelection to uiActions', () => {
            dispatcher.ui.togglePlantSelection('p1');
            expect(uiActions.togglePlantSelection).toHaveBeenCalledWith(mockStore.context, 'p1');
        });

        it('should delegate handlePlantClick to uiActions', () => {
            dispatcher.ui.handlePlantClick(mockPlant);
            expect(uiActions.handlePlantClick).toHaveBeenCalledWith(mockStore.context, mockPlant);
        });

        it('should delegate openAddPlantDialog to uiActions', () => {
            dispatcher.ui.openAddPlantDialog(1, 2);
            expect(uiActions.openAddPlantDialog).toHaveBeenCalledWith(mockStore.context, 1, 2);
        });

        it('should delegate selectAllPlants to uiActions', () => {
            dispatcher.ui.selectAllPlants();
            expect(uiActions.selectAllPlants).toHaveBeenCalledWith(mockStore.context);
        });
    });
});
