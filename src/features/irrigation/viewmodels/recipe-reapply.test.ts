import { describe, expect, it } from 'vitest';
import { recipeReapplyOffer } from './recipe-reapply';
import type { GrowspaceDevice } from '../../../types';

function device(id: string, drifted: boolean | null, over = {}): GrowspaceDevice {
  return {
    deviceId: id,
    name: id,
    irrigationZones: [
      {
        id: 'zone',
        name: 'Left',
        applied_recipe: { id: 'r1', revision: 1, values: {} },
        applied_recipe_drifted: drifted,
        ...over,
      },
    ],
  } as unknown as GrowspaceDevice;
}

describe('recipe reapply offer', () => {
  it('finds zones across growspaces, preselecting only known untweaked zones', () => {
    const offer = recipeReapplyOffer('r1', 2, [
      device('A', false),
      device('B', true),
      device('C', null),
    ]);
    expect(offer.zones.map((zone) => [zone.label, zone.selected, zone.drifted])).toEqual([
      ['A · Left', true, false],
      ['B · Left', false, true],
      ['C · Left', false, null],
    ]);
  });
  it('excludes current revisions, other recipes and unstamped zones', () => {
    const devices = [
      device('A', false, { applied_recipe: { id: 'r1', revision: 2 } }),
      device('B', false, { applied_recipe: { id: 'other', revision: 1 } }),
      device('C', null, { applied_recipe: null }),
    ];
    expect(recipeReapplyOffer('r1', 2, devices).zones).toEqual([]);
  });
  it('names only untweaked zones whose current program slot will auto-advance', () => {
    const program = { auto_advance: true, recipe: { id: 'r1' }, progression: { hold: null } };
    const offer = recipeReapplyOffer('r1', 2, [
      device('A', false, { program }),
      device('B', true, { program }),
      device('C', false, { program: { ...program, recipe: { id: 'other' } } }),
      device('D', false, { program: { ...program, progression: { hold: 'paused' } } }),
    ]);
    expect(offer.zones.map((zone) => zone.autoAdvance)).toEqual([true, false, false, false]);
  });
  it('uses the growspace name for an implicit zone', () => {
    expect(recipeReapplyOffer('r1', 2, [device('A', false, { name: '' })]).zones[0].label).toBe(
      'A'
    );
  });
});
