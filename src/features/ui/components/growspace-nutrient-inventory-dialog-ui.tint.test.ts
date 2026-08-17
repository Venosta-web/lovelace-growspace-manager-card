/**
 * ADR 0044 §3: the nutrient stock types are `var(--nutrient-*, #hex)` references, and
 * the list item's icon chip tints its own colour at 13%.
 *
 * It used to do that by concatenating an alpha suffix in the template —
 * `background:${color}22`. That form only works while every value in the map is a
 * six-digit hex, and `base` has pointed at `var(--primary-color, #4caf50)` since before
 * this migration, so the base chip rendered with no tint at all while its icon, painted
 * by the second declaration, kept its colour — a chip that reads as never styled. The
 * tint is a `color-mix()` in the stylesheet instead, which is what lets the other five
 * types take the `var()` form without inheriting the same silent failure.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NutrientInventoryResponse, NutrientStockType } from '../../../slices/nutrient';
import './growspace-nutrient-inventory-dialog-ui';

/** Chromium computes an unset background and an unparseable one alike. */
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const TYPES: NutrientStockType[] = ['base', 'bloom', 'calmag', 'root', 'additive', 'microbe'];

const inventory: NutrientInventoryResponse = {
  stocks: Object.fromEntries(
    TYPES.map((type) => [
      type,
      {
        nutrient_id: type,
        name: `${type} stock`,
        current_ml: 500,
        initial_ml: 1000,
        last_updated: '2026-08-16T00:00:00Z',
        brand: '',
        type,
        npk: '',
        dose_ml_l: 0,
        notes: '',
      },
    ])
  ),
};

describe('nutrient type chips tint their own colour', () => {
  let el: HTMLElement;
  let chips: HTMLElement[];

  beforeAll(async () => {
    el = document.createElement('growspace-nutrient-inventory-dialog-ui');
    (el as HTMLElement & { inventory: NutrientInventoryResponse }).inventory = inventory;
    document.body.appendChild(el);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    chips = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.type-icon')];
  });

  afterAll(() => el.remove());

  it('renders one chip per stock', () => {
    expect(chips).toHaveLength(TYPES.length);
  });

  it('tints every chip, base included', () => {
    const painted = chips.map((chip) => getComputedStyle(chip).backgroundColor);
    expect(painted.filter((c) => c === TRANSPARENT)).toEqual([]);
  });

  it('gives each type its own tint', () => {
    const painted = chips.map((chip) => getComputedStyle(chip).backgroundColor);
    expect(new Set(painted).size).toBe(painted.length);
  });

  it('paints the icon in the untinted colour', () => {
    for (const chip of chips) {
      const { color, backgroundColor } = getComputedStyle(chip);
      expect(color).not.toBe(backgroundColor);
      expect(color).not.toBe(TRANSPARENT);
    }
  });

  it('falls back to the primary when no type colour reaches the chip', async () => {
    // The rule fires on any .type-icon, where the old inline declarations only existed
    // on chips the template had already coloured.
    const bare = document.createElement('div');
    bare.className = 'type-icon';
    el.shadowRoot!.appendChild(bare);
    try {
      expect(getComputedStyle(bare).backgroundColor).not.toBe(TRANSPARENT);
    } finally {
      bare.remove();
    }
  });

  it('does not tint through the alpha-suffix form the chip used to use', () => {
    // Why the tint moved into the stylesheet rather than staying in the template.
    const probe = chips[0];
    const before = probe.getAttribute('style');
    probe.setAttribute('style', 'background:var(--primary-color, #4caf50)22');
    try {
      expect(getComputedStyle(probe).backgroundColor).toBe(TRANSPARENT);
    } finally {
      probe.setAttribute('style', before ?? '');
    }
  });
});
