import { describe, expect, it } from 'vitest';

import { CARD_SCRIPT_URL, cardScripting, type CpuProfile } from './scripting-profile';

const card =
  'http://ha/local/community/lovelace-growspace-manager-card/growspace-manager-card.js?v=1';
const chunk = 'http://ha/local/community/lovelace-growspace-manager-card/growspace-tc-OQ5cI8cq.js';
const frontend = 'http://ha/frontend_latest/app.abc123.js';

const frame = (functionName: string, url = '') => ({ functionName, url });

// (root) ─┬ (idle)
//         ├ (program)
//         ├ haConnect [frontend] ─ render [card] ─ appendChild [native]
//         └ (garbage collector)
const profile = (samples: number[], timeDeltas: number[], endTime: number): CpuProfile => ({
  nodes: [
    { id: 1, callFrame: frame('(root)'), children: [2, 3, 4, 7] },
    { id: 2, callFrame: frame('(idle)') },
    { id: 3, callFrame: frame('(program)') },
    { id: 4, callFrame: frame('haConnect', frontend), children: [5] },
    { id: 5, callFrame: frame('render', card), children: [6] },
    { id: 6, callFrame: frame('appendChild') },
    { id: 7, callFrame: frame('(garbage collector)') },
  ],
  startTime: 0,
  endTime,
  samples,
  timeDeltas,
});

describe('card script URLs', () => {
  it('match the entry and every lazy chunk, whatever query serves them', () => {
    expect(CARD_SCRIPT_URL.test(card)).toBe(true);
    expect(CARD_SCRIPT_URL.test(chunk)).toBe(true);
    expect(CARD_SCRIPT_URL.test('http://ha/hacsfiles/x/growspace-manager-card.js')).toBe(true);
  });

  it("do not match Home Assistant's frontend or a sourcemap", () => {
    expect(CARD_SCRIPT_URL.test(frontend)).toBe(false);
    expect(CARD_SCRIPT_URL.test(`${chunk}.map`)).toBe(false);
    expect(CARD_SCRIPT_URL.test('')).toBe(false);
  });
});

describe('card scripting from a CPU profile', () => {
  it('counts a sample by the time until the next one, in milliseconds', () => {
    // Samples at 1 ms, 3 ms and 6 ms; the profile ends at 10 ms.
    const result = cardScripting(profile([5, 5, 5], [1000, 2000, 3000], 10_000));
    expect(result).toEqual({ cardMs: 9, busyMs: 9, cardSamples: 3 });
  });

  it('counts what the card calls into, but not what calls the card', () => {
    const result = cardScripting(profile([4, 6, 5], [0, 1000, 1000], 3000));
    expect(result).toEqual({ cardMs: 2, busyMs: 3, cardSamples: 2 });
  });

  it('never counts idle, (program) or garbage collection', () => {
    const result = cardScripting(profile([2, 3, 7, 5], [0, 1000, 1000, 1000], 4000));
    expect(result).toEqual({ cardMs: 1, busyMs: 1, cardSamples: 1 });
  });

  it('reads a profile with no samples as no scripting at all', () => {
    expect(cardScripting({ ...profile([], [], 0), samples: undefined })).toEqual({
      cardMs: 0,
      busyMs: 0,
      cardSamples: 0,
    });
  });
});
