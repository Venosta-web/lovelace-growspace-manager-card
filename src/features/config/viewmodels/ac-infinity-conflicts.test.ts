import { describe, it, expect } from 'vitest';
import { buildAcInfinityConflicts } from './ac-infinity-conflicts';
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
