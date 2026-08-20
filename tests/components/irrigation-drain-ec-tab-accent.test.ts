/**
 * The Drain EC status card carries its status colour as a 3px accent bar across
 * the top edge — DESIGN.md's documented accent pattern — rather than the left
 * border strip it used before. See ADR 0037.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { DrainEcTabViewModel } from '../../src/features/irrigation/viewmodels/drain-ec-tab.viewmodel';
import '../../src/features/irrigation/components/irrigation-drain-ec-tab';

const STATUS_COLOR = '#4caf50';

function makeVm(): DrainEcTabViewModel {
  return {
    draft: {
      enabled: true,
      maxEcDelta: 1.5,
      targetRunoffPercent: 20,
      logFeedEc: 2.4,
      logDrainEc: 3.1,
      logFeedVolume: 1000,
      logDrainVolume: 200,
    },
    sub: { kind: 'idle' },
    status: {
      color: STATUS_COLOR,
      text: 'Drain EC within range',
      lastReading: null,
    },
    recent: [],
    totalReadings: 0,
  };
}

describe('irrigation-drain-ec-tab status accent', () => {
  let el: HTMLElement & { vm: DrainEcTabViewModel };

  beforeEach(async () => {
    el = document.createElement('irrigation-drain-ec-tab') as HTMLElement & {
      vm: DrainEcTabViewModel;
    };
    el.vm = makeVm();
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  });

  it('carries no left border strip', () => {
    const card = el.shadowRoot!.querySelector('.detail-card') as HTMLElement;
    expect(card.style.borderLeft).toBe('');
    expect(getComputedStyle(card).borderLeftWidth).toBe('1px');
  });

  it('renders a 3px top accent bar in the status colour', () => {
    const card = el.shadowRoot!.querySelector('.detail-card') as HTMLElement;
    const bar = getComputedStyle(card, '::before');
    expect(bar.height).toBe('3px');
    expect(bar.backgroundColor).toBe('rgb(76, 175, 80)');
  });

  it('threads the status colour through the --status-accent property', () => {
    const card = el.shadowRoot!.querySelector('.detail-card') as HTMLElement;
    expect(card.style.getPropertyValue('--status-accent')).toBe(STATUS_COLOR);
  });
});
