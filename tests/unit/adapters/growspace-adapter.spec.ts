import { describe, it, expect } from 'vitest';
import { GrowspaceAdapter } from '../../../src/adapters/growspace-adapter';
import { GrowspaceAPIResponse, PlantStage, GrowspaceTypeEnum } from '../../../src/types';

describe('GrowspaceAdapter', () => {
  const mockOverview: any = {
    entity_id: 'sensor.growspace_test_overview',
    attributes: {
      growspace_id: 'test_gs',
      friendly_name: 'Test Room',
      type: 'flower',
      rows: 2,
      plants_per_row: 2,
    },
    last_updated: '2023-01-01T12:00:00Z',
  };

  /** Build a minimal valid GrowspaceAPIResponse in the new nested format. */
  function makeWsData(overrides: Partial<GrowspaceAPIResponse> = {}): GrowspaceAPIResponse {
    return {
      identity: {
        growspace_id: 'test_gs',
        name: 'Test Room',
        type: GrowspaceTypeEnum.NORMAL,
        notification_target: null,
      },
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 0,
        grid: {},
      },
      environment: {},
      sensors: { sensor_types: {}, sensor_coordinates: {}, sensor_groups: [] },
      irrigation: {
        irrigation_config: { irrigation_times: [], drain_times: [] },
        irrigation_strategy: null,
      },
      metrics: {
        vpd_status: 'ok',
        vpd_target_min: 0,
        vpd_target_max: 0,
        vpd_danger_min: 0,
        vpd_danger_max: 0,
        granular_stage: 'unknown',
        is_day: false,
        veg_week: 0,
        flower_week: 0,
        max_veg_days: 0,
        max_flower_days: 0,
        max_stage_summary: '',
      },
      ...overrides,
    };
  }

  it('should transform dictionary grid to flat plant array', () => {
    const mockWSData = makeWsData({
      identity: {
        growspace_id: 'test_gs',
        name: 'Test Room',
        type: GrowspaceTypeEnum.NORMAL,
      },
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 1,
        grid: {
          'position_0_0': {
            plant_id: 'p1',
            entity_id: 'sensor.p1',
            strain: 'Kush',
            phenotype: 'OG',
            stage: 'veg',
            row: 0,
            col: 0,
            position: '0-0',
            seedling_days: 10,
            mother_days: 0,
            clone_days: 0,
            veg_days: 20,
            flower_days: 0,
            dry_days: 0,
            cure_days: 0,
            seedling_start: '2023-01-01',
            mother_start: null,
            clone_start: null,
            veg_start: '2023-01-11',
            flower_start: null,
            dry_start: null,
            cure_start: null,
            days_since_last_watering: 0,
          },
          'position_0_1': null,
        },
      },
      environment: {
        temperature_sensor: 'sensor.temp',
        humidity_sensor: 'sensor.hum',
        vpd_sensor: 'sensor.vpd',
      } as any,
      metrics: {
        vpd_status: 'ok',
        vpd_target_min: 0.8,
        vpd_target_max: 1.2,
        vpd_danger_min: 0.4,
        vpd_danger_max: 1.6,
        granular_stage: 'early_veg',
        is_day: true,
        veg_week: 3,
        flower_week: 0,
        max_veg_days: 20,
        max_flower_days: 0,
        max_stage_summary: 'Veg W3',
        air_exchange: '100',
      },
    });

    const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.deviceId).toBe('test_gs');
    expect(result.plants).toHaveLength(1);
    expect(result.plants[0].attributes.strain).toBe('Kush');
    expect(result.plants[0].attributes.row).toBe(0);
    expect(result.plants[0].attributes.col).toBe(0);
    expect(result.plants[0].attributes.stage).toBe(PlantStage.VEG);

    expect(result.environmentAttributes?.temperatureSensor).toBe('sensor.temp');
    expect(result.biologicalMetrics?.airExchange).toBe('100');
  });

  it('should return skeleton when wsData is null', () => {
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, null);
    expect(result).not.toBeNull();
    expect(result?.lastUpdated).toBe('Loading...');
    expect(result?.plants).toHaveLength(0);
  });

  it('should handle store-injected plant data with partial fields', () => {
    const mockWSData = makeWsData({
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 1,
        grid: {
          'position_1_2': {
            plant_id: 'p1',
            row: 1,
            col: 2,
            strain: 'Test Strain',
            entity_id: null,
            stage: 'flower',
          } as any,
        },
      },
    });

    const result = GrowspaceAdapter.transformGrowspace(mockOverview, mockWSData);

    expect(result).not.toBeNull();
    expect(result?.plants).toHaveLength(1);
    const plant = result?.plants[0];

    expect(plant?.attributes.plant_id).toBe('p1');
    expect(plant?.attributes.row).toBe(1);
    expect(plant?.attributes.col).toBe(2);
    expect(plant?.entity_id).toBeNull();
  });

  it('should handle wsData with null grid', () => {
    const ws = makeWsData({ grid: { rows: 2, plants_per_row: 2, total_plants: 0, grid: null as any } });
    const result = GrowspaceAdapter.transformGrowspace(null, ws);
    expect(result?.plants).toHaveLength(0);
  });

  it('should return null when both wsData and overview are null', () => {
    const result = GrowspaceAdapter.transformGrowspace(null, null);
    expect(result).toBeNull();
  });

  it('should return deprecated transformToDevices as empty array', () => {
    const result = GrowspaceAdapter.transformToDevices();
    expect(result).toEqual([]);
  });

  it('should fallback growspace_id from overview when wsData lacks it', () => {
    const ws = makeWsData({ identity: { growspace_id: '', name: 'Test Room', type: GrowspaceTypeEnum.NORMAL } });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.deviceId).toBe('test_gs');
  });

  it('should use default name when both wsData and overview lack it', () => {
    const ws = makeWsData({ identity: { growspace_id: 'gs_anon', name: '', type: GrowspaceTypeEnum.NORMAL } });
    const overviewWithoutName = {
      entity_id: 'sensor.test',
      attributes: { growspace_id: 'gs_anon' },
    };
    const result = GrowspaceAdapter.transformGrowspace(overviewWithoutName as any, ws);
    expect(result?.name).toBe('Growspace gs_anon');
  });

  it('should handle empty grid object', () => {
    const ws = makeWsData();
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.plants).toHaveLength(0);
  });

  it('should handle plant with unknown stage', () => {
    const ws = makeWsData({
      grid: {
        rows: 1,
        plants_per_row: 1,
        total_plants: 1,
        grid: {
          'position_0_0': {
            plant_id: 'p1',
            entity_id: 'sensor.p1',
            strain: 'Unknown',
            phenotype: '#1',
            stage: null,
            row: 0,
            col: 0,
          } as any,
        },
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.plants[0].attributes.stage).toBe('unknown');
  });

  it('should include irrigationStrategy when provided', () => {
    const ws = makeWsData({
      irrigation: {
        irrigation_config: { irrigation_times: [], drain_times: [] },
        irrigation_strategy: { enabled: true, target_vwc_percent: 45 } as any,
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.irrigationStrategy).toEqual(
      expect.objectContaining({ enabled: true, targetVwcPercent: 45 }),
    );
  });

  describe('Coverage Gap Fillers', () => {
    it('should fallback to "unknown" when both wsData and overview lack growspace_id', () => {
      const ws = makeWsData({ identity: { growspace_id: '', name: 'No ID', type: GrowspaceTypeEnum.NORMAL } });
      const overviewWithoutId = { entity_id: 'sensor.test', attributes: {} };
      const result = GrowspaceAdapter.transformGrowspace(overviewWithoutId as any, ws);
      expect(result?.deviceId).toBe('unknown');
    });

    it('should fallback type to "normal" when wsData.identity.type is undefined', () => {
      const ws = makeWsData({
        identity: { growspace_id: 'test_gs', name: 'Test', type: undefined as any },
      });
      const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
      expect(result?.type).toBe('normal');
    });

    it('should skip null slots in grid', () => {
      const ws = makeWsData({
        grid: {
          rows: 2,
          plants_per_row: 2,
          total_plants: 1,
          grid: {
            'position_0_0': {
              plant_id: 'p1',
              entity_id: 'sensor.p1',
              strain: 'Valid',
              phenotype: '#1',
              stage: 'veg',
              row: 0,
              col: 0,
            } as any,
            'position_0_1': null,
            'position_1_0': undefined as any,
          },
        },
      });
      const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
      expect(result?.plants).toHaveLength(1);
    });

    it('should handle overview with wsData having empty overview_entity_id', () => {
      const ws = makeWsData({
        identity: {
          growspace_id: 'test_gs',
          overview_entity_id: '',
          name: 'Test Room',
          type: 'normal',
        },
      });
      const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
      expect(result?.overviewEntityId).toBe('sensor.growspace_test_overview');
    });
  });

  it('should process sensor_groups and merge coordinates', () => {
    const ws = makeWsData({
      sensors: {
        sensor_types: {},
        sensor_coordinates: { 'sensor.existing': { x: 50, y: 50, z: 0 } },
        sensor_groups: [
          {
            id: 'group1',
            x: 10,
            y: 20,
            z: 5,
            temperature_sensors: ['sensor.group_temp'],
            humidity_sensors: ['sensor.group_hum'],
            vpd_sensors: ['sensor.group_vpd'],
          },
        ] as any,
      },
    });

    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    const coords = result?.environmentAttributes?.sensorCoordinates || {};

    expect(coords['sensor.group_temp']).toEqual({ x: 10, y: 20, z: 5 });
    expect(coords['sensor.group_hum']).toEqual({ x: 10, y: 20, z: 5 });
    expect(coords['sensor.group_vpd']).toEqual({ x: 10, y: 20, z: 5 });
    expect(coords['sensor.existing']).toEqual({ x: 50, y: 50, z: 0 });
  });

  it('should map irrigation_tanks correctly', () => {
    const ws = makeWsData({
      environment: {
        irrigation_tanks: [
          {
            sensor_entity: 'sensor.tank1',
            name: 'Main Tank',
            warning_level: 20,
            fill_level: 80,
            is_warning: false,
          },
        ],
      } as any,
    });

    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    const tanks = result?.environmentAttributes!.irrigationTanks;

    expect(tanks![0]).toEqual({
      sensorEntity: 'sensor.tank1',
      name: 'Main Tank',
      warningLevel: 20,
      fillLevel: 80,
      isWarning: false,
      hoursRemaining: null,
      depletionStatus: null,
      volumeLiters: null,
      waterHistory: undefined,
    });
  });

  it('should fallback to dimensions.depth and handle missing units', () => {
    const ws = makeWsData({
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 0,
        grid: {},
        dimensions: { width: 150, depth: 150, height: 200 } as any,
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.dimensions?.length).toBe(150);
    expect(result?.dimensions?.unit).toBe('cm');
  });

  it('should handle sensor groups with missing sensor arrays', () => {
    const ws = makeWsData({
      sensors: {
        sensor_types: {},
        sensor_coordinates: {},
        sensor_groups: [{ id: 'group_empty', x: 10, y: 10, z: 10 }] as any,
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result).toBeDefined();
    expect(result?.environmentAttributes?.sensorGroups).toHaveLength(1);
  });

  it('should NOT overwrite existing sensor coordinates with group coordinates', () => {
    const ws = makeWsData({
      sensors: {
        sensor_types: {},
        sensor_coordinates: { 'sensor.fixed': { x: 1, y: 1, z: 1 } },
        sensor_groups: [
          { id: 'g1', x: 2, y: 2, z: 2, temperature_sensors: ['sensor.fixed'] },
        ] as any,
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.environmentAttributes?.sensorCoordinates!['sensor.fixed']).toEqual({
      x: 1,
      y: 1,
      z: 1,
    });
  });

  it('should use dimensions.length if available before falling back to depth', () => {
    const ws = makeWsData({
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 0,
        grid: {},
        dimensions: { width: 100, length: 111, height: 100 },
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.dimensions?.length).toBe(111);
  });

  it('should fallback to 120 for dimensions.length if length and depth are missing', () => {
    const ws = makeWsData({
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 0,
        grid: {},
        dimensions: { width: 100, height: 100 } as any,
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    expect(result?.dimensions?.length).toBe(120);
  });

  it('should backfill sensorCoordinates for known sensors if missing', () => {
    const ws = makeWsData({
      environment: {
        temperature_sensor: 'sensor.temp',
        light_sensor: 'sensor.light',
      } as any,
      sensors: {
        sensor_types: {},
        sensor_coordinates: {},
        sensor_groups: [],
      },
      grid: {
        rows: 2,
        plants_per_row: 2,
        total_plants: 0,
        grid: {},
        dimensions: { width: 200, length: 200, height: 200, unit: 'cm' },
      },
    });
    const result = GrowspaceAdapter.transformGrowspace(mockOverview, ws);
    const coords = result?.environmentAttributes?.sensorCoordinates || {};
    expect(coords['sensor.temp']).toEqual({ x: 100, y: 100, z: 0 });
    expect(coords['sensor.light']).toEqual({ x: 100, y: 100, z: 0 });
  });
});
