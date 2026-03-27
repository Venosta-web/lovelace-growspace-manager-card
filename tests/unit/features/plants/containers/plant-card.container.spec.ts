import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { fixture, html } from '@open-wc/testing-helpers';
import { ContextProvider } from '@lit/context';
import { storeContext } from '../../../../../src/context';
import '../../../../../src/features/plants/containers/plant-card.container';
import type { PlantCardContainer } from '../../../../../src/features/plants/containers/plant-card.container';
import type { PlantEntity } from '../../../../../src/types';

describe('PlantCardContainer', () => {
  let element: PlantCardContainer;
  let mockStore: any;

  const mockPlant = {
    entity_id: 'plant.test1',
    attributes: {
      plant_id: 'plant_test1',
      growspace_id: 'gs1',
      strain: 'Test Strain',
    },
  } as unknown as PlantEntity;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockStore = {
      ui: {
        $isEditMode: atom(false),
        $selectedPlants: atom(new Set()),
        setActiveDialog: vi.fn(),
        togglePlantSelection: vi.fn(),
      },
      data: {
        $strainLibrary: atom([]),
        $nutrientPresets: atom({}),
        $devices: atom([]),
      }
    };

    element = await fixture<PlantCardContainer>(html`
      <plant-card-container 
        .plant=${mockPlant} 
        .row=${1} 
        .col=${1} 
        .store=${mockStore}
      ></plant-card-container>
    `);

    element.plant = mockPlant;
    element.row = 1;
    element.col = 1;
    
    await element.updateComplete;
  });

  afterEach(() => {
    if (element && element.parentNode && element.parentNode.parentNode) {
      element.parentNode.parentNode.removeChild(element.parentNode);
    }
  });

  it('renders plant card UI', async () => {
    const cardUI = element.shadowRoot?.querySelector('plant-card-ui') as any;
    expect(cardUI).to.exist;
    expect(cardUI.plant).to.deep.equal(mockPlant);
  });

  it('handles plant-click event to open overview dialog', async () => {
    const cardUI = element.shadowRoot?.querySelector('plant-card-ui') as HTMLElement;
    cardUI.dispatchEvent(new CustomEvent('plant-click', {
      detail: { plant: mockPlant }
    }));

    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'PLANT_OVERVIEW',
      payload: {
        plant: mockPlant,
        editedAttributes: {},
        activeTab: 'dashboard',
      },
    });
  });

  it('handles plant-toggle-selection event', async () => {
    const cardUI = element.shadowRoot?.querySelector('plant-card-ui') as HTMLElement;
    cardUI.dispatchEvent(new CustomEvent('plant-toggle-selection', {
      detail: { plant: mockPlant }
    }));

    expect(mockStore.ui.togglePlantSelection).toHaveBeenCalledWith('plant_test1');
  });

  it('forwards focus call to plant-card-ui if it has focus method', async () => {
    let focusCalled = false;
    // Wait for cardUI to be rendered
    await element.updateComplete;
    const cardUI = element.shadowRoot?.querySelector('plant-card-ui') as any;
    if (cardUI) {
      vi.spyOn(cardUI as any, 'focus').mockImplementation(() => { focusCalled = true; });
    }
    
    element.focus();
    expect(focusCalled).to.be.true;
  });
});
