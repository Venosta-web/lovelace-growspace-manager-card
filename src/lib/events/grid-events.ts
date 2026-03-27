import type { PlantEntity } from '../../features/plants/types';

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
