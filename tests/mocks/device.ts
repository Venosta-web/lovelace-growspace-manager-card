import { createGrowspaceDevice } from '../../src/services/types';
import type { GrowspaceDevice, IrrigationTank } from '../../src/services/types';
import { GrowspaceType } from '../../src/features/plants/types';
import type { PlantAttributes, PlantEntity } from '../../src/features/plants/types';

export function createMockPlant(overrides: Partial<PlantAttributes> = {}): PlantEntity {
    const base: PlantAttributes = {
        plant_id: 'plant-1',
        entity_id: 'sensor.gorilla_glue_4',
        strain: 'Gorilla Glue',
        phenotype: '#4',
        stage: 'flower',
        row: 1,
        col: 1,
        position: '(1,1)',
        seedling_days: 0,
        mother_days: 0,
        clone_days: 0,
        veg_days: 21,
        flower_days: 14,
        dry_days: 0,
        cure_days: 0,
        seedling_start: null,
        mother_start: null,
        clone_start: null,
        veg_start: '2026-04-01',
        flower_start: '2026-04-22',
        dry_start: null,
        cure_start: null,
        days_since_last_watering: 1,
        last_watered: '2026-05-20',
        friendly_name: 'Gorilla Glue #4',
        ...overrides,
    };
    return {
        entity_id: base.entity_id,
        state: base.stage,
        attributes: base,
        last_changed: '2026-05-20T12:00:00+00:00',
        last_updated: '2026-05-20T12:00:00+00:00',
        context: { id: 'mock', parent_id: null, user_id: null },
    };
}

export function createMockDevice(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
    const plant1 = createMockPlant();
    const plant2 = createMockPlant({
        plant_id: 'plant-2',
        entity_id: 'sensor.blue_dream',
        strain: 'Blue Dream',
        phenotype: '',
        stage: 'veg',
        row: 1,
        col: 2,
        position: '(1,2)',
        veg_days: 35,
        flower_days: 0,
        veg_start: '2026-03-17',
        flower_start: null,
        friendly_name: 'Blue Dream',
    });

    return createGrowspaceDevice({
        deviceId: 'test_tent',
        name: 'Test Tent',
        type: GrowspaceType.NORMAL,
        rows: 2,
        plantsPerRow: 4,
        plants: [plant1, plant2],
        grid: {
            'position_1_1': plant1.attributes,
            'position_1_2': plant2.attributes,
        },
        stats: {
            maxVegDays: 35,
            maxFlowerDays: 14,
            vegWeek: 5,
            flowerWeek: 2,
            maxStageSummary: 'Veg: 35d (W5), Flower: 14d (W2)',
            totalPlants: 2,
        },
        environmentAttributes: {},
        ...overrides,
    });
}

export function createMockTankDevice(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
    const tanks: IrrigationTank[] = [
        {
            sensorEntity: 'sensor.tank_a',
            name: 'Tank A — Veg Mix',
            warningLevel: 20,
            fillLevel: 72,
            isWarning: false,
            hoursRemaining: 18,
            depletionStatus: 'depleting',
            volumeLiters: 100,
        },
        {
            sensorEntity: 'sensor.tank_b',
            name: 'Tank B — Bloom Mix',
            warningLevel: 20,
            fillLevel: 15,
            isWarning: true,
            hoursRemaining: 3,
            depletionStatus: 'depleting',
            volumeLiters: 100,
        },
    ];

    return createMockDevice({
        environmentAttributes: { irrigationTanks: tanks } as any,
        ...overrides,
    });
}
