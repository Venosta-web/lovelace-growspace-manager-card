// Plant-related events
export * from './plant-events';

// Grid/interaction events
export * from './grid-events';

// Library events
export * from './library-events';

// Global event map declaration
import {
  PlantClickEvent,
  AddPlantClickEvent,
  UpdatePlantEvent,
  DeletePlantEvent,
  HarvestPlantEvent,
  FinishDryingEvent,
  TakeCloneEvent,
  MoveCloneEvent,
} from './plant-events';
import { PlantDropEvent, SelectionChangedEvent } from './grid-events';
import { LibraryExportReadyEvent } from './library-events';

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
