import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  GrowspaceAPIResponseSchema,
  GrowspaceAPICollectionSchema,
  GrowReportSchema,
  CirculationFanConfigSchema,
} from './schema';

describe('CirculationFanConfigSchema', () => {
  it('rejects an unknown regulation_mode', () => {
    expect(() =>
      CirculationFanConfigSchema.parse({
        enabled: false,
        regulation_mode: 'auto',
        min_speed: 0,
        max_speed: 100,
        vpd_target: 1.0,
        vpd_tolerance: 0.2,
        humidity_target: 60.0,
        humidity_tolerance: 5.0,
        temperature_target: 25.0,
        temperature_tolerance: 2.0,
        critical_temp_low: null,
        critical_temp_high: null,
        critical_temp_hysteresis: 1.0,
        wind_enabled: false,
        wind_period_seconds: 60,
        wind_amplitude_pct: 10,
  stage_vpd_enabled: false,
      }),
    ).toThrow(ZodError);
  });

  it('parses a full backend payload', () => {
    const result = CirculationFanConfigSchema.parse({
      enabled: true,
      regulation_mode: 'humidity',
      min_speed: 20,
      max_speed: 90,
      vpd_target: 1.2,
      vpd_tolerance: 0.15,
      humidity_target: 65.0,
      humidity_tolerance: 4.0,
      temperature_target: 24.0,
      temperature_tolerance: 1.5,
      critical_temp_low: 18.0,
      critical_temp_high: 32.0,
      critical_temp_hysteresis: 2.0,
      wind_enabled: true,
      wind_period_seconds: 120,
      wind_amplitude_pct: 20,
  stage_vpd_enabled: false,
    });
    expect(result).toEqual({
      enabled: true,
      regulation_mode: 'humidity',
      min_speed: 20,
      max_speed: 90,
      vpd_target: 1.2,
      vpd_tolerance: 0.15,
      humidity_target: 65.0,
      humidity_tolerance: 4.0,
      temperature_target: 24.0,
      temperature_tolerance: 1.5,
      critical_temp_low: 18.0,
      critical_temp_high: 32.0,
      critical_temp_hysteresis: 2.0,
      wind_enabled: true,
      wind_period_seconds: 120,
      wind_amplitude_pct: 20,
      stage_vpd_enabled: false,
      stage_vpd_overrides: {},
    });
  });
});

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
          vpd_optimal_overrides: {},
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

    it('validates circulation_fan_config when present in the environment block', () => {
      expect(() =>
        GrowspaceAPIResponseSchema.parse({
          environment: {
            circulation_fan_config: {
              enabled: true,
              regulation_mode: 'invalid_mode',
              min_speed: 10,
              max_speed: 95,
              vpd_target: 1.1,
              vpd_tolerance: 0.2,
              humidity_target: 60.0,
              humidity_tolerance: 5.0,
              temperature_target: 25.0,
              temperature_tolerance: 2.0,
              critical_temp_low: null,
              critical_temp_high: null,
              critical_temp_hysteresis: 1.0,
              wind_enabled: false,
              wind_period_seconds: 60,
              wind_amplitude_pct: 10,
  stage_vpd_enabled: false,
            },
          },
        }),
      ).toThrow(ZodError);
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

    it('accepts vpd_optimal_overrides in the environment block and defaults to {} when absent', () => {
      const withOverrides = GrowspaceAPIResponseSchema.parse({
        environment: {
          vpd_optimal_overrides: {
            veg: { day: { low: 0.8, high: 1.2 }, night: { low: 0.6, high: 1.0 } },
          },
        },
      });
      expect(withOverrides.environment.vpd_optimal_overrides).toEqual({
        veg: { day: { low: 0.8, high: 1.2 }, night: { low: 0.6, high: 1.0 } },
      });

      const withoutOverrides = GrowspaceAPIResponseSchema.parse({ environment: {} });
      expect(withoutOverrides.environment.vpd_optimal_overrides).toEqual({});
    });

    describe('subareas (top-level payload key)', () => {
      it('parses subareas in the get_subareas wire shape', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          subareas: [
            {
              id: 'sa1',
              name: 'Veg Shelf',
              environment_config: {
                temperature_sensors: ['sensor.shelf_temp'],
                humidity_sensors: ['sensor.shelf_hum'],
              },
            },
          ],
        });

        expect(parsed.subareas).toEqual([
          {
            id: 'sa1',
            name: 'Veg Shelf',
            environment_config: {
              temperature_sensors: ['sensor.shelf_temp'],
              humidity_sensors: ['sensor.shelf_hum'],
            },
          },
        ]);
      });

      it('leaves subareas undefined when the key is absent (older backends)', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({});
        expect(parsed.subareas).toBeUndefined();
      });

      it('parses an empty subareas list (new backend, no subareas configured)', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({ subareas: [] });
        expect(parsed.subareas).toEqual([]);
      });

      it('rejects subarea entries missing required fields', () => {
        expect(() =>
          GrowspaceAPIResponseSchema.parse({
            subareas: [{ id: 'sa1', environment_config: {} }],
          }),
        ).toThrow(ZodError);
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

    describe('SubstrateMetricsSchema (measured steering readout)', () => {
      it('parses the full measured-metrics substrate block', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            substrate: {
              overnight_dryback: 12.5,
              latest_overnight_event: {
                event_type: 'overnight',
                peak_vwc: 55.2,
                trough_vwc: 42.7,
                dryback: 12.5,
                peak_timestamp: '2026-06-13T06:00:00+00:00',
                trough_timestamp: '2026-06-13T18:00:00+00:00',
              },
              incycle_dryback_count: 4,
              incycle_dryback_avg: 3.1,
              ec_trend: 'rising',
              ec_trend_available: true,
              score: 0.6,
              measured_classification: 'generative',
              intent_deviation: 'more_generative',
              shot_composition: { ec_modulation_enabled: true, last_shot: null },
            },
          },
        });

        const substrate = parsed.irrigation.substrate;
        expect(substrate?.overnight_dryback).toBe(12.5);
        expect(substrate?.latest_overnight_event?.peak_vwc).toBe(55.2);
        expect(substrate?.incycle_dryback_count).toBe(4);
        expect(substrate?.ec_trend).toBe('rising');
        expect(substrate?.ec_trend_available).toBe(true);
        expect(substrate?.score).toBe(0.6);
        expect(substrate?.measured_classification).toBe('generative');
        expect(substrate?.intent_deviation).toBe('more_generative');
        expect(substrate?.shot_composition).toEqual({
          ec_modulation_enabled: true,
          last_shot: null,
        });
      });

      it('accepts null measured fields and defaults ec_trend_available to false', () => {
        const parsed = GrowspaceAPIResponseSchema.parse({
          irrigation: {
            substrate: {
              overnight_dryback: null,
              ec_trend: null,
              score: null,
              measured_classification: null,
              intent_deviation: null,
            },
          },
        });

        const substrate = parsed.irrigation.substrate;
        expect(substrate?.overnight_dryback).toBeNull();
        expect(substrate?.ec_trend_available).toBe(false);
        expect(substrate?.score).toBeNull();
        expect(substrate?.measured_classification).toBeNull();
      });

      it('rejects an out-of-vocabulary measured_classification', () => {
        expect(() => {
          GrowspaceAPIResponseSchema.parse({
            irrigation: { substrate: { measured_classification: 'sideways' } },
          });
        }).toThrow(ZodError);
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
