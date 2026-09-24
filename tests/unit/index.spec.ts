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
  'growspace-tc-card',
];

describe('index registration', () => {
  beforeAll(async () => {
    // Reset so a prior import in the same test run doesn't inflate the list.
    window.customCards = [];
    await import('../../src/index');
  });

  it('registers every card in window.customCards', () => {
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

  it('previews the growspace cards whose stub renders against the first growspace', () => {
    const previewed = (window.customCards ?? []).filter((c) => c.preview).map((c) => c.type);
    expect(previewed).toEqual([
      'growspace-manager-card',
      'growspace-grid-card',
      'growspace-analytics-card',
      'growspace-ai-insight-card',
      'growspace-tank-card',
      'growspace-logbook-card',
    ]);
  });

  it('accepts its own stub config on every previewed card', () => {
    for (const { type } of (window.customCards ?? []).filter((c) => c.preview)) {
      const ctor = customElements.get(type) as unknown as {
        getStubConfig(): Record<string, unknown>;
      };
      const stub = ctor.getStubConfig();
      const card = document.createElement(type) as HTMLElement & {
        setConfig(config: unknown): void;
      };
      expect(() => card.setConfig(stub), type).not.toThrow();
      expect(stub.default_growspace, type).toBe('');
    }
  });

  it('exports PlantUtils', async () => {
    const { PlantUtils } = await import('../../src/index');
    expect(PlantUtils).toBeDefined();
  });
});
