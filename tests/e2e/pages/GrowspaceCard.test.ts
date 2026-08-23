import { describe, expect, it, vi } from 'vitest';

import { GrowspaceCard } from './GrowspaceCard';

describe('GrowspaceCard navigation', () => {
  it('names the missing dashboard when no card renders there', async () => {
    const waitFor = vi.fn().mockRejectedValue(new Error('locator timeout'));
    const cardLocator = {
      waitFor,
      locator: vi.fn().mockReturnValue({}),
    };
    const locator = vi.fn().mockReturnValue({ first: () => cardLocator });
    const page = {
      goto: vi.fn().mockResolvedValue(null),
      locator,
    };
    const card = new GrowspaceCard(page as never);

    await expect(card.navigate('/missing-dashboard/0')).rejects.toThrow(
      'No Growspace Manager card found at dashboard "/missing-dashboard/0"'
    );
  });
});
