import { PlantEntity, PlantOverviewEditedAttributes } from './types';

export class DeviceChangeEvent extends CustomEvent<{ deviceId: string }> {
    static readonly TYPE = 'growspace-changed';
    constructor(deviceId: string) {
        super(DeviceChangeEvent.TYPE, {
            detail: { deviceId },
            bubbles: true,
            composed: true,
        });
    }
}

export class ToggleEnvGraphEvent extends CustomEvent<{ metric: string }> {
    static readonly TYPE = 'toggle-env-graph';
    constructor(metric: string) {
        super(ToggleEnvGraphEvent.TYPE, {
            detail: { metric },
            bubbles: true,
            composed: true,
        });
    }
}

export class LinkGraphsEvent extends CustomEvent<{ metric1: string; metric2: string }> {
    static readonly TYPE = 'link-graphs';
    constructor(metric1: string, metric2: string) {
        super(LinkGraphsEvent.TYPE, {
            detail: { metric1, metric2 },
            bubbles: true,
            composed: true,
        });
    }
}

export class UnlinkGraphsEvent extends CustomEvent<{ groupIndex: number }> {
    static readonly TYPE = 'unlink-graphs';
    constructor(groupIndex: number) {
        super(UnlinkGraphsEvent.TYPE, {
            detail: { groupIndex },
            bubbles: true,
            composed: true,
        });
    }
}

export class TriggerActionEvent extends CustomEvent<{ action: string }> {
    static readonly TYPE = 'trigger-action';
    constructor(action: string) {
        super(TriggerActionEvent.TYPE, {
            detail: { action },
            bubbles: true,
            composed: true,
        });
    }
}

export class RangeChangeEvent extends CustomEvent<{ range: '1h' | '6h' | '24h' | '7d' }> {
    static readonly TYPE = 'range-change';
    constructor(range: '1h' | '6h' | '24h' | '7d') {
        super(RangeChangeEvent.TYPE, {
            detail: { range },
            bubbles: true,
            composed: true,
        });
    }
}

export class UnlinkGraphMetricEvent extends CustomEvent<{ metric: string }> {
    static readonly TYPE = 'unlink-graph';
    constructor(metric: string) {
        super(UnlinkGraphMetricEvent.TYPE, {
            detail: { metric },
            bubbles: true,
            composed: true,
        });
    }
}

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

declare global {
    interface HTMLElementEventMap {
        [DeviceChangeEvent.TYPE]: DeviceChangeEvent;
        [ToggleEnvGraphEvent.TYPE]: ToggleEnvGraphEvent;
        [LinkGraphsEvent.TYPE]: LinkGraphsEvent;
        [UnlinkGraphsEvent.TYPE]: UnlinkGraphsEvent;
        [TriggerActionEvent.TYPE]: TriggerActionEvent;
        [RangeChangeEvent.TYPE]: RangeChangeEvent;
        [UnlinkGraphMetricEvent.TYPE]: UnlinkGraphMetricEvent;
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
    }
}
