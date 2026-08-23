import { describe, it, expect, beforeAll } from 'vitest';

const EXPECTED_CARD_TYPES = [
  'growspace-manager-card',
  'growspace-grid-card',
  'growspace-analytics-card',
  'growspace-ai-insight-card',
  'growspace-tank-card',
  'growspace-subarea-card',
  'growspace-logbook-card',
  'growspace-carousel-card',
];

describe('index registration', () => {
  beforeAll(async () => {
    // Reset so a prior import in the same test run doesn't inflate the list.
    window.customCards = [];
    await import('../../src/index');
  });

  it('registers all 8 cards in window.customCards', () => {
    const types = (window.customCards ?? []).map((c) => c.type);
    expect(types).toEqual(expect.arrayContaining(EXPECTED_CARD_TYPES));
    expect(types).toHaveLength(EXPECTED_CARD_TYPES.length);
  });

  it('every registered card has a non-empty name and description', () => {
    for (const card of window.customCards ?? []) {
      expect(card.name).toBeTruthy();
      expect(card.description).toBeTruthy();
    }
  });

  it('exports PlantUtils', async () => {
    const { PlantUtils } = await import('../../src/index');
    expect(PlantUtils).toBeDefined();
  });
});
