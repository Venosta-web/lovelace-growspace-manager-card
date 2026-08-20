import { describe, it, expect } from 'vitest';
import {
  composeEnvironmentConfig,
  isEnvironmentSaveBlockedByBand,
  needsExhaustCall,
} from './environment-save';
import {
  ENV_PERSISTENCE,
  ENV_ATOMIC_GROUPS,
  expandAtomicGroups,
  type EnvironmentDraftKey,
} from './environment-persistence';
import { createInitialSM, transition } from '../../dialogs/config-dialog-sm';
import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';

function draft(): EnvironmentDraft {
  return createInitialSM().environmentDraft;
}

/** The write set produced by editing `keys`, closed under the atomic groups. */
function dirty(...keys: EnvironmentDraftKey[]): ReadonlySet<EnvironmentDraftKey> {
  return expandAtomicGroups(keys);
}

describe('composeEnvironmentConfig — sparse patches', () => {
  it('emits the routing ID even when nothing is dirty', () => {
    const d = draft();
    d.selectedGrowspaceId = 'growspace_1';
    const detail = composeEnvironmentConfig(d, dirty());
    expect(detail).toEqual({ selectedGrowspaceId: 'growspace_1' });
  });

  it('emits only the dirty field, not the whole draft', () => {
    const d = draft();
    d.selectedGrowspaceId = 'growspace_1';
    d.temperatureSensors = ['sensor.temp'];
    const detail = composeEnvironmentConfig(d, dirty('temperatureSensors'));
    expect(Object.keys(detail).sort()).toEqual(['selectedGrowspaceId', 'temperatureSensors']);
    expect(detail.temperatureSensors).toEqual(['sensor.temp']);
  });

  it('omits an untouched field even when the draft holds a non-default value', () => {
    // The regression this whole design exists to prevent: the draft is seeded
    // complete, so an untouched field carries a real stored value. Emitting it
    // would be a deliberate re-set of something the user never edited.
    const d = draft();
    d.feedEcSensors = ['sensor.feed_ec'];
    d.temperatureSensors = ['sensor.temp'];
    const detail = composeEnvironmentConfig(d, dirty('temperatureSensors'));
    expect('feedEcSensors' in detail).toBe(false);
  });

  it.each([
    ['null', 'co2Sensor' as const, null],
    ['empty string', 'co2Sensor' as const, ''],
    ['empty list', 'phSensors' as const, []],
    ['empty object', 'vpdOptimalOverrides' as const, {}],
  ])('emits a dirty %s value as a deliberate clear', (_label, key, value) => {
    const d = draft();
    (d as unknown as Record<string, unknown>)[key] = value;
    const detail = composeEnvironmentConfig(d, dirty(key));
    expect(key in detail).toBe(true);
    expect((detail as unknown as Record<string, unknown>)[key]).toEqual(value);
  });

  it('excludes the immediate-persist humidity control flags', () => {
    const d = draft();
    d.humidifierControlEnabled = true;
    d.dehumidifierControlEnabled = true;
    const detail = composeEnvironmentConfig(
      d,
      dirty('humidifierControlEnabled', 'dehumidifierControlEnabled')
    ) as unknown as Record<string, unknown>;
    expect('humidifierControlEnabled' in detail).toBe(false);
    expect('dehumidifierControlEnabled' in detail).toBe(false);
  });

  it('passes dirty grow light fields through', () => {
    const d = draft();
    d.growlightEntities = ['switch.grow'];
    d.growlightConfig = { enabled: true, power: 80, sunrise_enabled: true, sunrise_minutes: 15 };
    const detail = composeEnvironmentConfig(d, dirty('growlightEntities', 'growlightConfig'));
    expect(detail.growlightEntities).toEqual(['switch.grow']);
    expect(detail.growlightConfig?.power).toBe(80);
  });
});

describe('environment persistence classification', () => {
  it('classifies every environment draft key', () => {
    // Totality is enforced by `Record<keyof EnvironmentDraft, ...>` at compile
    // time; this asserts the runtime table has not drifted from the draft.
    const draftKeys = Object.keys(draft()).sort();
    expect(Object.keys(ENV_PERSISTENCE).sort()).toEqual(draftKeys);
  });

  it('routes exactly one key and never emits it as a patch field', () => {
    const routing = Object.entries(ENV_PERSISTENCE)
      .filter(([, c]) => c === 'routing')
      .map(([k]) => k);
    expect(routing).toEqual(['selectedGrowspaceId']);
  });
});

describe('composeEnvironmentConfig — Acceptable Moisture Band', () => {
  it('omits both bounds when the group is untouched', () => {
    const d = draft();
    d.soilMoistureMin = 30;
    d.soilMoistureMax = 70;
    const detail = composeEnvironmentConfig(d, dirty('temperatureSensors'));
    expect('soilMoistureMin' in detail).toBe(false);
    expect('soilMoistureMax' in detail).toBe(false);
  });

  it('emits both bounds when only one was edited', () => {
    const d = draft();
    d.soilMoistureMin = 32.5;
    d.soilMoistureMax = 54;
    const detail = composeEnvironmentConfig(d, dirty('soilMoistureMin'));
    expect(detail.soilMoistureMin).toBe(32.5);
    expect(detail.soilMoistureMax).toBe(54);
  });

  it('emits both bounds as null to clear a stored override', () => {
    const d = draft();
    d.soilMoistureMin = null;
    d.soilMoistureMax = null;
    const detail = composeEnvironmentConfig(d, dirty('soilMoistureMax'));
    expect(detail.soilMoistureMin).toBeNull();
    expect(detail.soilMoistureMax).toBeNull();
  });

  it('keeps a zero minimum instead of dropping it as falsy', () => {
    const d = draft();
    d.soilMoistureMin = 0;
    d.soilMoistureMax = 45;
    const detail = composeEnvironmentConfig(d, dirty('soilMoistureMin'));
    expect(detail.soilMoistureMin).toBe(0);
    expect(detail.soilMoistureMax).toBe(45);
  });

  it.each([
    ['half pair', 30, null],
    ['inverted pair', 70, 30],
  ])('blocks Save for a dirty %s', (_label, min, max) => {
    const d = draft();
    d.soilMoistureMin = min;
    d.soilMoistureMax = max;
    expect(isEnvironmentSaveBlockedByBand(d, dirty('soilMoistureMin'))).toBe(true);
  });

  it.each([
    ['valid pair', 30, 70],
    ['clean clear', null, null],
  ])('does not block Save for a dirty %s', (_label, min, max) => {
    const d = draft();
    d.soilMoistureMin = min;
    d.soilMoistureMax = max;
    expect(isEnvironmentSaveBlockedByBand(d, dirty('soilMoistureMin'))).toBe(false);
  });

  it('does not block Save for an invalid but untouched band', () => {
    const d = draft();
    d.soilMoistureMin = 70;
    d.soilMoistureMax = 30;
    expect(isEnvironmentSaveBlockedByBand(d, dirty('phSensors'))).toBe(false);
  });

  it('never emits one bound without the other', () => {
    const pairs: Array<[number | null, number | null]> = [
      [null, null],
      [30, null],
      [null, 70],
      [30, 70],
      [70, 30],
      [0, 100],
    ];
    for (const [min, max] of pairs) {
      const d = draft();
      d.soilMoistureMin = min;
      d.soilMoistureMax = max;
      const detail = composeEnvironmentConfig(d, dirty('soilMoistureMin', 'soilMoistureMax'));
      expect('soilMoistureMin' in detail).toBe('soilMoistureMax' in detail);
    }
  });

  it('closes every atomic group under dirtiness from any member', () => {
    for (const group of ENV_ATOMIC_GROUPS) {
      for (const member of group) {
        const expanded = expandAtomicGroups([member]);
        for (const sibling of group) expect(expanded.has(sibling)).toBe(true);
      }
    }
  });
});

describe('needsExhaustCall', () => {
  it('is true only when the composer emitted a dirty exhaust config', () => {
    const d = draft();
    const detail = composeEnvironmentConfig(d, dirty('exhaustFanConfig'));
    expect(needsExhaustCall(detail)).toBe(true);
  });

  it('is false for an unrelated edit, so the stored exhaust config survives', () => {
    const d = draft();
    const detail = composeEnvironmentConfig(d, dirty('temperatureSensors'));
    expect(needsExhaustCall(detail)).toBe(false);
  });

  it('is false when no exhaust fan config is present', () => {
    expect(needsExhaustCall({ exhaustFanConfig: undefined })).toBe(false);
  });
});

describe('reducer → composer trace (no hand-built dirty sets)', () => {
  it('carries an exhaust config edit from UPDATE_ENV_DRAFT through to the dedicated call', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { exhaustFanConfig: { ...draft().exhaustFanConfig, enabled: true } },
    });
    const detail = composeEnvironmentConfig(sm.environmentDraft, sm.environmentDirty);
    expect(needsExhaustCall(detail)).toBe(true);
    expect(detail.exhaustFanConfig?.enabled).toBe(true);
  });

  it('does not trigger the exhaust call for an unrelated edit made through the reducer', () => {
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { temperatureSensors: ['sensor.t'] },
    });
    const detail = composeEnvironmentConfig(sm.environmentDraft, sm.environmentDirty);
    expect(needsExhaustCall(detail)).toBe(false);
  });

  it('keeps vision fields out of the buffered patch entirely', () => {
    // Vision is `dedicated` but travels on its own event, not in this detail.
    const sm = transition(createInitialSM(), {
      type: 'UPDATE_ENV_DRAFT',
      partial: { visionEnabled: true, visionMidHours: 6 },
    });
    const detail = composeEnvironmentConfig(sm.environmentDraft, sm.environmentDirty);
    expect(Object.keys(detail)).toEqual(['selectedGrowspaceId']);
  });
});
