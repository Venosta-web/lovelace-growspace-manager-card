import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';

import type { GrowspaceDevice } from '../../src/types';
import type { GrowspaceHeaderActionsUI } from '../../src/features/ui/components/growspace-header-actions-ui';
import type { GrowspaceHeaderUI } from '../../src/features/ui/components/growspace-header-ui';
import '../../src/features/ui/components/growspace-header-ui';

function deviceWithPlants(count: number): GrowspaceDevice {
  return {
    deviceId: 'growspace-1',
    name: 'Flower room',
    plants: Array.from({ length: count }, (_, index) => ({
      entity_id: `plant.plant_${index + 1}`,
      attributes: {},
    })),
  } as unknown as GrowspaceDevice;
}

async function renderHeader(
  device: GrowspaceDevice,
  problemPlants: string[] = [],
  selectedPlants = new Set<string>()
): Promise<GrowspaceHeaderUI> {
  return fixture<GrowspaceHeaderUI>(html`
    <growspace-header-ui
      .device=${device}
      .deviceId=${device.deviceId}
      .problemPlants=${problemPlants}
      .selectedPlants=${selectedPlants}
    ></growspace-header-ui>
  `);
}

function actionsFor(header: GrowspaceHeaderUI): GrowspaceHeaderActionsUI {
  return header.shadowRoot!.querySelector(
    'growspace-header-actions-ui'
  ) as GrowspaceHeaderActionsUI;
}

describe('growspace header operational priority', () => {
  it('shows a stable summary without inventing a next action', async () => {
    const header = await renderHeader(deviceWithPlants(3));

    expect(header.shadowRoot!.querySelector('.operational-summary')!.textContent).toContain(
      'All 3 plants on track'
    );
    expect(actionsFor(header).shadowRoot!.querySelector('.primary-action')).toBeNull();
  });

  it('surfaces attention and offers the available review flow', async () => {
    const header = await renderHeader(deviceWithPlants(3), ['Northern Lights', 'Blue Dream']);
    const action =
      actionsFor(header).shadowRoot!.querySelector<HTMLButtonElement>('.primary-action')!;

    expect(header.shadowRoot!.querySelector('.operational-summary')!.textContent).toContain(
      '2 plants need attention'
    );
    expect(action.textContent).toContain('Review plants');
    expect(action.dataset.action).toBe('select_plants');
  });

  it('prioritizes the selected-plant action over the general attention action', async () => {
    const header = await renderHeader(
      deviceWithPlants(3),
      ['Northern Lights'],
      new Set(['plant-1', 'plant-2'])
    );
    const action =
      actionsFor(header).shadowRoot!.querySelector<HTMLButtonElement>('.primary-action')!;

    expect(action.textContent).toContain('Water selected (2)');
    expect(action.dataset.action).toBe('water');
  });

  it('explains unavailable status data and suppresses contextual actions', async () => {
    const device = {
      deviceId: 'growspace-1',
      name: 'Flower room',
    } as GrowspaceDevice;
    const header = await renderHeader(device, [], new Set(['stale-selection']));

    expect(header.shadowRoot!.querySelector('.operational-summary')!.textContent).toContain(
      'Plant status unavailable'
    );
    expect(actionsFor(header).shadowRoot!.querySelector('.primary-action')).toBeNull();
  });

  it('offers adding a plant only for a known empty growspace', async () => {
    const header = await renderHeader(deviceWithPlants(0), [], new Set(['stale-selection']));
    const action =
      actionsFor(header).shadowRoot!.querySelector<HTMLButtonElement>('.primary-action')!;

    expect(header.shadowRoot!.querySelector('.operational-summary')!.textContent).toContain(
      'Ready for plants'
    );
    expect(action.dataset.action).toBe('add_plant');
  });

  it('organizes every overflow destination under the three intent groups', async () => {
    const header = await renderHeader(deviceWithPlants(2));
    const actions = actionsFor(header);
    const groupLabels = Array.from(actions.shadowRoot!.querySelectorAll('.menu-header')).map(
      (node) => node.textContent?.trim()
    );
    const destinations = Array.from(
      actions.shadowRoot!.querySelectorAll<HTMLButtonElement>('.menu-item')
    ).map((button) => button.dataset.action);

    expect(groupLabels).toEqual(['Plant care', 'Setup', 'Insights']);
    expect(destinations).toEqual(
      expect.arrayContaining([
        'select_plants',
        'add_plant',
        'water',
        'ipm',
        'training',
        'arrange',
        'irrigation',
        'irrigation-recipes',
        'irrigation-programs',
        'nutrients',
        'strains',
        'compare',
        'logbook',
        'snapshots',
        'ai',
      ])
    );
  });
});
