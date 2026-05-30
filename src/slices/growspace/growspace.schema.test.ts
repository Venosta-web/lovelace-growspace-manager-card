import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  GrowspaceAPIResponseSchema,
  GrowspaceAPICollectionSchema,
  GrowReportSchema,
} from './schema';

describe('Growspace Zod Schemas', () => {
  describe('GrowspaceAPIResponseSchema', () => {
    it('should parse an empty object successfully using default values', () => {
      const parsed = GrowspaceAPIResponseSchema.parse({});
      expect(parsed).toEqual({
        identity: { growspace_id: '', name: '', type: 'normal' },
        grid: {
          rows: 3,
          plants_per_row: 3,
          total_plants: 0,
          grid: {},
        },
        environment: {
          circulation_fan_entities: [],
          exhaust_fan_entities: [],
          humidifier_entities: [],
          dehumidifier_entities: [],
          light_sensors: [],
          humidifier_thresholds: {},
          dehumidifier_thresholds: {},
          substrate_temperature_sensors: [],
          camera_entities: [],
          energy_sensors: [],
          irrigation_tanks: [],
          active_events: {},
        },
        sensors: {
          sensor_types: {},
          sensor_coordinates: {},
          sensor_groups: [],
        },
        irrigation: {
          irrigation_config: {
            irrigation_times: [],
            drain_times: [],
          },
          irrigation_strategy: null,
          cycles_today: 0,
          volume_dispensed_today: 0,
        },
        metrics: {
          vpd_status: 'unknown',
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
          max_dry_days: 0,
          max_cure_days: 0,
          max_stage_summary: '',
        },
      });
    });

    it('should pass through extra fields at the root and nested objects', () => {
      const parsed = GrowspaceAPIResponseSchema.parse({
        extra_root_field: 'hello',
        environment: {
          extra_env_field: 'world',
        },
        metrics: {
          extra_metric_field: 'foo',
        },
      });
      expect(parsed).toMatchObject({
        extra_root_field: 'hello',
        environment: {
          extra_env_field: 'world',
        },
        metrics: {
          extra_metric_field: 'foo',
        },
      });
    });

    describe('IrrigationScheduleItemSchema & IrrigationConfigSchema', () => {
      it('should parse irrigation schedule items using time and duration', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_config: {
              irrigation_times: [
                { time: '08:00', duration: 15 },
              ],
            },
          },
        });

        expect(parsed.irrigation.irrigation_config.irrigation_times).toEqual([
          { time: '08:00', duration: 15 },
        ]);
      });

      it('should transform a simple time string to a schedule object', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_config: {
              irrigation_times: ['08:00', '12:00'],
              drain_times: ['18:00'],
            },
          },
        });

        expect(parsed.irrigation.irrigation_config.irrigation_times).toEqual([
          { time: '08:00' },
          { time: '12:00' },
        ]);

        expect(parsed.irrigation.irrigation_config.drain_times).toEqual([
          { time: '18:00' },
        ]);
      });

      it('should fallback to start_time and duration_seconds', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_config: {
              irrigation_times: [
                { start_time: '09:00', duration_seconds: 60 },
              ],
            },
          },
        });

        expect(parsed.irrigation.irrigation_config.irrigation_times).toEqual([
          { time: '09:00', duration: 60 },
        ]);
      });

      it('should handle falsy/missing duration and duration_seconds', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_config: {
              irrigation_times: [
                { time: '10:00' },
                { start_time: '11:00', duration: null, duration_seconds: null },
              ],
            },
          },
        });

        expect(parsed.irrigation.irrigation_config.irrigation_times).toEqual([
          { time: '10:00', duration: undefined },
          { time: '11:00', duration: undefined },
        ]);
      });

      it('should handle duration fallback when both duration and duration_seconds are provided', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_config: {
              irrigation_times: [
                { time: '10:00', duration: 30, duration_seconds: 90 },
              ],
            },
          },
        });

        expect(parsed.irrigation.irrigation_config.irrigation_times).toEqual([
          { time: '10:00', duration: 30 },
        ]);
      });

      it('should fail validation if both time and start_time are missing', () => {
        expect(() => {
          GrowspaceAPIResponseSchema.parse({
            irrigation: {
              irrigation_config: {
                irrigation_times: [
                  { duration: 45 },
                ],
              },
            },
          });
        }).toThrow(ZodError);

        try {
          GrowspaceAPIResponseSchema.parse({
            irrigation: {
              irrigation_config: {
                irrigation_times: [
                  { duration: 45 },
                ],
              },
            },
          });
        } catch (error) {
          const err = error as ZodError;
          expect(err.errors[0].message).toBe('Time is required');
        }
      });
    });

    describe('IrrigationStrategySchema', () => {
      it('should parse a complete strategy with default tracking options', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_strategy: {
              enabled: true,
              lights_on_time: '06:00',
              p0_duration_minutes: 120,
              p2_stop_before_lights_off_minutes: 60,
              target_vwc_percent: 45.5,
              maintenance_dryback_percent: 15.0,
              shot_duration_seconds: 5.5,
              shot_interval_minutes: 20,
            },
          },
        });

        expect(parsed.irrigation.irrigation_strategy).toEqual({
          enabled: true,
          lights_on_time: '06:00',
          p0_duration_minutes: 120,
          p2_stop_before_lights_off_minutes: 60,
          target_vwc_percent: 45.5,
          maintenance_dryback_percent: 15.0,
          shot_duration_seconds: 5.5,
          shot_interval_minutes: 20,
          auto_light_tracking: false,
          detected_lights_on_time: null,
        });
      });

      it('should override defaults for tracking options', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            irrigation_strategy: {
              enabled: true,
              lights_on_time: '06:00',
              p0_duration_minutes: 120,
              p2_stop_before_lights_off_minutes: 60,
              target_vwc_percent: 45.5,
              maintenance_dryback_percent: 15.0,
              shot_duration_seconds: 5.5,
              shot_interval_minutes: 20,
              auto_light_tracking: true,
              detected_lights_on_time: '05:45',
            },
          },
        });

        expect(parsed.irrigation.irrigation_strategy?.auto_light_tracking).toBe(true);
        expect(parsed.irrigation.irrigation_strategy?.detected_lights_on_time).toBe('05:45');
      });
    });

    describe('DrainConfigSchema', () => {
      it('should parse enabled config with readings', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            drain_config: {
              enabled: true,
              max_ec_delta: 0.5,
              target_runoff_percent: 20,
              readings: [
                {
                  timestamp: '2026-05-30T12:00:00Z',
                  feed_ec: 1.8,
                  drain_ec: 2.1,
                  drain_volume_ml: 150,
                  feed_volume_ml: null,
                },
              ],
            },
          },
        });

        expect(parsed.irrigation.drain_config).toEqual({
          enabled: true,
          max_ec_delta: 0.5,
          target_runoff_percent: 20,
          readings: [
            {
              timestamp: '2026-05-30T12:00:00Z',
              feed_ec: 1.8,
              drain_ec: 2.1,
              drain_volume_ml: 150,
              feed_volume_ml: null,
            },
          ],
        });
      });

      it('should default readings to empty array if omitted', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            drain_config: {
              enabled: false,
              max_ec_delta: 0.0,
              target_runoff_percent: 0,
            },
          },
        });

        expect(parsed.irrigation.drain_config?.readings).toEqual([]);
      });
    });

    describe('Metrics section', () => {
      it('should transform air_exchange from number to string', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          metrics: {
            air_exchange: 4.5,
          },
        });
        expect(parsed.metrics.air_exchange).toBe('4.5');
      });

      it('should handle air_exchange as string', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          metrics: {
            air_exchange: '10.2',
          },
        });
        expect(parsed.metrics.air_exchange).toBe('10.2');
      });

      it('should allow air_exchange to be null/undefined', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          metrics: {
            air_exchange: null,
          },
        });
        expect(parsed.metrics.air_exchange).toBeNull();
      });
    });
  });

  describe('GrowspaceAPICollectionSchema', () => {
    it('should parse a record of growspace responses', () => {
      const parsed = GrowspaceAPICollectionSchema.parse({
        growspace_1: {
          identity: { growspace_id: 'gs1', name: 'Tent A', type: 'flower' },
        },
        growspace_2: {
          identity: { growspace_id: 'gs2', name: 'Tent B', type: 'veg' },
        },
      });

      expect(parsed.growspace_1.identity.name).toBe('Tent A');
      expect(parsed.growspace_2.identity.name).toBe('Tent B');
    });
  });

  describe('GrowReportSchema', () => {
    it('should parse a full grow report successfully', () => {
      const report = {
        summary: {
          plant_count: 9,
          strains: ['Blue Dream', 'OG Kush'],
          stages: { flower: 9 },
        },
        harvest: {
          total_wet_weight: 450.5,
          total_dry_weight: 120.2,
          total_trim_weight: 50.1,
          top_thc: 24.5,
        },
        environment: {
          temperature_avg: 24.2,
          humidity_avg: 52.4,
          vpd_avg: 1.15,
        },
      };

      const parsed = GrowReportSchema.parse(report);
      expect(parsed).toEqual(report);
    });

    it('should support optional/nullable values', () => {
      const report = {
        summary: {
          plant_count: 0,
          strains: [],
          stages: {},
        },
        harvest: {
          total_wet_weight: 0,
          total_dry_weight: 0,
          total_trim_weight: 0,
          top_thc: null,
        },
        environment: {
          temperature_avg: undefined,
          humidity_avg: null,
          vpd_avg: null,
        },
      };

      const parsed = GrowReportSchema.parse(report);
      expect(parsed.harvest.top_thc).toBeNull();
      expect(parsed.environment.temperature_avg).toBeUndefined();
      expect(parsed.environment.humidity_avg).toBeNull();
    });
  });
});
