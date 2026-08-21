import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { diffContractKeys, formatContractDrift } from './key-set-diff';

describe('contract fixture key-set diff', () => {
  it('reports the object and key added by the main fixture', () => {
    const schema = z.object({ environment: z.object({ humidity: z.number() }) });

    const drift = diffContractKeys(
      schema,
      { environment: { humidity: 55, leaf_temperature: 24 } },
      'completeness'
    );

    expect(drift).toEqual([
      {
        kind: 'fixture-key-not-declared',
        objectPath: '$.environment',
        key: 'leaf_temperature',
        path: '$.environment.leaf_temperature',
      },
    ]);
    expect(formatContractDrift(drift[0])).toContain('$.environment');
    expect(formatContractDrift(drift[0])).toContain('leaf_temperature');
  });

  it('uses Zod input requiredness and ignores release-only fixture keys', () => {
    const schema = z.object({
      required: z.string(),
      defaulted: z.string().optional().default('fallback'),
      optional: z.string().optional(),
    });

    expect(diffContractKeys(schema, { release_only: true }, 'backward-safety')).toEqual([
      {
        kind: 'required-input-key-missing',
        objectPath: '$',
        key: 'required',
        path: '$.required',
      },
    ]);
  });

  it('ignores record data keys and recurses into record value schemas', () => {
    const schema = z.object({
      notification_settings: z.record(z.string(), z.number()),
      devices: z.record(z.string(), z.object({ enabled: z.boolean() })),
    });
    const fixture = {
      notification_settings: { critical_cooldown: 15, warning_cooldown: 60 },
      devices: { exhaust: { enabled: true, added_by_backend: true } },
    };

    expect(diffContractKeys(schema, fixture, 'completeness')).toEqual([
      {
        kind: 'fixture-key-not-declared',
        objectPath: '$.devices.exhaust',
        key: 'added_by_backend',
        path: '$.devices.exhaust.added_by_backend',
      },
    ]);
  });

  it('unwraps lazy, nullable, default, optional, and array schemas', () => {
    const nodeSchema: z.ZodType = z.lazy(() =>
      z.object({
        children: z.array(nodeSchema).optional().default([]),
        name: z.string(),
      })
    );
    const schema = nodeSchema.nullable().optional().prefault(null);

    expect(
      diffContractKeys(
        schema,
        { name: 'root', children: [{ name: 'child', new_key: true }] },
        'completeness'
      )
    ).toEqual([
      {
        kind: 'fixture-key-not-declared',
        objectPath: '$.children[0]',
        key: 'new_key',
        path: '$.children[0].new_key',
      },
    ]);
  });

  it('skips opaque region contents', () => {
    const schema = z.object({
      environment: z.object({
        active_events: z.record(z.string(), z.object({ declared: z.string() })),
        irrigation_tanks: z.array(z.object({ declared: z.string() })),
      }),
      irrigation: z.object({
        water_usage: z.object({
          daily_readings: z.array(z.object({ declared: z.string() })),
        }),
      }),
      sensors: z.object({ sensor_groups: z.array(z.object({ declared: z.string() })) }),
    });

    expect(
      diffContractKeys(
        schema,
        {
          environment: {
            active_events: { event: { backend_owned: true } },
            irrigation_tanks: [{ backend_owned: true }],
          },
          irrigation: { water_usage: { daily_readings: [{ backend_owned: true }] } },
          sensors: { sensor_groups: [{ backend_owned: true }] },
        },
        'completeness'
      )
    ).toEqual([]);
  });
});
