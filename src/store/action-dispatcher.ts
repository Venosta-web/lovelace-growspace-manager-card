
import * as plantActions from './plant-actions';
import * as strainActions from './strain-actions';
import { PlantEntity, StrainEntry } from '../types';

interface IGrowspaceStore {
    updatePlant(id: string, updates: Partial<PlantEntity['attributes']>): Promise<void>;
    handleDeletePlant(id: string | string[]): Promise<void>;
    movePlantToGrowspace(plant: PlantEntity, growspace: string): Promise<boolean>;
    handleDrop(row: number, col: number, target: PlantEntity | null, source: PlantEntity | null): Promise<boolean>;
    handleMovePlantToNextStage(plant: PlantEntity): Promise<boolean>;
    handleTakeClone(mother: PlantEntity, num?: number): Promise<boolean>;
    confirmAddPlants(detail: any): Promise<void>;
    handleAddGrowspace(detail: any): Promise<void>;
    handleUpdateGrowspace(detail: any): Promise<void>;
    addStrain(data: Partial<StrainEntry>): Promise<void>;
    removeStrain(key: string): Promise<void>;
    undo(): Promise<void>;
    redo(): Promise<void>;
    canUndo: boolean;
    canRedo: boolean;
    plantActionContext: any;
    growspaceActionContext: any;
}

export class ActionDispatcher {
    constructor(private store: IGrowspaceStore) { }

    public readonly plant = {
        update: (id: string, updates: Partial<PlantEntity['attributes']>) =>
            this.store.updatePlant(id, updates),

        delete: (id: string | string[]) =>
            this.store.handleDeletePlant(id),

        move: (plant: PlantEntity, growspace: string) =>
            this.store.movePlantToGrowspace(plant, growspace),

        drop: (row: number, col: number, target: PlantEntity | null, source: PlantEntity | null) =>
            this.store.handleDrop(row, col, target, source),

        nextStage: (plant: PlantEntity) =>
            this.store.handleMovePlantToNextStage(plant),

        takeClone: (mother: PlantEntity, num?: number) =>
            this.store.handleTakeClone(mother, num),

        // These use the store's private context getter, which we'll need to expose or access differently.
        // For now, we delegate back to store methods or access context if public.
        // Assuming we keep delegation for methods that require complex store state (like undo stack).

        updateFromDialog: (state: any) =>
            plantActions.updatePlantsFromDialog(this.store.plantActionContext, state),

        add: (gid: string, r: number, c: number, s: string, p?: string) =>
            plantActions.addPlant(this.store.plantActionContext, gid, r, c, s, p),

        addBatch: (detail: any) =>
            this.store.confirmAddPlants(detail)
    };

    public readonly growspace = {
        add: (detail: any) => this.store.handleAddGrowspace(detail),
        update: (detail: any) => this.store.handleUpdateGrowspace(detail),
        remove: (id: string) => strainActions.removeGrowspace(this.store.growspaceActionContext, id)
    };

    public readonly strain = {
        add: (data: Partial<StrainEntry>) => this.store.addStrain(data),
        remove: (key: string) => this.store.removeStrain(key)
    };

    public readonly history = {
        undo: () => this.store.undo(),
        redo: () => this.store.redo(),
        canUndo: () => this.store.canUndo,
        canRedo: () => this.store.canRedo
    };
}
