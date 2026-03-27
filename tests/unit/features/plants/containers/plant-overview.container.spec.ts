import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { ContextProvider } from '@lit/context';
import { hassContext, storeContext } from '../../../../../src/context';
import '../../../../../src/features/plants/containers/plant-overview.container';
import type { PlantOverviewContainer } from '../../../../../src/features/plants/containers/plant-overview.container';
import type { PlantEntity } from '../../../../../src/types';

// Mock dependencies
vi.mock('../../../../../src/features/plants/components/plant-dashboard-tab', () => ({ default: class {} }));
vi.mock('../../../../../src/features/plants/components/plant-actions-tab', () => ({ default: class {} }));
vi.mock('../../../../../src/features/plants/components/plant-timeline-tab', () => ({ default: class {} }));

describe('PlantOverviewContainer', () => {
  let element: PlantOverviewContainer;
  let mockStore: any;
  let mockHass: any;
  let providerProvider: any; // We'll keep the context provider in DOM if used

  const mockPlant = {
    entity_id: 'sensor.plant_1',
    state: 'veg',
    attributes: {
      plant_id: 'plant_1',
      entity_id: 'sensor.plant_1',
      growspace_id: 'space_1',
      strain: 'Blue Dream',
      stage: 'veg',
      position: '1-1',
    },
    context: { id: '1', parent_id: null, user_id: null },
    last_changed: '2023-01-01',
    last_updated: '2023-01-01'
  } as unknown as PlantEntity;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockStore = {
      ui: {
        closeDialog: vi.fn(),
        setActiveDialog: vi.fn(),
      },
      actions: {
        plant: {
          delete: vi.fn(),
        }
      },
      updatePlantFromDialog: vi.fn(),
      data: {
        $strainLibrary: { get: () => [], listen: () => () => {} },
      },
      // Adding minimal observable state required by viewmodel
      plants: { get: () => [] },
      $state: {
        get: () => ({ plants: [mockPlant] }),
        listen: () => () => {},
      }
    };

    mockHass = {
      callService: vi.fn(),
      callWS: vi.fn(),
    };

    // Render component inside context providers
    // Lit's @consume requires the context to be available on connection.
    const Wrapper = class extends HTMLElement {
      private hassProvider = new ContextProvider(this, { context: hassContext, initialValue: mockHass });
      private storeProvider = new ContextProvider(this, { context: storeContext, initialValue: mockStore });
      
      connectedCallback() {
        this.innerHTML = '<plant-overview-container></plant-overview-container>';
      }
    };
    if (!customElements.get('test-wrapper')) {
      customElements.define('test-wrapper', Wrapper);
    }

    const wrapper = await fixture(html`<test-wrapper></test-wrapper>`);
    element = wrapper.querySelector('plant-overview-container') as PlantOverviewContainer;

    // Set properties
    element.plant = mockPlant;
    element.editedAttributes = {};
    
    // Trigger update
    await element.updateComplete;
  });

  afterEach(() => {
    if (element && element.parentNode && element.parentNode.parentNode) {
      element.parentNode.parentNode.removeChild(element.parentNode);
    }
  });

  it('should render dialog header and tabs correctly', async () => {
    const dialog = element.shadowRoot!.querySelector('ha-dialog');
    expect(dialog).toBeTruthy();

    const title = element.shadowRoot!.querySelector('.dialog-title');
    expect(title?.textContent).toBe('Unknown Strain'); // Fallback when strain not found in library

    // Verify tabs are present
    const tabs = element.shadowRoot!.querySelectorAll('.tab-btn');
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toContain('Overview');
    expect(tabs[1].textContent).toContain('Actions');
    expect(tabs[2].textContent).toContain('Timeline');
  });

  it('should switch tabs', async () => {
    const tabs = element.shadowRoot!.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    
    // Default is explicit "dashboard"
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(element.shadowRoot!.querySelector('plant-dashboard-tab')).toBeTruthy();
    expect(element.shadowRoot!.querySelector('plant-actions-tab')).toBeFalsy();

    // Switch to Actions tab
    tabs[1].click();
    await element.updateComplete;
    
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(element.shadowRoot!.querySelector('plant-actions-tab')).toBeTruthy();

    // Switch to Timeline tab
    tabs[2].click();
    await element.updateComplete;
    
    expect(tabs[2].classList.contains('active')).toBe(true);
    expect(element.shadowRoot!.querySelector('plant-timeline-tab')).toBeTruthy();
  });

  it('should call closeDialog on Close button click', async () => {
    const closeBtn = element.shadowRoot!.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    
    closeBtn.click();
    
    expect(mockStore.ui.closeDialog).toHaveBeenCalled();
  });

  it('should handle action clicks and open proper sub-dialogs', async () => {
    // Switch to actions tab to trigger _handleActionClick
    element['_activeTab'] = 'actions';
    await element.updateComplete;

    const actionsTab = element.shadowRoot!.querySelector('plant-actions-tab');
    expect(actionsTab).toBeTruthy();

    actionsTab!.dispatchEvent(new CustomEvent('action-click', { detail: { actionId: 'water' } }));
    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'WATERING',
      payload: { plantIds: ['plant_1'], growspaceId: 'space_1', mode: 'plant' }
    });

    actionsTab!.dispatchEvent(new CustomEvent('action-click', { detail: { actionId: 'clone' } }));
    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'TAKE_CLONE',
      payload: { sourcePlant: mockPlant, defaultGrowspaceId: 'space_1' }
    });
  });

  it('should handle training, ipm, and print_label action clicks', async () => {
    element['_activeTab'] = 'actions';
    await element.updateComplete;

    const actionsTab = element.shadowRoot!.querySelector('plant-actions-tab');
    expect(actionsTab).toBeTruthy();

    actionsTab!.dispatchEvent(new CustomEvent('action-click', { detail: { actionId: 'training' } }));
    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'TRAINING',
      payload: { isOpen: true, plantIds: ['plant_1'], growspaceId: 'space_1' },
    });

    actionsTab!.dispatchEvent(new CustomEvent('action-click', { detail: { actionId: 'ipm' } }));
    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'IPM',
      payload: { plantIds: ['plant_1'], growspaceId: 'space_1' },
    });

    actionsTab!.dispatchEvent(new CustomEvent('action-click', { detail: { actionId: 'print_label' } }));
    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'PRINT_LABEL',
      payload: { plantId: 'plant_1' },
    });
  });

  it('should toggle showAllDates when toggle-dates event is dispatched', async () => {
    const dashboardTab = element.shadowRoot!.querySelector('plant-dashboard-tab');
    expect(dashboardTab).toBeTruthy();

    expect(element['_showAllDates']).toBe(false);

    dashboardTab!.dispatchEvent(new CustomEvent('toggle-dates'));
    await element.updateComplete;

    expect(element['_showAllDates']).toBe(true);

    dashboardTab!.dispatchEvent(new CustomEvent('toggle-dates'));
    await element.updateComplete;

    expect(element['_showAllDates']).toBe(false);
  });

  it('should switch back to dashboard tab from another tab', async () => {
    const tabs = element.shadowRoot!.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;

    // Navigate away from dashboard first
    tabs[1].click();
    await element.updateComplete;
    expect(tabs[1].classList.contains('active')).toBe(true);

    // Click dashboard tab to return
    tabs[0].click();
    await element.updateComplete;

    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(element.shadowRoot!.querySelector('plant-dashboard-tab')).toBeTruthy();
  });

  it('should create viewmodel in connectedCallback when plant is pre-set before DOM insertion', async () => {
    const WrapperPreset = class extends HTMLElement {
      private hassProvider = new ContextProvider(this, { context: hassContext, initialValue: mockHass });
      private storeProvider = new ContextProvider(this, { context: storeContext, initialValue: mockStore });

      connectedCallback() {
        const el = document.createElement('plant-overview-container') as PlantOverviewContainer;
        el.plant = mockPlant;
        el.editedAttributes = {};
        this.appendChild(el);
      }
    };
    if (!customElements.get('test-wrapper-preset')) {
      customElements.define('test-wrapper-preset', WrapperPreset);
    }

    const wrapper = await fixture(html`<test-wrapper-preset></test-wrapper-preset>`);
    const el = wrapper.querySelector('plant-overview-container') as PlantOverviewContainer;
    await el.updateComplete;

    // ViewModel was created in connectedCallback, so dialog should render
    const dialog = el.shadowRoot!.querySelector('ha-dialog');
    expect(dialog).toBeTruthy();
  });

  it('should open Strain Editor from header button', async () => {
    const editStrainBtn = element.shadowRoot!.querySelector('button[title="Edit Strain Library Entry"]') as HTMLButtonElement;
    expect(editStrainBtn).toBeTruthy();
    
    editStrainBtn.click();
    
    expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'STRAIN_LIBRARY',
      payload: {}
    });
  });

  it('should save changes format appropriately', async () => {
    const saveBtn = Array.from(element.shadowRoot!.querySelectorAll('button.filled')).find(b => b.textContent?.includes('Save')) as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();

    // Make simple edit change locally
    element['_handleAttributeChange'](new CustomEvent('attribute-change', { detail: { key: 'strain', value: 'New Strain' } }));
    await element.updateComplete;

    saveBtn.click();

    expect(mockStore.updatePlantFromDialog).toHaveBeenCalledWith({
      plant: mockPlant,
      editedAttributes: { strain: 'New Strain' },
      selectedPlantIds: ['plant_1']
    });
    expect(mockStore.ui.closeDialog).toHaveBeenCalled(); // Should close upon save
  });

  it('should handle deletion confirmation cycle', async () => {
    const deleteBtn = Array.from(element.shadowRoot!.querySelectorAll('button.danger')).find(b => b.textContent?.includes('Delete')) as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();

    // Click initial delete
    deleteBtn.click();
    await element.updateComplete;

    const overlay = element.shadowRoot!.querySelector('.delete-overlay');
    expect(overlay).toBeTruthy();

    // Cancel deletion
    const cancelBtn = overlay!.querySelector('button.outlined') as HTMLButtonElement;
    cancelBtn.click();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector('.delete-overlay')).toBeFalsy();

    // Re-initiate and confirm
    deleteBtn.click();
    await element.updateComplete;

    const confirmBtn = element.shadowRoot!.querySelector('.delete-overlay button.danger') as HTMLButtonElement;
    confirmBtn.click();

    expect(mockStore.actions.plant.delete).toHaveBeenCalledWith('plant_1');
    expect(mockStore.ui.closeDialog).toHaveBeenCalled();
  });
});
