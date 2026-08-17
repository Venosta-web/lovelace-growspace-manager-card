import type { HomeAssistant } from 'custom-card-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setHass } from '../../services/hass-call';
import { commitPlantLayout } from './arrangement-service';

describe('commitPlantLayout', () => {
  let callWS: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callWS = vi.fn().mockResolvedValue({
      growspace_id: 'gs-1',
      layout_revision: 8,
      placements: [
        { plant_id: 'one', row: 1, col: 2 },
        { plant_id: 'two', row: 1, col: 1 },
      ],
    });
    setHass({ callWS } as unknown as HomeAssistant);
  });

  it('sends 1-based positions for a 0-based draft', async () => {
    await commitPlantLayout('gs-1', 7, {
      one: { row: 0, col: 1 },
      two: { row: 0, col: 0 },
    });

    expect(callWS).toHaveBeenCalledWith({
      type: 'growspace_manager/set_plant_layout',
      growspace_id: 'gs-1',
      expected_layout_revision: 7,
      placements: [
        { plant_id: 'one', row: 1, col: 2 },
        { plant_id: 'two', row: 1, col: 1 },
      ],
    });
  });

  it('translates the authoritative response back to 0-based grid indices', async () => {
    const committed = await commitPlantLayout('gs-1', 7, { one: { row: 0, col: 1 } });

    expect(committed).toEqual({
      growspaceId: 'gs-1',
      layoutRevision: 8,
      layout: {
        one: { row: 0, col: 1 },
        two: { row: 0, col: 0 },
      },
    });
  });
});
