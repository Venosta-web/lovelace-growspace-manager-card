// tests/mocks/hass.ts

export interface MockHassOptions {
    growspaceName?: string;
    rows?: number;
    cols?: number;
}

export const createMockHass = (options: MockHassOptions = {}) => {
    const { growspaceName = '4x4 Tent', rows = 4, cols = 4 } = options;
    const growspaceId = growspaceName.toLowerCase().replace(/ /g, '_');

    // 1. Generate the Growspace Overview Sensor (mimics behavior in sensor.py)
    const overviewEntityId = `sensor.${growspaceId}`;
    const overviewState = createGrowspaceOverviewState(overviewEntityId, growspaceName, rows, cols);

    // 2. Generate Binary Sensors (mimics binary_sensor.py)
    const stressEntityId = `binary_sensor.${growspaceId}_plants_under_stress`;
    const moldEntityId = `binary_sensor.${growspaceId}_high_mold_risk`;
    const optimalEntityId = `binary_sensor.${growspaceId}_optimal_conditions`;

    // 3. Generate Plant Entities from Grid
    const plantEntities = createPlantEntities(overviewState.attributes.grid, growspaceId);

    return {
        states: {
            // The main overview sensor your card likely binds to
            [overviewEntityId]: overviewState,

            // Associated binary sensors
            [stressEntityId]: {
                entity_id: stressEntityId,
                state: 'off',
                attributes: {
                    friendly_name: `${growspaceName} Plants Under Stress`,
                    reasons: []
                }
            },
            [moldEntityId]: {
                entity_id: moldEntityId,
                state: 'on', // Simulate a warning state
                attributes: {
                    friendly_name: `${growspaceName} High Mold Risk`,
                    reasons: ['Humidity High (65%)', 'Circulation Fan Off']
                }
            },
            [optimalEntityId]: {
                entity_id: optimalEntityId,
                state: 'off',
                attributes: {
                    friendly_name: `${growspaceName} Optimal Conditions`,
                    reasons: ['High Mold Risk', 'Humidity High (65%)']
                }
            },

            // Standard HA User
            'person.admin': {
                entity_id: 'person.admin',
                state: 'home',
                attributes: { friendly_name: 'Admin' }
            },

            // Plant Entities
            ...plantEntities
        },
        // Mock service calls to verify card actions (e.g. add_plant)
        callService: async (domain: string, service: string, data: any) => {
            console.log(`[MockHass] Service Called: ${domain}.${service}`, data);

            if (domain === 'growspace_manager' && service === 'get_strain_library') {
                return Promise.resolve({
                    response: {
                        "Gorilla Glue": {
                            meta: { breeder: "GG Strains", type: "Hybrid" },
                            phenotypes: {
                                "#4": { description: "Sticky and pungent", image_path: "/local/gg4.jpg" }
                            }
                        },
                        "Blue Dream": {
                            meta: { breeder: "Humboldt", type: "Sativa" },
                            phenotypes: {
                                "": { description: "Sweet berry aroma", image_path: "/local/bd.jpg" }
                            }
                        }
                    }
                });
            }

            return Promise.resolve();
        },
        connection: {
            subscribeEvents: () => (() => { }), // No-op unsubscribe
            sendMessagePromise: (msg: any) => {
                console.log(`[MockHass] sendMessagePromise:`, msg);
                if (msg.type === 'call_service' && msg.domain === 'growspace_manager' && msg.service === 'get_strain_library') {
                    return Promise.resolve({
                        response: {
                            "Gorilla Glue": {
                                meta: { breeder: "GG Strains", type: "Hybrid" },
                                phenotypes: {
                                    "#4": { description: "Sticky and pungent", image_path: "/local/gg4.jpg" }
                                }
                            },
                            "Blue Dream": {
                                meta: { breeder: "Humboldt", type: "Sativa" },
                                phenotypes: {
                                    "": { description: "Sweet berry aroma", image_path: "/local/bd.jpg" }
                                }
                            }
                        }
                    });
                }
                return Promise.resolve();
            },
        },
        localize: (key: string) => `[${key}]`, // Dummy localization
        themes: { darkMode: true, theme: 'default' },
        language: 'en',
        resources: {
            en: {
                "state.binary_sensor.on": "On",
                "state.binary_sensor.off": "Off"
            }
        }
    };
};

/**
 * Helper to generate the complex 'grid' attribute structure 
 * defined in custom_components/growspace_manager/sensor.py
 */
const createGrowspaceOverviewState = (entity_id: string, name: string, rows: number, cols: number) => {
    const grid: Record<string, any> = {};
    let plantCount = 0;

    // Initialize empty grid
    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
            grid[`position_${r}_${c}`] = null;
        }
    }

    // Add a mock plant at 1,1 (mimics PlantEntity structure)
    grid['position_1_1'] = {
        plant_id: 'mock_plant_uuid_1',
        strain: 'Gorilla Glue',
        phenotype: '#4',
        veg_days: 21,
        flower_days: 0,
        row: 1,
        col: 1,
        position: '(1,1)',
        stage: 'veg'
    };
    plantCount++;

    // Add a mock plant at 2,2
    grid['position_2_2'] = {
        plant_id: 'mock_plant_uuid_2',
        strain: 'Blue Dream',
        phenotype: '',
        veg_days: 45,
        flower_days: 12,
        row: 2,
        col: 2,
        position: '(2,2)',
        stage: 'flower'
    };
    plantCount++;

    return {
        entity_id: entity_id,
        state: plantCount.toString(), // State is total plants
        attributes: {
            friendly_name: name,
            growspace_id: name.toLowerCase().replace(/ /g, '_'),
            rows: rows,
            plants_per_row: cols,
            total_plants: plantCount,
            notification_target: 'mobile_app_test',
            max_veg_days: 45,
            max_flower_days: 12,
            veg_week: 7,
            flower_week: 2,
            max_stage_summary: 'Veg: 45d (W7), Flower: 12d (W2)',
            grid: grid, // <--- This is what your card iterates over
            irrigation_times: [],
            drain_times: []
        }
    };
};

const createPlantEntities = (grid: Record<string, any>, growspaceId: string) => {
    const entities: Record<string, any> = {};
    Object.values(grid).forEach((slot: any) => {
        if (slot) {
            const entityId = `sensor.${slot.strain.toLowerCase().replace(/ /g, '_')}_${slot.phenotype.replace(/#/g, '').toLowerCase()}`;
            entities[entityId] = {
                entity_id: entityId,
                state: slot.stage, // Use the stage from the slot (e.g. 'flower', 'veg')
                attributes: {
                    ...slot,
                    growspace_id: growspaceId,
                    friendly_name: `${slot.strain} ${slot.phenotype}`
                }
            };
        }
    });
    return entities;
};