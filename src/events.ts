import { PlantEntity, PlantOverviewEditedAttributes } from './types';



export class PlantClickEvent extends CustomEvent<{ plant: PlantEntity }> {
  static readonly TYPE = 'plant-click';
  constructor(plant: PlantEntity) {
    super(PlantClickEvent.TYPE, {
      detail: { plant },
      bubbles: true,
      composed: true,
    });
  }
}

export class AddPlantClickEvent extends CustomEvent<{ row: number; col: number }> {
  static readonly TYPE = 'add-plant-click';
  constructor(row: number, col: number) {
    super(AddPlantClickEvent.TYPE, {
      detail: { row, col },
      bubbles: true,
      composed: true,
    });
  }
}

export class PlantDropEvent extends CustomEvent<{
  originalEvent: DragEvent | null;
  targetRow: number;
  targetCol: number;
  targetPlant: PlantEntity | null;
  sourcePlant: PlantEntity | null;
}> {
  static readonly TYPE = 'plant-drop';
  constructor(
    originalEvent: DragEvent | null,
    targetRow: number,
    targetCol: number,
    targetPlant: PlantEntity | null,
    sourcePlant: PlantEntity | null
  ) {
    super(PlantDropEvent.TYPE, {
      detail: { originalEvent, targetRow, targetCol, targetPlant, sourcePlant },
      bubbles: true,
      composed: true,
    });
  }
}

export class SelectionChangedEvent extends CustomEvent<{ selectedPlants: Set<string> }> {
  static readonly TYPE = 'selection-changed';
  constructor(selectedPlants: Set<string>) {
    super(SelectionChangedEvent.TYPE, {
      detail: { selectedPlants },
      bubbles: true,
      composed: true,
    });
  }
}

export class UpdatePlantEvent extends CustomEvent<PlantOverviewEditedAttributes> {
  static readonly TYPE = 'update-plant';
  constructor(updates: PlantOverviewEditedAttributes) {
    super(UpdatePlantEvent.TYPE, {
      detail: updates,
      bubbles: true,
      composed: true,
    });
  }
}

export class DeletePlantEvent extends CustomEvent<{ plantId: string }> {
  static readonly TYPE = 'delete-plant';
  constructor(plantId: string) {
    super(DeletePlantEvent.TYPE, {
      detail: { plantId },
      bubbles: true,
      composed: true,
    });
  }
}

export class HarvestPlantEvent extends CustomEvent<{ plant: PlantEntity }> {
  static readonly TYPE = 'harvest-plant';
  constructor(plant: PlantEntity) {
    super(HarvestPlantEvent.TYPE, {
      detail: { plant },
      bubbles: true,
      composed: true,
    });
  }
}

export class FinishDryingEvent extends CustomEvent<{ plant: PlantEntity }> {
  static readonly TYPE = 'finish-drying';
  constructor(plant: PlantEntity) {
    super(FinishDryingEvent.TYPE, {
      detail: { plant },
      bubbles: true,
      composed: true,
    });
  }
}

export class TakeCloneEvent extends CustomEvent<{ plant: PlantEntity; numClones: number }> {
  static readonly TYPE = 'take-clone';
  constructor(plant: PlantEntity, numClones: number) {
    super(TakeCloneEvent.TYPE, {
      detail: { plant, numClones },
      bubbles: true,
      composed: true,
    });
  }
}

export class MoveCloneEvent extends CustomEvent<{ plant: PlantEntity; targetGrowspace: string }> {
  static readonly TYPE = 'move-clone';
  constructor(plant: PlantEntity, targetGrowspace: string) {
    super(MoveCloneEvent.TYPE, {
      detail: { plant, targetGrowspace },
      bubbles: true,
      composed: true,
    });
  }
}

export class LibraryExportReadyEvent extends CustomEvent<{ url: string }> {
  static readonly TYPE = 'library-export-ready';
  constructor(url: string) {
    super(LibraryExportReadyEvent.TYPE, {
      detail: { url },
      bubbles: true,
      composed: true,
    });
  }
}

declare global {
  interface HTMLElementEventMap {
    [PlantClickEvent.TYPE]: PlantClickEvent;
    [AddPlantClickEvent.TYPE]: AddPlantClickEvent;
    [PlantDropEvent.TYPE]: PlantDropEvent;
    [SelectionChangedEvent.TYPE]: SelectionChangedEvent;
    [UpdatePlantEvent.TYPE]: UpdatePlantEvent;
    [DeletePlantEvent.TYPE]: DeletePlantEvent;
    [HarvestPlantEvent.TYPE]: HarvestPlantEvent;
    [FinishDryingEvent.TYPE]: FinishDryingEvent;
    [TakeCloneEvent.TYPE]: TakeCloneEvent;
    [MoveCloneEvent.TYPE]: MoveCloneEvent;
    [LibraryExportReadyEvent.TYPE]: LibraryExportReadyEvent;
  }
}

