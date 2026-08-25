/**
 * ADR 0042 §1: the phase colours reach six call sites that concatenate an alpha
 * suffix onto them — `crop-steering-day-chart.ts:895,933,935` (`22`, `88`, `1a`,
 * `55`, `cc`) and `irrigation-schedules-tab.ts:545,580` (`40`, `99`, `55`).
 *
 * ADR 0045 §1 puts two more on the same footing: the schedule sections and the
 * irrigation shot marker now read `--metric-irrigation` and `--metric-drain`, and
 * `irrigation-schedules-tab.ts:545,580` and `crop-steering-day-chart.ts:960`
 * concatenate `40`, `99` and `55` onto them. The audit cannot see any of this —
 * the concatenating sites hold no literal of their own — so it is asserted here.
 *
 * That form only works while the value is a six-digit hex. If a phase token ever
 * becomes `rgba(...)`, `color-mix(...)` or an eight-digit hex, `${color}22` stops
 * parsing and the band loses its fill and border **while the label beside it keeps
 * rendering** — a failure that reads as a layout bug rather than a colour one.
 */

import { describe, it, expect } from 'vitest';
import { token } from './variables.generated';

const PHASE_TOKENS = [
  '--phase-p0',
  '--phase-p1',
  '--phase-p2',
  '--phase-p3',
  '--metric-irrigation',
  '--metric-drain',
] as const;
const SUFFIXES = ['22', '88', '1a', '55', 'cc', '40', '99'];

describe('the alpha-suffixed tokens survive concatenation', () => {
  it.each(PHASE_TOKENS)('%s is a six-digit hex', (name) => {
    expect(token[name]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(PHASE_TOKENS)('%s parses as a colour with every suffix in use', (name) => {
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    try {
      for (const suffix of SUFFIXES) {
        probe.style.backgroundColor = 'rgb(1, 2, 3)';
        probe.style.backgroundColor = `${token[name]}${suffix}`;
        // An unparseable value leaves the previous declaration standing.
        expect(getComputedStyle(probe).backgroundColor).not.toBe('rgb(1, 2, 3)');
      }
    } finally {
      probe.remove();
    }
  });
});
