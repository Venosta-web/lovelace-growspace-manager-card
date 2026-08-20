import { describe, it, expect } from 'vitest';
import {
  buildAcInfinityConflicts,
  buildDuplicatePortWarnings,
  acInfinityRoleLists,
} from './ac-infinity-conflicts';
import type { AcInfinityConflict } from '../components/ac-infinity-conflict';
import type { AcInfinityDevice } from '../../../slices/growspace/schema';

const dev = (mode_entity: string): AcInfinityDevice => ({ mode_entity, speed_entity: '', on_speed: 10 });
const conflict = (name: string): AcInfinityConflict => ({ deviceName: name, mode: 'Auto' });

describe('buildAcInfinityConflicts', () => {
  it('keys conflicts by mode_entity across all supplied lists', () => {
    const resolve = (eid: string) => (eid === 'select.a' ? conflict('Fan A') : null);
    const conflicts = buildAcInfinityConflicts([[dev('select.a')], [dev('select.b')]], resolve);
    expect(conflicts).toEqual({ 'select.a': conflict('Fan A') });
  });

  it('skips blank mode entities and never calls the resolver for them', () => {
    let calls = 0;
    buildAcInfinityConflicts([[dev('')]], () => {
      calls += 1;
      return conflict('x');
    });
    expect(calls).toBe(0);
  });

  it('resolves a duplicated mode entity only once', () => {
    let calls = 0;
    const resolve = () => {
      calls += 1;
      return conflict('dup');
    };
    buildAcInfinityConflicts([[dev('select.dup')], [dev('select.dup')]], resolve);
    expect(calls).toBe(1);
  });

  it('omits ports the resolver reports as non-conflicted', () => {
    expect(buildAcInfinityConflicts([[dev('select.ok')]], () => null)).toEqual({});
  });
});

describe('buildDuplicatePortWarnings', () => {
  const list = (field: string, ...modeEntities: string[]) => ({ field, modeEntities });

  it('warns on both cards, each naming the other role (reciprocal)', () => {
    const result = buildDuplicatePortWarnings([
      list('exhaustFanAcInfinityDevices', 'select.shared'),
      list('dehumidifierAcInfinityDevices', 'select.shared'),
    ]);
    expect(result.exhaustFanAcInfinityDevices[0]).toContain('Dehumidifier');
    expect(result.exhaustFanAcInfinityDevices[0]).not.toContain('Exhaust Fan');
    expect(result.dehumidifierAcInfinityDevices[0]).toContain('Exhaust Fan');
    expect(result.dehumidifierAcInfinityDevices[0]).not.toContain('Dehumidifier');
  });

  it('never treats two blank mode entities as a shared port', () => {
    const result = buildDuplicatePortWarnings([
      list('exhaustFanAcInfinityDevices', ''),
      list('humidifierAcInfinityDevices', ''),
    ]);
    expect(result.exhaustFanAcInfinityDevices).toEqual(['']);
    expect(result.humidifierAcInfinityDevices).toEqual(['']);
  });

  it('does not flag a repeat within a single role bundle (same-field, not cross-role)', () => {
    const result = buildDuplicatePortWarnings([
      list('exhaustFanAcInfinityDevices', 'select.a', 'select.a'),
    ]);
    expect(result.exhaustFanAcInfinityDevices).toEqual(['', '']);
  });

  it('flags an unrelated port as clear while flagging the duplicate', () => {
    const result = buildDuplicatePortWarnings([
      list('circulationFanAcInfinityDevices', 'select.shared', 'select.solo'),
      list('growlightAcInfinityDevices', 'select.shared'),
    ]);
    expect(result.circulationFanAcInfinityDevices[0]).toContain('Grow Light');
    expect(result.circulationFanAcInfinityDevices[1]).toBe('');
  });

  it('names every other role when a port spans three bundles', () => {
    const result = buildDuplicatePortWarnings([
      list('exhaustFanAcInfinityDevices', 'select.x'),
      list('humidifierAcInfinityDevices', 'select.x'),
      list('growlightAcInfinityDevices', 'select.x'),
    ]);
    const msg = result.exhaustFanAcInfinityDevices[0];
    expect(msg).toContain('Humidifier');
    expect(msg).toContain('Grow Light');
    expect(msg).toContain('and');
  });

  it('detects a duplicate spanning an actuator role and grow lights via acInfinityRoleLists', () => {
    const draft = {
      exhaustFanAcInfinityDevices: [dev('select.shared')],
      circulationFanAcInfinityDevices: [],
      humidifierAcInfinityDevices: [],
      dehumidifierAcInfinityDevices: [],
      growlightAcInfinityDevices: [
        { mode_entity: 'select.shared', on_time_entity: '', off_time_entity: '', power_entity: '', sunrise_switch_entity: '', sunrise_duration_entity: '' },
      ],
    };
    const result = buildDuplicatePortWarnings(acInfinityRoleLists(draft));
    expect(result.exhaustFanAcInfinityDevices[0]).toContain('Grow Light');
    expect(result.growlightAcInfinityDevices[0]).toContain('Exhaust Fan');
  });
});
