import { describe, it, expect } from 'vitest';
import {
    isGrowspaceOverviewEntity,
    isPlantEntity,
    getGrowspaceOverview,
    getPlantEntity,
} from '../../../src/adapters/hass-types';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { GrowspaceOverviewEntity, PlantEntity } from '../../../src/types';

describe('hass-types', () => {
    describe('isGrowspaceOverviewEntity', () => {
        it('should return true for valid growspace overview entity', () => {
            const entity = {
                entity_id: 'sensor.test_growspace',
                state: 'active',
                attributes: {
                    growspace_id: 'test_growspace',
                    friendly_name: 'Test Growspace',
                },
            } as GrowspaceOverviewEntity;

            expect(isGrowspaceOverviewEntity(entity)).toBe(true);
        });

        it('should return false for entity without growspace_id', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
                attributes: {
                    friendly_name: 'Test Sensor',
                },
            } as HassEntity;

            expect(isGrowspaceOverviewEntity(entity)).toBe(false);
        });

        it('should return false for undefined entity', () => {
            expect(isGrowspaceOverviewEntity(undefined)).toBe(false);
        });

        it('should return false for entity without attributes', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
            } as HassEntity;

            expect(isGrowspaceOverviewEntity(entity)).toBe(false);
        });
    });

    describe('isPlantEntity', () => {
        it('should return true for valid plant entity', () => {
            const entity = {
                entity_id: 'sensor.test_plant',
                state: 'flowering',
                attributes: {
                    plant_id: 'plant_123',
                    strain: 'Blue Dream',
                    growspace_id: 'test_growspace',
                },
            } as PlantEntity;

            expect(isPlantEntity(entity)).toBe(true);
        });

        it('should return false for entity without plant_id', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
                attributes: {
                    strain: 'Blue Dream',
                },
            } as any;

            expect(isPlantEntity(entity)).toBe(false);
        });

        it('should return false for entity without strain', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
                attributes: {
                    plant_id: 'plant_123',
                },
            } as any;

            expect(isPlantEntity(entity)).toBe(false);
        });

        it('should return false for undefined entity', () => {
            expect(isPlantEntity(undefined)).toBe(false);
        });

        it('should return false for entity without attributes', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
            } as HassEntity;

            expect(isPlantEntity(entity)).toBe(false);
        });
    });

    describe('getGrowspaceOverview', () => {
        it('should return growspace overview entity when valid', () => {
            const entity = {
                entity_id: 'sensor.test_growspace',
                state: 'active',
                attributes: {
                    growspace_id: 'test_growspace',
                    friendly_name: 'Test Growspace',
                },
            } as GrowspaceOverviewEntity;

            const hass = {
                states: {
                    'sensor.test_growspace': entity,
                },
            } as any;

            const result = getGrowspaceOverview(hass, 'sensor.test_growspace');
            expect(result).toBe(entity);
        });

        it('should return undefined for non-growspace entity', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
                attributes: {
                    friendly_name: 'Test Sensor',
                },
            } as HassEntity;

            const hass = {
                states: {
                    'sensor.test': entity,
                },
            } as any;

            const result = getGrowspaceOverview(hass, 'sensor.test');
            expect(result).toBeUndefined();
        });

        it('should return undefined for non-existent entity', () => {
            const hass = {
                states: {},
            } as any;

            const result = getGrowspaceOverview(hass, 'sensor.nonexistent');
            expect(result).toBeUndefined();
        });
    });

    describe('getPlantEntity', () => {
        it('should return plant entity when valid', () => {
            const entity = {
                entity_id: 'sensor.test_plant',
                state: 'flowering',
                attributes: {
                    plant_id: 'plant_123',
                    strain: 'Blue Dream',
                    growspace_id: 'test_growspace',
                },
            } as PlantEntity;

            const hass = {
                states: {
                    'sensor.test_plant': entity,
                },
            } as any;

            const result = getPlantEntity(hass, 'sensor.test_plant');
            expect(result).toBe(entity);
        });

        it('should return undefined for non-plant entity', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
                attributes: {
                    friendly_name: 'Test Sensor',
                },
            } as HassEntity;

            const hass = {
                states: {
                    'sensor.test': entity,
                },
            } as any;

            const result = getPlantEntity(hass, 'sensor.test');
            expect(result).toBeUndefined();
        });

        it('should return undefined for non-existent entity', () => {
            const hass = {
                states: {},
            } as any;

            const result = getPlantEntity(hass, 'sensor.nonexistent');
            expect(result).toBeUndefined();
        });

        it('should return undefined for entity with only plant_id', () => {
            const entity = {
                entity_id: 'sensor.test',
                state: 'on',
                attributes: {
                    plant_id: 'plant_123',
                },
            } as any;

            const hass = {
                states: {
                    'sensor.test': entity,
                },
            } as any;

            const result = getPlantEntity(hass, 'sensor.test');
            expect(result).toBeUndefined();
        });
    });
});
