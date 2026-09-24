import { describe, expect, it } from 'vitest';
import { mdiThermometer } from '@mdi/js';

import type { HeaderChip } from './index';
import { deriveHeaderVerdict } from './verdict';
import { StatusLevel } from '../../features/environment/constants';

function tile(key: string, status?: string, label = key.toUpperCase()): HeaderChip {
  return {
    key,
    icon: mdiThermometer,
    value: '1',
    label,
    status,
    active: false,
    linked: false,
    groupIndex: -1,
  };
}

const plants = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `p${i}` }));

const text = (verdict: ReturnType<typeof deriveHeaderVerdict>) =>
  verdict.lines.map((line) => `${line.summary} ${line.detail}`).join(' | ');

describe('deriveHeaderVerdict', () => {
  it('says on track when neither plants nor any tile are flagged', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(17),
      problemPlants: [],
      tiles: [tile('temperature', 'optimal'), tile('light')],
    });

    expect(verdict.kind).toBe('assessed');
    expect(verdict.level).toBe(StatusLevel.OPTIMAL);
    expect(verdict.lines).toEqual([
      {
        scope: 'plants',
        level: StatusLevel.OPTIMAL,
        summary: 'All 17 plants on track',
        detail: 'No plant issues reported.',
      },
    ]);
  });

  it('names the environment separately, first, when a tile is critical', () => {
    // The live Demo Tent state from card#972: plants clean, VPD critical, and
    // the Optimal Conditions chip warning.
    const verdict = deriveHeaderVerdict({
      plants: plants(17),
      problemPlants: [],
      tiles: [
        tile('vpd', 'danger', 'VPD'),
        tile('optimal', 'warning', 'Optimal Conditions'),
        tile('humidity', 'optimal'),
      ],
    });

    expect(verdict.level).toBe(StatusLevel.DANGER);
    expect(verdict.lines.map((line) => line.scope)).toEqual(['environment', 'plants']);
    expect(verdict.lines[0]).toMatchObject({
      summary: 'Environment critical',
      detail: 'VPD, Optimal Conditions',
    });
    expect(verdict.lines[1]).toMatchObject({
      level: StatusLevel.OPTIMAL,
      summary: '17 plants, none flagged',
    });
    expect(text(verdict)).not.toMatch(/on track/);
  });

  it('calls a warning-only environment "needs attention", not critical', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(1),
      problemPlants: [],
      tiles: [tile('tank', 'warning', 'Tank')],
    });

    expect(verdict.level).toBe(StatusLevel.WARNING);
    expect(verdict.lines[0]).toMatchObject({
      scope: 'environment',
      summary: 'Environment needs attention',
      detail: 'Tank',
    });
    expect(verdict.lines[1].summary).toBe('1 plant, none flagged');
  });

  it('keeps the plant alert as the headline when both dimensions are warning', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(3),
      problemPlants: ['Gelato'],
      tiles: [tile('temperature', 'warning', 'Temperature')],
    });

    expect(verdict.lines.map((line) => line.summary)).toEqual([
      '1 plant needs attention',
      'Environment needs attention',
    ]);
  });

  it('puts a critical environment ahead of a plant warning', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(3),
      problemPlants: ['Gelato', 'Blue Dream', 'Zkittlez'],
      tiles: [tile('vpd', 'danger', 'VPD')],
    });

    expect(verdict.lines.map((line) => line.scope)).toEqual(['environment', 'plants']);
    expect(verdict.lines[1]).toMatchObject({
      summary: '3 plants need attention',
      detail: 'Gelato, Blue Dream +1 more',
    });
  });

  it('orders flagged tiles critical-first and collapses the rest', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(2),
      problemPlants: [],
      tiles: [
        tile('temperature', 'warning', 'Temperature'),
        tile('humidity', 'warning', 'Humidity'),
        tile('vpd', 'danger', 'VPD'),
      ],
    });

    expect(verdict.lines[0].detail).toBe('VPD, Temperature +1 more');
  });

  it('counts a tile once when it is displayed in two rows', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(2),
      problemPlants: [],
      tiles: [tile('vpd', 'warning', 'VPD'), tile('vpd', 'danger', 'VPD')],
    });

    expect(verdict.lines[0]).toMatchObject({ level: StatusLevel.DANGER, detail: 'VPD' });
  });

  it('ignores statuses it does not recognise', () => {
    const verdict = deriveHeaderVerdict({
      plants: plants(2),
      problemPlants: [],
      tiles: [tile('vpd', 'unknown'), tile('co2', 'ok')],
    });

    expect(verdict.lines).toHaveLength(1);
    expect(verdict.lines[0].summary).toBe('All 2 plants on track');
  });

  it('reports an empty growspace, and its environment when flagged', () => {
    expect(deriveHeaderVerdict({ plants: [], problemPlants: [], tiles: [] })).toEqual({
      kind: 'empty',
      level: StatusLevel.OPTIMAL,
      lines: [
        {
          scope: 'plants',
          level: StatusLevel.OPTIMAL,
          summary: 'Ready for plants',
          detail: 'No plants are assigned to this growspace.',
        },
      ],
    });

    const flagged = deriveHeaderVerdict({
      plants: [],
      problemPlants: [],
      tiles: [tile('vpd', 'danger', 'VPD')],
    });
    expect(flagged.level).toBe(StatusLevel.DANGER);
    expect(flagged.lines.map((line) => line.summary)).toEqual([
      'Environment critical',
      'Ready for plants',
    ]);
  });

  it('makes no plant claim before plant data has loaded', () => {
    const verdict = deriveHeaderVerdict({
      plants: undefined,
      problemPlants: [],
      tiles: [tile('vpd', 'danger', 'VPD')],
    });

    expect(verdict.kind).toBe('unavailable');
    expect(verdict.level).toBe(StatusLevel.DANGER);
    expect(verdict.lines.map((line) => line.summary)).toEqual([
      'Environment critical',
      'Plant status unavailable',
    ]);
  });

  // card#972 acceptance: no state in which the verdict is "on track" while any
  // tile is critical. Walk every tile status against every plant state.
  describe('never says on track beside a flagged tile', () => {
    const statuses = [undefined, 'optimal', 'warning', 'danger', 'unknown'];
    const plantStates: Array<{ plants: unknown; problemPlants: string[] }> = [
      { plants: undefined, problemPlants: [] },
      { plants: [], problemPlants: [] },
      { plants: plants(1), problemPlants: [] },
      { plants: plants(17), problemPlants: [] },
      { plants: plants(17), problemPlants: ['Gelato'] },
    ];

    for (const a of statuses) {
      for (const b of statuses) {
        for (const state of plantStates) {
          const tiles = [tile('vpd', a, 'VPD'), tile('tank', b, 'Tank')];
          const flagged = [a, b].some((s) => s === 'warning' || s === 'danger');
          const critical = [a, b].includes('danger');
          const name = `vpd=${a} tank=${b} plants=${
            Array.isArray(state.plants) ? state.plants.length : 'loading'
          } problems=${state.problemPlants.length}`;

          it(name, () => {
            const verdict = deriveHeaderVerdict({ ...state, tiles });

            if (flagged) expect(text(verdict)).not.toMatch(/on track/);
            if (critical) {
              expect(verdict.level).toBe(StatusLevel.DANGER);
              expect(verdict.lines[0]).toMatchObject({
                scope: 'environment',
                summary: 'Environment critical',
              });
            }
          });
        }
      }
    }
  });
});
